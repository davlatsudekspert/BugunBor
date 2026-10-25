import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'support/fakes.dart';

// Profile → «Admin panel»: the owner's numbers, only for an ADMIN profile.

FakeServer adminServer({String role = 'ADMIN'}) {
  final server = signedInServer();
  server.routes['GET /api/v1/me'] = (_) {
    final me = contractMap('me');
    me['blockedBusinessIds'] = <String>[];
    me['user'] = {...(me['user'] as Map), 'role': role};
    return {'data': me};
  };
  server.routes['GET /api/v1/admin/overview'] = (request) => request.headers['authorization'] == null
      ? const Reply(401, {
          'error': {'code': 'UNAUTHENTICATED'},
        })
      : {
          'data': {
            'queue': {'businesses': 2, 'deals': 1, 'messages': 3, 'reports': 1, 'payments': 0},
            'today': {'claims': 7, 'redeemed': 4, 'liveDeals': 12},
            'users': {'total': 1234, 'new7': 56, 'new30': 210, 'signedIn': 18, 'app30': 97, 'devices': 40},
            'objects': {'businesses': 30, 'deals': 85, 'codes': 640, 'reviews': 12, 'reports': 5},
            'days': [for (var i = 0; i < 14; i++) {'day': '2026-10-${(i + 10).toString().padLeft(2, '0')}', 'users': i, 'codes': 14 - i}],
            'latestBuild': '13',
          },
        };
  return server;
}

void main() {
  testWidgets('the owner sees the numbers and the ways to the site and the stores', (tester) async {
    final server = adminServer();
    await pumpApp(tester, server: server, token: 't');
    await tester.tap(find.text('Profil'));
    await settle(tester);
    await tester.scrollUntilVisible(find.text('Admin panel').hitTestable(), 300, scrollable: find.byType(Scrollable).first);
    await settle(tester);
    expect(find.text('1234'), findsOneWidget);
    expect(find.text('Foydalanuvchilar · 7 kunda +56'), findsOneWidget);
    expect(find.text('97'), findsOneWidget); // in the app, 30 days
    expect(find.text('3'), findsOneWidget); // in review: 2 businesses + 1 deal
    expect(find.text('4'), findsNWidgets(2)); // redeemed today; reports + messages
    expect(find.text('Bizneslar 30 · aksiyalar 85 · kodlar 640 · sharhlar 12'), findsOneWidget);
    await tester.scrollUntilVisible(find.text('Google Play Console').hitTestable(), 200, scrollable: find.byType(Scrollable).first);
    expect(find.text('Admin panelni saytda ochish'), findsOneWidget);
    expect(find.text('App Store Connect'), findsOneWidget);
    expect(server.requests.where((request) => request.path == '/api/v1/admin/overview').length, 1);
  });

  testWidgets('a customer has no admin section, and nothing is asked for', (tester) async {
    final server = adminServer(role: 'CUSTOMER');
    await pumpApp(tester, server: server, token: 't');
    await tester.tap(find.text('Profil'));
    await settle(tester);
    await tester.scrollUntilVisible(find.text('Chiqish').hitTestable(), 300, scrollable: find.byType(Scrollable).first);
    expect(find.text('Admin panel'), findsNothing);
    expect(server.requests.any((request) => request.path == '/api/v1/admin/overview'), isFalse);
  });

  testWidgets('a failed load shows the error with a retry, not a crash', (tester) async {
    final server = adminServer();
    server.routes['GET /api/v1/admin/overview'] = (_) => const Reply(403, {
      'error': {'code': 'FORBIDDEN', 'message': 'Ruxsat yo‘q'},
    });
    await pumpApp(tester, server: server, token: 't');
    await tester.tap(find.text('Profil'));
    await settle(tester);
    await tester.scrollUntilVisible(find.text('Admin panel').hitTestable(), 300, scrollable: find.byType(Scrollable).first);
    await settle(tester);
    expect(find.text('Ruxsat yo‘q'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
