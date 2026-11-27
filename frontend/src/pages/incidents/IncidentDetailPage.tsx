import React, { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  HardDrive,
  Cpu,
  FileText,
  ExternalLink,
  Shield,
  Upload,
  Clock,
  ShieldCheck,
  CheckCircle2,
  Copy,
  Check,
  Globe,
  Download,
} from 'lucide-react'
import { useI18n } from '../../contexts/I18nContext'
import { useToast } from '../../contexts/ToastContext'
import { apiClient } from '../../services/api/client'
import type { Incident, Evidence } from '../../types'
import { Button } from '../../components/common/Button'
import { Badge } from '../../components/common/Badge'
import { TimelineView } from '../../components/incidents/TimelineView'
import { formatDate, formatBytes } from '../../utils/crypto'

export const IncidentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const { t } = useI18n()
  const { showToast } = useToast()
  const navigate = useNavigate()

  const [incident, setIncident] = useState<Incident | null>(null)
  const [evidenceList, setEvidenceList] = useState<Evidence[]>([])
  const [activeTab, setActiveTab] = useState<'overview' | 'evidence' | 'timeline'>('overview')
  const [isLoading, setIsLoading] = useState(true)
  const [copiedHash, setCopiedHash] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    const fetchIncident = async () => {
      try {
        const inc = await apiClient.getIncidentById(id)
        if (inc) {
          setIncident(inc)
          const evi = await apiClient.getEvidenceByIncident(id)
          setEvidenceList(evi)
        }
      } finally {
        setIsLoading(false)
      }
    }
    fetchIncident()
  }, [id])

  const copyToClipboard = (hash: string) => {
    navigator.clipboard.writeText(hash)
    setCopiedHash(hash)
    showToast('SHA-256 fingerprint copied to clipboard.', 'info')
    setTimeout(() => setCopiedHash(null), 2500)
  }

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse text-left max-w-7xl mx-auto">
        <div className="h-10 bg-[#111716] rounded-xl w-1/3" />
        <div className="h-64 bg-[#111716]/80 rounded-2xl" />
      </div>
    )
  }

  if (!incident) {
    return (
      <div className="p-12 text-center max-w-xl mx-auto bg-[#111716] rounded-3xl border border-[rgba(225,239,221,0.15)] mt-10">
        <AlertCircle className="w-10 h-10 text-[#ff927e] mx-auto mb-3" />
        <h2 className="text-lg font-bold text-[#f0f2eb]">Incident Dossier Not Found</h2>
        <p className="text-xs text-[#929b93] mt-1">This incident record does not exist or was cleared from your session.</p>
        <Button variant="secondary" size="sm" className="mt-5" onClick={() => navigate('/incidents')}>
          Back to Incidents
        </Button>
      </div>
    )
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <Badge variant="warning" dot>ACTIVE / OPEN</Badge>
      case 'under_review':
        return <Badge variant="primary" dot>UNDER REVIEW</Badge>
      case 'resolved':
        return <Badge variant="safe" dot>RESOLVED</Badge>
      default:
        return <Badge variant="neutral">{status.toUpperCase()}</Badge>
    }
  }

  return (
    <div className="space-y-8 text-left max-w-7xl mx-auto pb-12">
      {/* 1. DOSSIER COMMAND HEADER */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#111716] via-[#0d1110] to-[#070908] border border-[rgba(225,239,221,0.16)] rounded-3xl p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.6)]">
        <div className="pointer-events-none absolute -top-32 -left-32 w-80 h-80 bg-[#d5ff54]/10 rounded-full blur-3xl" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-[rgba(225,239,221,0.15)]">
          <div className="space-y-2">
            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={() => navigate('/incidents')}
                className="text-xs text-[#929b93] hover:text-[#d5ff54] flex items-center gap-1 font-mono transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Incidents
              </button>
              <span className="text-[#929b93]">•</span>
              <span className="text-xs font-mono text-[#d5ff54] bg-[#d5ff54]/10 px-2.5 py-0.5 rounded-full border border-[#d5ff54]/25">
                ID: {incident.id}
              </span>
              {getStatusBadge(incident.status)}
            </div>
            <h1 className="font-display text-3xl sm:text-4xl uppercase font-extrabold text-[#f0f2eb] tracking-[0.02em]">
              {incident.title}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-xs text-[#929b93]">
              <span>Platform: <strong className="text-[#f0f2eb] font-mono">{incident.platform}</strong></span>
              <span>•</span>
              <span>Category: <strong className="text-[#f0f2eb] capitalize">{incident.category.replace('_', ' ')}</strong></span>
              <span>•</span>
              <span>Logged: <strong className="text-[#f0f2eb] font-mono">{formatDate(incident.incident_date || incident.created_at)}</strong></span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 flex-wrap sm:flex-nowrap">
            <Link to={`/complaints?incidentId=${incident.id}`}>
              <Button variant="primary" size="md" leftIcon={<FileText className="w-4 h-4" />}>
                Draft Complaint Letter
              </Button>
            </Link>
            <Link to={`/evidence?incidentId=${incident.id}`}>
              <Button variant="secondary" size="md" leftIcon={<Upload className="w-4 h-4 text-[#d5ff54]" />}>
                Upload Evidence
              </Button>
            </Link>
          </div>
        </div>

        {/* TABS BAR */}
        <div className="flex items-center gap-3 pt-6">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all ${
              activeTab === 'overview'
                ? 'bg-[#d5ff54]/20 text-[#d5ff54] border border-[#d5ff54]/30 shadow-md'
                : 'text-[#929b93] hover:text-[#f0f2eb]'
            }`}
          >
            Overview &amp; Facts
          </button>
          <button
            onClick={() => setActiveTab('evidence')}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all ${
              activeTab === 'evidence'
                ? 'bg-[#d5ff54]/20 text-[#d5ff54] border border-[#d5ff54]/30 shadow-md'
                : 'text-[#929b93] hover:text-[#f0f2eb]'
            }`}
          >
            Evidence Files ({evidenceList.length})
          </button>
          <button
            onClick={() => setActiveTab('timeline')}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all ${
              activeTab === 'timeline'
                ? 'bg-[#d5ff54]/20 text-[#d5ff54] border border-[#d5ff54]/30 shadow-md'
                : 'text-[#929b93] hover:text-[#f0f2eb]'
            }`}
          >
            Activity &amp; Timeline
          </button>
        </div>
      </div>

      {/* 2. TAB CONTENT PANELS */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 bg-[#111716]/85 border border-[rgba(225,239,221,0.15)] rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-[#f0f2eb] uppercase tracking-wider">
                What Happened (Incident Narrative)
              </h3>
              <p className="text-xs text-[#f0f2eb] leading-relaxed bg-[#0d1110] p-5 rounded-2xl border border-[rgba(225,239,221,0.15)] whitespace-pre-wrap">
                {incident.description}
              </p>
            </div>

            {incident.relevant_urls && incident.relevant_urls.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-bold text-[#f0f2eb] uppercase tracking-wider">
                  Relevant Links &amp; Profiles
                </h3>
                <div className="space-y-1.5">
                  {incident.relevant_urls.map((u, i) => (
                    <a
                      key={i}
                      href={u}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="block p-3 rounded-xl bg-[#0d1110] border border-[rgba(225,239,221,0.15)] text-xs text-[#d5ff54] hover:underline font-mono truncate"
                    >
                      {u}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-4 space-y-4">
            <div className="bg-[#111716]/85 border border-[rgba(225,239,221,0.15)] rounded-3xl p-5 space-y-4 shadow-xl">
              <h3 className="text-xs font-bold text-[#f0f2eb] uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#a8db35]" />
                Legal Framework &amp; Rights
              </h3>
              <p className="text-xs text-[#929b93] leading-relaxed">
                Based on what you reported, here are the applicable provisions under Indian law to protect you:
              </p>
              <div className="space-y-2 text-xs">
                <div className="p-3 bg-[#0d1110] rounded-xl border border-[rgba(225,239,221,0.15)]">
                  <strong className="text-[#d5ff54] font-mono block">Information Technology Act</strong>
                  <span className="text-[#929b93] text-[11px]">Sec 66D (Cheating by personation) &amp; Sec 66E (Privacy violation)</span>
                </div>
                <div className="p-3 bg-[#0d1110] rounded-xl border border-[rgba(225,239,221,0.15)]">
                  <strong className="text-[#a8db35] font-mono block">IT Rules 2021 (Rule 3(2)(b))</strong>
                  <span className="text-[#929b93] text-[11px]">Mandatory 24-hr takedown obligation for intermediary platforms.</span>
                </div>
                <div className="p-3 bg-[#0d1110] rounded-xl border border-[rgba(225,239,221,0.15)]">
                  <strong className="text-[#ff927e] font-mono block">Bharatiya Nyaya Sanhita (BNS)</strong>
                  <span className="text-[#929b93] text-[11px]">Sec 78 (Stalking) / Sec 79 (Word or gesture insulting modesty).</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'evidence' && (
        <div className="space-y-4">
          {evidenceList.length === 0 ? (
            <div className="p-12 text-center bg-[#111716]/85 border border-[rgba(225,239,221,0.15)] rounded-3xl space-y-3">
              <HardDrive className="w-10 h-10 text-[#929b93] mx-auto" />
              <h3 className="text-sm font-semibold text-[#f0f2eb]">No Evidence Files Attached Yet</h3>
              <p className="text-xs text-[#929b93]">Upload screenshots, messages, or recordings to protect them with tamper-proof verification.</p>
              <Link to={`/evidence?incidentId=${incident.id}`}>
                <Button variant="primary" size="sm" leftIcon={<Upload className="w-4 h-4" />}>
                  Upload Evidence Now
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {evidenceList.map((evi) => (
                <div
                  key={evi.id}
                  className="p-5 bg-[#111716]/85 border border-[rgba(225,239,221,0.15)] rounded-2xl space-y-3 shadow-md"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-[#f0f2eb] truncate max-w-xs">{evi.original_filename}</h4>
                      <p className="text-[10px] text-[#929b93] font-mono">{formatBytes(evi.file_size)} • {formatDate(evi.upload_timestamp)}</p>
                    </div>
                    <Badge variant="safe" size="sm" dot>Verified</Badge>
                  </div>
                  <div className="p-2.5 bg-[#070908] rounded-xl border border-[rgba(225,239,221,0.15)] text-[10px] font-mono space-y-1">
                    <div className="flex items-center justify-between text-[#929b93]">
                      <span>File Integrity (SHA-256):</span>
                      <button onClick={() => copyToClipboard(evi.sha256_hash)} className="text-[#d5ff54]">
                        {copiedHash === evi.sha256_hash ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                    <p className="text-[#d5ff54] break-all">{evi.sha256_hash}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'timeline' && (
        <div className="bg-[#111716]/85 border border-[rgba(225,239,221,0.15)] rounded-3xl p-6 sm:p-8 shadow-xl">
          <TimelineView incidentId={incident.id} />
        </div>
      )}
    </div>
  )
}
