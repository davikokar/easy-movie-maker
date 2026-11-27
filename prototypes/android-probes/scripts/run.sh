#!/usr/bin/env bash
# Usage: scripts/run.sh <7.2|7.3|7.4|7.5> [--no-build]. Builds, installs, launches one probe, pulls its result.
set -euo pipefail
cd "$(dirname "$0")/.."

PROBE="${1:?probe id, for example 7.2}"
export JAVA_HOME="C:/Program Files/Android/Android Studio/jbr"
export ANDROID_HOME="${ANDROID_HOME:-$LOCALAPPDATA/Android/Sdk}"
ADB_EXE="$ANDROID_HOME/platform-tools/adb.exe"
adb() { MSYS_NO_PATHCONV=1 "$ADB_EXE" "$@"; }
PKG=dev.moviemaker.probes
REMOTE="/sdcard/Android/data/$PKG/files/results/$PROBE-result.json"
TIMEOUT_S="${TIMEOUT_S:-300}"

if [[ "${2:-}" != "--no-build" ]]; then
  pnpm build:web >/dev/null
  npx cap sync android >/dev/null
  (cd android && ./gradlew.bat assembleDebug --console=plain -q)
  adb install -r android/app/build/outputs/apk/debug/app-debug.apk >/dev/null
fi

adb shell input keyevent KEYCODE_WAKEUP
adb shell wm dismiss-keyguard
adb shell rm -f "$REMOTE"
adb shell am force-stop "$PKG"
adb logcat -c
adb shell am start -n "$PKG/.MainActivity" --es probe "$PROBE" >/dev/null

mkdir -p "results"
SAMPLER_PID=""
if [[ -n "${SAMPLE_RSS:-}" ]]; then
  # Device-side loop: epoch seconds and the largest WebView renderer RSS in KB, twice a second.
  adb shell "for i in \$(seq 1 $((TIMEOUT_S * 2))); do echo \"\$(date +%s) \$(ps -A -o RSS,NAME | grep sandboxed_process | sort -n | tail -1 | cut -d' ' -f1)\"; toybox sleep 0.5; done" > "results/$PROBE-renderer-rss.txt" 2>/dev/null &
  SAMPLER_PID=$!
  trap '[[ -n "$SAMPLER_PID" ]] && kill "$SAMPLER_PID" 2>/dev/null || true' EXIT
fi
for ((i = 0; i < TIMEOUT_S / 3; i++)); do
  if adb shell ls "$REMOTE" >/dev/null 2>&1; then
    adb pull "$REMOTE" "results/$PROBE-result.json" >/dev/null
    echo "Pulled results/$PROBE-result.json"
    exit 0
  fi
  adb shell "toybox sleep 3"
done
echo "Timed out after ${TIMEOUT_S}s. Last app log lines:" >&2
adb logcat -d -s Capacitor/Console | tail -15 >&2
exit 1
