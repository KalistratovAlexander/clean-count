#!/bin/zsh
# Архив iOS и .ipa для App Store Connect.
#
# Подпись — одним из двух способов:
#   1) В Xcode выполнен вход в учётную запись из команды разработчика (Xcode → Settings → Accounts),
#      и у этой записи в команде роль Admin или Account Holder.
#   2) Ключ App Store Connect API (надёжнее, не зависит от входа в Xcode): в App Store Connect →
#      Пользователи и доступ → Интеграции → Ключи API (доступ Admin) создайте ключ, скачайте
#      AuthKey_XXXXXXXXXX.p8 и запомните Key ID и Issuer ID. Файл храните вне репозитория.
#      Передайте: ASC_KEY_PATH=/путь/AuthKey_XXXXXXXXXX.p8 ASC_KEY_ID=XXXXXXXXXX ASC_ISSUER_ID=<uuid>
#
# Team ID — developer.apple.com/account → Membership details. В App Store Connect должно
# существовать приложение с bundle id из app.json (ios.bundleIdentifier). Если в команде ещё нет
# ни одного устройства, подключите iPhone кабелем — скрипт зарегистрирует его.
#
#   TEAM_ID=ABCDE12345 scripts/archive-ios.sh            # архив и .ipa в build/ios/export
#   TEAM_ID=ABCDE12345 scripts/archive-ios.sh --upload   # то же и сразу загрузить в App Store Connect
#
# Перед каждой новой загрузкой увеличьте ios.buildNumber в app.json. Нативный проект ios/
# пересоздаётся из app.json при каждом запуске, чтобы версия и номер сборки были актуальными.
set -euo pipefail
cd "$(dirname "$0")/.."

: "${TEAM_ID:?Укажите TEAM_ID — идентификатор команды разработчика (10 символов)}"
DESTINATION=export
[[ "${1:-}" == "--upload" ]] && DESTINATION=upload

# Ключ App Store Connect API, если задан: xcodebuild сам выпустит сертификат и профиль.
AUTH=()
if [[ -n "${ASC_KEY_PATH:-}" ]]; then
  : "${ASC_KEY_ID:?Вместе с ASC_KEY_PATH укажите ASC_KEY_ID}"
  : "${ASC_ISSUER_ID:?Вместе с ASC_KEY_PATH укажите ASC_ISSUER_ID}"
  [[ -f "$ASC_KEY_PATH" ]] || { echo "Ключ не найден: $ASC_KEY_PATH"; exit 1; }
  AUTH=(-authenticationKeyPath "$ASC_KEY_PATH" -authenticationKeyID "$ASC_KEY_ID" -authenticationKeyIssuerID "$ASC_ISSUER_ID")
  echo "▸ Подпись через ключ App Store Connect API ($ASC_KEY_ID)"
fi

OUT=build/ios
mkdir -p "$OUT"

echo "▸ Пересоздаю нативный проект из app.json (expo prebuild --clean)"
npx expo prebuild --platform ios --clean --no-install >/dev/null
echo "▸ pod install"
(cd ios && pod install --silent 2>/dev/null)

WORKSPACE=$(ls -d ios/*.xcworkspace | head -1)
SCHEME=$(basename "$WORKSPACE" .xcworkspace)
ARCHIVE="$OUT/$SCHEME.xcarchive"

# Архиву нужен профиль разработки, а его Apple выдаёт только команде хотя бы с одним устройством.
# Если iPhone подключён кабелем, сначала делаем обычную сборку под него: этот шаг регистрирует
# телефон в команде и выпускает профиль. Архивация сама устройства не регистрирует.
DEVICE_UDID=$(xcrun devicectl list devices 2>/dev/null | awk '/physical/ && /connected/ { for (i = 1; i <= NF; i++) if ($(i+1) == "(UDID)") print $i; exit }')
if [[ -n "$DEVICE_UDID" ]]; then
  echo "▸ Подключён iPhone ($DEVICE_UDID): регистрирую в команде и выпускаю профиль разработки"
  xcodebuild build -workspace "$WORKSPACE" -scheme "$SCHEME" -configuration Release \
    -destination "id=$DEVICE_UDID" -derivedDataPath "$OUT/DerivedData" \
    DEVELOPMENT_TEAM="$TEAM_ID" -allowProvisioningUpdates -allowProvisioningDeviceRegistration "${AUTH[@]}" \
    | grep -E "error:|BUILD (SUCCEEDED|FAILED)|Registering|provisioning profile" || true
else
  echo "▸ iPhone не подключён; если в команде ещё нет устройств, подпись не удастся"
fi

echo "▸ Архив: $ARCHIVE"
# Автоматическая подпись архива использует профиль разработки, а ему нужно хотя бы одно устройство
# в команде. Поэтому подключите любой iPhone кабелем: флаг -allowProvisioningDeviceRegistration
# зарегистрирует его сам. Для App Store сборка переподписывается на экспорте.
rm -rf "$ARCHIVE"
xcodebuild -workspace "$WORKSPACE" -scheme "$SCHEME" -configuration Release \
  -destination 'generic/platform=iOS' -archivePath "$ARCHIVE" -derivedDataPath "$OUT/DerivedData" \
  DEVELOPMENT_TEAM="$TEAM_ID" -allowProvisioningUpdates -allowProvisioningDeviceRegistration "${AUTH[@]}" archive \
  | grep -E "error:|warning: .*(signing|provisioning)|ARCHIVE (SUCCEEDED|FAILED)" || true
[[ -d "$ARCHIVE" ]] || { echo "Архив не создан, смотрите ошибки выше"; exit 1; }
echo "▸ В архиве: версия $(plutil -extract ApplicationProperties.CFBundleShortVersionString raw -o - "$ARCHIVE/Info.plist"), сборка $(plutil -extract ApplicationProperties.CFBundleVersion raw -o - "$ARCHIVE/Info.plist")"

cat > "$OUT/ExportOptions.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>method</key><string>app-store-connect</string>
  <key>destination</key><string>$DESTINATION</string>
  <key>teamID</key><string>$TEAM_ID</string>
  <key>signingStyle</key><string>automatic</string>
  <key>uploadSymbols</key><true/>
  <key>manageAppVersionAndBuildNumber</key><false/>
</dict>
</plist>
PLIST

echo "▸ Экспорт ($DESTINATION)"
rm -rf "$OUT/export"
EXPORT_LOG="$OUT/export.log"
set +e
xcodebuild -exportArchive -archivePath "$ARCHIVE" -exportOptionsPlist "$OUT/ExportOptions.plist" \
  -exportPath "$OUT/export" -allowProvisioningUpdates "${AUTH[@]}" >"$EXPORT_LOG" 2>&1
EXPORT_STATUS=$?
set -e
grep -E "error:|EXPORT (SUCCEEDED|FAILED)|Upload" "$EXPORT_LOG" | sort -u || true
if [[ $EXPORT_STATUS -ne 0 ]]; then
  echo "Экспорт не удался (полный лог: $EXPORT_LOG)."
  if grep -q "No Account for Team" "$EXPORT_LOG"; then
    echo "Xcode не видит учётную запись из команды $TEAM_ID. Войдите в Xcode → Settings → Accounts"
    echo "под участником команды с ролью Admin или используйте ключ App Store Connect API (см. шапку скрипта)."
  fi
  exit 1
fi

if [[ "$DESTINATION" == "upload" ]]; then
  echo "Готово: сборка отправлена в App Store Connect, через 10–30 минут появится в TestFlight."
else
  echo "Готово: $(ls "$OUT"/export/*.ipa)"
fi
