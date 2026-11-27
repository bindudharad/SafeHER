import React, { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { gsap, ScrollTrigger } from '../../animations/gsap'
import { Shield, Fingerprint, Cpu, FileCheck } from 'lucide-react'
import { useReducedMotion } from '../../hooks/useReducedMotion'

export const ConnectedSvgCurve: React.FC = () => {
  const sectionRef = useRef<HTMLDivElement>(null)
  const pathRef = useRef<SVGPathElement>(null)
  const node1Ref = useRef<SVGCircleElement>(null)
  const node2Ref = useRef<SVGCircleElement>(null)
  const node3Ref = useRef<SVGCircleElement>(null)
  const reducedMotion = useReducedMotion()

  useEffect(() => {
    if (reducedMotion || !sectionRef.current || !pathRef.current) return

    const path = pathRef.current
    const length = path.getTotalLength()

    // Initialize path stroke hidden
    gsap.set(path, {
      strokeDasharray: length,
      strokeDashoffset: length,
    })

    const ctx = gsap.context(() => {
      // Progressively draw line as user scrolls through the Response Center
      gsap.to(path, {
        strokeDashoffset: 0,
        ease: 'none',
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top 70%',
          end: 'bottom 80%',
          scrub: 0.8,
        },
      })

      // Pop nodes sequentially
      const nodes = [node1Ref.current, node2Ref.current, node3Ref.current].filter(Boolean)
      nodes.forEach((node, i) => {
        gsap.fromTo(
          node,
          { scale: 0, opacity: 0 },
          {
            scale: 1,
            opacity: 1,
            duration: 0.5,
            ease: 'back.out(1.7)',
            scrollTrigger: {
              trigger: sectionRef.current,
              start: `top+=${i * 25}% 65%`,
              toggleActions: 'play none none reverse',
            },
          }
        )
      })
    }, sectionRef)

    return () => ctx.revert()
  }, [reducedMotion])

  return (
    <section
      ref={sectionRef}
      id="response-center"
      className="relative py-24 sm:py-32 bg-black overflow-hidden"
    >
      <div className="container max-w-[1360px] mx-auto px-4 sm:px-8">
        {/* Section Header */}
        <div className="text-left mb-16 sm:mb-24">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-zcharcoal text-zcyan border border-zcyan/30 text-xs font-mono uppercase tracking-wider mb-4">
            <Shield className="w-3.5 h-3.5" />
            <span>002 / REAL-TIME ARCHITECTURE</span>
          </div>

          <span className="font-script text-zcyan text-2xl sm:text-3xl block mb-2">
            always-on defense
          </span>

          <h2 className="font-display text-4xl sm:text-6xl lg:text-7xl font-bold uppercase text-white tracking-tight">
            THE SAFEHER <span className="text-zcyan">RESPONSE CENTER</span>
          </h2>

          <p className="mt-4 text-base sm:text-lg text-ztext-variant max-w-2xl leading-relaxed">
            Monitor, preserve, and prepare digital abuse responses across evidence intake, neural verification, and official cybercrime dispatch.
          </p>
        </div>

        {/* Workflow Grid with Overlaid S-Curve SVG */}
        <div className="relative">
          {/* Background Connecting Curved SVG Path (Desktop & Tablet) */}
          <svg
            className="hidden md:block absolute inset-0 w-full h-full pointer-events-none z-0"
            viewBox="0 0 1000 800"
            fill="none"
            preserveAspectRatio="none"
          >
            <path
              ref={pathRef}
              d="M 280 120 C 650 120, 850 250, 720 400 C 600 550, 250 560, 280 690"
              stroke="#d5ff54"
              strokeWidth="2.5"
              strokeLinecap="round"
              className="filter drop-shadow-[0_0_10px_rgba(139,124,255,0.7)]"
            />

            {/* Glowing Step Nodes */}
            <circle
              ref={node1Ref}
              cx="280"
              cy="120"
              r="7"
              fill="#d5ff54"
              className="filter drop-shadow-[0_0_12px_#d5ff54]"
            />
            <circle
              ref={node2Ref}
              cx="720"
              cy="400"
              r="7"
              fill="#d5ff54"
              className="filter drop-shadow-[0_0_12px_#d5ff54]"
            />
            <circle
              ref={node3Ref}
              cx="280"
              cy="690"
              r="7"
              fill="#d5ff54"
              className="filter drop-shadow-[0_0_12px_#d5ff54]"
            />
          </svg>

          {/* 3 Step Cards Positioned Along the Curve */}
          <div className="relative z-10 space-y-16 sm:space-y-24">
            {/* Step 01: Intake & Secure Hash */}
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6 md:gap-10">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-zcharcoal border-2 border-zcyan/50 flex items-center justify-center text-zcyan font-display text-3xl sm:text-4xl font-bold shadow-[0_0_25px_rgba(139,124,255,0.3)] shrink-0">
                01
              </div>
              <div className="card-safeher p-6 sm:p-8 max-w-xl w-full text-left group hover:border-zcyan transition-all">
                <div className="flex items-center gap-2 font-mono text-xs text-zcyan uppercase tracking-wider mb-2">
                  <Fingerprint className="w-4 h-4" />
                  <span>always-on defense</span>
                </div>
                <h3 className="font-display text-2xl sm:text-3xl font-bold text-white uppercase group-hover:text-zcyan transition-colors mb-3">
                  01 Intake & Secure Hash
                </h3>
                <p className="text-sm text-ztext-variant leading-relaxed mb-4">
                  Client-side Web Crypto calculates deterministic SHA-256 fingerprints directly inside your browser before bytes touch the server. Complete zero-knowledge evidence preservation.
                </p>
                <Link
                  to="/evidence"
                  className="inline-flex items-center gap-1.5 text-xs font-mono text-zcyan hover:underline uppercase tracking-wider font-bold"
                >
                  <span>Open Evidence Vault</span>
                  <span>→</span>
                </Link>
              </div>
            </div>

            {/* Step 02: Forensic & Threat Scanners (Offset to Right) */}
            <div className="flex flex-col md:flex-row-reverse items-start md:items-center gap-6 md:gap-10">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-zcharcoal border-2 border-zcyan/50 flex items-center justify-center text-zcyan font-display text-3xl sm:text-4xl font-bold shadow-[0_0_25px_rgba(0,212,255,0.3)] shrink-0">
                02
              </div>
              <div className="card-safeher p-6 sm:p-8 max-w-xl w-full text-left group hover:border-zcyan transition-all">
                <div className="flex items-center gap-2 font-mono text-xs text-zcyan uppercase tracking-wider mb-2">
                  <Cpu className="w-4 h-4" />
                  <span>real-time insights</span>
                </div>
                <h3 className="font-display text-2xl sm:text-3xl font-bold text-white uppercase group-hover:text-zcyan transition-colors mb-3">
                  02 Evidence Organization & Forensic Scanners
                </h3>
                <p className="text-sm text-ztext-variant leading-relaxed mb-4">
                  ViT-based visual artifact detection unmasks deepfake face swaps, while text threat analysis classifies coercion, extortion, and cyber harassment with explicit calibration notices.
                </p>
                <Link
                  to="/analysis/media"
                  className="inline-flex items-center gap-1.5 text-xs font-mono text-zcyan hover:underline uppercase tracking-wider font-bold"
                >
                  <span>Launch Deepfake Scanner</span>
                  <span>→</span>
                </Link>
              </div>
            </div>

            {/* Step 03: Formatted Dossier & Legal Dispatch */}
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6 md:gap-10">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-zcharcoal border-2 border-zcyan/50 flex items-center justify-center text-zcyan font-display text-3xl sm:text-4xl font-bold shadow-[0_0_25px_rgba(0,212,255,0.3)] shrink-0">
                03
              </div>
              <div className="card-safeher p-6 sm:p-8 max-w-xl w-full text-left group hover:border-zcyan transition-all">
                <div className="flex items-center gap-2 font-mono text-xs text-zcyan uppercase tracking-wider mb-2">
                  <FileCheck className="w-4 h-4" />
                  <span>stay ahead</span>
                </div>
                <h3 className="font-display text-2xl sm:text-3xl font-bold text-white uppercase group-hover:text-zcyan transition-colors mb-3">
                  03 Formatted Dossier & Legal Dispatch
                </h3>
                <p className="text-sm text-ztext-variant leading-relaxed mb-4">
                  Zero-hallucination complaint generator formats fact-constrained Section 65B statements and provides direct filing pathways to the National Cyber Crime Reporting Portal (1930).
                </p>
                <Link
                  to="/complaints"
                  className="inline-flex items-center gap-1.5 text-xs font-mono text-zcyan hover:underline uppercase tracking-wider font-bold"
                >
                  <span>Generate Complaint Dossier</span>
                  <span>→</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
