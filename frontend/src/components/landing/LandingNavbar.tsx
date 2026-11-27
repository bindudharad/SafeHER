import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Globe, ShieldAlert } from 'lucide-react';
import { useI18n } from '../../contexts/I18nContext';
import type { Language } from '../../i18n';
import { useOptionalAuth } from '../../contexts/AuthContext';
import { QuickExitButton } from '../layout/QuickExitButton';

export interface LandingNavbarProps {
  activeSection: string;
  onOpenEmergency: () => void;
}

export const LandingNavbar: React.FC<LandingNavbarProps> = ({
  activeSection,
  onOpenEmergency,
}) => {
  const { language, setLanguage, t } = useI18n();
  const { isAuthenticated } = useOptionalAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const navItems = [
    { id: 'home', href: '#home', label: t.landing.story.navHome },
    { id: 'experience', href: '#experience', label: t.landing.story.navExperience },
    { id: 'protection', href: '#protection', label: t.landing.story.navProtection },
    { id: 'capabilities', href: '#capabilities', label: t.landing.story.navCapabilities },
    { id: 'live-demo', href: '#live-demo', label: t.landing.story.navDemo },
    { id: 'system', href: '#system', label: t.landing.story.navTechnology },
  ];

  const handleNavClick = () => {
    setMenuOpen(false);
  };

  return (
    <header className="topbar" id="topbar">
      <a
        className="brand"
        href="#home"
        aria-label="SafeHER home"
        onClick={() => setMenuOpen(false)}
      >
        <span className="brand-mark" aria-hidden="true">
          <span>S</span>
        </span>
        <span>
          SAFEHER
          <small>{t.landing.story.brandSub}</small>
        </span>
      </a>

      <nav
        className={`nav-links ${menuOpen ? 'open' : ''}`}
        id="navLinks"
        aria-label="Main navigation"
      >
        {navItems.map((item) => (
          <a
            key={item.id}
            href={item.href}
            className={activeSection === item.id ? 'active' : ''}
            onClick={handleNavClick}
          >
            {item.label}
          </a>
        ))}
        {menuOpen && (
          <>
            <Link to="/detect" onClick={handleNavClick}>
              {t.sidebar.detect}
            </Link>
            <Link to="/knowledge-hub" onClick={handleNavClick}>
              {t.sidebar.knowledgeHub}
            </Link>
          </>
        )}
      </nav>

      <div className="flex items-center gap-2 shrink-0">
        <label className="hidden md:inline-flex items-center gap-1.5 rounded-[3px] border border-[rgba(225,239,221,0.15)] bg-[#0d1110] px-2 py-1.5 text-[10px] font-mono text-[#929b93] shrink-0">
          <Globe className="w-3 h-3 text-[#d5ff54]" aria-hidden="true" />
          <select
            aria-label={t.navbar.selectLanguage}
            value={language}
            onChange={(e) => setLanguage(e.target.value as Language)}
            className="bg-transparent text-[#f0f2eb] font-mono text-[10px] uppercase tracking-[0.1em] outline-none cursor-pointer"
          >
            <option value="en" className="bg-[#0d1110] text-[#f0f2eb]">
              EN
            </option>
            <option value="kn" className="bg-[#0d1110] text-[#f0f2eb]">
              KN
            </option>
            <option value="hi" className="bg-[#0d1110] text-[#f0f2eb]">
              HI
            </option>
          </select>
        </label>

        <button
          type="button"
          onClick={onOpenEmergency}
          aria-label={t.common.emergencySupport}
          title={t.common.emergencySupport}
          className="hidden sm:inline-flex items-center gap-1.5 min-h-[34px] px-2.5 rounded-[3px] border border-[rgba(255,146,126,0.4)] bg-[rgba(255,146,126,0.12)] text-[#ff927e] font-mono text-[9px] uppercase tracking-[0.12em] hover:bg-[#ff927e] hover:text-[#170907] transition-colors cursor-pointer shrink-0 whitespace-nowrap"
        >
          <ShieldAlert className="w-3.5 h-3.5" aria-hidden="true" />
          <span>SOS 112</span>
        </button>

        <div className="hidden lg:inline-flex shrink-0">
          <QuickExitButton />
        </div>

        <Link
          className="btn nav-cta primary shrink-0"
          to={isAuthenticated ? '/dashboard' : '/login'}
        >
          {isAuthenticated ? t.nav.dashboard : t.landing.story.navCta}{' '}
          <span className="arrow" aria-hidden="true">
            ↗
          </span>
        </Link>

        <button
          type="button"
          className="menu-toggle"
          id="menuToggle"
          aria-label={t.navbar.toggleMenu}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((prev) => !prev)}
        >
          <i />
          <i />
        </button>
      </div>
    </header>
  );
};

export default LandingNavbar;
