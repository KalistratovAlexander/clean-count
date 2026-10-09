import { getLocales } from 'expo-localization';

import { LANGUAGES, type Language } from '@/domain/types';

import { en } from './en';
import { ru, type Strings } from './ru';

const dictionaries: Record<Language, Strings> = { ru, en };

/** Язык устройства: русский, если система на русском, иначе английский. */
export function systemLanguage(): Language {
  try {
    return getLocales()[0]?.languageCode === 'ru' ? 'ru' : 'en';
  } catch {
    return 'ru';
  }
}

export function isLanguage(value: unknown): value is Language {
  return typeof value === 'string' && (LANGUAGES as readonly string[]).includes(value);
}

let current: Language = systemLanguage();

/** Переключает словарь. Экраны перерисовываются через `useLanguage()`, который подписан на стор. */
export function setLanguage(language: Language): void {
  current = language;
}

export function getLanguage(): Language {
  return current;
}

/**
 * Строки интерфейса на текущем языке. Прокси читает активный словарь при каждом обращении,
 * поэтому `t.main.goal(5)` всегда отдаёт строку на выбранном языке без переимпорта.
 */
export const t: Strings = new Proxy({} as Strings, {
  get: (_target, key) => dictionaries[current][key as keyof Strings],
  has: (_target, key) => key in dictionaries[current],
  ownKeys: () => Reflect.ownKeys(dictionaries[current]),
  getOwnPropertyDescriptor: (_target, key) => Reflect.getOwnPropertyDescriptor(dictionaries[current], key),
});

export { plural, pluralIndex } from './plural';
