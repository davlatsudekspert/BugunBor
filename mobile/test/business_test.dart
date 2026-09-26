// Business owners in the app: the home card that invites them, registering
// a business (checked the way the server checks it), and the business
// profile each role sees in the Profile tab.
import 'dart:async';

import 'package:bugunbor/app/links.dart';
import 'package:bugunbor/app/router.dart';
import 'package:bugunbor/features/join/join_screen.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'support/fakes.dart';

Finder get formList => find.descendant(of: find.byType(JoinScreen), matching: find.byType(Scrollable)).first;

/// Scrolls [target] into view and lets the new layout settle (a tap right
/// after scrollUntilVisible would use the old position).
Future<void> scrollTo(WidgetTester tester, Finder target, {Finder? within, double step = 300}) async {
  await tester.scrollUntilVisible(target, step, scrollable: within ?? find.byType(Scrollable).first);
  await settle(tester, frames: 4);
}

Future<void> scrollForm(WidgetTester tester, Finder target) => scrollTo(tester, target, within: formList);

/// From the Profile tab of someone without a business to the form.
Future<void> openForm(WidgetTester tester) async {
  await tester.tap(find.text('Profil'));
  await settle(tester);
  await scrollTo(tester, find.text('Biznes qo‘shish'));
  await tester.tap(find.text('Biznes qo‘shish'));
  await settle(tester);
  expect(find.byType(JoinScreen), findsOneWidget);
}

/// Everything the server needs, typed the way a person would.
Future<void> fillForm(WidgetTester tester) async {
  await tester.enterText(find.widgetWithText(TextField, 'Biznes nomi'), 'Alisa Nonvoyxonasi');
  await tester.tap(find.text('Taomlar'));
  await settle(tester);
  await scrollForm(tester, find.widgetWithText(TextField, 'Asosiy filial manzili'));
  await tester.enterText(find.widgetWithText(TextField, 'Asosiy filial manzili'), 'Chilonzor 9-kvartal, 12-uy');
  await scrollForm(tester, find.text('Namuna matn'));
  await tester.tap(find.text('Namuna matn'));
  await settle(tester, frames: 2);
}

Future<void> submit(WidgetTester tester) async {
  await scrollForm(tester, find.text('Tekshiruvga yuborish'));
  await tester.tap(find.text('Tekshiruvga yuborish'));
  await settle(tester);
}

void main() {
  testWidgets('the home card invites a guest, who signs in before adding a business', (tester) async {
    await pumpApp(tester, server: FakeServer.standard());
    await scrollTo(tester, find.text('Biznesimni qo‘shish'));
    expect(find.text('Biznesingiz bormi? Ko‘proq soting'), findsOneWidget);
    expect(find.text('Ro‘yxatdan o‘tish bepul — bir necha daqiqa'), findsOneWidget);
    await checkTapTargets(tester);
    await tester.tap(find.text('Biznesimni qo‘shish'));
    await settle(tester);
    expect(find.text('Biznesingizni BugunBor’ga qo‘shing'), findsOneWidget);
    expect(find.textContaining('Telegram orqali kiring'), findsOneWidget);
    await checkTapTargets(tester);
    await tester.tap(find.text('Telegram orqali kirish'));
    await settle(tester);
    expect(find.text('Maxfiylik siyosati va foydalanish shartlariga roziman'), findsOneWidget);
  });

  testWidgets('deals come first on the home screen; the card follows the first few', (tester) async {
    final server = FakeServer.standard();
    final feed = contractMap('feed');
    final deal = ((feed['nearby'] as List).first as Map).cast<String, dynamic>();
    final nearby = [
      for (var index = 0; index < 6; index++) {...deal, 'id': 'd$index', 'slug': 'osh-$index', 'title': 'Osh $index'},
    ];
    server.routes['GET /api/v1/feed'] = (_) => {
      'data': {...feed, 'forYou': <Object>[], 'nearby': nearby, 'total': nearby.length},
    };
    await pumpApp(tester, server: server, size: phoneSizes['360']!);
    // Nothing chosen for "Siz uchun", yet deals are on the first screen.
    expect(find.text('Osh 0'), findsOneWidget);
    await scrollTo(tester, find.text('Biznesingiz bormi? Ko‘proq soting'));
    final card = tester.getTopLeft(find.text('Biznesingiz bormi? Ko‘proq soting')).dy;
    expect(tester.getTopLeft(find.text('Osh 2', skipOffstage: false)).dy, lessThan(card));
    expect(tester.getTopLeft(find.text('Osh 3', skipOffstage: false)).dy, greaterThan(card));
  });

  testWidgets('the home card can be closed for a month', (tester) async {
    await pumpApp(tester, server: FakeServer.standard());
    await scrollTo(tester, find.byTooltip('Yashirish'));
    await tester.tap(find.byTooltip('Yashirish'));
    await settle(tester);
    expect(find.text('Biznesingiz bormi? Ko‘proq soting', skipOffstage: false), findsNothing);
    final prefs = await SharedPreferences.getInstance();
    expect(prefs.getInt('promo_hidden_at'), isNotNull);
  });

  testWidgets('people who already have a business do not see the card', (tester) async {
    await pumpApp(tester, server: memberServer(() => [owner]), token: 't');
    expect(find.text('Bugun nima bor?'), findsOneWidget);
    expect(find.text('Biznesingiz bormi? Ko‘proq soting', skipOffstage: false), findsNothing);
  });

  testWidgets('registration: mistakes are shown before sending, then the new business profile opens', (tester) async {
    var created = false;
    final server = memberServer(() => created ? contract('me-memberships') as List : const []);
    server.routes['POST /api/v1/businesses'] = (_) {
      created = true;
      return Reply(201, {'data': contract('business-create')});
    };
    server.routes['GET /api/v1/business/:id'] = (request) => {
      'data': workspace(business: {'id': contractMap('business-create')['id'], 'name': 'Alisa Nonvoyxonasi'}),
    };
    await pumpApp(tester, server: server, token: 't', pin: (latitude: 41.2995, longitude: 69.2401));
    await openForm(tester);
    // The phone comes from the account.
    await scrollForm(tester, find.widgetWithText(TextField, 'Telefon'));
    expect(tester.widget<TextField>(find.widgetWithText(TextField, 'Telefon')).controller!.text, '+998 90 123 45 67');

    await submit(tester);
    expect(server.requests.where((request) => request.method == 'POST'), isEmpty);
    // The form went back up to the first problem.
    expect(find.text('Kamida 2 ta belgi'), findsOneWidget);
    expect(find.text('Birini tanlang'), findsOneWidget);
    await checkTapTargets(tester);

    await fillForm(tester);
    expect(find.textContaining('Alisa Nonvoyxonasi — milliy va yevropa taomlari.'), findsOneWidget);
    await scrollForm(tester, find.text('Joylashuvimni aniqlash'));
    await tester.tap(find.text('Joylashuvimni aniqlash'));
    await settle(tester);
    expect(find.text('Joylashuv aniqlandi: Toshkent. Xaritadagi nuqta saqlanadi.'), findsOneWidget);
    await submit(tester);

    final sent = server.requests.singleWhere((request) => request.method == 'POST' && request.path == '/api/v1/businesses');
    expect(sent.headers['authorization'], 'Bearer t');
    final body = (sent.data as Map).cast<String, dynamic>();
    expect(body['name'], 'Alisa Nonvoyxonasi');
    expect(body['categoryId'], 'cat_food');
    expect(body['city'], 'tashkent');
    expect(body['phone'], '+998901234567');
    expect(body['address'], 'Chilonzor 9-kvartal, 12-uy');
    expect(body['open'], '09:00');
    expect(body['close'], '21:00');
    expect(body['description'], startsWith('Alisa Nonvoyxonasi — '));
    expect(body['telegram'], isNull);
    expect(body['latitude'], closeTo(41.2995, 0.0001));
    expect(body['longitude'], closeTo(69.2401, 0.0001));

    expect(find.text('Biznesingiz tasdiqlandi!'), findsOneWidget);
    await checkTapTargets(tester);
    await tester.tap(find.text('Biznes profiliga o‘tish'));
    await settle(tester);
    expect(find.byType(JoinScreen), findsNothing);
    expect(find.text('Biznes profili'), findsOneWidget);
    expect(find.text('Alisa Nonvoyxonasi'), findsOneWidget);
    expect(find.text('Tasdiqlangan'), findsOneWidget);
    // The Profile tab now shows the business side.
    expect(find.byIcon(CupertinoIcons.briefcase_fill), findsOneWidget);
    await checkTapTargets(tester);
  });

  testWidgets('registration: the server’s field errors and limits are shown in place; leaving asks first', (tester) async {
    final server = memberServer(() => const []);
    Reply answer = const Reply(422, {
      'error': {
        'code': 'VALIDATION',
        'message': 'Maʼlumotlar notoʻgʻri',
        'fields': {'phone': 'phone'},
      },
    });
    server.routes['POST /api/v1/businesses'] = (_) => answer;
    await pumpApp(tester, server: server, token: 't');
    await openForm(tester);
    await fillForm(tester);
    await submit(tester);
    expect(find.text('Raqamni +998 90 123 45 67 ko‘rinishida kiriting'), findsOneWidget);

    answer = const Reply(409, {
      'error': {'code': 'BUSINESS_LIMIT', 'message': 'Bitta hisobdan ko‘pi bilan 5 ta biznes qo‘shish mumkin.'},
    });
    await submit(tester);
    expect(find.text('Bitta hisobdan ko‘pi bilan 5 ta biznes qo‘shish mumkin.'), findsOneWidget);
    expect(find.byType(JoinScreen), findsOneWidget);

    await tester.binding.handlePopRoute();
    await settle(tester);
    expect(find.text('Kiritilgan ma’lumotlar saqlanmaydi. Chiqasizmi?'), findsOneWidget);
    await tester.tap(find.widgetWithText(TextButton, 'Bekor qilish'));
    await settle(tester);
    expect(find.byType(JoinScreen), findsOneWidget);
    await tester.binding.handlePopRoute();
    await settle(tester);
    await tester.tap(find.widgetWithText(TextButton, 'Chiqish'));
    await settle(tester);
    expect(find.byType(JoinScreen), findsNothing);
  });

  testWidgets('before the server is updated, the app says so and offers the site', (tester) async {
    final server = memberServer(() => [owner]);
    final config = contractMap('config')..['minAppBuild'] = 0;
    config['categories'] = [
      for (final category in (config['categories'] as List).cast<Map<String, dynamic>>()) {...category}..remove('id'),
    ];
    server.routes['GET /api/v1/config'] = (_) => {'data': config};
    server.routes['GET /api/v1/business/:id'] = (_) => const Reply(404, {
      'error': {'code': 'NOT_FOUND'},
    });
    await pumpApp(tester, server: server, token: 't');
    await tester.tap(find.text('Profil'));
    await settle(tester);
    expect(find.text('Topilmadi yoki endi mavjud emas.'), findsOneWidget);
    expect(find.text('Biznes kabineti'), findsOneWidget);
    final container = ProviderScope.containerOf(tester.element(find.byType(MaterialApp)));
    unawaited(container.read(routerProvider).push('/business/new'));
    await settle(tester);
    expect(find.textContaining('server yangilangach ishlaydi'), findsOneWidget);
    expect(find.text('Saytda qo‘shish'), findsOneWidget);
    expect(find.text('Tekshiruvga yuborish'), findsNothing);
  });

  testWidgets('an owner of five businesses is told the limit before filling anything in', (tester) async {
    final server = memberServer(
      () => [
        for (var index = 0; index < 5; index++) {...owner, 'businessId': 'biz$index', 'name': 'Kafe $index'},
      ],
    );
    await pumpApp(tester, server: server, token: 't');
    final container = ProviderScope.containerOf(tester.element(find.byType(MaterialApp)));
    unawaited(container.read(routerProvider).push('/business/new'));
    await settle(tester);
    expect(find.text('Bitta hisobdan ko‘pi bilan 5 ta biznes qo‘shish mumkin.'), findsOneWidget);
    expect(find.text('Tekshiruvga yuborish'), findsNothing);
  });

  testWidgets('an owner’s business profile: next steps, numbers, latest codes; the personal side is one tap away', (tester) async {
    await pumpApp(tester, server: memberServer(() => [owner]), token: 't');
    await tester.tap(find.text('Profil'));
    await settle(tester);
    expect(find.text('Biznes profili'), findsOneWidget);
    expect(find.text('Egasi'), findsOneWidget);
    expect(find.text('Kodni tekshirish'), findsOneWidget);
    expect(find.text('Aksiya qo‘shish'), findsOneWidget);
    expect(find.text('Biznes sahifasi'), findsOneWidget);
    await scrollTo(tester, find.text('2 / 6 bajarildi'));
    expect(find.text('Logotip yuklang'), findsOneWidget);
    await scrollTo(tester, find.text('Alice Karimova · Markaz'));
    expect(find.text('Faol aksiyalar'), findsOneWidget);
    expect(find.text('Bugun band qilindi'), findsOneWidget);
    await checkTapTargets(tester);

    await scrollTo(tester, find.text('Shaxsiy'), step: -300);
    await tester.tap(find.text('Shaxsiy'));
    await settle(tester);
    expect(find.text('Alice Karimova'), findsOneWidget);
    expect(find.byIcon(CupertinoIcons.person_fill), findsOneWidget);
    final prefs = await SharedPreferences.getInstance();
    expect(prefs.getString('profile_mode'), 'personal');
    await checkTapTargets(tester);
  });

  testWidgets('a cashier’s business profile only checks codes', (tester) async {
    final server = memberServer(
      () => [
        {...owner, 'role': 'CASHIER'},
      ],
    );
    server.routes['GET /api/v1/business/:id'] = (_) => {
      'data': workspace(
        other: {
          'role': 'CASHIER',
          'can': {'edit': false, 'deals': false, 'validate': true, 'analytics': false},
          'stats': null,
          'recent': [],
          'setup': [],
        },
      ),
    };
    await pumpApp(tester, server: server, token: 't');
    await tester.tap(find.text('Profil'));
    await settle(tester);
    expect(find.text('Kassir'), findsOneWidget);
    expect(find.text('Kodni tekshirish'), findsOneWidget);
    expect(find.text('Aksiya qo‘shish'), findsNothing);
    expect(find.text('Statistika'), findsNothing);
    expect(find.text('Profilni to‘ldiring'), findsNothing);
    expect(find.text('Siz bu biznesda kassirsiz: mijozlarning kodlarini tekshirasiz.'), findsOneWidget);
  });

  testWidgets('a rejected business says why and where to fix it; no code checks until approved', (tester) async {
    final server = memberServer(
      () => [
        {...owner, 'status': 'REJECTED', 'verified': false},
      ],
    );
    server.routes['GET /api/v1/business/:id'] = (_) => {
      'data': workspace(business: {'status': 'REJECTED', 'rejectionReason': 'Rasm boshqa biznesniki'}),
    };
    await pumpApp(tester, server: server, token: 't');
    await tester.tap(find.text('Profil'));
    await settle(tester);
    expect(find.text('Rad etilgan'), findsOneWidget);
    expect(find.text('Biznes rad etildi: Rasm boshqa biznesniki'), findsOneWidget);
    expect(find.text('Saytda tuzatib, qayta yuborish'), findsOneWidget);
    expect(find.text('Kodni tekshirish'), findsNothing);
    expect(find.text('Biznes sahifasi'), findsNothing);
  });

  FakeServer twoBusinesses() {
    final server = memberServer(
      () => [
        owner,
        {'businessId': 'biz2', 'name': 'Ikkinchi', 'slug': 'ikkinchi', 'role': 'OWNER', 'status': 'VERIFIED', 'verified': true},
      ],
    );
    server.routes['GET /api/v1/business/:id'] = (request) {
      final id = request.path.split('/').last;
      return {
        'data': workspace(business: {'id': id, 'name': id == 'biz2' ? 'Ikkinchi' : 'Kafe'}),
      };
    };
    return server;
  }

  testWidgets('several businesses: the picker switches the profile and remembers the choice', (tester) async {
    await pumpApp(tester, server: twoBusinesses(), token: 't');
    await tester.tap(find.text('Profil'));
    await settle(tester);
    expect(find.text('Biznesni tanlang'), findsOneWidget);
    await tester.tap(find.text('Kafe').first);
    await settle(tester);
    await tester.tap(find.text('Ikkinchi').last);
    await settle(tester);
    expect(find.text('Ikkinchi'), findsWidgets);
    final prefs = await SharedPreferences.getInstance();
    expect(prefs.getString('business_id'), 'biz2');
  });

  testWidgets('a "business approved" notification opens that business profile', (tester) async {
    await pumpApp(tester, server: twoBusinesses(), token: 't');
    final container = ProviderScope.containerOf(tester.element(find.byType(MaterialApp)));
    container.read(routerProvider).go(appPathFor('https://bugunbor.uz/business/switch/biz2?next=%2Fbusiness%2Fdashboard')!);
    await settle(tester);
    expect(find.text('Biznes profili'), findsOneWidget);
    expect(find.text('Ikkinchi'), findsWidgets);
    expect(find.text('Kafe'), findsNothing);
  });

  for (final theme in ['light', 'dark']) {
    testWidgets('$theme theme, 360 px, large text: business profile and the form stay readable', (tester) async {
      await pumpApp(tester, server: memberServer(() => [owner]), token: 't', theme: theme, size: phoneSizes['360']!, textScale: 1.3);
      await tester.tap(find.text('Profil'));
      await settle(tester);
      await checkTapTargets(tester);
      await scrollTo(tester, find.text('Yana biznes qo‘shish'));
      await tester.tap(find.text('Yana biznes qo‘shish'));
      await settle(tester);
      expect(find.byType(JoinScreen), findsOneWidget);
      await tester.tap(find.text('Taomlar'));
      // The chip's colour change finishes before the contrast check.
      await settle(tester);
      await checkTapTargets(tester);
      await submit(tester);
      await checkTapTargets(tester);
    });
  }
}
