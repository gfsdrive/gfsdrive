export const SITE = {
  nome: 'GFS Drive Service',
  email: 'gfsdriveservice@gmail.com',
  whatsappNumero: '5527998914687',
  whatsappExibicao: '+55 (27) 99891-4687',
  whatsappLink: 'https://wa.me/5527998914687',
  instagramUsuario: '@gfs.drive',
  instagramLink: 'https://www.instagram.com/gfs.drive/',
} as const;

export const HABILITAR_INGLES = true;

export const SITE_CONFIG = {
  brandName: SITE.nome,
  driverName: 'Gil',
  vehicleName: 'BYD Yuan Plus 0 km',
  WHATSAPP_NUMBER: SITE.whatsappNumero,
  WHATSAPP_DISPLAY: SITE.whatsappExibicao,
  TELEFONE_LIGACAO: `+${SITE.whatsappNumero}`,
  EMAIL: SITE.email,
  EMAIL_MAILTO_URL: `mailto:${SITE.email}?subject=Agendamento%20GFS%20Drive%20Service`,
  WHATSAPP_GROUP_URL: 'https://chat.whatsapp.com/SUBSTITUIR_PELO_LINK_DO_GRUPO',
  INSTAGRAM_URL: SITE.instagramLink,
  INSTAGRAM_HANDLE: SITE.instagramUsuario,
  TEMPO_RESPOSTA_CONFIRMACAO_HORAS: 1,
} as const;

export function buildWhatsAppLink(message: string): string {
  return `${SITE.whatsappLink}?text=${encodeURIComponent(message)}`;
}
