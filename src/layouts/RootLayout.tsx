import { useLayoutEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { ParamPanel } from '@/components/ParamPanel'
import { ReactionCoordinateMark } from '@/components/ReactionCoordinateMark'
import { ThemeToggle } from '@/components/ThemeToggle'
import { useSyncParamsFromUrl } from '@/hooks/useSyncParamsFromUrl'
import { useSpotlightHover } from '@/hooks/useSpotlightHover'
import { cn } from '@/lib/utils'

const NAV_LINKS = [
  { to: '/', label: 'Home', end: true },
  { to: '/batch', label: 'Batch' },
  { to: '/cstr', label: 'CSTR' },
  { to: '/pfr', label: 'PFR' },
  { to: '/compare', label: 'Compare' },
]

function isLinkActive(link: { to: string; end?: boolean }, pathname: string) {
  if (link.end) return pathname === link.to
  return pathname === link.to || pathname.startsWith(`${link.to}/`)
}

/** A single nav tab: forwards its DOM node both to the shared spotlight-hover
 * tracker and to the parent's ref map (used to measure the sliding active-tab
 * pill), and opts into a native View Transition on click. */
function NavItem({
  to,
  end,
  label,
  registerRef,
}: {
  to: string
  end?: boolean
  label: string
  registerRef: (el: HTMLAnchorElement | null) => void
}) {
  const { ref: spotRef, onMouseMove } = useSpotlightHover<HTMLAnchorElement>()
  return (
    <NavLink
      to={to}
      end={end}
      viewTransition
      ref={(el) => {
        spotRef.current = el
        registerRef(el)
      }}
      onMouseMove={onMouseMove}
      className={({ isActive }) =>
        cn(
          'spotlight-hover relative z-10 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
          isActive ? 'text-primary-foreground' : 'text-muted-foreground hover:bg-muted',
        )
      }
    >
      {label}
    </NavLink>
  )
}

/** Glass pill that glides beneath the active nav tab, measured from the
 * currently-active link's DOM position rather than remounted per route. */
function ActiveTabPill({
  activeTo,
  linkRefs,
  containerRef,
}: {
  activeTo: string
  linkRefs: RefObject<Map<string, HTMLAnchorElement>>
  containerRef: RefObject<HTMLDivElement | null>
}) {
  const pillRef = useRef<HTMLSpanElement>(null)

  useLayoutEffect(() => {
    const measure = () => {
      const el = linkRefs.current.get(activeTo)
      const pill = pillRef.current
      const container = containerRef.current
      if (!el || !pill || !container) return
      const containerRect = container.getBoundingClientRect()
      const elRect = el.getBoundingClientRect()
      pill.style.transform = `translateX(${elRect.left - containerRect.left}px)`
      pill.style.width = `${elRect.width}px`
      pill.style.height = `${elRect.height}px`
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [activeTo, linkRefs, containerRef])

  return (
    <span
      ref={pillRef}
      aria-hidden
      className="glass-surface absolute top-0 left-0 z-0 rounded-md bg-primary/90 backdrop-blur-md transition-[transform,width,height] duration-300 ease-out"
    />
  )
}

/** Shared shell for every route: nav + the always-available ParamPanel (collapsible)
 * feeding the Zustand store, with the current route rendered via <Outlet/>. */
export function RootLayout() {
  const [panelOpen, setPanelOpen] = useState(true)
  const { pathname } = useLocation()
  const isHome = pathname === '/'
  useSyncParamsFromUrl()

  const navRowRef = useRef<HTMLDivElement>(null)
  const linkRefs = useRef<Map<string, HTMLAnchorElement>>(new Map())
  const activeTo = NAV_LINKS.find((l) => isLinkActive(l, pathname))?.to ?? NAV_LINKS[0].to

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="glass-surface sticky top-0 z-10 border-b bg-background/70 backdrop-blur-xl backdrop-saturate-150">
        <nav className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-1 gap-y-2 px-4 py-3">
          <span className="mr-2 flex items-center gap-2 font-heading text-sm font-semibold sm:mr-4">
            <ReactionCoordinateMark className="size-5 text-primary" />
            <span className="hidden sm:inline">Reactor Design Explorer</span>
          </span>
          <div ref={navRowRef} className="relative flex flex-wrap items-center gap-1">
            <ActiveTabPill activeTo={activeTo} linkRefs={linkRefs} containerRef={navRowRef} />
            {NAV_LINKS.map((link) => (
              <NavItem
                key={link.to}
                to={link.to}
                end={link.end}
                label={link.label}
                registerRef={(el) => {
                  if (el) linkRefs.current.set(link.to, el)
                  else linkRefs.current.delete(link.to)
                }}
              />
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
