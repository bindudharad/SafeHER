import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Briefcase, ShieldCheck, Users, FileText, Activity, ArrowLeft, CheckCircle2 } from 'lucide-react'
import { apiClient as api } from '../../services/api/client'
import type { CaseWorkspaceData, InvestigationSummaryReport } from '../../types'

export const CaseWorkspacePage: React.FC = () => {
  const { caseId } = useParams<{ caseId: string }>()
  const [workspace, setWorkspace] = useState<CaseWorkspaceData | null>(null)
  const [summary, setSummary] = useState<InvestigationSummaryReport | null>(null)
  const [tab, setTab] = useState<'overview' | 'evidence' | 'collaborators' | 'notes' | 'summary'>('overview')
  const [nextStatus, setNextStatus] = useState('under_review')
  const [transitionReason, setTransitionReason] = useState('')
  const [noteContent, setNoteContent] = useState('')
  const [collabEmail, setCollabEmail] = useState('')
  const [collabRole, setCollabRole] = useState<'collaborator' | 'investigator' | 'legal_adviser'>('collaborator')
  const [custodyCheck, setCustodyCheck] = useState<Record<string, unknown> | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadWorkspace = async () => {
    if (!caseId) return
    setError(null)
    try {
      const data = await api.getCaseWorkspace(caseId)
      setWorkspace(data)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unable to load case workspace.')
    }
  }

  useEffect(() => {
    loadWorkspace()
  }, [caseId])

  const handleTransition = async () => {
    if (!caseId) return
    try {
      await api.transitionCaseStatus(caseId, nextStatus, transitionReason)
      setTransitionReason('')
      await loadWorkspace()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Status transition failed.')
    }
  }

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!caseId || !noteContent.trim()) return
    try {
      await api.addCaseNote(caseId, noteContent.trim())
      setNoteContent('')
      await loadWorkspace()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to add note.')
    }
  }

  const handleAssignCollaborator = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!caseId || !collabEmail.trim()) return
    try {
      await api.assignCaseCollaborator(caseId, collabEmail.trim(), collabRole)
      setCollabEmail('')
      await loadWorkspace()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to assign collaborator.')
    }
  }

  const handleRevoke = async (userId: string) => {
    if (!caseId) return
    try {
      await api.revokeCaseCollaborator(caseId, userId)
      await loadWorkspace()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to revoke collaborator.')
    }
  }

  const handleGenerateSummary = async () => {
    if (!caseId) return
    try {
      const rep = await api.getInvestigationSummary(caseId)
      setSummary(rep)
      setTab('summary')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to generate investigation summary.')
    }
  }

  const handleVerifyCustody = async (evidenceId: string) => {
    try {
      const res = await api.verifyEvidenceCustody(evidenceId)
      setCustodyCheck(res)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Custody verification failed.')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Link to="/cases" className="text-xs text-[#8B7CFF] flex items-center gap-1 mb-2">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Case Tracking
          </Link>
          <h1 className="text-2xl font-bold text-[#F4F5FF] flex items-center gap-2.5">
            <Briefcase className="w-6 h-6 text-[#8B7CFF]" />
            {workspace?.case.title || `Case ${caseId}`}
          </h1>
          <p className="text-xs text-[#A6AEC8] mt-1 font-mono">
            Status: {workspace?.case.status || '...'} • Your Role: {workspace?.viewer_role || '...'}
          </p>
        </div>

        <button
          onClick={handleGenerateSummary}
          className="px-4 py-2 rounded-xl bg-[#8B7CFF] hover:bg-[#7A69FF] text-white text-xs font-semibold"
        >
          Generate Investigation Summary
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-[#A6AEC8]/15 pb-3">
        {[
          { id: 'overview', label: 'Overview & Lifecycle', icon: Activity },
          { id: 'evidence', label: 'Evidence & Custody', icon: ShieldCheck },
          { id: 'collaborators', label: 'Collaborators', icon: Users },
          { id: 'notes', label: 'Investigation Notes', icon: FileText },
          { id: 'summary', label: 'Forensic Summary', icon: CheckCircle2 },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as typeof tab)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium ${
              tab === t.id ? 'bg-[#1D2540] text-[#8B7CFF] border border-[#8B7CFF]/30' : 'text-[#A6AEC8] hover:text-[#F4F5FF]'
            }`}
          >
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {workspace && tab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-[#12172B] border border-[#A6AEC8]/15 rounded-2xl p-4 space-y-3">
            <h2 className="text-sm font-semibold text-[#F4F5FF]">Case Lifecycle Transition</h2>
            <div className="flex flex-col gap-2">
              <select
                value={nextStatus}
                onChange={(e) => setNextStatus(e.target.value)}
                className="bg-[#0B0F1E] border border-[#A6AEC8]/20 rounded-xl px-3 py-2 text-xs text-[#F4F5FF]"
              >
                <option value="open">open</option>
                <option value="evidence_collection">evidence_collection</option>
                <option value="under_review">under_review</option>
                <option value="ready_for_submission">ready_for_submission</option>
                <option value="submitted">submitted</option>
                <option value="resolved">resolved</option>
                <option value="closed">closed</option>
                <option value="archived">archived</option>
              </select>
              <input
                type="text"
                value={transitionReason}
                onChange={(e) => setTransitionReason(e.target.value)}
                placeholder="Reason for transition (recorded in audit trail)"
                className="bg-[#0B0F1E] border border-[#A6AEC8]/20 rounded-xl px-3 py-2 text-xs text-[#F4F5FF]"
              />
              <button
                onClick={handleTransition}
                className="px-4 py-2 rounded-xl bg-[#8B7CFF] text-white text-xs font-semibold"
              >
                Apply Transition
              </button>
            </div>
          </div>

          <div className="bg-[#12172B] border border-[#A6AEC8]/15 rounded-2xl p-4 space-y-2">
            <h2 className="text-sm font-semibold text-[#F4F5FF]">Recent Case Activity</h2>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {workspace.activity.map((a) => (
                <div key={a.id} className="p-2.5 rounded-xl bg-[#0B0F1E] text-xs text-[#A6AEC8]">
                  <span className="font-mono text-[#8B7CFF]">{a.action}</span>
                  {a.from_status && a.to_status ? ` (${a.from_status} -> ${a.to_status})` : ''}
                  {a.reason ? ` — ${a.reason}` : ''}
                  <div className="text-[10px] text-[#727D9C] mt-0.5">{a.created_at}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {workspace && tab === 'evidence' && (
        <div className="bg-[#12172B] border border-[#A6AEC8]/15 rounded-2xl p-4 space-y-3">
          <h2 className="text-sm font-semibold text-[#F4F5FF]">Linked Evidence &amp; Custody Chain</h2>
          {workspace.evidence.map((e) => (
            <div key={e.id} className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 rounded-xl bg-[#0B0F1E] text-xs">
              <div>
                <div className="font-semibold text-[#F4F5FF]">{e.original_filename}</div>
                <div className="font-mono text-[#727D9C]">SHA-256: {e.sha256_hash}</div>
              </div>
              <button
                onClick={() => handleVerifyCustody(e.id)}
                className="px-3 py-1.5 rounded-lg bg-[#1D2540] text-[#8B7CFF] text-xs"
              >
                Verify Custody Chain
              </button>
            </div>
          ))}
          {custodyCheck && (
            <pre className="p-3 rounded-xl bg-[#0B0F1E] text-[11px] text-emerald-300 overflow-x-auto">
              {JSON.stringify(custodyCheck, null, 2)}
            </pre>
          )}
        </div>
      )}

      {workspace && tab === 'collaborators' && (
        <div className="bg-[#12172B] border border-[#A6AEC8]/15 rounded-2xl p-4 space-y-4">
          <form onSubmit={handleAssignCollaborator} className="flex flex-wrap gap-2">
            <input
              type="email"
              value={collabEmail}
              onChange={(e) => setCollabEmail(e.target.value)}
              placeholder="Collaborator user email"
              className="flex-1 bg-[#0B0F1E] border border-[#A6AEC8]/20 rounded-xl px-3 py-2 text-xs text-[#F4F5FF]"
              required
            />
            <select
              value={collabRole}
              onChange={(e) => setCollabRole(e.target.value as 'collaborator' | 'investigator' | 'legal_adviser')}
              className="bg-[#0B0F1E] border border-[#A6AEC8]/20 rounded-xl px-3 py-2 text-xs text-[#F4F5FF]"
            >
              <option value="collaborator">collaborator</option>
              <option value="investigator">investigator</option>
              <option value="legal_adviser">legal_adviser</option>
            </select>
            <button type="submit" className="px-4 py-2 rounded-xl bg-[#8B7CFF] text-white text-xs font-semibold">
              Assign
            </button>
          </form>

          <div className="space-y-2">
            {workspace.collaborators.map((c) => (
              <div key={c.id} className="flex items-center justify-between p-3 rounded-xl bg-[#0B0F1E] text-xs">
                <div>
                  <span className="font-semibold text-[#F4F5FF]">{c.user_name}</span> ({c.user_email}) — <span className="font-mono text-[#8B7CFF]">{c.role}</span> [{c.status}]
                </div>
                {c.status === 'active' && (
                  <button
                    onClick={() => handleRevoke(c.user_id)}
                    className="px-2.5 py-1 rounded-lg bg-rose-500/15 text-rose-300 text-xs"
                  >
                    Revoke
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {workspace && tab === 'notes' && (
        <div className="bg-[#12172B] border border-[#A6AEC8]/15 rounded-2xl p-4 space-y-4">
          <form onSubmit={handleAddNote} className="flex gap-2">
            <input
              type="text"
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              placeholder="Add human investigation note..."
              className="flex-1 bg-[#0B0F1E] border border-[#A6AEC8]/20 rounded-xl px-3 py-2 text-xs text-[#F4F5FF]"
              required
            />
            <button type="submit" className="px-4 py-2 rounded-xl bg-[#8B7CFF] text-white text-xs font-semibold">
              Save Note
            </button>
          </form>
          <div className="space-y-2">
            {workspace.case_notes.map((n) => (
              <div key={n.id} className="p-3 rounded-xl bg-[#0B0F1E] text-xs text-[#CBD5E1]">
                <div className="text-[10px] font-mono text-[#727D9C] mb-1">
                  {n.note_type} • {n.created_at}
                </div>
                {n.content}
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'summary' && summary && (
        <div className="bg-[#12172B] border border-[#A6AEC8]/15 rounded-2xl p-4 space-y-3 text-xs text-[#A6AEC8]">
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200">
            {summary.disclaimer}
          </div>
          <pre className="p-3 rounded-xl bg-[#0B0F1E] text-[11px] overflow-x-auto">
            {JSON.stringify(summary, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}
