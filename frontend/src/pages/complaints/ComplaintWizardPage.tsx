import React, { useState, useEffect } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import {
  FileText,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Download,
  Copy,
  Check,
  Shield,
  Info,
  Calendar,
  HardDrive,
  Edit3,
  HelpCircle,
  ExternalLink,
  ShieldCheck,
  FileCheck2,
  Building,
  Scale,
  Sparkles,
} from 'lucide-react'
import { jsPDF } from 'jspdf'
import { useI18n } from '../../contexts/I18nContext'
import { useToast } from '../../contexts/ToastContext'
import { apiClient } from '../../services/api/client'
import type { Incident, Evidence, ComplaintDraft } from '../../types'
import { Button } from '../../components/common/Button'
import { Badge } from '../../components/common/Badge'
import { formatDate } from '../../utils/crypto'

export const ComplaintWizardPage: React.FC = () => {
  const { t } = useI18n()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const preselectedIncidentId = searchParams.get('incidentId') || ''

  // 3-Step Wizard: 1: Select & Review Facts, 2: Edit Draft, 3: Export & Submit Guidance
  const [step, setStep] = useState(1)
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [selectedIncidentId, setSelectedIncidentId] = useState(preselectedIncidentId)
  const [incidentEvidence, setIncidentEvidence] = useState<Evidence[]>([])
  const [selectedEvidenceIds, setSelectedEvidenceIds] = useState<string[]>([])
  const [confirmedFacts, setConfirmedFacts] = useState('')
  const [draft, setDraft] = useState<ComplaintDraft | null>(null)
  const [editableText, setEditableText] = useState('')
  const [userConfirmed, setUserConfirmed] = useState(false)
  const [copied, setCopied] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)

  useEffect(() => {
    const fetchIncidents = async () => {
      const data = await apiClient.getIncidents()
      setIncidents(data)
      if (preselectedIncidentId) {
        setSelectedIncidentId(preselectedIncidentId)
        loadIncidentEvidence(preselectedIncidentId, data)
      } else if (data.length > 0) {
        setSelectedIncidentId(data[0].id)
        loadIncidentEvidence(data[0].id, data)
      }
    }
    fetchIncidents()
  }, [preselectedIncidentId])

  const loadIncidentEvidence = async (incId: string, currentIncidents = incidents) => {
    const evi = await apiClient.getEvidenceByIncident(incId)
    setIncidentEvidence(evi)
    setSelectedEvidenceIds(evi.map((e) => e.id))
    const inc = currentIncidents.find((i) => i.id === incId)
    if (inc) {
      setConfirmedFacts(inc.description)
    }
  }

  const handleSelectIncident = (incId: string) => {
    setSelectedIncidentId(incId)
    loadIncidentEvidence(incId)
  }

  const currentIncident = incidents.find((i) => i.id === selectedIncidentId)

  const handleGenerateDraft = async () => {
    if (!selectedIncidentId) return
    setIsGenerating(true)
    try {
      const generated = await apiClient.generateComplaintDraft(
        selectedIncidentId,
        selectedEvidenceIds,
        confirmedFacts
      )
      setDraft(generated)
      setEditableText(generated.full_draft_text)
      setStep(2)
      showToast('Complaint draft prepared for your review.', 'success')
    } catch {
      showToast('Failed to generate draft.', 'error')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSaveAndConfirm = async () => {
    if (!draft) return
    try {
      const updated = await apiClient.updateComplaintDraft(draft.id, editableText, userConfirmed)
      setDraft(updated)
      showToast('Complaint verified and saved.', 'success')
      setStep(3)
    } catch {
      showToast('Failed to save complaint draft.', 'error')
    }
  }

  const handleExportPdf = () => {
    if (!editableText) return
    const doc = new jsPDF()
    doc.setFont('Helvetica', 'normal')
    doc.setFontSize(14)
    doc.text('SafeHER — Formal Digital Abuse Complaint Draft', 15, 20)
    doc.setFontSize(9)
    doc.setTextColor(100)
    doc.text('Notice: User-prepared draft from cryptographically verified records. Not legal counsel.', 15, 27)

    doc.setFontSize(10)
    doc.setTextColor(20)
    const splitText = doc.splitTextToSize(editableText, 180)
    doc.text(splitText, 15, 38)

    doc.save(`SafeHER_Complaint_${currentIncident?.id || 'draft'}.pdf`)
    showToast('Official PDF complaint exported.', 'success')
  }

  const handleCopyText = () => {
    navigator.clipboard.writeText(editableText)
    setCopied(true)
    showToast('Complaint text copied to clipboard.', 'info')
    setTimeout(() => setCopied(false), 2500)
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 text-left pb-16">
      {/* 1. DOCUMENT PREPARATION HEADER */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#171D35] via-[#0D1224] to-[#080B18] border border-[#A6AEC8]/18 rounded-3xl p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.6)]">
        <div className="pointer-events-none absolute -top-32 -left-32 w-80 h-80 bg-[#8B7CFF]/10 rounded-full blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -right-32 w-80 h-80 bg-[#55D6E8]/10 rounded-full blur-3xl" />

        <div className="relative z-10 space-y-2 pb-6 border-b border-[#A6AEC8]/15">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-2 text-xs font-mono font-bold text-[#8B7CFF] uppercase tracking-wider px-3 py-1 rounded-full bg-[#8B7CFF]/10 border border-[#8B7CFF]/25">
              <Scale className="w-3.5 h-3.5" />
              AI-Assisted Complaint Preparation Wizard
            </span>
            <span className="text-xs text-[#52D6B2] font-mono flex items-center gap-1 bg-[#52D6B2]/10 px-2.5 py-0.5 rounded-full border border-[#52D6B2]/20">
              <ShieldCheck className="w-3.5 h-3.5" />
              Section 65B Compliant
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#F4F5FF] tracking-tight">
            Formal Legal Complaint Preparation
          </h1>
          <p className="text-xs sm:text-sm text-[#A6AEC8] max-w-2xl leading-relaxed">
            Prepare a structured, evidence-linked complaint letter in simple steps. Review every line before taking action.
          </p>
        </div>

        {/* STEPPER PROGRESS */}
        <div className="relative z-10 flex items-center justify-between pt-6 text-xs font-medium">
          {[
            { num: 1, label: 'Choose Incident & Evidence' },
            { num: 2, label: 'Review & Edit Legal Text' },
            { num: 3, label: 'Download & Multi-Channel Filing' },
          ].map((s) => {
            const isActive = step === s.num
            const isDone = step > s.num
            return (
              <div
                key={s.num}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all ${
                  isActive
                    ? 'bg-[#8B7CFF]/15 text-[#8B7CFF] border border-[#8B7CFF]/30 font-semibold'
                    : isDone
                    ? 'text-[#52D6B2] bg-[#52D6B2]/10'
                    : 'text-[#727D9C]'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-mono font-bold ${
                    isActive
                      ? 'bg-[#8B7CFF] text-[#080B18]'
                      : isDone
                      ? 'bg-[#52D6B2] text-[#080B18]'
                      : 'bg-[#0D1224] text-[#727D9C]'
                  }`}
                >
                  {isDone ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : s.num}
                </div>
                <span className="hidden sm:inline">{s.label}</span>
              </div>
            )
          })}
        </div>
        <div className="relative z-10 mt-4 h-1 w-full bg-[#080B18] rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#8B7CFF] to-[#52D6B2] transition-all duration-500 ease-out"
            style={{ width: `${((step - 1) / 2) * 100}%` }}
          />
        </div>
      </div>

      {/* 2. COMPLAINANT VERIFICATION PRINCIPLE NOTICE */}
      <div className="p-5 bg-[#171D35]/90 border border-[#8B7CFF]/25 rounded-3xl flex items-start gap-4 text-xs text-[#A6AEC8] shadow-lg shadow-[#080B18]/60">
        <div className="w-9 h-9 rounded-xl bg-[#8B7CFF]/15 border border-[#8B7CFF]/30 flex items-center justify-center shrink-0 mt-0.5 text-[#8B7CFF]">
          <Info className="w-4 h-4" />
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-[#F4F5FF]">Complainant Verification Principle</h3>
            <span className="text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-full bg-[#8B7CFF]/10 text-[#8B7CFF] border border-[#8B7CFF]/25">
              User Reviewed
            </span>
          </div>
          <p className="text-[#A6AEC8] leading-relaxed text-[11.5px]">
            SafeHER never submits complaints automatically to any platform or authority. You have complete control to review, edit, copy, and file the draft yourself.
          </p>
        </div>
      </div>

      {/* ================= STEP 1: CHOOSE ABUSE INCIDENT TO REPORT ================= */}
      {step === 1 && (
        <div className="bg-[#171D35]/85 border border-[#A6AEC8]/15 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
          <div className="space-y-1 pb-4 border-b border-[#A6AEC8]/15">
            <h2 className="text-base font-bold text-[#F4F5FF]">
              Step 1: Choose Abuse Incident to Report
            </h2>
            <p className="text-xs text-[#A6AEC8]">
              Select which incident from your vault you want to prepare a complaint for.
            </p>
          </div>

          {/* Incident Radio Selection */}
          <div className="space-y-3">
            {incidents.map((inc) => (
              <label
                key={inc.id}
                className={`p-4 rounded-2xl border flex items-start gap-3.5 cursor-pointer transition-all ${
                  selectedIncidentId === inc.id
                    ? 'border-[#8B7CFF] bg-[#8B7CFF]/10 shadow-[0_0_15px_rgba(139,124,255,0.15)]'
                    : 'border-[#A6AEC8]/15 bg-[#0D1224] hover:border-[#A6AEC8]/30'
                }`}
              >
                <input
                  type="radio"
                  name="incidentSelection"
                  checked={selectedIncidentId === inc.id}
                  onChange={() => handleSelectIncident(inc.id)}
                  className="mt-1 text-[#8B7CFF] focus:ring-[#8B7CFF]"
                />
                <div className="space-y-1.5 w-full">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-[#F4F5FF]">{inc.title}</h3>
                    <Badge variant="neutral" size="sm">{inc.platform}</Badge>
                  </div>
                  <p className="text-xs text-[#A6AEC8] line-clamp-2 leading-relaxed">{inc.description}</p>
                  <div className="flex items-center gap-3 text-[11px] text-[#727D9C] pt-1 font-mono">
                    <span>Logged: {formatDate(inc.created_at)}</span>
                    <span>•</span>
                    <span className="text-[#55D6E8]">{inc.evidence_count} Preserved Files</span>
                  </div>
                </div>
              </label>
            ))}
          </div>

          {/* Incident Facts Preview */}
          {currentIncident && (
            <div className="p-4 bg-[#0D1224] rounded-2xl border border-[#A6AEC8]/15 space-y-3 text-xs">
              <span className="font-semibold text-[#F4F5FF] block">
                Incident Summary to be Included:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[#A6AEC8]">
                <div>Category: <span className="text-[#F4F5FF] capitalize font-medium">{currentIncident.category.replace('_', ' ')}</span></div>
                <div>Platform: <span className="text-[#F4F5FF] font-medium">{currentIncident.platform}</span></div>
                <div>Date Occurred: <span className="text-[#F4F5FF] font-mono">{currentIncident.incident_date ? formatDate(currentIncident.incident_date) : 'Unrecorded'}</span></div>
                <div>Source URLs: <span className="text-[#F4F5FF] font-mono">{currentIncident.relevant_urls?.join(', ') || 'None provided'}</span></div>
              </div>
            </div>
          )}

          {/* Evidence Inventory Checkboxes */}
          {incidentEvidence.length > 0 && (
            <div className="space-y-2.5">
              <span className="text-xs font-semibold text-[#F4F5FF] uppercase tracking-wider block">
                Select Evidence to Cite in Legal Filing ({incidentEvidence.length} available):
              </span>
              <div className="space-y-2">
                {incidentEvidence.map((evi) => {
                  const isSelected = selectedEvidenceIds.includes(evi.id)
                  return (
                    <label
                      key={evi.id}
                      className="p-3.5 bg-[#0D1224] rounded-xl border border-[#A6AEC8]/15 flex items-center justify-between text-xs cursor-pointer hover:border-[#8B7CFF]/30 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedEvidenceIds((prev) => [...prev, evi.id])
                            } else {
                              setSelectedEvidenceIds((prev) => prev.filter((id) => id !== evi.id))
                            }
                          }}
                          className="rounded text-[#8B7CFF] focus:ring-[#8B7CFF]"
                        />
                        <span className="text-[#F4F5FF] font-medium truncate">{evi.original_filename}</span>
                      </div>
                      <span className="text-[10px] font-mono text-[#52D6B2] hidden sm:inline">
                        SHA-256: {evi.sha256_hash.substring(0, 16)}...
                      </span>
                    </label>
                  )
                })}
              </div>
            </div>
          )}

          <div className="flex justify-end pt-4 border-t border-[#A6AEC8]/15">
            <Button
              type="button"
              variant="primary"
              size="md"
              disabled={!selectedIncidentId}
              isLoading={isGenerating}
              onClick={handleGenerateDraft}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Generate Complaint Draft
            </Button>
          </div>
        </div>
      )}

      {/* ================= STEP 2: REVIEW & EDIT COMPLAINT DRAFT ================= */}
      {step === 2 && (
        <div className="bg-[#171D35]/85 border border-[#A6AEC8]/15 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#A6AEC8]/15">
            <div className="space-y-1">
              <h2 className="text-base font-bold text-[#F4F5FF]">
                Step 2: Review &amp; Edit Complaint Draft
              </h2>
              <p className="text-xs text-[#A6AEC8]">
                Read through the draft. You can directly edit any text below before downloading.
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleCopyText}
              leftIcon={<Copy className="w-3.5 h-3.5" />}
            >
              {copied ? 'Copied' : 'Copy Text'}
            </Button>
          </div>

          {/* Plain-Language Legal Guidance Box */}
          <div className="p-4 bg-[#0D1224] rounded-2xl border border-[#A6AEC8]/15 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-[#8B7CFF]">
              <HelpCircle className="w-4 h-4" />
              <span>Legal Terms Explained in Simple Language:</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-[#A6AEC8] pt-1">
              <div className="p-3 bg-[#080B18] rounded-xl border border-[#A6AEC8]/10 space-y-1">
                <strong className="text-[#F4F5FF] block">Section 66E (IT Act):</strong>
                <p className="text-[11px] leading-relaxed">Violation of privacy by capturing or publishing private photos without consent.</p>
              </div>
              <div className="p-3 bg-[#080B18] rounded-xl border border-[#A6AEC8]/10 space-y-1">
                <strong className="text-[#F4F5FF] block">Section 354D (IPC / BNS):</strong>
                <p className="text-[11px] leading-relaxed">Online stalking, tracking, or persistently contacting someone despite disinterest.</p>
              </div>
              <div className="p-3 bg-[#080B18] rounded-xl border border-[#A6AEC8]/10 space-y-1">
                <strong className="text-[#F4F5FF] block">Section 506 (IPC / BNS):</strong>
                <p className="text-[11px] leading-relaxed">Criminal intimidation (threatening physical harm, reputation damage, or extortion).</p>
              </div>
              <div className="p-3 bg-[#080B18] rounded-xl border border-[#A6AEC8]/10 space-y-1">
                <strong className="text-[#F4F5FF] block">Section 65B Certificate:</strong>
                <p className="text-[11px] leading-relaxed">Legal document proving digital evidence wasn&apos;t tampered with after preservation.</p>
              </div>
            </div>
          </div>

          {/* Editable Draft Text Area */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-[#F4F5FF] uppercase tracking-wider block">
              Editable Complaint Text:
            </label>
            <textarea
              value={editableText}
              onChange={(e) => setEditableText(e.target.value)}
              rows={14}
              className="w-full font-mono text-xs p-4 bg-[#0D1224] border border-[#A6AEC8]/20 rounded-2xl text-[#F4F5FF] leading-relaxed focus:outline-none focus:border-[#8B7CFF]/60 transition-colors"
            />
          </div>

          {/* User Confirmation Checkbox */}
          <div className="p-4 bg-[#0D1224] rounded-2xl border border-[#A6AEC8]/15">
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={userConfirmed}
                onChange={(e) => setUserConfirmed(e.target.checked)}
                className="mt-0.5 rounded text-[#8B7CFF] focus:ring-[#8B7CFF]"
              />
              <span className="text-xs text-[#F4F5FF] font-medium leading-relaxed">
                I have reviewed this draft and confirm that all factual statements represent my true experience.
              </span>
            </label>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-[#A6AEC8]/15">
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={() => setStep(1)}
              leftIcon={<ArrowLeft className="w-4 h-4" />}
            >
              Back to Incident Selection
            </Button>
            <Button
              type="button"
              variant="primary"
              size="md"
              disabled={!userConfirmed}
              onClick={handleSaveAndConfirm}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Confirm &amp; Proceed to Export
            </Button>
          </div>
        </div>
      )}

      {/* ================= STEP 3: EXPORT & SUBMIT GUIDANCE ================= */}
      {step === 3 && (
        <div className="bg-[#171D35]/85 border border-[#A6AEC8]/15 rounded-3xl p-6 sm:p-10 space-y-8 shadow-xl text-center">
          <div className="w-16 h-16 rounded-3xl bg-[#52D6B2]/15 border border-[#52D6B2]/40 flex items-center justify-center mx-auto text-[#52D6B2]">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-1.5">
            <h2 className="text-xl font-bold text-[#F4F5FF]">
              Your Complaint Letter is Ready
            </h2>
            <p className="text-xs text-[#A6AEC8] max-w-md mx-auto leading-relaxed">
              You can now download your complaint as an official PDF document or copy the text directly.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={handleExportPdf}
              leftIcon={<Download className="w-4 h-4" />}
            >
              Download Official PDF
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={handleCopyText}
              leftIcon={<Copy className="w-4 h-4" />}
            >
              {copied ? 'Copied' : 'Copy Text'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="md"
              onClick={() => setStep(2)}
              leftIcon={<Edit3 className="w-4 h-4" />}
            >
              Edit Draft Again
            </Button>
          </div>

          {/* Submission Destinations Directory */}
          <div className="pt-8 border-t border-[#A6AEC8]/15 text-left space-y-4">
            <h3 className="text-xs font-bold text-[#F4F5FF] uppercase tracking-wider">
              Where to Submit This Complaint:
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-5 bg-[#0D1224] rounded-2xl border border-[#A6AEC8]/15 space-y-2">
                <span className="font-bold text-[#8B7CFF] block">1. Government Cyber Portal</span>
                <p className="text-[#A6AEC8] leading-relaxed text-[11px]">
                  Submit at <strong>cybercrime.gov.in</strong> under &quot;Report Crime Against Women/Children&quot; or call <strong>1930</strong>.
                </p>
              </div>

              <div className="p-5 bg-[#0D1224] rounded-2xl border border-[#A6AEC8]/15 space-y-2">
                <span className="font-bold text-[#648BFF] block">2. Platform Grievance Officer</span>
                <p className="text-[#A6AEC8] leading-relaxed text-[11px]">
                  Send this draft to Instagram, WhatsApp, or Google&apos;s designated Grievance Officer in India for content takedown within 24 hours.
                </p>
              </div>

              <div className="p-5 bg-[#0D1224] rounded-2xl border border-[#A6AEC8]/15 space-y-2">
                <span className="font-bold text-[#52D6B2] block">3. Local Police Cyber Cell</span>
                <p className="text-[#A6AEC8] leading-relaxed text-[11px]">
                  Print the PDF document, sign it, and hand it to your city&apos;s Cyber Crime Police Station along with preserved evidence files.
                </p>
              </div>
            </div>

            <div className="pt-4 flex justify-between items-center text-xs">
              <Link to="/reporting" className="text-[#8B7CFF] hover:underline flex items-center gap-1 font-medium">
                <span>View platform grievance officer directory</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
              <Link to="/dashboard">
                <Button variant="ghost" size="sm">
                  Return to Dashboard
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
