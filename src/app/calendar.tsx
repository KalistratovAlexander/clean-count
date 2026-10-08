import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconButton } from '@/components/buttons';
import { DayDetails } from '@/components/calendar/DayDetails';
import { MonthGrid } from '@/components/calendar/MonthGrid';
import { ChevronLeftIcon, ChevronRightIcon } from '@/components/icons';
import { useRelapseFlow } from '@/components/relapse/useRelapseFlow';
import { SegmentedControl } from '@/components/SegmentedControl';
import { buildMonth, monthRange, sameMonth, yearMonthOf, type CalendarFilter, type YearMonth } from '@/domain/calendar';
import { zonedDate } from '@/domain/localDate';
import type { HabitId, Relapse } from '@/domain/types';
import { useClock } from '@/hooks/clock';
import { useEnabledHabits } from '@/hooks/useEnabledHabits';
import { t } from '@/i18n';
import { formatMonthTitle } from '@/i18n/format';
import { useAppStore } from '@/store/appStore';
import { colors, fonts, habitColor, MAX_FONT_SCALE_NUMBERS, MAX_FONT_SCALE_TEXT, radii, spacing } from '@/theme';

export default function CalendarScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const params = useLocalSearchParams<{ filter?: string }>();
  const habits = useEnabledHabits();
  const allHabits = useAppStore((s) => s.habits);
  const relapses = useAppStore((s) => s.relapses);
  const removeRelapse = useAppStore((s) => s.removeRelapse);
  const { today } = useClock();
  const flow = useRelapseFlow(Math.max(insets.bottom, 16) + 8);

  const filters = useMemo<CalendarFilter[]>(
    () => (habits.length > 1 ? ['all', ...habits.map((h) => h.id)] : habits.map((h) => h.id)),
    [habits],
  );
  const initialFilter = filters.find((f) => f === params.filter) ?? filters[0] ?? 'all';
  const [filter, setFilter] = useState<CalendarFilter>(initialFilter);
  const filterPosition = useSharedValue(Math.max(0, filters.indexOf(initialFilter)));

  const habitList = useMemo(() => Object.values(allHabits), [allHabits]);
  const months = useMemo(() => monthRange(habitList, today), [habitList, today]);
  const [monthIndex, setMonthIndex] = useState(months.length - 1);
  const [selected, setSelected] = useState<string | null>(today);
  const list = useRef<FlatList<YearMonth>>(null);

  const pageWidth = width;
  const gridWidth = pageWidth - spacing.screenX * 2;
  const safeIndex = Math.min(Math.max(0, monthIndex), months.length - 1);
  const currentMonth = months[safeIndex]!;

  const model = useMemo(
    () => buildMonth(currentMonth, habitList, relapses, filter, today),
    [currentMonth, habitList, relapses, filter, today],
  );
  const selectedCell = selected ? (model.days.find((d) => d.date === selected) ?? null) : null;

  const changeMonth = (i: number) => {
    if (i === safeIndex || !months[i]) return;
    setMonthIndex(i);
    setSelected(sameMonth(months[i], yearMonthOf(today)) ? today : null);
  };

  const goToMonth = (i: number) => {
    const next = Math.min(Math.max(0, i), months.length - 1);
    list.current?.scrollToIndex({ index: next, animated: true });
    changeMonth(next);
  };

  const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    changeMonth(Math.round(e.nativeEvent.contentOffset.x / pageWidth));
  };

  const selectFilter = (i: number) => {
    const next = filters[i];
    if (!next) return;
    filterPosition.set(withTiming(i, { duration: 220 }));
    setFilter(next);
  };

  // Какие привычки можно записать на выбранный день: видимые в фильтре и с датой отказа не позже дня.
  const addable: HabitId[] = selectedCell && selectedCell.state !== 'inactive'
    ? habits
        .filter((h) => (filter === 'all' || filter === h.id) && zonedDate(h.quitAt!) <= selectedCell.date)
        .map((h) => h.id)
    : [];

  const addRelapse = () => {
    if (!selectedCell) return;
    if (addable.length === 1) {
      flow.open(addable[0]!, selectedCell.date);
      return;
    }
    Alert.alert(t.calendar.chooseHabit, undefined, [
      ...addable.map((id) => ({ text: t.habit[id], onPress: () => flow.open(id, selectedCell.date) })),
      { text: t.calendar.cancel, style: 'cancel' as const },
    ]);
  };

  const deleteRelapse = (r: Relapse) => {
    removeRelapse(r.id).catch(console.error);
  };

  const visibleHabits = habits.filter((h) => filter === 'all' || filter === h.id);

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 28 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.header, styles.padded]}>
          <IconButton label={t.calendar.back} onPress={() => router.back()}>
            <ChevronLeftIcon color={colors.textPrimary} />
          </IconButton>
          <Text style={styles.title} accessibilityRole="header" maxFontSizeMultiplier={MAX_FONT_SCALE_TEXT}>
            {t.calendar.title}
          </Text>
        </View>

        {filters.length > 1 && (
          <View style={styles.padded}>
            <SegmentedControl
              segments={filters.map((f) => ({ key: f, label: f === 'all' ? t.calendar.all : t.habit[f] }))}
              position={filterPosition}
              selectedIndex={filters.indexOf(filter)}
              onSelect={selectFilter}
              fontSize={14}
            />
          </View>
        )}

        <View style={[styles.monthHeader, styles.padded]}>
          <IconButton label={t.calendar.prevMonth} variant="plain" size={44} disabled={safeIndex === 0} onPress={() => goToMonth(safeIndex - 1)}>
            <ChevronLeftIcon size={20} color={colors.textPrimary} />
          </IconButton>
          <Text style={styles.monthTitle} accessibilityRole="header" accessibilityLiveRegion="polite" maxFontSizeMultiplier={MAX_FONT_SCALE_TEXT}>
            {formatMonthTitle(currentMonth)}
          </Text>
          <IconButton
            label={t.calendar.nextMonth}
            variant="plain"
            size={44}
            disabled={safeIndex === months.length - 1}
            onPress={() => goToMonth(safeIndex + 1)}
          >
            <ChevronRightIcon size={20} color={colors.textPrimary} />
          </IconButton>
        </View>

        <FlatList
          ref={list}
          data={months}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(m) => `${m.year}-${m.month}`}
          initialScrollIndex={months.length - 1}
          getItemLayout={(_, i) => ({ length: pageWidth, offset: pageWidth * i, index: i })}
          onMomentumScrollEnd={onMomentumEnd}
          extraData={[selected, filter, relapses, today]}
          windowSize={3}
          initialNumToRender={1}
          renderItem={({ item }) => (
            <View style={[styles.monthPage, { width: pageWidth }]}>
              <MonthGrid
                month={sameMonth(item, currentMonth) ? model : buildMonth(item, habitList, relapses, filter, today)}
                width={gridWidth}
                selected={selected}
                today={today}
                onSelect={setSelected}
              />
            </View>
          )}
        />

        <View style={[styles.legend, styles.padded]} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
          {visibleHabits.map((h) => (
            <LegendItem key={h.id} color={habitColor[h.id]} label={t.habit[h.id]} />
          ))}
          <LegendItem color={colors.surface} border label={t.calendar.legendClean} />
        </View>

        <View style={styles.padded}>
          <DayDetails
            cell={selectedCell}
            today={today}
            canAdd={addable.length > 0}
            onAdd={addRelapse}
            onDelete={deleteRelapse}
          />
        </View>

        <View style={[styles.totals, styles.padded]}>
          {visibleHabits.map((h) => (
            <View key={h.id} style={styles.total} accessible accessibilityLabel={t.calendar.monthTotalA11y(model.totals[h.id], h.id)}>
              <Text style={styles.totalValue} maxFontSizeMultiplier={MAX_FONT_SCALE_NUMBERS}>
                {model.totals[h.id]}
              </Text>
              <Text style={styles.totalLabel} maxFontSizeMultiplier={MAX_FONT_SCALE_TEXT}>
                {t.calendar.monthTotal(model.totals[h.id], h.id)}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {flow.elements}
    </View>
  );
}

function LegendItem({ color, label, border }: { color: string; label: string; border?: boolean }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendSwatch, { backgroundColor: color }, border && styles.legendBorder]} />
      <Text style={styles.legendText} maxFontSizeMultiplier={MAX_FONT_SCALE_TEXT}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { gap: 16 },
  padded: { paddingHorizontal: spacing.screenX },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: { fontFamily: fonts.display700, fontSize: 22, color: colors.textPrimary },
  monthHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  monthTitle: { fontFamily: fonts.display700, fontSize: 17, color: colors.textPrimary },
  monthPage: { paddingHorizontal: spacing.screenX },
  legend: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 16, rowGap: 6 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendSwatch: { width: 12, height: 12, borderRadius: 4 },
  legendBorder: { borderWidth: 1, borderColor: colors.border },
  legendText: { fontFamily: fonts.text400, fontSize: 12, color: colors.textSecondary },
  totals: { flexDirection: 'row', gap: 10 },
  total: { flex: 1, backgroundColor: colors.relapseBg, borderRadius: radii.tile, paddingVertical: 12, paddingHorizontal: 14, gap: 2 },
  totalValue: { fontFamily: fonts.display700, fontSize: 22, color: colors.textPrimary },
  totalLabel: { fontFamily: fonts.text400, fontSize: 12, color: colors.textSecondary },
});
