import { HABIT_IDS, type Habit, type HabitId, type Relapse, type RelapseKind, type Settings } from '@/domain/types';

import { getDatabase } from './database';

interface HabitRow {
  id: HabitId;
  enabled: number;
  quit_at: string | null;
  milestones_shown: string;
}

interface RelapseRow {
  id: string;
  habit_id: HabitId;
  date: string;
  created_at: string;
  kind: RelapseKind;
  count: number;
  note: string | null;
}

interface SettingRow {
  key: string;
  value: string;
}

const DEFAULT_SETTINGS: Settings = { onboarded: false, lastScreen: null, excludeFromBackup: false };

function parseShown(value: string): number[] {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((n): n is number => typeof n === 'number') : [];
  } catch {
    return [];
  }
}

const toHabit = (row: HabitRow): Habit => ({
  id: row.id,
  enabled: row.enabled === 1,
  quitAt: row.quit_at,
  milestonesShown: parseShown(row.milestones_shown),
});

const toRelapse = (row: RelapseRow): Relapse => ({
  id: row.id,
  habitId: row.habit_id,
  date: row.date,
  createdAt: row.created_at,
  kind: row.kind,
  count: row.count,
  note: row.note,
});

export interface Snapshot {
  habits: Record<HabitId, Habit>;
  relapses: Relapse[];
  settings: Settings;
}

export async function loadSnapshot(): Promise<Snapshot> {
  const db = getDatabase();
  const [habitRows, relapseRows, settingRows] = await Promise.all([
    db.getAllAsync<HabitRow>('SELECT * FROM habits'),
    db.getAllAsync<RelapseRow>('SELECT * FROM relapses ORDER BY date, created_at'),
    db.getAllAsync<SettingRow>('SELECT * FROM settings'),
  ]);

  const habits = {} as Record<HabitId, Habit>;
  for (const id of HABIT_IDS) {
    const row = habitRows.find((r) => r.id === id);
    habits[id] = row ? toHabit(row) : { id, enabled: false, quitAt: null, milestonesShown: [] };
  }

  const raw = Object.fromEntries(settingRows.map((r) => [r.key, r.value]));
  const settings: Settings = {
    onboarded: raw.onboarded === '1',
    lastScreen: raw.lastScreen === 'alcohol' || raw.lastScreen === 'smoking' ? raw.lastScreen : null,
    excludeFromBackup: DEFAULT_SETTINGS.excludeFromBackup,
  };

  return { habits, relapses: relapseRows.map(toRelapse), settings };
}

export async function saveHabit(habit: Habit): Promise<void> {
  await getDatabase().runAsync(
    'UPDATE habits SET enabled = ?, quit_at = ?, milestones_shown = ? WHERE id = ?',
    habit.enabled ? 1 : 0,
    habit.quitAt,
    JSON.stringify(habit.milestonesShown),
    habit.id,
  );
}

export async function completeOnboarding(habits: Habit[]): Promise<void> {
  const db = getDatabase();
  await db.withExclusiveTransactionAsync(async (tx) => {
    for (const h of habits) {
      await tx.runAsync(
        'UPDATE habits SET enabled = ?, quit_at = ?, milestones_shown = ? WHERE id = ?',
        h.enabled ? 1 : 0,
        h.quitAt,
        JSON.stringify(h.milestonesShown),
        h.id,
      );
    }
    await tx.runAsync("INSERT OR REPLACE INTO settings (key, value) VALUES ('onboarded', '1')");
  });
}

export async function insertRelapse(r: Relapse): Promise<void> {
  await getDatabase().runAsync(
    'INSERT INTO relapses (id, habit_id, date, created_at, kind, count, note) VALUES (?, ?, ?, ?, ?, ?, ?)',
    r.id,
    r.habitId,
    r.date,
    r.createdAt,
    r.kind,
    r.count,
    r.note,
  );
}

export async function deleteRelapse(id: string): Promise<void> {
  await getDatabase().runAsync('DELETE FROM relapses WHERE id = ?', id);
}

export async function saveSetting(key: 'lastScreen', value: string): Promise<void> {
  await getDatabase().runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', key, value);
}

export async function resetAll(): Promise<void> {
  const db = getDatabase();
  await db.withExclusiveTransactionAsync(async (tx) => {
    await tx.execAsync(`
      DELETE FROM relapses;
      DELETE FROM settings;
      UPDATE habits SET enabled = 0, quit_at = NULL, milestones_shown = '[]';
    `);
  });
}
