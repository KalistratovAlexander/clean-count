import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { isBackupExclusionAvailable } from '../../modules/backup-exclusion';

import { IconButton } from '@/components/buttons';
import { pick } from '@/components/DatePicker';
import { ChevronLeftIcon, ChevronRightIcon } from '@/components/icons';
import { localDateTime, toZoned, zonedDate, zonedMinutes } from '@/domain/localDate';
import { HABIT_IDS, type Habit, type HabitId } from '@/domain/types';
import { readNow } from '@/hooks/clock';
import { t } from '@/i18n';
import { formatFullDate, formatTime } from '@/i18n/format';
import { useAppStore } from '@/store/appStore';
import { colors, fieldRow, fonts, habitColor, MAX_FONT_SCALE_TEXT, radii, spacing } from '@/theme';

function confirm(title: string, message: string, action: string, destructive = false): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: t.settings.cancel, style: 'cancel', onPress: () => resolve(false) },
        { text: action, style: destructive ? 'destructive' : 'default', onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}

const showError = (e: unknown) => {
  console.error(e);
  Alert.alert(t.errors.title, t.sheet.saveError);
};

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const habits = useAppStore((s) => s.habits);
  const excludeFromBackup = useAppStore((s) => s.settings.excludeFromBackup);
  const setHabitEnabled = useAppStore((s) => s.setHabitEnabled);
  const setQuitAt = useAppStore((s) => s.setQuitAt);
  const setExcludeFromBackup = useAppStore((s) => s.setExcludeFromBackup);
  const resetAll = useAppStore((s) => s.resetAll);
  const [busy, setBusy] = useState(false);

  const enabledCount = HABIT_IDS.filter((id) => habits[id].enabled && habits[id].quitAt).length;

  const toggleHabit = async (habit: Habit, enabled: boolean) => {
    if (!enabled && enabledCount <= 1) {
      Alert.alert(t.settings.lastHabitTitle, t.settings.lastHabitText);
      return;
    }
    try {
      if (enabled && !habit.quitAt) {
        // Привычка включается впервые — сразу спрашиваем дату отказа.
        const { today, tz } = readNow();
        const date = await pick({ mode: 'date', value: today, max: today });
        if (!date) return;
        await setHabitEnabled(habit.id, true, toZoned(localDateTime(date, 0, tz), tz));
        return;
      }
      await setHabitEnabled(habit.id, enabled);
    } catch (e) {
      showError(e);
    }
  };

  const changeQuit = async (habit: Habit, part: 'date' | 'time') => {
    if (!habit.quitAt) return;
    const { today, tz } = readNow();
    const currentDate = zonedDate(habit.quitAt);
    const currentMinutes = zonedMinutes(habit.quitAt);
    let date = currentDate;
    let minutes = currentMinutes;
    if (part === 'date') {
      const picked = await pick({ mode: 'date', value: currentDate, max: today });
      if (!picked || picked === currentDate) return;
      date = picked;
    } else {
      const picked = await pick({ mode: 'time', value: currentMinutes });
      if (picked == null || picked === currentMinutes) return;
      minutes = picked;
    }
    const ok = await confirm(t.settings.changeDateTitle, t.settings.changeDateText, t.settings.change);
    if (!ok) return;
    try {
      await setQuitAt(habit.id, toZoned(localDateTime(date, minutes, tz), tz));
    } catch (e) {
      showError(e);
    }
  };

  const toggleBackup = async (value: boolean) => {
    setBusy(true);
    try {
      await setExcludeFromBackup(value);
    } catch (e) {
      showError(e);
    } finally {
      setBusy(false);
    }
  };

  const reset = async () => {
    if (!(await confirm(t.settings.resetTitle, t.settings.resetText, t.settings.continue, true))) return;
    if (!(await confirm(t.settings.resetConfirmTitle, t.settings.resetConfirmText, t.settings.resetConfirm, true))) return;
    try {
      await resetAll();
      router.dismissAll();
      router.replace('/onboarding');
    } catch (e) {
      showError(e);
    }
  };

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 28 }]}
    >
      <View style={styles.header}>
        <IconButton label={t.settings.back} onPress={() => router.back()}>
          <ChevronLeftIcon color={colors.textPrimary} />
        </IconButton>
        <Text style={styles.title} accessibilityRole="header" maxFontSizeMultiplier={MAX_FONT_SCALE_TEXT}>
          {t.settings.title}
        </Text>
      </View>

      <Text style={styles.sectionTitle} accessibilityRole="header" maxFontSizeMultiplier={MAX_FONT_SCALE_TEXT}>
        {t.settings.habits}
      </Text>
      {HABIT_IDS.map((id: HabitId) => {
        const habit = habits[id];
        const on = habit.enabled && !!habit.quitAt;
        return (
          <View key={id} style={styles.card}>
            <View style={styles.row}>
              <View style={[styles.swatch, { backgroundColor: habitColor[id] }]} />
              <Text style={styles.rowTitle} maxFontSizeMultiplier={MAX_FONT_SCALE_TEXT}>
                {t.habit[id]}
              </Text>
              <Switch
                value={on}
                onValueChange={(v) => toggleHabit(habit, v)}
                trackColor={{ true: habitColor[id], false: colors.border }}
                thumbColor={colors.surface}
                ios_backgroundColor={colors.border}
                accessibilityLabel={`${t.settings.enabled}: ${t.habit[id]}`}
              />
            </View>
            {habit.quitAt && (
              <>
                <SettingRow
                  label={t.settings.quitDate}
                  value={formatFullDate(zonedDate(habit.quitAt))}
                  onPress={() => changeQuit(habit, 'date')}
                />
                <SettingRow
                  label={t.onboarding.quitTime}
                  value={formatTime(zonedMinutes(habit.quitAt))}
                  onPress={() => changeQuit(habit, 'time')}
                />
              </>
            )}
          </View>
        );
      })}

      <Text style={styles.sectionTitle} accessibilityRole="header" maxFontSizeMultiplier={MAX_FONT_SCALE_TEXT}>
        {t.settings.privacy}
      </Text>
      <View style={styles.card}>
        <Text style={styles.muted} maxFontSizeMultiplier={MAX_FONT_SCALE_TEXT}>
          {t.settings.privacyText}
        </Text>
        <View style={styles.row}>
          <Text style={styles.rowTitle} maxFontSizeMultiplier={MAX_FONT_SCALE_TEXT}>
            {t.settings.excludeBackup}
          </Text>
          <Switch
            value={excludeFromBackup}
            disabled={!isBackupExclusionAvailable || busy}
            onValueChange={toggleBackup}
            trackColor={{ true: colors.textPrimary, false: colors.border }}
            thumbColor={colors.surface}
            ios_backgroundColor={colors.border}
            accessibilityLabel={t.settings.excludeBackup}
          />
        </View>
        <Text style={styles.hint} maxFontSizeMultiplier={MAX_FONT_SCALE_TEXT}>
          {isBackupExclusionAvailable ? t.settings.excludeBackupText : t.settings.excludeBackupUnavailable}
        </Text>
      </View>

      <Pressable onPress={reset} accessibilityRole="button" style={({ pressed }) => [styles.danger, pressed && styles.pressed]}>
        <Text style={styles.dangerText} maxFontSizeMultiplier={MAX_FONT_SCALE_TEXT}>
          {t.settings.reset}
        </Text>
      </Pressable>

      <Text style={styles.version} maxFontSizeMultiplier={MAX_FONT_SCALE_TEXT}>
        {t.settings.version(Constants.expoConfig?.version ?? '1.0.0')}
      </Text>
    </ScrollView>
  );
}

function SettingRow({ label, value, onPress }: { label: string; value: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}`}
      style={({ pressed }) => [styles.settingRow, pressed && styles.pressed]}
    >
      <Text style={styles.settingLabel} maxFontSizeMultiplier={MAX_FONT_SCALE_TEXT}>
        {label}
      </Text>
      <View style={styles.settingValueWrap}>
        <Text style={styles.settingValue} maxFontSizeMultiplier={MAX_FONT_SCALE_TEXT}>
          {value}
        </Text>
        <ChevronRightIcon size={16} color={colors.textSecondary} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.screenX, gap: 14 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 6 },
  title: { fontFamily: fonts.display700, fontSize: 22, color: colors.textPrimary },
  sectionTitle: { fontFamily: fonts.text600, fontSize: 14, color: colors.textSecondary, marginTop: 6 },
  card: { backgroundColor: colors.surface, borderRadius: radii.card, padding: 16, gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 },
  swatch: { width: 12, height: 12, borderRadius: 4 },
  rowTitle: { flex: 1, fontFamily: fonts.text600, fontSize: 16, color: colors.textPrimary },
  settingRow: { ...fieldRow, minHeight: 48 },
  settingLabel: { fontFamily: fonts.text500, fontSize: 15, color: colors.textSecondary },
  settingValueWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  settingValue: { fontFamily: fonts.text700, fontSize: 15, color: colors.textPrimary },
  muted: { fontFamily: fonts.text400, fontSize: 14, lineHeight: 20, color: colors.textSecondary },
  hint: { fontFamily: fonts.text400, fontSize: 13, lineHeight: 18, color: colors.textSecondary },
  danger: {
    marginTop: 10,
    minHeight: 56,
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerText: { fontFamily: fonts.text700, fontSize: 16, color: colors.danger },
  pressed: { opacity: 0.6 },
  version: { textAlign: 'center', fontFamily: fonts.text400, fontSize: 12, color: colors.mutedText, marginTop: 4 },
});
