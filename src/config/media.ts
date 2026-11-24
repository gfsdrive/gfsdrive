export const MEDIA_ASSETS = {
  carroOrla: {
    src: '/car/frente.jpg',
    altKey: 'media.carroOrlaAlt',
    fallbackKey: 'media.carroOrlaFallback',
  },
  melhorIdadeEmbarque: {
    src: '/car/interior-porta.jpg',
    altKey: 'media.melhorIdadeAlt',
    fallbackKey: 'media.melhorIdadeFallback',
  },
  interiorBancoTras: {
    src: '/car/interior-teto.jpg',
    altKey: 'media.interiorAlt',
    fallbackKey: 'media.interiorFallback',
  },
  portaMalas: {
    src: '/car/traseira.jpg',
    altKey: 'media.portaMalasAlt',
    fallbackKey: 'media.portaMalasFallback',
  },
  estradaPedraAzul: {
    src: '/car/lateral.jpg',
    altKey: 'media.pedraAzulAlt',
    fallbackKey: 'media.pedraAzulFallback',
  },
  executivoCorporativo: {
    src: '/car/interior-cabine.jpg',
    altKey: 'media.executivoAlt',
    fallbackKey: 'media.executivoFallback',
  },
  videoMelhorIdade: {
    src: '/video/melhor-idade.mp4',
    poster: '/car/interior-porta.jpg',
  },
} as const;
