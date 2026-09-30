import { describe, expect, it } from "vitest";

// Text/background pairs the UI actually uses. Keep in sync with styles.css.
const C = {
  cream: "#F3EDE8", sage: "#B7D0A4", forest: "#385B48", blush: "#ECC6B8", plum: "#6D2749",
  lavender: "#D2BFD6", butter: "#EBD48F", periwinkle: "#C3D2E9",
};
const PAIRS: [keyof typeof C, keyof typeof C, string][] = [
  ["forest", "cream", "body text"],
  ["plum", "cream", "headings, room names"],
  ["cream", "plum", "primary button, selected quiz option, current room"],
  ["cream", "forest", "door labels"],
  ["cream", "plum", "look-around hint"],
  ["forest", "sage", "text on sage fills"],
  ["forest", "butter", "Your room / match tags"],
  ["plum", "lavender", "inactive tag"],
  ["forest", "periwinkle", "notes"],
  ["plum", "blush", "blush fills"],
];

const lum = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a: string, b: string) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

describe("brand text contrast", () => {
  it.each(PAIRS)("%s on %s (%s) is at least 4.5:1", (fg, bg) => {
    expect(ratio(C[fg], C[bg])).toBeGreaterThanOrEqual(4.5);
  });
});
