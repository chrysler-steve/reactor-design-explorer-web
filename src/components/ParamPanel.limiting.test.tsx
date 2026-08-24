import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ParamPanel } from './ParamPanel'
import { useParamsStore } from '@/store/paramsStore'
import { defaultParams } from '@/lib/rxKinetics'

describe('ParamPanel limiting-reactant notice', () => {
  beforeEach(() => useParamsStore.getState().reset())

  it('stays hidden for the default equimolar feed', () => {
    render(<ParamPanel />)
    expect(screen.queryByTestId('limiting-reactant-notice')).toBeNull()
  })

  it('appears when a co-reactant runs out before species 1', () => {
    useParamsStore.getState().reset({ ...defaultParams(), C0s: [0.2, 0.05, 0, 0] })
    render(<ParamPanel />)
    const notice = screen.getByTestId('limiting-reactant-notice')
    expect(notice.textContent).toContain('B runs out first')
    expect(notice.textContent).toContain('25.0%')
  })

  it('stays hidden under rate form 2, which tracks the co-reactant itself', () => {
    useParamsStore.getState().reset({ ...defaultParams(), rateForm: 2, C0s: [0.2, 0.05, 0, 0] })
    render(<ParamPanel />)
    expect(screen.queryByTestId('limiting-reactant-notice')).toBeNull()
  })
})
