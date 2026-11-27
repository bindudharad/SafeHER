import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'

interface RiskCard {
  id: string
  title: string
  subtitle: string
  desc: string
  route: string
  svgType: 'harassment' | 'impersonation' | 'deepfake' | 'threats' | 'arrest'
}

const RISK_CARDS: RiskCard[] = [
  {
    id: 'risk-1',
    title: 'Online Harassment',
    subtitle: 'Persistent Cyberstalking & Trolling',
    desc: 'Automated coordination, bot swarms, and persistent abusive messaging tracked across social channels.',
    route: '/incidents/new',
    svgType: 'harassment',
  },
  {
    id: 'risk-2',
    title: 'Identity Impersonation',
    subtitle: 'Profile Cloning & Credential Theft',
    desc: 'Detection of cloned profiles, synthetic bio spoofing, and unauthorized likeness exploitation.',
    route: '/incidents/new',
    svgType: 'impersonation',
  },
  {
    id: 'risk-3',
    title: 'Image-Based Abuse',
    subtitle: 'Synthetic Video & Non-Consensual Media',
    desc: 'ViT neural detector unmasking synthetic face swaps and coordinating hash protection with StopNCII.org.',
    route: '/analysis/media',
    svgType: 'deepfake',
  },
  {
    id: 'risk-4',
    title: 'Threats & Blackmail',
    subtitle: 'Coercive Sextortion & Ransom',
    desc: 'Real-time classification of extortion demands, urgent legal timelines, and evidence preservation.',
    route: '/analysis/threat',
    svgType: 'threats',
  },
  {
    id: 'risk-5',
    title: 'Digital Arrest Scams',
    subtitle: 'Law Enforcement Spoofing',
    desc: 'Blocking synthetic police/court video calls, fake arrest warrants, and institutional intimidation.',
    route: '/reporting',
    svgType: 'arrest',
  },
]

export const RiskCoverageGrid: React.FC = () => {
  const [activeCard, setActiveCard] = useState<string | null>(null)

  const renderSvg = (type: RiskCard['svgType'], isHovered: boolean) => {
    const strokeClass = isHovered
      ? 'stroke-zcyan transition-colors duration-300'
      : 'stroke-white/60 transition-colors duration-300'
    const glowStyle = isHovered
      ? { filter: 'drop-shadow(0 0 10px rgba(0, 212, 255, 0.75))' }
      : {}

    switch (type) {
      case 'harassment':
        return (
          <svg
            viewBox="0 0 120 120"
            className="w-20 h-20 mx-auto"
            fill="none"
            style={glowStyle}
          >
            {/* Radar / Arch network */}
            <circle
              cx="60"
              cy="60"
              r="48"
              className={`${strokeClass} [stroke-dasharray:300] ${
                isHovered ? 'animate-[drawLine_1.5s_ease-out_forwards]' : ''
              }`}
              strokeWidth="1.8"
            />
            <path
              d="M 25 60 Q 60 20 95 60 Q 60 100 25 60 Z"
              className={`${strokeClass} [stroke-dasharray:250] ${
                isHovered ? 'animate-[drawLineSlow_2s_ease-out_forwards]' : ''
              }`}
              strokeWidth="1.8"
            />
            <line x1="60" y1="12" x2="60" y2="108" className={strokeClass} strokeWidth="1.4" />
            <circle
              cx="60"
              cy="60"
              r="14"
              className={`${strokeClass} ${isHovered ? 'animate-[dotPop_0.6s_ease-out_forwards]' : ''}`}
              strokeWidth="2"
            />
            <circle cx="60" cy="60" r="4" fill="#d5ff54" />
          </svg>
        )

      case 'impersonation':
        return (
          <svg
            viewBox="0 0 120 120"
            className="w-20 h-20 mx-auto"
            fill="none"
            style={glowStyle}
          >
            {/* Hexagonal polygon mesh */}
            <polygon
              points="60,18 100,42 100,88 60,110 20,88 20,42"
              className={`${strokeClass} [stroke-dasharray:320] ${
                isHovered ? 'animate-[drawLine_1.5s_ease-out_forwards]' : ''
              }`}
              strokeWidth="1.8"
            />
            <line x1="20" y1="42" x2="100" y2="88" className={strokeClass} strokeWidth="1.2" strokeDasharray="3 3" />
            <line x1="100" y1="42" x2="20" y2="88" className={strokeClass} strokeWidth="1.2" strokeDasharray="3 3" />
            <circle cx="60" cy="64" r="18" className={strokeClass} strokeWidth="1.8" />
            <circle cx="60" cy="64" r="5" fill="#d5ff54" />
          </svg>
        )

      case 'deepfake':
        return (
          <svg
            viewBox="0 0 120 120"
            className="w-20 h-20 mx-auto"
            fill="none"
            style={glowStyle}
          >
            {/* Camera aperture & scan slice */}
            <rect
              x="22"
              y="22"
              width="76"
              height="76"
              rx="12"
              className={`${strokeClass} [stroke-dasharray:300] ${
                isHovered ? 'animate-[drawLine_1.5s_ease-out_forwards]' : ''
              }`}
              strokeWidth="1.8"
            />
            <circle cx="60" cy="60" r="24" className={strokeClass} strokeWidth="1.8" />
            <line x1="36" y1="48" x2="84" y2="48" className={strokeClass} strokeWidth="1.4" />
            <line x1="36" y1="62" x2="72" y2="62" className={strokeClass} strokeWidth="1.4" />
            <line x1="36" y1="76" x2="58" y2="76" className={strokeClass} strokeWidth="1.4" />
            <circle cx="82" cy="76" r="6" stroke="#d5ff54" strokeWidth="2" fill="#d5ff5422" />
          </svg>
        )

      case 'threats':
        return (
          <svg
            viewBox="0 0 120 120"
            className="w-20 h-20 mx-auto"
            fill="none"
            style={glowStyle}
          >
            {/* Spectral audio wave / radar */}
            <circle cx="60" cy="60" r="46" className={strokeClass} strokeWidth="1.8" />
            <line x1="32" y1="60" x2="32" y2="60" className={strokeClass} strokeWidth="2" />
            <line x1="44" y1="42" x2="44" y2="78" className={strokeClass} strokeWidth="2" />
            <line x1="56" y1="24" x2="56" y2="96" className={strokeClass} strokeWidth="2.4" />
            <line x1="68" y1="36" x2="68" y2="84" className={strokeClass} strokeWidth="2" />
            <line x1="80" y1="48" x2="80" y2="72" className={strokeClass} strokeWidth="2" />
            <line x1="92" y1="54" x2="92" y2="66" className={strokeClass} strokeWidth="2" />
          </svg>
        )

      case 'arrest':
        return (
          <svg
            viewBox="0 0 120 120"
            className="w-20 h-20 mx-auto"
            fill="none"
            style={glowStyle}
          >
            {/* Triangle & shield lock */}
            <polygon
              points="60,16 106,96 14,96"
              className={`${strokeClass} [stroke-dasharray:300] ${
                isHovered ? 'animate-[drawLine_1.5s_ease-out_forwards]' : ''
              }`}
              strokeWidth="1.8"
            />
            <circle cx="60" cy="66" r="16" className={strokeClass} strokeWidth="1.8" />
            <circle cx="60" cy="66" r="5" fill="#d5ff54" />
            <line x1="60" y1="32" x2="60" y2="44" className={strokeClass} strokeWidth="2" />
          </svg>
        )
    }
  }

  return (
    <section id="coverage" className="py-24 sm:py-32 bg-black text-left">
      <div className="container max-w-[1360px] mx-auto px-4 sm:px-8">
        {/* Header */}
        <div className="mb-14 sm:mb-20">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-zcharcoal text-zcyan border border-zcyan/30 text-xs font-mono uppercase tracking-wider mb-4">
            <span>003 / DIGITAL SAFETY COVERAGE</span>
          </div>

          <h2 className="font-display text-4xl sm:text-6xl font-bold uppercase text-white tracking-tight">
            DIGITAL SAFETY <span className="font-script text-zcyan normal-case text-5xl sm:text-7xl px-2">Coverage</span>
          </h2>
          <p className="mt-3 text-sm sm:text-base text-ztext-variant max-w-xl font-sans">
            Autonomous protection against the full continuum of online intimidation, identity fraud, and non-consensual exploitation.
          </p>
        </div>

        {/* 5 Interactive Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5 sm:gap-6">
          {RISK_CARDS.map((card) => {
            const isHovered = activeCard === card.id
            return (
              <div
                key={card.id}
                onMouseEnter={() => setActiveCard(card.id)}
                onMouseLeave={() => setActiveCard(null)}
                onClick={() => setActiveCard(activeCard === card.id ? null : card.id)}
                className={`relative rounded-2xl bg-[#070908] border transition-all duration-300 p-6 flex flex-col justify-between cursor-pointer group ${
                  isHovered
                    ? 'border-zcyan/80 -translate-y-2 shadow-[0_20px_50px_rgba(0,0,0,0.9),0_0_35px_rgba(0,212,255,0.25)]'
                    : 'border-zcyan/20 hover:border-zcyan/40 shadow-[0_15px_35px_rgba(0,0,0,0.7)]'
                }`}
              >
                {/* SVG Illustration Container */}
                <div className="py-6 sm:py-8 border-b border-white/5 flex items-center justify-center">
                  {renderSvg(card.svgType, isHovered)}
                </div>

                {/* Content */}
                <div className="pt-5 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-display text-xl font-bold uppercase text-white group-hover:text-zcyan transition-colors mb-1.5 leading-tight">
                      {card.title}
                    </h3>
                    <div className="font-mono text-[11px] text-zcyan/90 uppercase tracking-wider mb-3">
                      {card.subtitle}
                    </div>
                    <p className="text-xs text-ztext-muted leading-relaxed font-sans mb-6">
                      {card.desc}
                    </p>
                  </div>

                  <Link
                    to={card.route}
                    className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-zcyan group-hover:translate-x-1 transition-all"
                  >
                    <span>Secure Protocol</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
