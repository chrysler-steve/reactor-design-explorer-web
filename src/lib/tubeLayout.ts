/**
 * Hex-pitch tube bundle layout for the shell-and-tube PFR.
 *
 * Real tubular reactors lay their tubes out on a triangular (hex) pitch because
 * it packs the most tubes into a given shell bore. Generating the lattice and
 * taking the N points nearest the axis reproduces that, and gives the familiar
 * concentric-ring bundle you see looking into a tubesheet.
 */

/** Centre-to-centre tube spacing, in scene units. */
export const TUBE_PITCH = 0.4

/** A tube centre in the tubesheet plane, as [y, z] — the shell axis is x. */
export type TubePosition = [number, number]

const ROW_HEIGHT = TUBE_PITCH * Math.sqrt(3) / 2

/**
 * Tube centres for a bundle of `count` tubes, centred on the shell axis.
 * Ordered from the axis outward, so a smaller bundle is the inner core of a
 * larger one.
 */
export function tubeLayout(count: number): TubePosition[] {
  if (!Number.isFinite(count) || count < 1) {
    throw new Error(`tubeLayout: count must be a positive integer, got ${count}`)
  }

  // A lattice half-width of ceil(sqrt(count)) always yields more candidate
  // points than requested, so the nearest-N slice below can never come up short.
  const span = Math.ceil(Math.sqrt(count)) + 1
  const candidates: TubePosition[] = []
  for (let row = -span; row <= span; row++) {
    for (let col = -span; col <= span; col++) {
      // Offset every other row by half a pitch to make the lattice triangular.
      candidates.push([TUBE_PITCH * (col + (row % 2 === 0 ? 0 : 0.5)), ROW_HEIGHT * row])
    }
  }

  candidates.sort((a, b) => {
    const da = a[0] * a[0] + a[1] * a[1]
    const db = b[0] * b[0] + b[1] * b[1]
    // Tie-break on angle so equidistant ring members come out in a stable order
    // rather than depending on lattice iteration order.
    if (Math.abs(da - db) > 1e-9) return da - db
    return Math.atan2(a[1], a[0]) - Math.atan2(b[1], b[0])
  })

  const picked = candidates.slice(0, count)

  // Taking the nearest N off a lattice can land slightly off-axis (e.g. 12 tubes
  // is not a complete ring), so recentre on the bundle's own centroid to keep it
  // concentric with the shell.
  const cy = picked.reduce((s, p) => s + p[0], 0) / picked.length
  const cz = picked.reduce((s, p) => s + p[1], 0) / picked.length
  return picked.map(([y, z]): TubePosition => [y - cy, z - cz])
}

/** Radius enclosing every tube centre — used to size the shell bore. */
export function bundleRadius(positions: TubePosition[]): number {
  return positions.reduce((m, [y, z]) => Math.max(m, Math.hypot(y, z)), 0)
}
