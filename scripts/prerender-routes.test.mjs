/**
 * Guards the two tables the prerenderer joins.
 *
 * The failure this exists to catch: someone adds a sixth route to the router
 * and pageMeta.data.json, the build still succeeds, and the new page ships with
 * an empty <noscript> — invisible to Bing for exactly the reason the other five
 * pages used to be. A build error is better than a silently unindexable page.
 *
 * Plain .mjs so it can import the build scripts directly; tsconfig only covers
 * src/, and these are Node-side files with no types to check.
 */

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { CONTENT, NAV } from './seo-content.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const data = JSON.parse(readFileSync(path.join(root, 'src/lib/pageMeta.data.json'), 'utf8'))
const routes = Object.keys(data.routes)

describe('prerender route tables', () => {
  it('has SEO prose for every route in pageMeta.data.json', () => {
    expect(Object.keys(CONTENT).sort()).toEqual(routes.sort())
  })

  it('has a nav entry for every route', () => {
    expect(NAV.map((n) => n.path).sort()).toEqual([...routes].sort())
  })

  it('gives every route enough prose to be worth indexing', () => {
    for (const r of routes) {
      const text = CONTENT[r].body.join(' ')
      expect(text.length, `${r} noscript prose`).toBeGreaterThan(400)
      expect(CONTENT[r].heading.length, `${r} heading`).toBeGreaterThan(0)
    }
  })

  it('gives every route distinct prose, so pages do not read as duplicates', () => {
    const headings = routes.map((r) => CONTENT[r].heading)
    expect(new Set(headings).size).toBe(headings.length)
    const firsts = routes.map((r) => CONTENT[r].body[0])
    expect(new Set(firsts).size).toBe(firsts.length)
  })

  it('keeps the router, the meta table and the sitemap in agreement', () => {
    const router = readFileSync(path.join(root, 'src/router.tsx'), 'utf8')
    // Child paths are declared without a leading slash in router.tsx.
    for (const r of routes) {
      if (r === '/') continue
      expect(router, `router.tsx missing ${r}`).toContain(`path: '${r.slice(1)}'`)
    }

    const sitemap = readFileSync(path.join(root, 'public/sitemap.xml'), 'utf8')
    for (const r of routes) {
      expect(sitemap, `sitemap.xml missing ${r}`).toContain(`${data.siteUrl}${r}<`)
    }
    const locCount = (sitemap.match(/<loc>/g) || []).length
    expect(locCount, 'sitemap has URLs not in the meta table').toBe(routes.length)
  })
})
