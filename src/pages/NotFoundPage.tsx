import { Link, useRouteError, isRouteErrorResponse } from 'react-router-dom'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

const REACTORS = [
  { to: '/batch', name: 'Batch', description: 'A well-mixed vessel — concentration evolving over time.' },
  { to: '/cstr', name: 'CSTR', description: 'A continuously stirred tank, solved at steady state.' },
  { to: '/pfr', name: 'PFR', description: 'A tubular plug-flow reactor with an axial conversion profile.' },
  { to: '/compare', name: 'Compare', description: 'Overlay all three reactors side by side.' },
]

/**
 * Shown for unmatched URLs and for errors thrown while rendering a route.
 *
 * Without this, react-router falls back to its built-in error screen, which
 * says "Unexpected Application Error!" and addresses the developer rather than
 * the visitor. That only became reachable in practice once the catch-all Vercel
 * rewrite was removed, but it was always what a mistyped URL produced.
 */
export function NotFoundPage() {
  const error = useRouteError()
  const isNotFound = !error || (isRouteErrorResponse(error) && error.status === 404)

  return (
    // Carries its own page gutter so it renders correctly both inside the
    // layout's <Outlet/> and standalone as the root errorElement.
    <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-16">
      <div className="flex flex-col gap-4">
        <p className="font-mono text-sm text-muted-foreground">
          {isNotFound ? '404' : 'Error'}
        </p>
        <h1 className="font-heading text-4xl font-semibold tracking-tight">
          {isNotFound ? 'That page does not exist' : 'Something went wrong'}
        </h1>
        <p className="max-w-prose text-lg text-muted-foreground">
          {isNotFound
            ? 'The link may be mistyped or out of date. Everything the simulator does is one of the four pages below.'
            : 'The page failed to load. Reloading usually clears it; otherwise start again from one of the pages below.'}
        </p>
        <div className="flex flex-wrap gap-3">
          <Link to="/" className={cn(buttonVariants({ size: 'lg' }))}>
            Back to the home page
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {REACTORS.map((r) => (
          <Link key={r.to} to={r.to}>
            <Card className="h-full hover:bg-muted/50">
              <CardContent className="flex flex-col gap-1 py-4">
                <span className="font-heading text-sm font-semibold">{r.name}</span>
                <span className="text-sm text-muted-foreground">{r.description}</span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
