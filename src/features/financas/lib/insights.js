import { computeSummary, computeByCategory, computeSavingsStreak } from './aggregations.js';
import { deriveStatus, addMonths, listMonths, monthEnd, monthStart } from './dates.js';

const ANOMALY_THRESHOLD = 0.25; // ≥25% acima da média dos 3 meses anteriores
const STREAK_MONTHS = 3;        // 3 meses consecutivos de poupança positiva
const HISTORY_WINDOW = 12;      // janela de análise

// Detecta categorias com despesa ≥25% acima da média dos 3 meses anteriores
function detectAnomalies(currentMonth, historyByMonth, categories) {
  const insights = [];
  const catIds = new Set(
    Object.values(historyByMonth).flatMap((m) => Object.keys(m)),
  );

  const prevMonths = Object.keys(historyByMonth)
    .filter((m) => m < currentMonth)
    .sort()
    .slice(-3);

  if (prevMonths.length < 2) return insights;

  for (const catId of catIds) {
    const currentVal = historyByMonth[currentMonth]?.[catId] ?? 0;
    const prevVals = prevMonths.map((m) => historyByMonth[m]?.[catId] ?? 0);
    const avg = prevVals.reduce((a, b) => a + b, 0) / prevVals.length;

    if (avg > 0 && currentVal >= avg * (1 + ANOMALY_THRESHOLD)) {
      const cat = categories.find((c) => c.id === catId);
      insights.push({
        kind: 'anomalia',
        title: `Anomalia: ${cat?.name ?? catId}`,
        detail: `Gasto de R$${currentVal.toFixed(2)} está ${(((currentVal / avg) - 1) * 100).toFixed(0)}% acima da média dos últimos ${prevMonths.length} meses (R$${avg.toFixed(2)}).`,
        period: currentMonth,
        categoryId: catId,
      });
    }
  }

  return insights;
}

// Detecta conquista: taxa de poupança positiva por ≥3 meses consecutivos
function detectStreak(monthlySummaries) {
  const streak = computeSavingsStreak(monthlySummaries);
  if (streak >= STREAK_MONTHS) {
    return [{
      kind: 'conquista',
      title: `${streak} meses consecutivos com saldo positivo!`,
      detail: `Parabéns! Você manteve taxa de poupança positiva por ${streak} meses seguidos.`,
      period: null,
    }];
  }
  return [];
}

// Detecta alerta: ocorrência recorrente esperada não materializada/confirmada após a data
function detectMissingOccurrences(currentMonth, recurrences, exceptions) {
  const insights = [];
  const today = new Date().toISOString().slice(0, 10);
  const start = monthStart(currentMonth);
  const end = today < monthEnd(currentMonth) ? today : monthEnd(currentMonth);

  for (const rec of recurrences) {
    if (!rec.active) continue;
    if (rec.start_date > end) continue;
    if (rec.end_date && rec.end_date < start) continue;

    // Verifica se havia uma ocorrência esperada antes de hoje no mês atual
    const hasException = exceptions.some(
      (ex) => ex.recurrence_id === rec.id && ex.occurrence_date >= start && ex.occurrence_date <= end,
    );

    if (!hasException && rec.start_date <= today) {
      insights.push({
        kind: 'alerta',
        title: `Recorrência pendente: ${rec.description}`,
        detail: `Uma ocorrência de "${rec.description}" era esperada em ${currentMonth} e ainda não foi confirmada.`,
        period: currentMonth,
        recurrenceId: rec.id,
      });
    }
  }

  return insights;
}

export function computeInsights({ currentMonth, transactions, recurrences, exceptions, categories, monthlySummaries }) {
  // Agrupa gastos por categoria por mês
  const historyByMonth = {};
  for (const tx of transactions) {
    if (deriveStatus(tx.date, tx.unconfirmed) !== 'realizado') continue;
    if (tx.type !== 'despesa') continue;
    const m = tx.date.slice(0, 7);
    if (!historyByMonth[m]) historyByMonth[m] = {};
    historyByMonth[m][tx.category_id] = (historyByMonth[m][tx.category_id] ?? 0) + Number(tx.amount);
  }

  return [
    ...detectAnomalies(currentMonth, historyByMonth, categories),
    ...detectStreak(monthlySummaries),
    ...detectMissingOccurrences(currentMonth, recurrences, exceptions),
  ];
}
