import React, { useState, useEffect, useRef } from 'react'
import { Phone, PhoneOff, Volume2, ShieldAlert } from 'lucide-react'

interface FakeCallModalProps {
  isOpen: boolean
  callerName: string
  onClose: () => void
}

export const FakeCallModal: React.FC<FakeCallModalProps> = ({ isOpen, callerName, onClose }) => {
  const [callState, setCallState] = useState<'ringing' | 'connected'>('ringing')
  const [callSeconds, setCallSeconds] = useState(0)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const ringIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Start ringtone oscillator
  const playRingPulse = () => {
    try {
      if (!audioCtxRef.current) {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
        audioCtxRef.current = new AudioCtx()
      }
      const ctx = audioCtxRef.current
      if (ctx.state === 'suspended') {
        ctx.resume()
      }

      // Dual tone ring pattern (440Hz + 480Hz US standard tone)
      const osc1 = ctx.createOscillator()
      const osc2 = ctx.createOscillator()
      const gain = ctx.createGain()

      osc1.frequency.setValueAtTime(440, ctx.currentTime)
      osc2.frequency.setValueAtTime(480, ctx.currentTime)

      gain.gain.setValueAtTime(0.12, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.8)

      osc1.connect(gain)
      osc2.connect(gain)
      gain.connect(ctx.destination)

      osc1.start()
      osc2.start()
      osc1.stop(ctx.currentTime + 1.8)
      osc2.stop(ctx.currentTime + 1.8)
    } catch {
      // Audio playback might be restricted if no user interaction yet
    }
  }

  const stopAudio = () => {
    if (ringIntervalRef.current) {
      clearInterval(ringIntervalRef.current)
      ringIntervalRef.current = null
    }
    if (audioCtxRef.current) {
      try {
        audioCtxRef.current.close()
      } catch {
        // ignore
      }
      audioCtxRef.current = null
    }
  }

  useEffect(() => {
    if (isOpen) {
      setCallState('ringing')
      setCallSeconds(0)
      playRingPulse()
      ringIntervalRef.current = setInterval(playRingPulse, 3500)
    } else {
      stopAudio()
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }

    return () => {
      stopAudio()
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [isOpen])

  useEffect(() => {
    if (callState === 'connected') {
      stopAudio()
      timerRef.current = setInterval(() => {
        setCallSeconds((s) => s + 1)
      }, 1000)
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [callState])

  if (!isOpen) return null

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60)
    const secs = totalSec % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const handleAccept = () => {
    setCallState('connected')
  }

  const handleDecline = () => {
    stopAudio()
    onClose()
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Fake Call Simulator"
      className="fixed inset-0 z-50 bg-[#080B18]/95 backdrop-blur-2xl flex flex-col justify-between items-center p-6 sm:p-12 text-[#F4F5FF] animate-in fade-in duration-200"
    >
      {/* Honest Limitation & Safety Disclosure Banner */}
      <div className="w-full max-w-md bg-[#1D2540]/80 border border-[#8B7CFF]/30 rounded-2xl p-3 flex items-start gap-2.5 text-xs text-[#A6AEC8]">
        <ShieldAlert className="w-4 h-4 text-[#8B7CFF] shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-[#F4F5FF]">SafeHER Call Simulator (Local Simulation)</p>
          <p className="mt-0.5 text-[11px] leading-relaxed">
            This is an in-browser local simulation to help you exit uncomfortable situations safely. It does not place real phone calls.
          </p>
        </div>
      </div>

      {/* Center: Caller Identity */}
      <div className="flex flex-col items-center justify-center my-auto">
        <div className="relative mb-6">
          <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full bg-gradient-to-tr from-[#8B7CFF]/30 to-[#55D6E8]/30 border-2 border-[#8B7CFF]/50 flex items-center justify-center shadow-[0_0_50px_rgba(139,124,255,0.25)]">
            <span className="text-4xl sm:text-5xl font-bold text-[#F4F5FF]">
              {callerName.charAt(0).toUpperCase()}
            </span>
          </div>
          {callState === 'ringing' && (
            <div className="absolute inset-0 rounded-full border-2 border-[#8B7CFF] animate-ping opacity-40 pointer-events-none" />
          )}
        </div>

        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#F4F5FF] text-center">
          {callerName || 'Home'}
        </h2>
        <p className="text-sm text-[#A6AEC8] mt-1 font-mono">
          {callState === 'ringing' ? 'Incoming audio call...' : `In call: ${formatTimer(callSeconds)}`}
        </p>

        {callState === 'connected' && (
          <div className="flex items-center gap-2 mt-4 px-3 py-1 rounded-full bg-[#52D6B2]/10 border border-[#52D6B2]/30 text-[#52D6B2] text-xs font-mono">
            <Volume2 className="w-3.5 h-3.5 animate-pulse" />
            <span>Call Connected</span>
          </div>
        )}
      </div>

      {/* Bottom Controls */}
      <div className="w-full max-w-xs flex items-center justify-around gap-6 pb-6">
        {callState === 'ringing' ? (
          <>
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={handleDecline}
                className="w-16 h-16 rounded-full bg-[#FF5C7A] hover:bg-[#FF4063] text-white flex items-center justify-center shadow-lg transition-transform active:scale-95"
                aria-label="Decline Call"
              >
                <PhoneOff className="w-7 h-7" />
              </button>
              <span className="text-xs text-[#A6AEC8]">Decline</span>
            </div>

            <div className="flex flex-col items-center gap-2">
              <button
                onClick={handleAccept}
                className="w-16 h-16 rounded-full bg-[#52D6B2] hover:bg-[#3ec49e] text-[#080B18] flex items-center justify-center shadow-lg transition-transform active:scale-95 animate-bounce"
                aria-label="Accept Call"
              >
                <Phone className="w-7 h-7" />
              </button>
              <span className="text-xs text-[#52D6B2] font-semibold">Accept</span>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2 mx-auto">
            <button
              onClick={handleDecline}
              className="w-16 h-16 rounded-full bg-[#FF5C7A] hover:bg-[#FF4063] text-white flex items-center justify-center shadow-lg transition-transform active:scale-95"
              aria-label="End Call"
            >
              <PhoneOff className="w-7 h-7" />
            </button>
            <span className="text-xs text-[#A6AEC8]">End Call</span>
          </div>
        )}
      </div>
    </div>
  )
}
