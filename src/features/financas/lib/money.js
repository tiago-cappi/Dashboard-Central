const BRL_FMT = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const BRL_COMPACT = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  notation: 'compact',
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});

export function formatBRL(value) {
  return BRL_FMT.format(value ?? 0);
}

export function formatBRLCompact(value) {
  return BRL_COMPACT.format(value ?? 0);
}

export function parseBRL(str) {
  if (typeof str === 'number') return str;
  const cleaned = String(str)
    .replace(/[^\d,.-]/g, '')
    .replace(',', '.');
  return parseFloat(cleaned) || 0;
}

export function isValidAmount(value) {
  const n = typeof value === 'number' ? value : parseBRL(value);
  return Number.isFinite(n) && n > 0;
}

export function formatPercent(ratio, decimals = 1) {
  return `${(ratio * 100).toFixed(decimals)}%`;
}
