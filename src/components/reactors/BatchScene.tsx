import { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { convColor } from '@/lib/speciesColors'

function Impeller({ speed }: { speed: number }) {
  const ref = useRef<THREE.Group>(null)
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * speed
  })
  return (
    <group ref={ref}>
      <mesh>
        <cylinderGeometry args={[0.04, 0.04, 1.7, 12]} />
        <meshStandardMaterial color="#9ca3af" metalness={0.7} roughness={0.25} />
      </mesh>
      {[0, 1, 2].map((i) => (
        <mesh key={i} rotation={[0, (i * Math.PI * 2) / 3, 0]} position={[0.32, -0.4, 0]}>
          <boxGeometry args={[0.55, 0.07, 0.16]} />
          <meshStandardMaterial color="#9ca3af" metalness={0.7} roughness={0.25} />
        </mesh>
      ))}
    </group>
  )
}

function Liquid({ color, fillRatio }: { color: string; fillRatio: number }) {
  const height = 1.7 * fillRatio
  return (
    <mesh position={[0, -0.85 + height / 2, 0]}>
      <cylinderGeometry args={[0.92, 0.92, height, 40]} />
      <meshPhysicalMaterial color={color} transparent opacity={0.8} roughness={0.15} transmission={0.15} />
    </mesh>
  )
}

function Vessel() {
  return (
    <mesh>
      <cylinderGeometry args={[1, 1, 2, 40, 1, true]} />
      <meshPhysicalMaterial
        color="#8892b0"
        transparent
        opacity={0.18}
        roughness={0.08}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}

interface BatchSceneProps {
  /** Conversion Xa in [0,1] at the current time — drives liquid color. */
  conversion: number
  /** Normalized [0,1] temperature — drives impeller spin speed. */
  tempFraction: number
}

/** 3D batch-reactor vessel: spinning impeller, liquid tinted by conversion,
 * spin speed scaled by temperature — mirrors the MATLAB app's animation intent. */
export function BatchScene({ conversion, tempFraction }: BatchSceneProps) {
  const spinSpeed = 0.4 + tempFraction * 3.2
  return (
    <Canvas camera={{ position: [3.2, 2, 3.2], fov: 38 }} style={{ width: '100%', height: '320px' }}>
      <ambientLight intensity={0.7} />
      <pointLight position={[5, 5, 5]} intensity={80} />
      <pointLight position={[-5, -2, -5]} intensity={20} />
      <Vessel />
      <Liquid color={convColor(conversion)} fillRatio={0.85} />
      <Impeller speed={spinSpeed} />
      <OrbitControls enablePan={false} minDistance={2.2} maxDistance={8} />
    </Canvas>
  )
}
