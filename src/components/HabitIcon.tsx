import type { Habit } from '@/domain/types';

import { CustomHabitIcon, GlassIcon, SmokingKindIcon } from './icons';

/** Значок привычки: нарисованная иконка у встроенных, выбранный значок у своих. */
export function HabitIcon({ habit, size = 28, color }: { habit: Habit; size?: number; color: string }) {
  if (habit.preset === 'alcohol') return <GlassIcon size={size} color={color} />;
  if (habit.preset === 'smoking') return <SmokingKindIcon kind="cigarette" size={size} color={color} />;
  return <CustomHabitIcon icon={habit.icon} size={size} color={color} />;
}
