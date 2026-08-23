import { Suspense, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Environment, OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { convColor } from '@/lib/speciesColors'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import {
  GlassVessel,
  MotorHousing,
  PipeStub,
  SteelFlange,
  SupportLegs,
  TieRods,
  WallBaffles,
  useReactorPalette,
  vesselProfilePoints,
} from './parts'
import { ReactorCanvas } from './ReactorCanvas'

const FEED_COLOR = convColor(0)
const N_INLET = 7
const N_OUTLET = 7
const VESSEL_TOP_Y = 1.0
const IMPELLER_Y = -0.35
const KNUCKLE_Y = -0.45
const DISH_DEPTH = 0.62
const VESSEL_RADIUS = 0.95
const BASE_Y = -1.5

/** Feed enters top-left and discharges onto the liquid surface; product leaves
 * from the vessel's low point on the bottom-right, so the tank drains the way a
 * real one does rather than through a mid-wall port. */
const INLET_TOP = new THREE.Vector3(-1.28, 1.78, 0)
const INLET_TIP = new THREE.Vector3(-0.62, 1.06, 0)
const OUTLET_START = new THREE.Vector3(0.34, KNUCKLE_Y - DISH_DEPTH + 0.14, 0)
const OUTLET_END = new THREE.Vector3(1.42, KNUCKLE_Y - DISH_DEPTH - 0.02, 0)
const OUTLET_DIR = OUTLET_END.clone().sub(OUTLET_START).normalize()
const OUTLET_RUN = OUTLET_END.distanceTo(OUTLET_START)

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
          color={color}
          transparent
          opacity={0.62}
          roughness={0.12}
          clearcoat={0.35}
          clearcoatRoughness={0.25}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh position={[0, fillTopY, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[liquidRadius, 56]} />
        <meshPhysicalMaterial color={color} transparent opacity={0.8} roughness={0.18} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

/** Glass body with a dished bottom, bolted top flange, tie rods to a base ring,
 * wall baffles and legs — the same equipment language as the batch vessel. */
function Vessel() {
  return (
    <group>
      <GlassVessel radius={VESSEL_RADIUS} topY={VESSEL_TOP_Y} knuckleY={KNUCKLE_Y} dishDepth={DISH_DEPTH} />
      <SteelFlange y={VESSEL_TOP_Y} radius={VESSEL_RADIUS + 0.07} />
      <WallBaffles radius={VESSEL_RADIUS} topY={VESSEL_TOP_Y - 0.12} bottomY={KNUCKLE_Y + 0.05} />
      <TieRods topY={VESSEL_TOP_Y} bottomY={KNUCKLE_Y - DISH_DEPTH + 0.05} radius={VESSEL_RADIUS + 0.07} />
      <mesh position={[0, KNUCKLE_Y - DISH_DEPTH + 0.03, 0]}>
        <torusGeometry args={[VESSEL_RADIUS + 0.05, 0.035, 10, 40]} />
        <meshStandardMaterial color="#B7BEC7" metalness={0.72} roughness={0.3} />
      </mesh>
      <SupportLegs topY={KNUCKLE_Y - DISH_DEPTH + 0.03} bottomY={BASE_Y} topRadius={VESSEL_RADIUS + 0.05} />
    </group>
  )
}

/** Feed particles running down the top-left inlet nozzle and discharging onto
 * the liquid surface, looping. */
function InletStream({ speed }: { speed: number }) {
  const refs = useRef<(THREE.Mesh | null)[]>([])
  const reducedMotion = usePrefersReducedMotion()
  const run = INLET_TIP.distanceTo(INLET_TOP)
  const dir = useMemo(() => INLET_TIP.clone().sub(INLET_TOP).normalize(), [])
  const travelled = useRef<number[]>(Array.from({ length: N_INLET }, (_, i) => (i / N_INLET) * run))

  useFrame((_, delta) => {
    if (reducedMotion) return
    refs.current.forEach((m, i) => {
      if (!m) return
      travelled.current[i] = (travelled.current[i] + delta * speed) % run
      m.position.copy(INLET_TOP).addScaledVector(dir, travelled.current[i])
    })
  })

  return (
    <group>
      {Array.from({ length: N_INLET }).map((_, i) => (
        <mesh
          key={i}
          ref={(el) => {
            refs.current[i] = el
          }}
          position={INLET_TOP.clone().addScaledVector(dir, (i / N_INLET) * run).toArray()}
        >
          <sphereGeometry args={[0.045, 8, 8]} />
          <meshStandardMaterial color={FEED_COLOR} />
        </mesh>
      ))}
    </group>
  )
}

/** Product particles leaving the bottom-right drain nozzle, colored by
 * conversion, looping. */
function OutletStream({ speed, conversion }: { speed: number; conversion: number }) {
  const refs = useRef<(THREE.Mesh | null)[]>([])
  const reducedMotion = usePrefersReducedMotion()
  const travelled = useRef<number[]>(Array.from({ length: N_OUTLET }, (_, i) => (i / N_OUTLET) * OUTLET_RUN))

  useFrame((_, delta) => {
    if (reducedMotion) return
    refs.current.forEach((m, i) => {
      if (!m) return
      travelled.current[i] = (travelled.current[i] + delta * speed) % OUTLET_RUN
      m.position.copy(OUTLET_START).addScaledVector(OUTLET_DIR, travelled.current[i])
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
          position={OUTLET_START.clone().addScaledVector(OUTLET_DIR, (i / N_OUTLET) * OUTLET_RUN).toArray()}
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

/** 3D CSTR: glass tank with a dished bottom on a bolted flange, tie rods, wall
 * baffles and legs; Rushton-turbine agitator on a motor housing; feed entering
 * top-left and product draining bottom-right with continuous particle streams;
 * liquid tinted by conversion — mirrors CSTRWindow.m's build3D/runAnimation
 * animation intent. */
export function CSTRScene({ conversion, kFraction, flowFraction }: CSTRSceneProps) {
  const spinSpeed = 0.4 + kFraction * 5.5
  const flowSpeed = 0.3 + flowFraction * 1.4
  const { steel, housing } = useReactorPalette()
  return (
    <ReactorCanvas camera={{ position: [3.5, 1.1, 3.5], fov: 44 }} style={{ width: '100%', height: '100%' }} dpr={[1, 1.5]}>
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
      <PipeStub from={INLET_TOP.toArray()} to={INLET_TIP.toArray()} radius={0.09} color={steel} />
      <PipeStub from={OUTLET_START.toArray()} to={OUTLET_END.toArray()} radius={0.08} color={steel} />
      <InletStream speed={flowSpeed} />
      <OutletStream speed={flowSpeed} conversion={conversion} />
      <OrbitControls enablePan={false} target={[0, -0.1, 0]} minDistance={2.2} maxDistance={8} />
    </ReactorCanvas>
  )
}
