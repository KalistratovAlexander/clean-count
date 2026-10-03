import { randomUUID } from 'expo-crypto';
import { create } from 'zustand';

import * as database from '@/db/database';
import * as repo from '@/db/repo';
import { reachedMilestones } from '@/domain/milestones';
import { buildRelapse, type RelapseInput } from '@/domain/relapse';
import { HABIT_IDS, type Habit, type HabitId, type Relapse, type Settings, type ZonedDateTime } from '@/domain/types';

type Status = 'loading' | 'ready' | 'error';

interface AppState {
  status: Status;
  habits: Record<HabitId, Habit>;
  relapses: Relapse[];
  settings: Settings;

  load(): Promise<void>;
  completeOnboarding(quitDates: Partial<Record<HabitId, ZonedDateTime>>): Promise<void>;
  addRelapse(input: RelapseInput, now: Date, tz: string): Promise<Relapse>;
  removeRelapse(id: string): Promise<void>;
  setQuitAt(id: HabitId, quitAt: ZonedDateTime): Promise<void>;
  setHabitEnabled(id: HabitId, enabled: boolean, quitAt?: ZonedDateTime): Promise<void>;
  markMilestonesShown(id: HabitId, streakDays: number): Promise<void>;
  setLastScreen(id: HabitId): void;
  setExcludeFromBackup(excluded: boolean): Promise<void>;
  resetAll(): Promise<void>;
}

const emptyHabit = (id: HabitId): Habit => ({ id, enabled: false, quitAt: null, milestonesShown: [] });

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

    async load() {
      try {
        await database.initDatabase();
        const snapshot = await repo.loadSnapshot();
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
        return quitAt ? { id, enabled: true, quitAt, milestonesShown: [] } : emptyHabit(id);
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

    async markMilestonesShown(id, streakDays) {
      const habit = get().habits[id];
      const shown = Array.from(new Set([...habit.milestonesShown, ...reachedMilestones(streakDays)])).sort(
        (a, b) => a - b,
      );
      if (shown.length === habit.milestonesShown.length) return;
      await updateHabit(id, { milestonesShown: shown });
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

