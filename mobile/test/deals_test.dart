// Deals from the app: the form checks what the server checks, photos are
// made small on the phone, and owners add, change and run their deals.
import 'dart:async';
import 'dart:typed_data';

import 'package:bugunbor/app/providers.dart';
import 'package:bugunbor/app/router.dart';
import 'package:bugunbor/data/models.dart';
import 'package:bugunbor/design/widgets/form_fields.dart';
import 'package:bugunbor/features/deals/deal_draft.dart';
import 'package:bugunbor/features/deals/deal_form_screen.dart';
import 'package:bugunbor/features/deals/deals_screen.dart';
import 'package:bugunbor/features/deals/photo.dart';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:image/image.dart' as img;

import 'support/fakes.dart';

const rules = DealRules(
  visuals: [DealVisual(key: 'samsa', emoji: '🥧')],
);
final now = DateTime.utc(2026, 9, 25, 12);

DealDraft valid({
  String originalPrice = '20 000',
  String price = '14 000',
  DateTime? startsAt,
  DateTime? endsAt,
  String quantity = '30',
  bool unlimited = false,
  List<String> branchIds = const ['br1'],
}) => DealDraft(
  title: 'Somsa va choy',
  description: 'Tandir somsa va bir choynak ko‘k choy, issiq holda.',
  terms: 'Faqat zalda.',
  categoryId: 'cat_food',
  visual: 'samsa',
  originalPrice: originalPrice,
  price: price,
  startsAt: startsAt ?? DateTime.utc(2026, 9, 25, 15),
  endsAt: endsAt ?? DateTime.utc(2026, 9, 25, 19),
  quantity: quantity,
  unlimited: unlimited,
  perCustomerLimit: 2,
  claimTtlMinutes: 60,
  branchIds: branchIds,
);

BusinessDeal listed(String status, [String? effective, String title = 'Somsa va choy']) => BusinessDeal.fromJson({
  ...(contract('business-deals') as List).first as Map<String, dynamic>,
  'status': status,
  'effective': effective ?? status,
  'title': title,
});

Uint8List smallJpeg() => Uint8List.fromList(img.encodeJpg(img.Image(width: 64, height: 64)));

/// Kafe's owner with the contract's workspace and deals.
FakeServer ownerServer() => memberServer(() => [owner]);

Map<String, dynamic> lastAction(FakeServer server) =>
    (server.requests.lastWhere((request) => request.method == 'POST' && request.path == '/api/v1/business/biz').data as Map).cast<String, dynamic>();

Finder get dealForm => find.descendant(of: find.byType(DealFormScreen), matching: find.byType(Scrollable)).first;

Future<void> scrollDealForm(WidgetTester tester, Finder target) async {
  await tester.scrollUntilVisible(target, 300, scrollable: dealForm);
  await settle(tester, frames: 4);
}

Future<void> openProfile(WidgetTester tester) async {
  await tester.tap(find.text('Profil'));
  await settle(tester);
}

/// Types a complete deal into the open form.
Future<void> fillDeal(WidgetTester tester) async {
  await scrollDealForm(tester, find.widgetWithText(TextField, 'Aksiya nomi'));
  await tester.enterText(find.widgetWithText(TextField, 'Aksiya nomi'), 'Somsa va choy');
  await tester.enterText(find.widgetWithText(TextField, 'Tavsif'), 'Tandir somsa va bir choynak ko‘k choy, issiq holda.');
  await tester.enterText(find.widgetWithText(TextField, 'Shartlar'), 'Faqat zalda.');
  await scrollDealForm(tester, find.widgetWithText(TextField, 'Aksiya narxi, so‘m'));
  await tester.enterText(find.widgetWithText(TextField, 'Asl narx, so‘m'), '20000');
  await tester.enterText(find.widgetWithText(TextField, 'Aksiya narxi, so‘m'), '14000');
  await settle(tester, frames: 2);
}

Future<void> submitDeal(WidgetTester tester) async {
  await scrollDealForm(tester, find.text('Tekshiruvga yuborish'));
  await tester.tap(find.text('Tekshiruvga yuborish'));
  await settle(tester);
}

Future<void> go(WidgetTester tester, String location) async {
  final container = ProviderScope.containerOf(tester.element(find.byType(MaterialApp)));
  unawaited(container.read(routerProvider).push(location));
  await settle(tester);
}

void main() {
  group('the form checks what the server checks', () {
    test('a complete deal passes and is sent in the server’s shape', () {
      expect(valid().problems(rules, now: now, submit: true), isEmpty);
      expect(valid().toJson(), {
        'title': 'Somsa va choy',
        'description': 'Tandir somsa va bir choynak ko‘k choy, issiq holda.',
        'terms': 'Faqat zalda.',
        'categoryId': 'cat_food',
        'visual': 'samsa',
        'originalPrice': 20000,
        'price': 14000,
        'startsAt': '2026-09-25T15:00',
        'endsAt': '2026-09-25T19:00',
        'quantity': 30,
        'perCustomerLimit': 2,
        'claimTtlMinutes': 60,
        'branchIds': ['br1'],
        'photoId': null,
      });
      expect(valid(unlimited: true).toJson()['quantity'], isNull);
    });

    test('an empty form lists every field it needs', () {
      final empty = DealDraft(startsAt: DateTime.utc(2026, 9, 25, 15), endsAt: DateTime.utc(2026, 9, 25, 19));
      expect(empty.problems(rules, now: now, submit: true), {
        'title': 'tooShort',
        'description': 'tooShort',
        'terms': 'tooShort',
        'categoryId': 'choose',
        'visual': 'choose',
        'originalPrice': 'minAmount',
        'price': 'invalid',
        'branchIds': 'branchesRequired',
      });
    });

    test('prices: below the regular one, by at least the smallest discount', () {
      expect(valid(price: '20 000').problems(rules, now: now, submit: true), {'price': 'priceOrder'});
      expect(valid(price: '19 000').problems(rules, now: now, submit: true), {'price': 'minDiscount'});
      expect(valid(price: '18 000').problems(rules, now: now, submit: true), isEmpty);
      expect(valid(originalPrice: '500', price: '100').problems(rules, now: now, submit: true), {'originalPrice': 'minAmount'});
    });

    test('time: after the start, 30 minutes to 30 days, not over already', () {
      final start = DateTime.utc(2026, 9, 25, 15);
      expect(valid(endsAt: start).problems(rules, now: now, submit: true), {'endsAt': 'endAfterStart'});
      expect(valid(endsAt: start.add(const Duration(minutes: 20))).problems(rules, now: now, submit: true), {'endsAt': 'duration'});
      expect(valid(endsAt: start.add(const Duration(days: 31))).problems(rules, now: now, submit: true), {'endsAt': 'duration'});
      final past = valid(startsAt: DateTime.utc(2026, 9, 24, 9), endsAt: DateTime.utc(2026, 9, 24, 13));
      expect(past.problems(rules, now: now, submit: true), {'endsAt': 'endInPast'});
      // A draft may keep old times; they are checked when it is sent.
      expect(past.problems(rules, now: now, submit: false), isEmpty);
    });

    test('quantity and branches', () {
      expect(valid(quantity: '0').problems(rules, now: now, submit: true), {'quantity': 'invalid'});
      expect(valid(quantity: '0', unlimited: true).problems(rules, now: now, submit: true), isEmpty);
      expect(valid(branchIds: const []).problems(rules, now: now, submit: true), {'branchIds': 'branchesRequired'});
    });

    test('Tashkent times, amounts and the discount as the server rounds it', () {
      expect(parseTashkentInput('2026-09-25T15:00'), DateTime.utc(2026, 9, 25, 15));
      expect(parseTashkentInput('2026-02-30T10:00'), isNull);
      expect(tashkentInput(DateTime.utc(2026, 1, 5, 9, 5)), '2026-01-05T09:05');
      expect(tashkentNow(DateTime.utc(2026, 9, 25, 10, 7)), DateTime.utc(2026, 9, 25, 15, 5));
      expect(parseAmount('20 000'), 20000);
      expect(parseAmount(''), isNull);
      expect(discountPercent(50000, 30000), 40);
      expect(discountPercent(30000, 19999), 33);
    });
  });

  group('photos are made small on the phone', () {
    test('a big PNG becomes a JPEG within the server’s limits', () {
      final png = Uint8List.fromList(img.encodePng(img.Image(width: 2400, height: 1200)));
      final jpeg = preparePhoto(png);
      expect(jpeg.sublist(0, 2), [0xFF, 0xD8]);
      expect(jpeg.length, lessThanOrEqualTo(maxUploadBytes));
      final decoded = img.decodeJpg(jpeg)!;
      expect([decoded.width, decoded.height], [1280, 640]);
    });

    test('a small upright JPEG is sent as it is', () {
      final jpeg = smallJpeg();
      expect(identical(preparePhoto(jpeg), jpeg), isTrue);
    });

    test('bytes that are not a picture are refused', () {
      expect(() => preparePhoto(Uint8List.fromList([1, 2, 3, 4])), throwsA(isA<UnreadablePhoto>()));
    });
  });

  group('what can be done with a deal', () {
    test('next steps follow the server’s rules', () {
      expect(dealActions(listed('DRAFT')), ['edit', 'submit', 'duplicate', 'delete']);
      expect(dealActions(listed('REJECTED')), ['edit', 'submit', 'duplicate', 'delete']);
      expect(dealActions(listed('PENDING_REVIEW')), ['withdraw', 'duplicate']);
      expect(dealActions(listed('ACTIVE', 'LIVE')), ['view', 'pause', 'end', 'duplicate']);
      expect(dealActions(listed('ACTIVE', 'EXPIRED')), ['end', 'duplicate']);
      expect(dealActions(listed('PAUSED')), ['resume', 'end', 'duplicate']);
      expect(dealActions(listed('ARCHIVED')), ['duplicate']);
    });

    test('filters', () {
      expect(dealMatches(DealFilter.live, listed('PAUSED')), isTrue);
      expect(dealMatches(DealFilter.live, listed('ACTIVE', 'EXPIRED')), isFalse);
      expect(dealMatches(DealFilter.ended, listed('ACTIVE', 'EXPIRED')), isTrue);
      expect(dealMatches(DealFilter.draft, listed('REJECTED')), isTrue);
      expect(dealMatches(DealFilter.review, listed('PENDING_REVIEW')), isTrue);
    });
  });

  testWidgets('an owner adds a deal with a photo from the business profile', (tester) async {
    final server = ownerServer();
    await pumpApp(tester, server: server, token: 't', photo: smallJpeg());
    await openProfile(tester);
    await tester.tap(find.text('Aksiya qo‘shish'));
    await settle(tester);
    expect(find.byType(DealFormScreen), findsOneWidget);

    // Nothing filled in: the problems are shown and nothing is sent.
    await submitDeal(tester);
    expect(server.requests.where((request) => request.method == 'POST'), isEmpty);
    // The name and the terms are both too short.
    expect(find.text('Kamida 5 ta belgi'), findsNWidgets(2));
    await checkTapTargets(tester);

    await fillDeal(tester);
    expect(find.text('20\u00a0000'), findsOneWidget);
    expect(find.text('Chegirma: 30%'), findsOneWidget);

    await scrollDealForm(tester, find.text('Rasm qo‘shish'));
    await tester.tap(find.text('Rasm qo‘shish'));
    await settle(tester);
    await tester.tap(find.text('Galereya'));
    await settle(tester);
    final upload = server.requests.singleWhere((request) => request.path == '/api/v1/business/biz/media');
    expect(upload.data, isA<FormData>());
    final form = upload.data as FormData;
    expect(Map.fromEntries(form.fields), {'kind': 'DEAL'});
    expect([form.files.single.key, form.files.single.value.filename, form.files.single.value.contentType.toString()], ['file', 'photo.jpg', 'image/jpeg']);
    expect(find.text('Almashtirish'), findsOneWidget);

    await submitDeal(tester);
    final sent = lastAction(server);
    expect(sent['type'], 'deal.create');
    expect(sent['submit'], isTrue);
    final input = (sent['input'] as Map).cast<String, dynamic>();
    expect(input['title'], 'Somsa va choy');
    expect(input['originalPrice'], 20000);
    expect(input['price'], 14000);
    expect(input['photoId'], contractMap('media-upload')['id']);
    // The business's category, its picture and every branch, unless changed.
    expect(input['categoryId'], 'cat_food');
    expect(input['visual'], 'plov');
    expect(input['branchIds'], ['br2', 'br1']);
    expect(input['startsAt'], matches(RegExp(r'^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$')));
    expect(find.byType(DealFormScreen), findsNothing);
    expect(find.text('Aksiya chiqdi — mijozlar uni hozir ko‘ryapti!'), findsOneWidget);
  });

  testWidgets('a photo that cannot be taken or read says why; the upload is not tried', (tester) async {
    final server = ownerServer();
    Object failure = const CameraDenied();
    await pumpApp(tester, server: server, token: 't', picker: ({required camera, use = PhotoUse.deal}) async => throw failure);
    await go(tester, '/business/biz/deals/new');
    await tester.tap(find.text('Rasm qo‘shish'));
    await settle(tester);
    await tester.tap(find.text('Kamera'));
    await settle(tester);
    expect(find.textContaining('Kameraga ruxsat berilmadi'), findsOneWidget);

    failure = const UnreadablePhoto();
    await tester.tap(find.text('Rasm qo‘shish'));
    await settle(tester);
    await tester.tap(find.text('Galereya'));
    await settle(tester);
    expect(find.text('Bu rasmni o‘qib bo‘lmadi. JPG yoki PNG rasm tanlang.'), findsOneWidget);
    expect(find.textContaining('Kameraga ruxsat berilmadi'), findsNothing);
    expect(server.requests.where((request) => request.path.endsWith('/media')), isEmpty);
    expect(find.text('Rasm qo‘shish'), findsOneWidget);
  });

  testWidgets('times: a quick length, then the date and time pickers keep it', (tester) async {
    final server = ownerServer();
    await pumpApp(tester, server: server, token: 't');
    await go(tester, '/business/biz/deals/new');
    await fillDeal(tester);
    await scrollDealForm(tester, find.text('7 kun'));
    await tester.tap(find.text('7 kun'));
    await settle(tester);

    await tester.ensureVisible(find.widgetWithText(TapField, 'Boshlanish'));
    await settle(tester);
    await tester.tap(find.widgetWithText(TapField, 'Boshlanish'));
    await settle(tester);
    expect(find.text('Sanani tanlang'), findsOneWidget);
    await tester.tap(find.text('OK'));
    await settle(tester);
    expect(find.text('Vaqtni tanlang'), findsOneWidget);
    await tester.tap(find.text('OK'));
    await settle(tester);

    await submitDeal(tester);
    final input = (lastAction(server)['input'] as Map).cast<String, dynamic>();
    final starts = parseTashkentInput(input['startsAt'] as String)!;
    expect(parseTashkentInput(input['endsAt'] as String)!.difference(starts), const Duration(days: 7));
  });

  testWidgets('the server’s field problems land under the field', (tester) async {
    final server = ownerServer();
    server.routes['POST /api/v1/business/:id'] = (_) => const Reply(422, {
      'error': {
        'code': 'VALIDATION',
        'message': 'Xato',
        'fields': {'input.price': 'minDiscount'},
      },
    });
    await pumpApp(tester, server: server, token: 't');
    await go(tester, '/business/biz/deals/new');
    await fillDeal(tester);
    await submitDeal(tester);
    expect(find.text('Chegirma kamida 10% bo‘lishi kerak'), findsOneWidget);
    expect(find.byType(DealFormScreen), findsOneWidget);
  });

  testWidgets('the deals list: statuses, filters and pausing a live deal', (tester) async {
    final server = ownerServer();
    await pumpApp(tester, server: server, token: 't');
    await openProfile(tester);
    await tester.tap(find.text('Aksiyalar · 1'));
    await settle(tester);
    expect(find.byType(DealsScreen), findsOneWidget);
    expect(find.text('Somsa va choy'), findsOneWidget);
    expect(find.text('Faol · 2'), findsOneWidget);
    await checkTapTargets(tester);

    await tester.tap(find.text('Somsa va choy'));
    await settle(tester);
    expect(find.text('Mijozlar ko‘rinishida ochish'), findsOneWidget);
    expect(find.text('Yakunlash'), findsOneWidget);
    await tester.tap(find.text('Pauza'));
    await settle(tester);
    expect(lastAction(server), {'type': 'deal.transition', 'dealId': (contract('business-deals') as List).first['id'], 'action': 'pause'});
    expect(find.text('Aksiya pauzaga qo‘yildi.'), findsOneWidget);

    await tester.ensureVisible(find.text('Qoralama · 0'));
    await settle(tester);
    await tester.tap(find.text('Qoralama · 0'));
    await settle(tester);
    expect(find.text('Bu bo‘limda aksiya yo‘q.'), findsOneWidget);
  });

  testWidgets('a draft is changed and saved again; a deleted draft asks first', (tester) async {
    final server = ownerServer();
    final draft = {
      ...withoutPhoto((contract('business-deals') as List).first as Map<String, dynamic>),
      'status': 'DRAFT',
      'effective': 'DRAFT',
      'title': 'Somsa kombo',
    };
    server.routes['GET /api/v1/business/:id/deals'] = (_) => {
      'data': [draft],
    };
    server.routes['GET /api/v1/business/:id/deals/:dealId'] = (_) => {
      // Its second branch has since been closed.
      'data': {
        ...withoutPhoto(contractMap('business-deal')),
        'status': 'DRAFT',
        'title': 'Somsa kombo',
        'branchIds': ['br1', 'closed'],
      },
    };
    final answer = server.routes['POST /api/v1/business/:id']!;
    server.routes['POST /api/v1/business/:id'] = (request) => (request.data as Map)['type'] == 'deal.update'
        ? {
            'data': {'id': draft['id'], 'status': 'DRAFT'},
          }
        : answer(request);
    await pumpApp(tester, server: server, token: 't');
    await go(tester, '/business/biz/deals');
    await tester.tap(find.text('Somsa kombo'));
    await settle(tester);
    await tester.tap(find.text('Tahrirlash'));
    await settle(tester);
    expect(find.byType(DealFormScreen), findsOneWidget);
    expect(tester.widget<TextField>(find.widgetWithText(TextField, 'Aksiya nomi')).controller!.text, 'Somsa kombo');
    await tester.enterText(find.widgetWithText(TextField, 'Aksiya nomi'), 'Somsa kombo (2 ta)');
    await settle(tester);
    await scrollDealForm(tester, find.text('Qoralama sifatida saqlash'));
    await tester.tap(find.text('Qoralama sifatida saqlash'));
    await settle(tester);
    final sent = lastAction(server);
    expect(
      [sent['type'], sent['dealId'], sent['submit'], (sent['input'] as Map)['title'], (sent['input'] as Map)['branchIds']],
      [
        'deal.update',
        draft['id'],
        false,
        'Somsa kombo (2 ta)',
        ['br1'],
      ],
    );
    expect(find.text('Qoralama saqlandi.'), findsOneWidget);

    await tester.tap(find.text('Somsa kombo'));
    await settle(tester);
    await tester.tap(find.text('O‘chirish'));
    await settle(tester);
    expect(find.text('Qoralamani o‘chirasizmi?'), findsOneWidget);
    await tester.tap(find.widgetWithText(TextButton, 'O‘chirish'));
    await settle(tester);
    expect(lastAction(server)['action'], 'delete');
    expect(find.text('Qoralama o‘chirildi.'), findsOneWidget);
  });

  testWidgets('an approved deal is not changed in place; an older server says so', (tester) async {
    final server = ownerServer();
    await pumpApp(tester, server: server, token: 't');
    await go(tester, '/business/biz/deals/${contractMap('business-deal')['id']}/edit');
    expect(find.textContaining('nusxa oling'), findsOneWidget);

    final config = contractMap('config')
      ..['minAppBuild'] = 0
      ..remove('deal');
    server.routes['GET /api/v1/config'] = (_) => {'data': config};
    final container = ProviderScope.containerOf(tester.element(find.byType(MaterialApp)));
    container.invalidate(configProvider);
    await go(tester, '/business/biz/deals/new');
    expect(find.textContaining('server yangilangach ishlaydi'), findsOneWidget);
    expect(find.text('Saytda qo‘shish'), findsOneWidget);
    // Nor is the list asked for; the site's workspace is offered instead.
    await go(tester, '/business/biz/deals');
    expect(find.textContaining('boshqarish server yangilangach ishlaydi'), findsOneWidget);
    expect(find.text('Biznes kabineti'), findsOneWidget);
    expect(server.requests.where((request) => request.path == '/api/v1/business/biz/deals'), isEmpty);
  });

  for (final theme in ['light', 'dark']) {
    testWidgets('$theme theme, 360 px, large text: the deal form and list stay readable', (tester) async {
      await pumpApp(tester, server: ownerServer(), token: 't', theme: theme, size: phoneSizes['360']!, textScale: 1.3);
      await go(tester, '/business/biz/deals');
      await checkTapTargets(tester);
      await tester.tap(find.text('Yangi aksiya'));
      await settle(tester);
      await checkTapTargets(tester);
      await submitDeal(tester);
      await checkTapTargets(tester);
    });
  }
}
