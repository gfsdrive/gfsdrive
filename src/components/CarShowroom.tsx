import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useMotionValue, useReducedMotion, useSpring } from 'motion/react';

/**
 * Showroom interativo do BYD Yuan Plus 2026 (preto) usando fotos reais.
 * - Arraste / setas / botões para trocar o ângulo (frente, lateral, traseira)
 * - Hotspots com detalhes do veículo
 * - "Entrar no carro": mergulho na foto do interior com exploração por mouse/toque
 * Fotos em /public/car/*.jpg
 */

type ViewId = 'frente' | 'lateral' | 'traseira' | 'interior';

interface Hotspot {
  id: string;
  x: number; // %
  y: number; // %
  title: string;
  text: string;
}

interface ViewDef {
  id: ViewId;
  label: string;
  src: string;
  alt: string;
  hotspots: Hotspot[];
}

const EXTERIOR: ViewDef[] = [
  {
    id: 'frente',
    label: 'Frente',
    src: '/car/frente.jpg',
    alt: 'BYD Yuan Plus 2026 preto visto de frente em três quartos',
    hotspots: [
      { id: 'farol', x: 44, y: 41, title: 'Faróis Full LED', text: 'Assinatura em LED integrada à barra cromada BYD.' },
      { id: 'roda-f', x: 59, y: 72, title: 'Rodas aro 18"', text: 'Design aerodinâmico para mais autonomia.' },
      { id: 'porta', x: 80, y: 40, title: 'Cabine ampla', text: 'Acesso fácil e espaço de sobra para 5 passageiros.' },
    ],
  },
  {
    id: 'lateral',
    label: 'Lateral',
    src: '/car/lateral.jpg',
    alt: 'BYD Yuan Plus 2026 preto visto de lado',
    hotspots: [
      { id: 'bateria', x: 50, y: 66, title: 'Bateria Blade', text: '100% elétrico, até 410 km de autonomia (ciclo Inmetro).' },
      { id: 'portas', x: 46, y: 45, title: 'Portas traseiras', text: 'Entrada confortável e entre-eixos de 2,72 m.' },
      { id: 'teto', x: 60, y: 30, title: 'Teto panorâmico', text: 'Iluminação natural para toda a cabine.' },
    ],
  },
  {
    id: 'traseira',
    label: 'Traseira',
    src: '/car/traseira.jpg',
    alt: 'BYD Yuan Plus 2026 preto visto de trás em três quartos',
    hotspots: [
      { id: 'malas', x: 76, y: 47, title: 'Porta-malas 440 L', text: 'Abertura elétrica e espaço para toda a bagagem.' },
      { id: 'lanterna', x: 63, y: 46, title: 'Lanterna contínua', text: 'Faixa de LED de ponta a ponta.' },
      { id: 'silencio', x: 40, y: 60, title: 'Silêncio total', text: 'Motor elétrico: viagem suave e sem ruído.' },
    ],
  },
];

const INTERIOR: ViewDef = {
  id: 'interior',
  label: 'Interior',
  src: '/car/interior.jpg',
  alt: 'Interior do BYD Yuan Plus com painel digital e central multimídia',
  hotspots: [
    { id: 'tela', x: 50, y: 44, title: 'Central giratória 15,6"', text: 'Gira entre horizontal e vertical. Android Auto e CarPlay.' },
    { id: 'volante', x: 33, y: 52, title: 'Painel digital', text: 'Todas as informações da viagem à sua frente.' },
    { id: 'bancos', x: 30, y: 88, title: 'Bancos em couro', text: 'Climatizados e com ajuste elétrico.' },
    { id: 'luz', x: 85, y: 38, title: 'Iluminação ambiente', text: 'Clima acolhedor também à noite.' },
  ],
};

ALL_SOURCES_PRELOAD();
function ALL_SOURCES_PRELOAD() {
  if (typeof window === 'undefined') return;
  [...EXTERIOR, INTERIOR].forEach((v) => {
    const img = new Image();
    img.src = v.src;
  });
}

export const CarShowroom: React.FC<{ className?: string }> = ({ className = '' }) => {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState(1);
  const [inside, setInside] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const dragStart = useRef<number | null>(null);

  // Parallax / exploração com o mouse
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 80, damping: 18 });
  const sy = useSpring(my, { stiffness: 80, damping: 18 });
  const [light, setLight] = useState({ x: 50, y: 40 });

  const view = inside ? INTERIOR : EXTERIOR[index];

  const go = useCallback((delta: number) => {
    setActive(null);
    setDir(delta);
    setIndex((i) => (i + delta + EXTERIOR.length) % EXTERIOR.length);
  }, []);

  const goTo = (i: number) => {
    if (i === index && !inside) return;
    setActive(null);
    setDir(i > index ? 1 : -1);
    setInside(false);
    setIndex(i);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!stageRef.current?.matches(':hover, :focus-within')) return;
      if (e.key === 'ArrowRight' && !inside) go(1);
      if (e.key === 'ArrowLeft' && !inside) go(-1);
      if (e.key === 'Escape') { setInside(false); setActive(null); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, inside]);

  const onPointerMove = (e: React.PointerEvent) => {
    const r = stageRef.current?.getBoundingClientRect();
    if (!r) return;
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    setLight({ x: px * 100, y: py * 100 });
    if (reduced) return;
    const strength = inside ? 60 : 14;
    mx.set((0.5 - px) * strength);
    my.set((0.5 - py) * strength * 0.6);
  };

  const onPointerLeave = () => { mx.set(0); my.set(0); };

  const onPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    dragStart.current = e.clientX;
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (dragStart.current === null || inside) { dragStart.current = null; return; }
    const dx = e.clientX - dragStart.current;
    dragStart.current = null;
    if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
  };

  const variants = {
    enter: (d: number) =>
      inside ? { opacity: 0, scale: 1.25, filter: 'blur(8px)' } : { opacity: 0, x: d * 80, scale: 1.04, filter: 'blur(6px)' },
    center: { opacity: 1, x: 0, scale: inside ? 1.12 : 1, filter: 'blur(0px)' },
    exit: (d: number) =>
      inside ? { opacity: 0, scale: 1.4, filter: 'blur(10px)' } : { opacity: 0, x: d * -80, scale: 0.98, filter: 'blur(6px)' },
  };

  return (
    <div className={`relative select-none ${className}`}>
      <div
        ref={stageRef}
        tabIndex={0}
        role="region"
        aria-roledescription="showroom interativo"
        aria-label="Explore o BYD Yuan Plus 2026"
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        className={`relative overflow-hidden rounded-[6px] border border-[var(--champagne)]/30 bg-[#e9e9eb] shadow-[0_40px_80px_-30px_rgba(0,0,0,0.7)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--champagne)] ${inside ? 'cursor-move' : 'cursor-grab active:cursor-grabbing'}`}
        style={{ aspectRatio: '16 / 9', touchAction: 'pan-y' }}
      >
        <AnimatePresence initial={false} custom={dir} mode="popLayout">
          <motion.div
            key={view.id}
            custom={dir}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: reduced ? 0 : 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0"
          >
            <motion.div className="absolute inset-[-6%]" style={{ x: sx, y: sy }}>
              <img
                src={view.src}
                alt={view.alt}
                draggable={false}
                className="w-full h-full object-cover pointer-events-none"
              />

              {/* Hotspots */}
              {view.hotspots.map((h, i) => (
                <motion.button
                  key={h.id}
                  type="button"
                  initial={{ opacity: 0, scale: 0.4 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.45 + i * 0.1 }}
                  onClick={() => setActive(active === h.id ? null : h.id)}
                  aria-label={h.title}
                  aria-expanded={active === h.id}
                  className="absolute -translate-x-1/2 -translate-y-1/2 group"
                  style={{ left: `${h.x}%`, top: `${h.y}%` }}
                >
                  <span className="absolute inset-0 rounded-full bg-[var(--champagne)]/60 animate-ping" />
                  <span className={`relative flex h-7 w-7 items-center justify-center rounded-full border border-white/90 backdrop-blur-md text-white text-sm font-semibold transition-all ${active === h.id ? 'bg-[var(--champagne)] text-[var(--midnight)] rotate-45' : 'bg-black/45 group-hover:bg-[var(--champagne)] group-hover:text-[var(--midnight)]'}`}>
                    +
                  </span>
                </motion.button>
              ))}
            </motion.div>
          </motion.div>
        </AnimatePresence>

        {/* Luz de estúdio seguindo o cursor */}
        <div
          className="pointer-events-none absolute inset-0 mix-blend-soft-light transition-[background] duration-300"
          style={{ background: `radial-gradient(circle at ${light.x}% ${light.y}%, rgba(255,255,255,0.35), transparent 45%)` }}
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/10" />

        {/* Cartão de detalhe */}
        <AnimatePresence>
          {active && (() => {
            const h = view.hotspots.find((x) => x.id === active);
            if (!h) return null;
            return (
              <motion.div
                key={h.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="absolute left-3 top-3 sm:left-5 sm:top-5 max-w-[260px] p-4 rounded-[4px] bg-[var(--midnight)]/85 backdrop-blur-md border border-[var(--champagne)]/50 text-white"
              >
                <p className="text-[var(--champagne)] text-[11px] uppercase tracking-[0.16em] mb-1">Detalhe</p>
                <p className="font-medium">{h.title}</p>
                <p className="text-sm text-white/75 mt-1">{h.text}</p>
              </motion.div>
            );
          })()}
        </AnimatePresence>

        {/* Setas */}
        {!inside && (
          <>
            <button type="button" onClick={() => go(-1)} aria-label="Ângulo anterior"
              className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/40 hover:bg-[var(--champagne)] hover:text-[var(--midnight)] text-white backdrop-blur-md border border-white/30 transition-colors">‹</button>
            <button type="button" onClick={() => go(1)} aria-label="Próximo ângulo"
              className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/40 hover:bg-[var(--champagne)] hover:text-[var(--midnight)] text-white backdrop-blur-md border border-white/30 transition-colors">›</button>
          </>
        )}

        {/* Barra de controles */}
        <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-1 p-1 rounded-full bg-black/45 backdrop-blur-md border border-white/15">
            {EXTERIOR.map((v, i) => (
              <button key={v.id} type="button" onClick={() => goTo(i)}
                className={`px-3 py-1.5 rounded-full text-[11px] uppercase tracking-[0.12em] transition-colors ${!inside && i === index ? 'bg-[var(--champagne)] text-[var(--midnight)]' : 'text-white/80 hover:text-white'}`}>
                {v.label}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => { setActive(null); setInside((v) => !v); }}
            className="px-4 py-2 rounded-full text-[11px] uppercase tracking-[0.14em] font-medium bg-white/90 hover:bg-[var(--champagne)] text-[var(--midnight)] transition-colors">
            {inside ? '← Sair do carro' : 'Entrar no carro →'}
          </button>
        </div>

        <div className="pointer-events-none absolute right-3 top-3 sm:right-5 sm:top-5 text-right text-white drop-shadow">
          <p className="text-[10px] uppercase tracking-[0.2em] text-white/80">BYD · 100% elétrico</p>
          <p className="text-sm font-medium">Yuan Plus 2026</p>
        </div>
      </div>
      <p className="mt-2 text-center text-[11px] text-white/55 tracking-wide">
        {inside ? 'Mova o mouse para olhar ao redor · toque nos pontos' : 'Arraste para girar · toque nos pontos para detalhes'}
      </p>
    </div>
  );
};
