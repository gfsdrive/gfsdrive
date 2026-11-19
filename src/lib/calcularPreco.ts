import { FERIADOS } from '../config/feriados';
import { PRECOS } from '../config/precos';

export type ServiceId =
  | 'transporte_agendado'
  | 'compromisso'
  | 'melhor_idade'
  | 'corporativo'
  | 'passeios_viagens';

export type DinamicaCode = 'D1' | 'D2' | 'D3' | 'D4';
export type HdCode = 'HD1' | 'HD2' | 'HD3' | 'HD4';

export interface ServiceDefinition {
  id: ServiceId;
  temRetorno: boolean;
  idaEVolta: boolean;
}

export const SERVICOS: ServiceDefinition[] = [
  { id: 'transporte_agendado', temRetorno: false, idaEVolta: false },
  { id: 'compromisso', temRetorno: true, idaEVolta: true },
  { id: 'melhor_idade', temRetorno: true, idaEVolta: true },
  { id: 'corporativo', temRetorno: true, idaEVolta: true },
  { id: 'passeios_viagens', temRetorno: true, idaEVolta: true },
];

export interface CalculoInput {
  servicoId: ServiceId;
  distanciaTrechoKm: number;
  distanciaIdaVoltaKm?: number;
  deslocamentoKm?: number;
  dataSaida: string;
  horaSaida: string;
  horaRetorno?: string;
  retornoOutroDia?: boolean;
  duracaoDeslocamentoMin?: number;
  aplicarMargemPasseio?: boolean;
  agora?: Date;
}

export type AlertaTipo =
  | 'antecedencia'
  | 'madrugada'
  | 'tabela_indisponivel'
  | 'pernoite'
  | 'mudanca_faixa'
  | 'viagem_longa'
  | 'noturno';

export interface AlertaSimulacao {
  tipo: AlertaTipo;
  bloqueante: boolean;
}

export type RegraKey =
  | 'pernoite'
  | 'madrugada'
  | 'tabela_indisponivel'
  | 'transporte_agendado'
  | 'passeio'
  | 'viagem'
  | 'compromisso';

export type FaixaKey =
  | 'dia_util_baixa'
  | 'dia_util_alta'
  | 'especial_baixa'
  | 'especial_alta';

export interface DetalhamentoCalculo {
  regraKey: RegraKey;
  distanciaBaseKm: number;
  distanciaConsideradaKm: number;
  margemSegurancaKm: number;
  kmCobradosTrajeto: number;
  valorKmUnitario: number;
  valorTrajetoKm: number;
  horasTotais: number;
  valorPrimeiraHora: number;
  blocosAdicionais30Min: number;
  valorTempoAdicional: number;
  deslocamentoBaseKm: number;
  deslocamentoExcedenteKm: number;
  valorDeslocamento: number;
  percentualNoturnoAplicado: number;
  valorAdicionalNoturno: number;
  dinamicaPrincipal: DinamicaCode;
  faixaKey: FaixaKey;
  temNoturno: boolean;
  feriadoNome?: string;
}

export interface CalculoResultado {
  sucesso: boolean;
  valorEstimado: number;
  valorFormatado: string;
  bloqueadoAntecedencia: boolean;
  bloqueadoMadrugada: boolean;
  bloqueadoTabelaIndisponivel: boolean;
  bloqueadoPernoite: boolean;
  cruzouFaixas: boolean;
  alertas: AlertaSimulacao[];
  detalhamento: DetalhamentoCalculo;
}

export function timeStringToMinutes(timeStr: string): number {
  const [hStr, mStr] = timeStr.split(':');
  const h = Number(hStr);
  const m = Number(mStr);
  if (Number.isNaN(h) || Number.isNaN(m)) return 0;
  return h * 60 + m;
}

export function parseLocalDateTime(dateStr: string, timeStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  const [hh, mm] = timeStr.split(':').map(Number);
  return new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0, 0, 0);
}

export function isFeriado(dateStr: string): { isFeriado: boolean; nome?: string } {
  const found = FERIADOS.find((f) => f.date === dateStr);
  return found ? { isFeriado: true, nome: found.name } : { isFeriado: false };
}

export function isFimDeSemanaOuFeriado(dateStr: string): {
  especial: boolean;
  feriadoNome?: string;
} {
  const [y, m, d] = dateStr.split('-').map(Number);
  const localDate = new Date(y, (m || 1) - 1, d || 1);
  const day = localDate.getDay();
  const feriado = isFeriado(dateStr);

  if (feriado.isFeriado) {
    return { especial: true, feriadoNome: feriado.nome };
  }
  if (day === 0 || day === 6) {
    return { especial: true };
  }
  return { especial: false };
}

export type BandKind = 'sem_atendimento' | 'baixa' | 'alta' | 'alta_noturna';

export function getBandAtMinute(minuteOfDay: number): BandKind {
  const normalized = ((minuteOfDay % 1440) + 1440) % 1440;

  const isSemAtendimento = PRECOS.faixas.semAtendimentoSimulador.some(([ini, fim]) => {
    const start = timeStringToMinutes(ini);
    const end = timeStringToMinutes(fim);
    return normalized >= start && normalized <= end;
  });
  if (isSemAtendimento) return 'sem_atendimento';

  const nightStart = timeStringToMinutes(PRECOS.faixas.altaDemandaNoturna.inicio);
  const nightEnd = timeStringToMinutes(PRECOS.faixas.altaDemandaNoturna.fim);
  if (normalized >= nightStart && normalized <= nightEnd) {
    return 'alta_noturna';
  }

  // Baixa demanda: intervalo inclusivo até o minuto final (11:30 inclusive; 11:31 inicia alta demanda)
  const isBaixa = PRECOS.faixas.baixaDemanda.some(([ini, fim]) => {
    const start = timeStringToMinutes(ini);
    const end = timeStringToMinutes(fim);
    return normalized >= start && normalized <= end;
  });
  if (isBaixa) return 'baixa';

  return 'alta';
}

export function isAltaDemandaMinuto(minuteOfDay: number): boolean {
  const band = getBandAtMinute(minuteOfDay);
  return band === 'alta' || band === 'alta_noturna';
}

export function isNoturnoMinuto(minuteOfDay: number): boolean {
  const normalized = ((minuteOfDay % 1440) + 1440) % 1440;
  const nightStart = timeStringToMinutes(PRECOS.faixas.altaDemandaNoturna.inicio);
  return normalized >= nightStart;
}

export function getDinamicaMomento(
  dateStr: string,
  minuteOfDay: number
): {
  dinamica: DinamicaCode;
  hd: HdCode;
  band: BandKind;
  isAltaDemanda: boolean;
  isNoturno: boolean;
  isSemAtendimento: boolean;
  isEspecial: boolean;
  feriadoNome?: string;
} {
  const { especial, feriadoNome } = isFimDeSemanaOuFeriado(dateStr);
  const band = getBandAtMinute(minuteOfDay);
  const alta = band === 'alta' || band === 'alta_noturna';
  const noturno = band === 'alta_noturna';
  const isSemAtendimento = band === 'sem_atendimento';

  let dinamica: DinamicaCode;
  let hd: HdCode;

  if (!especial && !alta) {
    dinamica = 'D1';
    hd = 'HD1';
  } else if (!especial && alta) {
    dinamica = 'D2';
    hd = 'HD2';
  } else if (especial && !alta) {
    dinamica = 'D3';
    hd = 'HD3';
  } else {
    dinamica = 'D4';
    hd = 'HD4';
  }

  return {
    dinamica,
    hd,
    band,
    isAltaDemanda: alta,
    isNoturno: noturno,
    isSemAtendimento,
    isEspecial: especial,
    feriadoNome,
  };
}

function resolverFaixaKey(params: {
  isEspecial: boolean;
  isAltaDemanda: boolean;
}): FaixaKey {
  if (params.isEspecial) {
    return params.isAltaDemanda ? 'especial_alta' : 'especial_baixa';
  }
  return params.isAltaDemanda ? 'dia_util_alta' : 'dia_util_baixa';
}

export function arredondarValorFinalParaCima(valor: number): number {
  const passo = PRECOS.arredondamentoValorFinalPara;
  if (valor <= 0) return 0;
  return Math.ceil((valor - 1e-9) / passo) * passo;
}

export function formatarMoeda(valor: number, lang: 'pt-BR' | 'en' = 'pt-BR'): string {
  if (lang === 'en') {
    const formatted = valor.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return `R$ ${formatted} (BRL)`;
  }
  return valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatarDataHoraPorIdioma(
  dateStr: string,
  timeStr: string,
  lang: 'pt-BR' | 'en'
): string {
  if (!dateStr || !timeStr) return `${dateStr} ${timeStr}`.trim();
  const dateObj = parseLocalDateTime(dateStr, timeStr);
  if (Number.isNaN(dateObj.getTime())) return `${dateStr} ${timeStr}`;

  if (lang === 'en') {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(dateObj);
  }

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
    .format(dateObj)
    .replace(',', '');
}

export function formatarHoraPorIdioma(timeStr: string, lang: 'pt-BR' | 'en'): string {
  if (!timeStr) return '';
  const [hh, mm] = timeStr.split(':').map(Number);
  if (Number.isNaN(hh) || Number.isNaN(mm)) return timeStr;
  const d = new Date(2026, 0, 1, hh, mm, 0);
  if (lang === 'en') {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(d);
  }
  return timeStr;
}

function addDaysToDateStr(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, (m || 1) - 1, (d || 1) + days);
  const yyyy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function isEnderecoBaseConfigurado(): boolean {
  const base = PRECOS.deslocamento.enderecoBase.trim().toUpperCase();
  return Boolean(base) && !base.startsWith('A DEFINIR');
}

export function calcularPreco(input: CalculoInput): CalculoResultado {
  const agora = input.agora ?? new Date();
  const saidaDate = parseLocalDateTime(input.dataSaida, input.horaSaida);
  const horasAntecedencia = (saidaDate.getTime() - agora.getTime()) / (1000 * 60 * 60);

  const startMin = timeStringToMinutes(input.horaSaida);
  const infoInicio = getDinamicaMomento(input.dataSaida, startMin);
  const valorKmDinamica = PRECOS.km[infoInicio.dinamica];

  const alertas: AlertaSimulacao[] = [];
  let bloqueadoAntecedencia = false;
  let bloqueadoMadrugada = false;
  let bloqueadoTabelaIndisponivel = false;
  let bloqueadoPernoite = false;

  if (horasAntecedencia < PRECOS.antecedenciaMinimaHoras) {
    bloqueadoAntecedencia = true;
    alertas.push({ tipo: 'antecedencia', bloqueante: true });
  }

  if (infoInicio.isSemAtendimento) {
    bloqueadoMadrugada = true;
    alertas.push({ tipo: 'madrugada', bloqueante: true });
  }

  if (!infoInicio.isSemAtendimento && valorKmDinamica <= 0) {
    bloqueadoTabelaIndisponivel = true;
    alertas.push({ tipo: 'tabela_indisponivel', bloqueante: true });
  }

  if (input.retornoOutroDia) {
    bloqueadoPernoite = true;
    alertas.push({ tipo: 'pernoite', bloqueante: true });
  }

  const faixaKey = resolverFaixaKey({
    isEspecial: infoInicio.isEspecial,
    isAltaDemanda: infoInicio.isAltaDemanda,
  });

  const deslocamentoBaseKm = Math.max(0, input.deslocamentoKm ?? 0);
  const deslocamentoExcedenteKm = Math.max(
    0,
    Number((deslocamentoBaseKm - PRECOS.deslocamento.franquiaKm).toFixed(2))
  );

  const retornoBloqueado = (regraKey: RegraKey): CalculoResultado => ({
    sucesso: false,
    valorEstimado: 0,
    valorFormatado: formatarMoeda(0),
    bloqueadoAntecedencia,
    bloqueadoMadrugada,
    bloqueadoTabelaIndisponivel,
    bloqueadoPernoite,
    cruzouFaixas: false,
    alertas,
    detalhamento: {
      regraKey,
      distanciaBaseKm: input.distanciaTrechoKm,
      distanciaConsideradaKm: input.distanciaIdaVoltaKm ?? input.distanciaTrechoKm,
      margemSegurancaKm: 0,
      kmCobradosTrajeto: 0,
      valorKmUnitario: valorKmDinamica,
      valorTrajetoKm: 0,
      horasTotais: 0,
      valorPrimeiraHora: 0,
      blocosAdicionais30Min: 0,
      valorTempoAdicional: 0,
      deslocamentoBaseKm,
      deslocamentoExcedenteKm,
      valorDeslocamento: 0,
      percentualNoturnoAplicado: 0,
      valorAdicionalNoturno: 0,
      dinamicaPrincipal: infoInicio.dinamica,
      faixaKey,
      temNoturno: false,
      feriadoNome: infoInicio.feriadoNome,
    },
  });

  if (bloqueadoPernoite) return retornoBloqueado('pernoite');
  if (bloqueadoMadrugada) return retornoBloqueado('madrugada');
  if (bloqueadoTabelaIndisponivel) return retornoBloqueado('tabela_indisponivel');

  const valorDeslocamento = Number((deslocamentoExcedenteKm * valorKmDinamica).toFixed(2));

  // Determinação de duração para checar cruzamento de faixas e minutos noturnos (22:00 às 23:59)
  let duracaoParaAnaliseMin: number;
  if (input.servicoId === 'transporte_agendado') {
    const km = Math.max(0, input.distanciaTrechoKm);
    duracaoParaAnaliseMin = Math.max(
      1,
      Math.round(input.duracaoDeslocamentoMin ?? Math.max(10, km * 2))
    );
  } else {
    const endMinRaw = input.horaRetorno ? timeStringToMinutes(input.horaRetorno) : startMin + 60;
    duracaoParaAnaliseMin =
      endMinRaw > startMin ? endMinRaw - startMin : Math.max(60, 1440 - startMin + endMinRaw);
  }

  let minutosNoturnos = 0;
  const bandasPresentes = new Set<'baixa' | 'alta'>();

  for (let i = 0; i < duracaoParaAnaliseMin; i++) {
    const m = startMin + i;
    const dayOffset = Math.floor(m / 1440);
    const dateAtMin = dayOffset === 0 ? input.dataSaida : addDaysToDateStr(input.dataSaida, dayOffset);
    const info = getDinamicaMomento(dateAtMin, m);
    bandasPresentes.add(info.isAltaDemanda ? 'alta' : 'baixa');
    if (info.isNoturno) {
      minutosNoturnos++;
    }
  }

  const cruzouFaixas = bandasPresentes.size > 1;
  if (cruzouFaixas) {
    alertas.push({ tipo: 'mudanca_faixa', bloqueante: false });
  }

  const fracaoNoturna = duracaoParaAnaliseMin > 0 ? minutosNoturnos / duracaoParaAnaliseMin : 0;
  const temNoturno = minutosNoturnos > 0;
  if (temNoturno) {
    alertas.push({ tipo: 'noturno', bloqueante: false });
  }

  // 1) TRANSPORTE AGENDADO (só ida: km * D + taxa de deslocamento)
  if (input.servicoId === 'transporte_agendado') {
    const km = Math.max(0, input.distanciaTrechoKm);
    const valorTrajetoKm = Number((km * valorKmDinamica).toFixed(2));
    const subtotalBase = valorTrajetoKm + valorDeslocamento;
    const valorAdicionalNoturno = Number(
      (subtotalBase * PRECOS.faixas.altaDemandaNoturna.acrescimo * fracaoNoturna).toFixed(2)
    );
    const valorEstimado = arredondarValorFinalParaCima(subtotalBase + valorAdicionalNoturno);

    return {
      sucesso: !bloqueadoAntecedencia,
      valorEstimado,
      valorFormatado: formatarMoeda(valorEstimado),
      bloqueadoAntecedencia,
      bloqueadoMadrugada: false,
      bloqueadoTabelaIndisponivel: false,
      bloqueadoPernoite: false,
      cruzouFaixas,
      alertas,
      detalhamento: {
        regraKey: 'transporte_agendado',
        distanciaBaseKm: km,
        distanciaConsideradaKm: km,
        margemSegurancaKm: 0,
        kmCobradosTrajeto: km,
        valorKmUnitario: valorKmDinamica,
        valorTrajetoKm,
        horasTotais: Number((duracaoParaAnaliseMin / 60).toFixed(2)),
        valorPrimeiraHora: 0,
        blocosAdicionais30Min: 0,
        valorTempoAdicional: 0,
        deslocamentoBaseKm,
        deslocamentoExcedenteKm,
        valorDeslocamento,
        percentualNoturnoAplicado: Number(
          (fracaoNoturna * PRECOS.faixas.altaDemandaNoturna.acrescimo * 100).toFixed(1)
        ),
        valorAdicionalNoturno,
        dinamicaPrincipal: infoInicio.dinamica,
        faixaKey,
        temNoturno,
        feriadoNome: infoInicio.feriadoNome,
      },
    };
  }

  // Cálculo de tempo compartilhado entre Compromisso, Melhor Idade, Corporativo, Passeios e Viagens
  const minutosCobrados = Math.max(PRECOS.tempoMinimoMinutos, duracaoParaAnaliseMin);
  const minutosExcedentes = Math.max(0, minutosCobrados - PRECOS.tempoMinimoMinutos);
  const blocosAdicionais = Math.ceil(minutosExcedentes / PRECOS.fracaoMinutos);
  const valorPrimeiraHora = PRECOS.hora[infoInicio.hd];
  const valorTempoAdicional = Number((blocosAdicionais * PRECOS.valorFracao).toFixed(2));
  const horasTotais = Number((minutosCobrados / 60).toFixed(2));

  // 5 & 6) PASSEIOS E VIAGENS
  if (input.servicoId === 'passeios_viagens') {
    const kmIdaVoltaBase = Math.max(0, input.distanciaIdaVoltaKm ?? input.distanciaTrechoKm * 2);
    const aplicarMargem = input.aplicarMargemPasseio !== false;
    const kmComMargem = aplicarMargem
      ? Number((kmIdaVoltaBase * (1 + PRECOS.arredondamentoDistanciaPasseioViagem)).toFixed(1))
      : kmIdaVoltaBase;
    const margemKm = Number(Math.max(0, kmComMargem - kmIdaVoltaBase).toFixed(1));

    const isPasseio = kmComMargem <= PRECOS.passeio.limiteKm;

    if (!isPasseio && duracaoParaAnaliseMin / 60 > PRECOS.viagem.alertaAcimaDeHoras) {
      alertas.push({ tipo: 'viagem_longa', bloqueante: false });
    }

    // Passeio (<= 150 km): primeiros 150 km incluídos (0 km cobrado). Viagem (> 150 km): TODOS os km cobrados.
    const kmCobradosTrajeto = isPasseio ? 0 : kmComMargem;
    const valorTrajetoKm = Number((kmCobradosTrajeto * valorKmDinamica).toFixed(2));
    const subtotalBase = valorPrimeiraHora + valorTempoAdicional + valorTrajetoKm + valorDeslocamento;
    const valorAdicionalNoturno = Number(
      (subtotalBase * PRECOS.faixas.altaDemandaNoturna.acrescimo * fracaoNoturna).toFixed(2)
    );
    const valorEstimado = arredondarValorFinalParaCima(subtotalBase + valorAdicionalNoturno);

    return {
      sucesso: !bloqueadoAntecedencia,
      valorEstimado,
      valorFormatado: formatarMoeda(valorEstimado),
      bloqueadoAntecedencia,
      bloqueadoMadrugada: false,
      bloqueadoTabelaIndisponivel: false,
      bloqueadoPernoite: false,
      cruzouFaixas,
      alertas,
      detalhamento: {
        regraKey: isPasseio ? 'passeio' : 'viagem',
        distanciaBaseKm: kmIdaVoltaBase,
        distanciaConsideradaKm: kmComMargem,
        margemSegurancaKm: margemKm,
        kmCobradosTrajeto,
        valorKmUnitario: valorKmDinamica,
        valorTrajetoKm,
        horasTotais,
        valorPrimeiraHora,
        blocosAdicionais30Min: blocosAdicionais,
        valorTempoAdicional,
        deslocamentoBaseKm,
        deslocamentoExcedenteKm,
        valorDeslocamento,
        percentualNoturnoAplicado: Number(
          (fracaoNoturna * PRECOS.faixas.altaDemandaNoturna.acrescimo * 100).toFixed(1)
        ),
        valorAdicionalNoturno,
        dinamicaPrincipal: infoInicio.dinamica,
        faixaKey,
        temNoturno,
        feriadoNome: infoInicio.feriadoNome,
      },
    };
  }

  // 2, 3 e 4) COMPROMISSO AGENDADO, MELHOR IDADE, CORPORATIVO
  const kmIdaVolta = Math.max(0, input.distanciaIdaVoltaKm ?? input.distanciaTrechoKm * 2);
  const valorTrajetoKm = Number((kmIdaVolta * valorKmDinamica).toFixed(2));
  const subtotalBase = valorTrajetoKm + valorPrimeiraHora + valorTempoAdicional + valorDeslocamento;
  const valorAdicionalNoturno = Number(
    (subtotalBase * PRECOS.faixas.altaDemandaNoturna.acrescimo * fracaoNoturna).toFixed(2)
  );
  const valorEstimado = arredondarValorFinalParaCima(subtotalBase + valorAdicionalNoturno);

  return {
    sucesso: !bloqueadoAntecedencia,
    valorEstimado,
    valorFormatado: formatarMoeda(valorEstimado),
    bloqueadoAntecedencia,
    bloqueadoMadrugada: false,
    bloqueadoTabelaIndisponivel: false,
    bloqueadoPernoite: false,
    cruzouFaixas,
    alertas,
    detalhamento: {
      regraKey: 'compromisso',
      distanciaBaseKm: input.distanciaTrechoKm,
      distanciaConsideradaKm: kmIdaVolta,
      margemSegurancaKm: 0,
      kmCobradosTrajeto: kmIdaVolta,
      valorKmUnitario: valorKmDinamica,
      valorTrajetoKm,
      horasTotais,
      valorPrimeiraHora,
      blocosAdicionais30Min: blocosAdicionais,
      valorTempoAdicional,
      deslocamentoBaseKm,
      deslocamentoExcedenteKm,
      valorDeslocamento,
      percentualNoturnoAplicado: Number(
        (fracaoNoturna * PRECOS.faixas.altaDemandaNoturna.acrescimo * 100).toFixed(1)
      ),
      valorAdicionalNoturno,
      dinamicaPrincipal: infoInicio.dinamica,
      faixaKey,
      temNoturno,
      feriadoNome: infoInicio.feriadoNome,
    },
  };
}
