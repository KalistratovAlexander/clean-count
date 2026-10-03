import { fonts } from './index';

/**
 * Шрифты вшиты в бандл приложения — сеть не нужна. Подключаем только нужные
 * начертания, чтобы не раздувать размер и время холодного старта.
 */
export const fontAssets = {
  [fonts.display700]: require('@expo-google-fonts/unbounded/700Bold/Unbounded_700Bold.ttf'),
  [fonts.display800]: require('@expo-google-fonts/unbounded/800ExtraBold/Unbounded_800ExtraBold.ttf'),
  [fonts.text400]: require('@expo-google-fonts/golos-text/400Regular/GolosText_400Regular.ttf'),
  [fonts.text500]: require('@expo-google-fonts/golos-text/500Medium/GolosText_500Medium.ttf'),
  [fonts.text600]: require('@expo-google-fonts/golos-text/600SemiBold/GolosText_600SemiBold.ttf'),
  [fonts.text700]: require('@expo-google-fonts/golos-text/700Bold/GolosText_700Bold.ttf'),
};
