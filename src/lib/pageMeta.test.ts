import { describe, it, expect } from 'vitest'
import { getPageMeta, KNOWN_ROUTES, SITE_NAME, SITE_URL } from './pageMeta'

describe('getPageMeta', () => {
  it('gives every route a distinct title', () => {
    const titles = KNOWN_ROUTES.map((r) => getPageMeta(r).title)
    expect(new Set(titles).size).toBe(titles.length)
  })

  it('gives every route a distinct description', () => {
    const descs = KNOWN_ROUTES.map((r) => getPageMeta(r).description)
    expect(new Set(descs).size).toBe(descs.length)
  })

  it('leads with the specific reactor so it survives truncation', () => {
    expect(getPageMeta('/batch').title.startsWith('Batch Reactor')).toBe(true)
    expect(getPageMeta('/cstr').title.startsWith('CSTR')).toBe(true)
    expect(getPageMeta('/pfr').title.startsWith('PFR')).toBe(true)
  })

  it('keeps titles short enough that search results do not cut the brand', () => {
    for (const r of KNOWN_ROUTES) expect(getPageMeta(r).title.length).toBeLessThanOrEqual(70)
  })

  it('keeps descriptions in the range search engines actually display', () => {
    for (const r of KNOWN_ROUTES) {
      const d = getPageMeta(r).description
      expect(d.length).toBeGreaterThanOrEqual(70)
      expect(d.length).toBeLessThanOrEqual(200)
    }
  })

  it('names the site on every route', () => {
    for (const r of KNOWN_ROUTES) expect(getPageMeta(r).title).toContain(SITE_NAME)
  })

  it('builds absolute canonicals', () => {
    expect(getPageMeta('/').canonical).toBe(SITE_URL + '/')
    expect(getPageMeta('/pfr').canonical).toBe(SITE_URL + '/pfr')
  })

  it('treats a trailing slash as the same page', () => {
    expect(getPageMeta('/batch/')).toEqual(getPageMeta('/batch'))
  })

  it('falls back to the site default for an unknown route', () => {
    expect(getPageMeta('/nope').title).toBe(SITE_NAME)
  })
})
