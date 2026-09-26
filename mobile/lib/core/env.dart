/// Build-time settings (`--dart-define`). Nothing secret lives in the app.
class Env {
  const Env._();

  /// The site and API origin.
  static const apiBase = String.fromEnvironment('API_BASE', defaultValue: 'https://bugunbor.uz');

  /// CI passes the run number; it is also the Android versionCode.
  static const build = int.fromEnvironment('APP_BUILD', defaultValue: 1);
  static const version = String.fromEnvironment('APP_VERSION', defaultValue: '1.0.0');

  /// Push needs a Firebase project: CI adds android/app/google-services.json
  /// (client settings, not a secret) and sets this. Without it the app runs
  /// without push and hides the push switches.
  static const pushEnabled = bool.fromEnvironment('PUSH_ENABLED');

  /// Set by the emulator E2E run against the live site: it only reads and
  /// never counts views, so statistics stay real.
  static const e2e = bool.fromEnvironment('E2E');

  static const playStoreUrl = 'https://play.google.com/store/apps/details?id=uz.bugunbor.app';
}
