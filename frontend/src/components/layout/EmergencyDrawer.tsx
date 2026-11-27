import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  X,
  Volume2,
  VolumeX,
  Phone,
  PhoneCall,
  Clock,
  CheckCircle2,
  UserPlus,
  Trash2,
  ShieldAlert,
  Radio,
  ExternalLink,
  Info,
  LogOut,
} from 'lucide-react'
import { apiClient } from '../../services/api/client'
import type { TrustedContact, JourneyCheckin, UserSafetySettings, SmsHealthStatus, SmsNotification } from '../../types'
import { FakeCallModal } from '../common/FakeCallModal'
import { performQuickExit } from './QuickExitButton'
import { SafeHERDrawer } from '../ui/SafeHERPrimitives'

interface EmergencyDrawerProps {
  isOpen: boolean
  onClose: () => void
}

export const EmergencyDrawer: React.FC<EmergencyDrawerProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'safety' | 'journey' | 'contacts'>('safety')

  const [isSirenActive, setIsSirenActive] = useState(false)
  const [sirenVolume, setSirenVolume] = useState(0.8)
  const [sirenCountdown, setSirenCountdown] = useState(30)
  const sirenAudioCtxRef = useRef<AudioContext | null>(null)
  const sirenOscRef = useRef<OscillatorNode | null>(null)
  const sirenGainRef = useRef<GainNode | null>(null)
  const sirenIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const [isFakeCallOpen, setIsFakeCallOpen] = useState(false)
  const [fakeCallerName, setFakeCallerName] = useState('Mom')
  const [fakeCallDelay, setFakeCallDelay] = useState(0)
  const [fakeCallScheduled, setFakeCallScheduled] = useState(false)

  const [activeJourney, setActiveJourney] = useState<JourneyCheckin | null>(null)
  const [journeyDest, setJourneyDest] = useState('')
  const [journeyDuration, setJourneyDuration] = useState(15)
  const [journeySelectedContact, setJourneySelectedContact] = useState('')
  const [journeyRemainingSeconds, setJourneyRemainingSeconds] = useState<number | null>(null)
  const [journeyLoading, setJourneyLoading] = useState(false)

  const [contacts, setContacts] = useState<TrustedContact[]>([])
  const [newContactName, setNewContactName] = useState('')
  const [newContactPhone, setNewContactPhone] = useState('')
  const [newContactRel, setNewContactRel] = useState('friend')
  const [showAddContact, setShowAddContact] = useState(false)

  const [safetySettings, setSafetySettings] = useState<UserSafetySettings | null>(null)
  const [smsHealth, setSmsHealth] = useState<SmsHealthStatus | null>(null)
  const [notifications, setNotifications] = useState<SmsNotification[]>([])
  const [verifyingContactId, setVerifyingContactId] = useState<string | null>(null)
  const [otpInput, setOtpInput] = useState('')
  const [smsStatusMsg, setSmsStatusMsg] = useState<string | null>(null)

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

  const loadInitialData = async () => {
    try {
      const [sett, cts, jrn, smsH, notifs] = await Promise.all([
        apiClient.getSafetySettings().catch(() => null),
        apiClient.listTrustedContacts().catch(() => []),
        apiClient.getActiveJourneyCheckin().catch(() => null),
        apiClient.getSmsHealth().catch(() => null),
        apiClient.listSafetyNotifications().catch(() => []),
      ])
      if (sett) {
        setSafetySettings(sett)
        setSirenVolume(sett.siren_volume ?? 0.8)
        setFakeCallerName(sett.fake_call_caller_name || 'Mom')
      }
      setContacts(cts || [])
      setActiveJourney(jrn)
      setSmsHealth(smsH)
      setNotifications(notifs || [])
    } catch {
      // Ignore initial load error
    }
  }

  const handleRequestVerification = async (contactId: string) => {
    setSmsStatusMsg(null)
    try {
      const res = await apiClient.requestContactVerification(contactId)
      setVerifyingContactId(contactId)
      setSmsStatusMsg(res.message || `Verification code queued (${res.status}) for ${res.recipient_masked}`)
      loadInitialData()
    } catch (e: unknown) {
      setSmsStatusMsg(e instanceof Error ? e.message : 'Failed to request verification.')
    }
  }

  const handleConfirmVerification = async (contactId: string) => {
    setSmsStatusMsg(null)
    try {
      await apiClient.verifyContactCode(contactId, otpInput)
      setVerifyingContactId(null)
      setOtpInput('')
      setSmsStatusMsg('Trusted contact verified for emergency SMS alerts.')
      loadInitialData()
    } catch (e: unknown) {
      setSmsStatusMsg(e instanceof Error ? e.message : 'Invalid or expired code.')
    }
  }

  useEffect(() => {
    if (isOpen) {
      loadInitialData()
    } else {
      stopSiren()
    }
  }, [isOpen, stopSiren])

  const startSiren = () => {
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      const ctx = new AudioCtx()
      sirenAudioCtxRef.current = ctx

      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      sirenOscRef.current = osc
      sirenGainRef.current = gain

      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(700, ctx.currentTime)

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

  const handleVolumeChange = (vol: number) => {
    setSirenVolume(vol)
    if (sirenGainRef.current && sirenAudioCtxRef.current) {
      sirenGainRef.current.gain.setValueAtTime(vol, sirenAudioCtxRef.current.currentTime)
    }
  }

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

  const formatSecs = (sec: number) => {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${m}:${s < 10 ? '0' : ''}${s}`
  }

  return (
    <>
      <SafeHERDrawer
        isOpen={isOpen}
        onClose={onClose}
        ariaLabel="Survivor Emergency Safety Drawer"
      >
        {/* Header */}
        <div className="p-4 border-b border-[rgba(225,239,221,0.15)] bg-[#111716] flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-left">
            <div className="p-1.5 rounded-[3px] bg-[#ff927e]/15 border border-[#ff927e]/40 text-[#ff927e]">
              <Radio className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <h2 className="font-display font-bold uppercase tracking-wide text-base text-[#f0f2eb]">
                Survivor Emergency Hub
              </h2>
              <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#929b93]">
                Rapid safety actions &amp; discreet tools
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close Emergency Hub"
            className="p-1.5 text-[#929b93] hover:text-[#d5ff54] rounded-[3px] hover:bg-[#0d1110] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Exit Sticky Banner */}
        <div className="p-3.5 bg-[#ff927e]/10 border-b border-[#ff927e]/35 text-left">
          <button
            onClick={() => performQuickExit()}
            className="w-full py-2.5 px-3 bg-[#ff927e] hover:bg-[#ffa898] text-[#170907] rounded-[3px] font-mono uppercase tracking-[0.12em] text-xs font-bold flex items-center justify-center gap-2 transition-transform active:scale-95"
          >
            <LogOut className="w-4 h-4" />
            <span>QUICK EXIT (Alt + Q)</span>
          </button>
          <p className="mt-2 text-[10px] text-[#929b93] leading-snug font-sans">
            Leaves SafeHER immediately for a neutral weather website. Note: Browser history and ISP logs are not deleted. Use Private / Incognito mode when possible.
          </p>
        </div>

        {/* Nav Tabs */}
        <div className="flex border-b border-[rgba(225,239,221,0.15)] bg-[#070908] px-2 pt-2 gap-1 font-mono text-[10px] uppercase tracking-[0.1em]">
          <button
            onClick={() => setActiveTab('safety')}
            className={`flex-1 py-2 text-center rounded-t-[3px] transition-colors border-b-2 ${
              activeTab === 'safety'
                ? 'border-[#d5ff54] text-[#d5ff54] bg-[#0d1110]'
                : 'border-transparent text-[#929b93] hover:text-[#f0f2eb]'
            }`}
          >
            Safety Tools
          </button>
          <button
            onClick={() => setActiveTab('journey')}
            className={`flex-1 py-2 text-center rounded-t-[3px] transition-colors border-b-2 ${
              activeTab === 'journey'
                ? 'border-[#d5ff54] text-[#d5ff54] bg-[#0d1110]'
                : 'border-transparent text-[#929b93] hover:text-[#f0f2eb]'
            }`}
          >
            Journey Check-In
          </button>
          <button
            onClick={() => setActiveTab('contacts')}
            className={`flex-1 py-2 text-center rounded-t-[3px] transition-colors border-b-2 ${
              activeTab === 'contacts'
                ? 'border-[#d5ff54] text-[#d5ff54] bg-[#0d1110]'
                : 'border-transparent text-[#929b93] hover:text-[#f0f2eb]'
            }`}
          >
            Contacts ({contacts.length})
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-left">
          {activeTab === 'safety' && (
            <>
              {/* 1. Emergency Siren */}
              <div className="bg-[#111716] border border-[rgba(225,239,221,0.15)] rounded-[4px] p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-[#ff927e]" />
                    <span className="text-xs font-bold text-[#f0f2eb] font-sans">
                      Deterrent Audio Siren
                    </span>
                  </div>
                  {isSirenActive && (
                    <span className="text-[10px] font-mono font-bold text-[#ff927e] bg-[#ff927e]/15 px-2 py-0.5 rounded-full animate-pulse">
                      Auto-stop in {sirenCountdown}s
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-[#929b93] leading-relaxed font-sans">
                  Plays a high-decibel modulating acoustic deterrent alarm through device speakers to attract public attention.
                </p>

                <button
                  onClick={isSirenActive ? stopSiren : startSiren}
                  className={`w-full py-2.5 px-4 rounded-[3px] font-mono uppercase tracking-[0.11em] text-[11px] font-bold flex items-center justify-center gap-2 transition-all ${
                    isSirenActive
                      ? 'bg-[#ff927e] text-[#170907] animate-pulse'
                      : 'bg-[#070908] hover:bg-[#0d1110] text-[#f0f2eb] border border-[rgba(213,255,84,0.4)] hover:border-[#d5ff54]'
                  }`}
                >
                  {isSirenActive ? (
                    <>
                      <VolumeX className="w-4 h-4" />
                      <span>SILENCE SIREN</span>
                    </>
                  ) : (
                    <>
                      <Volume2 className="w-4 h-4 text-[#ff927e]" />
                      <span>ACTIVATE EMERGENCY SIREN</span>
                    </>
                  )}
                </button>

                <div className="flex items-center gap-3 text-xs text-[#929b93] font-mono">
                  <span>Vol:</span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={sirenVolume}
                    onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                    className="flex-1 accent-[#d5ff54] h-1.5 bg-[#070908] rounded-lg cursor-pointer"
                  />
                  <span className="text-[10px] w-8 text-right">
                    {Math.round(sirenVolume * 100)}%
                  </span>
                </div>
              </div>

              {/* 2. Fake Call Simulator */}
              <div className="bg-[#111716] border border-[rgba(225,239,221,0.15)] rounded-[4px] p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-[#d5ff54]" />
                    <span className="text-xs font-bold text-[#f0f2eb] font-sans">
                      Discreet Call Simulator
                    </span>
                  </div>
                  <span className="text-[9px] text-[#929b93] font-mono uppercase">Local Only</span>
                </div>

                <p className="text-[11px] text-[#929b93] leading-relaxed font-sans">
                  Simulates a realistic incoming phone call on this screen with ringtone to excuse yourself from unwanted situations.
                </p>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="text-[9px] font-mono uppercase text-[#929b93] block mb-1">
                      Caller Name
                    </label>
                    <select
                      value={fakeCallerName}
                      onChange={(e) => setFakeCallerName(e.target.value)}
                      className="w-full bg-[#070908] border border-[rgba(225,239,221,0.18)] rounded-[3px] p-1.5 text-xs text-[#f0f2eb]"
                    >
                      <option value="Mom">Mom</option>
                      <option value="Office / Manager">Office / Manager</option>
                      <option value="Taxi Driver">Taxi Driver</option>
                      <option value="Doctor's Clinic">Doctor&apos;s Clinic</option>
                      <option value="Police Station">Police Station</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[9px] font-mono uppercase text-[#929b93] block mb-1">
                      Delay
                    </label>
                    <select
                      value={fakeCallDelay}
                      onChange={(e) => setFakeCallDelay(parseInt(e.target.value, 10))}
                      className="w-full bg-[#070908] border border-[rgba(225,239,221,0.18)] rounded-[3px] p-1.5 text-xs text-[#f0f2eb]"
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
                  className="w-full py-2.5 px-3 bg-[#d5ff54]/12 hover:bg-[#d5ff54] border border-[#d5ff54]/45 text-[#d5ff54] hover:text-[#080a08] rounded-[3px] font-mono uppercase tracking-[0.1em] text-[10px] font-semibold flex items-center justify-center gap-2 transition-colors"
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                  <span>
                    {fakeCallScheduled
                      ? `Call ringing in ${fakeCallDelay}s...`
                      : 'Trigger Incoming Fake Call'}
                  </span>
                </button>
              </div>

              {/* 3. Direct Emergency Helplines */}
              <div className="bg-[#111716] border border-[rgba(225,239,221,0.15)] rounded-[4px] p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-[#ff927e]" />
                  <span className="text-xs font-bold text-[#f0f2eb] font-sans">
                    Direct Emergency Helplines
                  </span>
                </div>
                <p className="text-[10px] text-[#929b93] leading-relaxed font-sans">
                  Tapping opens your device&apos;s native telephone dialer. SafeHER cannot place external cellular calls autonomously.
                </p>

                <div className="space-y-2">
                  {[
                    {
                      num: '112',
                      title: 'National Emergency Number',
                      desc: 'All-in-one Police, Fire & Medical (India)',
                      accent: 'coral',
                    },
                    {
                      num: '1091',
                      title: 'Women Helpline (Police)',
                      desc: '24x7 Dedicated Women Safety Helpline',
                      accent: 'lime',
                    },
                    {
                      num: '181',
                      title: 'Women in Distress Helpline',
                      desc: 'NCW / Domestic Violence & Abuse Support',
                      accent: 'secondary',
                    },
                  ].map((item) => (
                    <a
                      key={item.num}
                      href={`tel:${item.num}`}
                      className="flex items-center justify-between p-2.5 rounded-[3px] bg-[#070908] border border-[rgba(225,239,221,0.15)] hover:border-[#d5ff54] transition-colors group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-8 h-7 rounded-[3px] flex items-center justify-center font-mono font-bold text-xs ${
                            item.accent === 'coral'
                              ? 'bg-[#ff927e]/15 text-[#ff927e]'
                              : 'bg-[#d5ff54]/12 text-[#d5ff54]'
                          }`}
                        >
                          {item.num}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-[#f0f2eb] group-hover:text-[#d5ff54]">
                            {item.title}
                          </p>
                          <p className="text-[10px] text-[#929b93]">{item.desc}</p>
                        </div>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 text-[#929b93] group-hover:text-[#d5ff54]" />
                    </a>
                  ))}
                </div>
              </div>
            </>
          )}

          {activeTab === 'journey' && (
            <div className="space-y-4">
              <div className="p-3 bg-[#ff927e]/10 border border-[#ff927e]/35 rounded-[4px] flex items-start gap-2 text-xs text-[#ff927e]">
                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed font-sans">
                  <strong>Browser Tab Policy:</strong> Mobile and desktop browsers throttle background tabs. Keep this tab active or pin it to ensure check-in timers remain accurate.
                </p>
              </div>

              {activeJourney && activeJourney.status === 'active' ? (
                <div className="bg-[#111716] border border-[#d5ff54]/45 rounded-[4px] p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-[#d5ff54]/12 text-[#d5ff54] border border-[#d5ff54]/35">
                      JOURNEY ACTIVE
                    </span>
                    <span className="text-xs text-[#929b93] font-mono">
                      Started:{' '}
                      {new Date(activeJourney.started_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-[#f0f2eb]">
                      {activeJourney.destination_label}
                    </h3>
                    <p className="text-xs text-[#929b93] mt-0.5 font-mono">
                      Target Duration: {activeJourney.duration_minutes} minutes
                    </p>
                  </div>

                  <div className="bg-[#070908] p-4 rounded-[3px] border border-[rgba(225,239,221,0.15)] text-center">
                    <div className="flex items-center justify-center gap-2 text-[10px] text-[#929b93] mb-1 font-mono uppercase">
                      <Clock className="w-3.5 h-3.5 text-[#d5ff54]" />
                      <span>TIME REMAINING TO CHECK IN</span>
                    </div>
                    <div className="text-3xl font-mono font-bold text-[#d5ff54]">
                      {journeyRemainingSeconds !== null
                        ? formatSecs(journeyRemainingSeconds)
                        : '--:--'}
                    </div>
                  </div>

                  <div className="space-y-2 pt-2">
                    <button
                      onClick={handleCompleteJourney}
                      disabled={journeyLoading}
                      className="w-full py-2.5 px-4 bg-[#d5ff54] hover:bg-[#e2ff84] text-[#080a08] font-mono font-bold uppercase tracking-[0.1em] rounded-[3px] text-[11px] flex items-center justify-center gap-2 transition-transform active:scale-95"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>I HAVE ARRIVED SAFELY</span>
                    </button>

                    <button
                      onClick={handleCancelJourney}
                      disabled={journeyLoading}
                      className="w-full py-2 px-3 bg-[#070908] border border-[rgba(225,239,221,0.18)] text-[#929b93] hover:text-[#f0f2eb] font-mono uppercase text-[10px] rounded-[3px] transition-colors"
                    >
                      Cancel Journey
                    </button>
                  </div>
                </div>
              ) : (
                <form
                  onSubmit={handleStartJourney}
                  className="bg-[#111716] border border-[rgba(225,239,221,0.15)] rounded-[4px] p-4 space-y-3"
                >
                  <div>
                    <label className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#f0f2eb] block mb-1">
                      Destination / Activity
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Walking home from Metro Station"
                      value={journeyDest}
                      onChange={(e) => setJourneyDest(e.target.value)}
                      required
                      className="w-full bg-[#070908] border border-[rgba(225,239,221,0.18)] focus:border-[#d5ff54] rounded-[3px] px-3 py-2 text-xs text-[#f0f2eb]"
                    />
                  </div>

                  <div>
                    <label className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#f0f2eb] block mb-1">
                      Expected Duration
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {[15, 30, 45, 60].map((dur) => (
                        <button
                          type="button"
                          key={dur}
                          onClick={() => setJourneyDuration(dur)}
                          className={`py-1.5 font-mono text-xs font-semibold rounded-[3px] border transition-colors ${
                            journeyDuration === dur
                              ? 'bg-[#d5ff54] border-[#d5ff54] text-[#080a08]'
                              : 'bg-[#070908] border-[rgba(225,239,221,0.18)] text-[#929b93] hover:text-[#f0f2eb]'
                          }`}
                        >
                          {dur}m
                        </button>
                      ))}
                    </div>
                  </div>

                  {contacts.length > 0 && (
                    <div>
                      <label className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#f0f2eb] block mb-1">
                        Link Trusted Contact (Optional)
                      </label>
                      <select
                        value={journeySelectedContact}
                        onChange={(e) => setJourneySelectedContact(e.target.value)}
                        className="w-full bg-[#070908] border border-[rgba(225,239,221,0.18)] rounded-[3px] px-3 py-2 text-xs text-[#f0f2eb]"
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
                    className="w-full mt-2 py-2.5 px-4 bg-[#d5ff54] hover:bg-[#e2ff84] disabled:opacity-45 text-[#080a08] font-mono uppercase tracking-[0.1em] font-bold rounded-[3px] text-[11px] flex items-center justify-center gap-2 transition-transform active:scale-95"
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
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] font-bold text-[#f0f2eb]">
                  Trusted Contacts
                </span>
                <button
                  onClick={() => setShowAddContact(!showAddContact)}
                  className="px-2.5 py-1 bg-[#d5ff54]/12 hover:bg-[#d5ff54]/20 border border-[#d5ff54]/40 text-[#d5ff54] rounded-[3px] font-mono uppercase text-[10px] font-semibold flex items-center gap-1 transition-colors"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>{showAddContact ? 'Cancel' : 'Add Contact'}</span>
                </button>
              </div>

              {showAddContact && (
                <form
                  onSubmit={handleAddContact}
                  className="bg-[#111716] border border-[#d5ff54]/30 rounded-[4px] p-3.5 space-y-2.5"
                >
                  <div>
                    <label className="text-[10px] font-mono uppercase text-[#929b93] block mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Sister, Friend"
                      value={newContactName}
                      onChange={(e) => setNewContactName(e.target.value)}
                      required
                      className="w-full bg-[#070908] border border-[rgba(225,239,221,0.18)] rounded-[3px] px-2.5 py-1.5 text-xs text-[#f0f2eb]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono uppercase text-[#929b93] block mb-1">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      placeholder="+91 98765 43210"
                      value={newContactPhone}
                      onChange={(e) => setNewContactPhone(e.target.value)}
                      required
                      className="w-full bg-[#070908] border border-[rgba(225,239,221,0.18)] rounded-[3px] px-2.5 py-1.5 text-xs text-[#f0f2eb]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono uppercase text-[#929b93] block mb-1">
                      Relationship
                    </label>
                    <select
                      value={newContactRel}
                      onChange={(e) => setNewContactRel(e.target.value)}
                      className="w-full bg-[#070908] border border-[rgba(225,239,221,0.18)] rounded-[3px] px-2.5 py-1.5 text-xs text-[#f0f2eb]"
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
                    className="w-full py-2 bg-[#d5ff54] text-[#080a08] font-mono uppercase tracking-[0.1em] font-bold rounded-[3px] text-[10px]"
                  >
                    Save Contact
                  </button>
                </form>
              )}

              {contacts.length === 0 ? (
                <div className="p-6 text-center bg-[#111716] rounded-[4px] border border-[rgba(225,239,221,0.15)]">
                  <p className="text-xs text-[#f0f2eb]">No trusted contacts saved yet.</p>
                  <p className="text-[10px] text-[#929b93] mt-1 font-sans">
                    Add family members or trusted advocates for rapid one-touch dialing.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {contacts.map((c) => (
                    <div
                      key={c.id}
                      className="p-3 bg-[#111716] border border-[rgba(225,239,221,0.15)] rounded-[4px] flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-[#f0f2eb] truncate">{c.name}</p>
                        <p className="text-[10px] text-[#929b93] font-mono">{c.phone_number}</p>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                          <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded-[3px] bg-[#d5ff54]/12 text-[#d5ff54]">
                            {c.relationship}
                          </span>
                          <span className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded-[3px] ${
                            c.is_verified ? 'bg-[rgba(168,219,53,0.14)] text-[#a8db35]' : 'bg-[rgba(255,146,126,0.12)] text-[#ff927e]'
                          }`}>
                            {c.is_verified ? 'Verified' : 'Unverified'}
                          </span>
                          {!c.is_verified && (
                            <button
                              type="button"
                              onClick={() => handleRequestVerification(c.id)}
                              className="text-[9px] font-mono uppercase underline text-[#d5ff54]"
                            >
                              Verify SMS
                            </button>
                          )}
                        </div>
                        {verifyingContactId === c.id && (
                          <div className="flex items-center gap-1.5 mt-2">
                            <input
                              type="text"
                              aria-label="Trusted contact verification OTP"
                              value={otpInput}
                              onChange={(e) => setOtpInput(e.target.value)}
                              placeholder="6-digit OTP"
                              className="w-24 bg-[#070908] border border-[rgba(225,239,221,0.2)] rounded-[3px] px-2 py-1 text-[10px] text-[#f0f2eb]"
                            />
                            <button
                              type="button"
                              onClick={() => handleConfirmVerification(c.id)}
                              className="px-2 py-1 bg-[#d5ff54] text-[#080a08] rounded-[3px] text-[9px] font-mono font-bold uppercase"
                            >
                              Confirm
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <a
                          href={`tel:${c.phone_number}`}
                          title="Call Contact"
                          className="p-1.5 rounded-[3px] bg-[#d5ff54]/15 text-[#d5ff54] hover:bg-[#d5ff54] hover:text-[#080a08] transition-colors"
                        >
                          <Phone className="w-3.5 h-3.5" />
                        </a>
                        <button
                          onClick={() => handleDeleteContact(c.id)}
                          title="Remove Contact"
                          className="p-1.5 rounded-[3px] bg-[#ff927e]/15 text-[#ff927e] hover:bg-[#ff927e] hover:text-[#170907] transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* External SMS Provider & Delivery Status */}
              <div className="p-3 bg-[#111716] border border-[rgba(225,239,221,0.15)] rounded-[4px] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] uppercase tracking-[0.12em] font-bold text-[#f0f2eb]">
                    External SMS Gateway
                  </span>
                  <span className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded-[3px] ${
                    smsHealth?.provider?.configured ? 'bg-[rgba(168,219,53,0.14)] text-[#a8db35]' : 'bg-[rgba(255,146,126,0.12)] text-[#ff927e]'
                  }`}>
                    {smsHealth?.provider?.configured ? `${smsHealth.provider.provider} Ready` : 'Unconfigured'}
                  </span>
                </div>
                {!smsHealth?.provider?.configured && (
                  <p className="text-[10px] text-[#929b93] font-sans">
                    External SMS delivery is not configured on this server. Trusted contacts can still be called directly.
                  </p>
                )}
                {smsStatusMsg && (
                  <p role="status" aria-live="polite" className="text-[10px] text-[#d5ff54] font-mono">{smsStatusMsg}</p>
                )}
                {notifications.length > 0 && (
                  <div className="space-y-1 pt-1 border-t border-[rgba(225,239,221,0.1)]">
                    <div className="text-[9px] font-mono uppercase text-[#929b93]">Recent Alerts</div>
                    {notifications.slice(0, 4).map((n) => (
                      <div key={n.id} className="flex items-center justify-between text-[10px] font-mono">
                        <span className="text-[#f0f2eb]">{n.recipient_masked} ({n.reference_code})</span>
                        <span className="uppercase text-[#d5ff54]">{n.status}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </SafeHERDrawer>

      <FakeCallModal
        isOpen={isFakeCallOpen}
        callerName={fakeCallerName}
        onClose={() => setIsFakeCallOpen(false)}
      />
    </>
  )
}
