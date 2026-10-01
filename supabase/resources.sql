-- Design Resources board (the Living Room's pink picture).
-- Run this whole file once in Supabase: SQL Editor → New query → paste → Run.
-- It's safe to run again; it won't duplicate anything.
--
-- What the public website can do (it only has the public anon/publishable key):
--   • read resources that aren't hidden
--   • add a resource (checked below: http/https link, title ≤ 60, description ≤ 140, known category,
--     max 5 per browser per hour, no duplicate links)
--   • report a resource (sets resources.reported = true for you to review)
-- It can NOT edit, hide or delete anything. You do that in the Table Editor.

-- 1. The board ---------------------------------------------------------------------------------

create table if not exists public.resources (
  id          uuid primary key default gen_random_uuid(),
  url         text not null check (url ~* '^https?://[^/\s]+' and url !~ '\s' and char_length(url) <= 500),
  title       text not null check (char_length(btrim(title)) between 1 and 60),
  description text check (description is null or char_length(description) <= 140),
  category    text not null check (category in ('Typography', 'Color', 'Inspiration', 'Tools', 'Mockups', 'Tutorials', 'Other')),
  shared_by   text not null default 'Guest' check (char_length(shared_by) between 1 and 30),
  created_at  timestamptz not null default now(),
  hidden      boolean not null default false,
  reported    boolean not null default false,
  -- Only used for the hourly limit; always emptied before the row is saved.
  submitter   text
);

-- One card per link (ignores http/https, "www." and a trailing slash).
create unique index if not exists resources_unique_link
  on public.resources (lower(regexp_replace(regexp_replace(url, '^https?://(www\.)?', '', 'i'), '/+$', '')));
create index if not exists resources_newest on public.resources (created_at desc);

-- Private log for the hourly limit. No policies, so the website can't read or write it directly.
create table if not exists public.resource_submissions (
  submitter  text not null,
  created_at timestamptz not null default now()
);
create index if not exists resource_submissions_recent on public.resource_submissions (submitter, created_at);
alter table public.resource_submissions enable row level security;

-- Runs before every new resource. For website visitors: new rows always start visible and
-- unreported with the current time, and each browser can add at most 5 per hour
-- (plus a cap of 100 per hour across everyone, in case someone scripts around that).
-- Rows you add yourself in the dashboard or SQL Editor skip these checks.
create or replace function public.resources_before_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  who text := nullif(btrim(coalesce(new.submitter, '')), '');
  from_website boolean := coalesce(current_setting('role', true), '') in ('anon', 'authenticated')
                          or coalesce(auth.role(), '') in ('anon', 'authenticated');
begin
  if from_website then
    if who is null or char_length(who) > 64 then
      raise exception 'missing_submitter';
    end if;
    new.created_at := now();
    new.hidden := false;
    new.reported := false;
    new.title := btrim(new.title);
    new.description := nullif(btrim(coalesce(new.description, '')), '');
    if (select count(*) from resource_submissions
        where submitter = who and created_at > now() - interval '1 hour') >= 5 then
      raise exception 'rate_limited';
    end if;
    if (select count(*) from resource_submissions where created_at > now() - interval '1 hour') >= 100 then
      raise exception 'board_busy';
    end if;
    insert into resource_submissions (submitter) values (who);
  end if;
  new.submitter := null;
  return new;
end;
$$;

drop trigger if exists resources_before_insert on public.resources;
create trigger resources_before_insert
  before insert on public.resources
  for each row execute function public.resources_before_insert();

-- 2. Row Level Security ------------------------------------------------------------------------

alter table public.resources enable row level security;

drop policy if exists "Anyone can read visible resources" on public.resources;
create policy "Anyone can read visible resources"
  on public.resources for select
  to anon, authenticated
  using (hidden = false);

drop policy if exists "Anyone can add a resource" on public.resources;
create policy "Anyone can add a resource"
  on public.resources for insert
  to anon, authenticated
  with check (hidden = false and reported = false);

-- No update or delete policies: the website can't change or remove anything.
grant select, insert on public.resources to anon, authenticated;
revoke update, delete, truncate on public.resources from anon, authenticated;
revoke all on public.resource_submissions from anon, authenticated;

-- 3. Reports -----------------------------------------------------------------------------------
-- Visitors can only add a report. A report flips resources.reported to true so you can filter
-- for it in the Table Editor. Visitors can't read the reports or change anything else.

create table if not exists public.resource_reports (
  id          uuid primary key default gen_random_uuid(),
  resource_id uuid not null references public.resources (id) on delete cascade,
  created_at  timestamptz not null default now()
);
alter table public.resource_reports enable row level security;

drop policy if exists "Anyone can report a resource" on public.resource_reports;
create policy "Anyone can report a resource"
  on public.resource_reports for insert
  to anon, authenticated
  with check (true);

grant insert on public.resource_reports to anon, authenticated;
revoke select, update, delete, truncate on public.resource_reports from anon, authenticated;

create or replace function public.resource_reported()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update resources set reported = true where id = new.resource_id;
  return new;
end;
$$;

drop trigger if exists resource_reported on public.resource_reports;
create trigger resource_reported
  after insert on public.resource_reports
  for each row execute function public.resource_reported();

-- 4. Live updates: new resources appear for everyone right away ---------------------------------

do $$
begin
  alter publication supabase_realtime add table public.resources;
exception when duplicate_object then null;
end;
$$;

-- 5. Starter picks, shared by "GD House" --------------------------------------------------------

insert into public.resources (id, url, title, description, category, shared_by, created_at) values
  ('6c0de788-eb27-5e59-abf1-f505693af6f2', 'https://fonts.google.com', 'Google Fonts', 'Hundreds of free, open-source typefaces for web and print, with type testers and pairing ideas.', 'Typography', 'GD House', '2026-10-01T12:59:00Z'),
  ('a76cf571-7bc5-5c33-8b31-ef668ac62c0c', 'https://coolors.co', 'Coolors', 'Fast color palette generator: lock the colors you like and spin for the rest.', 'Color', 'GD House', '2026-10-01T12:58:00Z'),
  ('227bf0a6-cb97-5cbf-8aac-7fe2983d327f', 'https://unsplash.com', 'Unsplash', 'Free high-resolution photos you can use in your projects.', 'Other', 'GD House', '2026-10-01T12:57:00Z'),
  ('d71a3cc2-944a-541d-a604-34b88ebbb155', 'https://fontsinuse.com', 'Fonts In Use', 'A searchable archive of real-world typography, organized by typeface, format and period.', 'Typography', 'GD House', '2026-10-01T12:56:00Z'),
  ('b7d68fbf-c400-5723-8754-a30e5ecf5851', 'https://www.behance.net', 'Behance', 'Portfolios and case studies from designers around the world. Good for seeing whole projects.', 'Inspiration', 'GD House', '2026-10-01T12:55:00Z'),
  ('465a08cc-0f36-5b04-9e3f-53f21be2c220', 'https://www.figma.com/community', 'Figma Community', 'Free Figma files, UI kits, plugins and templates shared by other designers.', 'Tools', 'GD House', '2026-10-01T12:54:00Z'),
  ('ec6c6d8b-0494-574d-977c-e5451386c676', 'https://www.mockupworld.co', 'Mockup World', 'Free photorealistic mockups for packaging, print, screens and more.', 'Mockups', 'GD House', '2026-10-01T12:53:00Z'),
  ('9e45211f-302a-5997-af73-ce45b5725751', 'https://practicaltypography.com', 'Practical Typography', 'A free online book on typography basics: line length, spacing, hierarchy and more.', 'Tutorials', 'GD House', '2026-10-01T12:52:00Z')
on conflict do nothing;
