import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

Map<String, dynamic> arb(String locale) => (jsonDecode(File('lib/l10n/app_$locale.arb').readAsStringSync()) as Map).cast<String, dynamic>();

Iterable<String> texts(Map<String, dynamic> file) => file.keys.where((key) => !key.startsWith('@'));

List<String> placeholders(String text) => RegExp(r'\{(\w+)\}').allMatches(text).map((match) => match.group(1)!).toSet().toList()..sort();

void main() {
  final uz = arb('uz');
  final ru = arb('ru');
  final en = arb('en');

  test('every language has every text', () {
    final keys = texts(uz).toSet();
    expect(keys.length, greaterThan(150));
    expect(texts(ru).toSet(), keys);
    expect(texts(en).toSet(), keys);
  });

  test('no empty texts and the same placeholders', () {
    for (final key in texts(uz)) {
      for (final (name, file) in [('uz', uz), ('ru', ru), ('en', en)]) {
        final text = file[key] as String;
        expect(text.trim(), isNotEmpty, reason: '$name.$key is empty');
        expect(placeholders(text), placeholders(uz[key] as String), reason: '$name.$key placeholders differ');
      }
    }
  });

  test('Uzbek uses ‘ and ’, never a plain apostrophe', () {
    for (final key in texts(uz)) {
      final text = uz[key] as String;
      expect(text.contains("'"), isFalse, reason: 'uz.$key: $text');
      expect(text.contains('`'), isFalse, reason: 'uz.$key: $text');
      // o‘ and g‘ take the turned comma (U+2018).
      expect(RegExp('[oOgG][’ʼ]').hasMatch(text), isFalse, reason: 'uz.$key should use o‘/g‘: $text');
    }
  });

  test('Russian texts are Cyrillic', () {
    for (final key in texts(ru)) {
      final text = (ru[key] as String).replaceAll(RegExp(r'\{\w+\}'), '');
      final latin = RegExp('[A-Za-z]{4,}').allMatches(text).map((match) => match.group(0)).toSet()
        ..removeAll(['BugunBor', 'Telegram', 'Instagram', 'Play', 'Oqtepa', 'Lavash', 'Korzinka']);
      expect(latin, isEmpty, reason: 'ru.$key: $text');
    }
  });
}
