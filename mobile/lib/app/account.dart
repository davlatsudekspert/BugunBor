import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/api_error.dart';
import 'providers.dart';
import 'push.dart';

/// Sign-in, sign-out and account deletion, with everything that has to
/// happen around them (interests picked as a guest, push token, language).
class AccountService {
  AccountService(this._ref);
  final Ref _ref;

  Future<void> signIn(String token) async {
    await _ref.read(sessionProvider.notifier).signIn(token);
    final api = _ref.read(apiProvider);
    final settings = _ref.read(settingsProvider);
    try {
      final me = await _ref.read(meProvider.future);
      if (me != null) {
        // Interests chosen before signing in move to the account once.
        if (me.interests.isEmpty && settings.guestInterests.isNotEmpty) {
          await api.setInterests(settings.guestInterests);
          _ref.invalidate(meProvider);
        }
        // Telegram messages follow the app language (the server speaks uz/ru).
        if ((settings.locale == 'uz' || settings.locale == 'ru') && me.locale != settings.locale) {
          await api.updateMe(locale: settings.locale);
        }
      }
    } on ApiError {
      // The account works without these; the next screen shows any real error.
    }
    await _ref.read(pushProvider).syncToken();
  }

  Future<void> signOut() async {
    await _ref.read(pushProvider).unregister();
    try {
      await _ref.read(apiProvider).logout();
    } on ApiError {
      // The session is forgotten on the phone either way.
    }
    await _ref.read(sessionProvider.notifier).signOut();
  }

  /// Throws [ApiError] `SOLE_OWNER` when the person alone owns a business and
  /// [closeBusinesses] is false.
  Future<void> deleteAccount({bool closeBusinesses = false}) async {
    await _ref.read(pushProvider).unregister();
    await _ref.read(apiProvider).deleteAccount(closeBusinesses: closeBusinesses);
    await _ref.read(sessionProvider.notifier).signOut();
  }

  /// The app language; a signed-in account also gets it for Telegram and push.
  Future<void> setLocale(String locale) async {
    _ref.read(settingsProvider.notifier).setLocale(locale);
    if (!_ref.read(sessionProvider).signedIn) return;
    try {
      if (locale == 'uz' || locale == 'ru') await _ref.read(apiProvider).updateMe(locale: locale);
    } on ApiError {
      // Kept on the phone; the server keeps the old language until next time.
    }
    await _ref.read(pushProvider).syncToken();
  }

  /// Saves interests to the account, or on the phone for a guest.
  Future<void> setInterests(List<String> slugs) async {
    _ref.read(settingsProvider.notifier).setGuestInterests(slugs);
    if (_ref.read(sessionProvider).signedIn) {
      await _ref.read(apiProvider).setInterests(slugs);
      _ref.invalidate(meProvider);
    }
    _ref.invalidate(feedProvider);
  }
}

final accountProvider = Provider<AccountService>(AccountService.new);
