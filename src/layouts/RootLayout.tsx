import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { ParamPanel } from '@/components/ParamPanel'
import { ReactionCoordinateMark } from '@/components/ReactionCoordinateMark'
import { ThemeToggle } from '@/components/ThemeToggle'
import { useSyncParamsFromUrl } from '@/hooks/useSyncParamsFromUrl'
import { cn } from '@/lib/utils'

const NAV_LINKS = [
  { to: '/', label: 'Home', end: true },
  { to: '/batch', label: 'Batch' },
  { to: '/cstr', label: 'CSTR' },
  { to: '/pfr', label: 'PFR' },
  { to: '/compare', label: 'Compare' },
]

/** Shared shell for every route: nav + the always-available ParamPanel (collapsible)
 * feeding the Zustand store, with the current route rendered via <Outlet/>. */
export function RootLayout() {
  const [panelOpen, setPanelOpen] = useState(true)
  const { pathname } = useLocation()
  const isHome = pathname === '/'
  useSyncParamsFromUrl()

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
        <nav className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-1 gap-y-2 px-4 py-3">
          <span className="mr-2 flex items-center gap-2 font-heading text-sm font-semibold sm:mr-4">
            <ReactionCoordinateMark className="size-5 text-primary" />
            <span className="hidden sm:inline">Reactor Design Explorer</span>
          </span>
          <div className="flex flex-wrap items-center gap-1">
            {NAV_LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  cn(
                    'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                    isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted',
                  )
                }
              >
                {link.label}
              </NavLink>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-1">
            {!isHome && (
              <button
                type="button"
                onClick={() => setPanelOpen((o) => !o)}
                className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted"
              >
                {panelOpen ? 'Hide setup' : 'Show setup'}
              </button>
            )}
            <ThemeToggle />
          </div>
        </nav>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6">
        {!isHome && panelOpen && <ParamPanel />}
        <Outlet />
      </main>
    </div>
  )
}
