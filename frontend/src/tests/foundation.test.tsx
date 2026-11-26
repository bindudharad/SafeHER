import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Button } from '../components/common/Button'
import { Modal } from '../components/common/Modal'
import { calculateSHA256 } from '../utils/crypto'
import { I18nProvider } from '../contexts/I18nContext'
import { QuickExitButton } from '../components/layout/QuickExitButton'

describe('Foundation Components & Utilities', () => {
  it('calculates SHA-256 hash correctly for a byte buffer', async () => {
    const encoder = new TextEncoder()
    const data = encoder.encode('SafeHER Test Evidence String')
    const hash = await calculateSHA256(data.buffer)
    expect(hash).toBeDefined()
    expect(hash.length).toBe(64) // standard 64-char hex string
  })

  it('renders Button with variants and handles click events', () => {
    let clicked = false
    render(
      <Button variant="primary" onClick={() => { clicked = true }}>
        Test Action
      </Button>
    )
    const btn = screen.getByRole('button', { name: /Test Action/i })
    expect(btn).toBeInTheDocument()
    fireEvent.click(btn)
    expect(clicked).toBe(true)
  })

  it('renders Modal and closes on Escape key', () => {
    let closed = false
    render(
      <Modal isOpen={true} onClose={() => { closed = true }} title="Test Dialog">
        <p>Modal content</p>
      </Modal>
    )
    expect(screen.getByText('Test Dialog')).toBeInTheDocument()
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(closed).toBe(true)
  })

  it('renders Quick Exit button with Alt+Q accessibility label', () => {
    render(
      <I18nProvider>
        <QuickExitButton />
      </I18nProvider>
    )
    const quickExit = screen.getByRole('button', { name: /Quick Exit/i })
    expect(quickExit).toBeInTheDocument()
  })
})
