/**
 * Painted grid box and headlight wash, drawn in the side render's own pixel
 * space (1600 × 1200, ground line at y ≈ 768, nose to the left) so it lines up
 * under any car the studio renders.
 */
export function GridFloor({ beam, uid }: { beam: string; uid: string }) {
  return (
    <svg viewBox="0 0 1600 1200" aria-hidden="true" className="pointer-events-none absolute inset-0 size-full overflow-visible">
      <defs>
        <linearGradient id={`${uid}-paint`} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="1180" y2="0">
          <stop offset="0" stopColor="#f3efe6" stopOpacity="0.82" />
          <stop offset="0.55" stopColor="#f3efe6" stopOpacity="0.4" />
          <stop offset="1" stopColor="#f3efe6" stopOpacity="0" />
        </linearGradient>
        {/* Focal point sits at the nose, so the beam is hottest at the lamps and dies away ahead. */}
        <radialGradient id={`${uid}-beam`} cx="0.5" cy="0.5" r="0.5" fx="0.94" fy="0.5">
          <stop offset="0" stopColor={beam} stopOpacity="0.3" />
          <stop offset="0.35" stopColor={beam} stopOpacity="0.1" />
          <stop offset="1" stopColor={beam} stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${uid}-pool`} cx="0.5" cy="0.5" r="0.5" fx="0.82" fy="0.5">
          <stop offset="0" stopColor={beam} stopOpacity="0.24" />
          <stop offset="0.45" stopColor={beam} stopOpacity="0.07" />
          <stop offset="1" stopColor={beam} stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${uid}-shade`}>
          <stop offset="0" stopColor="#000" stopOpacity="0.72" />
          <stop offset="1" stopColor="#000" stopOpacity="0" />
        </radialGradient>
      </defs>

      <ellipse cx="800" cy="778" rx="820" ry="50" fill={`url(#${uid}-shade)`} />

      {/* Grid box: the transverse front line and two side arms, open toward the back. */}
      <g fill="none" strokeWidth="8">
        <path d="M-34 832H1180" stroke={`url(#${uid}-paint)`} />
        <path d="M-2 740H1100" stroke={`url(#${uid}-paint)`} strokeOpacity="0.55" />
        <path d="M-34 832-2 740" stroke="#f3efe6" strokeOpacity="0.82" strokeLinecap="square" />
      </g>

      <ellipse cx="-260" cy="796" rx="700" ry="90" fill={`url(#${uid}-pool)`} />
      <ellipse cx="-330" cy="712" rx="560" ry="64" fill={`url(#${uid}-beam)`} />
    </svg>
  )
}
