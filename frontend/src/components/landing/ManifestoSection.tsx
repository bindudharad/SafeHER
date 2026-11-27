import React from 'react';
import { useI18n } from '../../contexts/I18nContext';
import { MovingTicker } from './MovingTicker';

export const ManifestoSection: React.FC = () => {
  const { t } = useI18n();
  const s = t.landing.story;

  return (
    <section className="manifesto">
      <div className="manifesto-wash" aria-hidden="true" />
      <MovingTicker phrases={[s.manifestoTicker1, s.manifestoTicker2]} />
      <div className="wrap">
        <h2 className="manifesto-title">
          <span>{s.manifestoLine1}</span>
          <span>{s.manifestoLine2}</span>
          <span>{s.manifestoLine3}</span>
        </h2>
        <div className="manifesto-foot">
          <p>{s.manifestoFoot}</p>
          <span className="mono">
            SAFEHER / PERSONAL SAFETY SYSTEM
            <br />
            CLIENT-SIDE FORENSICS &amp; CONFIDENTIAL SUPPORT
          </span>
        </div>
      </div>
      <MovingTicker
        className="bottom"
        phrases={[s.manifestoBottomTicker1, s.manifestoBottomTicker2]}
      />
    </section>
  );
};

export default ManifestoSection;
