package com.horizonblue.app;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebResourceRequest;
import android.webkit.GeolocationPermissions;
import android.webkit.JavascriptInterface;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.core.content.ContextCompat;
import androidx.fragment.app.FragmentActivity;
import androidx.biometric.BiometricManager;
import androidx.biometric.BiometricPrompt;

import java.util.concurrent.Executor;

public class MainActivity extends FragmentActivity {

    private WebView webView;
    private GeolocationPermissions.Callback geoCallback;
    private String geoOrigin;

    private static final int LOCATION_REQUEST = 101;

    private BiometricPrompt biometricPrompt;
    private BiometricPrompt.PromptInfo promptInfo;
    private boolean biometricShowing = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        webView = new WebView(this);
        setContentView(webView);

        setupBiometric();
        setupWebView();
    }

    // BIOMETRIC AUTHENTICATION
    private void setupBiometric() {

        Executor executor = command -> runOnUiThread(command);

        biometricPrompt = new BiometricPrompt(
            this,
            executor,
            new BiometricPrompt.AuthenticationCallback() {

                @Override
                public void onAuthenticationSucceeded(
                    @NonNull BiometricPrompt.AuthenticationResult result
                ) {
                    biometricShowing = false;
                    sendBiometricResult(true);

                    Toast.makeText(
                        MainActivity.this,
                        "Authentication Successful",
                        Toast.LENGTH_SHORT
                    ).show();
                }

                @Override
                public void onAuthenticationFailed() {
                    super.onAuthenticationFailed();
                }

                @Override
                public void onAuthenticationError(
                    int errorCode,
                    @NonNull CharSequence errString
                ) {
                    biometricShowing = false;
                    sendBiometricResult(false);
                }
            }
        );

        promptInfo = new BiometricPrompt.PromptInfo.Builder()
            .setTitle("HORIZON BLUE Security")
            .setSubtitle("Verify your identity")
            .setDescription("Use your fingerprint or supported biometric")
            .setAllowedAuthenticators(
                BiometricManager.Authenticators.BIOMETRIC_WEAK
            )
            .setNegativeButtonText("Cancel")
            .build();
    }

    private void authenticateBiometric() {

        if (biometricShowing) return;

        BiometricManager manager =
            BiometricManager.from(this);

        int result = manager.canAuthenticate(
            BiometricManager.Authenticators.BIOMETRIC_WEAK
        );

        if (result == BiometricManager.BIOMETRIC_SUCCESS) {

            biometricShowing = true;
            biometricPrompt.authenticate(promptInfo);

        } else {

            sendBiometricResult(false);

            Toast.makeText(
                this,
                "Biometric unavailable or not enrolled",
                Toast.LENGTH_LONG
            ).show();
        }
    }

    private void sendBiometricResult(boolean success) {

        if (webView == null) return;

        String script =
            "if(window.onBiometricResult){" +
            "window.onBiometricResult(" + success + ");}";

        webView.post(() ->
            webView.evaluateJavascript(script, null)
        );
    }

    // JAVASCRIPT BRIDGE
    public class HorizonBiometricBridge {

        @JavascriptInterface
        public void authenticate() {
            runOnUiThread(() -> authenticateBiometric());
        }
    }

    // WEBVIEW SETUP
    private void setupWebView() {

        WebSettings settings = webView.getSettings();

        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setGeolocationEnabled(true);

        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(false);

        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);

        settings.setMixedContentMode(
            WebSettings.MIXED_CONTENT_NEVER_ALLOW
        );

        webView.addJavascriptInterface(
            new HorizonBiometricBridge(),
            "HorizonBiometric"
        );

        webView.setWebViewClient(new WebViewClient() {

            @Override
            public boolean shouldOverrideUrlLoading(
                WebView view,
                WebResourceRequest request
            ) {
                String url = request.getUrl().toString();

                return !url.startsWith(
                    "file:///android_asset/"
                );
            }

            @Override
            public boolean shouldOverrideUrlLoading(
                WebView view,
                String url
            ) {
                return !url.startsWith(
                    "file:///android_asset/"
                );
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {

            @Override
            public void onGeolocationPermissionsShowPrompt(
                String origin,
                GeolocationPermissions.Callback callback
            ) {

                // Allow only our local app page
                if (origin == null ||
                    !origin.startsWith("file:///android_asset")) {

                    callback.invoke(origin, false, false);
                    return;
                }

                geoOrigin = origin;
                geoCallback = callback;

                if (hasLocationPermission()) {

                    callback.invoke(origin, true, false);

                    geoCallback = null;
                    geoOrigin = null;

                } else {

                    requestLocation();
                }
            }
        });

        webView.loadUrl(
            "file:///android_asset/index.html"
        );
    }

    // LOCATION PERMISSION
    private boolean hasLocationPermission() {

        boolean fine =
            ContextCompat.checkSelfPermission(
                this,
                Manifest.permission.ACCESS_FINE_LOCATION
            ) == PackageManager.PERMISSION_GRANTED;

        boolean coarse =
            ContextCompat.checkSelfPermission(
                this,
                Manifest.permission.ACCESS_COARSE_LOCATION
            ) == PackageManager.PERMISSION_GRANTED;

        return fine || coarse;
    }

    private void requestLocation() {

        requestPermissions(
            new String[] {
                Manifest.permission.ACCESS_FINE_LOCATION,
                Manifest.permission.ACCESS_COARSE_LOCATION
            },
            LOCATION_REQUEST
        );
    }

    @Override
    public void onRequestPermissionsResult(
        int requestCode,
        @NonNull String[] permissions,
        @NonNull int[] grantResults
    ) {

        super.onRequestPermissionsResult(
            requestCode,
            permissions,
            grantResults
        );

        if (requestCode == LOCATION_REQUEST) {

            boolean granted = hasLocationPermission();

            if (geoCallback != null) {

                geoCallback.invoke(
                    geoOrigin,
                    granted,
                    false
                );

                geoCallback = null;
                geoOrigin = null;
            }

            if (!granted) {

                Toast.makeText(
                    this,
                    "Location permission denied",
                    Toast.LENGTH_SHORT
                ).show();
            }
        }
    }

    // BACK BUTTON
    @Override
    public void onBackPressed() {

        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    // DESTROY
    @Override
    protected void onDestroy() {

        if (geoCallback != null) {
            geoCallback.invoke(geoOrigin, false, false);
            geoCallback = null;
            geoOrigin = null;
        }

        if (webView != null) {

            webView.removeJavascriptInterface(
                "HorizonBiometric"
            );

            webView.stopLoading();
            webView.destroy();
            webView = null;
        }

        super.onDestroy();
    }
}
