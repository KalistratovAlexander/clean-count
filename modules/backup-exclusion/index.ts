import { requireOptionalNativeModule } from 'expo';

interface BackupExclusionNative {
  getNoBackupDirectory(): string | null;
  fileExists(path: string): boolean;
  isExcludedFromBackup(path: string): boolean;
  setExcludedFromBackup(path: string, excluded: boolean): void;
  moveFile(from: string, to: string): void;
}

/** null — модуль недоступен (например, в Expo Go). */
const native = requireOptionalNativeModule<BackupExclusionNative>('BackupExclusion');

export const isBackupExclusionAvailable = native != null;

const SQLITE_SUFFIXES = ['', '-wal', '-shm', '-journal'];

const join = (dir: string, name: string) => `${dir.replace(/\/+$/, '')}/${name}`;

export interface DatabaseLocation {
  directory: string;
  excluded: boolean;
}

/** Где сейчас лежит база и исключена ли она из бэкапа. */
export function locateDatabase(defaultDirectory: string, name: string): DatabaseLocation {
  if (!native) return { directory: defaultDirectory, excluded: false };
  const noBackup = native.getNoBackupDirectory();
  if (noBackup && native.fileExists(join(noBackup, name))) {
    return { directory: noBackup, excluded: true };
  }
  return { directory: defaultDirectory, excluded: !noBackup && native.isExcludedFromBackup(defaultDirectory) };
}

/**
 * Включает или выключает исключение из бэкапа. Базу нужно закрыть до вызова:
 * на Android файлы переносятся в другую папку. Возвращает новую папку базы.
 */
export function applyBackupExclusion(
  current: DatabaseLocation,
  defaultDirectory: string,
  name: string,
  excluded: boolean,
): DatabaseLocation {
  if (!native) return current;
  const noBackup = native.getNoBackupDirectory();
  if (!noBackup) {
    native.setExcludedFromBackup(defaultDirectory, excluded);
    return { directory: defaultDirectory, excluded };
  }
  const target = excluded ? noBackup : defaultDirectory;
  if (target !== current.directory) {
    for (const suffix of SQLITE_SUFFIXES) {
      native.moveFile(join(current.directory, name + suffix), join(target, name + suffix));
    }
  }
  return { directory: target, excluded };
}
