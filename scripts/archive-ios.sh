#!/bin/zsh
# Архив iOS и .ipa для App Store Connect.
#
# Перед запуском: войти в Xcode под учётной записью разработчика (Xcode → Settings → Accounts)
# и узнать Team ID (developer.apple.com/account → Membership details). В App Store Connect должно
# существовать приложение с bundle id из app.json (ios.bundleIdentifier). Если в команде ещё нет
# ни одного устройства, подключите iPhone кабелем — скрипт зарегистрирует его.
#
#   TEAM_ID=ABCDE12345 scripts/archive-ios.sh            # архив и .ipa в build/ios/export
#   TEAM_ID=ABCDE12345 scripts/archive-ios.sh --upload   # то же и сразу загрузить в App Store Connect
#
# Перед каждой новой загрузкой увеличьте ios.buildNumber в app.json.
set -euo pipefail
cd "$(dirname "$0")/.."

: "${TEAM_ID:?Укажите TEAM_ID — идентификатор команды разработчика (10 символов)}"
DESTINATION=export
[[ "${1:-}" == "--upload" ]] && DESTINATION=upload

OUT=build/ios
mkdir -p "$OUT"

if [[ ! -d ios ]]; then
  echo "▸ Генерирую нативный проект (expo prebuild)"
  npx expo prebuild --platform ios --no-install
fi
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
    DEVELOPMENT_TEAM="$TEAM_ID" -allowProvisioningUpdates -allowProvisioningDeviceRegistration \
    | grep -E "error:|BUILD (SUCCEEDED|FAILED)|Registering|provisioning profile" || true
else
  echo "▸ iPhone не подключён; если в команде ещё нет устройств, подпись не удастся"
fi

echo "▸ Архив: $ARCHIVE"
# Автоматическая подпись архива использует профиль разработки, а ему нужно хотя бы одно устройство
# в команде. Поэтому подключите любой iPhone кабелем: флаг -allowProvisioningDeviceRegistration
# зарегистрирует его сам. Для App Store сборка переподписывается на экспорте.
xcodebuild -workspace "$WORKSPACE" -scheme "$SCHEME" -configuration Release \
  -destination 'generic/platform=iOS' -archivePath "$ARCHIVE" -derivedDataPath "$OUT/DerivedData" \
  DEVELOPMENT_TEAM="$TEAM_ID" -allowProvisioningUpdates -allowProvisioningDeviceRegistration archive \
  | grep -E "error:|warning: .*(signing|provisioning)|ARCHIVE (SUCCEEDED|FAILED)" || true
[[ -d "$ARCHIVE" ]] || { echo "Архив не создан, смотрите ошибки выше"; exit 1; }

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
xcodebuild -exportArchive -archivePath "$ARCHIVE" -exportOptionsPlist "$OUT/ExportOptions.plist" \
  -exportPath "$OUT/export" -allowProvisioningUpdates \
  | grep -E "error:|EXPORT (SUCCEEDED|FAILED)|Upload" || true

if [[ "$DESTINATION" == "upload" ]]; then
  echo "Готово: сборка отправлена в App Store Connect, через несколько минут появится в TestFlight."
else
  echo "Готово: $(ls "$OUT"/export/*.ipa 2>/dev/null || echo "ipa не найден, смотрите ошибки выше")"
fi
