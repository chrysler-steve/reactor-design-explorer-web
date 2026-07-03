import { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { convColor } from '@/lib/speciesColors'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'

const FEED_COLOR = convColor(0)
const OUTLET_DIR = new THREE.Vector3(1, -0.15, 0).normalize()
const N_INLET = 6
const N_OUTLET = 6

function Impeller({ speed }: { speed: number }) {
  const ref = useRef<THREE.Group>(null)
  const reducedMotion = usePrefersReducedMotion()
  useFrame((_, delta) => {
    if (reducedMotion || !ref.current) return
    ref.current.rotation.y += delta * speed
  })
  return (
    <group ref={ref}>
      <mesh>
        <cylinderGeometry args={[0.04, 0.04, 1.5, 12]} />
        <meshStandardMaterial color="#9ca3af" metalness={0.7} roughness={0.25} />
      </mesh>
      {[0, 1].map((i) => (
        <mesh key={i} rotation={[0, (i * Math.PI) / 2, 0]}>
          <boxGeometry args={[1.5, 0.08, 0.18]} />
          <meshStandardMaterial color="#9ca3af" metalness={0.7} roughness={0.25} />
        </mesh>
      ))}
    </group>
  )
}

function Liquid({ color, fillRatio }: { color: string; fillRatio: number }) {
  const height = 1.6 * fillRatio
  return (
    <mesh position={[0, -0.9 + height / 2, 0]}>
      <cylinderGeometry args={[0.92, 0.92, height, 40]} />
      <meshPhysicalMaterial color={color} transparent opacity={0.8} roughness={0.15} transmission={0.15} />
    </mesh>
  )
}

/** Cylindrical wall + dished (flattened-hemisphere) bottom cap, matching the
 * MATLAB CSTR window's tank silhouette. */
function Vessel() {
  return (
    <group>
      <mesh position={[0, 0.1, 0]}>
        <cylinderGeometry args={[1, 1, 1.8, 40, 1, true]} />
        <meshPhysicalMaterial color="#8892b0" transparent opacity={0.18} roughness={0.08} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, -0.8, 0]} scale={[1, 0.45, 1]}>
        <sphereGeometry args={[1, 40, 20, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
        <meshPhysicalMaterial color="#8892b0" transparent opacity={0.18} roughness={0.08} side={THREE.DoubleSide} />
      </mesh>
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
      if (m.position.y < 1.0) m.position.y = 1.7
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
            position={[0.15 * Math.cos(angle), 1.7 - (i / N_INLET) * 0.7, 0.15 * Math.sin(angle)]}
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
      if (m.position.x > 2.2) m.position.set(1.0, -0.3, 0)
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
          position={[1.0 + (i / N_OUTLET) * 1.2, -0.3, 0]}
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

/** 3D CSTR vessel: dished-bottom tank, rotating crossed-baffle impeller (spin by k),
 * continuous inlet/outlet particle streams, liquid tinted by conversion — mirrors
 * CSTRWindow.m's build3D/runAnimation animation intent. */
export function CSTRScene({ conversion, kFraction, flowFraction }: CSTRSceneProps) {
  const spinSpeed = 0.4 + kFraction * 5.5
  const flowSpeed = 0.3 + flowFraction * 1.4
  return (
    <Canvas camera={{ position: [3.4, 2, 3.4], fov: 38 }} style={{ width: '100%', height: '320px' }}>
      <ambientLight intensity={0.7} />
      <pointLight position={[5, 5, 5]} intensity={80} />
      <pointLight position={[-5, -2, -5]} intensity={20} />
      <Vessel />
      <Liquid color={convColor(conversion)} fillRatio={0.85} />
      <Impeller speed={spinSpeed} />
      <InletStream speed={flowSpeed} />
      <OutletStream speed={flowSpeed} conversion={conversion} />
      <OrbitControls enablePan={false} minDistance={2.2} maxDistance={8} />
    </Canvas>
  )
}
