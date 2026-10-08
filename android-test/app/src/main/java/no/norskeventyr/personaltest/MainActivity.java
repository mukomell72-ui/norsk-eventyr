package no.norskeventyr.personaltest;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.CookieManager;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

public final class MainActivity extends Activity {
    private static final int AUDIO_PERMISSION_REQUEST = 71;
    private static final int FILE_CHOOSER_REQUEST = 72;
    private WebView browser;
    private PermissionRequest pendingAudio;
    private ValueCallback<Uri[]> pendingFiles;
    private final Uri preview = Uri.parse(BuildConfig.START_URL);

    private boolean approvedOrigin(Uri url) {
        return url != null && "https".equalsIgnoreCase(url.getScheme())
            && preview.getHost() != null && preview.getHost().equalsIgnoreCase(url.getHost());
    }

    private void grantOnlyAudio(PermissionRequest request) {
        if (request != null) request.grant(new String[]{PermissionRequest.RESOURCE_AUDIO_CAPTURE});
    }

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        browser = new WebView(this);
        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG);
        WebSettings settings = browser.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setSupportMultipleWindows(false);
        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(browser, false);

        browser.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri url = request.getUrl();
                if (approvedOrigin(url)) return false;
                if (!request.isForMainFrame()) return false;
                String scheme = url.getScheme();
                if ("https".equalsIgnoreCase(scheme)) {
                    try { startActivity(new Intent(Intent.ACTION_VIEW, url)); }
                    catch (Exception ignored) { Toast.makeText(MainActivity.this, "Не удалось открыть ссылку", Toast.LENGTH_SHORT).show(); }
                }
                return true;
            }
            @Override public void onReceivedError(WebView view, WebResourceRequest request, android.webkit.WebResourceError error) {
                if (request.isForMainFrame()) Toast.makeText(MainActivity.this, "Проверьте интернет и доступность тестовой версии", Toast.LENGTH_LONG).show();
            }
        });
        browser.setWebChromeClient(new WebChromeClient() {
            @Override public void onPermissionRequest(PermissionRequest request) {
                runOnUiThread(() -> {
                    if (!approvedOrigin(request.getOrigin()) ||
                        !java.util.Arrays.asList(request.getResources()).contains(PermissionRequest.RESOURCE_AUDIO_CAPTURE)) {
                        request.deny();
                        return;
                    }
                    if (checkSelfPermission(Manifest.permission.RECORD_AUDIO)==PackageManager.PERMISSION_GRANTED) {
                        grantOnlyAudio(request);
                    } else {
                        pendingAudio = request;
                        requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO}, AUDIO_PERMISSION_REQUEST);
                    }
                });
            }
            @Override public void onPermissionRequestCanceled(PermissionRequest request) {
                if (pendingAudio == request) pendingAudio = null;
            }
            @Override public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (pendingFiles != null) pendingFiles.onReceiveValue(null);
                pendingFiles = callback;
                Intent open = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                open.setType("*/*");
                open.addCategory(Intent.CATEGORY_OPENABLE);
                try { startActivityForResult(open, FILE_CHOOSER_REQUEST); return true; }
                catch (Exception e) { pendingFiles = null; callback.onReceiveValue(null); return false; }
            }
        });
        setContentView(browser);
        if (state != null) browser.restoreState(state);
        else browser.loadUrl(BuildConfig.START_URL);
    }

    @Override public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] results) {
        super.onRequestPermissionsResult(requestCode, permissions, results);
        if (requestCode != AUDIO_PERMISSION_REQUEST) return;
        PermissionRequest request = pendingAudio;
        pendingAudio = null;
        if (request == null) return;
        if (results.length > 0 && results[0] == PackageManager.PERMISSION_GRANTED) grantOnlyAudio(request);
        else request.deny();
    }

    @Override protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode != FILE_CHOOSER_REQUEST || pendingFiles == null) return;
        Uri[] selected = resultCode == RESULT_OK && data != null && data.getData() != null
            ? new Uri[]{data.getData()} : null;
        pendingFiles.onReceiveValue(selected);
        pendingFiles = null;
    }

    @Override public void onBackPressed() {
        if (browser != null && browser.canGoBack()) browser.goBack();
        else super.onBackPressed();
    }

    @Override protected void onSaveInstanceState(Bundle state) {
        if (browser != null) browser.saveState(state);
        super.onSaveInstanceState(state);
    }

    @Override protected void onDestroy() {
        if (pendingAudio != null) { pendingAudio.deny(); pendingAudio=null; }
        if (pendingFiles != null) { pendingFiles.onReceiveValue(null); pendingFiles=null; }
        if (browser != null) { browser.destroy(); browser=null; }
        super.onDestroy();
    }
}
