import React, { useState } from 'react';
import { CarFront } from 'lucide-react';

interface AccessibleImageProps {
  src: string;
  alt: string;
  fallbackLabel: string;
  className?: string;
  loading?: 'lazy' | 'eager';
  fetchPriority?: 'high' | 'low' | 'auto';
  sizes?: string;
}

export const AccessibleImage: React.FC<AccessibleImageProps> = ({
  src,
  alt,
  fallbackLabel,
  className = '',
  loading = 'lazy',
  fetchPriority = 'auto',
  sizes,
}) => {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={`flex flex-col items-center justify-center gap-3 p-6 text-center bg-gradient-to-br from-[#2C3946] via-[#232E39] to-[#0D0D0D] text-white ${className}`}
      >
        <CarFront className="w-10 h-10 text-[#C2A472]" strokeWidth={1.5} aria-hidden="true" />
        <p className="text-base font-medium text-[#E6E6E6] max-w-xs">{fallbackLabel}</p>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading={loading}
      fetchPriority={fetchPriority}
      sizes={sizes}
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
};
