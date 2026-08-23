import { Suspense, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Environment, OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { convColor, interpAt } from '@/lib/speciesColors'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import {
  GlassVessel,
  MotorHousing,
  SteelFlange,
  SupportLegs,
  TieRods,
  WallBaffles,
  useReactorPalette,
  vesselProfilePoints,
} from './parts'
import { ReactorCanvas } from './ReactorCanvas'

const VESSEL_TOP_Y = 1.0
const IMPELLER_Y = -0.4
/** Where the straight wall stops and the dished bottom begins. */
const KNUCKLE_Y = -0.45
const DISH_DEPTH = 0.62
const VESSEL_RADIUS = 0.95
/** Underside of the leg pads. */
const BASE_Y = -1.5

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

  // The liquid follows the vessel's dished bottom rather than sitting in it as a
  // flat-ended cylinder, so the charge reads as filling the actual vessel.
  const liquidRadius = VESSEL_RADIUS - 0.03
  const fillTopY = KNUCKLE_Y + (VESSEL_TOP_Y - KNUCKLE_Y) * fillRatio
  const profile = useMemo(
    () => vesselProfilePoints(liquidRadius, fillTopY, KNUCKLE_Y, DISH_DEPTH),
    [liquidRadius, fillTopY],
  )

  return (
    <group>
      <mesh>
        <latheGeometry args={[profile, 56]} />
        <meshPhysicalMaterial
          ref={matRef}
          color={initialColor}
          transparent
          opacity={0.62}
          roughness={0.12}
          clearcoat={0.35}
          clearcoatRoughness={0.25}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Free surface, so the charge has a visible top rather than an open shell. */}
      <mesh position={[0, fillTopY, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[liquidRadius, 56]} />
        <meshPhysicalMaterial color={initialColor} transparent opacity={0.8} roughness={0.18} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

/** Glass body with a dished bottom, bolted top flange, tie rods down to a base
 * ring, wall baffles and three legs. */
function Vessel() {
  return (
    <group>
      <GlassVessel radius={VESSEL_RADIUS} topY={VESSEL_TOP_Y} knuckleY={KNUCKLE_Y} dishDepth={DISH_DEPTH} />
      <SteelFlange y={VESSEL_TOP_Y} radius={VESSEL_RADIUS + 0.07} />
      <WallBaffles radius={VESSEL_RADIUS} topY={VESSEL_TOP_Y - 0.12} bottomY={KNUCKLE_Y + 0.05} />
      <TieRods topY={VESSEL_TOP_Y} bottomY={KNUCKLE_Y} radius={VESSEL_RADIUS + 0.07} />
      {/* Support ring sits at the knuckle, where the wall is still at full
        * radius. Down at the dish's low point the vessel has tapered to a
        * point, so a ring there encircles empty space. */}
      <mesh position={[0, KNUCKLE_Y, 0]}>
        <torusGeometry args={[VESSEL_RADIUS + 0.05, 0.045, 12, 44]} />
        <meshStandardMaterial color="#B7BEC7" metalness={0.72} roughness={0.3} />
      </mesh>
      <SupportLegs
        topY={KNUCKLE_Y}
        bottomY={BASE_Y}
        topRadius={VESSEL_RADIUS + 0.05}
      />
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

/** 3D batch reactor: glass body with a dished bottom on a bolted flange, tie
 * rods, wall baffles and legs; pitched marine-propeller agitator on a motor
 * housing; liquid that continuously loops through the reaction's color
 * trajectory — mirrors the MATLAB app's animation intent. */
export function BatchScene({ xaTrajectory, kFraction, tempFraction }: BatchSceneProps) {
  const spinSpeed = 0.4 + tempFraction * 3.2
  const { housing } = useReactorPalette()
  return (
    <ReactorCanvas camera={{ position: [3.4, 1.0, 3.4], fov: 42 }} style={{ width: '100%', height: '100%' }} dpr={[1, 1.5]}>
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
      {/* Target the assembly's centre of mass, not the origin — the vessel now
        * extends well below y=0 on its legs. */}
      <OrbitControls enablePan={false} target={[0, -0.15, 0]} minDistance={2.2} maxDistance={8} />
    </ReactorCanvas>
  )
}
