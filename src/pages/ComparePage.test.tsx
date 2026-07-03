import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ComparePage } from './ComparePage'
import { useParamsStore } from '@/store/paramsStore'

// jsdom can't render plotly.js-dist-min headlessly — exercised by build/typecheck
// and manual verification instead. Stub it here so this test can check
// ComparePage's own logic (readouts, data wiring).
vi.mock('@/components/Plot', () => ({
  default: () => <div data-testid="chart-stub" />,
}))

beforeEach(() => useParamsStore.getState().reset())

describe('ComparePage', () => {
  it('renders without crashing and shows all three reactor result cards', () => {
    render(<ComparePage />)
    expect(screen.getByText('Compare')).toBeInTheDocument()
    expect(screen.getByText('Temperature')).toBeInTheDocument()
    expect(screen.getByText('Flow Rate (affects CSTR & PFR only)')).toBeInTheDocument()
    expect(screen.getByText('BATCH')).toBeInTheDocument()
    expect(screen.getByText('CSTR')).toBeInTheDocument()
    expect(screen.getByText('PFR')).toBeInTheDocument()
    expect(screen.getAllByTestId('chart-stub')).toHaveLength(2)
  })

  it('shows valid Ca/Xa readouts for all three reactors at Tmin/qmin', () => {
    render(<ComparePage />)
    for (const name of ['BATCH', 'CSTR', 'PFR']) {
      const card = screen.getByText(name).closest('div')
      expect(card).not.toBeNull()
      const text = card?.textContent ?? ''
      const xaMatch = text.match(/Xa = ([\d.]+)%/)
      expect(xaMatch).not.toBeNull()
      const pct = parseFloat(xaMatch?.[1] ?? '')
      expect(Number.isFinite(pct)).toBe(true)
      expect(pct).toBeGreaterThanOrEqual(0)
      expect(pct).toBeLessThanOrEqual(100)
    }
  })

  it('shows a status line with T, q, and tau', () => {
    render(<ComparePage />)
    const status = screen.getByText(/τ=/)
    expect(status.textContent).toMatch(/T=/)
    expect(status.textContent).toMatch(/q=/)
    expect(status.textContent).toMatch(/τ=/)
  })

  it('does not throw when rateForm is 2', () => {
    useParamsStore.getState().setRateForm(2)
    expect(() => render(<ComparePage />)).not.toThrow()
    expect(screen.getByText('BATCH')).toBeInTheDocument()
  })
})
