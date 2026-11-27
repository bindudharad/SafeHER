import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import type { KnowledgeArticle } from '../../data/knowledgeArticles'
import { Interactive3DSurface } from '../ui/Interactive3DSurface'

interface KnowledgeCard3DProps {
  article: KnowledgeArticle
}

export const KnowledgeCard3D: React.FC<KnowledgeCard3DProps> = ({ article }) => {
  return (
    <Interactive3DSurface
      intensity={7}
      elevateZ={8}
      className="bg-[#111716]/90 border border-[rgba(225,239,221,0.15)] rounded-2xl hover:border-[#d5ff54]/45 flex flex-col justify-between group shadow-md"
    >
      <article className="flex flex-col justify-between h-full">
        <div>
          {article.imageUrl && (
            <div className="relative aspect-[16/10] bg-[#0d1110] overflow-hidden">
              <img
                src={article.imageUrl}
                alt={article.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#070908]/75 via-transparent to-transparent pointer-events-none" />
              <div className="absolute top-3 left-3">
                <span className="text-[10px] font-mono uppercase font-bold px-2.5 py-0.5 rounded-full bg-[#070908]/85 text-[#d5ff54] border border-[#d5ff54]/30 backdrop-blur-md">
                  {article.categoryLabel}
                </span>
              </div>
            </div>
          )}

          <div className="p-5 space-y-2.5">
            <div className="flex items-center justify-between text-[11px] font-mono text-[#929b93]">
              <span>{article.readingTime}</span>
              <span>{article.publishedDate}</span>
            </div>

            <h3 className="font-display text-xl uppercase tracking-[0.02em] font-bold text-[#f0f2eb] group-hover:text-[#e2ff84] transition-colors leading-tight line-clamp-2">
              <Link to={`/knowledge-hub/${article.slug}`}>{article.title}</Link>
            </h3>

            <p className="text-xs text-[#929b93] line-clamp-3 leading-relaxed">
              {article.summary}
            </p>
          </div>
        </div>

        <div className="p-5 pt-0 border-t border-[rgba(225,239,221,0.10)] mt-auto">
          <div className="flex items-center justify-between pt-3">
            <span className="text-xs text-[#929b93] font-medium">{article.author.name}</span>
            <Link
              to={`/knowledge-hub/${article.slug}`}
              className="text-xs font-mono uppercase tracking-[0.1em] font-semibold text-[#d5ff54] hover:text-[#e2ff84] inline-flex items-center gap-1 transition-colors"
            >
              <span>Read Guide</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </article>
    </Interactive3DSurface>
  )
}
