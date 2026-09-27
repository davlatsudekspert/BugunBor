// Booking fairly on both sides. A branch says whether it is open, and a
// code that would run out before it opens is questioned first. Someone who
// books and never comes is warned after two such codes and waits a day after
// three. A code that was not honoured can be reported, once. A business
// messages or cancels a booking without ever seeing the number, and a deal
// held after complaints says why and cannot be resumed from the app.
import 'package:bugunbor/app/providers.dart';
import 'package:bugunbor/app/router.dart';
import 'package:bugunbor/core/hours.dart';
import 'package:bugunbor/core/time.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'support/fakes.dart';

const codeId = 'c62d6599-9995-4777-8d0f-3b04eacb11e6';

ProviderContainer containerOf(WidgetTester tester) => ProviderScope.containerOf(tester.element(find.byType(MaterialApp)));

Future<void> open(WidgetTester tester, String location) async {
  containerOf(tester).read(routerProvider).go(location);
  await settle(tester);
}

/// The sample code with some fields replaced; still valid for 45 minutes unless told otherwise.
Map<String, dynamic> sampleCode([Map<String, Object?> changes = const {}]) => {
  ...(contract('my-codes') as List).first as Map<String, dynamic>,
  'expiresAt': serverTime(DateTime.now().toUtc().add(const Duration(minutes: 45))),
  ...changes,
};

Map<String, dynamic> lastAction(FakeServer server) =>
    (server.requests.lastWhere((request) => request.method == 'POST' && request.path == '/api/v1/business/biz').data as Map).cast<String, dynamic>();

Future<void> scrollTo(WidgetTester tester, Finder target) async {
  await tester.scrollUntilVisible(target, 250, scrollable: find.byType(Scrollable).first);
  await settle(tester, frames: 4);
}

bool enabled(WidgetTester tester, String label) => tester.widget<FilledButton>(find.widgetWithText(FilledButton, label)).onPressed != null;

void main() {
  group('opening hours', () {
    // 12:00 in Tashkent (UTC+5).
    final noon = DateTime.utc(2026, 9, 27, 7);

    test('both ways the site keeps them; anything else is unknown', () {
      final hours = WorkingHours.parse('{"open":"09:00","close":"22:00"}')!;
      expect([hours.open, hours.close], ['09:00', '22:00']);
      final legacy = WorkingHours.parse('{"mon-sun":"10:00-23:00"}')!;
      expect([legacy.open, legacy.close], ['10:00', '23:00']);
      expect(WorkingHours.parse(null), isNull);
      expect(WorkingHours.parse('nonsense'), isNull);
      expect(WorkingHours.parse('{"open":"25:00","close":"22:00"}'), isNull);
    });

    test('open, closed, overnight and round the clock, on Tashkent clocks', () {
      const day = WorkingHours('09:00', '22:00');
      expect(day.isOpenAt(noon), isTrue);
      expect(day.minutesUntilOpen(noon), 0);
      expect(day.isOpenAt(DateTime.utc(2026, 9, 27, 17, 30)), isFalse); // 22:30
      expect(day.minutesUntilOpen(DateTime.utc(2026, 9, 27, 1)), 180); // 06:00
      const night = WorkingHours('18:00', '02:00');
      expect(night.isOpenAt(DateTime.utc(2026, 9, 26, 20)), isTrue); // 01:00
      expect(night.isOpenAt(noon), isFalse);
      expect(night.minutesUntilOpen(noon), 360);
      expect(const WorkingHours('00:00', '00:00').isOpenAt(noon), isTrue);
    });
  });

  testWidgets('a closed branch says when it opens, and a code that would run out first is questioned', (tester) async {
    final hours = closedNow();
    final opensAt = WorkingHours.parse(hours)!.open;
    final server = signedInServer();
    server.routes['GET /api/v1/deals/:slug'] = (_) => {'data': dealWithHours(hours)};
    server.routes['POST /api/v1/deals/:id/redemptions'] = (_) => Reply(201, {
      'data': {'id': codeId, 'code': '3AKBWA', 'expiresAt': serverTime(DateTime.now().toUtc().add(const Duration(minutes: 60)))},
    });
    Iterable<Object> claims() => server.requests.where((request) => request.method == 'POST' && request.path.endsWith('/redemptions'));
    await pumpApp(tester, server: server, token: 't');
    await open(tester, '/deals/osh');
    await scrollTo(tester, find.text('Amir Temur 1'));
    expect(find.text('Yopiq · $opensAt da ochiladi'), findsNWidgets(2));

    await tester.tap(find.widgetWithText(FilledButton, 'Band qilish'));
    await settle(tester);
    await tester.tap(find.text('Markaz').last);
    await settle(tester);
    expect(find.text('Bu filial hozir yopiq va $opensAt da ochiladi. Kod 60 daqiqa amal qiladi — ochilishiga yaqinroq band qiling.'), findsOneWidget);
    await tester.tap(find.text('Yopish'));
    await settle(tester);
    expect(claims(), isEmpty);

    // Booked all the same.
    await tester.tap(find.widgetWithText(FilledButton, 'Band qilish'));
    await settle(tester);
    await tester.tap(find.text('Markaz').last);
    await settle(tester);
    await tester.tap(find.widgetWithText(TextButton, 'Band qilish'));
    await settle(tester);
    expect(claims(), hasLength(1));
    expect(find.text('3AK BWA'), findsOneWidget);
  });

  testWidgets('an open branch says until when, and books without a question', (tester) async {
    String clock(DateTime utc) {
      final wall = toTashkent(utc);
      return '${wall.hour.toString().padLeft(2, '0')}:${wall.minute.toString().padLeft(2, '0')}';
    }

    final now = DateTime.now().toUtc();
    final closes = clock(now.add(const Duration(hours: 2)));
    final server = signedInServer();
    server.routes['GET /api/v1/deals/:slug'] = (_) => {'data': dealWithHours('{"open":"${clock(now.subtract(const Duration(hours: 1)))}","close":"$closes"}')};
    server.routes['POST /api/v1/deals/:id/redemptions'] = (_) => Reply(201, {
      'data': {'id': codeId, 'code': '3AKBWA', 'expiresAt': serverTime(DateTime.now().toUtc().add(const Duration(minutes: 60)))},
    });
    await pumpApp(tester, server: server, token: 't');
    await open(tester, '/deals/osh');
    await scrollTo(tester, find.text('Amir Temur 1'));
    expect(find.text('$closes gacha ochiq'), findsNWidgets(2));

    await tester.tap(find.widgetWithText(FilledButton, 'Band qilish'));
    await settle(tester);
    await tester.tap(find.text('Markaz').last);
    await settle(tester);
    expect(server.requests.where((request) => request.method == 'POST' && request.path.endsWith('/redemptions')), hasLength(1));
    expect(find.text('3AK BWA'), findsOneWidget);
  });

  testWidgets('booked and never came: a heads-up after two codes, a day’s pause after three', (tester) async {
    Map<String, Object?> noShows = {'count': 2, 'pausedUntil': null};
    final server = signedInServer();
    server.routes['GET /api/v1/me'] = (_) => {
      'data': {...contractMap('me'), 'blockedBusinessIds': <String>[], 'noShows': noShows},
    };
    await pumpApp(tester, server: server, token: 't');
    await open(tester, '/deals/osh');
    expect(find.textContaining('oxirgi 7 kunda 2 ta kod ishlatilmay qoldi'), findsOneWidget);
    expect(enabled(tester, 'Band qilish'), isTrue);

    final until = DateTime.now().toUtc().add(const Duration(hours: 20));
    noShows = {'count': 3, 'pausedUntil': serverTime(until)};
    containerOf(tester).invalidate(meProvider);
    await settle(tester);
    expect(find.text('Oxirgi 7 kunda 3 ta kod ishlatilmay qoldi. Band qilish ${momentLabel(until)} gacha to‘xtatildi.'), findsOneWidget);
    expect(enabled(tester, 'Band qilish'), isFalse);
    await checkTapTargets(tester);

    // A pause that is over does not hold anyone back.
    noShows = {'count': 1, 'pausedUntil': null};
    containerOf(tester).invalidate(meProvider);
    await settle(tester);
    expect(find.textContaining('7 kunda'), findsNothing);
    expect(enabled(tester, 'Band qilish'), isTrue);
  });

  testWidgets('«Aksiya berilmadimi?»: what happened at the counter, sent once', (tester) async {
    String? issue;
    final server = signedInServer();
    server.routes['GET /api/v1/me/redemptions'] = (_) => {
      'data': [
        sampleCode({'issue': issue, 'canReportIssue': issue == null}),
      ],
    };
    await pumpApp(tester, server: server, token: 't');
    await open(tester, '/codes/$codeId');
    await scrollTo(tester, find.text('Aksiya berilmadimi?'));
    await tester.tap(find.text('Aksiya berilmadimi?'));
    await settle(tester);
    expect(find.text('Kassada nima bo‘ldi?'), findsOneWidget);
    for (final reason in [
      'Aksiya berilmadi: mahsulot yoki xizmat yo‘q edi',
      'Kodni qabul qilishmadi',
      'Narx aksiyadagidan boshqa edi',
      'Filial yopiq edi',
      'Boshqa',
    ]) {
      expect(find.text(reason), findsOneWidget);
    }
    await tester.tap(find.text('Kodni qabul qilishmadi'));
    await settle(tester, frames: 4);
    await tester.enterText(find.byType(TextField), ' Kassir kodni ko‘rmadi ');
    issue = 'CODE_REFUSED';
    await tester.tap(find.text('Yuborish'));
    await settle(tester);
    final sent = server.requests.lastWhere((request) => request.path == '/api/v1/reports');
    expect(sent.data, {'targetType': 'REDEMPTION', 'targetId': codeId, 'reason': 'CODE_REFUSED', 'comment': 'Kassir kodni ko‘rmadi'});
    // Asked again: the code now says it was received, and there is no second button.
    expect(find.text('Shikoyatingiz qabul qilindi. Moderator ko‘rib chiqadi.'), findsWidgets);
    expect(find.text('Aksiya berilmadimi?'), findsNothing);
  });

  testWidgets('a used code can only be reported for its price', (tester) async {
    final server = signedInServer();
    server.routes['GET /api/v1/me/redemptions'] = (_) => {
      'data': [
        sampleCode({'status': 'COMPLETED', 'completedAt': serverTime(DateTime.now().toUtc())}),
      ],
    };
    await pumpApp(tester, server: server, token: 't');
    await open(tester, '/codes/$codeId');
    await scrollTo(tester, find.text('Aksiya berilmadimi?'));
    await tester.tap(find.text('Aksiya berilmadimi?'));
    await settle(tester);
    expect(find.text('Narx aksiyadagidan boshqa edi'), findsOneWidget);
    expect(find.text('Boshqa'), findsOneWidget);
    expect(find.text('Kodni qabul qilishmadi'), findsNothing);
    expect(find.text('Filial yopiq edi'), findsNothing);
  });

  testWidgets('a booking the business cancelled says why, in the history and on its page', (tester) async {
    final server = signedInServer();
    server.routes['GET /api/v1/me/redemptions'] = (_) => {
      'data': [
        sampleCode({'status': 'CANCELED', 'cancelReason': 'OUT_OF_STOCK', 'code': null}),
      ],
    };
    await pumpApp(tester, server: server, token: 't');
    await tester.tap(find.text('Kodlarim'));
    await settle(tester);
    await tester.tap(find.text('Tarix'));
    await settle(tester);
    expect(find.text('Biznes bekor qildi: mahsulot tugadi'), findsOneWidget);
    // The card opens the code's own page, where it can still be reported.
    await tester.tap(find.text('Osh'));
    await settle(tester);
    expect(find.text('Bekor qilingan'), findsOneWidget);
    expect(find.text('Biznes bekor qildi: mahsulot tugadi'), findsOneWidget);
    expect(find.text('Aksiya berilmadimi?'), findsOneWidget);
  });

  testWidgets('a business answers a booking without the number: each ready message once, or a cancel with its reason', (tester) async {
    final server = memberServer(() => [owner]);
    final code = {
      ...(contractMap('business-workspace')['recent'] as List).first as Map<String, dynamic>,
      'expiresAt': serverTime(DateTime.now().toUtc().add(const Duration(minutes: 40))),
    };
    var recent = [code];
    server.routes['GET /api/v1/business/:id'] = (_) => {
      'data': workspace(other: {'recent': recent}),
    };
    await pumpApp(tester, server: server, token: 't');
    await tester.tap(find.text('Profil'));
    await settle(tester);
    await scrollTo(tester, find.text('Mijoz raqami yashirin: xabar BugunBor orqali boradi.'));
    await checkTapTargets(tester);

    await tester.tap(find.text('Kutyapmiz'));
    await settle(tester);
    expect(lastAction(server), {'type': 'booking.message', 'redemptionId': code['id'], 'message': 'WAITING'});
    expect(find.text('Kutyapmiz · Yuborildi ✓'), findsOneWidget);
    expect(find.widgetWithText(OutlinedButton, 'Kechikyapmiz'), findsOneWidget);

    // Cancelling asks for the reason and says what happens.
    await tester.tap(find.text('Bekor qilish'));
    await settle(tester);
    expect(find.text('Bronni bekor qilasizmi? Mijozga sababi bilan xabar boradi, joy boshqalarga qaytadi.'), findsOneWidget);
    recent = [
      {...code, 'status': 'CANCELED'},
    ];
    await tester.tap(find.text('Mahsulot tugadi'));
    await settle(tester);
    expect(lastAction(server), {'type': 'booking.cancel', 'redemptionId': code['id'], 'reason': 'OUT_OF_STOCK'});
    expect(find.text('Bekor qilingan'), findsOneWidget);
    expect(find.text('Kechikyapmiz'), findsNothing);
  });

  testWidgets('a booking that ended meanwhile says so, and the list shows it as it is now', (tester) async {
    final server = memberServer(() => [owner]);
    final code = {
      ...(contractMap('business-workspace')['recent'] as List).first as Map<String, dynamic>,
      'expiresAt': serverTime(DateTime.now().toUtc().add(const Duration(minutes: 40))),
    };
    var recent = [code];
    server.routes['GET /api/v1/business/:id'] = (_) => {
      'data': workspace(other: {'recent': recent}),
    };
    final actions = server.routes['POST /api/v1/business/:id']!;
    server.routes['POST /api/v1/business/:id'] = (request) {
      if ((request.data as Map)['type'] != 'booking.message') return actions(request);
      recent = [
        {...code, 'status': 'COMPLETED'},
      ];
      return const Reply(409, {
        'error': {'code': 'CODE_USED', 'message': 'Bu kod allaqachon ishlatilgan.'},
      });
    };
    await pumpApp(tester, server: server, token: 't');
    await tester.tap(find.text('Profil'));
    await settle(tester);
    await scrollTo(tester, find.text('Kechikyapmiz'));
    await tester.tap(find.text('Kechikyapmiz'));
    await settle(tester);
    expect(find.text('Bu kod allaqachon ishlatilgan.'), findsOneWidget);
    expect(find.text('Kechikyapmiz'), findsNothing);
  });

  testWidgets('a deal held after complaints says why, and only a moderator resumes it', (tester) async {
    final server = memberServer(() => [owner]);
    final deals = (contract('business-deals') as List).cast<Map<String, dynamic>>();
    server.routes['GET /api/v1/business/:id/deals'] = (_) => {
      'data': [
        {...withoutPhoto(deals.first), 'status': 'PAUSED', 'effective': 'PAUSED', 'held': true, 'complaints': 3},
        withoutPhoto(deals.last),
      ],
    };
    await pumpApp(tester, server: server, token: 't');
    await open(tester, '/business/biz/deals');
    expect(find.text('Shikoyatlar sababli to‘xtatildi — moderator tekshiradi'), findsOneWidget);
    expect(find.text('Shikoyatlar (30 kun): 3'), findsOneWidget);
    await checkTapTargets(tester);
    await tester.tap(find.text('Somsa va choy'));
    await settle(tester);
    expect(find.text('Davom ettirish'), findsNothing);
    expect(find.text('Yakunlash'), findsOneWidget);
  });
}
