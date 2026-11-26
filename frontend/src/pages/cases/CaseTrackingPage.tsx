import React, { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  CheckSquare,
  Clock,
  Calendar,
  Share2,
  FileText,
  AlertCircle,
  CheckCircle2,
  Edit2,
  PlusCircle,
  ExternalLink,
  ShieldCheck,
  ChevronRight,
  Search,
  Filter,
} from 'lucide-react'
import { useI18n } from '../../contexts/I18nContext'
import { useToast } from '../../contexts/ToastContext'
import { apiClient } from '../../services/api/client'
import type { CaseTrackingItem, CaseStatus } from '../../types'
import { Button } from '../../components/common/Button'
import { Badge } from '../../components/common/Badge'
import { Modal } from '../../components/common/Modal'
import { formatDate } from '../../utils/crypto'

export const CaseTrackingPage: React.FC = () => {
  const { t } = useI18n()
  const { showToast } = useToast()

  const [cases, setCases] = useState<CaseTrackingItem[]>([])
  const [selectedCase, setSelectedCase] = useState<CaseTrackingItem | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newStatus, setNewStatus] = useState<CaseStatus>('submitted_by_user')
  const [newNotes, setNewNotes] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [searchFilter, setSearchFilter] = useState('')

  useEffect(() => {
    const fetchCases = async () => {
      try {
        const data = await apiClient.getCases()
        setCases(data)
      } finally {
        setIsLoading(false)
      }
    }
    fetchCases()
  }, [])

  const handleOpenStatusModal = (c: CaseTrackingItem) => {
    setSelectedCase(c)
    setNewStatus(c.status)
    setNewNotes(c.notes || '')
    setIsModalOpen(true)
  }

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCase) return

    try {
      const updated = await apiClient.updateCaseStatus(selectedCase.id, newStatus, newNotes)
      setCases((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))
      showToast('Case status updated successfully.', 'success')
      setIsModalOpen(false)
    } catch {
      showToast('Failed to update case status.', 'error')
    }
  }

  const getStatusBadge = (status: CaseStatus) => {
    switch (status) {
      case 'submitted_by_user':
        return <Badge variant="primary" dot>SUBMITTED BY USER</Badge>
      case 'awaiting_response':
        return <Badge variant="warning" dot>AWAITING RESPONSE</Badge>
      case 'follow_up_required':
        return <Badge variant="critical" dot>FOLLOW-UP REQUIRED</Badge>
      case 'resolved':
        return <Badge variant="safe" dot>RESOLVED</Badge>
      case 'ready_for_submission':
        return <Badge variant="primary">READY FOR SUBMISSION</Badge>
      case 'draft':
      default:
        return <Badge variant="neutral">DRAFT</Badge>
    }
  }

  const filteredCases = useMemo(() => {
    if (!searchFilter.trim()) return cases
    const q = searchFilter.toLowerCase()
    return cases.filter(
      (c) =>
        c.incident_title.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q) ||
        c.reporting_references.some((r) => r.ref_number.toLowerCase().includes(q))
    )
  }, [cases, searchFilter])

  return (
    <div className="space-y-8 text-left max-w-7xl mx-auto pb-12">
      {/* 1. CASE MANAGEMENT HEADER */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#171D35] via-[#0D1224] to-[#080B18] border border-[#A6AEC8]/18 rounded-3xl p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.6)]">
        <div className="pointer-events-none absolute -top-32 -left-32 w-80 h-80 bg-[#8B7CFF]/10 rounded-full blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -right-32 w-80 h-80 bg-[#52D6B2]/10 rounded-full blur-3xl" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-[#A6AEC8]/15">
          <div className="space-y-2">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="inline-flex items-center gap-2 text-xs font-mono font-bold text-[#8B7CFF] uppercase tracking-wider px-3 py-1 rounded-full bg-[#8B7CFF]/10 border border-[#8B7CFF]/25">
                <CheckSquare className="w-3.5 h-3.5" />
                User Case Tracking
              </span>
              <span className="text-xs text-[#52D6B2] font-mono flex items-center gap-1.5 bg-[#52D6B2]/10 px-2.5 py-0.5 rounded-full border border-[#52D6B2]/20">
                <ShieldCheck className="w-3.5 h-3.5" />
                Victim Controlled
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#F4F5FF] tracking-tight">
              Grievance &amp; Authority Case Lifecycle
            </h1>
            <p className="text-xs sm:text-sm text-[#A6AEC8] max-w-2xl leading-relaxed">
              User-controlled lifecycle tracking for reports submitted to platforms, authorities, or grievance officers.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link to="/reporting">
              <Button variant="primary" size="md" leftIcon={<PlusCircle className="w-4 h-4" />}>
                Record Official Submission
              </Button>
            </Link>
          </div>
        </div>

        {/* SUMMARY METRIC STRIP */}
        <div className="relative z-10 grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-[#A6AEC8]/15 pt-6 text-left">
          <div className="pr-4 pb-4 lg:pb-0">
            <span className="text-xs text-[#A6AEC8] font-medium uppercase tracking-wider block">Active Cases</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-extrabold font-mono text-[#F4F5FF]">{cases.length}</span>
              <span className="text-xs text-[#727D9C]">tracked cases</span>
            </div>
          </div>
          <div className="px-0 sm:px-4 pt-4 lg:pt-0 pb-4 lg:pb-0">
            <span className="text-xs text-[#A6AEC8] font-medium uppercase tracking-wider block">Active Submissions</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-extrabold font-mono text-[#8B7CFF]">
                {cases.filter((c) => c.status === 'submitted_by_user').length}
              </span>
              <span className="text-xs text-[#8B7CFF]">active</span>
            </div>
          </div>
          <div className="pr-4 pt-4 lg:pt-0">
            <span className="text-xs text-[#A6AEC8] font-medium uppercase tracking-wider block">Awaiting Review</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-extrabold font-mono text-[#F0B96B]">
                {cases.filter((c) => c.status === 'awaiting_response').length}
              </span>
              <span className="text-xs text-[#F0B96B]">pending</span>
            </div>
          </div>
          <div className="px-0 sm:px-4 pt-4 lg:pt-0">
            <span className="text-xs text-[#A6AEC8] font-medium uppercase tracking-wider block">Resolved &amp; Closed</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-extrabold font-mono text-[#52D6B2]">
                {cases.filter((c) => c.status === 'resolved').length}
              </span>
              <span className="text-xs text-[#52D6B2]">completed</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. FILTER & SEARCH BAR */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#171D35]/85 p-4 rounded-2xl border border-[#A6AEC8]/15 shadow-md">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[#A6AEC8] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Search by case ID, title or reference..."
            className="w-full bg-[#0D1224] border border-[#A6AEC8]/20 rounded-xl pl-9 pr-4 py-2 text-xs text-[#F4F5FF] placeholder-[#727D9C] focus:outline-none focus:border-[#8B7CFF]/60 font-mono"
          />
        </div>
      </div>

      {/* 3. CASE ITEMS LIST */}
      {isLoading ? (
        <div className="space-y-4 animate-pulse">
          {[1, 2].map((i) => (
            <div key={i} className="h-40 bg-[#171D35]/80 border border-[#A6AEC8]/10 rounded-2xl" />
          ))}
        </div>
      ) : filteredCases.length === 0 ? (
        <div className="p-12 text-center bg-[#171D35]/85 border border-[#A6AEC8]/15 rounded-3xl space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-[#0D1224] border border-[#A6AEC8]/20 flex items-center justify-center mx-auto text-[#8B7CFF]">
            <CheckSquare className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-[#F4F5FF]">No Cases Tracked Yet</h3>
          <p className="text-xs text-[#A6AEC8] max-w-sm mx-auto">
            {t.cases.emptyCases}
          </p>
          <div className="pt-2">
            <Link to="/incidents/new">
              <Button variant="primary" size="sm" leftIcon={<PlusCircle className="w-4 h-4" />}>
                Log an Incident First
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredCases.map((c) => (
            <div
              key={c.id}
              className="bg-[#171D35]/85 border border-[#A6AEC8]/15 hover:border-[#8B7CFF]/40 rounded-3xl p-6 transition-all duration-200 shadow-xl space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="space-y-2.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="font-mono text-xs text-[#8B7CFF] font-semibold bg-[#8B7CFF]/10 px-2.5 py-0.5 rounded-full border border-[#8B7CFF]/25">
                      {c.id}
                    </span>
                    <h3 className="text-sm sm:text-base font-bold text-[#F4F5FF] truncate">{c.incident_title}</h3>
                    {getStatusBadge(c.status)}
                  </div>

                  <p className="text-xs text-[#A6AEC8]">
                    Category: <span className="text-[#F4F5FF] capitalize font-medium">{c.incident_category.replace('_', ' ')}</span> • Created: <span className="font-mono">{formatDate(c.created_at)}</span>
                  </p>

                  {/* Lifecycle Stage Progress Bar */}
                  <div className="pt-1 pb-1">
                    {(() => {
                      const stages = ['draft', 'submitted_by_user', 'awaiting_response', 'resolved']
                      const stageIdx = Math.max(
                        0,
                        c.status === 'closed' || c.status === 'resolved'
                          ? 3
                          : c.status === 'awaiting_response' || c.status === 'follow_up_required'
                          ? 2
                          : c.status === 'submitted_by_user'
                          ? 1
                          : 0
                      )
                      const labels = ['Draft', 'Submitted', 'Under Review', 'Resolved']
                      return (
                        <div className="space-y-1.5 max-w-md">
                          <div className="grid grid-cols-4 gap-1.5">
                            {stages.map((st, idx) => (
                              <div
                                key={st}
                                className={`h-1.5 rounded-full transition-all ${
                                  idx <= stageIdx
                                    ? idx === stageIdx
                                      ? 'bg-[#55D6E8]'
                                      : 'bg-[#52D6B2]'
                                    : 'bg-[#080B18] border border-[#A6AEC8]/15'
                                }`}
                              />
                            ))}
                          </div>
                          <div className="grid grid-cols-4 text-[10px] font-mono text-[#727D9C]">
                            {labels.map((lbl, idx) => (
                              <span key={lbl} className={idx <= stageIdx ? 'text-[#A6AEC8]' : ''}>
                                {lbl}
                              </span>
                            ))}
                          </div>
                        </div>
                      )
                    })()}
                  </div>

                  {/* External Reporting Reference Numbers */}
                  {c.reporting_references.length > 0 ? (
                    <div className="pt-2 space-y-1.5">
                      <span className="text-[10px] font-semibold text-[#727D9C] uppercase tracking-wider block">
                        Official Submission References:
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {c.reporting_references.map((ref, idx) => (
                          <div
                            key={idx}
                            className="px-3 py-1.5 rounded-xl bg-[#0D1224] border border-[#A6AEC8]/20 text-xs flex items-center gap-2"
                          >
                            <Share2 className="w-3.5 h-3.5 text-[#648BFF]" />
                            <span className="text-[#A6AEC8] font-medium">{ref.destination}:</span>
                            <span className="font-mono text-[#55D6E8] font-semibold">{ref.ref_number}</span>
                            <span className="text-[10px] text-[#727D9C] font-mono">({ref.date})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-[11px] text-[#A6AEC8] pt-1">
                      No external filing reference recorded yet. Use the Reporting Assistant to record submission numbers.
                    </p>
                  )}

                  {c.notes && (
                    <div className="p-3 bg-[#0D1224] rounded-xl border border-[#A6AEC8]/15 text-xs text-[#F4F5FF] mt-2 leading-relaxed">
                      <span className="text-[#A6AEC8] font-semibold">Complainant Tracking Note: </span>
                      {c.notes}
                    </div>
                  )}

                  {c.follow_up_date && (
                    <div className="flex items-center gap-2 text-xs text-[#F0B96B] pt-1 font-mono">
                      <Clock className="w-3.5 h-3.5 text-[#F0B96B]" />
                      <span>Next Follow-up Reminder: {c.follow_up_date}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-auto">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleOpenStatusModal(c)}
                    leftIcon={<Edit2 className="w-3.5 h-3.5 text-[#8B7CFF]" />}
                  >
                    Update Status
                  </Button>
                  <Link to={`/incidents/${c.incident_id}`}>
                    <Button variant="ghost" size="sm" rightIcon={<ChevronRight className="w-3.5 h-3.5" />}>
                      View Incident
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Status Update Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Update Case Tracking Status"
        description="Update your local progress tracking for this case. This reflects your own records."
      >
        {selectedCase && (
          <form onSubmit={handleUpdateStatus} className="space-y-4">
            <div className="space-y-1.5 text-left">
              <label className="text-xs font-semibold text-[#A6AEC8]">Case Status *</label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value as CaseStatus)}
                className="w-full px-3.5 py-2.5 bg-[#0D1224] border border-[#A6AEC8]/20 rounded-xl text-xs text-[#F4F5FF] focus:outline-none focus:border-[#8B7CFF]/60 cursor-pointer"
              >
                <option value="draft">Draft (Not yet finalized)</option>
                <option value="prepared">Prepared (Ready for filing)</option>
                <option value="submitted_by_user">Submitted by User (Filed with authority/platform)</option>
                <option value="awaiting_response">Awaiting Response (Pending platform review)</option>
                <option value="follow_up_required">Follow-up Required (Requires reminder or escalation)</option>
                <option value="resolved">Resolved (Takedown complete / case closed)</option>
                <option value="closed">Closed (Archived)</option>
              </select>
            </div>

            <div className="space-y-1.5 text-left">
              <label className="text-xs font-semibold text-[#A6AEC8]">
                Tracking Notes / Log Entry
              </label>
              <textarea
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                rows={3}
                placeholder="e.g., Contacted grievance officer; they requested additional ID copy."
                className="w-full px-3.5 py-2.5 bg-[#0D1224] border border-[#A6AEC8]/20 rounded-xl text-xs text-[#F4F5FF] placeholder-[#727D9C] focus:outline-none focus:border-[#8B7CFF]/60"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-[#A6AEC8]/15">
              <Button type="button" variant="ghost" size="sm" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm">
                Save Tracking Status
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}
