// An app installed from the site does not update itself: the server names the
// newest build and the page to get it; home offers it until it is closed.
import 'package:bugunbor/data/models.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'support/fakes.dart';

FakeServer offering(Object? update) {
  final server = FakeServer.standard();
  server.routes['GET /api/v1/config'] = (_) => {
    'data': contractMap('config')
      ..['minAppBuild'] = 0
      ..['update'] = update,
  };
  return server;
}

void main() {
  test('the offer is read only when it is complete', () {
    expect(AppUpdate.fromJson({'build': 45, 'url': 'https://bugunbor.uz/ilova'})?.build, 45);
    expect(AppUpdate.fromJson(null), isNull);
    expect(AppUpdate.fromJson({'build': 45}), isNull);
    expect(AppUpdate.fromJson({'build': '45', 'url': 'x'}), isNull);
  });

  testWidgets('a newer build is offered on home until it is closed; the same build stays closed', (tester) async {
    await pumpApp(tester, server: offering({'build': 45, 'url': 'https://bugunbor.uz/ilova'}));
    expect(find.text('Yangi versiya bor'), findsOneWidget);
    expect(find.text('Yangilash'), findsOneWidget);
    await checkTapTargets(tester);

    await tester.tap(find.byTooltip('Yopish'));
    await settle(tester);
    expect(find.text('Yangi versiya bor'), findsNothing);
    expect((await SharedPreferences.getInstance()).getInt('dismissed_update'), 45);
  });

  testWidgets('closed for one build, a later build is offered again', (tester) async {
    await pumpApp(tester, server: offering({'build': 45, 'url': 'https://bugunbor.uz/ilova'}), prefs: {'dismissed_update': 45});
    expect(find.text('Yangi versiya bor'), findsNothing);
    // A fresh start of the app.
    await tester.pumpWidget(const SizedBox());
    await pumpApp(tester, server: offering({'build': 46, 'url': 'https://bugunbor.uz/ilova'}), prefs: {'dismissed_update': 45});
    expect(find.text('Yangi versiya bor'), findsOneWidget);
  });

  testWidgets('nothing is offered for this build, an older one, or none', (tester) async {
    // A test build is 1.
    for (final update in [
      {'build': 1, 'url': 'https://bugunbor.uz/ilova'},
      null,
    ]) {
      await tester.pumpWidget(const SizedBox());
      await pumpApp(tester, server: offering(update));
      expect(find.text('Yangi versiya bor'), findsNothing);
    }
  });
}
