/**
 * Per-route page metadata.
 *
 * Every route previously shared the one <title> baked into index.html, so a
 * crawler saw five identical pages and had nothing to distinguish /batch from
 * /pfr — they competed with each other rather than each ranking for its own
 * term. Titles lead with the specific reactor for the same reason: search
 * results truncate, and the distinguishing word should survive the cut.
 *
 * The table itself lives in pageMeta.data.json because the build-time
 * prerenderer (scripts/prerender-routes.mjs) needs the same strings from plain
 * Node, with no TypeScript in the loop. One source, two consumers — otherwise
 * the static HTML and the client-side hook drift apart silently.
 */

import data from './pageMeta.data.json'

export const SITE_NAME = data.siteName
export const SITE_URL = data.siteUrl

export interface PageMeta {
  title: string
  description: string
  /** Absolute canonical URL, so query strings from share links don't split ranking. */
  canonical: string
}

const ROUTES: Record<string, { title: string; description: string }> = data.routes

/** Tolerate trailing slashes so /batch and /batch/ aren't treated as two pages. */
function normalize(pathname: string): string {
  return pathname.length > 1 ? pathname.replace(/\/+$/, '') : '/'
}

/** Metadata for a pathname, falling back to the site defaults for unknown routes. */
export function getPageMeta(pathname: string): PageMeta {
  const key = normalize(pathname)
  const entry = ROUTES[key] ?? ROUTES['/']
  return {
    ...entry,
    canonical: SITE_URL + (key === '/' ? '/' : key),
  }
}

/** Whether a pathname is a real route. Unmatched URLs render the not-found page,
 *  which should neither claim a canonical nor show the parameter panel. */
export function isKnownRoute(pathname: string): boolean {
  return normalize(pathname) in ROUTES
}

/** Title and description for an unmatched URL. Kept out of the route table
 *  because it has no canonical — it is not a page we want in an index. */
export const NOT_FOUND_META = data.notFound

export const KNOWN_ROUTES = Object.keys(ROUTES)
