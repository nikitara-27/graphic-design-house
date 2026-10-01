# Graphic Design House

An interactive map of BU's Graphic Design curriculum, shown as a house. Built from `PRD.md`.
It's a static Vite + React + TypeScript site. Live presence and the Design Resources board use Supabase (optional: without it the site still works).

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # matching logic + content checks
npm run build    # outputs dist/ (relative paths, so it works on GitHub Pages, Netlify, or Vercel)
```

## Editing content (no component changes needed)

Everything lives in `src/data/`. In dev, broken references are logged to the console, and `npm test` fails on them.

| File | What's in it |
|---|---|
| `rooms.json` | Floors, and the 13 rooms with their courses, clickable object, and exits |
| `questions.json` | Quiz prompts and options: year → home room, design interests, favorite programs |
| `professors.json` | Host professor profiles, the interest + program → host `assignments` table, and a `host` fallback |

**Rooms.** `sceneImage` is a path under `public/` (for example `scenes/kitchen.png`). Leave it `""` to get a generated placeholder scene.
Scenes are 16:9, set by `sceneAspect`. On phones (portrait) the room fills the screen height and you scroll sideways to look around.
Small arrow buttons on the left and right edges lead to the next room; you can also keep swiping past the end of the room. On every screen the room fills the space edge to edge (very wide windows trim a little from the top and bottom).

**Clickable object.** Each room has exactly one: `object` in `rooms.json` (`label`, `x`, `y`, `w`, `h`, as percentages of the 1600×900 scene, measured from the top-left).
Tapping it opens the room's class list (or, with `"objectOpens": "resources"`, the Design Resources board: the Living Room's pink picture). It glows on the first visit, and the tap target never shrinks below 44×44px. Everything else in the scene is decoration.

**House map.** The Map panel shows the team's cross-section illustration (`public/map.webp`, made from `MAP.png` at 1234px wide).
Each room's tappable area on it is `mapArea` in `rooms.json` (percentages of the map image). If the illustration changes,
re-export it and update those numbers.

**Class details.** Each course can also have optional `credits`, `prerequisites` (e.g. `"CFA AR 225"`), `description`,
`hubAreas` (a list of BU Hub areas, shown as tags) and `note`. Tapping a class in a room's list shows whatever it has; classes without
details just show their code, title, and term. The Basement, Bathroom, Kitchen and Bedroom classes are filled in.

**Courses.** Each course needs a unique `id`. It's usually the code, with a suffix when a code appears twice (AR594, AR596).
Professors refer to courses by `id`.

**Exits.** `direction` is `left` or `right` for doors on the same floor, and `up` or `down` for stairs.
Exits sit at the screen edge and toolbar, so no coordinates are needed.

**Host professors.** Q2 (design interest) and Q3 (favorite program) together pick the host, using the `assignments` table in `professors.json`.
Q3 is only used for this; there are no program badges. `npm test` fails if any interest + program pair is missing a host.
The logic is in `src/lib/match.ts`. Q1 (year) sets the home room and is kept for the future freshman hat.

## URLs and saved progress

The current view lives in the URL hash, so refreshing or sharing a link opens the same place:
`#/room/kitchen`, `#/room/kitchen/classes`, `#/room/kitchen/classes/AR381`, `#/map`, `#/profile`, `#/quiz`, `#/welcome`.
Hash routes never 404 on GitHub Pages. Everyone enters the house in the Living Room (`entryRoomId` in `rooms.json`),
and missing or invalid links open it too; the user's year room keeps its "Your room" tag.

Quiz answers (year, interest, program) are saved in `localStorage`. The host professor is never saved;
it's recalculated from the answers on every load, so edits to the `assignments` table apply right away.
The user's first name (asked before Q1, max 30 characters) is stored under its own key in their browser. "Retake quiz" clears the answers but keeps the name pre-filled, and the profile panel has "Edit name".
"Retake quiz" clears the answers. If storage is blocked (some private-browsing modes), the site still works,
it just won't remember answers after a refresh. Routing logic is in `src/lib/router.ts`.

## Name filter

Names are checked with the [obscenity](https://www.npmjs.com/package/obscenity) library (English words plus its
recommended tricks detection: leetspeak like "a$$", repeated letters) and an extra check for spaced-out letters.
Only letters, numbers, spaces and `- ' .` are allowed, up to 30 characters. Two lists you can edit:

- `src/data/name-allowlist.json`: real names the library blocks by mistake (e.g. "Dick", "Analise").
- `src/data/name-blocklist.json`: extra words or phrases to block. Wrap a word in `|pipes|` to match it only as a whole word.

The same check runs on the name screen, on "Edit name", on names loaded from storage, and on names received
from other visitors through live presence (those show as "Guest" if they fail, since a browser-side check can be bypassed).

## Live presence (who's here right now)

While someone is inside the house, their browser shares **only** their first name, host professor, year,
design interest, and current room on one Supabase Realtime Presence channel (`gd-house`). Everyone in a room
sees each other as their host's avatar with their name underneath; the map shows how many people are in each room.
Presence uses no database and no login: the data only exists while the tab is open, and leaving the site removes it.
The name screen tells people their first name will be visible to others.

Setup: copy `.env.example` to `.env.local` and fill in the project URL and the **public** anon/publishable key.
For the live site, add the same values as GitHub repository **variables** `SUPABASE_URL` and `SUPABASE_KEY`.
The build refuses secret/service_role keys. Without these values (or if Supabase is unreachable) the site works
normally, just without other people. Code: `src/lib/presence.ts`, `src/lib/usePresence.ts`, `src/components/People.tsx`.

Everyone in a room is shown (no limit): each person gets a stable spot from their id, people spread across
the room before overlapping like a crowd, lower on screen is drawn in front, and you're always on top.
Feet are placed inside each room's floor band, `floorTop`–`floorBottom` in `rooms.json` (% of the room image's
height); people further back are drawn at ~90%. Avatars stay off the clickable object, the Living Room cat,
and (when the whole room fits on screen) the arrows. Placement logic: `src/lib/crowd.ts`.

For local testing without real visitors, add `?fakePeers=8` to the dev URL (development only).

## Design Resources board (Living Room)

Tapping the Living Room's pink picture opens a shared board of design links. Anyone can read it and add to it;
cards show the title, optional description, category, website domain and "Shared by [name]", newest first, with
category filters. New cards appear for everyone right away (Supabase Realtime).

- **Rules (in the browser, `src/lib/resources.ts`):** link must start with http:// or https://, title ≤ 60, description ≤ 140,
  a category, no duplicate links, at most 5 per hour, and the title, description and website go through the name filter.
  Rows loaded from the database are checked again (bad links dropped, bad names shown as "Guest").
- **Rules (in the database, `supabase/resources.sql`):** the same limits as checks, a unique index on the link,
  5 per browser per hour (and 100 per hour overall), and Row Level Security: the website can only read rows that
  aren't hidden, add rows, and add reports. It can't edit, hide or delete anything.
- **Report button:** adds a row to `resource_reports`, which sets `resources.reported = true` for you to review.
- **Categories:** Typography, Motion Graphics, UI/UX, Media, Other (`CATEGORIES` in `src/lib/resources.ts` and the
  category check in `supabase/resources.sql`; change both together).
- **Setup:** run `supabase/resources.sql` in Supabase → SQL Editor. It's safe to run again after changes (it updates
  the categories). The board starts empty.
- **Moderating:** Supabase → Table Editor → `resources`. Filter `reported` is `true` to see reports. Tick `hidden` to
  take a card down (it disappears on next open), or delete the row.
- **Local development** reads the real board but doesn't send anything to it. Add `?liveBoard` to the dev URL to really send.
- Code: `src/components/ResourceBoard.tsx`, `src/lib/useResources.ts`, `src/lib/resources.ts`.

## Still needed from the team (`TODO (team)`)

- **The 8th host professor.** The spec says 8 but lists 7, and the assignment table only uses those 7.
- **Host bios** (`professors.json` → `bio`), and each professor's permission to use their name and likeness.
- **Course descriptions**, plus the content questions in PRD §6 (AR594/AR596 duplicates, AR545's full title).
- **Later:** the yellow freshman hat.
