export function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayYYYYMM() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

export function monthStart(yyyymm) {
  return `${yyyymm}-01`;
}

export function monthEnd(yyyymm) {
  const [y, m] = yyyymm.split('-').map(Number);
  const last = new Date(y, m, 0).getDate();
  return `${yyyymm}-${pad(last)}`;
}

export function prevMonth(yyyymm) {
  const [y, m] = yyyymm.split('-').map(Number);
  if (m === 1) return `${y - 1}-12`;
  return `${y}-${pad(m - 1)}`;
}

export function nextMonth(yyyymm) {
  const [y, m] = yyyymm.split('-').map(Number);
  if (m === 12) return `${y + 1}-01`;
  return `${y}-${pad(m + 1)}`;
}

export function addMonths(yyyymm, n) {
  const [y, m] = yyyymm.split('-').map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

export function monthsBetween(from, to) {
  const [fy, fm] = from.split('-').map(Number);
  const [ty, tm] = to.split('-').map(Number);
  return (ty - fy) * 12 + (tm - fm);
}

export function listMonths(from, to) {
  const months = [];
  let cur = from;
  while (cur <= to) {
    months.push(cur);
    cur = nextMonth(cur);
  }
  return months;
}

export function yyyymmFromISO(isoDate) {
  return isoDate ? isoDate.slice(0, 7) : null;
}

export function deriveStatus(date, unconfirmed) {
  if (unconfirmed) return 'nao_confirmado';
  const today = todayISO();
  if (date > today) return 'previsto';
  return 'realizado';
}

const MONTH_NAMES_SHORT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export function formatMonthLabel(yyyymm) {
  const [y, m] = yyyymm.split('-').map(Number);
  return `${MONTH_NAMES_SHORT[m - 1]}/${String(y).slice(2)}`;
}

export function formatMonthFull(yyyymm) {
  const [y, m] = yyyymm.split('-').map(Number);
  return `${MONTH_NAMES_SHORT[m - 1]}/${y}`;
}

export function formatDateDisplay(isoDate) {
  if (!isoDate) return '';
  const [y, m, d] = isoDate.split('-');
  return `${d}/${m}/${y}`;
}

function pad(n) {
  return String(n).padStart(2, '0');
}
