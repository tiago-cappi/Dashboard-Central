import { monthEnd, monthStart, deriveStatus } from './dates.js';

function pad(n) { return String(n).padStart(2, '0'); }

function toISO(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function nextOccurrence(date, frequency) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  if (frequency === 'semanal') d.setDate(d.getDate() + 7);
  else if (frequency === 'mensal') d.setMonth(d.getMonth() + 1);
  else if (frequency === 'anual') d.setFullYear(d.getFullYear() + 1);
  return d;
}

// Projeta ocorrências virtuais de uma série de recorrências para o mês dado.
// Recebe um Map de exceções: `${recurrence_id}:${occurrence_date}` → exception row.
export function projectOccurrences(recurrences, yyyymm, exceptionsMap = new Map()) {
  const start = monthStart(yyyymm);
  const end = monthEnd(yyyymm);
  const virtual = [];

  for (const rec of recurrences) {
    if (!rec.active) continue;

    let current = new Date(
      Number(rec.start_date.slice(0, 4)),
      Number(rec.start_date.slice(5, 7)) - 1,
      Number(rec.start_date.slice(8, 10)),
    );

    const endBound = rec.end_date ? new Date(
      Number(rec.end_date.slice(0, 4)),
      Number(rec.end_date.slice(5, 7)) - 1,
      Number(rec.end_date.slice(8, 10)),
    ) : null;

    // Avança até o intervalo do mês sem ultrapassar muito
    while (toISO(current) < start) {
      current = nextOccurrence(current, rec.frequency);
      if (endBound && current > endBound) break;
    }

    while (toISO(current) >= start && toISO(current) <= end) {
      if (endBound && current > endBound) break;

      const occDate = toISO(current);
      const key = `${rec.id}:${occDate}`;
      const ex = exceptionsMap.get(key);

      if (!ex) {
        // Ocorrência virtual sem exceção
        virtual.push({
          id: `virtual:${rec.id}:${occDate}`,
          type: rec.type,
          amount: rec.amount,
          date: occDate,
          description: rec.description,
          category_id: rec.category_id,
          recurrence_id: rec.id,
          unconfirmed: false,
          isVirtual: true,
          status: deriveStatus(occDate, false),
          categories: null,
        });
      } else if (ex.kind === 'skipped') {
        // omite
      }
      // 'materialized' → já está em transactions; useTransactions filtra por transaction_id

      current = nextOccurrence(current, rec.frequency);
    }
  }

  return virtual;
}
