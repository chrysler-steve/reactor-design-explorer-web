import { Suspense, useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Environment, OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { convColor, interpAt } from '@/lib/speciesColors'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { PipeStub, useReactorPalette } from './parts'
import { ReactorCanvas } from './ReactorCanvas'

const N_TUBES_HEX = 6
const PITCH = 0.5
const TUBE_LENGTH = 2.6
const TUBE_RADIUS = 0.2
const HEADER_RADIUS = 0.95
const HEADER_LENGTH = 0.22
const SHELL_RADIUS = 0.85
const N_PARTICLES_PER_TUBE = 2
const GRADIENT_STOPS = 24
const LEFT_HEADER_X = -(TUBE_LENGTH / 2 + HEADER_LENGTH / 2)
const RIGHT_HEADER_X = TUBE_LENGTH / 2 + HEADER_LENGTH / 2

type Vec3 = [number, number, number]

/** Center tube + six around it at hex pitch, matching PFRWindow.m's shell-and-tube layout. */
function hexPositions(): Vec3[] {
  const positions: Vec3[] = [[0, 0, 0]]
  for (let i = 0; i < N_TUBES_HEX; i++) {
    const angle = (i / N_TUBES_HEX) * Math.PI * 2
    positions.push([0, PITCH * Math.cos(angle), PITCH * Math.sin(angle)])
  }
  return positions
}
const TUBE_POSITIONS = hexPositions()

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

/** Individual glass-and-gradient tube wall, kept on cheap alpha-blended
 * opacity (not transmission) — at this radius true refraction is
 * imperceptible relative to running 7 simultaneous transmission passes. */
function Tube({ texture, position }: { texture: THREE.Texture; position: Vec3 }) {
  return (
    <mesh position={position} rotation={[0, 0, Math.PI / 2]}>
      <cylinderGeometry args={[TUBE_RADIUS, TUBE_RADIUS, TUBE_LENGTH, 24, 32, true]} />
      <meshStandardMaterial
        map={texture}
        side={THREE.DoubleSide}
        roughness={0.3}
        metalness={0.1}
        transparent
        opacity={0.62}
        depthWrite={false}
      />
    </mesh>
  )
}

/** Outer shell/jacket enclosing the tube bundle. Deliberately a faint,
 * low-reflectivity outline rather than heavy transmission glass — a
 * transmission-heavy shell needs a loaded environment map to read as
 * "glass" and otherwise renders as an opaque-looking haze that swallows
 * the 7 tubes visually. The tubes carry the actual reaction information
 * (color gradient + particles) and must stay the dominant read. */
function Shell() {
  return (
    <mesh rotation={[0, 0, Math.PI / 2]}>
      <cylinderGeometry args={[SHELL_RADIUS, SHELL_RADIUS, TUBE_LENGTH, 32, 1, true]} />
      <meshStandardMaterial
        color="#B7BEC7"
        side={THREE.DoubleSide}
        roughness={0.5}
        metalness={0.05}
        transparent
        opacity={0.14}
        depthWrite={false}
      />
    </mesh>
  )
}

function Header({ x }: { x: number }) {
  return (
    <mesh position={[x, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
      <cylinderGeometry args={[HEADER_RADIUS, HEADER_RADIUS, HEADER_LENGTH, 32]} />
      <meshStandardMaterial color="#9ca3af" metalness={0.6} roughness={0.3} />
    </mesh>
  )
}

/** Particles flowing left-to-right (feed -> product) inside each tube, colored by
 * the local conversion at their current axial position. */
function TubeParticles({ xaProfile, speed }: { xaProfile: number[]; speed: number }) {
  const refs = useRef<(THREE.Mesh | null)[]>([])
  const us = useRef<number[]>(
    TUBE_POSITIONS.flatMap((_, ti) =>
      Array.from({ length: N_PARTICLES_PER_TUBE }, (_, pi) => (pi / N_PARTICLES_PER_TUBE + ti * 0.13) % 1),
    ),
  )
  const reducedMotion = usePrefersReducedMotion()

  useFrame((_, delta) => {
    if (reducedMotion) return
    let k = 0
    for (const [, y, z] of TUBE_POSITIONS) {
      for (let p = 0; p < N_PARTICLES_PER_TUBE; p++) {
        const mesh = refs.current[k]
        if (mesh) {
          us.current[k] = (us.current[k] + (delta * speed) / TUBE_LENGTH) % 1
          const u = us.current[k]
          mesh.position.set(-TUBE_LENGTH / 2 + u * TUBE_LENGTH, y, z)
          ;(mesh.material as THREE.MeshStandardMaterial).color.set(convColor(interpAt(xaProfile, u)))
        }
        k++
      }
    }
  })

  let idx = 0
  return (
    <group>
      {TUBE_POSITIONS.map(([, y, z], ti) =>
        Array.from({ length: N_PARTICLES_PER_TUBE }).map((_, pi) => {
          const i = idx++
          return (
            <mesh
              key={`${ti}-${pi}`}
              ref={(el) => {
                refs.current[i] = el
              }}
              position={[0, y, z]}
            >
              <sphereGeometry args={[0.05, 8, 8]} />
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

/** 3D PFR vessel: 7-tube hex shell-and-tube bundle inside a glass shell, feed/
 * product pipe stubs on each header, each tube surface textured with an axial
 * conversion gradient, flowing particles colored by local conversion —
 * mirrors PFRWindow.m's build3D/runAnimation animation intent. */
export function PFRScene({ xaProfile, flowFraction }: PFRSceneProps) {
  const texture = useMemo(() => buildGradientTexture(xaProfile), [xaProfile])
  useEffect(() => () => texture.dispose(), [texture])
  const speed = 0.5 + flowFraction * 2.2
  const { steel } = useReactorPalette()

  return (
    <ReactorCanvas camera={{ position: [3.6, 1.6, 3.6], fov: 38 }} style={{ width: '100%', height: '320px' }} dpr={[1, 1.5]}>
      <ambientLight intensity={0.7} />
      <pointLight position={[5, 5, 5]} intensity={80} />
      <pointLight position={[-5, -2, -5]} intensity={20} />
      <Suspense fallback={null}>
        <Environment preset="apartment" resolution={256} background={false} />
      </Suspense>
      <Shell />
      <Header x={LEFT_HEADER_X} />
      <Header x={RIGHT_HEADER_X} />
      <PipeStub from={[LEFT_HEADER_X, 0, 0]} to={[LEFT_HEADER_X - 0.5, 0, 0]} radius={0.14} color={steel} />
      <PipeStub from={[RIGHT_HEADER_X, 0, 0]} to={[RIGHT_HEADER_X + 0.5, 0, 0]} radius={0.14} color={steel} />
      {TUBE_POSITIONS.map((p, i) => (
        <Tube key={i} texture={texture} position={p} />
      ))}
      <TubeParticles xaProfile={xaProfile} speed={speed} />
      <OrbitControls enablePan={false} minDistance={2.4} maxDistance={9} />
    </ReactorCanvas>
  )
}
