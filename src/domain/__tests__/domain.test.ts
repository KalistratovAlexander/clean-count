import { plural } from '@/i18n/plural';
import { formatDayMonth, formatDayWithWeekday, formatQuitAt } from '@/i18n/format';
import { t } from '@/i18n';

import { buildMonth, monthRange } from '../calendar';
import { addDays, calendarDiff, diffDays, localDateTime, toZoned, weekdayMondayFirst, zonedDate, zonedMinutes } from '../localDate';
import {
  achievedMilestones,
  goalProgress,
  lastReachedMilestone,
  migrateLegacyMilestones,
  nextMilestone,
  pendingMilestone,
  reachedMilestones,
  tierMilestones,
} from '../milestones';
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
    expect(nextMilestone(0)).toBe(5);
    expect(nextMilestone(4)).toBe(5);
    expect(nextMilestone(5)).toBe(10);
    expect(nextMilestone(42)).toBe(45);
    expect(nextMilestone(209)).toBe(270);
    expect(nextMilestone(365)).toBe(545);
    expect(nextMilestone(730)).toBe(1095);
    expect(nextMilestone(1100)).toBe(1460);
  });

  it('достигнутые вехи', () => {
    expect(reachedMilestones(0)).toEqual([]);
    expect(reachedMilestones(4)).toEqual([]);
    expect(reachedMilestones(5)).toEqual([5]);
    expect(reachedMilestones(23)).toEqual([5, 10, 14, 21]);
    expect(reachedMilestones(365)).toEqual([5, 10, 14, 21, 30, 45, 60, 90, 120, 180, 270, 365]);
    expect(reachedMilestones(1100).slice(-3)).toEqual([545, 730, 1095]);
  });

  it('поздравление один раз на веху, при пропуске — с самой большой', () => {
    const c = (celebratedSince: string | null, celebratedUpTo: number) => ({ celebratedSince, celebratedUpTo });
    expect(lastReachedMilestone(4)).toBe(0);
    expect(lastReachedMilestone(23)).toBe(21);
    expect(pendingMilestone(4, '2026-09-01', c(null, 0))).toBeNull();
    expect(pendingMilestone(23, '2026-09-01', c(null, 0))).toBe(21);
    expect(pendingMilestone(23, '2026-09-01', c('2026-09-01', 21))).toBeNull();
    expect(pendingMilestone(30, '2026-09-01', c('2026-09-01', 21))).toBe(30);
    // Новая серия после срыва: прежние поздравления не считаются, веха 5 празднуется снова.
    expect(pendingMilestone(5, '2026-10-01', c('2026-09-01', 40))).toBe(5);
  });

  it('прогресс до цели', () => {
    expect(goalProgress(42)).toEqual({ goal: 45, remaining: 3, progress: 42 / 45 });
    expect(goalProgress(0)).toEqual({ goal: 5, remaining: 5, progress: 0 });
  });

  it('достижения: показанные вехи остаются после срыва, текущие добавляются', () => {
    expect(achievedMilestones([5, 10, 14], 2)).toEqual([5, 10, 14]);
    expect(achievedMilestones([5, 10], 17)).toEqual([5, 10, 14]);
    expect(achievedMilestones([], 0)).toEqual([]);
    // Значения старой схемы и мусор игнорируются.
    expect(achievedMilestones([1, 3, 7, 0, -5], 5)).toEqual([5]);
  });

  it('главные рубежи: четыре базовых, дальше по году до первого недостигнутого', () => {
    expect(tierMilestones(0)).toEqual([30, 90, 180, 365]);
    expect(tierMilestones(360)).toEqual([30, 90, 180, 365]);
    expect(tierMilestones(365)).toEqual([30, 90, 180, 365, 730]);
    expect(tierMilestones(1235)).toEqual([30, 90, 180, 365, 730, 1095, 1460]);
    expect(t.achievements.tierName(30)).toBe('Месяц');
    expect(t.achievements.tierName(365)).toBe('Год');
    expect(t.achievements.tierName(730)).toBe('2 года');
    expect(t.achievements.tierName(1825)).toBe('5 лет');
  });

  it('старые вехи переводятся на новую схему без поздравления задним числом', () => {
    expect(migrateLegacyMilestones([1, 3, 7, 14, 30], 209)).toEqual(reachedMilestones(209));
    expect(migrateLegacyMilestones([1], 3)).toEqual([]);
    // Схема «каждые 5 дней»: заработанное 40 означает пройденные 5, 10, 14, 21 и 30.
    expect(migrateLegacyMilestones([5, 10, 15, 20, 25, 30, 35, 40], 2)).toEqual([5, 10, 14, 21, 30]);
    // Новая схема и пустой список не трогаются.
    expect(migrateLegacyMilestones([], 209)).toBeNull();
    expect(migrateLegacyMilestones([5, 10], 12)).toBeNull();
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
    expect(t.sheet.phrases[0]!(1)).toBe('Отсчёт с последнего срыва начнётся заново, но 1 чистый день уже ваш и никуда не денется.');
    expect(t.sheet.phrases[0]!(206)).toBe('Отсчёт с последнего срыва начнётся заново, но 206 чистых дней уже ваши и никуда не денутся.');
    expect(t.sheet.phrases[1]!(243)).toBe('Это один эпизод, а не конец пути. 243 чистых дня остаются с вами.');
  });

  it('подписи главного экрана', () => {
    expect(`${t.main.counterDays(42)} ${t.main.counterSuffix}`).toBe('дня с начала');
    expect(t.main.counterSince('3 марта')).toBe('с 3 марта');
    expect(t.main.counterA11y(209, '3 марта')).toBe('209 дней с начала, с 3 марта');
    expect(t.main.cleanLabel(243)).toBe('чистых дня всего');
    expect(t.main.sinceRelapseLabel(42, true)).toBe('чистых дня с последнего срыва');
    expect(t.main.sinceRelapseLabel(1, false)).toBe('чистый день без срывов');
  });

  it('итог месяца в календаре склоняется', () => {
    expect(t.calendar.monthTotal(0, 'alcohol')).toBe('срывов по алкоголю за месяц');
    expect(t.calendar.monthTotal(1, 'smoking')).toBe('срыв по курению за месяц');
    expect(t.calendar.monthTotal(2, 'alcohol')).toBe('срыва по алкоголю за месяц');
    expect(t.calendar.monthTotalA11y(2, 'alcohol')).toBe('2 срыва по алкоголю за месяц');
  });

  it('подпись вехи: чистые дни без срыва', () => {
    expect(t.milestone.days(40, 'alcohol')).toBe('дней без алкоголя');
    expect(t.milestone.days(5, 'smoking')).toBe('дней без курения');
  });

  it('текст поздравления меняется по рубежам месяца, трёх месяцев, полугода и года', () => {
    const tiers = [5, 30, 90, 180, 365].map((n) => t.milestone.text(n));
    expect(new Set(tiers).size).toBe(5);
    expect(t.milestone.text(25)).toBe(t.milestone.text(5));
    expect(t.milestone.text(85)).toBe(t.milestone.text(30));
    expect(t.milestone.text(175)).toBe(t.milestone.text(90));
    expect(t.milestone.text(360)).toBe(t.milestone.text(180));
    expect(t.milestone.text(730)).toBe(t.milestone.text(365));
  });
});

describe('календарный срок в годах, месяцах и днях', () => {
  it('полные годы и месяцы, остаток дней', () => {
    expect(calendarDiff('2023-05-20', '2026-10-08')).toEqual({ years: 3, months: 4, days: 18 });
    expect(calendarDiff('2026-03-03', '2026-09-28')).toEqual({ years: 0, months: 6, days: 25 });
    expect(calendarDiff('2026-08-10', '2026-09-28')).toEqual({ years: 0, months: 1, days: 18 });
    expect(calendarDiff('2026-10-01', '2026-10-08')).toEqual({ years: 0, months: 0, days: 7 });
    expect(calendarDiff('2026-10-08', '2026-10-08')).toEqual({ years: 0, months: 0, days: 0 });
  });

  it('ровно год и ровно месяц', () => {
    expect(calendarDiff('2025-10-08', '2026-10-08')).toEqual({ years: 1, months: 0, days: 0 });
    expect(calendarDiff('2026-09-08', '2026-10-08')).toEqual({ years: 0, months: 1, days: 0 });
  });

  it('31-е число и февраль: опорный день сдвигается на конец месяца', () => {
    expect(calendarDiff('2026-01-31', '2026-02-28')).toEqual({ years: 0, months: 0, days: 28 });
    expect(calendarDiff('2026-01-31', '2026-03-01')).toEqual({ years: 0, months: 1, days: 1 });
    expect(calendarDiff('2024-02-29', '2025-03-01')).toEqual({ years: 1, months: 0, days: 1 });
  });

  it('дата в будущем даёт нули', () => {
    expect(calendarDiff('2026-10-09', '2026-10-08')).toEqual({ years: 0, months: 0, days: 0 });
  });

  it('подпись срока: нулевые части опускаются, меньше месяца — пусто', () => {
    expect(t.main.period({ years: 3, months: 4, days: 18 })).toBe('3 года 4 месяца 18 дней');
    expect(t.main.period({ years: 1, months: 0, days: 1 })).toBe('1 год 1 день');
    expect(t.main.period({ years: 0, months: 6, days: 25 })).toBe('6 месяцев 25 дней');
    expect(t.main.period({ years: 5, months: 0, days: 0 })).toBe('5 лет');
    expect(t.main.period({ years: 0, months: 0, days: 7 })).toBe('');
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
  const h: Habit = { id: 'smoking', enabled: true, quitAt: '2026-09-01T00:00:00+03:00', milestonesEarned: [], celebratedSince: null, celebratedUpTo: 0 };
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
  const alcohol: Habit = { id: 'alcohol', enabled: true, quitAt: '2026-08-05T00:00:00+03:00', milestonesEarned: [], celebratedSince: null, celebratedUpTo: 0 };
  const smoking: Habit = { id: 'smoking', enabled: true, quitAt: '2026-08-10T00:00:00+03:00', milestonesEarned: [], celebratedSince: null, celebratedUpTo: 0 };
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
