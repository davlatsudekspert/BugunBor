// Whole-app screen tests against a fake server that answers with the pinned
// contracts: every main screen at 360, 390 and 430 px wide, the three states
// (loading → content, empty, error → retry), tap targets, and the flows that
// matter most (first start, deal → sign-in, codes, session end).
import 'package:bugunbor/features/deal/deal_screen.dart';
import 'package:bugunbor/features/home/home_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'support/fakes.dart';

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

/// Scrolls the home screen down to the sample deal.
Future<void> showDeal(WidgetTester tester) async {
  for (var step = 0; step < 20 && find.text('Osh').hitTestable().evaluate().isEmpty; step++) {
    await tester.drag(find.byType(Scrollable).first, const Offset(0, -200));
    await settle(tester, frames: 4);
  }
  expect(find.text('Osh').hitTestable(), findsWidgets);
}

Future<void> checkTapTargets(WidgetTester tester) async {
  final handle = tester.ensureSemantics();
  await expectLater(tester, meetsGuideline(androidTapTargetGuideline));
  handle.dispose();
}

void main() {
  for (final entry in phoneSizes.entries) {
    testWidgets('home at ${entry.key} px: deals, sections, tap targets', (tester) async {
      await pumpApp(tester, server: FakeServer.standard(), size: entry.value);
      expect(find.text('Bugun nima bor?'), findsOneWidget);
      await showDeal(tester);
      expect(find.text('Toshkent bo‘yicha'), findsOneWidget);
      expect(find.text('Asosiy'), findsOneWidget);
      await checkTapTargets(tester);
    });

    testWidgets('deal page at ${entry.key} px', (tester) async {
      await pumpApp(tester, server: FakeServer.standard(), size: entry.value);
      await showDeal(tester);
      await tester.tap(find.text('Osh').hitTestable().first);
      await settle(tester);
      expect(find.byType(DealScreen), findsOneWidget);
      expect(find.text('30\u00A0000 so‘m'), findsWidgets);
      expect(find.text('20\u00A0000 so‘m tejaysiz'), findsOneWidget);
      await tester.scrollUntilVisible(find.text('Markaz'), 200, scrollable: find.byType(Scrollable).first);
      expect(find.text('Chilonzor'), findsOneWidget);
      expect(find.text('Band qilish uchun kiring'), findsOneWidget);
      await checkTapTargets(tester);
    });
  }

  testWidgets('large text (130 %) on the smallest phone does not overflow', (tester) async {
    await pumpApp(tester, server: signedInServer(), token: 't', size: phoneSizes['360']!, textScale: 1.3);
    await showDeal(tester);
    await tester.tap(find.text('Osh').hitTestable().first);
    await settle(tester);
    expect(find.byType(DealScreen), findsOneWidget);
    // The phone's back button.
    await tester.binding.handlePopRoute();
    await settle(tester);
    for (final tab in ['Qidiruv', 'Saqlangan', 'Kodlarim', 'Profil']) {
      await tester.tap(find.text(tab));
      await settle(tester);
    }
  });

  testWidgets('first start: language, interests, city — then home', (tester) async {
    final server = FakeServer.standard();
    await pumpApp(tester, server: server, onboarded: false);
    expect(find.text('BugunBor’ga xush kelibsiz'), findsOneWidget);
    await tester.tap(find.text('Русский'));
    await settle(tester);
    expect(find.text('Добро пожаловать в BugunBor'), findsOneWidget);
    await tester.tap(find.text('Далее'));
    await settle(tester);
    expect(find.text('Что вам нравится?'), findsOneWidget);
    await tester.tap(find.text('Кофе'));
    await tester.tap(find.text('Далее'));
    await settle(tester);
    expect(find.text('Показывать акции рядом?'), findsOneWidget);
    await tester.tap(find.text('Выберу город сам'));
    await settle(tester);
    await tester.tap(find.text('Самарканд'));
    await settle(tester);
    expect(find.byType(HomeScreen), findsOneWidget);
    // The feed was asked for the chosen city and interests, in Russian.
    final feed = server.requests.lastWhere((request) => request.path == '/api/v1/feed');
    expect(feed.queryParameters['city'], 'samarkand');
    expect(feed.queryParameters['interests'], 'kofe');
    expect(feed.headers['x-locale'], 'ru');
  });

  testWidgets('a guest who books is sent to sign-in, which needs consent first', (tester) async {
    final server = FakeServer.standard();
    await pumpApp(tester, server: server);
    await showDeal(tester);
    await tester.tap(find.text('Osh').hitTestable().first);
    await settle(tester);
    await tester.tap(find.text('Band qilish uchun kiring'));
    await settle(tester);
    expect(find.text('Telegram orqali kirish'), findsOneWidget);
    await tester.tap(find.text('Telegram orqali kirish'));
    await settle(tester);
    expect(find.text('Kirish uchun avval rozilik belgisini qo‘ying.'), findsOneWidget);
    expect(server.requests.where((request) => request.path == '/api/v1/auth/telegram/start'), isEmpty);
  });

  testWidgets('home: error with retry, then content', (tester) async {
    final server = FakeServer.standard();
    final feed = server.routes['GET /api/v1/feed']!;
    server.routes['GET /api/v1/feed'] = (_) => const Reply(500, {
      'error': {'code': 'INTERNAL'},
    });
    await pumpApp(tester, server: server);
    expect(find.text('Qayta urinish'), findsOneWidget);
    server.routes['GET /api/v1/feed'] = feed;
    await tester.tap(find.text('Qayta urinish'));
    await settle(tester);
    await showDeal(tester);
  });

  testWidgets('home: empty city', (tester) async {
    final server = FakeServer.standard();
    server.routes['GET /api/v1/feed'] = (_) => {
      'data': {'city': 'nukus', 'located': false, 'forYou': [], 'nearby': [], 'ending': [], 'total': 0},
    };
    await pumpApp(tester, server: server);
    expect(find.text('Hozircha aksiya yo‘q'), findsOneWidget);
    expect(find.text('Shaharni tanlang'), findsWidgets);
  });

  testWidgets('deals of a blocked business are hidden', (tester) async {
    // The contract's person blocked "biz", which owns every sample deal.
    await pumpApp(tester, server: FakeServer.standard(), token: 't');
    expect(find.text('Osh'), findsNothing);
    expect(find.text('Hozircha aksiya yo‘q'), findsOneWidget);
  });

  testWidgets('my codes: the active code opens with its QR', (tester) async {
    await pumpApp(tester, server: signedInServer(), token: 't');
    await tester.tap(find.text('Kodlarim'));
    await settle(tester);
    expect(find.text('3AK BWA'), findsOneWidget);
    await tester.tap(find.text('3AK BWA'));
    await settle(tester);
    expect(find.text('Kodni kassirga ko‘rsating'), findsOneWidget);
    expect(find.text('Kodni bekor qilish'), findsOneWidget);
  });

  testWidgets('guests see a sign-in panel on personal tabs', (tester) async {
    await pumpApp(tester, server: FakeServer.standard());
    for (final tab in ['Saqlangan', 'Kodlarim']) {
      await tester.tap(find.text(tab));
      await settle(tester);
      expect(find.text('Kirish kerak'), findsOneWidget);
    }
    await tester.tap(find.text('Profil'));
    await settle(tester);
    expect(find.text('Telegram orqali kirish'), findsOneWidget);
    await checkTapTargets(tester);
  });

  testWidgets('profile of a signed-in person', (tester) async {
    await pumpApp(tester, server: signedInServer(), token: 't');
    await tester.tap(find.text('Profil'));
    await settle(tester);
    expect(find.text('Alice Karimova'), findsOneWidget);
    expect(find.text('+998 90 123 45 67'), findsOneWidget);
    await tester.scrollUntilVisible(find.text('Hisobni o‘chirish'), 300, scrollable: find.byType(Scrollable).first);
    expect(find.text('Chiqish'), findsOneWidget);
    await checkTapTargets(tester);
  });

  testWidgets('a rejected session signs out once and says so', (tester) async {
    final server = FakeServer.standard();
    server.routes['GET /api/v1/me'] = (_) => const Reply(401, {
      'error': {'code': 'UNAUTHENTICATED'},
    });
    server.routes['GET /api/v1/me/redemptions'] = (_) => const Reply(401, {
      'error': {'code': 'UNAUTHENTICATED'},
    });
    await pumpApp(tester, server: server, token: 'expired');
    expect(find.text('Sessiya tugadi — qaytadan kiring.'), findsOneWidget);
    await tester.tap(find.text('Profil'));
    await settle(tester);
    expect(find.text('Telegram orqali kirish'), findsOneWidget);
    // After the session ended nothing asks with the old token again.
    final before = server.requests.length;
    await tester.tap(find.text('Kodlarim'));
    await settle(tester);
    expect(server.requests.skip(before).where((request) => request.headers['authorization'] != null), isEmpty);
  });

  testWidgets('a build below the server minimum asks to update', (tester) async {
    final server = FakeServer.standard();
    server.routes['GET /api/v1/config'] = (_) => {'data': contract('config')};
    await pumpApp(tester, server: server);
    expect(find.text('Ilovani yangilang'), findsOneWidget);
    expect(find.text('Yangilash'), findsOneWidget);
    expect(find.text('Bugun nima bor?'), findsNothing);
  });

  testWidgets('sign-in through Telegram: match code, approval, back where the person was', (tester) async {
    final server = signedInServer();
    var approved = false;
    server.routes['POST /api/v1/auth/telegram/start'] = (_) => {
      'data': {...contractMap('login-start'), 'expiresAt': DateTime.now().toUtc().add(const Duration(minutes: 10)).toIso8601String()},
    };
    server.routes['GET /api/v1/auth/telegram/status'] = (_) => {
      'data': approved ? contract('login-status') : {'status': 'PENDING'},
    };
    await pumpApp(tester, server: server);
    await tester.tap(find.text('Profil'));
    await settle(tester);
    await tester.tap(find.text('Telegram orqali kirish'));
    await settle(tester);
    await tester.tap(find.byType(Checkbox));
    await tester.pump();
    await tester.tap(find.text('Telegram orqali kirish'));
    await settle(tester);
    expect(find.text('8471'), findsOneWidget);
    expect(find.text('Telegram’dagi tasdiqni kutyapmiz…'), findsOneWidget);
    approved = true;
    await tester.pump(const Duration(seconds: 2));
    await settle(tester);
    expect(find.text('Kirdingiz!'), findsOneWidget);
    expect(find.text('Alice Karimova'), findsOneWidget);
    // The token from the server is what the app now sends.
    final token = (contractMap('login-status')['token'] as String);
    expect(server.requests.last.headers['authorization'], 'Bearer $token');
  });

  testWidgets('booking: choose a branch, get the code with its QR', (tester) async {
    final server = signedInServer();
    final redemption = (contract('my-codes') as List).first as Map;
    server.routes['POST /api/v1/deals/:id/redemptions'] = (request) => Reply(201, {
      'data': {'id': redemption['id'], 'code': redemption['code'], 'expiresAt': serverTime(DateTime.now().toUtc().add(const Duration(minutes: 60)))},
    });
    await pumpApp(tester, server: server, token: 't');
    await showDeal(tester);
    await tester.tap(find.text('Osh').hitTestable().first);
    await settle(tester);
    await tester.tap(find.text('Band qilish'));
    await settle(tester);
    expect(find.text('Filialni tanlang'), findsOneWidget);
    await tester.tap(find.text('Markaz').last);
    await settle(tester);
    final claim = server.requests.singleWhere((request) => request.method == 'POST' && request.path.endsWith('/redemptions'));
    expect(claim.data, {'branchId': 'br1'});
    expect(claim.headers['idempotency-key'], isA<String>());
    expect(find.text('Kodni kassirga ko‘rsating'), findsOneWidget);
    expect(find.text('3AK BWA'), findsOneWidget);
  });

  testWidgets('business page at 360 px', (tester) async {
    await pumpApp(tester, server: signedInServer(), token: 't', size: phoneSizes['360']!);
    await showDeal(tester);
    await tester.tap(find.text('Osh').hitTestable().first);
    await settle(tester);
    await tester.scrollUntilVisible(find.text('Kafe').hitTestable(), 200, scrollable: find.byType(Scrollable).first);
    await tester.tap(find.text('Kafe').hitTestable().first);
    await settle(tester);
    expect(find.text('Obuna bo‘lish'), findsOneWidget);
    expect(find.text('Aksiyalar'), findsWidgets);
    await checkTapTargets(tester);
  });
}
