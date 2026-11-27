import React from 'react'
import { Link } from 'react-router-dom'
import { Download, FileText, ArrowRight, ShieldCheck } from 'lucide-react'

export const TechnicalPaperCard: React.FC = () => {
  return (
    <section id="technical-whitepaper" className="py-24 sm:py-32 bg-black text-left">
      <div className="container max-w-[1360px] mx-auto px-4 sm:px-8">
        <div className="card-safeher p-8 sm:p-12 lg:p-16 border-zcyan/40 bg-gradient-to-br from-[#070908] via-black to-[#070908] shadow-[0_24px_80px_rgba(0,0,0,0.95),0_0_60px_rgba(0,212,255,0.18)]">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
            {/* Left Column: 3D-Angled White Paper Booklet Mockup */}
            <div className="lg:col-span-5 flex justify-center">
              <div
                className="relative w-full max-w-[340px] aspect-[1/1.35] rounded-2xl bg-[#070908] border border-zcyan/40 p-8 shadow-[0_25px_60px_rgba(0,0,0,0.95),0_0_35px_rgba(0,212,255,0.2)] transition-all duration-500 hover:scale-105 hover:border-zcyan hover:shadow-[0_30px_70px_rgba(0,0,0,1),0_0_50px_rgba(0,212,255,0.35)] flex flex-col justify-between group overflow-hidden"
                style={{
                  transform: 'perspective(1000px) rotateY(-8deg) rotateX(4deg)',
                }}
              >
                {/* Background holographic security grid */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(0,212,255,0.12),transparent_70%)] pointer-events-none" />

                <div className="relative z-10">
                  <div className="flex items-center justify-between font-mono text-[11px] text-[#929b93] tracking-widest uppercase mb-12">
                    <span>WHITE PAPER</span>
                    <span className="text-zcyan">2026 ED.</span>
                  </div>

                  {/* Wireframe abstract lines simulating document structure */}
                  <div className="space-y-3 opacity-40 group-hover:opacity-75 transition-opacity">
                    <div className="h-1 bg-gradient-to-r from-zcyan to-transparent rounded w-3/4" />
                    <div className="h-1 bg-gradient-to-r from-zcyan/60 to-transparent rounded w-1/2" />
                    <div className="h-1 bg-gradient-to-r from-zcyan/40 to-transparent rounded w-2/3" />
                  </div>
                </div>

                {/* Monogram Emblem */}
                <div className="relative z-10 border-t border-white/10 pt-6 flex items-end justify-between">
                  <div>
                    <div className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-zcyan group-hover:drop-shadow-[0_0_12px_#d5ff54] transition-all">
                      SH
                    </div>
                    <div className="font-mono text-[10px] text-[#929b93] uppercase tracking-widest">
                      SAFEHER DEFENSE
                    </div>
                  </div>

                  <div className="text-[10px] font-mono text-zcyan/80 bg-zcyan/10 border border-zcyan/30 px-2 py-1 rounded">
                    VERIFIED
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Technical Architecture Details */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-zcharcoal text-zcyan border border-zcyan/30 text-xs font-mono uppercase tracking-wider">
                <FileText className="w-3.5 h-3.5" />
                <span>TECHNICAL RESEARCH SPECIFICATION</span>
              </div>

              <h2 className="font-display text-4xl sm:text-6xl font-bold uppercase text-white leading-tight">
                INSIDE THE <span className="text-zcyan">SAFEHER PLATFORM</span>
              </h2>

              <div className="font-script text-zcyan text-2xl sm:text-3xl">
                A Connected Digital-Abuse Response Workflow
              </div>

              <p className="text-sm sm:text-base text-ztext-variant leading-relaxed font-sans">
                Our architectural specification details the cryptographic verification pipeline behind SafeHER — client-side SHA-256 Web Crypto hashing, vision-transformer deepfake anomaly detection, and deterministic fact-constrained Section 65B complaint generation.
              </p>

              {/* 4 Architecture Pillars */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs font-mono text-ztext-muted pt-2">
                <div className="p-3.5 bg-black/70 rounded-xl border border-zcyan/25">
                  <span className="text-white font-bold block mb-1">01 / VAULT PIPELINE</span>
                  <span>Deterministic browser hashing; zero localStorage leaks.</span>
                </div>
                <div className="p-3.5 bg-black/70 rounded-xl border border-zcyan/25">
                  <span className="text-white font-bold block mb-1">02 / AI CALIBRATION</span>
                  <span>Uncalibrated score disclaimer banner and explainable breakdowns.</span>
                </div>
                <div className="p-3.5 bg-black/70 rounded-xl border border-zcyan/25">
                  <span className="text-white font-bold block mb-1">03 / FACT CONSTRAINTS</span>
                  <span>Deterministic complaint builder quoting solely user-verified facts.</span>
                </div>
                <div className="p-3.5 bg-black/70 rounded-xl border border-zcyan/25">
                  <span className="text-white font-bold block mb-1">04 / RAPID SAFETY</span>
                  <span>Alt + Q Quick Exit with standard modal Escape preservation.</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-4 pt-4">
                <Link to="/incidents/new">
                  <button className="button-bracket flex items-center gap-2">
                    <span>[ LAUNCH LIVE APPLICATION ]</span>
                    <ArrowRight className="w-4 h-4 text-zcyan" />
                  </button>
                </Link>

                <Link to="/settings">
                  <button className="button-primary px-6 py-3.5 text-xs font-bold uppercase tracking-wider">
                    VIEW PRIVACY CONTROLS
                  </button>
                </Link>

                <span className="font-mono text-xs text-[#929b93] pl-2">
                  PDF • 16 PAGES • HACKATHON EDITION
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
