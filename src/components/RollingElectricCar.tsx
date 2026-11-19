import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AnimatePresence,
  animate,
  motion,
  useInView,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from 'motion/react';
import { CARRO_CONFIG } from '../config/carro';

interface RollingElectricCarProps {
  mode: 'hero' | 'arrival';
  heroRef?: React.RefObject<HTMLElement | null>;
  className?: string;
}

type HotspotId = 'electric' | 'cabin' | 'trunk';

interface HotspotDef {
  id: HotspotId;
  leftPct: number;
  topPct: number;
}

const HERO_HOTSPOTS: HotspotDef[] = [
  { id: 'electric', leftPct: 16, topPct: 50 },
  { id: 'cabin', leftPct: 52, topPct: 33 },
  { id: 'trunk', leftPct: 83, topPct: 41 },
];

export const RollingElectricCar: React.FC<RollingElectricCarProps> = ({
  mode,
  heroRef,
  className = '',
}) => {
  const { t } = useTranslation();
  const prefersReduced = useReducedMotion();
  const arrivalRef = useRef<HTMLDivElement | null>(null);
  const carStageRef = useRef<HTMLDivElement | null>(null);
  const arrivalInView = useInView(arrivalRef, { once: true, amount: 0.25 });

  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [lowPowerMode, setLowPowerMode] = useState(false);
  const [isAnimating, setIsAnimating] = useState(!prefersReduced);
  const [shineTrigger, setShineTrigger] = useState(0);
  const [lightsPhase, setLightsPhase] = useState<'bright' | 'dim'>('bright');
  const [lightsPinnedOn, setLightsPinnedOn] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [activeHotspot, setActiveHotspot] = useState<HotspotId | null>(null);

  const debugMode = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('debug-carro') === '1';
  }, []);

  useEffect(() => {
    const updateViewport = () => setIsMobileViewport(window.innerWidth < 768);
    updateViewport();
    window.addEventListener('resize', updateViewport, { passive: true });
    return () => window.removeEventListener('resize', updateViewport);
  }, []);

  // Detectar aparelhos com menos recursos para desabilitar reflexo e motion blur
  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) {
      setLowPowerMode(true);
      return;
    }

    if (prefersReduced) return;

    let frameCount = 0;
    let slowFrames = 0;
    let lastTs = performance.now();
    let rafId = 0;

    const sampleFps = (now: number) => {
      const delta = now - lastTs;
      lastTs = now;
      frameCount++;
      if (delta > 34) slowFrames++;
      if (frameCount < 35) {
        rafId = window.requestAnimationFrame(sampleFps);
      } else if (slowFrames >= 12) {
        setLowPowerMode(true);
      }
    };

    rafId = window.requestAnimationFrame(sampleFps);
    return () => window.cancelAnimationFrame(rafId);
  }, [prefersReduced]);

  const initialOffset = prefersReduced
    ? 0
    : mode === 'hero'
      ? isMobileViewport
        ? 110
        : 260
      : isMobileViewport
        ? 100
        : 220;

  const entranceX = useMotionValue(initialOffset);
  const pitchDeg = useMotionValue(0);
  const wheelBlurOpacity = useMotionValue(0);

  // Micro-interação de ponteiro (iluminação de estúdio e micro-inclinação responsiva)
  const rawPointerPct = useMotionValue(50);
  const smoothPointerPct = useSpring(rawPointerPct, { stiffness: 180, damping: 28 });
  const pointerTiltDeg = useTransform(smoothPointerPct, [0, 100], [-0.35, 0.35]);
  const combinedPitch = useTransform([pitchDeg, pointerTiltDeg], ([p, tDeg]: number[]) =>
    prefersReduced || mode !== 'hero' ? p : p + tDeg
  );

  const { scrollYProgress } = useScroll(
    heroRef && mode === 'hero'
      ? {
          target: heroRef,
          offset: ['start start', 'end start'],
        }
      : undefined
  );

  // Movimento horizontal durante a rolagem no hero: avança para a esquerda (frente do carro) sem dar ré
  const scrollTravelPx = mode === 'hero' ? (isMobileViewport ? -85 : -340) : 0;
  const scrollX = useTransform(scrollYProgress, [0, 1], [0, scrollTravelPx]);

  const totalX = useTransform([entranceX, scrollX], ([ex, sx]: number[]) =>
    prefersReduced ? 0 : ex + sx
  );

  // Giro anti-horário proporcional ao avanço para a esquerda (θ = Δx / r) sem escorregar
  const wheelRotateDeg = useTransform(totalX, (x) =>
    prefersReduced ? 0 : (x / CARRO_CONFIG.wheelRadiusPx) * (180 / Math.PI)
  );

  // Balanço vertical discreto de 1px apenas na carroceria enquanto em movimento
  const suspensionY = useTransform(totalX, (x) => {
    if (prefersReduced || Math.abs(x) < 1.5) return 0;
    return Math.sin(x * 0.08) * 1.0;
  });

  // Parallax sutil de asfalto
  const speedLinesX = useTransform(totalX, (x) => (prefersReduced ? 0 : -x * 0.55));

  // Desfoque rotacional proporcional à velocidade instantânea da roda
  const lastXRef = useRef<{ val: number; ts: number }>({ val: initialOffset, ts: performance.now() });
  const decayTimerRef = useRef<number | null>(null);

  useMotionValueEvent(totalX, 'change', (latest) => {
    if (prefersReduced || lowPowerMode) {
      wheelBlurOpacity.set(0);
      return;
    }
    const now = performance.now();
    const dt = Math.max(8, now - lastXRef.current.ts);
    const speedPxPerSec = Math.abs(latest - lastXRef.current.val) / (dt / 1000);
    lastXRef.current = { val: latest, ts: now };

    const normalizedBlur = Math.min(0.65, Math.max(0, (speedPxPerSec - 90) / 520));
    wheelBlurOpacity.set(normalizedBlur);
    setIsAnimating(true);

    if (decayTimerRef.current !== null) window.clearTimeout(decayTimerRef.current);
    decayTimerRef.current = window.setTimeout(() => {
      wheelBlurOpacity.set(0);
      setIsAnimating(false);
    }, 120);
  });

  useEffect(() => {
    return () => {
      if (decayTimerRef.current !== null) window.clearTimeout(decayTimerRef.current);
    };
  }, []);

  // Animação de chegada avançando para a esquerda + leve mergulho de frenagem para a esquerda (-0.5deg)
  useEffect(() => {
    if (prefersReduced) {
      entranceX.set(0);
      pitchDeg.set(0);
      setIsAnimating(false);
      return;
    }

    const shouldArrive = mode === 'hero' || (mode === 'arrival' && arrivalInView);
    if (!shouldArrive) return;

    setIsAnimating(true);
    setLightsPhase('bright');
    entranceX.set(
      mode === 'hero'
        ? isMobileViewport
          ? 110
          : 260
        : isMobileViewport
          ? 100
          : 220
    );

    const ctrl = animate(entranceX, 0, {
      duration: 1.25,
      ease: [0.16, 1, 0.3, 1],
      onComplete: () => {
        setIsAnimating(false);
        setShineTrigger((c) => c + 1);
      },
    });

    const brakeTimeout = window.setTimeout(() => {
      animate(pitchDeg, [0, -0.5, 0.15, 0], {
        duration: 0.65,
        times: [0, 0.42, 0.78, 1],
        ease: 'easeOut',
      });
      setLightsPhase('dim');
    }, 780);

    return () => {
      ctrl.stop();
      window.clearTimeout(brakeTimeout);
    };
  }, [mode, arrivalInView, prefersReduced, isMobileViewport, entranceX, pitchDeg]);

  // Repetir faixa diagonal de brilho na lataria a cada 8 segundos
  useEffect(() => {
    if (prefersReduced) return;
    const interval = window.setInterval(() => {
      setShineTrigger((c) => c + 1);
    }, 8000);
    return () => window.clearInterval(interval);
  }, [prefersReduced]);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (mode !== 'hero' || prefersReduced || lowPowerMode || e.pointerType === 'touch') return;
    const rect = carStageRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return;
    const pct = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    rawPointerPct.set(pct);
  };

  const handleToggleLights = () => {
    setLightsPinnedOn((prev) => !prev);
    if (!prefersReduced) {
      setShineTrigger((c) => c + 1);
    }
  };

  const handleToggleHotspot = (id: HotspotId) => {
    setActiveHotspot((prev) => (prev === id ? null : id));
    if (id === 'electric' || id === 'trunk') {
      setLightsPinnedOn(true);
    }
  };

  const headlightsActive =
    lightsPinnedOn ||
    lightsPhase === 'bright' ||
    isHovered ||
    activeHotspot === 'electric';

  const cabinGlowActive = lightsPinnedOn || activeHotspot === 'cabin';
  const rearGlowActive = lightsPinnedOn || lightsPhase === 'bright' || activeHotspot === 'trunk';

  const spotlightBg = useTransform(
    smoothPointerPct,
    (pct) =>
      `radial-gradient(ellipse at ${pct}% 42%, rgba(194, 164, 114, 0.20) 0%, rgba(92, 118, 145, 0.24) 32%, rgba(44, 57, 70, 0.08) 58%, transparent 78%)`
  );

  const frontWheelStyle = {
    left: `${CARRO_CONFIG.frontWheel.leftPct}%`,
    top: `${CARRO_CONFIG.frontWheel.topPct}%`,
    width: `${CARRO_CONFIG.frontWheel.sizePct}%`,
  };

  const rearWheelStyle = {
    left: `${CARRO_CONFIG.rearWheel.leftPct}%`,
    top: `${CARRO_CONFIG.rearWheel.topPct}%`,
    width: `${CARRO_CONFIG.rearWheel.sizePct}%`,
  };

  const showReflection = !lowPowerMode;
  const showWheelBlur = !lowPowerMode;

  // Fallback estático respeitando prefers-reduced-motion (voltado para a esquerda, mantendo interatividade de legendas)
  if (prefersReduced) {
    return (
      <div ref={arrivalRef} className={`relative w-full select-none ${className}`}>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -inset-x-6 -top-8 bottom-0 rounded-full"
          style={{
            background:
              'radial-gradient(ellipse at 50% 48%, rgba(86, 112, 138, 0.32) 0%, rgba(44, 57, 70, 0.14) 48%, transparent 74%)',
          }}
        />
        <img
          src={CARRO_CONFIG.staticFullSrc}
          alt={t(CARRO_CONFIG.altKey)}
          fetchPriority={mode === 'hero' ? 'high' : 'auto'}
          loading={mode === 'hero' ? 'eager' : 'lazy'}
          decoding="async"
          referrerPolicy="no-referrer"
          className="relative z-10 w-full h-auto block rounded-[4px] -scale-x-100"
        />
      </div>
    );
  }

  return (
    <div
      ref={arrivalRef}
      onPointerMove={handlePointerMove}
      onPointerEnter={() => mode === 'hero' && setIsHovered(true)}
      onPointerLeave={() => {
        setIsHovered(false);
        rawPointerPct.set(50);
      }}
      className={`relative w-full select-none ${className}`}
    >
      {/* Palco isolado do veículo: halo, linha de horizonte, linhas de movimento, sombras e reflexo permanecem presos aqui */}
      <div className="relative w-full pb-8 sm:pb-10">
        {/* Halo de estúdio reativo ao ponteiro no Hero (ou fixo em Steel Blue suave no simulador) */}
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute -inset-x-10 -top-10 bottom-0"
          style={
            mode === 'hero'
              ? { background: spotlightBg }
              : {
                  background:
                    'radial-gradient(ellipse at 50% 45%, rgba(92, 118, 145, 0.30) 0%, rgba(44, 57, 70, 0.10) 48%, transparent 74%)',
                }
          }
        />

        {/* Linha sutil do horizonte de estúdio sob os pneus */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-4 bottom-8 sm:bottom-10 h-px bg-gradient-to-r from-transparent via-[var(--champagne)]/35 to-transparent"
        />

        {/* Linhas horizontais de asfalto em parallax */}
        {mode === 'hero' && (
          <motion.div
            style={{ x: speedLinesX }}
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-3 flex flex-col gap-2.5 opacity-25 overflow-hidden"
          >
            <div className="flex justify-between gap-12 px-8">
              <span className="h-[1px] w-24 bg-[var(--titanium)]" />
              <span className="h-[1px] w-40 bg-[var(--titanium)]" />
              <span className="h-[1px] w-20 bg-[var(--titanium)]" />
            </div>
            <div className="flex justify-around gap-16 px-14">
              <span className="h-[1px] w-32 bg-[var(--titanium)]/65" />
              <span className="h-[1px] w-20 bg-[var(--titanium)]/65" />
            </div>
          </motion.div>
        )}

        {/* Conjunto completo do carro movimentado apenas por transform */}
        <motion.div
          ref={carStageRef}
          style={{ x: totalX }}
          className={`relative mx-auto w-full ${isAnimating ? 'will-change-transform' : ''}`}
          role="img"
          aria-label={t(CARRO_CONFIG.altKey)}
        >
          {/* Feixe volumétrico do farol dianteiro projetado para a esquerda (frente do veículo) */}
          {mode === 'hero' && (
            <motion.div
              aria-hidden="true"
              animate={{
                opacity: headlightsActive ? 0.78 : 0.12,
                scaleX: headlightsActive ? 1 : 0.8,
              }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              style={{
                left: `${CARRO_CONFIG.headlight.leftPct - 24}%`,
                top: `${CARRO_CONFIG.headlight.topPct - 4}%`,
                width: '28%',
                height: '46%',
                transformOrigin: '100% 28%',
                clipPath: 'polygon(100% 22%, 0% 4%, 0% 96%, 100% 48%)',
                background:
                  'linear-gradient(270deg, rgba(235, 244, 255, 0.44) 0%, rgba(212, 228, 248, 0.14) 52%, transparent 100%)',
              }}
              className="pointer-events-none absolute z-10 blur-[2px]"
            />
          )}

          {/* Sombra de contato: ampla e difusa sob todo o veículo + concentrada sob cada pneu */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-[7%] left-[7%] right-[7%] h-6 sm:h-9 rounded-[100%] bg-black/75 blur-xl"
          />
          <div
            aria-hidden="true"
            style={{ left: frontWheelStyle.left, width: `${CARRO_CONFIG.frontWheel.sizePct * 1.12}%` }}
            className="pointer-events-none absolute -bottom-[8%] -translate-x-1/2 h-3 sm:h-4 rounded-[100%] bg-black/95 blur-sm"
          />
          <div
            aria-hidden="true"
            style={{ left: rearWheelStyle.left, width: `${CARRO_CONFIG.rearWheel.sizePct * 1.12}%` }}
            className="pointer-events-none absolute -bottom-[8%] -translate-x-1/2 h-3 sm:h-4 rounded-[100%] bg-black/95 blur-sm"
          />

          {/* Reflexo espelhado contido no piso polido (voltado para a esquerda, fade curto e limpo) */}
          {showReflection && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-[92%] max-h-[56px] sm:max-h-[76px] opacity-[0.11] overflow-hidden"
            >
              <div
                style={{
                  transform: 'scale(-1, -1)',
                  WebkitMaskImage:
                    'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.28) 28%, transparent 56%)',
                  maskImage:
                    'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.28) 28%, transparent 56%)',
                }}
              >
                <img
                  src={CARRO_CONFIG.bodySrc}
                  alt=""
                  decoding="async"
                  referrerPolicy="no-referrer"
                  className="w-full h-auto block blur-[0.8px]"
                />
              </div>
            </div>
          )}

          {/* Camada das RODAS (z-10 ATRÁS da carroceria para o para-lama cobrir o topo do pneu) */}
          <div className="relative">
            <div
              aria-hidden="true"
              style={{
                left: frontWheelStyle.left,
                top: frontWheelStyle.top,
                width: `${CARRO_CONFIG.frontWheel.sizePct * 1.04}%`,
                transform: 'translate(-50%, -50%)',
              }}
              className="absolute aspect-square z-[5] rounded-full bg-[#07090B]/95 pointer-events-none"
            />
            <div
              aria-hidden="true"
              style={{
                left: rearWheelStyle.left,
                top: rearWheelStyle.top,
                width: `${CARRO_CONFIG.rearWheel.sizePct * 1.04}%`,
                transform: 'translate(-50%, -50%)',
              }}
              className="absolute aspect-square z-[5] rounded-full bg-[#07090B]/95 pointer-events-none"
            />

            {/* Roda dianteira (à esquerda, carro apontando para a esquerda) */}
            <motion.div
              style={{
                left: frontWheelStyle.left,
                top: frontWheelStyle.top,
                width: frontWheelStyle.width,
                rotate: wheelRotateDeg,
                x: '-50%',
                y: '-50%',
              }}
              className={`absolute aspect-square z-10 pointer-events-none ${
                isAnimating ? 'will-change-transform' : ''
              }`}
            >
              <img
                src={CARRO_CONFIG.wheelSrc}
                alt=""
                aria-hidden="true"
                fetchPriority={mode === 'hero' ? 'high' : 'auto'}
                decoding="async"
                referrerPolicy="no-referrer"
                className="w-full h-full object-contain block -scale-x-100"
              />
              {showWheelBlur && (
                <motion.img
                  src={CARRO_CONFIG.wheelSrc}
                  alt=""
                  aria-hidden="true"
                  decoding="async"
                  referrerPolicy="no-referrer"
                  style={{ opacity: wheelBlurOpacity }}
                  className="absolute inset-0 w-full h-full object-contain blur-[1.5px] pointer-events-none -scale-x-100"
                />
              )}
            </motion.div>

            {/* Roda traseira (à direita, carro apontando para a esquerda) */}
            <motion.div
              style={{
                left: rearWheelStyle.left,
                top: rearWheelStyle.top,
                width: rearWheelStyle.width,
                rotate: wheelRotateDeg,
                x: '-50%',
                y: '-50%',
              }}
              className={`absolute aspect-square z-10 pointer-events-none ${
                isAnimating ? 'will-change-transform' : ''
              }`}
            >
              <img
                src={CARRO_CONFIG.wheelSrc}
                alt=""
                aria-hidden="true"
                fetchPriority={mode === 'hero' ? 'high' : 'auto'}
                decoding="async"
                referrerPolicy="no-referrer"
                className="w-full h-full object-contain block -scale-x-100"
              />
              {showWheelBlur && (
                <motion.img
                  src={CARRO_CONFIG.wheelSrc}
                  alt=""
                  aria-hidden="true"
                  decoding="async"
                  referrerPolicy="no-referrer"
                  style={{ opacity: wheelBlurOpacity }}
                  className="absolute inset-0 w-full h-full object-contain blur-[1.5px] pointer-events-none -scale-x-100"
                />
              )}
            </motion.div>

            {/* Camada da CARROCERIA (z-20 NA FRENTE das rodas) */}
            <motion.div
              style={{ y: suspensionY, rotate: combinedPitch, transformOrigin: '50% 85%' }}
              className={`relative z-20 ${isAnimating ? 'will-change-transform' : ''}`}
            >
              {/* Imagem da carroceria + máscara de brilho espelhados juntos para a esquerda */}
              <div className="relative -scale-x-100">
                <img
                  src={CARRO_CONFIG.bodySrc}
                  alt={t(CARRO_CONFIG.altKey)}
                  fetchPriority={mode === 'hero' ? 'high' : 'auto'}
                  loading={mode === 'hero' ? 'eager' : 'lazy'}
                  decoding="async"
                  referrerPolicy="no-referrer"
                  className="w-full h-auto block cursor-pointer"
                  onClick={() => mode === 'hero' && handleToggleLights()}
                />

                {/* Faixa diagonal suave de brilho na lataria, mascarada pela própria silhueta */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 overflow-hidden"
                  style={{
                    WebkitMaskImage: `url(${CARRO_CONFIG.bodySrc})`,
                    maskImage: `url(${CARRO_CONFIG.bodySrc})`,
                    WebkitMaskSize: '100% 100%',
                    maskSize: '100% 100%',
                    WebkitMaskRepeat: 'no-repeat',
                    maskRepeat: 'no-repeat',
                  }}
                >
                  <motion.div
                    key={shineTrigger}
                    initial={{ x: '-55%' }}
                    animate={{ x: '165%' }}
                    transition={{ duration: 1.85, ease: [0.22, 1, 0.36, 1] }}
                    className="w-[38%] h-[160%] -top-[30%] relative rotate-[18deg]"
                    style={{
                      background:
                        'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.16) 50%, transparent 100%)',
                    }}
                  />
                </div>
              </div>

              {/* Luz ambiente acolhedora no interior da cabine */}
              {mode === 'hero' && (
                <motion.span
                  aria-hidden="true"
                  animate={{ opacity: cabinGlowActive ? 0.58 : 0 }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                  style={{ left: '50%', top: '28%' }}
                  className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 w-[30%] h-[24%] rounded-full bg-[var(--champagne)]/45 blur-lg"
                />
              )}

              {/* Brilho frio do farol dianteiro (à esquerda) e brilho quente na lanterna traseira (à direita) */}
              <motion.span
                aria-hidden="true"
                animate={{ opacity: headlightsActive ? 0.95 : 0.22 }}
                transition={{ duration: 0.65, ease: 'easeOut' }}
                style={{
                  left: `${CARRO_CONFIG.headlight.leftPct}%`,
                  top: `${CARRO_CONFIG.headlight.topPct}%`,
                }}
                className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 w-[7%] h-[11%] rounded-full bg-[#E9F3FF]/90 blur-md"
              />
              <motion.span
                aria-hidden="true"
                animate={{ opacity: rearGlowActive ? 0.88 : 0.22 }}
                transition={{ duration: 0.65, ease: 'easeOut' }}
                style={{
                  left: `${CARRO_CONFIG.taillight.leftPct}%`,
                  top: `${CARRO_CONFIG.taillight.topPct}%`,
                }}
                className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 w-[5.5%] h-[9.5%] rounded-full bg-[#E8453C]/80 blur-md"
              />

              {/* Hotspots luminosos minimalistas sobre a lataria */}
              {mode === 'hero' &&
                HERO_HOTSPOTS.map((spot) => {
                  const isSelected = activeHotspot === spot.id;
                  return (
                    <button
                      key={spot.id}
                      type="button"
                      onClick={() => handleToggleHotspot(spot.id)}
                      aria-pressed={isSelected}
                      aria-label={t(`hero.interactive.hotspots.${spot.id}.label`)}
                      style={{ left: `${spot.leftPct}%`, top: `${spot.topPct}%` }}
                      className="group absolute -translate-x-1/2 -translate-y-1/2 z-30 p-3 focus-visible:outline-2 focus-visible:outline-[var(--champagne)] rounded-full"
                    >
                      <span className="relative flex items-center justify-center">
                        {!activeHotspot && (
                          <span
                            aria-hidden="true"
                            className="absolute w-6 h-6 rounded-full border border-[var(--champagne)]/45 animate-ping"
                            style={{ animationDuration: '2.8s' }}
                          />
                        )}
                        <span
                          className={`relative flex items-center justify-center rounded-full transition-all duration-300 ${
                            isSelected
                              ? 'w-5 h-5 bg-[var(--champagne)] shadow-[0_0_0_5px_rgba(194,164,114,0.30)]'
                              : 'w-3.5 h-3.5 bg-[#0D0D0D]/85 border border-[var(--champagne)] group-hover:scale-125 group-hover:bg-[var(--champagne)]'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full transition-colors ${
                              isSelected
                                ? 'bg-[#0D0D0D]'
                                : 'bg-[var(--champagne)] group-hover:bg-[#0D0D0D]'
                            }`}
                          />
                        </span>
                      </span>
                    </button>
                  );
                })}

              {/* Ferramenta de calibração visível somente com ?debug-carro=1 */}
              {debugMode && (
                <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-30">
                  <div
                    style={{
                      left: frontWheelStyle.left,
                      top: frontWheelStyle.top,
                      width: frontWheelStyle.width,
                      transform: 'translate(-50%, -50%)',
                    }}
                    className="absolute aspect-square rounded-full border-2 border-dashed border-cyan-300 flex items-center justify-center"
                  >
                    <span className="bg-black/80 text-cyan-200 text-[10px] px-1.5 py-0.5 rounded tabular-nums">
                      F: {CARRO_CONFIG.frontWheel.leftPct}%, {CARRO_CONFIG.frontWheel.topPct}% (
                      {CARRO_CONFIG.frontWheel.sizePct}%)
                    </span>
                  </div>
                  <div
                    style={{
                      left: rearWheelStyle.left,
                      top: rearWheelStyle.top,
                      width: rearWheelStyle.width,
                      transform: 'translate(-50%, -50%)',
                    }}
                    className="absolute aspect-square rounded-full border-2 border-dashed border-[var(--champagne)] flex items-center justify-center"
                  >
                    <span className="bg-black/80 text-[var(--champagne)] text-[10px] px-1.5 py-0.5 rounded tabular-nums">
                      R: {CARRO_CONFIG.rearWheel.leftPct}%, {CARRO_CONFIG.rearWheel.topPct}% (
                      {CARRO_CONFIG.rearWheel.sizePct}%)
                    </span>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        </motion.div>
      </div>

      {/* Régua editorial limpa de inspeção abaixo do palco do veículo (sem sobrepor pneus ou reflexo) */}
      {mode === 'hero' && (
        <div className="relative z-20 max-w-3xl mx-auto px-2 pt-1 pb-2">
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 border-b border-white/12 pb-2.5">
            {HERO_HOTSPOTS.map((spot, idx) => {
              const isSelected = activeHotspot === spot.id;
              return (
                <button
                  key={spot.id}
                  type="button"
                  onClick={() => handleToggleHotspot(spot.id)}
                  className={`relative py-1 text-xs uppercase tracking-[0.12em] transition-colors inline-flex items-center gap-1.5 ${
                    isSelected
                      ? 'text-[var(--champagne)] font-medium'
                      : 'text-[#E6E6E6]/75 hover:text-white'
                  }`}
                >
                  <span className="tabular-nums text-[var(--champagne)]/75">0{idx + 1}</span>
                  <span>{t(`hero.interactive.hotspots.${spot.id}.label`)}</span>
                  {isSelected && (
                    <motion.span
                      layoutId="hero-car-tab-underline"
                      className="absolute -bottom-[11px] inset-x-0 h-[2px] bg-[var(--champagne)]"
                    />
                  )}
                </button>
              );
            })}

            <span className="hidden sm:inline-block w-px h-3.5 bg-white/15" aria-hidden="true" />

            <button
              type="button"
              onClick={handleToggleLights}
              aria-pressed={lightsPinnedOn}
              className={`py-1 text-xs uppercase tracking-[0.12em] transition-colors inline-flex items-center gap-2 ${
                lightsPinnedOn
                  ? 'text-white font-medium'
                  : 'text-[#E6E6E6]/75 hover:text-white'
              }`}
            >
              <span
                aria-hidden="true"
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  lightsPinnedOn
                    ? 'bg-[#E9F3FF] shadow-[0_0_8px_rgba(233,243,255,0.9)]'
                    : 'bg-[var(--titanium)]/55'
                }`}
              />
              <span>
                {lightsPinnedOn
                  ? t('hero.interactive.lightsOn')
                  : t('hero.interactive.lightsOff')}
              </span>
            </button>
          </div>

          <div className="min-h-[44px] flex items-center justify-center pt-2.5">
            <AnimatePresence mode="wait">
              {activeHotspot ? (
                <motion.div
                  key={activeHotspot}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -3 }}
                  transition={{ duration: 0.18 }}
                  className="flex flex-col sm:flex-row sm:items-baseline justify-center gap-x-2.5 gap-y-0.5 text-center sm:text-left px-3"
                >
                  <span className="font-brand font-medium text-sm text-[var(--champagne)] whitespace-nowrap">
                    {t(`hero.interactive.hotspots.${activeHotspot}.title`)}
                  </span>
                  <span className="hidden sm:inline text-white/25" aria-hidden="true">
                    ·
                  </span>
                  <span className="text-sm text-[#E6E6E6]/90 leading-snug">
                    {t(`hero.interactive.hotspots.${activeHotspot}.desc`)}
                  </span>
                </motion.div>
              ) : (
                <motion.p
                  key="idle-hint"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-xs text-[#E6E6E6]/60 text-center"
                >
                  {t('hero.interactive.hint')}
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
};
