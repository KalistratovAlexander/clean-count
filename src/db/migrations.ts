import type { SQLiteDatabase } from 'expo-sqlite';

/**
 * Миграции по порядку: индекс + 1 = версия схемы (PRAGMA user_version).
 * Новые миграции только добавляются в конец, старые не меняются.
 */
const MIGRATIONS: string[] = [
  `
  CREATE TABLE habits (
    id TEXT PRIMARY KEY NOT NULL CHECK (id IN ('alcohol', 'smoking')),
    enabled INTEGER NOT NULL DEFAULT 0,
    quit_at TEXT,
    milestones_shown TEXT NOT NULL DEFAULT '[]'
  );
  INSERT INTO habits (id) VALUES ('alcohol'), ('smoking');

  CREATE TABLE relapses (
    id TEXT PRIMARY KEY NOT NULL,
    habit_id TEXT NOT NULL REFERENCES habits (id),
    date TEXT NOT NULL,
    created_at TEXT NOT NULL,
    kind TEXT NOT NULL,
    count INTEGER NOT NULL DEFAULT 1 CHECK (count BETWEEN 1 AND 99),
    note TEXT CHECK (note IS NULL OR length(note) <= 300)
  );
  CREATE INDEX relapses_habit_date ON relapses (habit_id, date);

  CREATE TABLE settings (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
  );
  `,
  // Поздравления привязаны к текущей серии: с какого дня она идёт и до какой вехи уже поздравляли.
  // milestones_shown при этом хранит достижения за всё время.
  `
  ALTER TABLE habits ADD COLUMN celebrated_since TEXT;
  ALTER TABLE habits ADD COLUMN celebrated_up_to INTEGER NOT NULL DEFAULT 0;
  `,
];

export async function migrate(db: SQLiteDatabase): Promise<void> {
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const current = row?.user_version ?? 0;
  for (let version = current; version < MIGRATIONS.length; version++) {
    await db.withExclusiveTransactionAsync(async (tx) => {
      await tx.execAsync(MIGRATIONS[version]!);
      await tx.execAsync(`PRAGMA user_version = ${version + 1}`);
    });
  }
}
