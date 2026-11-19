export interface WheelAnchorConfig {
  /** Posição horizontal do centro da roda em % da largura da carroceria */
  leftPct: number;
  /** Posição vertical do centro da roda em % da altura da carroceria */
  topPct: number;
  /** Diâmetro da roda em % da largura da carroceria */
  sizePct: number;
}

export interface LightAnchorConfig {
  leftPct: number;
  topPct: number;
}

export interface CarroLayerConfig {
  staticFullSrc: string;
  bodySrc: string;
  wheelSrc: string;
  altKey: string;
  /** Raio nominal de referência para cálculo físico de rotação (ângulo = deslocamento / raio) */
  wheelRadiusPx: number;
  rearWheel: WheelAnchorConfig;
  frontWheel: WheelAnchorConfig;
  taillight: LightAnchorConfig;
  headlight: LightAnchorConfig;
}

export const CARRO_CONFIG: CarroLayerConfig = {
  staticFullSrc: '/img/carro-completo.webp',
  bodySrc: '/img/carro-carroceria.webp',
  wheelSrc: '/img/carro-roda.webp',
  altKey: 'hero.carAlt',
  wheelRadiusPx: 54,
  // Carro orientado para a esquerda (frente à esquerda, traseira à direita) para avançar sem dar ré
  frontWheel: {
    leftPct: 17.8,
    topPct: 88.0,
    sizePct: 18.2,
  },
  rearWheel: {
    leftPct: 83.2,
    topPct: 88.0,
    sizePct: 18.2,
  },
  headlight: {
    leftPct: 6.2,
    topPct: 46.5,
  },
  taillight: {
    leftPct: 95.5,
    topPct: 35.5,
  },
};
