package com.familywelfareapp.net

import android.content.Context
import android.util.Log
import com.facebook.react.modules.network.OkHttpClientFactory
import com.facebook.react.modules.network.OkHttpClientProvider
import com.familywelfareapp.R
import java.security.KeyStore
import java.security.cert.CertificateFactory
import java.security.cert.X509Certificate
import javax.net.ssl.HostnameVerifier
import javax.net.ssl.SSLContext
import javax.net.ssl.TrustManager
import javax.net.ssl.TrustManagerFactory
import javax.net.ssl.X509TrustManager
import okhttp3.OkHttpClient

/**
 * Custom OkHttp factory used by React Native (axios / fetch) on Android.
 *
 * ─── Why this file exists ─────────────────────────────────────────────────
 * The current NHM backend at https://139.5.6.137 is served with a
 * self-signed certificate whose Subject CN is "localhost" and whose only
 * Subject Alternative Name is "DNS:localhost" — there is no IP SAN for
 * 139.5.6.137. Android correctly refuses this connection because:
 *   1. The certificate is not chained to any trusted CA (self-signed).
 *   2. The certificate hostname does not match the URL host.
 *
 * We fix (1) by pinning the exact server certificate as a trust anchor
 * (raw/nhm_server.pem). Only that one certificate is accepted — a stolen
 * or forged cert from anywhere else is still rejected, so this is
 * essentially certificate pinning.
 *
 * We work around (2) by installing a scoped HostnameVerifier that
 * tolerates ONLY the single host "139.5.6.137". Every other host still
 * goes through Android's strict default hostname verification, so
 * hijacking any other endpoint is impossible from this app.
 *
 * ─── Removal criteria ─────────────────────────────────────────────────────
 * Once the backend team ships a proper CA-signed certificate whose SAN
 * matches the URL host (whether that is 139.5.6.137 via IP-SAN or a real
 * DNS name like fpis-api.nhmmp.gov.in):
 *   1. Delete this file.
 *   2. Delete the OkHttpClientProvider.setOkHttpClientFactory(...) call
 *      from MainApplication.onCreate().
 *   3. Remove the res/raw/nhm_server.pem trust-anchor block from
 *      network_security_config.xml.
 * The app will then fall back to Android's standard TLS validation.
 */
class NhmSslClientFactory(private val appContext: Context) : OkHttpClientFactory {

    override fun createNewNetworkModuleClient(): OkHttpClient {
        return try {
            buildPinnedClient()
        } catch (t: Throwable) {
            Log.e(TAG, "Falling back to default OkHttp client — pinning setup failed", t)
            OkHttpClientProvider.createClientBuilder().build()
        }
    }

    private fun buildPinnedClient(): OkHttpClient {
        val trustManagers = loadPinnedTrustManagers()
        val x509TrustManager = trustManagers.filterIsInstance<X509TrustManager>().first()

        val sslContext = SSLContext.getInstance("TLS").apply {
            init(null, trustManagers, null)
        }

        val scopedVerifier = HostnameVerifier { hostname, session ->
            if (hostname == ALLOWED_MISMATCH_HOST) {
                // Same host still has to present the pinned certificate — that
                // is enforced by the trust manager above — so this is safe.
                true
            } else {
                javax.net.ssl.HttpsURLConnection.getDefaultHostnameVerifier()
                    .verify(hostname, session)
            }
        }

        val builder = OkHttpClientProvider.createClientBuilder()
            .sslSocketFactory(sslContext.socketFactory, x509TrustManager)
            .hostnameVerifier(scopedVerifier)

        return builder.build()
    }

    private fun loadPinnedTrustManagers(): Array<TrustManager> {
        val certFactory = CertificateFactory.getInstance("X.509")
        val certificate = appContext.resources
            .openRawResource(R.raw.nhm_server)
            .use { input -> certFactory.generateCertificate(input) as X509Certificate }

        val keyStore = KeyStore.getInstance(KeyStore.getDefaultType()).apply {
            load(null, null)
            setCertificateEntry(PIN_ALIAS, certificate)
        }

        val trustManagerFactory =
            TrustManagerFactory.getInstance(TrustManagerFactory.getDefaultAlgorithm()).apply {
                init(keyStore)
            }

        return trustManagerFactory.trustManagers
    }

    companion object {
        private const val TAG = "NhmSslClientFactory"
        private const val PIN_ALIAS = "nhm_backend_self_signed"

        /**
         * The one host allowed to bypass hostname verification. Only this
         * exact host string is tolerated; anything else is verified using
         * Android's normal rules.
         */
        private const val ALLOWED_MISMATCH_HOST = "139.5.6.137"

        /**
         * Registers this factory globally. Call this exactly once from
         * `Application.onCreate()` BEFORE React Native initialises.
         */
        fun register(appContext: Context) {
            OkHttpClientProvider.setOkHttpClientFactory(NhmSslClientFactory(appContext))
        }
    }
}
