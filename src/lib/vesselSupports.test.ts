import { describe, it, expect } from 'vitest'
import { legGeometry } from './vesselSupports'

describe('legGeometry', () => {
  const TOP_Y = -0.45
  const BOTTOM_Y = -1.5
  const RADIUS = 1.0
  const SPLAY = 0.28

  it("puts the leg's top exactly on the vessel wall", () => {
    // The regression this guards: with the tilt sign flipped the top landed at
    // radius + splay instead, floating clear of the vessel.
    const leg = legGeometry(TOP_Y, BOTTOM_Y, RADIUS, SPLAY)
    expect(leg.topRadius).toBeCloseTo(RADIUS, 9)
  })

  it("puts the leg's foot exactly where the foot pad is drawn", () => {
    const leg = legGeometry(TOP_Y, BOTTOM_Y, RADIUS, SPLAY)
    expect(leg.footRadius).toBeCloseTo(RADIUS + SPLAY, 9)
  })

  it('splays outward going down, never inward', () => {
    const leg = legGeometry(TOP_Y, BOTTOM_Y, RADIUS, SPLAY)
    expect(leg.footRadius).toBeGreaterThan(leg.topRadius)
  })

  it('is long enough to span the rise and the splay', () => {
    const leg = legGeometry(TOP_Y, BOTTOM_Y, RADIUS, SPLAY)
    expect(leg.length).toBeCloseTo(Math.hypot(TOP_Y - BOTTOM_Y, SPLAY), 9)
    expect(leg.length).toBeGreaterThan(TOP_Y - BOTTOM_Y)
  })

  it('stands the leg vertically when there is no splay', () => {
    const leg = legGeometry(TOP_Y, BOTTOM_Y, RADIUS, 0)
    expect(leg.tilt).toBeCloseTo(0, 9)
    expect(leg.topRadius).toBeCloseTo(RADIUS, 9)
    expect(leg.footRadius).toBeCloseTo(RADIUS, 9)
  })

  it('holds for a range of splays', () => {
    for (const splay of [0.1, 0.28, 0.5, 0.9]) {
      const leg = legGeometry(TOP_Y, BOTTOM_Y, RADIUS, splay)
      expect(leg.topRadius).toBeCloseTo(RADIUS, 9)
      expect(leg.footRadius).toBeCloseTo(RADIUS + splay, 9)
    }
  })

  it('rejects a vessel whose top is not above its base', () => {
    expect(() => legGeometry(-1.5, -0.45, RADIUS, SPLAY)).toThrow()
  })
})
