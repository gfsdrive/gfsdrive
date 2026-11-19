import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { APIProvider } from '@vis.gl/react-google-maps';
import { FloatingWhatsAppButton } from './components/FloatingWhatsAppButton';
import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { ScrollProgressBar } from './components/ScrollProgressBar';
import { SimulatorDrawer } from './components/SimulatorDrawer';
import { HABILITAR_INGLES } from './config/site';
import { SimulatorProvider, useSimulator } from './context/SimulatorContext';
import { SupportedLang, persistLanguagePreference } from './i18n';
import { ServiceId } from './lib/calcularPreco';
import { HomePage } from './pages/HomePage';
import { MelhorIdadePage } from './pages/MelhorIdadePage';
import { NotFoundPage } from './pages/NotFoundPage';
import { QrPage } from './pages/QrPage';

const MAPS_API_KEY = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined) || '';
const FONT_SCALES = [1, 1.12, 1.25];

type RouteKey = 'home' | 'senior' | 'qr' | 'notFound';

interface ParsedRoute {
  routeKey: RouteKey;
  explicitLang: SupportedLang | null;
}

const SLUG_TO_SERVICE: Record<string, ServiceId> = {
  transporte: 'transporte_agendado',
  transporte_agendado: 'transporte_agendado',
  compromisso: 'compromisso',
  'melhor-idade': 'melhor_idade',
  melhor_idade: 'melhor_idade',
  'senior-care': 'melhor_idade',
  corporativo: 'corporativo',
  passeios: 'passeios_viagens',
  passeios_viagens: 'passeios_viagens',
};

function parseRoute(pathname: string): ParsedRoute {
  const clean = pathname.replace(/\/+$/, '') || '/';

  if (clean === '/') return { routeKey: 'home', explicitLang: null };
  if (clean === '/melhor-idade') return { routeKey: 'senior', explicitLang: 'pt-BR' };
  if (clean === '/qr') return { routeKey: 'qr', explicitLang: 'pt-BR' };

  if (HABILITAR_INGLES) {
    if (clean === '/en') return { routeKey: 'home', explicitLang: 'en' };
    if (clean === '/en/senior-care') return { routeKey: 'senior', explicitLang: 'en' };
    if (clean === '/en/qr') return { routeKey: 'qr', explicitLang: 'en' };
  }

  return {
    routeKey: 'notFound',
    explicitLang: clean.startsWith('/en') && HABILITAR_INGLES ? 'en' : null,
  };
}

function buildPathForRoute(target: 'home' | 'senior' | 'qr', lang: SupportedLang): string {
  const isEn = HABILITAR_INGLES && lang === 'en';
  if (target === 'senior') return isEn ? '/en/senior-care' : '/melhor-idade';
  if (target === 'qr') return isEn ? '/en/qr' : '/qr';
  return isEn ? '/en' : '/';
}

interface AppShellProps {
  mapsAvailable: boolean;
  quotaExceeded: boolean;
}

const AppShell: React.FC<AppShellProps> = ({ mapsAvailable, quotaExceeded }) => {
  const { t, i18n } = useTranslation();
  const { openDrawer } = useSimulator();
  const [routeKey, setRouteKey] = useState<RouteKey>(
    () => parseRoute(window.location.pathname).routeKey
  );
  const [fontScaleIndex, setFontScaleIndex] = useState<number>(0);

  const activeLang: SupportedLang = HABILITAR_INGLES && i18n.language === 'en' ? 'en' : 'pt-BR';

  useEffect(() => {
    document.documentElement.style.setProperty(
      '--gfs-font-scale',
      String(FONT_SCALES[fontScaleIndex] ?? 1)
    );
  }, [fontScaleIndex]);

  useEffect(() => {
    const parsed = parseRoute(window.location.pathname);
    setRouteKey(parsed.routeKey);
    if (parsed.explicitLang && parsed.explicitLang !== i18n.language) {
      void i18n.changeLanguage(parsed.explicitLang);
    }
  }, [i18n]);

  // Suporte a links diretos: #simular, ?simular=1, ?simular=compromisso, e /qr
  const checkDeepLinksAndOpenDrawer = useCallback(() => {
    const parsed = parseRoute(window.location.pathname);
    const params = new URLSearchParams(window.location.search);
    const simularParam = params.get('simular');
    const hash = window.location.hash;

    if (parsed.routeKey === 'qr') {
      openDrawer({ startAtStep: 1, origemFluxo: 'qr', qrBanner: true });
      return;
    }

    if (simularParam) {
      const normalized = simularParam.trim().toLowerCase();
      const mappedService = SLUG_TO_SERVICE[normalized];
      if (mappedService) {
        openDrawer({ servicoId: mappedService, startAtStep: 2, origemFluxo: 'site', qrBanner: false });
      } else {
        openDrawer({ startAtStep: 1, origemFluxo: 'site', qrBanner: false });
      }
      return;
    }

    if (hash === '#simular') {
      openDrawer({ startAtStep: 1, origemFluxo: 'site', qrBanner: false });
    }
  }, [openDrawer]);

  useEffect(() => {
    checkDeepLinksAndOpenDrawer();
    const onHashChange = () => checkDeepLinksAndOpenDrawer();
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [checkDeepLinksAndOpenDrawer]);

  useEffect(() => {
    const onPopState = () => {
      const parsed = parseRoute(window.location.pathname);
      setRouteKey(parsed.routeKey);
      if (parsed.explicitLang && parsed.explicitLang !== i18n.language) {
        void i18n.changeLanguage(parsed.explicitLang);
      }
      checkDeepLinksAndOpenDrawer();
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [i18n, checkDeepLinksAndOpenDrawer]);

  useEffect(() => {
    document.documentElement.lang = activeLang;

    let titleKey = 'seo.homeTitle';
    let descKey = 'seo.homeDescription';
    if (routeKey === 'senior') {
      titleKey = 'seo.seniorTitle';
      descKey = 'seo.seniorDescription';
    } else if (routeKey === 'qr') {
      titleKey = 'seo.qrTitle';
      descKey = 'seo.homeDescription';
    } else if (routeKey === 'notFound') {
      titleKey = 'seo.notFoundTitle';
      descKey = 'seo.homeDescription';
    }

    document.title = t(titleKey);
    const descMeta = document.querySelector('meta[name="description"]');
    if (descMeta) {
      descMeta.setAttribute('content', t(descKey));
    }

    if (routeKey !== 'notFound') {
      const origin = window.location.origin;
      const ptHref = `${origin}${buildPathForRoute(routeKey, 'pt-BR')}`;
      const enHref = `${origin}${buildPathForRoute(routeKey, 'en')}`;
      const alternates: Array<{ hreflang: string; href: string }> = [
        { hreflang: 'pt-BR', href: ptHref },
        { hreflang: 'en', href: HABILITAR_INGLES ? enHref : ptHref },
        { hreflang: 'x-default', href: ptHref },
      ];
      alternates.forEach(({ hreflang, href }) => {
        let linkEl = document.querySelector(
          `link[rel="alternate"][hreflang="${hreflang}"]`
        ) as HTMLLinkElement | null;
        if (!linkEl) {
          linkEl = document.createElement('link');
          linkEl.rel = 'alternate';
          linkEl.hreflang = hreflang;
          document.head.appendChild(linkEl);
        }
        linkEl.href = href;
      });
    }
  }, [activeLang, routeKey, t]);

  const scrollToElement = useCallback((hash?: string) => {
    if (!hash) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const id = hash.replace(/^#/, '');
    window.setTimeout(() => {
      const target = document.getElementById(id);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 60);
  }, []);

  const handleNavigate = useCallback(
    (target: 'home' | 'senior' | 'qr', hash?: string) => {
      const path = buildPathForRoute(target, activeLang);
      const nextUrl = hash ? `${path}${hash}` : path;
      if (window.location.pathname + window.location.hash !== nextUrl) {
        window.history.pushState({}, '', nextUrl);
      }
      setRouteKey(target);
      if (target === 'qr') {
        openDrawer({ startAtStep: 1, origemFluxo: 'qr', qrBanner: true });
      }
      scrollToElement(hash);
    },
    [activeLang, openDrawer, scrollToElement]
  );

  const handleChangeLang = useCallback(
    (nextLang: SupportedLang) => {
      if (!HABILITAR_INGLES) return;
      persistLanguagePreference(nextLang);
      void i18n.changeLanguage(nextLang);

      if (routeKey !== 'notFound') {
        const nextPath = buildPathForRoute(routeKey, nextLang);
        const currentHash = window.location.hash || '';
        const nextUrl = `${nextPath}${currentHash}`;
        if (window.location.pathname + window.location.hash !== nextUrl) {
          window.history.pushState({}, '', nextUrl);
        }
      }
    },
    [i18n, routeKey]
  );

  const handleSimulateMelhorIdade = useCallback(
    (paraOutraPessoa = false, triggerEl?: HTMLElement | null) => {
      openDrawer(
        {
          servicoId: 'melhor_idade',
          agendandoParaOutraPessoa: paraOutraPessoa,
          startAtStep: 2,
          origemFluxo: 'melhor_idade',
          qrBanner: false,
        },
        triggerEl ?? null
      );
    },
    [openDrawer]
  );

  return (
    <div className="min-h-screen flex flex-col bg-[var(--midnight)] text-[#E6E6E6]">
      <ScrollProgressBar />

      {quotaExceeded && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50">
          <span>
            Google Maps Platform quota reached. If you are the app owner, visit{' '}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold text-amber-950 hover:text-amber-800"
            >
              maps developer site
            </a>{' '}
            for instructions to update your account.
          </span>
        </div>
      )}

      <Header
        routeKey={routeKey}
        transparentOverHero={routeKey === 'home'}
        onNavigate={handleNavigate}
        lang={activeLang}
        onChangeLang={handleChangeLang}
        fontScaleIndex={fontScaleIndex}
        onDecreaseFont={() => setFontScaleIndex((i) => Math.max(0, i - 1))}
        onIncreaseFont={() => setFontScaleIndex((i) => Math.min(FONT_SCALES.length - 1, i + 1))}
      />

      <div className="flex-1">
        {routeKey === 'senior' && (
          <MelhorIdadePage
            onNavigate={handleNavigate}
            onSimulateMelhorIdade={handleSimulateMelhorIdade}
          />
        )}

        {routeKey === 'qr' && (
          <QrPage mapsAvailable={mapsAvailable} onNavigate={handleNavigate} />
        )}

        {routeKey === 'home' && <HomePage mapsAvailable={mapsAvailable} onNavigate={handleNavigate} />}

        {routeKey === 'notFound' && <NotFoundPage onNavigate={handleNavigate} />}
      </div>

      <Footer onNavigate={handleNavigate} lang={activeLang} onChangeLang={handleChangeLang} />
      <FloatingWhatsAppButton routeKey={routeKey} />
      <SimulatorDrawer mapsAvailable={mapsAvailable} />
    </div>
  );
};

export default function App() {
  const { i18n } = useTranslation();
  const [quotaExceeded, setQuotaExceeded] = useState<boolean>(false);

  const activeLang: SupportedLang = HABILITAR_INGLES && i18n.language === 'en' ? 'en' : 'pt-BR';
  const mapsAvailable = Boolean(MAPS_API_KEY) && !quotaExceeded;

  useEffect(() => {
    const handleQuota = () => setQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', handleQuota);
    return () => window.removeEventListener('gmp-quota-exceeded', handleQuota);
  }, []);

  const appTree = (
    <SimulatorProvider>
      <AppShell mapsAvailable={mapsAvailable} quotaExceeded={quotaExceeded} />
    </SimulatorProvider>
  );

  if (MAPS_API_KEY) {
    return (
      <APIProvider
        apiKey={MAPS_API_KEY}
        language={activeLang === 'en' ? 'en' : 'pt-BR'}
        region="BR"
        libraries={['places', 'routes']}
      >
        {appTree}
      </APIProvider>
    );
  }

  return appTree;
}
