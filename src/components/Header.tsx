import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, useReducedMotion } from 'motion/react';
import { Instagram, Mail, Menu, MessageCircle, X } from 'lucide-react';
import { HABILITAR_INGLES, SITE, SITE_CONFIG, buildWhatsAppLink } from '../config/site';
import { useSimulator } from '../context/SimulatorContext';
import { SupportedLang } from '../i18n';
import { Logo } from './Logo';

interface HeaderProps {
  routeKey: 'home' | 'senior' | 'qr' | 'notFound';
  transparentOverHero: boolean;
  onNavigate: (target: 'home' | 'senior' | 'qr', hash?: string) => void;
  lang: SupportedLang;
  onChangeLang: (nextLang: SupportedLang) => void;
  fontScaleIndex: number;
  onDecreaseFont: () => void;
  onIncreaseFont: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  routeKey,
  transparentOverHero,
  onNavigate,
  lang,
  onChangeLang,
  fontScaleIndex,
  onDecreaseFont,
  onIncreaseFont,
}) => {
  const { t } = useTranslation();
  const prefersReduced = useReducedMotion();
  const { openDrawer } = useSimulator();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hiddenOnScroll, setHiddenOnScroll] = useState(false);
  const lastYRef = useRef(0);

  useEffect(() => {
    const onScroll = () => {
      const currentY = window.scrollY;
      setScrolled(currentY > 40);

      if (prefersReduced || mobileMenuOpen || currentY < 100) {
        setHiddenOnScroll(false);
      } else if (currentY > lastYRef.current + 8) {
        setHiddenOnScroll(true);
      } else if (currentY < lastYRef.current - 6) {
        setHiddenOnScroll(false);
      }
      lastYRef.current = currentY;
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [prefersReduced, mobileMenuOpen]);

  const isTransparent = transparentOverHero && !scrolled && !mobileMenuOpen;
  const whatsappUrl = buildWhatsAppLink(t('floatingWhatsApp.defaultMessage'));

  const navItems: {
    label: string;
    target: 'home' | 'senior';
    hash?: string;
    isSimulator?: boolean;
  }[] = [
    { label: t('nav.servicos'), target: 'home', hash: '#servicos' },
    { label: t('nav.melhorIdade'), target: 'senior' },
    { label: t('nav.simulador'), target: 'home', hash: '#simulador', isSimulator: true },
    { label: t('nav.comoFunciona'), target: 'home', hash: '#como-funciona' },
    { label: t('nav.duvidas'), target: 'home', hash: '#duvidas' },
  ];

  const handleLinkClick = (
    item: { target: 'home' | 'senior'; hash?: string; isSimulator?: boolean },
    triggerEl?: HTMLElement | null
  ) => {
    setMobileMenuOpen(false);
    if (item.isSimulator) {
      openDrawer(undefined, triggerEl ?? null);
      return;
    }
    onNavigate(item.target, item.hash);
  };

  return (
    <>
      <motion.header
        initial={false}
        animate={hiddenOnScroll && !mobileMenuOpen ? { y: '-100%' } : { y: '0%' }}
        transition={{ duration: prefersReduced ? 0 : 0.25, ease: [0.16, 1, 0.3, 1] }}
        className={`fixed top-0 inset-x-0 z-40 transition-colors duration-300 ${
          isTransparent
            ? 'bg-transparent text-white'
            : 'bg-[#0D0D0D]/92 backdrop-blur-md border-b border-white/10 text-white'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 sm:h-20 flex items-center justify-between gap-4 lg:gap-8">
          <a
            href={lang === 'en' ? '/en' : '/'}
            onClick={(e) => {
              e.preventDefault();
              setMobileMenuOpen(false);
              onNavigate('home');
            }}
            aria-label={t('nav.homeAria')}
            className="whitespace-nowrap shrink-0"
          >
            <Logo variant="light" />
          </a>

          <nav aria-label="Main navigation" className="hidden lg:flex items-center gap-7">
            {navItems.map((item) => {
              const isActive = item.target === 'senior' && routeKey === 'senior';
              const isChampagne = Boolean(item.isSimulator);
              return (
                <a
                  key={item.label}
                  href={item.hash || (item.target === 'senior' ? '/melhor-idade' : '/')}
                  onClick={(e) => {
                    e.preventDefault();
                    handleLinkClick(item, e.currentTarget);
                  }}
                  className={`text-[13px] tracking-[0.1em] uppercase font-medium whitespace-nowrap shrink-0 py-1 border-b transition-colors ${
                    isActive
                      ? 'text-[var(--champagne)] border-[var(--champagne)]'
                      : isChampagne
                        ? 'text-[var(--champagne)] border-transparent hover:border-[var(--champagne)]'
                        : 'text-[#E6E6E6] border-transparent hover:text-[var(--champagne)] hover:border-[var(--champagne)]/70'
                  }`}
                >
                  {item.label}
                </a>
              );
            })}
          </nav>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {HABILITAR_INGLES && (
              <div
                className="hidden sm:inline-flex items-center border border-white/20 bg-black/25 rounded-[4px] overflow-hidden"
                role="group"
                aria-label={t('nav.idiomaLabel')}
              >
                <button
                  type="button"
                  onClick={() => onChangeLang('pt-BR')}
                  className={`px-2.5 min-h-[40px] text-xs font-medium tracking-[0.12em] whitespace-nowrap shrink-0 transition-colors ${
                    lang === 'pt-BR'
                      ? 'bg-[var(--champagne)] text-[var(--midnight)]'
                      : 'text-[#E6E6E6] hover:text-white'
                  }`}
                >
                  PT
                </button>
                <button
                  type="button"
                  onClick={() => onChangeLang('en')}
                  className={`px-2.5 min-h-[40px] text-xs font-medium tracking-[0.12em] whitespace-nowrap shrink-0 transition-colors ${
                    lang === 'en'
                      ? 'bg-[var(--champagne)] text-[var(--midnight)]'
                      : 'text-[#E6E6E6] hover:text-white'
                  }`}
                >
                  EN
                </button>
              </div>
            )}

            <div
              className="hidden sm:inline-flex items-center border border-white/20 bg-black/25 rounded-[4px] overflow-hidden"
              role="group"
              aria-label={t('nav.tamanhoLetra')}
            >
              <button
                type="button"
                onClick={onDecreaseFont}
                disabled={fontScaleIndex <= 0}
                aria-label={t('nav.diminuirLetra')}
                className="px-2.5 min-h-[40px] text-xs font-medium text-white hover:bg-white/10 disabled:opacity-40 whitespace-nowrap shrink-0"
              >
                A-
              </button>
              <span className="w-px h-4 bg-white/20" aria-hidden="true" />
              <button
                type="button"
                onClick={onIncreaseFont}
                disabled={fontScaleIndex >= 2}
                aria-label={t('nav.aumentarLetra')}
                className="px-2.5 min-h-[40px] text-xs font-medium text-white hover:bg-white/10 disabled:opacity-40 whitespace-nowrap shrink-0"
              >
                A+
              </button>
            </div>

            <button
              type="button"
              onClick={(e) => {
                setMobileMenuOpen(false);
                openDrawer(undefined, e.currentTarget);
              }}
              className="inline-flex items-center justify-center min-h-[40px] sm:min-h-[44px] px-3 sm:px-5 bg-[var(--champagne)] hover:bg-[#D1B483] text-[var(--midnight)] text-xs sm:text-sm font-medium tracking-[0.04em] sm:tracking-[0.06em] rounded-[4px] transition-colors whitespace-nowrap shrink-0 gfs-btn-slide"
            >
              {t('nav.simulador')}
            </button>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-expanded={mobileMenuOpen}
              aria-label={mobileMenuOpen ? t('nav.menuFechar') : t('nav.menuAbrir')}
              className="lg:hidden inline-flex items-center gap-1.5 min-h-[40px] sm:min-h-[44px] px-2.5 sm:px-3 border border-white/25 bg-black/30 text-white rounded-[4px] text-xs sm:text-sm font-medium whitespace-nowrap shrink-0"
            >
              {mobileMenuOpen ? (
                <>
                  <X className="w-5 h-5" strokeWidth={1.5} aria-hidden="true" />
                  <span>{t('nav.fecharLabel')}</span>
                </>
              ) : (
                <>
                  <Menu className="w-5 h-5" strokeWidth={1.5} aria-hidden="true" />
                  <span>{t('nav.menuLabel')}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </motion.header>

      {/* Menu Mobile em Tela Cheia (Midnight Black) */}
      {mobileMenuOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Mobile navigation"
          className="fixed inset-0 z-50 bg-[var(--midnight)] text-white flex flex-col justify-between overflow-y-auto px-6 py-5 lg:hidden"
        >
          <div className="flex items-center justify-between gap-4 pb-4 border-b border-white/10">
            <Logo variant="light" />
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              aria-label={t('nav.menuFechar')}
              className="min-h-[48px] px-4 inline-flex items-center gap-2 border border-white/25 text-white rounded-[4px] text-base font-medium"
            >
              <X className="w-5 h-5" strokeWidth={1.5} aria-hidden="true" />
              <span>{t('nav.fecharLabel')}</span>
            </button>
          </div>

          <nav aria-label="Mobile navigation links" className="py-6 flex flex-col divide-y divide-white/10">
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.hash || (item.target === 'senior' ? '/melhor-idade' : '/')}
                onClick={(e) => {
                  e.preventDefault();
                  handleLinkClick(item, e.currentTarget);
                }}
                className={`min-h-[56px] flex items-center text-xl font-light transition-colors ${
                  item.isSimulator
                    ? 'text-[var(--champagne)] font-medium'
                    : 'text-white hover:text-[var(--champagne)]'
                }`}
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="space-y-5 pt-4 border-t border-white/15">
            <div className="flex flex-wrap items-center justify-between gap-4">
              {HABILITAR_INGLES && (
                <div className="inline-flex border border-white/25 rounded-[4px] overflow-hidden">
                  <button
                    type="button"
                    onClick={() => {
                      onChangeLang('pt-BR');
                      setMobileMenuOpen(false);
                    }}
                    className={`min-h-[48px] px-4 text-sm font-medium ${
                      lang === 'pt-BR'
                        ? 'bg-[var(--champagne)] text-[var(--midnight)]'
                        : 'text-white'
                    }`}
                  >
                    PT
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onChangeLang('en');
                      setMobileMenuOpen(false);
                    }}
                    className={`min-h-[48px] px-4 text-sm font-medium ${
                      lang === 'en'
                        ? 'bg-[var(--champagne)] text-[var(--midnight)]'
                        : 'text-white'
                    }`}
                  >
                    EN
                  </button>
                </div>
              )}

              <div className="inline-flex items-center border border-white/25 rounded-[4px] overflow-hidden">
                <button
                  type="button"
                  onClick={onDecreaseFont}
                  disabled={fontScaleIndex <= 0}
                  aria-label={t('nav.diminuirLetra')}
                  className="min-h-[48px] px-4 text-sm font-medium text-white disabled:opacity-40"
                >
                  A-
                </button>
                <span className="w-px h-5 bg-white/20" aria-hidden="true" />
                <button
                  type="button"
                  onClick={onIncreaseFont}
                  disabled={fontScaleIndex >= 2}
                  aria-label={t('nav.aumentarLetra')}
                  className="min-h-[48px] px-4 text-sm font-medium text-white disabled:opacity-40"
                >
                  A+
                </button>
              </div>
            </div>

            <div className="space-y-2.5 text-base text-[#E6E6E6]">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[48px] flex items-center gap-3 text-white hover:text-[var(--champagne)]"
              >
                <MessageCircle className="w-5 h-5 text-[var(--champagne)] shrink-0" strokeWidth={1.5} aria-hidden="true" />
                <span className="tabular-nums">{SITE.whatsappExibicao}</span>
              </a>
              <a
                href={SITE_CONFIG.EMAIL_MAILTO_URL}
                className="min-h-[48px] flex items-center gap-3 text-[#E6E6E6] hover:text-[var(--champagne)]"
              >
                <Mail className="w-5 h-5 text-[var(--champagne)] shrink-0" strokeWidth={1.5} aria-hidden="true" />
                <span className="truncate">{SITE.email}</span>
              </a>
              <a
                href={SITE.instagramLink}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[48px] flex items-center gap-3 text-[#E6E6E6] hover:text-[var(--champagne)]"
              >
                <Instagram className="w-5 h-5 text-[var(--champagne)] shrink-0" strokeWidth={1.5} aria-hidden="true" />
                <span>{SITE.instagramUsuario}</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
