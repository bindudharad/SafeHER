import React, { useEffect, useMemo, useState } from 'react'
import { Network, RefreshCw, CheckCircle2, AlertTriangle, XCircle, Filter, Link2 } from 'lucide-react'
import { apiClient as api } from '../../services/api/client'
import type { EvidenceGraphData, GraphEdge, GraphNode, Incident } from '../../types'

const STATUS_BADGE: Record<string, string> = {
  suggested: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  user_asserted: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  human_verified: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  disputed: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
  rejected: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
}

export const EvidenceGraphPage: React.FC = () => {
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [selectedIncidentId, setSelectedIncidentId] = useState<string>('')
  const [graph, setGraph] = useState<EvidenceGraphData | null>(null)
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [relFilter, setRelFilter] = useState<string>('all')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.getIncidents().then((list) => {
      setIncidents(list)
      if (list.length > 0) setSelectedIncidentId(list[0].id)
    }).catch(() => setError('Unable to load incidents.'))
  }, [])

  const loadGraph = async (incId: string) => {
    if (!incId) return
    setLoading(true)
    setError(null)
    try {
      const data = await api.getIncidentGraph(incId, {
        relationship_type: relFilter !== 'all' ? relFilter : undefined,
        verification_status: statusFilter !== 'all' ? statusFilter : undefined,
      })
      setGraph(data)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load graph.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (selectedIncidentId) loadGraph(selectedIncidentId)
  }, [selectedIncidentId, statusFilter, relFilter])

  const handleSync = async () => {
    if (!selectedIncidentId) return
    setLoading(true)
    setError(null)
    try {
      const data = await api.syncIncidentGraph(selectedIncidentId)
      setGraph(data)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to sync graph.')
    } finally {
      setLoading(false)
    }
  }

  const handleReviewEdge = async (edgeId: string, status: 'human_verified' | 'disputed' | 'rejected') => {
    try {
      await api.reviewGraphEdge(edgeId, status)
      await loadGraph(selectedIncidentId)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to review edge.')
    }
  }

  const nodePositions = useMemo(() => {
    const map = new Map<string, { x: number; y: number }>()
    const nodes = graph?.nodes || []
    const cx = 360
    const cy = 220
    const r = 155
    nodes.forEach((n, idx) => {
      if (idx === 0) {
        map.set(n.id, { x: cx, y: cy })
      } else {
        const angle = ((idx - 1) / Math.max(nodes.length - 1, 1)) * Math.PI * 2
        map.set(n.id, {
          x: Math.round(cx + Math.cos(angle) * r),
          y: Math.round(cy + Math.sin(angle) * r),
        })
      }
    })
    return map
  }, [graph])

  const nodeMap = useMemo(() => {
    const m = new Map<string, GraphNode>()
    ;(graph?.nodes || []).forEach((n) => m.set(n.id, n))
    return m
  }, [graph])

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#F4F5FF] flex items-center gap-2.5">
            <Network className="w-6 h-6 text-[#8B7CFF]" />
            Evidence Intelligence Graph
          </h1>
          <p className="text-sm text-[#A6AEC8] mt-1">
            Provenance-tracked relationships between evidence, analyses, URLs, and timeline events. Machine suggestions require human review.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedIncidentId}
            onChange={(e) => setSelectedIncidentId(e.target.value)}
            className="bg-[#12172B] border border-[#A6AEC8]/20 rounded-xl px-3 py-2 text-xs text-[#F4F5FF]"
          >
            {incidents.map((inc) => (
              <option key={inc.id} value={inc.id}>{inc.title}</option>
            ))}
          </select>

          <button
            onClick={handleSync}
            disabled={loading || !selectedIncidentId}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#8B7CFF] hover:bg-[#7A69FF] text-white text-xs font-semibold disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Sync &amp; Suggest Links
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 bg-[#12172B] border border-[#A6AEC8]/15 rounded-2xl p-3">
        <div className="flex items-center gap-1.5 text-xs text-[#A6AEC8]">
          <Filter className="w-3.5 h-3.5" /> Filters:
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-[#0B0F1E] border border-[#A6AEC8]/20 rounded-lg px-2.5 py-1.5 text-xs text-[#F4F5FF]"
        >
          <option value="all">All Verification States</option>
          <option value="suggested">Suggested (Unreviewed)</option>
          <option value="user_asserted">User Asserted</option>
          <option value="human_verified">Human Verified</option>
          <option value="disputed">Disputed</option>
          <option value="rejected">Rejected</option>
        </select>
        <select
          value={relFilter}
          onChange={(e) => setRelFilter(e.target.value)}
          className="bg-[#0B0F1E] border border-[#A6AEC8]/20 rounded-lg px-2.5 py-1.5 text-xs text-[#F4F5FF]"
        >
          <option value="all">All Relationship Types</option>
          <option value="BELONGS_TO_INCIDENT">BELONGS_TO_INCIDENT</option>
          <option value="ANALYZED_BY">ANALYZED_BY</option>
          <option value="CONTAINS_EVENT">CONTAINS_EVENT</option>
          <option value="DERIVED_FROM">DERIVED_FROM</option>
          <option value="REFERENCES_URL">REFERENCES_URL</option>
          <option value="MENTIONS_ACCOUNT">MENTIONS_ACCOUNT</option>
          <option value="DUPLICATE_OF">DUPLICATE_OF</option>
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* SVG Graph Canvas */}
        <div className="lg:col-span-2 bg-[#12172B] border border-[#A6AEC8]/15 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-mono text-[#A6AEC8]">
              NODES: {graph?.node_count ?? 0} | EDGES: {graph?.edge_count ?? 0}
            </span>
          </div>
          <svg viewBox="0 0 720 440" className="w-full h-[380px] bg-[#0B0F1E] rounded-xl border border-[#A6AEC8]/10">
            {(graph?.edges || []).map((edge) => {
              const p1 = nodePositions.get(edge.source_node_id)
              const p2 = nodePositions.get(edge.target_node_id)
              if (!p1 || !p2) return null
              const dashed = edge.verification_status === 'suggested'
              return (
                <g key={edge.id}>
                  <line
                    x1={p1.x}
                    y1={p1.y}
                    x2={p2.x}
                    y2={p2.y}
                    stroke={edge.verification_status === 'human_verified' ? '#34d399' : edge.verification_status === 'disputed' ? '#fb923c' : '#8B7CFF'}
                    strokeOpacity={0.55}
                    strokeWidth={1.8}
                    strokeDasharray={dashed ? '5,4' : undefined}
                  />
                </g>
              )
            })}
            {(graph?.nodes || []).map((node) => {
              const pos = nodePositions.get(node.id)
              if (!pos) return null
              const isSelected = selectedNode?.id === node.id
              return (
                <g
                  key={node.id}
                  onClick={() => setSelectedNode(node)}
                  className="cursor-pointer"
                >
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r={isSelected ? 18 : 14}
                    fill={node.node_type === 'incident' ? '#8B7CFF' : node.node_type === 'image' || node.node_type === 'evidence' ? '#38bdf8' : '#1E2749'}
                    stroke={isSelected ? '#F4F5FF' : '#8B7CFF'}
                    strokeWidth={isSelected ? 2.5 : 1.2}
                  />
                  <text
                    x={pos.x}
                    y={pos.y + 26}
                    textAnchor="middle"
                    fill="#CBD5E1"
                    fontSize="10"
                  >
                    {node.label.slice(0, 20)}
                  </text>
                </g>
              )
            })}
          </svg>
        </div>

        {/* Node Details */}
        <div className="bg-[#12172B] border border-[#A6AEC8]/15 rounded-2xl p-4 space-y-3">
          <h2 className="text-sm font-semibold text-[#F4F5FF]">Node Inspector</h2>
          {selectedNode ? (
            <div className="space-y-2 text-xs text-[#A6AEC8]">
              <div><span className="text-[#727D9C]">Type:</span> <span className="text-[#F4F5FF] font-mono">{selectedNode.node_type}</span></div>
              <div><span className="text-[#727D9C]">Label:</span> <span className="text-[#F4F5FF]">{selectedNode.label}</span></div>
              {selectedNode.entity_ref_id && (
                <div><span className="text-[#727D9C]">Source ID:</span> <span className="font-mono">{selectedNode.entity_ref_id}</span></div>
              )}
              <pre className="p-2 rounded-lg bg-[#0B0F1E] text-[11px] overflow-x-auto">
                {JSON.stringify(selectedNode.metadata, null, 2)}
              </pre>
            </div>
          ) : (
            <p className="text-xs text-[#727D9C]">Select a node in the graph to inspect its provenance and metadata.</p>
          )}
        </div>
      </div>

      {/* Relationship Review Table */}
      <div className="bg-[#12172B] border border-[#A6AEC8]/15 rounded-2xl p-4 space-y-3">
        <h2 className="text-sm font-semibold text-[#F4F5FF] flex items-center gap-2">
          <Link2 className="w-4 h-4 text-[#8B7CFF]" />
          Relationships &amp; Provenance Review
        </h2>
        <div className="space-y-2">
          {(graph?.edges || []).map((edge: GraphEdge) => {
            const src = nodeMap.get(edge.source_node_id)
            const tgt = nodeMap.get(edge.target_node_id)
            return (
              <div key={edge.id} className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 rounded-xl bg-[#0B0F1E] border border-[#A6AEC8]/10">
                <div className="space-y-1 text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-[#F4F5FF]">{src?.label || edge.source_node_id}</span>
                    <span className="px-2 py-0.5 rounded bg-[#1D2540] text-[#8B7CFF] font-mono text-[10px]">{edge.relationship_type}</span>
                    <span className="font-semibold text-[#F4F5FF]">{tgt?.label || edge.target_node_id}</span>
                    <span className={`px-2 py-0.5 rounded border text-[10px] font-mono ${STATUS_BADGE[edge.verification_status] || ''}`}>
                      {edge.verification_status}
                    </span>
                  </div>
                  <div className="text-[#727D9C]">
                    Method: <span className="text-[#A6AEC8]">{edge.extraction_method}</span>
                    {edge.supporting_ref ? ` • Ref: ${edge.supporting_ref}` : ''}
                    {edge.confidence_note ? ` • ${edge.confidence_note}` : ''}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleReviewEdge(edge.id, 'human_verified')}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 text-xs"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Confirm
                  </button>
                  <button
                    onClick={() => handleReviewEdge(edge.id, 'disputed')}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 text-xs"
                  >
                    <AlertTriangle className="w-3.5 h-3.5" /> Dispute
                  </button>
                  <button
                    onClick={() => handleReviewEdge(edge.id, 'rejected')}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/15 text-rose-300 hover:bg-rose-500/25 text-xs"
                  >
                    <XCircle className="w-3.5 h-3.5" /> Reject
                  </button>
                </div>
              </div>
            )
          })}
          {(!graph || graph.edges.length === 0) && (
            <p className="text-xs text-[#727D9C]">No relationships found. Click "Sync &amp; Suggest Links" to build the graph from incident evidence.</p>
          )}
        </div>
      </div>
    </div>
  )
}
