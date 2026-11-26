import React from 'react'

interface MarqueeBandProps {
  direction?: 'left' | 'right'
  items?: string[]
  className?: string
  speed?: 'normal' | 'slow'
}

const DEFAULT_ITEMS = [
  'EVIDENCE INTEGRITY PRESERVED UNDER DPDP ACT 2023',
  'CLIENT-SIDE SHA-256 ZERO-KNOWLEDGE CRYPTOGRAPHIC CHECKSUMS',
  'AUTONOMOUS MULTI-MODAL SYNTHETIC MEDIA DETECTION',
  'SECTION 65B TAMPER-EVIDENT EVIDENCE VAULT',
  'NON-CONSENSUAL CONTENT HASH SYNDICATE INTEGRATION',
  'NATIONAL CYBERCRIME REPORTING PORTAL DIRECT DISPATCH',
]

export const MarqueeBand: React.FC<MarqueeBandProps> = ({
  direction = 'left',
  items = DEFAULT_ITEMS,
  className = '',
  speed = 'slow',
}) => {
  const animClass =
    speed === 'slow'
      ? direction === 'left'
        ? 'animate-marquee-slow-left'
        : 'animate-marquee-slow-right'
      : direction === 'left'
      ? 'animate-marquee-left'
      : 'animate-marquee-right'

  const content = items.join(' • ')

  return (
    <div
      className={`relative w-full overflow-hidden border-y border-zcyan/20 bg-black/90 py-2.5 sm:py-3 select-none ${className}`}
      style={{ maskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)' }}
    >
      <div className={`flex w-max ${animClass} hover:[animation-play-state:paused]`}>
        {/* Track 1 */}
        <div className="flex items-center shrink-0">
          <span className="font-mono text-xs sm:text-[13px] tracking-[0.2em] uppercase text-zcyan/90 px-4">
            {content} •&nbsp;
          </span>
        </div>
        {/* Track 2 (Duplicate for infinite seamless loop) */}
        <div className="flex items-center shrink-0">
          <span className="font-mono text-xs sm:text-[13px] tracking-[0.2em] uppercase text-zcyan/90 px-4">
            {content} •&nbsp;
          </span>
        </div>
      </div>
    </div>
  )
}
