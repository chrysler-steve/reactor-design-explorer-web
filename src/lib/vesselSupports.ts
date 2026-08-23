/**
 * Geometry for a vessel's splayed support legs.
 *
 * Each leg is a cylinder placed at the midpoint of its run and then tilted, so
 * the sign of the tilt decides which end ends up outboard. Getting it backwards
 * splays the leg upside down — its top floats off the vessel wall and its foot
 * pad is left stranded where the leg no longer reaches. That is easy to write
 * and hard to see in code, so the arithmetic lives here where it can be checked.
 */

export interface LegGeometry {
  /** Cylinder length along its own axis. */
  length: number
  /** Rotation about Z, in radians, applied to a Y-axis cylinder. */
  tilt: number
  /** Radius at which the cylinder's centre is placed before tilting. */
  midRadius: number
  /** Where the leg's top actually lands — must equal the vessel's radius. */
  topRadius: number
  /** Where the leg's foot lands — must equal where the foot pad is drawn. */
  footRadius: number
}

export function legGeometry(
  topY: number,
  bottomY: number,
  vesselRadius: number,
  splay: number,
): LegGeometry {
  const rise = topY - bottomY
  if (rise <= 0) {
    throw new Error(`legGeometry: topY (${topY}) must sit above bottomY (${bottomY})`)
  }
  const length = Math.hypot(rise, splay)
  const tilt = Math.atan2(splay, rise)
  const midRadius = vesselRadius + splay / 2

  // A Y-axis cylinder rotated by +tilt about Z has its top displaced by
  // -sin(tilt) and its base by +sin(tilt) in X.
  const halfSpan = (length / 2) * Math.sin(tilt)
  return {
    length,
    tilt,
    midRadius,
    topRadius: midRadius - halfSpan,
    footRadius: midRadius + halfSpan,
  }
}
