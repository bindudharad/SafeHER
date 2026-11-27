import React from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../../contexts/I18nContext';

export const TechnologyStackSection: React.FC = () => {
  const { t } = useI18n();
  const s = t.landing.story;

  const layers = [
    {
      no: '01',
      title: s.tech1Title,
      desc: s.tech1Desc,
      tag: s.tech1Tag,
    },
    {
      no: '02',
      title: s.tech2Title,
      desc: s.tech2Desc,
      tag: s.tech2Tag,
    },
    {
      no: '03',
      title: s.tech3Title,
      desc: s.tech3Desc,
      tag: s.tech3Tag,
    },
  ];

  return (
    <section className="system-section" id="system">
      <div className="wrap system-grid">
        <div className="system-copy reveal">
          <div className="eyebrow">{s.techEyebrow}</div>
          <h2 className="display" style={{ marginTop: 22 }}>
            {s.techHeading1}
            <br />
            <span className="serif">{s.techHeading2}</span>
          </h2>
          <p>{s.techCopy}</p>
          <div className="flex flex-wrap gap-3">
            <Link className="btn primary" to="/reality-trust-center">
              {s.techPrimaryCta} <span className="arrow">↗</span>
            </Link>
            <Link className="btn" to="/detect">
              {s.techSecondaryCta} <span className="arrow">↗</span>
            </Link>
          </div>
        </div>

        <div className="system-stack reveal delay1">
          <div className="stack-glow" aria-hidden="true" />
          <div className="system-orbit" aria-hidden="true" />
          {layers.map((layer) => (
            <article key={layer.no} className="layer-card">
              <span className="layer-no">{layer.no}</span>
              <div>
                <h3>{layer.title}</h3>
                <p>{layer.desc}</p>
              </div>
              <span className="layer-tag">{layer.tag}</span>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TechnologyStackSection;
