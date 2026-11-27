import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../../contexts/I18nContext';

export interface GalleryCardSpec {
  id: string;
  tag: string;
  title: string;
  description: string;
  route: string;
  ctaLabel: string;
  ariaLabel: string;
  renderArt: () => React.ReactNode;
}

export interface PerspectiveGalleryProps {
  externalActiveIndex?: number;
  onCardAction?: (cardId: string) => void;
}

export const PerspectiveGallery: React.FC<PerspectiveGalleryProps> = ({
  externalActiveIndex,
  onCardAction,
}) => {
  const { t } = useI18n();
  const s = t.landing.story;
  const [activeCard, setActiveCard] = useState(2);
  const [viewportWidth, setViewportWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1280
  );

  useEffect(() => {
    if (
      typeof externalActiveIndex === 'number' &&
      externalActiveIndex >= 0 &&
      externalActiveIndex < 5
    ) {
      setActiveCard(externalActiveIndex);
    }
  }, [externalActiveIndex]);

  useEffect(() => {
    const onResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const cards: GalleryCardSpec[] = [
    {
      id: 'trusted-circle',
      tag: s.galCard1Tag,
      title: s.galCard1Title,
      description: s.galCard1Desc,
      route: '/settings',
      ctaLabel: s.galCard1Cta,
      ariaLabel: `Select ${s.galCard1Title}`,
      renderArt: () => (
        <svg viewBox="0 0 200 230" aria-hidden="true">
          <g stroke="#d5ff54" fill="none" strokeWidth="1.1">
            <circle cx="100" cy="106" r="28" />
            <circle cx="100" cy="106" r="62" strokeDasharray="2 7" />
            <circle cx="100" cy="106" r="91" opacity=".35" />
            <path d="M100 78 48 42M128 106 169 80M100 134 70 188M72 106 31 129M100 78 125 34" />
            <circle cx="48" cy="42" r="8" fill="#d5ff54" />
            <circle cx="169" cy="80" r="8" fill="#d5ff54" />
            <circle cx="70" cy="188" r="8" fill="#d5ff54" />
            <circle cx="31" cy="129" r="8" fill="#d5ff54" />
            <circle cx="125" cy="34" r="8" fill="#d5ff54" />
            <path d="M90 106a10 10 0 1 1 20 0c0 9-10 17-10 17s-10-8-10-17Z" fill="#d5ff54" />
          </g>
        </svg>
      ),
    },
    {
      id: 'evidence-vault',
      tag: s.galCard2Tag,
      title: s.galCard2Title,
      description: s.galCard2Desc,
      route: '/evidence',
      ctaLabel: s.galCard2Cta,
      ariaLabel: `Select ${s.galCard2Title}`,
      renderArt: () => (
        <svg viewBox="0 0 200 230" aria-hidden="true">
          <g fill="none" stroke="#d5ff54" strokeWidth="1.1">
            <path d="M15 20h170v190H15z" opacity=".3" />
            <path d="M15 68h170M15 123h170M63 20v190M124 20v190" opacity=".22" />
            <path d="M28 183C54 158 45 118 81 118S109 64 145 75s22 57 35 70" strokeWidth="2.5" />
            <circle cx="28" cy="183" r="5" fill="#d5ff54" />
            <circle cx="180" cy="145" r="5" fill="#ff927e" />
            <circle cx="81" cy="118" r="3" fill="#d5ff54" />
            <circle cx="145" cy="75" r="3" fill="#d5ff54" />
            <path d="M92 101l12 17-12 17-12-17Z" fill="#d5ff54" opacity=".6" />
          </g>
        </svg>
      ),
    },
    {
      id: 'ai-verifier',
      tag: s.galCard3Tag,
      title: s.galCard3Title,
      description: s.galCard3Desc,
      route: '/detect',
      ctaLabel: s.galCard3Cta,
      ariaLabel: `Select ${s.galCard3Title}`,
      renderArt: () => (
        <svg viewBox="0 0 200 230" aria-hidden="true">
          <g fill="none" stroke="#d5ff54" strokeWidth="1.2">
            <path d="M18 54 100 12l82 42v120l-82 42-82-42Z" opacity=".3" />
            <path d="M18 54l82 44 82-44M100 98v108M18 174l82-44 82 44" opacity=".45" />
            <path d="M61 80v-25l39-22 39 22v25l-39 21Z" />
            <path d="M74 80V64l26-14 26 14v16l-26 14Z" />
            <circle cx="100" cy="75" r="10" fill="#d5ff54" opacity=".7" />
            <path d="M100 101c-27 0-49 22-49 49M100 101c27 0 49 22 49 49M100 101v70" strokeDasharray="3 6" />
            <circle cx="100" cy="101" r="5" fill="#d5ff54" />
          </g>
        </svg>
      ),
    },
    {
      id: 'emergency-signal',
      tag: s.galCard4Tag,
      title: s.galCard4Title,
      description: s.galCard4Desc,
      route: '#emergency',
      ctaLabel: s.galCard4Cta,
      ariaLabel: `Select ${s.galCard4Title}`,
      renderArt: () => (
        <svg viewBox="0 0 200 230" aria-hidden="true">
          <g fill="none" stroke="#d5ff54" strokeWidth="1.1">
            <circle cx="100" cy="110" r="20" />
            <circle cx="100" cy="110" r="47" strokeDasharray="4 5" />
            <circle cx="100" cy="110" r="76" opacity=".65" />
            <circle cx="100" cy="110" r="101" opacity=".25" />
            <path d="M100 49v-20M100 171v20M39 110H19M161 110h20" />
            <path d="M91 86h18v48H91z" fill="#d5ff54" />
            <path d="M86 101h28v18H86z" fill="#d5ff54" />
          </g>
        </svg>
      ),
    },
    {
      id: 'case-timeline',
      tag: s.galCard5Tag,
      title: s.galCard5Title,
      description: s.galCard5Desc,
      route: '/cases',
      ctaLabel: s.galCard5Cta,
      ariaLabel: `Select ${s.galCard5Title}`,
      renderArt: () => (
        <svg viewBox="0 0 200 230" aria-hidden="true">
          <g fill="none" stroke="#d5ff54" strokeWidth="1.1">
            <circle cx="100" cy="105" r="72" />
            <circle cx="100" cy="105" r="60" strokeDasharray="2 7" />
            <path d="M100 46v59l38 25" strokeWidth="3" />
            <path d="M100 33v12M100 165v12M28 105h12M160 105h12" />
            <path d="M57 160c25 23 62 23 86 0" />
            <circle cx="100" cy="105" r="5" fill="#d5ff54" />
            <path d="m84 190 16 14 16-14" />
          </g>
        </svg>
      ),
    },
  ];

  const selectCard = (index: number) => {
    const next = (index + cards.length) % cards.length;
    setActiveCard(next);
  };

  const selected = cards[activeCard] ?? cards[0];
  const progressPct = ((activeCard + 1) / cards.length) * 100;

  return (
    <section className="gallery-section" id="experience">
      <div className="wrap">
        <div className="gallery-intro reveal">
          <div>
            <div className="eyebrow">{s.galEyebrow}</div>
            <h2 className="display" style={{ marginTop: 22 }}>
              {s.galHeading1}
              <br />
              <span className="serif">{s.galHeading2}</span>
            </h2>
          </div>
          <p className="note">{s.galNote}</p>
        </div>
      </div>

      <div className="gallery-stage" id="galleryStage">
        <div className="gallery-track" id="galleryTrack">
          {cards.map((card, i) => {
            const offset = i - activeCard;
            const isMobile = viewportWidth < 720;
            const tx = offset * (isMobile ? 115 : 220);
            const rot = offset * (isMobile ? -32 : -23);
            const scale =
              offset === 0
                ? isMobile
                  ? 0.96
                  : 1.04
                : Math.max(isMobile ? 0.58 : 0.64, 1 - Math.abs(offset) * (isMobile ? 0.16 : 0.1));
            const opacity = Math.max(0.38, 1 - Math.abs(offset) * 0.17);

            return (
              <article
                key={card.id}
                className={`gallery-card ${i === activeCard ? 'active' : ''}`}
                data-card={i}
                tabIndex={0}
                role="button"
                aria-label={card.ariaLabel}
                aria-pressed={i === activeCard}
                onClick={() => selectCard(i)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    selectCard(i);
                  }
                }}
                style={{
                  transform: `translateX(${tx}px) rotateY(${rot}deg) scale(${scale})`,
                  opacity,
                  zIndex: 10 - Math.abs(offset),
                }}
              >
                <div className="art">{card.renderArt()}</div>
                <div className="card-caption">
                  <small>{card.tag}</small>
                  <h3>{card.title}</h3>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      <div className="wrap">
        <div className="gallery-controls">
          <button
            type="button"
            className="circle-btn"
            id="galleryPrev"
            aria-label="Previous feature"
            onClick={() => selectCard(activeCard - 1)}
          >
            ←
          </button>
          <div className="gallery-progress" aria-hidden="true">
            <span id="galleryProgress" style={{ width: `${progressPct}%` }} />
          </div>
          <button
            type="button"
            className="circle-btn"
            id="galleryNext"
            aria-label="Next feature"
            onClick={() => selectCard(activeCard + 1)}
          >
            →
          </button>
        </div>

        <div className="mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-[rgba(225,239,221,0.15)] bg-[#0c110e] px-5 py-4 rounded-[3px]">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#d5ff54]">
              {selected.tag} — {selected.title}
            </div>
            <p className="mt-1 text-xs text-[#aab1a9] max-w-2xl">{selected.description}</p>
          </div>
          {selected.route === '#emergency' ? (
            <button
              type="button"
              onClick={() => onCardAction?.('emergency')}
              className="btn shrink-0"
              style={{ minHeight: 42, padding: '0 16px', fontSize: 10 }}
            >
              {selected.ctaLabel} <span className="arrow">↗</span>
            </button>
          ) : (
            <Link
              to={selected.route}
              className="btn shrink-0"
              style={{ minHeight: 42, padding: '0 16px', fontSize: 10 }}
            >
              {selected.ctaLabel} <span className="arrow">↗</span>
            </Link>
          )}
        </div>
      </div>
    </section>
  );
};

export default PerspectiveGallery;
