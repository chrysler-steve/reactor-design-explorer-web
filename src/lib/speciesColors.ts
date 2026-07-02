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

/** Liquid color for a conversion Xa in [0,1]: blue (unreacted) -> amber (converted). */
export function convColor(Xa: number): string {
  const t = Math.min(Math.max(Xa, 0), 1)
  const from = [0.15, 0.4, 0.88]
  const to = [0.65, 0.5, 0.28]
  const rgb = from.map((c, i) => Math.round(((1 - t) * c + t * to[i]) * 255))
  return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`
}
