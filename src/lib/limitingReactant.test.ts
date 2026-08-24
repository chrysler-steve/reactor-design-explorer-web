import { describe, it, expect } from 'vitest'
import { defaultParams, limitingReactant, type RxParams } from './rxKinetics'

const P = (over: Partial<RxParams>): RxParams => ({ ...defaultParams(), ...over })

describe('limitingReactant', () => {
  it('finds nothing when species 1 is the limiting reactant', () => {
    // A and B both 0.1 at 1:1 — they run out together, so species 1 is the basis.
    expect(limitingReactant(P({ nu: [-1, -1, 1, 1], C0s: [0.1, 0.1, 0, 0] }))).toBeNull()
  })

  it('finds nothing when the co-reactant is in excess', () => {
    expect(limitingReactant(P({ nu: [-1, -1, 1, 1], C0s: [0.1, 0.5, 0, 0] }))).toBeNull()
  })

  it('finds nothing for a single-reactant reaction', () => {
    expect(limitingReactant(P({ nu: [-1, 1, 0, 0], C0s: [0.1, 0, 0, 0] }))).toBeNull()
  })

  it('flags a co-reactant that runs out first', () => {
    const found = limitingReactant(P({ nu: [-1, -1, 1, 1], C0s: [0.2, 0.05, 0, 0] }))
    expect(found?.index).toBe(1)
    // B supports an extent of 0.05; A can reach 0.2. So A tops out at 25%.
    expect(found?.maxConversion).toBeCloseTo(0.25, 9)
  })

  it('accounts for stoichiometric coefficients, not just concentrations', () => {
    // B looks plentiful at 0.15 vs A's 0.1, but it is consumed 2 per A.
    const found = limitingReactant(P({ nu: [-1, -2, 1, 0], C0s: [0.1, 0.15, 0, 0] }))
    expect(found?.index).toBe(1)
    expect(found?.maxConversion).toBeCloseTo(0.75, 9)
  })

  it('is not fooled when the coefficient makes an apparently small feed sufficient', () => {
    // A is consumed 2 at a time, so its own capacity is only 0.05.
    expect(limitingReactant(P({ nu: [-2, -1, 1, 0], C0s: [0.1, 0.08, 0, 0] }))).toBeNull()
  })

  it('picks the scarcest when several co-reactants could limit', () => {
    const found = limitingReactant(P({ nu: [-1, -1, -1, 1], C0s: [1, 0.4, 0.2, 0] }))
    expect(found?.index).toBe(2)
    expect(found?.maxConversion).toBeCloseTo(0.2, 9)
  })

  it('flags a co-reactant that is entirely absent', () => {
    const found = limitingReactant(P({ nu: [-1, -1, 1, 1], C0s: [0.1, 0, 0, 0] }))
    expect(found?.index).toBe(1)
    expect(found?.maxConversion).toBe(0)
  })

  it('ignores products and inerts', () => {
    expect(limitingReactant(P({ nu: [-1, 1, 2, 0], C0s: [0.1, 0, 0, 0] }))).toBeNull()
  })

  it('returns null when species 1 has no feed, since conversion is undefined', () => {
    expect(limitingReactant(P({ nu: [-1, -1, 1, 1], C0s: [0, 0.1, 0, 0] }))).toBeNull()
  })

  it('does not apply to rate form 2, which already tracks the co-reactant', () => {
    expect(limitingReactant(P({ rateForm: 2, nu: [-1, -1, 1, 1], C0s: [0.2, 0.05, 0, 0] }))).toBeNull()
  })
})
