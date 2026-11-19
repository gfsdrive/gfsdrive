import React, { useEffect, useRef, useState } from 'react';
import { animate, useInView, useReducedMotion } from 'motion/react';
import { SupportedLang } from '../i18n';
import { formatarMoeda } from '../lib/calcularPreco';

interface AnimatedCounterProps {
  target: number;
  decimals?: number;
  decimalSeparator?: string;
  duration?: number;
  className?: string;
}

export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
  target,
  decimals = 0,
  decimalSeparator = ',',
  duration = 1.0,
  className = '',
}) => {
  const prefersReduced = useReducedMotion();
  const ref = useRef<HTMLSpanElement | null>(null);
  const isInView = useInView(ref, { once: true, amount: 0.4 });
  const [displayValue, setDisplayValue] = useState<number>(target);

  useEffect(() => {
    if (prefersReduced || !isInView) {
      setDisplayValue(target);
      return;
    }
    const controls = animate(0, target, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (latest) => setDisplayValue(latest),
    });
    return () => controls.stop();
  }, [isInView, target, duration, prefersReduced]);

  const formatted =
    decimals > 0
      ? displayValue.toFixed(decimals).replace('.', decimalSeparator)
      : String(Math.round(displayValue));

  return (
    <span ref={ref} className={`tabular-nums ${className}`}>
      {formatted}
    </span>
  );
};

interface AnimatedCurrencyProps {
  value: number;
  lang: SupportedLang;
  className?: string;
  animateFromZeroTrigger?: number;
}

export const AnimatedCurrency: React.FC<AnimatedCurrencyProps> = ({
  value,
  lang,
  className = '',
  animateFromZeroTrigger = 0,
}) => {
  const prefersReduced = useReducedMotion();
  const prevRef = useRef<number>(animateFromZeroTrigger > 0 ? 0 : value);
  const prevTriggerRef = useRef<number>(animateFromZeroTrigger);
  const [displayValue, setDisplayValue] = useState<number>(value);

  useEffect(() => {
    if (prefersReduced) {
      prevRef.current = value;
      prevTriggerRef.current = animateFromZeroTrigger;
      setDisplayValue(value);
      return;
    }

    const isFirstTrigger =
      animateFromZeroTrigger > 0 && prevTriggerRef.current !== animateFromZeroTrigger;
    const start = isFirstTrigger ? 0 : prevRef.current;
    prevTriggerRef.current = animateFromZeroTrigger;
    prevRef.current = value;

    const controls = animate(start, value, {
      duration: isFirstTrigger ? 0.65 : 0.45,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (latest) => setDisplayValue(latest),
    });
    return () => controls.stop();
  }, [value, prefersReduced, animateFromZeroTrigger]);

  return <span className={`tabular-nums ${className}`}>{formatarMoeda(displayValue, lang)}</span>;
};
