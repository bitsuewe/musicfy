package com.musicfy.app;

import android.content.Context;
import android.content.Intent;
import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "NativeAudioPlugin")
public class NativeAudioPlugin extends Plugin {

    private static NativeAudioPlugin instance;

    @Override
    public void load() {
        super.load();
        instance = this;
    }

    public static void notifyAction(String action) {
        if (instance != null) {
            JSObject ret = new JSObject();
            ret.put("action", action);
            instance.notifyListeners("mediaAction", ret);
        }
    }

    public static void notifySeek(long positionSec) {
        if (instance != null) {
            JSObject ret = new JSObject();
            ret.put("action", "seek");
            ret.put("position", positionSec);
            instance.notifyListeners("mediaAction", ret);
        }
    }

    @PluginMethod
    public void updateTrackInfo(PluginCall call) {
        String title = call.getString("title", "Musicfy");
        String artist = call.getString("artist", "Playing Music");
        String artwork = call.getString("artwork", "");
        Boolean isPlaying = call.getBoolean("isPlaying", true);

        Context context = getContext();
        if (context != null) {
            Intent intent = new Intent(context, MusicPlaybackService.class);
            intent.setAction(MusicPlaybackService.ACTION_UPDATE);
            intent.putExtra(MusicPlaybackService.EXTRA_TITLE, title);
            intent.putExtra(MusicPlaybackService.EXTRA_ARTIST, artist);
            intent.putExtra(MusicPlaybackService.EXTRA_ARTWORK, artwork);
            intent.putExtra(MusicPlaybackService.EXTRA_IS_PLAYING, isPlaying != null ? isPlaying : true);

            try {
                ContextCompat.startForegroundService(context, intent);
                call.resolve();
            } catch (Exception e) {
                call.reject("Failed to start playback service: " + e.getMessage());
            }
        } else {
            call.reject("Context is null");
        }
    }

    @PluginMethod
    public void stopPlayback(PluginCall call) {
        Context context = getContext();
        if (context != null) {
            Intent intent = new Intent(context, MusicPlaybackService.class);
            intent.setAction(MusicPlaybackService.ACTION_STOP);
            try {
                context.startService(intent);
                call.resolve();
            } catch (Exception e) {
                call.reject("Failed to stop service: " + e.getMessage());
            }
        } else {
            call.reject("Context is null");
        }
    }
}
