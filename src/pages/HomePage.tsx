import { Link } from 'react-router-dom'
import { BatchScene } from '@/components/reactors/BatchScene'
import { ReactionCoordinateMark } from '@/components/ReactionCoordinateMark'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

const REACTORS = [
  { to: '/batch', name: 'Batch', description: 'A well-mixed vessel — concentration evolving over time.' },
  { to: '/cstr', name: 'CSTR', description: 'A continuously stirred tank, solved at steady state.' },
  { to: '/pfr', name: 'PFR', description: 'A tubular plug-flow reactor with an axial conversion profile.' },
  { to: '/compare', name: 'Compare', description: 'Overlay all three reactors side by side.' },
]

export function HomePage() {
  return (
    <div className="flex flex-col gap-12 py-8">
      <section className="relative grid items-center gap-8 overflow-hidden lg:grid-cols-2">
        <ReactionCoordinateMark
          showDetail
          className="pointer-events-none absolute -top-10 -left-20 h-72 w-[40rem] text-primary/[0.07]"
        />
        <div className="flex flex-col gap-4">
          <h1 className="font-heading text-4xl font-semibold tracking-tight">Reactor Design Explorer</h1>
          <p className="text-lg text-muted-foreground">
            An interactive chemical reaction engineering simulator. Define a custom
            multi-species reaction and its kinetics, then watch Batch, CSTR, and PFR
            reactors solve it in real time — with the physics rendered live in 3D,
            right in your browser.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link to="/batch" className={cn(buttonVariants({ size: 'lg' }))}>
              Launch the simulator
            </Link>
            <Link to="/compare" className={cn(buttonVariants({ variant: 'outline', size: 'lg' }))}>
              Compare reactors
            </Link>
          </div>
        </div>

        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <BatchScene conversion={0.55} tempFraction={0.65} />
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {REACTORS.map((r) => (
          <Link key={r.to} to={r.to}>
            <Card className="h-full transition-colors hover:bg-muted/50">
              <CardContent className="flex flex-col gap-1 py-4">
                <span className="font-heading text-sm font-semibold">{r.name}</span>
                <span className="text-sm text-muted-foreground">{r.description}</span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </section>
    </div>
  )
}
