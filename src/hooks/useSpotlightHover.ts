import { useCallback, useRef } from 'react'
import type { MouseEventHandler } from 'react'
import { usePrefersReducedMotion } from './usePrefersReducedMotion'

/** Returns a ref + onMouseMove handler for elements using the `.spotlight-hover`
 * class (index.css) — a cursor-follow radial highlight plus a hover "pop,"
 * giving clear affordance for what's about to be selected. Writes
 * --spot-x/--spot-y via direct DOM mutation (not React state) to avoid a
 * re-render per mousemove. No-op under prefers-reduced-motion — the element
 * falls back to whatever plain hover state it already has. */
export function useSpotlightHover<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const reducedMotion = usePrefersReducedMotion()

  const onMouseMove = useCallback<MouseEventHandler<T>>(
    (e) => {
      if (reducedMotion || !ref.current) return
      const rect = ref.current.getBoundingClientRect()
      ref.current.style.setProperty('--spot-x', `${e.clientX - rect.left}px`)
      ref.current.style.setProperty('--spot-y', `${e.clientY - rect.top}px`)
    },
    [reducedMotion],
  )

  return { ref, onMouseMove }
}
