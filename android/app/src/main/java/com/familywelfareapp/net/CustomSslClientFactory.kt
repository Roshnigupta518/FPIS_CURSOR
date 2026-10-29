package com.familywelfareapp.net

import android.util.Log
import com.facebook.react.modules.network.OkHttpClientFactory
import com.facebook.react.modules.network.OkHttpClientProvider
import java.security.cert.X509Certificate
import javax.net.ssl.HostnameVerifier
import javax.net.ssl.SSLContext
import javax.net.ssl.TrustManager
import javax.net.ssl.X509TrustManager
import okhttp3.OkHttpClient

/**
 * Custom OkHttp client factory for React Native network calls.
 * Resolves SSL certificate handshake and hostname verification failures
 * on specific Android devices (e.g., Redmi / Xiaomi MIUI Android 14).
 */
class CustomSslClientFactory : OkHttpClientFactory {

    override fun createNewNetworkModuleClient(): OkHttpClient {
        return try {
            buildPermissiveClient()
        } catch (t: Throwable) {
            Log.e(TAG, "Falling back to default OkHttp client", t)
            OkHttpClientProvider.createClientBuilder().build()
        }
    }

    private fun buildPermissiveClient(): OkHttpClient {
        val trustAllCerts = arrayOf<TrustManager>(object : X509TrustManager {
            override fun checkClientTrusted(chain: Array<out X509Certificate>?, authType: String?) {}
            override fun checkServerTrusted(chain: Array<out X509Certificate>?, authType: String?) {}
            override fun getAcceptedIssuers(): Array<X509Certificate> = arrayOf()
        })

        val sslContext = SSLContext.getInstance("TLS").apply {
            init(null, trustAllCerts, java.security.SecureRandom())
        }

        val hostnameVerifier = HostnameVerifier { hostname, session ->
            if (hostname != null && (
                hostname.contains("fwmis.nhmmp.gov.in") ||
                hostname.contains("nhmmp.gov.in") ||
                hostname == "139.5.6.137"
            )) {
                true
            } else {
                javax.net.ssl.HttpsURLConnection.getDefaultHostnameVerifier().verify(hostname, session)
            }
        }

        return OkHttpClientProvider.createClientBuilder()
            .sslSocketFactory(sslContext.socketFactory, trustAllCerts[0] as X509TrustManager)
            .hostnameVerifier(hostnameVerifier)
            .build()
    }

    companion object {
        private const val TAG = "CustomSslClientFactory"

        fun register() {
            try {
                OkHttpClientProvider.setOkHttpClientFactory(CustomSslClientFactory())
            } catch (t: Throwable) {
                Log.e(TAG, "Failed to register CustomSslClientFactory", t)
            }
        }
    }
}
