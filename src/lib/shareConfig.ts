import type { RxParams } from './rxKinetics'

export const SHARE_QUERY_KEY = 'p'

function isValidRxParams(x: unknown): x is RxParams {
  if (typeof x !== 'object' || x === null) return false
  const p = x as Record<string, unknown>
  return (
    Array.isArray(p.species) &&
    p.species.length === 4 &&
    Array.isArray(p.nu) &&
    p.nu.length === 4 &&
    Array.isArray(p.C0s) &&
    p.C0s.length === 4 &&
    (p.rateForm === 1 || p.rateForm === 2) &&
    typeof p.nA === 'number' &&
    typeof p.nB === 'number' &&
    typeof p.Ea === 'number' &&
    typeof p.A === 'number' &&
    typeof p.Vr === 'number' &&
    typeof p.tmax === 'number' &&
    typeof p.Tmin === 'number' &&
    typeof p.Tmax === 'number' &&
    typeof p.qmin === 'number' &&
    typeof p.qmax === 'number'
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
