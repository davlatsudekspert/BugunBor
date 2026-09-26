// Opening the app on a slow connection: Home shows at once what it showed last
// time (deals that have ended since are left out), and the server's answer
// replaces it a moment later. Without a connection the last Home stays, with a note.
import 'dart:async';
import 'dart:convert';

import 'package:bugunbor/app/providers.dart';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'support/fakes.dart';

Map<String, dynamic> dealTitled(String title, String id, {required Duration endsIn}) => {
  ...(contractMap('feed')['nearby'] as List).first as Map<String, dynamic>,
  'id': id,
  'slug': id,
  'title': title,
  'endsAt': serverTime(DateTime.now().toUtc().add(endsIn)),
};

Map<String, dynamic> feedWith(List<Map<String, dynamic>> deals) => {
  ...contractMap('feed'),
  'forYou': <Object>[],
  'nearby': deals,
  'ending': <Object>[],
  'total': deals.length,
};

/// What a guest in Tashkent saw last time.
Map<String, Object> kept() => {
  'answer_config': jsonEncode(contractMap('config')..['minAppBuild'] = 0),
  'answer_feed_guest_tashkent': jsonEncode(
    feedWith([dealTitled('Kechagi somsa', 'd1', endsIn: const Duration(hours: 2)), dealTitled('Tugagan aksiya', 'd2', endsIn: const Duration(hours: -1))]),
  ),
};

void main() {
  testWidgets('a slow connection: the last Home shows at once, then the new answer', (tester) async {
    final feed = Completer<Object?>();
    final config = Completer<Object?>();
    final server = FakeServer.standard();
    server.routes['GET /api/v1/feed'] = (_) => feed.future;
    server.routes['GET /api/v1/config'] = (_) => config.future;
    await pumpApp(tester, server: server, prefs: kept());

    expect(find.text('Kechagi somsa'), findsOneWidget);
    expect(find.text('Tugagan aksiya'), findsNothing);
    // The categories come from the kept settings.
    expect(find.text('Ko‘ngilochar'), findsOneWidget);

    feed.complete({
      'data': feedWith([dealTitled('Yangi somsa', 'd3', endsIn: const Duration(hours: 3))]),
    });
    config.complete({'data': contractMap('config')..['minAppBuild'] = 0});
    await settle(tester);
    expect(find.text('Yangi somsa'), findsOneWidget);
    expect(find.text('Kechagi somsa'), findsNothing);
  });

  testWidgets('no connection at start: the last Home stays, with a note', (tester) async {
    final server = FakeServer.standard();
    server.routes['GET /api/v1/feed'] = (request) => throw DioException.connectionError(requestOptions: request, reason: 'offline');
    await pumpApp(tester, server: server, prefs: kept());

    // (Below the note, lower than the first screen.)
    expect(find.text('Kechagi somsa', skipOffstage: false), findsOneWidget);
    expect(find.text('Internet yo‘q — oxirgi ma’lumot ko‘rsatilmoqda'), findsOneWidget);
    expect(find.text('Qayta urinish'), findsNothing);
  });

  testWidgets('the first start without a kept Home waits for the server as before', (tester) async {
    final server = FakeServer.standard();
    server.routes['GET /api/v1/feed'] = (request) => throw DioException.connectionError(requestOptions: request, reason: 'offline');
    await pumpApp(tester, server: server);

    expect(find.text('Qayta urinish'), findsOneWidget);
  });

  testWidgets('answers are kept for the next start, and signing out forgets them', (tester) async {
    await pumpApp(tester, server: signedInServer(), token: 't');
    final prefs = await SharedPreferences.getInstance();
    expect(prefs.getString('answer_config'), isNotNull);
    expect(prefs.getString('answer_feed_account_tashkent'), contains('"Osh"'));

    final container = ProviderScope.containerOf(tester.element(find.byType(MaterialApp)));
    await container.read(sessionProvider.notifier).signOut();
    await settle(tester);
    expect(prefs.getKeys().where((key) => key.startsWith('answer_feed_account')), isEmpty);
    // The settings are nobody's: the next start is still quick.
    expect(prefs.getString('answer_config'), isNotNull);
  });
}
