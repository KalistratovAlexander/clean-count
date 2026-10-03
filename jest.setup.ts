/* eslint-disable @typescript-eslint/no-require-imports */
import 'react-native-gesture-handler/jestSetup';

jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));
jest.mock('react-native-worklets', () => require('react-native-worklets/lib/module/mock'));

jest.mock('react-native-pager-view', () => {
  const React = require('react');
  const { View } = require('react-native');
  // Пейджер в тестах — просто все страницы подряд; setPage вызывает onPageSelected.
  return React.forwardRef(function PagerView(
    props: { children: React.ReactNode; onPageSelected?: (e: unknown) => void },
    ref: React.Ref<unknown>,
  ) {
    React.useImperativeHandle(ref, () => ({
      setPage: (position: number) => props.onPageSelected?.({ nativeEvent: { position } }),
    }));
    return React.createElement(View, { testID: 'pager' }, props.children);
  });
});

jest.mock('expo-localization', () => ({
  getCalendars: () => [{ timeZone: 'Europe/Moscow', calendar: 'gregory', firstWeekday: 2, uses24hourClock: true }],
  getLocales: () => [{ languageTag: 'ru-RU', languageCode: 'ru' }],
}));

jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn(() => Promise.resolve()),
  impactAsync: jest.fn(() => Promise.resolve()),
  NotificationFeedbackType: { Success: 'success' },
  ImpactFeedbackStyle: { Medium: 'medium' },
}));

jest.mock('expo-crypto', () => {
  let n = 0;
  return { randomUUID: () => `uuid-${++n}` };
});
