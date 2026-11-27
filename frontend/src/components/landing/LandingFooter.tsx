import React from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../../contexts/I18nContext';
import { QuickExitButton } from '../layout/QuickExitButton';

export interface LandingFooterProps {
  onOpenEmergency: () => void;
}

export const LandingFooter: React.FC<LandingFooterProps> = ({
  onOpenEmergency,
}) => {
  const { t } = useI18n();
  const s = t.landing.story;

  return (
    <footer className="footer">
      <div className="wrap">
        <div className="footer-top">
          <div className="footer-brand">
            <a className="brand" href="#home" aria-label="SafeHER home">
              <span className="brand-mark" aria-hidden="true">
                <span>S</span>
              </span>
              <span>
                SAFEHER
                <small>{s.brandSub}</small>
              </span>
            </a>
            <p>{s.footerDesc}</p>
            <span className="pill">
              <span className="dot" aria-hidden="true" /> {s.footerPill}
            </span>
          </div>

          <div className="footer-cols">
            <div>
              <h4>{s.footerCol1}</h4>
              <a href="#experience">{s.navExperience}</a>
              <a href="#protection">{s.navProtection}</a>
              <a href="#capabilities">{s.navCapabilities}</a>
              <a href="#live-demo">{s.navDemo}</a>
            </div>
            <div>
              <h4>{s.footerCol2}</h4>
              <Link to="/detect">{t.sidebar.detect}</Link>
              <Link to="/evidence">{t.sidebar.evidenceVault}</Link>
              <Link to="/reality-trust-center">{t.sidebar.realityTrustCenter}</Link>
              <Link to="/knowledge-hub">{t.sidebar.knowledgeHub}</Link>
            </div>
            <div>
              <h4>{s.footerCol3}</h4>
              <Link to="/complaints">{t.sidebar.complaintAssistant}</Link>
              <Link to="/settings">{t.sidebar.privacySettings}</Link>
              <button
                type="button"
                onClick={onOpenEmergency}
                className="block text-left text-[12px] text-[#ff927e] mb-2.5 hover:underline cursor-pointer bg-transparent border-0 p-0 font-sans"
              >
                {t.common.emergencySupport} (112 / 181)
              </button>
              <a href="#home">Back to top ↑</a>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <span>© 2026 SAFEHER / DIGITAL SAFETY &amp; FORENSIC PLATFORM</span>
          <span className="flex flex-wrap items-center gap-4">
            <span>
              <b>CONFIDENTIAL WORKSPACE</b> · DEMO PREVIEW SECTIONS CLEARLY LABELED
            </span>
            <QuickExitButton />
          </span>
        </div>
      </div>
    </footer>
  );
};

export default LandingFooter;
