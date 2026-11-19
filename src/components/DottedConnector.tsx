import React from 'react';
import { motion, useReducedMotion } from 'motion/react';

interface VerticalDottedConnectorProps {
  height?: number;
  className?: string;
}

export const VerticalDottedConnector: React.FC<VerticalDottedConnectorProps> = ({
  height = 48,
  className = '',
}) => {
  const prefersReduced = useReducedMotion();

  return (
    <svg
      width="12"
      height={height}
      viewBox={`0 0 12 ${height}`}
      fill="none"
      aria-hidden="true"
      className={`mx-auto overflow-visible ${className}`}
    >
      <circle cx="6" cy="3" r="2.2" fill="#C2A472" />
      {prefersReduced ? (
        <line
          x1="6"
          y1="8"
          x2="6"
          y2={height}
          stroke="#C2A472"
          strokeWidth="1.5"
          strokeDasharray="2 5"
          strokeLinecap="round"
        />
      ) : (
        <motion.line
          x1="6"
          y1="8"
          x2="6"
          y2={height}
          stroke="#C2A472"
          strokeWidth="1.5"
          strokeDasharray="2 5"
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0.2 }}
          whileInView={{ pathLength: 1, opacity: 0.9 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
        />
      )}
    </svg>
  );
};

interface HorizontalDottedConnectorProps {
  direction?: 'right' | 'left';
  className?: string;
}

export const HorizontalDottedConnector: React.FC<HorizontalDottedConnectorProps> = ({
  direction = 'right',
  className = '',
}) => {
  const prefersReduced = useReducedMotion();
  const isLeft = direction === 'left';

  return (
    <svg
      viewBox="0 0 180 12"
      fill="none"
      preserveAspectRatio="none"
      aria-hidden="true"
      className={`h-3 w-24 sm:w-36 lg:w-44 shrink-0 ${className}`}
    >
      {prefersReduced ? (
        <line
          x1={isLeft ? 174 : 6}
          y1="6"
          x2={isLeft ? 6 : 174}
          y2="6"
          stroke="#C2A472"
          strokeWidth="1.5"
          strokeDasharray="2 5"
          strokeLinecap="round"
        />
      ) : (
        <motion.line
          x1={isLeft ? 174 : 6}
          y1="6"
          x2={isLeft ? 6 : 174}
          y2="6"
          stroke="#C2A472"
          strokeWidth="1.5"
          strokeDasharray="2 5"
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0.25 }}
          whileInView={{ pathLength: 1, opacity: 0.95 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        />
      )}
      <circle cx={isLeft ? 6 : 174} cy="6" r="2.2" fill="#C2A472" />
    </svg>
  );
};
