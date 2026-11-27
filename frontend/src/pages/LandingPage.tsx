import React, { useEffect, useRef, useState } from 'react';
import { PublicLandingShell } from '../components/shells/AppShells';
import { useI18n } from '../contexts/I18nContext';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { useCinematicScroll } from '../hooks/useCinematicScroll';
import { EmergencyDrawer } from '../components/layout/EmergencyDrawer';
import { LandingNavbar } from '../components/landing/LandingNavbar';
import { HeroSection } from '../components/landing/HeroSection';
import { MovingTicker } from '../components/landing/MovingTicker';
import { PerspectiveGallery } from '../components/landing/PerspectiveGallery';
import { JourneyPathSection } from '../components/landing/JourneyPathSection';
import { CapabilityGrid } from '../components/landing/CapabilityGrid';
import { InteractiveDemoSection } from '../components/landing/InteractiveDemoSection';
import { ManifestoSection } from '../components/landing/ManifestoSection';
import { TechnologyStackSection } from '../components/landing/TechnologyStackSection';
import { LandingFooter } from '../components/landing/LandingFooter';

export const LandingPage: React.FC = () => {
  const { t } = useI18n();
  const s = t.landing.story;
  const reducedMotion = useReducedMotion();

  const rootRef = useRef<HTMLDivElement | null>(null);
  const glowRef = useRef<HTMLDivElement | null>(null);

  const [activeSection, setActiveSection] = useState('home');
  const [scrollGalleryIdx, setScrollGalleryIdx] = useState<number | undefined>(undefined);
  const [scrollRiskIdx, setScrollRiskIdx] = useState<number | undefined>(undefined);
  const [isEmergencyOpen, setIsEmergencyOpen] = useState(false);

  useCinematicScroll({
    rootRef,
    reducedMotion,
    scrollBackText: s.scrollBack,
    scrollForwardText: s.scrollCue.toUpperCase(),
    onGalleryProgressChange: (idx) => setScrollGalleryIdx(idx),
    onRiskActiveChange: (idx) => setScrollRiskIdx(idx),
  });

  // Subtle ambient pointer glow
  useEffect(() => {
    if (reducedMotion) return;
    const onPointerMove = (e: PointerEvent) => {
      if (!glowRef.current) return;
      glowRef.current.style.left = `${e.clientX}px`;
      glowRef.current.style.top = `${e.clientY}px`;
    };
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    return () => window.removeEventListener('pointermove', onPointerMove);
  }, [reducedMotion]);

  // Keep navbar active item aligned with current viewport section
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const sectionIds = ['home', 'experience', 'protection', 'capabilities', 'live-demo', 'system'];
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { rootMargin: '-35% 0px -55% 0px' }
    );
    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  const handleGalleryAction = (cardId: string) => {
    if (cardId === 'emergency') {
      setIsEmergencyOpen(true);
    }
  };

  return (
    <PublicLandingShell>
      <div ref={rootRef} className="relative">
        <div className="cursor-glow" id="cursorGlow" ref={glowRef} aria-hidden="true" />
        <div className="scroll-progress" id="scrollProgress" aria-hidden="true" />
        <div className="story-scrub-label" id="storyScrubLabel" aria-hidden="true">
          {s.scrollCue.toUpperCase()}
        </div>

        <LandingNavbar
          activeSection={activeSection}
          onOpenEmergency={() => setIsEmergencyOpen(true)}
        />

        <main>
          <HeroSection reducedMotion={reducedMotion} />

          <MovingTicker phrases={[s.ticker1, s.ticker2]} />

          <PerspectiveGallery
            externalActiveIndex={scrollGalleryIdx}
            onCardAction={handleGalleryAction}
          />

          <JourneyPathSection />

          <CapabilityGrid externalSelectedIndex={scrollRiskIdx} />

          <InteractiveDemoSection onOpenEmergency={() => setIsEmergencyOpen(true)} />

          <ManifestoSection />

          <TechnologyStackSection />
        </main>

        <LandingFooter onOpenEmergency={() => setIsEmergencyOpen(true)} />

        <EmergencyDrawer
          isOpen={isEmergencyOpen}
          onClose={() => setIsEmergencyOpen(false)}
        />
      </div>
    </PublicLandingShell>
  );
};

export default LandingPage;
