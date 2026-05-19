import { formatMonthFull, prevMonth, nextMonth, todayYYYYMM } from '../lib/dates.js';

export default function MonthNavigator({ month, onChange }) {
  const isCurrentMonth = month === todayYYYYMM();

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        className="seal sm ghost"
        onClick={() => onChange(prevMonth(month))}
        aria-label="Mês anterior"
      >
        ‹
      </button>

      <span className="font-cinzel uppercase text-[13px] tracking-widest text-[#1f1408] min-w-[110px] text-center">
        {formatMonthFull(month)}
      </span>

      <button
        type="button"
        className="seal sm ghost"
        onClick={() => onChange(nextMonth(month))}
        aria-label="Próximo mês"
      >
        ›
      </button>

      {!isCurrentMonth && (
        <button
          type="button"
          className="seal sm ghost"
          onClick={() => onChange(todayYYYYMM())}
        >
          Hoje
        </button>
      )}
    </div>
  );
}
