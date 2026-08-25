import { useLayoutEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { ParamPanel } from '@/components/ParamPanel'
import { ReactionCoordinateMark } from '@/components/ReactionCoordinateMark'
import { ThemeToggle } from '@/components/ThemeToggle'
import { useSyncParamsFromUrl } from '@/hooks/useSyncParamsFromUrl'
import { usePageMeta } from '@/hooks/usePageMeta'
import { useSpotlightHover } from '@/hooks/useSpotlightHover'
import { getPageMeta, isKnownRoute } from '@/lib/pageMeta'
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
 * pill). */
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
  activeTo: string | null
  linkRefs: RefObject<Map<string, HTMLAnchorElement>>
  containerRef: RefObject<HTMLDivElement | null>
}) {
  const pillRef = useRef<HTMLSpanElement>(null)

  useLayoutEffect(() => {
    const measure = () => {
      const pill = pillRef.current
      // No tab matches an unmatched URL; parking the pill under Home would
      // highlight a link the visitor isn't on.
      if (pill) pill.style.opacity = activeTo ? '1' : '0'
      if (!activeTo) return
      const el = linkRefs.current.get(activeTo)
      const container = containerRef.current
      if (!el || !pill || !container) return
      const containerRect = container.getBoundingClientRect()
      const elRect = el.getBoundingClientRect()
      pill.style.transform = `translateX(${elRect.left - containerRect.left}px)`
      pill.style.width = `${elRect.width}px`
      pill.style.height = `${elRect.height}px`
    }
    measure()
    // The nav uses self-hosted webfonts; tab widths shift when they swap in, so
    // re-measure once they've settled.
    document.fonts?.ready.then(measure).catch(() => {})
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [activeTo, linkRefs, containerRef])

  return (
    <span
      ref={pillRef}
      aria-hidden
      className="glass-surface absolute top-0 left-0 z-0 rounded-md bg-primary/90 backdrop-blur-md transition-[transform,width,height,opacity] duration-300 ease-out"
    />
  )
}

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="currentColor">
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.09 3.29 9.4 7.86 10.93.58.1.79-.25.79-.56 0-.28-.01-1.02-.02-2-3.2.7-3.88-1.54-3.88-1.54-.52-1.33-1.28-1.69-1.28-1.69-1.04-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.68 0-1.26.45-2.28 1.19-3.08-.12-.29-.52-1.46.11-3.04 0 0 .97-.31 3.18 1.18a11.05 11.05 0 0 1 5.79 0c2.2-1.49 3.17-1.18 3.17-1.18.64 1.58.24 2.75.12 3.04.74.8 1.19 1.82 1.19 3.08 0 4.41-2.69 5.38-5.25 5.67.41.36.78 1.06.78 2.14 0 1.55-.01 2.79-.01 3.17 0 .31.21.67.8.56A10.52 10.52 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
    </svg>
  )
}

function LinkedinIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="currentColor">
      <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.86 0-2.15 1.45-2.15 2.94v5.67H9.34V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.38-1.85 3.61 0 4.28 2.38 4.28 5.47v6.27ZM5.34 7.43a2.07 2.07 0 1 1 0-4.13 2.07 2.07 0 0 1 0 4.13ZM7.12 20.45H3.56V9h3.56v11.45ZM22.22 0H1.77C.8 0 0 .78 0 1.75v20.5C0 23.22.8 24 1.77 24h20.45c.98 0 1.78-.78 1.78-1.75V1.75C24 .78 23.2 0 22.22 0Z" />
    </svg>
  )
}

/** Shared shell for every route: nav + the always-available ParamPanel (collapsible)
 * feeding the Zustand store, with the current route rendered via <Outlet/>. */
export function RootLayout() {
  const [panelOpen, setPanelOpen] = useState(true)
  const { pathname } = useLocation()
  // The setup panel belongs to the reactor pages. The home page has its own
  // hero instead, and an unmatched URL renders the not-found page, where a
  // stray parameter panel just looks broken.
  const showPanel = pathname !== '/' && isKnownRoute(pathname)
  useSyncParamsFromUrl()
  usePageMeta()

  const navRowRef = useRef<HTMLDivElement>(null)
  const linkRefs = useRef<Map<string, HTMLAnchorElement>>(new Map())
  const activeTo = NAV_LINKS.find((l) => isLinkActive(l, pathname))?.to ?? null

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="glass-surface sticky top-0 z-10 border-b bg-background/70 backdrop-blur-xl backdrop-saturate-150">
        <nav className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-1 gap-y-2 px-4 py-3">
          <span className="mr-2 flex items-center gap-2 font-heading text-sm font-semibold sm:mr-4">
            <ReactionCoordinateMark className="size-5 text-primary" />
            <span className="hidden sm:inline">Reactor Design Explorer</span>
          </span>
          <div ref={navRowRef} className="relative flex flex-wrap items-center gap-1">
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
            {/* Rendered after the links so its layout effect runs once their refs
             * are attached — measuring first leaves the pill zero-width, which
             * dropped it entirely on first paint and left the active tab's
             * primary-foreground text sitting on the bare background. Stacking is
             * by z-index, so DOM order here doesn't affect what's drawn on top. */}
            <ActiveTabPill activeTo={activeTo} linkRefs={linkRefs} containerRef={navRowRef} />
          </div>
          <div className="ml-auto flex items-center gap-1">
            {showPanel && (
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
        {/* The reactor pages label themselves with card titles rather than a page
            heading, so they shipped with no <h1> at all — no document outline for
            a screen reader, and Bing flags it. The home and not-found pages
            render their own visible <h1>, so this covers only the rest. */}
        {showPanel && <h1 className="sr-only">{getPageMeta(pathname).h1}</h1>}
        {showPanel && panelOpen && <ParamPanel />}
        <Outlet />
      </main>

      <footer className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-sm text-muted-foreground">
        <span>Built by Chrysler Steve Corquaye</span>
        <div className="flex items-center gap-4">
          <a
            href="https://github.com/chrysler-steve"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 hover:text-foreground"
          >
            <GithubIcon className="size-4" />
            GitHub
          </a>
          <a
            href="https://linkedin.com/in/chrysler-corquaye-b54815262"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 hover:text-foreground"
          >
            <LinkedinIcon className="size-4" />
            LinkedIn
          </a>
        </div>
      </footer>
    </div>
  )
}
