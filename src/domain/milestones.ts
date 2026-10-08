import type { Habit, LocalDate } from './types';

const YEAR = 365;

/**
 * Лестница вех по чистым дням с последнего срыва: сначала короткие шаги, чтобы поддержать
 * в первые недели, потом по месяцам, полгода, год, полтора, два, дальше каждый год.
 */
export const MILESTONES = [5, 10, 14, 21, 30, 45, 60, 90, 120, 180, 270, 365, 545, 730] as const;
const LAST_FIXED = MILESTONES[MILESTONES.length - 1]!;

/** Входит ли число в лестницу вех. */
export function isMilestone(m: number): boolean {
  return (MILESTONES as readonly number[]).includes(m) || (m > LAST_FIXED && m % YEAR === 0);
}

/** Ближайшая веха строго больше `days`. */
export function nextMilestone(days: number): number {
  const d = Math.max(0, days);
  const fixed = MILESTONES.find((m) => m > d);
  if (fixed !== undefined) return fixed;
  return (Math.floor(d / YEAR) + 1) * YEAR;
}

/** Все вехи, не превышающие `limit`, по возрастанию. */
export function milestonesUpTo(limit: number): number[] {
  const list: number[] = MILESTONES.filter((m) => m <= limit);
  for (let m = LAST_FIXED + YEAR; m <= limit; m += YEAR) list.push(m);
  return list;
}

/** Все вехи, которые уже достигнуты при `days` чистых днях, по возрастанию. */
export function reachedMilestones(days: number): number[] {
  return milestonesUpTo(Math.max(0, days));
}

/** Самая большая веха, достигнутая при `days` днях, или 0. */
export function lastReachedMilestone(days: number): number {
  const reached = reachedMilestones(days);
  return reached[reached.length - 1] ?? 0;
}

/**
 * Веха текущей серии, за которую ещё не поздравляли. Поздравления привязаны к серии:
 * в новой серии (после срыва) те же вехи поздравляются снова. Если не показанных
 * несколько (например, после настройки с прошедшей датой отказа), поздравляем только
 * с самой большой — остальные отмечаются вместе с ней.
 */
export function pendingMilestone(
  daysSinceRelapse: number,
  streakStart: LocalDate,
  celebrated: Pick<Habit, 'celebratedSince' | 'celebratedUpTo'>,
): number | null {
  const reached = lastReachedMilestone(daysSinceRelapse);
  const upTo = celebrated.celebratedSince === streakStart ? celebrated.celebratedUpTo : 0;
  return reached > upTo ? reached : null;
}

/**
 * Записи вех из прежних схем (1, 3, 7, 14, 30, … или каждые 5 дней) узнаём по значениям вне
 * лестницы и переводим на неё: заработанное значение означает, что все вехи до него пройдены.
 * Плюс вехи, достигнутые текущей серией. Возвращает null, если менять нечего.
 */
export function migrateLegacyMilestones(earned: readonly number[], daysSinceRelapse: number): number[] | null {
  if (!earned.some((m) => !isMilestone(m))) return null;
  const top = Math.max(0, ...earned);
  return achievedMilestones(milestonesUpTo(top), daysSinceRelapse);
}

/**
 * Достижения привычки: вехи, заработанные за всё время (они остаются навсегда, даже после срыва),
 * плюс вехи, достигнутые текущими чистыми днями. По возрастанию, без повторов.
 */
export function achievedMilestones(earned: readonly number[], daysSinceRelapse: number): number[] {
  const valid = earned.filter(isMilestone);
  return Array.from(new Set([...valid, ...reachedMilestones(daysSinceRelapse)])).sort((a, b) => a - b);
}

/** Главные рубежи: месяц, три месяца, полгода, год. Дальше — каждый год. */
const BASE_TIERS = [30, 90, 180, 365] as const;

/** Главные рубежи до первого ещё не достигнутого включительно (но не меньше четырёх базовых). */
export function tierMilestones(maxAchieved: number): number[] {
  const tiers: number[] = [...BASE_TIERS];
  while (tiers[tiers.length - 1]! <= maxAchieved) tiers.push(tiers[tiers.length - 1]! + YEAR);
  return tiers;
}

export interface GoalProgress {
  goal: number;
  remaining: number;
  /** 0…1 */
  progress: number;
}

export function goalProgress(days: number): GoalProgress {
  const goal = nextMilestone(days);
  return { goal, remaining: goal - days, progress: Math.min(1, Math.max(0, days / goal)) };
}
