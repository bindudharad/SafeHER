import React, { useEffect, useState } from 'react'
import { Clock, RefreshCw, Plus, Search, Filter } from 'lucide-react'
import { apiClient as api } from '../../services/api/client'
import type { Incident, NormalizedTimelineEvent } from '../../types'

export const NormalizedTimelinePage: React.FC = () => {
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [selectedIncidentId, setSelectedIncidentId] = useState('')
  const [events, setEvents] = useState<NormalizedTimelineEvent[]>([])
  const [timeSourceFilter, setTimeSourceFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [newTitle, setNewTitle] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newTime, setNewTime] = useState('')
  const [newTz, setNewTz] = useState('Asia/Kolkata')
  const [newTimeSource, setNewTimeSource] = useState<'alleged_occurrence' | 'manual_entry'>('alleged_occurrence')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.getIncidents().then((list) => {
      setIncidents(list)
      if (list.length > 0) setSelectedIncidentId(list[0].id)
    }).catch(() => setError('Unable to load incidents.'))
  }, [])

  const loadTimeline = async () => {
    if (!selectedIncidentId) return
    setLoading(true)
    setError(null)
    try {
      const data = await api.getNormalizedTimeline(selectedIncidentId, {
        time_source: timeSourceFilter || undefined,
        search: searchQuery || undefined,
      })
      setEvents(data)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load normalized timeline.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (selectedIncidentId) loadTimeline()
  }, [selectedIncidentId, timeSourceFilter])

  const handleReconstruct = async () => {
    if (!selectedIncidentId) return
    setLoading(true)
    try {
      const res = await api.reconstructTimeline(selectedIncidentId)
      setEvents(res.events)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to reconstruct timeline.')
    } finally {
      setLoading(false)
    }
  }

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedIncidentId || !newTitle.trim() || !newDesc.trim()) return
    try {
      await api.addNormalizedTimelineEvent(selectedIncidentId, {
        event_type: 'manual_note',
        title: newTitle.trim(),
        description: newDesc.trim(),
        event_time_original: newTime.trim() || undefined,
        timezone_original: newTz.trim() || 'unknown',
        time_precision: newTime.trim() ? 'exact' : 'unknown_timezone',
        time_source: newTimeSource,
      })
      setNewTitle('')
      setNewDesc('')
      setNewTime('')
      await loadTimeline()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to add event.')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl uppercase tracking-[0.02em] font-bold text-[#f0f2eb] flex items-center gap-2.5">
            <Clock className="w-6 h-6 text-[#d5ff54]" />
            Forensic Incident Timeline
          </h1>
          <p className="text-sm text-[#929b93] mt-1">
            Normalized chronological reconstruction preserving original timestamps, timezone uncertainty, and source provenance.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedIncidentId}
            onChange={(e) => setSelectedIncidentId(e.target.value)}
            className="bg-[#0d1110] border border-[rgba(225,239,221,0.20)] rounded-xl px-3 py-2 text-xs text-[#f0f2eb]"
          >
            {incidents.map((inc) => (
              <option key={inc.id} value={inc.id}>{inc.title}</option>
            ))}
          </select>
          <button
            onClick={handleReconstruct}
            disabled={loading || !selectedIncidentId}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#d5ff54] hover:bg-[#e2ff84] text-[#080a08] text-xs font-semibold disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Reconstruct Timeline
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-[rgba(255,146,126,0.10)] border border-[rgba(255,146,126,0.32)] text-[#ff927e] text-xs">
          {error}
        </div>
      )}

      {/* Search & Filters */}
      <div className="flex flex-wrap items-center gap-3 bg-[#0d1110] border border-[rgba(225,239,221,0.15)] rounded-2xl p-3">
        <div className="flex items-center gap-1.5 text-xs text-[#929b93]">
          <Filter className="w-3.5 h-3.5" /> Time Source:
        </div>
        <select
          value={timeSourceFilter}
          onChange={(e) => setTimeSourceFilter(e.target.value)}
          className="bg-[#070908] border border-[rgba(225,239,221,0.20)] rounded-lg px-2.5 py-1.5 text-xs text-[#f0f2eb]"
        >
          <option value="">All Time Sources</option>
          <option value="alleged_occurrence">Alleged Occurrence</option>
          <option value="evidence_created">Evidence Created (Metadata)</option>
          <option value="safeher_upload">SafeHER Upload</option>
          <option value="analysis_performed">Analysis Performed</option>
          <option value="manual_entry">Manual Entry</option>
        </select>

        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search timeline descriptions..."
            className="w-full bg-[#070908] border border-[rgba(225,239,221,0.20)] rounded-lg px-3 py-1.5 text-xs text-[#f0f2eb]"
          />
          <button
            onClick={loadTimeline}
            className="px-3 py-1.5 rounded-lg bg-[#111716] text-xs text-[#f0f2eb] flex items-center gap-1"
          >
            <Search className="w-3.5 h-3.5" /> Search
          </button>
        </div>
      </div>

      {/* Add Manual Event */}
      <form onSubmit={handleAddEvent} className="bg-[#0d1110] border border-[rgba(225,239,221,0.15)] rounded-2xl p-4 grid grid-cols-1 md:grid-cols-5 gap-3">
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Event title"
          className="bg-[#070908] border border-[rgba(225,239,221,0.20)] rounded-xl px-3 py-2 text-xs text-[#f0f2eb]"
          required
        />
        <input
          type="text"
          value={newDesc}
          onChange={(e) => setNewDesc(e.target.value)}
          placeholder="Description"
          className="bg-[#070908] border border-[rgba(225,239,221,0.20)] rounded-xl px-3 py-2 text-xs text-[#f0f2eb]"
          required
        />
        <input
          type="text"
          value={newTime}
          onChange={(e) => setNewTime(e.target.value)}
          placeholder="Original time (e.g. 2026-11-26T14:30:00)"
          className="bg-[#070908] border border-[rgba(225,239,221,0.20)] rounded-xl px-3 py-2 text-xs text-[#f0f2eb]"
        />
        <div className="flex gap-2">
          <input
            type="text"
            value={newTz}
            onChange={(e) => setNewTz(e.target.value)}
            placeholder="Timezone"
            className="w-1/2 bg-[#070908] border border-[rgba(225,239,221,0.20)] rounded-xl px-2 py-2 text-xs text-[#f0f2eb]"
          />
          <select
            value={newTimeSource}
            onChange={(e) => setNewTimeSource(e.target.value as 'alleged_occurrence' | 'manual_entry')}
            className="w-1/2 bg-[#070908] border border-[rgba(225,239,221,0.20)] rounded-xl px-2 py-2 text-xs text-[#f0f2eb]"
          >
            <option value="alleged_occurrence">Alleged Time</option>
            <option value="manual_entry">Manual Entry</option>
          </select>
        </div>
        <button
          type="submit"
          className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-[#d5ff54] hover:bg-[#e2ff84] text-[#080a08] text-xs font-semibold"
        >
          <Plus className="w-3.5 h-3.5" /> Add Event
        </button>
      </form>

      {/* Event Stream */}
      <div className="space-y-3">
        {events.map((ev) => (
          <div key={ev.id} className="bg-[#0d1110] border border-[rgba(225,239,221,0.15)] rounded-2xl p-4 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-[#111716] text-[#d5ff54] font-mono text-[10px]">
                  {ev.time_source}
                </span>
                <span className="text-sm font-semibold text-[#f0f2eb]">{ev.title}</span>
              </div>
              <div className="flex items-center gap-2 text-[11px] font-mono text-[#929b93]">
                <span className="px-2 py-0.5 rounded bg-[#070908] border border-[rgba(225,239,221,0.15)]">
                  {ev.time_precision}
                </span>
                <span className="px-2 py-0.5 rounded bg-[#070908] border border-[rgba(225,239,221,0.15)]">
                  {ev.verification_status}
                </span>
              </div>
            </div>
            <p className="text-xs text-[#929b93]">{ev.description}</p>
            <div className="flex flex-wrap gap-4 text-[11px] font-mono text-[#929b93]">
              <span>Original: <strong className="text-[#f0f2eb]">{ev.event_time_original}</strong> ({ev.timezone_original})</span>
              <span>UTC: <strong className="text-[#f0f2eb]">{ev.event_time_utc || 'Not converted (unknown tz)'}</strong></span>
              <span>Extraction: {ev.extraction_method}</span>
              {ev.related_evidence_id && <span>Evidence: {ev.related_evidence_id}</span>}
            </div>
          </div>
        ))}
        {events.length === 0 && (
          <div className="p-6 text-center text-xs text-[#929b93] bg-[#0d1110] rounded-2xl border border-[rgba(225,239,221,0.15)]">
            No timeline events found. Click "Reconstruct Timeline" to extract events from incident evidence and analyses.
          </div>
        )}
      </div>
    </div>
  )
}
