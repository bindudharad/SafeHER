import React, { useState } from 'react'
import { ChevronLeft, ChevronRight, ExternalLink, ShieldCheck, Newspaper } from 'lucide-react'

interface MediaCard {
  id: string
  source: string
  badge: string
  title: string
  summary: string
  link: string
  linkLabel: string
}

const CARDS: MediaCard[] = [
  {
    id: 'm1',
    source: 'HINDUSTAN BYTES',
    badge: 'NATIONAL COVERAGE',
    title: '85,000+ Pre-Registrations: SafeHER Deploys Sovereign Digital Abuse Intelligence Center',
    summary:
      'Addressing synthetic images, manipulated videos, audio clones, and AI impersonation with zero-knowledge cryptographic integrity telemetry under Indian DPDP Act standards.',
    link: 'https://cybercrime.gov.in',
    linkLabel: 'READ REPORT',
  },
  {
    id: 'm2',
    source: 'LEGAL TECH INDIA',
    badge: 'FORENSIC STANDARDS',
    title: 'Court-Admissible Evidence: Section 65B Cryptographic Checksums in Citizen Complaints',
    summary:
      'How victim-controlled browser SHA-256 fingerprinting creates unshakeable chains of custody for cyber police stations and magistrate filings.',
    link: 'https://cybercrime.gov.in',
    linkLabel: 'EXPLORE DOSSIER',
  },
  {
    id: 'm3',
    source: 'CYBER DEFENSE REVIEW',
    badge: 'MEDIA INTERCEPTION',
    title: 'StopNCII.org Consortium Integration: Neutralizing Non-Consensual Media Syndicates',
    summary:
      'Empowering individuals to generate perceptual image hashes locally, halting cross-platform viral circulation without revealing private raw files.',
    link: 'https://stopncii.org',
    linkLabel: 'VIEW PROTOCOL',
  },
  {
    id: 'm4',
    source: 'DIGITAL RIGHTS DISPATCH',
    badge: 'HUMAN-IN-THE-LOOP',
    title: 'Zero-Hallucination Complaint Drafting: Why Deterministic AI Outperforms LLM Fabrications',
    summary:
      'SafeHER strictly constrains legal narrative generation to user-verified facts, preventing evidentiary contradictions during police investigation.',
    link: 'https://cybercrime.gov.in',
    linkLabel: 'READ BRIEFING',
  },
]

export const StackedCardCarousel: React.FC = () => {
  const [activeIndex, setActiveIndex] = useState(0)

  const handleNext = () => {
    setActiveIndex((prev) => (prev + 1) % CARDS.length)
  }

  const handlePrev = () => {
    setActiveIndex((prev) => (prev - 1 + CARDS.length) % CARDS.length)
  }

  return (
    <section id="resources" className="py-24 sm:py-32 bg-black text-left">
      <div className="container max-w-[1360px] mx-auto px-4 sm:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          {/* Left Column: Heading & Counter */}
          <div className="lg:col-span-5 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-zcharcoal text-zcyan border border-zcyan/30 text-xs font-mono uppercase tracking-wider">
              <Newspaper className="w-3.5 h-3.5" />
              <span>OFFICIAL CHANNELS & INTELLIGENCE</span>
            </div>

            <h2 className="font-display text-4xl sm:text-6xl font-bold uppercase text-white tracking-tight">
              KNOWLEDGE. <span className="text-zcyan">GUIDANCE.</span> NEXT STEPS.
            </h2>

            <p className="text-base text-ztext-variant leading-relaxed font-sans">
              Featured across leading national publications for sovereign digital evidence preservation and real-time abuse response.
            </p>

            {/* Impact Metric Badge */}
            <div className="pt-4 border-t border-white/10">
              <div className="font-display text-5xl sm:text-6xl font-bold text-zcyan tracking-tight">
                120+
              </div>
              <div className="font-mono text-xs text-ztext-muted tracking-widest uppercase mt-1">
                MEDIA COVERAGES & OFFICIAL PRESS RELEASES
              </div>
            </div>

            {/* Interactive Carousel Nav Controls */}
            <div className="flex items-center gap-4 pt-4">
              <button
                onClick={handlePrev}
                aria-label="Previous article card"
                className="w-12 h-12 rounded-xl bg-zcharcoal border border-zcyan/30 text-zcyan hover:border-zcyan hover:bg-[#0B121E] hover:shadow-[0_0_15px_rgba(0,212,255,0.3)] flex items-center justify-center transition-all active:scale-95 cursor-pointer"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={handleNext}
                aria-label="Next article card"
                className="w-12 h-12 rounded-xl bg-zcharcoal border border-zcyan/30 text-zcyan hover:border-zcyan hover:bg-[#0B121E] hover:shadow-[0_0_15px_rgba(0,212,255,0.3)] flex items-center justify-center transition-all active:scale-95 cursor-pointer"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
              <span className="font-mono text-xs text-slate-400 pl-2">
                {String(activeIndex + 1).padStart(2, '0')} / {String(CARDS.length).padStart(2, '0')}
              </span>
            </div>
          </div>

          {/* Right Column: 3D Stacked Cards Composition */}
          <div
            className="lg:col-span-7 relative h-[420px] sm:h-[460px] flex items-center justify-center"
            style={{
              perspective: '1200px',
              transformStyle: 'preserve-3d',
            }}
          >
            {CARDS.map((card, i) => {
              // Calculate stack offset relative to active card
              const diff = (i - activeIndex + CARDS.length) % CARDS.length

              // Depth styling based on diff
              let transform = ''
              let opacity = 0
              let zIndex = 0
              let pointerEvents: 'auto' | 'none' = 'none'

              if (diff === 0) {
                // Active Card: Front & Center
                transform = 'translate3d(0, 0, 0) rotateY(0deg) scale(1)'
                opacity = 1
                zIndex = 30
                pointerEvents = 'auto'
              } else if (diff === 1) {
                // Card 2: Shifted right and back
                transform = 'translate3d(36px, 12px, -60px) rotateY(-4deg) scale(0.96)'
                opacity = 0.7
                zIndex = 20
              } else if (diff === 2) {
                // Card 3: Further back
                transform = 'translate3d(72px, 24px, -120px) rotateY(-8deg) scale(0.92)'
                opacity = 0.4
                zIndex = 10
              } else {
                // Hidden in background
                transform = 'translate3d(100px, 36px, -180px) rotateY(-12deg) scale(0.88)'
                opacity = 0
                zIndex = 0
              }

              return (
                <div
                  key={card.id}
                  style={{
                    transform,
                    opacity,
                    zIndex,
                    pointerEvents,
                    transition: 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
                  }}
                  className="absolute w-full max-w-[560px] rounded-2xl bg-[#080C14] border border-zcyan/40 p-7 sm:p-9 shadow-[0_24px_60px_rgba(0,0,0,0.9),0_0_40px_rgba(0,212,255,0.15)] flex flex-col justify-between hover:border-zcyan hover:shadow-[0_24px_70px_rgba(0,0,0,0.95),0_0_50px_rgba(0,212,255,0.25)]"
                >
                  <div>
                    {/* Header: Source and Badge */}
                    <div className="flex items-center justify-between gap-4 mb-4">
                      <span className="font-mono text-xs font-bold text-zcyan uppercase tracking-widest">
                        {card.source}
                      </span>
                      <span className="font-mono text-[10px] text-slate-400 bg-white/5 border border-white/10 px-2 py-0.5 rounded">
                        {card.badge}
                      </span>
                    </div>

                    {/* Headline */}
                    <h3 className="font-display text-2xl sm:text-3xl font-bold uppercase text-white leading-tight mb-4">
                      {card.title}
                    </h3>

                    {/* Summary */}
                    <p className="text-sm text-ztext-variant leading-relaxed font-sans">
                      {card.summary}
                    </p>
                  </div>

                  {/* Footer Link */}
                  <div className="pt-6 mt-6 border-t border-white/10 flex items-center justify-between">
                    <a
                      href={card.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-xs font-mono font-bold text-zcyan hover:underline uppercase tracking-wider group"
                    >
                      <span>{card.linkLabel}</span>
                      <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </a>

                    <div className="flex items-center gap-1.5 text-slate-500 font-mono text-[11px]">
                      <ShieldCheck className="w-3.5 h-3.5 text-zcyan" />
                      <span>VERIFIED SOURCE</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
