/**
 * rxKinetics — TypeScript port of MATLAB's rxKinetics.m (single source of truth
 * for reactor kinetics in the desktop app). Faithful function-for-function port;
 * see docs/superpowers/specs/2026-07-02-web-deployment-design.md (main repo) for
 * the verification approach (fixtures pulled from live MATLAB output).
 *
 * Deviation from the MATLAB API: MATLAB's `caBatch`/`caCSTR`/`caPFR`/`solve_*`
 * silently collapse a 1x1 result to a "scalar". TS has no such ambiguity — these
 * functions always take/return arrays (length-1 arrays represent MATLAB scalars).
 */

const Rg = 8.314;

export interface RxParams {
  species: [string, string, string, string];
  nu: [number, number, number, number];
  C0s: [number, number, number, number];
  rateForm: 1 | 2;
  nA: number;
  nB: number;
  Ea: number;
  A: number;
  Vr: number;
  tmax: number;
  Tmin: number;
  Tmax: number;
  qmin: number;
  qmax: number;
}

/** Species-major concentration matrix: conc[i][j] = species i's concentration at sample j. */
export type ConcMatrix = [number[], number[], number[], number[]];

type State4 = [number, number, number, number];
type NumOrArr = number | number[];

export function defaultParams(): RxParams {
  return {
    species: ['A', 'B', 'C', 'D'],
    nu: [-1, -1, 1, 1],
    C0s: [0.1, 0.1, 0.0, 0.0],
    rateForm: 1,
    nA: 1,
    nB: 1,
    // Ea/A are chosen so conversion actually sweeps across the operating ranges
    // below rather than pinning at 100%: with these, batch Xa runs ~5% at Tmin,
    // ~50% at 350 K, ~100% at Tmax, and CSTR/PFR separate visibly in between
    // (at 350 K, tau=50 min: CSTR 64% vs PFR 83%). The desktop app's original
    // A = 1.11e8 put every reactor at >99% for the entire slider range, which
    // left every chart flat. Ea is unchanged and still a plausible magnitude.
    Ea: 43790,
    A: 1.2e5,
    Vr: 1.0,
    tmax: 20,
    Tmin: 298,
    Tmax: 450,
    qmin: 0.02,
    qmax: 0.5,
  }
}

export function rateConstant(P: RxParams, T: number): number
export function rateConstant(P: RxParams, T: number[]): number[]
export function rateConstant(P: RxParams, T: NumOrArr): NumOrArr {
  const f = (t: number) => P.A * Math.exp(-P.Ea / (Rg * t))
  return Array.isArray(T) ? T.map(f) : f(T)
}

export function equationString(P: RxParams): string {
  const reactants: string[] = []
  const products: string[] = []
  for (let i = 0; i < 4; i++) {
    const nu = P.nu[i]
    if (nu === 0) continue
    let nm = (P.species[i] ?? '').trim()
    if (!nm) nm = String.fromCharCode(65 + i)
    const coef = Math.abs(nu)
    const term = coef === 1 ? nm : `${formatCoef(coef)} ${nm}`
    if (nu < 0) reactants.push(term)
    else products.push(term)
  }
  const r = reactants.length ? reactants : ['?']
  const p = products.length ? products : ['?']
  return `${r.join(' + ')}  →  ${p.join(' + ')}`
}

/** Mirrors MATLAB's `%.4g` for the small integer/decimal coefficients this app uses. */
function formatCoef(x: number): string {
  if (Number.isInteger(x)) return String(x)
  return parseFloat(x.toPrecision(4)).toString()
}

/**
 * Upper bound for a species' concentration axis: the larger of its initial
 * value and its value at full species-1 conversion (a product's stoichiometric
 * coefficient can push it above every species' starting concentration).
 */
export function maxConcentration(P: RxParams): number {
  const xiMax = P.C0s[0] / Math.abs(P.nu[0])
  const vals = P.C0s.slice()
  for (let i = 0; i < 4; i++) {
    if (P.nu[i] !== 0) {
      vals[i] = Math.max(vals[i], Math.max(P.C0s[i] + P.nu[i] * xiMax, 0))
    }
  }
  const active = vals.filter((_, i) => P.nu[i] !== 0)
  return Math.max(...active, 1e-6)
}

export function rate(P: RxParams, k: number, C: State4): number {
  const C1 = Math.max(C[0], 0)
  const C2 = Math.max(C[1], 0)
  if (P.rateForm === 1) return k * Math.pow(C1, P.nA)
  return k * Math.pow(C1, P.nA) * Math.pow(C2, P.nB)
}

/** Fractional conversion of species 1 at concentration Ca. Shared by every
 * reactor page's readouts/charts so the C0s[0]<=0 edge case is handled once. */
export function conversionOf(P: RxParams, Ca: number): number {
  return P.C0s[0] > 0 ? 1 - Ca / P.C0s[0] : 0
}

/** Normalizes a rate constant logarithmically into [0,1] across [Tmin,Tmax] —
 * drives 3D-scene animation speed on a perceptually-even scale. */
export function rateFraction(P: RxParams, k: number): number {
  const kMin = rateConstant(P, P.Tmin)
  const kMax = rateConstant(P, P.Tmax)
  const logRange = Math.log(kMax) - Math.log(kMin)
  if (!(logRange > 0)) return 0
  return Math.min(Math.max((Math.log(k) - Math.log(kMin)) / logRange, 0), 1)
}

/** Normalizes a flow rate linearly into [0,1] across [qmin,qmax] — drives 3D
 * particle/impeller animation speed for CSTR and PFR. */
export function flowFractionOf(P: RxParams, q: number): number {
  return P.qmax > P.qmin ? (q - P.qmin) / (P.qmax - P.qmin) : 0
}

// ── Broadcasting helpers (mirror MATLAB's elementwise .^ / .* / ./ semantics) ──

function broadcastLength(...xs: NumOrArr[]): number {
  const lens = xs.filter(Array.isArray).map((x) => x.length)
  if (lens.length === 0) return 1
  const len = lens[0]
  if (!lens.every((l) => l === len)) {
    throw new Error('rxKinetics: mismatched array lengths in broadcast')
  }
  return len
}

function toArr(x: NumOrArr, len: number): number[] {
  return Array.isArray(x) ? x : new Array(len).fill(x)
}

// ── Form 1 — closed-form nth-order solutions for the primary species ──────────

export function caBatch(P: RxParams, k: NumOrArr, t: NumOrArr): number[] {
  const N = broadcastLength(k, t)
  const ks = toArr(k, N)
  const ts = toArr(t, N)
  const C0 = P.C0s[0]
  const n = P.nA
  return ks.map((ki, i) => {
    const ti = ts[i]
    if (n === 1) return C0 * Math.exp(-ki * ti)
    const base = Math.max(Math.pow(C0, 1 - n) - (1 - n) * ki * ti, 0)
    return Math.pow(base, 1 / (1 - n))
  })
}

export function caPFR(P: RxParams, k: NumOrArr, V: NumOrArr, q: number): number[] {
  const N = broadcastLength(k, V)
  const ks = toArr(k, N)
  const Vs = toArr(V, N)
  const C0 = P.C0s[0]
  const n = P.nA
  return ks.map((ki, i) => {
    const tEff = Vs[i] / q
    if (n === 1) return C0 * Math.exp(-ki * tEff)
    const base = Math.max(Math.pow(C0, 1 - n) - (1 - n) * ki * tEff, 0)
    return Math.pow(base, 1 / (1 - n))
  })
}

/** Bisection on [lo, hi], replacing MATLAB's fzero — valid because f is monotone
 * decreasing here (f(lo) >= 0 >= f(hi) by construction of every caller below). */
function bisect(f: (x: number) => number, lo: number, hi: number, tol = 1e-12, maxIter = 100): number {
  if (hi - lo < tol) return lo
  let flo = f(lo)
  for (let i = 0; i < maxIter; i++) {
    const mid = (lo + hi) / 2
    const fm = f(mid)
    if (Math.abs(fm) < tol || (hi - lo) / 2 < tol) return mid
    if (fm > 0 === flo > 0) {
      lo = mid
      flo = fm
    } else {
      hi = mid
    }
  }
  return (lo + hi) / 2
}

export function caCSTR(P: RxParams, k: NumOrArr, tau: NumOrArr): number[] {
  const N = broadcastLength(k, tau)
  const ks = toArr(k, N)
  const taus = toArr(tau, N)
  const C0 = P.C0s[0]
  const n = P.nA
  return ks.map((ki, i) => {
    const ti = taus[i]
    if (n === 1) return C0 / (1 + ki * ti)
    // Radicand goes negative only for a nonphysical negative tau/k/C0 — clamp
    // to 0 rather than propagate NaN through every downstream concentration.
    if (n === 2) return (2 * C0) / (1 + Math.sqrt(Math.max(1 + 4 * ki * ti * C0, 0)))
    const f = (C: number) => C0 - C - ki * ti * Math.pow(C, n)
    // bisect() requires f(lo) >= 0 >= f(hi). That holds for every order above 0,
    // where C^n -> 0 as C -> 0 and so f(0) = C0 > 0. At n = 0 the rate no longer
    // vanishes with concentration (C^0 = 1), so f(0) = C0 - k*tau goes negative
    // once the residence time is long enough to consume the whole feed. There is
    // then no interior root: the reactant is simply exhausted. Without this
    // guard the bracket is invalid, bisection walks to C0, and a fully converted
    // reactor reports 0% conversion instead of 100%.
    if (f(0) <= 0) return 0
    return bisect(f, 0, C0)
  })
}

/** Extent-of-reaction stoichiometry: derives all 4 species from the primary
 * species' concentration profile. */
function deriveSpecies(P: RxParams, Ca: number[]): ConcMatrix {
  const N = Ca.length
  const { C0s, nu } = P
  const nu1 = Math.abs(nu[0])
  const out: ConcMatrix = [new Array(N), new Array(N), new Array(N), new Array(N)]
  for (let j = 0; j < N; j++) {
    const xi = (C0s[0] - Ca[j]) / nu1
    for (let i = 0; i < 4; i++) {
      out[i][j] = nu[i] === 0 ? C0s[i] : Math.max(C0s[i] + nu[i] * xi, 0)
    }
  }
  return out
}

// ── Form 2 — numerical (RK4 replaces ode45, bisection replaces fzero) ─────────

function rk4Step(deriv: (y: State4) => State4, y: State4, h: number): State4 {
  const k1 = deriv(y)
  const k2 = deriv(addScaled(y, k1, h / 2))
  const k3 = deriv(addScaled(y, k2, h / 2))
  const k4 = deriv(addScaled(y, k3, h))
  return [
    y[0] + (h / 6) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]),
    y[1] + (h / 6) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]),
    y[2] + (h / 6) * (k1[2] + 2 * k2[2] + 2 * k3[2] + k4[2]),
    y[3] + (h / 6) * (k1[3] + 2 * k2[3] + 2 * k3[3] + k4[3]),
  ]
}

function addScaled(y: State4, k: State4, s: number): State4 {
  return [y[0] + s * k[0], y[1] + s * k[1], y[2] + s * k[2], y[3] + s * k[3]]
}

const RK4_SUBSTEPS_PER_INTERVAL = 100

/** Integrates from times[0] (state = y0) through each subsequent requested time,
 * returning the state at every requested time (including the first). */
function integrateRK4(deriv: (y: State4) => State4, y0: State4, times: number[]): State4[] {
  const out: State4[] = [y0]
  let y = y0
  for (let i = 1; i < times.length; i++) {
    const span = times[i] - times[i - 1]
    const h = span / RK4_SUBSTEPS_PER_INTERVAL
    for (let s = 0; s < RK4_SUBSTEPS_PER_INTERVAL; s++) {
      y = rk4Step(deriv, y, h)
    }
    out.push(y)
  }
  return out
}

function clampMatrix(states: State4[]): ConcMatrix {
  const N = states.length
  const out: ConcMatrix = [new Array(N), new Array(N), new Array(N), new Array(N)]
  for (let j = 0; j < N; j++) {
    for (let i = 0; i < 4; i++) out[i][j] = Math.max(states[j][i], 0)
  }
  return out
}

function assertScalarFormK(k: NumOrArr, fn: string): asserts k is number {
  if (Array.isArray(k)) {
    throw new Error(`${fn}: rateForm 2 requires a scalar k (call once per condition, matching the MATLAB app's own T-sweep loop)`)
  }
}

export function solve_batch(P: RxParams, k: NumOrArr, t: NumOrArr): ConcMatrix {
  if (P.rateForm === 1) return deriveSpecies(P, caBatch(P, k, t))
  assertScalarFormK(k, 'solve_batch')
  const requestScalar = !Array.isArray(t)
  const times = Array.isArray(t) ? t : [0, t]
  const nu = P.nu
  const deriv = (y: State4): State4 => {
    const r = rate(P, k, y)
    return [nu[0] * r, nu[1] * r, nu[2] * r, nu[3] * r]
  }
  const traj = integrateRK4(deriv, P.C0s, times)
  return clampMatrix(requestScalar ? [traj[traj.length - 1]] : traj)
}

export function solve_PFR(P: RxParams, k: NumOrArr, V: NumOrArr, q: number): ConcMatrix {
  if (P.rateForm === 1) return deriveSpecies(P, caPFR(P, k, V, q))
  assertScalarFormK(k, 'solve_PFR')
  const requestScalar = !Array.isArray(V)
  const times = Array.isArray(V) ? V : [0, V]
  const nu = P.nu
  const deriv = (y: State4): State4 => {
    const r = rate(P, k, y) / q
    return [nu[0] * r, nu[1] * r, nu[2] * r, nu[3] * r]
  }
  const traj = integrateRK4(deriv, P.C0s, times)
  return clampMatrix(requestScalar ? [traj[traj.length - 1]] : traj)
}

export function solve_CSTR(P: RxParams, k: NumOrArr, tau: NumOrArr): ConcMatrix {
  if (P.rateForm === 1) return deriveSpecies(P, caCSTR(P, k, tau))
  assertScalarFormK(k, 'solve_CSTR')
  const taus = Array.isArray(tau) ? tau : [tau]
  const N = taus.length
  const { C0s, nu } = P
  const out: ConcMatrix = [new Array(N), new Array(N), new Array(N), new Array(N)]

  // Species 1 starts empty: nothing reacts. Also avoids the bisection bracket
  // [0, C0s[0]] degenerating to [0, 0].
  if (C0s[0] <= 0) {
    for (let j = 0; j < N; j++) {
      for (let i = 0; i < 4; i++) out[i][j] = Math.max(C0s[i], 0)
    }
    return out
  }

  const nu1 = Math.abs(nu[0])
  const stateFromC1 = (C1: number): State4 => {
    const xi = (C0s[0] - C1) / nu1
    return [0, 1, 2, 3].map((i) => Math.max(C0s[i] + nu[i] * xi, 0)) as State4
  }
  for (let j = 0; j < N; j++) {
    const tj = taus[j]
    const res = (C1: number) => C0s[0] - C1 - tj * rate(P, k, stateFromC1(C1))
    const C1sol = bisect(res, 0, C0s[0])
    const finalState = stateFromC1(C1sol)
    for (let i = 0; i < 4; i++) out[i][j] = finalState[i]
  }
  return out
}

/** A co-reactant that is exhausted before species 1 is. */
export interface LimitingReactant {
  /** 0-based species index. */
  index: number
  /** Conversion of species 1 at the point that species runs out, in [0,1]. */
  maxConversion: number
}

/**
 * The co-reactant, if any, that runs out before species 1 does.
 *
 * Rate form 1 is r = k*C1^n — a pseudo-order law that depends on species 1
 * alone. That is a real rate law, valid while every other reactant is in
 * excess, and it is what the desktop app models. Outside that regime it keeps
 * consuming species 1 after a co-reactant has hit zero, reporting conversions
 * the feed cannot support.
 *
 * Rather than silently changing the physics (which would fork this port from
 * the MATLAB ground truth it is verified against), callers use this to tell the
 * user their configuration has left the approximation's domain, and that rate
 * form 2 — which does track the second species — is the right tool there.
 *
 * Returns null when species 1 limits, when nothing else is a reactant, for rate
 * form 2, or when species 1 has no feed at all (conversion is undefined).
 */
export function limitingReactant(P: RxParams): LimitingReactant | null {
  if (P.rateForm !== 1) return null

  // Extent of reaction each reactant can sustain before it is exhausted.
  const capacity = (i: number) => P.C0s[i] / Math.abs(P.nu[i])

  if (P.nu[0] >= 0 || P.C0s[0] <= 0) return null
  const basis = capacity(0)

  let found: LimitingReactant | null = null
  let scarcest = basis
  for (let i = 1; i < 4; i++) {
    if (P.nu[i] >= 0) continue
    const cap = capacity(i)
    if (cap < scarcest - 1e-12) {
      scarcest = cap
      found = { index: i, maxConversion: cap / basis }
    }
  }
  return found
}
