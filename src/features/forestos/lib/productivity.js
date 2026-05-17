// Cálculo do "tempo produtivo" por dia + escala de cor.

export const PESO_TIERS = [
  { id: 1, label: 'Trivial',  range: [1, 4],   color: '#4a5568' },
  { id: 2, label: 'Padrão',   range: [5, 9],   color: '#4a6b3a' },
  { id: 3, label: 'Notável',  range: [10, 14], color: '#c9a14a' },
  { id: 4, label: 'Grave',    range: [15, 19], color: '#a8553a' },
  { id: 5, label: 'Épico',    range: [20, 25], color: '#7a2230' },
];

export const HEAT_TIERS = [
  { id: 0, label: 'sem atividade', color: '#ebe0c3' },
  { id: 1, label: '1-20%',         color: '#e8d5a8' },
  { id: 2, label: '21-40%',        color: '#d9bc6e' },
  { id: 3, label: '41-60%',        color: '#c9a14a' },
  { id: 4, label: '61-80%',        color: '#a8553a' },
  { id: 5, label: '81-100%',       color: '#7a2230' },
];

export function missionScore(mission) {
  const focus = Number(mission?.focus_minutes ?? 0);
  const imp = Math.max(1, Number(mission?.importance ?? 1));
  const dif = Math.max(1, Number(mission?.difficulty ?? 1));
  return focus * imp * dif;
}

export function pesoOf(mission) {
  const imp = Math.max(1, Number(mission?.importance ?? 1));
  const dif = Math.max(1, Number(mission?.difficulty ?? 1));
  return imp * dif;
}

export function pesoTier(peso) {
  for (const t of PESO_TIERS) {
    if (peso >= t.range[0] && peso <= t.range[1]) return t;
  }
  return peso > 25 ? PESO_TIERS[PESO_TIERS.length - 1] : PESO_TIERS[0];
}

export function heatTierFor(score, maxScore) {
  if (!score || !maxScore || maxScore <= 0) return HEAT_TIERS[0];
  const pct = (score / maxScore) * 100;
  if (pct <= 0)   return HEAT_TIERS[0];
  if (pct <= 20)  return HEAT_TIERS[1];
  if (pct <= 40)  return HEAT_TIERS[2];
  if (pct <= 60)  return HEAT_TIERS[3];
  if (pct <= 80)  return HEAT_TIERS[4];
  return HEAT_TIERS[5];
}

export function formatMinutes(min) {
  const m = Math.max(0, Math.round(Number(min) || 0));
  if (m === 0) return '0m';
  const h = Math.floor(m / 60);
  const rest = m % 60;
  if (h === 0) return `${rest}m`;
  if (rest === 0) return `${h}h`;
  return `${h}h ${rest}m`;
}

export function summarizeMissions(missions) {
  const totalFocus = missions.reduce((acc, m) => acc + Number(m.focus_minutes ?? 0), 0);
  const totalXp = missions.reduce((acc, m) => acc + Number(m.xp_gained ?? 0), 0);
  const totalScore = missions.reduce((acc, m) => acc + missionScore(m), 0);
  return {
    totalFocus,
    totalXp,
    totalScore,
    count: missions.length,
  };
}
