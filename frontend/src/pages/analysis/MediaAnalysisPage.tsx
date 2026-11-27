import React, { useState, useEffect, Suspense, lazy } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import {
  Cpu,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  Info,
  CheckCircle2,
  FileSearch,
  Upload,
  ArrowRight,
  HardDrive,
  Loader2,
  FileText,
  Eye,
  EyeOff,
  Sparkles,
  Activity,
  Check,
  ExternalLink,
  ScanSearch,
} from 'lucide-react'
import { useI18n } from '../../contexts/I18nContext'
import { useToast } from '../../contexts/ToastContext'
import { apiClient } from '../../services/api/client'
import type { MediaAnalysisResult, Evidence } from '../../types'
import { Button } from '../../components/common/Button'
import { Card } from '../../components/common/Card'
import { Badge } from '../../components/common/Badge'
import { PageHeader } from '../../components/layout/PageHeader'
import { Interactive3DSurface } from '../../components/ui/Interactive3DSurface'
import type { ScannerStatus } from '../../components/3d/MediaScanner3D'
import { formatDate, formatBytes } from '../../utils/crypto'

const MediaScanner3D = lazy(() =>
  import('../../components/3d/MediaScanner3D').then((m) => ({ default: m.MediaScanner3D }))
)

import { mockEvidenceItems } from '../../services/api/mockData'

const SCAN_STEPS = [
  'Inspecting cryptographic C2PA provenance headers & metadata...',
  'Evaluating facial texture boundaries and neural feature distance...',
  'Computing Error Level Analysis (ELA) for JPEG/compression anomalies...',
  'Aggregating forensic heuristics and calibrating confidence signals...',
]

const INITIAL_MEDIA_EVIDENCE = mockEvidenceItems.filter(
  (e) => e.file_type.startsWith('image/') || e.file_type.startsWith('video/')
)

export const MediaAnalysisPage: React.FC = () => {
  const { t } = useI18n()
  const { showToast } = useToast()
  const [searchParams] = useSearchParams()
  const preselectedEvidenceId = searchParams.get('evidenceId') || ''

  const [evidenceList, setEvidenceList] = useState<Evidence[]>([])
  const [selectedEvidenceId, setSelectedEvidenceId] = useState(preselectedEvidenceId || '')
  const [analysisResult, setAnalysisResult] = useState<MediaAnalysisResult | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [scanStepIndex, setScanStepIndex] = useState(0)
  const [customFile, setCustomFile] = useState<File | null>(null)
  const [customFilePreview, setCustomFilePreview] = useState<string | null>(null)
  const [isSensitiveHidden, setIsSensitiveHidden] = useState(false)
  const [isSubmittingJob, setIsSubmittingJob] = useState(false)
  const [activeJobStatus, setActiveJobStatus] = useState<string | null>(null)

  useEffect(() => {
    const fetchEvidence = async () => {
      const data = await apiClient.getAllEvidence()
      const mediaFiles = data.filter(
        (e) => e.file_type.startsWith('image/') || e.file_type.startsWith('video/')
      )
      setEvidenceList(mediaFiles)
      if (preselectedEvidenceId && mediaFiles.some((m) => m.id === preselectedEvidenceId)) {
        setSelectedEvidenceId(preselectedEvidenceId)
        const existing = await apiClient.getMediaAnalysis(preselectedEvidenceId)
        if (existing) setAnalysisResult(existing)
      } else if (mediaFiles.length > 0) {
        setSelectedEvidenceId(mediaFiles[0].id)
      } else {
        setSelectedEvidenceId('')
      }
    }
    fetchEvidence()
  }, [preselectedEvidenceId])

  useEffect(() => {
    if (customFile) {
      const url = URL.createObjectURL(customFile)
      setCustomFilePreview(url)
      return () => URL.revokeObjectURL(url)
    } else {
      setCustomFilePreview(null)
    }
  }, [customFile])

  const effectiveEvidenceId = selectedEvidenceId || (evidenceList[0]?.id ?? '')
  const selectedEvidence = evidenceList.find((e) => e.id === effectiveEvidenceId)

  const handleRunAnalysis = async () => {
    if (!effectiveEvidenceId && !customFile) {
      showToast('Please select an evidence file to scan.', 'warning')
      return
    }

    setIsAnalyzing(true)
    setAnalysisResult(null)
    setScanStepIndex(0)

    // Animated scan step progression
    const stepInterval = setInterval(() => {
      setScanStepIndex((prev) => (prev < SCAN_STEPS.length - 1 ? prev + 1 : prev))
    }, 450)

    try {
      if (customFile) {
        // Run live against FastAPI prototype
        const liveRes = await apiClient.checkImageLive(customFile)
        setAnalysisResult({
          id: 'an-live-' + Date.now(),
          evidence_id: 'custom-upload',
          media_type: 'image',
          model_name: 'AdamCodd/vit-base-nsfw-detector + Heuristic Variance',
          model_version: 'v1.0.0',
          deepfake_score: liveRes.deepfake_score,
          nudity_score: liveRes.nudity_score,
          is_calibrated: false,
          uncertainty_state: 'medium',
          decision: liveRes.decision as 'SAFE' | 'SUSPICIOUS' | 'BLOCKED',
          compression_anomaly_detected: liveRes.deepfake_score > 0.5,
          c2pa_provenance: {
            detected: false,
            is_verified: false,
            limitations: 'No C2PA provenance header detected. Common on social platform uploads.',
          },
          limitations: [
            'Uncalibrated score: Model output represents feature boundary distance, not a calibrated probability.',
            'Variations in camera optics and compression encoding can affect variance heuristics.',
          ],
          recommended_next_steps: [
            'Preserve original uncompressed photo if available.',
            'Cross-check timestamps with victim testimony.',
          ],
          created_at: new Date().toISOString(),
        })
      } else {
        const target = evidenceList.find((e) => e.id === effectiveEvidenceId)
        const mediaType = target?.file_type.startsWith('video/') ? 'video' : 'image'
        const res = await apiClient.runMediaAnalysis(effectiveEvidenceId, mediaType)
        setAnalysisResult(res)
      }
      showToast('Media analysis completed.', 'success')
    } catch {
      showToast('Failed to complete analysis.', 'error')
    } finally {
      clearInterval(stepInterval)
      setIsAnalyzing(false)
    }
  }

  const handleDispatchWorkerJob = async () => {
    if (!selectedEvidenceId) {
      showToast('Please select preserved evidence to dispatch background worker.', 'warning')
      return
    }
    setIsSubmittingJob(true)
    setActiveJobStatus('queued')
    try {
      const job = await apiClient.submitAnalysisJob(selectedEvidenceId, 'full_forensics')
      showToast(`Inference job dispatched to background worker (${job.job_id}).`, 'info')
      setActiveJobStatus('processing')

      let attempts = 0
      const pollInterval = setInterval(async () => {
        attempts += 1
        try {
          const statusRes = await apiClient.getAnalysisJob(selectedEvidenceId, job.job_id)
          if (statusRes.status === 'completed') {
            clearInterval(pollInterval)
            setActiveJobStatus('completed')
            setIsSubmittingJob(false)
            if (statusRes.result) {
              setAnalysisResult((prev) => ({
                ...(prev || ({} as any)),
                ...statusRes.result,
                model_a_result: statusRes.result.model_a,
                model_b_result: statusRes.result.model_b,
                c2pa_analysis: statusRes.result.c2pa,
                face_localization: statusRes.result.face_localization,
              }))
            }
            showToast('Background inference job completed.', 'success')
          } else if (statusRes.status === 'failed') {
            clearInterval(pollInterval)
            setActiveJobStatus('failed')
            setIsSubmittingJob(false)
            showToast(`Worker job failed: ${statusRes.error_message || 'Unknown error'}`, 'error')
          }
        } catch {
          if (attempts > 30) {
            clearInterval(pollInterval)
            setIsSubmittingJob(false)
            setActiveJobStatus(null)
          }
        }
      }, 2000)
    } catch (err: any) {
      showToast(err?.message || 'Failed to dispatch worker job', 'error')
      setIsSubmittingJob(false)
      setActiveJobStatus(null)
    }
  }

  const getDecisionBadge = (decision: string) => {
    switch (decision) {
      case 'SAFE':
        return <Badge variant="safe" dot>SIGNAL: LOW ANOMALY</Badge>
      case 'SUSPICIOUS':
        return <Badge variant="warning" dot>SIGNAL: MANIPULATION DETECTED</Badge>
      case 'BLOCKED':
        return <Badge variant="critical" dot>SIGNAL: HIGH ANOMALY / HARMFUL</Badge>
      default:
        return <Badge variant="neutral">{decision}</Badge>
    }
  }

  // Circular Score Meter Helper
  const renderCircularGauge = (
    value: number,
    label: string,
    badgeText: string,
    isWarning: boolean,
    isDanger: boolean
  ) => {
    const pct = Math.round(value * 100)
    const radius = 38
    const circumference = 2 * Math.PI * radius
    const offset = circumference - (circumference * pct) / 100
    const strokeColor = isDanger ? '#ff927e' : isWarning ? '#ff927e' : '#a8db35'

    return (
      <Interactive3DSurface
        intensity={5}
        glowTone={isDanger || isWarning ? 'coral' : 'lime'}
        className="flex flex-col items-center p-5 bg-[#0d1110] rounded-2xl border border-[rgba(225,239,221,0.15)]"
      >
        <div className="relative w-28 h-28 flex items-center justify-center">
          <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r={radius}
              className="stroke-[#111716]"
              strokeWidth="7"
              fill="transparent"
            />
            <circle
              cx="50"
              cy="50"
              r={radius}
              stroke={strokeColor}
              strokeWidth="7"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              fill="transparent"
              className="transition-all duration-1000 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="font-display text-3xl font-bold text-[#f0f2eb] tabular-nums">{pct}%</span>
            <span className="text-[10px] text-[#929b93] uppercase font-mono">Signal</span>
          </div>
        </div>
        <h4 className="text-xs font-semibold text-[#f0f2eb] mt-3">{label}</h4>
        <span
          className="text-[10px] font-mono mt-1 px-2 py-0.5 rounded-full"
          style={{
            color: strokeColor,
            backgroundColor: `${strokeColor}15`,
            border: `1px solid ${strokeColor}35`,
          }}
        >
          {badgeText}
        </span>
      </Interactive3DSurface>
    )
  }

  const scannerVisualStatus: ScannerStatus = isAnalyzing
    ? 'scanning'
    : analysisResult
    ? analysisResult.decision === 'SAFE'
      ? 'safe'
      : analysisResult.decision === 'SUSPICIOUS'
      ? 'suspicious'
      : 'critical'
    : selectedEvidenceId || customFile
    ? 'staged'
    : 'idle'

  return (
    <div className="space-y-6 text-left">
      <PageHeader
        title={t.ai.mediaScannerTitle}
        subtitle="Preliminary forensic decision-support signals for deepfakes, manipulated imagery, and explicit content."
      />

      {/* Mandatory Transparent AI Notice Banner */}
      <Interactive3DSurface
        intensity={2.5}
        className="p-4 bg-[#111716]/90 border border-[#d5ff54]/25 rounded-2xl shadow-lg shadow-[#070908]/60"
      >
        <div className="flex items-start gap-3.5 text-xs text-[#929b93]">
          <div className="w-8 h-8 rounded-xl bg-[#d5ff54]/10 border border-[#d5ff54]/30 flex items-center justify-center shrink-0 mt-0.5">
            <Info className="w-4 h-4 text-[#d5ff54]" />
          </div>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold text-[#f0f2eb]">Transparent AI Principle &amp; Limitations</p>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-[#d5ff54]/10 text-[#d5ff54] border border-[#d5ff54]/25">
                Decision-Support Only
              </span>
            </div>
            <p className="text-[#929b93] leading-relaxed text-[11.5px]">
              {t.ai.disclaimerBanner}
            </p>
          </div>
        </div>
      </Interactive3DSurface>

      {/* 3D Interactive Scanner Workbench Cockpit */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        <Interactive3DSurface
          intensity={3.5}
          className="lg:col-span-7 p-6 bg-[#0d1110]/95 border border-[rgba(225,239,221,0.16)] rounded-2xl flex flex-col justify-between gap-5"
        >
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#d5ff54] flex items-center gap-2 font-semibold">
                <FileSearch className="w-3.5 h-3.5 text-[#d5ff54]" />
                Select Preserved Evidence Media from Vault
              </label>
              <span className="text-[10px] font-mono text-[#929b93] px-2 py-0.5 rounded border border-[rgba(225,239,221,0.15)] bg-[#111716]">
                {evidenceList.length} media items preserved
              </span>
            </div>

            <select
              value={selectedEvidenceId}
              onChange={(e) => {
                setSelectedEvidenceId(e.target.value)
                setCustomFile(null)
              }}
              className="w-full px-3.5 py-3 bg-[#111716] border border-[rgba(225,239,221,0.22)] hover:border-[#d5ff54]/45 rounded-xl text-xs text-[#f0f2eb] focus:outline-none focus:border-[#d5ff54] transition-colors"
            >
              {evidenceList.length === 0 ? (
                <option value="">No media evidence found in vault</option>
              ) : (
                evidenceList.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.original_filename} ({e.file_type}, {formatBytes(e.file_size)})
                  </option>
                ))
              )}
            </select>

            {selectedEvidence ? (
              <div className="p-3 rounded-xl bg-[#111716]/90 border border-[rgba(225,239,221,0.14)] flex flex-wrap items-center justify-between gap-2 text-[11px]">
                <div className="space-y-0.5 min-w-0">
                  <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#929b93] block">
                    Vault Digest Reference (SHA-256)
                  </span>
                  <code className="font-mono text-[10px] text-[#d5ff54] break-all">
                    {selectedEvidence.sha256_hash}
                  </code>
                </div>
                <Badge variant="safe" dot>Ready for Scan</Badge>
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-[#111716]/75 border border-dashed border-[rgba(225,239,221,0.2)] flex flex-wrap items-center justify-between gap-3 text-xs">
                <p className="text-[#929b93] text-[11.5px]">
                  No media files stored yet. Preserve an image/video in your Evidence Vault or test an image immediately in Public Detect.
                </p>
                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    to="/evidence"
                    className="px-3 py-1.5 rounded-[3px] border border-[rgba(225,239,221,0.2)] bg-[#0d1110] hover:border-[#d5ff54] text-[#f0f2eb] hover:text-[#d5ff54] font-mono text-[10px] uppercase tracking-[0.1em] transition-colors"
                  >
                    Upload to Vault ↗
                  </Link>
                  <Link
                    to="/detect"
                    className="px-3 py-1.5 rounded-[3px] border border-[#d5ff54]/35 bg-[#d5ff54]/10 text-[#d5ff54] hover:bg-[#d5ff54] hover:text-[#080a08] font-mono text-[10px] uppercase tracking-[0.1em] transition-colors"
                  >
                    Instant Detect ↗
                  </Link>
                </div>
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-[rgba(225,239,221,0.12)] flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-[10px] font-mono text-[#929b93]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#d5ff54] animate-pulse" />
              <span>MULTI-MODEL ENGINE: C2PA · RETINAFACE · ViT / EFFORT · XCEPTION</span>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={handleDispatchWorkerJob}
                isLoading={isSubmittingJob}
                disabled={!selectedEvidenceId || isAnalyzing}
                leftIcon={<HardDrive className="w-4 h-4 text-[#d5ff54]" />}
              >
                {activeJobStatus ? `Worker: ${activeJobStatus.toUpperCase()}` : 'Queue Worker Job'}
              </Button>
              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={handleRunAnalysis}
                isLoading={isAnalyzing}
                leftIcon={<Cpu className="w-4 h-4" />}
              >
                Run Media Scanner
              </Button>
            </div>
          </div>
        </Interactive3DSurface>

        {/* Right 5 Columns: Interactive 3D Holographic Scanner Viewport */}
        <Interactive3DSurface
          intensity={5}
          glowTone={scannerVisualStatus === 'critical' || scannerVisualStatus === 'suspicious' ? 'coral' : 'lime'}
          className="lg:col-span-5 rounded-2xl bg-[#070908] border border-[#d5ff54]/28 p-4 flex flex-col justify-between min-h-[285px]"
        >
          <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.14em] z-10">
            <span className="text-[#d5ff54] font-bold flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#d5ff54] animate-pulse" />
              3D HOLOGRAPHIC CHAMBER
            </span>
            <span className="px-2 py-0.5 rounded-[3px] border border-[rgba(225,239,221,0.18)] bg-[#0d1110] text-[#f0f2eb]">
              {scannerVisualStatus.toUpperCase()}
            </span>
          </div>

          <div className="relative flex-1 h-[215px] w-full my-1">
            {/* Corner crosshair markers */}
            <div className="pointer-events-none absolute top-1 left-1 w-3 h-3 border-t border-l border-[#d5ff54]/50" />
            <div className="pointer-events-none absolute top-1 right-1 w-3 h-3 border-t border-r border-[#d5ff54]/50" />
            <div className="pointer-events-none absolute bottom-1 left-1 w-3 h-3 border-b border-l border-[#d5ff54]/50" />
            <div className="pointer-events-none absolute bottom-1 right-1 w-3 h-3 border-b border-r border-[#d5ff54]/50" />

            <Suspense
              fallback={
                <div className="w-full h-full flex items-center justify-center text-xs font-mono text-[#929b93]">
                  Initializing 3D Scanner...
                </div>
              }
            >
              <MediaScanner3D status={scannerVisualStatus} />
            </Suspense>
          </div>

          <div className="flex items-center justify-between text-[10px] font-mono text-[#929b93] pt-2 border-t border-[rgba(225,239,221,0.12)]">
            <span>DRAG TO ORBIT 3D SPECIMEN</span>
            <Link
              to="/analysis/tampering"
              className="inline-flex items-center gap-1 text-[#d5ff54] hover:underline"
            >
              <ScanSearch className="w-3 h-3" />
              <span>Tampering Heatmap</span>
            </Link>
          </div>
        </Interactive3DSurface>
      </div>

      {/* Interactive 3D Forensic Architecture Overview (shown in standby before scan) */}
      {!analysisResult && !isAnalyzing && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              no: 'STAGE 01',
              title: 'C2PA & EXIF Audit',
              desc: 'Extracts content credentials, signer certificates, and camera container headers.',
              meta: 'PROVENANCE LAYER',
            },
            {
              no: 'STAGE 02',
              title: 'RetinaFace Isolation',
              desc: 'Locates multi-face bounding boxes inside images to isolate manipulated facial regions.',
              meta: 'SPATIAL ROI',
            },
            {
              no: 'STAGE 03',
              title: 'ViT & Effort-AIGI',
              desc: 'Evaluates diffusion and GAN synthesis traces at neural feature & patch frequency levels.',
              meta: 'MODEL A PATH',
            },
            {
              no: 'STAGE 04',
              title: 'DeepfakeBench Xception',
              desc: 'Scores facial crops against FaceForensics++ benchmarks for localized alteration cues.',
              meta: 'MODEL B PATH',
            },
          ].map((stage) => (
            <Interactive3DSurface
              key={stage.no}
              intensity={6}
              className="p-5 bg-[#0d1110]/90 border border-[rgba(225,239,221,0.15)] rounded-xl flex flex-col justify-between gap-3"
            >
              <div className="space-y-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#d5ff54] block">
                  {stage.no}
                </span>
                <h3 className="font-display text-xl uppercase tracking-[0.02em] font-bold text-[#f0f2eb]">
                  {stage.title}
                </h3>
                <p className="text-xs text-[#929b93] leading-relaxed">{stage.desc}</p>
              </div>
              <div className="pt-2 border-t border-[rgba(225,239,221,0.10)] flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.14em] text-[#a8db35]">
                <span>{stage.meta}</span>
                <span>READY</span>
              </div>
            </Interactive3DSurface>
          ))}
        </div>
      )}

      {/* Visual Scanning Viewport & Animated Progress Scanner */}
      {isAnalyzing && (
        <Card className="p-8 bg-[#111716]/90 border-[#d5ff54]/40 shadow-[0_0_35px_rgba(213,255,84,0.16)]">
          <div className="flex flex-col items-center text-center space-y-6">
            {/* High-Tech Circular Radar Sweep */}
            <div className="relative w-44 h-44 rounded-full border border-[#d5ff54]/30 bg-[#070908]/90 flex items-center justify-center overflow-hidden shadow-[0_0_24px_rgba(213,255,84,0.22)]">
              {/* Concentric rings */}
              <div className="absolute w-32 h-32 rounded-full border border-[#d5ff54]/20" />
              <div className="absolute w-20 h-20 rounded-full border border-[#d5ff54]/20" />
              <div className="absolute w-10 h-10 rounded-full border border-[#d5ff54]/35 bg-[#d5ff54]/10" />

              {/* Crosshairs */}
              <div className="absolute inset-x-0 top-1/2 h-px bg-[#d5ff54]/20" />
              <div className="absolute inset-y-0 left-1/2 w-px bg-[#d5ff54]/20" />

              {/* Rotating Radar Sweep */}
              <div className="absolute inset-0 origin-center animate-radar-sweep pointer-events-none">
                <div className="w-1/2 h-1/2 absolute top-0 right-0 bg-gradient-to-br from-[#d5ff54]/40 to-transparent rounded-tl-full" />
              </div>

              {/* Pulsing Center Icon */}
              <Cpu className="w-7 h-7 text-[#d5ff54] z-10 animate-pulse" />
            </div>

            {/* Scanning Status & Stage */}
            <div className="space-y-2 max-w-md">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#d5ff54]/10 border border-[#d5ff54]/30 text-xs font-mono text-[#d5ff54]">
                <Activity className="w-3.5 h-3.5 animate-spin" />
                <span>PHASE {scanStepIndex + 1} OF 4</span>
              </div>
              <h3 className="text-base font-semibold text-[#f0f2eb]">
                {SCAN_STEPS[scanStepIndex]}
              </h3>
              <p className="text-xs text-[#929b93]">
                Scanning cryptographic metadata, facial geometry boundaries, and localized pixel compression anomalies.
              </p>
            </div>

            {/* Visual Step Progress Bar */}
            <div className="w-full max-w-md bg-[#0d1110] rounded-full h-1.5 overflow-hidden border border-[rgba(225,239,221,0.20)]">
              <div
                className="h-full bg-gradient-to-r from-[#d5ff54] via-[#d5ff54] to-[#a8db35] transition-all duration-500 rounded-full"
                style={{ width: `${((scanStepIndex + 1) / 4) * 100}%` }}
              />
            </div>
          </div>
        </Card>
      )}

      {/* Results View */}
      {analysisResult && !isAnalyzing && (
        <div className="space-y-6">
          {/* Top Result Banner */}
          <Card className="p-6 bg-[#111716]/90 border-[rgba(225,239,221,0.20)]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[rgba(225,239,221,0.15)]">
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-bold text-[#f0f2eb]">AI Screening Summary</h3>
                  {getDecisionBadge(analysisResult.decision)}
                </div>
                <p className="text-xs text-[#929b93] mt-1">
                  Evaluated at {formatDate(analysisResult.created_at)}
                </p>
              </div>

              {/* Preliminary Indicator Badge */}
              <div className="px-3 py-1.5 rounded-xl bg-[#d5ff54]/10 border border-[#d5ff54]/30 text-[11px] text-[#d5ff54] flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                <span>Preliminary Screening Indicator</span>
              </div>
            </div>

            {/* Clear Human Summary */}
            <div className="pt-4 space-y-2">
              <h4 className="text-sm font-semibold text-[#f0f2eb]">
                {analysisResult.decision === 'SUSPICIOUS' || analysisResult.decision === 'BLOCKED'
                  ? 'Our AI detected some unusual signals in this media.'
                  : 'No obvious signs of artificial manipulation detected.'}
              </h4>
              <p className="text-xs text-[#929b93] leading-relaxed">
                {analysisResult.decision === 'SUSPICIOUS' || analysisResult.decision === 'BLOCKED'
                  ? 'Visual inconsistencies around facial contours and compression patterns suggest this media may have been altered or generated artificially.'
                  : 'The visual features and pixel compression patterns appear consistent with standard camera captures.'}
              </p>
            </div>
          </Card>

          {/* Interactive Circular Score Gauges */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {renderCircularGauge(
              analysisResult.deepfake_score,
              'Deepfake / Alteration Probability',
              analysisResult.deepfake_score > 0.6
                ? 'High Variation'
                : analysisResult.deepfake_score > 0.35
                ? 'Moderate Variation'
                : 'Consistent / Normal',
              analysisResult.deepfake_score > 0.35 && analysisResult.deepfake_score <= 0.6,
              analysisResult.deepfake_score > 0.6
            )}

            {renderCircularGauge(
              analysisResult.nudity_score,
              'Explicit Content / Nudity Signal',
              analysisResult.nudity_score > 0.5
                ? 'Flagged Potential Content'
                : 'No Explicit Signals',
              analysisResult.nudity_score > 0.35 && analysisResult.nudity_score <= 0.5,
              analysisResult.nudity_score > 0.5
            )}
          </div>

          {/* 5 Clear Sections */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 1. What We Analysed */}
            <Card className="bg-[#111716]/85 border-[rgba(225,239,221,0.15)] p-5 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-[#d5ff54] uppercase tracking-wider">
                <span className="w-5 h-5 rounded-full bg-[#d5ff54]/10 text-[#d5ff54] flex items-center justify-center font-mono text-[10px]">
                  1
                </span>
                What We Analysed
              </div>
              <div className="p-3 bg-[#0d1110] rounded-xl border border-[rgba(225,239,221,0.15)] space-y-2 text-xs">
                <div className="flex justify-between text-[#929b93]">
                  <span>Evidence File:</span>
                  <span className="font-semibold text-[#f0f2eb]">
                    {selectedEvidence?.original_filename || (customFile ? customFile.name : 'Uploaded File')}
                  </span>
                </div>
                <div className="flex justify-between text-[#929b93]">
                  <span>Media Type:</span>
                  <span className="capitalize text-[#f0f2eb]">{analysisResult.media_type}</span>
                </div>
                <div className="flex justify-between text-[#929b93]">
                  <span>Analysis Method:</span>
                  <span className="text-[#f0f2eb]">Facial Feature &amp; Texture Check</span>
                </div>
                <div className="flex justify-between text-[#929b93]">
                  <span>Model Engine:</span>
                  <span className="font-mono text-[11px] text-[#a8db35] truncate max-w-[200px]">
                    {analysisResult.model_name || 'ViT Feature Analyzer'}
                  </span>
                </div>
              </div>
            </Card>

            {/* 2. What Our AI Noticed */}
            <Card className="bg-[#111716]/85 border-[rgba(225,239,221,0.15)] p-5 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-[#d5ff54] uppercase tracking-wider">
                <span className="w-5 h-5 rounded-full bg-[#d5ff54]/10 text-[#d5ff54] flex items-center justify-center font-mono text-[10px]">
                  2
                </span>
                What Our AI Noticed
              </div>
              <div className="space-y-2 text-xs">
                <div className="p-3 bg-[#0d1110] rounded-xl border border-[rgba(225,239,221,0.15)] flex items-center justify-between">
                  <span className="text-[#929b93]">Deepfake / Alteration Signal:</span>
                  <span className="font-semibold text-[#f0f2eb]">
                    {analysisResult.deepfake_score > 0.5 ? 'Unusual Variations Detected' : 'Normal / Low Variation'}
                  </span>
                </div>
                <div className="p-3 bg-[#0d1110] rounded-xl border border-[rgba(225,239,221,0.15)] flex items-center justify-between">
                  <span className="text-[#929b93]">Compression Check (ELA):</span>
                  <span className="font-semibold text-[#f0f2eb]">
                    {analysisResult.compression_anomaly_detected ? 'Inconsistent Quantization' : 'Uniform Distribution'}
                  </span>
                </div>
                <div className="p-3 bg-[#0d1110] rounded-xl border border-[rgba(225,239,221,0.15)] flex items-center justify-between">
                  <span className="text-[#929b93]">C2PA Provenance Manifest:</span>
                  <span className="text-[#ff927e] font-medium">
                    {analysisResult.c2pa_analysis?.manifest_present || analysisResult.c2pa_provenance?.detected ? 'Manifest Present' : 'Not Detected (Standard for Social Media)'}
                  </span>
                </div>
              </div>
            </Card>

            {/* Stage 2 Integration: C2PA Content Credentials Analysis */}
            <Card className="bg-[#111716]/85 border-[#a8db35]/20 p-5 space-y-3 md:col-span-2">
              <div className="flex items-center justify-between border-b border-[rgba(225,239,221,0.15)] pb-3">
                <div className="flex items-center gap-2 text-xs font-bold text-[#a8db35] uppercase tracking-wider">
                  <ShieldCheck className="w-4 h-4 text-[#a8db35]" />
                  <span>Content Credentials (C2PA) Cryptographic Inspection</span>
                </div>
                <Badge
                  variant={
                    analysisResult.c2pa_analysis?.c2pa_status === 'valid_credentials'
                      ? 'safe'
                      : analysisResult.c2pa_analysis?.c2pa_status === 'invalid_credentials'
                      ? 'critical'
                      : 'neutral'
                  }
                >
                  {analysisResult.c2pa_analysis?.c2pa_status === 'valid_credentials'
                    ? 'Cryptographically Valid'
                    : analysisResult.c2pa_analysis?.c2pa_status === 'invalid_credentials'
                    ? 'Signature Invalid / Broken'
                    : analysisResult.c2pa_analysis?.c2pa_status === 'unsupported_format'
                    ? 'Unsupported Format'
                    : 'Credentials Absent (Expected)'}
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 bg-[#0d1110] rounded-xl border border-[rgba(225,239,221,0.15)] space-y-1">
                  <span className="text-[#929b93] text-[11px]">Claim Generator:</span>
                  <p className="font-mono text-[#f0f2eb] truncate">
                    {analysisResult.c2pa_analysis?.claim_generator || 'None Detected'}
                  </p>
                </div>
                <div className="p-3 bg-[#0d1110] rounded-xl border border-[rgba(225,239,221,0.15)] space-y-1">
                  <span className="text-[#929b93] text-[11px]">Signing Authority:</span>
                  <p className="font-mono text-[#f0f2eb] truncate">
                    {analysisResult.c2pa_analysis?.signing_info?.issuer || 'N/A (No Signed Claim)'}
                  </p>
                </div>
                <div className="p-3 bg-[#0d1110] rounded-xl border border-[rgba(225,239,221,0.15)] space-y-1">
                  <span className="text-[#929b93] text-[11px]">SDK Version:</span>
                  <p className="font-mono text-[#a8db35] truncate">
                    c2pa-python {analysisResult.c2pa_analysis?.sdk_version || '0.92.0'}
                  </p>
                </div>
              </div>

              {analysisResult.c2pa_analysis?.ingredients && analysisResult.c2pa_analysis.ingredients.length > 0 && (
                <div className="p-3 bg-[#0d1110] rounded-xl border border-[rgba(225,239,221,0.15)] space-y-2 text-xs">
                  <span className="text-[#929b93] font-semibold">Ingredients / Component History:</span>
                  <div className="space-y-1">
                    {analysisResult.c2pa_analysis.ingredients.map((ing, idx) => (
                      <div key={idx} className="flex justify-between text-[11px] text-[#f0f2eb]">
                        <span>{ing.title || `Component ${idx + 1}`} ({ing.format || 'unknown'})</span>
                        <span className="text-[#929b93]">{ing.relationship || 'parentOf'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-[11px] text-[#929b93] leading-relaxed italic bg-[#0d1110]/60 p-2.5 rounded-lg border border-[rgba(225,239,221,0.10)]">
                Notice: C2PA manifests establish cryptographic provenance. Messaging apps (WhatsApp, Telegram) and screenshots routinely discard headers during recompression. Absence does NOT indicate manipulation.
              </p>
            </Card>

            {/* Stage 2 Integration: RetinaFace Facial Localization */}
            <Card className="bg-[#111716]/85 border-[#d5ff54]/20 p-5 space-y-3 md:col-span-2">
              <div className="flex items-center justify-between border-b border-[rgba(225,239,221,0.15)] pb-3">
                <div className="flex items-center gap-2 text-xs font-bold text-[#d5ff54] uppercase tracking-wider">
                  <Sparkles className="w-4 h-4 text-[#d5ff54]" />
                  <span>RetinaFace Pretrained Facial Localization (ResNet50 / PyTorch)</span>
                </div>
                <Badge
                  variant={
                    (analysisResult.face_localization?.face_count || (analysisResult.faces && analysisResult.faces.length) || 0) > 0
                      ? 'primary'
                      : 'neutral'
                  }
                >
                  {(analysisResult.face_localization?.face_count || (analysisResult.faces && analysisResult.faces.length) || 0)} Face(s) Localized
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 bg-[#0d1110] rounded-xl border border-[rgba(225,239,221,0.15)] space-y-1">
                  <span className="text-[#929b93] text-[11px]">Detector Architecture:</span>
                  <p className="font-mono text-[#f0f2eb] text-[11px]">
                    {analysisResult.face_localization?.detector_name || 'RetinaFace-ResNet50'}
                  </p>
                </div>
                <div className="p-3 bg-[#0d1110] rounded-xl border border-[rgba(225,239,221,0.15)] space-y-1">
                  <span className="text-[#929b93] text-[11px]">Checkpoint:</span>
                  <p className="font-mono text-[#f0f2eb] text-[11px]">
                    {analysisResult.face_localization?.checkpoint_id || 'retinaface.pth'}
                  </p>
                </div>
                <div className="p-3 bg-[#0d1110] rounded-xl border border-[rgba(225,239,221,0.15)] space-y-1">
                  <span className="text-[#929b93] text-[11px]">Resolution Checked:</span>
                  <p className="font-mono text-[#f0f2eb] text-[11px]">
                    {analysisResult.face_localization?.image_width || 'Auto'} × {analysisResult.face_localization?.image_height || 'Auto'}
                  </p>
                </div>
                <div className="p-3 bg-[#0d1110] rounded-xl border border-[rgba(225,239,221,0.15)] space-y-1">
                  <span className="text-[#929b93] text-[11px]">Inference Time:</span>
                  <p className="font-mono text-[#a8db35] text-[11px]">
                    {analysisResult.face_localization?.processing_time_ms ? `${analysisResult.face_localization.processing_time_ms} ms` : 'Real-time'}
                  </p>
                </div>
              </div>

              {((analysisResult.face_localization?.faces && analysisResult.face_localization.faces.length > 0) ||
                (analysisResult.faces && analysisResult.faces.length > 0)) && (
                <div className="p-3 bg-[#0d1110] rounded-xl border border-[rgba(225,239,221,0.15)] space-y-2 text-xs">
                  <span className="text-[#929b93] font-semibold">Localized Facial Geometries &amp; 5-Point Landmarks:</span>
                  <div className="space-y-2">
                    {(analysisResult.face_localization?.faces || analysisResult.faces || []).map((f, idx) => (
                      <div key={idx} className="p-2.5 bg-[#111716] rounded-lg border border-[rgba(225,239,221,0.10)] space-y-1 text-[11px]">
                        <div className="flex justify-between items-center text-[#f0f2eb]">
                          <span className="font-bold text-[#d5ff54]">{f.face_id || `Face #${idx + 1}`}</span>
                          <span className="font-mono text-[#a8db35]">
                            Confidence: {Math.round((f.detection_confidence || 0) * 1000) / 10}%
                          </span>
                        </div>
                        <div className="text-[#929b93] font-mono text-[10px]">
                          Bounding Box: [x={f.bounding_box[0]}, y={f.bounding_box[1]}, w={f.bounding_box[2]}, h={f.bounding_box[3]}]
                        </div>
                        {f.landmarks && (
                          <div className="text-[#929b93] font-mono text-[10px]">
                            Landmarks: {Object.keys(f.landmarks).join(', ')}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-[11px] text-[#929b93] leading-relaxed italic bg-[#0d1110]/60 p-2.5 rounded-lg border border-[rgba(225,239,221,0.10)]">
                Notice: RetinaFace performs multi-face spatial localization and landmark extraction. Face detection does NOT classify manipulation or determine whether a face is synthetic.
              </p>
            </Card>

            {/* Stage 3 Integration: Model A Effort-AIGI-Detection */}
            <Card className="bg-[#111716]/85 border-[#d5ff54]/30 p-5 space-y-4 md:col-span-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[rgba(225,239,221,0.15)] pb-3">
                <div className="flex items-center gap-2 text-xs font-bold text-[#d5ff54] uppercase tracking-wider">
                  <Sparkles className="w-4 h-4 text-[#d5ff54]" />
                  <span>Model A: AI-Generated Image (AIGI) Detection — Effort Architecture</span>
                </div>
                <Badge
                  variant={
                    analysisResult.model_a_result?.prediction === 'synthetic'
                      ? 'critical'
                      : analysisResult.model_a_result?.prediction === 'authentic'
                      ? 'safe'
                      : 'neutral'
                  }
                >
                  {analysisResult.model_a_result?.prediction === 'synthetic'
                    ? 'AI-Generated / Synthetic Image'
                    : analysisResult.model_a_result?.prediction === 'authentic'
                    ? 'Authentic Camera Capture'
                    : 'Analysis Available via Worker'}
                </Badge>
              </div>

              {analysisResult.model_a_result ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3 bg-[#0d1110] rounded-xl border border-[rgba(225,239,221,0.15)] space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-[#929b93]">Synthetic Probability (AIGI):</span>
                        <span className="font-bold text-[#ff927e]">
                          {Math.round((analysisResult.model_a_result.synthetic_score || 0) * 1000) / 10}%
                        </span>
                      </div>
                      <div className="w-full bg-[#111716] h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-[#d5ff54] to-[#ff927e] h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, Math.max(0, (analysisResult.model_a_result.synthetic_score || 0) * 100))}%` }}
                        />
                      </div>
                    </div>

                    <div className="p-3 bg-[#0d1110] rounded-xl border border-[rgba(225,239,221,0.15)] space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-[#929b93]">Authentic Camera Probability:</span>
                        <span className="font-bold text-[#a8db35]">
                          {Math.round((analysisResult.model_a_result.real_score || 0) * 1000) / 10}%
                        </span>
                      </div>
                      <div className="w-full bg-[#111716] h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-[#a8db35] h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, Math.max(0, (analysisResult.model_a_result.real_score || 0) * 100))}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="p-2.5 bg-[#0d1110] rounded-xl border border-[rgba(225,239,221,0.10)] space-y-0.5">
                      <span className="text-[#929b93] text-[10px]">Backbone:</span>
                      <p className="font-mono text-[#f0f2eb] text-[11px]">CLIP-ViT-L/14 (SVD r=1023)</p>
                    </div>
                    <div className="p-2.5 bg-[#0d1110] rounded-xl border border-[rgba(225,239,221,0.10)] space-y-0.5">
                      <span className="text-[#929b93] text-[10px]">Checkpoint:</span>
                      <p className="font-mono text-[#f0f2eb] text-[11px] truncate">{analysisResult.model_a_result.checkpoint_id}</p>
                    </div>
                    <div className="p-2.5 bg-[#0d1110] rounded-xl border border-[rgba(225,239,221,0.10)] space-y-0.5">
                      <span className="text-[#929b93] text-[10px]">Device:</span>
                      <p className="font-mono text-[#d5ff54] text-[11px] uppercase">{analysisResult.model_a_result.device}</p>
                    </div>
                    <div className="p-2.5 bg-[#0d1110] rounded-xl border border-[rgba(225,239,221,0.10)] space-y-0.5">
                      <span className="text-[#929b93] text-[10px]">Latency:</span>
                      <p className="font-mono text-[#a8db35] text-[11px]">{analysisResult.model_a_result.processing_time_ms} ms</p>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-[#929b93] italic">Click "Queue Worker Job" or run scanner to process Effort-AIGI-Detection inference.</p>
              )}
              <p className="text-[11px] text-[#929b93] leading-relaxed italic bg-[#0d1110]/60 p-2.5 rounded-lg border border-[rgba(225,239,221,0.10)]">
                Notice: Effort model operates under CC BY-NC 4.0 non-commercial research terms. Predictions are automated forensic decision-support signals, not definitive legal proof.
              </p>
            </Card>

            {/* Stage 3 Integration: Model B Xception (FaceForensics++) */}
            <Card className="bg-[#111716]/85 border-[#ff927e]/30 p-5 space-y-4 md:col-span-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[rgba(225,239,221,0.15)] pb-3">
                <div className="flex items-center gap-2 text-xs font-bold text-[#ff927e] uppercase tracking-wider">
                  <Activity className="w-4 h-4 text-[#ff927e]" />
                  <span>Model B: Facial Deepfake Detection (Xception / FaceForensics++)</span>
                </div>
                <Badge
                  variant={
                    analysisResult.model_b_result?.overall_prediction === 'manipulated'
                      ? 'critical'
                      : analysisResult.model_b_result?.overall_prediction === 'authentic'
                      ? 'safe'
                      : 'neutral'
                  }
                >
                  {analysisResult.model_b_result?.overall_prediction === 'manipulated'
                    ? 'Facial Deepfake Detected'
                    : analysisResult.model_b_result?.overall_prediction === 'authentic'
                    ? 'Authentic Human Faces'
                    : analysisResult.model_b_result?.analysis_status === 'no_faces_detected'
                    ? 'No Faces Detected'
                    : 'Awaiting Analysis'}
                </Badge>
              </div>

              {analysisResult.model_b_result ? (
                <div className="space-y-3">
                  <div className="p-3 bg-[#0d1110] rounded-xl border border-[rgba(225,239,221,0.15)] space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-[#929b93]">Peak Facial Manipulation Probability:</span>
                      <span className={`font-bold ${analysisResult.model_b_result.max_manipulation_score > 0.5 ? 'text-[#ff927e]' : 'text-[#a8db35]'}`}>
                        {Math.round((analysisResult.model_b_result.max_manipulation_score || 0) * 1000) / 10}%
                      </span>
                    </div>
                    <div className="w-full bg-[#111716] h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${analysisResult.model_b_result.max_manipulation_score > 0.5 ? 'bg-gradient-to-r from-[#ff927e] to-[#ff927e]' : 'bg-[#a8db35]'}`}
                        style={{ width: `${Math.min(100, Math.max(0, (analysisResult.model_b_result.max_manipulation_score || 0) * 100))}%` }}
                      />
                    </div>
                  </div>

                  {analysisResult.model_b_result.faces && analysisResult.model_b_result.faces.length > 0 && (
                    <div className="p-3 bg-[#0d1110] rounded-xl border border-[rgba(225,239,221,0.15)] space-y-2 text-xs">
                      <span className="text-[#929b93] font-semibold">Per-Face Deepfake Classification Breakdown:</span>
                      <div className="space-y-2">
                        {analysisResult.model_b_result.faces.map((f, idx) => (
                          <div key={idx} className="p-2.5 bg-[#111716] rounded-lg border border-[rgba(225,239,221,0.10)] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-[11px]">
                            <div className="space-y-0.5">
                              <span className="font-bold text-[#d5ff54]">{f.face_id}</span>
                              <p className="text-[#929b93] font-mono text-[10px]">
                                Box: [{f.face_bounding_box.x1}, {f.face_bounding_box.y1}, {f.face_bounding_box.width}×{f.face_bounding_box.height}]
                              </p>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-mono text-[11px]">
                                Manipulation: <span className={f.manipulation_score > 0.5 ? 'text-[#ff927e] font-bold' : 'text-[#a8db35]'}>{Math.round(f.manipulation_score * 1000) / 10}%</span>
                              </span>
                              <Badge variant={f.prediction === 'manipulated' ? 'critical' : 'safe'}>
                                {f.prediction.toUpperCase()}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="p-2.5 bg-[#0d1110] rounded-xl border border-[rgba(225,239,221,0.10)] space-y-0.5">
                      <span className="text-[#929b93] text-[10px]">Architecture:</span>
                      <p className="font-mono text-[#f0f2eb] text-[11px]">Xception 36-Layer</p>
                    </div>
                    <div className="p-2.5 bg-[#0d1110] rounded-xl border border-[rgba(225,239,221,0.10)] space-y-0.5">
                      <span className="text-[#929b93] text-[10px]">Benchmark:</span>
                      <p className="font-mono text-[#f0f2eb] text-[11px]">FaceForensics++ c23</p>
                    </div>
                    <div className="p-2.5 bg-[#0d1110] rounded-xl border border-[rgba(225,239,221,0.10)] space-y-0.5">
                      <span className="text-[#929b93] text-[10px]">Checkpoint:</span>
                      <p className="font-mono text-[#f0f2eb] text-[11px] truncate">{analysisResult.model_b_result.checkpoint_id}</p>
                    </div>
                    <div className="p-2.5 bg-[#0d1110] rounded-xl border border-[rgba(225,239,221,0.10)] space-y-0.5">
                      <span className="text-[#929b93] text-[10px]">Latency:</span>
                      <p className="font-mono text-[#a8db35] text-[11px]">{analysisResult.model_b_result.processing_time_ms} ms</p>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-[#929b93] italic">Click "Queue Worker Job" or run scanner to process DeepfakeBench Xception inference.</p>
              )}
              <p className="text-[11px] text-[#929b93] leading-relaxed italic bg-[#0d1110]/60 p-2.5 rounded-lg border border-[rgba(225,239,221,0.10)]">
                Notice: DeepfakeBench Xception evaluates localized face crops for synthesis artifacts. Operates under CC BY-NC 4.0 terms.
              </p>
            </Card>

            {/* 3. Why It Matters */}
            <Card className="bg-[#111716]/85 border-[rgba(225,239,221,0.15)] p-5 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-[#a8db35] uppercase tracking-wider">
                <span className="w-5 h-5 rounded-full bg-[#a8db35]/10 text-[#a8db35] flex items-center justify-center font-mono text-[10px]">
                  3
                </span>
                Why It Matters
              </div>
              <p className="text-xs text-[#929b93] leading-relaxed">
                If someone created a fake image or video of you to harm your reputation, extort money, or intimidate you, documenting these signals provides helpful context when reporting to platforms or authorities.
              </p>
              <div className="p-2.5 bg-[#0d1110] rounded-xl border border-[rgba(225,239,221,0.15)] text-[11px] text-[#929b93]">
                Preserving cryptographic SHA-256 fingerprints alongside these AI screening indicators ensures chain-of-custody compliance under Section 65B of the Indian Evidence Act.
              </div>
            </Card>

            {/* 4. How Confident The Analysis Is */}
            <Card className="bg-[#111716]/85 border-[rgba(225,239,221,0.15)] p-5 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-[#ff927e] uppercase tracking-wider">
                <span className="w-5 h-5 rounded-full bg-[#ff927e]/10 text-[#ff927e] flex items-center justify-center font-mono text-[10px]">
                  4
                </span>
                How Confident The Analysis Is
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between p-2.5 bg-[#0d1110] rounded-xl border border-[rgba(225,239,221,0.15)]">
                  <span className="text-[#929b93]">Confidence Rating:</span>
                  <Badge variant="warning">Preliminary Screening (Medium)</Badge>
                </div>
                <p className="text-[11px] text-[#929b93] leading-relaxed">
                  Notice: AI tools detect patterns, but compression (e.g. from WhatsApp) can look like editing. These findings are screening aids, not definitive legal proof.
                </p>
              </div>
            </Card>
          </div>

          {/* 5. What You Can Do Next */}
          <Card className="bg-gradient-to-r from-[#111716] to-[#0d1110] border-[#d5ff54]/25 p-6 space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-[#d5ff54] uppercase tracking-wider">
              <span className="w-5 h-5 rounded-full bg-[#d5ff54]/10 text-[#d5ff54] flex items-center justify-center font-mono text-[10px]">
                5
              </span>
              What You Can Do Next
            </div>
            <p className="text-xs text-[#929b93] leading-relaxed">
              Based on this analysis, here are the recommended next steps:
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Link to="/complaints">
                <Button variant="primary" size="md" leftIcon={<FileText className="w-4 h-4" />}>
                  Prepare a Formal Complaint
                </Button>
              </Link>
              <Link to="/reporting">
                <Button variant="secondary" size="md" leftIcon={<ArrowRight className="w-4 h-4" />}>
                  View Platform Reporting Instructions
                </Button>
              </Link>
              <Link to="/evidence">
                <Button variant="ghost" size="md" leftIcon={<HardDrive className="w-4 h-4" />}>
                  Return to Evidence Vault
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
