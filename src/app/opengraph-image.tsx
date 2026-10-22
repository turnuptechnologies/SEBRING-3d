import { ImageResponse } from "next/og"
import { readFile } from "node:fs/promises"
import { join } from "node:path"

import { BADGE_PATH, MARK_PATH } from "@/components/brand/logo"
import { scales } from "@/lib/catalog"
import { primaryNav, site } from "@/lib/site"

export const alt = `${site.name} — slot cars, parts and upgrades, shipped from ${site.address.city}, ${site.address.region}`
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

// Static instances of the brand faces (OFL — licences in src/app/fonts). Read
// once at module scope: they never depend on the request.
const fontDir = join(process.cwd(), "src/app/fonts")
const [archivoExpandedBlack, archivoSemiExpandedBold, geistMedium, geistMonoMedium] = await Promise.all([
  readFile(join(fontDir, "archivo-expanded-black.ttf")),
  readFile(join(fontDir, "archivo-semiexpanded-bold.ttf")),
  readFile(join(fontDir, "geist-medium.ttf")),
  readFile(join(fontDir, "geist-mono-medium.ttf")),
])

const C = {
  carbon: "#0b0b0f",
  deep: "#060609",
  ivory: "#f3efe6",
  smoke: "#a6a3ad",
  dim: "#5c5a65",
  volt: "#ffd23f",
  signal: "#ff4b3a",
  copper: "#d08a5c",
}

/**
 * Two-lane slot track sweeping in from the bottom-left. The band narrows to the
 * right (perspective), and long-exposure light trails run along both slots.
 */
const EDGE_TOP = "M -100 556 C 300 498 700 470 1300 452"
const LANE_A = "M -100 618 C 300 542 700 503 1300 479"
const LANE_B = "M -100 702 C 300 600 700 546 1300 510"
const EDGE_BOTTOM = "M -100 772 C 300 652 700 588 1300 541"
const BAND = `${EDGE_TOP} L 1300 541 C 700 588 300 652 -100 772 Z`

const GRID = 60

function Backdrop() {
  const cols = Array.from({ length: Math.floor(1200 / GRID) }, (_, i) => (i + 1) * GRID)
  const rows = Array.from({ length: Math.floor(630 / GRID) }, (_, i) => (i + 1) * GRID)
  return (
    <svg width="1200" height="630" viewBox="0 0 1200 630" style={{ position: "absolute", left: 0, top: 0 }}>
      <defs>
        <radialGradient id="spot" cx="0.34" cy="0.36" r="0.75">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.075" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="gridFade" cx="0.42" cy="0.4" r="0.7">
          <stop offset="0" stopColor="#ffffff" stopOpacity="1" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <mask id="gridMask">
          <rect width="1200" height="630" fill="url(#gridFade)" />
        </mask>
        <linearGradient id="asphalt" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#17171f" stopOpacity="1" />
          <stop offset="1" stopColor="#141419" stopOpacity="0.7" />
        </linearGradient>
        <linearGradient id="headlight" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={C.volt} stopOpacity="0" />
          <stop offset="0.5" stopColor={C.volt} stopOpacity="0.25" />
          <stop offset="0.86" stopColor={C.volt} stopOpacity="0.95" />
          <stop offset="1" stopColor="#fff6d6" stopOpacity="1" />
        </linearGradient>
        <linearGradient id="taillight" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={C.signal} stopOpacity="1" />
          <stop offset="0.3" stopColor={C.signal} stopOpacity="0.45" />
          <stop offset="0.72" stopColor={C.signal} stopOpacity="0" />
        </linearGradient>
        <filter id="glow" x="-10%" y="-60%" width="120%" height="220%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
      </defs>

      <rect width="1200" height="630" fill="url(#spot)" />
      <g mask="url(#gridMask)" stroke={C.ivory} strokeOpacity="0.06" strokeWidth="1">
        {cols.map((x) => (
          <path key={`c${x}`} d={`M ${x} 0 V 630`} />
        ))}
        {rows.map((y) => (
          <path key={`r${y}`} d={`M 0 ${y} H 1200`} />
        ))}
      </g>

      {/* Racing surface, edges and a dashed centre line */}
      <path d={BAND} fill="url(#asphalt)" />
      <path d={EDGE_TOP} fill="none" stroke={C.ivory} strokeOpacity="0.28" strokeWidth="1.5" />
      <path d={EDGE_BOTTOM} fill="none" stroke={C.ivory} strokeOpacity="0.16" strokeWidth="1.5" />
      <path d="M -100 660 C 300 571 700 524 1300 494" fill="none" stroke={C.ivory} strokeOpacity="0.12" strokeWidth="1" strokeDasharray="18 16" />

      {/* Slots: copper braid either side of a dark groove */}
      {[LANE_A, LANE_B].map((d) => (
        <g key={d}>
          <path d={d} fill="none" stroke={C.copper} strokeOpacity="0.45" strokeWidth="9" />
          <path d={d} fill="none" stroke={C.deep} strokeWidth="5.5" />
        </g>
      ))}

      {/* Long-exposure trails: headlights on lane A, taillights on lane B */}
      <path d={LANE_A} fill="none" stroke="url(#headlight)" strokeWidth="10" filter="url(#glow)" />
      <path d={LANE_A} fill="none" stroke="url(#headlight)" strokeWidth="2.4" />
      <path d={LANE_B} fill="none" stroke="url(#taillight)" strokeWidth="10" filter="url(#glow)" />
      <path d={LANE_B} fill="none" stroke="url(#taillight)" strokeWidth="2" />
    </svg>
  )
}

function Mark({ size: s }: { size: number }) {
  return (
    <svg width={s} height={s} viewBox="2 2 44 44">
      <path d={BADGE_PATH} fill={C.volt} />
      <path d={MARK_PATH} fill="none" stroke={C.carbon} strokeWidth="7.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d={MARK_PATH} fill="none" stroke={C.volt} strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}

/** The Night Shift social card, shared by opengraph-image and twitter-image. */
export function SocialCard() {
  const host = new URL(site.url).host.replace(/^www\./, "")
  const shopLabels = primaryNav.filter((n) => n.menu !== "sale").map((n) => n.label)
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        backgroundColor: C.carbon,
        color: C.ivory,
        fontFamily: "Geist",
      }}
    >
      <Backdrop />

      <div style={{ position: "relative", display: "flex", flexDirection: "column", width: "100%", height: "100%", padding: "54px 64px" }}>
        {/* Masthead */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <Mark size={52} />
            <div style={{ display: "flex", fontFamily: "Geist Mono", fontSize: 15, letterSpacing: 5, color: C.volt, textTransform: "uppercase" }}>
              Slot Cars &amp; Raceways
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, fontFamily: "Geist Mono", fontSize: 15, letterSpacing: 3, color: C.smoke }}>
            <span style={{ display: "flex", textTransform: "uppercase" }}>{`${site.address.city}, ${site.address.region}`}</span>
            <span style={{ display: "flex", width: 6, height: 6, backgroundColor: C.volt }} />
            <span style={{ display: "flex", color: C.ivory }}>{host}</span>
          </div>
        </div>

        {/* Wordmark — chrome gradient through the letterforms */}
        <div
          style={{
            display: "flex",
            marginTop: 50,
            marginLeft: -6,
            fontFamily: "Archivo Expanded",
            fontWeight: 900,
            fontSize: 186,
            lineHeight: 0.8,
            letterSpacing: -7,
            backgroundImage: "linear-gradient(180deg, #ffffff 0%, #ece7dc 40%, #a29d92 52%, #f3efe6 64%, #d6d0c4 100%)",
            backgroundClip: "text",
            color: "transparent",
          }}
        >
          SEBRING
        </div>

        <div style={{ display: "flex", marginTop: 30, fontSize: 33, letterSpacing: -0.6, color: C.ivory }}>
          Slot cars, parts &amp; upgrades — shipped to your door.
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 24 }}>
          <div style={{ display: "flex", gap: 10 }}>
            {shopLabels.map((label) => (
              <div
                key={label}
                style={{
                  display: "flex",
                  padding: "9px 14px",
                  border: "1px solid rgba(243,239,230,0.18)",
                  borderRadius: 4,
                  backgroundColor: "rgba(11,11,15,0.72)",
                  fontFamily: "Archivo SemiExpanded",
                  fontWeight: 700,
                  fontSize: 14,
                  letterSpacing: 1.6,
                  textTransform: "uppercase",
                  color: C.ivory,
                }}
              >
                {label}
              </div>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, fontFamily: "Geist Mono", fontSize: 15, letterSpacing: 3, color: C.smoke, textTransform: "uppercase" }}>
            <span style={{ display: "flex", color: C.dim }}>Scale</span>
            <span style={{ display: "flex" }}>{scales.map((s) => s.label).join(" · ")}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export const socialCardFonts = [
  { name: "Archivo Expanded", data: archivoExpandedBlack, weight: 900 as const, style: "normal" as const },
  { name: "Archivo SemiExpanded", data: archivoSemiExpandedBold, weight: 700 as const, style: "normal" as const },
  { name: "Geist", data: geistMedium, weight: 500 as const, style: "normal" as const },
  { name: "Geist Mono", data: geistMonoMedium, weight: 500 as const, style: "normal" as const },
]

export default function OpengraphImage() {
  return new ImageResponse(<SocialCard />, { ...size, fonts: socialCardFonts })
}
