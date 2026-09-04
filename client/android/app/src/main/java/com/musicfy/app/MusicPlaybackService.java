package com.musicfy.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.os.Binder;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;
import android.support.v4.media.MediaMetadataCompat;
import android.support.v4.media.session.MediaSessionCompat;
import android.support.v4.media.session.PlaybackStateCompat;

import androidx.core.app.NotificationCompat;
import androidx.media.app.NotificationCompat.MediaStyle;

import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

public class MusicPlaybackService extends Service {

    public static final String CHANNEL_ID = "musicfy_playback_channel";
    public static final int NOTIFICATION_ID = 10101;

    public static final String ACTION_PLAY = "com.musicfy.app.PLAY";
    public static final String ACTION_PAUSE = "com.musicfy.app.PAUSE";
    public static final String ACTION_PREV = "com.musicfy.app.PREV";
    public static final String ACTION_NEXT = "com.musicfy.app.NEXT";
    public static final String ACTION_STOP = "com.musicfy.app.STOP";
    public static final String ACTION_UPDATE = "com.musicfy.app.UPDATE";

    public static final String EXTRA_TITLE = "extra_title";
    public static final String EXTRA_ARTIST = "extra_artist";
    public static final String EXTRA_ARTWORK = "extra_artwork";
    public static final String EXTRA_IS_PLAYING = "extra_is_playing";

    private MediaSessionCompat mediaSession;
    private PowerManager.WakeLock wakeLock;
    private NotificationManager notificationManager;

    private String currentTitle = "Musicfy";
    private String currentArtist = "Playing Music";
    private String currentArtworkUrl = "";
    private boolean isPlaying = false;
    private Bitmap currentArtBitmap = null;

    private final IBinder binder = new LocalBinder();

    public class LocalBinder extends Binder {
        public MusicPlaybackService getService() {
            return MusicPlaybackService.this;
        }
    }

    @Override
    public void onCreate() {
        super.onCreate();

        notificationManager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        createNotificationChannel();

        PowerManager powerManager = (PowerManager) getSystemService(Context.POWER_SERVICE);
        if (powerManager != null) {
            wakeLock = powerManager.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "Musicfy:AudioWakeLock");
            wakeLock.setReferenceCounted(false);
        }

        mediaSession = new MediaSessionCompat(this, "MusicfyMediaSession");
        mediaSession.setFlags(MediaSessionCompat.FLAG_HANDLES_MEDIA_BUTTONS | MediaSessionCompat.FLAG_HANDLES_TRANSPORT_CONTROLS);
        mediaSession.setActive(true);

        mediaSession.setCallback(new MediaSessionCompat.Callback() {
            @Override
            public void onPlay() {
                NativeAudioPlugin.notifyAction("play");
            }

            @Override
            public void onPause() {
                NativeAudioPlugin.notifyAction("pause");
            }

            @Override
            public void onSkipToNext() {
                NativeAudioPlugin.notifyAction("next");
            }

            @Override
            public void onSkipToPrevious() {
                NativeAudioPlugin.notifyAction("prev");
            }

            @Override
            public void onStop() {
                NativeAudioPlugin.notifyAction("stop");
                stopForeground(true);
                stopSelf();
            }

            @Override
            public void onSeekTo(long pos) {
                NativeAudioPlugin.notifySeek(pos / 1000);
            }
        });
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "Musicfy Playback",
                    NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Music playback controls and lock screen widgets");
            channel.setShowBadge(false);
            channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
            if (notificationManager != null) {
                notificationManager.createNotificationChannel(channel);
            }
        }
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && intent.getAction() != null) {
            String action = intent.getAction();

            if (ACTION_UPDATE.equals(action)) {
                currentTitle = intent.getStringExtra(EXTRA_TITLE);
                if (currentTitle == null) currentTitle = "Musicfy";
                currentArtist = intent.getStringExtra(EXTRA_ARTIST);
                if (currentArtist == null) currentArtist = "Playing Music";
                String newArtUrl = intent.getStringExtra(EXTRA_ARTWORK);
                isPlaying = intent.getBooleanExtra(EXTRA_IS_PLAYING, true);

                if (newArtUrl != null && !newArtUrl.equals(currentArtworkUrl)) {
                    currentArtworkUrl = newArtUrl;
                    loadArtworkAsync(newArtUrl);
                } else {
                    updateNotificationAndSession();
                }

                if (isPlaying) {
                    acquireWakeLock();
                } else {
                    releaseWakeLock();
                }
            } else if (ACTION_PLAY.equals(action)) {
                NativeAudioPlugin.notifyAction("play");
            } else if (ACTION_PAUSE.equals(action)) {
                NativeAudioPlugin.notifyAction("pause");
            } else if (ACTION_NEXT.equals(action)) {
                NativeAudioPlugin.notifyAction("next");
            } else if (ACTION_PREV.equals(action)) {
                NativeAudioPlugin.notifyAction("prev");
            } else if (ACTION_STOP.equals(action)) {
                releaseWakeLock();
                stopForeground(true);
                stopSelf();
            }
        }

        return START_STICKY;
    }

    private void acquireWakeLock() {
        if (wakeLock != null && !wakeLock.isHeld()) {
            wakeLock.acquire(12 * 60 * 60 * 1000L); // 12 hours max safety
        }
    }

    private void releaseWakeLock() {
        if (wakeLock != null && wakeLock.isHeld()) {
            wakeLock.release();
        }
    }

    private void loadArtworkAsync(final String urlString) {
        new Thread(new Runnable() {
            @Override
            public void run() {
                Bitmap bitmap = null;
                try {
                    URL url = new URL(urlString);
                    HttpURLConnection connection = (HttpURLConnection) url.openConnection();
                    connection.setDoInput(true);
                    connection.setConnectTimeout(5000);
                    connection.setReadTimeout(5000);
                    connection.connect();
                    InputStream input = connection.getInputStream();
                    bitmap = BitmapFactory.decodeStream(input);
                } catch (Exception e) {
                    bitmap = null;
                }
                currentArtBitmap = bitmap;
                updateNotificationAndSession();
            }
        }).start();
    }

    private void updateNotificationAndSession() {
        // Update MediaSession state
        int state = isPlaying ? PlaybackStateCompat.STATE_PLAYING : PlaybackStateCompat.STATE_PAUSED;
        long actions = PlaybackStateCompat.ACTION_PLAY | PlaybackStateCompat.ACTION_PAUSE |
                PlaybackStateCompat.ACTION_PLAY_PAUSE | PlaybackStateCompat.ACTION_SKIP_TO_NEXT |
                PlaybackStateCompat.ACTION_SKIP_TO_PREVIOUS | PlaybackStateCompat.ACTION_STOP |
                PlaybackStateCompat.ACTION_SEEK_TO;

        PlaybackStateCompat.Builder stateBuilder = new PlaybackStateCompat.Builder()
                .setActions(actions)
                .setState(state, PlaybackStateCompat.PLAYBACK_POSITION_UNKNOWN, 1.0f);

        mediaSession.setPlaybackState(stateBuilder.build());

        MediaMetadataCompat.Builder metaBuilder = new MediaMetadataCompat.Builder()
                .putString(MediaMetadataCompat.METADATA_KEY_TITLE, currentTitle)
                .putString(MediaMetadataCompat.METADATA_KEY_ARTIST, currentArtist)
                .putString(MediaMetadataCompat.METADATA_KEY_ALBUM, "Musicfy");

        if (currentArtBitmap != null) {
            metaBuilder.putBitmap(MediaMetadataCompat.METADATA_KEY_ALBUM_ART, currentArtBitmap);
        }
        mediaSession.setMetadata(metaBuilder.build());

        // Build Foreground Notification
        Intent openAppIntent = new Intent(this, MainActivity.class);
        openAppIntent.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent contentPendingIntent = PendingIntent.getActivity(
                this,
                0,
                openAppIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        PendingIntent prevPendingIntent = PendingIntent.getService(
                this, 1, new Intent(this, MusicPlaybackService.class).setAction(ACTION_PREV),
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        PendingIntent playPausePendingIntent = PendingIntent.getService(
                this, 2, new Intent(this, MusicPlaybackService.class).setAction(isPlaying ? ACTION_PAUSE : ACTION_PLAY),
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        PendingIntent nextPendingIntent = PendingIntent.getService(
                this, 3, new Intent(this, MusicPlaybackService.class).setAction(ACTION_NEXT),
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        PendingIntent stopPendingIntent = PendingIntent.getService(
                this, 4, new Intent(this, MusicPlaybackService.class).setAction(ACTION_STOP),
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setSmallIcon(android.R.drawable.ic_media_play)
                .setContentTitle(currentTitle)
                .setContentText(currentArtist)
                .setSubText("Musicfy")
                .setContentIntent(contentPendingIntent)
                .setDeleteIntent(stopPendingIntent)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .setOngoing(isPlaying)
                .setShowWhen(false)
                .addAction(android.R.drawable.ic_media_previous, "Previous", prevPendingIntent)
                .addAction(
                        isPlaying ? android.R.drawable.ic_media_pause : android.R.drawable.ic_media_play,
                        isPlaying ? "Pause" : "Play",
                        playPausePendingIntent
                )
                .addAction(android.R.drawable.ic_media_next, "Next", nextPendingIntent)
                .setStyle(new MediaStyle()
                        .setMediaSession(mediaSession.getSessionToken())
                        .setShowActionsInCompactView(0, 1, 2)
                        .setShowCancelButton(true)
                        .setCancelButtonIntent(stopPendingIntent));

        if (currentArtBitmap != null) {
            builder.setLargeIcon(currentArtBitmap);
        }

        Notification notification = builder.build();

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
        } else {
            startForeground(NOTIFICATION_ID, notification);
        }
    }

    @Override
    public void onDestroy() {
        releaseWakeLock();
        if (mediaSession != null) {
            mediaSession.setActive(false);
            mediaSession.release();
        }
        stopForeground(true);
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return binder;
    }
}
