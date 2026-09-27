// A phone with three navigation buttons draws them over the bottom of the
// app. Pages without a bar of their own and sheets must end above them, so
// the last line can always be read and tapped (a demo deal's last branch
// used to sit under the buttons).
import 'package:bugunbor/app/router.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'support/fakes.dart';

/// The navigation bar's height, in logical pixels.
const navBar = 48.0;

Future<void> open(WidgetTester tester, String location) async {
  ProviderScope.containerOf(tester.element(find.byType(MaterialApp))).read(routerProvider).go(location);
  await settle(tester);
}

/// Puts the three buttons over the bottom of the screen.
Future<void> showNavBar(WidgetTester tester) async {
  tester.view.padding = const FakeViewPadding(bottom: navBar * 3);
  tester.view.viewPadding = const FakeViewPadding(bottom: navBar * 3);
  await settle(tester);
}

double screenHeight(WidgetTester tester) => tester.view.physicalSize.height / tester.view.devicePixelRatio;

/// Scrolls the vertical list inside [within] to its end; its last line of
/// text must then be above the navigation bar (or above [limit]).
Future<void> expectEndClear(WidgetTester tester, {Finder? within, double? limit}) async {
  final lists = find.descendant(
    of: within ?? find.byType(Scaffold).last,
    matching: find.byWidgetPredicate((widget) => widget is Scrollable && axisDirectionToAxis(widget.axisDirection) == Axis.vertical),
  );
  final state = tester.state<ScrollableState>(lists.first);
  // A lazy list learns its full length while it is scrolled: go to the end
  // until the end stops moving.
  for (var step = 0; step < 20; step++) {
    final end = state.position.maxScrollExtent;
    state.position.jumpTo(end);
    await settle(tester, frames: 4);
    if (state.position.maxScrollExtent == end) break;
  }
  final texts = find.descendant(of: lists.first, matching: find.byType(Text));
  final bottom = texts.evaluate().map((element) => tester.getRect(find.byWidget(element.widget).first).bottom).reduce((a, b) => a > b ? a : b);
  expect(bottom, lessThanOrEqualTo(limit ?? screenHeight(tester) - navBar));
}

void mockScanner(WidgetTester tester) {
  const methods = MethodChannel('dev.steenbakker.mobile_scanner/scanner/method');
  const streams = [MethodChannel('dev.steenbakker.mobile_scanner/scanner/event'), MethodChannel('dev.steenbakker.mobile_scanner/scanner/deviceOrientation')];
  final messenger = tester.binding.defaultBinaryMessenger;
  messenger.setMockMethodCallHandler(methods, (call) async {
    if (call.method == 'state') return 1;
    if (call.method == 'start') {
      return {
        'textureId': 1,
        'cameraDirection': 1,
        'handlesCropAndRotation': true,
        'naturalDeviceOrientation': 'PORTRAIT_UP',
        'sensorOrientation': 90,
        'numberOfCameras': 1,
        'currentTorchState': -1,
        'size': {'width': 1920.0, 'height': 1080.0},
      };
    }
    return null;
  });
  for (final channel in streams) {
    messenger.setMockMethodCallHandler(channel, (_) async => null);
  }
  addTearDown(() {
    for (final channel in [methods, ...streams]) {
      messenger.setMockMethodCallHandler(channel, null);
    }
  });
}

void main() {
  testWidgets('a demo deal (no book bar) ends above the buttons; a real deal’s book bar sits above them', (tester) async {
    final server = FakeServer.standard();
    var demo = true;
    server.routes['GET /api/v1/deals/:slug'] = (_) => {
      'data': {...dealWithHours(openAllDay), 'isDemo': demo},
    };
    await pumpApp(tester, server: server);
    await showNavBar(tester);
    await open(tester, '/deals/osh');
    await expectEndClear(tester);

    demo = false;
    await open(tester, '/');
    await open(tester, '/deals/somsa');
    final book = find.byType(FilledButton).last;
    expect(tester.getRect(book).bottom, lessThanOrEqualTo(screenHeight(tester) - navBar));
    await expectEndClear(tester, limit: tester.getRect(book).top);
  });

  testWidgets('a business page ends above the buttons', (tester) async {
    final server = FakeServer.standard();
    final business = contractMap('business');
    final deals = (business['deals'] as List).cast<Map<String, dynamic>>();
    server.routes['GET /api/v1/businesses/:slug'] = (_) => {
      'data': {
        ...business,
        'deals': [
          for (var index = 0; index < 8; index++)
            for (final deal in deals) {...withoutPhoto(deal), 'id': '${deal['id']}-$index', 'slug': '${deal['slug']}-$index'},
        ],
      },
    };
    await pumpApp(tester, server: server);
    await showNavBar(tester);
    await open(tester, '/businesses/kafe');
    await expectEndClear(tester);
  });

  testWidgets('the cashier’s «Tekshirish» stays above the buttons', (tester) async {
    mockScanner(tester);
    await pumpApp(tester, server: memberServer(() => [owner]), token: 't', size: const Size(360, 600), textScale: 1.3);
    await showNavBar(tester);
    await open(tester, '/cashier?business=biz');
    await expectEndClear(tester);
  });

  testWidgets('a business’s deal list ends above «Yangi aksiya», which is above the buttons', (tester) async {
    final server = memberServer(() => [owner]);
    final list = server.routes['GET /api/v1/business/:id/deals']!;
    server.routes['GET /api/v1/business/:id/deals'] = (request) {
      final answer = (list(request)! as Map).cast<String, dynamic>();
      final deals = (answer['data'] as List).cast<Map<String, dynamic>>();
      return {
        ...answer,
        'data': [
          for (var index = 0; index < 6; index++)
            for (final deal in deals) {...deal, 'id': '${deal['id']}-$index'},
        ],
      };
    };
    await pumpApp(tester, server: server, token: 't');
    await showNavBar(tester);
    await open(tester, '/business/biz/deals');
    final add = find.byType(FloatingActionButton);
    expect(tester.getRect(add).bottom, lessThanOrEqualTo(screenHeight(tester) - navBar));
    await expectEndClear(tester, limit: tester.getRect(add).top);
  });

  testWidgets('the deal form and «Biznes qo‘shish» end above the buttons', (tester) async {
    await pumpApp(tester, server: memberServer(() => [owner]), token: 't');
    await showNavBar(tester);
    await open(tester, '/business/biz/deals/new');
    await expectEndClear(tester);
    await open(tester, '/');
    await open(tester, '/business/new');
    await expectEndClear(tester);
  });

  testWidgets('sheets end above the buttons: a complaint and the city list', (tester) async {
    await pumpApp(tester, server: signedInServer(), token: 't');
    await showNavBar(tester);
    await tester.tap(find.text('Toshkent').first);
    await settle(tester);
    expect(find.text('Shaharni tanlang'), findsOneWidget);
    await expectEndClear(tester, within: find.byType(BottomSheet));
    Navigator.of(tester.element(find.byType(BottomSheet))).pop();
    await settle(tester);

    await open(tester, '/deals/osh');
    await tester.tap(find.byType(PopupMenuButton<String>).first);
    await settle(tester);
    await tester.tap(find.text('Shikoyat qilish'));
    await settle(tester);
    await expectEndClear(tester, within: find.byType(BottomSheet));
  });
}
