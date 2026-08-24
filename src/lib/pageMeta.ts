/**
 * Per-route page metadata.
 *
 * Every route previously shared the one <title> baked into index.html, so a
 * crawler saw five identical pages and had nothing to distinguish /batch from
 * /pfr — they competed with each other rather than each ranking for its own
 * term. Titles lead with the specific reactor for the same reason: search
 * results truncate, and the distinguishing word should survive the cut.
 */

export const SITE_NAME = 'Reactor Design Explorer'
export const SITE_URL = 'https://reactor-design-explorer-web.vercel.app'

export interface PageMeta {
  title: string
  description: string
  /** Absolute canonical URL, so query strings from share links don't split ranking. */
  canonical: string
}

const ROUTES: Record<string, { title: string; description: string }> = {
  '/': {
    title: SITE_NAME,
    description:
      'Simulate Batch, CSTR, and PFR reactors with custom multi-species kinetics — live 3D vessels, right in your browser.',
  },
  '/batch': {
    title: `Batch Reactor Simulator — ${SITE_NAME}`,
    description:
      'Simulate a batch reactor: watch concentration evolve over time for a custom reaction, with conversion and rate constant updating live as you change temperature.',
  },
  '/cstr': {
    title: `CSTR Simulator — ${SITE_NAME}`,
    description:
      'Simulate a continuous stirred-tank reactor at steady state. See how exit conversion responds to temperature and flow rate, with residence time and rate constant shown live.',
  },
  '/pfr': {
    title: `PFR Simulator — ${SITE_NAME}`,
    description:
      'Simulate a plug-flow reactor and see the axial conversion profile develop along the reactor volume, rendered as a 3D shell-and-tube vessel.',
  },
  '/compare': {
    title: `Compare Batch vs CSTR vs PFR — ${SITE_NAME}`,
    description:
      'Compare Batch, CSTR and PFR conversion side by side across temperature and flow rate, and see why a PFR outperforms a CSTR for positive-order kinetics.',
  },
}

/** Metadata for a pathname, falling back to the site defaults for unknown routes. */
export function getPageMeta(pathname: string): PageMeta {
  // Tolerate trailing slashes so /batch and /batch/ don't produce different
  // canonicals for the same page.
  const key = pathname.length > 1 ? pathname.replace(/\/+$/, '') : '/'
  const entry = ROUTES[key] ?? ROUTES['/']
  return {
    ...entry,
    canonical: SITE_URL + (key === '/' ? '/' : key),
  }
}

export const KNOWN_ROUTES = Object.keys(ROUTES)
