// The bottom menu is on every page people browse (a deal, a business, a code,
// the counter), not only on the five tabs. And on every phone the app ends
// where the phone's own buttons begin: three buttons, the gesture line or no
// bar at all, small and large screens, large text, light and dark, and a
// phone turned sideways (the buttons and the camera cutout at the sides).
import 'package:bugunbor/app/router.dart';
import 'package:bugunbor/features/deal/deal_screen.dart';
import 'package:bugunbor/features/shell/shell_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

import 'support/fakes.dart';

/// The phone's own navigation bar, in logical pixels.
const phoneBars = {'three buttons': 48.0, 'gesture line': 20.0, 'no bar': 0.0};

GoRouter router(WidgetTester tester) => ProviderScope.containerOf(tester.element(find.byType(MaterialApp))).read(routerProvider);

Future<void> go(WidgetTester tester, String location) async {
  router(tester).go(location);
  await settle(tester);
}

Future<void> push(WidgetTester tester, String location) async {
  router(tester).push(location);
  await settle(tester);
}

Future<void> phoneBar(WidgetTester tester, double height) async {
  tester.view.padding = FakeViewPadding(bottom: height * 3);
  tester.view.viewPadding = FakeViewPadding(bottom: height * 3);
  await settle(tester);
}

/// The page on screen shows the menu right above the phone's bar, and
/// nothing of the page reaches below it.
void expectMenuAboveBar(WidgetTester tester, double bar, String page) {
  final screen = tester.view.physicalSize.height / tester.view.devicePixelRatio;
  final menu = find.byType(TabBarIos);
  expect(menu, findsOneWidget, reason: '$page: one bottom menu');
  expect(tester.getRect(menu).bottom, closeTo(screen - bar, 0.5), reason: '$page: the menu sits right on the phone’s bar');
  for (final element in find.byType(Scaffold).evaluate()) {
    expect(tester.getRect(find.byWidget(element.widget).first).bottom, lessThanOrEqualTo(screen - bar + 0.5), reason: '$page: nothing under the phone’s bar');
  }
}

/// The phone's buttons stay readable on the band under the app: dark on
/// the light theme, light on the dark one, with no grey veil over them.
void expectButtonsReadable(String page, {bool dark = false}) {
  final style = SystemChrome.latestStyle;
  expect(style?.systemNavigationBarIconBrightness, dark ? Brightness.light : Brightness.dark, reason: '$page: the phone’s buttons can be seen');
  expect(style?.systemNavigationBarContrastEnforced, isFalse, reason: '$page: no grey veil');
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
  for (final bar in phoneBars.entries) {
    for (final phone in phoneSizes.entries) {
      // Large text on the smallest phone, the dark theme on the largest.
      final small = phone.key == '360';
      final dark = phone.key == '430';
      testWidgets('${bar.key}, ${phone.key} px${small ? ', large text' : ''}${dark ? ', dark' : ''}: the menu on every page, above the phone’s bar', (
        tester,
      ) async {
        final server = FakeServer.standard();
        var demo = false;
        server.routes['GET /api/v1/deals/:slug'] = (_) => {
          'data': {...dealWithHours(openAllDay), 'isDemo': demo},
        };
        await pumpApp(tester, server: server, size: phone.value, textScale: small ? 1.3 : 1, theme: dark ? 'dark' : 'light');
        await phoneBar(tester, bar.value);
        expectMenuAboveBar(tester, bar.value, 'Home');
        expectButtonsReadable('Home', dark: dark);

        await push(tester, '/deals/osh');
        expectMenuAboveBar(tester, bar.value, 'deal');
        expectButtonsReadable('deal', dark: dark);
        // The book button sits right over the menu.
        final screen = tester.view.physicalSize.height / tester.view.devicePixelRatio;
        expect(tester.getRect(find.byType(FilledButton).last).bottom, lessThan(screen - bar.value));

        demo = true;
        await go(tester, '/');
        await push(tester, '/deals/somsa');
        expectMenuAboveBar(tester, bar.value, 'demo deal');
        expectButtonsReadable('demo deal', dark: dark);

        await go(tester, '/');
        await push(tester, '/businesses/kafe');
        expectMenuAboveBar(tester, bar.value, 'business');
        expectButtonsReadable('business', dark: dark);

        await go(tester, '/nowhere');
        expectMenuAboveBar(tester, bar.value, 'not found');
        expectButtonsReadable('not found', dark: dark);
      });
    }

    testWidgets('${bar.key}: a code, the counter and a business’s deals have the menu too', (tester) async {
      mockScanner(tester);
      final server = memberServer(() => [owner]);
      await pumpApp(tester, server: server, token: 't', size: phoneSizes['360']!, textScale: 1.3);
      await phoneBar(tester, bar.value);
      final code = (contract('my-codes') as List).first as Map<String, dynamic>;
      await push(tester, '/codes/${code['id']}');
      expectMenuAboveBar(tester, bar.value, 'code');
      expectButtonsReadable('code');
      await go(tester, '/');
      await push(tester, '/cashier?business=biz');
      expectMenuAboveBar(tester, bar.value, 'counter');
      expectButtonsReadable('counter');
      await go(tester, '/');
      await push(tester, '/business/biz/deals');
      expectMenuAboveBar(tester, bar.value, 'business deals');
      expectButtonsReadable('business deals');
      // «Yangi aksiya» stays above the menu.
      expect(tester.getRect(find.byType(FloatingActionButton)).bottom, lessThanOrEqualTo(tester.getRect(find.byType(TabBarIos)).top));
    });
  }

  testWidgets('a phone turned sideways: nothing under the buttons on one side or the camera cutout on the other', (tester) async {
    const cutout = 30.0, buttons = 48.0;
    await pumpApp(tester, server: FakeServer.standard(), size: const Size(780, 360));
    tester.view.padding = const FakeViewPadding(left: cutout * 3, right: buttons * 3);
    tester.view.viewPadding = const FakeViewPadding(left: cutout * 3, right: buttons * 3);
    await settle(tester);
    final width = tester.view.physicalSize.width / tester.view.devicePixelRatio;
    for (final page in ['Home', 'deal']) {
      if (page == 'deal') await push(tester, '/deals/osh');
      final menu = tester.getRect(find.byType(TabBarIos));
      expect(menu.left, closeTo(cutout, 0.5), reason: '$page: the menu starts after the cutout');
      expect(menu.right, closeTo(width - buttons, 0.5), reason: '$page: the menu ends at the buttons');
      for (final element in find.byType(Scaffold).evaluate()) {
        final rect = tester.getRect(find.byWidget(element.widget).first);
        expect(rect.left, greaterThanOrEqualTo(cutout - 0.5), reason: '$page: nothing under the cutout');
        expect(rect.right, lessThanOrEqualTo(width - buttons + 0.5), reason: '$page: nothing under the buttons');
      }
    }
  });

  testWidgets('a deal opened from Search keeps Search lit; another tab closes it and opens as it was left', (tester) async {
    await pumpApp(tester, server: FakeServer.standard());
    await tester.tap(find.text('Qidiruv'));
    await settle(tester);
    await push(tester, '/deals/osh');
    expect(find.byType(DealScreen), findsOneWidget);
    expect(tester.widget<TabBarIos>(find.byType(TabBarIos)).index, 1);

    await tester.tap(find.text('Saqlangan'));
    await settle(tester);
    expect(find.byType(DealScreen), findsNothing);
    expect(tester.widget<TabBarIos>(find.byType(TabBarIos)).index, 2);

    // Back to Search: the search is where it was, the deal is closed.
    await push(tester, '/deals/osh');
    await tester.tap(find.text('Qidiruv'));
    await settle(tester);
    expect(find.byType(DealScreen), findsNothing);
    expect(tester.widget<TabBarIos>(find.byType(TabBarIos)).index, 1);
  });
}
