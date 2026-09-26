import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'app/app.dart';
import 'app/providers.dart';
import 'core/storage.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final prefs = Prefs(await SharedPreferences.getInstance());
  final token = await SessionStore().read();
  runApp(
    ProviderScope(
      // A failed request shows its error with a "Try again" button instead of
      // retrying on its own in the background.
      retry: (retryCount, error) => null,
      overrides: [prefsProvider.overrideWithValue(prefs), initialTokenProvider.overrideWithValue(token)],
      child: const BugunBorApp(),
    ),
  );
}
