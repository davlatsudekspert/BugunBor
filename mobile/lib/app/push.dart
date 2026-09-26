import 'dart:async';

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/api_error.dart';
import '../core/env.dart';
import 'providers.dart';

/// A notification that arrived while the app was open.
typedef ForegroundPush = ({String title, String body, String? link});

/// Push through Firebase Cloud Messaging. The server sends to the app first
/// and falls back to Telegram, so a phone without push loses nothing.
/// Nothing here runs unless the build has push (see [Env.pushEnabled]).
class PushService {
  PushService(this._ref);
  final Ref _ref;
  bool _ready = false;
  final _subscriptions = <StreamSubscription<Object?>>[];

  bool get available => _ready;

  /// Starts Firebase and routes taps on notifications to [onOpen].
  Future<void> init({required void Function(String link) onOpen, required void Function(ForegroundPush push) onForeground}) async {
    if (!Env.pushEnabled || _ready) return;
    try {
      await Firebase.initializeApp();
      _ready = true;
      // Screens that asked before Firebase was up ask again.
      _ref.invalidate(pushAllowedProvider);
    } catch (_) {
      return;
    }
    final messaging = FirebaseMessaging.instance;
    _subscriptions
      ..add(
        FirebaseMessaging.onMessage.listen((message) {
          final notification = message.notification;
          if (notification == null) return;
          onForeground((title: notification.title ?? 'BugunBor', body: notification.body ?? '', link: message.data['link'] as String?));
        }),
      )
      ..add(
        FirebaseMessaging.onMessageOpenedApp.listen((message) {
          final link = message.data['link'];
          if (link is String) onOpen(link);
        }),
      )
      ..add(messaging.onTokenRefresh.listen((token) => _register(token)));
    final initial = await messaging.getInitialMessage();
    final link = initial?.data['link'];
    if (link is String) onOpen(link);
    await syncToken();
  }

  /// The phone lets the app show notifications.
  Future<bool> allowed() async {
    if (!_ready) return false;
    try {
      final settings = await FirebaseMessaging.instance.getNotificationSettings();
      return _granted(settings.authorizationStatus);
    } catch (_) {
      return false;
    }
  }

  /// Asks the phone (Android 13+ shows its dialog once) and registers.
  Future<bool> enable() async {
    if (!_ready) return false;
    try {
      final settings = await FirebaseMessaging.instance.requestPermission();
      final granted = _granted(settings.authorizationStatus);
      if (granted) await syncToken();
      _ref.invalidate(pushAllowedProvider);
      return granted;
    } catch (_) {
      return false;
    }
  }

  /// Registers this phone's token for the signed-in person (safe to repeat).
  Future<void> syncToken() async {
    if (!_ready || !_ref.read(sessionProvider).signedIn || !await allowed()) return;
    try {
      final token = await FirebaseMessaging.instance.getToken();
      if (token != null) await _register(token);
    } catch (_) {
      // Retried at the next start or sign-in.
    }
  }

  Future<void> _register(String token) async {
    if (!_ref.read(sessionProvider).signedIn) return;
    try {
      await _ref.read(apiProvider).registerDevice(token, locale: _ref.read(settingsProvider).locale);
      _ref.read(prefsProvider).pushToken = token;
    } on ApiError {
      // Retried at the next start.
    }
  }

  /// Before signing out: this phone stops getting that person's notifications.
  Future<void> unregister() async {
    final prefs = _ref.read(prefsProvider);
    final token = prefs.pushToken;
    if (token == null) return;
    try {
      await _ref.read(apiProvider).removeDevice(token);
    } on ApiError {
      // The server also drops tokens Firebase reports as dead.
    }
    prefs.pushToken = null;
  }

  static bool _granted(AuthorizationStatus status) => status == AuthorizationStatus.authorized || status == AuthorizationStatus.provisional;

  void dispose() {
    for (final subscription in _subscriptions) {
      subscription.cancel();
    }
  }
}

final pushProvider = Provider<PushService>((ref) {
  final service = PushService(ref);
  ref.onDispose(service.dispose);
  return service;
});

final pushAllowedProvider = FutureProvider<bool>((ref) => ref.watch(pushProvider).allowed());
