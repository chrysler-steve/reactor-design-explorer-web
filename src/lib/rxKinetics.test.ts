import { describe, it, expect } from 'vitest'
import {
  defaultParams,
  caBatch,
  caCSTR,
  caPFR,
  conversionOf,
  rateConstant,
  solve_batch,
  solve_CSTR,
  solve_PFR,
  equationString,
  maxConcentration,
  type RxParams,
} from './rxKinetics'

/**
 * All fixtures below were pulled from a live MATLAB session running the actual
 * rxKinetics.m (via mcp__matlab__evaluate_matlab_code, 2026-07-02) — this suite
 * checks the TS port against ground truth, not just internal self-consistency.
 */

function expectClose(actual: number[], expected: number[], precision = 9) {
  expect(actual.length).toBe(expected.length)
  actual.forEach((a, i) => expect(a).toBeCloseTo(expected[i], precision))
}

function expectMatrixClose(actual: number[][], expected: number[][], precision = 9) {
  expect(actual.length).toBe(expected.length)
  actual.forEach((row, i) => expectClose(row, expected[i], precision))
}

describe('rxKinetics — Form 1 (closed-form)', () => {
  it('caBatch: first order, A -> B', () => {
    const P: RxParams = { ...defaultParams(), nu: [-1, 1, 0, 0], C0s: [1, 0, 0, 0], nA: 1 }
    const result = caBatch(P, 0.3, [0, 1, 2, 5])
    expectClose(result, [1, 0.74081822068171788, 0.5488116360940265, 0.22313016014842982])
  })

  it('solve_batch: first order, A -> B, derives species 2 via stoichiometry', () => {
    const P: RxParams = { ...defaultParams(), nu: [-1, 1, 0, 0], C0s: [1, 0, 0, 0], nA: 1 }
    const C = solve_batch(P, 0.3, [0, 1, 2, 5])
    expectMatrixClose(C, [
      [1, 0.74081822068171788, 0.5488116360940265, 0.22313016014842979],
      [0, 0.25918177931828212, 0.4511883639059735, 0.77686983985157021],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ])
  })

  it('solve_batch: second order, default A+B -> C+D', () => {
    const P: RxParams = { ...defaultParams(), nA: 2 }
    const C = solve_batch(P, 0.05, [0, 2, 5, 10, 20])
    const sp1 = [0.1, 0.099009900990099015, 0.0975609756097561, 0.095238095238095233, 0.090909090909090912]
    const sp3 = [0, 0.000990099009900991, 0.0024390243902439046, 0.0047619047619047727, 0.0090909090909090939]
    expectMatrixClose(C, [sp1, sp1, sp3, sp3])
  })

  it('caBatch: fractional order n=0.5 clamps at finite extinction time', () => {
    const P: RxParams = { ...defaultParams(), nu: [-1, 1, 0, 0], C0s: [1, 0, 0, 0], nA: 0.5 }
    const result = caBatch(P, 0.2, [0, 1, 3, 10])
    expectClose(result, [1, 0.81, 0.48999999999999994, 0])
  })

  it('solve_CSTR: first order', () => {
    const P: RxParams = { ...defaultParams(), nu: [-1, 1, 0, 0], C0s: [1, 0, 0, 0], nA: 1 }
    const C = solve_CSTR(P, 0.3, [0, 1, 5, 20])
    expectMatrixClose(C, [
      [1, 0.76923076923076916, 0.4, 0.14285714285714279],
      [0, 0.23076923076923084, 0.6, 0.85714285714285721],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ])
  })

  it('solve_CSTR: second order, default', () => {
    const P: RxParams = { ...defaultParams(), nA: 2 }
    const C = solve_CSTR(P, 0.05, [0, 1, 5, 20])
    const sp1 = [0.1, 0.099504938362077952, 0.0976176963403031, 0.0916079783099616]
    const sp3 = [0, 0.00049506163792205349, 0.0023823036596969105, 0.0083920216900384009]
    expectMatrixClose(C, [sp1, sp1, sp3, sp3])
  })

  it('caCSTR: general order n=3 falls back to bisection (replacing fzero)', () => {
    const P: RxParams = { ...defaultParams(), nu: [-1, 1, 0, 0], C0s: [1, 0, 0, 0], nA: 3 }
    const result = caCSTR(P, 0.1, [0.1, 1, 5])
    expectClose(result, [0.99028852405457313, 0.9216989942046786, 0.7709169970592481])
  })

  it('solve_PFR: first order', () => {
    const P: RxParams = { ...defaultParams(), nu: [-1, 1, 0, 0], C0s: [1, 0, 0, 0], nA: 1 }
    const C = solve_PFR(P, 0.3, [0, 0.5, 1, 2], 0.1)
    expectMatrixClose(C, [
      [1, 0.2231301601484299, 0.049787068367863951, 0.0024787521766663767],
      [0, 0.7768698398515701, 0.950212931632136, 0.99752124782333362],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ])
  })

  it('solve_PFR: second order, default', () => {
    const P: RxParams = { ...defaultParams(), nA: 2 }
    const C = solve_PFR(P, 0.05, [0, 0.5, 1, 2], 0.2)
    const sp1 = [0.1, 0.098765432098765427, 0.0975609756097561, 0.095238095238095233]
    const sp3 = [0, 0.0012345679012345789, 0.0024390243902439046, 0.0047619047619047727]
    expectMatrixClose(C, [sp1, sp1, sp3, sp3])
  })
})

describe('rxKinetics — Form 2 (numerical: RK4 replaces ode45, bisection replaces fzero)', () => {
  const P: RxParams = {
    ...defaultParams(),
    nu: [-1, -2, 1, 0],
    C0s: [1, 0.5, 0, 0],
    rateForm: 2,
    nA: 1,
    nB: 1,
  }

  it('solve_batch: A + 2B -> C, r = k*C1*C2 (RK4 vs MATLAB ode45)', () => {
    const C = solve_batch(P, 0.4, [0, 0.5, 1, 2, 5])
    const expected = [
      [1, 0.9204761013780508, 0.86926681404216155, 0.811073492625524, 0.75945292046929],
      [0.5, 0.34095220275610194, 0.23853362808432338, 0.12214698525104822, 0.018905840938580012],
      [0, 0.079523898621949043, 0.13073318595783834, 0.18892650737447592, 0.24054707953071],
      [0, 0, 0, 0, 0],
    ]
    // RK4 vs adaptive ode45 — loosen precision vs. the closed-form/bisection cases
    expectMatrixClose(C, expected, 4)
  })

  it('solve_CSTR: A + 2B -> C (bisection vs MATLAB fzero)', () => {
    const C = solve_CSTR(P, 0.4, [0, 0.5, 1, 2, 5])
    const expected = [
      [1, 0.93210403685012, 0.89564392373896, 0.855536096278095, 0.80901699437494745],
      [0.5, 0.36420807370024, 0.29128784747791991, 0.21107219255619003, 0.1180339887498949],
      [0, 0.06789596314988, 0.10435607626104004, 0.14446390372190498, 0.19098300562505255],
      [0, 0, 0, 0, 0],
    ]
    expectMatrixClose(C, expected, 8)
  })

  it('solve_PFR: A + 2B -> C (RK4 vs MATLAB ode45)', () => {
    const C = solve_PFR(P, 0.4, [0, 0.5, 1, 2, 5], 0.3)
    const expected = [
      [1, 0.825976153940198, 0.77627032132562523, 0.75345340681601136, 0.75000855125765487],
      [0.5, 0.15195230788039638, 0.052540642651250816, 0.0069068136320231746, 1.7102515310180089e-5],
      [0, 0.17402384605980181, 0.2237296786743746, 0.24654659318398844, 0.24999144874234497],
      [0, 0, 0, 0, 0],
    ]
    expectMatrixClose(C, expected, 4)
  })

  it('solve_CSTR: C0s[0] <= 0 short-circuits to the trivial zero solution (no bisection call)', () => {
    const P2: RxParams = { ...P, C0s: [0, 0.5, 0, 0] }
    const C = solve_CSTR(P2, 0.4, [0, 1, 2])
    expectMatrixClose(C, [
      [0, 0, 0],
      [0.5, 0.5, 0.5],
      [0, 0, 0],
      [0, 0, 0],
    ])
  })

  it('solve_batch: rejects an array k (Form 2 only supports scalar k, matching MATLAB call sites)', () => {
    expect(() => solve_batch(P, [0.1, 0.2], [0, 1])).toThrow()
  })
})

describe('rxKinetics — equationString / maxConcentration', () => {
  it('equationString: single reactant, product coefficient > 1', () => {
    const P: RxParams = { ...defaultParams(), nu: [-1, 3, 0, 0], C0s: [1, 0, 0, 0] }
    expect(equationString(P)).toBe('A  →  3 B')
  })

  it('equationString: coefficients on both sides', () => {
    const P: RxParams = { ...defaultParams(), nu: [-2, -3, 1, 0], C0s: [1, 1, 0, 0] }
    expect(equationString(P)).toBe('2 A + 3 B  →  C')
  })

  it('maxConcentration: product with |nu| > 1 exceeds every initial concentration', () => {
    const P: RxParams = { ...defaultParams(), nu: [-1, 3, 0, 0], C0s: [1, 0, 0, 0] }
    expect(maxConcentration(P)).toBeCloseTo(3, 9)
  })
})

/**
 * The shipped defaults have to leave the reactors somewhere interesting: the
 * app's whole interaction is dragging temperature and flow rate and watching
 * conversion respond. An earlier default (A = 1.11e8) put every reactor above
 * 99% across the entire slider range, so every chart rendered as a flat line
 * and neither slider changed anything visible.
 */
describe('rxKinetics — default parameters stay in a responsive regime', () => {
  const P = defaultParams()
  const XaBatch = (T: number) => conversionOf(P, caBatch(P, rateConstant(P, T), [P.tmax])[0])
  const XaCSTR = (T: number, tau: number) =>
    conversionOf(P, caCSTR(P, rateConstant(P, T), [tau])[0])
  const XaPFR = (T: number, tau: number) =>
    conversionOf(P, caPFR(P, rateConstant(P, T), [P.Vr], P.Vr / tau)[0])

  it('batch conversion sweeps most of [0,1] across the temperature range', () => {
    expect(XaBatch(P.Tmin)).toBeLessThan(0.15)
    expect(XaBatch(P.Tmax)).toBeGreaterThan(0.95)
  })

  it('batch conversion passes through mid-range inside the slider, not at its edge', () => {
    const Xmid = XaBatch(0.5 * (P.Tmin + P.Tmax))
    expect(Xmid).toBeGreaterThan(0.5)
    expect(Xmid).toBeLessThan(0.995)
  })

  it('CSTR and PFR separate visibly at mid-range, so Compare shows a real gap', () => {
    const tau = P.Vr / P.qmin
    const gap = XaPFR(350, tau) - XaCSTR(350, tau)
    expect(gap).toBeGreaterThan(0.05)
  })
})
