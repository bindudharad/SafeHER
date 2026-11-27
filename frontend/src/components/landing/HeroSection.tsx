import React from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../../contexts/I18nContext';
import { useOptionalAuth } from '../../contexts/AuthContext';
import { HeroSpatialScene } from './HeroSpatialScene';

export interface HeroSectionProps {
  reducedMotion?: boolean;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ reducedMotion = false }) => {
  const { t } = useI18n();
  const { isAuthenticated } = useOptionalAuth();
  const s = t.landing.story;

  return (
    <section className="hero" id="home">
      <div className="hero-grid" aria-hidden="true" />
      <div className="hero-visual" aria-label="Animated 3D safety network visualization">
        <HeroSpatialScene reducedMotion={reducedMotion} />
        <div className="hero-vignette" aria-hidden="true" />
        <div className="hud hud-a">
          <small>{s.hudStatusLabel}</small>
          <strong>
            <span className="dot" aria-hidden="true" /> {s.hudStatusValue}
          </strong>
          <small>{s.hudStatusSub}</small>
        </div>
        <div className="hud hud-b">
          <small>{s.hudVaultLabel}</small>
          <strong>{s.hudVaultValue}</strong>
          <small>{s.hudVaultSub}</small>
        </div>
        <div className="hud hud-c">
          <small>{s.hudSignalLabel}</small>
          <strong>{s.hudSignalValue}</strong>
          <small>{s.hudSignalSub}</small>
        </div>
      </div>

      <div className="wrap hero-layout">
        <div className="hero-copy">
          <div className="eyebrow">
            {s.heroEyebrow} <span className="mono">/ 001</span>
          </div>
          <h1 className="hero-title">
            {s.heroLine1}
            <br />
            <span className="line2">{s.heroLine2}</span>
            <span className="line3">{s.heroLine3}</span>
          </h1>
          <p className="hero-desc">{s.heroDesc}</p>
          <div className="hero-actions">
            <a className="btn primary" href="#experience">
              {s.heroPrimaryCta}{' '}
              <span className="arrow" aria-hidden="true">
                ↗
              </span>
            </a>
            <Link className="btn" to={isAuthenticated ? '/dashboard' : '/detect'}>
              {isAuthenticated ? s.heroWorkspaceCta : s.heroSecondaryCta}{' '}
              <span className="arrow" aria-hidden="true">
                ↗
              </span>
            </Link>
            <a className="btn" href="#live-demo">
              {s.heroDemoCta}{' '}
              <span className="arrow" aria-hidden="true">
                ↓
              </span>
            </a>
          </div>
          <div className="hero-meta">
            <span>
              <b>01</b> / {s.heroMeta1}
            </span>
            <span>
              <b>02</b> / {s.heroMeta2}
            </span>
            <span>
              <b>03</b> / {s.heroMeta3}
            </span>
          </div>
        </div>
      </div>

      <div className="hero-coord" aria-hidden="true">
        12°58&apos; N&nbsp;&nbsp; 77°35&apos; E&nbsp;&nbsp; /&nbsp;&nbsp; SAFEHER NETWORK
      </div>
      <div className="scroll-cue" aria-hidden="true">
        {s.scrollCue}
      </div>
    </section>
  );
};

export default HeroSection;
