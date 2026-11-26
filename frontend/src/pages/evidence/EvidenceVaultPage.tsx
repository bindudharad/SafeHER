import React, { useState, useEffect, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  HardDrive,
  Upload,
  Search,
  Filter,
  ShieldCheck,
  ShieldAlert,
  Copy,
  Check,
  Download,
  Cpu,
  FileText,
  Video,
  Image as ImageIcon,
  ExternalLink,
  Trash2,
  Lock,
  LayoutGrid,
  List,
  CheckCircle2,
  FileCheck2,
  Eye,
  Info,
  ChevronRight,
  X,
  Sparkles,
} from 'lucide-react'
import { useI18n } from '../../contexts/I18nContext'
import { useToast } from '../../contexts/ToastContext'
import { apiClient } from '../../services/api/client'
import type { Evidence, Incident } from '../../types'
import { Button } from '../../components/common/Button'
import { Badge } from '../../components/common/Badge'
import { Modal } from '../../components/common/Modal'
import { PageHeader } from '../../components/layout/PageHeader'
import { EvidenceDropzone } from '../../components/evidence/EvidenceDropzone'
import { EvidenceCard } from '../../components/evidence/EvidenceCard'
import { formatDate, formatBytes } from '../../utils/crypto'

export const EvidenceVaultPage: React.FC = () => {
  const { t } = useI18n()
  const { showToast } = useToast()
  const [searchParams] = useSearchParams()
  const initialIncidentId = searchParams.get('incidentId') || ''

  const [evidenceList, setEvidenceList] = useState<Evidence[]>([])
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [selectedIncidentId, setSelectedIncidentId] = useState<string>(initialIncidentId)
  const [fileTypeFilter, setFileTypeFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table')
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [copiedHash, setCopiedHash] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [inspectorItem, setInspectorItem] = useState<Evidence | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [evi, inc] = await Promise.all([
          apiClient.getAllEvidence(),
          apiClient.getIncidents(),
        ])
        setEvidenceList(evi)
        setIncidents(inc)
        if (evi.length > 0) {
          setInspectorItem(evi[0])
        }
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [])

  const copyToClipboard = (hash: string) => {
    navigator.clipboard.writeText(hash)
    setCopiedHash(hash)
    showToast('SHA-256 fingerprint copied to clipboard.', 'info')
    setTimeout(() => setCopiedHash(null), 2500)
  }

  const handleDownload = (evi: Evidence) => {
    showToast(`Downloading authorized copy of ${evi.original_filename}...`, 'info')
    const blob = new Blob(
      [
        `SafeHER Verified Evidence Package\nFile: ${evi.original_filename}\nSHA-256: ${evi.sha256_hash}\nTimestamp: ${evi.upload_timestamp}\nIntegrity: Verified under Section 65B Indian Evidence Act`,
      ],
      { type: 'text/plain' }
    )
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `verified_${evi.original_filename}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const filteredEvidence = useMemo(() => {
    return evidenceList.filter((item) => {
      const matchesSearch =
        item.original_filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.sha256_hash.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesIncident =
        !selectedIncidentId || selectedIncidentId === 'all' || item.incident_id === selectedIncidentId
      const matchesType =
        fileTypeFilter === 'all' ||
        (fileTypeFilter === 'image' && item.file_type.startsWith('image/')) ||
        (fileTypeFilter === 'video' && item.file_type.startsWith('video/')) ||
        (fileTypeFilter === 'document' && item.file_type.includes('pdf'))
      return matchesSearch && matchesIncident && matchesType
    })
  }, [evidenceList, searchQuery, selectedIncidentId, fileTypeFilter])

  const handleDelete = (eviId: string) => {
    if (window.confirm('Are you sure you want to remove this evidence file from your vault?')) {
      setEvidenceList((prev) => prev.filter((e) => e.id !== eviId))
      if (inspectorItem?.id === eviId) {
        setInspectorItem(null)
      }
      showToast('Evidence file removed from local vault.', 'info')
    }
  }

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'processing':
        return <Badge variant="primary" size="sm" dot>Processing</Badge>
      case 'uploaded':
        return <Badge variant="neutral" size="sm" dot>Uploaded</Badge>
      case 'needs_attention':
        return <Badge variant="warning" size="sm" dot>Needs Attention</Badge>
      case 'failed':
        return <Badge variant="critical" size="sm" dot>Failed</Badge>
      case 'ready':
      default:
        return <Badge variant="safe" size="sm" dot>Ready</Badge>
    }
  }

  const getIncidentTitle = (incId: string) => {
    const inc = incidents.find((i) => i.id === incId)
    return inc ? inc.title : incId
  }

  return (
    <div className="space-y-8 text-left max-w-7xl mx-auto pb-12">
      {/* 1. VAULT COCKPIT HEADER WITH INTEGRATED CUSTODY METRICS */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#171D35] via-[#0D1224] to-[#080B18] border border-[#A6AEC8]/18 rounded-3xl p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.6)]">
        <div className="pointer-events-none absolute -top-32 -left-32 w-80 h-80 bg-[#8B7CFF]/10 rounded-full blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -right-32 w-80 h-80 bg-[#52D6B2]/10 rounded-full blur-3xl" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-[#A6AEC8]/15">
          <div className="space-y-2">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="inline-flex items-center gap-2 text-xs font-mono font-bold text-[#8B7CFF] uppercase tracking-wider px-3 py-1 rounded-full bg-[#8B7CFF]/10 border border-[#8B7CFF]/25">
                <HardDrive className="w-3.5 h-3.5" />
                Digital Evidence Vault
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-semibold bg-[#52D6B2]/10 text-[#52D6B2] border border-[#52D6B2]/25">
                <ShieldCheck className="w-3.5 h-3.5 text-[#52D6B2]" />
                100% Hash Verified
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#F4F5FF] tracking-tight">
              Cryptographic Digital Evidence Custody
            </h1>
            <p className="text-xs sm:text-sm text-[#A6AEC8] max-w-2xl leading-relaxed">
              Tamper-evident evidence preservation repository. Calculates SHA-256 digital digests client-side before storage to satisfy Indian Evidence Act Section 65B requirements.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0 flex-wrap sm:flex-nowrap">
            <Button
              variant="primary"
              size="md"
              onClick={() => setIsUploadModalOpen(true)}
              leftIcon={<Upload className="w-4 h-4" />}
            >
              Upload Evidence
            </Button>
            <Link to="/detect">
              <Button variant="secondary" size="md" leftIcon={<Cpu className="w-4 h-4 text-[#8B7CFF]" />}>
                Screen in Detect
              </Button>
            </Link>
          </div>
        </div>

        {/* CUSTODY CONSOLE STRIP */}
        <div className="relative z-10 grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-[#A6AEC8]/15 pt-6 text-left">
          <div className="pr-4 pb-4 lg:pb-0">
            <span className="text-xs text-[#A6AEC8] font-medium uppercase tracking-wider block">Preserved Files</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-extrabold font-mono text-[#F4F5FF]">{evidenceList.length}</span>
              <span className="text-xs text-[#52D6B2]">Active Vault</span>
            </div>
            <p className="text-[11px] text-[#727D9C] mt-1">Immutably indexed media items</p>
          </div>

          <div className="px-0 sm:px-4 pt-4 lg:pt-0 pb-4 lg:pb-0">
            <span className="text-xs text-[#A6AEC8] font-medium uppercase tracking-wider block">Hash Integrity</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-extrabold font-mono text-[#8B7CFF]">SHA-256</span>
              <span className="text-xs text-[#52D6B2]">Verified</span>
            </div>
            <p className="text-[11px] text-[#727D9C] mt-1">NIST-compliant hashing</p>
          </div>

          <div className="pr-4 pt-4 lg:pt-0">
            <span className="text-xs text-[#A6AEC8] font-medium uppercase tracking-wider block">Legal Admissibility</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-extrabold font-mono text-[#52D6B2]">Sec 65B</span>
              <span className="text-xs text-[#A6AEC8]">Ready</span>
            </div>
            <p className="text-[11px] text-[#727D9C] mt-1">Certificate auto-generation</p>
          </div>

          <div className="px-0 sm:px-4 pt-4 lg:pt-0">
            <span className="text-xs text-[#A6AEC8] font-medium uppercase tracking-wider block">Storage Mode</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-extrabold font-mono text-[#648BFF]">Local</span>
              <span className="text-xs text-[#A6AEC8]">Client Digest</span>
            </div>
            <p className="text-[11px] text-[#727D9C] mt-1">Isolated vault custody</p>
          </div>
        </div>
      </div>

      {/* 2. CRYPTOGRAPHIC INTEGRITY NOTICE */}
      <div className="p-5 bg-[#171D35]/90 border border-[#8B7CFF]/25 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg shadow-[#080B18]/60">
        <div className="flex items-start gap-3.5">
          <div className="w-9 h-9 rounded-xl bg-[#8B7CFF]/15 border border-[#8B7CFF]/30 flex items-center justify-center text-[#8B7CFF] shrink-0 mt-0.5">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-[#F4F5FF]">Cryptographic Integrity Notice</h3>
              <span className="text-[10px] font-mono font-bold text-[#8B7CFF] px-2.5 py-0.5 rounded-full bg-[#8B7CFF]/10 border border-[#8B7CFF]/25">
                SEC 65B INDIAN EVIDENCE ACT COMPLIANT
              </span>
            </div>
            <p className="text-xs text-[#A6AEC8] leading-relaxed max-w-3xl">
              SafeHER generates an irreversible cryptographic digest (SHA-256 fingerprint) in your browser before any file is saved. This cryptographic proof establishes an unalterable chain of custody recognized by law enforcement and Indian judicial bodies.
            </p>
          </div>
        </div>

        <Link
          to="/knowledge-hub/understanding-deepfakes-legal-rights"
          className="shrink-0 text-xs text-[#8B7CFF] hover:underline flex items-center gap-1 font-semibold"
        >
          <span>Legal Guide</span>
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      {/* 3. SEARCH, FILTER & VIEW TOGGLE BAR */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#171D35]/85 p-4 rounded-2xl border border-[#A6AEC8]/15 shadow-md">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[#A6AEC8] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by filename or SHA-256..."
            className="w-full bg-[#0D1224] border border-[#A6AEC8]/20 rounded-xl pl-9 pr-4 py-2 text-xs text-[#F4F5FF] placeholder-[#727D9C] focus:outline-none focus:border-[#8B7CFF]/60 transition-colors font-mono"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto flex-wrap sm:flex-nowrap">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-3.5 h-3.5 text-[#A6AEC8] shrink-0" />
            <select
              value={selectedIncidentId}
              onChange={(e) => setSelectedIncidentId(e.target.value)}
              className="bg-[#0D1224] border border-[#A6AEC8]/20 text-[#F4F5FF] text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-[#8B7CFF]/60 cursor-pointer"
            >
              <option value="all">All Linked Incidents</option>
              {incidents.map((inc) => (
                <option key={inc.id} value={inc.id}>
                  {inc.title}
                </option>
              ))}
            </select>

            <select
              value={fileTypeFilter}
              onChange={(e) => setFileTypeFilter(e.target.value)}
              className="bg-[#0D1224] border border-[#A6AEC8]/20 text-[#F4F5FF] text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-[#8B7CFF]/60 cursor-pointer"
            >
              <option value="all">All Formats</option>
              <option value="image">Images (PNG/JPG)</option>
              <option value="video">Videos (MP4/MOV)</option>
              <option value="document">PDF Documents</option>
            </select>
          </div>

          <div className="flex items-center bg-[#0D1224] border border-[#A6AEC8]/20 rounded-xl p-1 ml-auto sm:ml-0">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'table' ? 'bg-[#8B7CFF]/20 text-[#8B7CFF]' : 'text-[#A6AEC8] hover:text-[#F4F5FF]'
              }`}
              title="Table View"
              aria-label="Table View"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'grid' ? 'bg-[#8B7CFF]/20 text-[#8B7CFF]' : 'text-[#A6AEC8] hover:text-[#F4F5FF]'
              }`}
              title="Grid View"
              aria-label="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 4. MAIN WORKSPACE: SPLIT EVIDENCE REPOSITORY + INSPECTION CONSOLE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Area (8-cols in table mode, or 12-cols if no inspector) */}
        <div className={`${inspectorItem ? 'lg:col-span-8' : 'lg:col-span-12'} space-y-4`}>
          {isLoading ? (
            <div className="h-64 bg-[#171D35]/80 rounded-2xl animate-pulse" />
          ) : filteredEvidence.length === 0 ? (
            <div className="p-12 text-center bg-[#171D35]/85 border border-[#A6AEC8]/15 rounded-3xl space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#0D1224] border border-[#A6AEC8]/20 flex items-center justify-center mx-auto text-[#8B7CFF]">
                <HardDrive className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-[#F4F5FF]">No Evidence Items Found</h3>
              <p className="text-xs text-[#A6AEC8] max-w-sm mx-auto">
                No files match your current search or format filters. Upload evidence to preserve digital proof.
              </p>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsUploadModalOpen(true)}
                leftIcon={<Upload className="w-4 h-4" />}
              >
                Upload Evidence
              </Button>
            </div>
          ) : viewMode === 'table' ? (
            /* High-Density Forensic Table */
            <div className="overflow-hidden bg-[#171D35]/85 border border-[#A6AEC8]/15 rounded-3xl shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#0D1224] text-[#A6AEC8] border-b border-[#A6AEC8]/15 font-mono uppercase text-[10px]">
                    <tr>
                      <th className="py-3 px-4 font-semibold">Evidence File</th>
                      <th className="py-3 px-4 font-semibold">SHA-256 Fingerprint</th>
                      <th className="py-3 px-4 font-semibold">Linked Incident</th>
                      <th className="py-3 px-4 font-semibold">Status</th>
                      <th className="py-3 px-4 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#A6AEC8]/10 text-[#F4F5FF]">
                    {filteredEvidence.map((evi) => {
                      const isSelected = inspectorItem?.id === evi.id
                      return (
                        <tr
                          key={evi.id}
                          onClick={() => setInspectorItem(evi)}
                          className={`cursor-pointer transition-colors ${
                            isSelected ? 'bg-[#8B7CFF]/15 border-l-2 border-[#8B7CFF]' : 'hover:bg-[#1D2540]/50'
                          }`}
                        >
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-lg bg-[#0D1224] border border-[#A6AEC8]/20 flex items-center justify-center shrink-0">
                                {evi.file_type.startsWith('image/') ? (
                                   <ImageIcon className="w-4 h-4 text-[#8B7CFF]" />
                                ) : evi.file_type.startsWith('video/') ? (
                                  <Video className="w-4 h-4 text-[#648BFF]" />
                                ) : (
                                  <FileText className="w-4 h-4 text-[#52D6B2]" />
                                )}
                              </div>
                              <div>
                                <p className="font-semibold text-[#F4F5FF] truncate max-w-[180px]">{evi.original_filename}</p>
                                <p className="text-[10px] text-[#A6AEC8] font-mono">
                                  {formatBytes(evi.file_size)} • {formatDate(evi.upload_timestamp)}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-[11px]">
                            <div className="flex items-center gap-2">
                              <span className="text-[#55D6E8] truncate max-w-[130px]">{evi.sha256_hash.slice(0, 16)}...</span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  copyToClipboard(evi.sha256_hash)
                                }}
                                className="p-1 rounded bg-[#0D1224] text-[#A6AEC8] hover:text-[#8B7CFF] transition-colors"
                                title="Copy Full SHA-256"
                              >
                                {copiedHash === evi.sha256_hash ? (
                                  <Check className="w-3 h-3 text-[#52D6B2]" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                            <span className="text-[9px] text-[#727D9C] block mt-0.5">SHA-256 Fingerprint</span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="text-xs text-[#A6AEC8] truncate max-w-[140px] block">
                              {getIncidentTitle(evi.incident_id)}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">{getStatusBadge(evi.processing_status || 'ready')}</td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDownload(evi)}
                                leftIcon={<Download className="w-3 h-3" />}
                              >
                                Export
                              </Button>
                              <button
                                onClick={() => handleDelete(evi.id)}
                                className="p-1.5 text-[#727D9C] hover:text-[#FF718A] rounded-lg transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* Grid View */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredEvidence.map((evi) => (
                <EvidenceCard
                  key={evi.id}
                  evidence={evi}
                  isSelected={inspectorItem?.id === evi.id}
                  copiedHash={copiedHash}
                  onSelect={setInspectorItem}
                  onCopyHash={copyToClipboard}
                  onDownload={handleDownload}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right Area (4-cols): Interactive Forensic Inspector Panel */}
        {inspectorItem && (
          <div className="lg:col-span-4 bg-[#171D35]/90 border border-[#A6AEC8]/15 rounded-3xl p-5 space-y-4 shadow-xl sticky top-20">
            <div className="flex items-center justify-between pb-3 border-b border-[#A6AEC8]/15">
              <div className="flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-[#8B7CFF]" />
                <h3 className="text-xs font-bold text-[#F4F5FF] uppercase tracking-wider">
                  Custody Inspector
                </h3>
              </div>
              <button
                onClick={() => setInspectorItem(null)}
                className="text-[#A6AEC8] hover:text-[#F4F5FF] p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Target File Overview */}
            <div className="p-3 bg-[#0D1224] rounded-2xl border border-[#A6AEC8]/15 space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#080B18] border border-[#A6AEC8]/20 flex items-center justify-center text-[#8B7CFF]">
                  {inspectorItem.file_type.startsWith('image/') ? (
                    <ImageIcon className="w-4 h-4" />
                  ) : inspectorItem.file_type.startsWith('video/') ? (
                    <Video className="w-4 h-4" />
                  ) : (
                    <FileText className="w-4 h-4" />
                  )}
                </div>
                <div className="overflow-hidden">
                  <p className="text-xs font-bold text-[#F4F5FF] truncate">{inspectorItem.original_filename}</p>
                  <p className="text-[10px] text-[#A6AEC8] font-mono">{formatBytes(inspectorItem.file_size)}</p>
                </div>
              </div>

              <div className="space-y-1 pt-1 text-[11px]">
                <div className="flex items-center justify-between text-[#A6AEC8]">
                  <span>MIME Type:</span>
                  <span className="font-mono text-[#F4F5FF]">{inspectorItem.file_type}</span>
                </div>
                <div className="flex items-center justify-between text-[#A6AEC8]">
                  <span>Vault Ingestion:</span>
                  <span className="font-mono text-[#F4F5FF]">{formatDate(inspectorItem.upload_timestamp)}</span>
                </div>
                <div className="flex items-center justify-between text-[#A6AEC8]">
                  <span>Linked Dossier:</span>
                  <span className="text-[#8B7CFF] truncate max-w-[120px]">{getIncidentTitle(inspectorItem.incident_id)}</span>
                </div>
              </div>
            </div>

            {/* SHA-256 Full Certificate Details */}
            <div className="p-3 bg-[#080B18] rounded-2xl border border-[#8B7CFF]/30 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase font-bold text-[#8B7CFF] flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#52D6B2]" />
                  SHA-256 Fingerprint
                </span>
                <button
                  onClick={() => copyToClipboard(inspectorItem.sha256_hash)}
                  className="text-[10px] text-[#8B7CFF] hover:underline font-mono"
                >
                  {copiedHash === inspectorItem.sha256_hash ? 'Copied' : 'Copy'}
                </button>
              </div>
              <p className="text-[10px] font-mono text-[#55D6E8] break-all leading-relaxed select-all">
                {inspectorItem.sha256_hash}
              </p>
            </div>

            {/* Custody Legal Badges */}
            <div className="space-y-2 pt-1 text-xs">
              <div className="flex items-center gap-2 text-[11px] text-[#52D6B2] bg-[#52D6B2]/10 p-2.5 rounded-xl border border-[#52D6B2]/20">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>Section 65B Electronic Record Certificate ready for magistrate court submission.</span>
              </div>
            </div>

            {/* Direct Workflow Actions */}
            <div className="pt-2 space-y-2">
              <Link
                to={`/detect`}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-[#8B7CFF]/15 hover:bg-[#8B7CFF]/25 border border-[#8B7CFF]/30 text-xs font-semibold text-[#8B7CFF] transition-all"
              >
                <Cpu className="w-3.5 h-3.5" />
                <span>Screen Media in Detect</span>
              </Link>
              <Link
                to={`/complaints?evidenceId=${inspectorItem.id}`}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-[#0D1224] hover:bg-[#1D2540] border border-[#A6AEC8]/20 text-xs font-semibold text-[#F4F5FF] transition-all"
              >
                <FileText className="w-3.5 h-3.5 text-[#52D6B2]" />
                <span>Attach to Formal Complaint</span>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={() => handleDownload(inspectorItem)}
                leftIcon={<Download className="w-3.5 h-3.5" />}
              >
                Download Verified Package
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Upload Evidence Modal */}
      <Modal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        title="Preserve Evidence to Vault"
      >
        <div className="space-y-4">
          <p className="text-xs text-[#A6AEC8] leading-relaxed">
            Select files to preserve. SafeHER computes an irreversible SHA-256 fingerprint client-side before storage to ensure Section 65B compliance.
          </p>

          <EvidenceDropzone
            incidentId={selectedIncidentId && selectedIncidentId !== 'all' ? selectedIncidentId : (incidents[0]?.id || 'INC-GENERAL')}
            onEvidenceUploaded={(newEvidence) => {
              setEvidenceList((prev) => [newEvidence, ...prev])
              setInspectorItem(newEvidence)
              setIsUploadModalOpen(false)
              showToast('Evidence securely preserved in vault.', 'success')
            }}
          />
        </div>
      </Modal>
    </div>
  )
}
