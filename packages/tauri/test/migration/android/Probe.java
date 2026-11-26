package app.padloc.tauri.migrationtest;

import android.app.Activity;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.util.Map;

public class Probe extends Activity {
    static final String TAG = "PadlocMigration";
    static final String LEGACY = "http://localhost";
    static final String TAURI = "http://tauri.localhost";
    private final Handler handler = new Handler(Looper.getMainLooper());

    @Override
    public void onCreate(Bundle state) {
        super.onCreate(state);
        boolean seed = getIntent().getBooleanExtra("seed", false);
        if (seed) {
            read(LEGACY, "seed", () -> {});
        } else {
            read(TAURI, "read", () -> read(LEGACY, "read", () -> {}));
        }
    }

    private void read(String origin, String mode, Runnable next) {
        String url = origin + "/padloc-migration";
        WebView view = new WebView(this);
        setContentView(view);
        view.getSettings().setJavaScriptEnabled(true);
        view.getSettings().setDomStorageEnabled(true);
        view.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView page, WebResourceRequest request) {
                return !url.equals(request.getUrl().toString());
            }
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView page, WebResourceRequest request) {
                if (!request.isForMainFrame() || !url.equals(request.getUrl().toString())) {
                    return new WebResourceResponse("text/plain", "UTF-8", 403, "Forbidden", Map.of(),
                            new ByteArrayInputStream(new byte[0]));
                }
                return new WebResourceResponse("text/html", "UTF-8", 200, "OK",
                        Map.of("Content-Security-Policy", "default-src 'none'"),
                        new ByteArrayInputStream("<!doctype html><title>Padloc migration test</title>".getBytes(StandardCharsets.UTF_8)));
            }
            @Override
    public void onPageFinished(WebView page, String loadedUrl) {
                if (!url.equals(loadedUrl)) return;
                try (var script = getAssets().open(mode + ".js")) {
                    page.evaluateJavascript(new String(script.readAllBytes(), StandardCharsets.UTF_8), ignored -> {});
                    poll(page, origin, mode, next, 50);
                } catch (Exception error) {
                    Log.e(TAG, "Could not run synthetic probe", error);
                    close(page);
                }
            }
        });
        view.loadUrl(url);
    }

    private void close(WebView view) {
        if (view.getParent() instanceof android.view.ViewGroup) {
            ((android.view.ViewGroup) view.getParent()).removeView(view);
        }
        view.destroy();
    }

    private void poll(WebView view, String origin, String mode, Runnable next, int remaining) {
        view.evaluateJavascript("window.padlocProbeResult || null", result -> {
            if (!result.equals("null")) {
                Log.i(TAG, mode + " " + origin + " " + result);
                close(view);
                next.run();
            } else if (remaining > 0) {
                handler.postDelayed(() -> poll(view, origin, mode, next, remaining - 1), 200);
            } else {
                Log.e(TAG, mode + " " + origin + " timed out");
                close(view);
            }
        });
    }
}
