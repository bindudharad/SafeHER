import React, { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  AlertCircle,
  HardDrive,
  FileText,
  Clock,
  PlusCircle,
  Upload,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Cpu,
  Phone,
  Globe,
  ExternalLink,
  ChevronRight,
  HelpCircle,
  TrendingUp,
  PieChart as PieIcon,
  BarChart2,
  Activity,
  ShieldAlert,
  Search,
  Filter,
  Lock,
  Sparkles,
  Info,
  X,
} from 'lucide-react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts'
import { useI18n } from '../../contexts/I18nContext'
import { apiClient } from '../../services/api/client'
import type { DashboardSummary, Incident, Evidence, TimelineEvent } from '../../types'
import { Badge } from '../../components/common/Badge'
import { Button } from '../../components/common/Button'
import { AnimatedDataPanel } from '../../components/common/AnimatedDataPanel'
import { Interactive3DSurface } from '../../components/ui/Interactive3DSurface'
import { formatDate } from '../../utils/crypto'

export const DashboardPage: React.FC = () => {
  const { t } = useI18n()
  const navigate = useNavigate()
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [evidenceList, setEvidenceList] = useState<Evidence[]>([])
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [ledgerSearch, setLedgerSearch] = useState('')
  const [showGuide, setShowGuide] = useState(() => {
    try {
      return localStorage.getItem('safeher_dismiss_dashboard_guide') !== 'true'
    } catch {
      return true
    }
  })

  const dismissGuide = () => {
    setShowGuide(false)
    try {
      localStorage.setItem('safeher_dismiss_dashboard_guide', 'true')
    } catch {
      // Ignore localStorage errors
    }
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [sum, inc, evi] = await Promise.all([
          apiClient.getDashboardSummary(),
          apiClient.getIncidents(),
          apiClient.getAllEvidence(),
        ])
        setSummary(sum)
        setIncidents(inc)
        setEvidenceList(evi)

        if (inc.length > 0) {
          const events = await apiClient.getTimelineEvents(inc[0].id)
          setTimelineEvents(events)
        }
      } catch {
        // Fall back gracefully
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [])

  // Incident Activity Over Time Data
  const activityData = useMemo(() => {
    if (!incidents.length) return []
    const dateMap: Record<string, number> = {}
    incidents.forEach((inc) => {
      const d = inc.incident_date || inc.created_at.split('T')[0]
      dateMap[d] = (dateMap[d] || 0) + 1
    })

    const sortedDates = Object.keys(dateMap).sort()
    return sortedDates.map((date) => ({
      date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      incidents: dateMap[date],
    }))
  }, [incidents])

  // Incident Categories Donut Data
  const categoryData = useMemo(() => {
    if (!incidents.length) return []
    const catMap: Record<string, number> = {}
    incidents.forEach((inc) => {
      const catName = inc.category.replace('_', ' ')
      catMap[catName] = (catMap[catName] || 0) + 1
    })

    const colors = ['#d5ff54', '#a8db35', '#f0f2eb', '#929b93', '#7ea83a', '#ff927e']
    return Object.keys(catMap).map((key, i) => ({
      name: key.charAt(0).toUpperCase() + key.slice(1),
      value: catMap[key],
      color: colors[i % colors.length],
    }))
  }, [incidents])

  const filteredIncidents = useMemo(() => {
    if (!ledgerSearch.trim()) return incidents
    const q = ledgerSearch.toLowerCase()
    return incidents.filter(
      (inc) =>
        inc.title.toLowerCase().includes(q) ||
        inc.platform.toLowerCase().includes(q) ||
        inc.category.toLowerCase().includes(q)
    )
  }, [incidents, ledgerSearch])

  if (isLoading || !summary) {
    return (
      <div className="space-y-6 animate-pulse text-left">
        <div className="h-10 bg-[#111716] rounded-xl w-1/3" />
        <div className="h-28 bg-[#111716]/80 rounded-2xl" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 h-80 bg-[#111716]/60 rounded-2xl" />
          <div className="lg:col-span-4 h-80 bg-[#111716]/60 rounded-2xl" />
        </div>
      </div>
    )
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <Badge variant="warning" dot>ACTIVE</Badge>
      case 'under_review':
        return <Badge variant="primary" dot>UNDER REVIEW</Badge>
      case 'resolved':
        return <Badge variant="safe" dot>RESOLVED</Badge>
      default:
        return <Badge variant="neutral">{status.toUpperCase()}</Badge>
    }
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#070908]/95 border border-[rgba(225,239,221,0.20)] p-2.5 rounded-xl text-xs shadow-2xl backdrop-blur-md">
          <p className="font-semibold text-[#f0f2eb]">{label}</p>
          <p className="text-[#d5ff54] font-mono mt-0.5">
            {payload[0].name || 'Count'}: <strong>{payload[0].value}</strong>
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="space-y-8 text-left max-w-7xl mx-auto pb-12">
      {/* 1. EXECUTIVE COCKPIT HEADER WITH INTEGRATED TELEMETRY STRIP */}
      <Interactive3DSurface
        intensity={2.2}
        elevateZ={4}
        className="relative bg-gradient-to-br from-[#111716] via-[#0d1110] to-[#070908] border border-[rgba(225,239,221,0.16)] rounded-3xl p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.6)]"
      >
        <div className="pointer-events-none absolute -top-32 -left-32 w-80 h-80 bg-[#d5ff54]/10 rounded-full blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -right-32 w-80 h-80 bg-[#d5ff54]/10 rounded-full blur-3xl" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-[rgba(225,239,221,0.15)]">
          <div className="space-y-2">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="inline-flex items-center gap-2 text-xs font-mono font-bold text-[#d5ff54] uppercase tracking-wider px-3 py-1 rounded-full bg-[#d5ff54]/10 border border-[#d5ff54]/25">
                <span className="w-1.5 h-1.5 rounded-full bg-[#d5ff54] animate-pulse" />
                Digital Safety Overview
              </span>
              <span
                className="text-xs text-[#a8db35] font-mono flex items-center gap-1.5 bg-[#a8db35]/10 px-2.5 py-0.5 rounded-full border border-[#a8db35]/20"
                title="Your files are isolated and encrypted. Tamper-evident SHA-256 integrity verification is active."
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                User-Isolated Vault • SHA-256
              </span>
            </div>
            <h1 className="font-display text-3xl sm:text-4xl uppercase font-extrabold text-[#f0f2eb] tracking-[0.02em]">
              Digital Safety &amp; Evidence Dashboard
            </h1>
            <p className="text-xs sm:text-sm text-[#929b93] max-w-2xl leading-relaxed">
              A private, secure workspace to document online abuse, protect your evidence, and take guided legal action.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0 flex-wrap sm:flex-nowrap">
            <Link to="/incidents/new">
              <Button variant="primary" size="md" leftIcon={<PlusCircle className="w-4 h-4" />}>
                Record an Incident
              </Button>
            </Link>
            <Link to="/evidence">
              <Button variant="secondary" size="md" leftIcon={<Upload className="w-4 h-4 text-[#d5ff54]" />}>
                Upload Evidence
              </Button>
            </Link>
          </div>
        </div>

        {/* UNIFIED TELEMETRY STRIP (Single console container with 4 dividers) */}
        <div className="relative z-10 grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-[#929b93]/15 pt-6 text-left">
          {/* Segment 1: Recorded Incidents */}
          <div className="pr-4 pb-4 lg:pb-0">
            <div className="flex items-center gap-2 text-xs text-[#929b93] font-medium">
              <AlertCircle className="w-3.5 h-3.5 text-[#d5ff54]" />
              <span className="uppercase tracking-wider">Recorded Incidents</span>
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-extrabold font-mono text-[#f0f2eb]">
                {incidents.length}
              </span>
              <span className="text-xs text-[#929b93]">active records</span>
            </div>
            <p className="text-[11px] text-[#929b93] mt-1">Abuse cases documented in vault</p>
          </div>

          {/* Segment 2: Preserved Evidence */}
          <div className="px-0 sm:px-4 pt-4 lg:pt-0 pb-4 lg:pb-0">
            <div className="flex items-center gap-2 text-xs text-[#929b93] font-medium">
              <HardDrive className="w-3.5 h-3.5 text-[#d5ff54]" />
              <span className="uppercase tracking-wider">Preserved Evidence</span>
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-extrabold font-mono text-[#d5ff54]">
                {evidenceList.length}
              </span>
              <span className="text-xs text-[#a8db35] font-mono">SHA-256 Validated</span>
            </div>
            <p className="text-[11px] text-[#929b93] mt-1">BSA Sec 63 / Sec 65B digest-tracked</p>
          </div>

          {/* Segment 3: AI Screenings */}
          <div className="pr-4 pt-4 lg:pt-0">
            <div className="flex items-center gap-2 text-xs text-[#929b93] font-medium">
              <Cpu className="w-3.5 h-3.5 text-[#a8db35]" />
              <span className="uppercase tracking-wider">Completed Analyses</span>
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-extrabold font-mono text-[#a8db35]">
                {summary?.completed_analyses ?? 0}
              </span>
              <span className="text-xs text-[#929b93]">AI safety checks</span>
            </div>
            <p className="text-[11px] text-[#929b93] mt-1">Deepfake &amp; risk verifications</p>
          </div>

          {/* Segment 4: Follow-ups & Actions */}
          <div className="px-0 sm:px-4 pt-4 lg:pt-0">
            <div className="flex items-center gap-2 text-xs text-[#929b93] font-medium">
              <Clock className="w-3.5 h-3.5 text-[#ff927e]" />
              <span className="uppercase tracking-wider">Action Follow-ups</span>
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-extrabold font-mono text-[#ff927e]">
                {summary?.pending_follow_ups ?? 0}
              </span>
              <span className="text-xs text-[#929b93]">deadlines pending</span>
            </div>
            <p className="text-[11px] text-[#929b93] mt-1">Time-sensitive platform takedowns</p>
          </div>
        </div>
      </Interactive3DSurface>

      {/* ONBOARDING & SAFETY GUIDANCE (Dismissable) */}
      {showGuide && (
        <div className="relative overflow-hidden bg-gradient-to-r from-[#111716]/95 via-[#0d1110]/95 to-[#111716]/95 border border-[#d5ff54]/25 rounded-2xl p-5 shadow-lg">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#d5ff54]" />
                <h2 className="text-sm font-bold text-[#f0f2eb]">
                  How SafeHER Helps You Stay Safe &amp; In Control
                </h2>
              </div>
              <p className="text-xs text-[#929b93] max-w-3xl">
                Facing online abuse or impersonation is overwhelming. SafeHER provides a quiet, secure space to document what happened and take action step-by-step.
              </p>
            </div>
            <button
              onClick={dismissGuide}
              aria-label="Dismiss guide"
              className="text-[#929b93] hover:text-[#f0f2eb] p-1 rounded-lg hover:bg-[#111716] transition-colors shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-[rgba(225,239,221,0.15)] text-xs text-left">
            <div className="bg-[#070908]/70 p-3.5 rounded-xl border border-[rgba(225,239,221,0.10)] space-y-1.5">
              <span className="text-[10px] font-mono font-bold text-[#d5ff54] uppercase tracking-wider block">
                Step 1 • Document
              </span>
              <p className="font-semibold text-[#f0f2eb]">Record What Happened</p>
              <p className="text-[11px] text-[#929b93] leading-relaxed">
                Log dates, platforms, and messages. All notes stay strictly confidential and accessible only to you.
              </p>
            </div>

            <div className="bg-[#070908]/70 p-3.5 rounded-xl border border-[rgba(225,239,221,0.10)] space-y-1.5">
              <span className="text-[10px] font-mono font-bold text-[#d5ff54] uppercase tracking-wider block">
                Step 2 • Protect
              </span>
              <p className="font-semibold text-[#f0f2eb]">Secure Your Evidence</p>
              <p className="text-[11px] text-[#929b93] leading-relaxed">
                Upload screenshots or recordings. Each file receives tamper-evident SHA-256 hashing to meet Indian legal standards (BSA Sec 63 / Sec 65B).
              </p>
            </div>

            <div className="bg-[#070908]/70 p-3.5 rounded-xl border border-[rgba(225,239,221,0.10)] space-y-1.5">
              <span className="text-[10px] font-mono font-bold text-[#a8db35] uppercase tracking-wider block">
                Step 3 • Respond
              </span>
              <p className="font-semibold text-[#f0f2eb]">Take Guided Action</p>
              <p className="text-[11px] text-[#929b93] leading-relaxed">
                Generate formal complaint letters with statutory takedown notices (IT Rules 24-hr mandate) or reach the 1930 National Cyber Helpline.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 2. ANALYTICS & ACTIVITY TIMELINE DECK */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 8-col: Incident Velocity & Chronological Trend */}
        <AnimatedDataPanel className="lg:col-span-8 p-6 flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[rgba(225,239,221,0.10)]">
            <div>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#d5ff54]" />
                <h3 className="text-sm font-bold text-[#f0f2eb] uppercase tracking-wider">
                  Incident Activity &amp; Timeline
                </h3>
              </div>
              <p className="text-xs text-[#929b93] mt-0.5">
                Chronological overview of documented incidents to help identify patterns over time.
              </p>
            </div>
            <span className="text-xs font-mono text-[#d5ff54] bg-[#d5ff54]/10 px-2.5 py-1 rounded-full border border-[#d5ff54]/25 self-start sm:self-auto">
              Live Stream
            </span>
          </div>

          <div className="py-4">
            {activityData.length === 0 ? (
              <div className="h-60 flex flex-col items-center justify-center text-xs text-[#929b93] gap-2">
                <Activity className="w-8 h-8 text-[#929b93]/50" />
                <p>No chronological incident activity recorded yet.</p>
              </div>
            ) : activityData.length === 1 ? (
              <div className="h-60 flex flex-col justify-center gap-4 px-2">
                <div className="p-4 rounded-xl bg-[#0d1110]/90 border border-[#d5ff54]/25 flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-[11px] font-mono uppercase text-[#d5ff54]">Single-Day Activity Snapshot</span>
                    <p className="text-sm font-bold text-[#f0f2eb]">
                      {activityData[0].incidents} incident{activityData[0].incidents === 1 ? '' : 's'} logged on {activityData[0].date}
                    </p>
                    <p className="text-xs text-[#929b93]">
                      Multi-day velocity curve activates automatically as additional dated records are logged.
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-3xl font-extrabold font-mono text-[#d5ff54]">{activityData[0].incidents}</span>
                    <span className="block text-[10px] font-mono text-[#929b93]">RECORDED</span>
                  </div>
                </div>
                <div className="w-full h-2.5 rounded-full bg-[#070908] overflow-hidden border border-[rgba(225,239,221,0.10)]">
                  <div className="h-full w-full bg-gradient-to-r from-[#d5ff54] to-[#a8db35] rounded-full" />
                </div>
              </div>
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={activityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="incidentGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#d5ff54" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#d5ff54" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="date"
                      stroke="#929b93"
                      tick={{ fill: '#929b93', fontSize: 11 }}
                      tickLine={false}
                      axisLine={{ stroke: '#929b93', strokeOpacity: 0.2 }}
                    />
                    <YAxis
                      allowDecimals={false}
                      stroke="#929b93"
                      tick={{ fill: '#929b93', fontSize: 11 }}
                      tickLine={false}
                      axisLine={{ stroke: '#929b93', strokeOpacity: 0.2 }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="incidents"
                      name="Logged Incidents"
                      stroke="#d5ff54"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#incidentGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Velocity Footer Info Strip */}
          <div className="pt-4 border-t border-[rgba(225,239,221,0.10)] grid grid-cols-3 gap-2 text-left">
            <div>
              <span className="text-[10px] text-[#929b93] uppercase tracking-wider block font-medium">Resolution Velocity</span>
              <span className="text-xs font-semibold text-[#a8db35] font-mono">100% Chain-of-Custody</span>
            </div>
            <div>
              <span className="text-[10px] text-[#929b93] uppercase tracking-wider block font-medium">Target Platforms</span>
              <span className="text-xs font-semibold text-[#f0f2eb]">Multi-Channel Monitored</span>
            </div>
            <div>
              <span className="text-[10px] text-[#929b93] uppercase tracking-wider block font-medium">Compliance Target</span>
              <span className="text-xs font-semibold text-[#d5ff54] font-mono">IT Rules Rule 3(2)(b)</span>
            </div>
          </div>
        </AnimatedDataPanel>

        {/* Right 4-col: Threat Vector Distribution (Donut) */}
        <AnimatedDataPanel className="lg:col-span-4 p-6 flex flex-col justify-between">
          <div className="pb-4 border-b border-[rgba(225,239,221,0.10)]">
            <div className="flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-[#a8db35]" />
              <h3 className="text-sm font-bold text-[#f0f2eb] uppercase tracking-wider">
                Incident Types &amp; Categories
              </h3>
            </div>
            <p className="text-xs text-[#929b93] mt-0.5">
              Breakdown of recorded abuse types across your vault.
            </p>
          </div>

          <div className="py-4">
            {categoryData.length === 0 ? (
              <div className="h-44 flex items-center justify-center text-xs text-[#929b93]">
                No threat categories recorded yet.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="h-40 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Tooltip content={<CustomTooltip />} />
                      <Pie
                        data={categoryData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={46}
                        outerRadius={70}
                        paddingAngle={4}
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} stroke="#070908" strokeWidth={2} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  {categoryData.map((cat, i) => (
                    <div key={i} className="flex items-center gap-2 bg-[#0d1110] p-2 rounded-xl border border-[rgba(225,239,221,0.10)]">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                      <div className="truncate">
                        <span className="text-[#929b93] block text-[10px] truncate">{cat.name}</span>
                        <strong className="text-[#f0f2eb] font-mono text-xs">{cat.value}</strong>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-[rgba(225,239,221,0.10)] flex items-center justify-between text-xs text-[#929b93]">
            <span className="flex items-center gap-1.5 text-[11px] text-[#a8db35]">
              <ShieldCheck className="w-3.5 h-3.5" /> Sec 65B Certified
            </span>
            <Link to="/reality-trust-center" className="text-[#d5ff54] hover:underline text-[11px] flex items-center gap-0.5">
              <span>Threat Intel</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </AnimatedDataPanel>
      </div>

      {/* 3. ACTIVE INCIDENTS LEDGER & OPERATIONS CENTER */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 8-col: High-Density Incidents Ledger */}
        <div className="lg:col-span-8 bg-[#111716]/85 border border-[rgba(225,239,221,0.15)] rounded-3xl p-6 space-y-4 shadow-lg shadow-[#070908]/50">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[rgba(225,239,221,0.10)]">
            <div>
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#d5ff54]" />
                <h3 className="text-sm font-bold text-[#f0f2eb] uppercase tracking-wider">
                  Your Recorded Cases
                </h3>
              </div>
              <p className="text-xs text-[#929b93] mt-0.5">
                Securely stored incident reports with tamper-proof verification.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#929b93] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={ledgerSearch}
                  onChange={(e) => setLedgerSearch(e.target.value)}
                  placeholder="Filter cases..."
                  className="bg-[#0d1110] border border-[rgba(225,239,221,0.20)] rounded-xl pl-8 pr-3 py-1.5 text-xs text-[#f0f2eb] placeholder-[#929b93] focus:outline-none focus:border-[#d5ff54]/60 w-40 sm:w-48"
                />
              </div>
              <Link to="/incidents" className="text-xs text-[#d5ff54] hover:underline flex items-center gap-1 font-medium shrink-0">
                <span>View all ({incidents.length})</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {filteredIncidents.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#0d1110] border border-[rgba(225,239,221,0.20)] flex items-center justify-center mx-auto text-[#929b93]">
                <AlertCircle className="w-6 h-6 text-[#d5ff54]" />
              </div>
              <p className="text-xs text-[#929b93]">
                {ledgerSearch ? 'No incidents match your filter.' : 'No incidents recorded yet. Begin by logging your first incident.'}
              </p>
              {!ledgerSearch && (
                <Link to="/incidents/new">
                  <Button variant="primary" size="sm" leftIcon={<PlusCircle className="w-4 h-4" />}>
                    Log First Incident
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#0d1110]/70 text-[#929b93] border-b border-[rgba(225,239,221,0.15)] font-mono uppercase text-[10px]">
                  <tr>
                    <th className="py-3 px-3 font-semibold">Incident Record</th>
                    <th className="py-3 px-3 font-semibold">Platform</th>
                    <th className="py-3 px-3 font-semibold">Date</th>
                    <th className="py-3 px-3 font-semibold">Evidence</th>
                    <th className="py-3 px-3 font-semibold">Status</th>
                    <th className="py-3 px-3 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#929b93]/10 text-[#f0f2eb]">
                  {filteredIncidents.slice(0, 5).map((inc) => (
                    <tr key={inc.id} className="hover:bg-[#111716]/50 transition-colors">
                      <td className="py-3.5 px-3">
                        <Link to={`/incidents/${inc.id}`} className="hover:text-[#d5ff54] transition-colors block">
                          <p className="font-semibold text-xs text-[#f0f2eb] truncate max-w-xs">{inc.title}</p>
                          <p className="text-[10px] text-[#929b93] capitalize mt-0.5">
                            {inc.category.replace('_', ' ')}
                          </p>
                        </Link>
                      </td>
                      <td className="py-3.5 px-3">
                        <span className="text-xs font-mono text-[#f0f2eb] bg-[#0d1110] px-2 py-0.5 rounded border border-[rgba(225,239,221,0.15)]">
                          {inc.platform}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 font-mono text-[11px] text-[#929b93]">
                        {formatDate(inc.incident_date || inc.created_at)}
                      </td>
                      <td className="py-3.5 px-3">
                        <span className="text-[11px] font-mono text-[#d5ff54] flex items-center gap-1">
                          <HardDrive className="w-3 h-3" />
                          {inc.evidence_count} items
                        </span>
                      </td>
                      <td className="py-3.5 px-3">{getStatusBadge(inc.status)}</td>
                      <td className="py-3.5 px-3 text-right">
                        <Link
                          to={`/incidents/${inc.id}`}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#d5ff54] hover:text-[#e2ff84] hover:underline"
                        >
                          <span>View Details</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right 4-col: Action Protocol & Citizen Support Stack */}
        <div className="lg:col-span-4 space-y-4">
          {/* Quick Actions Action Stack */}
          <Interactive3DSurface
            intensity={3.5}
            className="bg-[#111716]/85 border border-[rgba(225,239,221,0.15)] rounded-3xl p-5 space-y-3 shadow-lg shadow-[#070908]/50"
          >
            <h3 className="text-xs font-bold text-[#f0f2eb] uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#d5ff54]" />
              Safety &amp; Action Tools
            </h3>
            <div className="grid grid-cols-1 gap-2 pt-1">
              <Link
                to="/detect"
                className="group flex items-center justify-between p-3 rounded-2xl bg-[#0d1110] hover:bg-[#111716] border border-[rgba(225,239,221,0.15)] hover:border-[#d5ff54]/40 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[#d5ff54]/15 text-[#d5ff54] flex items-center justify-center shrink-0">
                    <Cpu className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#f0f2eb] group-hover:text-[#d5ff54] transition-colors">
                      Detect Deepfakes
                    </h4>
                    <p className="text-[10px] text-[#929b93]">Screen media for face swaps &amp; AI tampering</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-[#929b93] group-hover:translate-x-1 group-hover:text-[#d5ff54] transition-all" />
              </Link>

              <Link
                to="/complaints"
                className="group flex items-center justify-between p-3 rounded-2xl bg-[#0d1110] hover:bg-[#111716] border border-[rgba(225,239,221,0.15)] hover:border-[#ff927e]/40 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[#ff927e]/15 text-[#ff927e] flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#f0f2eb] group-hover:text-[#ff927e] transition-colors">
                      Complaint Generator
                    </h4>
                    <p className="text-[10px] text-[#929b93]">Draft formal legal complaint letters</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-[#929b93] group-hover:translate-x-1 group-hover:text-[#ff927e] transition-all" />
              </Link>

              <Link
                to="/cases"
                className="group flex items-center justify-between p-3 rounded-2xl bg-[#0d1110] hover:bg-[#111716] border border-[rgba(225,239,221,0.15)] hover:border-[#a8db35]/40 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[#a8db35]/15 text-[#a8db35] flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#f0f2eb] group-hover:text-[#a8db35] transition-colors">
                      Case Tracking
                    </h4>
                    <p className="text-[10px] text-[#929b93]">Monitor submission deadlines &amp; responses</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-[#929b93] group-hover:translate-x-1 group-hover:text-[#a8db35] transition-all" />
              </Link>
            </div>
          </Interactive3DSurface>

          {/* Citizen Helplines & Discreet Quick Exit */}
          <div className="bg-[#111716]/85 border border-[rgba(225,239,221,0.15)] rounded-3xl p-5 space-y-4 shadow-lg shadow-[#070908]/50">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-[#f0f2eb] uppercase tracking-wider flex items-center gap-2">
                <Phone className="w-4 h-4 text-[#ff927e]" />
                Immediate Help &amp; Helplines
              </h3>
              <span className="text-[10px] font-mono text-[#ff927e] bg-[#ff927e]/10 px-2 py-0.5 rounded-full border border-[#ff927e]/25">
                24/7 Hotlines
              </span>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="p-3 bg-[#0d1110] rounded-xl border border-[#ff927e]/20 flex items-center justify-between">
                <div>
                  <p className="font-bold text-[#f0f2eb]">National Cyber Helpline</p>
                  <p className="text-[10px] text-[#929b93]">Govt of India 24/7 toll-free</p>
                </div>
                <a
                  href="tel:1930"
                  className="px-3 py-1.5 rounded-lg bg-[#ff927e]/15 text-[#ff927e] font-mono font-bold hover:bg-[#ff927e]/25 transition-colors"
                >
                  Dial 1930
                </a>
              </div>

            <div className="flex items-center justify-between text-xs text-[#929b93] px-1">
                <a
                  href="https://cybercrime.gov.in"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-[#d5ff54] hover:underline flex items-center gap-1"
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>cybercrime.gov.in</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
                <a
                  href="https://stopncii.org"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-[#a8db35] hover:underline flex items-center gap-1"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>StopNCII.org</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            {/* Quick Exit Reminder */}
            <div className="pt-3 border-t border-[rgba(225,239,221,0.10)] flex items-center justify-between text-[11px] text-[#929b93]">
              <span className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-[#ff927e]" />
                <span>Quick Exit:</span>
              </span>
              <kbd className="px-1.5 py-0.5 rounded bg-[#070908] text-[#f0f2eb] font-mono text-[10px] border border-[rgba(225,239,221,0.28)]">
                Alt + Q
              </kbd>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
