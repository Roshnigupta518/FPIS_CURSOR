package com.familywelfareapp.parichai

import com.facebook.react.bridge.*
import com.gov.mpparichai.auth.core.AuthCallback
import com.gov.mpparichai.auth.core.AuthEnvironment
import com.gov.mpparichai.auth.core.AuthError
import com.gov.mpparichai.auth.core.AuthSuccess
import com.gov.mpparichai.auth.core.MinimalAuthConfig
import com.gov.mpparichai.auth.core.ParichaiAuth
import com.gov.mpparichai.auth.core.ServiceType
import android.util.Log

class ParichaiAuthModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "ParichaiAuthModule"

    @ReactMethod
    fun startParichaiAuth(params: ReadableMap, promise: Promise) {
        val activity = currentActivity
        if (activity == null) {
            promise.reject("NO_ACTIVITY", "Current activity is null")
            return
        }

        val sa = params.getString("sa").orEmpty()
        val serviceTypeCode = params.getString("serviceType").orEmpty()
        val encData = params.getString("encData").orEmpty()
        val transactionId = params.getString("transactionId").orEmpty()
        val disclosureInfoType = params.getString("disclosureInfoType").orEmpty()
        val envRaw = params.getString("environment").orEmpty()

        if (sa.isBlank() || serviceTypeCode.isBlank() || encData.isBlank() || transactionId.isBlank()) {
            promise.reject("INVALID_INPUT", "Required fields are missing")
            return
        }

        val config = MinimalAuthConfig(
            sa = sa,
            serviceType = ServiceType.fromCode(serviceTypeCode),
            encData = encData,
            transactionId = transactionId,
            disclosureInfoType = disclosureInfoType.ifBlank { serviceTypeCode },
            environment = if (envRaw.equals("PROD", ignoreCase = true)) {
                AuthEnvironment.PROD
            } else {
                AuthEnvironment.PREPROD
            }
        )
         
         Log.d("PARICHAI", "Before login")
         
        ParichaiAuth.login(activity, config, object : AuthCallback {
            override fun onSuccess(resultData: AuthSuccess) {
                val map = Arguments.createMap().apply {
                    putString("status", "success")
                    putMap("data", toWritableMap(resultData.toMap()))
                }
                promise.resolve(map)
            }

            override fun onError(error: AuthError) {
                val map = Arguments.createMap().apply {
                    putString("status", "error")
                    putMap("data", toWritableMap(error.toMap()))
                }
                promise.resolve(map)
            }

            override fun onCancelled() {
                val map = Arguments.createMap().apply {
                    putString("status", "cancelled")
                }
                promise.resolve(map)
            }
        })
    }

    private fun toWritableMap(data: Map<String, Any?>): WritableMap {
        val out = Arguments.createMap()
        data.forEach { (k, v) ->
            when (v) {
                null -> out.putNull(k)
                is String -> out.putString(k, v)
                is Int -> out.putInt(k, v)
                is Long -> out.putDouble(k, v.toDouble())
                is Double -> out.putDouble(k, v)
                is Boolean -> out.putBoolean(k, v)
                else -> out.putString(k, v.toString())
            }
        }
        return out
    }
}

