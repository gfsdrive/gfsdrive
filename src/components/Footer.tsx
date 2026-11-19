import React from 'react';
import { useTranslation } from 'react-i18next';
import { Instagram, Mail, MapPin, MessageCircle } from 'lucide-react';
import { HABILITAR_INGLES, SITE, SITE_CONFIG, buildWhatsAppLink } from '../config/site';
import { useSimulator } from '../context/SimulatorContext';
import { SupportedLang } from '../i18n';
import { Logo } from './Logo';

interface FooterProps {
  onNavigate: (target: 'home' | 'senior' | 'qr', hash?: string) => void;
  lang: SupportedLang;
  onChangeLang: (nextLang: SupportedLang) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate, lang, onChangeLang }) => {
  const { t } = useTranslation();
  const { openDrawer } = useSimulator();
  const whatsappUrl = buildWhatsAppLink(t('floatingWhatsApp.defaultMessage'));

  return (
    <footer id="site-footer" className="bg-[var(--midnight)] text-[#E6E6E6] border-t border-white/10 pb-24 md:pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20 space-y-12">
        {/* Logo centralizado no topo do rodapé, inspirado na referência */}
        <div className="flex flex-col items-center text-center space-y-4 pb-10 border-b border-white/10">
          <Logo variant="light" />
          <p className="text-lg text-[#E6E6E6] leading-relaxed max-w-xl">
            {t('footer.description')}
          </p>
          <p className="text-base text-[var(--titanium)] inline-flex items-center justify-center gap-2">
            <MapPin className="w-4 h-4 text-[var(--champagne)] shrink-0" strokeWidth={1.5} aria-hidden="true" />
            <span>{t('footer.area')}</span>
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 items-start">
          <div className="md:col-span-5 space-y-4">
            <h2 className="eyebrow text-[var(--champagne)]">{t('footer.navHeading')}</h2>
            <ul className="grid grid-cols-2 gap-3 text-base">
              <li>
                <a
                  href="#servicos"
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigate('home', '#servicos');
                  }}
                  className="text-[#E6E6E6] hover:text-[var(--champagne)] transition-colors inline-block py-1"
                >
                  {t('nav.servicos')}
                </a>
              </li>
              <li>
                <a
                  href="/melhor-idade"
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigate('senior');
                  }}
                  className="text-[#E6E6E6] hover:text-[var(--champagne)] transition-colors inline-block py-1"
                >
                  {t('nav.melhorIdade')}
                </a>
              </li>
              <li>
                <a
                  href="#simulador"
                  onClick={(e) => {
                    e.preventDefault();
                    openDrawer(undefined, e.currentTarget);
                  }}
                  className="text-[var(--champagne)] hover:underline transition-colors inline-block py-1"
                >
                  {t('nav.simulador')}
                </a>
              </li>
              <li>
                <a
                  href="#duvidas"
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigate('home', '#duvidas');
                  }}
                  className="text-[#E6E6E6] hover:text-[var(--champagne)] transition-colors inline-block py-1"
                >
                  {t('nav.duvidas')}
                </a>
              </li>
            </ul>
          </div>

          <div className="md:col-span-7 space-y-4">
            <h2 className="eyebrow text-[var(--champagne)]">{t('footer.contactHeading')}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[56px] px-4 inline-flex items-center gap-3 border border-white/15 hover:border-[var(--champagne)] text-white text-base font-normal rounded-[4px] transition-colors"
              >
                <MessageCircle className="w-5 h-5 text-[var(--champagne)] shrink-0" strokeWidth={1.5} aria-hidden="true" />
                <span className="tabular-nums truncate">{SITE.whatsappExibicao}</span>
              </a>

              <a
                href={SITE_CONFIG.EMAIL_MAILTO_URL}
                className="min-h-[56px] px-4 inline-flex items-center gap-3 border border-white/15 hover:border-[var(--champagne)] text-white text-base font-normal rounded-[4px] transition-colors"
              >
                <Mail className="w-5 h-5 text-[var(--champagne)] shrink-0" strokeWidth={1.5} aria-hidden="true" />
                <span className="truncate">{SITE.email}</span>
              </a>

              <a
                href={SITE.instagramLink}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[56px] px-4 inline-flex items-center gap-3 border border-white/15 hover:border-[var(--champagne)] text-white text-base font-normal rounded-[4px] transition-colors"
              >
                <Instagram className="w-5 h-5 text-[var(--champagne)] shrink-0" strokeWidth={1.5} aria-hidden="true" />
                <span>{SITE.instagramUsuario}</span>
              </a>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-sm text-[var(--titanium)]">
          <p>{t('footer.disclaimer')}</p>
          <div className="flex items-center gap-6 shrink-0">
            {HABILITAR_INGLES && (
              <div className="inline-flex items-center gap-2 text-sm">
                <button
                  type="button"
                  onClick={() => onChangeLang('pt-BR')}
                  className={`py-1.5 px-2.5 min-h-[40px] rounded-[4px] ${
                    lang === 'pt-BR'
                      ? 'text-[var(--champagne)] font-medium underline underline-offset-4'
                      : 'text-[#E6E6E6] hover:text-white'
                  }`}
                >
                  PT
                </button>
                <span aria-hidden="true">/</span>
                <button
                  type="button"
                  onClick={() => onChangeLang('en')}
                  className={`py-1.5 px-2.5 min-h-[40px] rounded-[4px] ${
                    lang === 'en'
                      ? 'text-[var(--champagne)] font-medium underline underline-offset-4'
                      : 'text-[#E6E6E6] hover:text-white'
                  }`}
                >
                  EN
                </button>
              </div>
            )}
            <p className="whitespace-nowrap">
              © {new Date().getFullYear()} {SITE.nome}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};
