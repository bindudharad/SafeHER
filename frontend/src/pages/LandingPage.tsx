import React, { useState, useEffect, useRef, lazy, Suspense } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Globe, Play } from 'lucide-react'
import { SafeHERLogo } from '../components/common/SafeHERLogo'
import { QuickExitButton } from '../components/layout/QuickExitButton'
import { useI18n } from '../contexts/I18nContext'
import { useSplash } from '../contexts/SplashContext'
import type { Language } from '../i18n/translations'
import { gsap, ScrollTrigger } from '../animations/gsap'
import { useLenis } from '../hooks/useLenis'
import { useReducedMotion } from '../hooks/useReducedMotion'

const SafeHERLogoLed3D = lazy(() =>
  import('../components/3d/SafeHERLogoLed3D').then((m) => ({
    default: m.SafeHERLogoLed3D,
  }))
)

const SpiralGalaxyHeroBackground = lazy(() =>
  import('../components/3d/SpiralGalaxyHeroBackground').then((m) => ({
    default: m.SpiralGalaxyHeroBackground,
  }))
)

const HolographicWhitePaperCard = lazy(() =>
  import('../components/3d/HolographicWhitePaperCard').then((m) => ({
    default: m.HolographicWhitePaperCard,
  }))
)

interface StreamImage {
  src: string
  alt: string
}

const STREAM_IMAGES: StreamImage[] = [
  {
    src: '/assets/images/Digital_fingerprints_transition_..._2K_202608261423.jpeg',
    alt: 'Digital fingerprints transition neural authenticity scan',
  },
  {
    src: '/assets/images/Hand_holding_magnifying_glass_ov..._202608261424.jpeg',
    alt: 'Forensic media inspection and verification',
  },
  {
    src: '/assets/images/3.jpg',
    alt: 'Synthetic portrait zero-day artifact scan',
  },
  {
    src: '/assets/images/Photograph_peeling_revealing_glo..._2K_202608261510.jpeg',
    alt: 'Deepfake layer peeling and generative anomaly scan',
  },
  {
    src: '/assets/images/5.jpg',
    alt: 'Generative AI face-swap tracking',
  },
  {
    src: '/assets/images/Verifying_human_presence_using_t..._202608261423.jpeg',
    alt: 'Verifying human presence and liveness proof',
  },
  {
    src: '/assets/images/7.jpg',
    alt: 'High-resolution forensic authenticity proof',
  },
  {
    src: '/assets/images/Wireframe_detecting_deepfake_on_..._202608261421.jpeg',
    alt: 'Wireframe detecting deepfake on multi-modal stream',
  },
  {
    src: '/assets/images/Digital_fingerprints_transition_..._2K_202608261423.jpeg',
    alt: 'Digital fingerprints transition neural authenticity scan',
  },
  {
    src: '/assets/images/Hand_holding_magnifying_glass_ov..._202608261424.jpeg',
    alt: 'Forensic media inspection and verification',
  },
]

interface MediaCardItem {
  id: string
  source: string
  logo: string
  title: string
  snippet: string
  link: string
}

const MEDIA_CARDS: MediaCardItem[] = [
  {
    id: 'm1',
    source: 'Hindustan Metro',
    logo: '/assets/images/Hindustan-Metro.png',
    title: 'SafeHER Launches Sovereign Digital Abuse Intelligence & Reality Trust Center',
    snippet:
      'Advancing India\'s sovereign AI and digital trust mission to detect, verify, and explain deepfakes and AI-generated abuse before harm scales.',
    link: '/incidents',
  },
  {
    id: 'm2',
    source: 'Entrepreneur Hunt',
    logo: '/assets/images/Entrepreneur-Hunt.png',
    title: 'Building Sovereign Multimodal AI: SafeHER Unveils Automated Digital Evidence Vault',
    snippet:
      'Harnessing client-side Web Crypto and sub-200ms neural inference to safeguard citizens and critical digital infrastructure.',
    link: '/evidence',
  },
  {
    id: 'm3',
    source: 'Dailyhunt',
    logo: '/assets/images/dailyhunt.svg',
    title: 'India\'s First Sovereign Digital Abuse & Evidence Response Platform Launched',
    snippet:
      'Providing actionable digital authenticity intelligence to safeguard citizens, media organizations, and institutions against synthetic manipulation.',
    link: '/complaints',
  },
  {
    id: 'm4',
    source: 'Influencive India',
    logo: '/assets/images/Influencive-India.png',
    title: 'Setting New Benchmark in Sovereign AI & Real-Time Deepfake Defense',
    snippet:
      'Building indigenous neural models capable of understanding linguistic, acoustic, and visual characteristics of generative threats.',
    link: '/analysis/media',
  },
  {
    id: 'm5',
    source: 'Hindustan Bytes',
    logo: '/assets/images/Hindustan-Bytes.png',
    title: 'National Digital Trust Initiative Unveils Sovereign Evidence Response Pipeline',
    snippet:
      'Addressing synthetic images, manipulated videos, voice clones, and AI identities with explainable authenticity telemetry.',
    link: '/analysis/threat',
  },
  {
    id: 'm6',
    source: 'The Daily Beat',
    logo: '/assets/images/The-Daily-Beat.png',
    title: 'Zero-Latency Forensics in India\'s Sovereign AI & Digital Trust Mission',
    snippet:
      'Introducing explainable deepfake intelligence empowering users and investigators to verify operational truth in real time.',
    link: '/evidence',
  },
  {
    id: 'm7',
    source: 'IGB Wire',
    logo: '/assets/images/IGB-Wire.png',
    title: 'Neutralizing Generative AI Impersonation Across High-Stakes Workflows',
    snippet:
      'Deploying multi-model neural ensembles to prevent biometric injection, coercion scams, and digital arrest fraud at scale.',
    link: '/reporting',
  },
]

export const LandingPage: React.FC = () => {
  const { language, setLanguage, t } = useI18n()
  const { headerLogoHidden, registerLogoTarget } = useSplash()
  const navigate = useNavigate()
  const reducedMotion = useReducedMotion()

  // State
  const [modalOpen, setModalOpen] = useState(false)
  const [navScrolled, setNavScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [videoMuted, setVideoMuted] = useState(true)
  const [meeraOpen, setMeeraOpen] = useState(false)
  const [activeMediaIndex, setActiveMediaIndex] = useState(0)
  const [clipSize, setClipSize] = useState(0)

  // Refs
  const heroRef = useRef<HTMLElement>(null)
  const whatWeDoRef = useRef<HTMLElement>(null)
  const whatWeDoPathRef = useRef<SVGPathElement>(null)
  const manifestoRef = useRef<HTMLElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  // Initialize smooth scroll
  useLenis(!reducedMotion)

  const handleDismissModal = () => {
    setModalOpen(false)
  }

  // Scroll listener for nav
  useEffect(() => {
    const handleScroll = () => {
      setNavScrolled(window.scrollY > 30)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // S-Curve scroll trigger
  useEffect(() => {
    if (reducedMotion || !whatWeDoRef.current || !whatWeDoPathRef.current) return

    const path = whatWeDoPathRef.current
    const length = path.getTotalLength()

    gsap.set(path, {
      strokeDasharray: length,
      strokeDashoffset: length,
    })

    const ctx = gsap.context(() => {
      gsap.to(path, {
        strokeDashoffset: 0,
        ease: 'none',
        scrollTrigger: {
          trigger: whatWeDoRef.current,
          start: 'top 75%',
          end: 'bottom 85%',
          scrub: 0.8,
        },
      })
    }, whatWeDoRef)

    return () => ctx.revert()
  }, [reducedMotion])

  // Pinned Manifesto Circular Reveal scroll trigger
  useEffect(() => {
    if (reducedMotion || !manifestoRef.current) return

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: manifestoRef.current,
        start: 'top top',
        end: '+=1400',
        pin: true,
        scrub: 0.5,
        onUpdate: (self) => {
          setClipSize(self.progress * 150)
        },
      })
    }, manifestoRef)

    return () => ctx.revert()
  }, [reducedMotion])

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false)
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' })
    }
  }

  const handleNextMedia = () => {
    setActiveMediaIndex((prev) => (prev + 1) % MEDIA_CARDS.length)
  }

  const handlePrevMedia = () => {
    setActiveMediaIndex((prev) => (prev - 1 + MEDIA_CARDS.length) % MEDIA_CARDS.length)
  }

  return (
    <div className="__variable_8e25d4 __variable_447f06 __variable_3383bc __variable_3c557b lenis bg-black text-white selection:bg-[#8B7CFF] selection:text-[#080B18] min-h-screen">
      {/* ======================================================== */}
      {/* 0. INTRODUCTORY MODAL (Exact waitlist-overlay & card)    */}
      {/* ======================================================== */}
      {modalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="waitlist-overlay waitlist-overlay--visible"
        >
          <div className="waitlist-card">
            <div className="waitlist-card__bg">
              <img
                style={{
                  display: 'block',
                  width: '778px',
                  height: '297px',
                  maxWidth: '100%',
                  objectFit: 'cover',
                }}
                alt="SafeHER Launch Preview"
                src="/assets/images/picture-1.jpg"
              />
            </div>
            <button
              className="waitlist-close"
              aria-label="Close"
              onClick={handleDismissModal}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
            <div className="waitlist-card__inner">
              <SafeHERLogo size="lg" animate className="mb-2" />
              <h2 className="waitlist-title">{t.landing.waitlistModal.title}</h2>
              <div className="waitlist-btn-wrap">
                <button
                  className="waitlist-launch"
                  onClick={() => {
                    handleDismissModal()
                    navigate('/dashboard')
                  }}
                >
                  <span>{t.landing.hero.getStarted}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 1. HEADER & NAVIGATION (Exact homepage-nav structure)    */}
      {/* ======================================================== */}
      <nav
        className={`homepage-nav ${navScrolled ? 'homepage-nav--scrolled' : ''}`}
        id="homepage-nav"
      >
        <div className="homepage-nav__inner">
          <Link
            className="homepage-nav__brand"
            style={{ textDecoration: 'none' }}
            to="/"
          >
            <div className="flex items-center gap-2.5">
              <div
                ref={registerLogoTarget}
                data-safeher-logo-target="landing"
                style={{ opacity: headerLogoHidden ? 0 : 1 }}
                className="transition-opacity duration-150"
              >
                <SafeHERLogo size="md" />
              </div>
              <div className="text-left">
                <span className="font-['thunderLC',sans-serif] text-2xl font-bold tracking-wider text-white leading-none block">
                  SAFEHER
                </span>
                <span className="homepage-nav__byline">
                  {t.navbar.subtitle}
                </span>
              </div>
            </div>
          </Link>

          <ul className="homepage-nav__links">
            <li>
              <Link className="homepage-nav__link" to="/">
                {t.sidebar.home.toUpperCase()}
              </Link>
            </li>
            <li>
              <Link className="homepage-nav__link" to="/reality-trust-center">
                {t.landing.nav.realityTrustCenter}
              </Link>
            </li>
            <li>
              <Link className="homepage-nav__link" to="/knowledge-hub">
                {t.landing.nav.knowledgeHub}
              </Link>
            </li>
            <li>
              <Link className="homepage-nav__link" to="/detect">
                {t.landing.nav.detectMediaVerifier}
              </Link>
            </li>
            <li>
              <Link className="homepage-nav__link" to="/dashboard">
                {t.landing.nav.dashboard}
              </Link>
            </li>
            <li>
              <Link className="homepage-nav__link" to="/evidence">
                {t.landing.nav.evidenceVault}
              </Link>
            </li>
            <li>
              <Link className="homepage-nav__link" to="/incidents/new">
                {t.landing.nav.reportIncident}
              </Link>
            </li>
          </ul>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Quick Exit Emergency button */}
            <QuickExitButton />

            {/* Language Selector */}
            <div className="relative">
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as Language)}
                className="bg-[#0D1224] text-[#8B7CFF] border border-[#8B7CFF]/35 rounded px-2.5 py-1 text-xs font-mono font-bold cursor-pointer appearance-none pr-6 shadow-[0_0_8px_rgba(139,124,255,0.15)]"
                aria-label={t.navbar.selectLanguage}
              >
                <option value="en">EN</option>
                <option value="kn">KN</option>
                <option value="hi">HI</option>
              </select>
              <Globe className="w-3 h-3 text-[#8B7CFF] pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2" />
            </div>

            {/* Exact btn-23 CTA with marquee hover */}
            <div className="homepage-nav__cta-wrap">
              <Link className="btn-23" to="/evidence">
                <span className="text">{t.landing.nav.openSafeHER}</span>
                <span aria-hidden="true" className="marquee">
                  {t.landing.nav.openSafeHER}
                </span>
              </Link>
            </div>

            <button
              className="homepage-nav__hamburger"
              aria-label={t.landing.nav.toggleMenu}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <span></span>
              <span></span>
              <span></span>
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Drawer */}
      <aside
        className={`homepage-nav__drawer ${mobileMenuOpen ? 'homepage-nav__drawer--open' : ''}`}
        style={{ display: mobileMenuOpen ? 'block' : 'none' }}
      >
        <ul className="homepage-nav__drawer-links">
          <li>
            <Link
              className="homepage-nav__drawer-link"
              to="/"
              onClick={() => setMobileMenuOpen(false)}
            >
              {t.sidebar.home.toUpperCase()}
            </Link>
          </li>
          <li>
            <Link
              className="homepage-nav__drawer-link"
              to="/reality-trust-center"
              onClick={() => setMobileMenuOpen(false)}
            >
              {t.landing.nav.realityTrustCenter}
            </Link>
          </li>
          <li>
            <Link
              className="homepage-nav__drawer-link"
              to="/knowledge-hub"
              onClick={() => setMobileMenuOpen(false)}
            >
              {t.landing.nav.knowledgeHub}
            </Link>
          </li>
          <li>
            <Link
              className="homepage-nav__drawer-link"
              to="/detect"
              onClick={() => setMobileMenuOpen(false)}
            >
              {t.landing.nav.detectMediaVerifier}
            </Link>
          </li>
          <li>
            <Link
              className="homepage-nav__drawer-link"
              to="/dashboard"
              onClick={() => setMobileMenuOpen(false)}
            >
              {t.landing.nav.dashboard}
            </Link>
          </li>
          <li>
            <Link
              className="homepage-nav__drawer-link"
              to="/evidence"
              onClick={() => setMobileMenuOpen(false)}
            >
              {t.landing.nav.evidenceVault}
            </Link>
          </li>
          <li>
            <Link
              className="homepage-nav__drawer-link"
              to="/incidents/new"
              onClick={() => setMobileMenuOpen(false)}
            >
              {t.landing.nav.reportIncident}
            </Link>
          </li>
        </ul>
        <div style={{ marginTop: '24px', width: '100%' }}>
          <Link
            className="btn-23"
            style={{ width: '100%', textAlign: 'center', justifyContent: 'center' }}
            to="/evidence"
          >
            <span className="text">{t.landing.nav.openSafeHER}</span>
            <span aria-hidden="true" className="marquee">
              {t.landing.nav.openSafeHER}
            </span>
          </Link>
        </div>
      </aside>

      <main>
        {/* ======================================================== */}
        {/* 2. CINEMATIC HERO (Exact homepage-hero structure)       */}
        {/* ======================================================== */}
        <section className="homepage-hero" id="homepage-hero" ref={heroRef}>
          <div className="homepage-hero__bg">
            <Suspense fallback={null}>
              <SpiralGalaxyHeroBackground />
            </Suspense>
            <div
              className="pointer-events-none absolute inset-0 w-full h-full z-0 opacity-40"
              style={{
                background:
                  'radial-gradient(ellipse 80% 55% at 50% 18%, rgba(139, 124, 255, 0.16) 0%, rgba(85, 214, 232, 0.06) 45%, rgba(8, 11, 24, 1) 80%)',
              }}
            />
            <div
              className="pointer-events-none absolute inset-0 w-full h-full z-0 opacity-20"
              style={{
                backgroundImage:
                  'linear-gradient(rgba(139, 124, 255, 0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(139, 124, 255, 0.12) 1px, transparent 1px)',
                backgroundSize: '64px 64px',
                maskImage: 'radial-gradient(ellipse 70% 60% at 50% 35%, black 20%, transparent 80%)',
                WebkitMaskImage: 'radial-gradient(ellipse 70% 60% at 50% 35%, black 20%, transparent 80%)',
              }}
            />
          </div>
          <div className="homepage-hero__overlay"></div>

          <div className="homepage-hero__content">
            <h1 className="homepage-hero__title">
              <span className="homepage-hero__title--thunder">
                <span className="homepage-hero__word">{t.landing.hero.word1}</span>
                <span className="homepage-hero__word">{t.landing.hero.word2}</span>
              </span>
              <span className="block text-xl sm:text-3xl md:text-4xl font-bold text-[#F4F5FF] tracking-tight mt-2 mb-1 leading-snug">
                {t.landing.hero.headline}
              </span>
              <span className="homepage-hero__title--carattere">
                {t.landing.hero.scriptLine}
              </span>
            </h1>

            <p className="homepage-hero__subtitle max-w-2xl mx-auto text-sm sm:text-base text-[#A6AEC8] leading-relaxed">
              {t.landing.hero.subtitle}
            </p>

            {/* Central Interactive 3D SafeHER Logo & Circular LED Visualization */}
            <div className="relative z-[2] my-3 w-full max-w-[300px] sm:max-w-[340px] h-[240px] sm:h-[270px] mx-auto">
              <Suspense fallback={null}>
                <SafeHERLogoLed3D />
              </Suspense>
            </div>

            <div className="homepage-hero__buttons relative z-[5] flex flex-wrap items-center justify-center gap-3 sm:gap-4 mt-2">
              <div className="homepage-btn-wrap">
                <Link to="/dashboard" className="px-6 py-3 rounded-full bg-[#8B7CFF] text-[#080B18] font-bold text-xs uppercase tracking-wider hover:bg-[#A99BFF] transition-colors shadow-[0_0_20px_rgba(139,124,255,0.4)] whitespace-nowrap">
                  <span>{t.landing.hero.getStarted}</span>
                </Link>
              </div>

              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-[#171D35]/90 border border-[#8B7CFF]/45 text-[#F4F5FF] font-semibold text-xs uppercase tracking-wider hover:border-[#8B7CFF] hover:bg-[#1D2540] transition-all backdrop-blur-md whitespace-nowrap"
              >
                <Play className="w-3.5 h-3.5 text-[#8B7CFF] fill-current" />
                <span>{t.landing.hero.watchIntro}</span>
              </button>

              <button
                type="button"
                onClick={() => scrollToSection('whatwedo')}
                className="px-5 py-3 rounded-full bg-[#1D2540]/80 border border-[#A6AEC8]/30 text-[#F4F5FF] font-semibold text-xs uppercase tracking-wider hover:border-[#8B7CFF]/60 hover:text-[#8B7CFF] transition-all backdrop-blur-md whitespace-nowrap"
              >
                {t.landing.hero.exploreSafeHER}
              </button>
            </div>
          </div>

          {!meeraOpen ? (
            <button
              type="button"
              onClick={() => setMeeraOpen(true)}
              className="fixed bottom-5 left-5 z-30 inline-flex items-center gap-2.5 px-3.5 py-2 rounded-full bg-[#171D35]/92 backdrop-blur-md border border-[#8B7CFF]/45 text-[#F4F5FF] text-xs font-mono shadow-[0_8px_24px_rgba(0,0,0,0.6),0_0_16px_rgba(139,124,255,0.22)] hover:border-[#8B7CFF] hover:scale-105 transition-all"
              aria-label={t.landing.hero.meeraOpenAria}
            >
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#55D6E8] opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#55D6E8]" />
              </span>
              <Play className="w-3.5 h-3.5 text-[#8B7CFF] fill-current" />
              <span className="font-semibold tracking-wide">{t.landing.hero.meeraLabel}</span>
            </button>
          ) : (
            <div className="homepage-hero__meera">
              <div className="meera-video-card">
                <video
                  ref={videoRef}
                  src="/assets/media/meera-hero.mp4"
                  loop
                  muted={videoMuted}
                  playsInline
                  autoPlay
                  className="meera-video-element"
                />
                <div className="meera-video-overlay">
                  <div className="meera-video-actions">
                    <button
                      type="button"
                      className="meera-sound-btn"
                      aria-label={videoMuted ? t.landing.hero.meeraUnmuteAria : t.landing.hero.meeraMuteAria}
                      onClick={() => setVideoMuted(!videoMuted)}
                    >
                      {videoMuted ? (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="13"
                          height="13"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="lucide lucide-volume-x"
                          aria-hidden="true"
                        >
                          <path d="M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z" />
                          <line x1="22" x2="16" y1="9" y2="15" />
                          <line x1="16" x2="22" y1="9" y2="15" />
                        </svg>
                      ) : (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="13"
                          height="13"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="lucide lucide-volume-2"
                          aria-hidden="true"
                        >
                          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                          <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                          <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                        </svg>
                      )}
                    </button>
                    <button
                      type="button"
                      className="meera-close-btn"
                      aria-label={t.landing.hero.meeraCloseAria}
                      onClick={() => setMeeraOpen(false)}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="13"
                        height="13"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="lucide lucide-x"
                        aria-hidden="true"
                      >
                        <path d="M18 6 6 18" />
                        <path d="m6 6 12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
              <p className="meera-video-caption">
                {t.landing.hero.meeraTranscript}
              </p>
            </div>
          )}
        </section>

        {/* ======================================================== */}
        {/* 3. PROVEN AT SCALE (Exact stream-section 3D conveyor)   */}
        {/* ======================================================== */}
        <section className="stream-section" id="media-stream">
          <div
            className="relative overflow-hidden stream-section__hero"
            style={{ containerType: 'inline-size' }}
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
              style={{ perspective: '32cqw', perspectiveOrigin: '50% 46%' }}
            >
              <div
                className="absolute inset-0"
                style={{ transformStyle: 'preserve-3d' }}
              >
                {/* Track A: 10 cards running ish-r-R2av5b */}
                {STREAM_IMAGES.map((img, i) => (
                  <div
                    key={`track-r-${i}`}
                    className="ish-c-R2av5b absolute overflow-hidden"
                    style={{
                      left: '50%',
                      top: '46%',
                      width: '16cqw',
                      height: '22cqw',
                      marginLeft: '-8cqw',
                      marginTop: '-11cqw',
                      borderRadius: '0.6cqw',
                      animation: 'ish-r-R2av5b 20s linear infinite',
                      animationDelay: `${-i * 2}s`,
                      backfaceVisibility: 'hidden',
                    }}
                  >
                    <img
                      src={img.src}
                      alt={img.alt}
                      decoding="async"
                      className="h-full w-full object-cover"
                      draggable={false}
                    />
                  </div>
                ))}

                {/* Track B: 10 cards running ish-l-R2av5b */}
                {STREAM_IMAGES.map((img, i) => (
                  <div
                    key={`track-l-${i}`}
                    className="ish-c-R2av5b absolute overflow-hidden"
                    style={{
                      left: '50%',
                      top: '46%',
                      width: '16cqw',
                      height: '22cqw',
                      marginLeft: '-8cqw',
                      marginTop: '-11cqw',
                      borderRadius: '0.6cqw',
                      animation: 'ish-l-R2av5b 20s linear infinite',
                      animationDelay: `${-i * 2}s`,
                      backfaceVisibility: 'hidden',
                    }}
                  >
                    <img
                      src={img.src}
                      alt={img.alt}
                      decoding="async"
                      className="h-full w-full object-cover"
                      draggable={false}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="stream-section__overlay">
              <div className="stream-section__vignette"></div>
              <div className="stream-section__inner">
                <div className="stream-section__header">
                  <h2 className="stream-section__title">
                    <span className="stream-section__title--thunder">{t.landing.provenScale.titleMain1}</span>
                    <span className="stream-section__title--script">{t.landing.provenScale.titleScript}</span>
                    <span className="stream-section__title--thunder">{t.landing.provenScale.titleMain2}</span>
                  </h2>
                </div>
                <div className="stream-section__spacer"></div>
                <div className="stream-section__footer">
                  <div className="stream-section__inspo-lines">
                    <p className="stream-section__inspo-line">
                      <span className="stream-section__inspo-val">{t.landing.provenScale.stat1Val}</span>{' '}
                      {t.landing.provenScale.stat1Desc}
                    </p>
                    <p className="stream-section__inspo-line">
                      <span className="stream-section__inspo-val">{t.landing.provenScale.stat2Val}</span>{' '}
                      {t.landing.provenScale.stat2Desc}
                    </p>
                    <p className="stream-section__inspo-line">
                      <span className="stream-section__inspo-val">{t.landing.provenScale.stat3Val}</span>{' '}
                      {t.landing.provenScale.stat3Desc}
                    </p>
                  </div>
                  <div className="stream-section__actions">
                    <div className="homepage-btn-wrap" id="stream-btn-test">
                      <Link to="/analysis/media">
                        <span>{t.landing.provenScale.testMediaCta}</span>
                      </Link>
                    </div>
                    <div
                      className="homepage-btn-wrap homepage-btn-wrap--secondary"
                      id="stream-btn-demo"
                    >
                      <Link to="/evidence">
                        <span>{t.landing.provenScale.openVaultCta}</span>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ======================================================== */}
        {/* 4. WHAT WE DO / S-CURVE (Exact whatwedo structure)       */}
        {/* ======================================================== */}
        <section className="whatwedo" id="whatwedo" ref={whatWeDoRef}>
          <span className="whatwedo__label">{t.landing.whatWeDo.label}</span>
          <div className="whatwedo__canvas">
            <svg
              className="whatwedo__svg"
              viewBox="0 0 1000 1000"
              preserveAspectRatio="none"
              fill="none"
            >
              <path
                ref={whatWeDoPathRef}
                className="whatwedo__path"
                d="M 300 130 C 300 300, 640 260, 640 440 C 640 620, 300 600, 300 800"
                stroke="#8B7CFF"
                strokeWidth="2.5"
              ></path>
            </svg>
            <div
              className="whatwedo__dot whatwedo__dot--1"
              style={{ opacity: 1 }}
            ></div>
            <div
              className="whatwedo__dot whatwedo__dot--2"
              style={{ opacity: 1 }}
            ></div>
            <div
              className="whatwedo__dot whatwedo__dot--3"
              style={{ opacity: 1 }}
            ></div>

            <div
              className="whatwedo__point whatwedo__point--1"
              style={{ opacity: 1 }}
            >
              <span className="whatwedo__annotation">{t.landing.whatWeDo.point1Annotation}</span>
              <span className="whatwedo__num">01</span>
              <h3 className="whatwedo__title">{t.landing.whatWeDo.point1Title}</h3>
              <p className="whatwedo__desc">
                {t.landing.whatWeDo.point1Desc}
              </p>
            </div>
            <div
              className="whatwedo__point whatwedo__point--2"
              style={{ opacity: 1 }}
            >
              <span className="whatwedo__annotation">{t.landing.whatWeDo.point2Annotation}</span>
              <span className="whatwedo__num">02</span>
              <h3 className="whatwedo__title">{t.landing.whatWeDo.point2Title}</h3>
              <p className="whatwedo__desc">
                {t.landing.whatWeDo.point2Desc}
              </p>
            </div>
            <div
              className="whatwedo__point whatwedo__point--3"
              style={{ opacity: 1 }}
            >
              <span className="whatwedo__annotation">{t.landing.whatWeDo.point3Annotation}</span>
              <span className="whatwedo__num">03</span>
              <h3 className="whatwedo__title">{t.landing.whatWeDo.point3Title}</h3>
              <p className="whatwedo__desc">
                {t.landing.whatWeDo.point3Desc}
              </p>
            </div>
          </div>
        </section>

        {/* ======================================================== */}
        {/* 5. CORE RISK COVERAGE (Exact corerisk 5-column grid)    */}
        {/* ======================================================== */}
        <section className="corerisk" id="corerisk">
          <div className="corerisk__header">
            <h2 className="corerisk__title">
              <span className="corerisk__num">003 /</span>
              <span className="corerisk__title--thunder">{t.landing.coreRisk.title}</span>
              <span className="corerisk__title--script">{t.landing.coreRisk.subtitle}</span>
            </h2>
          </div>
          <div className="corerisk__grid">
            {/* Card 1: Deepfake Threats */}
            <Link
              className="corerisk-card corerisk-card--visible"
              to="/analysis/media"
            >
              <div className="corerisk-card__image-wrap">
                <svg
                  className="corerisk-card__svg"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 400 400"
                  aria-hidden="true"
                >
                  <rect width="400" height="400" fill="#0D1224"></rect>
                  <g stroke="#fff" fill="none" strokeWidth="2">
                    <rect x="0" y="0" width="400" height="400" className="svg-line"></rect>
                    <line x1="0" y1="200" x2="400" y2="200" className="svg-line"></line>
                    <path
                      d="M 0 200 A 200 200 0 0 1 400 200"
                      className="svg-line svg-line--slow"
                    ></path>
                    <line x1="200" y1="200" x2="400" y2="0" className="svg-line"></line>
                    <line x1="240" y1="160" x2="400" y2="160" className="svg-line"></line>
                    <line x1="0" y1="40" x2="80" y2="40" className="svg-line"></line>
                    <line x1="0" y1="360" x2="80" y2="360" className="svg-line"></line>
                    <line x1="80" y1="360" x2="80" y2="40" className="svg-line"></line>
                    <line x1="0" y1="400" x2="40" y2="360" className="svg-line"></line>
                    <line x1="0" y1="0" x2="40" y2="40" className="svg-line"></line>
                    <line x1="400" y1="40" x2="320" y2="40" className="svg-line"></line>
                    <line x1="400" y1="360" x2="320" y2="360" className="svg-line"></line>
                    <line x1="320" y1="360" x2="320" y2="40" className="svg-line"></line>
                    <circle cx="0" cy="200" r="5" fill="#fff" className="svg-dot"></circle>
                    <circle cx="400" cy="200" r="5" fill="#fff" className="svg-dot"></circle>
                    <circle cx="200" cy="200" r="5" fill="#fff" className="svg-dot"></circle>
                    <circle cx="400" cy="0" r="5" fill="#fff" className="svg-dot"></circle>
                    <circle cx="80" cy="40" r="5" fill="#fff" className="svg-dot"></circle>
                    <circle cx="80" cy="360" r="5" fill="#fff" className="svg-dot"></circle>
                    <circle cx="320" cy="40" r="5" fill="#fff" className="svg-dot"></circle>
                    <circle cx="320" cy="360" r="5" fill="#fff" className="svg-dot"></circle>
                  </g>
                </svg>
                <div className="corerisk-card__overlay">
                  <span className="corerisk-card__overlay-label">EXPLORE</span>
                </div>
              </div>
              <div className="corerisk-card__text">
                <h3 className="corerisk-card__card-title">{t.landing.coreRisk.card1Title}</h3>
                <p className="corerisk-card__desc">
                  {t.landing.coreRisk.card1Desc}
                </p>
                <span className="corerisk-card__link">{t.common.viewDetails}</span>
              </div>
            </Link>

            {/* Card 2: Synthetic Identities */}
            <Link
              className="corerisk-card corerisk-card--visible"
              to="/analysis/threat"
            >
              <div className="corerisk-card__image-wrap">
                <svg
                  className="corerisk-card__svg"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 400 400"
                  aria-hidden="true"
                >
                  <rect width="400" height="400" fill="#0D1224"></rect>
                  <g stroke="#fff" fill="none" strokeWidth="2">
                    <rect x="0" y="0" width="400" height="400" className="svg-line"></rect>
                    <line x1="400" y1="400" x2="200" y2="200" className="svg-line"></line>
                    <line x1="200" y1="200" x2="0" y2="200" className="svg-line"></line>
                    <line x1="200" y1="200" x2="200" y2="0" className="svg-line"></line>
                    <path
                      d="M 200 0 A 200 200 0 0 0 0 200"
                      className="svg-line svg-line--slow"
                    ></path>
                    <line x1="80" y1="80" x2="0" y2="0" className="svg-line"></line>
                    <line x1="360" y1="360" x2="0" y2="360" className="svg-line"></line>
                    <line x1="320" y1="320" x2="0" y2="320" className="svg-line"></line>
                    <line x1="280" y1="280" x2="0" y2="280" className="svg-line"></line>
                    <line x1="80" y1="80" x2="0" y2="80" className="svg-line"></line>
                    <circle cx="200" cy="200" r="5" fill="#fff" className="svg-dot"></circle>
                    <circle cx="400" cy="400" r="5" fill="#fff" className="svg-dot"></circle>
                    <circle cx="200" cy="0" r="5" fill="#fff" className="svg-dot"></circle>
                    <circle cx="0" cy="200" r="5" fill="#fff" className="svg-dot"></circle>
                    <circle cx="0" cy="360" r="5" fill="#fff" className="svg-dot"></circle>
                    <circle cx="0" cy="320" r="5" fill="#fff" className="svg-dot"></circle>
                    <circle cx="0" cy="280" r="5" fill="#fff" className="svg-dot"></circle>
                  </g>
                </svg>
                <div className="corerisk-card__overlay">
                  <span className="corerisk-card__overlay-label">EXPLORE</span>
                </div>
              </div>
              <div className="corerisk-card__text">
                <h3 className="corerisk-card__card-title">{t.landing.coreRisk.card2Title}</h3>
                <p className="corerisk-card__desc">
                  {t.landing.coreRisk.card2Desc}
                </p>
                <span className="corerisk-card__link">{t.common.viewDetails}</span>
              </div>
            </Link>

            {/* Card 3: Fake KYC Fraud */}
            <Link
              className="corerisk-card corerisk-card--visible"
              to="/evidence"
            >
              <div className="corerisk-card__image-wrap">
                <svg
                  className="corerisk-card__svg"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 400 400"
                  aria-hidden="true"
                >
                  <rect width="400" height="400" fill="#0D1224"></rect>
                  <g stroke="#fff" fill="none" strokeWidth="2">
                    <rect x="0" y="0" width="400" height="400" className="svg-line"></rect>
                    <line x1="400" y1="200" x2="0" y2="200" className="svg-line"></line>
                    <path
                      d="M 400 200 A 200 200 0 0 0 0 200"
                      className="svg-line svg-line--slow"
                    ></path>
                    <line x1="200" y1="200" x2="0" y2="400" className="svg-line"></line>
                    <line x1="160" y1="240" x2="0" y2="240" className="svg-line"></line>
                    <line x1="80" y1="320" x2="0" y2="320" className="svg-line"></line>
                    <line x1="0" y1="0" x2="400" y2="400" className="svg-line"></line>
                    <line x1="300" y1="100" x2="400" y2="100" className="svg-line"></line>
                    <circle cx="400" cy="200" r="5" fill="#fff" className="svg-dot"></circle>
                    <circle cx="0" cy="200" r="5" fill="#fff" className="svg-dot"></circle>
                    <circle cx="200" cy="200" r="5" fill="#fff" className="svg-dot"></circle>
                    <circle cx="0" cy="400" r="5" fill="#fff" className="svg-dot"></circle>
                    <circle cx="0" cy="240" r="5" fill="#fff" className="svg-dot"></circle>
                    <circle cx="0" cy="320" r="5" fill="#fff" className="svg-dot"></circle>
                    <circle cx="400" cy="400" r="5" fill="#fff" className="svg-dot"></circle>
                  </g>
                </svg>
                <div className="corerisk-card__overlay">
                  <span className="corerisk-card__overlay-label">EXPLORE</span>
                </div>
              </div>
              <div className="corerisk-card__text">
                <h3 className="corerisk-card__card-title">{t.landing.coreRisk.card3Title}</h3>
                <p className="corerisk-card__desc">
                  {t.landing.coreRisk.card3Desc}
                </p>
                <span className="corerisk-card__link">{t.common.viewDetails}</span>
              </div>
            </Link>

            {/* Card 4: Voice Cloning */}
            <Link
              className="corerisk-card corerisk-card--visible"
              to="/analysis/media"
            >
              <div className="corerisk-card__image-wrap">
                <svg
                  className="corerisk-card__svg"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 400 400"
                  aria-hidden="true"
                >
                  <rect width="400" height="400" fill="#0D1224"></rect>
                  <g stroke="#fff" fill="none" strokeWidth="2">
                    <rect x="0" y="0" width="400" height="400" className="svg-line"></rect>
                    <line x1="200" y1="0" x2="200" y2="400" className="svg-line"></line>
                    <line x1="0" y1="200" x2="400" y2="200" className="svg-line"></line>
                    <circle cx="200" cy="200" r="120" className="svg-line svg-line--slow"></circle>
                    <line x1="0" y1="0" x2="120" y2="120" className="svg-line"></line>
                    <line x1="400" y1="400" x2="280" y2="280" className="svg-line"></line>
                    <line x1="0" y1="80" x2="80" y2="80" className="svg-line"></line>
                    <line x1="320" y1="400" x2="320" y2="320" className="svg-line"></line>
                    <line x1="400" y1="0" x2="360" y2="0" className="svg-line"></line>
                    <line x1="0" y1="400" x2="40" y2="400" className="svg-line"></line>
                    <circle cx="200" cy="0" r="5" fill="#fff" className="svg-dot"></circle>
                    <circle cx="200" cy="400" r="5" fill="#fff" className="svg-dot"></circle>
                    <circle cx="0" cy="200" r="5" fill="#fff" className="svg-dot"></circle>
                    <circle cx="400" cy="200" r="5" fill="#fff" className="svg-dot"></circle>
                    <circle cx="120" cy="120" r="5" fill="#fff" className="svg-dot"></circle>
                    <circle cx="280" cy="280" r="5" fill="#fff" className="svg-dot"></circle>
                    <circle cx="80" cy="80" r="5" fill="#fff" className="svg-dot"></circle>
                  </g>
                </svg>
                <div className="corerisk-card__overlay">
                  <span className="corerisk-card__overlay-label">EXPLORE</span>
                </div>
              </div>
              <div className="corerisk-card__text">
                <h3 className="corerisk-card__card-title">{t.landing.coreRisk.card4Title}</h3>
                <p className="corerisk-card__desc">
                  {t.landing.coreRisk.card4Desc}
                </p>
                <span className="corerisk-card__link">{t.common.viewDetails}</span>
              </div>
            </Link>

            {/* Card 5: Digital Arrest Scams */}
            <Link
              className="corerisk-card corerisk-card--visible"
              to="/analysis/threat"
            >
              <div className="corerisk-card__image-wrap">
                <svg
                  className="corerisk-card__svg"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 400 400"
                  aria-hidden="true"
                >
                  <rect width="400" height="400" fill="#0D1224"></rect>
                  <g stroke="#fff" fill="none" strokeWidth="2">
                    <rect x="0" y="0" width="400" height="400" className="svg-line"></rect>
                    <line x1="200" y1="40" x2="40" y2="360" className="svg-line"></line>
                    <line x1="200" y1="40" x2="360" y2="360" className="svg-line"></line>
                    <line x1="40" y1="360" x2="360" y2="360" className="svg-line"></line>
                    <line x1="200" y1="120" x2="120" y2="320" className="svg-line"></line>
                    <line x1="200" y1="120" x2="280" y2="320" className="svg-line"></line>
                    <line x1="120" y1="320" x2="280" y2="320" className="svg-line"></line>
                    <path
                      d="M 100 200 A 100 100 0 0 1 300 200"
                      className="svg-line svg-line--slow"
                    ></path>
                    <line x1="200" y1="200" x2="200" y2="280" className="svg-line"></line>
                    <circle cx="200" cy="40" r="5" fill="#fff" className="svg-dot"></circle>
                    <circle cx="40" cy="360" r="5" fill="#fff" className="svg-dot"></circle>
                    <circle cx="360" cy="360" r="5" fill="#fff" className="svg-dot"></circle>
                    <circle cx="200" cy="120" r="5" fill="#fff" className="svg-dot"></circle>
                    <circle cx="120" cy="320" r="5" fill="#fff" className="svg-dot"></circle>
                    <circle cx="280" cy="320" r="5" fill="#fff" className="svg-dot"></circle>
                    <circle cx="200" cy="200" r="5" fill="#fff" className="svg-dot"></circle>
                  </g>
                </svg>
                <div className="corerisk-card__overlay">
                  <span className="corerisk-card__overlay-label">EXPLORE</span>
                </div>
              </div>
              <div className="corerisk-card__text">
                <h3 className="corerisk-card__card-title">{t.landing.coreRisk.card5Title}</h3>
                <p className="corerisk-card__desc">
                  {t.landing.coreRisk.card5Desc}
                </p>
                <span className="corerisk-card__link">{t.common.viewDetails}</span>
              </div>
            </Link>
          </div>
        </section>

        {/* ======================================================== */}
        {/* 6. RECOGNIZED BY (Exact recognized-section structure)    */}
        {/* ======================================================== */}
        <section className="recognized-section" id="recognized-by">
          <div className="recognized-section__inner">
            <div className="recognized-section__left">
              <span className="recognized-section__badge">{t.landing.recognized.badge}</span>
              <h3 className="recognized-section__title">{t.landing.recognized.title}</h3>
              <p className="recognized-section__desc">
                {t.landing.recognized.desc}
              </p>
            </div>
            <div className="recognized-section__logos">
              <div
                className="recognized-logo-card recognized-logo-card--aws"
                title="Amazon Web Services"
              >
                <img
                  alt="Amazon Web Services Partner Logo"
                  width="160"
                  height="60"
                  decoding="async"
                  className="recognized-logo-img recognized-logo-img--aws"
                  style={{ color: 'transparent' }}
                  src="/assets/images/aws.png"
                />
              </div>
              <div
                className="recognized-logo-card recognized-logo-card--nvidia"
                title="NVIDIA Inception"
              >
                <img
                  alt="NVIDIA Inception Program Member Logo"
                  width="160"
                  height="60"
                  decoding="async"
                  className="recognized-logo-img recognized-logo-img--nvidia"
                  style={{ color: 'transparent' }}
                  src="/assets/images/nvidia-inception.png"
                />
              </div>
              <div
                className="recognized-logo-card recognized-logo-card--dpiit"
                title="DPIIT #startupindia"
              >
                <img
                  alt="Department for Promotion of Industry and Internal Trade Logo"
                  width="160"
                  height="60"
                  decoding="async"
                  className="recognized-logo-img recognized-logo-img--dpiit"
                  style={{ color: 'transparent' }}
                  src="/assets/images/dpiit.jpg"
                />
              </div>
              <div
                className="recognized-logo-card recognized-logo-card--dpdp-act"
                title="DPDP Act 2023"
              >
                <img
                  alt="India DPDP Act 2023 Compliance Logo"
                  width="160"
                  height="60"
                  decoding="async"
                  className="recognized-logo-img recognized-logo-img--dpdp-act"
                  style={{ color: 'transparent' }}
                  src="/assets/images/dpdp-act.png"
                />
              </div>
              <div
                className="recognized-logo-card recognized-logo-card--msme"
                title="Ministry of MSME"
              >
                <img
                  alt="Ministry of Micro, Small and Medium Enterprises Logo"
                  width="160"
                  height="60"
                  decoding="async"
                  className="recognized-logo-img recognized-logo-img--msme"
                  style={{ color: 'transparent' }}
                  src="/assets/images/msme.png"
                />
              </div>
            </div>
          </div>
        </section>

        {/* ======================================================== */}
        {/* 7. PRESS & MEDIA COVERAGE (Exact card-swap 3D stack)     */}
        {/* ======================================================== */}
        <section className="media-coverage-section" id="media-coverage">
          <div className="media-coverage__ambient-glow"></div>
          <div className="media-coverage__inner">
            <div className="media-coverage__left">
              <h2 className="media-coverage__title">
                <span className="media-coverage__title-thunder">{t.landing.mediaCoverage.title1}</span>
                <span className="media-coverage__title-script">&amp;</span>
                <span className="media-coverage__title-thunder">
                  {t.landing.mediaCoverage.title2}
                </span>
              </h2>
              <p className="media-coverage__desc">
                {t.landing.mediaCoverage.desc}
              </p>
              <div className="media-coverage__hero-stat">
                <span className="media-coverage__hero-stat-num">120+</span>
                <span className="media-coverage__hero-stat-label">
                  {t.landing.mediaCoverage.statLabel}
                </span>
              </div>
            </div>

            <div className="media-coverage__right">
              <div
                className="media-coverage__cards-container"
                style={{ width: '530px', height: '355px' }}
              >
                <div
                  className="card-swap-wrapper"
                  style={{ width: '530px', height: '355px' }}
                >
                  {MEDIA_CARDS.map((card, idx) => {
                    const offset =
                      (idx - activeMediaIndex + MEDIA_CARDS.length) %
                      MEDIA_CARDS.length
                    const zIndex = MEDIA_CARDS.length - offset
                    const x = offset * 42
                    const y = -offset * 36
                    const z = -offset * 63

                    return (
                      <div
                        key={card.id}
                        title={`Read coverage on ${card.source}`}
                        style={{
                          width: '530px',
                          height: '355px',
                          zIndex: zIndex,
                          transformOrigin: '50% 50%',
                          transform: `translate(-50%, -50%) translate3d(${x}px, ${y}px, ${z}px) skew(0deg, 3.5deg)`,
                          transition: 'transform 0.4s ease, opacity 0.4s ease',
                          opacity: offset > 4 ? 0 : 1,
                          pointerEvents: offset === 0 ? 'auto' : 'none',
                        }}
                        className="card-swap__card"
                      >
                        <div className="media-card__top">
                          <div className="media-card__logo-wrap">
                            <img
                              alt={`${card.source} logo`}
                              width="140"
                              height="34"
                              decoding="async"
                              className="media-card__logo"
                              style={{
                                color: 'transparent',
                                width: 'auto',
                                height: 'auto',
                              }}
                              src={card.logo}
                            />
                          </div>
                        </div>
                        <h3 className="media-card__title">{card.title}</h3>
                        <p className="media-card__snippet">{card.snippet}</p>
                        <div className="media-card__bottom">
                          <span className="media-card__source">{card.source}</span>
                          <Link to={card.link} className="media-card__action">
                            READ ARTICLE{' '}
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="lucide lucide-arrow-up-right"
                              aria-hidden="true"
                            >
                              <path d="M7 7h10v10"></path>
                              <path d="M7 17 17 7"></path>
                            </svg>
                          </Link>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="media-coverage__arrows">
                <button
                  type="button"
                  className="media-coverage__arrow-btn"
                  aria-label="Previous coverage card"
                  onClick={handlePrevMedia}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="lucide lucide-chevron-left"
                    aria-hidden="true"
                  >
                    <path d="m15 18-6-6 6-6"></path>
                  </svg>
                </button>
                <button
                  type="button"
                  className="media-coverage__arrow-btn"
                  aria-label="Next coverage card"
                  onClick={handleNextMedia}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="lucide lucide-chevron-right"
                    aria-hidden="true"
                  >
                    <path d="m9 18 6-6-6-6"></path>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ======================================================== */}
        {/* 8. PINNED MANIFESTO (Exact 4-line typography & marquees) */}
        {/* ======================================================== */}
        <div className="pin-spacer" style={{ width: '100%', minHeight: '900px' }}>
          <section
            className="manifesto-section"
            id="manifesto"
            ref={manifestoRef}
          >
            {/* Top Marquees */}
            <div className="marquee-track">
              <div className="marquee-row marquee-left marquee-base-text">
                <span>
                  Enterprise defense for synthetic fraud at real-world speed. ★
                  Enterprise defense for synthetic fraud at real-world speed. ★
                  Enterprise defense for synthetic fraud at real-world speed. ★
                  Enterprise defense for synthetic fraud at real-world speed.
                </span>
                <span>
                  Enterprise defense for synthetic fraud at real-world speed. ★
                  Enterprise defense for synthetic fraud at real-world speed. ★
                  Enterprise defense for synthetic fraud at real-world speed. ★
                  Enterprise defense for synthetic fraud at real-world speed.
                </span>
              </div>
            </div>
            <div className="marquee-track">
              <div className="marquee-row marquee-right marquee-base-text">
                <span>
                  Enterprise defense for synthetic fraud at real-world speed. ★
                  Enterprise defense for synthetic fraud at real-world speed. ★
                  Enterprise defense for synthetic fraud at real-world speed. ★
                  Enterprise defense for synthetic fraud at real-world speed.
                </span>
                <span>
                  Enterprise defense for synthetic fraud at real-world speed. ★
                  Enterprise defense for synthetic fraud at real-world speed. ★
                  Enterprise defense for synthetic fraud at real-world speed. ★
                  Enterprise defense for synthetic fraud at real-world speed.
                </span>
              </div>
            </div>

            {/* Base 4-Line Typography */}
            <div className="manifesto-text-block">
              <h1 className="manifesto-text base-line">{t.landing.manifesto.line1}</h1>
              <h1 className="manifesto-text base-line indented-1">{t.landing.manifesto.line2}</h1>
              <h1 className="manifesto-text base-line indented-2">{t.landing.manifesto.line3}</h1>
              <h1 className="manifesto-text base-line indented-3">
                {t.landing.manifesto.line4}
              </h1>
            </div>

            {/* Bottom Marquees */}
            <div className="marquee-track">
              <div className="marquee-row marquee-right marquee-base-text">
                <span>
                  Enterprise defense for synthetic fraud at real-world speed. ★
                  Enterprise defense for synthetic fraud at real-world speed. ★
                  Enterprise defense for synthetic fraud at real-world speed. ★
                  Enterprise defense for synthetic fraud at real-world speed.
                </span>
                <span>
                  Enterprise defense for synthetic fraud at real-world speed. ★
                  Enterprise defense for synthetic fraud at real-world speed. ★
                  Enterprise defense for synthetic fraud at real-world speed. ★
                  Enterprise defense for synthetic fraud at real-world speed.
                </span>
              </div>
            </div>
            <div className="marquee-track">
              <div className="marquee-row marquee-left marquee-base-text">
                <span>
                  Enterprise defense for synthetic fraud at real-world speed. ★
                  Enterprise defense for synthetic fraud at real-world speed. ★
                  Enterprise defense for synthetic fraud at real-world speed. ★
                  Enterprise defense for synthetic fraud at real-world speed.
                </span>
                <span>
                  Enterprise defense for synthetic fraud at real-world speed. ★
                  Enterprise defense for synthetic fraud at real-world speed. ★
                  Enterprise defense for synthetic fraud at real-world speed. ★
                  Enterprise defense for synthetic fraud at real-world speed.
                </span>
              </div>
            </div>

            {/* Cyan Circular Overlay Mask */}
            <div
              className="manifesto-overlay"
              style={{ '--clip-size': `${clipSize}%` } as React.CSSProperties}
            >
              <div className="marquee-track">
                <div className="marquee-row marquee-left marquee-overlay-text">
                  <span>
                    Enterprise defense for synthetic fraud at real-world speed. ★
                    Enterprise defense for synthetic fraud at real-world speed. ★
                    Enterprise defense for synthetic fraud at real-world speed. ★
                    Enterprise defense for synthetic fraud at real-world speed.
                  </span>
                  <span>
                    Enterprise defense for synthetic fraud at real-world speed. ★
                    Enterprise defense for synthetic fraud at real-world speed. ★
                    Enterprise defense for synthetic fraud at real-world speed. ★
                    Enterprise defense for synthetic fraud at real-world speed.
                  </span>
                </div>
              </div>
              <div className="marquee-track">
                <div className="marquee-row marquee-right marquee-overlay-text">
                  <span>
                    Enterprise defense for synthetic fraud at real-world speed. ★
                    Enterprise defense for synthetic fraud at real-world speed. ★
                    Enterprise defense for synthetic fraud at real-world speed. ★
                    Enterprise defense for synthetic fraud at real-world speed.
                  </span>
                  <span>
                    Enterprise defense for synthetic fraud at real-world speed. ★
                    Enterprise defense for synthetic fraud at real-world speed. ★
                    Enterprise defense for synthetic fraud at real-world speed. ★
                    Enterprise defense for synthetic fraud at real-world speed.
                  </span>
                </div>
              </div>
              <div className="manifesto-text-block">
                <h1 className="manifesto-text overlay-text">{t.landing.manifesto.line1}</h1>
                <h1 className="manifesto-text overlay-text indented-1">
                  {t.landing.manifesto.line2}
                </h1>
                <h1 className="manifesto-text overlay-text indented-2">
                  {t.landing.manifesto.line3}
                </h1>
                <h1 className="manifesto-text overlay-text indented-3">
                  {t.landing.manifesto.line4}
                </h1>
              </div>
              <div className="marquee-track">
                <div className="marquee-row marquee-right marquee-overlay-text">
                  <span>
                    Enterprise defense for synthetic fraud at real-world speed. ★
                    Enterprise defense for synthetic fraud at real-world speed. ★
                    Enterprise defense for synthetic fraud at real-world speed. ★
                    Enterprise defense for synthetic fraud at real-world speed.
                  </span>
                  <span>
                    Enterprise defense for synthetic fraud at real-world speed. ★
                    Enterprise defense for synthetic fraud at real-world speed. ★
                    Enterprise defense for synthetic fraud at real-world speed. ★
                    Enterprise defense for synthetic fraud at real-world speed.
                  </span>
                </div>
              </div>
              <div className="marquee-track">
                <div className="marquee-row marquee-left marquee-overlay-text">
                  <span>
                    Enterprise defense for synthetic fraud at real-world speed. ★
                    Enterprise defense for synthetic fraud at real-world speed. ★
                    Enterprise defense for synthetic fraud at real-world speed. ★
                    Enterprise defense for synthetic fraud at real-world speed.
                  </span>
                  <span>
                    Enterprise defense for synthetic fraud at real-world speed. ★
                    Enterprise defense for synthetic fraud at real-world speed. ★
                    Enterprise defense for synthetic fraud at real-world speed. ★
                    Enterprise defense for synthetic fraud at real-world speed.
                  </span>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* ======================================================== */}
        {/* 9. TECHNICAL WHITE PAPER (Exact whitepaper-section)      */}
        {/* ======================================================== */}
        <section className="whitepaper-section" id="white-paper">
          <div className="whitepaper-section__inner">
            <Link
              to="/evidence"
              className="whitepaper-doc !p-0 !border-0 overflow-hidden"
              aria-label={t.landing.whitePaper.downloadAria}
            >
              <Suspense
                fallback={
                  <span className="whitepaper-doc__tag" aria-hidden="true">
                    {t.landing.whitePaper.tag}
                  </span>
                }
              >
                <HolographicWhitePaperCard />
              </Suspense>
            </Link>

            <div className="whitepaper-content">
              <span className="whitepaper-content__badge">{t.landing.whitePaper.badge}</span>
              <h3 className="whitepaper-content__title">
                <span className="whitepaper-title__thunder">
                  {t.landing.whitePaper.titleMain}
                </span>
                <span className="whitepaper-title__sub">
                  <span className="whitepaper-title__thunder-sub">{t.landing.whitePaper.subA}</span>
                  <span className="whitepaper-title__script">
                    {t.landing.whitePaper.subScript}
                  </span>
                  <span className="whitepaper-title__thunder-sub">
                    {t.landing.whitePaper.subRest}
                  </span>
                </span>
              </h3>
              <p className="whitepaper-content__abstract">
                {t.landing.whitePaper.abstract}
              </p>
              <div className="whitepaper-content__actions">
                <Link to="/evidence" className="whitepaper-content__cta">
                  <span>{t.landing.whitePaper.downloadCta}</span>
                </Link>
                <span className="whitepaper-content__meta">
                  {t.landing.whitePaper.meta}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ======================================================== */}
        {/* 10. SITE FOOTER (Exact site-footer structure)           */}
        {/* ======================================================== */}
        <footer className="site-footer">
          <div className="site-footer__inner">
            <div className="site-footer__top">
              <div className="site-footer__brand">
                <Link
                  className="site-footer__brand-link"
                  style={{ textDecoration: 'none' }}
                  to="/"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <SafeHERLogo size="lg" />
                    <span className="font-['thunderLC',sans-serif] text-3xl font-bold text-[#F4F5FF] tracking-wider">
                      SAFEHER
                    </span>
                  </div>
                  <span className="site-footer__byline">{t.landing.footer.byline}</span>
                </Link>
                <p className="site-footer__tagline">
                  {t.landing.footer.taglineLine1}
                  <br />
                  {t.landing.footer.taglineLine2}
                </p>
              </div>
              <div className="site-footer__social">
                <a
                  href="https://x.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="site-footer__social-link"
                  aria-label="X / Twitter"
                >
                  X / Twitter
                </a>
                <a
                  href="https://instagram.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="site-footer__social-link"
                  aria-label="Instagram"
                >
                  Instagram
                </a>
                <a
                  href="https://linkedin.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="site-footer__social-link"
                  aria-label="LinkedIn"
                >
                  LinkedIn
                </a>
              </div>
            </div>

            <div className="site-footer__divider"></div>

            <div className="site-footer__columns">
              <div className="site-footer__col">
                <h4 className="site-footer__col-title">{t.landing.footer.coverageTitle}</h4>
                <ul className="site-footer__col-list">
                  <li>
                    <Link to="/analysis/media">{t.landing.footer.deepfakeVideo}</Link>
                  </li>
                  <li>
                    <Link to="/analysis/media">{t.landing.footer.voiceCloning}</Link>
                  </li>
                  <li>
                    <Link to="/analysis/threat">{t.landing.footer.syntheticIdentity}</Link>
                  </li>
                </ul>
              </div>
              <div className="site-footer__col">
                <h4 className="site-footer__col-title">{t.landing.coreRisk.title}</h4>
                <ul className="site-footer__col-list">
                  <li>
                    <Link to="/evidence">{t.landing.footer.fakeKyc}</Link>
                  </li>
                  <li>
                    <Link to="/analysis/threat">{t.landing.footer.threatAnalysis}</Link>
                  </li>
                  <li>
                    <Link to="/incidents">{t.landing.coreRisk.card5Title}</Link>
                  </li>
                </ul>
              </div>
              <div className="site-footer__col">
                <h4 className="site-footer__col-title">{t.landing.footer.legalTitle}</h4>
                <ul className="site-footer__col-list">
                  <li>
                    <a href="tel:1930">1930 · Cyber Fraud Helpline</a>
                  </li>
                  <li>
                    <a href="tel:112">112 · National Emergency</a>
                  </li>
                  <li>
                    <a
                      href="https://cybercrime.gov.in"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      cybercrime.gov.in
                    </a>
                  </li>
                </ul>
              </div>
              <div className="site-footer__col">
                <h4 className="site-footer__col-title">{t.landing.footer.platformTitle}</h4>
                <ul className="site-footer__col-list">
                  <li>
                    <Link to="/evidence">{t.landing.footer.evidenceVault}</Link>
                  </li>
                  <li>
                    <Link to="/complaints">{t.landing.footer.complaintWizard}</Link>
                  </li>
                  <li>
                    <Link to="/settings">{t.nav.settings}</Link>
                  </li>
                </ul>
              </div>
            </div>

            <div className="site-footer__divider"></div>

            <div className="site-footer__bottom">
              <p className="site-footer__copyright">
                {t.landing.footer.copyright}
              </p>
            </div>
          </div>

          <button
            className="site-footer__back-to-top"
            aria-label="Back to top"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <span>BACK TO TOP</span>
            <svg
              viewBox="0 0 24 24"
              width="16"
              height="16"
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="18 15 12 9 6 15"></polyline>
            </svg>
          </button>
        </footer>
      </main>
    </div>
  )
}
