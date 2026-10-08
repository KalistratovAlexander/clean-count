import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PillButton } from '@/components/buttons';
import { pick } from '@/components/DatePicker';
import { CheckIcon, GlassIcon, SmokingKindIcon } from '@/components/icons';
import { localDateTime, toZoned } from '@/domain/localDate';
import { HABIT_IDS, type HabitId, type LocalDate } from '@/domain/types';
import { readNow, useClock } from '@/hooks/clock';
import { t } from '@/i18n';
import { formatFullDate, formatTime } from '@/i18n/format';
import { useAppStore } from '@/store/appStore';
import { colors, fieldRow, fonts, habitColor, HIT, MAX_FONT_SCALE_TEXT, radii, spacing } from '@/theme';

const STEPS = 3;

interface QuitDraft {
  date: LocalDate;
  /** Минуты от полуночи; null — время не указано (00:00). */
  minutes: number | null;
}

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const { today } = useClock();
  const completeOnboarding = useAppStore((s) => s.completeOnboarding);
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<HabitId[]>([]);
  const [drafts, setDrafts] = useState<Record<HabitId, QuitDraft>>({
    alcohol: { date: today, minutes: null },
    smoking: { date: today, minutes: null },
  });
  const [saving, setSaving] = useState(false);

  const toggle = (id: HabitId) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : HABIT_IDS.filter((h) => h === id || s.includes(h))));

  const updateDraft = (id: HabitId, patch: Partial<QuitDraft>) => setDrafts((d) => ({ ...d, [id]: { ...d[id], ...patch } }));

  const pickDate = async (id: HabitId) => {
    const value = await pick({ mode: 'date', value: drafts[id].date, max: readNow().today });
    if (value) updateDraft(id, { date: value });
  };

  const pickTime = async (id: HabitId) => {
    const value = await pick({ mode: 'time', value: drafts[id].minutes ?? 0 });
    if (value != null) updateDraft(id, { minutes: value });
  };

  const finish = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const { tz, today: now } = readNow();
      const quitDates: Partial<Record<HabitId, string>> = {};
      for (const id of selected) {
        const date = drafts[id].date > now ? now : drafts[id].date;
        quitDates[id] = toZoned(localDateTime(date, drafts[id].minutes ?? 0, tz), tz);
      }
      await completeOnboarding(quitDates);
      router.replace('/main');
    } catch (e) {
      console.error(e);
      setSaving(false);
      Alert.alert(t.errors.title, t.sheet.saveError);
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + 16, paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
      <View style={styles.progress} accessible accessibilityLabel={t.onboarding.step(step + 1, STEPS)}>
        {Array.from({ length: STEPS }, (_, i) => (
          <View key={i} style={[styles.dot, i === step && styles.dotActive, i < step && styles.dotDone]} />
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {step === 0 && (
          <Animated.View key="welcome" entering={FadeIn} exiting={FadeOut} style={styles.stepBody}>
            <View style={styles.hero}>
              <View style={[styles.heroTile, { backgroundColor: colors.alcohol }]}>
                <GlassIcon size={40} color={colors.onAccent} />
              </View>
              <View style={[styles.heroTile, { backgroundColor: colors.smoking }]}>
                <SmokingKindIcon kind="cigarette" size={40} color={colors.onAccent} />
              </View>
            </View>
            <Text style={styles.title} accessibilityRole="header" maxFontSizeMultiplier={MAX_FONT_SCALE_TEXT}>
              {t.onboarding.welcomeTitle}
            </Text>
            <Text style={styles.lead} maxFontSizeMultiplier={MAX_FONT_SCALE_TEXT}>
              {t.onboarding.welcomeText}
            </Text>
            <View style={styles.points}>
              {t.onboarding.welcomePoints.map((p) => (
                <View key={p} style={styles.point}>
                  <View style={styles.pointIcon}>
                    <CheckIcon size={14} color={colors.onDark} />
                  </View>
                  <Text style={styles.pointText} maxFontSizeMultiplier={MAX_FONT_SCALE_TEXT}>
                    {p}
                  </Text>
                </View>
              ))}
            </View>
          </Animated.View>
        )}

        {step === 1 && (
          <Animated.View key="habits" entering={FadeIn} exiting={FadeOut} style={styles.stepBody}>
            <Text style={styles.title} accessibilityRole="header" maxFontSizeMultiplier={MAX_FONT_SCALE_TEXT}>
              {t.onboarding.habitsTitle}
            </Text>
            <Text style={styles.lead} maxFontSizeMultiplier={MAX_FONT_SCALE_TEXT}>
              {t.onboarding.habitsText}
            </Text>
            {HABIT_IDS.map((id) => {
              const on = selected.includes(id);
              const color = habitColor[id];
              return (
                <Pressable
                  key={id}
                  onPress={() => toggle(id)}
                  accessibilityRole="switch"
                  accessibilityState={{ checked: on }}
                  accessibilityLabel={`${t.habit[id]}. ${t.onboarding.habitCardText[id]}`}
                  style={[styles.habitCard, on ? { backgroundColor: color, borderColor: color } : styles.habitCardIdle]}
                >
                  <View style={[styles.habitIcon, { backgroundColor: on ? 'rgba(255,255,255,0.18)' : colors.subtle }]}>
                    {id === 'alcohol' ? (
                      <GlassIcon color={on ? colors.onAccent : colors.textPrimary} />
                    ) : (
                      <SmokingKindIcon kind="cigarette" size={28} color={on ? colors.onAccent : colors.textPrimary} />
                    )}
                  </View>
                  <View style={styles.habitText}>
                    <Text style={[styles.habitTitle, on && styles.onAccent]} maxFontSizeMultiplier={MAX_FONT_SCALE_TEXT}>
                      {t.habit[id]}
                    </Text>
                    <Text style={[styles.habitSub, on && styles.onAccent]} maxFontSizeMultiplier={MAX_FONT_SCALE_TEXT}>
                      {t.onboarding.habitCardText[id]}
                    </Text>
                  </View>
                  <View style={[styles.check, on ? styles.checkOn : styles.checkOff]}>
                    {on && <CheckIcon size={16} color={color} />}
                  </View>
                </Pressable>
              );
            })}
          </Animated.View>
        )}

        {step === 2 && (
          <Animated.View key="dates" entering={FadeIn} exiting={FadeOut} style={styles.stepBody}>
            <Text style={styles.title} accessibilityRole="header" maxFontSizeMultiplier={MAX_FONT_SCALE_TEXT}>
              {t.onboarding.datesTitle}
            </Text>
            <Text style={styles.lead} maxFontSizeMultiplier={MAX_FONT_SCALE_TEXT}>
              {t.onboarding.datesText}
            </Text>
            {selected.map((id) => {
              const draft = drafts[id];
              return (
                <View key={id} style={styles.dateCard}>
                  <View style={styles.dateCardHeader}>
                    <View style={[styles.swatch, { backgroundColor: habitColor[id] }]} />
                    <Text style={styles.dateCardTitle} maxFontSizeMultiplier={MAX_FONT_SCALE_TEXT}>
                      {t.habitWithout[id]}
                    </Text>
                  </View>
                  <FieldRow
                    label={t.onboarding.quitDate}
                    value={formatFullDate(draft.date)}
                    onPress={() => pickDate(id)}
                  />
                  {draft.minutes == null ? (
                    <Pressable
                      onPress={() => pickTime(id)}
                      accessibilityRole="button"
                      style={({ pressed }) => [styles.linkButton, pressed && styles.pressed]}
                    >
                      <Text style={styles.link} maxFontSizeMultiplier={MAX_FONT_SCALE_TEXT}>
                        {t.onboarding.addTime}
                      </Text>
                    </Pressable>
                  ) : (
                    <>
                      <FieldRow label={t.onboarding.quitTime} value={formatTime(draft.minutes)} onPress={() => pickTime(id)} />
                      <Pressable
                        onPress={() => updateDraft(id, { minutes: null })}
                        accessibilityRole="button"
                        style={({ pressed }) => [styles.linkButton, pressed && styles.pressed]}
                      >
                        <Text style={styles.linkMuted} maxFontSizeMultiplier={MAX_FONT_SCALE_TEXT}>
                          {t.onboarding.removeTime}
                        </Text>
                      </Pressable>
                    </>
                  )}
                </View>
              );
            })}
          </Animated.View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        {step === 0 && <PillButton label={t.onboarding.start} onPress={() => setStep(1)} />}
        {step === 1 && (
          <>
            <PillButton label={t.onboarding.next} onPress={() => setStep(2)} disabled={selected.length === 0} />
            <PillButton label={t.onboarding.back} variant="text" onPress={() => setStep(0)} />
          </>
        )}
        {step === 2 && (
          <>
            <PillButton label={t.onboarding.done} onPress={finish} disabled={saving} />
            <PillButton label={t.onboarding.back} variant="text" onPress={() => setStep(1)} />
          </>
        )}
      </View>
    </View>
  );
}

function FieldRow({ label, value, onPress }: { label: string; value: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}`}
      style={({ pressed }) => [styles.field, pressed && styles.pressed]}
    >
      <Text style={styles.fieldLabel} maxFontSizeMultiplier={MAX_FONT_SCALE_TEXT}>
        {label}
      </Text>
      <Text style={styles.fieldValue} maxFontSizeMultiplier={MAX_FONT_SCALE_TEXT}>
        {value}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  progress: { flexDirection: 'row', justifyContent: 'center', gap: 6, paddingBottom: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.border },
  dotActive: { width: 24, backgroundColor: colors.textPrimary },
  dotDone: { backgroundColor: colors.textSecondary },
  body: { flexGrow: 1, paddingHorizontal: spacing.screenX, paddingVertical: 16 },
  stepBody: { gap: 16 },
  hero: { flexDirection: 'row', gap: 12, marginTop: 24, marginBottom: 12 },
  heroTile: { width: 88, height: 88, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: fonts.display800, fontSize: 30, lineHeight: 36, color: colors.textPrimary },
  lead: { fontFamily: fonts.text400, fontSize: 17, lineHeight: 24, color: colors.textSecondary },
  points: { gap: 12, marginTop: 8 },
  point: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  pointIcon: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.textPrimary, alignItems: 'center', justifyContent: 'center' },
  pointText: { flex: 1, fontFamily: fonts.text500, fontSize: 16, color: colors.textPrimary },

  habitCard: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: radii.card, borderWidth: 2, padding: 18 },
  habitCardIdle: { backgroundColor: colors.surface, borderColor: colors.cardBorder },
  habitIcon: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  habitText: { flex: 1, gap: 4 },
  habitTitle: { fontFamily: fonts.text700, fontSize: 18, color: colors.textPrimary },
  habitSub: { fontFamily: fonts.text400, fontSize: 14, lineHeight: 19, color: colors.textSecondary },
  onAccent: { color: colors.onAccent },
  check: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  checkOn: { backgroundColor: colors.onAccent },
  checkOff: { borderWidth: 2, borderColor: colors.border },

  dateCard: { backgroundColor: colors.surface, borderRadius: radii.card, padding: 18, gap: 10 },
  dateCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  swatch: { width: 12, height: 12, borderRadius: 4 },
  dateCardTitle: { fontFamily: fonts.text700, fontSize: 16, color: colors.textPrimary },
  field: { ...fieldRow, minHeight: 52 },
  fieldLabel: { fontFamily: fonts.text500, fontSize: 15, color: colors.textSecondary },
  fieldValue: { fontFamily: fonts.text700, fontSize: 15, color: colors.textPrimary },
  linkButton: { alignSelf: 'flex-start', minHeight: HIT, justifyContent: 'center', paddingHorizontal: 4 },
  link: { fontFamily: fonts.text600, fontSize: 15, color: colors.textPrimary, textDecorationLine: 'underline' },
  linkMuted: { fontFamily: fonts.text500, fontSize: 14, color: colors.textSecondary },
  pressed: { opacity: 0.6 },
  footer: { paddingHorizontal: spacing.screenX, gap: 6 },
});
