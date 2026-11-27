#!/bin/sh
set -eu
# Keep Android development settings local to this invocation.
if [ -z "${JAVA_HOME:-}" ]; then
    if [ -x "/Applications/Android Studio.app/Contents/jbr/Contents/Home/bin/java" ]; then
        JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
    else
        JAVA_HOME="/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home"
    fi
fi
export JAVA_HOME
export ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
if [ ! -x "$JAVA_HOME/bin/java" ]; then
    echo "Android Java runtime missing. Install Android Studio or set JAVA_HOME." >&2
    exit 1
fi
if [ ! -d "$ANDROID_HOME" ]; then
    echo "Android SDK missing. Install it with Android Studio or set ANDROID_HOME." >&2
    exit 1
fi
if [ -z "${NDK_HOME:-}" ]; then
    ndk_version=$(ls -1 "$ANDROID_HOME/ndk" 2>/dev/null | sort -V | tail -1)
    if [ -z "$ndk_version" ]; then
        echo "Android NDK missing. Install NDK (Side by side) or set NDK_HOME." >&2
        exit 1
    fi
    export NDK_HOME="$ANDROID_HOME/ndk/$ndk_version"
fi
if [ ! -f "$NDK_HOME/source.properties" ]; then
    echo "Android NDK installation is missing or incomplete: $NDK_HOME" >&2
    exit 1
fi
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH"
# The generated project is ignored; restore our activity on every build/dev run.
android_activity="src-tauri/gen/android/app/src/main/java/app/padloc/MainActivity.kt"
if [ "${1:-}" != "init" ]; then
    if [ ! -f "$android_activity" ]; then
        echo "Android project missing or uses an old app identifier. Run npm run android:init first." >&2
        exit 1
    fi
    cp android/MainActivity.kt "$android_activity"
fi
if [ "${1:-}" = "build" ]; then
    shift
    # Preserve Cordova's Android version codes, with two digits each for minor, patch and build.
    version_config=$(node -e '
        require("dotenv").config();
        const { major, minor, patch } = require("semver").parse(process.env.PL_VENDOR_VERSION || require("./package.json").version);
        const build = process.env.RELEASE_BUILD ?? "0";
        if (!/^\d{1,2}$/.test(build)) throw new Error("RELEASE_BUILD must be one or two digits (0 to 99).");
        if (minor > 99 || patch > 99) throw new Error("Android minor and patch versions must be at most 99.");
        const versionCode = major * 1_000_000 + minor * 10_000 + patch * 100 + Number(build);
        if (versionCode === 0) throw new Error("Android version code must be positive.");
        if (versionCode > 2_100_000_000) throw new Error("Android version code exceeds the Play Store limit.");
        console.log(JSON.stringify({ bundle: { android: { versionCode } } }));
    ')
    exec npm run tauri -- android build --config "$version_config" "$@"
fi
exec npm run tauri -- android "$@"
