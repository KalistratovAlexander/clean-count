import { localDateAt, toZoned } from '../localDate';
import { computeHabitStats, streakStart } from '../stats';
import type { Habit, Relapse, RelapseKind } from '../types';

const MSK = 'Europe/Moscow';

const habit = (quitAt: string, id: Habit['id'] = 'alcohol'): Habit => ({
  id,
  enabled: true,
  quitAt,
  milestonesShown: [],
});

let seq = 0;
const relapse = (date: string, createdAt: string, kind: RelapseKind = 'light', habitId: Habit['id'] = 'alcohol'): Relapse => ({
  id: `r${++seq}`,
  habitId,
  date,
  createdAt,
  kind,
  count: 1,
  note: null,
});

describe('пример из ТЗ', () => {
  const h = habit('2026-03-03T00:00:00+03:00');
  const relapses = [
    relapse('2026-04-10', '2026-04-10T22:00:00+03:00', 'strong'),
    relapse('2026-06-05', '2026-06-06T09:00:00+03:00', 'light'),
    relapse('2026-08-16', '2026-08-18T10:00:00+03:00', 'light'),
  ];
  const now = new Date('2026-09-28T05:17:00+03:00');
  const stats = computeHabitStats(h, relapses, now, MSK);

  it('общий счёт — 209 дней с 3 марта', () => {
    expect(stats.totalDays).toBe(209);
  });

  it('чистых дней: 209 − 3 = 206', () => {
    expect(stats.cleanDays).toBe(206);
  });

  it('срывы с разбивкой по типам', () => {
    expect(stats.relapseCount).toBe(3);
    expect(stats.relapsesByKind).toEqual({ strong: 1, light: 2 });
  });

  it('срыв задним числом: серия с 00:00 следующего дня — 42 дня, 5 ч 17 мин', () => {
    expect(stats.streak.start.toISOString()).toBe(new Date('2026-08-17T00:00:00+03:00').toISOString());
    expect(stats.streak).toMatchObject({ days: 42, hours: 5, minutes: 17 });
  });

  it('следующая цель — 60 дней, осталось 18', () => {
    expect(stats.goal).toBe(60);
    expect(stats.goalRemaining).toBe(18);
    expect(stats.goalProgress).toBeCloseTo(0.7);
  });
});

describe('текущая серия', () => {
  const h = habit('2026-09-01T00:00:00+03:00');

  it('без срывов считается от даты и времени отказа', () => {
    const withTime = habit('2026-09-01T08:30:00+03:00');
    const stats = computeHabitStats(withTime, [], new Date('2026-09-03T09:00:00+03:00'), MSK);
    expect(stats.streak).toMatchObject({ days: 2, hours: 0, minutes: 30 });
  });

  it('срыв, записанный сегодня, обнуляет серию с момента записи', () => {
    const r = relapse('2026-09-10', '2026-09-10T14:30:00+03:00');
    const stats = computeHabitStats(h, [r], new Date('2026-09-10T18:00:00+03:00'), MSK);
    expect(stats.streak).toMatchObject({ days: 0, hours: 3, minutes: 30 });
  });

  it('срыв задним числом после сегодняшнего не отодвигает серию назад', () => {
    const today = relapse('2026-09-10', '2026-09-10T10:00:00+03:00');
    const backdated = relapse('2026-09-09', '2026-09-10T12:00:00+03:00');
    expect(streakStart(h, [today, backdated], MSK).toISOString()).toBe(
      new Date('2026-09-10T10:00:00+03:00').toISOString(),
    );
    expect(streakStart(h, [backdated, today], MSK).toISOString()).toBe(
      new Date('2026-09-10T10:00:00+03:00').toISOString(),
    );
  });

  it('время отказа в будущем сегодня даёт нулевую серию, а не отрицательную', () => {
    const later = habit('2026-09-10T23:00:00+03:00');
    const stats = computeHabitStats(later, [], new Date('2026-09-10T12:00:00+03:00'), MSK);
    expect(stats.streak).toMatchObject({ days: 0, hours: 0, minutes: 0 });
    expect(stats.totalDays).toBe(0);
  });
});

describe('несколько срывов', () => {
  const h = habit('2026-09-01T00:00:00+03:00');

  it('два срыва в один день — один «грязный» день, но два в счётчике', () => {
    const relapses = [
      relapse('2026-09-05', '2026-09-05T12:00:00+03:00', 'strong'),
      relapse('2026-09-05', '2026-09-05T20:00:00+03:00', 'light'),
    ];
    const stats = computeHabitStats(h, relapses, new Date('2026-09-10T12:00:00+03:00'), MSK);
    expect(stats.totalDays).toBe(9);
    expect(stats.cleanDays).toBe(8);
    expect(stats.relapseCount).toBe(2);
    expect(stats.streak.start.toISOString()).toBe(new Date('2026-09-05T20:00:00+03:00').toISOString());
  });

  it('срыв сегодня не уменьшает чистые дни до конца дня, завтра — уменьшает', () => {
    const r = relapse('2026-09-10', '2026-09-10T10:00:00+03:00');
    const today = computeHabitStats(h, [r], new Date('2026-09-10T12:00:00+03:00'), MSK);
    expect(today.totalDays).toBe(9);
    expect(today.cleanDays).toBe(9);
    const tomorrow = computeHabitStats(h, [r], new Date('2026-09-11T12:00:00+03:00'), MSK);
    expect(tomorrow.totalDays).toBe(10);
    expect(tomorrow.cleanDays).toBe(9);
  });

  it('удаление срыва возвращает прежние показатели', () => {
    const now = new Date('2026-09-10T12:00:00+03:00');
    const before = computeHabitStats(h, [], now, MSK);
    const r = relapse('2026-09-05', '2026-09-06T09:00:00+03:00');
    const withRelapse = computeHabitStats(h, [r], now, MSK);
    expect(withRelapse.cleanDays).toBe(before.cleanDays - 1);
    expect(withRelapse.streak.days).toBeLessThan(before.streak.days);
    expect(computeHabitStats(h, [r].filter((x) => x.id !== r.id), now, MSK)).toEqual(before);
  });

  it('срывы другой привычки не влияют', () => {
    const r = relapse('2026-09-05', '2026-09-05T12:00:00+03:00', 'cigarette', 'smoking');
    const stats = computeHabitStats(h, [r], new Date('2026-09-10T12:00:00+03:00'), MSK);
    expect(stats.relapseCount).toBe(0);
    expect(stats.cleanDays).toBe(9);
  });
});

describe('изменение даты отказа', () => {
  const relapses = [
    relapse('2026-08-20', '2026-08-20T12:00:00+03:00'),
    relapse('2026-09-05', '2026-09-05T12:00:00+03:00'),
  ];
  const now = new Date('2026-09-10T12:00:00+03:00');

  it('срывы раньше новой даты не учитываются', () => {
    const stats = computeHabitStats(habit('2026-09-01T00:00:00+03:00'), relapses, now, MSK);
    expect(stats.relapseCount).toBe(1);
    expect(stats.cleanDays).toBe(8);
  });

  it('перенос даты на более раннюю снова учитывает старые срывы', () => {
    const stats = computeHabitStats(habit('2026-08-01T00:00:00+03:00'), relapses, now, MSK);
    expect(stats.relapseCount).toBe(2);
    expect(stats.totalDays).toBe(40);
    expect(stats.cleanDays).toBe(38);
  });
});

describe('время и часовые пояса', () => {
  it('смена даты в полночь увеличивает счётчики', () => {
    const h = habit('2026-09-01T00:00:00+03:00');
    const before = computeHabitStats(h, [], new Date('2026-09-10T23:59:00+03:00'), MSK);
    const after = computeHabitStats(h, [], new Date('2026-09-11T00:00:00+03:00'), MSK);
    expect(before.totalDays).toBe(9);
    expect(before.streak).toMatchObject({ days: 9, hours: 23, minutes: 59 });
    expect(after.totalDays).toBe(10);
    expect(after.streak).toMatchObject({ days: 10, hours: 0, minutes: 0 });
  });

  it('переход на летнее время: сутки в 23 часа считаются целым днём', () => {
    const BERLIN = 'Europe/Berlin';
    // В ночь на 29 марта 2026 часы в Берлине переводятся с 02:00 на 03:00.
    const h = habit('2026-03-28T00:00:00+01:00');
    const stats = computeHabitStats(h, [], new Date('2026-03-30T00:00:00+02:00'), BERLIN);
    expect(stats.streak).toMatchObject({ days: 2, hours: 0, minutes: 0 });
    expect(stats.totalDays).toBe(2);
  });

  it('переход на зимнее время: сутки в 25 часов считаются целым днём', () => {
    const BERLIN = 'Europe/Berlin';
    const h = habit('2026-10-24T00:00:00+02:00');
    const stats = computeHabitStats(h, [], new Date('2026-10-26T00:30:00+01:00'), BERLIN);
    expect(stats.streak).toMatchObject({ days: 2, hours: 0, minutes: 30 });
  });

  it('смена часового пояса не меняет записанные дни срывов', () => {
    const h = habit('2026-09-01T00:00:00+03:00');
    // Записан в Москве в 23:30 — в Лондоне это ещё 21:30 того же дня, в Токио уже следующий день.
    const r = relapse('2026-09-10', toZoned(new Date('2026-09-10T23:30:00+03:00'), MSK));
    const now = new Date('2026-09-15T12:00:00+03:00');
    for (const tz of [MSK, 'Europe/London', 'Asia/Tokyo', 'America/New_York']) {
      const stats = computeHabitStats(h, [r], now, tz);
      expect(stats.relapseCount).toBe(1);
      expect(stats.streak.start.toISOString()).toBe(new Date('2026-09-10T23:30:00+03:00').toISOString());
    }
  });

  it('«сегодня» определяется в текущем поясе', () => {
    const instant = new Date('2026-09-10T22:30:00Z');
    expect(localDateAt(instant, 'Europe/London')).toBe('2026-09-10');
    expect(localDateAt(instant, MSK)).toBe('2026-09-11');
  });
});
