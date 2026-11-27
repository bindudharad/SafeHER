import React from 'react';

export interface MovingTickerProps {
  phrases: string[];
  className?: string;
}

export const MovingTicker: React.FC<MovingTickerProps> = ({
  phrases,
  className = '',
}) => {
  const repeated = [...phrases, ...phrases, ...phrases];

  return (
    <div className={`ticker ${className}`.trim()} aria-hidden="true">
      <div className="ticker-track">
        {repeated.map((phrase, idx) => (
          <span key={`${phrase}-${idx}`}>
            {phrase} <i>✳</i>
          </span>
        ))}
      </div>
    </div>
  );
};

export default MovingTicker;
