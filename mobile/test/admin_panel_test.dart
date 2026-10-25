import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'admin_test.dart' show adminServer;
import 'support/fakes.dart';

// The admin panel inside the app: the queue with decisions, and the people.

FakeServer panelServer() {
  final server = adminServer();
  var decided = false;
  server.routes['GET /api/v1/admin/queue'] = (_) => {
    'data': {
      'businesses': decided
          ? []
          : [
              {
                'id': 'newbiz',
                'name': 'Yangi kafe',
                'city': 'tashkent',
                'category': 'Taomlar',
                'description': 'Tekshiruvni kutyapti',
                'phone': '+998712000009',
                'ownerName': 'Stranger',
                'branches': 1,
                'createdAt': '2026-09-25 09:00:00',
                'autoNote': null,
              },
            ],
      'deals': [
        {
          'id': 'd1',
          'title': 'Osh',
          'business': 'Kafe',
          'description': 'Mazali',
          'terms': 'Zalda',
          'category': 'Taomlar',
          'price': 30000,
          'originalPrice': 50000,
          'discountPercent': 40,
          'endsAt': '2026-09-25 12:00:00',
          'photo': null,
          'submittedAt': null,
          'autoNote': 'rasm yo‘q',
        },
      ],
      'reports': [
        {
          'id': 'r1',
          'targetType': 'DEAL',
          'reason': 'WRONG_INFO',
          'comment': 'Narx boshqa',
          'title': 'Osh',
          'count': 2,
          'createdAt': '2026-09-25 10:00:00',
          'reporter': 'Alice',
          'held': false,
        },
      ],
      'messages': [
        {'id': 'm1', 'name': 'Ali', 'contact': '+998901112233', 'subject': 'Savol', 'message': 'Qanday qo‘shiladi?', 'createdAt': '2026-09-25 10:00:00'},
      ],
    },
  };
  server.routes['GET /api/v1/admin/users'] = (request) => {
    'data': '${request.queryParameters['q'] ?? ''}'.isEmpty
        ? []
        : [
            {
              'id': 'alice',
              'name': 'Alice Karimova',
              'phone': '+998901234567',
              'role': 'CUSTOMER',
              'status': 'ACTIVE',
              'createdAt': '2026-09-01 10:00:00',
              'lastLoginAt': '2026-09-25 09:00:00',
              'businesses': 0,
            },
          ],
  };
  server.routes['POST /api/v1/admin/actions'] = (request) {
    decided = true;
    return {
      'data': {'ok': true},
    };
  };
  return server;
}

Future<void> openPanel(WidgetTester tester, FakeServer server) async {
  await pumpApp(tester, server: server, token: 't');
  await tester.tap(find.text('Profil'));
  await settle(tester);
  await tester.scrollUntilVisible(find.text('Admin panelni ochish').hitTestable(), 300, scrollable: find.byType(Scrollable).first);
  await tester.tap(find.text('Admin panelni ochish'));
  await settle(tester);
}

void main() {
  testWidgets('the queue shows what waits; approving a business sends the decision and refreshes', (tester) async {
    final server = panelServer();
    await openPanel(tester, server);
    expect(find.text('Yangi kafe'), findsOneWidget);
    expect(find.text('Taomlar · tashkent · 1 ta filial'), findsOneWidget);
    expect(find.text('Osh'), findsOneWidget);
    expect(find.text('Avto-tekshiruv: rasm yo‘q'), findsOneWidget);
    await tester.tap(find.text('Tasdiqlash').first);
    await settle(tester);
    final action = server.requests.where((request) => request.path == '/api/v1/admin/actions').single.data as Map;
    expect(action, {'type': 'business.decide', 'businessId': 'newbiz', 'decision': 'APPROVE'});
    expect(find.text('Bajarildi'), findsOneWidget);
    expect(find.text('Yangi kafe'), findsNothing);
  });

  testWidgets('rejecting asks for a reason and sends it', (tester) async {
    final server = panelServer();
    await openPanel(tester, server);
    await tester.tap(find.text('Rad etish').first);
    await settle(tester);
    await tester.enterText(find.byType(TextField).last, 'Manzil noto‘g‘ri');
    await tester.tap(find.widgetWithText(FilledButton, 'Rad etish'));
    await settle(tester);
    final action = server.requests.where((request) => request.path == '/api/v1/admin/actions').single.data as Map;
    expect(action, {'type': 'business.decide', 'businessId': 'newbiz', 'decision': 'REJECT', 'reason': 'Manzil noto‘g‘ri'});
  });

  testWidgets('reports and messages are closed from their tabs', (tester) async {
    final server = panelServer();
    await openPanel(tester, server);
    await tester.tap(find.text('Shikoyatlar'));
    await settle(tester);
    expect(find.text('Narx boshqa'), findsOneWidget);
    expect(find.text('WRONG_INFO · 2 kishi shikoyat qildi · 25.09 15:00'), findsOneWidget);
    await tester.tap(find.text('Hal qilindi'));
    await settle(tester);
    await tester.tap(find.text('Murojaatlar'));
    await settle(tester);
    expect(find.text('Savol'), findsOneWidget);
    await tester.tap(find.text('O‘qildi'));
    await settle(tester);
    final actions = server.requests.where((request) => request.path == '/api/v1/admin/actions').map((request) => request.data as Map).toList();
    expect(actions, [
      {'type': 'report.resolve', 'reportId': 'r1', 'status': 'RESOLVED'},
      {'type': 'message.status', 'messageId': 'm1', 'status': 'READ'},
    ]);
  });

  testWidgets('people: search, then block after a confirmation', (tester) async {
    final server = panelServer();
    await openPanel(tester, server);
    await tester.tap(find.text('Odamlar'));
    await settle(tester);
    expect(find.text('Hozircha bo‘sh'), findsOneWidget);
    await tester.enterText(find.byType(TextField), 'Alice');
    await tester.testTextInput.receiveAction(TextInputAction.search);
    await settle(tester);
    expect(find.text('Alice Karimova'), findsOneWidget);
    await tester.tap(find.text('To‘xtatish'));
    await settle(tester);
    expect(find.textContaining('Alice Karimova to‘xtatilsinmi?'), findsOneWidget);
    await tester.tap(find.widgetWithText(TextButton, 'To‘xtatish'));
    await settle(tester);
    final action = server.requests.where((request) => request.path == '/api/v1/admin/actions').single.data as Map;
    expect(action, {'type': 'user.update', 'userId': 'alice', 'status': 'BLOCKED'});
  });
}
