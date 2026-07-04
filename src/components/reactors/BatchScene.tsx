import { Suspense, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Environment, OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { convColor, interpAt } from '@/lib/speciesColors'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { GLASS_BASE, MotorHousing, VesselLid, useReactorPalette } from './parts'

const VESSEL_TOP_Y = 1.0
const IMPELLER_Y = -0.4

function MarinePropeller({ speed }: { speed: number }) {
  const ref = useRef<THREE.Group>(null)
  const reducedMotion = usePrefersReducedMotion()
  const { steel } = useReactorPalette()
  useFrame((_, delta) => {
    if (reducedMotion || !ref.current) return
    ref.current.rotation.y += delta * speed
  })
  const N_BLADES = 3
  const HUB_R = 0.06
  const BLADE_LEN = 0.42
  const BLADE_W = 0.16
  const BLADE_T = 0.02
  const PITCH = THREE.MathUtils.degToRad(28)
  return (
    <group ref={ref} position={[0, IMPELLER_Y, 0]}>
      <mesh>
        <sphereGeometry args={[HUB_R, 16, 16]} />
        <meshStandardMaterial color={steel} metalness={0.85} roughness={0.2} />
      </mesh>
      {Array.from({ length: N_BLADES }).map((_, i) => (
        <group key={i} rotation={[0, (i / N_BLADES) * Math.PI * 2, 0]}>
          <mesh position={[HUB_R + BLADE_LEN / 2, 0, 0]} rotation={[0, 0, PITCH]}>
            <boxGeometry args={[BLADE_LEN, BLADE_T, BLADE_W]} />
            <meshStandardMaterial color={steel} metalness={0.85} roughness={0.2} side={THREE.DoubleSide} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, (VESSEL_TOP_Y - IMPELLER_Y) / 2, 0]}>
        <cylinderGeometry args={[0.035, 0.035, VESSEL_TOP_Y - IMPELLER_Y, 12]} />
        <meshStandardMaterial color={steel} metalness={0.7} roughness={0.25} />
      </mesh>
    </group>
  )
}

/** Liquid whose color continuously loops through the reaction's concentration
 * trajectory (feed -> product), loop period scaled by the rate constant so
 * faster reactions visibly cycle faster. Falls back to a static final-state
 * color when reduced motion is requested. */
function AnimatedLiquid({
  xaTrajectory,
  kFraction,
  fillRatio,
}: {
  xaTrajectory: number[]
  kFraction: number
  fillRatio: number
}) {
  const reducedMotion = usePrefersReducedMotion()
  const matRef = useRef<THREE.MeshPhysicalMaterial>(null)
  const elapsed = useRef(0)
  const finalXa = xaTrajectory[xaTrajectory.length - 1] ?? 0
  const initialColor = convColor(reducedMotion ? finalXa : (xaTrajectory[0] ?? 0))

  const loopPeriod = 2.5 + (1 - kFraction) * 9.5

  useFrame((_, delta) => {
    if (reducedMotion || !matRef.current) return
    elapsed.current = (elapsed.current + delta) % loopPeriod
    const u = elapsed.current / loopPeriod
    matRef.current.color.set(convColor(interpAt(xaTrajectory, u)))
  })

  const height = 1.7 * fillRatio
  return (
    <mesh position={[0, -0.85 + height / 2, 0]}>
      <cylinderGeometry args={[0.92, 0.92, height, 40]} />
      <meshPhysicalMaterial
        ref={matRef}
        color={initialColor}
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

function Vessel() {
  const { glassAttenuation } = useReactorPalette()
  return (
    <group>
      <mesh>
        <cylinderGeometry args={[1, 1, 2, 40, 1, true]} />
        <meshPhysicalMaterial {...GLASS_BASE} attenuationColor={glassAttenuation} attenuationDistance={0.6} />
      </mesh>
      <VesselLid y={VESSEL_TOP_Y} radius={1} holeRadius={0.28} />
    </group>
  )
}

interface BatchSceneProps {
  /** Conversion Xa sampled uniformly over the reaction-time trajectory. */
  xaTrajectory: number[]
  /** Normalized [0,1], log-scaled rate constant — drives the color-loop speed. */
  kFraction: number
  /** Normalized [0,1] temperature — drives impeller spin speed. */
  tempFraction: number
}

/** 3D batch-reactor vessel: pitched marine-propeller agitator on a motor
 * housing, glass vessel wall, liquid that continuously loops through the
 * reaction's color trajectory — mirrors the MATLAB app's animation intent. */
export function BatchScene({ xaTrajectory, kFraction, tempFraction }: BatchSceneProps) {
  const spinSpeed = 0.4 + tempFraction * 3.2
  const { housing } = useReactorPalette()
  return (
    <Canvas camera={{ position: [3.2, 2, 3.2], fov: 38 }} style={{ width: '100%', height: '320px' }} dpr={[1, 1.5]}>
      <ambientLight intensity={0.7} />
      <pointLight position={[5, 5, 5]} intensity={80} />
      <pointLight position={[-5, -2, -5]} intensity={20} />
      <Suspense fallback={null}>
        <Environment preset="apartment" resolution={256} background={false} />
      </Suspense>
      <Vessel />
      <AnimatedLiquid xaTrajectory={xaTrajectory} kFraction={kFraction} fillRatio={0.85} />
      <MarinePropeller speed={spinSpeed} />
      <MotorHousing topY={VESSEL_TOP_Y} housingColor={housing} />
      <OrbitControls enablePan={false} minDistance={2.2} maxDistance={8} />
    </Canvas>
  )
}
