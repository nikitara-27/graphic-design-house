import type { ReactElement } from "react";

/**
 * Pixel-art helpers drawn on the same grid as the team's character art
 * (1925×2000 viewBox, 85.7-unit pixels, head top on row 1), so anything layered
 * on a character (e.g. the future freshman hat) lines up on placeholders too.
 */
const U = 85.7;
const OFFSET_Y = 32;
export const CHARACTER_VIEWBOX = "0 0 1925 2000";

function Grid({ rows, colors }: { rows: string[]; colors: Record<string, string> }) {
  const rects: ReactElement[] = [];
  rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const ch = row[x];
      let run = 1;
      while (row[x + run] === ch) run++;
      if (colors[ch]) {
        rects.push(
          <rect key={`${x}-${y}`} x={x * U} y={OFFSET_Y + y * U} width={run * U + 1} height={U + 1} fill={colors[ch]} />,
        );
      }
      x += run;
    }
  });
  return <>{rects}</>;
}

const FIGURE = [
  "......................",
  ".......hhhhhhhh.......",
  ".....hhhhhhhhhhhh.....",
  "....hhhhhhhhhhhhhh....",
  "....hhhhhhhhhhhhhh....",
  "....hhhhhhhhhhhhhh....",
  "....hhffffffffffhh....",
  "....hffffffffffffh....",
  "....hffeffffffeffh....",
  "....hffeffffffeffh....",
  "....ffffffffffffff....",
  ".....fffffmmfffff.....",
  "......ffffffffff......",
  ".......ssssssss.......",
  ".....ffssssssssff.....",
  ".....ffssssssssff.....",
  ".......ssssssss.......",
  ".......pppppppp.......",
  ".......ppp..ppp.......",
  ".......kkk..kkk.......",
];

/** A generic "mystery professor" used until real character art is assigned. */
export function PlaceholderFigure({ tint }: { tint: "pink" | "blue" }) {
  const c =
    tint === "pink"
      ? { h: "#6D2749", f: "#ECC6B8", s: "#EF8DB3" }
      : { h: "#385B48", f: "#F3EDE8", s: "#6FACCF" };
  return (
    <svg viewBox={CHARACTER_VIEWBOX} aria-hidden="true" focusable="false">
      <Grid rows={FIGURE} colors={{ ...c, e: "#385B48", m: "#385B48", p: "#8A6C37", k: "#385B48" }} />
    </svg>
  );
}
