package com.familywelfareapp

import android.app.Application
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.load
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import com.facebook.react.defaults.DefaultReactNativeHost
import com.facebook.react.soloader.OpenSourceMergedSoMapping
import com.facebook.soloader.SoLoader

import com.familywelfareapp.net.NhmSslClientFactory
import com.familywelfareapp.parichai.ParichaiAuthPackage
import com.familywelfareapp.security.RootDetectionPackage

class MainApplication : Application(), ReactApplication {

  override val reactNativeHost: ReactNativeHost =
      object : DefaultReactNativeHost(this) {
        override fun getPackages(): List<ReactPackage> =
            PackageList(this).packages.apply {
              // Packages that cannot be autolinked yet can be added manually here, for example:
              // add(MyReactNativePackage())

               add(ParichaiAuthPackage())
               add(RootDetectionPackage())
            }

        override fun getJSMainModuleName(): String = "index"

        override fun getUseDeveloperSupport(): Boolean = BuildConfig.DEBUG

        override val isNewArchEnabled: Boolean = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
        override val isHermesEnabled: Boolean = BuildConfig.IS_HERMES_ENABLED
      }

  override val reactHost: ReactHost
    get() = getDefaultReactHost(applicationContext, reactNativeHost)

  override fun onCreate() {
    super.onCreate()
    // TEMPORARY: pin the NHM backend's self-signed certificate and permit
    // its hostname mismatch (cert CN=localhost, URL=139.5.6.137). Must
    // run before SoLoader / React Native touches the network stack. See
    // com.familywelfareapp.net.NhmSslClientFactory for removal criteria.
    NhmSslClientFactory.register(applicationContext)

    // RN 0.79 consolidated ~30 tiny .so files into one big `libreactnative.so`.
    // OpenSourceMergedSoMapping tells SoLoader "when someone asks for
    // `react_featureflagsjni` / `reactnativejni` / `turbomodulejsijni` /
    // etc., load `libreactnative.so` instead". Missing this mapping is
    // what caused the runtime UnsatisfiedLinkError we hit after the RN
    // 0.74 → 0.79 bump (the old `SoLoader.init(this, false)` API is gone).
    SoLoader.init(this, OpenSourceMergedSoMapping)
    if (BuildConfig.IS_NEW_ARCHITECTURE_ENABLED) {
      // If you opted-in for the New Architecture, we load the native entry point for this app.
      load()
    }
  }
}
