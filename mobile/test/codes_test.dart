// A claimed code follows what happens at the counter: accepted while on
// screen → the screen says so and asks for a rating; its time runs out → it
// leaves the active list. The "rate your visit" link opens that rating, and
// cards say when a deal starts or that it has ended.
import 'package:bugunbor/app/links.dart';
import 'package:bugunbor/app/router.dart';
import 'package:bugunbor/data/models.dart';
import 'package:bugunbor/design/theme.dart';
import 'package:bugunbor/design/widgets/deal_card.dart';
import 'package:bugunbor/l10n/gen/app_localizations.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

import 'support/fakes.dart';

const codeId = 'c62d6599-9995-4777-8d0f-3b04eacb11e6';

/// The sample code in [status], ending [expiresIn] from now.
Map<String, dynamic> sampleCode({required String status, required Duration expiresIn, bool canRate = false}) => {
  ...(contract('my-codes') as List).first as Map<String, dynamic>,
  'status': status,
  'expiresAt': serverTime(DateTime.now().toUtc().add(expiresIn)),
  'completedAt': status == 'COMPLETED' ? serverTime(DateTime.now().toUtc()) : null,
  'canRate': canRate,
};

GoRouter routerOf(WidgetTester tester) => ProviderScope.containerOf(tester.element(find.byType(MaterialApp))).read(routerProvider);

/// A deal from the feed contract that starts and ends at these times.
DealCard dealAt({required DateTime startsAt, required DateTime endsAt}) => DealCard.fromJson({
  ...withoutPhoto((contractMap('feed')['nearby'] as List).first as Map<String, dynamic>),
  'startsAt': serverTime(startsAt),
  'endsAt': serverTime(endsAt),
});

Future<void> pumpCard(WidgetTester tester, Widget card) => tester.pumpWidget(
  MaterialApp(
    locale: const Locale('uz'),
    localizationsDelegates: L.localizationsDelegates,
    supportedLocales: L.supportedLocales,
    theme: buildTheme(Brightness.light),
    home: Scaffold(body: Center(child: card)),
  ),
);

void main() {
  testWidgets('accepted at the counter while on screen: the code screen says so and asks for a rating', (tester) async {
    var current = sampleCode(status: 'CLAIMED', expiresIn: const Duration(minutes: 45));
    final server = signedInServer();
    server.routes['GET /api/v1/me/redemptions'] = (_) => {
      'data': [current],
    };
    await pumpApp(tester, server: server, token: 't');
    routerOf(tester).go('/codes/$codeId');
    await settle(tester);
    expect(find.text('Kodni kassirga ko‘rsating'), findsOneWidget);

    // The cashier accepts it; the screen asks again on its own.
    current = sampleCode(status: 'COMPLETED', expiresIn: const Duration(minutes: 45), canRate: true);
    await tester.pump(const Duration(seconds: 16));
    await settle(tester);
    expect(find.text('Kodni kassirga ko‘rsating'), findsNothing);
    expect(find.text('Ishlatilgan'), findsOneWidget);
    expect(find.text('Kod qabul qilindi. Tashrif qanday o‘tdi?'), findsOneWidget);
    await tester.tap(find.text('Baholash'));
    await settle(tester);
    expect(find.text('Tashrif qanday o‘tdi?'), findsOneWidget);
  });

  testWidgets('a code whose time runs out moves from the active list to the history', (tester) async {
    final server = signedInServer();
    final code = sampleCode(status: 'CLAIMED', expiresIn: const Duration(seconds: 2));
    server.routes['GET /api/v1/me/redemptions'] = (_) => {
      'data': [code],
    };
    await pumpApp(tester, server: server, token: 't');
    await tester.tap(find.text('Kodlarim'));
    await settle(tester);
    expect(find.text('3AK BWA'), findsOneWidget);
    final asked = server.requests.where((request) => request.path.endsWith('/me/redemptions')).length;

    // The clock is real: let the code's time actually pass, then the next tick notices.
    await tester.runAsync(() => Future<void>.delayed(const Duration(seconds: 2)));
    await tester.pump(const Duration(seconds: 1));
    await settle(tester);
    expect(server.requests.where((request) => request.path.endsWith('/me/redemptions')).length, greaterThan(asked));
    expect(find.text('3AK BWA'), findsNothing);
    expect(find.text('Hali faol kod yo‘q'), findsOneWidget);
    await tester.tap(find.text('Tarix'));
    await settle(tester);
    // Not "Faol": the server has not marked it yet, but its time is over.
    expect(find.text('Muddati o‘tgan'), findsOneWidget);
  });

  testWidgets('the "rate your visit" link opens the history with that rating', (tester) async {
    final server = signedInServer();
    server.routes['GET /api/v1/me/redemptions'] = (_) => {
      'data': [sampleCode(status: 'COMPLETED', expiresIn: const Duration(minutes: -30), canRate: true)],
    };
    await pumpApp(tester, server: server, token: 't');
    routerOf(tester).go(appPathFor('https://bugunbor.uz/account/codes#review-$codeId')!);
    await settle(tester);
    expect(find.text('Tashrif qanday o‘tdi?'), findsOneWidget);
    // Closing it leaves the history open, and it does not open again.
    await tester.tapAt(const Offset(20, 20));
    await settle(tester);
    expect(find.text('Tashrif qanday o‘tdi?'), findsNothing);
    expect(find.text('Baholash'), findsOneWidget);
  });

  testWidgets('cards say when a deal starts, and that an ended one ended', (tester) async {
    final now = DateTime.now().toUtc();
    final starts = DateTime.utc(now.year, now.month, now.day, 5).add(const Duration(days: 2));
    await pumpCard(tester, DealCompactCard(dealAt(startsAt: starts, endsAt: starts.add(const Duration(days: 1)))));
    // 05:00 UTC is 10:00 in Tashkent.
    expect(find.textContaining('10:00 dan boshlanadi'), findsOneWidget);

    await pumpCard(tester, DealCompactCard(dealAt(startsAt: now.subtract(const Duration(days: 1)), endsAt: now.subtract(const Duration(minutes: 1)))));
    expect(find.text('Tugagan'), findsOneWidget);
    expect(find.textContaining('qoldi'), findsNothing);
  });
}
