/**
 * Минимальная работа с часовыми поясами, совместимая с Hermes.
 *
 * Hermes поддерживает `Intl.DateTimeFormat` с опцией `timeZone`, но не поддерживает
 * `timeZoneName: 'longOffset'`, на которую опираются популярные библиотеки. Поэтому
 * смещение вычисляется из «настенного» времени пояса. Если `Intl` недоступен или
 * пояс неизвестен, используется локальное время устройства.
 */

export interface WallClock {
  year: number;
  /** 1–12 */
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

const MS_PER_MINUTE = 60_000;

type PartsReader = (instant: number) => WallClock;

const readers = new Map<string, PartsReader | null>();

function deviceReader(instant: number): WallClock {
  const d = new Date(instant);
  return {
    year: d.getFullYear(),
    month: d.getMonth() + 1,
    day: d.getDate(),
    hour: d.getHours(),
    minute: d.getMinutes(),
    second: d.getSeconds(),
  };
}

function createIntlReader(tz: string): PartsReader | null {
  try {
    const format = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hourCycle: 'h23',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
    });
    const read: PartsReader = (instant) => {
      const values: Record<string, number> = {};
      if (typeof format.formatToParts === 'function') {
        for (const part of format.formatToParts(instant)) {
          if (part.type !== 'literal') values[part.type] = Number(part.value);
        }
      } else {
        // "9/28/2026, 05:17:00"
        const m = format.format(instant).match(/(\d+)\/(\d+)\/(\d+),?\s+(\d+):(\d+):(\d+)/);
        if (!m) throw new Error('Unexpected date format');
        const [month, day, year, hour, minute, second] = m.slice(1).map(Number);
        Object.assign(values, { month, day, year, hour, minute, second });
      }
      const clock: WallClock = {
        year: values.year!,
        month: values.month!,
        day: values.day!,
        // Некоторые движки дают «24» вместо «0» в полночь.
        hour: values.hour! % 24,
        minute: values.minute!,
        second: values.second!,
      };
      if (Object.values(clock).some((v) => !Number.isFinite(v))) throw new Error('Unexpected date parts');
      return clock;
    };
    read(Date.now());
    return read;
  } catch {
    return null;
  }
}

function reader(tz: string): PartsReader {
  if (!readers.has(tz)) readers.set(tz, createIntlReader(tz));
  return readers.get(tz) ?? deviceReader;
}

/** Настенное время момента `instant` в поясе `tz`. */
export function wallClock(instant: Date | number, tz: string): WallClock {
  return reader(tz)(typeof instant === 'number' ? instant : instant.getTime());
}

function wallAsUtc(c: WallClock): number {
  return Date.UTC(c.year, c.month - 1, c.day, c.hour, c.minute, c.second);
}

/** Смещение пояса в минутах для момента `instant` (Москва: +180). */
export function offsetMinutes(instant: Date | number, tz: string): number {
  const ms = typeof instant === 'number' ? instant : instant.getTime();
  const wholeSeconds = Math.floor(ms / 1000) * 1000;
  return Math.round((wallAsUtc(wallClock(wholeSeconds, tz)) - wholeSeconds) / MS_PER_MINUTE);
}

/**
 * Момент, когда в поясе `tz` на часах `clock`. Несуществующее время (весенний
 * перевод часов) сдвигается вперёд на величину перевода; для неоднозначного
 * (осенний перевод) берётся более ранний из двух моментов.
 */
export function instantFromWallClock(clock: Omit<WallClock, 'second'> & { second?: number }, tz: string): Date {
  const target = wallAsUtc({ ...clock, second: clock.second ?? 0 });
  const before = offsetMinutes(target - 12 * 60 * MS_PER_MINUTE, tz);
  const after = offsetMinutes(target + 12 * 60 * MS_PER_MINUTE, tz);
  const candidates = [target - before * MS_PER_MINUTE, target - after * MS_PER_MINUTE].filter(
    (ms) => wallAsUtc(wallClock(ms, tz)) === target,
  );
  if (candidates.length) return new Date(Math.min(...candidates));
  // Время попало в «дыру» перевода часов.
  return new Date(target - before * MS_PER_MINUTE);
}
