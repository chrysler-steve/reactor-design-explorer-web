import { useCallback, useEffect, useRef, useState } from 'react'
import type { ComponentProps } from 'react'
import { Canvas } from '@react-three/fiber'
import type { RootState } from '@react-three/fiber'

type CanvasProps = ComponentProps<typeof Canvas>

/**
 * <Canvas> wrapper that stops WebGL contexts accumulating across route changes.
 *
 * Each reactor tab mounts its own scene, and a renderer's context is only
 * reclaimed when the renderer is garbage collected. Browsers cap live contexts
 * (Chrome ~16) and force-lose the oldest once past the cap, so browsing between
 * Batch/CSTR/PFR outran GC and left a live-but-blank canvas behind — the scene
 * never came back even though `isContextLost()` reported false.
 *
 * Two things prevent that:
 *   1. on unmount the context is released immediately rather than waiting for
 *      GC, so switching tabs returns the context to the pool straight away, and
 *   2. if a context is lost anyway, the browser's default (which makes the loss
 *      permanent) is cancelled and the scene is remounted once it's restored.
 */
export function ReactorCanvas({ children, onCreated, ...props }: CanvasProps) {
  // Bumping this remounts <Canvas> — the only reliable way to rebuild the whole
  // three.js scene graph against a freshly restored context.
  const [generation, setGeneration] = useState(0)
  const rendererRef = useRef<RootState['gl'] | null>(null)
  const detachRef = useRef<(() => void) | null>(null)

  const handleCreated = useCallback(
    (state: RootState) => {
      rendererRef.current = state.gl
      const canvas = state.gl.domElement

      // preventDefault() is what makes the loss recoverable; without it the
      // browser never fires webglcontextrestored.
      const onLost = (event: Event) => event.preventDefault()
      const onRestored = () => setGeneration((g) => g + 1)

      canvas.addEventListener('webglcontextlost', onLost)
      canvas.addEventListener('webglcontextrestored', onRestored)
      detachRef.current = () => {
        canvas.removeEventListener('webglcontextlost', onLost)
        canvas.removeEventListener('webglcontextrestored', onRestored)
      }

      onCreated?.(state)
    },
    [onCreated],
  )

  useEffect(
    () => () => {
      // Detach before forcing the loss, otherwise our own teardown trips the
      // recovery path we just installed.
      detachRef.current?.()
      detachRef.current = null
      const renderer = rendererRef.current
      rendererRef.current = null
      if (!renderer) return
      renderer.dispose()
      renderer.forceContextLoss()
    },
    [],
  )

  return (
    <Canvas key={generation} onCreated={handleCreated} {...props}>
      {children}
    </Canvas>
  )
}
