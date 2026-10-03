import { Redirect } from 'expo-router';

import { useEnabledHabits } from '@/hooks/useEnabledHabits';
import { useAppStore } from '@/store/appStore';

/** Точка входа: без настройки — онбординг, иначе главный экран (на последней открытой привычке). */
export default function Index() {
  const onboarded = useAppStore((s) => s.settings.onboarded);
  const habits = useEnabledHabits();
  return <Redirect href={onboarded && habits.length > 0 ? '/main' : '/onboarding'} />;
}
