import { useEffect, type RefObject } from 'react'
import { gsap } from '../animations/gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useReducedMotion } from './useReducedMotion'

gsap.registerPlugin(ScrollTrigger)

/**
 * Adds cohesive GSAP staggered entrance and scroll-reveal choreography
 * across authenticated and public workspace routes, plus a smooth top scroll indicator.
 */
export function useWorkspaceScrollReveal(
  containerRef: RefObject<HTMLElement | null>,
  progressRef: RefObject<HTMLDivElement | null>,
  routeKey: string
): void {
  const reducedMotion = useReducedMotion()

  useEffect(() => {
    const container = containerRef.current
    const progressEl = progressRef.current

    const updateProgress = () => {
      if (!progressEl) return
      const winScroll = window.scrollY || document.documentElement.scrollTop || 0
      const winMax = Math.max(0, document.documentElement.scrollHeight - window.innerHeight)
      const ratio = winMax > 0 ? Math.min(1, Math.max(0, winScroll / winMax)) : 0
      progressEl.style.transform = `scaleX(${ratio})`
    }

    window.addEventListener('scroll', updateProgress, { passive: true })
    updateProgress()

    if (!container || reducedMotion) {
      return () => window.removeEventListener('scroll', updateProgress)
    }

    const ctx = gsap.context(() => {
      const blocks = Array.from(
        container.querySelectorAll<HTMLElement>('.workspace-reveal, [data-ws-reveal]')
      )
      const targetBlocks =
        blocks.length > 0
          ? blocks
          : Array.from(container.children).flatMap((el) =>
              Array.from(el.children).filter(
                (child): child is HTMLElement => child instanceof HTMLElement
              )
            )

      if (targetBlocks.length === 0) return

      // Immediately choreograph top blocks cleanly (keeping full visibility / ARIA access)
      const aboveFold = targetBlocks.slice(0, 3)
      const belowFold = targetBlocks.slice(3)

      gsap.fromTo(
        aboveFold,
        { y: 18, opacity: 0.72, scale: 0.99 },
        {
          y: 0,
          opacity: 1,
          scale: 1,
          duration: 0.52,
          stagger: 0.07,
          ease: 'power3.out',
          clearProps: 'transform,opacity',
        }
      )

      belowFold.forEach((el, idx) => {
        gsap.fromTo(
          el,
          { y: 24, opacity: 0.65, scale: 0.99 },
          {
            y: 0,
            opacity: 1,
            scale: 1,
            duration: 0.55,
            delay: (idx % 3) * 0.04,
            ease: 'power2.out',
            clearProps: 'transform,opacity',
            scrollTrigger: {
              trigger: el,
              start: 'top 92%',
              once: true,
            },
          }
        )
      })

      ScrollTrigger.refresh()
    }, container)

    return () => {
      window.removeEventListener('scroll', updateProgress)
      ctx.revert()
    }
  }, [containerRef, progressRef, routeKey, reducedMotion])
}
