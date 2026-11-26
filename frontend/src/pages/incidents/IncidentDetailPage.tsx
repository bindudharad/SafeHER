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
        <div className="h-10 bg-[#171D35] rounded-xl w-1/3" />
        <div className="h-64 bg-[#171D35]/80 rounded-2xl" />
      </div>
    )
  }

  if (!incident) {
    return (
      <div className="p-12 text-center max-w-xl mx-auto bg-[#171D35] rounded-3xl border border-[#A6AEC8]/15 mt-10">
        <AlertCircle className="w-10 h-10 text-[#FF718A] mx-auto mb-3" />
        <h2 className="text-lg font-bold text-[#F4F5FF]">Incident Dossier Not Found</h2>
        <p className="text-xs text-[#A6AEC8] mt-1">This incident record does not exist or was cleared from your session.</p>
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
      <div className="relative overflow-hidden bg-gradient-to-br from-[#171D35] via-[#0D1224] to-[#080B18] border border-[#A6AEC8]/18 rounded-3xl p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.6)]">
        <div className="pointer-events-none absolute -top-32 -left-32 w-80 h-80 bg-[#8B7CFF]/10 rounded-full blur-3xl" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-[#A6AEC8]/15">
          <div className="space-y-2">
            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={() => navigate('/incidents')}
                className="text-xs text-[#A6AEC8] hover:text-[#8B7CFF] flex items-center gap-1 font-mono transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Dossiers
              </button>
              <span className="text-[#727D9C]">•</span>
              <span className="text-xs font-mono text-[#8B7CFF] bg-[#8B7CFF]/10 px-2.5 py-0.5 rounded-full border border-[#8B7CFF]/25">
                ID: {incident.id}
              </span>
              {getStatusBadge(incident.status)}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#F4F5FF] tracking-tight">
              {incident.title}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-xs text-[#A6AEC8]">
              <span>Platform: <strong className="text-[#F4F5FF] font-mono">{incident.platform}</strong></span>
              <span>•</span>
              <span>Category: <strong className="text-[#F4F5FF] capitalize">{incident.category.replace('_', ' ')}</strong></span>
              <span>•</span>
              <span>Logged: <strong className="text-[#F4F5FF] font-mono">{formatDate(incident.incident_date || incident.created_at)}</strong></span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 flex-wrap sm:flex-nowrap">
            <Link to={`/complaints?incidentId=${incident.id}`}>
              <Button variant="primary" size="md" leftIcon={<FileText className="w-4 h-4" />}>
                Generate Formal Complaint
              </Button>
            </Link>
            <Link to={`/evidence?incidentId=${incident.id}`}>
              <Button variant="secondary" size="md" leftIcon={<Upload className="w-4 h-4 text-[#8B7CFF]" />}>
                Deposit Evidence
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
                ? 'bg-[#8B7CFF]/20 text-[#8B7CFF] border border-[#8B7CFF]/30 shadow-md'
                : 'text-[#A6AEC8] hover:text-[#F4F5FF]'
            }`}
          >
            Dossier Overview &amp; Facts
          </button>
          <button
            onClick={() => setActiveTab('evidence')}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all ${
              activeTab === 'evidence'
                ? 'bg-[#8B7CFF]/20 text-[#8B7CFF] border border-[#8B7CFF]/30 shadow-md'
                : 'text-[#A6AEC8] hover:text-[#F4F5FF]'
            }`}
          >
            Preserved Evidence ({evidenceList.length})
          </button>
          <button
            onClick={() => setActiveTab('timeline')}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all ${
              activeTab === 'timeline'
                ? 'bg-[#8B7CFF]/20 text-[#8B7CFF] border border-[#8B7CFF]/30 shadow-md'
                : 'text-[#A6AEC8] hover:text-[#F4F5FF]'
            }`}
          >
            Action Timeline &amp; Audit Trail
          </button>
        </div>
      </div>

      {/* 2. TAB CONTENT PANELS */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 bg-[#171D35]/85 border border-[#A6AEC8]/15 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-[#F4F5FF] uppercase tracking-wider">
                Factual Narrative
              </h3>
              <p className="text-xs text-[#F4F5FF] leading-relaxed bg-[#0D1224] p-5 rounded-2xl border border-[#A6AEC8]/15 whitespace-pre-wrap">
                {incident.description}
              </p>
            </div>

            {incident.relevant_urls && incident.relevant_urls.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-bold text-[#F4F5FF] uppercase tracking-wider">
                  Associated Links &amp; Profiles
                </h3>
                <div className="space-y-1.5">
                  {incident.relevant_urls.map((u, i) => (
                    <a
                      key={i}
                      href={u}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="block p-3 rounded-xl bg-[#0D1224] border border-[#A6AEC8]/15 text-xs text-[#55D6E8] hover:underline font-mono truncate"
                    >
                      {u}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-4 space-y-4">
            <div className="bg-[#171D35]/85 border border-[#A6AEC8]/15 rounded-3xl p-5 space-y-4 shadow-xl">
              <h3 className="text-xs font-bold text-[#F4F5FF] uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#52D6B2]" />
                Legal Framework Applicability
              </h3>
              <p className="text-xs text-[#A6AEC8] leading-relaxed">
                Based on the reported facts and platform, the following statutory provisions are relevant:
              </p>
              <div className="space-y-2 text-xs">
                <div className="p-3 bg-[#0D1224] rounded-xl border border-[#A6AEC8]/15">
                  <strong className="text-[#8B7CFF] font-mono block">Information Technology Act</strong>
                  <span className="text-[#A6AEC8] text-[11px]">Sec 66D (Cheating by personation) &amp; Sec 66E (Privacy violation)</span>
                </div>
                <div className="p-3 bg-[#0D1224] rounded-xl border border-[#A6AEC8]/15">
                  <strong className="text-[#52D6B2] font-mono block">IT Rules 2021 (Rule 3(2)(b))</strong>
                  <span className="text-[#A6AEC8] text-[11px]">Mandatory 24-hr takedown obligation for intermediary platforms.</span>
                </div>
                <div className="p-3 bg-[#0D1224] rounded-xl border border-[#A6AEC8]/15">
                  <strong className="text-[#F0B96B] font-mono block">Bharatiya Nyaya Sanhita (BNS)</strong>
                  <span className="text-[#A6AEC8] text-[11px]">Sec 78 (Stalking) / Sec 79 (Word or gesture insulting modesty).</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'evidence' && (
        <div className="space-y-4">
          {evidenceList.length === 0 ? (
            <div className="p-12 text-center bg-[#171D35]/85 border border-[#A6AEC8]/15 rounded-3xl space-y-3">
              <HardDrive className="w-10 h-10 text-[#A6AEC8] mx-auto" />
              <h3 className="text-sm font-semibold text-[#F4F5FF]">No Evidence Preserved for this Dossier</h3>
              <p className="text-xs text-[#A6AEC8]">Upload screenshots or recordings to lock their SHA-256 fingerprints.</p>
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
                  className="p-5 bg-[#171D35]/85 border border-[#A6AEC8]/15 rounded-2xl space-y-3 shadow-md"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-[#F4F5FF] truncate max-w-xs">{evi.original_filename}</h4>
                      <p className="text-[10px] text-[#A6AEC8] font-mono">{formatBytes(evi.file_size)} • {formatDate(evi.upload_timestamp)}</p>
                    </div>
                    <Badge variant="safe" size="sm" dot>Verified</Badge>
                  </div>
                  <div className="p-2.5 bg-[#080B18] rounded-xl border border-[#A6AEC8]/15 text-[10px] font-mono space-y-1">
                    <div className="flex items-center justify-between text-[#A6AEC8]">
                      <span>SHA-256 Fingerprint:</span>
                      <button onClick={() => copyToClipboard(evi.sha256_hash)} className="text-[#8B7CFF]">
                        {copiedHash === evi.sha256_hash ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                    <p className="text-[#55D6E8] break-all">{evi.sha256_hash}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'timeline' && (
        <div className="bg-[#171D35]/85 border border-[#A6AEC8]/15 rounded-3xl p-6 sm:p-8 shadow-xl">
          <TimelineView incidentId={incident.id} />
        </div>
      )}
    </div>
  )
}
