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

  const playRingPulse = () => {
    try {
      if (!audioCtxRef.current) {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
        audioCtxRef.current = new AudioCtx()
      }
      const ctx = audioCtxRef.current
      if (ctx.state === 'suspended') {
        ctx.resume()
      }

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
      // Audio playback restricted
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
      if (timerRef.current) clearInterval(timerRef.current)
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
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [callState])

  if (!isOpen) return null

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60)
    const secs = totalSec % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Fake Call Simulator"
      className="fixed inset-0 z-[110] bg-[#070908]/95 backdrop-blur-2xl flex flex-col justify-between items-center p-6 sm:p-12 text-[#f0f2eb]"
    >
      <div className="w-full max-w-md bg-[#0d1110] border border-[rgba(213,255,84,0.3)] rounded-[4px] p-3.5 flex items-start gap-2.5 text-xs text-[#929b93] text-left">
        <ShieldAlert className="w-4 h-4 text-[#d5ff54] shrink-0 mt-0.5" />
        <div>
          <p className="font-mono uppercase tracking-[0.12em] text-[10px] font-semibold text-[#d5ff54]">
            SafeHER Call Simulator (Local Simulation)
          </p>
          <p className="mt-1 text-[11px] leading-relaxed">
            This is an in-browser local simulation to help you exit uncomfortable situations safely. It does not place real phone calls.
          </p>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center my-auto">
        <div className="relative mb-6">
          <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full bg-[#111716] border-2 border-[#d5ff54]/55 flex items-center justify-center shadow-[0_0_50px_rgba(213,255,84,0.18)]">
            <span className="font-display text-5xl sm:text-6xl font-bold text-[#d5ff54]">
              {callerName.charAt(0).toUpperCase()}
            </span>
          </div>
          {callState === 'ringing' && (
            <div className="absolute inset-0 rounded-full border-2 border-[#d5ff54] animate-ping opacity-35 pointer-events-none" />
          )}
        </div>

        <h2 className="font-display text-3xl sm:text-4xl font-bold uppercase tracking-tight text-[#f0f2eb] text-center">
          {callerName || 'Home'}
        </h2>
        <p className="text-xs text-[#929b93] mt-1 font-mono uppercase tracking-[0.14em]">
          {callState === 'ringing'
            ? 'Incoming audio call...'
            : `In call: ${formatTimer(callSeconds)}`}
        </p>

        {callState === 'connected' && (
          <div className="flex items-center gap-2 mt-4 px-3 py-1 rounded-full bg-[#a8db35]/12 border border-[#a8db35]/35 text-[#a8db35] text-xs font-mono">
            <Volume2 className="w-3.5 h-3.5 animate-pulse" />
            <span>Call Connected</span>
          </div>
        )}
      </div>

      <div className="w-full max-w-xs flex items-center justify-around gap-6 pb-6">
        {callState === 'ringing' ? (
          <>
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={() => {
                  stopAudio()
                  onClose()
                }}
                className="w-16 h-16 rounded-full bg-[#ff927e] hover:bg-[#ffa898] text-[#170907] flex items-center justify-center shadow-lg transition-transform active:scale-95"
                aria-label="Decline Call"
              >
                <PhoneOff className="w-7 h-7" />
              </button>
              <span className="text-[11px] font-mono uppercase text-[#929b93]">Decline</span>
            </div>

            <div className="flex flex-col items-center gap-2">
              <button
                onClick={() => setCallState('connected')}
                className="w-16 h-16 rounded-full bg-[#d5ff54] hover:bg-[#e2ff84] text-[#080a08] flex items-center justify-center shadow-lg transition-transform active:scale-95 animate-bounce"
                aria-label="Accept Call"
              >
                <Phone className="w-7 h-7" />
              </button>
              <span className="text-[11px] font-mono uppercase text-[#d5ff54] font-semibold">
                Accept
              </span>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2 mx-auto">
            <button
              onClick={() => {
                stopAudio()
                onClose()
              }}
              className="w-16 h-16 rounded-full bg-[#ff927e] hover:bg-[#ffa898] text-[#170907] flex items-center justify-center shadow-lg transition-transform active:scale-95"
              aria-label="End Call"
            >
              <PhoneOff className="w-7 h-7" />
            </button>
            <span className="text-[11px] font-mono uppercase text-[#929b93]">End Call</span>
          </div>
        )}
      </div>
    </div>
  )
}
