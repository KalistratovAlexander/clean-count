import { useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { localDateAt } from '@/domain/localDate';
import type { HabitStats } from '@/domain/stats';
import { KINDS_BY_HABIT, type HabitId, type LocalDate } from '@/domain/types';
import { t } from '@/i18n';
import { formatDayMonth } from '@/i18n/format';
import { colors, fonts, habitColor, MAX_FONT_SCALE_NUMBERS, MAX_FONT_SCALE_TEXT, radii } from '@/theme';

interface CardProps {
  habitId: HabitId;
  stats: HabitStats;
  today: LocalDate;
  tz: string;
}

export function CounterCard({ habitId, stats, today, tz }: CardProps) {
  const { streak } = stats;
  const since = formatDayMonth(localDateAt(streak.start, tz), today);
  const [daysWord, inRow] = t.main.daysInRow(streak.days);

  const progress = useSharedValue(stats.goalProgress);
  useEffect(() => {
    progress.set(withTiming(stats.goalProgress, { duration: 500 }));
  }, [progress, stats.goalProgress]);
  const barStyle = useAnimatedStyle(() => ({ width: `${progress.get() * 100}%` }));

  return (
    <View style={[styles.counter, { backgroundColor: habitColor[habitId] }]}>
      <Text style={styles.counterLabel} maxFontSizeMultiplier={MAX_FONT_SCALE_TEXT}>
        {t.habitWithout[habitId]}
      </Text>

      <View
        style={styles.streakRow}
        accessible
        accessibilityRole="text"
        accessibilityLabel={t.main.streakA11y(streak.days, streak.hours, streak.minutes, since)}
      >
        <Text
          style={styles.streakNumber}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.4}
          maxFontSizeMultiplier={1}
        >
          {streak.days}
        </Text>
        <Text style={styles.streakWord} maxFontSizeMultiplier={MAX_FONT_SCALE_NUMBERS}>
          {daysWord}
          {'\n'}
          {inRow}
        </Text>
      </View>

      <Text style={styles.counterDetails} maxFontSizeMultiplier={MAX_FONT_SCALE_TEXT} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        {t.main.streakDetails(streak.hours, streak.minutes, since)}
      </Text>

      <View
        style={styles.goal}
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={t.main.goalA11y(stats.goal, stats.goalRemaining)}
        accessibilityValue={{ min: 0, max: stats.goal, now: streak.days }}
      >
        <View style={styles.track}>
          <Animated.View style={[styles.bar, barStyle]} />
        </View>
        <View style={styles.goalRow}>
          <Text style={styles.goalText} maxFontSizeMultiplier={MAX_FONT_SCALE_TEXT}>
            {t.main.goal(stats.goal)}
          </Text>
          <Text style={styles.goalText} maxFontSizeMultiplier={MAX_FONT_SCALE_TEXT}>
            {t.main.goalRemaining(stats.goalRemaining)}
          </Text>
        </View>
      </View>
    </View>
  );
}

export function StatCards({ habitId, stats, today }: Omit<CardProps, 'tz'>) {
  return (
    <View style={styles.statsRow}>
      <View style={styles.statCard} accessible accessibilityLabel={`${stats.totalDays} ${t.main.totalLabel(stats.totalDays, formatDayMonth(stats.quitDate, today))}`}>
        <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={MAX_FONT_SCALE_NUMBERS}>
          {stats.totalDays}
        </Text>
        <Text style={styles.statLabel} maxFontSizeMultiplier={MAX_FONT_SCALE_TEXT}>
          {t.main.totalLabel(stats.totalDays, formatDayMonth(stats.quitDate, today))}
        </Text>
      </View>
      <View style={styles.statCard} accessible accessibilityLabel={`${stats.cleanDays} ${t.main.cleanLabel(stats.cleanDays)}`}>
        <Text
          style={[styles.statValue, { color: habitColor[habitId] }]}
          numberOfLines={1}
          adjustsFontSizeToFit
          maxFontSizeMultiplier={MAX_FONT_SCALE_NUMBERS}
        >
          {stats.cleanDays}
        </Text>
        <Text style={styles.statLabel} maxFontSizeMultiplier={MAX_FONT_SCALE_TEXT}>
          {t.main.cleanLabel(stats.cleanDays)}
        </Text>
      </View>
    </View>
  );
}

export function RelapsesCard({ habitId, stats }: Pick<CardProps, 'habitId' | 'stats'>) {
  const kinds = KINDS_BY_HABIT[habitId];
  // Для алкоголя показываем оба вида всегда, для курения — только встречавшиеся.
  const chips = habitId === 'alcohol' ? kinds : kinds.filter((k) => (stats.relapsesByKind[k] ?? 0) > 0);

  const scale = useSharedValue(1);
  const previous = useRef(stats.relapseCount);
  useEffect(() => {
    if (stats.relapseCount > previous.current) {
      scale.set(withSequence(withTiming(1.35, { duration: 160 }), withSpring(1, { damping: 8, stiffness: 180 })));
    }
    previous.current = stats.relapseCount;
  }, [scale, stats.relapseCount]);
  const numberStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));

  const empty = stats.relapseCount === 0;
  const a11y = empty
    ? t.main.noRelapses
    : `${t.main.relapses}: ${stats.relapseCount}. ${chips.map((k) => t.main.relapseChip(t.kind[k], stats.relapsesByKind[k] ?? 0)).join(', ')}`;

  return (
    <View style={styles.relapses} accessible accessibilityLabel={a11y}>
      <View style={styles.relapsesBody}>
        <Text style={styles.relapsesTitle} maxFontSizeMultiplier={MAX_FONT_SCALE_TEXT}>
          {empty ? t.main.noRelapses : t.main.relapses}
        </Text>
        {!empty && (
          <View style={styles.chips}>
            {chips.map((k) => (
              <View key={k} style={styles.chip}>
                <Text style={styles.chipText} maxFontSizeMultiplier={MAX_FONT_SCALE_TEXT}>
                  {t.main.relapseChip(t.kind[k], stats.relapsesByKind[k] ?? 0)}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
      {!empty && (
        <Animated.Text style={[styles.relapsesCount, numberStyle]} maxFontSizeMultiplier={MAX_FONT_SCALE_NUMBERS}>
          {stats.relapseCount}
        </Animated.Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  counter: {
    borderRadius: radii.counter,
    paddingTop: 28,
    paddingHorizontal: 24,
    paddingBottom: 24,
    gap: 14,
  },
  counterLabel: { color: colors.onAccent, opacity: 0.9, fontFamily: fonts.text500, fontSize: 15 },
  streakRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 12 },
  streakNumber: {
    flexShrink: 1,
    color: colors.onAccent,
    fontFamily: fonts.display800,
    fontSize: 112,
    lineHeight: 112,
    letterSpacing: -4.5,
    includeFontPadding: false,
  },
  streakWord: {
    color: colors.onAccent,
    fontFamily: fonts.display700,
    fontSize: 22,
    lineHeight: 24,
    paddingBottom: 12,
  },
  counterDetails: { color: colors.onAccent, opacity: 0.9, fontFamily: fonts.text400, fontSize: 15 },
  goal: { gap: 8, paddingTop: 6 },
  track: { height: 10, borderRadius: 5, backgroundColor: colors.progressTrack, overflow: 'hidden' },
  bar: { height: 10, borderRadius: 5, backgroundColor: colors.onAccent },
  goalRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  goalText: { color: colors.onAccent, fontFamily: fonts.text600, fontSize: 13 },

  statsRow: { flexDirection: 'row', gap: 12 },
  statCard: { flex: 1, backgroundColor: colors.surface, borderRadius: radii.card, padding: 18, gap: 6 },
  statValue: { color: colors.textPrimary, fontFamily: fonts.display700, fontSize: 30 },
  statLabel: { color: colors.textSecondary, fontFamily: fonts.text400, fontSize: 13, lineHeight: 17 },

  relapses: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    backgroundColor: colors.relapseBg,
    borderRadius: radii.card,
    padding: 18,
  },
  relapsesBody: { flex: 1, gap: 8 },
  relapsesTitle: { color: colors.textPrimary, fontFamily: fonts.text600, fontSize: 15 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { backgroundColor: colors.surface, borderRadius: radii.chip, paddingVertical: 5, paddingHorizontal: 10 },
  chipText: { color: colors.textPrimary, fontFamily: fonts.text600, fontSize: 13 },
  relapsesCount: { color: colors.relapseText, fontFamily: fonts.display800, fontSize: 40 },
});
