import React from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, MessageCircle } from 'lucide-react';
import { buildWhatsAppLink } from '../config/site';

interface NotFoundPageProps {
  onNavigate: (target: 'home' | 'senior' | 'qr', hash?: string) => void;
}

export const NotFoundPage: React.FC<NotFoundPageProps> = ({ onNavigate }) => {
  const { t } = useTranslation();
  const whatsappUrl = buildWhatsAppLink(t('floatingWhatsApp.defaultMessage'));

  return (
    <main className="bg-[var(--steel-dark)] text-white min-h-[75vh] pt-32 pb-24">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-8">
        <span className="eyebrow text-[var(--champagne)] block">{t('notFound.eyebrow')}</span>

        <h1 className="font-brand font-medium text-3xl sm:text-4xl lg:text-5xl text-white leading-[1.1]">
          {t('notFound.title')}
        </h1>

        <p className="text-base sm:text-lg text-[#E6E6E6] max-w-2xl leading-relaxed">
          {t('notFound.text')}
        </p>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2">
          <button
            type="button"
            onClick={() => onNavigate('home')}
            className="min-h-[52px] px-7 inline-flex items-center justify-center gap-2.5 bg-[var(--champagne)] hover:bg-[#D1B483] text-[var(--midnight)] text-base font-medium rounded-[4px] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" strokeWidth={1.5} aria-hidden="true" />
            <span>{t('notFound.backHome')}</span>
          </button>

          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-[56px] px-7 inline-flex items-center justify-center gap-2.5 border border-white/40 hover:border-[var(--champagne)] text-white text-lg font-medium rounded-[4px] transition-colors"
          >
            <MessageCircle className="w-5 h-5 text-[var(--champagne)]" strokeWidth={1.5} aria-hidden="true" />
            <span>{t('notFound.whatsappCta')}</span>
          </a>
        </div>
      </div>
    </main>
  );
};
