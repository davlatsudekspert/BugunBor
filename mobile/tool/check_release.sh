#!/usr/bin/env bash
# Checks a built release APK: package id, only allowed permissions, (when the
# upload key was used) a non-debug signature, and (given a CPU type) native
# libraries for that type only, with the app's own among them.
set -euo pipefail
apk="$1"
abi="${2:-}"
build_tools=$(ls -d "$ANDROID_HOME"/build-tools/* | sort -V | tail -1)
aapt2="$build_tools/aapt2"
apksigner="$build_tools/apksigner"
here=$(cd "$(dirname "$0")/.." && pwd)

package=$("$aapt2" dump packagename "$apk")
[ "$package" = "uz.bugunbor.app" ] || { echo "wrong package: $package"; exit 1; }

allowed=$(grep -v '^#' "$here/android/permissions.txt" | sed '/^$/d' | sort)
actual=$("$aapt2" dump permissions "$apk" | sed -n "s/^uses-permission: name='\(.*\)'.*/\1/p" | sort)
extra=$(comm -13 <(echo "$allowed") <(echo "$actual"))
if [ -n "$extra" ]; then
  echo "Permissions not in android/permissions.txt:"; echo "$extra"; exit 1
fi
echo "Permissions OK:"; echo "$actual"

certs=$("$apksigner" verify --print-certs "$apk")
if [ "${EXPECT_UPLOAD_KEY:-false}" = "true" ] && echo "$certs" | grep -q "CN=Android Debug"; then
  echo "Release APK is signed with the debug key"; exit 1
fi
echo "$certs" | grep "Signer #1 certificate DN" || true

if [ -n "$abi" ]; then
  files=$(unzip -Z1 "$apk")
  types=$(sed -n 's#^lib/\([^/]*\)/.*#\1#p' <<< "$files" | sort -u)
  [ "$types" = "$abi" ] || { echo "Native libraries for other CPU types than $abi:"; echo "$types"; exit 1; }
  for lib in libflutter.so libapp.so; do
    grep -qx "lib/$abi/$lib" <<< "$files" || { echo "lib/$abi/$lib is missing"; exit 1; }
  done
  echo "Native libraries: $abi only"
fi
