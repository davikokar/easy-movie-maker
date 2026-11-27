package dev.moviemaker.probes;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(ProbePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
