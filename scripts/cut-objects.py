"""
Cuts each room's clickable object out of its scene art, for the hover glow and the shine
on touch screens (they follow the object's shape instead of its rectangle).

    python3 scripts/cut-objects.py        (needs Pillow: pip install pillow)

Writes public/objects/<room>.png (the object on a transparent background) and
src/data/object-art.json (where each cut-out sits, in % of the scene). Re-run it after
changing a scene image or a room's `object` box in rooms.json.

Rooms in SHAPED are cut along the object's outline: starting from the middle of the object
box, it grows through the colours found there, skipping colours that belong to the
background. Other rooms' objects are rectangles (pictures, screens), so their box is used.
"""
import json
from collections import Counter, deque
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SHAPED = {"attic", "bedroom", "studio-room", "kitchen", "pantry", "library", "playroom"}
# Objects next to something very dark of a similar shade (the bedroom cat lies along the dark window ledge).
SKIP_DARK = {"bedroom"}


def dist(a, b):
    return abs(a[0] - b[0]) + abs(a[1] - b[1]) + abs(a[2] - b[2])


def grow(im, box, margin=0.2, tol=12, core=0.5, bg_cover=0.85, skip_dark=False):
    W, H = im.size
    x0, y0, x1, y1 = box
    mw, mh = int((x1 - x0) * margin), int((y1 - y0) * margin)
    X0, Y0, X1, Y1 = max(0, x0 - mw), max(0, y0 - mh), min(W, x1 + mw), min(H, y1 + mh)
    reg = im.crop((X0, Y0, X1, Y1))
    w, h = reg.size
    px = reg.load()
    # Background = the colours that cover most of the region's edge.
    border = [px[x, y] for x in range(w) for y in (0, h - 1)] + [px[x, y] for y in range(h) for x in (0, w - 1)]
    bg, acc = [], 0
    for c, n in Counter(border).most_common():
        bg.append(c)
        acc += n
        if acc / len(border) >= bg_cover:
            break
    # Object = the colours in the middle of the box that aren't background.
    cx0, cy0 = int(x0 - X0 + (x1 - x0) * (1 - core) / 2), int(y0 - Y0 + (y1 - y0) * (1 - core) / 2)
    cx1, cy1 = int(x0 - X0 + (x1 - x0) * (1 + core) / 2), int(y0 - Y0 + (y1 - y0) * (1 + core) / 2)
    counts = Counter(px[x, y] for x in range(cx0, cx1) for y in range(cy0, cy1))
    pal = [c for c, n in counts.most_common() if n >= 4 and not any(dist(c, b) <= tol for b in bg)]
    if skip_dark:
        pal = [c for c in pal if sum(c) > 180]
    ok = lambda c: any(dist(c, p) <= tol for p in pal)
    mask = [[False] * h for _ in range(w)]
    seen = [[False] * h for _ in range(w)]
    q = deque((x, y) for x in range(cx0, cx1) for y in range(cy0, cy1) if ok(px[x, y]))
    while q:
        x, y = q.popleft()
        if seen[x][y]:
            continue
        seen[x][y] = True
        if not ok(px[x, y]):
            continue
        mask[x][y] = True
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < w and 0 <= ny < h and not seen[nx][ny]:
                q.append((nx, ny))
    fill_holes(mask, w, h)
    return (X0, Y0), mask, w, h


def fill_holes(mask, w, h):
    """Anything the outside can't reach (an eye, a gap between colours) becomes part of the object."""
    out = [[False] * h for _ in range(w)]
    q = deque([(x, y) for x in range(w) for y in (0, h - 1)] + [(x, y) for y in range(h) for x in (0, w - 1)])
    while q:
        x, y = q.popleft()
        if out[x][y] or mask[x][y]:
            continue
        out[x][y] = True
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < w and 0 <= ny < h:
                q.append((nx, ny))
    for x in range(w):
        for y in range(h):
            if not out[x][y]:
                mask[x][y] = True


def main():
    rooms = json.loads((ROOT / "src/data/rooms.json").read_text())["rooms"]
    result = {}
    for r in rooms:
        im = Image.open(ROOT / "public" / r["sceneImage"]).convert("RGBA")
        W, H = im.size
        o = r["object"]
        box = (round(o["x"] / 100 * W), round(o["y"] / 100 * H), round((o["x"] + o["w"]) / 100 * W), round((o["y"] + o["h"]) / 100 * H))
        if r["id"] in SHAPED:
            (X0, Y0), mask, w, h = grow(im.convert("RGB"), box, skip_dark=r["id"] in SKIP_DARK)
            xs = [x for x in range(w) for y in range(h) if mask[x][y]]
            ys = [y for x in range(w) for y in range(h) if mask[x][y]]
            bx0, by0, bx1, by1 = min(xs), min(ys), max(xs) + 1, max(ys) + 1
            cut = Image.new("RGBA", (bx1 - bx0, by1 - by0), (0, 0, 0, 0))
            src, dst = im.load(), cut.load()
            for x in range(bx0, bx1):
                for y in range(by0, by1):
                    if mask[x][y]:
                        dst[x - bx0, y - by0] = src[X0 + x, Y0 + y]
            left, top = X0 + bx0, Y0 + by0
        else:
            cut = im.crop(box)
            left, top = box[0], box[1]
        name = f"objects/{r['id']}.png"
        cut.save(ROOT / "public" / name, optimize=True)
        pct = lambda v, size: round(v / size * 100, 3)
        result[r["id"]] = {"image": name, "x": pct(left, W), "y": pct(top, H), "w": pct(cut.width, W), "h": pct(cut.height, H)}
        print(f"{r['id']:13} {'shape' if r['id'] in SHAPED else 'rect '} {cut.size}")
    (ROOT / "src/data/object-art.json").write_text(json.dumps(result, indent=2) + "\n")


if __name__ == "__main__":
    main()
