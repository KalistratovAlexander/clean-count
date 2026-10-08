import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconButton } from '@/components/buttons';
import { CheckIcon, ChevronLeftIcon } from '@/components/icons';
import { SegmentedControl } from '@/components/SegmentedControl';
import { achievedMilestones, lastReachedMilestone, MILESTONE_STEP, tierMilestones } from '@/domain/milestones';
import { computeHabitStats } from '@/domain/stats';
import { useClock } from '@/hooks/clock';
import { useEnabledHabits } from '@/hooks/useEnabledHabits';
import { t } from '@/i18n';
import { useAppStore } from '@/store/appStore';
import { colors, fonts, habitColor, MAX_FONT_SCALE_NUMBERS, MAX_FONT_SCALE_TEXT, radii, spacing } from '@/theme';

const BADGE_COLUMNS = 5;
const BADGE_GAP = 8;

/** Достижения привычки: сводка, главные рубежи и сетка всех вех по 5 дней. */
export default function AchievementsScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const params = useLocalSearchParams<{ habit?: string }>();
  const habits = useEnabledHabits();
  const relapses = useAppStore((s) => s.relapses);
  const { today } = useClock();

  const initialIndex = Math.max(0, habits.findIndex((h) => h.id === params.habit));
  const [index, setIndex] = useState(initialIndex);
  const position = useSharedValue(initialIndex);
  const habit = habits[Math.min(index, habits.length - 1)];

  const stats = useMemo(() => (habit ? computeHabitStats(habit, relapses, today) : null), [habit, relapses, today]);
  const achieved = useMemo(
    () => (habit && stats ? achievedMilestones(habit.milestonesEarned, stats.daysSinceRelapse) : []),
    [habit, stats],
  );

  if (!habit || !stats) return <Redirect href="/main" />;

  const color = habitColor[habit.id];
  const best = achieved[achieved.length - 1] ?? 0;
  // Вехи текущей серии закрашены, заработанные в прошлых сериях — с обводкой.
  const currentTop = lastReachedMilestone(stats.daysSinceRelapse);
  const inStreak = currentTop / MILESTONE_STEP;
  const tiers = tierMilestones(best);
  const badges: number[] = [];
  for (let m = MILESTONE_STEP; m <= Math.max(best, stats.goal); m += MILESTONE_STEP) badges.push(m);
  // Ровная сетка: пять плиток в ряд одинаковой ширины независимо от числа цифр.
  const badgeWidth = Math.floor((width - spacing.screenX * 2 - BADGE_GAP * (BADGE_COLUMNS - 1)) / BADGE_COLUMNS);

  const select = (i: number) => {
    position.set(withTiming(i, { duration: 220 }));
    setIndex(i);
  };

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 28 }]}
    >
      <View style={styles.header}>
        <IconButton label={t.achievements.back} onPress={() => router.back()}>
          <ChevronLeftIcon color={colors.textPrimary} />
        </IconButton>
        <Text style={styles.title} accessibilityRole="header" maxFontSizeMultiplier={MAX_FONT_SCALE_TEXT}>
          {t.achievements.title}
        </Text>
      </View>

      {habits.length > 1 && (
        <SegmentedControl
          segments={habits.map((h) => ({ key: h.id, label: t.habit[h.id] }))}
          position={position}
          selectedIndex={index}
          onSelect={select}
        />
      )}

      <View style={[styles.summary, { backgroundColor: color }]} accessible>
        <Text style={styles.summaryCount} numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={MAX_FONT_SCALE_NUMBERS}>
          {achieved.length}
        </Text>
        <Text style={styles.summaryTitle} maxFontSizeMultiplier={MAX_FONT_SCALE_TEXT}>
          {achieved.length === 0 ? t.achievements.none : t.achievements.count(achieved.length).replace(/^\d+\s/, '')}
        </Text>
        {best > 0 && (
          <Text style={styles.summaryText} maxFontSizeMultiplier={MAX_FONT_SCALE_TEXT}>
            {t.achievements.last(best, habit.id)}
          </Text>
        )}
        {achieved.length > 0 && (
          <Text style={styles.summaryText} maxFontSizeMultiplier={MAX_FONT_SCALE_TEXT}>
            {t.achievements.inStreak(inStreak)}
          </Text>
        )}
        <Text style={styles.summaryText} maxFontSizeMultiplier={MAX_FONT_SCALE_TEXT}>
          {t.achievements.next(stats.goal, stats.goalRemaining)}
        </Text>
      </View>

      <Text style={styles.sectionTitle} accessibilityRole="header" maxFontSizeMultiplier={MAX_FONT_SCALE_TEXT}>
        {t.achievements.tiers}
      </Text>
      <View style={styles.card}>
        {tiers.map((days, i) => {
          const current = days <= currentTop;
          const reached = current || achieved.includes(days);
          const status = current
            ? t.achievements.reached
            : reached
              ? t.achievements.earlier
              : t.achievements.remaining(days - stats.daysSinceRelapse);
          return (
            <View
              key={days}
              style={[styles.tier, i > 0 && styles.tierBorder]}
              accessible
              accessibilityLabel={`${t.achievements.tierName(days)}, ${t.achievements.days(days)}, ${status}`}
            >
              <View
                style={[
                  styles.tierMark,
                  current ? { backgroundColor: color } : reached ? [styles.tierMarkOff, { borderColor: color }] : styles.tierMarkOff,
                ]}
              >
                {reached && <CheckIcon size={16} color={current ? colors.onAccent : color} />}
              </View>
              <View style={styles.tierText}>
                <Text style={[styles.tierName, !reached && styles.muted]} maxFontSizeMultiplier={MAX_FONT_SCALE_TEXT}>
                  {t.achievements.tierName(days)}
                </Text>
                <Text style={styles.tierDays} maxFontSizeMultiplier={MAX_FONT_SCALE_TEXT}>
                  {t.achievements.days(days)}
                </Text>
              </View>
              <Text style={[styles.tierStatus, current && { color }]} maxFontSizeMultiplier={MAX_FONT_SCALE_TEXT}>
                {status}
              </Text>
            </View>
          );
        })}
      </View>

      <Text style={styles.sectionTitle} accessibilityRole="header" maxFontSizeMultiplier={MAX_FONT_SCALE_TEXT}>
        {t.achievements.all}
      </Text>
      <View style={styles.badges}>
        {badges.map((m) => {
          const state = m <= currentTop ? 'current' : achieved.includes(m) ? 'earlier' : m === stats.goal ? 'goal' : 'locked';
          return (
            <View
              key={m}
              style={[
                styles.badge,
                { width: badgeWidth },
                state === 'current' && { backgroundColor: color, borderColor: color },
                state === 'earlier' && [styles.badgeOff, { borderColor: color }],
                state === 'goal' && [styles.badgeOff, styles.badgeGoal],
                state === 'locked' && styles.badgeOff,
              ]}
              accessible
              accessibilityLabel={t.achievements.badgeA11y(m, state)}
            >
              <Text
                style={[styles.badgeText, state === 'current' ? styles.badgeTextOn : state === 'locked' ? styles.muted : { color }]}
                maxFontSizeMultiplier={MAX_FONT_SCALE_NUMBERS}
              >
                {m}
              </Text>
            </View>
          );
        })}
      </View>

      <View style={styles.legend}>
        <LegendItem label={t.achievements.legendCurrent} fill={color} />
        <LegendItem label={t.achievements.legendEarlier} border={color} />
        <LegendItem label={t.achievements.legendGoal} border={colors.textPrimary} dashed />
      </View>

      <Text style={styles.hint} maxFontSizeMultiplier={MAX_FONT_SCALE_TEXT}>
        {t.achievements.hint}
      </Text>
    </ScrollView>
  );
}

function LegendItem({ label, fill, border, dashed }: { label: string; fill?: string; border?: string; dashed?: boolean }) {
  return (
    <View style={styles.legendItem}>
      <View
        style={[
          styles.legendSwatch,
          fill ? { backgroundColor: fill, borderColor: fill } : { borderColor: border, borderStyle: dashed ? 'dashed' : 'solid' },
        ]}
      />
      <Text style={styles.legendText} maxFontSizeMultiplier={MAX_FONT_SCALE_TEXT}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.screenX, gap: 14 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 2 },
  title: { fontFamily: fonts.display700, fontSize: 22, color: colors.textPrimary },
  summary: { borderRadius: radii.counter, paddingVertical: 24, paddingHorizontal: 24, gap: 6 },
  summaryCount: { color: colors.onAccent, fontFamily: fonts.display800, fontSize: 64, lineHeight: 68, includeFontPadding: false },
  summaryTitle: { color: colors.onAccent, fontFamily: fonts.display700, fontSize: 18 },
  summaryText: { color: colors.onAccent, opacity: 0.9, fontFamily: fonts.text400, fontSize: 15, lineHeight: 21 },
  sectionTitle: { fontFamily: fonts.text600, fontSize: 14, color: colors.textSecondary, marginTop: 6 },
  card: { backgroundColor: colors.surface, borderRadius: radii.card, paddingHorizontal: 16 },
  tier: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, minHeight: 56 },
  tierBorder: { borderTopWidth: 1, borderTopColor: colors.cardBorder },
  tierMark: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  tierMarkOff: { borderWidth: 2, borderColor: colors.border },
  tierText: { flex: 1, gap: 2 },
  tierName: { fontFamily: fonts.text600, fontSize: 16, color: colors.textPrimary },
  tierDays: { fontFamily: fonts.text400, fontSize: 13, color: colors.textSecondary },
  tierStatus: { fontFamily: fonts.text600, fontSize: 13, color: colors.textSecondary },
  muted: { color: colors.mutedText },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: BADGE_GAP },
  badge: {
    height: 40,
    borderRadius: radii.chip,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeOff: { backgroundColor: colors.surface, borderColor: colors.cardBorder },
  badgeGoal: { borderColor: colors.textPrimary, borderStyle: 'dashed' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 14, rowGap: 6 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendSwatch: { width: 14, height: 14, borderRadius: 4, borderWidth: 2 },
  legendText: { fontFamily: fonts.text400, fontSize: 12, color: colors.textSecondary },
  badgeText: { fontFamily: fonts.display700, fontSize: 15 },
  badgeTextOn: { color: colors.onAccent },
  hint: { fontFamily: fonts.text400, fontSize: 13, lineHeight: 18, color: colors.textSecondary, marginTop: 4 },
});
