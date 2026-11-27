import React from 'react';
import { useI18n } from '../../contexts/I18nContext';

export const JourneyPathSection: React.FC = () => {
  const { t } = useI18n();
  const s = t.landing.story;

  const steps = [
    {
      no: '01',
      kicker: s.pathStep1Kicker,
      title: s.pathStep1Title,
      desc: s.pathStep1Desc,
      delayClass: '',
    },
    {
      no: '02',
      kicker: s.pathStep2Kicker,
      title: s.pathStep2Title,
      desc: s.pathStep2Desc,
      delayClass: 'delay1',
    },
    {
      no: '03',
      kicker: s.pathStep3Kicker,
      title: s.pathStep3Title,
      desc: s.pathStep3Desc,
      delayClass: '',
    },
    {
      no: '04',
      kicker: s.pathStep4Kicker,
      title: s.pathStep4Title,
      desc: s.pathStep4Desc,
      delayClass: 'delay1',
    },
  ];

  const svgPath =
    'M215 0 C215 120 70 95 70 230 C70 355 360 340 360 470 C360 610 70 590 70 730 C70 845 215 820 215 920';

  return (
    <section className="path-section" id="protection">
      <div className="wrap">
        <div className="section-head reveal">
          <div>
            <div className="eyebrow">{s.pathEyebrow}</div>
            <h2 className="display" style={{ marginTop: 22 }}>
              {s.pathHeading1}
              <br />
              <span className="serif">{s.pathHeading2}</span> {s.pathHeading3}
            </h2>
          </div>
          <p className="copy">{s.pathCopy}</p>
        </div>

        <div className="path-wrap">
          <svg
            className="path-svg"
            viewBox="0 0 430 920"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path d={svgPath} />
            <path className="active-path" d={svgPath} />
            <path className="scroll-trace" d={svgPath} />
            <circle cx="215" cy="5" r="5" />
            <circle cx="70" cy="230" r="5" />
            <circle cx="360" cy="470" r="5" />
            <circle cx="70" cy="730" r="5" />
            <circle cx="215" cy="915" r="5" />
          </svg>

          <div className="path-steps">
            {steps.map((step) => (
              <article
                key={step.no}
                className={`path-step reveal ${step.delayClass}`.trim()}
              >
                <span className="step-kicker">{step.kicker}</span>
                <span className="step-no">{step.no}</span>
                <h3>{step.title}</h3>
                <p>{step.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default JourneyPathSection;
