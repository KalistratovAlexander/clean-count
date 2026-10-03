import { toParts, weekdayMondayFirst, zonedMinutes } from '@/domain/localDate';
import type { LocalDate, ZonedDateTime } from '@/domain/types';
import type { YearMonth } from '@/domain/calendar';

import { t } from './index';

/** «17 августа», а если год не текущий — «17 августа 2025». */
export function formatDayMonth(date: LocalDate, today?: LocalDate): string {
  const { year, month, day } = toParts(date);
  const base = `${day} ${t.monthsGenitive[month - 1]}`;
  return today && toParts(today).year !== year ? `${base} ${year}` : base;
}

/** «3 марта 2026» */
export function formatFullDate(date: LocalDate): string {
  const { year, month, day } = toParts(date);
  return `${day} ${t.monthsGenitive[month - 1]} ${year}`;
}

/** «12 сент.» — для чипа с выбранной датой. */
export function formatShortDate(date: LocalDate): string {
  const { month, day } = toParts(date);
  return `${day} ${t.monthsShort[month - 1]}`;
}

/** «16 августа, воскресенье» */
export function formatDayWithWeekday(date: LocalDate, today?: LocalDate): string {
  return `${formatDayMonth(date, today)}, ${t.weekdays[weekdayMondayFirst(date)]}`;
}

/** «Сентябрь 2026» */
export function formatMonthTitle({ year, month }: YearMonth): string {
  return `${t.months[month - 1]} ${year}`;
}

export function formatTime(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

/** «3 марта 2026, 00:00» */
export function formatQuitAt(value: ZonedDateTime): string {
  return `${formatFullDate(value.slice(0, 10))}, ${formatTime(zonedMinutes(value))}`;
}
