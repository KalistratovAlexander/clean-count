import type { Habit, LocalDate } from './types';

/** Шаг между вехами в днях. */
export const MILESTONE_STEP = 5;

/** Ближайшая веха строго больше `days`: 5, 10, 15 и далее каждые 5 дней. */
export function nextMilestone(days: number): number {
  return (Math.floor(Math.max(0, days) / MILESTONE_STEP) + 1) * MILESTONE_STEP;
}

/** Все вехи, которые уже достигнуты при `days` днях, по возрастанию. */
export function reachedMilestones(days: number): number[] {
  const reached: number[] = [];
  for (let m = MILESTONE_STEP; m <= days; m += MILESTONE_STEP) reached.push(m);
  return reached;
}

/** Самая большая веха, достигнутая при `days` днях, или 0. */
export function lastReachedMilestone(days: number): number {
  return Math.floor(Math.max(0, days) / MILESTONE_STEP) * MILESTONE_STEP;
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
 * До 8 октября 2026 вехи шли по списку 1, 3, 7, 14, 30, …. Такие записи узнаём по
 * значениям, не кратным шагу, и заменяем на вехи, уже достигнутые по чистым дням
 * с последнего срыва, чтобы не поздравлять задним числом. Возвращает null, если менять нечего.
 */
export function migrateLegacyMilestones(earned: readonly number[], daysSinceRelapse: number): number[] | null {
  if (!earned.some((m) => m % MILESTONE_STEP !== 0)) return null;
  return reachedMilestones(daysSinceRelapse);
}

/**
 * Достижения привычки: вехи, заработанные за всё время (они остаются навсегда, даже после срыва),
 * плюс вехи, достигнутые текущими чистыми днями. По возрастанию, без повторов.
 */
export function achievedMilestones(earned: readonly number[], daysSinceRelapse: number): number[] {
  const valid = earned.filter((m) => m > 0 && m % MILESTONE_STEP === 0);
  return Array.from(new Set([...valid, ...reachedMilestones(daysSinceRelapse)])).sort((a, b) => a - b);
}

/** Главные рубежи: месяц, три месяца, полгода, год. Дальше — каждый год. */
const BASE_TIERS = [30, 90, 180, 365] as const;

/** Главные рубежи до первого ещё не достигнутого включительно (но не меньше четырёх базовых). */
export function tierMilestones(maxAchieved: number): number[] {
  const tiers: number[] = [...BASE_TIERS];
  while (tiers[tiers.length - 1]! <= maxAchieved) tiers.push(tiers[tiers.length - 1]! + 365);
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
