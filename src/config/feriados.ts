export interface FeriadoItem {
  date: string; // Formato YYYY-MM-DD
  name: string;
  scope: 'nacional' | 'estadual' | 'municipal';
}

/**
 * Feriados nacionais, do Espírito Santo e municipais de Vila Velha e Vitória (2026 e 2027).
 * Array editável: basta adicionar ou remover itens no formato YYYY-MM-DD.
 */
export const FERIADOS: FeriadoItem[] = [
  // ================= 2026 =================
  { date: '2026-01-01', name: 'Confraternização Universal', scope: 'nacional' },
  { date: '2026-02-16', name: 'Carnaval (Segunda-feira)', scope: 'nacional' },
  { date: '2026-02-17', name: 'Carnaval (Terça-feira)', scope: 'nacional' },
  { date: '2026-04-03', name: 'Sexta-feira Santa', scope: 'nacional' },
  { date: '2026-04-05', name: 'Páscoa', scope: 'nacional' },
  { date: '2026-04-13', name: 'Nossa Senhora da Penha (Padroeira do ES)', scope: 'estadual' },
  { date: '2026-04-21', name: 'Tiradentes', scope: 'nacional' },
  { date: '2026-05-01', name: 'Dia do Trabalhador', scope: 'nacional' },
  { date: '2026-05-23', name: 'Colonização do Solo Espírito-Santense / Aniversário de Vila Velha', scope: 'municipal' },
  { date: '2026-06-04', name: 'Corpus Christi', scope: 'nacional' },
  { date: '2026-09-07', name: 'Independência do Brasil', scope: 'nacional' },
  { date: '2026-09-08', name: 'Aniversário de Vitória (Nossa Senhora da Vitória)', scope: 'municipal' },
  { date: '2026-10-12', name: 'Nossa Senhora Aparecida', scope: 'nacional' },
  { date: '2026-11-02', name: 'Finados', scope: 'nacional' },
  { date: '2026-11-15', name: 'Proclamação da República', scope: 'nacional' },
  { date: '2026-11-20', name: 'Dia Nacional de Zumbi e da Consciência Negra', scope: 'nacional' },
  { date: '2026-12-25', name: 'Natal', scope: 'nacional' },

  // ================= 2027 =================
  { date: '2027-01-01', name: 'Confraternização Universal', scope: 'nacional' },
  { date: '2027-02-08', name: 'Carnaval (Segunda-feira)', scope: 'nacional' },
  { date: '2027-02-09', name: 'Carnaval (Terça-feira)', scope: 'nacional' },
  { date: '2027-03-26', name: 'Sexta-feira Santa', scope: 'nacional' },
  { date: '2027-03-28', name: 'Páscoa', scope: 'nacional' },
  { date: '2027-04-05', name: 'Nossa Senhora da Penha (Padroeira do ES)', scope: 'estadual' },
  { date: '2027-04-21', name: 'Tiradentes', scope: 'nacional' },
  { date: '2027-05-01', name: 'Dia do Trabalhador', scope: 'nacional' },
  { date: '2027-05-23', name: 'Colonização do Solo Espírito-Santense / Aniversário de Vila Velha', scope: 'municipal' },
  { date: '2027-05-27', name: 'Corpus Christi', scope: 'nacional' },
  { date: '2027-09-07', name: 'Independência do Brasil', scope: 'nacional' },
  { date: '2027-09-08', name: 'Aniversário de Vitória (Nossa Senhora da Vitória)', scope: 'municipal' },
  { date: '2027-10-12', name: 'Nossa Senhora Aparecida', scope: 'nacional' },
  { date: '2027-11-02', name: 'Finados', scope: 'nacional' },
  { date: '2027-11-15', name: 'Proclamação da República', scope: 'nacional' },
  { date: '2027-11-20', name: 'Dia Nacional de Zumbi e da Consciência Negra', scope: 'nacional' },
  { date: '2027-12-25', name: 'Natal', scope: 'nacional' },
];
