# Graphic Design House

An interactive map of BU's Graphic Design curriculum, shown as a house. Built from `PRD.md`.
It's a static Vite + React + TypeScript site with no backend.

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
Tapping it opens the room's class list. It glows on the first visit, and the tap target never shrinks below 44×44px. Everything else in the scene is decoration.

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
"Retake quiz" clears the answers. If storage is blocked (some private-browsing modes), the site still works,
it just won't remember answers after a refresh. Routing logic is in `src/lib/router.ts`.

## Still needed from the team (`TODO (team)`)

- **The 8th host professor.** The spec says 8 but lists 7, and the assignment table only uses those 7.
- **Host bios** (`professors.json` → `bio`), and each professor's permission to use their name and likeness.
- **Course descriptions**, plus the content questions in PRD §6 (AR594/AR596 duplicates, AR545's full title).
- **Later:** the yellow freshman hat.
