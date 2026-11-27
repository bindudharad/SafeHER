import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  BookOpen,
  Search,
  Clock,
  Calendar,
  ArrowRight,
  Shield,
  Layers,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Bookmark,
  Share2,
  FileCheck,
  TrendingUp,
  Award,
} from 'lucide-react'
import { PageHeader } from '../../components/layout/PageHeader'
import { Card } from '../../components/common/Card'
import { Badge } from '../../components/common/Badge'
import { Button } from '../../components/common/Button'
import { KnowledgeCard3D } from '../../components/knowledge/KnowledgeCard3D'
import { useI18n } from '../../contexts/I18nContext'
import {
  KNOWLEDGE_ARTICLES,
  KNOWLEDGE_CATEGORIES,
  type ArticleCategory,
  type KnowledgeArticle,
} from '../../data/knowledgeArticles'

export const KnowledgeHubPage: React.FC = () => {
  const { t } = useI18n()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  const featuredArticle = KNOWLEDGE_ARTICLES.find((a) => a.featured) || KNOWLEDGE_ARTICLES[0]
  const trendingArticles = KNOWLEDGE_ARTICLES.filter((a) => a.slug !== featuredArticle.slug).slice(0, 3)

  const filteredArticles = KNOWLEDGE_ARTICLES.filter((article) => {
    const matchesSearch =
      article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))

    const matchesCategory =
      selectedCategory === 'all' || article.category === selectedCategory

    return matchesSearch && matchesCategory
  })

  return (
    <div className="space-y-12 text-left pb-20">
      {/* ======================================================== */}
      {/* 1. EDITORIAL PUBLICATION MASTHEAD                        */}
      {/* ======================================================== */}
      <header className="border-b border-[rgba(225,239,221,0.15)] pb-8 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-[#929b93]">
          <div className="flex items-center gap-2">
            <span className="text-[#d5ff54] font-bold tracking-wider">SAFEHER RESEARCH JOURNAL</span>
            <span>•</span>
            <span>ISSUE 24 • AUTUMN 2026</span>
          </div>
          <div className="flex items-center gap-3">
            <span>PEER-REVIEWED FORENSICS</span>
            <span>•</span>
            <span className="text-[#a8db35]">OPEN ACCESS</span>
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl uppercase font-extrabold tracking-[0.01em] text-[#f0f2eb] leading-[0.95]">
              {t.knowledge.title}
            </h1>
            <p className="text-sm sm:text-base text-[#929b93] leading-relaxed">
              {t.knowledge.subtitle}
            </p>
          </div>

          {/* Integrated Editorial Search Input */}
          <div className="w-full md:w-96 shrink-0 relative">
            <Search className="w-4 h-4 text-[#929b93] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.knowledge.searchPlaceholder}
              className="w-full bg-[#0d1110] border border-[rgba(225,239,221,0.24)] rounded-xl pl-10 pr-4 py-2.5 text-xs text-[#f0f2eb] placeholder-[#929b93] focus:outline-none focus:border-[#d5ff54] transition-colors font-mono"
            />
          </div>
        </div>
      </header>

      {/* ======================================================== */}
      {/* 2. ASYMMETRIC LEAD STORY SPREAD (MAGAZINE HERO)          */}
      {/* ======================================================== */}
      {selectedCategory === 'all' && !searchQuery && (
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start border-b border-[rgba(225,239,221,0.15)] pb-12">
          {/* Main Cover Story (7 Cols) */}
          <article className="lg:col-span-7 space-y-4 group">
            {featuredArticle.imageUrl && (
              <div className="relative rounded-2xl overflow-hidden aspect-[16/9] bg-[#0d1110] border border-[rgba(225,239,221,0.20)] shadow-xl">
                <img
                  src={featuredArticle.imageUrl}
                  alt={featuredArticle.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-4 left-4">
                  <span className="text-[10px] font-mono uppercase font-bold px-3 py-1 rounded-full bg-[#070908]/85 text-[#d5ff54] border border-[#d5ff54]/30 backdrop-blur-md">
                    Cover Feature • {featuredArticle.categoryLabel}
                  </span>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center gap-3 text-xs text-[#929b93] font-mono">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-[#d5ff54]" />
                  {featuredArticle.readingTime}
                </span>
                <span>•</span>
                <span>{featuredArticle.publishedDate}</span>
                <span>•</span>
                <span className="text-[#a8db35]">Forensics Certified</span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#f0f2eb] group-hover:text-[#d5ff54] transition-colors leading-tight">
                <Link to={`/knowledge-hub/${featuredArticle.slug}`}>
                  {featuredArticle.title}
                </Link>
              </h2>

              <p className="text-xs sm:text-sm text-[#929b93] leading-relaxed line-clamp-3">
                {featuredArticle.summary}
              </p>

              <div className="flex items-center justify-between pt-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-[#d5ff54]/20 border border-[#d5ff54]/40 flex items-center justify-center text-xs font-bold text-[#d5ff54]">
                    {featuredArticle.author.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#f0f2eb]">{featuredArticle.author.name}</p>
                    <p className="text-[10px] text-[#929b93]">{featuredArticle.author.role}</p>
                  </div>
                </div>

                <Link to={`/knowledge-hub/${featuredArticle.slug}`}>
                  <Button variant="primary" size="sm" rightIcon={<ArrowRight className="w-4 h-4" />}>
                    Read Analysis
                  </Button>
                </Link>
              </div>
            </div>
          </article>

          {/* Trending Forensic Briefs (5 Cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-[#d5ff54] pb-1 border-b border-[rgba(225,239,221,0.15)]">
              <TrendingUp className="w-4 h-4 text-[#d5ff54]" />
              <span>Top Forensic Research Briefs</span>
            </div>

            <div className="divide-y divide-[#929b93]/15 space-y-2">
              {trendingArticles.map((brief, idx) => (
                <article key={brief.slug} className="pt-3 first:pt-0 space-y-1.5 group">
                  <div className="flex items-center gap-2 text-[10px] font-mono text-[#929b93]">
                    <span className="font-bold text-[#d5ff54]">#0{idx + 1}</span>
                    <span>•</span>
                    <span className="uppercase text-[#a8db35]">{brief.categoryLabel}</span>
                    <span>•</span>
                    <span>{brief.readingTime}</span>
                  </div>

                  <h3 className="text-sm font-bold text-[#f0f2eb] group-hover:text-[#d5ff54] transition-colors leading-snug">
                    <Link to={`/knowledge-hub/${brief.slug}`}>
                      {brief.title}
                    </Link>
                  </h3>

                  <p className="text-xs text-[#929b93] line-clamp-2 leading-relaxed">
                    {brief.summary}
                  </p>
                </article>
              ))}
            </div>

            {/* Statutory Quick Link Box */}
            <div className="p-4 bg-[#111716]/85 border border-[rgba(225,239,221,0.20)] rounded-2xl space-y-2">
              <span className="text-[11px] font-mono font-bold text-[#a8db35] uppercase block">
                Statutory Citizen Recourse
              </span>
              <p className="text-xs text-[#929b93] leading-relaxed">
                Indian IT Act Section 66E and BNS Section 354D provide 24-hour expedited relief mechanisms against non-consensual synthetic media.
              </p>
              <Link to="/knowledge-hub/preserving-digital-evidence-section-65b" className="text-xs text-[#d5ff54] hover:underline font-mono inline-flex items-center gap-1">
                <span>View Section 65B Guide</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ======================================================== */}
      {/* 3. EDITORIAL TOPIC STRIP                                 */}
      {/* ======================================================== */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[rgba(225,239,221,0.15)] pb-3">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                selectedCategory === 'all'
                  ? 'bg-[#d5ff54]/15 text-[#d5ff54] font-bold'
                  : 'text-[#929b93] hover:text-[#f0f2eb]'
              }`}
            >
              All Articles ({KNOWLEDGE_ARTICLES.length})
            </button>

            {KNOWLEDGE_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                  selectedCategory === cat.id
                    ? 'bg-[#d5ff54]/15 text-[#d5ff54] font-bold'
                    : 'text-[#929b93] hover:text-[#f0f2eb]'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          <span className="text-[11px] font-mono text-[#929b93]">
            Showing {filteredArticles.length} Published Articles
          </span>
        </div>

        {/* ======================================================== */}
        {/* 4. ASYMMETRIC EDITORIAL GRID                             */}
        {/* ======================================================== */}
        {filteredArticles.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#929b93] bg-[#111716]/80 rounded-2xl border border-[rgba(225,239,221,0.15)]">
            <BookOpen className="w-8 h-8 text-[#d5ff54] mx-auto mb-2 opacity-50" />
            No articles match your search or filter criteria. Try resetting the category.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredArticles.map((article) => (
              <KnowledgeCard3D key={article.slug} article={article} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
