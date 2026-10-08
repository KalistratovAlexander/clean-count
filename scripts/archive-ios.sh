#!/bin/zsh
# Архив iOS и .ipa для App Store Connect.
#
# Перед запуском: войти в Xcode под учётной записью разработчика (Xcode → Settings → Accounts)
# и узнать Team ID (developer.apple.com/account → Membership details). В App Store Connect должно
# существовать приложение с bundle id из app.json (ios.bundleIdentifier).
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
(cd ios && pod install --silent)

WORKSPACE=$(ls -d ios/*.xcworkspace | head -1)
SCHEME=$(basename "$WORKSPACE" .xcworkspace)
ARCHIVE="$OUT/$SCHEME.xcarchive"

echo "▸ Архив: $ARCHIVE"
xcodebuild -workspace "$WORKSPACE" -scheme "$SCHEME" -configuration Release \
  -destination 'generic/platform=iOS' -archivePath "$ARCHIVE" \
  DEVELOPMENT_TEAM="$TEAM_ID" -allowProvisioningUpdates archive \
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
