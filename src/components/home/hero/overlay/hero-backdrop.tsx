import type { CSSProperties } from "react"

import { cn } from "@/lib/utils"

/** Lane centres as a fraction of the track width (4 lanes, like the 3D raceway). */
const LANES = [0.125, 0.375, 0.625, 0.875]

/*
 * The track is a real CSS 3D floor: a long plane hinged on the bottom edge of
 * the hero and laid flat with rotateX(90deg), seen from the perspective origin
 * (the vanishing point). Patterns on it foreshorten naturally, and the light
 * trails travel along it with transform only.
 */
const KEYFRAMES = `
@keyframes sb-trail {
  from { transform: translate3d(0, 0, 0); }
  to { transform: translate3d(0, var(--trail-travel), 0); }
}
@keyframes sb-haze {
  0%, 100% { transform: translate3d(-3%, 0, 0) scale(1); opacity: .75; }
  50% { transform: translate3d(3%, -2%, 0) scale(1.06); opacity: 1; }
}
`

/**
 * Designed fallback for the hero background: a night raceway in CSS (sky glow,
 * fogged horizon, four-lane routed track with braid, curbs, lamp pools and
 * long-exposure light trails). Shown until the poster render and the realtime
 * scene exist, and to visitors without WebGL.
 */
export function HeroBackdrop({ className, still = false }: { className?: string; still?: boolean }) {
  return (
    <div aria-hidden="true" className={cn("absolute inset-0 overflow-hidden bg-carbon-950", className)}>
      <style href="sebring-hero-backdrop" precedence="default">
        {KEYFRAMES}
      </style>

      {/* Sky: deep carbon with a sodium-lamp bloom low on the horizon. */}
      <div className="absolute inset-0 bg-[radial-gradient(70%_42%_at_50%_47%,rgb(208_138_92/0.22),transparent_72%),radial-gradient(120%_80%_at_50%_0%,#101018,transparent_70%)]" />
      <div className="absolute inset-x-0 top-[36%] h-[22%] bg-[radial-gradient(46%_50%_at_50%_55%,rgb(243_239_230/0.13),transparent_75%)] blur-2xl" style={still ? undefined : { animation: "sb-haze 14s ease-in-out infinite" }} />

      {/* Distant floodlight gantries: soft points along the horizon. */}
      <div className="absolute inset-x-0 top-[44.5%] flex justify-center gap-[7vw] opacity-80">
        {[0.35, 0.6, 1, 0.6, 0.35].map((o, i) => (
          <span key={i} className="size-1 rounded-full bg-ivory-100 shadow-[0_0_14px_4px_rgb(255_224_122/0.45)]" style={{ opacity: o }} />
        ))}
      </div>

      {/* The floor. */}
      <div className="absolute inset-0 [perspective-origin:50%_47%] [perspective:560px]">
        <div
          className="absolute bottom-0 left-1/2 h-[4200px] w-[1400px] origin-bottom [transform:translateX(-50%)_rotateX(90deg)] [mask-image:linear-gradient(to_top,#000_22%,rgb(0_0_0/0.55)_52%,transparent_88%)] max-md:w-[1180px]"
          style={{ "--trail-travel": "4600px" } as CSSProperties}
        >
          {/* Verge either side, slightly lighter than the track. */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#0c0d0e,#111214_22%,#08080b_30%,#08080b_70%,#111214_78%,#0c0d0e)]" />
          {/* Lamp pools on the verges. */}
          <div className="absolute inset-y-0 left-[16%] w-[14%] bg-[radial-gradient(closest-side,rgb(255_210_63/0.16),transparent)] bg-[length:100%_620px] bg-repeat-y" />
          <div className="absolute inset-y-0 right-[16%] w-[14%] bg-[radial-gradient(closest-side,rgb(255_210_63/0.16),transparent)] bg-[length:100%_620px] bg-repeat-y bg-[position:0_310px]" />

          {/* Racing surface. */}
          <div className="absolute inset-y-0 left-[30%] w-[40%] bg-[linear-gradient(to_right,#0e0e12,#15151b_50%,#0e0e12)]">
            {/* Lamp light washing across the surface. */}
            <div className="absolute inset-0 bg-[radial-gradient(60%_180px_at_50%_50%,rgb(243_239_230/0.06),transparent)] bg-[length:100%_620px] bg-repeat-y" />
            {/* Edge lines. */}
            <div className="absolute inset-y-0 left-[3%] w-[3px] bg-ivory-100/30" />
            <div className="absolute inset-y-0 right-[3%] w-[3px] bg-ivory-100/30" />
            {/* Slots with copper braid either side. */}
            {LANES.map((x) => (
              <div key={x} className="absolute inset-y-0 w-[26px] -translate-x-1/2" style={{ left: `${x * 100}%` }}>
                <div className="absolute inset-y-0 left-0 w-[6px] bg-copper/55" />
                <div className="absolute inset-y-0 left-1/2 w-[7px] -translate-x-1/2 bg-black" />
                <div className="absolute inset-y-0 right-0 w-[6px] bg-copper/55" />
              </div>
            ))}
          </div>
          {/* Curbs. */}
          <div className="absolute inset-y-0 left-[28.6%] w-[1.4%] bg-[repeating-linear-gradient(to_bottom,#c8102e_0_46px,#f4f4f2_46px_92px)] opacity-55" />
          <div className="absolute inset-y-0 right-[28.6%] w-[1.4%] bg-[repeating-linear-gradient(to_bottom,#c8102e_0_46px,#f4f4f2_46px_92px)] opacity-55" />

          {/* Long-exposure light trails running down two lanes toward the lens. */}
          {!still && (
            <>
              <Trail lane={LANES[1]} color="rgb(255 238 190)" delay="0s" duration="3.4s" />
              <Trail lane={LANES[2]} color="rgb(255 75 58)" delay="1.7s" duration="4.6s" faint />
            </>
          )}
        </div>
      </div>

      {/* Horizon fog band and lens vignette. */}
      <div className="absolute inset-x-0 top-[38%] h-[18%] bg-[linear-gradient(to_bottom,transparent,rgb(19_19_25/0.9)_50%,transparent)] blur-md" />
      <div className="absolute inset-0 bg-[radial-gradient(130%_95%_at_50%_45%,transparent_55%,rgb(6_6_9/0.85))]" />
    </div>
  )
}

function Trail({ lane, color, delay, duration, faint = false }: { lane: number; color: string; delay: string; duration: string; faint?: boolean }) {
  return (
    <div
      className="absolute top-[-420px] h-[420px] w-[34px] -translate-x-1/2"
      style={{ left: `calc(30% + ${lane * 40}%)`, animation: `sb-trail ${duration} linear ${delay} infinite both` }}
    >
      <div
        className="absolute inset-0 rounded-full blur-[6px]"
        style={{ background: `linear-gradient(to bottom, transparent, ${color})`, opacity: faint ? 0.55 : 0.9 }}
      />
      <div className="absolute inset-x-[38%] inset-y-0 rounded-full" style={{ background: `linear-gradient(to bottom, transparent, ${color})`, opacity: faint ? 0.7 : 1 }} />
    </div>
  )
}
