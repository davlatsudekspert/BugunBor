// A person's own profile photo in the app: added from the gallery (made small
// on the phone), shown on Profile, loaded with their token, and removed.
import 'dart:convert';
import 'dart:typed_data';

import 'package:bugunbor/features/deals/photo.dart';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'support/fakes.dart';

final png = base64Decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==');

void main() {
  test('the upload answer is read as the server pins it', () {
    expect(contractMap('me-avatar')['avatar'], startsWith('/api/v1/me/avatar?v='));
    expect(contractMap('me')['user'], containsPair('avatar', null));
  });

  testWidgets('a profile photo is added from the gallery, shown with the token, and removed', (tester) async {
    final semantics = tester.ensureSemantics();
    String? avatar;
    final server = FakeServer.standard();
    final me = contractMap('me');
    server.routes['GET /api/v1/me'] = (_) => {
      'data': {
        ...me,
        'user': {...(me['user'] as Map).cast<String, dynamic>(), 'avatar': avatar},
      },
    };
    server.routes['POST /api/v1/me/avatar'] = (_) {
      avatar = '/api/v1/me/avatar?v=1a2b3c4d5e6f7a8b';
      return Reply(201, {
        'data': {'avatar': avatar},
      });
    };
    server.routes['DELETE /api/v1/me/avatar'] = (_) {
      avatar = null;
      return {
        'data': {'ok': true},
      };
    };
    server.routes['GET /api/v1/me/avatar'] = (_) => Bytes(png);
    final asked = <PhotoUse>[];
    await pumpApp(
      tester,
      server: server,
      token: 't',
      picker: ({required camera, use = PhotoUse.deal}) async {
        asked.add(use);
        return Uint8List.fromList(png);
      },
    );
    await tester.tap(find.text('Profil'));
    await settle(tester);
    CircleAvatar photo() => tester.widget<CircleAvatar>(find.descendant(of: find.byType(InkWell), matching: find.byType(CircleAvatar)).first);
    expect(photo().foregroundImage, isNull);
    await checkTapTargets(tester);

    await tester.tap(find.bySemanticsLabel('Rasm qo‘yish'));
    await settle(tester);
    expect(find.text('Rasm faqat sizga ko‘rinadi.'), findsOneWidget);
    expect(find.text('Rasmni olib tashlash'), findsNothing);
    await tester.tap(find.text('Galereya'));
    await settle(tester);

    expect(asked, [PhotoUse.avatar]);
    final upload = server.requests.lastWhere((request) => request.method == 'POST' && request.path == '/api/v1/me/avatar');
    expect((upload.data as FormData).files.single.key, 'file');
    expect(photo().foregroundImage, isA<MemoryImage>());
    final load = server.requests.lastWhere((request) => request.method == 'GET' && request.path.startsWith('/api/v1/me/avatar'));
    expect(load.path, '/api/v1/me/avatar?v=1a2b3c4d5e6f7a8b');
    expect(load.headers['authorization'], 'Bearer t');

    await tester.tap(find.bySemanticsLabel('Rasmni almashtirish'));
    await settle(tester);
    await tester.tap(find.text('Rasmni olib tashlash'));
    await settle(tester);
    expect(server.requests.where((request) => request.method == 'DELETE' && request.path == '/api/v1/me/avatar'), hasLength(1));
    expect(photo().foregroundImage, isNull);
    semantics.dispose();
  });
}
