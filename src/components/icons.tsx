import Svg, { Circle, Path, Rect } from 'react-native-svg';

import type { HabitIconId, SmokingKind } from '@/domain/types';
import { s } from '@/theme';

interface IconProps {
  size?: number;
  color: string;
  strokeWidth?: number;
}

// Размер иконки задаётся для 14 Pro Max и масштабируется вместе с остальным интерфейсом.
const base = (size: number) => ({ width: s(size), height: s(size), viewBox: '0 0 24 24', fill: 'none' });
const stroke = (color: string, strokeWidth: number) => ({
  stroke: color,
  strokeWidth,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
});

export function CalendarIcon({ size = 22, color, strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Rect x={3} y={5} width={18} height={16} rx={3} {...stroke(color, strokeWidth)} />
      <Path d="M3 10h18M8 3v4M16 3v4" {...stroke(color, strokeWidth)} />
    </Svg>
  );
}

export function SettingsIcon({ size = 22, color, strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Path d="M4 7h10M18 7h2M4 17h2M10 17h10" {...stroke(color, strokeWidth)} />
      <Circle cx={16} cy={7} r={2.2} {...stroke(color, strokeWidth)} />
      <Circle cx={8} cy={17} r={2.2} {...stroke(color, strokeWidth)} />
    </Svg>
  );
}

export function TrophyIcon({ size = 22, color, strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Path d="M8 4h8v5a4 4 0 0 1-8 0V4zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 20h8M10 17h4" {...stroke(color, strokeWidth)} />
    </Svg>
  );
}

export function ChevronLeftIcon({ size = 22, color, strokeWidth = 2 }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Path d="M15 5l-7 7 7 7" {...stroke(color, strokeWidth)} />
    </Svg>
  );
}

export function ChevronRightIcon({ size = 22, color, strokeWidth = 2 }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Path d="M9 5l7 7-7 7" {...stroke(color, strokeWidth)} />
    </Svg>
  );
}

export function PlusIcon({ size = 18, color, strokeWidth = 2 }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Path d="M12 5v14M5 12h14" {...stroke(color, strokeWidth)} />
    </Svg>
  );
}

export function CheckIcon({ size = 18, color, strokeWidth = 2.2 }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Path d="M5 12.5l4.5 4.5L19 7.5" {...stroke(color, strokeWidth)} />
    </Svg>
  );
}

export function GlassIcon({ size = 28, color, strokeWidth = 1.7 }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Path d="M7 3h10l-1 8a4 4 0 0 1-8 0L7 3zM12 15v6M8 21h8M7.5 7h9" {...stroke(color, strokeWidth)} />
    </Svg>
  );
}

/** Иконки видов курения — пути из макета «Срыв — курение». */
const SMOKING_PATHS: Record<SmokingKind, string> = {
  cigarette: 'M2 14h15v4H2z M17 14h4v4h-4z M17 10c0-2 2-2 2-4 M20 10c0-2 1.5-2 1.5-4',
  hookah: 'M12 2v5 M9 7h6 M10 7l-2.5 7a4.5 4.5 0 0 0 9 0L14 7 M8 22h8 M12 18.5V22 M16.5 13H20V7',
  vape: 'M9 2h6v20H9z M9 7h6 M12 11v4',
  heated: 'M7 5h10v16H7z M12 1v4 M10 10h4',
  cigar: 'M3 15l13-5 3 3-13 5z M16 10l3 3 M20 7c1-1 1-2 0-3',
  other: 'M3 12a9 9 0 1 0 18 0a9 9 0 1 0-18 0 M8 12h.01 M12 12h.01 M16 12h.01',
};

export function SmokingKindIcon({ kind, size = 26, color, strokeWidth = 1.7 }: IconProps & { kind: SmokingKind }) {
  return (
    <Svg {...base(size)}>
      <Path d={SMOKING_PATHS[kind]} {...stroke(color, strokeWidth)} />
    </Svg>
  );
}


/**
 * Значки своих привычек в том же линейном стиле. Набор покрывает типичные привычки:
 * еда и напитки, экраны и игры, азарт, покупки, вещества, режим, деньги, речь, тело; `ban` — любое другое.
 */
const HABIT_ICON_PATHS: Record<HabitIconId, string> = {
  cup: 'M4 9h12v6a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V9z M16 10.5h1.5a2.5 2.5 0 0 1 0 5H16 M8.5 3c-.8 1 .8 2 0 3 M12 3c-.8 1 .8 2 0 3',
  candy: 'M12 8a4 4 0 1 1 0 8a4 4 0 0 1 0-8z M8.6 10.2L4 7.5v9l4.6-2.7 M15.4 10.2L20 7.5v9l-4.6-2.7',
  cake: 'M4 20h16 M5 20v-6.5h14V20 M5 16.5h14 M12 9.5v4 M12 4.5c-1.2 1.3-1.2 2.3 0 3.5c1.2-1.2 1.2-2.2 0-3.5',
  burger: 'M4 10c0-3.3 3.6-5 8-5s8 1.7 8 5H4z M4 13.5h16 M4 17h16a2.5 2.5 0 0 1-2.5 3h-11A2.5 2.5 0 0 1 4 17z M8 7.5h.01 M12 7h.01 M16 7.5h.01',
  soda: 'M10 2.5h4V5l1.5 3v12a2 2 0 0 1-2 2h-3a2 2 0 0 1-2-2V8L10 5V2.5z M8.5 11h7 M8.5 16h7',
  bolt: 'M13 2.5L5 13.5h6l-1 8l9-11.5h-6l0-7.5z',
  dice: 'M6 4h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z M8.5 8.5h.01 M15.5 8.5h.01 M12 12h.01 M8.5 15.5h.01 M15.5 15.5h.01',
  phone: 'M8 2.5h8a2 2 0 0 1 2 2v15a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-15a2 2 0 0 1 2-2z M10 5.5h4 M12 18h.01',
  gamepad: 'M7 7.5h10a4.5 4.5 0 0 1 4.5 4.5v2.5a3 3 0 0 1-5.4 1.8l-1.1-1.8h-6l-1.1 1.8A3 3 0 0 1 2.5 14.5V12A4.5 4.5 0 0 1 7 7.5z M8 10.5v3 M6.5 12h3 M16 11.5h.01 M18 13.5h.01',
  tv: 'M4 5.5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-10a1 1 0 0 1 1-1z M8 21h8 M10.5 9l4.5 2.5l-4.5 2.5z',
  cart: 'M3 4h2.2l2.3 11h11l2-7H6.3 M9.5 20h.01 M17.5 20h.01',
  pill: 'M5 12a4 4 0 0 1 4-4h6a4 4 0 0 1 0 8H9a4 4 0 0 1-4-4z M12 8v8',
  leaf: 'M20 4C10.5 4 4 10 4 20c10 0 16-6.5 16-16z M4 20l8-8',
  moon: 'M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z',
  clock: 'M12 3a9 9 0 1 0 0 18a9 9 0 0 0 0-18z M12 7v5l3 2',
  cutlery: 'M6 3v6a2 2 0 0 0 4 0V3 M8 11v10 M17 3c-2 2-3 5-3 8h3v10 M17 3v8',
  money: 'M3 7h18v10H3z M12 9.5a2.5 2.5 0 1 0 0 5a2.5 2.5 0 0 0 0-5z M6.5 12h.01 M17.5 12h.01',
  chat: 'M4 5h16v11H9l-5 4V5z M12 8v4 M12 14h.01',
  hand: 'M7 12V7.5a1.5 1.5 0 0 1 3 0V11 M10 11V5.5a1.5 1.5 0 0 1 3 0V11 M13 11V6.5a1.5 1.5 0 0 1 3 0V12 M16 12.5a1.5 1.5 0 0 1 3 0V15a6 6 0 0 1-6 6h-2a6 6 0 0 1-6-6v-2a1.5 1.5 0 0 1 3 0',
  ban: 'M12 3a9 9 0 1 0 0 18a9 9 0 0 0 0-18z M6 6l12 12',
};

export function CustomHabitIcon({ icon, size = 26, color, strokeWidth = 1.7 }: IconProps & { icon: HabitIconId }) {
  return (
    <Svg {...base(size)}>
      <Path d={HABIT_ICON_PATHS[icon]} {...stroke(color, strokeWidth)} />
    </Svg>
  );
}
