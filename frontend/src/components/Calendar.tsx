import { useState } from "react";
import s from "./BookingDialog.module.scss";
export const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export default function Calendar({
  today,
  horizon,
  value,
  onChange,
}: {
  today: string;
  horizon: number;
  value: string;
  onChange: (date: string) => void;
}) {
  const [month, setMonth] = useState(() => new Date(value + "T12:00:00"));
  const end = new Date(today + "T12:00:00");
  end.setDate(end.getDate() + horizon);
  const start = new Date(month.getFullYear(), month.getMonth(), 1, 12);
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const offset = (start.getDay() + 6) % 7;
  const move = (n: number) =>
    setMonth(new Date(month.getFullYear(), month.getMonth() + n, 1, 12));
  const firstToday = new Date(today + "T12:00:00");
  firstToday.setDate(1);
  return (
    <div className={s.calendar}>
      <div className={s.calendarHead}>
        <button
          type="button"
          aria-label="Предыдущий месяц"
          disabled={start <= firstToday}
          onClick={() => move(-1)}
        >
          Раньше
        </button>
        <strong aria-live="polite">
          {month.toLocaleDateString("ru-RU", {
            month: "long",
            year: "numeric",
          })}
        </strong>
        <button
          type="button"
          aria-label="Следующий месяц"
          disabled={
            new Date(month.getFullYear(), month.getMonth() + 1, 1, 12) > end
          }
          onClick={() => move(1)}
        >
          Позже
        </button>
      </div>
      <div className={s.days}>
        {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((d) => (
          <span key={d}>{d}</span>
        ))}
        {Array.from({ length: offset }, (_, i) => (
          <span key={"empty" + i} />
        ))}
        {Array.from({ length: days }, (_, i) => {
          const d = new Date(month.getFullYear(), month.getMonth(), i + 1, 12),
            v = iso(d);
          return (
            <button
              type="button"
              key={v}
              disabled={v < today || v > iso(end)}
              className={v === value ? s.chosenDay : ""}
              aria-pressed={v === value}
              aria-label={d.toLocaleDateString("ru-RU", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
              onClick={() => onChange(v)}
            >
              {i + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
}
