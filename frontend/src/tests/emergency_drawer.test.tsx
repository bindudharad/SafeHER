import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { EmergencyDrawer } from '../components/layout/EmergencyDrawer'
import { FakeCallModal } from '../components/common/FakeCallModal'
import { NEUTRAL_REDIRECT_URL, resetQuickExitLock } from '../components/layout/QuickExitButton'

// Mock Web Audio API
class MockAudioContext {
  state = 'running'
  currentTime = 0
  createOscillator() {
    return {
      type: 'sine',
      frequency: {
        setValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      disconnect: vi.fn(),
    }
  }
  createGain() {
    return {
      gain: {
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
    }
  }
  destination = {}
  close = vi.fn().mockResolvedValue(undefined)
  resume = vi.fn().mockResolvedValue(undefined)
}

describe('Stage 6: Survivor Emergency Safety Hub & Controls', () => {
  const originalLocation = window.location

  beforeEach(() => {
    localStorage.clear()
    resetQuickExitLock()
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        ...originalLocation,
        replace: vi.fn(),
        href: 'http://localhost:5173/',
      },
    })
    Object.defineProperty(window, 'AudioContext', {
      configurable: true,
      value: MockAudioContext,
    })
  })

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
    })
    vi.restoreAllMocks()
  })

  it('renders EmergencyDrawer with all safety tabs and quick exit banner', () => {
    render(<EmergencyDrawer isOpen={true} onClose={vi.fn()} />)

    expect(screen.getByText('Survivor Emergency Hub')).toBeDefined()
    expect(screen.getByText('QUICK EXIT (Alt + Q)')).toBeDefined()
    expect(screen.getByText('Safety Tools')).toBeDefined()
    expect(screen.getByText('Journey Check-In')).toBeDefined()
    expect(screen.getByText(/Contacts/)).toBeDefined()
    expect(screen.getByText('Deterrent Audio Siren')).toBeDefined()
    expect(screen.getByText('Discreet Call Simulator')).toBeDefined()
    expect(screen.getByText('Direct Emergency Helplines')).toBeDefined()
  })

  it('triggers Quick Exit redirect from EmergencyDrawer banner', () => {
    render(<EmergencyDrawer isOpen={true} onClose={vi.fn()} />)

    const qeBtn = screen.getByText('QUICK EXIT (Alt + Q)')
    fireEvent.click(qeBtn)

    expect(window.location.replace).toHaveBeenCalledTimes(1)
    expect(window.location.replace).toHaveBeenCalledWith(NEUTRAL_REDIRECT_URL)
  })

  it('toggles emergency siren audio context safely', async () => {
    render(<EmergencyDrawer isOpen={true} onClose={vi.fn()} />)

    const activateBtn = screen.getByText('ACTIVATE EMERGENCY SIREN')
    fireEvent.click(activateBtn)

    await waitFor(() => {
      expect(screen.getByText('SILENCE SIREN')).toBeDefined()
    })

    const silenceBtn = screen.getByText('SILENCE SIREN')
    fireEvent.click(silenceBtn)

    await waitFor(() => {
      expect(screen.getByText('ACTIVATE EMERGENCY SIREN')).toBeDefined()
    })
  })

  it('renders FakeCallModal with honest disclosure and caller identity', () => {
    const handleClose = vi.fn()
    render(<FakeCallModal isOpen={true} callerName="Mom" onClose={handleClose} />)

    expect(screen.getByText('SafeHER Call Simulator (Local Simulation)')).toBeDefined()
    expect(screen.getByText('Mom')).toBeDefined()
    expect(screen.getByText('Incoming audio call...')).toBeDefined()
    expect(screen.getByLabelText('Accept Call')).toBeDefined()
    expect(screen.getByLabelText('Decline Call')).toBeDefined()
  })

  it('switches to active call screen when accepted', async () => {
    const handleClose = vi.fn()
    render(<FakeCallModal isOpen={true} callerName="Office" onClose={handleClose} />)

    const acceptBtn = screen.getByLabelText('Accept Call')
    fireEvent.click(acceptBtn)

    await waitFor(() => {
      expect(screen.getByText('Call Connected')).toBeDefined()
      expect(screen.getByLabelText('End Call')).toBeDefined()
    })
  })
})
