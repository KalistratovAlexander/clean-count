import type { Language } from '@/domain/types';
import { useAppStore } from '@/store/appStore';

/**
 * Текущий язык интерфейса. Вызывать в каждом экране: подписка на стор перерисовывает
 * экран при смене языка, а строки берутся из `t`, которая уже переключена.
 */
export function useLanguage(): Language {
  return useAppStore((s) => s.settings.language);
}
