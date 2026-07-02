import { create } from 'zustand'
import { defaultParams, type RxParams } from '@/lib/rxKinetics'

interface ParamsState {
  params: RxParams
  setSpeciesName: (i: 0 | 1 | 2 | 3, name: string) => void
  setNu: (i: 0 | 1 | 2 | 3, value: number) => void
  setC0: (i: 0 | 1 | 2 | 3, value: number) => void
  setRateForm: (form: 1 | 2) => void
  setField: <K extends keyof Omit<RxParams, 'species' | 'nu' | 'C0s' | 'rateForm'>>(
    key: K,
    value: RxParams[K],
  ) => void
  reset: () => void
}

/** Species 1 must always be a reactant — every closed-form/derivation in
 * rxKinetics.ts assumes r = k*C1^n is driven by species 1 being consumed.
 * Mirrors the guard added to the MATLAB hub's collectParams. */
function coerceNu0(value: number): number {
  if (value === 0) return -1
  return value > 0 ? -value : value
}

export const useParamsStore = create<ParamsState>((set) => ({
  params: defaultParams(),

  setSpeciesName: (i, name) =>
    set((state) => {
      const species = [...state.params.species] as RxParams['species']
      species[i] = name
      return { params: { ...state.params, species } }
    }),

  setNu: (i, value) =>
    set((state) => {
      const nu = [...state.params.nu] as RxParams['nu']
      nu[i] = i === 0 ? coerceNu0(value) : value
      return { params: { ...state.params, nu } }
    }),

  setC0: (i, value) =>
    set((state) => {
      const C0s = [...state.params.C0s] as RxParams['C0s']
      C0s[i] = Math.max(value, 0)
      return { params: { ...state.params, C0s } }
    }),

  setRateForm: (rateForm) => set((state) => ({ params: { ...state.params, rateForm } })),

  setField: (key, value) => set((state) => ({ params: { ...state.params, [key]: value } })),

  reset: () => set({ params: defaultParams() }),
}))
