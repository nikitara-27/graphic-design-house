/** Pencil outline (16×16). Uses currentColor, so CSS sets its colour. */
export function PencilIcon({ size = 22 }: { size?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path d="M0 0h16v16H0z" fill="none" />
      <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5">
        <polygon points="1.75 11.25 1.75 14.25 4.75 14.25 14.25 4.75 11.25 1.75" />
        <line x1="8.75" x2="11.25" y1="4.75" y2="7.25" />
      </g>
    </svg>
  );
}
