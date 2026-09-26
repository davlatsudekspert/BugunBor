import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// The session token lives only in the phone's protected storage (Android
/// Keystore); backup_rules.xml keeps it out of cloud backups.
class SessionStore {
  SessionStore([FlutterSecureStorage? storage]) : _storage = storage ?? const FlutterSecureStorage();

  static const _key = 'session_token';
  final FlutterSecureStorage _storage;

  Future<String?> read() async {
    try {
      return await _storage.read(key: _key);
    } catch (_) {
      return null;
    }
  }

  Future<void> write(String token) => _storage.write(key: _key, value: token);

  Future<void> clear() async {
    try {
      await _storage.delete(key: _key);
    } catch (_) {
      // Nothing to forget.
    }
  }
}

/// Plain, non-secret settings kept on the phone.
class Prefs {
  Prefs(this._prefs);
  final SharedPreferences _prefs;

  String? get locale => _prefs.getString('locale');
  set locale(String? value) => value == null ? _prefs.remove('locale') : _prefs.setString('locale', value);

  String get theme => _prefs.getString('theme') ?? 'system';
  set theme(String value) => _prefs.setString('theme', value);

  String? get city => _prefs.getString('city');
  set city(String? value) => value == null ? _prefs.remove('city') : _prefs.setString('city', value);

  /// Interests chosen before signing in (sent to the server after sign-in).
  List<String> get guestInterests => _prefs.getStringList('interests') ?? const [];
  set guestInterests(List<String> value) => _prefs.setStringList('interests', value);

  /// The home card explaining how BugunBor works was closed.
  bool get howHidden => _prefs.getBool('how_hidden') ?? false;
  set howHidden(bool value) => _prefs.setBool('how_hidden', value);

  bool get onboarded => _prefs.getBool('onboarded') ?? false;
  set onboarded(bool value) => _prefs.setBool('onboarded', value);

  /// The person agreed to share location while the app is open.
  bool get useLocation => _prefs.getBool('use_location') ?? false;
  set useLocation(bool value) => _prefs.setBool('use_location', value);

  /// What the Profile tab shows a business member: 'business' or 'personal'.
  String? get profileMode => _prefs.getString('profile_mode');
  set profileMode(String? value) => value == null ? _prefs.remove('profile_mode') : _prefs.setString('profile_mode', value);

  /// The business last chosen in the business profile.
  String? get businessId => _prefs.getString('business_id');
  set businessId(String? value) => value == null ? _prefs.remove('business_id') : _prefs.setString('business_id', value);

  /// The newest build whose "new version" card was closed (0: none).
  int get dismissedUpdate => _prefs.getInt('dismissed_update') ?? 0;
  set dismissedUpdate(int value) => _prefs.setInt('dismissed_update', value);

  /// When the home screen's "add your business" card was hidden.
  DateTime? get promoHiddenAt {
    final millis = _prefs.getInt('promo_hidden_at');
    return millis == null ? null : DateTime.fromMillisecondsSinceEpoch(millis);
  }

  set promoHiddenAt(DateTime? value) => value == null ? _prefs.remove('promo_hidden_at') : _prefs.setInt('promo_hidden_at', value.millisecondsSinceEpoch);

  /// The push token last registered with the server (to remove it on sign-out).
  String? get pushToken => _prefs.getString('push_token');
  set pushToken(String? value) => value == null ? _prefs.remove('push_token') : _prefs.setString('push_token', value);
}
