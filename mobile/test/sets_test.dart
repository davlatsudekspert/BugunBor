// Sets («to‘plam») for customers: read from the server (and nothing from an
// older one), marked on cards with what is in them, listed on the deal page,
// and found with the «Setlar» filter in search.
import 'package:bugunbor/app/router.dart';
import 'package:bugunbor/data/models.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'support/fakes.dart';

const oilaviy = {
  'items': [
    {'name': 'Osh', 'qty': 2},
    {'name': 'Achchiq-chuchuk salat', 'qty': 2},
    {'name': 'Choy', 'qty': 1},
  ],
  'persons': 4,
};

Map<String, dynamic> firstCard() => withoutPhoto((contractMap('feed')['nearby'] as List).first as Map<String, dynamic>);

Future<void> open(WidgetTester tester, String location) async {
  ProviderScope.containerOf(tester.element(find.byType(MaterialApp))).read(routerProvider).go(location);
  await settle(tester);
}

void main() {
  test('a set as the server sends it; an older server sends none', () {
    final set = DealSet.fromJson(oilaviy)!;
    expect([for (final item in set.items) '${item.qty} ${item.name}'], ['2 Osh', '2 Achchiq-chuchuk salat', '1 Choy']);
    expect(set.persons, 4);
    expect(set.summary, '2× Osh · 2× Achchiq-chuchuk salat · Choy');
    expect(DealSet.fromJson(null), isNull);
    expect(DealSet.fromJson('Osh'), isNull);
    expect(DealSet.fromJson({'items': [], 'persons': 2}), isNull);
    // Nameless lines are dropped, a count is kept within 1–20, «0 people» means unsaid.
    expect(
      DealSet.fromJson({
        'items': [
          {'name': ' '},
          {'name': 'Choy', 'qty': 0},
          {'name': 'Somsa', 'qty': 99},
        ],
        'persons': 0,
      })?.toJson(),
      {
        'items': [
          {'name': 'Choy', 'qty': 1},
          {'name': 'Somsa', 'qty': 20},
        ],
        'persons': null,
      },
    );
    expect(DealCard.fromJson({...firstCard(), 'set': oilaviy}).set?.persons, 4);
    expect(DealCard.fromJson(Map.of(firstCard())..remove('set')).set, isNull);
    expect(DealDetail.fromJson({...contractMap('deal'), 'set': oilaviy}).set?.items.length, 3);
  });

  testWidgets('«Setlar» in search asks only for sets, and the cards say what is in them', (tester) async {
    final server = FakeServer.standard();
    server.routes['GET /api/v1/deals'] = (request) {
      final sets = request.queryParameters['set'] == '1';
      return {
        'data': [
          if (!sets) firstCard(),
          {...firstCard(), 'id': 'set', 'slug': 'oilaviy-set', 'title': 'Oilaviy set', 'set': oilaviy},
        ],
        'page': {'total': sets ? 1 : 2, 'offset': 0, 'limit': 24},
      };
    };
    await pumpApp(tester, server: server);
    await tester.tap(find.text('Qidiruv'));
    await settle(tester);
    expect(find.text('Osh'), findsOneWidget);
    expect(find.text('Set · 4 kishilik'), findsOneWidget);
    expect(find.text('2× Osh · 2× Achchiq-chuchuk salat · Choy'), findsOneWidget);
    await checkTapTargets(tester);

    await tester.tap(find.text('Setlar'));
    await settle(tester);
    final asked = server.requests.lastWhere((request) => request.path == '/api/v1/deals');
    expect(asked.queryParameters['set'], '1');
    expect(find.text('Oilaviy set'), findsOneWidget);
    expect(find.text('Osh'), findsNothing);
    // Off again: everything, and the filter is not sent.
    await tester.tap(find.text('Setlar'));
    await settle(tester);
    expect(server.requests.lastWhere((request) => request.path == '/api/v1/deals').queryParameters.containsKey('set'), isFalse);
    expect(find.text('Osh'), findsOneWidget);
  });

  testWidgets('a link to sets opens search with the filter on', (tester) async {
    final server = FakeServer.standard();
    await pumpApp(tester, server: server);
    await open(tester, '/search?set=1');
    expect(server.requests.lastWhere((request) => request.path == '/api/v1/deals').queryParameters['set'], '1');
    expect(tester.widget<FilterChip>(find.widgetWithText(FilterChip, 'Setlar')).selected, isTrue);
  });

  testWidgets('the deal page lists what is in the set, for how many people', (tester) async {
    final server = FakeServer.standard();
    server.routes['GET /api/v1/deals/:slug'] = (_) => {
      'data': {...dealWithHours(openAllDay), 'set': oilaviy},
    };
    await pumpApp(tester, server: server);
    await open(tester, '/deals/osh');
    await tester.scrollUntilVisible(find.text('Achchiq-chuchuk salat'), 200, scrollable: find.byType(Scrollable).first);
    expect(find.text('Set tarkibi'), findsOneWidget);
    expect(find.text('4 kishilik'), findsOneWidget);
    expect(find.text('× 2'), findsNWidgets(2));
    expect(find.text('× 1'), findsOneWidget);
  });

  testWidgets('a set on Home says so on its photo', (tester) async {
    final server = FakeServer.standard();
    final feed = contractMap('feed');
    server.routes['GET /api/v1/feed'] = (_) => {
      'data': {
        ...feed,
        'nearby': [
          {...firstCard(), 'set': oilaviy},
        ],
      },
    };
    await pumpApp(tester, server: server);
    for (var step = 0; step < 12 && find.text('Set · 4 kishilik').evaluate().isEmpty; step++) {
      await tester.drag(find.byType(Scrollable).first, const Offset(0, -250));
      await settle(tester, frames: 4);
    }
    expect(find.text('Set · 4 kishilik'), findsWidgets);
  });
}
