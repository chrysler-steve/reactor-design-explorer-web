import { Suspense, useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Environment, OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { convColor, interpAt } from '@/lib/speciesColors'
import { tubeLayout, TUBE_PITCH, type TubePosition } from '@/lib/tubeLayout'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import {
  DishedHead,
  PipeStub,
  SaddleSupports,
  SHELL_GLASS,
  Tubesheet,
} from './parts'
import { ReactorCanvas } from './ReactorCanvas'

const N_TUBES = 12
const TUBE_LENGTH = 2.6
const TUBE_RADIUS = TUBE_PITCH * 0.36
const TUBESHEET_X = TUBE_LENGTH / 2
const SHELL_RADIUS = 1.06
const HEAD_RADIUS = SHELL_RADIUS
/** Where each dished head's apex sits, and where the nozzle meets it. */
const HEAD_APEX_X = TUBESHEET_X + HEAD_RADIUS * 0.62
const NOZZLE_X = HEAD_APEX_X + 0.62
const N_PARTICLES_PER_TUBE = 3
const GRADIENT_STOPS = 24

const TUBE_POSITIONS: TubePosition[] = tubeLayout(N_TUBES)

/**
 * Fractions of a particle's full journey spent in each stage: down the feed
 * nozzle, fanning out across the inlet head, through its tube, converging in
 * the outlet head, then out the product nozzle. Proportional to path length so
 * particles hold a roughly constant speed all the way through.
 */
const STAGE = { nozzleIn: 0.1, fanOut: 0.11, tube: 0.58, converge: 0.11 } as const
const T_FAN = STAGE.nozzleIn
const T_TUBE = T_FAN + STAGE.fanOut
const T_CONVERGE = T_TUBE + STAGE.tube
const T_NOZZLE_OUT = T_CONVERGE + STAGE.converge

/** Axial conversion-gradient texture (feed-blue at v=0 -> product-amber at v=1),
 * mirroring PFRWindow.m's pfrCdata texture-mapped tube gradient. */
function buildGradientTexture(xaProfile: number[]): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 2
  canvas.height = 128
  const ctx = canvas.getContext('2d')!
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height)
  for (let i = 0; i < GRADIENT_STOPS; i++) {
    const t = i / (GRADIENT_STOPS - 1)
    gradient.addColorStop(t, convColor(interpAt(xaProfile, t)))
  }
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.ClampToEdgeWrapping
  texture.wrapT = THREE.ClampToEdgeWrapping
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

/** One tube, carrying the axial conversion gradient along its length. Kept
 * partly transparent so the particles travelling inside stay visible. */
function Tube({ texture, position }: { texture: THREE.Texture; position: TubePosition }) {
  return (
    <mesh position={[0, position[0], position[1]]} rotation={[0, 0, Math.PI / 2]}>
      <cylinderGeometry args={[TUBE_RADIUS, TUBE_RADIUS, TUBE_LENGTH, 20, 24, true]} />
      <meshStandardMaterial
        map={texture}
        side={THREE.DoubleSide}
        roughness={0.28}
        metalness={0.12}
        transparent
        opacity={0.72}
        depthWrite={false}
      />
    </mesh>
  )
}

/**
 * Glass shell around the bundle. Uses SHELL_GLASS, whose BackSide rendering
 * means the camera-facing wall is never drawn — the tubes are never seen
 * through a pane of glass, only framed by one.
 */
function Shell() {
  return (
    <mesh rotation={[0, 0, Math.PI / 2]}>
      <cylinderGeometry args={[SHELL_RADIUS, SHELL_RADIUS, TUBE_LENGTH, 48, 1, true]} />
      <meshPhysicalMaterial {...SHELL_GLASS} />
    </mesh>
  )
}

/**
 * Position along a particle's full journey, written into `out`.
 * `u` is the journey fraction in [0,1); `ty`/`tz` are its tube's centre.
 */
function pathPoint(u: number, ty: number, tz: number, out: THREE.Vector3): void {
  if (u < T_FAN) {
    // Down the feed nozzle, on the shell axis.
    const s = u / STAGE.nozzleIn
    out.set(THREE.MathUtils.lerp(-NOZZLE_X, -HEAD_APEX_X, s), 0, 0)
  } else if (u < T_TUBE) {
    // Fanning out inside the inlet head toward this particle's tube.
    const s = (u - T_FAN) / STAGE.fanOut
    out.set(THREE.MathUtils.lerp(-HEAD_APEX_X, -TUBESHEET_X, s), ty * s, tz * s)
  } else if (u < T_CONVERGE) {
    // Through the tube — the only stage where the reaction is happening.
    const s = (u - T_TUBE) / STAGE.tube
    out.set(THREE.MathUtils.lerp(-TUBESHEET_X, TUBESHEET_X, s), ty, tz)
  } else if (u < T_NOZZLE_OUT) {
    // Converging in the outlet head.
    const s = (u - T_CONVERGE) / STAGE.converge
    out.set(THREE.MathUtils.lerp(TUBESHEET_X, HEAD_APEX_X, s), ty * (1 - s), tz * (1 - s))
  } else {
    // Out through the product nozzle.
    const s = (u - T_NOZZLE_OUT) / STAGE.nozzleIn
    out.set(THREE.MathUtils.lerp(HEAD_APEX_X, NOZZLE_X, s), 0, 0)
  }
}

/** Local conversion for a particle at journey fraction `u`: the feed value
 * before the tubes, the axial profile inside them, the exit value after. */
function conversionAt(u: number, xaProfile: number[]): number {
  if (u < T_TUBE) return xaProfile[0] ?? 0
  if (u >= T_CONVERGE) return xaProfile[xaProfile.length - 1] ?? 0
  return interpAt(xaProfile, (u - T_TUBE) / STAGE.tube)
}

/**
 * Feed entering the inlet nozzle, splitting across the twelve tubes, reacting
 * along them, then collecting in the outlet head and leaving as product.
 */
function FlowParticles({ xaProfile, speed }: { xaProfile: number[]; speed: number }) {
  const refs = useRef<(THREE.Mesh | null)[]>([])
  const reducedMotion = usePrefersReducedMotion()
  const scratch = useMemo(() => new THREE.Vector3(), [])

  // Stagger each particle so the streams stay evenly populated rather than
  // marching in lockstep.
  const us = useRef<number[]>(
    TUBE_POSITIONS.flatMap((_, ti) =>
      Array.from(
        { length: N_PARTICLES_PER_TUBE },
        (_, pi) => (pi / N_PARTICLES_PER_TUBE + (ti / TUBE_POSITIONS.length) * 0.31) % 1,
      ),
    ),
  )

  useFrame((_, delta) => {
    if (reducedMotion) return
    let k = 0
    for (const [ty, tz] of TUBE_POSITIONS) {
      for (let p = 0; p < N_PARTICLES_PER_TUBE; p++) {
        const mesh = refs.current[k]
        if (mesh) {
          us.current[k] = (us.current[k] + delta * speed * 0.14) % 1
          const u = us.current[k]
          pathPoint(u, ty, tz, scratch)
          mesh.position.copy(scratch)
          ;(mesh.material as THREE.MeshStandardMaterial).color.set(convColor(conversionAt(u, xaProfile)))
        }
        k++
      }
    }
  })

  let idx = 0
  return (
    <group>
      {TUBE_POSITIONS.map(([ty, tz], ti) =>
        Array.from({ length: N_PARTICLES_PER_TUBE }).map((_, pi) => {
          const i = idx++
          return (
            <mesh
              key={`${ti}-${pi}`}
              ref={(el) => {
                refs.current[i] = el
              }}
              position={[-NOZZLE_X, ty, tz]}
            >
              <sphereGeometry args={[0.048, 8, 8]} />
              <meshStandardMaterial color={convColor(0)} />
            </mesh>
          )
        }),
      )}
    </group>
  )
}

interface PFRSceneProps {
  /** Conversion profile Xa(V) in [0,1] along the reactor volume sweep — drives the
   * tube gradient texture and particle colors. */
  xaProfile: number[]
  /** Normalized [0,1] flow rate — drives particle stream speed. */
  flowFraction: number
}

/** 3D shell-and-tube PFR: a large glass shell with dished heads, twelve tubes
 * on a hex pitch rolled into a tubesheet at each end, one major feed nozzle and
 * one major product nozzle. Each tube carries the axial conversion gradient,
 * and particles run the full path — nozzle, fan out, react, converge, nozzle. */
export function PFRScene({ xaProfile, flowFraction }: PFRSceneProps) {
  const texture = useMemo(() => buildGradientTexture(xaProfile), [xaProfile])
  useEffect(() => () => texture.dispose(), [texture])
  const speed = 0.5 + flowFraction * 2.2
  const feedColor = convColor(xaProfile[0] ?? 0)
  const productColor = convColor(xaProfile[xaProfile.length - 1] ?? 0)

  // Viewed close to side-on. A three-quarter view puts the near tubesheet flat
  // across the middle of the frame, where it hides most of the bundle; from here
  // the tubesheets are edge-on and all twelve tubes run clear across the shell.
  return (
    <ReactorCanvas camera={{ position: [1.9, 1.25, 6.0], fov: 34 }} style={{ width: '100%', height: '100%' }} dpr={[1, 1.5]}>
      <ambientLight intensity={0.7} />
      <pointLight position={[5, 5, 5]} intensity={80} />
      <pointLight position={[-5, -2, -5]} intensity={20} />
      <Suspense fallback={null}>
        <Environment preset="apartment" resolution={256} background={false} />
      </Suspense>

      <Shell />
      <DishedHead x={-TUBESHEET_X} radius={HEAD_RADIUS} dir={-1} />
      <DishedHead x={TUBESHEET_X} radius={HEAD_RADIUS} dir={1} />
      <Tubesheet x={-TUBESHEET_X} radius={SHELL_RADIUS} holes={TUBE_POSITIONS} holeRadius={TUBE_RADIUS} />
      <Tubesheet x={TUBESHEET_X} radius={SHELL_RADIUS} holes={TUBE_POSITIONS} holeRadius={TUBE_RADIUS} />

      {TUBE_POSITIONS.map((p, i) => (
        <Tube key={i} texture={texture} position={p} />
      ))}

      {/* Major feed and product nozzles, one of each, on the shell axis. */}
      <PipeStub from={[-NOZZLE_X, 0, 0]} to={[-HEAD_APEX_X, 0, 0]} radius={0.16} color={feedColor} opacity={0.35} />
      <PipeStub from={[HEAD_APEX_X, 0, 0]} to={[NOZZLE_X, 0, 0]} radius={0.16} color={productColor} opacity={0.35} />

      <FlowParticles xaProfile={xaProfile} speed={speed} />
      <SaddleSupports radius={SHELL_RADIUS} bottomY={-SHELL_RADIUS - 0.5} offsets={[-1.0, 1.0]} />

      <OrbitControls enablePan={false} minDistance={2.6} maxDistance={9} />
    </ReactorCanvas>
  )
}
