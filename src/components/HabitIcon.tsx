import { StyleSheet, Text } from 'react-native';

import type { Habit } from '@/domain/types';

import { GlassIcon, SmokingKindIcon } from './icons';

/** Значок привычки: нарисованная иконка у встроенных, эмодзи у своих. */
export function HabitIcon({ habit, size = 28, color }: { habit: Habit; size?: number; color: string }) {
  if (habit.preset === 'alcohol') return <GlassIcon size={size} color={color} />;
  if (habit.preset === 'smoking') return <SmokingKindIcon kind="cigarette" size={size} color={color} />;
  return (
    <Text style={[styles.emoji, { fontSize: size * 0.86, lineHeight: size * 1.15 }]} allowFontScaling={false}>
      {habit.emoji ?? '•'}
    </Text>
  );
}

const styles = StyleSheet.create({
  emoji: { textAlign: 'center' },
});
