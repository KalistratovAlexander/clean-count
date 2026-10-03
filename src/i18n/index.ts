import { ru, type Strings } from './ru';

/**
 * Сейчас в приложении один язык. Чтобы добавить новый, создайте рядом файл с тем же
 * типом `Strings` и выбирайте словарь по `getLocales()` из expo-localization.
 */
export const t: Strings = ru;

export { plural, pluralIndex } from './plural';
