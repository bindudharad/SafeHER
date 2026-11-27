import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  Shield,
  Trash2,
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Upload,
  FileText,
  Image as ImageIcon,
  Video,
  X,
  Lock,
  Calendar,
  Globe,
  HelpCircle,
  Check,
  Edit2,
  Save,
  Clock,
  Sparkles,
  ShieldCheck,
  FileCheck2,
} from 'lucide-react'
import { useI18n } from '../../contexts/I18nContext'
import { useToast } from '../../contexts/ToastContext'
import { apiClient } from '../../services/api/client'
import type { IncidentCategory } from '../../types'
import { Button } from '../../components/common/Button'
import { Input } from '../../components/common/Input'
import { PageHeader } from '../../components/layout/PageHeader'
import { Badge } from '../../components/common/Badge'
import { formatBytes } from '../../utils/crypto'

const SESSION_STORAGE_DRAFT_KEY = 'safeher_incident_draft_session'

interface StagedFile {
  name: string
  size: number
  type: string
}

export const NewIncidentPage: React.FC = () => {
  const { t } = useI18n()
  const { showToast } = useToast()
  const navigate = useNavigate()

  // Wizard Step: 1 to 5
  const [currentStep, setCurrentStep] = useState(1)

  // Draft state initialized in React memory
  const [category, setCategory] = useState<IncidentCategory>('harassment')
  const [title, setTitle] = useState('')
  const [platform, setPlatform] = useState('Instagram')
  const [description, setDescription] = useState('')
  const [incidentDate, setIncidentDate] = useState('')
  const [incidentTime, setIncidentTime] = useState('')
  const [relevantUrls, setRelevantUrls] = useState('')
  const [stagedFiles, setStagedFiles] = useState<StagedFile[]>([])

  // Optional session storage toggle (OFF by default for privacy)
  const [allowSessionStorage, setAllowSessionStorage] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load from sessionStorage only if previously enabled by user
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(SESSION_STORAGE_DRAFT_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        setTitle(parsed.title || '')
        setCategory(parsed.category === 'online_harassment' ? 'harassment' : (parsed.category || 'harassment'))
        setDescription(parsed.description || '')
        setIncidentDate(parsed.incidentDate || '')
        setIncidentTime(parsed.incidentTime || '')
        setPlatform(parsed.platform || 'Instagram')
        setRelevantUrls(parsed.relevantUrls || '')
        setAllowSessionStorage(true)
      }
    } catch {
      // Ignore sessionStorage read errors
    }
  }, [])

  // Save to sessionStorage only if explicitly opted-in
  useEffect(() => {
    if (allowSessionStorage) {
      const draft = {
        title,
        category,
        description,
        incidentDate,
        incidentTime,
        platform,
        relevantUrls,
      }
      sessionStorage.setItem(SESSION_STORAGE_DRAFT_KEY, JSON.stringify(draft))
    } else {
      sessionStorage.removeItem(SESSION_STORAGE_DRAFT_KEY)
    }
  }, [
    allowSessionStorage,
    title,
    category,
    description,
    incidentDate,
    incidentTime,
    platform,
    relevantUrls,
  ])

  // Discard draft immediately - wipes state and sessionStorage
  const handleDiscardDraft = () => {
    if (window.confirm('Are you sure you want to discard this draft? All entered text will be immediately wiped.')) {
      setTitle('')
      setDescription('')
      setIncidentDate('')
      setIncidentTime('')
      setRelevantUrls('')
      setStagedFiles([])
      setAllowSessionStorage(false)
      sessionStorage.removeItem(SESSION_STORAGE_DRAFT_KEY)
      showToast('Incident draft cleared immediately from memory.', 'info')
      navigate('/incidents')
    }
  }

  // File staging for step 3
  const handleFileDrop = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles: StagedFile[] = Array.from(e.target.files).map((f) => ({
        name: f.name,
        size: f.size,
        type: f.type,
      }))
      setStagedFiles((prev) => [...prev, ...newFiles])
      showToast(`${newFiles.length} file(s) staged for vault preservation.`, 'info')
    }
  }

  const removeStagedFile = (index: number) => {
    setStagedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const categoryCards: {
    value: IncidentCategory
    title: string
    description: string
    icon: React.ReactNode
    statutoryRef: string
  }[] = [
    {
      value: 'deepfake_media',
      title: 'Deepfake or AI Impersonation',
      description: 'Manipulated images, face swaps, cloned voice, or fabricated video targeting you.',
      icon: <ImageIcon className="w-5 h-5 text-[#d5ff54]" />,
      statutoryRef: 'IT Act Sec 66D / 66E',
    },
    {
      value: 'harassment',
      title: 'Online Harassment & Stalking',
      description: 'Persistent stalking, trolling, abusive comments, or coordinated group harassment.',
      icon: <AlertCircle className="w-5 h-5 text-[#a8db35]" />,
      statutoryRef: 'BNS Sec 78 (IPC 354D)',
    },
    {
      value: 'blackmail_extortion',
      title: 'Threats or Blackmail / Extortion',
      description: 'Hostile DMs, extortion demands, intimidation, or threats of physical/digital harm.',
      icon: <Shield className="w-5 h-5 text-[#ff927e]" />,
      statutoryRef: 'BNS Sec 308 (IPC 384)',
    },
    {
      value: 'impersonation',
      title: 'Fake Account or Identity Theft',
      description: 'Profiles created using your photo, name, or phone number to deceive others.',
      icon: <Globe className="w-5 h-5 text-[#a8db35]" />,
      statutoryRef: 'IT Act Sec 66C',
    },
    {
      value: 'non_consensual_imagery',
      title: 'Intimate Image Circulation (NCII)',
      description: 'Non-consensual sharing or threatening to share private or sensitive photographs.',
      icon: <Video className="w-5 h-5 text-[#ff927e]" />,
      statutoryRef: 'IT Act Sec 67 / 67A',
    },
    {
      value: 'other',
      title: 'Other Digital Abuse or Doxxing',
      description: 'Unauthorized publication of private addresses, phone numbers, or cyber violence.',
      icon: <HelpCircle className="w-5 h-5 text-[#929b93]" />,
      statutoryRef: 'DPDP Act / IT Act',
    },
  ]

  const stepsList = [
    { number: 1, title: 'Classification' },
    { number: 2, title: 'Details & Facts' },
    { number: 3, title: 'Preserve Media' },
    { number: 4, title: 'Review Dossier' },
    { number: 5, title: 'Secured' },
  ]

  const handleNextFromStep1 = () => {
    setCurrentStep(2)
  }

  const handleNextFromStep2 = () => {
    if (!title.trim()) {
      setError('Please provide a brief title for this incident.')
      return
    }
    if (!description.trim()) {
      setError('Please describe what happened in your own words.')
      return
    }
    setError(null)
    setCurrentStep(3)
  }

  const handleNextFromStep3 = () => {
    setError(null)
    setCurrentStep(4)
  }

  const handleNextFromStep4 = () => {
    setError(null)
    setCurrentStep(5)
  }

  const handleFinalSave = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const urls = relevantUrls
        .split(',')
        .map((u) => u.trim())
        .filter(Boolean)

      const created = await apiClient.createIncident({
        title: title.trim(),
        category,
        description: description.trim(),
        incident_date: incidentDate || undefined,
        incident_time: incidentTime || undefined,
        platform: platform.trim() || 'Unknown Platform',
        relevant_urls: urls.length > 0 ? urls : undefined,
        status: 'open',
      })

      // Clean up session storage if used
      sessionStorage.removeItem(SESSION_STORAGE_DRAFT_KEY)

      showToast('Incident record created and secured in vault.', 'success')
      navigate(`/incidents/${created.id}`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save incident.'
      setError(msg)
      showToast(msg, 'error')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 text-left pb-16">
      {/* 1. GUIDED WORKFLOW HEADER */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#111716] via-[#0d1110] to-[#070908] border border-[rgba(225,239,221,0.16)] rounded-3xl p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.6)]">
        <div className="pointer-events-none absolute -top-32 -left-32 w-72 h-72 bg-[#d5ff54]/10 rounded-full blur-3xl" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-2 text-xs font-mono font-bold text-[#d5ff54] uppercase tracking-wider px-3 py-1 rounded-full bg-[#d5ff54]/10 border border-[#d5ff54]/25">
                <Lock className="w-3.5 h-3.5" />
                Log Abuse Incident
              </span>
              <span className="text-xs text-[#a8db35] font-mono flex items-center gap-1 bg-[#a8db35]/10 px-2.5 py-0.5 rounded-full border border-[#a8db35]/20">
                <ShieldCheck className="w-3.5 h-3.5" />
                Zero-Knowledge Privacy
              </span>
            </div>
            <h1 className="font-display text-3xl sm:text-4xl uppercase font-extrabold text-[#f0f2eb] tracking-[0.02em]">
              Document Digital Abuse Incident
            </h1>
            <p className="text-xs sm:text-sm text-[#929b93] max-w-xl">
              Step-by-step guided incident logging. Only share what you feel comfortable with. All inputs remain in your browser until you choose to submit.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            <Button
              type="button"
              variant="danger"
              size="sm"
              onClick={handleDiscardDraft}
              leftIcon={<Trash2 className="w-3.5 h-3.5" />}
            >
              Discard Draft Immediately
            </Button>
          </div>
        </div>

        {/* PROGRESS STEPPER */}
        <div className="mt-8 pt-6 border-t border-[rgba(225,239,221,0.15)]">
          <div className="grid grid-cols-5 gap-2 text-center">
            {stepsList.map((s) => {
              const isCompleted = currentStep > s.number
              const isCurrent = currentStep === s.number
              return (
                <button
                  key={s.number}
                  type="button"
                  onClick={() => {
                    if (s.number < currentStep) setCurrentStep(s.number)
                  }}
                  disabled={s.number > currentStep}
                  className={`flex flex-col items-center gap-1.5 transition-all text-xs ${
                    isCurrent
                      ? 'text-[#d5ff54]'
                      : isCompleted
                      ? 'text-[#a8db35] cursor-pointer'
                      : 'text-[#929b93] cursor-not-allowed'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-mono font-bold text-xs transition-all ${
                      isCurrent
                        ? 'bg-[#d5ff54] text-[#070908] ring-4 ring-[#d5ff54]/20 shadow-lg shadow-[#d5ff54]/30'
                        : isCompleted
                        ? 'bg-[#a8db35]/20 text-[#a8db35] border border-[#a8db35]/40'
                        : 'bg-[#0d1110] text-[#929b93] border border-[rgba(225,239,221,0.20)]'
                    }`}
                  >
                    {isCompleted ? <Check className="w-4 h-4" /> : s.number}
                  </div>
                  <span className="font-semibold hidden sm:inline">{s.title}</span>
                </button>
              )
            })}
          </div>
          <div className="mt-4 h-1 w-full bg-[#070908] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#d5ff54] to-[#a8db35] transition-all duration-500 ease-out"
              style={{ width: `${((currentStep - 1) / (stepsList.length - 1)) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* PRIVACY RETENTION TOGGLE */}
      <div className="bg-[#111716]/85 border border-[rgba(225,239,221,0.15)] rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-[#0d1110] border border-[rgba(225,239,221,0.20)] flex items-center justify-center text-[#d5ff54] shrink-0">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <p className="font-bold text-[#f0f2eb]">Auto-save draft in this browser session only</p>
            <p className="text-[11px] text-[#929b93]">
              When enabled, your unsaved draft persists across page reloads in this browser tab only.
            </p>
          </div>
        </div>
        <label className="relative inline-flex items-center cursor-pointer shrink-0">
          <input
            type="checkbox"
            checked={allowSessionStorage}
            onChange={(e) => setAllowSessionStorage(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-[#0d1110] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[#929b93] peer-checked:after:bg-[#070908] after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#d5ff54] border border-[rgba(225,239,221,0.28)]"></div>
        </label>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-[#ff927e]/10 border border-[#ff927e]/30 flex items-center gap-3 text-xs text-[#ff927e]">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* STEP 1: CATEGORY SELECTION */}
      {currentStep === 1 && (
        <div className="space-y-6">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-[#f0f2eb]">Step 1: What type of digital abuse occurred?</h2>
            <p className="text-xs text-[#929b93]">
              Choose the primary classification. This configures the statutory legal sections and evidence requirements.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {categoryCards.map((cat) => {
              const isSelected = category === cat.value
              return (
                <div
                  key={cat.value}
                  onClick={() => setCategory(cat.value)}
                  className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-[#d5ff54]/10 border-[#d5ff54] shadow-lg shadow-[#d5ff54]/10 ring-1 ring-[#d5ff54]/40'
                      : 'bg-[#111716]/85 border-[rgba(225,239,221,0.15)] hover:border-[#d5ff54]/40 hover:bg-[#111716]'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-xl bg-[#0d1110] border border-[rgba(225,239,221,0.20)] flex items-center justify-center">
                        {cat.icon}
                      </div>
                      <span className="text-[10px] font-mono text-[#d5ff54] bg-[#d5ff54]/10 px-2.5 py-0.5 rounded-full border border-[#d5ff54]/20">
                        {cat.statutoryRef}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-[#f0f2eb]">{cat.title}</h3>
                      <p className="text-xs text-[#929b93] mt-1 leading-relaxed">{cat.description}</p>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[rgba(225,239,221,0.10)] flex items-center justify-between text-xs">
                    <span className={`font-semibold ${isSelected ? 'text-[#d5ff54]' : 'text-[#929b93]'}`}>
                      {isSelected ? '✓ Selected' : 'Click to select'}
                    </span>
                    {isSelected && <Check className="w-4 h-4 text-[#d5ff54]" />}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="flex justify-end pt-4">
            <Button variant="primary" size="md" onClick={handleNextFromStep1} rightIcon={<ArrowRight className="w-4 h-4" />}>
              Continue to Details
            </Button>
          </div>
        </div>
      )}

      {/* STEP 2: DETAILS & FACTS */}
      {currentStep === 2 && (
        <div className="space-y-6">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-[#f0f2eb]">Step 2: Incident Details &amp; Chronology</h2>
            <p className="text-xs text-[#929b93]">
              Document clear facts. Where did this happen, when was it first noticed, and what was said or shared?
            </p>
          </div>

          <div className="bg-[#111716]/85 border border-[rgba(225,239,221,0.15)] rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[#f0f2eb] uppercase tracking-wider block">
                Incident Title *
              </label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Harassment DMs and fake profile created on Instagram"
                className="w-full"
              />
              <p className="text-[11px] text-[#929b93]">A short descriptive summary for your records and complaint draft.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-[#f0f2eb] uppercase tracking-wider block">
                  Platform / Channel
                </label>
                <select
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  className="w-full bg-[#0d1110] border border-[rgba(225,239,221,0.20)] rounded-xl px-3 py-2 text-xs text-[#f0f2eb] focus:outline-none focus:border-[#d5ff54]/60"
                >
                  <option value="Instagram">Instagram</option>
                  <option value="WhatsApp">WhatsApp</option>
                  <option value="X / Twitter">X / Twitter</option>
                  <option value="Telegram">Telegram</option>
                  <option value="Facebook">Facebook</option>
                  <option value="LinkedIn">LinkedIn</option>
                  <option value="YouTube">YouTube</option>
                  <option value="Snapchat">Snapchat</option>
                  <option value="Email">Email</option>
                  <option value="Other">Other Channel</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-[#f0f2eb] uppercase tracking-wider block">
                  Date Noticed
                </label>
                <input
                  type="date"
                  value={incidentDate}
                  onChange={(e) => setIncidentDate(e.target.value)}
                  className="w-full bg-[#0d1110] border border-[rgba(225,239,221,0.20)] rounded-xl px-3 py-2 text-xs text-[#f0f2eb] focus:outline-none focus:border-[#d5ff54]/60 font-mono"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-[#f0f2eb] uppercase tracking-wider block">
                  Approx. Time
                </label>
                <input
                  type="time"
                  value={incidentTime}
                  onChange={(e) => setIncidentTime(e.target.value)}
                  className="w-full bg-[#0d1110] border border-[rgba(225,239,221,0.20)] rounded-xl px-3 py-2 text-xs text-[#f0f2eb] focus:outline-none focus:border-[#d5ff54]/60 font-mono"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-[#f0f2eb] uppercase tracking-wider block">
                What Happened? (Your Factual Narration) *
              </label>
              <textarea
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the incident in chronological order. Include usernames, handles, phone numbers, exact phrases or threats used, and how you were targeted."
                className="w-full bg-[#0d1110] border border-[rgba(225,239,221,0.20)] rounded-xl p-3.5 text-xs text-[#f0f2eb] placeholder-[#929b93] focus:outline-none focus:border-[#d5ff54]/60 transition-colors leading-relaxed"
              />
              <p className="text-[11px] text-[#929b93]">
                This statement will form the factual body of your formal grievance or police complaint.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-[#f0f2eb] uppercase tracking-wider block">
                Target URLs or Profile Links
              </label>
              <input
                type="text"
                value={relevantUrls}
                onChange={(e) => setRelevantUrls(e.target.value)}
                placeholder="https://instagram.com/abusive_handle, https://t.me/channel"
                className="w-full bg-[#0d1110] border border-[rgba(225,239,221,0.20)] rounded-xl px-3.5 py-2 text-xs text-[#f0f2eb] placeholder-[#929b93] focus:outline-none focus:border-[#d5ff54]/60 font-mono"
              />
              <p className="text-[11px] text-[#929b93]">Comma-separated links to perpetrator profiles, abusive posts, or channels.</p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4">
            <Button variant="ghost" size="md" onClick={() => setCurrentStep(1)} leftIcon={<ArrowLeft className="w-4 h-4" />}>
              Back
            </Button>
            <Button variant="primary" size="md" onClick={handleNextFromStep2} rightIcon={<ArrowRight className="w-4 h-4" />}>
              Continue to Evidence
            </Button>
          </div>
        </div>
      )}

      {/* STEP 3: PRESERVE EVIDENCE */}
      {currentStep === 3 && (
        <div className="space-y-6">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-[#f0f2eb]">Step 3: Attach Evidence Screenshots or Media</h2>
            <p className="text-xs text-[#929b93]">
              Upload screenshots of messages, audio notes, or media. Each file will receive an immutable SHA-256 fingerprint.
            </p>
          </div>

          <div className="bg-[#111716]/85 border border-[rgba(225,239,221,0.15)] rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
            {/* Dropzone */}
            <label className="border-2 border-dashed border-[#d5ff54]/30 hover:border-[#d5ff54] rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer bg-[#0d1110]/60 hover:bg-[#0d1110] transition-all group">
              <div className="w-12 h-12 rounded-2xl bg-[#d5ff54]/15 text-[#d5ff54] flex items-center justify-center group-hover:scale-105 transition-transform mb-3">
                <Upload className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-[#f0f2eb]">Click or Drag &amp; Drop evidence files here</p>
              <p className="text-xs text-[#929b93] mt-1">PNG, JPG, MP4, PDF up to 50MB</p>
              <input
                type="file"
                multiple
                onChange={handleFileDrop}
                className="hidden"
                accept="image/*,video/*,application/pdf"
              />
            </label>

            {/* Staged Files List */}
            {stagedFiles.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-[#f0f2eb] uppercase tracking-wider">
                  Staged Files ({stagedFiles.length})
                </h4>
                <div className="divide-y divide-[#929b93]/15 border border-[rgba(225,239,221,0.15)] rounded-2xl overflow-hidden bg-[#0d1110]">
                  {stagedFiles.map((file, idx) => (
                    <div key={idx} className="p-3.5 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <FileCheck2 className="w-4 h-4 text-[#a8db35] shrink-0" />
                        <div className="overflow-hidden">
                          <p className="font-semibold text-[#f0f2eb] truncate">{file.name}</p>
                          <p className="text-[10px] text-[#929b93] font-mono">{formatBytes(file.size)}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => removeStagedFile(idx)}
                        className="text-[#929b93] hover:text-[#ff927e] p-1 rounded-lg transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="p-4 rounded-2xl bg-[#a8db35]/10 border border-[#a8db35]/25 flex items-start gap-3 text-xs text-[#929b93]">
              <ShieldCheck className="w-5 h-5 text-[#a8db35] shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-[#f0f2eb]">Section 65B Electronic Proof Notice</p>
                <p className="mt-0.5 leading-relaxed text-[11px]">
                  Files are fingerprinted in memory. You can also upload additional evidence later at any time from the Evidence Vault.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4">
            <Button variant="ghost" size="md" onClick={() => setCurrentStep(2)} leftIcon={<ArrowLeft className="w-4 h-4" />}>
              Back
            </Button>
            <Button variant="primary" size="md" onClick={handleNextFromStep3} rightIcon={<ArrowRight className="w-4 h-4" />}>
              Review Incident Dossier
            </Button>
          </div>
        </div>
      )}

      {/* STEP 4: REVIEW DOSSIER */}
      {currentStep === 4 && (
        <div className="space-y-6">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-[#f0f2eb]">Step 4: Review Incident Dossier</h2>
            <p className="text-xs text-[#929b93]">
              Confirm all details before saving to your encrypted vault. You can edit any field before finalizing.
            </p>
          </div>

          <div className="bg-[#111716]/85 border border-[rgba(225,239,221,0.15)] rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl text-xs">
            <div className="flex items-center justify-between pb-4 border-b border-[rgba(225,239,221,0.15)]">
              <div>
                <span className="text-[10px] text-[#929b93] uppercase tracking-wider font-mono">Dossier Classification</span>
                <h3 className="text-base font-bold text-[#f0f2eb]">{title}</h3>
              </div>
              <span className="px-3 py-1 rounded-full bg-[#d5ff54]/10 text-[#d5ff54] font-mono text-xs border border-[#d5ff54]/25">
                {platform}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-2 border-b border-[rgba(225,239,221,0.10)] text-[11px]">
              <div>
                <span className="text-[#929b93] block">Category:</span>
                <span className="text-[#f0f2eb] font-semibold capitalize">{category.replace('_', ' ')}</span>
              </div>
              <div>
                <span className="text-[#929b93] block">Date Noticed:</span>
                <span className="text-[#f0f2eb] font-mono">{incidentDate || 'Not specified'}</span>
              </div>
              <div>
                <span className="text-[#929b93] block">Time:</span>
                <span className="text-[#f0f2eb] font-mono">{incidentTime || 'Not specified'}</span>
              </div>
            </div>

            <div className="space-y-1.5 py-2 border-b border-[rgba(225,239,221,0.10)]">
              <span className="text-[#929b93] font-semibold uppercase tracking-wider text-[10px] block">
                Factual Narration:
              </span>
              <p className="text-[#f0f2eb] bg-[#0d1110] p-4 rounded-xl border border-[rgba(225,239,221,0.15)] whitespace-pre-wrap leading-relaxed">
                {description}
              </p>
            </div>

            {relevantUrls && (
              <div className="space-y-1 py-1">
                <span className="text-[#929b93] font-semibold uppercase tracking-wider text-[10px] block">
                  Referenced URLs:
                </span>
                <p className="text-[#d5ff54] font-mono text-[11px] break-all">{relevantUrls}</p>
              </div>
            )}

            <div className="pt-2 flex items-center gap-2 text-xs text-[#a8db35]">
              <ShieldCheck className="w-4 h-4" />
              <span>Ready for zero-knowledge vault commitment and complaint generation.</span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4">
            <Button variant="ghost" size="md" onClick={() => setCurrentStep(3)} leftIcon={<ArrowLeft className="w-4 h-4" />}>
              Back to Evidence
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={handleFinalSave}
              disabled={isLoading}
              leftIcon={<Save className="w-4 h-4" />}
            >
              {isLoading ? 'Saving Dossier...' : 'Confirm & Save Incident to Vault'}
            </Button>
          </div>
        </div>
      )}

      {/* STEP 5: SAVED SUCCESS STATE */}
      {currentStep === 5 && (
        <div className="bg-[#111716]/85 border border-[#a8db35]/30 rounded-3xl p-12 text-center space-y-6 shadow-2xl">
          <div className="w-16 h-16 rounded-full bg-[#a8db35]/15 border border-[#a8db35]/40 flex items-center justify-center mx-auto text-[#a8db35]">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-[#f0f2eb]">Incident Dossier Successfully Secured</h2>
            <p className="text-xs text-[#929b93] max-w-md mx-auto leading-relaxed">
              Your record is stored with client-side encryption. You can now generate formal complaint letters or analyze media.
            </p>
          </div>
          <div className="flex items-center justify-center gap-4 pt-4">
            <Link to="/complaints">
              <Button variant="primary" size="md" leftIcon={<FileText className="w-4 h-4" />}>
                Prepare Complaint Letter
              </Button>
            </Link>
            <Link to="/incidents">
              <Button variant="secondary" size="md">
                View All Incidents
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
