// The registration form checks what the server checks
// (modules/businesses/schema.ts), so mistakes show before sending.
import 'package:bugunbor/data/models.dart';
import 'package:bugunbor/features/join/business_draft.dart';
import 'package:bugunbor/features/join/join_screen.dart';
import 'package:bugunbor/l10n/gen/app_localizations.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';

import 'support/fakes.dart';

BusinessDraft valid({
  String name = 'Alisa Nonvoyxonasi',
  String phone = '+998 90 123 45 67',
  String telegram = '',
  String instagram = '',
  String website = '',
}) => BusinessDraft(
  name: name,
  description: 'Har kuni yangi non va samimiy xizmat.',
  categoryId: 'cat_food',
  city: 'tashkent',
  phone: phone,
  address: 'Chilonzor 9-kvartal, 12-uy',
  telegram: telegram,
  instagram: instagram,
  website: website,
);

void main() {
  test('Uzbek phone numbers in any usual form', () {
    expect(normalizeUzPhone('+998 90 123 45 67'), '+998901234567');
    expect(normalizeUzPhone('90 123-45-67'), '+998901234567');
    expect(normalizeUzPhone('00998901234567'), '+998901234567');
    expect(normalizeUzPhone('998901234567'), '+998901234567');
    expect(normalizeUzPhone('+7 901 234 56 78'), isNull);
    expect(normalizeUzPhone('12345'), isNull);
  });

  test('handles and websites', () {
    expect(cleanHandle('@kafe_uz'), 'kafe_uz');
    expect(cleanHandle('https://t.me/kafe_uz/'), 'kafe_uz');
    expect(cleanHandle('https://www.instagram.com/kafe.uz'), 'kafe.uz');
    expect(isWebsite('https://kafe.uz'), isTrue);
    expect(isWebsite('kafe.uz'), isFalse);
    expect(isWebsite('ftp://kafe.uz'), isFalse);
  });

  test('the nearest city to a point', () {
    final cities = AppConfig.fromJson(contractMap('config')).cities;
    expect(nearestCity(cities, 41.30, 69.24)?.slug, 'tashkent');
    expect(nearestCity(cities, 39.65, 66.96)?.slug, 'samarkand');
    expect(nearestCity(const [], 41.3, 69.2), isNull);
  });

  test('an empty form lists every required field', () {
    expect(BusinessDraft().problems(), {
      'name': 'tooShort',
      'categoryId': 'choose',
      'city': 'choose',
      'phone': 'phone',
      'address': 'tooShort',
      'description': 'tooShort',
    });
    expect(valid().problems(), isEmpty);
  });

  test('limits and formats match the server', () {
    expect(valid(name: 'A').problems(), {'name': 'tooShort'});
    expect(valid(name: 'A' * 81).problems(), {'name': 'tooLong'});
    expect(valid(phone: '12345').problems(), {'phone': 'phone'});
    expect(valid(telegram: '@abc').problems(), {'telegram': 'invalid'});
    expect(valid(telegram: 't.me/kafe-uz').problems(), {'telegram': 'invalid'});
    expect(valid(telegram: 'https://t.me/kafe_uz').problems(), isEmpty);
    expect(valid(instagram: 'kafe uz').problems(), {'instagram': 'invalid'});
    expect(valid(website: 'kafe.uz').problems(), {'website': 'invalid'});
    expect(valid(website: 'https://${'a' * 200}.uz').problems(), {'website': 'tooLong'});
    expect(BusinessDraft(open: '9:00').problems()['open'], 'time');
    expect(BusinessDraft(close: '24:00').problems()['close'], 'time');
  });

  test('what is sent: trimmed, normalized, empty extras as null', () {
    final json = BusinessDraft(
      name: '  Alisa  ',
      description: 'Har kuni yangi non va samimiy xizmat. ',
      categoryId: 'cat_food',
      city: 'tashkent',
      phone: '90 123 45 67',
      address: 'Chilonzor 9-kvartal',
      telegram: '@alisa_non',
      latitude: 41.3,
      longitude: 69.2,
    ).toJson();
    expect(json, {
      'name': 'Alisa',
      'description': 'Har kuni yangi non va samimiy xizmat.',
      'categoryId': 'cat_food',
      'city': 'tashkent',
      'phone': '+998901234567',
      'address': 'Chilonzor 9-kvartal',
      'open': '09:00',
      'close': '21:00',
      'telegram': 'alisa_non',
      'instagram': null,
      'website': null,
      'latitude': 41.3,
      'longitude': 69.2,
    });
  });

  test('sample descriptions per category, in every language', () async {
    for (final locale in ['uz', 'ru', 'en']) {
      final l = await L.delegate.load(Locale(locale));
      for (final slug in ['taomlar', 'kofe', 'xaridlar', 'gozallik', 'sport', 'kongilochar', 'xizmatlar', 'yetkazish', 'boshqa']) {
        final text = descriptionTemplate(l, slug, 'Alisa');
        expect(text, startsWith('Alisa — '), reason: '$locale/$slug');
        expect(text.length, greaterThanOrEqualTo(BusinessDraft.descriptionMin), reason: '$locale/$slug');
      }
    }
  });
}
