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

  it('falls back to the site title on an unknown route', () => {
    at('/nope')
    expect(document.title).toBe('Reactor Design Explorer')
  })
})
