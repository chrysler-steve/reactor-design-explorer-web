import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { getPageMeta } from '@/lib/pageMeta'

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
 * current route.
 *
 * This is a client-rendered SPA, so the HTML served for every route is
 * identical — search engines only see the difference after running the app.
 * Google does execute JavaScript, so this is worth doing; crawlers that don't
 * (most social scrapers) still get the site-level tags from index.html, which
 * is why those are left in place rather than removed.
 */
export function usePageMeta() {
  const { pathname } = useLocation()

  useEffect(() => {
    const meta = getPageMeta(pathname)

    document.title = meta.title

    upsert(
      'meta[name="description"]',
      () => Object.assign(document.createElement('meta'), { name: 'description' }),
      (el) => el.setAttribute('content', meta.description),
    )

    // Share links carry ?params, which would otherwise look like distinct pages
    // and split whatever ranking a route earns.
    upsert(
      'link[rel="canonical"]',
      () => Object.assign(document.createElement('link'), { rel: 'canonical' }),
      (el) => el.setAttribute('href', meta.canonical),
    )
  }, [pathname])
}
