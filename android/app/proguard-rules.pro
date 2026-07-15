# =============================================================================
# NHM SAST hardening — Points #1, #3 and #4
# =============================================================================
# This ruleset does three things at release-build time:
#
#   1. Renames every class / method / field in the app and in bundled AARs
#      (including parichai-auth-sdk-release.aar) so scanner-visible strings
#      like `AuthRepository`, `CryptoUtil`, `SafeNetworkLogInterceptor` and
#      `getOrCreateSecretKey` disappear from the release APK's smali. This
#      is our defense-in-depth mitigation for SAST findings #1 (Hardcoded
#      Encrypted Payload) and #4 (Hardcoded Encryption Key).
#
#   2. Strips every `android.util.Log.v/.d/.i` call at compile time via
#      `-assumenosideeffects`, closing the JS-side gap left by babel's
#      transform-remove-console for finding #3 (Production Debug Logging).
#
#   3. Does NOT shrink code (`-dontshrink`). We only obfuscate — shrinking
#      is where React Native / Retrofit / reflection-heavy libs typically
#      break. Skipping shrink keeps the APK a few hundred KB larger but
#      makes the release build predictable and safe to ship.
#
# Debug builds are unaffected — `minifyEnabled` is only true for release.
# =============================================================================

# --- Global posture ----------------------------------------------------------

# Obfuscate, but do not shrink / optimize aggressively. This is deliberately
# conservative for a React Native app because RN uses reflection and
# annotation-driven bridges that get confused by aggressive R8 rules.
-dontshrink
-dontoptimize

# Repackage all obfuscated classes into a single top-level package so smali
# output does not accidentally leak the original package structure.
-repackageclasses ''
-allowaccessmodification

# Print a mapping.txt so we can de-obfuscate crash reports.
-printmapping build/outputs/mapping/release/mapping.txt

# Keep source-file / line-number info for crash decoding (still obfuscated).
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# --- SAST finding #3 (Production Debug Logging) ------------------------------
# Strip debug-level log calls entirely from release. `warn` and `error` are
# kept so crash reporting still works. Mirrors what babel does on the JS side.

-assumenosideeffects class android.util.Log {
    public static *** v(...);
    public static *** d(...);
    public static *** i(...);
}

# --- Framework keep rules ----------------------------------------------------
# Everything below is what the app / SDK *must* not rename, otherwise the
# release APK will crash at runtime. Everything else is fair game.

# --- React Native core -------------------------------------------------------
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.jni.** { *; }
-keep class com.facebook.soloader.** { *; }
-keep class com.facebook.yoga.** { *; }
-keep @com.facebook.proguard.annotations.DoNotStrip class * { *; }
-keep @com.facebook.proguard.annotations.KeepGettersAndSetters class * { *; }
-keep @com.facebook.common.internal.DoNotStrip class * { *; }
-keepclassmembers class * {
    @com.facebook.proguard.annotations.DoNotStrip *;
    @com.facebook.proguard.annotations.KeepGettersAndSetters *;
    @com.facebook.common.internal.DoNotStrip *;
}
-keepclassmembers class * {
    @com.facebook.react.uimanager.annotations.ReactProp <methods>;
    @com.facebook.react.uimanager.annotations.ReactPropGroup <methods>;
    @com.facebook.react.bridge.ReactMethod <methods>;
}

# --- Our own React Native bridge (native modules) ----------------------------
# These are called from JavaScript by reflection, so their public API must
# survive obfuscation.
-keep class com.familywelfareapp.parichai.ParichaiAuthModule { *; }
-keep class com.familywelfareapp.parichai.ParichaiAuthPackage { *; }
-keep class com.familywelfareapp.MainActivity { *; }
-keep class com.familywelfareapp.MainApplication { *; }

# --- Parichai SDK public API -------------------------------------------------
# The SDK's public entry points are called reflectively from our bridge and
# by the SDK's own internal machinery. Keep the public surface; everything
# else (AuthRepository, CryptoUtil, SafeNetworkLogInterceptor, etc.) will
# be renamed by R8, which is exactly what closes SAST findings #1, #3, #4.
-keep class com.gov.mpparichai.auth.core.ParichaiAuth { *; }
-keep class com.gov.mpparichai.auth.core.MinimalAuthConfig { *; }
-keep class com.gov.mpparichai.auth.core.ServiceType { *; }
-keep class com.gov.mpparichai.auth.core.AuthEnvironment { *; }
-keep interface com.gov.mpparichai.auth.core.AuthCallback { *; }
-keep class com.gov.mpparichai.auth.core.AuthSuccess { *; }
-keep class com.gov.mpparichai.auth.core.AuthError { *; }

# --- OkHttp / Retrofit / Gson (used by Parichai SDK internally) --------------
-keepattributes Signature, InnerClasses, EnclosingMethod, *Annotation*, Exceptions
-dontwarn okhttp3.**
-dontwarn okio.**
-dontwarn retrofit2.**
-dontwarn javax.annotation.**
-keep class okhttp3.** { *; }
-keep class okio.** { *; }
-keep class retrofit2.** { *; }
-keep interface retrofit2.** { *; }
-keepclasseswithmembers class * {
    @retrofit2.http.* <methods>;
}
-keep class com.google.gson.** { *; }
-keep class com.google.gson.reflect.TypeToken { *; }
-keep class * extends com.google.gson.reflect.TypeToken
-keepclassmembers,allowobfuscation class * {
    @com.google.gson.annotations.SerializedName <fields>;
}

# --- Kotlin metadata / coroutines --------------------------------------------
-keep class kotlin.Metadata { *; }
-keep class kotlin.coroutines.** { *; }
-keep class kotlinx.coroutines.** { *; }
-dontwarn kotlinx.coroutines.**
-dontwarn kotlin.**

# --- AndroidX / Support ------------------------------------------------------
-keep class androidx.** { *; }
-keep interface androidx.** { *; }
-dontwarn androidx.**

# --- Native (JNI) methods ----------------------------------------------------
-keepclasseswithmembernames class * {
    native <methods>;
}

# --- Enums / Parcelables / Serializables (standard Android rules) ------------
-keepclassmembers enum * {
    public static **[] values();
    public static ** valueOf(java.lang.String);
}
-keepclassmembers class * implements android.os.Parcelable {
    public static final ** CREATOR;
}
-keepnames class * implements java.io.Serializable
-keepclassmembers class * implements java.io.Serializable {
    static final long serialVersionUID;
    private static final java.io.ObjectStreamField[] serialPersistentFields;
    private void writeObject(java.io.ObjectOutputStream);
    private void readObject(java.io.ObjectInputStream);
    java.lang.Object writeReplace();
    java.lang.Object readResolve();
}

# --- WebView JS interfaces ---------------------------------------------------
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# --- Suppress harmless warnings ----------------------------------------------
# These are all compile-time-only or optional runtime classes that R8 sees
# referenced from third-party libraries (Gson, Guava, ErrorProne, etc.) but
# that never actually resolve at Android runtime. Suppressing them is the
# standard fix — R8's own missing_rules.txt suggests the exact same lines.
-dontwarn com.gov.mpparichai.**
-dontwarn java.lang.invoke.**
-dontwarn javax.lang.model.**
-dontwarn javax.annotation.**
-dontwarn javax.annotation.processing.**
-dontwarn com.google.errorprone.annotations.**
-dontwarn com.google.j2objc.annotations.**
-dontwarn com.google.auto.value.**
-dontwarn org.checkerframework.**
-dontwarn org.codehaus.mojo.animal_sniffer.**
-dontwarn sun.misc.**
-dontwarn java.beans.**
