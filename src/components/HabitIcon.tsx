import { Text } from 'react-native';

import { firstGrapheme } from '@/domain/habits';
import type { Habit } from '@/domain/types';
import { createStyles, fonts, s } from '@/theme';

import { GlassIcon, SmokingKindIcon } from './icons';

/** Значок привычки: нарисованная иконка у встроенных, первая буква названия у своих. */
export function HabitIcon({ habit, size = 28, color }: { habit: Habit; size?: number; color: string }) {
  if (habit.preset === 'alcohol') return <GlassIcon size={size} color={color} />;
  if (habit.preset === 'smoking') return <SmokingKindIcon kind="cigarette" size={size} color={color} />;
  const px = s(size);
  return (
    <Text style={[styles.letter, { fontSize: px * 0.72, lineHeight: px * 1.05, color }]} allowFontScaling={false}>
      {firstGrapheme(habit.name).toUpperCase() || '•'}
    </Text>
  );
}

const styles = createStyles({
  letter: { fontFamily: fonts.display700, textAlign: 'center' },
});
