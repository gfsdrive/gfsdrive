import i18n from '../i18n';
import { buildWhatsAppLink } from '../config/site';
import {
  CalculoResultado,
  ServiceDefinition,
  formatarDataHoraPorIdioma,
  formatarHoraPorIdioma,
  formatarMoeda,
} from '../lib/calcularPreco';

export interface AgendamentoPayload {
  servico: ServiceDefinition;
  origem: string;
  destino: string;
  dataSaida: string;
  horaSaida: string;
  horaRetorno?: string;
  retornoOutroDia?: boolean;
  distanciaKm: number;
  calculo: CalculoResultado | null;
  nomeCliente: string;
  telefoneCliente: string;
  agendandoParaOutraPessoa: boolean;
  nomePassageiro?: string;
  telefonePassageiro?: string;
  observacoes?: string;
  origemFluxo?: 'site' | 'melhor_idade' | 'qr';
  lang: 'pt-BR' | 'en';
}

function fmtMoneyClean(val: number, lang: 'pt-BR' | 'en'): string {
  return formatarMoeda(val, lang).replace('R$\u00a0', 'R$ ');
}

function fmtKmClean(val: number, lang: 'pt-BR' | 'en'): string {
  return lang === 'pt-BR' ? `${val.toFixed(1).replace('.', ',').replace(',0', '')} km` : `${val.toFixed(1).replace('.0', '')} km`;
}

export function montarMensagemWhatsApp(payload: AgendamentoPayload): string {
  const {
    servico,
    origem,
    destino,
    dataSaida,
    horaSaida,
    horaRetorno,
    retornoOutroDia,
    distanciaKm,
    calculo,
    nomeCliente,
    telefoneCliente,
    agendandoParaOutraPessoa,
    nomePassageiro,
    telefonePassageiro,
    observacoes,
    lang,
  } = payload;

  const t = i18n.getFixedT(lang);
  const serviceName = t(`services.items.${servico.id}.nomeCurto`);
  const dataHoraTexto = formatarDataHoraPorIdioma(dataSaida, horaSaida, lang);

  const retornoTexto = retornoOutroDia
    ? t('whatsappMessages.returnOvernight')
    : servico.temRetorno
      ? horaRetorno
        ? formatarHoraPorIdioma(horaRetorno, lang)
        : t('whatsappMessages.returnToBeAgreed')
      : t('whatsappMessages.returnOneWay');

  const alertasTexto =
    calculo && calculo.alertas.length > 0
      ? `${t('whatsappMessages.alertPrefix')}: ${calculo.alertas
          .map((a) => t(`simulator.alerts.${a.tipo}`))
          .join(' ')}`
      : null;

  const passageiroTexto = agendandoParaOutraPessoa
    ? `${t('whatsappMessages.passenger')}: ${
        nomePassageiro?.trim() || t('whatsappMessages.passengerNotInformed')
      } (${telefonePassageiro?.trim() || t('whatsappMessages.passengerNoPhone')})`
    : `${t('whatsappMessages.passenger')}: ${t('whatsappMessages.passengerSelf')}`;

  const valorTexto =
    calculo && calculo.sucesso
      ? fmtMoneyClean(calculo.valorEstimado, lang)
      : calculo?.bloqueadoPernoite
        ? t('whatsappMessages.overnightPrice')
        : t('whatsappMessages.pricePending');

  const kmNum = calculo ? calculo.detalhamento.distanciaConsideradaKm : distanciaKm;
  const kmTexto = fmtKmClean(kmNum, lang);

  const linhasDetalhamento: string[] = [];
  if (calculo && !calculo.bloqueadoPernoite && !calculo.bloqueadoMadrugada && !calculo.bloqueadoTabelaIndisponivel) {
    const d = calculo.detalhamento;
    if (d.kmCobradosTrajeto > 0) {
      linhasDetalhamento.push(
        `- ${t('simulator.breakdown.routeLine', {
          km: fmtKmClean(d.kmCobradosTrajeto, lang),
          unit: fmtMoneyClean(d.valorKmUnitario, lang),
        })}: ${fmtMoneyClean(d.valorTrajetoKm, lang)}`
      );
    }
    if (d.valorPrimeiraHora > 0) {
      linhasDetalhamento.push(
        `- ${t('simulator.breakdown.firstHour')}: ${fmtMoneyClean(d.valorPrimeiraHora, lang)}`
      );
    }
    if (d.blocosAdicionais30Min > 0) {
      linhasDetalhamento.push(
        `- ${t('simulator.breakdown.extraTime', { count: d.blocosAdicionais30Min })}: ${fmtMoneyClean(d.valorTempoAdicional, lang)}`
      );
    }
    linhasDetalhamento.push(
      `- ${t('simulator.breakdown.displacement', {
        km: fmtKmClean(d.deslocamentoBaseKm, lang),
      })}: ${fmtMoneyClean(d.valorDeslocamento, lang)}`
    );
    linhasDetalhamento.push(
      `- ${t('simulator.breakdown.nightSurcharge')}: ${fmtMoneyClean(d.valorAdicionalNoturno, lang)}`
    );
  }

  return [
    t('whatsappMessages.greeting'),
    `${t('whatsappMessages.service')}: ${serviceName}`,
    `${t('whatsappMessages.dateTime')}: ${dataHoraTexto} | ${t('whatsappMessages.returnTime')}: ${retornoTexto}`,
    `${t('whatsappMessages.origin')}: ${origem}`,
    `${t('whatsappMessages.destination')}: ${destino}`,
    `${t('whatsappMessages.distance')}: ${kmTexto}`,
    `${t('whatsappMessages.estimatedValue')}: ${valorTexto}`,
    ...linhasDetalhamento,
    alertasTexto,
    `${t('whatsappMessages.client')}: ${nomeCliente} | ${t('whatsappMessages.phone')}: ${telefoneCliente}`,
    passageiroTexto,
    `${t('whatsappMessages.notes')}: ${observacoes?.trim() || t('whatsappMessages.notesNone')}`,
  ]
    .filter(Boolean)
    .join('\n');
}

export function montarMensagemFallbackSemCalculo(params: {
  servicoNome: string;
  origem: string;
  destino: string;
  dataSaida: string;
  horaSaida: string;
  horaRetorno?: string;
  lang: 'pt-BR' | 'en';
}): string {
  const t = i18n.getFixedT(params.lang);
  const dataHoraTexto = formatarDataHoraPorIdioma(params.dataSaida, params.horaSaida, params.lang);
  const retornoTexto = params.horaRetorno
    ? ` | ${t('whatsappMessages.returnTime')}: ${formatarHoraPorIdioma(params.horaRetorno, params.lang)}`
    : '';

  return [
    t('whatsappMessages.fallbackGreeting'),
    `${t('whatsappMessages.service')}: ${params.servicoNome}`,
    `${t('whatsappMessages.dateTime')}: ${dataHoraTexto}${retornoTexto}`,
    `${t('whatsappMessages.origin')}: ${params.origem || t('whatsappMessages.toBeInformed')}`,
    `${t('whatsappMessages.destination')}: ${params.destino || t('whatsappMessages.toBeInformed')}`,
  ].join('\n');
}

export async function registrarEEnviarAgendamento(payload: AgendamentoPayload): Promise<{
  whatsappUrl: string;
  mensagemTexto: string;
}> {
  const mensagemTexto = montarMensagemWhatsApp(payload);
  const whatsappUrl = buildWhatsAppLink(mensagemTexto);

  return { whatsappUrl, mensagemTexto };
}
