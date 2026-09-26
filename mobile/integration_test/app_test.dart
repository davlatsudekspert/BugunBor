// Emulator E2E against the live site (read-only: nothing is booked, views
// are not counted, no sign-in request is made). CI runs it with
// `flutter drive` and keeps a screenshot of every main screen.
import 'dart:io';

import 'package:bugunbor/core/env.dart';
import 'package:bugunbor/design/widgets/common.dart';
import 'package:bugunbor/design/widgets/deal_card.dart';
import 'package:bugunbor/features/deal/deal_screen.dart';
import 'package:bugunbor/features/home/home_screen.dart';
import 'package:bugunbor/main.dart' as app;
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';

Future<void> waitFor(WidgetTester tester, Finder finder, {Duration timeout = const Duration(seconds: 30)}) async {
  final end = DateTime.now().add(timeout);
  while (finder.evaluate().isEmpty) {
    if (DateTime.now().isAfter(end)) throw TestFailure('Timed out waiting for $finder');
    await tester.pump(const Duration(milliseconds: 250));
  }
}

/// Lets photos from the site arrive, then keeps a picture of the screen.
Future<void> shot(IntegrationTestWidgetsFlutterBinding binding, WidgetTester tester, String name) async {
  for (var index = 0; index < 12; index++) {
    await tester.pump(const Duration(milliseconds: 250));
  }
  await binding.takeScreenshot(name);
}

void main() {
  final binding = IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('first start, home from the live server, a deal, search and profile', (tester) async {
    expect(Env.e2e, isTrue, reason: 'run with --dart-define=E2E=true');
    app.main();
    await waitFor(tester, find.text('O‘zbekcha'));
    if (Platform.isAndroid) await binding.convertFlutterSurfaceToImage();

    // The emulator speaks English, so the app starts in English; switch to Uzbek.
    await tester.tap(find.text('O‘zbekcha'));
    await waitFor(tester, find.text('BugunBor’ga xush kelibsiz'));
    await shot(binding, tester, '01-welcome');

    // Onboarding without any system dialog: next, an interest, next, the city.
    await tester.tap(find.text('Keyingi'));
    await waitFor(tester, find.text('Sizga nima yoqadi?'));
    await waitFor(tester, find.text('Taomlar'));
    await tester.tap(find.text('Taomlar'));
    await shot(binding, tester, '02-interests');
    await tester.tap(find.text('Keyingi'));
    await waitFor(tester, find.text('Shaharni o‘zim tanlayman'));
    await shot(binding, tester, '03-location');
    await tester.tap(find.text('Shaharni o‘zim tanlayman'));
    await waitFor(tester, find.text('Toshkent'));
    await tester.tap(find.text('Toshkent'));
    await waitFor(tester, find.byType(HomeScreen));

    // The live feed: deals, or the empty state — never an error or a spinner forever.
    final deal = find.byWidgetPredicate((widget) => widget is DealTile || widget is DealCompactCard);
    await waitFor(
      tester,
      find.byWidgetPredicate((widget) => widget is DealTile || widget is DealCompactCard || (widget is StatePanel && widget.title == 'Hozircha aksiya yo‘q')),
    );
    expect(find.byWidgetPredicate((widget) => widget is StatePanel && widget.actionLabel == 'Qayta urinish'), findsNothing);
    await shot(binding, tester, '04-home');

    if (deal.evaluate().isNotEmpty) {
      await tester.drag(find.byType(Scrollable).first, const Offset(0, -500));
      await shot(binding, tester, '05-home-scrolled');
      final target = find.byType(DealTile).evaluate().isNotEmpty ? find.byType(DealTile).first : deal.first;
      await tester.ensureVisible(target);
      await tester.pump(const Duration(milliseconds: 500));
      await tester.tap(target);
      await waitFor(tester, find.byType(DealScreen));
      await waitFor(tester, find.textContaining('so‘m'));
      await shot(binding, tester, '06-deal');
      await tester.drag(find.byType(Scrollable).first, const Offset(0, -600));
      await shot(binding, tester, '07-deal-details');
      // The phone's back button.
      await tester.binding.handlePopRoute();
      await waitFor(tester, find.byType(HomeScreen).hitTestable());
    }

    await tester.tap(find.text('Qidiruv'));
    await waitFor(tester, find.byType(TextField));
    await tester.enterText(find.byType(TextField), 'osh');
    await tester.testTextInput.receiveAction(TextInputAction.search);
    await shot(binding, tester, '08-search');

    await tester.tap(find.text('Kodlarim'));
    await waitFor(tester, find.text('Kirish kerak'));
    await shot(binding, tester, '09-codes-guest');

    await tester.tap(find.text('Profil'));
    await waitFor(tester, find.text('Telegram orqali kirish'));
    await shot(binding, tester, '10-profile');

    // The sign-in screen, without starting a sign-in on the live server.
    await tester.tap(find.text('Telegram orqali kirish'));
    await waitFor(tester, find.text('Maxfiylik siyosati va foydalanish shartlariga roziman'));
    await tester.tap(find.text('Telegram orqali kirish').last);
    await waitFor(tester, find.text('Kirish uchun avval rozilik belgisini qo‘ying.'));
    await shot(binding, tester, '11-login');
    await tester.binding.handlePopRoute();
    await waitFor(tester, find.text('Qorong‘i'));

    // Dark theme and Russian on the home screen.
    await tester.ensureVisible(find.text('Qorong‘i'));
    await tester.pump(const Duration(milliseconds: 300));
    await tester.tap(find.text('Qorong‘i'));
    await tester.pump(const Duration(milliseconds: 300));
    await tester.ensureVisible(find.text('Русский'));
    await tester.pump(const Duration(milliseconds: 300));
    await tester.tap(find.text('Русский'));
    await waitFor(tester, find.text('Главная'));
    await tester.tap(find.text('Главная'));
    await waitFor(tester, find.text('Что есть сегодня?'));
    await shot(binding, tester, '12-home-ru-dark');
  });
}
