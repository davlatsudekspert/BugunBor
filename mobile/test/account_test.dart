// First start and the account: interests ticked before "Skip" are kept, the
// phone's back goes one step back, a name is at least two letters, deleting
// an account keeps notifications until the account is really gone, and the
// city list always has a way forward.
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'support/fakes.dart';

void main() {
  testWidgets('onboarding: interests ticked before Skip are kept', (tester) async {
    await pumpApp(tester, server: FakeServer.standard(), onboarded: false);
    await tester.tap(find.text('Keyingi'));
    await settle(tester);
    expect(find.text('Sizga nima yoqadi?'), findsOneWidget);
    await tester.tap(find.text('Kofe'));
    await settle(tester);
    await tester.tap(find.text('O‘tkazib yuborish'));
    await settle(tester);
    final prefs = await SharedPreferences.getInstance();
    expect(prefs.getBool('onboarded'), isTrue);
    expect(prefs.getStringList('interests'), ['kofe']);
  });

  testWidgets('onboarding: the phone’s back goes to the previous step', (tester) async {
    await pumpApp(tester, server: FakeServer.standard(), onboarded: false);
    await tester.tap(find.text('Keyingi'));
    await settle(tester);
    expect(find.text('Sizga nima yoqadi?'), findsOneWidget);
    await tester.binding.handlePopRoute();
    await settle(tester);
    expect(find.text('BugunBor’ga xush kelibsiz'), findsOneWidget);
    // The arrow on the screen does the same.
    await tester.tap(find.text('Keyingi'));
    await settle(tester);
    await tester.tap(find.byType(BackButtonIcon));
    await settle(tester);
    expect(find.text('BugunBor’ga xush kelibsiz'), findsOneWidget);
  });

  testWidgets('a name shorter than two letters cannot be saved', (tester) async {
    final server = signedInServer();
    await pumpApp(tester, server: server, token: 't');
    await tester.tap(find.text('Profil'));
    await settle(tester);
    await tester.tap(find.byTooltip('Ismingiz'));
    await settle(tester);
    await tester.enterText(find.byType(TextField), ' A ');
    await settle(tester);
    final save = find.widgetWithText(TextButton, 'Saqlash');
    expect(tester.widget<TextButton>(save).onPressed, isNull);
    await tester.enterText(find.byType(TextField), 'Aziz');
    await settle(tester);
    expect(tester.widget<TextButton>(save).onPressed, isNotNull);
  });

  testWidgets('deleting the account: notifications stay until it is really gone', (tester) async {
    final server = signedInServer();
    var deletes = 0;
    server.routes['DELETE /api/v1/me'] = (request) {
      deletes++;
      return (request.data as Map)['closeBusinesses'] == true
          ? {
              'data': {'ok': true},
            }
          : const Reply(409, {
              'error': {'code': 'SOLE_OWNER', 'message': 'Siz biznesning yagona egasisiz.'},
            });
    };
    await pumpApp(tester, server: server, token: 't', prefs: {'push_token': 'phone-token'});
    await tester.tap(find.text('Profil'));
    await settle(tester);
    await tester.scrollUntilVisible(find.text('Hisobni o‘chirish').hitTestable(), 300, scrollable: find.byType(Scrollable).first);
    await tester.tap(find.text('Hisobni o‘chirish'));
    await settle(tester);
    await tester.tap(find.widgetWithText(TextButton, 'Hisobni o‘chirish'));
    await settle(tester);
    // The only owner of a business changes their mind: still signed in, still notified.
    expect(find.text('Biznesni yopib, o‘chirish'), findsOneWidget);
    await tester.tap(find.text('Bekor qilish'));
    await settle(tester);
    final prefs = await SharedPreferences.getInstance();
    expect(deletes, 1);
    expect(prefs.getString('push_token'), 'phone-token');
    expect(server.requests.where((request) => request.path.contains('/devices')), isEmpty);

    // This time for real: the server forgets the phone with the account.
    await tester.tap(find.text('Hisobni o‘chirish'));
    await settle(tester);
    await tester.tap(find.widgetWithText(TextButton, 'Hisobni o‘chirish'));
    await settle(tester);
    await tester.tap(find.text('Biznesni yopib, o‘chirish'));
    await settle(tester);
    expect(deletes, 3);
    expect(prefs.getString('push_token'), isNull);
  });

  testWidgets('the city list without any connection offers a retry', (tester) async {
    final server = FakeServer.standard();
    final config = server.routes['GET /api/v1/config']!;
    var online = false;
    server.routes['GET /api/v1/config'] = (request) =>
        online ? config(request) : throw DioException.connectionError(requestOptions: request, reason: 'offline');
    await pumpApp(tester, server: server);
    await tester.tap(find.text('Shaharni tanlang'));
    await settle(tester);
    expect(find.text('Qayta urinish'), findsOneWidget);
    online = true;
    await tester.tap(find.text('Qayta urinish'));
    await settle(tester);
    expect(find.text('Samarqand'), findsOneWidget);
  });
}
