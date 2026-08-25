import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { getPageMeta, isKnownRoute, NOT_FOUND_META } from '@/lib/pageMeta'

/** Creates the tag if it doesn't exist yet, so this works regardless of what
 * index.html happens to ship. */
function upsert(selector: string, create: () => HTMLElement, apply: (el: HTMLElement) => void) {
  let el = document.head.querySelector<HTMLElement>(selector)
  if (!el) {
    el = create()
    document.head.appendChild(el)
  }
  apply(el)
}

/**
 * Keeps <title>, the meta description and the canonical link in step with the
 * current route as the user navigates.
 *
 * Each route is now also prerendered to its own static HTML file with these
 * same tags baked in (scripts/prerender-routes.mjs), so a crawler gets them
 * without running any JavaScript. This hook still matters for client-side
 * navigation, where no new document is ever fetched — both read the one table
 * in pageMeta.data.json, so they cannot disagree.
 */
export function usePageMeta() {
  const { pathname } = useLocation()

  useEffect(() => {
    const known = isKnownRoute(pathname)
    const meta = getPageMeta(pathname)
    const { title, description } = known ? meta : NOT_FOUND_META

    document.title = title

    upsert(
      'meta[name="description"]',
      () => Object.assign(document.createElement('meta'), { name: 'description' }),
      (el) => el.setAttribute('content', description),
    )

    // Share links carry ?params, which would otherwise look like distinct pages
    // and split whatever ranking a route earns. An unmatched URL claims no
    // canonical at all — pointing it at the homepage would invite the 404 to be
    // indexed as a duplicate of it.
    const canonical = document.head.querySelector('link[rel="canonical"]')
    if (known) {
      upsert(
        'link[rel="canonical"]',
        () => Object.assign(document.createElement('link'), { rel: 'canonical' }),
        (el) => el.setAttribute('href', meta.canonical),
      )
    } else if (canonical) {
      canonical.remove()
    }
  }, [pathname])
}
