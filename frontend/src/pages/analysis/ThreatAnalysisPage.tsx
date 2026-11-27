import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  ShieldAlert,
  Info,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Clock,
  ArrowRight,
  Shield,
  Loader2,
  Send,
} from 'lucide-react'
import { useI18n } from '../../contexts/I18nContext'
import { useToast } from '../../contexts/ToastContext'
import { apiClient } from '../../services/api/client'
import type { ThreatAnalysisResult, Incident } from '../../types'
import { Button } from '../../components/common/Button'
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card'
import { Badge } from '../../components/common/Badge'
import { PageHeader } from '../../components/layout/PageHeader'
import { Interactive3DSurface } from '../../components/ui/Interactive3DSurface'
import { formatDate } from '../../utils/crypto'

export const ThreatAnalysisPage: React.FC = () => {
  const { t } = useI18n()
  const { showToast } = useToast()
  const [searchParams] = useSearchParams()
  const preselectedIncidentId = searchParams.get('incidentId') || ''

  const [incidents, setIncidents] = useState<Incident[]>([])
  const [selectedIncidentId, setSelectedIncidentId] = useState(preselectedIncidentId)
  const [inputText, setInputText] = useState('')
  const [result, setResult] = useState<ThreatAnalysisResult | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [feedbackFalsePositive, setFeedbackFalsePositive] = useState(false)
  const [feedbackSeverity, setFeedbackSeverity] = useState<'LOW' | 'MODERATE' | 'HIGH' | 'URGENT_REVIEW'>('MODERATE')
  const [feedbackNotes, setFeedbackNotes] = useState('')
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false)
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false)

  useEffect(() => {
    const fetchIncidents = async () => {
      const data = await apiClient.getIncidents()
      setIncidents(data)
      if (preselectedIncidentId) {
        const target = data.find((i) => i.id === preselectedIncidentId)
        if (target) {
          setInputText(target.description)
        }
      }
    }
    fetchIncidents()
  }, [preselectedIncidentId])

  const handleSelectIncident = (incId: string) => {
    setSelectedIncidentId(incId)
    const target = incidents.find((i) => i.id === incId)
    if (target) {
      setInputText(target.description)
    }
  }

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputText.trim()) {
      showToast('Please enter message text to analyze.', 'warning')
      return
    }

    setIsAnalyzing(true)
    setResult(null)
    setFeedbackSubmitted(false)
    setFeedbackFalsePositive(false)
    setFeedbackNotes('')

    try {
      const res = await apiClient.runThreatAnalysis(inputText.trim(), selectedIncidentId || undefined)
      setResult(res)
      if (res.severity) setFeedbackSeverity(res.severity)
      showToast('Threat assessment completed.', 'success')
    } catch {
      showToast('Failed to evaluate threat text.', 'error')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!result) return
    setIsSubmittingFeedback(true)
    try {
      await apiClient.submitThreatAnalysisFeedback(result.id, {
        corrected_categories: feedbackFalsePositive ? ['BENIGN'] : (result.predicted_categories || []),
        corrected_severity: feedbackSeverity,
        is_false_positive: feedbackFalsePositive,
        notes: feedbackNotes.trim() || undefined,
      })
      setFeedbackSubmitted(true)
      showToast('Human review feedback saved separately from evidence.', 'success')
    } catch {
      showToast('Could not save review feedback.', 'error')
    } finally {
      setIsSubmittingFeedback(false)
    }
  }

  const getUrgencyBadge = (urgency: string) => {
    switch (urgency) {
      case 'critical':
        return <Badge variant="critical" dot>CRITICAL URGENCY</Badge>
      case 'high':
        return <Badge variant="warning" dot>HIGH URGENCY</Badge>
      case 'medium':
        return <Badge variant="primary" dot>MODERATE</Badge>
      default:
        return <Badge variant="safe" dot>LOW URGENCY</Badge>
    }
  }

  return (
    <div className="space-y-6 text-left">
      <PageHeader
        title={t.ai.threatAnalysisTitle}
        subtitle="Evaluate hostile communications, extortion demands, and harassment patterns with explainable AI signals."
      />

      {/* Mandatory Disclaimer */}
      <div className="p-4 bg-[#111716]/90 border border-[#d5ff54]/25 rounded-2xl flex items-start gap-3.5 text-xs text-[#929b93] shadow-lg shadow-[#070908]/60">
        <div className="w-8 h-8 rounded-xl bg-[#d5ff54]/10 border border-[#d5ff54]/30 flex items-center justify-center shrink-0 mt-0.5">
          <Info className="w-4 h-4 text-[#d5ff54]" />
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-[#f0f2eb]">Legal Boundary & Principle</p>
            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-[#d5ff54]/10 text-[#d5ff54] border border-[#d5ff54]/25">
              NLP Heuristic
            </span>
          </div>
          <p className="text-[#929b93] leading-relaxed text-[11.5px]">
            {t.ai.disclaimerBanner}
          </p>
        </div>
      </div>

      {/* Input Box & Incident Context Selector */}
      <Card className="bg-[#111716]/85 border-[rgba(225,239,221,0.15)]">
        <CardHeader>
          <CardTitle className="text-[#f0f2eb]">Abusive Communication Text Input</CardTitle>
          {incidents.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#929b93]">Load from Incident:</span>
              <select
                value={selectedIncidentId}
                onChange={(e) => handleSelectIncident(e.target.value)}
                className="bg-[#0d1110] border border-[rgba(225,239,221,0.20)] text-[#f0f2eb] text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-[#d5ff54]/60 transition-colors"
              >
                <option value="">-- Choose Incident --</option>
                {incidents.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.title}
                  </option>
                ))}
              </select>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {/* Quick-Test Threat Sample Templates */}
          <div className="mb-4 space-y-1.5">
            <span className="text-[11px] font-mono text-[#929b93] uppercase tracking-wider block">
              Quick Test Pre-Configured Threat Samples:
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  setInputText(
                    'Pay 0.5 BTC to 1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa within 24 hours or your private personal photos will be circulated to your Instagram followers and family members.'
                  )
                }
                className="px-2.5 py-1 rounded-lg bg-[#0d1110] hover:bg-[#111716] border border-[#ff927e]/30 hover:border-[#ff927e] text-[11px] text-[#ff927e] transition-all flex items-center gap-1.5"
              >
                <span>⚠️ Extortion &amp; Cryptocurrency Demand</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  setInputText(
                    'This is Cyber Crime Branch Inspector Sharma. A digital arrest warrant has been issued under PMLA Section 4. Keep your webcam active and do not disconnect or police will arrive at your home.'
                  )
                }
                className="px-2.5 py-1 rounded-lg bg-[#0d1110] hover:bg-[#111716] border border-[#ff927e]/30 hover:border-[#ff927e] text-[11px] text-[#ff927e] transition-all flex items-center gap-1.5"
              >
                <span>🚨 Digital Arrest Impersonation Scam</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  setInputText(
                    'I know you live at Flat 402, Green Glen Layout, Bellandur. I saw you leaving for work at 8:30 AM today. Delete your social media presence immediately or expect a visit.'
                  )
                }
                className="px-2.5 py-1 rounded-lg bg-[#0d1110] hover:bg-[#111716] border border-[#d5ff54]/30 hover:border-[#d5ff54] text-[11px] text-[#d5ff54] transition-all flex items-center gap-1.5"
              >
                <span>📍 Targeted Physical Doxxing &amp; Stalking</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  setInputText(
                    'ಇಪ್ಪತ್ತು ಸಾವಿರ ರೂಪಾಯಿ ತಕ್ಷಣ ವರ್ಗಾವಣೆ ಮಾಡು, ಇಲ್ಲದಿದ್ದರೆ ನಿನ್ನ ಖಾಸಗಿ ಫೋಟೋ ವೈರಲ್ ಮಾಡುತ್ತೇನೆ.'
                  )
                }
                className="px-2.5 py-1 rounded-lg bg-[#0d1110] hover:bg-[#111716] border border-[#d5ff54]/30 hover:border-[#d5ff54] text-[11px] text-[#d5ff54] transition-all flex items-center gap-1.5"
              >
                <span>🌐 Kannada Extortion &amp; NCII Threat</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  setInputText(
                    '50000 rupees abhi transfer kar warna teri private photo Instagram pe viral kar dunga.'
                  )
                }
                className="px-2.5 py-1 rounded-lg bg-[#0d1110] hover:bg-[#111716] border border-[#a8db35]/30 hover:border-[#a8db35] text-[11px] text-[#a8db35] transition-all flex items-center gap-1.5"
              >
                <span>💬 Hinglish Blackmail Sample</span>
              </button>
            </div>
          </div>

          <form onSubmit={handleAnalyze} className="space-y-4">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              rows={4}
              placeholder="Paste or type the received hostile message, threatening email, or extortion text here..."
              className="w-full px-3.5 py-2.5 bg-[#0d1110] border border-[rgba(225,239,221,0.20)] rounded-xl text-xs text-[#f0f2eb] placeholder-[#929b93] focus:outline-none focus:border-[#d5ff54]/60 transition-colors"
              required
            />
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <span className="text-[11px] text-[#929b93]">
                Text is analyzed privately against our local NLP classification pipeline.
              </span>
              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={isAnalyzing}
                leftIcon={<ShieldAlert className="w-4 h-4" />}
              >
                Analyze Threat Severity
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Standby Multi-Dimensional Threat Classifier Preview */}
      {!result && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { code: 'AXIS 01', title: 'Extortion & NCII', desc: 'Ransom demands, crypto wallets, and non-consensual leak threats.' },
            { code: 'AXIS 02', title: 'Digital Arrest Scams', desc: 'Impersonation of cyber police, PMLA notices, and coercion calls.' },
            { code: 'AXIS 03', title: 'Targeted Stalking', desc: 'Home addresses, routine surveillance, and physical intimidation cues.' },
            { code: 'AXIS 04', title: 'Multilingual NLP', desc: 'Detects English, Kannada, Hindi, and Romanized Hinglish coercion.' },
          ].map((axis) => (
            <Interactive3DSurface
              key={axis.code}
              intensity={6}
              className="p-4 bg-[#0d1110]/90 border border-[rgba(225,239,221,0.15)] rounded-xl space-y-2"
            >
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#d5ff54] block">
                {axis.code}
              </span>
              <h3 className="font-display text-lg uppercase tracking-[0.02em] font-bold text-[#f0f2eb]">
                {axis.title}
              </h3>
              <p className="text-xs text-[#929b93] leading-relaxed">{axis.desc}</p>
            </Interactive3DSurface>
          ))}
        </div>
      )}

      {/* Results View */}
      {result && (
        <div className="space-y-6">
          <Interactive3DSurface
            intensity={3}
            glowTone={result.urgency_level === 'critical' || result.urgency_level === 'high' ? 'coral' : 'lime'}
            className="p-6 bg-[#111716]/90 border border-[rgba(225,239,221,0.20)] rounded-2xl"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[rgba(225,239,221,0.15)]">
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="font-display text-xl uppercase tracking-[0.02em] font-bold text-[#f0f2eb]">
                    Threat Assessment Summary
                  </h3>
                  {getUrgencyBadge(result.urgency_level)}
                </div>
                <p className="text-xs text-[#929b93] mt-1">
                  Evaluated at {formatDate(result.created_at)}
                </p>
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-[#d5ff54]/10 border border-[#d5ff54]/30 text-[11px] text-[#d5ff54] flex items-center gap-2">
                <Shield className="w-3.5 h-3.5" />
                <span>Decision Support Analysis</span>
              </div>
            </div>

            {/* Clear Human Summary */}
            <div className="pt-4 space-y-2">
              <h4 className="text-sm font-semibold text-[#f0f2eb]">
                {result.urgency_level === 'critical' || result.urgency_level === 'high'
                  ? 'Our AI detected high-severity threats or extortion patterns in this message.'
                  : 'Our AI evaluated this communication for harassment and intimidation patterns.'}
              </h4>
              <p className="text-xs text-[#929b93] leading-relaxed">
                {result.explanation}
              </p>
            </div>
          </Interactive3DSurface>

          {/* 5 Clear Sections */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 1. What We Analysed */}
            <Card className="bg-[#111716]/85 border-[rgba(225,239,221,0.15)] p-5 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-[#d5ff54] uppercase tracking-wider">
                <span className="w-5 h-5 rounded-full bg-[#d5ff54]/10 text-[#d5ff54] flex items-center justify-center font-mono text-[10px]">1</span>
                What We Analysed
              </div>
              <div className="p-3 bg-[#0d1110] rounded-xl border border-[rgba(225,239,221,0.15)] text-xs text-[#f0f2eb] leading-relaxed">
                <p className="italic line-clamp-3">&quot;{inputText}&quot;</p>
              </div>
            </Card>

            {/* 2. What Our AI Noticed */}
            <Card className="bg-[#111716]/85 border-[rgba(225,239,221,0.15)] p-5 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-[#d5ff54] uppercase tracking-wider">
                <span className="w-5 h-5 rounded-full bg-[#d5ff54]/10 text-[#d5ff54] flex items-center justify-center font-mono text-[10px]">2</span>
                What Our AI Noticed
              </div>
              <div className="flex flex-wrap gap-2">
                {result.detected_signals.map((sig, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded-lg bg-[#0d1110] border border-[#ff927e]/30 text-xs text-[#f0f2eb] flex items-center gap-1.5"
                  >
                    <AlertTriangle className="w-3 h-3 text-[#ff927e] shrink-0" />
                    {sig}
                  </span>
                ))}
              </div>
            </Card>

            {/* 3. Why It Matters */}
            <Card className="bg-[#111716]/85 border-[rgba(225,239,221,0.15)] p-5 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-[#a8db35] uppercase tracking-wider">
                <span className="w-5 h-5 rounded-full bg-[#a8db35]/10 text-[#a8db35] flex items-center justify-center font-mono text-[10px]">3</span>
                Why It Matters
              </div>
              <p className="text-xs text-[#929b93] leading-relaxed">
                Threatening messages and extortion demands violate Indian IT Act regulations and constitute criminal intimidation. Preserving timestamped records helps establish a continuous pattern of abuse.
              </p>
            </Card>

            {/* 4. How Confident The Analysis Is */}
            <Card className="bg-[#111716]/85 border-[rgba(225,239,221,0.15)] p-5 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-[#ff927e] uppercase tracking-wider">
                <span className="w-5 h-5 rounded-full bg-[#ff927e]/10 text-[#ff927e] flex items-center justify-center font-mono text-[10px]">4</span>
                How Confident The Analysis Is
              </div>
              <div className="space-y-2 text-xs text-[#929b93] leading-relaxed">
                <p>
                  Based on multilingual NLP scoring and observable linguistic indicators. Not a formal legal determination.
                </p>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {result.severity && (
                    <Badge variant={result.severity === 'URGENT_REVIEW' ? 'critical' : result.severity === 'HIGH' ? 'warning' : 'neutral'}>
                      Severity: {result.severity}
                    </Badge>
                  )}
                  {result.language_name && (
                    <Badge variant="primary">
                      {result.language_name} ({result.script || 'Latin'}){result.is_mixed_language ? ' • Mixed' : ''}
                    </Badge>
                  )}
                  {result.analysis_status && (
                    <Badge variant="neutral">Status: {result.analysis_status}</Badge>
                  )}
                </div>
                {result.predicted_categories && result.predicted_categories.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {result.predicted_categories.map((cat) => (
                      <span key={cat} className="px-2 py-0.5 rounded bg-[#0d1110] border border-[#d5ff54]/30 text-[10px] font-mono text-[#f0f2eb]">
                        {cat}
                        {result.category_scores?.[cat] !== undefined ? ` (${Math.round(result.category_scores[cat] * 100)}%)` : ''}
                      </span>
                    ))}
                  </div>
                )}
                {result.model_id && (
                  <p className="text-[11px] font-mono text-[#929b93] pt-1">
                    Model: {result.model_id} ({result.model_version || 'v4'})
                  </p>
                )}
                {result.warnings && result.warnings.length > 0 && (
                  <p className="text-[11px] text-[#ff927e]">{result.warnings.join(' ')}</p>
                )}
              </div>
            </Card>
          </div>

          {/* Human Review & Correction (stored separately from evidence) */}
          <Card className="bg-[#111716]/85 border-[rgba(225,239,221,0.15)] p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-[#f0f2eb] uppercase tracking-wider">
                Human Review &amp; Feedback
              </h4>
              <span className="text-[10px] text-[#929b93]">
                Stored separately from original evidence • Not used for automatic retraining
              </span>
            </div>
            {feedbackSubmitted ? (
              <p className="text-xs text-[#a8db35]">Thank you. Your review feedback has been recorded.</p>
            ) : (
              <form onSubmit={handleFeedbackSubmit} className="flex flex-col sm:flex-row sm:items-center gap-3 text-xs">
                <label className="flex items-center gap-2 text-[#929b93] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={feedbackFalsePositive}
                    onChange={(e) => setFeedbackFalsePositive(e.target.checked)}
                    className="rounded border-[rgba(225,239,221,0.28)] bg-[#0d1110]"
                  />
                  Mark as false positive (benign)
                </label>
                <select
                  value={feedbackSeverity}
                  onChange={(e) => setFeedbackSeverity(e.target.value as 'LOW' | 'MODERATE' | 'HIGH' | 'URGENT_REVIEW')}
                  className="bg-[#0d1110] border border-[rgba(225,239,221,0.20)] text-[#f0f2eb] text-xs rounded-lg px-2.5 py-1.5"
                >
                  <option value="LOW">LOW</option>
                  <option value="MODERATE">MODERATE</option>
                  <option value="HIGH">HIGH</option>
                  <option value="URGENT_REVIEW">URGENT_REVIEW</option>
                </select>
                <input
                  type="text"
                  value={feedbackNotes}
                  onChange={(e) => setFeedbackNotes(e.target.value)}
                  placeholder="Optional reviewer notes..."
                  className="flex-1 bg-[#0d1110] border border-[rgba(225,239,221,0.20)] text-[#f0f2eb] text-xs rounded-lg px-2.5 py-1.5"
                />
                <Button type="submit" variant="secondary" size="sm" isLoading={isSubmittingFeedback}>
                  Submit Review
                </Button>
              </form>
            )}
          </Card>

          {/* 5. What You Can Do Next */}
          <Card className="bg-gradient-to-r from-[#111716] to-[#0d1110] border-[#d5ff54]/25 p-6 space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-[#d5ff54] uppercase tracking-wider">
              <span className="w-5 h-5 rounded-full bg-[#d5ff54]/10 text-[#d5ff54] flex items-center justify-center font-mono text-[10px]">5</span>
              What You Can Do Next
            </div>
            <div className="space-y-2 text-xs text-[#f0f2eb]">
              {result.suggested_steps.map((step, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#a8db35] shrink-0" />
                  <span>{step}</span>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Button
                variant="primary"
                size="md"
                onClick={() => window.location.href = '/complaints'}
                leftIcon={<FileText className="w-4 h-4" />}
              >
                Prepare Formal Complaint Draft
              </Button>
              <a
                href="https://cybercrime.gov.in"
                target="_blank"
                rel="noreferrer noopener"
              >
                <Button variant="secondary" size="md">
                  Report to NCRP (cybercrime.gov.in)
                </Button>
              </a>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
