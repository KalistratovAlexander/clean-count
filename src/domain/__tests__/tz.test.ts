import { instantFromWallClock, offsetMinutes, wallClock } from '../tz';

describe('часовые пояса', () => {
  it('смещения и настенное время', () => {
    expect(offsetMinutes(new Date('2026-09-28T00:00:00Z'), 'Europe/Moscow')).toBe(180);
    expect(offsetMinutes(new Date('2026-01-15T00:00:00Z'), 'America/New_York')).toBe(-300);
    expect(offsetMinutes(new Date('2026-07-15T00:00:00Z'), 'America/New_York')).toBe(-240);
    expect(offsetMinutes(new Date('2026-07-15T00:00:00Z'), 'Asia/Kolkata')).toBe(330);
    expect(wallClock(new Date('2026-09-27T21:00:00Z'), 'Europe/Moscow')).toEqual({
      year: 2026, month: 9, day: 28, hour: 0, minute: 0, second: 0,
    });
  });

  it('обратное преобразование настенного времени в момент', () => {
    const at = instantFromWallClock({ year: 2026, month: 3, day: 3, hour: 0, minute: 0 }, 'Europe/Moscow');
    expect(at.toISOString()).toBe('2026-03-02T21:00:00.000Z');
  });

  it('весенний перевод часов: несуществующее время сдвигается вперёд', () => {
    // 29 марта 2026 в Берлине 02:00 → 03:00.
    const at = instantFromWallClock({ year: 2026, month: 3, day: 29, hour: 2, minute: 30 }, 'Europe/Berlin');
    expect(wallClock(at, 'Europe/Berlin')).toMatchObject({ day: 29, hour: 3, minute: 30 });
  });

  it('осенний перевод часов: из двух моментов берётся ранний', () => {
    // 25 октября 2026 в Берлине 03:00 → 02:00, время 02:30 встречается дважды.
    const at = instantFromWallClock({ year: 2026, month: 10, day: 25, hour: 2, minute: 30 }, 'Europe/Berlin');
    expect(at.toISOString()).toBe('2026-10-25T00:30:00.000Z');
  });
});

describe('совместимость с Hermes', () => {
  const RealDateTimeFormat = Intl.DateTimeFormat;

  afterEach(() => {
    Intl.DateTimeFormat = RealDateTimeFormat;
  });

  it('работает без formatToParts, разбирая format()', () => {
    // @ts-expect-error — подменяем конструктор упрощённой версией
    Intl.DateTimeFormat = function (locale: string, options: Intl.DateTimeFormatOptions) {
      if (options?.timeZoneName) throw new RangeError('timeZoneName is not supported');
      const real = new RealDateTimeFormat(locale, options);
      return { format: (d: number) => real.format(d) };
    };
    jest.isolateModules(() => {
      const tz = jest.requireActual<typeof import('../tz')>('../tz');
      expect(tz.offsetMinutes(new Date('2026-09-28T00:00:00Z'), 'Europe/Moscow')).toBe(180);
      expect(tz.wallClock(new Date('2026-09-27T21:00:00Z'), 'Europe/Moscow')).toMatchObject({ day: 28, hour: 0 });
    });
  });

  it('без Intl с поясами использует локальное время устройства', () => {
    // @ts-expect-error — движок без поддержки timeZone
    Intl.DateTimeFormat = function () {
      throw new RangeError('Invalid time zone');
    };
    jest.isolateModules(() => {
      const tz = jest.requireActual<typeof import('../tz')>('../tz');
      const instant = new Date('2026-09-28T12:34:00Z');
      expect(tz.wallClock(instant, 'Europe/Moscow')).toMatchObject({
        year: instant.getFullYear(),
        day: instant.getDate(),
        hour: instant.getHours(),
        minute: instant.getMinutes(),
      });
      expect(tz.offsetMinutes(instant, 'Europe/Moscow')).toBe(-instant.getTimezoneOffset());
    });
  });
});
