import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  Calculator,
  CarFront,
  CheckCircle2,
  Clock,
  HeartHandshake,
  Home,
  MessageCircle,
  Phone,
  Stethoscope,
  Users,
} from 'lucide-react';
import { MEDIA_ASSETS } from '../config/media';
import { SITE, SITE_CONFIG, buildWhatsAppLink } from '../config/site';
import { AccessibleImage } from '../components/AccessibleImage';

interface MelhorIdadePageProps {
  onNavigate: (target: 'home' | 'senior' | 'qr', hash?: string) => void;
  onSimulateMelhorIdade: (paraOutraPessoa?: boolean, triggerEl?: HTMLElement | null) => void;
}

export const MelhorIdadePage: React.FC<MelhorIdadePageProps> = ({
  onNavigate,
  onSimulateMelhorIdade,
}) => {
  const { t } = useTranslation();
  const [videoError, setVideoError] = useState(false);

  const whatsappMelhorIdadeUrl = buildWhatsAppLink(t('seniorPage.whatsappMessage'));
  const benefitTexts = t('seniorPage.benefits', { returnObjects: true }) as string[];

  const benefitIcons = [
    <Home key="home" className="w-6 h-6 text-[var(--champagne-on-light)]" strokeWidth={1.5} aria-hidden="true" />,
    <HeartHandshake key="hh" className="w-6 h-6 text-[var(--champagne-on-light)]" strokeWidth={1.5} aria-hidden="true" />,
    <Clock key="clk" className="w-6 h-6 text-[var(--champagne-on-light)]" strokeWidth={1.5} aria-hidden="true" />,
    <Stethoscope key="st" className="w-6 h-6 text-[var(--champagne-on-light)]" strokeWidth={1.5} aria-hidden="true" />,
    <CarFront key="car" className="w-6 h-6 text-[var(--champagne-on-light)]" strokeWidth={1.5} aria-hidden="true" />,
    <Users key="usr" className="w-6 h-6 text-[var(--champagne-on-light)]" strokeWidth={1.5} aria-hidden="true" />,
  ];

  return (
    <main className="bg-[var(--ivory)] text-[var(--midnight)] text-base sm:text-lg leading-relaxed pt-24 sm:pt-28 pb-24">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-10">
        <div>
          <button
            type="button"
            onClick={() => onNavigate('home')}
            className="min-h-[48px] px-5 inline-flex items-center gap-2.5 bg-white hover:bg-[var(--steel)] hover:text-white border border-[var(--midnight)] text-[var(--midnight)] text-base font-medium rounded-[4px] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" strokeWidth={1.5} aria-hidden="true" />
            <span>{t('seniorPage.backHome')}</span>
          </button>
        </div>

        <section aria-label={t('seniorPage.videoLabel')} className="space-y-3">
          <div className="rounded-[4px] overflow-hidden border border-[var(--border-light)] bg-[var(--midnight)] aspect-video relative">
            {!videoError ? (
              <video
                controls
                playsInline
                preload="metadata"
                poster={MEDIA_ASSETS.videoMelhorIdade.poster}
                onError={() => setVideoError(true)}
                className="w-full h-full object-cover"
              >
                <source src={MEDIA_ASSETS.videoMelhorIdade.src} type="video/mp4" />
              </video>
            ) : (
              <div className="relative w-full h-full">
                <AccessibleImage
                  src={MEDIA_ASSETS.melhorIdadeEmbarque.src}
                  alt={t(MEDIA_ASSETS.melhorIdadeEmbarque.altKey)}
                  fallbackLabel={t(MEDIA_ASSETS.melhorIdadeEmbarque.fallbackKey)}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/55 to-transparent p-5 sm:p-7 text-white">
                  <p className="text-sm sm:text-base font-medium">
                    {t('seniorPage.videoPlaceholderText')}
                  </p>
                </div>
              </div>
            )}
          </div>
          <p className="text-sm sm:text-base text-[var(--text-muted-on-light)] font-medium">
            {t('seniorPage.videoCaption')}
          </p>
        </section>

        <section className="space-y-4">
          <span className="eyebrow text-[var(--champagne-on-light)] block">
            {t('seniorPage.eyebrow')}
          </span>

          <h1 className="font-brand font-medium text-3xl sm:text-4xl lg:text-[42px] text-[var(--midnight)] leading-[1.1]">
            {t('seniorPage.title')}
          </h1>

          <p className="text-base sm:text-lg text-[var(--midnight)] leading-relaxed">
            {t('seniorPage.text')}
          </p>
        </section>

        <section aria-labelledby="beneficios-melhor-idade" className="space-y-5">
          <h2
            id="beneficios-melhor-idade"
            className="font-brand font-medium text-2xl sm:text-3xl text-[var(--midnight)]"
          >
            {t('seniorPage.benefitsTitle')}
          </h2>

          <ul className="grid grid-cols-1 sm:grid-cols-2 border-t border-[var(--border-light)]">
            {benefitTexts.map((texto, idx) => (
              <li
                key={texto}
                className="py-4 sm:px-4 border-b border-[var(--border-light)] flex items-start gap-3.5"
              >
                <div className="pt-0.5 shrink-0">{benefitIcons[idx]}</div>
                <span className="text-base sm:text-lg font-medium text-[var(--midnight)] leading-snug">
                  {texto}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="bg-white border border-[var(--border-light)] rounded-[4px] overflow-hidden grid grid-cols-1 md:grid-cols-12 items-stretch">
          <div className="md:col-span-5 min-h-[220px]">
            <AccessibleImage
              src={MEDIA_ASSETS.portaMalas.src}
              alt={t(MEDIA_ASSETS.portaMalas.altKey)}
              fallbackLabel={t(MEDIA_ASSETS.portaMalas.fallbackKey)}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="md:col-span-7 p-6 sm:p-8 flex flex-col justify-center space-y-3">
            <div className="inline-flex items-center gap-2 text-[var(--champagne-on-light)] font-medium text-sm sm:text-base">
              <CheckCircle2 className="w-5 h-5 shrink-0" strokeWidth={1.5} aria-hidden="true" />
              <span>{t('seniorPage.trunkBadge')}</span>
            </div>
            <p className="text-base sm:text-lg text-[var(--midnight)]">{t('seniorPage.trunkText')}</p>
          </div>
        </section>

        <section
          id="familiar"
          className="p-6 sm:p-9 rounded-[4px] bg-[var(--steel)] text-[#E6E6E6] border border-[var(--titanium)]/30 space-y-4"
        >
          <h2 className="font-brand font-medium text-2xl sm:text-3xl text-white leading-snug">
            {t('seniorPage.familyTitle')}
          </h2>
          <p className="text-base sm:text-lg text-[#E6E6E6]">{t('seniorPage.familyText')}</p>
          <button
            type="button"
            onClick={(e) => onSimulateMelhorIdade(true, e.currentTarget)}
            className="min-h-[52px] px-6 inline-flex items-center justify-center gap-2.5 bg-[var(--champagne)] hover:bg-[#D1B483] text-[var(--midnight)] text-base font-medium rounded-[4px] transition-colors gfs-btn-slide"
          >
            <Calculator className="w-5 h-5" strokeWidth={1.5} aria-hidden="true" />
            <span>{t('seniorPage.familyCta')}</span>
          </button>
        </section>

        <section
          aria-label={t('calloutBanner.cta')}
          className="px-6 py-5 sm:px-8 sm:py-6 rounded-[4px] bg-[var(--steel-dark)] border border-[var(--titanium)]/35 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left"
        >
          <p className="font-brand font-medium text-lg sm:text-xl text-white">
            {t('calloutBanner.text')}
          </p>
          <button
            type="button"
            onClick={(e) => onSimulateMelhorIdade(false, e.currentTarget)}
            className="min-h-[48px] px-6 inline-flex items-center justify-center gap-2 bg-[var(--champagne)] hover:bg-[#D1B483] text-[var(--midnight)] text-base font-medium rounded-[4px] transition-colors whitespace-nowrap shrink-0 gfs-btn-slide"
          >
            <Calculator className="w-5 h-5 shrink-0" strokeWidth={1.75} aria-hidden="true" />
            <span>{t('calloutBanner.cta')}</span>
          </button>
        </section>

        <section aria-label={t('footer.contactHeading')} className="space-y-3.5 pt-2">
          <a
            href={whatsappMelhorIdadeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full min-h-[56px] px-6 py-3.5 inline-flex items-center justify-center gap-3 bg-[var(--champagne)] hover:bg-[#D1B483] text-[var(--midnight)] text-base sm:text-lg font-medium rounded-[4px] transition-colors text-center gfs-btn-slide"
          >
            <MessageCircle className="w-5 h-5 shrink-0" strokeWidth={1.5} aria-hidden="true" />
            <span>{t('seniorPage.callOrWhatsApp')}</span>
          </a>

          <a
            href={`tel:${SITE_CONFIG.TELEFONE_LIGACAO}`}
            className="w-full min-h-[54px] px-6 py-3 inline-flex items-center justify-center gap-3 bg-white hover:bg-[var(--steel)] hover:text-white border border-[var(--midnight)] text-[var(--midnight)] text-base sm:text-lg font-medium rounded-[4px] transition-colors text-center tabular-nums"
          >
            <Phone className="w-5 h-5 shrink-0" strokeWidth={1.5} aria-hidden="true" />
            <span>{t('seniorPage.callPhone', { phone: SITE.whatsappExibicao })}</span>
          </a>

          <button
            type="button"
            onClick={(e) => onSimulateMelhorIdade(false, e.currentTarget)}
            className="w-full min-h-[56px] px-6 py-3.5 inline-flex items-center justify-center gap-3 bg-[var(--midnight)] hover:bg-[#222830] text-white text-base sm:text-lg font-medium rounded-[4px] transition-colors text-center gfs-btn-slide"
          >
            <Calculator className="w-5 h-5 text-[var(--champagne)] shrink-0" strokeWidth={1.5} aria-hidden="true" />
            <span>{t('seniorPage.simulateButton')}</span>
          </button>
        </section>

        <div className="pt-2">
          <button
            type="button"
            onClick={() => onNavigate('home')}
            className="w-full sm:w-auto min-h-[48px] px-5 inline-flex items-center justify-center gap-2 bg-white hover:bg-[var(--steel)] hover:text-white border border-[var(--midnight)] text-[var(--midnight)] text-base font-medium rounded-[4px] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" strokeWidth={1.5} aria-hidden="true" />
            <span>{t('seniorPage.backHome')}</span>
          </button>
        </div>
      </div>
    </main>
  );
};
