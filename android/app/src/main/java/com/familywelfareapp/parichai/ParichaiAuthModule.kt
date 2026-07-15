package com.familywelfareapp.parichai

import com.facebook.react.bridge.*
import com.gov.mpparichai.auth.core.AuthCallback
import com.gov.mpparichai.auth.core.AuthEnvironment
import com.gov.mpparichai.auth.core.AuthError
import com.gov.mpparichai.auth.core.AuthSuccess
import com.gov.mpparichai.auth.core.MinimalAuthConfig
import com.gov.mpparichai.auth.core.ParichaiAuth
import com.gov.mpparichai.auth.core.ServiceType

/**
 * JS bridge for the MP Parichai Aadhaar Auth SDK.
 *
 * ─── NHM SAST context ──────────────────────────────────────────────────────
 * The upstream `parichai-auth-sdk-release.aar` ships with a hardcoded
 * DEFAULT_ENC_DATA field inside its AuthRepository class. That field is a
 * fallback used only when the caller does not supply a fresh encData for the
 * current authentication transaction. Ownership of that binary belongs to
 * MP Parichai (com.gov.mpparichai.auth.core), not to this app.
 *
 * This wrapper ensures the vendor default can never be reached from our
 * flows: we validate that every required field (sa, serviceType, encData,
 * transactionId) is a non-empty, plausibly-shaped runtime value BEFORE
 * handing the request to the SDK. If any field is missing or looks like a
 * placeholder, we reject the JS promise with INVALID_INPUT instead of
 * letting the SDK fall back to its baked-in default.
 * ───────────────────────────────────────────────────────────────────────────
 */
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

        val sa = params.getString("sa").orEmpty().trim()
        val serviceTypeCode = params.getString("serviceType").orEmpty().trim()
        val encData = params.getString("encData").orEmpty().trim()
        val transactionId = params.getString("transactionId").orEmpty().trim()
        val disclosureInfoType = params.getString("disclosureInfoType").orEmpty().trim()
        val envRaw = params.getString("environment").orEmpty().trim()

        val validationError = validateAuthInputs(sa, serviceTypeCode, encData, transactionId)
        if (validationError != null) {
            promise.reject("INVALID_INPUT", validationError)
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

    /**
     * Rejects blanks, obvious placeholders, and payloads that are shorter than
     * a plausible server-issued encData blob. Backend PrepareRequest returns
     * a base64 blob that is comfortably above MIN_ENC_DATA_LENGTH characters,
     * so anything shorter is almost certainly a hardcoded / test value.
     */
    private fun validateAuthInputs(
        sa: String,
        serviceType: String,
        encData: String,
        transactionId: String
    ): String? {
        if (sa.isBlank()) return "sa is required"
        if (serviceType.isBlank()) return "serviceType is required"
        if (transactionId.isBlank()) return "transactionId is required"
        if (encData.isBlank()) return "encData is required"

        val lower = encData.lowercase()
        FORBIDDEN_ENC_DATA_TOKENS.forEach {
            if (lower.contains(it)) {
                return "encData contains a forbidden placeholder token: $it"
            }
        }
        if (encData.length < MIN_ENC_DATA_LENGTH) {
            return "encData is too short to be a valid server-issued payload"
        }
        return null
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

    companion object {
        private const val MIN_ENC_DATA_LENGTH = 64
        private val FORBIDDEN_ENC_DATA_TOKENS = listOf(
            "default_enc_data",
            "sample",
            "dummy",
            "placeholder",
            "test_enc_data",
        )
    }
}
