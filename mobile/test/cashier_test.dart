// The counter: a scanned QR (or a typed code) shows what the booking is for,
// the cashier confirms it, and the next customer's scan starts cleanly —
// the camera is started by the scanner alone, never twice at once.
import 'package:bugunbor/app/router.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

import 'support/fakes.dart';

const scannerMethods = MethodChannel('dev.steenbakker.mobile_scanner/scanner/method');
const scannerStreams = [
  MethodChannel('dev.steenbakker.mobile_scanner/scanner/event'),
  MethodChannel('dev.steenbakker.mobile_scanner/scanner/deviceOrientation'),
];

/// What an Android camera answers once it has started.
const cameraStarted = {
  'textureId': 1,
  'cameraDirection': 1,
  'handlesCropAndRotation': true,
  'naturalDeviceOrientation': 'PORTRAIT_UP',
  'sensorOrientation': 90,
  'numberOfCameras': 1,
  'currentTorchState': -1,
  'size': {'width': 1920.0, 'height': 1080.0},
};

void main() {
  testWidgets('a scanned code is confirmed, and the next scan starts without a clash', (tester) async {
    // A camera that takes a moment to start, as real ones do.
    final started = <String>[];
    final messenger = tester.binding.defaultBinaryMessenger;
    messenger.setMockMethodCallHandler(scannerMethods, (call) {
      if (call.method == 'state') return Future.value(1);
      if (call.method == 'start') {
        started.add('start');
        return Future.delayed(const Duration(milliseconds: 150), () => cameraStarted);
      }
      return Future.value();
    });
    for (final channel in scannerStreams) {
      messenger.setMockMethodCallHandler(channel, (_) async => null);
    }
    addTearDown(() {
      for (final channel in [scannerMethods, ...scannerStreams]) {
        messenger.setMockMethodCallHandler(channel, null);
      }
    });

    final server = memberServer(() => [owner]);
    final actions = server.routes['POST /api/v1/business/:id']!;
    final sent = <Map<String, dynamic>>[];
    server.routes['POST /api/v1/business/:id'] = (request) {
      final body = (request.data as Map).cast<String, dynamic>();
      sent.add(body);
      return switch (body['type']) {
        'redeem.lookup' => {
          'data': {
            'id': 'r1',
            'dealTitle': 'Osh',
            'price': 30000,
            'branchName': 'Markaz',
            'customerName': 'Alice Karimova',
            'customerPhone': '+998 90 *** ** 67',
          },
        },
        'redeem.complete' => {
          'data': {'ok': true},
        },
        _ => actions(request),
      };
    };
    await pumpApp(tester, server: server, token: 't');
    ProviderScope.containerOf(tester.element(find.byType(MaterialApp))).read(routerProvider).go('/cashier?business=biz');
    await settle(tester);
    expect(find.text('Mijozning QR-kodini ramkaga to‘g‘rilang'), findsOneWidget);

    // The camera reads the customer's QR: a link to the code.
    tester.widget<MobileScanner>(find.byType(MobileScanner)).onDetect!(BarcodeCapture(barcodes: [const Barcode(rawValue: 'https://bugunbor.uz/r/3AKBWA')]));
    await settle(tester);
    expect(sent.last, {'type': 'redeem.lookup', 'code': '3AKBWA'});
    expect(find.text('Kod haqiqiy'), findsOneWidget);
    // The number stays masked.
    expect(find.textContaining('+998 90 *** ** 67'), findsOneWidget);

    await tester.tap(find.text('Tasdiqlash — kod ishlatildi'));
    await settle(tester);
    expect(sent.last, {'type': 'redeem.complete', 'redemptionId': 'r1'});
    expect(find.text('Kod ishlatildi'), findsOneWidget);

    final before = started.length;
    await tester.tap(find.text('Keyingi mijoz'));
    await settle(tester);
    expect(tester.takeException(), isNull);
    expect(find.byType(MobileScanner), findsOneWidget);
    // Started once by the scanner coming back, not a second time on top.
    expect(started.length - before, 1);

    // Typed by hand, the code is checked the same way.
    await tester.enterText(find.byType(TextField), 'k7p-2qx');
    await tester.tap(find.text('Tekshirish'));
    await settle(tester);
    expect(sent.last, {'type': 'redeem.lookup', 'code': 'K7P2QX'});
  });
}
