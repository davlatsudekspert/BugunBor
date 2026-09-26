// Emulator E2E against the live site (read-only: nothing is booked, views
// are not counted). Run by CI: flutter test integration_test --dart-define=E2E=true
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

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('first start, home from the live server, a deal, search and profile', (tester) async {
    expect(Env.e2e, isTrue, reason: 'run with --dart-define=E2E=true');
    app.main();
    // The emulator speaks English, so the app starts in English; switch to Uzbek.
    await waitFor(tester, find.text('O‘zbekcha'));
    await tester.tap(find.text('O‘zbekcha'));
    await waitFor(tester, find.text('BugunBor’ga xush kelibsiz'));

    // Onboarding without any system dialog: next, next, choose the city.
    await tester.tap(find.text('Keyingi'));
    await waitFor(tester, find.text('Sizga nima yoqadi?'));
    await tester.tap(find.text('Keyingi'));
    await waitFor(tester, find.text('Shaharni o‘zim tanlayman'));
    await tester.tap(find.text('Shaharni o‘zim tanlayman'));
    await waitFor(tester, find.text('Toshkent'));
    await tester.tap(find.text('Toshkent'));
    await waitFor(tester, find.byType(HomeScreen));

    // The live feed: deals, or the empty state — never an error or a spinner forever.
    final deal = find.byWidgetPredicate((widget) => widget is DealTile || widget is DealCompactCard);
    final empty = find.text('Hozircha aksiya yo‘q');
    await waitFor(
      tester,
      find.byWidgetPredicate((widget) => widget is DealTile || widget is DealCompactCard || (widget is Text && widget.data == 'Hozircha aksiya yo‘q')),
    );
    expect(find.byWidgetPredicate((widget) => widget is StatePanel && widget.actionLabel == 'Qayta urinish'), findsNothing);

    if (deal.evaluate().isNotEmpty) {
      final target = find.byType(DealTile).evaluate().isNotEmpty ? find.byType(DealTile).first : deal.first;
      await tester.ensureVisible(target);
      await tester.pump(const Duration(milliseconds: 500));
      await tester.tap(target);
      await waitFor(tester, find.byType(DealScreen));
      await waitFor(tester, find.textContaining('so‘m'));
      // The phone's back button.
      await tester.binding.handlePopRoute();
      await waitFor(tester, find.byType(HomeScreen).hitTestable());
    } else {
      expect(empty, findsOneWidget);
    }

    await tester.tap(find.text('Qidiruv'));
    await tester.pump(const Duration(seconds: 1));
    await waitFor(tester, find.byType(TextField));

    await tester.tap(find.text('Profil'));
    await waitFor(tester, find.text('Telegram orqali kirish'));
    await waitFor(tester, find.text('Maxfiylik siyosati'));
  });
}
