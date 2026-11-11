package id.ac.splv.app;

import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    /** Same threshold as MIN_CHROME_FOR_3D in src/ui/ScaleView.jsx. */
    private static final int MIN_WEBVIEW_FOR_GPU = 90;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Old Android System WebViews (< Chrome 90) crashed in the GPU thread and left black,
        // unpainted tiles on the emulator. Those devices only use the 2D (SVG) scale anyway,
        // so render the WebView in software there: slower GPU features are not needed.
        try {
            int major = webViewMajorVersion();
            if (major > 0 && major < MIN_WEBVIEW_FOR_GPU && getBridge() != null) {
                getBridge().getWebView().setLayerType(View.LAYER_TYPE_SOFTWARE, null);
                Log.i("SPLV", "WebView " + major + ": software rendering enabled");
            }
        } catch (Exception e) {
            Log.w("SPLV", "Could not check WebView version", e);
        }
    }

    private int webViewMajorVersion() {
        PackageInfo info = null;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            info = WebView.getCurrentWebViewPackage();
        }
        if (info == null) {
            PackageManager pm = getPackageManager();
            for (String pkg : new String[] {"com.google.android.webview", "com.android.webview", "com.android.chrome"}) {
                try {
                    info = pm.getPackageInfo(pkg, 0);
                    break;
                } catch (PackageManager.NameNotFoundException ignored) {
                    // try next
                }
            }
        }
        if (info == null || info.versionName == null) return 0;
        try {
            return Integer.parseInt(info.versionName.split("\\.")[0]);
        } catch (NumberFormatException e) {
            return 0;
        }
    }
}
