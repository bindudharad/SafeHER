import React, { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Clock,
  Calendar,
  Share2,
  Bookmark,
  Shield,
  ShieldCheck,
  ShieldAlert,
  HardDrive,
  Cpu,
  FileText,
  ExternalLink,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  BookOpen,
} from 'lucide-react'
import { PageHeader } from '../../components/layout/PageHeader'
import { Card } from '../../components/common/Card'
import { Badge } from '../../components/common/Badge'
import { Button } from '../../components/common/Button'
import { useToast } from '../../contexts/ToastContext'
import { useI18n } from '../../contexts/I18nContext'
import { KNOWLEDGE_ARTICLES, type KnowledgeArticle } from '../../data/knowledgeArticles'

export const ArticleDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { t } = useI18n()
  const [readProgress, setReadProgress] = useState(0)

  useEffect(() => {
    const onScroll = () => {
      const scrollTop = window.scrollY
      const docHeight = document.documentElement.scrollHeight - window.innerHeight
      if (docHeight > 0) {
        setReadProgress(Math.min(100, Math.max(0, (scrollTop / docHeight) * 100)))
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const article = KNOWLEDGE_ARTICLES.find((a) => a.slug === slug)

  if (!article) {
    return (
      <div className="p-12 text-center space-y-4">
        <BookOpen className="w-12 h-12 text-[#FF718A] mx-auto opacity-70" />
        <h2 className="text-xl font-bold text-[#F4F5FF]">Article Not Found</h2>
        <p className="text-xs text-[#A6AEC8] max-w-sm mx-auto">
          The requested educational guide could not be located in the Knowledge Hub database.
        </p>
        <Button variant="secondary" size="sm" onClick={() => navigate('/knowledge-hub')}>
          {t.knowledge.backToHub}
        </Button>
      </div>
    )
  }

  const relatedArticles = KNOWLEDGE_ARTICLES.filter((a) => a.slug !== article.slug).slice(0, 3)

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href)
    showToast('Article URL copied to clipboard.', 'info')
  }

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <div className="space-y-8 text-left pb-16 max-w-5xl mx-auto">
      {/* Reading Progress Indicator */}
      <div className="sticky top-0 z-30 -mx-2 px-2 py-1 bg-[#080B18]/80 backdrop-blur-md rounded-b-lg">
        <div className="h-1 w-full bg-[#171D35] rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#8B7CFF] to-[#55D6E8] transition-all duration-150"
            style={{ width: `${readProgress}%` }}
          />
        </div>
      </div>
      {/* Back button and breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          to="/knowledge-hub"
          className="inline-flex items-center gap-1.5 text-xs text-[#A6AEC8] hover:text-[#8B7CFF] transition-colors font-mono"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Knowledge Hub</span>
        </Link>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopyLink}
            leftIcon={<Share2 className="w-3.5 h-3.5" />}
          >
            Share Guide
          </Button>
        </div>
      </div>

      {/* Article Header */}
      <div className="space-y-4 border-b border-[#A6AEC8]/15 pb-8">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-[10px] font-mono font-bold uppercase px-2.5 py-0.5 rounded-full bg-[#8B7CFF]/15 text-[#8B7CFF] border border-[#8B7CFF]/30">
            {article.categoryLabel}
          </span>
          <span className="text-xs text-[#A6AEC8] flex items-center gap-1 font-mono">
            <Clock className="w-3.5 h-3.5" />
            {article.readingTime}
          </span>
          <span className="text-xs text-[#727D9C]">•</span>
          <span className="text-xs text-[#A6AEC8] font-mono">{article.publishedDate}</span>
        </div>

        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-[#F4F5FF] leading-snug">
          {article.title}
        </h1>

        <p className="text-sm sm:text-base text-[#A6AEC8] leading-relaxed max-w-3xl">
          {article.heroDescription}
        </p>

        {/* Author badge */}
        <div className="flex items-center gap-3 pt-2">
          <div className="w-9 h-9 rounded-full bg-[#8B7CFF]/20 border border-[#8B7CFF]/40 flex items-center justify-center text-xs font-bold text-[#8B7CFF]">
            {article.author.name.charAt(0)}
          </div>
          <div>
            <p className="text-xs font-semibold text-[#F4F5FF]">{article.author.name}</p>
            <p className="text-[11px] text-[#A6AEC8]">{article.author.role}</p>
          </div>
        </div>

        {article.imageUrl && (
          <div className="rounded-2xl overflow-hidden aspect-[21/9] bg-[#0D1224] border border-[#A6AEC8]/20 mt-4 shadow-xl">
            <img
              src={article.imageUrl}
              alt={article.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}
      </div>

      {/* Main Grid: Content + Sidebar TOC */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Editorial Content */}
        <div className="lg:col-span-8 space-y-10">
          {article.sections.map((sec, idx) => (
            <section key={sec.id} id={sec.id} className="space-y-4">
              <h2 className="text-lg sm:text-xl font-bold text-[#F4F5FF] flex items-baseline gap-2">
                <span>{sec.title}</span>
              </h2>

              <p className="text-xs sm:text-sm text-[#A6AEC8] leading-relaxed whitespace-pre-wrap">
                {sec.content}
              </p>

              {/* Key Takeaways Box if present */}
              {sec.keyTakeaways && sec.keyTakeaways.length > 0 && (
                <div className="p-4 bg-[#171D35]/85 rounded-2xl border border-[#8B7CFF]/25 space-y-2">
                  <h3 className="text-xs font-bold text-[#8B7CFF] font-mono uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-[#8B7CFF]" />
                    Key Forensic Takeaways:
                  </h3>
                  <ul className="space-y-1.5 text-xs text-[#F4F5FF]">
                    {sec.keyTakeaways.map((takeaway, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-[#8B7CFF] font-mono mt-0.5">•</span>
                        <span>{takeaway}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Warning Signs Box if present */}
              {sec.warningSigns && sec.warningSigns.length > 0 && (
                <div className="p-4 bg-[#171D35]/85 rounded-2xl border border-[#FF718A]/25 space-y-2">
                  <h3 className="text-xs font-bold text-[#FF718A] font-mono uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-[#FF718A]" />
                    Critical Warning Signs:
                  </h3>
                  <ul className="space-y-1.5 text-xs text-[#F4F5FF]">
                    {sec.warningSigns.map((sign, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-[#FF718A] font-mono mt-0.5">⚠</span>
                        <span>{sign}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Action Steps Box if present */}
              {sec.actionSteps && sec.actionSteps.length > 0 && (
                <div className="p-4 bg-[#0D1224] rounded-2xl border border-[#52D6B2]/25 space-y-2">
                  <h3 className="text-xs font-bold text-[#52D6B2] font-mono uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-[#52D6B2]" />
                    Tactical Action Checklist:
                  </h3>
                  <ul className="space-y-1.5 text-xs text-[#F4F5FF]">
                    {sec.actionSteps.map((step, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-[#52D6B2] font-mono mt-0.5">✓</span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          ))}

          {/* Legal Framework Context Box */}
          {article.legalContext && (
            <Card className="p-5 bg-[#171D35]/90 border border-[#A6AEC8]/20 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-[#8B7CFF] uppercase tracking-wider font-mono">
                <FileText className="w-4 h-4" />
                <span>Statutory Legal Framework (India)</span>
              </div>
              <h3 className="text-sm font-bold text-[#F4F5FF]">{article.legalContext.act}</h3>
              <p className="text-xs text-[#A6AEC8] leading-relaxed">
                {article.legalContext.description}
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                {article.legalContext.sections.map((sec, i) => (
                  <span
                    key={i}
                    className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-[#080B18] text-[#52D6B2] border border-[#52D6B2]/25 font-semibold"
                  >
                    {sec}
                  </span>
                ))}
              </div>
            </Card>
          )}

          {/* What to do if affected (Direct SafeHER Call to Actions) */}
          <Card className="p-6 bg-gradient-to-br from-[#171D35] via-[#0D1224] to-[#1D2540] border-[#8B7CFF]/30 space-y-4">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-[#F4F5FF] flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#8B7CFF]" />
                What to Do If Affected by This Threat
              </h3>
              <p className="text-xs text-[#A6AEC8]">
                Take immediate structured action using SafeHER’s integrated forensic and legal response tools.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              {article.recommendedActions.map((action, i) => (
                <Link key={i} to={action.to}>
                  <Button variant={action.variant} size="sm">
                    {action.label}
                  </Button>
                </Link>
              ))}
            </div>
          </Card>

          {/* Sources and References */}
          {article.sources && article.sources.length > 0 && (
            <div className="pt-4 border-t border-[#A6AEC8]/15 space-y-2">
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#727D9C] block">
                Forensic &amp; Legal Citations:
              </span>
              <ul className="space-y-1 text-xs text-[#A6AEC8]">
                {article.sources.map((src, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-[#8B7CFF]">[{i + 1}]</span>
                    <span>{src.title}</span>
                    <span className="text-[#727D9C]">({src.organization})</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Sticky Table of Contents & Quick Action Sidebar */}
        <div className="lg:col-span-4 sticky top-24 space-y-6">
          <Card className="p-5 bg-[#171D35]/85 border-[#A6AEC8]/15 space-y-3">
            <span className="text-xs font-mono uppercase tracking-wider text-[#8B7CFF] font-semibold block">
              Table of Contents
            </span>
            <nav className="space-y-1.5 text-xs">
              {article.sections.map((sec) => (
                <button
                  key={sec.id}
                  onClick={() => scrollToSection(sec.id)}
                  className="block text-left text-[#A6AEC8] hover:text-[#8B7CFF] transition-colors py-1 truncate w-full"
                >
                  {sec.title}
                </button>
              ))}
            </nav>
          </Card>

          {/* Related Articles Card */}
          <Card className="p-5 bg-[#171D35]/85 border-[#A6AEC8]/15 space-y-3">
            <span className="text-xs font-mono uppercase tracking-wider text-[#F4F5FF] font-semibold block">
              Related Research
            </span>
            <div className="space-y-3">
              {relatedArticles.map((rel) => (
                <Link
                  key={rel.slug}
                  to={`/knowledge-hub/${rel.slug}`}
                  className="block group"
                >
                  <p className="text-xs font-semibold text-[#F4F5FF] group-hover:text-[#8B7CFF] transition-colors line-clamp-2">
                    {rel.title}
                  </p>
                  <span className="text-[10px] font-mono text-[#727D9C]">
                    {rel.categoryLabel} • {rel.readingTime}
                  </span>
                </Link>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
