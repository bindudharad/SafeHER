import React from 'react'
import { Link } from 'react-router-dom'
import { Shield, Fingerprint, Cpu, FileCheck, Lock, Activity, Eye, FileText } from 'lucide-react'

interface StreamCard {
  id: string
  tag: string
  title: string
  desc: string
  metric: string
  icon: React.ElementType
  image: string
  route: string
}

const STREAM_CARDS_A: StreamCard[] = [
  {
    id: 'c1',
    tag: '01 / EVIDENCE VAULT',
    title: 'Incident Documentation',
    desc: 'Structured incident capture with chronological timestamp audits.',
    metric: '100% ZERO-KNOWLEDGE',
    icon: Fingerprint,
    image: '/assets/images/Digital_fingerprints_transition_..._2K_202608261423.jpeg',
    route: '/evidence',
  },
  {
    id: 'c2',
    tag: '02 / AI FORENSICS',
    title: 'Cryptographic Evidence Vault',
    desc: 'SHA-256 Web Crypto integrity verification before transport.',
    metric: '96.2% ZERO-DAY CALIBRATION',
    icon: Cpu,
    image: '/assets/images/Hand_holding_magnifying_glass_ov..._202608261424.jpeg',
    route: '/analysis/media',
  },
  {
    id: 'c3',
    tag: '03 / CUSTODY LOG',
    title: 'Timeline Reconstruction',
    desc: 'Chronological incident mapping with tamper-evident audit trails.',
    metric: 'SEC 65B READY',
    icon: Activity,
    image: '/assets/images/3.jpg',
    route: '/incidents',
  },
  {
    id: 'c4',
    tag: '04 / EXTORTION RADAR',
    title: 'Coercive Threat Detection',
    desc: 'Pattern recognition on blackmail, digital arrest, and harassment texts.',
    metric: 'REAL-TIME TELEMETRY',
    icon: Shield,
    image: '/assets/images/Photograph_peeling_revealing_glo..._2K_202608261510.jpeg',
    route: '/analysis/threat',
  },
]

const STREAM_CARDS_B: StreamCard[] = [
  {
    id: 'c5',
    tag: '05 / DOSSIER COMPOSER',
    title: 'Anti-Hallucination Engine',
    desc: 'Constraint-bound formal complaint structuring for official portals.',
    metric: 'ZERO FABRICATED FACTS',
    icon: FileText,
    image: '/assets/images/5.jpg',
    route: '/complaints',
  },
  {
    id: 'c6',
    tag: '06 / STOPNCII SYNDICATE',
    title: 'Non-Consensual Media Hash',
    desc: 'Preventing viral spread across major social platforms.',
    metric: 'PRIVACY PRESERVING',
    icon: Lock,
    image: '/assets/images/7.jpg',
    route: '/reporting',
  },
  {
    id: 'c7',
    tag: '07 / C2PA PROVENANCE',
    title: 'Metadata Integrity Check',
    desc: 'Cryptographic inspection of camera EXIF and provenance manifests.',
    metric: 'AUTHENTICITY TELEMETRY',
    icon: Eye,
    image: '/assets/images/Digital_fingerprints_transition_..._2K_202608261423.jpeg',
    route: '/analysis/media',
  },
  {
    id: 'c8',
    tag: '08 / RAPID SAFETY',
    title: 'Alt + Q Neutral Egress',
    desc: 'Instant tab clearance to neutral weather portals for personal safety.',
    metric: '&lt;50MS TRIGGER',
    icon: FileCheck,
    image: '/assets/images/Hand_holding_magnifying_glass_ov..._202608261424.jpeg',
    route: '/settings',
  },
]

export const ThreeDImageConveyor: React.FC = () => {
  return (
    <section className="relative py-24 bg-black overflow-hidden select-none">
      {/* Background Lighting Gradients */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-zcyan/5 rounded-full blur-[140px] pointer-events-none" />

      {/* Edge Gradient Vignettes (Creates 3D infinite illusion) */}
      <div className="absolute inset-y-0 left-0 w-32 sm:w-64 bg-gradient-to-r from-black via-black/80 to-transparent z-20 pointer-events-none" />
      <div className="absolute inset-y-0 right-0 w-32 sm:w-64 bg-gradient-to-l from-black via-black/80 to-transparent z-20 pointer-events-none" />

      {/* Section Header */}
      <div className="container max-w-[1400px] mx-auto text-center px-4 mb-16 relative z-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-zcharcoal text-zcyan border border-zcyan/30 text-xs font-mono uppercase tracking-wider mb-4">
          <span>002 / CONTINUOUS EVIDENCE INTELLIGENCE</span>
        </div>
        <h2 className="font-display text-4xl sm:text-6xl lg:text-7xl font-bold uppercase text-white tracking-tight">
          PROVEN <span className="font-script text-zcyan normal-case text-5xl sm:text-7xl lg:text-8xl px-2">At</span> REAL-WORLD SPEED
        </h2>
        <p className="mt-3 text-sm sm:text-base text-ztext-variant max-w-xl mx-auto font-sans">
          Continuous cryptographic capture, autonomous AI forensic inspection, and Section 65B court-admissible packaging.
        </p>

        {/* Live Metrics Row */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-8 sm:gap-14 font-mono text-xs sm:text-sm text-ztext-muted">
          <div>
            <span className="text-white font-bold text-lg sm:text-xl text-zcyan">100%</span> Client-Side Hash Verification
          </div>
          <span className="text-zcyan hidden sm:inline">•</span>
          <div>
            <span className="text-white font-bold text-lg sm:text-xl text-zcyan">96.2%</span> ViT Deepfake Anomaly Detection
          </div>
          <span className="text-zcyan hidden sm:inline">•</span>
          <div>
            <span className="text-white font-bold text-lg sm:text-xl text-zcyan">&lt;400ms</span> Real-Time Text Threat Parsing
          </div>
        </div>
      </div>

      {/* 3D Perspective Stage Container */}
      <div
        className="relative w-full space-y-6 sm:space-y-8"
        style={{
          perspective: '1400px',
          perspectiveOrigin: '50% 50%',
        }}
      >
        {/* Stream 1: Moving Right-to-Left */}
        <div className="flex w-max animate-[conveyorLeft_32s_linear_infinite] hover:[animation-play-state:paused]">
          {[...STREAM_CARDS_A, ...STREAM_CARDS_A].map((card, idx) => {
            const Icon = card.icon
            return (
              <div
                key={`stream-a-${card.id}-${idx}`}
                className="w-[280px] sm:w-[320px] mx-3 sm:mx-4 shrink-0 transition-transform duration-300 hover:scale-105"
                style={{
                  transformStyle: 'preserve-3d',
                }}
              >
                <Link to={card.route} className="block group">
                  <div className="relative h-[360px] sm:h-[400px] rounded-2xl bg-[#060910] border border-zcyan/25 group-hover:border-zcyan overflow-hidden shadow-[0_20px_45px_rgba(0,0,0,0.85)] group-hover:shadow-[0_0_35px_rgba(0,212,255,0.3)] transition-all">
                    {/* Background Image with Dark Vignette */}
                    <img
                      src={card.image}
                      alt={card.title}
                      className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:opacity-60 group-hover:scale-110 filter contrast-125 transition-all duration-700"
                      onError={(e) => {
                        // Fallback to local asset if CloudFront isn't reached
                        e.currentTarget.src = '/assets/images/Digital_fingerprints_transition_..._2K_202608261423.jpeg'
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/75 to-transparent" />

                    {/* Card Body */}
                    <div className="absolute inset-0 p-6 flex flex-col justify-between z-10 text-left">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px] text-zcyan font-bold tracking-widest uppercase px-2 py-0.5 rounded bg-black/60 border border-zcyan/30">
                          {card.tag}
                        </span>
                        <div className="w-8 h-8 rounded-lg bg-black/80 border border-zcyan/40 flex items-center justify-center text-zcyan group-hover:border-zcyan group-hover:shadow-[0_0_12px_#8B7CFF] transition-all">
                          <Icon className="w-4 h-4" />
                        </div>
                      </div>

                      <div>
                        <div className="font-mono text-[11px] text-slate-400 uppercase tracking-wider mb-1">
                          {card.metric}
                        </div>
                        <h3 className="font-display text-2xl font-bold uppercase text-white group-hover:text-zcyan transition-colors mb-2 leading-tight">
                          {card.title}
                        </h3>
                        <p className="text-xs text-slate-300 font-sans leading-relaxed line-clamp-2">
                          {card.desc}
                        </p>

                        <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs font-mono text-zcyan">
                          <span>Inspect Feature</span>
                          <span className="group-hover:translate-x-1 transition-transform">→</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              </div>
            )
          })}
        </div>

        {/* Stream 2: Moving Left-to-Right (Opposing Direction) */}
        <div className="flex w-max animate-[conveyorRight_32s_linear_infinite] hover:[animation-play-state:paused]">
          {[...STREAM_CARDS_B, ...STREAM_CARDS_B].map((card, idx) => {
            const Icon = card.icon
            return (
              <div
                key={`stream-b-${card.id}-${idx}`}
                className="w-[280px] sm:w-[320px] mx-3 sm:mx-4 shrink-0 transition-transform duration-300 hover:scale-105"
                style={{
                  transformStyle: 'preserve-3d',
                }}
              >
                <Link to={card.route} className="block group">
                  <div className="relative h-[360px] sm:h-[400px] rounded-2xl bg-[#060910] border border-zcyan/25 group-hover:border-zcyan overflow-hidden shadow-[0_20px_45px_rgba(0,0,0,0.85)] group-hover:shadow-[0_0_35px_rgba(0,212,255,0.3)] transition-all">
                    {/* Background Image with Dark Vignette */}
                    <img
                      src={card.image}
                      alt={card.title}
                      className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:opacity-60 group-hover:scale-110 filter contrast-125 transition-all duration-700"
                      onError={(e) => {
                        e.currentTarget.src = '/assets/images/Hand_holding_magnifying_glass_ov..._202608261424.jpeg'
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/75 to-transparent" />

                    {/* Card Body */}
                    <div className="absolute inset-0 p-6 flex flex-col justify-between z-10 text-left">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px] text-zcyan font-bold tracking-widest uppercase px-2 py-0.5 rounded bg-black/60 border border-zcyan/30">
                          {card.tag}
                        </span>
                        <div className="w-8 h-8 rounded-lg bg-black/80 border border-zcyan/40 flex items-center justify-center text-zcyan group-hover:border-zcyan group-hover:shadow-[0_0_12px_#8B7CFF] transition-all">
                          <Icon className="w-4 h-4" />
                        </div>
                      </div>

                      <div>
                        <div className="font-mono text-[11px] text-slate-400 uppercase tracking-wider mb-1">
                          {card.metric}
                        </div>
                        <h3 className="font-display text-2xl font-bold uppercase text-white group-hover:text-zcyan transition-colors mb-2 leading-tight">
                          {card.title}
                        </h3>
                        <p className="text-xs text-slate-300 font-sans leading-relaxed line-clamp-2">
                          {card.desc}
                        </p>

                        <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs font-mono text-zcyan">
                          <span>Inspect Feature</span>
                          <span className="group-hover:translate-x-1 transition-transform">→</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
