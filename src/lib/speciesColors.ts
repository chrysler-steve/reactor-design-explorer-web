/**
 * Placeholder per-slot species colors, ported from rxWindowStyle.m's
 * speciesColors() (amber/blue/teal/purple). These are functional defaults
 * only — the frontend-design pass (task #9) owns the real palette and will
 * likely replace these.
 */
export const SPECIES_COLORS: [string, string, string, string] = [
  '#F5D461',
  '#2666E0',
  '#1A947A',
  '#8C38BF',
]

/**
 * Per-slot line styles. Species with equal stoichiometry and equal initial
 * concentration trace identical curves — with colour alone the later species
 * paints over the earlier one, so the legend advertises four species while the
 * chart shows two. Cycling the dash pattern keeps coincident curves readable.
 */
export const SPECIES_DASHES: [string, string, string, string] = [
  'solid',
  'dash',
  'solid',
  'dash',
]

/** Liquid color for a conversion Xa in [0,1]: blue (unreacted) -> amber (converted). */
export function convColor(Xa: number): string {
  const t = Math.min(Math.max(Xa, 0), 1)
  const from = [0.15, 0.4, 0.88]
  const to = [0.65, 0.5, 0.28]
  const rgb = from.map((c, i) => Math.round(((1 - t) * c + t * to[i]) * 255))
  return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`
}

/** Linear-interpolate a value from a uniformly-sampled [0,1]-domain profile array. */
export function interpAt(profile: number[], u: number): number {
  const clamped = Math.min(Math.max(u, 0), 1)
  const idx = clamped * (profile.length - 1)
  const lo = Math.floor(idx)
  const hi = Math.min(lo + 1, profile.length - 1)
  const frac = idx - lo
  return profile[lo] * (1 - frac) + profile[hi] * frac
}
