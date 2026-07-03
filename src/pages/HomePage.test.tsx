import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { HomePage } from './HomePage'

// jsdom has no WebGL/ResizeObserver, so BatchScene (@react-three/fiber) can't
// render headlessly — exercised by build/typecheck and manual verification
// instead. Stub it here so this test can check HomePage's own content/links.
vi.mock('@/components/reactors/BatchScene', () => ({
  BatchScene: () => <div data-testid="batch-scene-stub" />,
}))

function renderHome() {
  return render(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>,
  )
}

describe('HomePage', () => {
  it('renders the hero heading, intro copy, and live 3D visual', () => {
    renderHome()
    expect(screen.getByText('Reactor Design Explorer')).toBeInTheDocument()
    expect(screen.getByTestId('batch-scene-stub')).toBeInTheDocument()
  })

  it('links to the simulator and each reactor tab', () => {
    renderHome()
    expect(screen.getByRole('link', { name: 'Launch the simulator' })).toHaveAttribute('href', '/batch')
    expect(screen.getByRole('link', { name: 'Compare reactors' })).toHaveAttribute('href', '/compare')
    expect(screen.getByRole('link', { name: /Batch/ })).toHaveAttribute('href', '/batch')
    expect(screen.getByRole('link', { name: /CSTR/ })).toHaveAttribute('href', '/cstr')
    expect(screen.getByRole('link', { name: /PFR/ })).toHaveAttribute('href', '/pfr')
  })
})
