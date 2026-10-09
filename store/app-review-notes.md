# Ответ на запрос App Review «Guideline 2.1 — Information Needed»

Apple запрашивает это у всех новых учётных записей разработчиков. Текст ниже отправляется в ответ в разделе «Проверка приложения» и дублируется в поле «Примечания» (Notes) блока «Информация о проверке приложения», чтобы при следующих отправках его не спрашивали снова. К ответу прикладывается видео с настоящего iPhone (см. инструкцию в конце).

## Текст ответа (на английском)

Thank you for reviewing Clean Count («Чистый счёт»). Below is the requested information.

1. Screen recording. A recording captured on an iPhone 14 Pro Max running the latest iOS is attached. It starts with launching the app and shows the typical flow: onboarding (choosing habits and the quit date), the main counter screen for both habits, logging a relapse and undoing it, the relapse calendar, the achievements screen and the settings screen. The app has no account registration, login or account deletion (there are no accounts), no user-generated content that is shared with other users (notes are private and stored only on the device), and no paid content or features.

2. Purpose and target audience. Clean Count is a personal sobriety counter for adults who are quitting alcohol and/or smoking. It counts the days since the user's chosen quit date, lets the user log relapses (type, date, optional private note), shows relapses in a calendar and marks progress milestones (5, 10, 14, 21, 30 days and so on). The value it provides is a calm, non-judgmental record of progress: a relapse restarts the current clean streak, but the total day count and earned milestones are kept. The interface is in Russian and the app is aimed at Russian-speaking users. The app is not a medical device and does not provide treatment or medical advice.

3. Setup and access. No login, credentials, demo account or sample files are needed. On first launch the user chooses one or both habits (alcohol, smoking), picks the quit date (any past date) and an optional time, and taps «Начать» (Start). The main screen shows the total day count, clean days, days since the last relapse and the next goal. The «Был срыв» (Relapse) button opens the relapse form. The calendar icon opens the relapse calendar, the trophy icon opens achievements, and the sliders icon opens settings (change quit dates, exclude data from iCloud backup, reset all data).

4. External services. None. The app makes no network requests at all. It uses no analytics, advertising, authentication, payment, AI or data-provider services, and no third-party SDKs that collect data. All data is stored locally on the device in an SQLite database. The app is built with the open-source Expo / React Native framework.

5. Regional differences. None. The app works identically in all regions; the only interface language is Russian.

6. Regulated industry and third-party material. Not applicable. The app does not provide medical or addiction-treatment services, contains no protected third-party content, and all texts, icons and graphics are original work.

## Текст для поля «Примечания» (Notes)

Clean Count («Чистый счёт») is a personal sobriety counter for adults quitting alcohol and/or smoking. No accounts, no login, no network requests, no third-party services, no paid content; all data is stored locally on the device. UI language: Russian. To test: on first launch choose a habit, pick a past quit date, tap «Начать»; then use «Был срыв» to log a relapse, the calendar icon for the relapse calendar, the trophy icon for achievements and the sliders icon for settings. The app functions identically in all regions. A screen recording was provided in the App Review conversation.

## Как записать видео

1. На iPhone друга удалить приложение, если оно установлено, и поставить его заново из TestFlight, чтобы в записи был виден первый запуск с настройкой.
2. Настройки iPhone → «Пункт управления» → добавить «Запись экрана».
3. Открыть Пункт управления, нажать запись, через три секунды выйти на домашний экран и запустить «Чистый счёт».
4. Пройти настройку: обе привычки, дата отказа в прошлом, «Начать». На главном экране свайпнуть на вторую привычку и обратно. Нажать «Был срыв», выбрать тип, записать, нажать «Отменить». Открыть календарь, нажать на день, вернуться. Открыть достижения, вернуться. Открыть настройки, показать переключатель бэкапа, вернуться.
5. Остановить запись (красный индикатор вверху → «Остановить»). Видео 1–2 минуты в Фото. Говорить ничего не нужно.

## Как отправить

1. App Store Connect → «Чистый счёт» → «Проверка приложения» → открыть сообщение от Apple → «Ответить».
2. Вставить «Текст ответа», прикрепить видео (скрепка), отправить.
3. На странице версии 1.0 → блок «Информация о проверке приложения» → поле «Примечания» → вставить «Текст для поля Примечания», «Сохранить».
4. Если версия уже стоит в очереди, больше ничего нажимать не нужно: ответ попадёт в текущую проверку.
