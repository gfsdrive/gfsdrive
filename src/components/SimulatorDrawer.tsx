import React, { useEffect, useId, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { X } from 'lucide-react';
import { useSimulator } from '../context/SimulatorContext';
import { SimulatorWizard } from './SimulatorWizard';

interface SimulatorDrawerProps {
  mapsAvailable: boolean;
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export const SimulatorDrawer: React.FC<SimulatorDrawerProps> = ({ mapsAvailable }) => {
  const { t } = useTranslation();
  const { isDrawerOpen, closeDrawer, drawerOrigemFluxo, drawerQrBanner, step } = useSimulator();
  const prefersReduced = useReducedMotion();
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const bodyScrollRef = useRef<HTMLDivElement | null>(null);

  // Travar scroll da página de fundo enquanto o drawer estiver aberto
  useEffect(() => {
    if (!isDrawerOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isDrawerOpen]);

  // Focar o primeiro controle interativo do formulário (ou o botão fechar) ao abrir
  useEffect(() => {
    if (!isDrawerOpen) return;
    const timer = window.setTimeout(() => {
      const container = dialogRef.current;
      if (!container) return;
      const firstInput = container.querySelector<HTMLElement>(
        'input:not([disabled]), select:not([disabled]), textarea:not([disabled])'
      );
      if (firstInput) {
        firstInput.focus();
        return;
      }
      const focusables = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
      const preferred = focusables.find((el) => el.dataset.drawerClose !== 'true') ?? focusables[0];
      preferred?.focus();
    }, 60);
    return () => window.clearTimeout(timer);
  }, [isDrawerOpen]);

  // Rolar topo do corpo do drawer ao mudar de etapa
  useEffect(() => {
    if (!isDrawerOpen) return;
    bodyScrollRef.current?.scrollTo({ top: 0, behavior: prefersReduced ? 'auto' : 'smooth' });
  }, [step, isDrawerOpen, prefersReduced]);

  // Tecla Esc + focus trap dentro do drawer
  useEffect(() => {
    if (!isDrawerOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeDrawer();
        return;
      }

      if (e.key === 'Tab') {
        const container = dialogRef.current;
        if (!container) return;
        const focusables = Array.from(
          container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
        ).filter((el) => el.offsetParent !== null);
        if (focusables.length === 0) return;

        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement as HTMLElement | null;

        if (e.shiftKey) {
          if (!active || active === first || !container.contains(active)) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (!active || active === last || !container.contains(active)) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDrawerOpen, closeDrawer]);

  return (
    <AnimatePresence>
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end items-end md:items-stretch">
          {/* Backdrop escuro */}
          <motion.div
            initial={{ opacity: prefersReduced ? 1 : 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: prefersReduced ? 1 : 0 }}
            transition={{ duration: prefersReduced ? 0 : 0.2 }}
            onClick={closeDrawer}
            aria-hidden="true"
            className="fixed inset-0 bg-black/75 backdrop-blur-[2px]"
          />

          {/* Painel lateral (Desktop 480px à direita) / Folha em tela cheia (Mobile de baixo para cima) */}
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            initial={
              prefersReduced
                ? { opacity: 1 }
                : typeof window !== 'undefined' && window.innerWidth >= 768
                  ? { x: '100%' }
                  : { y: '100%' }
            }
            animate={{ x: 0, y: 0, opacity: 1 }}
            exit={
              prefersReduced
                ? { opacity: 0 }
                : typeof window !== 'undefined' && window.innerWidth >= 768
                  ? { x: '100%' }
                  : { y: '100%' }
            }
            transition={{ duration: prefersReduced ? 0 : 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 w-full h-[100dvh] md:w-[480px] md:max-w-[92vw] bg-[var(--ivory)] text-[var(--midnight)] shadow-2xl border-l border-white/15 flex flex-col overflow-hidden"
          >
            {/* Alça visual mobile + Cabeçalho do Drawer */}
            <div className="bg-[var(--midnight)] text-white px-5 py-3.5 border-b border-white/15 shrink-0">
              <div className="md:hidden flex justify-center pb-2" aria-hidden="true">
                <span className="w-10 h-1 rounded-full bg-white/30 block" />
              </div>

              <div className="flex items-center justify-between gap-4">
                <div>
                  <span className="eyebrow text-[var(--champagne)] block">
                    {t('simulator.eyebrow')}
                  </span>
                  <h2 id={titleId} className="font-brand font-medium text-xl text-white">
                    {t('drawer.title')}
                  </h2>
                </div>

                <button
                  type="button"
                  data-drawer-close="true"
                  onClick={closeDrawer}
                  aria-label={t('drawer.close')}
                  className="min-h-[48px] px-4 inline-flex items-center gap-2 border border-white/25 hover:border-[var(--champagne)] bg-white/5 hover:bg-white/10 text-white text-base font-medium rounded-[4px] transition-colors shrink-0"
                >
                  <X className="w-5 h-5 text-[var(--champagne)]" strokeWidth={1.75} aria-hidden="true" />
                  <span>{t('drawer.close')}</span>
                </button>
              </div>
            </div>

            {/* Corpo rolável com o mesmo componente SimulatorWizard */}
            <div ref={bodyScrollRef} className="flex-1 overflow-y-auto">
              <SimulatorWizard
                mapsAvailable={mapsAvailable}
                variant="drawer"
                origemFluxo={drawerOrigemFluxo}
                qrBanner={drawerQrBanner}
              />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
