import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { usePageMeta } from './usePageMeta'

function Probe() {
  usePageMeta()
  return null
}
const at = (path: string) =>
  render(<MemoryRouter initialEntries={[path]}><Probe /></MemoryRouter>)

describe('usePageMeta', () => {
  it('sets a route-specific title', () => {
    at('/pfr')
    expect(document.title).toContain('PFR Simulator')
  })

  it('updates the description meta tag', () => {
    at('/cstr')
    const el = document.head.querySelector('meta[name="description"]')
    expect(el?.getAttribute('content')).toContain('continuous stirred-tank')
  })

  it('sets a canonical link without query strings', () => {
    at('/batch?T=350&q=0.1')
    const el = document.head.querySelector('link[rel="canonical"]')
    expect(el?.getAttribute('href')).toBe('https://reactor-design-explorer-web.vercel.app/batch')
  })

  it('titles an unknown route as not found rather than as the home page', () => {
    at('/nope')
    expect(document.title).toBe('Page not found — Reactor Design Explorer')
  })

  // A canonical here would point the 404 at the home page and invite it to be
  // indexed as a duplicate of it.
  it('claims no canonical on an unknown route', () => {
    at('/batch')
    expect(document.head.querySelector('link[rel="canonical"]')).not.toBeNull()
    at('/nope')
    expect(document.head.querySelector('link[rel="canonical"]')).toBeNull()
  })
})
