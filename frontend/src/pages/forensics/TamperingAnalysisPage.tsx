import React, { useEffect, useState } from 'react'
import { ScanSearch, Layers, Eye, EyeOff, AlertCircle, ShieldAlert, Columns2 } from 'lucide-react'
import { apiClient as api } from '../../services/api/client'
import type { Evidence, TamperingAnalysisResult } from '../../types'

interface SuspiciousRegion {
  region_id: number
  bbox: [number, number, number, number]
  area_percent: number
  mean_probability: number
  peak_probability: number
}

export const TamperingAnalysisPage: React.FC = () => {
  const [evidenceList, setEvidenceList] = useState<Evidence[]>([])
  const [selectedEvidenceId, setSelectedEvidenceId] = useState<string>('')
  const [preferredModel, setPreferredModel] = useState<'trufor' | 'catnet' | 'mantranet'>('trufor')
  const [results, setResults] = useState<TamperingAnalysisResult[]>([])
  const [showOverlay, setShowOverlay] = useState(true)
  const [viewMode, setViewMode] = useState<'overlay' | 'side-by-side'>('overlay')
  const [overlayOpacity, setOverlayOpacity] = useState(0.65)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [evidenceImgUrl, setEvidenceImgUrl] = useState<string | null>(null)
  const [heatmapImgUrl, setHeatmapImgUrl] = useState<string | null>(null)
  const [maskImgUrl, setMaskImgUrl] = useState<string | null>(null)

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

  useEffect(() => {
    let active = true
    const createdUrls: string[] = []
    const loadProtectedImage = async (url: string | null | undefined, setter: (v: string | null) => void) => {
      if (!url) {
        setter(null)
        return
      }
      try {
        const token = api.getToken()
        const resp = await fetch(url, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
        if (!resp.ok) {
          setter(null)
          return
        }
        const blob = await resp.blob()
        const objUrl = URL.createObjectURL(blob)
        createdUrls.push(objUrl)
        if (active) setter(objUrl)
      } catch {
        if (active) setter(null)
      }
    }

    if (latest?.localization_available) {
      loadProtectedImage(`/api/v1/evidence/${latest.evidence_id}/download`, setEvidenceImgUrl)
      loadProtectedImage(latest.heatmap_reference, setHeatmapImgUrl)
      loadProtectedImage(latest.mask_reference, setMaskImgUrl)
    } else {
      setEvidenceImgUrl(null)
      setHeatmapImgUrl(null)
      setMaskImgUrl(null)
    }

    return () => {
      active = false
      createdUrls.forEach((u) => URL.revokeObjectURL(u))
    }
  }, [latest?.id, latest?.evidence_id, latest?.localization_available, latest?.heatmap_reference, latest?.mask_reference])

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl uppercase tracking-[0.02em] font-bold text-[#f0f2eb] flex items-center gap-2.5">
            <ScanSearch className="w-6 h-6 text-[#d5ff54]" />
            Image Tampering Localization
          </h1>
          <p className="text-sm text-[#929b93] mt-1">
            Localized manipulation detection (splicing, copy-move) using ForensicHub / IMDL models. Never alters original evidence.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedEvidenceId}
            onChange={(e) => setSelectedEvidenceId(e.target.value)}
            className="bg-[#0d1110] border border-[rgba(225,239,221,0.20)] rounded-xl px-3 py-2 text-xs text-[#f0f2eb]"
          >
            {evidenceList.map((e) => (
              <option key={e.id} value={e.id}>{e.original_filename}</option>
            ))}
          </select>

          <select
            value={preferredModel}
            onChange={(e) => setPreferredModel(e.target.value as 'trufor' | 'catnet' | 'mantranet')}
            className="bg-[#0d1110] border border-[rgba(225,239,221,0.20)] rounded-xl px-3 py-2 text-xs text-[#f0f2eb]"
          >
            <option value="trufor">TruFor (Noiseprint++ + CMX)</option>
            <option value="catnet">CAT-Net (DCT Compression)</option>
            <option value="mantranet">ManTra-Net</option>
          </select>

          <button
            onClick={handleAnalyze}
            disabled={loading || !selectedEvidenceId}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#d5ff54] hover:bg-[#e2ff84] text-[#080a08] text-xs font-semibold disabled:opacity-50"
          >
            <Layers className="w-3.5 h-3.5" />
            {loading ? 'Analyzing...' : 'Run Localization'}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-[rgba(255,146,126,0.10)] border border-[rgba(255,146,126,0.32)] text-[#ff927e] text-xs">
          {error}
        </div>
      )}

      {latest && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-[#0d1110] border border-[rgba(225,239,221,0.15)] rounded-2xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-xs font-mono text-[#929b93]">
                MODEL: {latest.model_id.toUpperCase()} ({latest.model_version}) • STATUS: {latest.analysis_status.toUpperCase()}
              </div>
              {latest.localization_available && (
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => setViewMode((m) => (m === 'overlay' ? 'side-by-side' : 'overlay'))}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#111716] text-xs text-[#f0f2eb]"
                  >
                    <Columns2 className="w-3.5 h-3.5" />
                    {viewMode === 'overlay' ? 'Side-by-Side' : 'Overlay View'}
                  </button>
                  {viewMode === 'overlay' && (
                    <>
                      <button
                        onClick={() => setShowOverlay((v) => !v)}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#111716] text-xs text-[#f0f2eb]"
                      >
                        {showOverlay ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        {showOverlay ? 'Hide Overlay' : 'Show Overlay'}
                      </button>
                      <label className="flex items-center gap-2 text-[11px] text-[#929b93]">
                        Opacity
                        <input
                          type="range"
                          min={0.1}
                          max={1}
                          step={0.05}
                          value={overlayOpacity}
                          onChange={(e) => setOverlayOpacity(Number(e.target.value))}
                        />
                      </label>
                    </>
                  )}
                </div>
              )}
            </div>

            {!latest.localization_available ? (
              <div className="p-6 rounded-xl bg-[#070908] border border-[rgba(255,146,126,0.28)] space-y-2">
                <div className="flex items-center gap-2 text-[#ff927e] font-semibold text-sm">
                  <AlertCircle className="w-4 h-4" />
                  Localization Unavailable (No Fake Heatmap Generated)
                </div>
                <p className="text-xs text-[#929b93]">
                  SafeHER enforces strict forensic integrity and will never synthesize mock heatmaps or pixel-threshold overlays when a verified pretrained IMDL checkpoint is absent.
                </p>
                {latest.warnings.map((w, idx) => (
                  <p key={idx} className="text-xs text-[#ff927e]/80 font-mono">• {w}</p>
                ))}
              </div>
            ) : viewMode === 'side-by-side' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-[#070908] rounded-xl p-3">
                <div className="space-y-1.5 text-center">
                  <div className="text-[11px] font-mono text-[#929b93]">ORIGINAL EVIDENCE</div>
                  {evidenceImgUrl && (
                    <img
                      src={evidenceImgUrl}
                      alt="Original evidence"
                      className="max-h-[380px] w-auto mx-auto object-contain rounded-lg"
                    />
                  )}
                </div>
                <div className="space-y-1.5 text-center">
                  <div className="text-[11px] font-mono text-[#929b93]">LOCALIZATION PROBABILITY MAP</div>
                  {maskImgUrl && (
                    <img
                      src={maskImgUrl}
                      alt="Tampering localization mask"
                      className="max-h-[380px] w-auto mx-auto object-contain rounded-lg"
                    />
                  )}
                </div>
              </div>
            ) : (
              <div className="relative bg-[#070908] rounded-xl overflow-hidden flex items-center justify-center min-h-[320px]">
                {evidenceImgUrl && (
                  <img
                    src={evidenceImgUrl}
                    alt="Original evidence"
                    className="max-h-[420px] w-auto object-contain"
                  />
                )}
                {showOverlay && heatmapImgUrl && (
                  <img
                    src={heatmapImgUrl}
                    alt="Tampering heatmap overlay"
                    style={{ opacity: overlayOpacity }}
                    className="absolute inset-0 m-auto max-h-[420px] w-auto object-contain pointer-events-none"
                  />
                )}
              </div>
            )}
          </div>

          <div className="bg-[#0d1110] border border-[rgba(225,239,221,0.15)] rounded-2xl p-4 space-y-4">
            <h2 className="text-sm font-semibold text-[#f0f2eb]">Forensic Metadata &amp; Limitations</h2>
            <div className="space-y-2 text-xs text-[#929b93]">
              <div>Status: <span className="text-[#f0f2eb] font-mono">{latest.analysis_status}</span></div>
              <div>Checkpoint: <span className="text-[#f0f2eb] font-mono">{latest.checkpoint_id || 'none'}</span></div>
              {typeof latest.coordinate_transform?.checkpoint_sha256 === 'string' && (
                <div>SHA-256: <span className="text-[#f0f2eb] font-mono">{latest.coordinate_transform.checkpoint_sha256.slice(0, 16)}...</span></div>
              )}
              <div>Tampering Score: <span className="text-[#f0f2eb] font-mono">{latest.tampering_score ?? 'N/A'}</span></div>
              {typeof latest.coordinate_transform?.spatial_confidence === 'number' && (
                <div>Spatial Confidence: <span className="text-[#f0f2eb] font-mono">{latest.coordinate_transform.spatial_confidence}</span></div>
              )}
              <div>Dimensions: <span className="font-mono">{latest.original_dimensions.join('x')}</span></div>
              <div>Processing Time: <span className="font-mono">{latest.processing_time_ms} ms ({latest.device})</span></div>
            </div>

            {Array.isArray(latest.coordinate_transform?.suspicious_regions) &&
              (latest.coordinate_transform.suspicious_regions as SuspiciousRegion[]).length > 0 && (
                <div className="p-3 rounded-xl bg-[#070908] border border-[rgba(255,146,126,0.24)] space-y-1.5">
                  <div className="text-xs font-semibold text-[#ff927e]">
                    Suspicious Regions ({(latest.coordinate_transform.suspicious_regions as SuspiciousRegion[]).length})
                  </div>
                  {(latest.coordinate_transform.suspicious_regions as SuspiciousRegion[]).map((reg) => (
                    <div key={reg.region_id} className="text-[11px] font-mono text-[#929b93]">
                      #{reg.region_id} bbox=[{reg.bbox.join(', ')}] area={reg.area_percent}% peak={reg.peak_probability}
                    </div>
                  ))}
                </div>
              )}

            {latest.warnings.length > 0 && latest.localization_available && (
              <div className="p-3 rounded-xl bg-[rgba(255,146,126,0.08)] border border-[rgba(255,146,126,0.22)] space-y-1">
                {latest.warnings.map((w, idx) => (
                  <p key={idx} className="text-[11px] text-[#ff927e]">• {w}</p>
                ))}
              </div>
            )}

            <div className="p-3 rounded-xl bg-[#070908] border border-[rgba(225,239,221,0.10)] space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#ff927e]">
                <ShieldAlert className="w-3.5 h-3.5" /> Scientific Limitations
              </div>
              {latest.limitations.map((lim, i) => (
                <p key={i} className="text-[11px] text-[#929b93]">• {lim}</p>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
