import { useEffect, useRef } from 'react'
import { usePrefersReducedMotion } from './usePrefersReducedMotion'

/** Tracks the cursor across the whole viewport and writes normalized
 * --mx/--my custom properties (range [-1,1]) onto the returned ref's
 * element, for CSS-driven parallax (e.g. `transform: translate3d(calc(var(--mx) * 12px), ...)`).
 * Writes via direct DOM mutation (not React state) to avoid a re-render on
 * every mousemove event, rAF-throttled. No-op under prefers-reduced-motion. */
export function useMouseParallax<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const reducedMotion = usePrefersReducedMotion()

  useEffect(() => {
    if (reducedMotion) return
    const el = ref.current
    if (!el) return

    let raf = 0
    let pending: { mx: number; my: number } | null = null

    const flush = () => {
      raf = 0
      if (!pending || !ref.current) return
      ref.current.style.setProperty('--mx', pending.mx.toFixed(3))
      ref.current.style.setProperty('--my', pending.my.toFixed(3))
    }

    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect()
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2
      const mx = (e.clientX - cx) / (rect.width / 2 || 1)
      const my = (e.clientY - cy) / (rect.height / 2 || 1)
      pending = { mx: Math.max(-1, Math.min(1, mx)), my: Math.max(-1, Math.min(1, my)) }
      if (!raf) raf = requestAnimationFrame(flush)
    }

    window.addEventListener('mousemove', onMove)
    return () => {
      window.removeEventListener('mousemove', onMove)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [reducedMotion])

  return ref
}
