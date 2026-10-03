import { plural } from '@/i18n/plural';
import { formatDayMonth, formatDayWithWeekday, formatQuitAt } from '@/i18n/format';
import { t } from '@/i18n';

import { buildMonth, monthRange } from '../calendar';
import { addDays, diffDays, localDateTime, toZoned, weekdayMondayFirst, zonedDate, zonedMinutes } from '../localDate';
import { goalProgress, nextMilestone, pendingMilestone, reachedMilestones } from '../milestones';
import { buildRelapse, isRelapseDateAllowed, relapseDateRange } from '../relapse';
import type { Habit, Relapse } from '../types';

const MSK = 'Europe/Moscow';

describe('календарные даты', () => {
  it('арифметика дат через границы месяцев и годов', () => {
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(diffDays('2026-09-28', '2026-03-03')).toBe(209);
  });

  it('неделя начинается с понедельника', () => {
    expect(weekdayMondayFirst('2026-09-28')).toBe(0);
    expect(weekdayMondayFirst('2026-08-16')).toBe(6);
  });

  it('дата и время хранятся со смещением пояса', () => {
    const quitAt = toZoned(localDateTime('2026-03-03', 0, MSK), MSK);
    expect(quitAt).toBe('2026-03-03T00:00:00+03:00');
    expect(zonedDate(quitAt)).toBe('2026-03-03');
    expect(zonedMinutes(toZoned(localDateTime('2026-03-03', 8 * 60 + 5, MSK), MSK))).toBe(485);
  });
});

describe('вехи', () => {
  it('ближайшая веха', () => {
    expect(nextMilestone(0)).toBe(1);
    expect(nextMilestone(1)).toBe(3);
    expect(nextMilestone(42)).toBe(60);
    expect(nextMilestone(180)).toBe(365);
    expect(nextMilestone(365)).toBe(730);
    expect(nextMilestone(400)).toBe(730);
    expect(nextMilestone(730)).toBe(1095);
  });

  it('достигнутые вехи', () => {
    expect(reachedMilestones(0)).toEqual([]);
    expect(reachedMilestones(14)).toEqual([1, 3, 7, 14]);
    expect(reachedMilestones(800)).toEqual([1, 3, 7, 14, 30, 60, 90, 180, 365, 730]);
  });

  it('поздравление один раз на веху, при пропуске — с самой большой', () => {
    expect(pendingMilestone(0, [])).toBeNull();
    expect(pendingMilestone(42, [])).toBe(30);
    expect(pendingMilestone(42, [1, 3, 7, 14, 30])).toBeNull();
    expect(pendingMilestone(60, [1, 3, 7, 14, 30])).toBe(60);
    expect(pendingMilestone(3, [1, 3, 7, 14, 30])).toBeNull();
  });

  it('прогресс до цели', () => {
    expect(goalProgress(42)).toEqual({ goal: 60, remaining: 18, progress: 0.7 });
    expect(goalProgress(0)).toEqual({ goal: 1, remaining: 1, progress: 0 });
  });
});

describe('склонения', () => {
  const DAY = ['день', 'дня', 'дней'] as const;
  it.each([
    [0, 'дней'], [1, 'день'], [2, 'дня'], [4, 'дня'], [5, 'дней'], [11, 'дней'], [12, 'дней'],
    [14, 'дней'], [21, 'день'], [22, 'дня'], [42, 'дня'], [111, 'дней'], [206, 'дней'], [1001, 'день'],
  ])('%i %s', (n, expected) => {
    expect(plural(n, DAY)).toBe(expected);
  });

  it('фразы окна срыва согласуются с числом', () => {
    expect(t.sheet.phrases[0]!(1)).toBe('Серия начнётся заново, но 1 чистый день уже ваш и никуда не денется.');
    expect(t.sheet.phrases[0]!(206)).toBe('Серия начнётся заново, но 206 чистых дней уже ваши и никуда не денутся.');
    expect(t.sheet.phrases[1]!(243)).toBe('Это один эпизод, а не конец пути. 243 чистых дня остаются с вами.');
  });

  it('подписи главного экрана', () => {
    expect(t.main.daysInRow(42)).toEqual(['дня', 'подряд']);
    expect(t.main.streakDetails(5, 7, '17 августа')).toBe('5 ч 07 мин · с 17 августа');
    expect(t.main.totalLabel(209, '3 марта')).toBe('дней с начала, 3 марта');
    expect(t.main.cleanLabel(243)).toBe('чистых дня всего');
  });
});

describe('форматирование дат', () => {
  it('день и месяц, год — только если не текущий', () => {
    expect(formatDayMonth('2026-08-17', '2026-09-28')).toBe('17 августа');
    expect(formatDayMonth('2025-08-17', '2026-09-28')).toBe('17 августа 2025');
    expect(formatDayWithWeekday('2026-08-16', '2026-09-28')).toBe('16 августа, воскресенье');
    expect(formatQuitAt('2026-03-03T08:05:00+03:00')).toBe('3 марта 2026, 08:05');
  });
});

describe('запись срыва', () => {
  const h: Habit = { id: 'smoking', enabled: true, quitAt: '2026-09-01T00:00:00+03:00', milestonesShown: [] };
  const now = new Date('2026-09-10T12:00:00+03:00');

  it('дату нельзя выбрать раньше отказа или в будущем', () => {
    expect(relapseDateRange(h, now, MSK)).toEqual({ min: '2026-09-01', max: '2026-09-10' });
    expect(isRelapseDateAllowed(h, '2026-08-31', now, MSK)).toBe(false);
    expect(isRelapseDateAllowed(h, '2026-09-01', now, MSK)).toBe(true);
    expect(isRelapseDateAllowed(h, '2026-09-10', now, MSK)).toBe(true);
    expect(isRelapseDateAllowed(h, '2026-09-11', now, MSK)).toBe(false);
  });

  it('количество ограничено 1–99, заметка — 300 символами', () => {
    const r = buildRelapse({ habitId: 'smoking', date: '2026-09-10', kind: 'vape', count: 150, note: '  ' }, 'id', now, MSK);
    expect(r.count).toBe(99);
    expect(r.note).toBeNull();
    expect(r.createdAt).toBe('2026-09-10T12:00:00+03:00');
    const long = buildRelapse({ habitId: 'alcohol', date: '2026-09-10', kind: 'strong', note: 'x'.repeat(400) }, 'id', now, MSK);
    expect(long.note).toHaveLength(300);
    expect(long.count).toBe(1);
  });
});

describe('календарь', () => {
  const alcohol: Habit = { id: 'alcohol', enabled: true, quitAt: '2026-08-05T00:00:00+03:00', milestonesShown: [] };
  const smoking: Habit = { id: 'smoking', enabled: true, quitAt: '2026-08-10T00:00:00+03:00', milestonesShown: [] };
  const mk = (id: string, habitId: Relapse['habitId'], date: string, kind: Relapse['kind']): Relapse => ({
    id, habitId, date, createdAt: `${date}T20:00:00+03:00`, kind, count: 1, note: null,
  });
  const relapses = [
    mk('a1', 'alcohol', '2026-08-02', 'light'), // до даты отказа — не учитывается
    mk('a2', 'alcohol', '2026-08-16', 'strong'),
    mk('s1', 'smoking', '2026-08-16', 'cigarette'),
    mk('s2', 'smoking', '2026-08-23', 'hookah'),
    mk('s3', 'smoking', '2026-09-03', 'vape'),
  ];
  const today = '2026-08-25';

  it('состояния ячеек при фильтре «Все»', () => {
    const month = buildMonth({ year: 2026, month: 8 }, [alcohol, smoking], relapses, 'all', today);
    const state = (d: number) => month.days[d - 1]!.state;
    expect(month.leadingBlanks).toBe(5); // 1 августа 2026 — суббота
    expect(state(2)).toBe('inactive');
    expect(state(5)).toBe('clean');
    expect(state(16)).toBe('both');
    expect(state(23)).toBe('smoking');
    expect(state(26)).toBe('inactive');
    expect(month.days[24]!.isToday).toBe(true);
    expect(month.totals).toEqual({ alcohol: 1, smoking: 2 });
  });

  it('фильтр по привычке', () => {
    const month = buildMonth({ year: 2026, month: 8 }, [alcohol, smoking], relapses, 'alcohol', today);
    expect(month.days[15]!.state).toBe('alcohol');
    expect(month.days[15]!.relapses.map((r) => r.id)).toEqual(['a2']);
    expect(month.days[22]!.state).toBe('clean');

    const smokingOnly = buildMonth({ year: 2026, month: 8 }, [alcohol, smoking], relapses, 'smoking', today);
    expect(smokingOnly.days[6]!.state).toBe('inactive'); // до отказа от курения
  });

  it('выключенная привычка не показывается', () => {
    const month = buildMonth({ year: 2026, month: 8 }, [alcohol, { ...smoking, enabled: false }], relapses, 'all', today);
    expect(month.days[15]!.state).toBe('alcohol');
    expect(month.totals.smoking).toBe(0);
  });

  it('диапазон месяцев — от самой ранней даты отказа до текущего', () => {
    expect(monthRange([alcohol, smoking], '2026-10-02')).toEqual([
      { year: 2026, month: 8 },
      { year: 2026, month: 9 },
      { year: 2026, month: 10 },
    ]);
  });
});
