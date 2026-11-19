import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Calculator, MessageCircle } from 'lucide-react';
import { buildWhatsAppLink } from '../config/site';
import { useSimulator } from '../context/SimulatorContext';

interface FloatingWhatsAppButtonProps {
  routeKey: 'home' | 'senior' | 'qr' | 'notFound';
}

export const FloatingWhatsAppButton: React.FC<FloatingWhatsAppButtonProps> = ({ routeKey }) => {
  const { t } = useTranslation();
  const prefersReduced = useReducedMotion();
  const { openDrawer, isDrawerOpen } = useSimulator();
  const url = buildWhatsAppLink(t('floatingWhatsApp.defaultMessage'));

  const [pastHero, setPastHero] = useState<boolean>(routeKey !== 'home');
  const [hideNearInlineOrFooter, setHideNearInlineOrFooter] = useState<boolean>(false);
  const [isSimVisible, setIsSimVisible] = useState<boolean>(false);
  const [shouldPulseOnce, setShouldPulseOnce] = useState<boolean>(false);

  const clickedOnceRef = useRef<boolean>(false);
  const pulseDoneRef = useRef<boolean>(false);

  // Observar Hero, Simulador inline e Footer para visibilidade dos botões flutuantes no desktop e mobile
  useEffect(() => {
    setPastHero(routeKey !== 'home');
    setHideNearInlineOrFooter(false);
    setIsSimVisible(false);

    const heroEl = document.getElementById('hero');
    const simEl = document.getElementById('simulador');
    const footerEl = document.getElementById('site-footer');

    let heroVisible = Boolean(heroEl);
    let simVisible = false;
    let footerVisible = false;

    const recompute = () => {
      setPastHero(routeKey !== 'home' || !heroVisible);
      setHideNearInlineOrFooter(simVisible || footerVisible);
      setIsSimVisible(simVisible);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.target === heroEl) heroVisible = entry.isIntersecting;
          if (entry.target === simEl) simVisible = entry.isIntersecting;
          if (entry.target === footerEl) footerVisible = entry.isIntersecting;
        }
        recompute();
      },
      { threshold: 0.08 }
    );

    if (heroEl) observer.observe(heroEl);
    if (simEl) observer.observe(simEl);
    if (footerEl) observer.observe(footerEl);

    return () => observer.disconnect();
  }, [routeKey]);

  // Pulso discreto no contorno após 20 segundos de rolagem sem clique (uma única vez por visita)
  useEffect(() => {
    if (prefersReduced || pulseDoneRef.current || clickedOnceRef.current) return;

    let timer: number | null = null;
    const armTimer = () => {
      if (timer !== null || pulseDoneRef.current || clickedOnceRef.current) return;
      timer = window.setTimeout(() => {
        if (!clickedOnceRef.current && !pulseDoneRef.current) {
          pulseDoneRef.current = true;
          setShouldPulseOnce(true);
        }
      }, 20000);
    };

    const onScroll = () => {
      if (window.scrollY > 120) {
        armTimer();
      }
    };

    if (window.scrollY > 120) {
      armTimer();
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (timer !== null) window.clearTimeout(timer);
    };
  }, [prefersReduced]);

  const handleOpenSimulator = (e: React.MouseEvent<HTMLButtonElement>) => {
    clickedOnceRef.current = true;
    setShouldPulseOnce(false);
    openDrawer(undefined, e.currentTarget);
  };

  const showDesktopStack = pastHero && !hideNearInlineOrFooter && !isDrawerOpen;

  return (
    <>
      {/* Desktop: botão WhatsApp circular menor em Midnight Black logo acima da pílula Champagne Gold "Simular valor" */}
      <AnimatePresence>
        {showDesktopStack && (
          <motion.div
            initial={prefersReduced ? { opacity: 1 } : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={prefersReduced ? { opacity: 0 } : { opacity: 0, y: 16 }}
            transition={{ duration: prefersReduced ? 0 : 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="hidden md:flex fixed bottom-6 right-6 z-40 flex-col items-end gap-3"
          >
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t('floatingWhatsApp.label')}
              title={t('floatingWhatsApp.label')}
              className="w-12 h-12 rounded-full bg-[var(--midnight)] hover:bg-[#191919] text-[var(--champagne)] border border-[var(--champagne)]/80 flex items-center justify-center shadow-lg transition-colors"
            >
              <MessageCircle className="w-5 h-5" strokeWidth={1.75} aria-hidden="true" />
            </a>

            <button
              type="button"
              onClick={handleOpenSimulator}
              className={`min-h-[54px] px-6 py-3 inline-flex items-center gap-2.5 bg-[var(--champagne)] hover:bg-[#D1B483] text-[var(--midnight)] font-brand font-medium text-base rounded-full shadow-[0_10px_28px_rgba(0,0,0,0.35)] transition-colors whitespace-nowrap gfs-btn-slide ${
                shouldPulseOnce ? 'gfs-pulse-once' : ''
              }`}
            >
              <Calculator className="w-5 h-5 shrink-0" strokeWidth={1.75} aria-hidden="true" />
              <span>{t('floatingWhatsApp.simulatePill')}</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile: barra fixa inferior na zona do polegar (oculta enquanto o drawer está aberto ou enquanto o simulador inline está em tela) */}
      {!isDrawerOpen && !isSimVisible && (
        <div
          role="region"
          aria-label={t('nav.agendarAgora')}
          className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-[var(--midnight)] border-t border-white/15 px-3 py-2 flex items-center gap-2.5"
        >
          <button
            type="button"
            onClick={handleOpenSimulator}
            className="flex-1 min-h-[48px] px-3 inline-flex items-center justify-center gap-2 bg-[var(--champagne)] active:bg-[#B2925E] text-[var(--midnight)] font-medium text-base rounded-[4px] whitespace-nowrap"
          >
            <Calculator className="w-4 h-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
            <span>{t('mobileBar.simulate')}</span>
          </button>

          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 min-h-[48px] px-3 inline-flex items-center justify-center gap-2 border border-white/30 active:bg-white/10 text-white font-medium text-base rounded-[4px] whitespace-nowrap"
          >
            <MessageCircle className="w-4 h-4 text-[var(--champagne)] shrink-0" strokeWidth={1.75} aria-hidden="true" />
            <span>{t('mobileBar.whatsapp')}</span>
          </a>
        </div>
      )}
    </>
  );
};
