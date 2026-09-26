import 'dart:typed_data';

import 'package:bugunbor/core/api_error.dart';
import 'package:bugunbor/core/env.dart';
import 'package:bugunbor/data/api.dart';
import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';

import 'support/fakes.dart';

void main() {
  late FakeServer server;
  String? token;
  var locale = 'uz';
  var unauthorized = 0;

  BugunBorApi api() => BugunBorApi(locale: () => locale, token: () => token, onUnauthorized: () => unauthorized++, dio: fakeDio(server));

  setUp(() {
    server = FakeServer.standard();
    token = null;
    locale = 'uz';
    unauthorized = 0;
  });

  test('every call says it is the app, its build and language', () async {
    await api().config();
    final headers = server.requests.single.headers;
    expect(headers['x-app'], 'bugunbor');
    expect(headers['x-app-build'], '${Env.build}');
    expect(headers['x-locale'], 'uz');
    expect(headers.containsKey('authorization'), isFalse);
  });

  test('Russian UI asks for Russian texts; English falls back to Uzbek', () async {
    locale = 'ru';
    await api().config();
    locale = 'en';
    await api().config();
    expect(server.requests.map((request) => request.headers['x-locale']), ['ru', 'uz']);
  });

  test('signed-in calls carry the bearer token', () async {
    token = 'secret-token';
    final me = await api().me();
    expect(me.displayName, 'Alice Karimova');
    expect(server.requests.single.headers['authorization'], 'Bearer secret-token');
  });

  test('a rejected token ends the session once per call; guests are not affected', () async {
    server.routes['GET /api/v1/me'] = (_) => const Reply(401, {
      'error': {'code': 'UNAUTHENTICATED', 'message': 'Kiring'},
    });
    token = 'old';
    await expectLater(api().me(), throwsA(isA<ApiError>().having((error) => error.isUnauthenticated, 'unauthenticated', isTrue)));
    expect(unauthorized, 1);
    token = null;
    await expectLater(api().me(), throwsA(isA<ApiError>()));
    expect(unauthorized, 1);
  });

  test('server errors keep their code and localized message', () async {
    server.routes['POST /api/v1/deals/:id/redemptions'] = (_) => const Reply(409, {
      'error': {'code': 'SOLD_OUT', 'message': 'Hammasi band'},
    });
    token = 't';
    await expectLater(
      api().claim('deal', branchId: 'br1', idempotencyKey: 'k1'),
      throwsA(
        isA<ApiError>()
            .having((error) => error.code, 'code', 'SOLD_OUT')
            .having((error) => error.message, 'message', 'Hammasi band')
            .having((error) => error.status, 'status', 409),
      ),
    );
    expect(unauthorized, 0);
  });

  test('a claim sends the branch and an idempotency key', () async {
    server.routes['POST /api/v1/deals/:id/redemptions'] = (_) => {
      'data': {'id': 'r1', 'code': 'K7P2QX', 'expiresAt': '2026-09-25 11:00:00'},
    };
    token = 't';
    final result = await api().claim('deal', branchId: 'br1', idempotencyKey: 'key-1');
    expect(result.code, 'K7P2QX');
    expect(result.expiresAt, DateTime.utc(2026, 9, 25, 11));
    final request = server.requests.single;
    expect(request.path, '/api/v1/deals/deal/redemptions');
    expect(request.headers['idempotency-key'], 'key-1');
    expect(request.data, {'branchId': 'br1'});
  });

  test('sign-in never sends a stale token and always sends consent', () async {
    server.routes['POST /api/v1/auth/telegram/start'] = (_) => {'data': contract('login-start')};
    server.routes['GET /api/v1/auth/telegram/status'] = (request) => request.headers['x-login-secret'] == 'secret'
        ? {'data': contract('login-status')}
        : const Reply(404, {
            'error': {'code': 'NOT_FOUND'},
          });
    token = 'stale';
    await api().startLogin();
    expect(server.requests.last.headers.containsKey('authorization'), isFalse);
    expect(server.requests.last.data, {'client': 'app', 'consent': true});
    final status = await api().loginStatus('secret');
    expect(status.status, 'APPROVED');
    expect(status.token, isNotEmpty);
  });

  test('no connection becomes a NETWORK error', () async {
    final dio = Dio(BaseOptions(baseUrl: 'https://test.bugunbor.uz'))..httpClientAdapter = _Offline();
    final offline = BugunBorApi(locale: () => 'uz', token: () => null, onUnauthorized: () {}, dio: dio);
    await expectLater(offline.config(), throwsA(isA<ApiError>().having((error) => error.isNetwork, 'network', isTrue)));
  });

  test('a list page reads items and the total', () async {
    final page = await api().deals(city: 'tashkent', query: '  ', sort: 'ending');
    expect(page.items, isNotEmpty);
    expect(page.total, page.items.length);
    final query = server.requests.single.queryParameters;
    expect(query['city'], 'tashkent');
    expect(query.containsKey('q'), isFalse);
    expect(query.containsKey('lat'), isFalse);
  });
}

class _Offline implements HttpClientAdapter {
  @override
  Future<ResponseBody> fetch(RequestOptions options, Stream<Uint8List>? requestStream, Future<void>? cancelFuture) =>
      throw DioException.connectionError(requestOptions: options, reason: 'offline');

  @override
  void close({bool force = false}) {}
}
