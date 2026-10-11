import {
  DEFAULT_HABIT_ICON,
  HABIT_ICONS,
  HABIT_KIND_MAX_LENGTH,
  HABIT_KINDS_MAX,
  HABIT_NAME_MAX_LENGTH,
  KINDS_BY_PRESET,
  MAX_HABITS,
  type Habit,
  type HabitIconId,
  type HabitUnit,
} from './types';

/** Что вводит пользователь при создании или правке своей привычки. */
export interface CustomHabitInput {
  name: string;
  color: string;
  icon: HabitIconId;
  unit: HabitUnit;
  /** Виды срыва одной строкой через запятую или уже списком. */
  kinds: string | string[];
}

export type CustomHabitError = 'name';

export function parseKinds(kinds: string | string[]): string[] {
  const list = Array.isArray(kinds) ? kinds : kinds.split(/[,;\n]/);
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of list) {
    const kind = raw.trim().slice(0, HABIT_KIND_MAX_LENGTH);
    const key = kind.toLowerCase();
    if (!kind || seen.has(key)) continue;
    seen.add(key);
    result.push(kind);
  }
  return result.slice(0, HABIT_KINDS_MAX);
}

export const isHabitIcon = (x: unknown): x is HabitIconId => (HABIT_ICONS as readonly unknown[]).includes(x);

export function normalizeCustomHabit(input: CustomHabitInput): { name: string; color: string; icon: HabitIconId; unit: HabitUnit; kinds: string[] } {
  return {
    name: input.name.trim().slice(0, HABIT_NAME_MAX_LENGTH),
    color: input.color,
    icon: isHabitIcon(input.icon) ? input.icon : DEFAULT_HABIT_ICON,
    unit: input.unit,
    kinds: parseKinds(input.kinds),
  };
}

/** Ошибка ввода или null, если привычку можно сохранить. */
export function validateCustomHabit(input: CustomHabitInput): CustomHabitError | null {
  return normalizeCustomHabit(input).name ? null : 'name';
}

export function createCustomHabit(input: CustomHabitInput, id: string, order: number): Habit {
  const n = normalizeCustomHabit(input);
  return {
    id,
    preset: null,
    name: n.name,
    color: n.color,
    icon: n.icon,
    unit: n.unit,
    kinds: n.kinds,
    order,
    enabled: true,
    quitAt: null,
    milestonesEarned: [],
    celebratedSince: null,
    celebratedUpTo: 0,
  };
}

/** Применяет правку своей привычки, не трогая даты, достижения и порядок. */
export function applyCustomHabit(habit: Habit, input: CustomHabitInput): Habit {
  const n = normalizeCustomHabit(input);
  return { ...habit, name: n.name, color: n.color, icon: n.icon, unit: n.unit, kinds: n.kinds };
}

/** Виды срыва привычки: ключи встроенных или названия своих. Пусто — срыв записывается без вида. */
export function habitKinds(habit: Habit): readonly string[] {
  return habit.preset ? KINDS_BY_PRESET[habit.preset] : habit.kinds;
}

/** Нужен ли счётчик количества в окне срыва: у алкоголя считаются только эпизоды. */
export function habitCountsAmount(habit: Habit): boolean {
  return habit.preset !== 'alcohol';
}

export function canAddHabit(habits: readonly Habit[]): boolean {
  return habits.length < MAX_HABITS;
}

export function nextHabitOrder(habits: readonly Habit[]): number {
  return habits.reduce((m, h) => Math.max(m, h.order), -1) + 1;
}

export function sortHabits(habits: readonly Habit[]): Habit[] {
  return [...habits].sort((a, b) => a.order - b.order);
}

/**
 * Подбор значка по названию: ключевые слова по-русски и по-английски, первое совпадение.
 * Порядок важен: «азартные игры» должны дать кости, а не геймпад.
 */
const ICON_KEYWORDS: readonly [HabitIconId, readonly string[]][] = [
  ['cup', ['кофе', 'чай', 'капучино', 'латте', 'coffee', 'tea', 'latte']],
  ['soda', ['газиров', 'кола', 'лимонад', 'soda', 'cola', 'pepsi', 'пепси']],
  ['bolt', ['энергет', 'energy', 'редбул', 'red bull']],
  ['candy', ['сладк', 'конфет', 'шокол', 'сахар', 'sweet', 'candy', 'sugar', 'chocolate']],
  ['cake', ['торт', 'выпечк', 'булк', 'пирож', 'десерт', 'мучн', 'cake', 'pastr', 'bak', 'dessert']],
  ['burger', ['фастфуд', 'фаст-фуд', 'бургер', 'пицц', 'чипс', 'fast food', 'burger', 'pizza', 'chips', 'junk']],
  ['dice', ['ставк', 'казино', 'покер', 'азарт', 'лотере', 'bet', 'casino', 'gambl', 'poker', 'lottery']],
  ['phone', ['телефон', 'соцсет', 'инстаграм', 'тикток', 'ютуб', 'скролл', 'phone', 'social', 'instagram', 'tiktok', 'youtube', 'scroll']],
  ['gamepad', ['игр', 'гейм', 'консол', 'game', 'gaming', 'playstation', 'xbox']],
  ['tv', ['сериал', 'телевиз', 'фильм', 'tv', 'series', 'netflix', 'movie']],
  ['cart', ['покупк', 'шопинг', 'маркетплейс', 'shop', 'buy', 'wildberries', 'ozon']],
  ['pill', ['таблет', 'лекарств', 'pill', 'drug', 'med']],
  ['leaf', ['трав', 'марихуан', 'weed', 'cannabis', 'marijuana']],
  ['moon', ['сон', 'спать', 'ночь', 'поздно', 'sleep', 'night', 'late']],
  ['clock', ['прокрастин', 'откладыва', 'procrast', 'delay', 'время', 'time']],
  ['cutlery', ['переед', 'перекус', 'еда', 'еды', 'food', 'snack', 'eat', 'обжор']],
  ['money', ['трат', 'деньг', 'money', 'spend', 'cash', 'кредит']],
  ['chat', ['мат', 'ругат', 'сплетн', 'swear', 'curs', 'gossip', 'ссор']],
  ['hand', ['ногт', 'волос', 'кож', 'nail', 'hair', 'skin', 'bite']],
];

/** Значок по названию привычки; если ничего не подошло — нейтральный `ban`. */
export function suggestHabitIcon(name: string): HabitIconId {
  const text = name.trim().toLowerCase();
  if (!text) return DEFAULT_HABIT_ICON;
  for (const [icon, words] of ICON_KEYWORDS) {
    if (words.some((w) => text.includes(w))) return icon;
  }
  return DEFAULT_HABIT_ICON;
}
