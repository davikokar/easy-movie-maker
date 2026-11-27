package dev.moviemaker.probes;

import android.content.ContentResolver;
import android.content.ContentValues;
import android.net.Uri;
import android.os.Build;
import android.os.Debug;
import android.os.Environment;
import android.os.Handler;
import android.os.Looper;
import android.provider.MediaStore;
import android.util.Base64;
import android.view.WindowManager;
import android.webkit.WebView;

import androidx.webkit.JavaScriptReplyProxy;
import androidx.webkit.WebMessageCompat;
import androidx.webkit.WebViewCompat;
import androidx.webkit.WebViewFeature;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.InetAddress;
import java.net.ServerSocket;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

// Throwaway plugin for prototype stages 7.2-7.5. It is not product code.
@CapacitorPlugin(name = "Probe")
public class ProbePlugin extends Plugin {
    private final ExecutorService io = Executors.newSingleThreadExecutor();
    private final Handler main = new Handler(Looper.getMainLooper());
    private Sink sink;
    private ServerSocket server;
    private String messageSinkError = null;

    // Streams one file into MediaStore (Movies/MovieMakerProbe), as the export sink would.
    private static final class Sink {
        final Uri uri;
        final OutputStream out;
        long bytes;

        Sink(Uri uri, OutputStream out) {
            this.uri = uri;
            this.out = out;
        }

        synchronized void write(byte[] b, int off, int len) throws IOException {
            out.write(b, off, len);
            bytes += len;
        }
    }

    @Override
    public void load() {
        WebView webView = getBridge().getWebView();
        if (!WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)) {
            messageSinkError = "WEB_MESSAGE_LISTENER not supported";
            return;
        }
        try {
            WebViewCompat.addWebMessageListener(
                webView,
                "nativeSink",
                Collections.singleton("https://localhost"),
                this::onWebMessage
            );
        } catch (Exception e) {
            messageSinkError = e.toString();
        }
    }

    private void onWebMessage(WebView view, WebMessageCompat message, Uri origin, boolean isMainFrame, JavaScriptReplyProxy reply) {
        if (message.getType() == WebMessageCompat.TYPE_ARRAY_BUFFER) {
            final byte[] data = message.getArrayBuffer();
            io.execute(() -> {
                String ack;
                try {
                    sink.write(data, 0, data.length);
                    ack = "ok:" + sink.bytes;
                } catch (Exception e) {
                    ack = "error:" + e;
                }
                final String result = ack;
                main.post(() -> reply.postMessage(result));
            });
        } else {
            reply.postMessage("error:expected an ArrayBuffer message");
        }
    }

    @PluginMethod
    public void features(PluginCall call) {
        JSObject r = new JSObject();
        r.put("webMessageListener", WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER));
        r.put("webMessageArrayBuffer", WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_ARRAY_BUFFER));
        r.put("messageSinkError", messageSinkError);
        call.resolve(r);
    }

    @PluginMethod
    public void launchProbe(PluginCall call) {
        JSObject r = new JSObject();
        r.put("probe", getActivity().getIntent().getStringExtra("probe"));
        call.resolve(r);
    }

    @PluginMethod
    public void deviceInfo(PluginCall call) {
        JSObject r = new JSObject();
        r.put("manufacturer", Build.MANUFACTURER);
        r.put("model", Build.MODEL);
        r.put("androidRelease", Build.VERSION.RELEASE);
        r.put("sdk", Build.VERSION.SDK_INT);
        r.put("soc", Build.SOC_MODEL);
        android.content.pm.PackageInfo wv = WebView.getCurrentWebViewPackage();
        r.put("webViewPackage", wv == null ? null : wv.packageName);
        r.put("webViewVersion", wv == null ? null : wv.versionName);
        call.resolve(r);
    }

    @PluginMethod
    public void keepScreenOn(PluginCall call) {
        final boolean on = Boolean.TRUE.equals(call.getBoolean("on", true));
        getActivity().runOnUiThread(() -> {
            if (on) getActivity().getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
            else getActivity().getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
            call.resolve();
        });
    }

    @PluginMethod
    public void saveResult(PluginCall call) {
        String name = call.getString("name", "result");
        String json = call.getString("json", "{}");
        try {
            File dir = new File(getContext().getExternalFilesDir(null), "results");
            if (!dir.exists() && !dir.mkdirs()) throw new IOException("cannot create " + dir);
            File file = new File(dir, name.replaceAll("[^A-Za-z0-9._-]", "_") + ".json");
            try (FileOutputStream out = new FileOutputStream(file)) {
                out.write(json.getBytes(StandardCharsets.UTF_8));
            }
            JSObject r = new JSObject();
            r.put("path", file.getAbsolutePath());
            call.resolve(r);
        } catch (IOException e) {
            call.reject(e.toString());
        }
    }

    @PluginMethod
    public void memory(PluginCall call) {
        Debug.MemoryInfo mi = new Debug.MemoryInfo();
        Debug.getMemoryInfo(mi);
        Runtime rt = Runtime.getRuntime();
        JSObject r = new JSObject();
        r.put("totalPssKb", mi.getTotalPss());
        r.put("nativeHeapKb", Debug.getNativeHeapAllocatedSize() / 1024);
        r.put("javaHeapKb", (rt.totalMemory() - rt.freeMemory()) / 1024);
        call.resolve(r);
    }

    @PluginMethod
    public void sinkOpen(PluginCall call) {
        try {
            sinkDeleteQuietly();
            String name = call.getString("name", "probe.mp4");
            ContentResolver resolver = getContext().getContentResolver();
            ContentValues v = new ContentValues();
            v.put(MediaStore.MediaColumns.DISPLAY_NAME, name);
            v.put(MediaStore.MediaColumns.MIME_TYPE, "video/mp4");
            v.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_MOVIES + "/MovieMakerProbe");
            v.put(MediaStore.MediaColumns.IS_PENDING, 1);
            Uri uri = resolver.insert(MediaStore.Video.Media.EXTERNAL_CONTENT_URI, v);
            if (uri == null) throw new IOException("MediaStore insert returned null");
            OutputStream out = resolver.openOutputStream(uri);
            if (out == null) throw new IOException("openOutputStream returned null");
            sink = new Sink(uri, out);
            JSObject r = new JSObject();
            r.put("uri", uri.toString());
            call.resolve(r);
        } catch (Exception e) {
            call.reject(e.toString());
        }
    }

    @PluginMethod
    public void sinkWriteBase64(PluginCall call) {
        final String data = call.getString("data", "");
        io.execute(() -> {
            try {
                byte[] bytes = Base64.decode(data, Base64.NO_WRAP);
                sink.write(bytes, 0, bytes.length);
                call.resolve();
            } catch (Exception e) {
                call.reject(e.toString());
            }
        });
    }

    @PluginMethod
    public void sinkClose(PluginCall call) {
        io.execute(() -> {
            try {
                sink.out.flush();
                sink.out.close();
                ContentValues v = new ContentValues();
                v.put(MediaStore.MediaColumns.IS_PENDING, 0);
                getContext().getContentResolver().update(sink.uri, v, null, null);
                JSObject r = new JSObject();
                r.put("bytes", sink.bytes);
                call.resolve(r);
            } catch (Exception e) {
                call.reject(e.toString());
            }
        });
    }

    @PluginMethod
    public void sinkDelete(PluginCall call) {
        io.execute(() -> {
            sinkDeleteQuietly();
            call.resolve();
        });
    }

    private void sinkDeleteQuietly() {
        if (sink == null) return;
        try {
            sink.out.close();
        } catch (IOException ignored) {
        }
        try {
            getContext().getContentResolver().delete(sink.uri, null, null);
        } catch (Exception ignored) {
        }
        sink = null;
    }

    // Minimal loopback HTTP receiver: POST /write with Content-Length appends the body to the sink.
    @PluginMethod
    public void httpStart(PluginCall call) {
        try {
            if (server == null) {
                server = new ServerSocket(0, 8, InetAddress.getByName("127.0.0.1"));
                Thread acceptor = new Thread(this::acceptLoop, "probe-http-accept");
                acceptor.setDaemon(true);
                acceptor.start();
            }
            JSObject r = new JSObject();
            r.put("port", server.getLocalPort());
            call.resolve(r);
        } catch (IOException e) {
            call.reject(e.toString());
        }
    }

    private void acceptLoop() {
        while (!server.isClosed()) {
            try {
                final Socket socket = server.accept();
                Thread t = new Thread(() -> serve(socket), "probe-http-conn");
                t.setDaemon(true);
                t.start();
            } catch (IOException e) {
                return;
            }
        }
    }

    private void serve(Socket socket) {
        try (Socket s = socket) {
            InputStream in = s.getInputStream();
            OutputStream out = s.getOutputStream();
            byte[] buf = new byte[256 * 1024];
            while (true) {
                String requestLine = readLine(in);
                if (requestLine == null || requestLine.isEmpty()) return;
                long contentLength = 0;
                String header;
                while ((header = readLine(in)) != null && !header.isEmpty()) {
                    int colon = header.indexOf(':');
                    if (colon > 0 && header.substring(0, colon).trim().equalsIgnoreCase("content-length")) {
                        contentLength = Long.parseLong(header.substring(colon + 1).trim());
                    }
                }
                String status = "200 OK";
                String body = "ok";
                if (requestLine.startsWith("POST /write")) {
                    long remaining = contentLength;
                    while (remaining > 0) {
                        int n = in.read(buf, 0, (int) Math.min(buf.length, remaining));
                        if (n < 0) return;
                        sink.write(buf, 0, n);
                        remaining -= n;
                    }
                    body = "ok:" + sink.bytes;
                } else if (!requestLine.startsWith("OPTIONS")) {
                    status = "404 Not Found";
                    body = "not found";
                }
                byte[] payload = body.getBytes(StandardCharsets.UTF_8);
                String head = "HTTP/1.1 " + status + "\r\n"
                    + "Access-Control-Allow-Origin: *\r\n"
                    + "Access-Control-Allow-Methods: POST, OPTIONS\r\n"
                    + "Access-Control-Allow-Headers: *\r\n"
                    + "Content-Type: text/plain\r\n"
                    + "Content-Length: " + payload.length + "\r\n\r\n";
                out.write(head.getBytes(StandardCharsets.UTF_8));
                out.write(payload);
                out.flush();
            }
        } catch (Exception ignored) {
        }
    }

    private static String readLine(InputStream in) throws IOException {
        StringBuilder sb = new StringBuilder();
        int c;
        while ((c = in.read()) >= 0) {
            if (c == '\n') break;
            if (c != '\r') sb.append((char) c);
        }
        return c < 0 && sb.length() == 0 ? null : sb.toString();
    }
}
