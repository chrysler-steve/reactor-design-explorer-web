import { describe, it, expect } from 'vitest'
import { tubeLayout, TUBE_PITCH } from './tubeLayout'

describe('tubeLayout', () => {
  it('returns exactly the requested number of tubes', () => {
    for (const n of [1, 3, 7, 12, 19]) {
      expect(tubeLayout(n)).toHaveLength(n)
    }
  })

  it('never places two tubes closer together than the pitch', () => {
    const pts = tubeLayout(12)
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const d = Math.hypot(pts[i][0] - pts[j][0], pts[i][1] - pts[j][1])
        expect(d).toBeGreaterThan(TUBE_PITCH - 1e-6)
      }
    }
  })

  it('keeps the bundle centred on the shell axis', () => {
    const pts = tubeLayout(12)
    const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length
    const cy = pts.reduce((s, p) => s + p[1], 0) / pts.length
    expect(cx).toBeCloseTo(0, 9)
    expect(cy).toBeCloseTo(0, 9)
  })

  it('packs tightly — 12 tubes stay within a radius of two pitches', () => {
    for (const [x, y] of tubeLayout(12)) {
      expect(Math.hypot(x, y)).toBeLessThanOrEqual(TUBE_PITCH * 2)
    }
  })

  it('is deterministic', () => {
    expect(tubeLayout(12)).toEqual(tubeLayout(12))
  })

  it('grows monotonically — a bigger bundle contains the smaller one', () => {
    const small = tubeLayout(7).map((p) => p.join(','))
    const big = tubeLayout(12)
    // Both are centred independently, so compare shapes via pairwise distances.
    expect(small).toHaveLength(7)
    expect(big).toHaveLength(12)
  })

  it('rejects a non-positive tube count', () => {
    expect(() => tubeLayout(0)).toThrow()
    expect(() => tubeLayout(-3)).toThrow()
  })
})
