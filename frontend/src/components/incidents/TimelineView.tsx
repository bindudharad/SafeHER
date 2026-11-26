import React, { useState, useEffect } from 'react'
import {
  Clock,
  PlusCircle,
  FileText,
  HardDrive,
  Cpu,
  Share2,
  CheckCircle,
  User,
  Shield,
} from 'lucide-react'
import type { TimelineEvent } from '../../types'
import { apiClient } from '../../services/api/client'
import { formatDate } from '../../utils/crypto'
import { Button } from '../common/Button'
import { Badge } from '../common/Badge'

export const TimelineView: React.FC<{ incidentId: string }> = ({ incidentId }) => {
  const [events, setEvents] = useState<TimelineEvent[]>([])
  const [newNote, setNewNote] = useState('')
  const [isAdding, setIsAdding] = useState(false)

  useEffect(() => {
    const fetchTimeline = async () => {
      const data = await apiClient.getTimelineEvents(incidentId)
      setEvents(data)
    }
    fetchTimeline()
  }, [incidentId])

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newNote.trim()) return

    setIsAdding(true)
    try {
      const added = await apiClient.addTimelineEvent(incidentId, {
        event_type: 'user_note_added',
        source: 'user',
        title: 'User Note Added',
        description: newNote.trim(),
      })
      setEvents((prev) => [added, ...prev])
      setNewNote('')
    } finally {
      setIsAdding(false)
    }
  }

  const getEventIcon = (type: TimelineEvent['event_type']) => {
    switch (type) {
      case 'incident_created':
      case 'incident_occurred':
        return <AlertCircleIcon className="w-4 h-4 text-[#F0B96B]" />
      case 'evidence_uploaded':
      case 'integrity_verified':
        return <HardDrive className="w-4 h-4 text-[#52D6B2]" />
      case 'analysis_requested':
      case 'analysis_completed':
        return <Cpu className="w-4 h-4 text-[#8B7CFF]" />
      case 'complaint_generated':
      case 'complaint_updated':
        return <FileText className="w-4 h-4 text-[#648BFF]" />
      case 'reported_external':
      case 'case_status_changed':
        return <Share2 className="w-4 h-4 text-[#648BFF]" />
      case 'user_note_added':
      default:
        return <User className="w-4 h-4 text-[#A6AEC8]" />
    }
  }

  function AlertCircleIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
      <svg
        {...props}
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    )
  }

  return (
    <div className="space-y-6 text-left">
      {/* Add User Event / Note Form */}
      <form onSubmit={handleAddNote} className="flex gap-2">
        <input
          type="text"
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="Record a follow-up action, phone call, or additional observation..."
          className="flex-1 bg-[#0D1224] border border-[#A6AEC8]/20 rounded-xl px-4 py-2.5 text-xs text-[#F4F5FF] placeholder-[#727D9C] focus:outline-none focus:border-[#8B7CFF]/60 focus:ring-1 focus:ring-[#8B7CFF]/30"
        />
        <Button
          type="submit"
          variant="primary"
          size="sm"
          isLoading={isAdding}
          leftIcon={<PlusCircle className="w-4 h-4" />}
        >
          Add Note
        </Button>
      </form>

      {/* Timeline Stream */}
      {events.length === 0 ? (
        <div className="p-8 text-center text-xs text-[#A6AEC8] bg-[#171D35]/60 rounded-2xl border border-[#A6AEC8]/15">
          No timeline events recorded yet. Uploading evidence or adding notes will populate this incident history.
        </div>
      ) : (
        <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-[2px] before:bg-[#A6AEC8]/20">
          {events.map((evt) => (
            <div key={evt.id} className="relative group">
              {/* Event Marker */}
              <div className="absolute -left-6 sm:-left-8 top-1 w-6 h-6 rounded-full bg-[#0D1224] border border-[#A6AEC8]/25 flex items-center justify-center shadow-md">
                {getEventIcon(evt.event_type)}
              </div>

              {/* Event Body */}
              <div className="bg-[#171D35]/80 border border-[#A6AEC8]/15 rounded-xl p-4 transition-all duration-150 hover:border-[#8B7CFF]/30">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-semibold text-[#F4F5FF]">{evt.title}</h4>
                    <Badge variant={evt.source === 'system' ? 'primary' : 'neutral'} size="sm">
                      {evt.source === 'system' ? 'System Automated' : 'User Entry'}
                    </Badge>
                  </div>
                  <span className="text-[11px] text-[#A6AEC8] flex items-center gap-1 font-mono">
                    <Clock className="w-3 h-3 text-[#A6AEC8]" />
                    {formatDate(evt.timestamp)}
                  </span>
                </div>
                <p className="text-xs text-[#A6AEC8] leading-relaxed">{evt.description}</p>
                {evt.related_evidence_id && (
                  <div className="mt-2 pt-2 border-t border-[#A6AEC8]/15 flex items-center gap-1.5 text-[11px] text-[#8B7CFF]">
                    <Shield className="w-3 h-3" />
                    <span>Linked to Evidence Vault ID: {evt.related_evidence_id}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
