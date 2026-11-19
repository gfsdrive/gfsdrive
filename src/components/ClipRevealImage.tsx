import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { AccessibleImage } from './AccessibleImage';

interface ClipRevealImageProps {
  src: string;
  alt: string;
  fallbackLabel: string;
  className?: string;
  containerClassName?: string;
  loading?: 'lazy' | 'eager';
  sizes?: string;
}

export const ClipRevealImage: React.FC<ClipRevealImageProps> = ({
  src,
  alt,
  fallbackLabel,
  className = 'w-full h-full object-cover',
  containerClassName = '',
  loading = 'lazy',
  sizes = '(max-width: 1024px) 100vw, 50vw',
}) => {
  const prefersReduced = useReducedMotion();

  if (prefersReduced) {
    return (
      <div className={`overflow-hidden ${containerClassName}`}>
        <AccessibleImage
          src={src}
          alt={alt}
          fallbackLabel={fallbackLabel}
          loading={loading}
          sizes={sizes}
          className={className}
        />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ clipPath: 'inset(0 100% 0 0)' }}
      whileInView={{ clipPath: 'inset(0 0% 0 0)' }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
      className={`overflow-hidden ${containerClassName}`}
    >
      <motion.div
        initial={{ scale: 1.08 }}
        whileInView={{ scale: 1 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 1.0, ease: [0.16, 1, 0.3, 1] }}
        className="w-full h-full"
      >
        <AccessibleImage
          src={src}
          alt={alt}
          fallbackLabel={fallbackLabel}
          loading={loading}
          sizes={sizes}
          className={className}
        />
      </motion.div>
    </motion.div>
  );
};
