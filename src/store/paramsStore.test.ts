import { describe, it, expect, beforeEach } from 'vitest'
import { useParamsStore } from './paramsStore'

beforeEach(() => useParamsStore.getState().reset())

describe('paramsStore', () => {
  it('starts from defaultParams()', () => {
    const { params } = useParamsStore.getState()
    expect(params.nu).toEqual([-1, -1, 1, 1])
    expect(params.C0s).toEqual([0.1, 0.1, 0, 0])
  })

  it('setSpeciesName updates only the targeted slot', () => {
    useParamsStore.getState().setSpeciesName(1, 'H2O')
    expect(useParamsStore.getState().params.species).toEqual(['A', 'H2O', 'C', 'D'])
  })

  it('setNu coerces species 1 to stay negative (reactant invariant)', () => {
    useParamsStore.getState().setNu(0, 3)
    expect(useParamsStore.getState().params.nu[0]).toBe(-3)

    useParamsStore.getState().setNu(0, 0)
    expect(useParamsStore.getState().params.nu[0]).toBe(-1)

    useParamsStore.getState().setNu(0, -2)
    expect(useParamsStore.getState().params.nu[0]).toBe(-2)
  })

  it('setNu on other slots is unconstrained', () => {
    useParamsStore.getState().setNu(1, 5)
    expect(useParamsStore.getState().params.nu[1]).toBe(5)
  })

  it('setC0 clamps to non-negative', () => {
    useParamsStore.getState().setC0(2, -5)
    expect(useParamsStore.getState().params.C0s[2]).toBe(0)
  })

  it('setRateForm switches form and setField updates scalar fields', () => {
    useParamsStore.getState().setRateForm(2)
    useParamsStore.getState().setField('nB', 2)
    const { params } = useParamsStore.getState()
    expect(params.rateForm).toBe(2)
    expect(params.nB).toBe(2)
  })

  it('reset restores defaults after mutation', () => {
    useParamsStore.getState().setField('Ea', 1)
    useParamsStore.getState().reset()
    expect(useParamsStore.getState().params.Ea).toBe(43790)
  })
})
