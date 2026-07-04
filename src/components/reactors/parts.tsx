import * as THREE from 'three'
import { useTheme } from '@/hooks/useTheme'

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

export const GLASS_BASE = {
  color: '#F4F8FA',
  transparent: true,
  opacity: 0.9,
  transmission: 0.92,
  ior: 1.5,
  thickness: 0.08,
  roughness: 0.06,
  metalness: 0,
  clearcoat: 1,
  clearcoatRoughness: 0.12,
  side: THREE.DoubleSide,
} satisfies Partial<THREE.MeshPhysicalMaterialParameters>

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

/** Vessel-top lid: an annulus (disc with a center hole) so the shaft/nozzles
 * appear to pass through the vessel wall instead of floating above an open
 * cylinder end. */
export function VesselLid({ y, radius, holeRadius = 0.3 }: { y: number; radius: number; holeRadius?: number }) {
  return (
    <mesh position={[0, y, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[holeRadius, radius, 40]} />
      <meshPhysicalMaterial {...GLASS_BASE} />
    </mesh>
  )
}
