// Geração da grade do mês para o heatmap.

export const DAY_LABELS = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
export const MONTH_NAMES_FULL = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho',   'Agosto',    'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];
export const WEEKDAY_NAMES_FULL = [
  'Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira',
  'Quinta-feira', 'Sexta-feira', 'Sábado',
];

export function pad2(n) {
  return String(n).padStart(2, '0');
}

export function toISO(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function parseISO(iso) {
  if (!iso) return null;
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function firstDayOfMonth(year, monthIdx) {
  return new Date(year, monthIdx, 1);
}

export function lastDayOfMonth(year, monthIdx) {
  return new Date(year, monthIdx + 1, 0);
}

export function isSameDay(a, b) {
  return a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

// Retorna uma matriz [semana][7 dias] cobrindo o mês completo.
// Semana começa no domingo (matching DAY_LABELS).
export function buildMonthGrid(year, monthIdx) {
  const first = firstDayOfMonth(year, monthIdx);
  const last = lastDayOfMonth(year, monthIdx);
  const startWeekday = first.getDay(); // 0=dom
  const totalDaysToRender = startWeekday + last.getDate();
  const totalWeeks = Math.ceil(totalDaysToRender / 7);

  const grid = [];
  for (let w = 0; w < totalWeeks; w++) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      const dayIdx = w * 7 + d - startWeekday + 1;
      const date = new Date(year, monthIdx, dayIdx);
      week.push({
        date,
        iso: toISO(date),
        inMonth: date.getMonth() === monthIdx,
      });
    }
    grid.push(week);
  }
  return grid;
}

export function weekNumber(date) {
  // ISO 8601-ish week number
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNr = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNr + 3);
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const diff = target - firstThursday;
  return 1 + Math.round(diff / (7 * 24 * 3600 * 1000));
}

export function formatLongDate(date) {
  if (!date) return '';
  return `${date.getDate()} de ${MONTH_NAMES_FULL[date.getMonth()]} de ${date.getFullYear()}`;
}
