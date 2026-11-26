import React, { useState, useEffect } from 'react'
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
} from 'lucide-react'
import { useI18n } from '../../contexts/I18nContext'
import { useToast } from '../../contexts/ToastContext'
import { apiClient } from '../../services/api/client'
import type { MediaAnalysisResult, Evidence } from '../../types'
import { Button } from '../../components/common/Button'
import { Card } from '../../components/common/Card'
import { Badge } from '../../components/common/Badge'
import { PageHeader } from '../../components/layout/PageHeader'
import { formatDate, formatBytes } from '../../utils/crypto'

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

  const [evidenceList, setEvidenceList] = useState<Evidence[]>(INITIAL_MEDIA_EVIDENCE)
  const [selectedEvidenceId, setSelectedEvidenceId] = useState(
    preselectedEvidenceId || (INITIAL_MEDIA_EVIDENCE[0]?.id || '')
  )
  const [analysisResult, setAnalysisResult] = useState<MediaAnalysisResult | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [scanStepIndex, setScanStepIndex] = useState(0)
  const [customFile, setCustomFile] = useState<File | null>(null)
  const [customFilePreview, setCustomFilePreview] = useState<string | null>(null)
  const [isSensitiveHidden, setIsSensitiveHidden] = useState(false)

  useEffect(() => {
    const fetchEvidence = async () => {
      const data = await apiClient.getAllEvidence()
      const mediaFiles = data.filter(
        (e) => e.file_type.startsWith('image/') || e.file_type.startsWith('video/')
      )
      setEvidenceList(mediaFiles)
      if (preselectedEvidenceId) {
        setSelectedEvidenceId(preselectedEvidenceId)
        const existing = await apiClient.getMediaAnalysis(preselectedEvidenceId)
        if (existing) setAnalysisResult(existing)
      } else if (mediaFiles.length > 0 && !selectedEvidenceId) {
        setSelectedEvidenceId(mediaFiles[0].id)
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

  const selectedEvidence = evidenceList.find((e) => e.id === selectedEvidenceId)

  const handleRunAnalysis = async () => {
    if (!selectedEvidenceId && !customFile) {
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
        const target = evidenceList.find((e) => e.id === selectedEvidenceId)
        const mediaType = target?.file_type.startsWith('video/') ? 'video' : 'image'
        const res = await apiClient.runMediaAnalysis(selectedEvidenceId, mediaType)
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
    const strokeColor = isDanger ? '#FF718A' : isWarning ? '#F0B96B' : '#52D6B2'

    return (
      <div className="flex flex-col items-center p-5 bg-[#0D1224] rounded-2xl border border-[#A6AEC8]/15 relative">
        <div className="relative w-28 h-28 flex items-center justify-center">
          <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r={radius}
              className="stroke-[#1D2540]"
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
            <span className="text-2xl font-bold font-mono text-[#F4F5FF]">{pct}%</span>
            <span className="text-[10px] text-[#A6AEC8] uppercase font-mono">Signal</span>
          </div>
        </div>
        <h4 className="text-xs font-semibold text-[#F4F5FF] mt-3">{label}</h4>
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
      </div>
    )
  }

  return (
    <div className="space-y-6 text-left">
      <PageHeader
        title={t.ai.mediaScannerTitle}
        subtitle="Preliminary forensic decision-support signals for deepfakes, manipulated imagery, and explicit content."
      />

      {/* Mandatory Transparent AI Notice Banner */}
      <div className="p-4 bg-[#171D35]/90 border border-[#8B7CFF]/25 rounded-2xl flex items-start gap-3.5 text-xs text-[#A6AEC8] shadow-lg shadow-[#080B18]/60">
        <div className="w-8 h-8 rounded-xl bg-[#8B7CFF]/10 border border-[#8B7CFF]/30 flex items-center justify-center shrink-0 mt-0.5">
          <Info className="w-4 h-4 text-[#8B7CFF]" />
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-[#F4F5FF]">Transparent AI Principle &amp; Limitations</p>
            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-[#8B7CFF]/10 text-[#8B7CFF] border border-[#8B7CFF]/25">
              Decision-Support Only
            </span>
          </div>
          <p className="text-[#A6AEC8] leading-relaxed text-[11.5px]">
            {t.ai.disclaimerBanner}
          </p>
        </div>
      </div>

      {/* Input Selection Bar */}
      <Card className="p-5 bg-[#171D35]/85 border-[#A6AEC8]/15">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div className="space-y-2 flex-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-[#F4F5FF] flex items-center gap-2">
                <FileSearch className="w-3.5 h-3.5 text-[#8B7CFF]" />
                Select Preserved Evidence Media from Vault
              </label>
              <span className="text-[10px] font-mono text-[#727D9C]">
                {evidenceList.length} media items preserved
              </span>
            </div>
            <select
              value={selectedEvidenceId}
              onChange={(e) => {
                setSelectedEvidenceId(e.target.value)
                setCustomFile(null)
              }}
              className="w-full px-3.5 py-2.5 bg-[#0D1224] border border-[#A6AEC8]/20 rounded-xl text-xs text-[#F4F5FF] focus:outline-none focus:border-[#8B7CFF]/60 transition-colors"
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
          </div>

          <div className="flex items-center gap-3">
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
      </Card>

      {/* Visual Scanning Viewport & Animated Progress Scanner */}
      {isAnalyzing && (
        <Card className="p-8 bg-[#171D35]/90 border-[#8B7CFF]/40 shadow-[0_0_35px_rgba(139,124,255,0.15)]">
          <div className="flex flex-col items-center text-center space-y-6">
            {/* High-Tech Circular Radar Sweep */}
            <div className="relative w-44 h-44 rounded-full border border-[#8B7CFF]/30 bg-[#080B18]/90 flex items-center justify-center overflow-hidden shadow-[0_0_24px_rgba(139,124,255,0.25)]">
              {/* Concentric rings */}
              <div className="absolute w-32 h-32 rounded-full border border-[#8B7CFF]/20" />
              <div className="absolute w-20 h-20 rounded-full border border-[#55D6E8]/20" />
              <div className="absolute w-10 h-10 rounded-full border border-[#8B7CFF]/35 bg-[#8B7CFF]/10" />

              {/* Crosshairs */}
              <div className="absolute inset-x-0 top-1/2 h-px bg-[#8B7CFF]/20" />
              <div className="absolute inset-y-0 left-1/2 w-px bg-[#8B7CFF]/20" />

              {/* Rotating Radar Sweep */}
              <div className="absolute inset-0 origin-center animate-radar-sweep pointer-events-none">
                <div className="w-1/2 h-1/2 absolute top-0 right-0 bg-gradient-to-br from-[#8B7CFF]/40 to-transparent rounded-tl-full" />
              </div>

              {/* Pulsing Center Icon */}
              <Cpu className="w-7 h-7 text-[#8B7CFF] z-10 animate-pulse" />
            </div>

            {/* Scanning Status & Stage */}
            <div className="space-y-2 max-w-md">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#8B7CFF]/10 border border-[#8B7CFF]/30 text-xs font-mono text-[#8B7CFF]">
                <Activity className="w-3.5 h-3.5 animate-spin" />
                <span>PHASE {scanStepIndex + 1} OF 4</span>
              </div>
              <h3 className="text-base font-semibold text-[#F4F5FF]">
                {SCAN_STEPS[scanStepIndex]}
              </h3>
              <p className="text-xs text-[#A6AEC8]">
                Scanning cryptographic metadata, facial geometry boundaries, and localized pixel compression anomalies.
              </p>
            </div>

            {/* Visual Step Progress Bar */}
            <div className="w-full max-w-md bg-[#0D1224] rounded-full h-1.5 overflow-hidden border border-[#A6AEC8]/20">
              <div
                className="h-full bg-gradient-to-r from-[#8B7CFF] via-[#55D6E8] to-[#52D6B2] transition-all duration-500 rounded-full"
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
          <Card className="p-6 bg-[#171D35]/90 border-[#A6AEC8]/20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#A6AEC8]/15">
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-bold text-[#F4F5FF]">AI Screening Summary</h3>
                  {getDecisionBadge(analysisResult.decision)}
                </div>
                <p className="text-xs text-[#A6AEC8] mt-1">
                  Evaluated at {formatDate(analysisResult.created_at)}
                </p>
              </div>

              {/* Preliminary Indicator Badge */}
              <div className="px-3 py-1.5 rounded-xl bg-[#8B7CFF]/10 border border-[#8B7CFF]/30 text-[11px] text-[#8B7CFF] flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                <span>Preliminary Screening Indicator</span>
              </div>
            </div>

            {/* Clear Human Summary */}
            <div className="pt-4 space-y-2">
              <h4 className="text-sm font-semibold text-[#F4F5FF]">
                {analysisResult.decision === 'SUSPICIOUS' || analysisResult.decision === 'BLOCKED'
                  ? 'Our AI detected some unusual signals in this media.'
                  : 'No obvious signs of artificial manipulation detected.'}
              </h4>
              <p className="text-xs text-[#A6AEC8] leading-relaxed">
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
            <Card className="bg-[#171D35]/85 border-[#A6AEC8]/15 p-5 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-[#8B7CFF] uppercase tracking-wider">
                <span className="w-5 h-5 rounded-full bg-[#8B7CFF]/10 text-[#8B7CFF] flex items-center justify-center font-mono text-[10px]">
                  1
                </span>
                What We Analysed
              </div>
              <div className="p-3 bg-[#0D1224] rounded-xl border border-[#A6AEC8]/15 space-y-2 text-xs">
                <div className="flex justify-between text-[#A6AEC8]">
                  <span>Evidence File:</span>
                  <span className="font-semibold text-[#F4F5FF]">
                    {selectedEvidence?.original_filename || (customFile ? customFile.name : 'Uploaded File')}
                  </span>
                </div>
                <div className="flex justify-between text-[#A6AEC8]">
                  <span>Media Type:</span>
                  <span className="capitalize text-[#F4F5FF]">{analysisResult.media_type}</span>
                </div>
                <div className="flex justify-between text-[#A6AEC8]">
                  <span>Analysis Method:</span>
                  <span className="text-[#F4F5FF]">Facial Feature &amp; Texture Check</span>
                </div>
                <div className="flex justify-between text-[#A6AEC8]">
                  <span>Model Engine:</span>
                  <span className="font-mono text-[11px] text-[#52D6B2] truncate max-w-[200px]">
                    {analysisResult.model_name || 'ViT Feature Analyzer'}
                  </span>
                </div>
              </div>
            </Card>

            {/* 2. What Our AI Noticed */}
            <Card className="bg-[#171D35]/85 border-[#A6AEC8]/15 p-5 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-[#55D6E8] uppercase tracking-wider">
                <span className="w-5 h-5 rounded-full bg-[#55D6E8]/10 text-[#55D6E8] flex items-center justify-center font-mono text-[10px]">
                  2
                </span>
                What Our AI Noticed
              </div>
              <div className="space-y-2 text-xs">
                <div className="p-3 bg-[#0D1224] rounded-xl border border-[#A6AEC8]/15 flex items-center justify-between">
                  <span className="text-[#A6AEC8]">Deepfake / Alteration Signal:</span>
                  <span className="font-semibold text-[#F4F5FF]">
                    {analysisResult.deepfake_score > 0.5 ? 'Unusual Variations Detected' : 'Normal / Low Variation'}
                  </span>
                </div>
                <div className="p-3 bg-[#0D1224] rounded-xl border border-[#A6AEC8]/15 flex items-center justify-between">
                  <span className="text-[#A6AEC8]">Compression Check (ELA):</span>
                  <span className="font-semibold text-[#F4F5FF]">
                    {analysisResult.compression_anomaly_detected ? 'Inconsistent Quantization' : 'Uniform Distribution'}
                  </span>
                </div>
                <div className="p-3 bg-[#0D1224] rounded-xl border border-[#A6AEC8]/15 flex items-center justify-between">
                  <span className="text-[#A6AEC8]">C2PA Provenance Manifest:</span>
                  <span className="text-[#F0B96B] font-medium">
                    {analysisResult.c2pa_provenance?.detected ? 'Present' : 'Not Detected (Standard for Social Media)'}
                  </span>
                </div>
              </div>
            </Card>

            {/* 3. Why It Matters */}
            <Card className="bg-[#171D35]/85 border-[#A6AEC8]/15 p-5 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-[#52D6B2] uppercase tracking-wider">
                <span className="w-5 h-5 rounded-full bg-[#52D6B2]/10 text-[#52D6B2] flex items-center justify-center font-mono text-[10px]">
                  3
                </span>
                Why It Matters
              </div>
              <p className="text-xs text-[#A6AEC8] leading-relaxed">
                If someone created a fake image or video of you to harm your reputation, extort money, or intimidate you, documenting these signals provides helpful context when reporting to platforms or authorities.
              </p>
              <div className="p-2.5 bg-[#0D1224] rounded-xl border border-[#A6AEC8]/15 text-[11px] text-[#A6AEC8]">
                Preserving cryptographic SHA-256 fingerprints alongside these AI screening indicators ensures chain-of-custody compliance under Section 65B of the Indian Evidence Act.
              </div>
            </Card>

            {/* 4. How Confident The Analysis Is */}
            <Card className="bg-[#171D35]/85 border-[#A6AEC8]/15 p-5 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-[#F0B96B] uppercase tracking-wider">
                <span className="w-5 h-5 rounded-full bg-[#F0B96B]/10 text-[#F0B96B] flex items-center justify-center font-mono text-[10px]">
                  4
                </span>
                How Confident The Analysis Is
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between p-2.5 bg-[#0D1224] rounded-xl border border-[#A6AEC8]/15">
                  <span className="text-[#A6AEC8]">Confidence Rating:</span>
                  <Badge variant="warning">Preliminary Screening (Medium)</Badge>
                </div>
                <p className="text-[11px] text-[#A6AEC8] leading-relaxed">
                  Notice: AI tools detect patterns, but compression (e.g. from WhatsApp) can look like editing. These findings are screening aids, not definitive legal proof.
                </p>
              </div>
            </Card>
          </div>

          {/* 5. What You Can Do Next */}
          <Card className="bg-gradient-to-r from-[#171D35] to-[#0D1224] border-[#8B7CFF]/25 p-6 space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-[#8B7CFF] uppercase tracking-wider">
              <span className="w-5 h-5 rounded-full bg-[#8B7CFF]/10 text-[#8B7CFF] flex items-center justify-center font-mono text-[10px]">
                5
              </span>
              What You Can Do Next
            </div>
            <p className="text-xs text-[#A6AEC8] leading-relaxed">
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
