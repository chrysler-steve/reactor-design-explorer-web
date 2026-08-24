import { ReactionCoordinateMark } from '@/components/ReactionCoordinateMark'

/**
 * Shown while the initial route chunk is in flight. Every route is code-split
 * via `lazy:`, and without a HydrateFallback the router renders nothing at all
 * during that fetch — on a cold visit the Three.js chunk pushed first
 * contentful paint past 18s of blank page.
 */
export function RouteLoading() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background text-foreground"
    >
      <ReactionCoordinateMark className="size-10 animate-pulse text-primary" />
      <p className="font-heading text-sm font-medium">Reactor Design Explorer</p>
      <p className="text-sm text-muted-foreground">Loading the simulator…</p>
    </div>
  )
}
