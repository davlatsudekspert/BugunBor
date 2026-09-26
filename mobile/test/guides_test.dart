// Profile → «Video qo‘llanma» opens the site's video guides in the browser,
// in the app's language.
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';

import 'support/fakes.dart';

void main() {
  testWidgets('the video guides open from Profile', (tester) async {
    final opened = <String>[];
    tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(const MethodChannel('plugins.flutter.io/url_launcher'), (call) async {
      if (call.method == 'launch') opened.add((call.arguments as Map)['url'] as String);
      return true;
    });
    addTearDown(() => tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(const MethodChannel('plugins.flutter.io/url_launcher'), null));

    await pumpApp(tester, server: FakeServer.standard());
    await tester.tap(find.text('Profil'));
    await settle(tester);
    await tester.scrollUntilVisible(find.text('Video qo‘llanma'), 200, scrollable: find.byType(Scrollable).first);
    await tester.tap(find.text('Video qo‘llanma'));
    await settle(tester);
    expect(opened, hasLength(1));
    expect(Uri.parse(opened.single).path, '/qollanma');
    expect(Uri.parse(opened.single).queryParameters['lang'], 'uz');
  });
}
