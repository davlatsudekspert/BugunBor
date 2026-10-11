// Sign in with Apple: on iPhone only, next to Telegram, behind the same
// consent box, and into the same signed-in state.
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sign_in_with_apple/sign_in_with_apple.dart';

import 'support/fakes.dart';

const credential = AuthorizationCredentialAppleID(
  userIdentifier: '001234.abcd',
  givenName: 'Alice',
  familyName: 'Karimova',
  authorizationCode: 'code-1',
  email: null,
  identityToken: 'identity-jwt',
  state: null,
);

/// The server's answer to a good Apple identity token.
FakeServer appleServer() {
  final server = signedInServer();
  server.routes['POST /api/v1/auth/apple'] = (_) => {
    'data': {'token': contractMap('login-status')['token'], 'expiresAt': '2026-10-25T10:00:00.000Z'},
  };
  return server;
}

/// A guest opens the sign-in screen from the profile tab.
Future<void> openLogin(WidgetTester tester) async {
  await tester.tap(find.text('Profil'));
  await settle(tester);
  await tester.tap(find.text('Telegram orqali kirish'));
  await settle(tester);
}

Future<void> tickConsent(WidgetTester tester) async {
  await tester.tap(find.byType(Checkbox));
  await tester.pump();
}

Iterable<RequestOptions> appleRequests(FakeServer server) => server.requests.where((request) => request.path == '/api/v1/auth/apple');

void main() {
  testWidgets('iPhone: the Apple button sits under Telegram, black on the light theme and white on the dark one', (tester) async {
    await pumpApp(tester, server: FakeServer.standard());
    await openLogin(tester);
    expect(find.text('Apple orqali kirish'), findsOneWidget);
    expect(
      tester.getTopLeft(find.byType(SignInWithAppleButton)).dy,
      greaterThan(tester.getBottomLeft(find.widgetWithText(FilledButton, 'Telegram orqali kirish')).dy),
    );
    expect(tester.widget<SignInWithAppleButton>(find.byType(SignInWithAppleButton)).style, SignInWithAppleButtonStyle.black);
    expect(tester.getSize(find.byType(SignInWithAppleButton)).height, greaterThanOrEqualTo(48));

    await tester.pumpWidget(const SizedBox());
    await pumpApp(tester, server: FakeServer.standard(), theme: 'dark');
    await openLogin(tester);
    expect(tester.widget<SignInWithAppleButton>(find.byType(SignInWithAppleButton)).style, SignInWithAppleButtonStyle.white);
  }, variant: TargetPlatformVariant.only(TargetPlatform.iOS));

  testWidgets('iPhone: with consent, Apple signs the person in like Telegram does', (tester) async {
    final server = appleServer();
    var asked = 0;
    await pumpApp(
      tester,
      server: server,
      apple: () async {
        asked++;
        return credential;
      },
    );
    await openLogin(tester);
    await tickConsent(tester);
    await tester.tap(find.text('Apple orqali kirish'));
    await settle(tester);
    expect(asked, 1);
    final request = appleRequests(server).single;
    expect(request.headers.containsKey('authorization'), isFalse);
    expect(request.data, {'identityToken': 'identity-jwt', 'authorizationCode': 'code-1', 'givenName': 'Alice', 'familyName': 'Karimova', 'consent': true});
    // Back on the profile, signed in; the token from the server is what the app now sends.
    expect(find.text('Kirdingiz!'), findsOneWidget);
    expect(find.text('Alice Karimova'), findsOneWidget);
    final token = (contractMap('login-status')['token'] as String);
    expect(server.requests.last.headers['authorization'], 'Bearer $token');
  }, variant: TargetPlatformVariant.only(TargetPlatform.iOS));

  testWidgets('iPhone: without consent Apple is not even asked', (tester) async {
    final server = appleServer();
    var asked = 0;
    await pumpApp(
      tester,
      server: server,
      apple: () async {
        asked++;
        return credential;
      },
    );
    await openLogin(tester);
    await tester.tap(find.text('Apple orqali kirish'));
    await settle(tester);
    expect(find.text('Kirish uchun avval rozilik belgisini qo‘ying.'), findsOneWidget);
    expect(asked, 0);
    expect(appleRequests(server), isEmpty);
    expect(find.text('Kirdingiz!'), findsNothing);
  }, variant: TargetPlatformVariant.only(TargetPlatform.iOS));

  testWidgets('iPhone: closing Apple’s sheet changes nothing and says nothing', (tester) async {
    final server = appleServer();
    await pumpApp(tester, server: server, apple: () async => null);
    await openLogin(tester);
    await tickConsent(tester);
    await tester.tap(find.text('Apple orqali kirish'));
    await settle(tester);
    expect(appleRequests(server), isEmpty);
    expect(find.text('Kirdingiz!'), findsNothing);
    expect(find.text('Nimadir xato ketdi. Qayta urinib ko‘ring.'), findsNothing);
    // Still there to try again.
    expect(tester.widget<SignInWithAppleButton>(find.byType(SignInWithAppleButton)).onPressed, isNotNull);
  }, variant: TargetPlatformVariant.only(TargetPlatform.iOS));

  testWidgets('iPhone: a rejected Apple token shows the server’s words and stays signed out', (tester) async {
    final server = appleServer();
    server.routes['POST /api/v1/auth/apple'] = (_) => const Reply(401, {
      'error': {'code': 'APPLE_TOKEN_INVALID', 'message': 'Apple orqali kirib bo‘lmadi.'},
    });
    await pumpApp(tester, server: server, apple: () async => credential);
    await openLogin(tester);
    await tickConsent(tester);
    await tester.tap(find.text('Apple orqali kirish'));
    await settle(tester);
    expect(find.text('Apple orqali kirib bo‘lmadi.'), findsOneWidget);
    expect(find.text('Kirdingiz!'), findsNothing);
    expect(find.byType(Checkbox), findsOneWidget);
  }, variant: TargetPlatformVariant.only(TargetPlatform.iOS));

  testWidgets('iPhone: a sheet that fails shows the general error, and no token means no request', (tester) async {
    final server = appleServer();
    var fail = true;
    await pumpApp(
      tester,
      server: server,
      apple: () async {
        if (fail) throw const SignInWithAppleAuthorizationException(code: AuthorizationErrorCode.failed, message: 'failed');
        return const AuthorizationCredentialAppleID(
          userIdentifier: null,
          givenName: null,
          familyName: null,
          authorizationCode: 'code-2',
          email: null,
          identityToken: null,
          state: null,
        );
      },
    );
    await openLogin(tester);
    await tickConsent(tester);
    await tester.tap(find.text('Apple orqali kirish'));
    await settle(tester);
    expect(find.text('Nimadir xato ketdi. Qayta urinib ko‘ring.'), findsOneWidget);
    fail = false;
    await tester.tap(find.text('Apple orqali kirish'));
    await settle(tester);
    expect(find.text('Nimadir xato ketdi. Qayta urinib ko‘ring.'), findsOneWidget);
    expect(appleRequests(server), isEmpty);
  }, variant: TargetPlatformVariant.only(TargetPlatform.iOS));

  testWidgets('Android: no Apple button, only Telegram', (tester) async {
    await pumpApp(tester, server: FakeServer.standard());
    await openLogin(tester);
    expect(find.text('Telegram orqali kirish'), findsOneWidget);
    expect(find.byType(SignInWithAppleButton), findsNothing);
    expect(find.text('Apple orqali kirish'), findsNothing);
  }, variant: TargetPlatformVariant.only(TargetPlatform.android));
}
