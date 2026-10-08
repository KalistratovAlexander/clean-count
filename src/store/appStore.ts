import { randomUUID } from 'expo-crypto';
import { create } from 'zustand';

import * as database from '@/db/database';
import * as repo from '@/db/repo';
import { achievedMilestones, migrateLegacyMilestones, reachedMilestones } from '@/domain/milestones';
import { buildRelapse, type RelapseInput } from '@/domain/relapse';
import { daysSinceLastRelapse, streakStartDate } from '@/domain/stats';
import { emptyHabit, HABIT_IDS, type Habit, type HabitId, type LocalDate, type Relapse, type Settings, type ZonedDateTime } from '@/domain/types';

type Status = 'loading' | 'ready' | 'error';

interface AppState {
  status: Status;
  habits: Record<HabitId, Habit>;
  relapses: Relapse[];
  settings: Settings;

  /** `today` — текущая календарная дата устройства, нужна для перевода старых вех. */
  load(today: LocalDate): Promise<void>;
  completeOnboarding(quitDates: Partial<Record<HabitId, ZonedDateTime>>): Promise<void>;
  addRelapse(input: RelapseInput, now: Date, tz: string): Promise<Relapse>;
  removeRelapse(id: string): Promise<void>;
  setQuitAt(id: HabitId, quitAt: ZonedDateTime): Promise<void>;
  setHabitEnabled(id: HabitId, enabled: boolean, quitAt?: ZonedDateTime): Promise<void>;
  /** Поздравили с вехой `milestone` в серии, начавшейся `streakStart`; веха попадает в достижения. */
  markCelebrated(id: HabitId, streakStart: LocalDate, milestone: number): Promise<void>;
  setLastScreen(id: HabitId): void;
  setExcludeFromBackup(excluded: boolean): Promise<void>;
  resetAll(): Promise<void>;
}


export const useAppStore = create<AppState>()((set, get) => {
  const updateHabit = async (id: HabitId, patch: Partial<Habit>) => {
    const next = { ...get().habits[id], ...patch };
    await repo.saveHabit(next);
    set((s) => ({ habits: { ...s.habits, [id]: next } }));
  };

  return {
    status: 'loading',
    habits: { alcohol: emptyHabit('alcohol'), smoking: emptyHabit('smoking') },
    relapses: [],
    settings: { onboarded: false, lastScreen: null, excludeFromBackup: false },

    async load(today) {
      try {
        await database.initDatabase();
        const snapshot = await repo.loadSnapshot();
        // Приводим вехи в порядок. Запись в базу — по возможности: если она не удалась,
        // работаем с исправленными данными в памяти.
        for (const id of HABIT_IDS) {
          const habit = snapshot.habits[id];
          if (!habit.quitAt) continue;
          const days = daysSinceLastRelapse(habit, snapshot.relapses, today);
          let next = habit;
          // Старая схема вех (1, 3, 7, …) заменяется на достигнутые по текущей серии, без поздравления задним числом.
          const migrated = migrateLegacyMilestones(next.milestonesEarned, days);
          if (migrated) next = { ...next, milestonesEarned: migrated };
          // Первый запуск с поздравлениями по сериям: уже заработанные вехи текущей серии считаем показанными.
          if (next.celebratedSince === null) {
            const shown = reachedMilestones(days).filter((m) => next.milestonesEarned.includes(m));
            next = { ...next, celebratedSince: streakStartDate(next, snapshot.relapses), celebratedUpTo: shown[shown.length - 1] ?? 0 };
          }
          // Вехи, достигнутые пока приложение не открывали, записываем в достижения, чтобы они не пропали после срыва.
          const earned = achievedMilestones(next.milestonesEarned, days);
          if (earned.length !== next.milestonesEarned.length) next = { ...next, milestonesEarned: earned };
          if (next === habit) continue;
          snapshot.habits[id] = next;
          await repo.saveHabit(next).catch(console.error);
        }
        set({
          ...snapshot,
          settings: { ...snapshot.settings, excludeFromBackup: database.isExcludedFromBackup() },
          status: 'ready',
        });
      } catch (e) {
        console.error(e);
        set({ status: 'error' });
      }
    },

    async completeOnboarding(quitDates) {
      const habits = HABIT_IDS.map((id): Habit => {
        const quitAt = quitDates[id];
        return quitAt ? { ...emptyHabit(id), enabled: true, quitAt } : emptyHabit(id);
      });
      await repo.completeOnboarding(habits);
      const first = habits.find((h) => h.enabled)?.id ?? null;
      set((s) => ({
        habits: { alcohol: habits[0]!, smoking: habits[1]! },
        relapses: [],
        settings: { ...s.settings, onboarded: true, lastScreen: first },
      }));
      if (first) get().setLastScreen(first);
    },

    async addRelapse(input, now, tz) {
      const relapse = buildRelapse(input, randomUUID(), now, tz);
      await repo.insertRelapse(relapse);
      set((s) => ({ relapses: [...s.relapses, relapse] }));
      return relapse;
    },

    async removeRelapse(id) {
      await repo.deleteRelapse(id);
      set((s) => ({ relapses: s.relapses.filter((r) => r.id !== id) }));
    },

    async setQuitAt(id, quitAt) {
      await updateHabit(id, { quitAt });
    },

    async setHabitEnabled(id, enabled, quitAt) {
      const habit = get().habits[id];
      await updateHabit(id, { enabled, quitAt: quitAt ?? habit.quitAt });
    },

    async markCelebrated(id, streakStart, milestone) {
      const habit = get().habits[id];
      await updateHabit(id, {
        celebratedSince: streakStart,
        celebratedUpTo: milestone,
        milestonesEarned: achievedMilestones(habit.milestonesEarned, milestone),
      });
    },

    setLastScreen(id) {
      if (get().settings.lastScreen === id) return;
      set((s) => ({ settings: { ...s.settings, lastScreen: id } }));
      repo.saveSetting('lastScreen', id).catch(console.error);
    },

    async setExcludeFromBackup(excluded) {
      await database.setExcludedFromBackup(excluded);
      set((s) => ({ settings: { ...s.settings, excludeFromBackup: database.isExcludedFromBackup() } }));
    },

    async resetAll() {
      await repo.resetAll();
      set((s) => ({
        habits: { alcohol: emptyHabit('alcohol'), smoking: emptyHabit('smoking') },
        relapses: [],
        settings: { ...s.settings, onboarded: false, lastScreen: null },
      }));
    },
  };
});

