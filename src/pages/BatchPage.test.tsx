import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BatchPage } from './BatchPage'
import { useParamsStore } from '@/store/paramsStore'

// jsdom has no WebGL/ResizeObserver, so BatchScene (@react-three/fiber) and
// Plot (plotly.js-dist-min) can't render headlessly — those are exercised by
// build/typecheck and manual verification instead. Stub them here so this
// test can check BatchPage's own logic (readouts, data wiring).
vi.mock('@/components/reactors/BatchScene', () => ({
  BatchScene: () => <div data-testid="batch-scene-stub" />,
}))
vi.mock('@/components/ConcentrationChart', () => ({
  ConcentrationChart: () => <div data-testid="chart-stub" />,
}))

beforeEach(() => useParamsStore.getState().reset())

describe('BatchPage', () => {
  it('renders without crashing and shows the readouts', () => {
    render(<BatchPage />)
    expect(screen.getByText('Batch Reactor')).toBeInTheDocument()
    expect(screen.getByText('Rate constant k')).toBeInTheDocument()
    expect(screen.getByText('Final conversion Xₐ')).toBeInTheDocument()
    expect(screen.getByTestId('batch-scene-stub')).toBeInTheDocument()
    expect(screen.getByTestId('chart-stub')).toBeInTheDocument()
  })

  it('shows a valid conversion percentage for the default reaction at Tmin', () => {
    render(<BatchPage />)
    const value = screen.getByText('Final conversion Xₐ').nextElementSibling
    const pct = parseFloat(value?.textContent ?? '')
    expect(Number.isFinite(pct)).toBe(true)
    expect(pct).toBeGreaterThanOrEqual(0)
    expect(pct).toBeLessThanOrEqual(100)
  })
})
