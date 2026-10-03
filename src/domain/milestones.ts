const BASE_MILESTONES = [1, 3, 7, 14, 30, 60, 90, 180, 365] as const;
const YEAR = 365;

/** Ближайшая веха строго больше `days`: 1, 3, 7, 14, 30, 60, 90, 180, 365, далее каждые 365. */
export function nextMilestone(days: number): number {
  const base = BASE_MILESTONES.find((m) => m > days);
  if (base !== undefined) return base;
  return (Math.floor(days / YEAR) + 1) * YEAR;
}

/** Все вехи, которые уже достигнуты при серии `days`, по возрастанию. */
export function reachedMilestones(days: number): number[] {
  const reached: number[] = BASE_MILESTONES.filter((m) => m <= days);
  for (let m = 2 * YEAR; m <= days; m += YEAR) reached.push(m);
  return reached;
}

/**
 * Веха, за которую ещё не поздравляли. Если таких несколько (например, после
 * настройки с прошедшей датой отказа), поздравляем только с самой большой —
 * остальные отмечаются вместе с ней.
 */
export function pendingMilestone(days: number, shown: readonly number[]): number | null {
  const fresh = reachedMilestones(days).filter((m) => !shown.includes(m));
  return fresh.length ? fresh[fresh.length - 1]! : null;
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
