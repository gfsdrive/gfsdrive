import React from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import { SimulatorWizard } from '../components/SimulatorWizard';

interface QrPageProps {
  mapsAvailable: boolean;
  onNavigate: (target: 'home' | 'senior' | 'qr', hash?: string) => void;
}

export const QrPage: React.FC<QrPageProps> = ({ mapsAvailable, onNavigate }) => {
  const { t } = useTranslation();

  return (
    <main className="bg-[var(--steel-dark)] min-h-screen pt-24 sm:pt-28 pb-28">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => onNavigate('home')}
            className="min-h-[56px] px-5 inline-flex items-center gap-2 bg-[var(--midnight)] hover:bg-[#1E252D] border border-white/25 text-white text-base sm:text-lg font-medium rounded-[4px] transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-[var(--champagne)]" strokeWidth={1.5} aria-hidden="true" />
            <span>{t('qrPage.backFullSite')}</span>
          </button>
        </div>

        <SimulatorWizard mapsAvailable={mapsAvailable} variant="inline" origemFluxo="qr" qrBanner={true} />
      </div>
    </main>
  );
};
