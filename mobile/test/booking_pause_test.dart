// A booking pause follows the server at once: a complaint that lifts it
// frees the book button, and a "paused" answer turns it off (no retrying
// into the same error). The business's cancel sheet fits a small phone
// with large text.
import 'package:bugunbor/app/router.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'support/fakes.dart';

Future<void> open(WidgetTester tester, String location) async {
  ProviderScope.containerOf(tester.element(find.byType(MaterialApp))).read(routerProvider).go(location);
  await settle(tester);
}

bool bookEnabled(WidgetTester tester) => tester.widget<FilledButton>(find.widgetWithText(FilledButton, 'Band qilish')).onPressed != null;

Map<String, dynamic> firstCode(Map<String, Object?> changes) => {...(contract('my-codes') as List).first as Map<String, dynamic>, ...changes};

void main() {
  testWidgets('a complaint that lifts the pause frees the book button at once', (tester) async {
    var noShows = <String, Object?>{'count': 3, 'pausedUntil': serverTime(DateTime.now().toUtc().add(const Duration(hours: 20)))};
    String? issue;
    final server = signedInServer();
    server.routes['GET /api/v1/me'] = (_) => {
      'data': {...contractMap('me'), 'blockedBusinessIds': <String>[], 'noShows': noShows},
    };
    server.routes['GET /api/v1/me/redemptions'] = (_) => {
      'data': [
        firstCode({
          'status': 'EXPIRED',
          'code': null,
          'expiresAt': serverTime(DateTime.now().toUtc().subtract(const Duration(hours: 1))),
          'issue': issue,
          'canReportIssue': issue == null,
        }),
      ],
    };
    await pumpApp(tester, server: server, token: 't');
    await open(tester, '/deals/osh');
    expect(bookEnabled(tester), isFalse);

    final id = firstCode({})['id'];
    await open(tester, '/codes/$id');
    await tester.scrollUntilVisible(find.text('Aksiya berilmadimi?'), 250, scrollable: find.byType(Scrollable).first);
    await settle(tester, frames: 4);
    await tester.tap(find.text('Aksiya berilmadimi?'));
    await settle(tester);
    await tester.tap(find.text('Filial yopiq edi'));
    await settle(tester, frames: 4);
    // The server no longer counts a code whose branch was closed.
    issue = 'BRANCH_CLOSED';
    noShows = {'count': 2, 'pausedUntil': null};
    await tester.tap(find.text('Yuborish'));
    await settle(tester);

    await open(tester, '/deals/osh');
    expect(bookEnabled(tester), isTrue);
  });

  testWidgets('a "paused" answer to booking turns the button off', (tester) async {
    var noShows = <String, Object?>{'count': 2, 'pausedUntil': null};
    final server = signedInServer();
    server.routes['GET /api/v1/me'] = (_) => {
      'data': {...contractMap('me'), 'blockedBusinessIds': <String>[], 'noShows': noShows},
    };
    server.routes['POST /api/v1/deals/:id/redemptions'] = (_) {
      // The third code ran out while the app was open: the app did not know.
      noShows = {'count': 3, 'pausedUntil': serverTime(DateTime.now().toUtc().add(const Duration(hours: 23)))};
      return const Reply(429, {
        'error': {'code': 'NO_SHOW_PAUSE', 'message': 'Oxirgi 7 kunda 3 ta kod ishlatilmay qoldi, shuning uchun band qilish 28.09 10:00 gacha to‘xtatildi.'},
      });
    };
    await pumpApp(tester, server: server, token: 't');
    await open(tester, '/deals/osh');
    await tester.tap(find.widgetWithText(FilledButton, 'Band qilish'));
    await settle(tester);
    await tester.tap(find.text('Markaz').last);
    await settle(tester);
    expect(find.textContaining('28.09 10:00 gacha'), findsOneWidget);
    expect(bookEnabled(tester), isFalse);
  });

  for (final theme in ['light', 'dark']) {
    testWidgets('$theme, 360×640, large text: the cancel sheet fits and every choice can be tapped', (tester) async {
      final server = memberServer(() => [owner]);
      final code = {
        ...(contractMap('business-workspace')['recent'] as List).first as Map<String, dynamic>,
        'dealTitle': 'Oilaviy set: 2 ta osh, 2 ta salat va bir choynak choy',
        'expiresAt': serverTime(DateTime.now().toUtc().add(const Duration(minutes: 40))),
      };
      server.routes['GET /api/v1/business/:id'] = (_) => {
        'data': workspace(
          other: {
            'recent': [code],
          },
        ),
      };
      await pumpApp(tester, server: server, token: 't', theme: theme, size: const Size(360, 640), textScale: 1.3);
      await tester.tap(find.text('Profil'));
      await settle(tester);
      await tester.scrollUntilVisible(find.text('Bekor qilish').first, 250, scrollable: find.byType(Scrollable).first);
      await settle(tester, frames: 4);
      await tester.tap(find.text('Bekor qilish').first);
      await settle(tester);
      expect(find.text('Filial yopiq'), findsOneWidget);
      await checkTapTargets(tester);
    });
  }
}
