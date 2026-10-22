/**
 * Deterministic timeline for the hero loop. Each car gets one "run": it comes
 * out of the fog, accelerates down the straight, drops into a slow-motion
 * speed ramp as it fills the foreground, then whips past the lens. Time inside
 * a run is warped (sim time σ advances at rate r(σ) ≤ 1), and everything that
 * moves — car, wheels, camera drift, mist — reads σ, so the ramp feels like a
 * real high-speed camera rather than the car braking.
 */

export interface RunConfig {
  /** Car centre z when the run starts (well inside the fog). */
  zStart: number
  /** Car centre z at the deepest point of the slow-motion ramp. */
  zHero: number
  /** Car centre z when it has fully passed the lens. */
  zEnd: number
  /** Sim-time speed at the start of the run (units/s) and acceleration. */
  v0: number
  accel: number
  /** Slowest time rate during the ramp and its half-width in sim seconds. */
  rampMin: number
  rampWidth: number
  /** Empty track between two runs (real seconds). */
  gap: number
}

export const DEFAULT_RUN: RunConfig = {
  zStart: -78,
  zHero: -2.25,
  zEnd: 3.4,
  v0: 15,
  accel: 2.8,
  rampMin: 0.085,
  rampWidth: 0.085,
  gap: 0.55,
}

export interface RunSample {
  /** Index of the run since t = 0 (car index = run % cars.length). */
  run: number
  /** Real seconds since this run began. */
  u: number
  /** Sim seconds since this run began. */
  sigma: number
  /** Continuous sim time across runs (drives camera drift and mist). */
  simTime: number
  /** Car centre z; > zEnd while the track is empty between runs. */
  z: number
  /** Real-time ground speed of the car (units/s). */
  speed: number
  /** Current time rate (1 = real time). */
  rate: number
  /** 0 → 1 over the approach, used for exposure and flare ramps. */
  progress: number
  /** True while the car is on the visible part of the straight. */
  onTrack: boolean
}

export interface Timeline {
  config: RunConfig
  /** Real duration of one run including the gap. */
  period: number
  /** Real time (within a run) of the slow-motion centre. */
  heroU: number
  /** Sim duration of one run including the gap. */
  simPeriod: number
  sample(t: number): RunSample
}

export function createTimeline(config: RunConfig = DEFAULT_RUN): Timeline {
  const { zStart, zHero, zEnd, v0, accel, rampMin, rampWidth, gap } = config
  const solve = (z: number) => (-v0 + Math.sqrt(v0 * v0 + 2 * accel * (z - zStart))) / accel
  const sigmaHero = solve(zHero)
  const sigmaEnd = solve(zEnd)
  // Flat-bottomed ramp (super-Gaussian): a quick dip, a long hold, a quick release.
  const rate = (sigma: number) => 1 - (1 - rampMin) * Math.exp(-(((sigma - sigmaHero) / rampWidth) ** 4))

  // Integrate u(σ) = ∫ dσ / r(σ), then resample σ on a uniform u grid for O(1) lookups.
  const steps = 8000
  const dSigma = sigmaEnd / steps
  const uOfSigma = new Float64Array(steps + 1)
  for (let i = 1; i <= steps; i++) {
    const mid = (i - 0.5) * dSigma
    uOfSigma[i] = uOfSigma[i - 1] + dSigma / rate(mid)
  }
  const uEnd = uOfSigma[steps]
  const gridStep = 1 / 1000
  const gridCount = Math.ceil(uEnd / gridStep) + 2
  const sigmaGrid = new Float64Array(gridCount)
  let j = 0
  for (let g = 0; g < gridCount; g++) {
    const u = g * gridStep
    while (j < steps && uOfSigma[j + 1] < u) j++
    if (j >= steps) {
      sigmaGrid[g] = sigmaEnd
      continue
    }
    const a = uOfSigma[j]
    const b = uOfSigma[j + 1]
    sigmaGrid[g] = (j + (b > a ? (u - a) / (b - a) : 0)) * dSigma
  }
  let heroU = 0
  for (let i = 0; i <= steps; i++) {
    if (i * dSigma >= sigmaHero) {
      heroU = uOfSigma[i]
      break
    }
  }

  const period = uEnd + gap
  const simPeriod = sigmaEnd + gap

  function sigmaAt(u: number): number {
    if (u >= uEnd) return sigmaEnd + (u - uEnd)
    const f = u / gridStep
    const i = Math.floor(f)
    const k = f - i
    return sigmaGrid[i] * (1 - k) + sigmaGrid[Math.min(i + 1, gridCount - 1)] * k
  }

  function sample(t: number): RunSample {
    const time = Math.max(0, t)
    const run = Math.floor(time / period)
    const u = time - run * period
    const sigma = sigmaAt(u)
    const inRun = sigma <= sigmaEnd
    const s = Math.min(sigma, sigmaEnd)
    const vSim = v0 + accel * s
    const r = inRun ? rate(s) : 1
    const z = inRun ? zStart + v0 * s + 0.5 * accel * s * s : zEnd + 30 * (sigma - sigmaEnd)
    return {
      run,
      u,
      sigma,
      simTime: run * simPeriod + sigma,
      z,
      speed: inRun ? vSim * r : 0,
      rate: r,
      progress: Math.min(1, Math.max(0, (z - zStart) / (zHero - zStart))),
      onTrack: inRun,
    }
  }

  return { config, period, heroU, simPeriod, sample }
}
