import type { Professor } from "../types";
import { asset } from "../lib/data";
import { PlaceholderFigure } from "./Pixel";

interface Props { professor: Professor; size?: "sm" | "md" | "lg"; decorative?: boolean }

export function Avatar({ professor, size = "md", decorative }: Props) {
  return (
    <div
      className={`avatar avatar-${size}`}
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : professor.name}
      aria-hidden={decorative || undefined}
    >
      {professor.image ? (
        <img src={asset(professor.image)} alt="" draggable={false} />
      ) : (
        <PlaceholderFigure tint={professor.id === "host" ? "blue" : "pink"} />
      )}
    </div>
  );
}
