import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  X,
  Volume2,
  VolumeX,
  Phone,
  PhoneCall,
  Clock,
  CheckCircle2,
  AlertTriangle,
  UserPlus,
  Trash2,
  ShieldAlert,
  Radio,
  ExternalLink,
  Info,
  LogOut,
} from 'lucide-react'
import { apiClient } from '../../services/api/client'
import type { TrustedContact, JourneyCheckin, UserSafetySettings } from '../../types'
import { FakeCallModal } from '../common/FakeCallModal'
import { performQuickExit } from './QuickExitButton'

interface EmergencyDrawerProps {
  isOpen: boolean
  onClose: () => void
}

export const EmergencyDrawer: React.FC<EmergencyDrawerProps> = ({ isOpen, onClose }) => {
  // Tabs: 'safety' | 'journey' | 'contacts' | 'settings'
  const [activeTab, setActiveTab] = useState<'safety' | 'journey' | 'contacts'>('safety')

  // Siren Web Audio state
  const [isSirenActive, setIsSirenActive] = useState(false)
  const [sirenVolume, setSirenVolume] = useState(0.8)
  const [sirenCountdown, setSirenCountdown] = useState(30)
  const sirenAudioCtxRef = useRef<AudioContext | null>(null)
  const sirenOscRef = useRef<OscillatorNode | null>(null)
  const sirenGainRef = useRef<GainNode | null>(null)
  const sirenIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Fake Call state
  const [isFakeCallOpen, setIsFakeCallOpen] = useState(false)
  const [fakeCallerName, setFakeCallerName] = useState('Mom')
  const [fakeCallDelay, setFakeCallDelay] = useState(0) // seconds
  const [fakeCallScheduled, setFakeCallScheduled] = useState(false)

  // Journey state
  const [activeJourney, setActiveJourney] = useState<JourneyCheckin | null>(null)
  const [journeyDest, setJourneyDest] = useState('')
  const [journeyDuration, setJourneyDuration] = useState(15)
  const [journeySelectedContact, setJourneySelectedContact] = useState('')
  const [journeyRemainingSeconds, setJourneyRemainingSeconds] = useState<number | null>(null)
  const [journeyLoading, setJourneyLoading] = useState(false)

  // Contacts state
  const [contacts, setContacts] = useState<TrustedContact[]>([])
  const [newContactName, setNewContactName] = useState('')
  const [newContactPhone, setNewContactPhone] = useState('')
  const [newContactRel, setNewContactRel] = useState('friend')
  const [showAddContact, setShowAddContact] = useState(false)

  // Settings
  const [safetySettings, setSafetySettings] = useState<UserSafetySettings | null>(null)

  // Load active journey & contacts on open
  useEffect(() => {
    if (isOpen) {
      loadInitialData()
    } else {
      stopSiren()
    }
  }, [isOpen])

  const loadInitialData = async () => {
    try {
      const [sett, cts, jrn] = await Promise.all([
        apiClient.getSafetySettings().catch(() => null),
        apiClient.listTrustedContacts().catch(() => []),
        apiClient.getActiveJourneyCheckin().catch(() => null),
      ])
      if (sett) {
        setSafetySettings(sett)
        setSirenVolume(sett.siren_volume ?? 0.8)
        setFakeCallerName(sett.fake_call_caller_name || 'Mom')
      }
      setContacts(cts || [])
      setActiveJourney(jrn)
    } catch {
      // Ignore initial load error
    }
  }

  // Siren audio engine
  const startSiren = () => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      const ctx = new AudioCtx()
      sirenAudioCtxRef.current = ctx

      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      sirenOscRef.current = osc
      sirenGainRef.current = gain

      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(700, ctx.currentTime)

      // Frequency modulation for siren sweep: 700Hz -> 1200Hz -> 700Hz
      const now = ctx.currentTime
      for (let i = 0; i < 60; i++) {
        osc.frequency.linearRampToValueAtTime(1200, now + i * 1.0 + 0.5)
        osc.frequency.linearRampToValueAtTime(700, now + i * 1.0 + 1.0)
      }

      gain.gain.setValueAtTime(sirenVolume, ctx.currentTime)
      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start()
      setIsSirenActive(true)
      const maxSec = safetySettings?.siren_duration_seconds || 30
      setSirenCountdown(maxSec)

      sirenIntervalRef.current = setInterval(() => {
        setSirenCountdown((prev) => {
          if (prev <= 1) {
            stopSiren()
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } catch {
      setIsSirenActive(false)
    }
  }

  const stopSiren = useCallback(() => {
    if (sirenIntervalRef.current) {
      clearInterval(sirenIntervalRef.current)
      sirenIntervalRef.current = null
    }
    if (sirenOscRef.current) {
      try {
        sirenOscRef.current.stop()
        sirenOscRef.current.disconnect()
      } catch {
        // ignore
      }
      sirenOscRef.current = null
    }
    if (sirenAudioCtxRef.current) {
      try {
        sirenAudioCtxRef.current.close()
      } catch {
        // ignore
      }
      sirenAudioCtxRef.current = null
    }
    setIsSirenActive(false)
  }, [])

  // Volume slider update
  const handleVolumeChange = (vol: number) => {
    setSirenVolume(vol)
    if (sirenGainRef.current && sirenAudioCtxRef.current) {
      sirenGainRef.current.gain.setValueAtTime(vol, sirenAudioCtxRef.current.currentTime)
    }
  }

  // Trigger Fake Call
  const handleTriggerFakeCall = () => {
    if (fakeCallDelay > 0) {
      setFakeCallScheduled(true)
      setTimeout(() => {
        setFakeCallScheduled(false)
        setIsFakeCallOpen(true)
      }, fakeCallDelay * 1000)
    } else {
      setIsFakeCallOpen(true)
    }
  }

  // Journey countdown calculation
  useEffect(() => {
    if (!activeJourney || activeJourney.status !== 'active') {
      setJourneyRemainingSeconds(null)
      return
    }

    const updateRemaining = () => {
      const expiresAt = new Date(activeJourney.expires_at).getTime()
      const now = Date.now()
      const diff = Math.max(0, Math.floor((expiresAt - now) / 1000))
      setJourneyRemainingSeconds(diff)
      if (diff === 0) {
        setActiveJourney((prev) => (prev ? { ...prev, status: 'expired' } : null))
      }
    }

    updateRemaining()
    const intv = setInterval(updateRemaining, 1000)
    return () => clearInterval(intv)
  }, [activeJourney])

  const handleStartJourney = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!journeyDest.trim()) return
    setJourneyLoading(true)
    try {
      const res = await apiClient.startJourneyCheckin(
        journeyDest.trim(),
        journeyDuration,
        journeySelectedContact || null
      )
      setActiveJourney(res)
      setJourneyDest('')
    } catch {
      // Handle error
    } finally {
      setJourneyLoading(false)
    }
  }

  const handleCompleteJourney = async () => {
    if (!activeJourney) return
    setJourneyLoading(true)
    try {
      await apiClient.completeJourneyCheckin(activeJourney.id)
      setActiveJourney((prev) => (prev ? { ...prev, status: 'completed_safely' } : null))
    } catch {
      // Handle error
    } finally {
      setJourneyLoading(false)
    }
  }

  const handleCancelJourney = async () => {
    if (!activeJourney) return
    setJourneyLoading(true)
    try {
      await apiClient.cancelJourneyCheckin(activeJourney.id)
      setActiveJourney(null)
    } catch {
      // Handle error
    } finally {
      setJourneyLoading(false)
    }
  }

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newContactName.trim() || !newContactPhone.trim()) return
    try {
      const created = await apiClient.addTrustedContact({
        name: newContactName.trim(),
        phone_number: newContactPhone.trim(),
        relationship: newContactRel,
        notify_on_escalation: true,
      })
      setContacts((prev) => [...prev, created])
      setNewContactName('')
      setNewContactPhone('')
      setShowAddContact(false)
    } catch {
      // Handle error
    }
  }

  const handleDeleteContact = async (id: string) => {
    try {
      await apiClient.deleteTrustedContact(id)
      setContacts((prev) => prev.filter((c) => c.id !== id))
    } catch {
      // Handle error
    }
  }

  if (!isOpen) return null

  const formatSecs = (sec: number) => {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${m}:${s < 10 ? '0' : ''}${s}`
  }

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-[#080B18]/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        role="dialog"
        aria-label="Survivor Emergency Safety Drawer"
        className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-[#0D1224] border-l border-[#8B7CFF]/30 shadow-2xl flex flex-col text-[#F4F5FF] overflow-hidden animate-in slide-in-from-right duration-300"
      >
        {/* Header */}
        <div className="p-4 border-b border-[#A6AEC8]/15 bg-[#171D35]/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-[#FF5C7A]/20 border border-[#FF5C7A]/40 text-[#FF5C7A]">
              <Radio className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <h2 className="font-bold text-sm tracking-wide text-[#F4F5FF]">Survivor Emergency Hub</h2>
              <p className="text-[10px] text-[#A6AEC8]">Rapid safety actions & discreet tools</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close Emergency Hub"
            className="p-1.5 text-[#A6AEC8] hover:text-[#F4F5FF] rounded-lg hover:bg-[#1D2540] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Exit Sticky Banner with Honest Limitations */}
        <div className="p-3 bg-[#FF5C7A]/10 border-b border-[#FF5C7A]/30">
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={() => performQuickExit()}
              className="flex-1 py-2 px-3 bg-[#FF5C7A] hover:bg-[#FF4063] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95"
            >
              <LogOut className="w-4 h-4" />
              <span>QUICK EXIT (Alt + Q)</span>
            </button>
          </div>
          <p className="mt-1.5 text-[10px] text-[#A6AEC8] leading-tight">
            Leaves SafeHER immediately for a neutral weather website. Note: Browser history and ISP logs are not deleted. Use Private / Incognito mode when possible.
          </p>
        </div>

        {/* Nav Tabs */}
        <div className="flex border-b border-[#A6AEC8]/15 bg-[#0D1224] px-2 pt-2 gap-1 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('safety')}
            className={`flex-1 py-2 text-center rounded-t-lg transition-colors border-b-2 ${
              activeTab === 'safety'
                ? 'border-[#8B7CFF] text-[#8B7CFF] bg-[#171D35]/50'
                : 'border-transparent text-[#A6AEC8] hover:text-[#F4F5FF]'
            }`}
          >
            Safety Tools
          </button>
          <button
            onClick={() => setActiveTab('journey')}
            className={`flex-1 py-2 text-center rounded-t-lg transition-colors border-b-2 ${
              activeTab === 'journey'
                ? 'border-[#8B7CFF] text-[#8B7CFF] bg-[#171D35]/50'
                : 'border-transparent text-[#A6AEC8] hover:text-[#F4F5FF]'
            }`}
          >
            Journey Check-In
          </button>
          <button
            onClick={() => setActiveTab('contacts')}
            className={`flex-1 py-2 text-center rounded-t-lg transition-colors border-b-2 ${
              activeTab === 'contacts'
                ? 'border-[#8B7CFF] text-[#8B7CFF] bg-[#171D35]/50'
                : 'border-transparent text-[#A6AEC8] hover:text-[#F4F5FF]'
            }`}
          >
            Contacts ({contacts.length})
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {activeTab === 'safety' && (
            <>
              {/* 1. Emergency Siren */}
              <div className="bg-[#171D35]/60 border border-[#A6AEC8]/15 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-[#FF5C7A]" />
                    <span className="text-xs font-bold text-[#F4F5FF]">Deterrent Audio Siren</span>
                  </div>
                  {isSirenActive && (
                    <span className="text-[11px] font-mono font-bold text-[#FF5C7A] bg-[#FF5C7A]/20 px-2 py-0.5 rounded-full animate-pulse">
                      Auto-stop in {sirenCountdown}s
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-[#A6AEC8] leading-relaxed mb-3">
                  Plays a high-decibel modulating acoustic deterrent alarm through device speakers to attract public attention.
                </p>

                <div className="space-y-3">
                  <button
                    onClick={isSirenActive ? stopSiren : startSiren}
                    className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-all ${
                      isSirenActive
                        ? 'bg-[#FF5C7A] text-white animate-pulse'
                        : 'bg-[#1D2540] hover:bg-[#252E4E] text-[#F4F5FF] border border-[#8B7CFF]/40'
                    }`}
                  >
                    {isSirenActive ? (
                      <>
                        <VolumeX className="w-4 h-4" />
                        <span>SILENCE SIREN</span>
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-4 h-4 text-[#FF5C7A]" />
                        <span>ACTIVATE EMERGENCY SIREN</span>
                      </>
                    )}
                  </button>

                  <div className="flex items-center gap-3 text-xs text-[#A6AEC8]">
                    <span>Vol:</span>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={sirenVolume}
                      onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                      className="flex-1 accent-[#8B7CFF] h-1.5 bg-[#080B18] rounded-lg cursor-pointer"
                    />
                    <span className="font-mono text-[10px] w-8 text-right">
                      {Math.round(sirenVolume * 100)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* 2. Fake Call Simulator */}
              <div className="bg-[#171D35]/60 border border-[#A6AEC8]/15 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-[#52D6B2]" />
                    <span className="text-xs font-bold text-[#F4F5FF]">Discreet Call Simulator</span>
                  </div>
                  <span className="text-[10px] text-[#727D9C] font-mono">Local Only</span>
                </div>

                <p className="text-[11px] text-[#A6AEC8] leading-relaxed mb-3">
                  Simulates a realistic incoming phone call on this screen with ringtone to excuse yourself from unwanted situations.
                </p>

                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="text-[10px] text-[#A6AEC8] block mb-1">Caller Name</label>
                      <select
                        value={fakeCallerName}
                        onChange={(e) => setFakeCallerName(e.target.value)}
                        className="w-full bg-[#080B18] border border-[#A6AEC8]/20 rounded-lg p-1.5 text-xs text-[#F4F5FF]"
                      >
                        <option value="Mom">Mom</option>
                        <option value="Office / Manager">Office / Manager</option>
                        <option value="Taxi Driver">Taxi Driver</option>
                        <option value="Doctor's Clinic">Doctor&apos;s Clinic</option>
                        <option value="Police Station">Police Station</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] text-[#A6AEC8] block mb-1">Delay</label>
                      <select
                        value={fakeCallDelay}
                        onChange={(e) => setFakeCallDelay(parseInt(e.target.value, 10))}
                        className="w-full bg-[#080B18] border border-[#A6AEC8]/20 rounded-lg p-1.5 text-xs text-[#F4F5FF]"
                      >
                        <option value={0}>Immediately</option>
                        <option value={5}>In 5 seconds</option>
                        <option value={10}>In 10 seconds</option>
                        <option value={30}>In 30 seconds</option>
                      </select>
                    </div>
                  </div>

                  <button
                    onClick={handleTriggerFakeCall}
                    disabled={fakeCallScheduled}
                    className="w-full py-2 px-3 bg-[#52D6B2]/20 hover:bg-[#52D6B2]/30 border border-[#52D6B2]/40 text-[#52D6B2] rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors"
                  >
                    <PhoneCall className="w-3.5 h-3.5" />
                    <span>
                      {fakeCallScheduled ? `Call ringing in ${fakeCallDelay}s...` : 'Trigger Incoming Fake Call'}
                    </span>
                  </button>
                </div>
              </div>

              {/* 3. Emergency Helplines Direct Native Links */}
              <div className="bg-[#171D35]/60 border border-[#A6AEC8]/15 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <ShieldAlert className="w-4 h-4 text-[#8B7CFF]" />
                  <span className="text-xs font-bold text-[#F4F5FF]">Direct Emergency Helplines</span>
                </div>
                <p className="text-[10px] text-[#A6AEC8] leading-relaxed mb-3">
                  Tapping opens your device&apos;s native telephone dialer. SafeHER cannot place external cellular calls autonomously.
                </p>

                <div className="space-y-2">
                  <a
                    href="tel:112"
                    className="flex items-center justify-between p-2.5 rounded-xl bg-[#080B18] border border-[#A6AEC8]/20 hover:border-[#FF5C7A] transition-colors group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-[#FF5C7A]/20 flex items-center justify-center text-[#FF5C7A] font-bold text-xs">
                        112
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[#F4F5FF] group-hover:text-[#FF5C7A]">
                          National Emergency Number
                        </p>
                        <p className="text-[10px] text-[#A6AEC8]">All-in-one Police, Fire & Medical (India)</p>
                      </div>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-[#A6AEC8] group-hover:text-[#FF5C7A]" />
                  </a>

                  <a
                    href="tel:1091"
                    className="flex items-center justify-between p-2.5 rounded-xl bg-[#080B18] border border-[#A6AEC8]/20 hover:border-[#8B7CFF] transition-colors group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-[#8B7CFF]/20 flex items-center justify-center text-[#8B7CFF] font-bold text-xs">
                        1091
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[#F4F5FF] group-hover:text-[#8B7CFF]">
                          Women Helpline (Police)
                        </p>
                        <p className="text-[10px] text-[#A6AEC8]">24x7 Dedicated Women Safety Helpline</p>
                      </div>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-[#A6AEC8] group-hover:text-[#8B7CFF]" />
                  </a>

                  <a
                    href="tel:181"
                    className="flex items-center justify-between p-2.5 rounded-xl bg-[#080B18] border border-[#A6AEC8]/20 hover:border-[#52D6B2] transition-colors group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-[#52D6B2]/20 flex items-center justify-center text-[#52D6B2] font-bold text-xs">
                        181
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[#F4F5FF] group-hover:text-[#52D6B2]">
                          Women in Distress Helpline
                        </p>
                        <p className="text-[10px] text-[#A6AEC8]">NCW / Domestic Violence & Abuse Support</p>
                      </div>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-[#A6AEC8] group-hover:text-[#52D6B2]" />
                  </a>
                </div>
              </div>
            </>
          )}

          {activeTab === 'journey' && (
            <div className="space-y-4">
              {/* Browser background suspension warning */}
              <div className="p-3 bg-[#F0B96B]/10 border border-[#F0B96B]/30 rounded-xl flex items-start gap-2 text-xs text-[#F0B96B]">
                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed">
                  <strong>Browser Tab Policy:</strong> Mobile and desktop browsers throttle background tabs. Keep this tab active or pin it to ensure check-in timers remain accurate.
                </p>
              </div>

              {activeJourney && activeJourney.status === 'active' ? (
                /* Active Journey View */
                <div className="bg-[#171D35]/80 border border-[#8B7CFF]/40 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-[#8B7CFF]/20 text-[#8B7CFF] border border-[#8B7CFF]/40">
                      JOURNEY ACTIVE
                    </span>
                    <span className="text-xs text-[#A6AEC8] font-mono">
                      Started: {new Date(activeJourney.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-[#F4F5FF]">{activeJourney.destination_label}</h3>
                    <p className="text-xs text-[#A6AEC8] mt-0.5">
                      Target Duration: {activeJourney.duration_minutes} minutes
                    </p>
                  </div>

                  {/* Countdown Timer Display */}
                  <div className="bg-[#080B18] p-4 rounded-xl border border-[#A6AEC8]/15 text-center">
                    <div className="flex items-center justify-center gap-2 text-xs text-[#A6AEC8] mb-1 font-mono">
                      <Clock className="w-3.5 h-3.5 text-[#8B7CFF]" />
                      <span>TIME REMAINING TO CHECK IN</span>
                    </div>
                    <div className="text-3xl font-mono font-bold text-[#55D6E8]">
                      {journeyRemainingSeconds !== null ? formatSecs(journeyRemainingSeconds) : '--:--'}
                    </div>
                  </div>

                  <div className="space-y-2 pt-2">
                    <button
                      onClick={handleCompleteJourney}
                      disabled={journeyLoading}
                      className="w-full py-2.5 px-4 bg-[#52D6B2] hover:bg-[#3ec49e] text-[#080B18] font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>I HAVE ARRIVED SAFELY</span>
                    </button>

                    <button
                      onClick={handleCancelJourney}
                      disabled={journeyLoading}
                      className="w-full py-2 px-3 bg-[#1D2540] hover:bg-[#252E4E] text-[#A6AEC8] hover:text-[#F4F5FF] text-xs rounded-xl transition-colors"
                    >
                      Cancel Journey
                    </button>
                  </div>
                </div>
              ) : (
                /* New Journey Form */
                <form onSubmit={handleStartJourney} className="bg-[#171D35]/60 border border-[#A6AEC8]/15 rounded-2xl p-4 space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-[#F4F5FF] block mb-1">
                      Destination / Activity
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Walking home from Metro Station"
                      value={journeyDest}
                      onChange={(e) => setJourneyDest(e.target.value)}
                      required
                      className="w-full bg-[#080B18] border border-[#A6AEC8]/20 focus:border-[#8B7CFF] rounded-xl px-3 py-2 text-xs text-[#F4F5FF]"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-[#F4F5FF] block mb-1">
                      Expected Duration
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {[15, 30, 45, 60].map((dur) => (
                        <button
                          type="button"
                          key={dur}
                          onClick={() => setJourneyDuration(dur)}
                          className={`py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                            journeyDuration === dur
                              ? 'bg-[#8B7CFF] border-[#8B7CFF] text-[#080B18]'
                              : 'bg-[#080B18] border-[#A6AEC8]/20 text-[#A6AEC8] hover:text-[#F4F5FF]'
                          }`}
                        >
                          {dur}m
                        </button>
                      ))}
                    </div>
                  </div>

                  {contacts.length > 0 && (
                    <div>
                      <label className="text-xs font-semibold text-[#F4F5FF] block mb-1">
                        Link Trusted Contact (Optional)
                      </label>
                      <select
                        value={journeySelectedContact}
                        onChange={(e) => setJourneySelectedContact(e.target.value)}
                        className="w-full bg-[#080B18] border border-[#A6AEC8]/20 rounded-xl px-3 py-2 text-xs text-[#F4F5FF]"
                      >
                        <option value="">None (Personal timer only)</option>
                        {contacts.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} ({c.relationship})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={journeyLoading || !journeyDest.trim()}
                    className="w-full mt-2 py-2.5 px-4 bg-[#8B7CFF] hover:bg-[#7867fa] disabled:opacity-50 text-[#080B18] font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95"
                  >
                    <Clock className="w-4 h-4" />
                    <span>START JOURNEY CHECK-IN</span>
                  </button>
                </form>
              )}
            </div>
          )}

          {activeTab === 'contacts' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#F4F5FF]">Trusted Contacts</span>
                <button
                  onClick={() => setShowAddContact(!showAddContact)}
                  className="px-2.5 py-1 bg-[#8B7CFF]/20 hover:bg-[#8B7CFF]/30 border border-[#8B7CFF]/40 text-[#8B7CFF] rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>{showAddContact ? 'Cancel' : 'Add Contact'}</span>
                </button>
              </div>

              {showAddContact && (
                <form onSubmit={handleAddContact} className="bg-[#171D35]/80 border border-[#8B7CFF]/30 rounded-2xl p-3.5 space-y-2.5 animate-in fade-in">
                  <div>
                    <label className="text-[10px] text-[#A6AEC8] block mb-1">Full Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Sister, Friend"
                      value={newContactName}
                      onChange={(e) => setNewContactName(e.target.value)}
                      required
                      className="w-full bg-[#080B18] border border-[#A6AEC8]/20 rounded-lg px-2.5 py-1.5 text-xs text-[#F4F5FF]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-[#A6AEC8] block mb-1">Phone Number</label>
                    <input
                      type="tel"
                      placeholder="+91 98765 43210"
                      value={newContactPhone}
                      onChange={(e) => setNewContactPhone(e.target.value)}
                      required
                      className="w-full bg-[#080B18] border border-[#A6AEC8]/20 rounded-lg px-2.5 py-1.5 text-xs text-[#F4F5FF]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-[#A6AEC8] block mb-1">Relationship</label>
                    <select
                      value={newContactRel}
                      onChange={(e) => setNewContactRel(e.target.value)}
                      className="w-full bg-[#080B18] border border-[#A6AEC8]/20 rounded-lg px-2.5 py-1.5 text-xs text-[#F4F5FF]"
                    >
                      <option value="parent">Parent</option>
                      <option value="sibling">Sibling</option>
                      <option value="friend">Friend</option>
                      <option value="partner">Partner</option>
                      <option value="lawyer">Legal Counsel</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <button
                    type="submit"
                    className="w-full py-1.5 bg-[#8B7CFF] text-[#080B18] font-bold rounded-lg text-xs"
                  >
                    Save Contact
                  </button>
                </form>
              )}

              {contacts.length === 0 ? (
                <div className="p-6 text-center bg-[#171D35]/40 rounded-2xl border border-[#A6AEC8]/10">
                  <p className="text-xs text-[#A6AEC8]">No trusted contacts saved yet.</p>
                  <p className="text-[10px] text-[#727D9C] mt-1">
                    Add family members or trusted advocates for rapid one-touch dialing.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {contacts.map((c) => (
                    <div
                      key={c.id}
                      className="p-3 bg-[#171D35]/60 border border-[#A6AEC8]/15 rounded-xl flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-[#F4F5FF] truncate">{c.name}</p>
                        <p className="text-[10px] text-[#A6AEC8] font-mono">{c.phone_number}</p>
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#8B7CFF]/15 text-[#8B7CFF] capitalize">
                          {c.relationship}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <a
                          href={`tel:${c.phone_number}`}
                          title="Call Contact"
                          className="p-1.5 rounded-lg bg-[#52D6B2]/20 text-[#52D6B2] hover:bg-[#52D6B2]/30 transition-colors"
                        >
                          <Phone className="w-3.5 h-3.5" />
                        </a>
                        <button
                          onClick={() => handleDeleteContact(c.id)}
                          title="Remove Contact"
                          className="p-1.5 rounded-lg bg-[#FF5C7A]/20 text-[#FF5C7A] hover:bg-[#FF5C7A]/30 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* Fake Call Modal Screen */}
      <FakeCallModal
        isOpen={isFakeCallOpen}
        callerName={fakeCallerName}
        onClose={() => setIsFakeCallOpen(false)}
      />
    </>
  )
}
