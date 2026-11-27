import React, { useEffect, useState } from 'react'
import { ScanSearch, Layers, Eye, EyeOff, AlertCircle, ShieldAlert } from 'lucide-react'
import { apiClient as api } from '../../services/api/client'
import type { Evidence, TamperingAnalysisResult } from '../../types'

export const TamperingAnalysisPage: React.FC = () => {
  const [evidenceList, setEvidenceList] = useState<Evidence[]>([])
  const [selectedEvidenceId, setSelectedEvidenceId] = useState<string>('')
  const [preferredModel, setPreferredModel] = useState<'trufor' | 'catnet' | 'mantranet'>('trufor')
  const [results, setResults] = useState<TamperingAnalysisResult[]>([])
  const [showOverlay, setShowOverlay] = useState(true)
  const [overlayOpacity, setOverlayOpacity] = useState(0.65)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.getAllEvidence().then((items: Evidence[]) => {
      const images = items.filter((i: Evidence) => (i.file_type || '').toLowerCase().includes('image'))
      setEvidenceList(images)
      if (images.length > 0) setSelectedEvidenceId(images[0].id)
    }).catch(() => setError('Failed to load evidence items.'))
  }, [])

  useEffect(() => {
    if (!selectedEvidenceId) return
    api.listTamperingAnalyses(selectedEvidenceId).then(setResults).catch(() => {})
  }, [selectedEvidenceId])

  const handleAnalyze = async () => {
    if (!selectedEvidenceId) return
    setLoading(true)
    setError(null)
    try {
      const res = await api.analyzeTampering(selectedEvidenceId, preferredModel)
      setResults((prev) => [res, ...prev])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Tampering analysis failed.')
    } finally {
      setLoading(false)
    }
  }

  const latest = results[0]

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#F4F5FF] flex items-center gap-2.5">
            <ScanSearch className="w-6 h-6 text-[#8B7CFF]" />
            Image Tampering Localization
          </h1>
          <p className="text-sm text-[#A6AEC8] mt-1">
            Localized manipulation detection (splicing, copy-move) using ForensicHub / IMDL models. Never alters original evidence.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedEvidenceId}
            onChange={(e) => setSelectedEvidenceId(e.target.value)}
            className="bg-[#12172B] border border-[#A6AEC8]/20 rounded-xl px-3 py-2 text-xs text-[#F4F5FF]"
          >
            {evidenceList.map((e) => (
              <option key={e.id} value={e.id}>{e.original_filename}</option>
            ))}
          </select>

          <select
            value={preferredModel}
            onChange={(e) => setPreferredModel(e.target.value as 'trufor' | 'catnet' | 'mantranet')}
            className="bg-[#12172B] border border-[#A6AEC8]/20 rounded-xl px-3 py-2 text-xs text-[#F4F5FF]"
          >
            <option value="trufor">TruFor (Noiseprint++ + CMX)</option>
            <option value="catnet">CAT-Net (DCT Compression)</option>
            <option value="mantranet">ManTra-Net</option>
          </select>

          <button
            onClick={handleAnalyze}
            disabled={loading || !selectedEvidenceId}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#8B7CFF] hover:bg-[#7A69FF] text-white text-xs font-semibold disabled:opacity-50"
          >
            <Layers className="w-3.5 h-3.5" />
            {loading ? 'Analyzing...' : 'Run Localization'}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
          {error}
        </div>
      )}

      {latest && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-[#12172B] border border-[#A6AEC8]/15 rounded-2xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-xs font-mono text-[#A6AEC8]">
                MODEL: {latest.model_id.toUpperCase()} ({latest.model_version}) • STATUS: {latest.analysis_status.toUpperCase()}
              </div>
              {latest.localization_available && (
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowOverlay((v) => !v)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#1D2540] text-xs text-[#F4F5FF]"
                  >
                    {showOverlay ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    {showOverlay ? 'Hide Overlay' : 'Show Overlay'}
                  </button>
                  <input
                    type="range"
                    min={0.1}
                    max={1}
                    step={0.05}
                    value={overlayOpacity}
                    onChange={(e) => setOverlayOpacity(Number(e.target.value))}
                  />
                </div>
              )}
            </div>

            {!latest.localization_available ? (
              <div className="p-6 rounded-xl bg-[#0B0F1E] border border-amber-500/30 space-y-2">
                <div className="flex items-center gap-2 text-amber-300 font-semibold text-sm">
                  <AlertCircle className="w-4 h-4" />
                  Localization Unavailable (No Fake Heatmap Generated)
                </div>
                <p className="text-xs text-[#A6AEC8]">
                  SafeHER enforces strict forensic integrity and will never synthesize mock heatmaps or pixel-threshold overlays when a verified pretrained IMDL checkpoint is absent.
                </p>
                {latest.warnings.map((w, idx) => (
                  <p key={idx} className="text-xs text-amber-200/80 font-mono">• {w}</p>
                ))}
              </div>
            ) : (
              <div className="relative bg-[#0B0F1E] rounded-xl overflow-hidden flex items-center justify-center min-h-[320px]">
                <img
                  src={`/api/v1/evidence/${latest.evidence_id}/download`}
                  alt="Original evidence"
                  className="max-h-[420px] w-auto object-contain"
                />
                {showOverlay && latest.heatmap_reference && (
                  <img
                    src={latest.heatmap_reference}
                    alt="Tampering heatmap overlay"
                    style={{ opacity: overlayOpacity }}
                    className="absolute inset-0 m-auto max-h-[420px] w-auto object-contain pointer-events-none"
                  />
                )}
              </div>
            )}
          </div>

          <div className="bg-[#12172B] border border-[#A6AEC8]/15 rounded-2xl p-4 space-y-4">
            <h2 className="text-sm font-semibold text-[#F4F5FF]">Forensic Metadata &amp; Limitations</h2>
            <div className="space-y-2 text-xs text-[#A6AEC8]">
              <div>Status: <span className="text-[#F4F5FF] font-mono">{latest.analysis_status}</span></div>
              <div>Checkpoint: <span className="text-[#F4F5FF] font-mono">{latest.checkpoint_id || 'none'}</span></div>
              <div>Tampering Score: <span className="text-[#F4F5FF] font-mono">{latest.tampering_score ?? 'N/A'}</span></div>
              <div>Dimensions: <span className="font-mono">{latest.original_dimensions.join('x')}</span></div>
              <div>Processing Time: <span className="font-mono">{latest.processing_time_ms} ms ({latest.device})</span></div>
            </div>

            <div className="p-3 rounded-xl bg-[#0B0F1E] border border-[#A6AEC8]/10 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-300">
                <ShieldAlert className="w-3.5 h-3.5" /> Scientific Limitations
              </div>
              {latest.limitations.map((lim, i) => (
                <p key={i} className="text-[11px] text-[#A6AEC8]">• {lim}</p>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
