import React, { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertCircle,
  PlusCircle,
  Search,
  Filter,
  Calendar,
  HardDrive,
  Cpu,
  ArrowRight,
  ShieldCheck,
  Globe,
  ChevronRight,
  FileText,
  Activity,
  Layers,
} from 'lucide-react'
import { useI18n } from '../../contexts/I18nContext'
import { apiClient } from '../../services/api/client'
import type { Incident, IncidentCategory } from '../../types'
import { Button } from '../../components/common/Button'
import { Badge } from '../../components/common/Badge'
import { PageHeader } from '../../components/layout/PageHeader'
import { formatDate } from '../../utils/crypto'

export const IncidentListPage: React.FC = () => {
  const { t } = useI18n()
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchIncidents = async () => {
      try {
        const data = await apiClient.getIncidents()
        setIncidents(data)
      } finally {
        setIsLoading(false)
      }
    }
    fetchIncidents()
  }, [])

  const filteredIncidents = useMemo(() => {
    return incidents.filter((inc) => {
      const matchesSearch =
        inc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inc.platform.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inc.description.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesCategory =
        selectedCategory === 'all' || inc.category === selectedCategory
      const matchesStatus =
        selectedStatus === 'all' || inc.status === selectedStatus
      return matchesSearch && matchesCategory && matchesStatus
    })
  }, [incidents, searchQuery, selectedCategory, selectedStatus])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <Badge variant="warning" dot>OPEN</Badge>
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
      {/* 1. DOSSIER REPOSITORY HEADER */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#171D35] via-[#0D1224] to-[#080B18] border border-[#A6AEC8]/18 rounded-3xl p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.6)]">
        <div className="pointer-events-none absolute -top-32 -left-32 w-80 h-80 bg-[#8B7CFF]/10 rounded-full blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -right-32 w-80 h-80 bg-[#55D6E8]/10 rounded-full blur-3xl" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-[#A6AEC8]/15">
          <div className="space-y-2">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="inline-flex items-center gap-2 text-xs font-mono font-bold text-[#8B7CFF] uppercase tracking-wider px-3 py-1 rounded-full bg-[#8B7CFF]/10 border border-[#8B7CFF]/25">
                <Layers className="w-3.5 h-3.5" />
                Incident Management
              </span>
              <span className="text-xs text-[#52D6B2] font-mono flex items-center gap-1.5 bg-[#52D6B2]/10 px-2.5 py-0.5 rounded-full border border-[#52D6B2]/20">
                <ShieldCheck className="w-3.5 h-3.5" />
                Zero-Knowledge Dossiers
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#F4F5FF] tracking-tight">
              Recorded Incident Dossiers
            </h1>
            <p className="text-xs sm:text-sm text-[#A6AEC8] max-w-2xl leading-relaxed">
              Complete chain-of-evidence dossiers for all documented cyber abuse incidents, platform grievances, and legal filings.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link to="/incidents/new">
              <Button variant="primary" size="md" leftIcon={<PlusCircle className="w-4 h-4" />}>
                Log New Incident
              </Button>
            </Link>
          </div>
        </div>

        {/* SUMMARY TELEMETRY STRIP */}
        <div className="relative z-10 grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-[#A6AEC8]/15 pt-6 text-left">
          <div className="pr-4 pb-4 lg:pb-0">
            <span className="text-xs text-[#A6AEC8] font-medium uppercase tracking-wider block">Total Incidents</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-extrabold font-mono text-[#F4F5FF]">{incidents.length}</span>
              <span className="text-xs text-[#727D9C]">logged cases</span>
            </div>
          </div>
          <div className="px-0 sm:px-4 pt-4 lg:pt-0 pb-4 lg:pb-0">
            <span className="text-xs text-[#A6AEC8] font-medium uppercase tracking-wider block">Active Triage</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-extrabold font-mono text-[#F0B96B]">
                {incidents.filter((i) => i.status === 'open').length}
              </span>
              <span className="text-xs text-[#F0B96B]">open</span>
            </div>
          </div>
          <div className="pr-4 pt-4 lg:pt-0">
            <span className="text-xs text-[#A6AEC8] font-medium uppercase tracking-wider block">Under Legal Review</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-extrabold font-mono text-[#648BFF]">
                {incidents.filter((i) => i.status === 'under_review').length}
              </span>
              <span className="text-xs text-[#648BFF]">in review</span>
            </div>
          </div>
          <div className="px-0 sm:px-4 pt-4 lg:pt-0">
            <span className="text-xs text-[#A6AEC8] font-medium uppercase tracking-wider block">Resolved &amp; Closed</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-extrabold font-mono text-[#52D6B2]">
                {incidents.filter((i) => i.status === 'resolved').length}
              </span>
              <span className="text-xs text-[#52D6B2]">resolved</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. FILTER & SEARCH CONTROLS */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#171D35]/85 p-4 rounded-2xl border border-[#A6AEC8]/15 shadow-md">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[#A6AEC8] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title, platform or details..."
            className="w-full bg-[#0D1224] border border-[#A6AEC8]/20 rounded-xl pl-9 pr-4 py-2 text-xs text-[#F4F5FF] placeholder-[#727D9C] focus:outline-none focus:border-[#8B7CFF]/60 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto flex-wrap sm:flex-nowrap">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-[#A6AEC8] shrink-0" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-[#0D1224] border border-[#A6AEC8]/20 text-[#F4F5FF] text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-[#8B7CFF]/60 cursor-pointer"
            >
              <option value="all">All Abuse Categories</option>
              <option value="online_harassment">Online Harassment</option>
              <option value="cyberbullying">Cyberbullying</option>
              <option value="threatening_messages">Threats &amp; Blackmail</option>
              <option value="impersonation">Impersonation</option>
              <option value="deepfake_media">Deepfake Media</option>
              <option value="non_consensual_content">Intimate Image Circulation</option>
              <option value="other">Other Digital Abuse</option>
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-[#0D1224] border border-[#A6AEC8]/20 text-[#F4F5FF] text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-[#8B7CFF]/60 cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="open">Active / Open</option>
              <option value="under_review">Under Review</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>
        </div>
      </div>

      {/* 3. INCIDENTS DOSSIER WORKSPACE */}
      {isLoading ? (
        <div className="space-y-4 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-[#171D35]/80 border border-[#A6AEC8]/10 rounded-2xl" />
          ))}
        </div>
      ) : filteredIncidents.length === 0 ? (
        <div className="p-12 text-center bg-[#171D35]/85 border border-[#A6AEC8]/15 rounded-3xl space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-[#0D1224] border border-[#A6AEC8]/20 flex items-center justify-center mx-auto text-[#8B7CFF]">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-[#F4F5FF]">No Incidents Found</h3>
          <p className="text-xs text-[#A6AEC8] max-w-sm mx-auto">
            {searchQuery || selectedCategory !== 'all' || selectedStatus !== 'all'
              ? 'No incidents match your search or filter criteria.'
              : 'You have not logged any incidents yet. Start by creating a secure record.'}
          </p>
          <div className="pt-2">
            <Link to="/incidents/new">
              <Button variant="primary" size="sm" leftIcon={<PlusCircle className="w-4 h-4" />}>
                Log New Incident
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredIncidents.map((incident) => (
            <div
              key={incident.id}
              className="bg-[#171D35]/85 border border-[#A6AEC8]/15 hover:border-[#8B7CFF]/40 rounded-2xl p-5 sm:p-6 transition-all duration-200 group shadow-lg shadow-[#080B18]/40"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="space-y-2.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <Link to={`/incidents/${incident.id}`}>
                      <h3 className="text-base font-bold text-[#F4F5FF] group-hover:text-[#8B7CFF] transition-colors truncate">
                        {incident.title}
                      </h3>
                    </Link>
                    {getStatusBadge(incident.status)}
                    <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-[#0D1224] text-[#8B7CFF] font-mono border border-[#A6AEC8]/15">
                      {incident.platform}
                    </span>
                    <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-[#1D2540] text-[#A6AEC8] capitalize border border-[#A6AEC8]/10">
                      {incident.category.replace('_', ' ')}
                    </span>
                  </div>

                  <p className="text-xs text-[#A6AEC8] line-clamp-2 leading-relaxed">
                    {incident.description}
                  </p>

                  <div className="flex flex-wrap items-center gap-4 text-[11px] text-[#727D9C] font-mono pt-1">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      {formatDate(incident.incident_date || incident.created_at)}
                    </span>
                    <span className="flex items-center gap-1.5 text-[#55D6E8]">
                      <HardDrive className="w-3.5 h-3.5" />
                      {incident.evidence_count} evidence files
                    </span>
                    <span className="text-[#52D6B2] flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Sec 65B Preserved
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 self-end lg:self-center shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-[#A6AEC8]/10 w-full lg:w-auto justify-end">
                  <Link to={`/complaints?incidentId=${incident.id}`}>
                    <Button variant="secondary" size="sm" leftIcon={<FileText className="w-3.5 h-3.5 text-[#52D6B2]" />}>
                      Draft Complaint
                    </Button>
                  </Link>
                  <Link to={`/incidents/${incident.id}`}>
                    <Button variant="ghost" size="sm" rightIcon={<ChevronRight className="w-4 h-4" />}>
                      View Dossier
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
