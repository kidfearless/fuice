import { render } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ErrorFallback } from './ErrorFallback'

describe('ErrorFallback', () => {
  const resetErrorBoundary = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rethrows in DEV mode', () => {
    // import.meta.env.DEV is true in test
    const error = new Error('test err')
    expect(() => {
      render(<ErrorFallback error={error} resetErrorBoundary={resetErrorBoundary} />)
    }).toThrow('test err')
  })
})
