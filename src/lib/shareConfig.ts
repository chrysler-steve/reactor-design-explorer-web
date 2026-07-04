import type { RxParams } from './rxKinetics'

export const SHARE_QUERY_KEY = 'p'

function isFiniteNumberArray(arr: unknown, length: number): arr is number[] {
  return Array.isArray(arr) && arr.length === length && arr.every((v) => typeof v === 'number' && Number.isFinite(v))
}

/** Beyond shape, enforces the same domain invariants the store's own setters
 * (coerceNu0, setC0's clamp) apply — a decoded link bypasses those setters via
 * `reset()`, so this is the only guard standing between a crafted/corrupted
 * link and physics functions that assume species 1 is a reactant (nu[0] &lt; 0)
 * and that Vr/qmin/qmax are strictly positive (they're used as divisors). */
function isValidRxParams(x: unknown): x is RxParams {
  if (typeof x !== 'object' || x === null) return false
  const p = x as Record<string, unknown>
  return (
    Array.isArray(p.species) &&
    p.species.length === 4 &&
    p.species.every((s) => typeof s === 'string') &&
    isFiniteNumberArray(p.nu, 4) &&
    p.nu[0] < 0 &&
    isFiniteNumberArray(p.C0s, 4) &&
    p.C0s.every((v) => v >= 0) &&
    (p.rateForm === 1 || p.rateForm === 2) &&
    typeof p.nA === 'number' &&
    Number.isFinite(p.nA) &&
    typeof p.nB === 'number' &&
    Number.isFinite(p.nB) &&
    typeof p.Ea === 'number' &&
    Number.isFinite(p.Ea) &&
    typeof p.A === 'number' &&
    Number.isFinite(p.A) &&
    typeof p.Vr === 'number' &&
    p.Vr > 0 &&
    typeof p.tmax === 'number' &&
    p.tmax > 0 &&
    typeof p.Tmin === 'number' &&
    typeof p.Tmax === 'number' &&
    Number.isFinite(p.Tmin) &&
    p.Tmax > p.Tmin &&
    typeof p.qmin === 'number' &&
    p.qmin > 0 &&
    typeof p.qmax === 'number' &&
    p.qmax >= p.qmin
  )
}

export function encodeParams(params: RxParams): string {
  return btoa(encodeURIComponent(JSON.stringify(params)))
}

/** Returns null on any malformed/tampered input rather than throwing —
 * callers treat a bad share link as "no link", not an error. */
export function decodeParams(encoded: string): RxParams | null {
  try {
    const parsed: unknown = JSON.parse(decodeURIComponent(atob(encoded)))
    return isValidRxParams(parsed) ? parsed : null
  } catch {
    return null
  }
}

/** Builds a shareable link to the current page with the params encoded into
 * the `p` query param, so a specific reaction setup can be sent as one URL. */
export function buildShareUrl(params: RxParams): string {
  const url = new URL(window.location.href)
  url.searchParams.set(SHARE_QUERY_KEY, encodeParams(params))
  return url.toString()
}
