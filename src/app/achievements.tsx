import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { ScrollView, Text, useWindowDimensions, View } from 'react-native';
import PagerView from 'react-native-pager-view';
import { useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconButton } from '@/components/buttons';
import { HabitTabs } from '@/components/HabitTabs';
import { CheckIcon, ChevronLeftIcon } from '@/components/icons';
import { achievedMilestones, lastReachedMilestone, milestonesUpTo, reachedMilestones, tierMilestones } from '@/domain/milestones';
import { computeHabitStats } from '@/domain/stats';
import type { Habit, LocalDate, Relapse } from '@/domain/types';
import { useClock } from '@/hooks/clock';
import { useEnabledHabits } from '@/hooks/useEnabledHabits';
import { useLanguage } from '@/hooks/useLanguage';
import { t } from '@/i18n';
import { habitName } from '@/i18n/habits';
import { useAppStore } from '@/store/appStore';
import { colors, createStyles, fonts, MAX_FONT_SCALE_NUMBERS, MAX_FONT_SCALE_TEXT, radii, s, spacing } from '@/theme';

const BADGE_COLUMNS = 5;
const BADGE_GAP = 8;

/** Достижения: по странице на привычку, листаются свайпом и переключателем, как главный экран. */
export default function AchievementsScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ habit?: string }>();
  const habits = useEnabledHabits();
  const relapses = useAppStore((s) => s.relapses);
  const { today } = useClock();
  useLanguage();

  const initialIndex = Math.max(0, habits.findIndex((h) => h.id === params.habit));
  const [index, setIndex] = useState(initialIndex);
  const position = useSharedValue(initialIndex);
  const pager = useRef<PagerView>(null);

  // Набор привычек поменялся — пейджер пересоздаётся, индекс берём заново.
  const habitsKey = habits.map((h) => h.id).join();
  const [prevKey, setPrevKey] = useState(habitsKey);
  if (prevKey !== habitsKey) {
    setPrevKey(habitsKey);
    setIndex(initialIndex);
    position.set(initialIndex);
  }

  const select = useCallback((i: number) => setIndex(i), []);

  if (habits.length === 0) return <Redirect href="/main" />;

  const bottom = insets.bottom + s(28);
  const pages = habits.map((habit) => (
    <View key={habit.id} testID={`achievements-${habit.id}`} style={styles.page}>
      <AchievementsPage habit={habit} relapses={relapses} today={today} paddingBottom={bottom} />
    </View>
  ));

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + s(12) }]}>
        <IconButton label={t.achievements.back} onPress={() => router.back()}>
          <ChevronLeftIcon color={colors.textPrimary} />
        </IconButton>
        <Text style={styles.title} accessibilityRole="header" maxFontSizeMultiplier={MAX_FONT_SCALE_TEXT}>
          {t.achievements.title}
        </Text>
      </View>

      {habits.length > 1 && (
        <View style={styles.tabsRow}>
          <HabitTabs
            tabs={habits.map((h) => ({ key: h.id, label: habitName(h), color: h.color }))}
            position={position}
            selectedIndex={index}
            onSelect={(i) => pager.current?.setPage(i)}
          />
        </View>
      )}

      {habits.length > 1 ? (
        <PagerView
          key={habitsKey}
          ref={pager}
          style={styles.pager}
          initialPage={initialIndex}
          onPageScroll={(e) => {
            position.set(e.nativeEvent.position + e.nativeEvent.offset);
          }}
          onPageSelected={(e) => select(e.nativeEvent.position)}
        >
          {pages}
        </PagerView>
      ) : (
        <View style={styles.pager}>{pages[0]}</View>
      )}
    </View>
  );
}

function AchievementsPage({
  habit,
  relapses,
  today,
  paddingBottom,
}: {
  habit: Habit;
  relapses: Relapse[];
  today: LocalDate;
  paddingBottom: number;
}) {
  const { width } = useWindowDimensions();
  const stats = useMemo(() => computeHabitStats(habit, relapses, today), [habit, relapses, today]);
  const achieved = useMemo(() => achievedMilestones(habit.milestonesEarned, stats.daysSinceRelapse), [habit, stats]);

  const color = habit.color;
  const best = achieved[achieved.length - 1] ?? 0;
  // Вехи текущей серии закрашены, заработанные в прошлых сериях — с обводкой.
  const currentTop = lastReachedMilestone(stats.daysSinceRelapse);
  const inStreak = reachedMilestones(stats.daysSinceRelapse).length;
  const tiers = tierMilestones(best);
  // В сетке только текущая серия и ближайшая цель; вехи прошлых серий свёрнуты в одну строку,
  // иначе за годы сетка превращается в стену из сотен чисел.
  const badges = milestonesUpTo(stats.goal);
  const earlierCount = achieved.filter((m) => m > currentTop).length;
  // Ровная сетка: пять плиток в ряд одинаковой ширины независимо от числа цифр.
  const badgeWidth = Math.floor((width - s(spacing.screenX) * 2 - s(BADGE_GAP) * (BADGE_COLUMNS - 1)) / BADGE_COLUMNS);

  return (
    <ScrollView contentContainerStyle={[styles.content, { paddingBottom }]} showsVerticalScrollIndicator={false}>
      <View style={[styles.summary, { backgroundColor: color }]} accessible>
        <Text style={styles.summaryCount} numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={MAX_FONT_SCALE_NUMBERS}>
          {achieved.length}
        </Text>
        <Text style={styles.summaryTitle} maxFontSizeMultiplier={MAX_FONT_SCALE_TEXT}>
          {achieved.length === 0 ? t.achievements.none : t.achievements.count(achieved.length).replace(/^\d+\s/, '')}
        </Text>
        {best > 0 && (
          <Text style={styles.summaryText} maxFontSizeMultiplier={MAX_FONT_SCALE_TEXT}>
            {t.achievements.last(best, habit)}
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
          const state = m <= currentTop ? 'current' : 'goal';
          return (
            <View
              key={m}
              style={[
                styles.badge,
                { width: badgeWidth },
                state === 'current' ? { backgroundColor: color, borderColor: color } : [styles.badgeOff, styles.badgeGoal],
              ]}
              accessible
              accessibilityLabel={t.achievements.badgeA11y(m, state)}
            >
              <Text style={[styles.badgeText, state === 'current' ? styles.badgeTextOn : { color }]} maxFontSizeMultiplier={MAX_FONT_SCALE_NUMBERS}>
                {m}
              </Text>
            </View>
          );
        })}
      </View>
      {earlierCount > 0 && (
        <Text style={styles.earlier} maxFontSizeMultiplier={MAX_FONT_SCALE_TEXT}>
          {t.achievements.earlierCount(earlierCount)}
        </Text>
      )}

      <View style={styles.legend}>
        <LegendItem label={t.achievements.legendCurrent} fill={color} />
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

const styles = createStyles({
  root: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: spacing.screenX, paddingBottom: 8 },
  title: { fontFamily: fonts.display700, fontSize: 22, color: colors.textPrimary },
  tabsRow: { paddingHorizontal: spacing.screenX, paddingBottom: 6 },
  pager: { flex: 1 },
  page: { flex: 1 },
  content: { paddingHorizontal: spacing.screenX, paddingTop: 6, gap: 14 },
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
  earlier: { fontFamily: fonts.text500, fontSize: 14, color: colors.textSecondary, marginTop: -4 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 14, rowGap: 6 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendSwatch: { width: 14, height: 14, borderRadius: 4, borderWidth: 2 },
  legendText: { fontFamily: fonts.text400, fontSize: 12, color: colors.textSecondary },
  badgeText: { fontFamily: fonts.display700, fontSize: 15 },
  badgeTextOn: { color: colors.onAccent },
  hint: { fontFamily: fonts.text400, fontSize: 13, lineHeight: 18, color: colors.textSecondary, marginTop: 4 },
});
