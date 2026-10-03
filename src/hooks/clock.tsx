import { getCalendars } from 'expo-localization';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { localDateAt } from '@/domain/localDate';
import type { LocalDate } from '@/domain/types';

export interface Clock {
  now: Date;
  /** Текущий часовой пояс устройства, IANA: "Europe/Moscow". */
  tz: string;
  today: LocalDate;
}

function readTimeZone(): string {
  try {
    return getCalendars()[0]?.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'UTC';
  } catch {
    return 'UTC';
  }
}

function readClock(): Clock {
  const now = new Date();
  const tz = readTimeZone();
  return { now, tz, today: localDateAt(now, tz) };
}

const ClockContext = createContext<Clock | null>(null);

/**
 * Единые часы приложения: обновляются на границе каждой минуты и при возврате
 * в приложение. Часовой пояс перечитывается каждый раз, поэтому смена пояса
 * и переход на летнее время подхватываются без перезапуска.
 */
export function ClockProvider({ children }: { children: ReactNode }) {
  const [clock, setClock] = useState(readClock);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      const msToNextMinute = 60_000 - (Date.now() % 60_000) + 50;
      timer = setTimeout(() => {
        setClock(readClock());
        schedule();
      }, msToNextMinute);
    };
    schedule();

    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      clearTimeout(timer);
      setClock(readClock());
      schedule();
    });

    return () => {
      clearTimeout(timer);
      sub.remove();
    };
  }, []);

  return <ClockContext.Provider value={clock}>{children}</ClockContext.Provider>;
}

export function useClock(): Clock {
  const clock = useContext(ClockContext);
  if (!clock) throw new Error('useClock must be used inside ClockProvider');
  return clock;
}

/** Свежие значения на момент действия пользователя (а не на последний тик). */
export function readNow(): Clock {
  return readClock();
}

