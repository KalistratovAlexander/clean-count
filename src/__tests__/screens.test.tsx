import { act, fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import type { Habit, Relapse } from '@/domain/types';
import { ClockProvider } from '@/hooks/clock';
import { useAppStore } from '@/store/appStore';

import CalendarScreen from '@/app/calendar';
import MainScreen from '@/app/main';
import OnboardingScreen from '@/app/onboarding';

jest.mock('@/db/repo', () => ({
  loadSnapshot: jest.fn(),
  saveHabit: jest.fn(() => Promise.resolve()),
  completeOnboarding: jest.fn(() => Promise.resolve()),
  insertRelapse: jest.fn(() => Promise.resolve()),
  deleteRelapse: jest.fn(() => Promise.resolve()),
  saveSetting: jest.fn(() => Promise.resolve()),
  resetAll: jest.fn(() => Promise.resolve()),
}));
jest.mock('@/db/database', () => ({ isExcludedFromBackup: () => false }));

let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), dismissAll: jest.fn() },
  useLocalSearchParams: () => mockParams,
  Redirect: ({ href }: { href: string }) => {
    const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
    return <Text>{`redirect:${href}`}</Text>;
  },
}));

const repo = jest.requireMock<Record<string, jest.Mock>>('@/db/repo');
const mockRouter = jest.requireMock<{ router: Record<string, jest.Mock> }>('expo-router').router;

const METRICS = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } };

async function renderScreen(ui: ReactElement) {
  return render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <ClockProvider>{ui}</ClockProvider>
    </SafeAreaProvider>,
  );
}

// Данные из примера ТЗ: отказ от алкоголя 3 марта, три срыва, «сегодня» — 28 сентября 2026, 05:17 МСК.
const alcohol: Habit = {
  id: 'alcohol',
  enabled: true,
  quitAt: '2026-03-03T00:00:00+03:00',
  milestonesShown: [1, 3, 7, 14, 30],
};
const smoking: Habit = {
  id: 'smoking',
  enabled: true,
  quitAt: '2026-08-10T00:00:00+03:00',
  milestonesShown: [1, 3, 7, 14, 30],
};
const relapses: Relapse[] = [
  { id: 'a', habitId: 'alcohol', date: '2026-04-10', createdAt: '2026-04-10T22:00:00+03:00', kind: 'strong', count: 1, note: null },
  { id: 'b', habitId: 'alcohol', date: '2026-06-05', createdAt: '2026-06-06T09:00:00+03:00', kind: 'light', count: 1, note: null },
  { id: 'c', habitId: 'alcohol', date: '2026-08-16', createdAt: '2026-08-18T10:00:00+03:00', kind: 'light', count: 1, note: 'День рождения друга' },
  { id: 'd', habitId: 'smoking', date: '2026-08-16', createdAt: '2026-08-16T20:00:00+03:00', kind: 'cigarette', count: 2, note: null },
  { id: 'e', habitId: 'smoking', date: '2026-08-23', createdAt: '2026-08-24T09:00:00+03:00', kind: 'hookah', count: 1, note: null },
];

function seed(habits: { alcohol: Habit; smoking: Habit }, list: Relapse[] = relapses) {
  useAppStore.setState({
    status: 'ready',
    habits,
    relapses: list,
    settings: { onboarded: true, lastScreen: 'alcohol', excludeFromBackup: false },
  });
}

beforeEach(() => {
  jest.useFakeTimers({ now: new Date('2026-09-28T05:17:00+03:00') });
  jest.clearAllMocks();
  mockParams = {};
});

afterEach(() => {
  jest.useRealTimers();
});

describe('главный экран', () => {
  it('показывает показатели по правилам ТЗ', async () => {
    seed({ alcohol, smoking });
    await renderScreen(<MainScreen />);

    expect(screen.getByText('42')).toBeTruthy();
    expect(screen.getByText('5 ч 17 мин · с 17 августа', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.getAllByText('Цель: 60 дней')).toHaveLength(2);
    expect(screen.getByText('ещё 18')).toBeTruthy();
    expect(screen.getByText('ещё 25')).toBeTruthy();
    expect(screen.getByText('209')).toBeTruthy();
    expect(screen.getByText('дней с начала, 3 марта')).toBeTruthy();
    expect(screen.getByText('206')).toBeTruthy();
    expect(screen.getByText('Крепкое · 1')).toBeTruthy();
    expect(screen.getByText('Некрепкое · 2')).toBeTruthy();
    // Для курения — только встречавшиеся виды.
    expect(screen.getByText('35')).toBeTruthy();
    expect(screen.getByText('Сигарета · 1')).toBeTruthy();
    expect(screen.getByText('Кальян · 1')).toBeTruthy();
    expect(screen.queryByText('Вейп · 0')).toBeNull();
    // Переключатель виден, когда включены обе привычки.
    expect(screen.getAllByRole('tab')).toHaveLength(2);
  });

  it('с одной привычкой переключатель скрыт', async () => {
    seed({ alcohol, smoking: { ...smoking, enabled: false } });
    await renderScreen(<MainScreen />);
    expect(screen.queryAllByRole('tab')).toHaveLength(0);
    expect(screen.getByText('Чистый счёт')).toBeTruthy();
  });

  it('без срывов показывает «Срывов нет»', async () => {
    seed({ alcohol, smoking }, []);
    await renderScreen(<MainScreen />);
    expect(screen.getAllByText('Срывов нет').length).toBeGreaterThan(0);
  });

  it('запись срыва и отмена в течение 5 секунд', async () => {
    seed({ alcohol, smoking });
    await renderScreen(<MainScreen />);

    await fireEvent.press(screen.getByText('Был срыв'));
    expect(screen.getByText('Записать срыв')).toBeTruthy();
    expect(screen.getByText(/206 чистых дней/)).toBeTruthy();

    // Тип не выбран — «Записать» неактивна.
    const save = screen.getByRole('button', { name: 'Записать' });
    expect(save).toBeDisabled();

    await fireEvent.press(screen.getByRole('radio', { name: 'Крепкое, водка, коньяк, виски' }));
    await fireEvent.changeText(screen.getByLabelText('Заметка'), 'Праздник');
    await fireEvent.press(screen.getByRole('button', { name: 'Записать' }));

    expect(repo.insertRelapse).toHaveBeenCalledWith(
      expect.objectContaining({ habitId: 'alcohol', kind: 'strong', date: '2026-09-28', note: 'Праздник', count: 1 }),
    );
    expect(screen.getByText('Крепкое · 2')).toBeTruthy();
    expect(screen.getByText('Срыв записан')).toBeTruthy();
    // Срыв сегодня: серия обнуляется с момента записи.
    expect(screen.getByText('0 ч 00 мин · с 28 сентября', { includeHiddenElements: true })).toBeTruthy();

    await fireEvent.press(screen.getByText('Отменить'));
    expect(repo.deleteRelapse).toHaveBeenCalled();
    expect(screen.getByText('Крепкое · 1')).toBeTruthy();
    expect(screen.getByText('42')).toBeTruthy();
  });

  it('сообщение о записи пропадает через 5 секунд', async () => {
    seed({ alcohol, smoking });
    await renderScreen(<MainScreen />);
    await fireEvent.press(screen.getByText('Был срыв'));
    await fireEvent.press(screen.getByRole('radio', { name: 'Некрепкое, пиво, вино, сидр' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Записать' }));
    expect(screen.getByText('Срыв записан')).toBeTruthy();
    await act(async () => {
      jest.advanceTimersByTime(5100);
    });
    expect(screen.queryByText('Срыв записан')).toBeNull();
  });

  it('поздравляет с непоказанной вехой один раз', async () => {
    seed({ alcohol: { ...alcohol, milestonesShown: [] }, smoking });
    await renderScreen(<MainScreen />);
    expect(screen.getByText('Новая веха!')).toBeTruthy();
    expect(screen.getByText('30')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: /Новая веха!/ }));
    expect(repo.saveHabit).toHaveBeenCalledWith(expect.objectContaining({ id: 'alcohol', milestonesShown: [1, 3, 7, 14, 30] }));
    expect(screen.queryByText('Новая веха!')).toBeNull();
  });
});

describe('календарь', () => {
  it('открывается на текущем месяце с фильтром экрана', async () => {
    seed({ alcohol, smoking });
    mockParams = { filter: 'smoking' };
    await renderScreen(<CalendarScreen />);
    expect(screen.getByText('Сентябрь 2026')).toBeTruthy();
    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(3);
    expect(tabs[2]!).toBeSelected();
    // Сегодня выбран по умолчанию.
    expect(screen.getByText('28 сентября, понедельник')).toBeTruthy();
    expect(screen.getByText('Чистый день, срывов не было.')).toBeTruthy();
  });

  it('показывает срывы дня и удаляет запись по долгому нажатию', async () => {
    jest.setSystemTime(new Date('2026-08-25T12:00:00+03:00'));
    seed({ alcohol, smoking });
    await renderScreen(<CalendarScreen />);
    expect(screen.getByText('Август 2026')).toBeTruthy();

    await fireEvent.press(screen.getByLabelText('16 августа, срывы по алкоголю и курению'));
    expect(screen.getByText('16 августа, воскресенье')).toBeTruthy();
    expect(screen.getByText('Алкоголь · некрепкое')).toBeTruthy();
    expect(screen.getByText('День рождения друга')).toBeTruthy();
    expect(screen.getByText('Курение · сигарета ×2')).toBeTruthy();

    const { Alert } = jest.requireActual<typeof import('react-native')>('react-native');
    const alert = jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, buttons) => {
      buttons?.find((b) => b.style === 'destructive')?.onPress?.();
    });
    await fireEvent(screen.getByLabelText('Алкоголь · некрепкое. День рождения друга'), 'longPress');
    expect(alert).toHaveBeenCalled();
    expect(repo.deleteRelapse).toHaveBeenCalledWith('c');
    expect(screen.queryByText('Алкоголь · некрепкое')).toBeNull();
    alert.mockRestore();
  });

  it('стрелки листают месяцы в пределах от даты отказа до текущего', async () => {
    seed({ alcohol, smoking });
    await renderScreen(<CalendarScreen />);
    expect(screen.getByLabelText('Следующий месяц')).toBeDisabled();
    await fireEvent.press(screen.getByLabelText('Предыдущий месяц'));
    expect(screen.getByText('Август 2026')).toBeTruthy();
    expect(screen.getByText('Выберите день')).toBeTruthy();
    for (let i = 0; i < 10; i++) await fireEvent.press(screen.getByLabelText('Предыдущий месяц'));
    expect(screen.getByText('Март 2026')).toBeTruthy();
    expect(screen.getByLabelText('Предыдущий месяц')).toBeDisabled();
  });

  it('итог месяца учитывает фильтр', async () => {
    jest.setSystemTime(new Date('2026-08-25T12:00:00+03:00'));
    seed({ alcohol, smoking });
    mockParams = { filter: 'alcohol' };
    await renderScreen(<CalendarScreen />);
    expect(screen.getByLabelText('1 срыв по алкоголю за месяц')).toBeTruthy();
    expect(screen.queryByLabelText(/по курению за месяц/)).toBeNull();
  });
});

describe('первый запуск', () => {
  it('настройка за три экрана', async () => {
    useAppStore.setState({
      status: 'ready',
      habits: {
        alcohol: { id: 'alcohol', enabled: false, quitAt: null, milestonesShown: [] },
        smoking: { id: 'smoking', enabled: false, quitAt: null, milestonesShown: [] },
      },
      relapses: [],
      settings: { onboarded: false, lastScreen: null, excludeFromBackup: false },
    });
    await renderScreen(<OnboardingScreen />);

    expect(screen.getByText('Считаем дни без алкоголя и курения. Срыв не обнуляет ваш прогресс.')).toBeTruthy();
    await fireEvent.press(screen.getByText('Начать'));

    const next = screen.getByRole('button', { name: 'Далее' });
    expect(next).toBeDisabled();
    await fireEvent.press(screen.getByRole('switch', { name: /^Курение/ }));
    await fireEvent.press(screen.getByRole('button', { name: 'Далее' }));

    expect(screen.getByText('Когда вы отказались?')).toBeTruthy();
    expect(screen.getByText('28 сентября 2026')).toBeTruthy();
    await fireEvent.press(screen.getByText('Готово'));

    expect(repo.completeOnboarding).toHaveBeenCalledWith([
      expect.objectContaining({ id: 'alcohol', enabled: false, quitAt: null }),
      expect.objectContaining({ id: 'smoking', enabled: true, quitAt: '2026-09-28T00:00:00+03:00' }),
    ]);
    expect(mockRouter.replace).toHaveBeenCalledWith('/main');
    expect(useAppStore.getState().settings.lastScreen).toBe('smoking');
  });
});
