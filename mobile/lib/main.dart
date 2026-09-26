import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'app/app.dart';
import 'app/providers.dart';
import 'core/storage.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  // Both are read at the same time; the first screen needs them.
  final (shared, token) = await (SharedPreferences.getInstance(), SessionStore().read()).wait;
  final prefs = Prefs(shared);
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
