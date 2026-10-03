export type PluralForms = readonly [one: string, few: string, many: string];

/** Русские формы: 1 день, 2 дня, 5 дней, 11 дней, 21 день. */
export function pluralIndex(n: number): 0 | 1 | 2 {
  const abs = Math.abs(Math.trunc(n));
  const mod10 = abs % 10;
  const mod100 = abs % 100;
  if (mod10 === 1 && mod100 !== 11) return 0;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 1;
  return 2;
}

export function plural(n: number, forms: PluralForms): string {
  return forms[pluralIndex(n)];
}
