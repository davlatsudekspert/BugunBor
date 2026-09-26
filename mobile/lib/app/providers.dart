import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';

import '../core/storage.dart';
import '../data/api.dart';
import '../data/models.dart';

// App-wide state. Everything that belongs to a signed-in person watches the
// session token, so a sign-in, sign-out or expired session drops old data
// (including an error cached before sign-in) and asks the server again.

/// Overridden in main() with the real instances.
final prefsProvider = Provider<Prefs>((ref) => throw UnimplementedError('prefsProvider'));
final sessionStoreProvider = Provider<SessionStore>((ref) => SessionStore());
final initialTokenProvider = Provider<String?>((ref) => null);

class AppSettings {
  const AppSettings({
    required this.locale,
    required this.theme,
    required this.city,
    required this.guestInterests,
    required this.onboarded,
    required this.useLocation,
  });

  final String locale;
  final String theme;
  final String? city;
  final List<String> guestInterests;
  final bool onboarded;
  final bool useLocation;

  ThemeMode get themeMode => switch (theme) {
    'light' => ThemeMode.light,
    'dark' => ThemeMode.dark,
    _ => ThemeMode.system,
  };

  AppSettings copyWith({String? locale, String? theme, String? city, List<String>? guestInterests, bool? onboarded, bool? useLocation}) => AppSettings(
    locale: locale ?? this.locale,
    theme: theme ?? this.theme,
    city: city ?? this.city,
    guestInterests: guestInterests ?? this.guestInterests,
    onboarded: onboarded ?? this.onboarded,
    useLocation: useLocation ?? this.useLocation,
  );
}

/// The phone's language if we support it, otherwise Uzbek.
String defaultLocale() {
  final code = WidgetsBinding.instance.platformDispatcher.locale.languageCode;
  return const ['uz', 'ru', 'en'].contains(code) ? code : 'uz';
}

class SettingsNotifier extends Notifier<AppSettings> {
  @override
  AppSettings build() {
    final prefs = ref.watch(prefsProvider);
    return AppSettings(
      locale: prefs.locale ?? defaultLocale(),
      theme: prefs.theme,
      city: prefs.city,
      guestInterests: prefs.guestInterests,
      onboarded: prefs.onboarded,
      useLocation: prefs.useLocation,
    );
  }

  Prefs get _prefs => ref.read(prefsProvider);

  void setLocale(String locale) {
    _prefs.locale = locale;
    state = state.copyWith(locale: locale);
  }

  void setTheme(String theme) {
    _prefs.theme = theme;
    state = state.copyWith(theme: theme);
  }

  void setCity(String city) {
    _prefs.city = city;
    state = state.copyWith(city: city);
  }

  void setGuestInterests(List<String> interests) {
    _prefs.guestInterests = interests;
    state = state.copyWith(guestInterests: interests);
  }

  void setUseLocation(bool on) {
    _prefs.useLocation = on;
    state = state.copyWith(useLocation: on);
  }

  void finishOnboarding() {
    _prefs.onboarded = true;
    state = state.copyWith(onboarded: true);
  }
}

final settingsProvider = NotifierProvider<SettingsNotifier, AppSettings>(SettingsNotifier.new);

class SessionState {
  const SessionState({this.token, this.expired = false});
  final String? token;

  /// The server rejected the token: show "your session ended" once.
  final bool expired;
  bool get signedIn => token != null;
}

class SessionNotifier extends Notifier<SessionState> {
  @override
  SessionState build() => SessionState(token: ref.read(initialTokenProvider));

  Future<void> signIn(String token) async {
    await ref.read(sessionStoreProvider).write(token);
    state = SessionState(token: token);
  }

  Future<void> signOut() async {
    await ref.read(sessionStoreProvider).clear();
    state = const SessionState();
  }

  /// Called once per rejected token (parallel 401s collapse into one).
  void expire() {
    if (state.token == null) return;
    ref.read(sessionStoreProvider).clear();
    state = const SessionState(expired: true);
  }

  void acknowledgeExpiry() {
    if (state.expired) state = const SessionState();
  }
}

final sessionProvider = NotifierProvider<SessionNotifier, SessionState>(SessionNotifier.new);

final apiProvider = Provider<BugunBorApi>(
  (ref) => BugunBorApi(
    locale: () => ref.read(settingsProvider).locale,
    token: () => ref.read(sessionProvider).token,
    onUnauthorized: () => ref.read(sessionProvider.notifier).expire(),
  ),
);

final configProvider = FutureProvider<AppConfig>((ref) => ref.watch(apiProvider).config());

/// The signed-in person, or null for guests.
final meProvider = FutureProvider<Me?>((ref) async {
  final token = ref.watch(sessionProvider.select((session) => session.token));
  if (token == null) return null;
  return ref.watch(apiProvider).me();
});

/// Interests in effect: the account's once signed in, the phone's before that.
final interestsProvider = Provider<List<String>>((ref) {
  final me = ref.watch(meProvider).value;
  return me?.interests ?? ref.watch(settingsProvider.select((settings) => settings.guestInterests));
});

/// A coarse position, only while the person allows it and the app is open.
class LocationNotifier extends Notifier<Position?> {
  @override
  Position? build() => null;

  /// Returns false when the phone refused (then the city is used instead).
  Future<bool> refresh({bool ask = false}) async {
    try {
      if (!await Geolocator.isLocationServiceEnabled()) return false;
      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied && ask) permission = await Geolocator.requestPermission();
      if (permission != LocationPermission.always && permission != LocationPermission.whileInUse) return false;
      final position =
          await Geolocator.getLastKnownPosition() ??
          await Geolocator.getCurrentPosition(
            locationSettings: const LocationSettings(accuracy: LocationAccuracy.low, timeLimit: Duration(seconds: 10)),
          );
      // A new position reloads the feed; small moves are not worth a request.
      final previous = state;
      if (previous == null || Geolocator.distanceBetween(previous.latitude, previous.longitude, position.latitude, position.longitude) > 200) {
        state = position;
      }
      return true;
    } catch (_) {
      return false;
    }
  }

  void clear() => state = null;
}

final locationProvider = NotifierProvider<LocationNotifier, Position?>(LocationNotifier.new);

final feedProvider = FutureProvider<Feed>((ref) async {
  // Only what changes the answer (not the theme or language).
  final city = ref.watch(settingsProvider.select((settings) => settings.city));
  final useLocation = ref.watch(settingsProvider.select((settings) => settings.useLocation));
  final guestInterests = ref.watch(settingsProvider.select((settings) => settings.guestInterests));
  final position = useLocation ? ref.watch(locationProvider) : null;
  final token = ref.watch(sessionProvider.select((session) => session.token));
  return ref.watch(apiProvider).feed(lat: position?.latitude, lng: position?.longitude, city: city, interests: token == null ? guestInterests : const []);
});

final dealProvider = FutureProvider.autoDispose.family<DealDetail, String>((ref, slug) {
  ref.watch(sessionProvider.select((session) => session.token));
  return ref.watch(apiProvider).deal(slug);
});

final businessProvider = FutureProvider.autoDispose.family<BusinessPage, String>((ref, slug) {
  ref.watch(sessionProvider.select((session) => session.token));
  return ref.watch(apiProvider).business(slug);
});

final myCodesProvider = FutureProvider<List<Redemption>>((ref) async {
  final token = ref.watch(sessionProvider.select((session) => session.token));
  if (token == null) return const [];
  return ref.watch(apiProvider).myCodes();
});

final favoritesProvider = FutureProvider<Favorites>((ref) async {
  final token = ref.watch(sessionProvider.select((session) => session.token));
  if (token == null) return const Favorites(live: [], ended: []);
  return ref.watch(apiProvider).favorites();
});

final followsProvider = FutureProvider<List<FollowedBusiness>>((ref) async {
  final token = ref.watch(sessionProvider.select((session) => session.token));
  if (token == null) return const [];
  return ref.watch(apiProvider).follows();
});
