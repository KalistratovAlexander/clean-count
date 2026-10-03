export type HabitId = 'alcohol' | 'smoking';
export const HABIT_IDS: readonly HabitId[] = ['alcohol', 'smoking'];

export type AlcoholKind = 'strong' | 'light';
export type SmokingKind = 'cigarette' | 'hookah' | 'vape' | 'heated' | 'cigar' | 'other';
export type RelapseKind = AlcoholKind | SmokingKind;

export const KINDS_BY_HABIT: { alcohol: readonly AlcoholKind[]; smoking: readonly SmokingKind[] } = {
  alcohol: ['strong', 'light'],
  smoking: ['cigarette', 'hookah', 'vape', 'heated', 'cigar', 'other'],
};

/** Календарная дата без часового пояса: "YYYY-MM-DD". */
export type LocalDate = string;

/** Момент времени в ISO 8601 со смещением: "2026-03-03T00:00:00+03:00". */
export type ZonedDateTime = string;

export interface Habit {
  id: HabitId;
  enabled: boolean;
  /** null — привычка ещё ни разу не настраивалась. */
  quitAt: ZonedDateTime | null;
  milestonesShown: number[];
}

export interface Relapse {
  id: string;
  habitId: HabitId;
  /** День срыва в локальном поясе на момент записи. */
  date: LocalDate;
  createdAt: ZonedDateTime;
  kind: RelapseKind;
  count: number;
  note: string | null;
}

export interface Settings {
  onboarded: boolean;
  lastScreen: HabitId | null;
  excludeFromBackup: boolean;
}

export const RELAPSE_NOTE_MAX_LENGTH = 300;
export const RELAPSE_COUNT_MIN = 1;
export const RELAPSE_COUNT_MAX = 99;
