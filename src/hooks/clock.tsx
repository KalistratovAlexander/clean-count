import { getCalendars } from 'expo-localization';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { localDateAt } from '@/domain/localDate';
import type { LocalDate } from '@/domain/types';

/** То, от чего зависят экраны: календарная дата и пояс. Момент времени здесь не хранится, он быстро устаревает. */
export interface Clock {
  /** Текущий часовой пояс устройства, IANA: "Europe/Moscow". */
  tz: string;
  today: LocalDate;
}

/** Свежие часы на момент действия пользователя, с точным моментом времени. */
export interface Now extends Clock {
  now: Date;
}

function readTimeZone(): string {
  try {
    return getCalendars()[0]?.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'UTC';
  } catch {
    return 'UTC';
  }
}

function readClock(): Now {
  const now = new Date();
  const tz = readTimeZone();
  return { now, tz, today: localDateAt(now, tz) };
}

const toClock = ({ tz, today }: Now): Clock => ({ tz, today });

const ClockContext = createContext<Clock | null>(null);

/**
 * Единые часы приложения: проверяются на границе каждой минуты и при возврате
 * в приложение, но подписчики обновляются только когда меняется календарная
 * дата или часовой пояс — экраны зависят лишь от них. Пояс перечитывается каждый
 * раз, поэтому его смена подхватывается без перезапуска.
 */
export function ClockProvider({ children }: { children: ReactNode }) {
  const [clock, setClock] = useState<Clock>(() => toClock(readClock()));

  useEffect(() => {
    const refresh = () =>
      setClock((prev) => {
        const next = readClock();
        return next.today === prev.today && next.tz === prev.tz ? prev : toClock(next);
      });
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      const msToNextMinute = 60_000 - (Date.now() % 60_000) + 50;
      timer = setTimeout(() => {
        refresh();
        schedule();
      }, msToNextMinute);
    };
    schedule();

    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      clearTimeout(timer);
      refresh();
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
export function readNow(): Now {
  return readClock();
}

