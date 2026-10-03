import { addDays, diffDays, fromParts, localDateAt, startOfLocalDay, toParts, zonedDate, zonedInstant } from './localDate';
import { goalProgress } from './milestones';
import { instantFromWallClock, wallClock } from './tz';
import type { Habit, LocalDate, Relapse, RelapseKind } from './types';

export interface Streak {
  start: Date;
  days: number;
  hours: number;
  minutes: number;
}

export interface HabitStats {
  quitDate: LocalDate;
  streak: Streak;
  /** Общий счёт: календарные дни от даты отказа до сегодня. */
  totalDays: number;
  /** Общий счёт минус завершённые дни, в которые был срыв. */
  cleanDays: number;
  relapseCount: number;
  relapsesByKind: Partial<Record<RelapseKind, number>>;
  goal: number;
  goalRemaining: number;
  goalProgress: number;
}

/** Срывы привычки, которые учитываются: не раньше даты отказа. */
export function countedRelapses(habit: Habit, relapses: readonly Relapse[]): Relapse[] {
  if (!habit.quitAt) return [];
  const quitDate = zonedDate(habit.quitAt);
  return relapses.filter((r) => r.habitId === habit.id && r.date >= quitDate);
}

/** Записан ли срыв в тот же день, к которому относится (а не задним числом). */
export function isRecordedSameDay(relapse: Relapse): boolean {
  return zonedDate(relapse.createdAt) === relapse.date;
}

/**
 * Начало текущей серии. Срыв, записанный в свой же день, обнуляет серию с момента
 * записи; записанный задним числом — с 00:00 следующего дня. Берём самый поздний
 * из кандидатов, поэтому порядок записи срывов не важен.
 */
export function streakStart(habit: Habit, relapses: readonly Relapse[], tz: string): Date {
  if (!habit.quitAt) throw new Error(`Habit ${habit.id} has no quit date`);
  let start = zonedInstant(habit.quitAt).getTime();
  for (const r of countedRelapses(habit, relapses)) {
    const candidate = isRecordedSameDay(r)
      ? zonedInstant(r.createdAt).getTime()
      : startOfLocalDay(addDays(r.date, 1), tz).getTime();
    if (candidate > start) start = candidate;
  }
  return new Date(start);
}

/**
 * Полные календарные дни плюс часы и минуты. День считается по настенным часам
 * пояса, поэтому сутки с переводом часов (23 или 25 часов) — это ровно один день.
 */
export function streakDuration(start: Date, now: Date, tz: string): Omit<Streak, 'start'> {
  if (now.getTime() <= start.getTime()) return { days: 0, hours: 0, minutes: 0 };
  const from = wallClock(start, tz);
  const to = wallClock(now, tz);
  const timeOfDay = (c: typeof from) => (c.hour * 60 + c.minute) * 60 + c.second;
  let days = diffDays(fromParts(to), fromParts(from));
  if (timeOfDay(to) < timeOfDay(from)) days -= 1;
  const anchorDate = addDays(fromParts(from), days);
  const anchor = instantFromWallClock({ ...toParts(anchorDate), hour: from.hour, minute: from.minute, second: from.second }, tz);
  const restMinutes = Math.max(0, Math.floor((now.getTime() - anchor.getTime()) / 60_000));
  return { days: Math.max(0, days), hours: Math.floor(restMinutes / 60), minutes: restMinutes % 60 };
}

export function computeHabitStats(habit: Habit, relapses: readonly Relapse[], now: Date, tz: string): HabitStats {
  if (!habit.quitAt) throw new Error(`Habit ${habit.id} has no quit date`);
  const quitDate = zonedDate(habit.quitAt);
  const today = localDateAt(now, tz);
  const counted = countedRelapses(habit, relapses);

  const start = streakStart(habit, relapses, tz);
  const streak = { start, ...streakDuration(start, now, tz) };

  const totalDays = Math.max(0, diffDays(today, quitDate));
  // Сегодняшний день ещё не завершён: он не входит ни в общий счёт, ни в «грязные» дни.
  const dirtyDays = new Set(counted.filter((r) => r.date < today).map((r) => r.date)).size;
  const cleanDays = Math.max(0, totalDays - dirtyDays);

  const relapsesByKind: Partial<Record<RelapseKind, number>> = {};
  for (const r of counted) relapsesByKind[r.kind] = (relapsesByKind[r.kind] ?? 0) + 1;

  const goal = goalProgress(streak.days);

  return {
    quitDate,
    streak,
    totalDays,
    cleanDays,
    relapseCount: counted.length,
    relapsesByKind,
    goal: goal.goal,
    goalRemaining: goal.remaining,
    goalProgress: goal.progress,
  };
}
