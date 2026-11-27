import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { useI18n } from '../../contexts/I18nContext';
import { useOptionalAuth } from '../../contexts/AuthContext';
import { apiClient } from '../../services/api/client';
import type { TrustedContact, JourneyCheckin } from '../../types';

export interface InteractiveDemoSectionProps {
  onOpenEmergency: () => void;
}

type DemoMapStatusMode = 'ready' | 'active' | 'checked_in' | 'sos' | 'account_active';

export const InteractiveDemoSection: React.FC<InteractiveDemoSectionProps> = ({
  onOpenEmergency,
}) => {
  const { t } = useI18n();
  const s = t.landing.story;
  const { isAuthenticated } = useOptionalAuth();

  const [contacts, setContacts] = useState<TrustedContact[]>([]);
  const [liveSession, setLiveSession] = useState<JourneyCheckin | null>(null);
  const [journeyActive, setJourneyActive] = useState(false);
  const [sosActive, setSosActive] = useState(false);
  const [statusMode, setStatusMode] = useState<DemoMapStatusMode>('ready');
  const [modalOpen, setModalOpen] = useState(false);
  const [toastText, setToastText] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const showToast = (msg: string) => {
    setToastText(msg);
  };

  useEffect(() => {
    if (!toastText) return;
    const timer = window.setTimeout(() => setToastText(null), 2600);
    return () => window.clearTimeout(timer);
  }, [toastText]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setModalOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setContacts([]);
      setLiveSession(null);
      return;
    }
    let cancelled = false;
    Promise.allSettled([
      apiClient.listTrustedContacts(),
      apiClient.getActiveJourneyCheckin(),
    ]).then(([contactsRes, sessionRes]) => {
      if (cancelled) return;
      if (contactsRes.status === 'fulfilled') {
        setContacts(contactsRes.value);
      }
      if (sessionRes.status === 'fulfilled' && sessionRes.value) {
        setLiveSession(sessionRes.value);
        setJourneyActive(true);
        setStatusMode('account_active');
      }
    });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  const handleToggleJourney = async () => {
    if (busy) return;
    setSosActive(false);

    if (isAuthenticated) {
      setBusy(true);
      try {
        if (liveSession && journeyActive) {
          await apiClient.completeJourneyCheckin(liveSession.id);
          setLiveSession(null);
          setJourneyActive(false);
          setStatusMode('ready');
          showToast(s.demoToastEnd);
        } else {
          const started = await apiClient.startJourneyCheckin(
            'Planned Route Check-in',
            30
          );
          setLiveSession(started);
          setJourneyActive(true);
          setStatusMode('account_active');
          showToast(s.demoToastStart);
        }
        return;
      } catch {
        // Gracefully fall back to honest local UI demo state
      } finally {
        setBusy(false);
      }
    }

    const next = !journeyActive;
    setJourneyActive(next);
    setStatusMode(next ? 'active' : 'ready');
    showToast(next ? s.demoToastStart : s.demoToastEnd);
  };

  const handleCheckIn = () => {
    if (!journeyActive) {
      showToast(s.demoToastNeedStart);
      return;
    }
    setStatusMode('checked_in');
    showToast(s.demoToastCheckin);
  };

  const handleRunSosSimulation = () => {
    setModalOpen(false);
    setSosActive(true);
    setStatusMode('sos');
    showToast(s.demoToastSos);
  };

  const statusMessage =
    statusMode === 'sos'
      ? s.demoMapSos
      : statusMode === 'checked_in'
      ? s.demoMapCheckedIn
      : statusMode === 'account_active' && liveSession
      ? `Saved safety check-in active (${liveSession.duration_minutes} min window)`
      : statusMode === 'active'
      ? s.demoMapActive
      : s.demoMapReady;

  const stateBadge = sosActive
    ? 'SOS DEMO ACTIVE'
    : journeyActive
    ? isAuthenticated && liveSession
      ? 'SESSION RECORDED'
      : 'DEMO ACTIVE'
    : 'DEMO READY';

  const initialsList =
    contacts.length > 0
      ? contacts.slice(0, 3).map((c) =>
          c.name
            .split(' ')
            .map((p) => p[0] ?? '')
            .join('')
            .slice(0, 2)
            .toUpperCase() || 'TC'
        )
      : ['AM', 'RK', 'SJ'];

  return (
    <section className="demo-section" id="live-demo">
      <div className="wrap">
        <div className="section-head reveal">
          <div>
            <div className="eyebrow">{s.demoEyebrow}</div>
            <h2 className="display" style={{ marginTop: 22 }}>
              {s.demoHeading1}
              <br />
              {s.demoHeading2} <span className="serif">{s.demoHeading3}</span>
            </h2>
          </div>
          <p className="copy">{s.demoCopy}</p>
        </div>

        <div className="demo-shell reveal">
          <div className="demo-main">
            <div className="demo-top">
              <strong>
                {s.demoTopTitle}{' '}
                <span className="muted">
                  / {isAuthenticated ? 'safety workspace sync' : 'demo preview'}
                </span>
              </strong>
              <span
                className="live"
                style={sosActive ? { color: '#ff927e' } : undefined}
              >
                <span
                  className="dot"
                  style={
                    sosActive
                      ? { background: '#ff927e', boxShadow: '0 0 12px #ff927e' }
                      : undefined
                  }
                  aria-hidden="true"
                />
                <span id="journeyState">{stateBadge}</span>
              </span>
            </div>

            <div
              className="map-panel"
              id="mapPanel"
              aria-label="Illustrative journey map demo"
            >
              <span className="map-label l1">Sample Sector A</span>
              <span className="map-label l2">Transit Corridor</span>
              <span className="map-label l3">District Grid</span>
              <span className="map-label l4">Check-in Node</span>

              <svg
                className="map-route"
                viewBox="0 0 600 430"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <path
                  className="route-glow"
                  d="M80 340 C155 315 160 235 248 250 S360 145 430 152 493 80 520 52"
                />
                <path
                  className="route-line"
                  d="M80 340 C155 315 160 235 248 250 S360 145 430 152 493 80 520 52"
                />
                <path
                  className="route-draw"
                  d="M80 340 C155 315 160 235 248 250 S360 145 430 152 493 80 520 52"
                />
              </svg>

              <span className="map-pin start" aria-hidden="true" />
              <span className="map-pin end" aria-hidden="true" />
              <span className="you-tag">START (ILLUSTRATIVE)</span>
              <span className="dest-tag">CHECK-IN POINT</span>

              <div className="map-status">
                <span
                  className="dot"
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: sosActive ? '#ff927e' : '#d5ff54',
                    flexShrink: 0,
                  }}
                  aria-hidden="true"
                />
                <span id="mapStatus">{statusMessage}</span>
              </div>
            </div>

            <div className="demo-controls">
              <div className="mono">{s.demoPreviewCaption}</div>
              <div className="buttons">
                <button
                  type="button"
                  className="btn primary"
                  id="startJourney"
                  disabled={busy}
                  onClick={handleToggleJourney}
                >
                  {journeyActive ? (
                    <>
                      {s.demoBtnEnd} <span className="arrow">×</span>
                    </>
                  ) : (
                    <>
                      {s.demoBtnStart} <span className="arrow">↗</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  className="btn"
                  id="checkIn"
                  onClick={handleCheckIn}
                >
                  {s.demoBtnCheckIn}
                </button>
              </div>
            </div>
          </div>

          <aside className="demo-side">
            <div className="contact-card">
              <div className="side-head">
                <h3>{s.demoCircleTitle}</h3>
                <span className="mono">
                  {contacts.length > 0
                    ? `${String(contacts.length).padStart(2, '0')} SAVED`
                    : 'DEMO SAMPLE'}
                </span>
              </div>
              <div className="avatar-row">
                {initialsList.map((initials, idx) => (
                  <span key={`${initials}-${idx}`} className="avatar">
                    {initials}
                  </span>
                ))}
                <Link
                  to={isAuthenticated ? '/settings' : '/login'}
                  className="avatar add"
                  title="Manage trusted contacts in Privacy & Safety Settings"
                  aria-label="Manage trusted contacts"
                >
                  +
                </Link>
              </div>
              <div className="contact-line">
                <strong>
                  {contacts.length > 0 ? s.demoContactsSaved : s.demoContactsSample}
                </strong>
                <span className="status-pill-dot">
                  {contacts.length > 0 ? 'CONFIGURED' : 'PREVIEW'}
                </span>
              </div>
            </div>

            <div className="contact-card">
              <div className="mono">{s.demoToolsLabel}</div>
              <div className="contact-line">
                <strong>{s.demoEvidenceVault}</strong>
                <Link to="/evidence" className="status-pill-dot hover:underline">
                  OPEN VAULT
                </Link>
              </div>
              <div className="contact-line">
                <strong>{s.demoCheckInWindow}</strong>
                <span className="status-pill-dot">
                  {liveSession ? `${liveSession.duration_minutes} MIN` : 'DEMO UI'}
                </span>
              </div>
            </div>

            <div className="side-stat">
              <div>
                <b id="sessionStatus">
                  {sosActive ? 'SOS' : journeyActive ? 'ON' : '—'}
                </b>
                <small>{s.demoSessionStat}</small>
              </div>
              <div>
                <b>{isAuthenticated && liveSession ? 'API' : 'DEMO'}</b>
                <small>{s.demoModeStat}</small>
              </div>
            </div>

            <button
              type="button"
              className="sos-button"
              id="sosButton"
              onClick={() => setModalOpen(true)}
            >
              <ShieldAlert className="w-4 h-4" aria-hidden="true" />
              <span>{s.demoSosBtn}</span>
            </button>

            <button
              type="button"
              onClick={onOpenEmergency}
              className="w-full py-2.5 px-3 border border-[rgba(225,239,221,0.15)] bg-[#0d1110] text-[#f0f2eb] font-mono text-[10px] uppercase tracking-[0.14em] hover:border-[#ff927e] hover:text-[#ff927e] transition-colors cursor-pointer"
            >
              {s.demoRealHelpBtn} ↗
            </button>

            <p className="demo-note">{s.demoDisclaimer}</p>
          </aside>
        </div>
      </div>

      {/* SOS Demo Modal */}
      <div
        className={`safeher-modal-overlay ${modalOpen ? 'open' : ''}`}
        id="sosModal"
        role="dialog"
        aria-modal="true"
        aria-hidden={!modalOpen}
        hidden={!modalOpen}
        aria-labelledby="modalTitle"
        onClick={(e) => {
          if (e.target === e.currentTarget) setModalOpen(false);
        }}
      >
        <div className="safeher-modal-box">
          <button
            type="button"
            className="safeher-modal-x"
            id="closeModal"
            aria-label="Close dialog"
            onClick={() => setModalOpen(false)}
          >
            ×
          </button>
          <div className="eyebrow">{s.sosModalEyebrow}</div>
          <h2 id="modalTitle">{s.sosModalTitle}</h2>
          <p>{s.sosModalDesc}</p>
          <div className="safeher-modal-actions">
            <button
              type="button"
              className="btn"
              id="cancelSos"
              onClick={() => setModalOpen(false)}
            >
              {t.common.cancel}
            </button>
            <button
              type="button"
              className="btn primary"
              id="confirmSos"
              onClick={handleRunSosSimulation}
            >
              {s.sosModalConfirm} <span className="arrow">↗</span>
            </button>
          </div>
        </div>
      </div>

      <div
        className={`safeher-landing-toast ${toastText ? 'show' : ''}`}
        id="toast"
        role="status"
        aria-live="polite"
      >
        {toastText ?? ''}
      </div>
    </section>
  );
};

export default InteractiveDemoSection;
