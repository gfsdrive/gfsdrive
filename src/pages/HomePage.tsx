import React, { useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react';
import {
  ArrowRight,
  Calculator,
  ChevronDown,
  ChevronUp,
  Instagram,
  Mail,
  MessageCircle,
} from 'lucide-react';
import { MEDIA_ASSETS } from '../config/media';
import { PRECOS } from '../config/precos';
import { SITE, SITE_CONFIG, buildWhatsAppLink } from '../config/site';
import { useSimulator } from '../context/SimulatorContext';
import { SupportedLang } from '../i18n';
import { SERVICOS, ServiceId } from '../lib/calcularPreco';
import { AnimatedCounter } from '../components/AnimatedCounter';
import { ClipRevealImage } from '../components/ClipRevealImage';
import {
  HorizontalDottedConnector,
  VerticalDottedConnector,
} from '../components/DottedConnector';
import { Reveal } from '../components/Reveal';
import { RollingElectricCar } from '../components/RollingElectricCar';
import { CarShowroom } from '../components/CarShowroom';
import { SectionDotNav } from '../components/SectionDotNav';
import { SimulatorWizard } from '../components/SimulatorWizard';

interface HomePageProps {
  mapsAvailable: boolean;
  onNavigate: (target: 'home' | 'senior' | 'qr', hash?: string) => void;
}

const STARTING_PRICES: Record<ServiceId, { amount: number; decimals: number; unitKey?: string }> = {
  transporte_agendado: { amount: PRECOS.km.D1, decimals: 2, unitKey: 'services.perKmSuffix' },
  compromisso: { amount: PRECOS.hora.HD1, decimals: 2 },
  melhor_idade: { amount: PRECOS.hora.HD1, decimals: 2 },
  corporativo: { amount: PRECOS.hora.HD1, decimals: 2 },
  passeios_viagens: { amount: PRECOS.hora.HD1, decimals: 2 },
};

export const HomePage: React.FC<HomePageProps> = ({ mapsAvailable, onNavigate }) => {
  const { t, i18n } = useTranslation();
  const lang: SupportedLang = i18n.language === 'en' ? 'en' : 'pt-BR';
  const prefersReduced = useReducedMotion();
  const {
    servicoId,
    origem,
    destino,
    dataSaida,
    horaSaida,
    openDrawer,
  } = useSimulator();

  const miniServiceId = useId();
  const miniOriginId = useId();
  const miniDestId = useId();
  const miniDateId = useId();
  const miniTimeId = useId();

  const [miniServico, setMiniServico] = useState<ServiceId>(servicoId);
  const [miniOrigem, setMiniOrigem] = useState<string>(origem);
  const [miniDestino, setMiniDestino] = useState<string>(destino);
  const [miniData, setMiniData] = useState<string>(dataSaida);
  const [miniHora, setMiniHora] = useState<string>(horaSaida);

  useEffect(() => {
    setMiniServico(servicoId);
  }, [servicoId]);
  useEffect(() => {
    setMiniOrigem(origem);
  }, [origem]);
  useEffect(() => {
    setMiniDestino(destino);
  }, [destino]);
  useEffect(() => {
    setMiniData(dataSaida);
  }, [dataSaida]);
  useEffect(() => {
    setMiniHora(horaSaida);
  }, [horaSaida]);

  const heroRef = useRef<HTMLElement | null>(null);
  const statsTrackRef = useRef<HTMLDivElement | null>(null);
  const [activeStatIdx, setActiveStatIdx] = useState(0);
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(0);

  const { scrollYProgress: heroScrollProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });
  const watermarkX = useTransform(heroScrollProgress, [0, 1], [0, -70]);

  const howSteps = t('howItWorks.steps', { returnObjects: true }) as {
    num: string;
    titulo: string;
    desc: string;
  }[];
  const audienceItems = t('audience.items', { returnObjects: true }) as string[];
  const faqItems = t('faq.items', { returnObjects: true }) as {
    pergunta: string;
    resposta: string;
  }[];

  const whatsappDirectUrl = buildWhatsAppLink(t('floatingWhatsApp.defaultMessage'));

  const handleStatsScroll = () => {
    const el = statsTrackRef.current;
    if (!el || el.clientWidth === 0) return;
    const idx = Math.round(el.scrollLeft / el.clientWidth);
    if (idx !== activeStatIdx) setActiveStatIdx(idx);
  };

  const scrollToStatSlide = (idx: number) => {
    const el = statsTrackRef.current;
    if (!el) return;
    el.scrollTo({ left: idx * el.clientWidth, behavior: 'smooth' });
    setActiveStatIdx(idx);
  };

  const handleMiniSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmedOrigin = miniOrigem.trim();
    const trimmedDest = miniDestino.trim();
    const hasRoute = trimmedOrigin.length >= 3 && trimmedDest.length >= 3;
    const submitter =
      (e.nativeEvent as SubmitEvent).submitter instanceof HTMLElement
        ? ((e.nativeEvent as SubmitEvent).submitter as HTMLElement)
        : null;
    openDrawer(
      {
        servicoId: miniServico,
        origem: trimmedOrigin,
        destino: trimmedDest,
        dataSaida: miniData || dataSaida,
        horaSaida: miniHora || horaSaida,
        startAtStep: hasRoute ? 3 : 2,
        origemFluxo: 'site',
        qrBanner: false,
      },
      submitter
    );
  };

  const statItems = [
    {
      key: 'electric',
      value: 100,
      suffix: '%',
      unit: t('stats.electricUnit'),
      label: t('stats.electricLabel'),
      toneClass: 'bg-[#1D2630]',
    },
    {
      key: 'brandNew',
      value: 0,
      suffix: '',
      unit: t('stats.brandNewUnit'),
      label: t('stats.brandNewLabel'),
      toneClass: 'bg-[var(--steel-dark)]',
    },
    {
      key: 'advance',
      value: 6,
      suffix: '',
      unit: t('stats.advanceUnit'),
      label: t('stats.advanceLabel'),
      toneClass: 'bg-[#1D2630]',
    },
  ];

  const alternatingBlocks = [
    {
      id: 'interior',
      title: t('blocks.interiorTitle'),
      text: t('blocks.interiorText'),
      asset: MEDIA_ASSETS.interiorBancoTras,
      textFirstOnDesktop: true,
      panelClass: 'bg-[var(--steel)]',
      cta: null as null | { label: string; onClick: () => void },
    },
    {
      id: 'waiting',
      title: t('blocks.waitingTitle'),
      text: t('blocks.waitingText'),
      asset: MEDIA_ASSETS.executivoCorporativo,
      textFirstOnDesktop: false,
      panelClass: 'bg-[var(--steel-dark)]',
      cta: null as null | { label: string; onClick: () => void },
    },
    {
      id: 'senior',
      title: t('blocks.seniorTitle'),
      text: t('blocks.seniorText'),
      asset: MEDIA_ASSETS.melhorIdadeEmbarque,
      textFirstOnDesktop: true,
      panelClass: 'bg-[var(--steel)]',
      cta: {
        label: t('blocks.seniorCta'),
        onClick: () => onNavigate('senior'),
      },
    },
    {
      id: 'trips',
      title: t('blocks.tripsTitle'),
      text: t('blocks.tripsText'),
      asset: MEDIA_ASSETS.estradaPedraAzul,
      textFirstOnDesktop: false,
      panelClass: 'bg-[var(--steel-dark)]',
      cta: null as null | { label: string; onClick: () => void },
    },
  ];

  const currencyPrefix = 'R$ ';
  const decimalSep = lang === 'en' ? '.' : ',';

  return (
    <main className="relative bg-[var(--midnight)] text-[#E6E6E6]">
      <SectionDotNav />

      {/* ==================== HERO EM DUAS FAIXAS + MARCA D'ÁGUA GFS + CARRO EM CAMADAS ==================== */}
      <section
        id="hero"
        ref={heroRef}
        className="relative overflow-hidden bg-[var(--steel)] text-white pt-16 sm:pt-20"
      >
        {/* Divisão horizontal de fundo: Steel Blue em cima, Steel Dark / Midnight em baixo */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-[56%] sm:h-[58%] bg-[var(--steel)]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[44%] sm:h-[42%] bg-gradient-to-b from-[var(--steel-dark)] to-[#1A222B]"
        />

        {/* Marca d'água gigante GFS em Titanium Silver (8% a 12% opacidade) com parallax */}
        <motion.div
          style={prefersReduced ? undefined : { x: watermarkX }}
          aria-hidden="true"
          className="pointer-events-none select-none absolute inset-x-0 top-12 sm:top-14 flex items-center justify-center overflow-hidden"
        >
          <span className="font-brand font-thin text-[36vw] sm:text-[26vw] lg:text-[22vw] leading-[0.82] tracking-[0.06em] text-[var(--titanium)] opacity-[0.11] text-center whitespace-nowrap">
            GFS
          </span>
        </motion.div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-10 pb-8 sm:pb-12">
          {/* Desktop: título curto, parágrafo curto e botão contorno no canto superior direito */}
          <div className="hidden md:flex justify-end mb-2">
            <div className="max-w-md text-left space-y-4">
              <p className="eyebrow text-[var(--champagne)]">{t('hero.eyebrow')}</p>
              <h1 className="font-brand font-medium text-3xl lg:text-[40px] text-white leading-[1.12]">
                {t('hero.title')}
              </h1>
              <p className="text-base text-[#E6E6E6] leading-relaxed">
                {t('hero.subtitle')}
              </p>
              <div className="pt-1 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={(e) =>
                    openDrawer({ startAtStep: 1, origemFluxo: 'site', qrBanner: false }, e.currentTarget)
                  }
                  className="min-h-[52px] px-7 inline-flex items-center justify-center border border-white/85 hover:border-[var(--champagne)] hover:bg-[var(--champagne)] text-white hover:text-[var(--midnight)] text-sm uppercase tracking-[0.14em] font-medium rounded-[4px] transition-colors whitespace-nowrap gfs-btn-slide"
                >
                  {t('hero.ctaPrimary')}
                </button>
              </div>
            </div>
          </div>

          {/* Carro de perfil lateral pousado sobre a linha divisória das faixas */}
          <div className="relative z-10 w-full max-w-5xl mx-auto my-4 sm:my-6">
            <CarShowroom />
          </div>

          {/* Desktop: Mini-Simulador horizontal em Midnight Black com borda Champagne Gold */}
          <form
            onSubmit={handleMiniSubmit}
            aria-label={t('hero.miniSim.eyebrow')}
            className="hidden md:grid relative z-20 mt-3 lg:mt-4 md:grid-cols-6 lg:grid-cols-[minmax(205px,1.35fr)_minmax(145px,1fr)_minmax(145px,1fr)_minmax(240px,1.45fr)_auto] gap-3 p-4 bg-[var(--midnight)] border border-[var(--champagne)]/65 rounded-[4px] shadow-2xl items-end"
          >
            <div className="md:col-span-2 lg:col-span-1">
              <label
                htmlFor={miniServiceId}
                className="block text-[11px] uppercase tracking-[0.14em] text-[var(--champagne)] mb-1.5"
              >
                {t('hero.miniSim.serviceLabel')}
              </label>
              <div className="relative">
                <select
                  id={miniServiceId}
                  value={miniServico}
                  onChange={(e) => setMiniServico(e.target.value as ServiceId)}
                  className="w-full h-[46px] pl-3 pr-8 appearance-none bg-[#13181E] text-white border border-white/15 focus:border-[var(--champagne)] focus:outline-none rounded-[4px] text-sm cursor-pointer truncate"
                >
                  {SERVICOS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {t(`services.items.${s.id}.nomeCurto`)}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  className="w-4 h-4 text-[var(--champagne)]/80 pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2"
                  strokeWidth={1.75}
                  aria-hidden="true"
                />
              </div>
            </div>

            <div className="md:col-span-2 lg:col-span-1">
              <label
                htmlFor={miniOriginId}
                className="block text-[11px] uppercase tracking-[0.14em] text-[var(--champagne)] mb-1.5"
              >
                {t('hero.miniSim.originLabel')}
              </label>
              <input
                id={miniOriginId}
                type="text"
                value={miniOrigem}
                onChange={(e) => setMiniOrigem(e.target.value)}
                placeholder={t('hero.miniSim.originPlaceholder')}
                className="w-full h-[46px] px-3 bg-[#13181E] text-white placeholder:text-white/50 border border-white/15 focus:border-[var(--champagne)] focus:outline-none rounded-[4px] text-sm"
              />
            </div>

            <div className="md:col-span-2 lg:col-span-1">
              <label
                htmlFor={miniDestId}
                className="block text-[11px] uppercase tracking-[0.14em] text-[var(--champagne)] mb-1.5"
              >
                {t('hero.miniSim.destLabel')}
              </label>
              <input
                id={miniDestId}
                type="text"
                value={miniDestino}
                onChange={(e) => setMiniDestino(e.target.value)}
                placeholder={t('hero.miniSim.destPlaceholder')}
                className="w-full h-[46px] px-3 bg-[#13181E] text-white placeholder:text-white/50 border border-white/15 focus:border-[var(--champagne)] focus:outline-none rounded-[4px] text-sm"
              />
            </div>

            <div className="md:col-span-4 lg:col-span-1">
              <label
                htmlFor={miniDateId}
                className="block text-[11px] uppercase tracking-[0.14em] text-[var(--champagne)] mb-1.5"
              >
                {t('hero.miniSim.dateTimeLabel')}
              </label>
              <div className="flex gap-2">
                <input
                  id={miniDateId}
                  type="date"
                  value={miniData}
                  onChange={(e) => setMiniData(e.target.value)}
                  className="flex-[1.35] min-w-[138px] h-[46px] px-2.5 bg-[#13181E] text-white border border-white/15 focus:border-[var(--champagne)] focus:outline-none rounded-[4px] text-sm tabular-nums [color-scheme:dark]"
                />
                <input
                  id={miniTimeId}
                  type="time"
                  aria-label={t('simulator.timeOutLabel')}
                  value={miniHora}
                  onChange={(e) => setMiniHora(e.target.value)}
                  className="flex-[0.85] min-w-[94px] h-[46px] px-2.5 bg-[#13181E] text-white border border-white/15 focus:border-[var(--champagne)] focus:outline-none rounded-[4px] text-sm tabular-nums [color-scheme:dark]"
                />
              </div>
            </div>

            <div className="md:col-span-2 lg:col-span-1">
              <button
                type="submit"
                className="w-full h-[46px] px-6 inline-flex items-center justify-center gap-2 bg-[var(--champagne)] hover:bg-[#D1B483] text-[var(--midnight)] font-medium text-sm tracking-[0.02em] rounded-[4px] transition-colors whitespace-nowrap gfs-btn-slide"
              >
                <Calculator className="w-4 h-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
                <span>{t('hero.miniSim.submitLabel')}</span>
              </button>
            </div>
          </form>

          {/* Mobile: título, botão Champagne amplo abaixo do carro e linha de apoio */}
          <div className="md:hidden mt-7 space-y-3.5 text-left">
            <p className="eyebrow text-[var(--champagne)]">{t('hero.eyebrow')}</p>
            <h1 className="font-brand font-medium text-2xl sm:text-3xl text-white leading-[1.14]">
              {t('hero.title')}
            </h1>
            <p className="text-base text-[#E6E6E6] leading-relaxed">{t('hero.subtitle')}</p>
            <div className="pt-2 space-y-2">
              <button
                type="button"
                onClick={(e) =>
                  openDrawer({ startAtStep: 1, origemFluxo: 'site', qrBanner: false }, e.currentTarget)
                }
                className="w-full min-h-[54px] px-6 inline-flex items-center justify-center gap-2.5 bg-[var(--champagne)] text-[var(--midnight)] text-base font-medium tracking-[0.04em] rounded-[4px]"
              >
                <Calculator className="w-5 h-5 shrink-0" strokeWidth={1.75} aria-hidden="true" />
                <span>{t('hero.miniSim.mobileButton')}</span>
              </button>
              <p className="text-xs text-[#E6E6E6]/85 text-center">
                {t('hero.miniSim.mobileHelper')}
              </p>
            </div>
          </div>
        </div>

        {/* ==================== FAIXA DE NÚMEROS (3 COLUNAS DESKTOP / SNAP CAROUSEL MOBILE) ==================== */}
        <div className="relative z-10 border-t border-white/10">
          {/* Desktop 3 colunas */}
          <div className="hidden md:grid md:grid-cols-3">
            {statItems.map((item) => (
              <div
                key={item.key}
                className={`${item.toneClass} px-6 pt-3 pb-12 text-center flex flex-col items-center`}
              >
                <VerticalDottedConnector height={42} className="mb-3" />
                <div className="font-brand font-thin text-5xl lg:text-6xl text-white leading-none tabular-nums inline-flex items-baseline">
                  <AnimatedCounter target={item.value} />
                  {item.suffix && <span>{item.suffix}</span>}
                  <sup className="text-lg lg:text-xl font-light text-[var(--champagne)] ml-1.5 -top-5">
                    {item.unit}
                  </sup>
                </div>
                <p className="mt-3.5 small-caps-label text-xs sm:text-sm text-[#E6E6E6] max-w-[230px]">
                  {item.label}
                </p>
              </div>
            ))}
          </div>

          {/* Mobile carrossel com scroll-snap e indicador de pontos */}
          <div className="md:hidden bg-[#1D2630] pb-8">
            <div
              ref={statsTrackRef}
              onScroll={handleStatsScroll}
              className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth no-scrollbar"
            >
              {statItems.map((item) => (
                <div
                  key={item.key}
                  className="min-w-full snap-center px-6 pt-3 pb-4 text-center flex flex-col items-center"
                >
                  <VerticalDottedConnector height={26} className="mb-2.5" />
                  <div className="font-brand font-thin text-5xl text-white leading-none tabular-nums inline-flex items-baseline">
                    <AnimatedCounter target={item.value} />
                    {item.suffix && <span>{item.suffix}</span>}
                    <sup className="text-lg font-light text-[var(--champagne)] ml-1 -top-5">
                      {item.unit}
                    </sup>
                  </div>
                  <p className="mt-3 small-caps-label text-xs text-[#E6E6E6] max-w-[240px]">
                    {item.label}
                  </p>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-center gap-2.5 pt-2">
              {statItems.map((item, idx) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => scrollToStatSlide(idx)}
                  aria-label={`${idx + 1} / ${statItems.length}`}
                  className="p-2"
                >
                  <span
                    className={`block rounded-full transition-all ${
                      activeStatIdx === idx
                        ? 'w-5 h-2 bg-[var(--champagne)]'
                        : 'w-2 h-2 bg-[var(--titanium)]/60'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ==================== SEGUNDA SEÇÃO: SIMULADOR DE PREÇO EM DESTAQUE + CHEGADA DO CARRO ==================== */}
      <section
        id="simulador"
        aria-labelledby="simulador-titulo"
        className="relative bg-[var(--midnight)] lg:min-h-screen py-16 sm:py-24 border-t border-white/10 overflow-hidden flex flex-col justify-center"
      >
        {/* Halo radial sutil em Champagne Gold atrás do formulário */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_55%_50%,rgba(194,164,114,0.11),rgba(13,13,13,0)_68%)]"
        />

        <div className="relative z-10 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* No mobile o carro estacionado fica logo acima do cabeçalho/formulário; no desktop fica ao lado */}
            <div className="order-1 lg:order-2 lg:col-span-5 max-w-md lg:max-w-none mx-auto w-full">
              <RollingElectricCar mode="arrival" />
            </div>

            <div className="order-2 lg:order-1 lg:col-span-7 space-y-3">
              <span className="eyebrow text-[var(--champagne)] block">
                {t('simulator.eyebrow')}
              </span>
              <h2
                id="simulador-titulo"
                className="font-brand font-medium text-2xl sm:text-3xl lg:text-4xl text-white leading-[1.12]"
              >
                {t('simulator.title')}
              </h2>
              <p className="text-base sm:text-lg text-[#E6E6E6] max-w-2xl">{t('simulator.subtitle')}</p>
            </div>
          </div>

          <SimulatorWizard mapsAvailable={mapsAvailable} variant="inline" origemFluxo="site" />
        </div>
      </section>

      {/* ==================== BLOCOS ALTERNADOS EM TABULEIRO (50/50) ==================== */}
      <section id="destaques" aria-label={t('dotNav.blocks')}>
        {alternatingBlocks.map((block) => (
          <div
            key={block.id}
            className={`grid grid-cols-1 lg:grid-cols-2 ${block.panelClass}`}
          >
            {/* No mobile, imagem vem SEMPRE em cima (order-1). No desktop alterna pelo grid. */}
            <div
              className={`order-1 ${
                block.textFirstOnDesktop ? 'lg:order-2' : 'lg:order-1'
              } aspect-[4/3] lg:aspect-auto lg:min-h-[420px] bg-[var(--midnight)]`}
            >
              <ClipRevealImage
                src={block.asset.src}
                alt={t(block.asset.altKey)}
                fallbackLabel={t(block.asset.fallbackKey)}
                containerClassName="w-full h-full"
                className="w-full h-full object-cover"
              />
            </div>

            <div
              className={`order-2 ${
                block.textFirstOnDesktop ? 'lg:order-1' : 'lg:order-2'
              } flex items-center px-6 sm:px-12 lg:px-16 py-12 sm:py-16 lg:py-20`}
            >
              <Reveal className="w-full max-w-lg mx-auto lg:mx-0 space-y-5">
                <div className="flex items-center gap-4">
                  {!block.textFirstOnDesktop && (
                    <HorizontalDottedConnector direction="left" className="hidden lg:block" />
                  )}
                  <h2 className="font-brand font-medium text-2xl sm:text-3xl text-white">
                    {block.title}
                  </h2>
                  {block.textFirstOnDesktop && (
                    <HorizontalDottedConnector direction="right" className="hidden lg:block" />
                  )}
                </div>

                <p className="text-base sm:text-lg text-[#E6E6E6] leading-relaxed">{block.text}</p>

                {block.cta && (
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={block.cta.onClick}
                      className="min-h-[56px] px-7 inline-flex items-center justify-center gap-2.5 bg-[var(--champagne)] hover:bg-[#D1B483] text-[var(--midnight)] text-base sm:text-lg font-medium rounded-[4px] transition-colors gfs-btn-slide"
                    >
                      <span>{block.cta.label}</span>
                      <ArrowRight className="w-5 h-5" strokeWidth={1.5} aria-hidden="true" />
                    </button>
                  </div>
                )}
              </Reveal>
            </div>
          </div>
        ))}
      </section>

      {/* ==================== 5 SERVIÇOS EM CARDS ESCUROS + CARROSSEL MOBILE ==================== */}
      <section
        id="servicos"
        aria-labelledby="servicos-titulo"
        className="bg-[var(--midnight)] py-16 sm:py-24 border-t border-white/10"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <Reveal>
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
              <div className="space-y-3 max-w-2xl">
                <span className="eyebrow text-[var(--champagne)] block">
                  {t('services.eyebrow')}
                </span>
                <h2
                  id="servicos-titulo"
                  className="font-brand font-medium text-2xl sm:text-3xl lg:text-4xl text-white leading-[1.12]"
                >
                  {t('services.title')}
                </h2>
              </div>
              <p className="text-base sm:text-lg text-[#E6E6E6] max-w-xl">{t('services.subtitle')}</p>
            </div>
          </Reveal>

          {/* Horizontal snap carousel no mobile (mostra pedaço do próximo card); 5 colunas no desktop */}
          <div className="flex lg:grid lg:grid-cols-5 gap-4 overflow-x-auto lg:overflow-visible snap-x snap-mandatory pb-3 lg:pb-0 -mx-4 px-4 lg:mx-0 lg:px-0">
            {SERVICOS.map((srv) => {
              const priceSpec = STARTING_PRICES[srv.id];
              return (
                <article
                  key={srv.id}
                  className="w-[80vw] sm:w-[46vw] lg:w-auto shrink-0 snap-start bg-[#14191F] border border-[var(--titanium)]/35 hover:border-[var(--champagne)] rounded-[4px] p-5 flex flex-col justify-between gap-5 transition-transform duration-200 hover:-translate-y-1"
                >
                  <div className="space-y-2.5">
                    <span className="text-xs uppercase tracking-[0.15em] text-[var(--champagne)] block">
                      {t('services.fromPrice')}
                    </span>
                    <p className="font-brand font-light text-3xl text-white tabular-nums leading-none">
                      <span className="text-base font-normal text-[#E6E6E6] mr-1">
                        {currencyPrefix}
                      </span>
                      <AnimatedCounter
                        target={priceSpec.amount}
                        decimals={priceSpec.decimals}
                        decimalSeparator={decimalSep}
                      />
                      {priceSpec.unitKey && (
                        <span className="text-base font-normal text-[#E6E6E6]">
                          {t(priceSpec.unitKey)}
                        </span>
                      )}
                    </p>
                    <h3 className="font-brand font-medium text-lg sm:text-xl text-white pt-1">
                      {t(`services.items.${srv.id}.nome`)}
                    </h3>
                    <p className="text-sm sm:text-base text-[#E6E6E6] leading-relaxed">
                      {t(`services.items.${srv.id}.descricao`)}
                    </p>
                  </div>

                  <div className="space-y-4 pt-3 border-t border-white/10">
                    <p className="text-sm text-[#E6E6E6]/85">
                      <strong className="font-medium text-white">
                        {t('services.idealLabel')}:
                      </strong>{' '}
                      {t(`services.items.${srv.id}.idealPara`)}
                    </p>
                    <button
                      type="button"
                      onClick={(e) =>
                        openDrawer(
                          { servicoId: srv.id, startAtStep: 2, origemFluxo: 'site', qrBanner: false },
                          e.currentTarget
                        )
                      }
                      className="w-full min-h-[52px] px-4 inline-flex items-center justify-center gap-2 border border-white/40 hover:border-[var(--champagne)] hover:bg-[var(--champagne)] text-white hover:text-[var(--midnight)] text-base font-medium rounded-[4px] transition-colors"
                    >
                      <span>{t('services.ctaSimulate')}</span>
                      <ArrowRight className="w-4 h-4 shrink-0" strokeWidth={1.5} aria-hidden="true" />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* ==================== FAIXA FINA DE CHAMADA RÁPIDA (STEEL BLUE) ==================== */}
      <section
        aria-label={t('calloutBanner.cta')}
        className="bg-[var(--steel)] border-y border-white/10 py-6 sm:py-8"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <p className="font-brand font-medium text-xl sm:text-2xl text-white">
            {t('calloutBanner.text')}
          </p>
          <button
            type="button"
            onClick={(e) =>
              openDrawer({ startAtStep: 1, origemFluxo: 'site', qrBanner: false }, e.currentTarget)
            }
            className="min-h-[52px] px-7 inline-flex items-center justify-center gap-2.5 bg-[var(--champagne)] hover:bg-[#D1B483] text-[var(--midnight)] text-base font-medium rounded-[4px] transition-colors whitespace-nowrap shrink-0 gfs-btn-slide"
          >
            <Calculator className="w-5 h-5 shrink-0" strokeWidth={1.75} aria-hidden="true" />
            <span>{t('calloutBanner.cta')}</span>
          </button>
        </div>
      </section>

      {/* ==================== COMO FUNCIONA ==================== */}
      <section
        id="como-funciona"
        aria-labelledby="como-funciona-titulo"
        className="bg-[var(--steel)] py-16 sm:py-24 border-t border-white/10"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <Reveal>
            <div className="max-w-2xl space-y-3">
              <span className="eyebrow text-[var(--champagne)] block">
                {t('howItWorks.eyebrow')}
              </span>
              <h2
                id="como-funciona-titulo"
                className="font-brand font-medium text-2xl sm:text-3xl lg:text-4xl text-white leading-[1.12]"
              >
                {t('howItWorks.title')}
              </h2>
            </div>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {howSteps.map((passo) => (
              <div
                key={passo.num}
                className="pt-6 border-t border-[var(--champagne)]/75 space-y-2.5"
              >
                <span className="font-brand font-light text-4xl text-[var(--champagne)] tabular-nums block">
                  {passo.num}
                </span>
                <h3 className="font-brand font-medium text-xl sm:text-2xl text-white">
                  {passo.titulo}
                </h3>
                <p className="text-base text-[#E6E6E6] leading-relaxed">
                  {passo.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== PARA QUEM É + VIP WHATSAPP ==================== */}
      <section
        aria-labelledby="para-quem-titulo"
        className="bg-[var(--midnight)] py-16 sm:py-24 border-t border-white/10"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            <div className="lg:col-span-5 space-y-3">
              <span className="eyebrow text-[var(--champagne)] block">
                {t('audience.eyebrow')}
              </span>
              <h2
                id="para-quem-titulo"
                className="font-brand font-medium text-2xl sm:text-3xl lg:text-4xl text-white leading-[1.12]"
              >
                {t('audience.title')}
              </h2>
            </div>

            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 border-t border-white/15">
              {audienceItems.map((item, idx) => (
                <div
                  key={item}
                  className="py-4 sm:px-4 border-b border-white/15 flex items-baseline gap-3"
                >
                  <span className="text-sm font-medium text-[var(--champagne)] tabular-nums shrink-0">
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  <span className="text-base sm:text-lg font-normal text-[#E6E6E6]">{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[var(--steel-dark)] border border-[var(--titanium)]/30 rounded-[4px] p-7 sm:p-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="max-w-2xl space-y-2.5">
              <span className="eyebrow text-[var(--champagne)] block">{t('vip.eyebrow')}</span>
              <h2 className="font-brand font-medium text-2xl sm:text-3xl text-white">
                {t('vip.title')}
              </h2>
              <p className="text-base sm:text-lg text-[#E6E6E6] leading-relaxed">{t('vip.text')}</p>
            </div>

            <a
              href={SITE_CONFIG.WHATSAPP_GROUP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[52px] px-7 inline-flex items-center justify-center gap-3 border border-[var(--champagne)] hover:bg-[var(--champagne)] text-white hover:text-[var(--midnight)] text-base font-medium rounded-[4px] transition-colors whitespace-nowrap shrink-0 gfs-btn-slide"
            >
              <MessageCircle className="w-5 h-5 shrink-0" strokeWidth={1.5} aria-hidden="true" />
              <span>{t('vip.cta')}</span>
            </a>
          </div>
        </div>
      </section>

      {/* ==================== DÚVIDAS FREQUENTES ==================== */}
      <section
        id="duvidas"
        aria-labelledby="duvidas-titulo"
        className="bg-[var(--steel-dark)] py-16 sm:py-24 border-t border-white/10"
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="space-y-3">
            <span className="eyebrow text-[var(--champagne)] block">{t('faq.eyebrow')}</span>
            <h2
              id="duvidas-titulo"
              className="font-brand font-medium text-2xl sm:text-3xl lg:text-4xl text-white leading-[1.12]"
            >
              {t('faq.title')}
            </h2>
          </div>

          <div className="divide-y divide-white/15 border-y border-white/15">
            {faqItems.map((faq, idx) => {
              const isOpen = openFaqIdx === idx;
              return (
                <div key={faq.pergunta}>
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setOpenFaqIdx(isOpen ? null : idx)}
                    className="w-full min-h-[60px] py-4 flex items-center justify-between gap-4 text-left text-base sm:text-lg font-medium text-white hover:text-[var(--champagne)] transition-colors"
                  >
                    <span>{faq.pergunta}</span>
                    {isOpen ? (
                      <ChevronUp className="w-5 h-5 shrink-0 text-[var(--champagne)]" strokeWidth={1.5} aria-hidden="true" />
                    ) : (
                      <ChevronDown className="w-5 h-5 shrink-0 text-[var(--champagne)]" strokeWidth={1.5} aria-hidden="true" />
                    )}
                  </button>

                  {isOpen && (
                    <div className="pb-5 pr-8 text-base text-[#E6E6E6] leading-relaxed">
                      {faq.resposta}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ==================== CONTATO DIRETO ==================== */}
      <section
        id="contato"
        aria-labelledby="contato-titulo"
        className="bg-[var(--midnight)] py-16 sm:py-20 border-t border-white/10"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="max-w-2xl space-y-2.5">
            <span className="eyebrow text-[var(--champagne)] block">{t('contact.eyebrow')}</span>
            <h2 id="contato-titulo" className="font-brand font-medium text-2xl sm:text-3xl text-white">
              {t('contact.title')}
            </h2>
            <p className="text-base sm:text-lg text-[#E6E6E6]">{t('contact.subtitle')}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <a
              href={whatsappDirectUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-6 rounded-[4px] border border-[var(--titanium)]/35 hover:border-[var(--champagne)] bg-[#14191F] transition-colors space-y-2"
            >
              <div className="flex items-center gap-2.5 text-[var(--champagne)]">
                <MessageCircle className="w-5 h-5" strokeWidth={1.5} aria-hidden="true" />
                <span className="eyebrow">{t('contact.whatsappLabel')}</span>
              </div>
              <p className="font-brand font-light text-xl sm:text-2xl text-white tabular-nums">
                {SITE.whatsappExibicao}
              </p>
            </a>

            <a
              href={SITE_CONFIG.EMAIL_MAILTO_URL}
              className="p-6 rounded-[4px] border border-[var(--titanium)]/35 hover:border-[var(--champagne)] bg-[#14191F] transition-colors space-y-2"
            >
              <div className="flex items-center gap-2.5 text-[var(--champagne)]">
                <Mail className="w-5 h-5" strokeWidth={1.5} aria-hidden="true" />
                <span className="eyebrow">{t('contact.emailLabel')}</span>
              </div>
              <p className="font-brand font-light text-lg sm:text-xl text-white break-all">
                {SITE.email}
              </p>
            </a>

            <a
              href={SITE.instagramLink}
              target="_blank"
              rel="noopener noreferrer"
              className="p-6 rounded-[4px] border border-[var(--titanium)]/35 hover:border-[var(--champagne)] bg-[#14191F] transition-colors space-y-2"
            >
              <div className="flex items-center gap-2.5 text-[var(--champagne)]">
                <Instagram className="w-5 h-5" strokeWidth={1.5} aria-hidden="true" />
                <span className="eyebrow">{t('contact.instagramLabel')}</span>
              </div>
              <p className="font-brand font-light text-xl sm:text-2xl text-white">
                {SITE.instagramUsuario}
              </p>
            </a>
          </div>
        </div>
      </section>

      {/* ==================== CHAMADA FINAL (FAIXA CLARA IVORY COM BOTÃO ÚNICO CENTRALIZADO) ==================== */}
      <section
        aria-label={t('finalCta.buttonSingle')}
        className="bg-[var(--ivory)] text-[var(--midnight)] py-16 sm:py-20 px-4 text-center"
      >
        <div className="max-w-3xl mx-auto flex flex-col items-center space-y-4">
          <button
            type="button"
            onClick={(e) =>
              openDrawer({ startAtStep: 1, origemFluxo: 'site', qrBanner: false }, e.currentTarget)
            }
            className="min-h-[60px] px-10 inline-flex items-center justify-center bg-[var(--midnight)] hover:bg-[#1E252D] text-white text-base sm:text-lg uppercase tracking-[0.14em] font-medium rounded-[4px] transition-colors gfs-btn-slide"
          >
            {t('finalCta.buttonSingle')}
          </button>
          <p className="text-sm sm:text-base text-[var(--text-muted-on-light)]">
            {t('finalCta.disclaimerNote')}
          </p>
        </div>
      </section>
    </main>
  );
};
