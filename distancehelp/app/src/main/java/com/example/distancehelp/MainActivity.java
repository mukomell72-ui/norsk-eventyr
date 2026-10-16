package com.example.distancehelp;

import android.Manifest;
import android.app.Activity;
import android.content.*;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.media.projection.MediaProjectionManager;
import android.os.*;
import android.view.View;
import android.widget.*;

public class MainActivity extends Activity {
    private final Handler handler = new Handler(Looper.getMainLooper());
    private TextView status, url;
    private Button start, stop, copy;
    private final Runnable updater = new Runnable() {
        @Override public void run() { updateUi(); handler.postDelayed(this, 700); }
    };

    @Override protected void onCreate(Bundle saved) {
        super.onCreate(saved);
        ScrollView scroll = new ScrollView(this);
        scroll.setBackgroundColor(Color.rgb(245, 247, 250));
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        int p = (int)(24 * getResources().getDisplayMetrics().density);
        root.setPadding(p, p, p, p);
        scroll.addView(root);

        TextView title = label("Дистанционная помощь", 26);
        title.setTextColor(Color.rgb(29, 57, 90));
        root.addView(title);
        root.addView(label("Безопасный показ экрана другому телефону с разрешения владельца.", 17));
        status = label("Сеанс не запущен", 18);
        root.addView(status);
        url = label("Ссылка появится после разрешения", 15);
        url.setTextIsSelectable(true);
        root.addView(url);

        start = new Button(this);
        start.setText("Разрешить показ экрана");
        start.setOnClickListener(v -> requestShare());
        root.addView(start);

        copy = new Button(this);
        copy.setText("Копировать ссылку");
        copy.setOnClickListener(v -> {
            String link = ScreenShareService.viewUrl;
            if (link != null) {
                ClipboardManager cb = (ClipboardManager)getSystemService(CLIPBOARD_SERVICE);
                cb.setPrimaryClip(ClipData.newPlainText("Ссылка на экран", link));
                Toast.makeText(this, "Ссылка скопирована", Toast.LENGTH_SHORT).show();
            }
        });
        root.addView(copy);

        stop = new Button(this);
        stop.setText("ОСТАНОВИТЬ ПОКАЗ");
        stop.setOnClickListener(v -> startService(new Intent(this, ScreenShareService.class).setAction(ScreenShareService.STOP)));
        root.addView(stop);

        root.addView(label("1. Подключите оба телефона к одной доверенной сети Wi-Fi.\n\n2. Нажмите «Разрешить показ экрана» и подтвердите запрос Android.\n\n3. Скопируйте ссылку и откройте её на втором телефоне в браузере.\n\n4. Нажмите «Остановить показ» в приложении или уведомлении. Автоматическое завершение через 15 минут.", 15));
        TextView warning = label("Внимание: приложение только показывает экран. Нажатия и удалённое управление не поддерживаются. Передача по HTTP не зашифрована — используйте только доверенный Wi-Fi.", 14);
        warning.setTextColor(Color.rgb(148, 44, 33));
        root.addView(warning);
        setContentView(scroll);
    }

    private TextView label(String text, int sp) {
        TextView view = new TextView(this);
        view.setText(text);
        view.setTextSize(sp);
        view.setTextColor(Color.DKGRAY);
        view.setPadding(0, 0, 0, (int)(18*getResources().getDisplayMetrics().density));
        return view;
    }

    private void requestShare() {
        if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)
                != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, 22);
        }
        MediaProjectionManager mgr = (MediaProjectionManager)getSystemService(MEDIA_PROJECTION_SERVICE);
        startActivityForResult(mgr.createScreenCaptureIntent(), 9102);
    }

    @Override @Deprecated protected void onActivityResult(int request, int result, Intent data) {
        super.onActivityResult(request, result, data);
        if (request != 9102 || result != RESULT_OK || data == null) return;
        Intent service = new Intent(this, ScreenShareService.class);
        service.setAction(ScreenShareService.START);
        service.putExtra(ScreenShareService.RESULT_CODE, result);
        service.putExtra(ScreenShareService.RESULT_DATA, data);
        startForegroundService(service);
    }

    private void updateUi() {
        status.setText(ScreenShareService.lastStatus);
        url.setText(ScreenShareService.viewUrl == null ? "Ссылка появится после разрешения" : ScreenShareService.viewUrl);
        start.setEnabled(!ScreenShareService.isSharing);
        stop.setEnabled(ScreenShareService.isSharing);
        copy.setEnabled(ScreenShareService.isSharing && ScreenShareService.viewUrl != null);
    }
    @Override protected void onResume() { super.onResume(); handler.removeCallbacks(updater); handler.post(updater); }
    @Override protected void onPause() { handler.removeCallbacks(updater); super.onPause(); }
}
