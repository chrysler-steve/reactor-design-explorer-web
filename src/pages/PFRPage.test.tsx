import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PFRPage } from './PFRPage'
import { useParamsStore } from '@/store/paramsStore'

// jsdom has no WebGL/ResizeObserver, so PFRScene (@react-three/fiber) and the
// Plot-based charts (plotly.js-dist-min) can't render headlessly — those are
// exercised by build/typecheck and manual verification instead. Stub them here
// so this test can check PFRPage's own logic (readouts, data wiring).
vi.mock('@/components/reactors/PFRScene', () => ({
  PFRScene: () => <div data-testid="pfr-scene-stub" />,
}))
vi.mock('@/components/ConcentrationChart', () => ({
  ConcentrationChart: () => <div data-testid="chart-stub" />,
}))
vi.mock('@/components/ConversionChart', () => ({
  ConversionChart: () => <div data-testid="conversion-chart-stub" />,
}))

beforeEach(() => useParamsStore.getState().reset())

describe('PFRPage', () => {
  it('renders without crashing and shows the readouts', () => {
    render(<PFRPage />)
    expect(screen.getByText('PFR')).toBeInTheDocument()
    expect(screen.getByText('Temperature')).toBeInTheDocument()
    expect(screen.getByText('Flow Rate')).toBeInTheDocument()
    expect(screen.getByText('Ca,exit')).toBeInTheDocument()
    expect(screen.getByText('Xa,exit')).toBeInTheDocument()
    expect(screen.getByText('Residence time τ')).toBeInTheDocument()
    expect(screen.getByText('Rate constant k')).toBeInTheDocument()
    expect(screen.getByTestId('pfr-scene-stub')).toBeInTheDocument()
    expect(screen.getByTestId('chart-stub')).toBeInTheDocument()
    expect(screen.getByTestId('conversion-chart-stub')).toBeInTheDocument()
    expect(screen.getByText('FEED →')).toBeInTheDocument()
    expect(screen.getByText('→ PRODUCT')).toBeInTheDocument()
  })

  it('shows a valid conversion percentage for the default reaction at Tmin/qmin', () => {
    render(<PFRPage />)
    const value = screen.getByText('Xa,exit').nextElementSibling
    const pct = parseFloat(value?.textContent ?? '')
    expect(Number.isFinite(pct)).toBe(true)
    expect(pct).toBeGreaterThanOrEqual(0)
    expect(pct).toBeLessThanOrEqual(100)
  })

  it('shows a PFR-vs-CSTR comparison line', () => {
    render(<PFRPage />)
    const comparison = screen.getByText(/PFR X.=/)
    expect(comparison.textContent).toMatch(/PFR X.=/)
    expect(comparison.textContent).toMatch(/CSTR X.=/)
  })

  it('does not throw when rateForm is 2', () => {
    useParamsStore.getState().setRateForm(2)
    expect(() => render(<PFRPage />)).not.toThrow()
    const value = screen.getByText('Xa,exit').nextElementSibling
    const pct = parseFloat(value?.textContent ?? '')
    expect(Number.isFinite(pct)).toBe(true)
  })
})
