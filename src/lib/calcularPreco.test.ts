import assert from 'node:assert/strict';
import { calcularPreco, getBandAtMinute, timeStringToMinutes } from './calcularPreco';

// Referência fixa: segunda-feira 23/11/2026 às 08:00 (semana sem feriados)
const AGORA_REF = new Date(2026, 10, 23, 8, 0, 0);

// Continuidade 11:30 -> 11:31 (sem lacunas)
assert.equal(getBandAtMinute(timeStringToMinutes('11:30')), 'baixa');
assert.equal(getBandAtMinute(timeStringToMinutes('11:31')), 'alta');
assert.equal(getBandAtMinute(timeStringToMinutes('05:59')), 'sem_atendimento');
assert.equal(getBandAtMinute(timeStringToMinutes('06:00')), 'alta');
assert.equal(getBandAtMinute(timeStringToMinutes('22:00')), 'alta_noturna');

// 1. Transporte Agendado, terça, 10:00 (D1), trajeto 8 km, base a 4 km do embarque:
// 8 * 2,50 = 20,00 + (4 - 1,5) * 2,50 = 6,25 -> 26,25 -> R$ 26,50
{
  const res = calcularPreco({
    servicoId: 'transporte_agendado',
    distanciaTrechoKm: 8,
    deslocamentoKm: 4,
    dataSaida: '2026-11-24',
    horaSaida: '10:00',
    agora: AGORA_REF,
  });
  assert.equal(res.sucesso, true);
  assert.equal(res.detalhamento.valorTrajetoKm, 20);
  assert.equal(res.detalhamento.valorDeslocamento, 6.25);
  assert.equal(res.valorEstimado, 26.5);
}

// 2. Compromisso Agendado, quarta, 09:30 às 11:00 (D1/HD1), 6 km ida + 6 km volta:
// 12 * 2,50 = 30,00 + 45,00 + 25,00 -> R$ 100,00
{
  const res = calcularPreco({
    servicoId: 'compromisso',
    distanciaTrechoKm: 6,
    distanciaIdaVoltaKm: 12,
    dataSaida: '2026-11-25',
    horaSaida: '09:30',
    horaRetorno: '11:00',
    agora: AGORA_REF,
  });
  assert.equal(res.sucesso, true);
  assert.equal(res.detalhamento.valorTrajetoKm, 30);
  assert.equal(res.detalhamento.valorPrimeiraHora, 45);
  assert.equal(res.detalhamento.valorTempoAdicional, 25);
  assert.equal(res.valorEstimado, 100);
}

// 3. Compromisso Agendado, sexta, 22:00 às 23:00 (AD noturna, D2/HD2), 5 km ida + 5 km volta:
// (35,00 + 60,00) * 1,25 = 118,75 -> R$ 119,00
{
  const res = calcularPreco({
    servicoId: 'compromisso',
    distanciaTrechoKm: 5,
    distanciaIdaVoltaKm: 10,
    dataSaida: '2026-11-27',
    horaSaida: '22:00',
    horaRetorno: '23:00',
    agora: AGORA_REF,
  });
  assert.equal(res.sucesso, true);
  assert.equal(res.detalhamento.valorTrajetoKm, 35);
  assert.equal(res.detalhamento.valorPrimeiraHora, 60);
  assert.equal(res.detalhamento.valorAdicionalNoturno, 23.75);
  assert.equal(res.valorEstimado, 119);
}

// 4. Passeio, terça, 10:00 às 16:00 (D1/HD1), Domingos Martins, 80 km ida e volta (88 km com +10%):
// 45,00 + 10 * 25,00 = 295,00, sem km excedente -> R$ 295,00
{
  const res = calcularPreco({
    servicoId: 'passeios_viagens',
    distanciaTrechoKm: 40,
    distanciaIdaVoltaKm: 80,
    dataSaida: '2026-11-24',
    horaSaida: '10:00',
    horaRetorno: '16:00',
    aplicarMargemPasseio: true,
    agora: AGORA_REF,
  });
  assert.equal(res.sucesso, true);
  assert.equal(res.detalhamento.regraKey, 'passeio');
  assert.equal(res.detalhamento.distanciaConsideradaKm, 88);
  assert.equal(res.detalhamento.valorTrajetoKm, 0);
  assert.equal(res.detalhamento.valorPrimeiraHora, 45);
  assert.equal(res.detalhamento.valorTempoAdicional, 250);
  assert.equal(res.valorEstimado, 295);
}

// 5. Viagem, quarta, 09:30 às 17:30 (D1/HD1), Venda Nova do Imigrante, 202 km ida e volta (222,2 km com +10%):
// 222,2 * 2,50 = 555,50 + 45,00 + 14 * 25,00 = 395,00 -> 950,50 (com alerta de faixas diferentes)
{
  const res = calcularPreco({
    servicoId: 'passeios_viagens',
    distanciaTrechoKm: 101,
    distanciaIdaVoltaKm: 202,
    dataSaida: '2026-11-25',
    horaSaida: '09:30',
    horaRetorno: '17:30',
    aplicarMargemPasseio: true,
    agora: AGORA_REF,
  });
  assert.equal(res.sucesso, true);
  assert.equal(res.detalhamento.regraKey, 'viagem');
  assert.equal(res.detalhamento.distanciaConsideradaKm, 222.2);
  assert.equal(res.detalhamento.valorTrajetoKm, 555.5);
  assert.equal(res.detalhamento.valorPrimeiraHora + res.detalhamento.valorTempoAdicional, 395);
  assert.equal(res.valorEstimado, 950.5);
  assert.equal(res.cruzouFaixas, true);
  assert.equal(res.alertas.some((a) => a.tipo === 'mudanca_faixa'), true);
}

// 6. Sábado, qualquer horário, enquanto D3/D4 = 0: não calcula e oferece WhatsApp
{
  const res = calcularPreco({
    servicoId: 'compromisso',
    distanciaTrechoKm: 8,
    dataSaida: '2026-11-28', // sábado
    horaSaida: '10:00',
    horaRetorno: '11:30',
    agora: AGORA_REF,
  });
  assert.equal(res.sucesso, false);
  assert.equal(res.bloqueadoTabelaIndisponivel, true);
  assert.equal(res.alertas.some((a) => a.tipo === 'tabela_indisponivel' && a.bloqueante), true);
}

// 7. Pedido para daqui a 3 horas: bloqueado pela antecedência mínima
{
  const res = calcularPreco({
    servicoId: 'transporte_agendado',
    distanciaTrechoKm: 8,
    dataSaida: '2026-11-23',
    horaSaida: '11:00', // 3h após 08:00
    agora: AGORA_REF,
  });
  assert.equal(res.sucesso, false);
  assert.equal(res.bloqueadoAntecedencia, true);
  assert.equal(res.alertas.some((a) => a.tipo === 'antecedencia' && a.bloqueante), true);
}

// Teste adicional: Madrugada (00:00 às 05:59) bloqueada
{
  const res = calcularPreco({
    servicoId: 'transporte_agendado',
    distanciaTrechoKm: 10,
    dataSaida: '2026-11-24',
    horaSaida: '03:30',
    agora: AGORA_REF,
  });
  assert.equal(res.sucesso, false);
  assert.equal(res.bloqueadoMadrugada, true);
  assert.equal(res.alertas.some((a) => a.tipo === 'madrugada' && a.bloqueante), true);
}

console.log('Todos os 7 testes oficiais (+ madrugada e fronteira 11:30/11:31) passaram com sucesso!');
