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
  category    text not null check (category in ('Typography', 'UI/UX', 'Motion Graphics', 'Color', 'Inspiration', 'Tools', 'Mockups', 'Tutorials', 'Other')),
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
    -- "GD House" is reserved for the site's own picks.
    if lower(regexp_replace(btrim(new.shared_by), '\s+', ' ', 'g')) = 'gd house' then
      new.shared_by := 'Guest';
    end if;
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

-- 5. Categories (also updates a board created with an earlier version of this file) ------------

-- Typography, UI/UX, Motion Graphics, Color, Inspiration, Tools, Mockups, Tutorials, Other.
-- Cards in a category that no longer exists move to Other.
alter table public.resources drop constraint if exists resources_category_check;
update public.resources set category = 'Other' where category not in ('Typography', 'UI/UX', 'Motion Graphics', 'Color', 'Inspiration', 'Tools', 'Mockups', 'Tutorials', 'Other');
alter table public.resources add constraint resources_category_check
  check (category in ('Typography', 'UI/UX', 'Motion Graphics', 'Color', 'Inspiration', 'Tools', 'Mockups', 'Tutorials', 'Other'));

-- 6. Starter resources, shared by "GD House" ----------------------------------------------------
-- Running this file again never duplicates them: each has a fixed id, and the text is refreshed.

-- Remove starter picks from earlier versions of this file.
delete from public.resources where id in (
    'a76cf571-7bc5-5c33-8b31-ef668ac62c0c',
    '227bf0a6-cb97-5cbf-8aac-7fe2983d327f',
    'd71a3cc2-944a-541d-a604-34b88ebbb155',
    'b7d68fbf-c400-5723-8754-a30e5ecf5851',
    '465a08cc-0f36-5b04-9e3f-53f21be2c220',
    'ec6c6d8b-0494-574d-977c-e5451386c676',
    '9e45211f-302a-5997-af73-ce45b5725751'
);

create temp table gd_house_seed (id uuid, url text, title text, description text, category text, created_at timestamptz);
insert into gd_house_seed values
  ('3d7657af-17d6-5fbe-95d7-5ccca0abe5c5'::uuid, 'https://www.colophon-foundry.org', 'Colophon Foundry', 'Independent type foundry with original typefaces.', 'Typography', timestamptz '2026-10-01 12:59:00+00'),
  ('6c0de788-eb27-5e59-abf1-f505693af6f2'::uuid, 'https://fonts.google.com', 'Google Fonts', 'Free, open-source fonts for print and web.', 'Typography', timestamptz '2026-10-01 12:58:00+00'),
  ('584e9d90-53ba-5022-b010-b276bdd016fd'::uuid, 'https://fonts.google.com/knowledge', 'Google Fonts Knowledge', 'Free guides to typography basics and type on screen.', 'Typography', timestamptz '2026-10-01 12:57:00+00'),
  ('86bb288e-582e-5aa7-936d-94fbcf8ba19b'::uuid, 'https://lawsofux.com', 'Laws of UX', 'Key psychology principles for designing interfaces.', 'UI/UX', timestamptz '2026-10-01 12:56:00+00'),
  ('94028912-87b1-5b56-9802-cb42489cd27f'::uuid, 'https://www.awwwards.com', 'Awwwards', 'Award-winning web design for inspiration.', 'UI/UX', timestamptz '2026-10-01 12:55:00+00'),
  ('ff9dde86-237b-544d-8fb9-46abc3d1e974'::uuid, 'https://youtu.be/IJ3QHNQSJg8', 'Text Animators for Beginners - After Effects Type Tutorial', null, 'Motion Graphics', timestamptz '2026-10-01 12:54:00+00');

update public.resources r
   set url = s.url, title = s.title, description = s.description, category = s.category, shared_by = 'GD House'
  from gd_house_seed s
 where r.id = s.id;

insert into public.resources (id, url, title, description, category, shared_by, created_at)
select id, url, title, description, category, 'GD House', created_at from gd_house_seed
on conflict do nothing;

drop table gd_house_seed;
