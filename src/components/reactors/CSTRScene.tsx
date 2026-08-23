import { Suspense, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Environment, OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { convColor } from '@/lib/speciesColors'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { GLASS_BASE, MotorHousing, PipeStub, VesselLid, useReactorPalette } from './parts'
import { ReactorCanvas } from './ReactorCanvas'

const FEED_COLOR = convColor(0)
const OUTLET_DIR = new THREE.Vector3(1, -0.15, 0).normalize()
const N_INLET = 6
const N_OUTLET = 6
const VESSEL_TOP_Y = 1.0
const IMPELLER_Y = -0.35

/** Classic disk-turbine flat-blade agitator: a thin hub disk with six flat
 * radial blades, rotating as one rigid group with its own shaft. */
function RushtonTurbine({ speed }: { speed: number }) {
  const ref = useRef<THREE.Group>(null)
  const reducedMotion = usePrefersReducedMotion()
  const { steel } = useReactorPalette()
  useFrame((_, delta) => {
    if (reducedMotion || !ref.current) return
    ref.current.rotation.y += delta * speed
  })
  const N_BLADES = 6
  const HUB_R = 0.12
  const HUB_THICK = 0.03
  const BLADE_W = 0.26
  const BLADE_H = 0.2
  const BLADE_T = 0.018
  return (
    <group ref={ref} position={[0, IMPELLER_Y, 0]}>
      <mesh>
        <cylinderGeometry args={[HUB_R, HUB_R, HUB_THICK, 20]} />
        <meshStandardMaterial color={steel} metalness={0.85} roughness={0.2} />
      </mesh>
      {Array.from({ length: N_BLADES }).map((_, i) => {
        const angle = (i / N_BLADES) * Math.PI * 2
        const radius = HUB_R + BLADE_W / 2
        return (
          <mesh
            key={i}
            position={[radius * Math.cos(angle), 0, radius * Math.sin(angle)]}
            rotation={[0, angle, 0]}
          >
            <boxGeometry args={[BLADE_W, BLADE_H, BLADE_T]} />
            <meshStandardMaterial color={steel} metalness={0.85} roughness={0.2} side={THREE.DoubleSide} />
          </mesh>
        )
      })}
      <mesh position={[0, (VESSEL_TOP_Y - IMPELLER_Y) / 2, 0]}>
        <cylinderGeometry args={[0.035, 0.035, VESSEL_TOP_Y - IMPELLER_Y, 12]} />
        <meshStandardMaterial color={steel} metalness={0.7} roughness={0.25} />
      </mesh>
    </group>
  )
}

function Liquid({ color, fillRatio }: { color: string; fillRatio: number }) {
  const height = 1.6 * fillRatio
  return (
    <mesh position={[0, -0.9 + height / 2, 0]}>
      <cylinderGeometry args={[0.92, 0.92, height, 40]} />
      <meshPhysicalMaterial
        color={color}
        transparent
        opacity={0.68}
        transmission={0.12}
        ior={1.33}
        thickness={0.6}
        roughness={0.1}
        clearcoat={0.3}
        clearcoatRoughness={0.25}
      />
    </mesh>
  )
}

/** Cylindrical wall + dished (flattened-hemisphere) bottom cap, matching the
 * MATLAB CSTR window's tank silhouette, rendered as real glass. */
function Vessel() {
  const { glassAttenuation } = useReactorPalette()
  return (
    <group>
      <mesh position={[0, 0.1, 0]}>
        <cylinderGeometry args={[1, 1, 1.8, 40, 1, true]} />
        <meshPhysicalMaterial {...GLASS_BASE} attenuationColor={glassAttenuation} attenuationDistance={0.6} />
      </mesh>
      <mesh position={[0, -0.8, 0]} scale={[1, 0.45, 1]}>
        <sphereGeometry args={[1, 40, 20, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
        <meshPhysicalMaterial {...GLASS_BASE} attenuationColor={glassAttenuation} attenuationDistance={0.6} />
      </mesh>
      <VesselLid y={VESSEL_TOP_Y} radius={1} holeRadius={0.35} />
    </group>
  )
}

/** Feed particles falling from a top inlet nozzle into the tank, looping. */
function InletStream({ speed }: { speed: number }) {
  const refs = useRef<(THREE.Mesh | null)[]>([])
  const reducedMotion = usePrefersReducedMotion()
  useFrame((_, delta) => {
    if (reducedMotion) return
    refs.current.forEach((m) => {
      if (!m) return
      m.position.y -= delta * speed
      if (m.position.y < 1.0) m.position.y = 1.85
    })
  })
  return (
    <group>
      {Array.from({ length: N_INLET }).map((_, i) => {
        const angle = (i / N_INLET) * Math.PI * 2
        return (
          <mesh
            key={i}
            ref={(el) => {
              refs.current[i] = el
            }}
            position={[0.15 * Math.cos(angle), 1.85 - (i / N_INLET) * 0.7, 0.15 * Math.sin(angle)]}
          >
            <sphereGeometry args={[0.045, 8, 8]} />
            <meshStandardMaterial color={FEED_COLOR} />
          </mesh>
        )
      })}
    </group>
  )
}

/** Product particles streaming out a side outlet port, colored by conversion, looping. */
function OutletStream({ speed, conversion }: { speed: number; conversion: number }) {
  const refs = useRef<(THREE.Mesh | null)[]>([])
  const reducedMotion = usePrefersReducedMotion()
  useFrame((_, delta) => {
    if (reducedMotion) return
    refs.current.forEach((m) => {
      if (!m) return
      m.position.addScaledVector(OUTLET_DIR, delta * speed)
      if (m.position.x > 1.6) m.position.set(1.0, -0.3, 0)
    })
  })
  const color = convColor(conversion)
  return (
    <group>
      {Array.from({ length: N_OUTLET }).map((_, i) => (
        <mesh
          key={i}
          ref={(el) => {
            refs.current[i] = el
          }}
          position={[1.0 + (i / N_OUTLET) * 0.6, -0.3, 0]}
        >
          <sphereGeometry args={[0.045, 8, 8]} />
          <meshStandardMaterial color={color} />
        </mesh>
      ))}
    </group>
  )
}

interface CSTRSceneProps {
  /** Conversion Xa in [0,1] at the current (T,q) operating point — drives liquid/outlet color. */
  conversion: number
  /** Normalized [0,1], log-scaled rate constant — drives impeller spin speed. */
  kFraction: number
  /** Normalized [0,1] flow rate — drives inlet/outlet particle stream speed. */
  flowFraction: number
}

/** 3D CSTR vessel: dished-bottom glass tank, Rushton-turbine agitator on a
 * motor housing, feed/product pipework with continuous particle streams,
 * liquid tinted by conversion — mirrors CSTRWindow.m's build3D/runAnimation
 * animation intent. */
export function CSTRScene({ conversion, kFraction, flowFraction }: CSTRSceneProps) {
  const spinSpeed = 0.4 + kFraction * 5.5
  const flowSpeed = 0.3 + flowFraction * 1.4
  const { steel, housing } = useReactorPalette()
  return (
    <ReactorCanvas camera={{ position: [3.4, 2, 3.4], fov: 38 }} style={{ width: '100%', height: '320px' }} dpr={[1, 1.5]}>
      <ambientLight intensity={0.7} />
      <pointLight position={[5, 5, 5]} intensity={80} />
      <pointLight position={[-5, -2, -5]} intensity={20} />
      <Suspense fallback={null}>
        <Environment preset="apartment" resolution={256} background={false} />
      </Suspense>
      <Vessel />
      <Liquid color={convColor(conversion)} fillRatio={0.85} />
      <RushtonTurbine speed={spinSpeed} />
      <MotorHousing topY={VESSEL_TOP_Y} housingColor={housing} />
      <PipeStub from={[0, 1.05, 0]} to={[0, 1.9, 0]} radius={0.1} color={steel} />
      <PipeStub from={[1.0, -0.3, 0]} to={[1.6, -0.39, 0]} radius={0.08} color={steel} />
      <InletStream speed={flowSpeed} />
      <OutletStream speed={flowSpeed} conversion={conversion} />
      <OrbitControls enablePan={false} minDistance={2.2} maxDistance={8} />
    </ReactorCanvas>
  )
}
