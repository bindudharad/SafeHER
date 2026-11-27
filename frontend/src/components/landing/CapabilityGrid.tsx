import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../../contexts/I18nContext';

export interface CapabilityItem {
  code: string;
  tag: string;
  title: string;
  summary: string;
  detailTitle: string;
  detailText: string;
  route: string;
  routeLabel: string;
  renderArt: () => React.ReactNode;
}

export interface CapabilityGridProps {
  externalSelectedIndex?: number;
}

export const CapabilityGrid: React.FC<CapabilityGridProps> = ({
  externalSelectedIndex,
}) => {
  const { t } = useI18n();
  const s = t.landing.story;
  const [selectedIdx, setSelectedIdx] = useState(0);

  useEffect(() => {
    if (
      typeof externalSelectedIndex === 'number' &&
      externalSelectedIndex >= 0 &&
      externalSelectedIndex < 5
    ) {
      setSelectedIdx(externalSelectedIndex);
    }
  }, [externalSelectedIndex]);

  const capabilities: CapabilityItem[] = [
    {
      code: 'LAYER / 01',
      tag: s.cap1Tag,
      title: s.cap1Title,
      summary: s.cap1Summary,
      detailTitle: s.cap1DetailTitle,
      detailText: s.cap1DetailText,
      route: '/evidence',
      routeLabel: s.cap1Cta,
      renderArt: () => (
        <svg viewBox="0 0 160 150" aria-hidden="true">
          <path d="M80 15 132 45v58l-52 31-52-31V45Z" />
          <path d="M80 15v119M28 45l52 31 52-31M28 103l52-27 52 27" opacity=".6" />
          <circle cx="80" cy="76" r="15" />
          <circle cx="80" cy="76" r="34" strokeDasharray="3 6" />
        </svg>
      ),
    },
    {
      code: 'LAYER / 02',
      tag: s.cap2Tag,
      title: s.cap2Title,
      summary: s.cap2Summary,
      detailTitle: s.cap2DetailTitle,
      detailText: s.cap2DetailText,
      route: '/detect',
      routeLabel: s.cap2Cta,
      renderArt: () => (
        <svg viewBox="0 0 160 150" aria-hidden="true">
          <path d="M28 45 80 17l52 28v61l-52 28-52-28Z" />
          <path d="M80 45a35 35 0 0 0-35 35M80 45a35 35 0 0 1 35 35M80 45v68" />
          <circle cx="80" cy="45" r="6" fill="#d5ff54" />
          <circle cx="45" cy="80" r="5" fill="#d5ff54" />
          <circle cx="115" cy="80" r="5" fill="#d5ff54" />
          <circle cx="80" cy="113" r="5" fill="#d5ff54" />
        </svg>
      ),
    },
    {
      code: 'LAYER / 03',
      tag: s.cap3Tag,
      title: s.cap3Title,
      summary: s.cap3Summary,
      detailTitle: s.cap3DetailTitle,
      detailText: s.cap3DetailText,
      route: '/analysis/threat',
      routeLabel: s.cap3Cta,
      renderArt: () => (
        <svg viewBox="0 0 160 150" aria-hidden="true">
          <circle cx="80" cy="75" r="23" />
          <circle cx="80" cy="75" r="52" strokeDasharray="2 6" />
          <path d="M80 52 33 27M101 68l34-37M80 98l-4 37M59 75H18M80 52l15-34" />
          <circle cx="33" cy="27" r="7" fill="#d5ff54" />
          <circle cx="135" cy="31" r="7" fill="#d5ff54" />
          <circle cx="76" cy="135" r="7" fill="#d5ff54" />
          <circle cx="18" cy="75" r="7" fill="#d5ff54" />
        </svg>
      ),
    },
    {
      code: 'LAYER / 04',
      tag: s.cap4Tag,
      title: s.cap4Title,
      summary: s.cap4Summary,
      detailTitle: s.cap4DetailTitle,
      detailText: s.cap4DetailText,
      route: '/forensics/graph',
      routeLabel: s.cap4Cta,
      renderArt: () => (
        <svg viewBox="0 0 160 150" aria-hidden="true">
          <circle cx="80" cy="75" r="56" />
          <circle cx="80" cy="75" r="45" strokeDasharray="3 6" />
          <path d="M80 36v39l27 18" strokeWidth="2.5" />
          <path d="M80 19v9M80 122v9M24 75h9M127 75h9" />
          <circle cx="80" cy="75" r="5" fill="#d5ff54" />
        </svg>
      ),
    },
    {
      code: 'LAYER / 05',
      tag: s.cap5Tag,
      title: s.cap5Title,
      summary: s.cap5Summary,
      detailTitle: s.cap5DetailTitle,
      detailText: s.cap5DetailText,
      route: '/complaints',
      routeLabel: s.cap5Cta,
      renderArt: () => (
        <svg viewBox="0 0 160 150" aria-hidden="true">
          <circle cx="80" cy="75" r="21" />
          <circle cx="80" cy="75" r="46" strokeDasharray="4 7" />
          <circle cx="80" cy="75" r="67" opacity=".4" />
          <path d="M80 16v16M80 118v16M21 75h16M123 75h16" />
          <path d="M71 50h18v50H71zM64 66h32v18H64z" fill="#d5ff54" />
        </svg>
      ),
    },
  ];

  const active = capabilities[selectedIdx] ?? capabilities[0];

  return (
    <section className="risks-section" id="capabilities">
      <div className="wrap">
        <div className="section-head reveal">
          <div>
            <div className="eyebrow">{s.capEyebrow}</div>
            <h2 className="display" style={{ marginTop: 22 }}>
              {s.capHeading1}
              <br />
              <span className="serif">{s.capHeading2}</span>
            </h2>
          </div>
          <p className="copy">{s.capCopy}</p>
        </div>

        <div className="risk-grid">
          {capabilities.map((cap, idx) => (
            <article
              key={cap.code}
              className={`risk-card ${selectedIdx === idx ? 'selected' : ''}`}
              data-risk={idx}
              tabIndex={0}
              role="button"
              aria-pressed={selectedIdx === idx}
              onClick={() => setSelectedIdx(idx)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setSelectedIdx(idx);
                }
              }}
            >
              <div className="risk-art">{cap.renderArt()}</div>
              <span className="risk-no">{cap.tag}</span>
              <h3>{cap.title}</h3>
              <p>{cap.summary}</p>
              <span className="learn">{s.capExplore} ↗</span>
            </article>
          ))}
        </div>

        <div className="risk-detail" id="riskDetail" aria-live="polite">
          <div>
            <strong id="riskDetailTitle">{active.detailTitle}</strong>
            <p id="riskDetailText">{active.detailText}</p>
          </div>
          <div className="flex items-center gap-4 shrink-0">
            <span className="mono" id="riskDetailCode">
              {active.code}
            </span>
            <Link
              to={active.route}
              className="btn"
              style={{ minHeight: 42, padding: '0 16px', fontSize: 10 }}
            >
              {active.routeLabel} <span className="arrow">↗</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CapabilityGrid;
