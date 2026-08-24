import { useMemo } from 'react'
import * as THREE from 'three'
import { useTheme } from '@/hooks/useTheme'
import { legGeometry } from '@/lib/vesselSupports'

/**
 * Mirrors src/index.css --primary/--secondary tokens. Kept as a manual copy
 * because WebGL materials can't read CSS custom properties at render time.
 */
const TOKENS = {
  light: { primary: '#9C4A1D', secondary: '#2B4C6F' },
  dark: { primary: '#E08A4F', secondary: '#7FA3C7' },
} as const

const STEEL_COLOR = '#B7BEC7'

/** Theme-aware colors for 3D scene metal/glass accents, sourced from the
 * shipped instrument-panel token system (index.css) rather than new
 * arbitrary hex values. */
export function useReactorPalette() {
  const { theme } = useTheme()
  const t = TOKENS[theme]
  return { steel: STEEL_COLOR, housing: t.secondary, glassAttenuation: t.secondary, accent: t.primary }
}

/**
 * Vessel and shell glass.
 *
 * `BackSide` is the important part: only the far wall is rasterised, so nothing
 * is ever drawn between the camera and the contents. Combined with
 * `depthWrite: false` the glass can never occlude tubes, liquid or particles —
 * which is what previously made the internals hard to make out.
 *
 * `transmission` is deliberately absent. Physical transmission refracts
 * everything behind the surface and picks up the environment map, which read as
 * a milky lens smeared over the internals. Plain alpha keeps them undistorted.
 */
export const SHELL_GLASS = {
  color: '#EAF2F7',
  transparent: true,
  opacity: 0.17,
  roughness: 0.14,
  metalness: 0,
  clearcoat: 1,
  clearcoatRoughness: 0.22,
  side: THREE.BackSide,
  depthWrite: false,
} satisfies Partial<THREE.MeshPhysicalMaterialParameters>

/** Solid stainless for flanges, rods, legs, tubesheets and nozzles. */
export const STEEL_MATERIAL = {
  color: STEEL_COLOR,
  metalness: 0.72,
  roughness: 0.3,
} satisfies Partial<THREE.MeshStandardMaterialParameters>

/**
 * Half-profile of a flat-topped vessel with a hemispherically dished bottom,
 * for revolving about Y with a lathe. The dish is what stops the vessel reading
 * as a drinking glass — a straight cylinder with an open end is exactly a mug.
 */
export function vesselProfilePoints(
  radius: number,
  topY: number,
  knuckleY: number,
  dishDepth: number,
  segments = 18,
): THREE.Vector2[] {
  const pts: THREE.Vector2[] = [new THREE.Vector2(radius, topY), new THREE.Vector2(radius, knuckleY)]
  for (let i = 1; i <= segments; i++) {
    const t = (i / segments) * (Math.PI / 2)
    pts.push(new THREE.Vector2(radius * Math.cos(t), knuckleY - dishDepth * Math.sin(t)))
  }
  return pts
}

/** Glass vessel body: straight wall flowing into a dished bottom. */
export function GlassVessel({
  radius,
  topY,
  knuckleY,
  dishDepth,
}: {
  radius: number
  topY: number
  knuckleY: number
  dishDepth: number
}) {
  const points = useMemo(
    () => vesselProfilePoints(radius, topY, knuckleY, dishDepth),
    [radius, topY, knuckleY, dishDepth],
  )
  return (
    <mesh>
      <latheGeometry args={[points, 56]} />
      <meshPhysicalMaterial {...SHELL_GLASS} />
    </mesh>
  )
}

/** Bolted steel ring — the vessel's top closure, and the visual anchor that
 * gives the glass body a crisp edge now that the near wall isn't drawn. */
export function SteelFlange({
  y,
  radius,
  thickness = 0.09,
  bolts = 12,
}: {
  y: number
  radius: number
  thickness?: number
  bolts?: number
}) {
  return (
    <group position={[0, y, 0]}>
      <mesh>
        <cylinderGeometry args={[radius, radius, thickness, 48]} />
        <meshStandardMaterial {...STEEL_MATERIAL} />
      </mesh>
      {Array.from({ length: bolts }, (_, i) => {
        const a = (i / bolts) * Math.PI * 2
        return (
          <mesh key={i} position={[Math.cos(a) * (radius - 0.06), thickness * 0.6, Math.sin(a) * (radius - 0.06)]}>
            <cylinderGeometry args={[0.022, 0.022, 0.05, 8]} />
            <meshStandardMaterial {...STEEL_MATERIAL} metalness={0.85} />
          </mesh>
        )
      })}
    </group>
  )
}

/** Vertical rods clamping the top flange to the base ring — the detail that
 * most reads as "assembled equipment" rather than a single moulded object. */
export function TieRods({
  topY,
  bottomY,
  radius,
  count = 4,
}: {
  topY: number
  bottomY: number
  radius: number
  count?: number
}) {
  const length = topY - bottomY
  return (
    <group>
      {Array.from({ length: count }, (_, i) => {
        const a = (i / count) * Math.PI * 2 + Math.PI / 4
        return (
          <mesh key={i} position={[Math.cos(a) * radius, (topY + bottomY) / 2, Math.sin(a) * radius]}>
            <cylinderGeometry args={[0.028, 0.028, length, 10]} />
            <meshStandardMaterial {...STEEL_MATERIAL} />
          </mesh>
        )
      })}
    </group>
  )
}

/** Splayed support legs, so the vessel stands on something instead of floating. */
export function SupportLegs({
  topY,
  bottomY,
  topRadius,
  splay = 0.28,
  count = 3,
}: {
  topY: number
  bottomY: number
  topRadius: number
  splay?: number
  count?: number
}) {
  const leg = legGeometry(topY, bottomY, topRadius, splay)
  return (
    <group>
      {Array.from({ length: count }, (_, i) => {
        const a = (i / count) * Math.PI * 2 + Math.PI / 6
        return (
          <group key={i} rotation={[0, -a, 0]}>
            <mesh position={[leg.midRadius, (topY + bottomY) / 2, 0]} rotation={[0, 0, leg.tilt]}>
              <cylinderGeometry args={[0.05, 0.062, leg.length, 10]} />
              <meshStandardMaterial {...STEEL_MATERIAL} />
            </mesh>
            <mesh position={[leg.footRadius, bottomY, 0]}>
              <cylinderGeometry args={[0.13, 0.13, 0.035, 14]} />
              <meshStandardMaterial {...STEEL_MATERIAL} />
            </mesh>
          </group>
        )
      })}
    </group>
  )
}

/**
 * Support ring encircling the vessel wall, which the legs and tie rods land on.
 *
 * torusGeometry is built in the XY plane — standing upright like a wheel — so it
 * MUST be rotated into XZ to lie flat around a vertical vessel. Without the
 * rotation it reads as a hoop leaning against the tank.
 *
 * Place it where the wall is still at full radius (the knuckle), never at the
 * dished bottom's low point, where the vessel has tapered to a point and the
 * ring would encircle empty space.
 */
export function SupportRing({ y, radius, thickness = 0.04 }: { y: number; radius: number; thickness?: number }) {
  return (
    <mesh position={[0, y, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <torusGeometry args={[radius, thickness, 12, 48]} />
      <meshStandardMaterial {...STEEL_MATERIAL} />
    </mesh>
  )
}

/** Four wall baffles — standard in any stirred tank, and a strong "this is a
 * reactor" cue that costs almost nothing to draw. */
export function WallBaffles({
  radius,
  topY,
  bottomY,
  count = 4,
}: {
  radius: number
  topY: number
  bottomY: number
  count?: number
}) {
  const height = topY - bottomY
  return (
    <group>
      {Array.from({ length: count }, (_, i) => {
        const a = (i / count) * Math.PI * 2
        return (
          <mesh
            key={i}
            position={[Math.cos(a) * (radius - 0.07), (topY + bottomY) / 2, Math.sin(a) * (radius - 0.07)]}
            rotation={[0, -a, 0]}
          >
            <boxGeometry args={[0.11, height, 0.022]} />
            <meshStandardMaterial color={STEEL_COLOR} metalness={0.5} roughness={0.45} transparent opacity={0.75} />
          </mesh>
        )
      })}
    </group>
  )
}

/** Hemispherical head closing one end of a horizontal shell. `dir` is -1 for the
 * inlet (bulging -x) and +1 for the outlet. */
export function DishedHead({ x, radius, dir }: { x: number; radius: number; dir: -1 | 1 }) {
  return (
    <mesh position={[x, 0, 0]} rotation={[0, 0, dir === 1 ? -Math.PI / 2 : Math.PI / 2]}>
      <sphereGeometry args={[radius, 40, 24, 0, Math.PI * 2, 0, Math.PI / 2]} />
      <meshPhysicalMaterial {...SHELL_GLASS} />
    </mesh>
  )
}

/** Perforated plate the tubes are rolled into at each end of the bundle. */
export function Tubesheet({
  x,
  radius,
  holes,
  holeRadius,
}: {
  x: number
  radius: number
  holes: Array<[number, number]>
  holeRadius: number
}) {
  const geometry = useMemo(() => {
    const disc = new THREE.Shape()
    disc.absarc(0, 0, radius, 0, Math.PI * 2, false)
    for (const [hy, hz] of holes) {
      const hole = new THREE.Path()
      hole.absarc(hy, hz, holeRadius, 0, Math.PI * 2, true)
      disc.holes.push(hole)
    }
    return new THREE.ExtrudeGeometry(disc, { depth: 0.06, bevelEnabled: false })
  }, [radius, holes, holeRadius])

  return (
    <mesh geometry={geometry} position={[x, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
      <meshStandardMaterial {...STEEL_MATERIAL} side={THREE.DoubleSide} />
    </mesh>
  )
}

/** Saddle supports for a horizontal shell. */
export function SaddleSupports({ radius, bottomY, offsets }: { radius: number; bottomY: number; offsets: number[] }) {
  return (
    <group>
      {offsets.map((x, i) => (
        <group key={i} position={[x, 0, 0]}>
          <mesh position={[0, (-radius + bottomY) / 2, 0]}>
            <boxGeometry args={[0.12, Math.abs(-radius - bottomY), 0.5]} />
            <meshStandardMaterial {...STEEL_MATERIAL} metalness={0.5} />
          </mesh>
          <mesh position={[0, bottomY, 0]}>
            <boxGeometry args={[0.26, 0.05, 0.72]} />
            <meshStandardMaterial {...STEEL_MATERIAL} metalness={0.5} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

/** Motor housing + mounting flange where an agitator shaft exits the vessel
 * top, so the shaft reads as driven rather than floating. */
export function MotorHousing({ topY, housingColor }: { topY: number; housingColor: string }) {
  return (
    <group position={[0, topY, 0]}>
      <mesh>
        <cylinderGeometry args={[0.22, 0.22, 0.04, 24]} />
        <meshStandardMaterial color={STEEL_COLOR} metalness={0.75} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.16, 0]}>
        <cylinderGeometry args={[0.14, 0.16, 0.28, 20]} />
        <meshStandardMaterial color={housingColor} metalness={0.4} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.305, 0]}>
        <sphereGeometry args={[0.14, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={housingColor} metalness={0.4} roughness={0.5} />
      </mesh>
    </group>
  )
}

/** Cylindrical pipe stub between two world-space points, e.g. a feed/product
 * nozzle, with a flange at the far end. */
export function PipeStub({
  from,
  to,
  radius = 0.08,
  color = STEEL_COLOR,
  opacity = 0.4,
}: {
  from: [number, number, number]
  to: [number, number, number]
  radius?: number
  color?: string
  /** Translucent by default (a sight-glass nozzle) so particle streams
   * traveling along the pipe's centerline stay visible instead of being
   * hidden inside solid opaque metal. Pass 1 for a fully solid pipe. */
  opacity?: number
}) {
  const a = new THREE.Vector3(...from)
  const b = new THREE.Vector3(...to)
  const dir = b.clone().sub(a)
  const length = dir.length()
  const mid = a.clone().add(b).multiplyScalar(0.5)
  const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize())
  const transparent = opacity < 1
  return (
    <group position={mid.toArray()} quaternion={quat}>
      <mesh>
        <cylinderGeometry args={[radius, radius, length, 16]} />
        <meshStandardMaterial color={color} metalness={0.6} roughness={0.35} transparent={transparent} opacity={opacity} depthWrite={!transparent} />
      </mesh>
      <mesh position={[0, length / 2, 0]}>
        <cylinderGeometry args={[radius * 1.4, radius * 1.4, 0.02, 16]} />
        <meshStandardMaterial color={color} metalness={0.6} roughness={0.35} transparent={transparent} opacity={opacity} depthWrite={!transparent} />
      </mesh>
    </group>
  )
}
