package com.example.distancehelp;

import android.app.*;
import android.content.*;
import android.content.pm.ServiceInfo;
import android.graphics.*;
import android.hardware.display.*;
import android.media.ImageReader;
import android.media.projection.*;
import android.os.*;
import android.util.Base64;

import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.*;

public class ScreenShareService extends Service {
    static final String START = "com.example.distancehelp.START";
    static final String STOP = "com.example.distancehelp.STOP";
    static final String RESULT_CODE = "result_code";
    static final String RESULT_DATA = "result_data";
    private static final int PORT = 8765;
    private static final int NOTIFICATION_ID = 211;
    private static final String CHANNEL = "sharing";
    private static final long MAX_MS = 15L * 60L * 1000L;

    public static volatile boolean isSharing = false;
    public static volatile String viewUrl = null;
    public static volatile String lastStatus = "Сеанс не запущен";

    private final Handler main = new Handler(Looper.getMainLooper());
    private final ExecutorService pool = Executors.newCachedThreadPool();
    private final AtomicReference<byte[]> frameData = new AtomicReference<>();
    private final AtomicLong frameId = new AtomicLong();
    private volatile boolean running = false;
    private String key;
    private ServerSocket listener;
    private MediaProjection projection;
    private VirtualDisplay display;
    private ImageReader imageReader;
    private HandlerThread captureThread;
    private long lastFrameMillis;
    private final Runnable expire = this::stopSelf;

    @Override public IBinder onBind(Intent intent) { return null; }

    @Override public void onCreate() {
        super.onCreate();
        NotificationManager nm = (NotificationManager)getSystemService(NOTIFICATION_SERVICE);
        nm.createNotificationChannel(new NotificationChannel(CHANNEL, "Показ экрана", NotificationManager.IMPORTANCE_LOW));
    }

    @Override public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && STOP.equals(intent.getAction())) {
            stopSelf();
            return START_NOT_STICKY;
        }
        if (intent == null || !START.equals(intent.getAction()) || running) return START_NOT_STICKY;
        startForeground(NOTIFICATION_ID, notification(), ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PROJECTION);
        try {
            int code = intent.getIntExtra(RESULT_CODE, Activity.RESULT_CANCELED);
            if (code != Activity.RESULT_OK) throw new IllegalStateException("Нет согласия на показ");
            Intent token;
            if (Build.VERSION.SDK_INT >= 33) {
                token = intent.getParcelableExtra(RESULT_DATA, Intent.class);
            } else {
                token = intent.getParcelableExtra(RESULT_DATA);
            }
            if (token == null) throw new IllegalStateException("Отсутствует разрешение");
            String local = wifiIp();
            if (local == null) throw new IllegalStateException("Подключитесь к Wi-Fi");
            byte[] bytes = new byte[24];
            new SecureRandom().nextBytes(bytes);
            key = Base64.encodeToString(bytes, Base64.URL_SAFE | Base64.NO_WRAP | Base64.NO_PADDING);
            MediaProjectionManager pm = (MediaProjectionManager)getSystemService(MEDIA_PROJECTION_SERVICE);
            projection = pm.getMediaProjection(code, token);
            if (projection == null) throw new IllegalStateException("Не удалось запустить показ");
            running = true;
            capture();
            httpServer();
            viewUrl = "http://" + local + ":" + PORT + "/?key=" + key;
            isSharing = true;
            lastStatus = "Показ экрана активен — не дольше 15 минут";
            main.postDelayed(expire, MAX_MS);
        } catch (Exception error) {
            lastStatus = "Ошибка: " + error.getMessage();
            stopSelf();
        }
        return START_NOT_STICKY;
    }

    private Notification notification() {
        Intent stop = new Intent(this, ScreenShareService.class).setAction(STOP);
        PendingIntent stopAction = PendingIntent.getService(this, 3, stop, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        PendingIntent showApp = PendingIntent.getActivity(this, 4, new Intent(this, MainActivity.class), PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        return new Notification.Builder(this, CHANNEL)
            .setSmallIcon(android.R.drawable.ic_menu_view)
            .setContentTitle("Показ экрана включён")
            .setContentText("Другой телефон может видеть ваш экран")
            .setContentIntent(showApp)
            .setOngoing(true)
            .addAction(new Notification.Action.Builder(null, "Остановить", stopAction).build())
            .build();
    }

    private void capture() {
        int screenW = getResources().getDisplayMetrics().widthPixels;
        int screenH = getResources().getDisplayMetrics().heightPixels;
        int dpi = getResources().getDisplayMetrics().densityDpi;
        float scale = Math.min(1f, 900f / Math.max(screenW, screenH));
        int w = Math.max(2, ((int)(screenW * scale)) & ~1);
        int h = Math.max(2, ((int)(screenH * scale)) & ~1);
        captureThread = new HandlerThread("screen-capture");
        captureThread.start();
        Handler handler = new Handler(captureThread.getLooper());
        projection.registerCallback(new MediaProjection.Callback() {
            @Override public void onStop() { lastStatus = "Android остановил показ"; stopSelf(); }
        }, main);
        imageReader = ImageReader.newInstance(w, h, PixelFormat.RGBA_8888, 2);
        imageReader.setOnImageAvailableListener(reader -> {
            android.media.Image frame = reader.acquireLatestImage();
            if (frame == null) return;
            try {
                long time = SystemClock.elapsedRealtime();
                if (!running || time - lastFrameMillis < 450) return;
                lastFrameMillis = time;
                android.media.Image.Plane plane = frame.getPlanes()[0];
                int paddedWidth = plane.getRowStride() / plane.getPixelStride();
                Bitmap full = Bitmap.createBitmap(paddedWidth, h, Bitmap.Config.ARGB_8888);
                try {
                    plane.getBuffer().rewind();
                    full.copyPixelsFromBuffer(plane.getBuffer());
                    Bitmap crop = Bitmap.createBitmap(full, 0, 0, w, h);
                    try {
                        ByteArrayOutputStream jpg = new ByteArrayOutputStream();
                        crop.compress(Bitmap.CompressFormat.JPEG, 60, jpg);
                        frameData.set(jpg.toByteArray());
                        frameId.incrementAndGet();
                    } finally { crop.recycle(); }
                } finally { full.recycle(); }
            } catch (Exception ignored) { } finally { frame.close(); }
        }, handler);
        display = projection.createVirtualDisplay("DistanceHelp", w, h, dpi,
            DisplayManager.VIRTUAL_DISPLAY_FLAG_AUTO_MIRROR, imageReader.getSurface(), null, handler);
    }

    private void httpServer() throws IOException {
        listener = new ServerSocket(PORT, 3);
        pool.execute(() -> {
            while (running && !listener.isClosed()) {
                try {
                    Socket socket = listener.accept();
                    pool.execute(() -> handle(socket));
                } catch (Exception error) {
                    if (!running) return;
                }
            }
        });
    }

    private void handle(Socket socket) {
        try (Socket client = socket) {
            InetAddress origin = client.getInetAddress();
            if (!origin.isSiteLocalAddress() && !origin.isLinkLocalAddress()) return;
            client.setSoTimeout(12000);
            BufferedReader input = new BufferedReader(new InputStreamReader(client.getInputStream(), StandardCharsets.US_ASCII));
            String line = input.readLine();
            if (line == null || line.length() > 4096 || !line.startsWith("GET ")) return;
            String[] parts = line.split(" ");
            if (parts.length < 2) return;
            android.net.Uri uri = android.net.Uri.parse(parts[1]);
            String supplied = uri.getQueryParameter("key");
            if (supplied == null || key == null || !MessageDigest.isEqual(
                supplied.getBytes(StandardCharsets.US_ASCII), key.getBytes(StandardCharsets.US_ASCII))) {
                reply(client, 403, "text/plain; charset=utf-8", "Доступ закрыт".getBytes(StandardCharsets.UTF_8));
                return;
            }
            if ("/stream".equals(uri.getPath())) stream(client);
            else if ("/".equals(uri.getPath())) {
                String html = "<!doctype html><html lang='ru'><meta name='viewport' content='width=device-width,initial-scale=1'>" +
                    "<meta charset='utf-8'><title>Дистанционная помощь</title><style>body{font-family:Arial;background:#101b2a;color:white;text-align:center;padding:12px}img{max-width:100%;max-height:80vh;object-fit:contain}</style>" +
                    "<h2>Показ экрана с разрешения владельца</h2><img src='/stream?key=" + key + "'><p>Только просмотр экрана. Нажатия недоступны.</p></html>";
                reply(client, 200, "text/html; charset=utf-8", html.getBytes(StandardCharsets.UTF_8));
            } else reply(client, 404, "text/plain", "Нет страницы".getBytes(StandardCharsets.UTF_8));
        } catch (Exception ignored) { }
    }

    private void reply(Socket client, int status, String type, byte[] bytes) throws IOException {
        OutputStream out = client.getOutputStream();
        String header = "HTTP/1.1 " + status + (status==200 ? " OK" : " Error") +
            "\r\nContent-Type: " + type + "\r\nContent-Length: " + bytes.length +
            "\r\nCache-Control: no-store\r\nX-Content-Type-Options: nosniff\r\nConnection: close\r\n\r\n";
        out.write(header.getBytes(StandardCharsets.US_ASCII));
        out.write(bytes);
        out.flush();
    }

    private void stream(Socket client) throws Exception {
        OutputStream out = client.getOutputStream();
        out.write("HTTP/1.1 200 OK\r\nContent-Type: multipart/x-mixed-replace; boundary=frame\r\nCache-Control: no-store\r\n\r\n".getBytes(StandardCharsets.US_ASCII));
        long last = -1;
        while (running && !client.isClosed()) {
            byte[] pic = frameData.get();
            long latest = frameId.get();
            if (pic != null && latest != last) {
                last = latest;
                out.write(("--frame\r\nContent-Type: image/jpeg\r\nContent-Length: " + pic.length + "\r\n\r\n").getBytes(StandardCharsets.US_ASCII));
                out.write(pic);
                out.write("\r\n".getBytes(StandardCharsets.US_ASCII));
                out.flush();
            } else Thread.sleep(180);
        }
    }

    private String wifiIp() throws SocketException {
        Enumeration<NetworkInterface> networks = NetworkInterface.getNetworkInterfaces();
        String backup = null;
        while (networks.hasMoreElements()) {
            NetworkInterface item = networks.nextElement();
            if (!item.isUp() || item.isLoopback()) continue;
            Enumeration<InetAddress> addresses = item.getInetAddresses();
            while (addresses.hasMoreElements()) {
                InetAddress ip = addresses.nextElement();
                if (ip instanceof Inet4Address && ip.isSiteLocalAddress()) {
                    if (item.getName().startsWith("wlan")) return ip.getHostAddress();
                    backup = ip.getHostAddress();
                }
            }
        }
        return backup;
    }

    @Override public void onDestroy() {
        running = false;
        isSharing = false;
        viewUrl = null;
        key = null;
        main.removeCallbacks(expire);
        try { if (listener != null) listener.close(); } catch (Exception ignored) { }
        try { if (display != null) display.release(); } catch (Exception ignored) { }
        try { if (imageReader != null) imageReader.close(); } catch (Exception ignored) { }
        try { if (projection != null) projection.stop(); } catch (Exception ignored) { }
        if (captureThread != null) captureThread.quitSafely();
        pool.shutdownNow();
        if (!lastStatus.startsWith("Ошибка") && !lastStatus.startsWith("Android остановил")) lastStatus = "Сеанс завершён";
        super.onDestroy();
    }
}
