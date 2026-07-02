import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ParamPanel } from './ParamPanel'
import { useParamsStore } from '@/store/paramsStore'

beforeEach(() => useParamsStore.getState().reset())

describe('ParamPanel', () => {
  it('renders the live equation preview from the store', () => {
    render(<ParamPanel />)
    expect(screen.getByTestId('equation-preview').textContent).toBe('A + B  →  C + D')
  })

  it('editing a species name updates the store and the equation preview', () => {
    render(<ParamPanel />)
    fireEvent.change(screen.getByLabelText('species 1 name'), { target: { value: 'H2' } })
    expect(useParamsStore.getState().params.species[0]).toBe('H2')
    expect(screen.getByTestId('equation-preview').textContent).toBe('H2 + B  →  C + D')
  })

  it('editing species 1 nu to a non-negative value is coerced back to negative', () => {
    render(<ParamPanel />)
    fireEvent.change(screen.getByLabelText('species 1 nu'), { target: { value: '2' } })
    expect(useParamsStore.getState().params.nu[0]).toBe(-2)
  })

  it('the nB field only appears when rate form is switched to Form 2', () => {
    render(<ParamPanel />)
    expect(screen.queryByLabelText(/order in species 2/)).not.toBeInTheDocument()
    useParamsStore.getState().setRateForm(2)
    expect(useParamsStore.getState().params.rateForm).toBe(2)
  })

  it('editing a numeric field updates the store', () => {
    render(<ParamPanel />)
    fireEvent.change(screen.getByLabelText('species 1 C0'), { target: { value: '0.5' } })
    expect(useParamsStore.getState().params.C0s[0]).toBe(0.5)
  })
})
