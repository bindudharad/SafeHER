import React, { useState, useEffect, useMemo } from 'react'
import {
  Share2,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  PhoneCall,
  AlertCircle,
  FileText,
  Clock,
  PlusCircle,
  Globe,
  Filter,
  Search,
  Building,
  Shield,
  Layers,
} from 'lucide-react'
import { useI18n } from '../../contexts/I18nContext'
import { useToast } from '../../contexts/ToastContext'
import { apiClient } from '../../services/api/client'
import type { ReportingDestination, Incident } from '../../types'
import { Button } from '../../components/common/Button'
import { AnimatedDataPanel } from '../../components/common/AnimatedDataPanel'
import { Badge } from '../../components/common/Badge'
import { Modal } from '../../components/common/Modal'
import { Input } from '../../components/common/Input'

export const ReportingAssistantPage: React.FC = () => {
  const { t } = useI18n()
  const { showToast } = useToast()

  const [destinations, setDestinations] = useState<ReportingDestination[]>([])
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [selectedDestination, setSelectedDestination] = useState<ReportingDestination | null>(null)
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false)
  const [filterCategory, setFilterCategory] = useState<string>('all')

  // Record submission form state
  const [recordIncidentId, setRecordIncidentId] = useState('')
  const [refNumber, setRefNumber] = useState('')
  const [submissionDate, setSubmissionDate] = useState(new Date().toISOString().split('T')[0])
  const [followUpDate, setFollowUpDate] = useState('')
  const [recordNotes, setRecordNotes] = useState('')
  const [isSavingRecord, setIsSavingRecord] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      const [dests, incs] = await Promise.all([
        apiClient.getReportingDestinations(),
        apiClient.getIncidents(),
      ])
      setDestinations(dests)
      setIncidents(incs)
      if (incs.length > 0) {
        setRecordIncidentId(incs[0].id)
      }
    }
    fetchData()
  }, [])

  const handleOpenRecordModal = (dest: ReportingDestination) => {
    setSelectedDestination(dest)
    setIsRecordModalOpen(true)
  }

  const handleSaveRecord = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedDestination || !refNumber.trim() || !recordIncidentId) {
      showToast('Please fill in required fields.', 'warning')
      return
    }

    setIsSavingRecord(true)
    try {
      await apiClient.recordExternalSubmission(
        recordIncidentId,
        selectedDestination.id,
        selectedDestination.name,
        refNumber.trim(),
        submissionDate,
        followUpDate || undefined,
        recordNotes.trim() || undefined
      )
      showToast('Official filing reference saved to your case tracker.', 'success')
      setIsRecordModalOpen(false)
      setRefNumber('')
      setRecordNotes('')
    } catch {
      showToast('Failed to record submission.', 'error')
    } finally {
      setIsSavingRecord(false)
    }
  }

  const filteredDestinations = useMemo(() => {
    if (filterCategory === 'all') return destinations
    return destinations.filter((d) => d.category.toLowerCase().includes(filterCategory.toLowerCase()))
  }, [destinations, filterCategory])

  return (
    <div className="space-y-8 text-left max-w-7xl mx-auto pb-12">
      {/* 1. ASSISTANT COMMAND HEADER */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#171D35] via-[#0D1224] to-[#080B18] border border-[#A6AEC8]/18 rounded-3xl p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.6)]">
        <div className="pointer-events-none absolute -top-32 -left-32 w-80 h-80 bg-[#8B7CFF]/10 rounded-full blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -right-32 w-80 h-80 bg-[#52D6B2]/10 rounded-full blur-3xl" />

        <div className="relative z-10 space-y-2 pb-6 border-b border-[#A6AEC8]/15">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="inline-flex items-center gap-2 text-xs font-mono font-bold text-[#8B7CFF] uppercase tracking-wider px-3 py-1 rounded-full bg-[#8B7CFF]/10 border border-[#8B7CFF]/25">
              <Globe className="w-3.5 h-3.5" />
              {t.reporting.title}
            </span>
            <span className="text-xs text-[#52D6B2] font-mono flex items-center gap-1.5 bg-[#52D6B2]/10 px-2.5 py-0.5 rounded-full border border-[#52D6B2]/20">
              <ShieldCheck className="w-3.5 h-3.5" />
              Verified Jurisdictions
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#F4F5FF] tracking-tight">
            Official Grievance &amp; Law Enforcement Direct Channels
          </h1>
          <p className="text-xs sm:text-sm text-[#A6AEC8] max-w-2xl leading-relaxed">
            {t.reporting.subtitle}
          </p>
        </div>

        {/* OFFICIAL PROTOCOL NOTICE */}
        <div className="relative z-10 pt-6 flex items-start gap-4 text-xs text-[#A6AEC8]">
          <div className="w-9 h-9 rounded-xl bg-[#8B7CFF]/10 border border-[#8B7CFF]/30 flex items-center justify-center shrink-0 text-[#8B7CFF]">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-[#F4F5FF]">Official Channel Integrity &amp; Direct Jurisdiction</h3>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-[#52D6B2]/10 text-[#52D6B2] border border-[#52D6B2]/25">
                Verified Portals
              </span>
            </div>
            <p className="text-[#A6AEC8] leading-relaxed text-[11.5px] max-w-3xl">
              Every destination listed below has been verified as an official law enforcement portal or legitimate platform grievance mechanism. SafeHER never submits reports automatically on your behalf; you navigate directly to the verified portal and retain full sovereignty over your filings.
            </p>
          </div>
        </div>
      </div>

      {/* 2. CATEGORY FILTER BAR */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        {[
          { id: 'all', label: 'All Verified Channels' },
          { id: 'government', label: 'Government & Police' },
          { id: 'platform', label: 'Platform Grievance Officers' },
          { id: 'hash_prevention', label: 'Hash & NCII Registries' },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setFilterCategory(f.id)}
            className={`px-4 py-2 rounded-xl font-medium transition-all shrink-0 ${
              filterCategory === f.id
                ? 'bg-[#8B7CFF]/15 text-[#8B7CFF] border border-[#8B7CFF]/35 font-semibold shadow-md'
                : 'bg-[#171D35]/85 text-[#A6AEC8] border border-[#A6AEC8]/15 hover:text-[#F4F5FF]'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* 3. VERIFIED DESTINATIONS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredDestinations.map((dest) => (
          <AnimatedDataPanel
            key={dest.id}
            className="p-6 sm:p-7 flex flex-col justify-between space-y-6"
          >
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3 pb-3 border-b border-[#A6AEC8]/10">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#8B7CFF] font-mono">
                    {dest.category.replace('_', ' ')}
                  </span>
                  <h3 className="text-base sm:text-lg font-bold text-[#F4F5FF]">{dest.name}</h3>
                  <p className="text-xs text-[#A6AEC8] font-medium">{dest.platform}</p>
                </div>
                <Badge variant="safe" size="sm" dot>
                  VERIFIED
                </Badge>
              </div>

              <p className="text-xs text-[#A6AEC8] leading-relaxed">{dest.description}</p>

              {/* Instructions List */}
              <div className="space-y-2 bg-[#0D1224] p-4 rounded-2xl border border-[#A6AEC8]/15 text-xs">
                <span className="font-bold text-[#F4F5FF] block uppercase tracking-wider text-[11px]">
                  Official Submission Steps:
                </span>
                <ol className="list-decimal pl-4 space-y-1.5 text-xs text-[#A6AEC8]">
                  {dest.instructions.map((inst, i) => (
                    <li key={i} className="leading-relaxed">{inst}</li>
                  ))}
                </ol>
              </div>

              {/* Required Materials */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] font-semibold text-[#727D9C] uppercase tracking-wider block">
                  Required Materials to Attach:
                </span>
                <ul className="list-disc pl-4 space-y-0.5 text-xs text-[#A6AEC8]">
                  {dest.required_materials.map((mat, i) => (
                    <li key={i}>{mat}</li>
                  ))}
                </ul>
              </div>

              {dest.helpline_number && (
                <div className="p-3.5 rounded-2xl bg-[#0D1224] border border-[#52D6B2]/25 flex items-center justify-between text-xs text-[#52D6B2]">
                  <div className="flex items-center gap-2">
                    <PhoneCall className="w-4 h-4 text-[#52D6B2]" />
                    <span className="font-medium">Direct Citizen Hotline:</span>
                  </div>
                  <a href={`tel:${dest.helpline_number}`} className="font-mono text-sm font-bold text-[#F4F5FF] hover:underline">
                    {dest.helpline_number}
                  </a>
                </div>
              )}
            </div>

            {/* Action Bar */}
            <div className="flex items-center gap-3 pt-4 border-t border-[#A6AEC8]/15">
              <a
                href={dest.official_url}
                target="_blank"
                rel="noreferrer noopener"
                className="flex-1"
              >
                <Button
                  variant="primary"
                  size="sm"
                  className="w-full"
                  rightIcon={<ExternalLink className="w-3.5 h-3.5" />}
                >
                  Open Official Portal
                </Button>
              </a>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleOpenRecordModal(dest)}
                leftIcon={<PlusCircle className="w-3.5 h-3.5 text-[#8B7CFF]" />}
              >
                Record Reference
              </Button>
            </div>
          </AnimatedDataPanel>
        ))}
      </div>

      {/* Record Submission Modal */}
      <Modal
        isOpen={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
        title="Record Official Filing Reference"
        description="Save your external complaint reference or case ID to link it to your SafeHER case tracker."
      >
        {selectedDestination && (
          <form onSubmit={handleSaveRecord} className="space-y-4">
            <div className="space-y-1.5 text-left">
              <label className="text-xs font-semibold text-[#F4F5FF]">
                Associated Incident Record *
              </label>
              <select
                value={recordIncidentId}
                onChange={(e) => setRecordIncidentId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#0D1224] border border-[#A6AEC8]/20 rounded-xl text-xs text-[#F4F5FF] focus:outline-none focus:border-[#8B7CFF]/60 transition-colors"
                required
              >
                {incidents.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.title}
                  </option>
                ))}
              </select>
            </div>

            <Input
              label="Official Reference / Acknowledgement Number *"
              value={refNumber}
              onChange={(e) => setRefNumber(e.target.value)}
              placeholder="e.g., 20261123-NCR-89021 or META-REF-8921"
              required
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Date of Submission *"
                type="date"
                value={submissionDate}
                onChange={(e) => setSubmissionDate(e.target.value)}
                required
              />
              <Input
                label="Next Follow-up Reminder Date"
                type="date"
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
                helperText="Optional reminder for inquiry."
              />
            </div>

            <div className="space-y-1.5 text-left">
              <label className="text-xs font-semibold text-[#F4F5FF]">
                Submission Notes / Officer Details
              </label>
              <textarea
                value={recordNotes}
                onChange={(e) => setRecordNotes(e.target.value)}
                rows={2}
                placeholder="e.g., Filed under Women & Child category; police station assigned is Cyber Crime North."
                className="w-full px-3.5 py-2.5 bg-[#0D1224] border border-[#A6AEC8]/20 rounded-xl text-xs text-[#F4F5FF] placeholder-[#727D9C] focus:outline-none focus:border-[#8B7CFF]/60 transition-colors"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-[#A6AEC8]/15">
              <Button type="button" variant="ghost" size="sm" onClick={() => setIsRecordModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" isLoading={isSavingRecord}>
                Save Reference to Case Tracker
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}
