import { useEffect, useRef, type RefObject } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger);

export interface CinematicScrollOptions {
  rootRef: RefObject<HTMLElement | null>;
  reducedMotion?: boolean;
  onRiskActiveChange?: (index: number) => void;
  onGalleryProgressChange?: (index: number) => void;
  scrollBackText?: string;
  scrollForwardText?: string;
}

/**
 * Sets up desktop GSAP + ScrollTrigger pinned story timelines paired with
 * restrained Lenis smooth scrolling, falling back cleanly to native scroll reveals
 * on mobile viewports (<900px) and static immediate visibility when reduced motion
 * is preferred.
 */
export function useCinematicScroll({
  rootRef,
  reducedMotion = false,
  onRiskActiveChange,
  onGalleryProgressChange,
  scrollBackText = 'BACK TO THE BEGINNING',
  scrollForwardText = 'SCROLL TO EXPERIENCE',
}: CinematicScrollOptions): void {
  const riskCbRef = useRef(onRiskActiveChange);
  const galleryCbRef = useRef(onGalleryProgressChange);

  useEffect(() => {
    riskCbRef.current = onRiskActiveChange;
  }, [onRiskActiveChange]);

  useEffect(() => {
    galleryCbRef.current = onGalleryProgressChange;
  }, [onGalleryProgressChange]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof window === 'undefined') return;

    const $ = <T extends Element = HTMLElement>(selector: string): T | null =>
      root.querySelector<T>(selector) ?? document.querySelector<T>(selector);
    const $$ = <T extends Element = HTMLElement>(selector: string): T[] => {
      const scoped = Array.from(root.querySelectorAll<T>(selector));
      if (scoped.length > 0) return scoped;
      return Array.from(document.querySelectorAll<T>(selector));
    };

    const progressBar = $<HTMLElement>('#scrollProgress');
    const scrubLabel = $<HTMLElement>('#storyScrubLabel');
    const topbar = $<HTMLElement>('#topbar');

    const updateTopbarScroll = () => {
      if (topbar) {
        topbar.classList.toggle('scrolled', window.scrollY > 30);
      }
      if (progressBar && reducedMotion) {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        progressBar.style.transform = `scaleX(${max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0})`;
      }
    };

    if (reducedMotion) {
      document.body.classList.remove('story-motion');
      $$<HTMLElement>('.reveal,.gallery-card,.risk-card,.layer-card').forEach((el) => {
        el.style.opacity = '1';
        el.style.filter = 'none';
      });
      $$<SVGGeometryElement>('.path-svg .scroll-trace, .route-draw').forEach((line) => {
        line.style.strokeDashoffset = '0';
      });
      $$<SVGCircleElement>('.path-svg circle').forEach((node) => {
        node.classList.add('lit');
      });
      window.addEventListener('scroll', updateTopbarScroll, { passive: true });
      updateTopbarScroll();
      return () => {
        window.removeEventListener('scroll', updateTopbarScroll);
      };
    }

    let lenis: Lenis | null = null;
    let tickerFn: ((time: number) => void) | null = null;
    const isDesktop =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(min-width: 900px) and (prefers-reduced-motion: no-preference)').matches;

    const ctx = gsap.context(() => {
      document.body.classList.add('story-motion');
      ScrollTrigger.config({
        ignoreMobileResize: true,
        autoRefreshEvents: 'visibilitychange,DOMContentLoaded,load',
      });

      if (isDesktop) {
        try {
          lenis = new Lenis({
            duration: 1.18,
            smoothWheel: true,
            wheelMultiplier: 0.88,
            touchMultiplier: 1.25,
            lerp: 0.085,
          });
          lenis.on('scroll', ScrollTrigger.update);
          tickerFn = (time: number) => {
            lenis?.raf(time * 1000);
          };
          gsap.ticker.add(tickerFn);
          gsap.ticker.lagSmoothing(0);
        } catch {
          lenis = null;
        }
      }

      ScrollTrigger.create({
        start: 0,
        end: () => ScrollTrigger.maxScroll(window),
        onUpdate: (self) => {
          if (progressBar) {
            progressBar.style.transform = `scaleX(${self.progress})`;
          }
          if (scrubLabel) {
            scrubLabel.textContent = self.progress > 0.985 ? scrollBackText : scrollForwardText;
          }
          if (topbar) {
            topbar.classList.toggle('scrolled', self.scroll() > 30);
          }
        },
      });

      if (isDesktop) {
        // 01 — Opening hero transitions while city network moves forward in Z-space.
        const hero = $<HTMLElement>('.hero');
        const heroCopy = $<HTMLElement>('.hero-copy');
        const heroVisual = $<HTMLElement>('.hero-visual');
        if (hero && heroCopy && heroVisual) {
          const heroTl = gsap.timeline({
            scrollTrigger: {
              trigger: hero,
              start: 'top top',
              end: () => `+=${window.innerHeight * 1.16}`,
              pin: true,
              scrub: 1.25,
              anticipatePin: 1,
              invalidateOnRefresh: true,
            },
          });
          heroTl
            .to(heroCopy, { yPercent: -48, scale: 0.82, opacity: 0, ease: 'none' }, 0)
            .to(heroVisual, { scale: 1.34, xPercent: 7, yPercent: -7, rotationZ: -6, ease: 'none' }, 0);

          const heroGrid = $<HTMLElement>('.hero-grid');
          if (heroGrid) {
            heroTl.to(heroGrid, { y: 170, scale: 1.15, opacity: 0.35, ease: 'none' }, 0);
          }
          const huds = $$<HTMLElement>('.hud');
          if (huds.length) {
            heroTl.to(huds, { y: -65, opacity: 0, stagger: 0.04, ease: 'none' }, 0.08);
          }
          const heroCoord = $<HTMLElement>('.hero-coord');
          if (heroCoord) {
            heroTl.to(heroCoord, { opacity: 0, ease: 'none' }, 0.05);
          }
          const scrollCue = $<HTMLElement>('.scroll-cue');
          if (heroVisual && scrollCue) {
            heroTl.to(scrollCue, { opacity: 0, y: 25, ease: 'none' }, 0);
          }
        }

        // 02 — Pinned perspective feature gallery.
        const gallery = $<HTMLElement>('.gallery-section');
        const track = $<HTMLElement>('#galleryTrack');
        const galleryCards = $$<HTMLElement>('.gallery-card');
        if (gallery && track && galleryCards.length) {
          let lastGalleryIdx = -1;
          const galleryTl = gsap.timeline({
            scrollTrigger: {
              trigger: gallery,
              start: 'top top',
              end: () => `+=${window.innerHeight * 2.05}`,
              pin: true,
              scrub: 1.15,
              anticipatePin: 1,
              invalidateOnRefresh: true,
              onUpdate: (self) => {
                const active = Math.min(
                  galleryCards.length - 1,
                  Math.floor(self.progress * galleryCards.length)
                );
                if (active !== lastGalleryIdx) {
                  lastGalleryIdx = active;
                  galleryCbRef.current?.(active);
                }
              },
            },
          });

          const galleryIntro = $<HTMLElement>('.gallery-intro');
          if (galleryIntro) {
            galleryTl.fromTo(galleryIntro, { y: 65, opacity: 0.35 }, { y: 0, opacity: 1, ease: 'none', duration: 0.2 }, 0);
          }
          galleryTl
            .fromTo(
              track,
              { x: 0, rotationY: -10, scale: 0.92 },
              { x: () => -window.innerWidth * 0.22, rotationY: 12, scale: 1.07, ease: 'none', duration: 1 },
              0
            )
            .fromTo(
              galleryCards,
              {
                z: -520,
                rotationY: (i: number) => (i % 2 ? 26 : -26),
                y: (i: number) => (i % 2 ? 95 : -95),
                scale: 0.62,
                opacity: 0.12,
              },
              {
                z: 80,
                rotationY: 0,
                y: 0,
                scale: 1.06,
                opacity: 1,
                stagger: 0.13,
                ease: 'power2.out',
                duration: 0.42,
              },
              0.08
            )
            .to(track, { x: () => -window.innerWidth * 0.43, rotationY: -8, scale: 0.94, ease: 'none', duration: 0.48 }, 0.58);

          const galleryControls = $<HTMLElement>('.gallery-controls');
          if (galleryControls) {
            galleryTl.to(galleryControls, { y: 35, opacity: 0.35, ease: 'none' }, 0.75);
          }
        }

        // 03 — Pinned journey path with live SVG trace + node illumination.
        const pathSection = $<HTMLElement>('.path-section');
        const pathWrap = $<HTMLElement>('.path-wrap');
        const pathLine = $<SVGGeometryElement>('.path-svg .scroll-trace');
        const pathSteps = $$<HTMLElement>('.path-step');
        if (pathSection && pathWrap && pathLine && pathSteps.length) {
          let pathLen = 1;
          try {
            if (typeof pathLine.getTotalLength === 'function') {
              pathLen = pathLine.getTotalLength() || 1;
            }
          } catch {
            pathLen = 1;
          }
          gsap.set(pathLine, { strokeDasharray: pathLen, strokeDashoffset: pathLen });
          const pathTl = gsap.timeline({
            scrollTrigger: {
              trigger: pathSection,
              start: 'top top',
              end: () => `+=${window.innerHeight * 2.25}`,
              pin: true,
              scrub: 1.15,
              anticipatePin: 1,
              invalidateOnRefresh: true,
            },
          });

          const pathHead = $<HTMLElement>('.path-section .section-head');
          if (pathHead) {
            pathTl.fromTo(pathHead, { y: 0, scale: 1, opacity: 1 }, { y: -95, scale: 0.9, opacity: 0.22, ease: 'none', duration: 0.35 }, 0);
          }
          pathTl
            .fromTo(pathWrap, { scale: 0.96, rotationX: 4, y: 24 }, { scale: 1, rotationX: 0, y: 0, ease: 'none', duration: 1 }, 0)
            .to(pathLine, { strokeDashoffset: 0, ease: 'none', duration: 1 }, 0)
            .fromTo(
              pathSteps,
              {
                y: 45,
                x: (i: number) => (i % 2 ? 40 : -40),
                opacity: 0.85,
              },
              {
                y: 0,
                x: 0,
                opacity: 1,
                stagger: 0.16,
                ease: 'power2.out',
                duration: 0.42,
              },
              0.04
            );
          if (pathSteps[0]) pathTl.to(pathSteps[0], { y: -20, ease: 'none', duration: 0.16 }, 0.73);
          if (pathSteps[1]) pathTl.to(pathSteps[1], { y: -20, ease: 'none', duration: 0.16 }, 0.77);

          const nodes = $$<SVGCircleElement>('.path-svg circle');
          ScrollTrigger.create({
            trigger: pathSection,
            start: 'top top',
            end: () => `+=${window.innerHeight * 2.25}`,
            onUpdate: (self) => {
              nodes.forEach((node, i) => {
                node.classList.toggle('lit', self.progress > (i / Math.max(1, nodes.length - 1)) * 0.84);
              });
            },
          });
        }

        // 04 — Pinned 5-column capability spatial wall.
        const risks = $<HTMLElement>('.risks-section');
        const riskCards = $$<HTMLElement>('.risk-card');
        const riskDetail = $<HTMLElement>('.risk-detail');
        if (risks && riskCards.length) {
          let lastRiskIdx = -1;
          const riskTl = gsap.timeline({
            scrollTrigger: {
              trigger: risks,
              start: 'top top',
              end: () => `+=${window.innerHeight * 1.72}`,
              pin: true,
              scrub: 1.05,
              anticipatePin: 1,
              invalidateOnRefresh: true,
              onUpdate: (self) => {
                const active = Math.min(riskCards.length - 1, Math.floor(self.progress * riskCards.length));
                if (active !== lastRiskIdx) {
                  lastRiskIdx = active;
                  riskCbRef.current?.(active);
                }
              },
            },
          });
          const risksHead = $<HTMLElement>('.risks-section .section-head');
          if (risksHead) {
            riskTl.fromTo(risksHead, { y: 65, opacity: 0.25 }, { y: 0, opacity: 1, ease: 'none', duration: 0.25 }, 0);
          }
          riskTl.fromTo(
            riskCards,
            {
              y: 55,
              z: -120,
              rotationY: (i: number) => (i % 2 ? 12 : -12),
              rotationX: 6,
              scale: 0.92,
              opacity: 0.82,
            },
            {
              y: 0,
              z: 0,
              rotationY: 0,
              rotationX: 0,
              scale: 1,
              opacity: 1,
              stagger: 0.1,
              ease: 'power2.out',
              duration: 0.45,
            },
            0.08
          );
          if (riskDetail) {
            riskTl.fromTo(riskDetail, { y: 24, opacity: 0.9 }, { y: 0, opacity: 1, ease: 'power2.out', duration: 0.25 }, 0.4);
          }
          riskCards.forEach((card, i) => {
            const art = card.querySelector<SVGSVGElement>('svg');
            if (art) {
              gsap.to(art, {
                rotationY: i % 2 ? 9 : -9,
                rotationZ: i % 2 ? -4 : 4,
                transformPerspective: 900,
                ease: 'none',
                scrollTrigger: {
                  trigger: risks,
                  start: 'top top',
                  end: () => `+=${window.innerHeight * 1.72}`,
                  scrub: 1,
                },
              });
            }
          });
        }

        // 05 — Control room split-screen live demo.
        const demoSection = $<HTMLElement>('.demo-section');
        const demoShell = $<HTMLElement>('.demo-shell');
        const routeDraw = $<SVGGeometryElement>('.route-draw');
        const mapPanel = $<HTMLElement>('.map-panel');
        if (demoSection && demoShell) {
          let routeLen = 1;
          if (routeDraw) {
            try {
              if (typeof routeDraw.getTotalLength === 'function') {
                routeLen = routeDraw.getTotalLength() || 1;
              }
            } catch {
              routeLen = 1;
            }
            gsap.set(routeDraw, { strokeDasharray: routeLen, strokeDashoffset: routeLen });
          }
          const sideCards = $$<HTMLElement>('.demo-side .contact-card,.demo-side .side-stat,.demo-side .sos-button');
          const demoTl = gsap.timeline({
            scrollTrigger: {
              trigger: demoShell,
              start: 'top top+=112',
              end: () => `+=${window.innerHeight * 1.48}`,
              pin: true,
              scrub: 1.1,
              anticipatePin: 1,
              invalidateOnRefresh: true,
            },
          });
          demoTl.fromTo(demoShell, { y: 40, scale: 0.94, rotationX: 4, opacity: 0.92 }, { y: 0, scale: 1, rotationX: 0, opacity: 1, ease: 'none', duration: 0.35 }, 0);
          if (mapPanel) {
            demoTl.fromTo(mapPanel, { rotationY: 10, rotationX: 6, z: -80, scale: 0.94 }, { rotationY: 0, rotationX: 0, z: 0, scale: 1, ease: 'none', duration: 1 }, 0);
          }
          if (routeDraw) {
            demoTl.to(routeDraw, { strokeDashoffset: 0, ease: 'none', duration: 0.75 }, 0.16);
          }
          if (sideCards.length) {
            demoTl.fromTo(sideCards, { x: 24, z: -40, opacity: 0.9 }, { x: 0, z: 0, opacity: 1, stagger: 0.08, ease: 'power2.out', duration: 0.28 }, 0.25);
          }
          const mapLabels = $$<HTMLElement>('.map-label');
          if (mapLabels.length) {
            demoTl.fromTo(mapLabels, { opacity: 0.7, y: 10 }, { opacity: 1, y: 0, stagger: 0.08, ease: 'power2.out', duration: 0.18 }, 0.2);
          }
          if (mapPanel) {
            demoTl.to(mapPanel, { scale: 1.035, ease: 'none', duration: 0.3 }, 0.72);
          }
        }

        // 06 — Manifesto wash expansion & headline line reveals.
        const manifesto = $<HTMLElement>('.manifesto');
        const wash = $<HTMLElement>('.manifesto-wash');
        const manifestoLines = $$<HTMLElement>('.manifesto-title span');
        const manifestoFoot = $<HTMLElement>('.manifesto-foot');
        if (manifesto && wash && manifestoLines.length) {
          gsap.set(wash, { scale: 0.001 });
          gsap.set(manifestoLines, {
            x: (i: number) => (i === 1 ? 90 : i === 2 ? -90 : -70),
            y: 45,
            opacity: 0,
            clipPath: 'inset(0 0 100% 0)',
          });
          const manifestoTl = gsap.timeline({
            scrollTrigger: {
              trigger: manifesto,
              start: 'top top',
              end: () => `+=${window.innerHeight * 1.72}`,
              pin: true,
              scrub: 1.2,
              anticipatePin: 1,
              invalidateOnRefresh: true,
            },
          });
          manifestoTl
            .to(wash, { scale: 1.55, ease: 'none', duration: 0.58 }, 0)
            .to(manifestoLines, { x: 0, y: 0, opacity: 1, clipPath: 'inset(0 0 0% 0)', stagger: 0.13, ease: 'power2.out', duration: 0.3 }, 0.2);
          if (manifestoFoot) {
            manifestoTl.fromTo(manifestoFoot, { y: 65, opacity: 0 }, { y: 0, opacity: 1, ease: 'power2.out', duration: 0.2 }, 0.72);
          }
          const bottomTicker = $<HTMLElement>('.manifesto .ticker.bottom');
          if (bottomTicker) {
            manifestoTl.to(bottomTicker, { y: -22, opacity: 1, ease: 'none' }, 0.7);
          }
        }

        // 07 — 3D stacked technology layers separating and settling.
        const systemSection = $<HTMLElement>('.system-section');
        const systemCopy = $<HTMLElement>('.system-copy');
        const systemStack = $<HTMLElement>('.system-stack');
        const layerCards = $$<HTMLElement>('.layer-card');
        if (systemSection && systemCopy && systemStack && layerCards.length) {
          gsap.set(layerCards, {
            clearProps: 'transform',
            x: 0,
            y: 0,
            z: -260,
            rotationX: 24,
            rotationY: 16,
            rotationZ: 0,
            opacity: 0,
            transformPerspective: 1200,
          });
          const sysTl = gsap.timeline({
            scrollTrigger: {
              trigger: systemSection,
              start: 'top top',
              end: () => `+=${window.innerHeight * 1.55}`,
              pin: true,
              scrub: 1.1,
              anticipatePin: 1,
              invalidateOnRefresh: true,
            },
          });
          sysTl.fromTo(systemCopy, { x: -100, opacity: 0 }, { x: 0, opacity: 1, ease: 'none', duration: 0.38 }, 0);
          if (layerCards[0]) {
            sysTl.to(layerCards[0], { x: -22, y: -130, z: 70, rotationX: 0, rotationY: 0, rotationZ: -7, opacity: 1, ease: 'power2.out', duration: 0.4 }, 0.12);
          }
          if (layerCards[1]) {
            sysTl.to(layerCards[1], { x: 18, y: 0, z: 120, rotationX: 0, rotationY: 0, rotationZ: 2, opacity: 1, ease: 'power2.out', duration: 0.4 }, 0.28);
          }
          if (layerCards[2]) {
            sysTl.to(layerCards[2], { x: -14, y: 130, z: 55, rotationX: 0, rotationY: 0, rotationZ: 7, opacity: 1, ease: 'power2.out', duration: 0.4 }, 0.44);
          }
          const orbit = $<HTMLElement>('.system-orbit');
          if (orbit) {
            sysTl.to(orbit, { rotation: 30, scale: 1.08, ease: 'none', duration: 0.85 }, 0);
          }
        }

        // Footer release entrance
        $$<HTMLElement>('.footer-top,.footer-bottom').forEach((el) => {
          gsap.fromTo(
            el,
            { y: 55, opacity: 0 },
            {
              y: 0,
              opacity: 1,
              duration: 1,
              ease: 'power3.out',
              scrollTrigger: { trigger: el, start: 'top 92%', once: true },
            }
          );
        });
      } else {
        // Mobile / tablet (<900px): keep natural touch scrolling + light reveals
        $$<HTMLElement>('.reveal,.gallery-card,.risk-card,.layer-card,.demo-shell').forEach((el, i) => {
          gsap.fromTo(
            el,
            { y: 38, opacity: 0, scale: 0.97 },
            {
              y: 0,
              opacity: 1,
              scale: 1,
              duration: 0.85,
              delay: (i % 4) * 0.04,
              ease: 'power3.out',
              scrollTrigger: { trigger: el, start: 'top 90%', once: true },
            }
          );
        });
        const heroVisual = $<HTMLElement>('.hero-visual');
        if (heroVisual) {
          gsap.to(heroVisual, {
            y: -85,
            ease: 'none',
            scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 0.6 },
          });
        }
        // Keep manifesto wash expanded enough on mobile so lime background + dark ink remain clear
        const wash = $<HTMLElement>('.manifesto-wash');
        if (wash) {
          gsap.set(wash, { scale: 1.5 });
        }
      }

      ScrollTrigger.refresh();
    }, root);

    const onLoadRefresh = () => ScrollTrigger.refresh();
    window.addEventListener('load', onLoadRefresh, { once: true });
    if (document.fonts?.ready) {
      document.fonts.ready.then(() => ScrollTrigger.refresh()).catch(() => {});
    }

    return () => {
      document.body.classList.remove('story-motion');
      window.removeEventListener('load', onLoadRefresh);
      if (tickerFn) {
        gsap.ticker.remove(tickerFn);
      }
      if (lenis) {
        try {
          lenis.destroy();
        } catch {
          // ignore destroy failures during unmount
        }
      }
      ctx.revert();
    };
  }, [rootRef, reducedMotion, scrollBackText, scrollForwardText]);
}
