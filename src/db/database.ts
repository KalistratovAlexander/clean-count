import * as SQLite from 'expo-sqlite';

import {
  applyBackupExclusion,
  locateDatabase,
  type DatabaseLocation,
} from '../../modules/backup-exclusion';

import { migrate } from './migrations';

const DATABASE_NAME = 'clean-count.db';

let db: SQLite.SQLiteDatabase | null = null;
let location: DatabaseLocation | null = null;

async function open(directory: string): Promise<SQLite.SQLiteDatabase> {
  const database = await SQLite.openDatabaseAsync(DATABASE_NAME, undefined, directory);
  await migrate(database);
  return database;
}

export async function initDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;
  location = locateDatabase(SQLite.defaultDatabaseDirectory, DATABASE_NAME);
  db = await open(location.directory);
  return db;
}

export function getDatabase(): SQLite.SQLiteDatabase {
  if (!db) throw new Error('Database is not initialized');
  return db;
}

export function isExcludedFromBackup(): boolean {
  return location?.excluded ?? false;
}

/** Переоткрывает базу в папке, исключённой из бэкапа (или возвращает обратно). */
export async function setExcludedFromBackup(excluded: boolean): Promise<void> {
  if (!db || !location) throw new Error('Database is not initialized');
  if (location.excluded === excluded) return;
  // Сливаем WAL в основной файл, чтобы переносить один целостный файл.
  await db.execAsync('PRAGMA wal_checkpoint(TRUNCATE)');
  await db.closeAsync();
  db = null;
  try {
    location = applyBackupExclusion(location, SQLite.defaultDatabaseDirectory, DATABASE_NAME, excluded);
  } finally {
    db = await open(location.directory);
  }
}
