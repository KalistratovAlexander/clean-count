import { useMemo } from 'react';

import { HABIT_IDS, type Habit } from '@/domain/types';
import { useAppStore } from '@/store/appStore';

/** Включённые и настроенные привычки в фиксированном порядке: алкоголь, курение. */
export function useEnabledHabits(): Habit[] {
  const habits = useAppStore((s) => s.habits);
  return useMemo(() => HABIT_IDS.map((id) => habits[id]).filter((h) => h.enabled && h.quitAt), [habits]);
}
