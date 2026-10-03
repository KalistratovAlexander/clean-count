import { instantFromWallClock, offsetMinutes, wallClock } from './tz';
import type { LocalDate, ZonedDateTime } from './types';

const MS_PER_DAY = 86_400_000;

export interface DateParts {
  year: number;
  /** 1–12 */
  month: number;
  day: number;
}

const pad = (n: number, width = 2) => String(n).padStart(width, '0');

export function toParts(date: LocalDate): DateParts {
  const [y, m, d] = date.split('-');
  return { year: Number(y), month: Number(m), day: Number(d) };
}

export function fromParts({ year, month, day }: DateParts): LocalDate {
  return `${pad(year, 4)}-${pad(month)}-${pad(day)}`;
}

/**
 * Календарная арифметика ведётся в UTC: там нет переходов на летнее время,
 * поэтому сутки всегда ровно 24 часа.
 */
function toUtcMs(date: LocalDate): number {
  const { year, month, day } = toParts(date);
  return Date.UTC(year, month - 1, day);
}

function fromUtcMs(ms: number): LocalDate {
  const d = new Date(ms);
  return fromParts({ year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() });
}

export function addDays(date: LocalDate, days: number): LocalDate {
  return fromUtcMs(toUtcMs(date) + days * MS_PER_DAY);
}

/** Сколько календарных дней от `from` до `to` (отрицательно, если `to` раньше). */
export function diffDays(to: LocalDate, from: LocalDate): number {
  return Math.round((toUtcMs(to) - toUtcMs(from)) / MS_PER_DAY);
}

/** 0 — понедельник, 6 — воскресенье. */
export function weekdayMondayFirst(date: LocalDate): number {
  return (new Date(toUtcMs(date)).getUTCDay() + 6) % 7;
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function minDate(a: LocalDate, b: LocalDate): LocalDate {
  return a < b ? a : b;
}

export function maxDate(a: LocalDate, b: LocalDate): LocalDate {
  return a > b ? a : b;
}

/** Календарная дата момента `instant` в поясе `tz`. */
export function localDateAt(instant: Date, tz: string): LocalDate {
  const { year, month, day } = wallClock(instant, tz);
  return fromParts({ year, month, day });
}

/** Момент начала суток (00:00) даты `date` в поясе `tz`. */
export function startOfLocalDay(date: LocalDate, tz: string): Date {
  return localDateTime(date, 0, tz);
}

/** Момент `date` + `minutes` минут от полуночи в поясе `tz`. */
export function localDateTime(date: LocalDate, minutes: number, tz: string): Date {
  return instantFromWallClock({ ...toParts(date), hour: Math.floor(minutes / 60), minute: minutes % 60 }, tz);
}

/** ISO-строка со смещением пояса `tz`: сохраняет и момент, и исходную календарную дату. */
export function toZoned(instant: Date, tz: string): ZonedDateTime {
  const c = wallClock(instant, tz);
  const offset = offsetMinutes(instant, tz);
  const sign = offset < 0 ? '-' : '+';
  const abs = Math.abs(offset);
  return (
    `${fromParts(c)}T${pad(c.hour)}:${pad(c.minute)}:${pad(c.second)}` +
    `${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`
  );
}

export function zonedDate(value: ZonedDateTime): LocalDate {
  return value.slice(0, 10);
}

/** Минуты от полуночи по исходному (сохранённому) времени. */
export function zonedMinutes(value: ZonedDateTime): number {
  return Number(value.slice(11, 13)) * 60 + Number(value.slice(14, 16));
}

export function zonedInstant(value: ZonedDateTime): Date {
  return new Date(value);
}
