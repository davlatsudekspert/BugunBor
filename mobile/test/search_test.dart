// The search tab keeps its choices in the address: a link from Home always
// shows what it names, whatever chip was tapped before, and another city on
// Home searches that city.
import 'package:bugunbor/app/providers.dart';
import 'package:bugunbor/app/router.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'support/fakes.dart';

void main() {
  testWidgets('a Home link shows what it names, and another city searches that city', (tester) async {
    final server = FakeServer.standard();
    await pumpApp(tester, server: server);
    final container = ProviderScope.containerOf(tester.element(find.byType(MaterialApp)));
    final router = container.read(routerProvider);
    Map<String, dynamic> lastSearch() => server.requests.lastWhere((request) => request.path == '/api/v1/deals').queryParameters;

    router.go('/search?category=kofe');
    await settle(tester);
    expect(lastSearch()['category'], 'kofe');

    // Another chip…
    await tester.tap(find.widgetWithText(ChoiceChip, 'Taomlar'));
    await settle(tester);
    expect(lastSearch()['category'], 'taomlar');
    // The order chips follow «Setlar» in a row that scrolls sideways.
    await tester.ensureVisible(find.widgetWithText(ChoiceChip, 'Katta chegirma'));
    await settle(tester, frames: 4);
    await tester.tap(find.widgetWithText(ChoiceChip, 'Katta chegirma'));
    await settle(tester);
    expect(lastSearch(), containsPair('sort', 'discount'));
    expect(lastSearch()['category'], 'taomlar');

    // …then the same Home tile again: coffee, in the usual order.
    router.go('/');
    await settle(tester);
    router.go('/search?category=kofe');
    await settle(tester);
    expect(lastSearch()['category'], 'kofe');
    expect(lastSearch()['sort'], 'ending');

    // Home switches to Samarkand: the open search follows.
    container.read(settingsProvider.notifier).setCity('samarkand');
    await settle(tester);
    expect(lastSearch()['city'], 'samarkand');
  });
}
