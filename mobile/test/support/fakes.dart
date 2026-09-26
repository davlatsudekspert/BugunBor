import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

import 'package:bugunbor/app/app.dart';
import 'package:bugunbor/app/providers.dart';
import 'package:bugunbor/core/storage.dart';
import 'package:bugunbor/data/api.dart';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// The server's pinned sample answers (see ../contracts/README.md).
Object? contract(String name) => jsonDecode(File('../contracts/$name.json').readAsStringSync());

Map<String, dynamic> contractMap(String name) => (contract(name) as Map).cast<String, dynamic>();

typedef Handler = Object? Function(RequestOptions request);

/// UTC in the server's `YYYY-MM-DD HH:MM:SS` form.
String serverTime(DateTime utc) => utc.toIso8601String().substring(0, 19).replaceFirst('T', ' ');

/// A reply with a status other than 200.
class Reply {
  const Reply(this.status, this.body);
  final int status;
  final Object? body;
}

/// Serves requests from a route table like `GET /api/v1/deals/:slug`.
class FakeServer implements HttpClientAdapter {
  FakeServer([Map<String, Handler>? routes]) : routes = {...?routes};

  final Map<String, Handler> routes;
  final requests = <RequestOptions>[];

  /// Everything a signed-out and a signed-in person needs, from the contracts.
  factory FakeServer.standard() {
    final feed = contractMap('feed');
    final nearby = (feed['nearby'] as List).cast<Map<String, dynamic>>();
    return FakeServer({
      // The contract's minimum build (3) is above a test build (1).
      'GET /api/v1/config': (_) => {'data': contractMap('config')..['minAppBuild'] = 0},
      'GET /api/v1/feed': (_) => {'data': feed},
      'GET /api/v1/deals': (_) => {
        'data': nearby,
        'page': {'total': nearby.length, 'offset': 0, 'limit': 24},
      },
      'GET /api/v1/deals/:slug': (_) => {'data': contract('deal')},
      'POST /api/v1/deals/:id/view': (_) => {
        'data': {'ok': true},
      },
      'GET /api/v1/businesses/:slug': (_) => {'data': contract('business')},
      'GET /api/v1/me': (request) => request.headers['authorization'] == null
          ? const Reply(401, {
              'error': {'code': 'UNAUTHENTICATED'},
            })
          : {'data': contract('me')},
      // The sample code, still valid for 45 minutes from now.
      'GET /api/v1/me/redemptions': (_) => {
        'data': [
          for (final code in (contract('my-codes') as List).cast<Map<String, dynamic>>())
            {...code, 'expiresAt': serverTime(DateTime.now().toUtc().add(const Duration(minutes: 45)))},
        ],
      },
      'GET /api/v1/me/favorites': (_) => {
        'data': {'live': nearby, 'ended': []},
      },
      'GET /api/v1/me/follows': (_) => {'data': []},
      'POST /api/v1/businesses': (_) => Reply(201, {'data': contract('business-create')}),
      'GET /api/v1/business/:id': (_) => {'data': contract('business-workspace')},
    });
  }

  static bool _matches(String pattern, String method, String path) {
    final parts = pattern.split(' ');
    if (parts[0] != method) return false;
    final want = parts[1].split('/');
    final got = path.split('/');
    if (want.length != got.length) return false;
    for (var index = 0; index < want.length; index++) {
      if (!want[index].startsWith(':') && want[index] != got[index]) return false;
    }
    return true;
  }

  @override
  Future<ResponseBody> fetch(RequestOptions options, Stream<Uint8List>? requestStream, Future<void>? cancelFuture) async {
    requests.add(options);
    final path = Uri.parse(options.path).path;
    final handler = routes.entries.where((entry) => _matches(entry.key, options.method, path)).firstOrNull?.value;
    final result = handler == null
        ? const Reply(404, {
            'error': {'code': 'NOT_FOUND'},
          })
        : handler(options);
    final reply = result is Reply ? result : Reply(200, result);
    return ResponseBody.fromString(
      jsonEncode(reply.body),
      reply.status,
      headers: {
        Headers.contentTypeHeader: [Headers.jsonContentType],
      },
    );
  }

  @override
  void close({bool force = false}) {}
}

class MemorySessionStore extends SessionStore {
  String? token;

  @override
  Future<String?> read() async => token;

  @override
  Future<void> write(String token) async => this.token = token;

  @override
  Future<void> clear() async => token = null;
}

Dio fakeDio(FakeServer server) =>
    Dio(BaseOptions(baseUrl: 'https://test.bugunbor.uz', validateStatus: (_) => true, responseType: ResponseType.json))..httpClientAdapter = server;

/// Phone sizes the layout must hold at (logical pixels).
const phoneSizes = {'360': Size(360, 740), '390': Size(390, 844), '430': Size(430, 932)};

/// Starts the whole app against [server] on a phone of [size].
Future<void> pumpApp(
  WidgetTester tester, {
  required FakeServer server,
  String? token,
  bool onboarded = true,
  String locale = 'uz',
  Size size = const Size(390, 844),
  double textScale = 1,
  String theme = 'light',
  Pin? pin,
  Map<String, Object> prefs = const {},
}) async {
  SharedPreferences.setMockInitialValues({'onboarded': onboarded, 'locale': locale, 'city': 'tashkent', 'theme': theme, ...prefs});
  final stored = Prefs(await SharedPreferences.getInstance());
  tester.view.physicalSize = size * 3;
  tester.view.devicePixelRatio = 3;
  // A phone is used by touch: no keyboard-focus rings after a tap.
  FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTouch;
  addTearDown(() => FocusManager.instance.highlightStrategy = FocusHighlightStrategy.automatic);
  tester.platformDispatcher.textScaleFactorTestValue = textScale;
  addTearDown(tester.view.reset);
  addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
  final dio = fakeDio(server);
  await tester.pumpWidget(
    ProviderScope(
      retry: (retryCount, error) => null,
      overrides: [
        prefsProvider.overrideWithValue(stored),
        // Where "use my location" finds the phone (never the real GPS).
        pinLocatorProvider.overrideWithValue(() async => pin),
        initialTokenProvider.overrideWithValue(token),
        sessionStoreProvider.overrideWithValue(MemorySessionStore()..token = token),
        apiProvider.overrideWith(
          (ref) => BugunBorApi(
            locale: () => ref.read(settingsProvider).locale,
            token: () => ref.read(sessionProvider).token,
            onUnauthorized: () => ref.read(sessionProvider.notifier).expire(),
            dio: dio,
          ),
        ),
      ],
      child: const BugunBorApp(),
    ),
  );
  await settle(tester);
}

/// The signed-in person from the contract, with nothing blocked.
FakeServer signedInServer() {
  final server = FakeServer.standard();
  server.routes['GET /api/v1/me'] = (_) {
    final me = contractMap('me');
    me['blockedBusinessIds'] = <String>[];
    return {'data': me};
  };
  return server;
}

/// Every tappable thing is at least 48 px, and all text is readable
/// against what is behind it (this caught chip labels painted white).
Future<void> checkTapTargets(WidgetTester tester) async {
  final handle = tester.ensureSemantics();
  await expectLater(tester, meetsGuideline(androidTapTargetGuideline));
  await expectLater(tester, meetsGuideline(textContrastGuideline));
  handle.dispose();
}

/// Lets requests finish and frames render. (pumpAndSettle would wait forever
/// on the countdowns and skeleton pulses, which never stop by design.)
Future<void> settle(WidgetTester tester, {int frames = 12}) async {
  for (var index = 0; index < frames; index++) {
    await tester.pump(const Duration(milliseconds: 50));
  }
}
