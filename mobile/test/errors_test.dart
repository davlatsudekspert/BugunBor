// Errors read in the app's language: the server's own words in Uzbek and
// Russian, the app's English words in English.
import 'package:bugunbor/core/api_error.dart';
import 'package:bugunbor/design/widgets/common.dart';
import 'package:bugunbor/l10n/gen/app_localizations.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

Future<void> showError(WidgetTester tester, String locale, ApiError error) => tester.pumpWidget(
  MaterialApp(
    locale: Locale(locale),
    localizationsDelegates: L.localizationsDelegates,
    supportedLocales: L.supportedLocales,
    home: Builder(builder: (context) => Text(errorText(context, error))),
  ),
);

void main() {
  testWidgets('a server error in the app’s language', (tester) async {
    const soldOut = ApiError('SOLD_OUT', message: 'Afsuski, aksiya tugadi.', status: 409);
    await showError(tester, 'uz', soldOut);
    expect(find.text('Afsuski, aksiya tugadi.'), findsOneWidget);
    await showError(tester, 'en', soldOut);
    expect(find.text('Sorry, this deal is sold out.'), findsOneWidget);
    // A code the app has no English words for yet: the general text, never Uzbek.
    await showError(tester, 'en', const ApiError('SOMETHING_NEW', message: 'Yangi xato.'));
    expect(find.text('Yangi xato.'), findsNothing);
  });
}
