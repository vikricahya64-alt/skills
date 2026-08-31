#!/usr/bin/env bash
#
# Smoke test Agen GCP di emulator Android cloud.
# Dipanggil dari GitHub Actions (android-emulator-runner) sebagai SATU baris,
# karena action tersebut menjalankan setiap baris `script:` sebagai proses
# `sh -c` terpisah (variabel/loop antar-baris tidak bertahan). Dengan menaruh
# seluruh logika di file ini, variabel & loop berfungsi normal.
#
# Argumen: $1 = path APK debug yang akan di-install (default APK debug).
set +e
set -u

ADB="adb -s emulator-5554"
APK="${1:-android/app/build/outputs/apk/debug/app-debug.apk}"
PKG="com.vikri.gcpagent"

echo "=== 1. Device online ==="
for i in $(seq 1 30); do
  $ADB shell true 2>/dev/null && { echo "device online (iter $i)"; break; }
  sleep 3
done

echo "=== 2. Pastikan boot selesai ==="
for i in $(seq 1 60); do
  boot=$($ADB shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')
  [ "$boot" = "1" ] && { echo "BOOT COMPLETED (iter $i)"; break; }
  sleep 3
done
$ADB shell input keyevent 82

echo "=== 3. Push APK ==="
if [ ! -f "$APK" ]; then
  echo "APK TIDAK DITEMUKAN: $APK"
  exit 2
fi
ls -la "$APK"
$ADB push "$APK" /data/local/tmp/app.apk
echo "push exit=$?"

echo "=== 4. Install (retry) ==="
installed=no
for i in 1 2 3 4 5; do
  $ADB shell pm path "$PKG" 2>/dev/null | grep -q "package:" && { installed=yes; echo "already installed"; break; }
  out=$($ADB shell pm install -r -t /data/local/tmp/app.apk 2>&1)
  code=$?
  echo "install attempt $i exit=$code :: $out"
  $ADB shell pm path "$PKG" 2>/dev/null | grep -q "package:" && { installed=yes; break; }
  sleep 3
done
echo "installed=$installed"
[ "$installed" = "yes" ] && echo "APP INSTALLED OK" || echo "APP NOT INSTALLED"

echo "=== 5. Launch ==="
$ADB shell am start -W -n "$PKG/.MainActivity"

echo "=== 6. Verifikasi proses berjalan ==="
running=no
for i in $(seq 1 10); do
  pid=$($ADB shell pidof "$PKG" 2>/dev/null | tr -d '\r')
  [ -n "$pid" ] && { running=yes; echo "APP LAUNCHED OK (pid=$pid)"; break; }
  sleep 5
done
echo "running=$running"

echo "=== 7. Focus & crash check ==="
$ADB shell dumpsys window 2>/dev/null | grep -E "mCurrentFocus|mFocusedApp"
echo "--- logcat ---"
$ADB logcat -d 2>/dev/null | grep -iE "FATAL EXCEPTION|PROCESS DIED|ANR in com.vikri.gcpagent" | head -20

if [ "$installed" != "yes" ] || [ "$running" != "yes" ]; then
  echo "SMOKE RESULT: FAIL"
  exit 1
fi
echo "SMOKE RESULT: PASS"
exit 0
