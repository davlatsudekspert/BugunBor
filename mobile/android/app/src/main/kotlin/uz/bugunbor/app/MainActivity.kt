package uz.bugunbor.app

import android.app.NotificationChannel
import android.app.NotificationManager
import android.os.Build
import android.os.Bundle
import io.flutter.embedding.android.FlutterActivity

class MainActivity : FlutterActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        createDealsChannel()
    }

    // The server sends pushes to the "deals" channel; it must exist before
    // the first one arrives (Android 8+). Recreating it is a no-op.
    private fun createDealsChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val channel = NotificationChannel("deals", getString(R.string.notification_channel_deals), NotificationManager.IMPORTANCE_DEFAULT)
        channel.description = getString(R.string.notification_channel_deals_description)
        getSystemService(NotificationManager::class.java)?.createNotificationChannel(channel)
    }
}
