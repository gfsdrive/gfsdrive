import React from 'react';

interface LogoProps {
  variant?: 'dark' | 'light';
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ variant = 'light', className = '' }) => {
  const primaryColor = variant === 'light' ? 'text-white' : 'text-[var(--midnight)]';
  const secondaryColor =
    variant === 'light' ? 'text-[#E6E6E6]/85' : 'text-[var(--text-muted-on-light)]';
  const accentColor =
    variant === 'light' ? 'text-[var(--champagne)]' : 'text-[var(--champagne-on-light)]';

  return (
    <span className={`inline-flex items-baseline gap-2.5 whitespace-nowrap shrink-0 ${className}`}>
      <span
        className={`font-brand font-medium text-lg sm:text-xl tracking-[0.14em] leading-none ${accentColor}`}
      >
        GFS
      </span>
      <span className="h-3.5 w-px bg-[var(--titanium)]/55 self-center" aria-hidden="true" />
      <span
        className={`font-brand font-normal text-sm sm:text-base tracking-[0.06em] uppercase leading-none ${primaryColor}`}
      >
        Drive <span className={secondaryColor}>Service</span>
      </span>
    </span>
  );
};
