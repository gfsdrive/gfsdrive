export const PRECOS = {
  antecedenciaMinimaHoras: 6,

  faixas: {
    baixaDemanda: [
      ['09:30', '11:30'],
      ['15:00', '16:59'],
    ] as [string, string][],
    altaDemanda: [
      ['06:00', '09:29'],
      ['11:31', '14:59'],
      ['17:00', '21:59'],
    ] as [string, string][],
    altaDemandaNoturna: { inicio: '22:00', fim: '23:59', acrescimo: 0.25 },
    semAtendimentoSimulador: [['00:00', '05:59']] as [string, string][],
  },

  // Valor por KM percorrido, por dinâmica
  km: {
    D1: 2.5,
    D2: 3.5,
    D3: 0, // A DEFINIR PELO GIL. Enquanto for 0, o simulador não calcula sábados/domingos/feriados e manda para o WhatsApp.
    D4: 0, // A DEFINIR PELO GIL. Mesma regra acima.
  },

  // Valor da PRIMEIRA HORA (tempo mínimo cobrado), por dinâmica
  hora: {
    HD1: 45.0,
    HD2: 60.0,
    HD3: 65.0,
    HD4: 80.0,
  },
  tempoMinimoMinutos: 60,
  fracaoMinutos: 30,
  valorFracao: 25.0, // cada 30 minutos após a primeira hora, em qualquer dinâmica

  // Taxa de deslocamento: do ponto base do Gil até o endereço de embarque
  deslocamento: {
    enderecoBase: 'A DEFINIR (bairro/endereço base do Gil em Vila Velha)',
    franquiaKm: 1.5, // até 1,5 km não cobra
  },

  passeio: {
    limiteKm: 150, // até 150 km de percurso total = Passeio
  },
  viagem: {
    acimaDeKm: 150, // acima de 150 km = Viagem
    alertaAcimaDeHoras: 8,
  },

  arredondamentoDistanciaPasseioViagem: 0.1, // +10% na distância (deslocamentos no destino)
  arredondamentoValorFinalPara: 0.5, // arredondar sempre para cima, ao múltiplo de R$ 0,50
} as const;
