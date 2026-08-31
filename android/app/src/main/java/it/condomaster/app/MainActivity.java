package it.condomaster.app;

import android.os.Bundle;
import androidx.core.view.WindowCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Android 15 (targetSdk 35) forces edge-to-edge by default, drawing the
        // WebView under the status bar and navigation bar. This app has no
        // safe-area handling for that, so the header overlapped the clock/icons
        // and the bottom content blended into the white nav bar. Opting back
        // into the classic layout lets the system reserve its own space for
        // both bars, restoring their normal (non-transparent) background.
        WindowCompat.setDecorFitsSystemWindows(getWindow(), true);
    }
}
