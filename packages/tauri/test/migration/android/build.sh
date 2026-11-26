#!/bin/sh
set -eu

fixture=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
destination=${1:?Pass a new absolute output directory}
case "$destination" in
    /*) ;;
    *) echo "Pass a new absolute output directory" >&2; exit 1 ;;
esac

sdk=${ANDROID_HOME:-"$HOME/Library/Android/sdk"}
tools="$sdk/build-tools/36.0.0"
platform="$sdk/platforms/android-36/android.jar"
if [ -n "${JAVA_HOME:-}" ]; then
    export PATH="$JAVA_HOME/bin:$PATH"
fi
mkdir "$destination"
cd "$destination"
mkdir assets classes dex
cp "$fixture/seed.js" assets/seed.js
{
    printf '('
    sed '$s/;$//' "$fixture/../../../src-tauri/native/migration-reader.js"
    printf ')(value => { window.padlocProbeResult = value; });\n'
} > assets/read.js

javac --release 11 -cp "$platform" -d classes "$fixture/Probe.java"
"$tools/d8" --lib "$platform" --min-api 33 --output dex classes/app/padloc/tauri/migrationtest/Probe*.class
keytool -genkeypair -keystore probe.jks -storepass android -keypass android -alias probe \
    -keyalg RSA -keysize 2048 -validity 60 -dname 'CN=Padloc Android Migration Fixture'

for version in 1 2; do
    cat > AndroidManifest.xml <<MANIFEST
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="app.padloc.tauri.migrationtest" android:versionCode="$version" android:versionName="$version">
    <uses-sdk android:minSdkVersion="33" android:targetSdkVersion="36"/>
    <application android:label="Padloc Migration Probe" android:debuggable="true" android:allowBackup="false">
        <activity android:name=".Probe" android:exported="true"/>
    </application>
</manifest>
MANIFEST
    "$tools/aapt2" link -I "$platform" --manifest AndroidManifest.xml -A assets -o "probe-$version-unsigned.apk"
    (cd dex && zip -q "../probe-$version-unsigned.apk" classes.dex)
    "$tools/zipalign" -f 4 "probe-$version-unsigned.apk" "probe-$version-aligned.apk"
    "$tools/apksigner" sign --ks probe.jks --ks-pass pass:android --key-pass pass:android \
        --out "probe-$version.apk" "probe-$version-aligned.apk"
done
