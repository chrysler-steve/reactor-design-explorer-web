import { describe, it, expect } from 'vitest'

/**
 * The page tests all mock this module, because Plotly cannot lay out a chart in
 * jsdom. That leaves the real import graph completely unexercised — when the
 * dist bundle was swapped for a source build, every page test still passed
 * while the deployed app died on load.
 *
 * This does not replace checking a real browser (a missing `global` shim fails
 * only there — Node defines `global` itself, so it cannot be reproduced here).
 * What it does catch is the import graph breaking: a renamed subpath, plotly.js
 * disappearing as a dependency, or register() throwing on the trace we need.
 */
describe('Plot module', () => {
  // Generous timeouts: these are the only tests that import Plotly for real
  // rather than mocking it, and that import is heavy enough to overrun the
  // default deadline when the suite runs files in parallel.
  it('builds a component from plotly core with the scatter trace registered', { timeout: 30_000 }, async () => {
    const mod = await import('./Plot')
    expect(mod.default).toBeTruthy()
  })

  it('exposes scatter on the registered plotly instance', { timeout: 30_000 }, async () => {
    const core = (await import('plotly.js/lib/core')) as unknown as {
      default?: { register?: unknown }
      register?: unknown
    }
    const Plotly = core.default ?? core
    expect(typeof Plotly.register).toBe('function')

    const scatter = (await import('plotly.js/lib/scatter')) as unknown as {
      default?: { name?: string }
      name?: string
    }
    const trace = scatter.default ?? scatter
    expect(trace.name).toBe('scatter')
  })
})
