import React, { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import type { KnowledgeArticle } from '../../data/knowledgeArticles'

interface KnowledgeCard3DProps {
  article: KnowledgeArticle
}

export const KnowledgeCard3D: React.FC<KnowledgeCard3DProps> = ({ article }) => {
  const cardRef = useRef<HTMLElement>(null)
  const [transform, setTransform] = useState('perspective(900px) rotateX(0deg) rotateY(0deg) translateZ(0px)')

  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    if (
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return
    }
    const el = cardRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const x = (e.clientX - rect.left) / Math.max(rect.width, 1) - 0.5
    const y = (e.clientY - rect.top) / Math.max(rect.height, 1) - 0.5
    const rotateY = x * 7
    const rotateX = -y * 7
    setTransform(`perspective(900px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateZ(6px)`)
  }

  const handleMouseLeave = () => {
    setTransform('perspective(900px) rotateX(0deg) rotateY(0deg) translateZ(0px)')
  }

  return (
    <article
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ transform, transition: 'transform 220ms cubic-bezier(0.22, 1, 0.36, 1)' }}
      className="bg-[#171D35]/90 border border-[#A6AEC8]/15 rounded-2xl overflow-hidden hover:border-[#8B7CFF]/45 hover:shadow-[0_14px_34px_rgba(8,11,24,0.65),0_0_24px_rgba(139,124,255,0.12)] flex flex-col justify-between group shadow-md will-change-transform"
    >
      <div>
        {article.imageUrl && (
          <div className="relative aspect-[16/10] bg-[#0D1224] overflow-hidden">
            <img
              src={article.imageUrl}
              alt={article.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#080B18]/70 via-transparent to-transparent pointer-events-none" />
            <div className="absolute top-3 left-3">
              <span className="text-[10px] font-mono uppercase font-bold px-2.5 py-0.5 rounded-full bg-[#080B18]/85 text-[#8B7CFF] border border-[#8B7CFF]/30 backdrop-blur-md">
                {article.categoryLabel}
              </span>
            </div>
          </div>
        )}

        <div className="p-5 space-y-2.5">
          <div className="flex items-center justify-between text-[11px] font-mono text-[#A6AEC8]">
            <span>{article.readingTime}</span>
            <span>{article.publishedDate}</span>
          </div>

          <h3 className="text-base font-bold text-[#F4F5FF] group-hover:text-[#A99BFF] transition-colors leading-snug line-clamp-2">
            <Link to={`/knowledge-hub/${article.slug}`}>
              {article.title}
            </Link>
          </h3>

          <p className="text-xs text-[#A6AEC8] line-clamp-3 leading-relaxed">
            {article.summary}
          </p>
        </div>
      </div>

      <div className="p-5 pt-0 border-t border-[#A6AEC8]/10 mt-auto">
        <div className="flex items-center justify-between pt-3">
          <span className="text-xs text-[#A6AEC8] font-medium">{article.author.name}</span>
          <Link
            to={`/knowledge-hub/${article.slug}`}
            className="text-xs font-semibold text-[#55D6E8] hover:text-[#8B7CFF] inline-flex items-center gap-1 transition-colors"
          >
            <span>Read Guide</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </article>
  )
}
