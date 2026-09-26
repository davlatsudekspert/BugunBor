import 'dart:math';

import '../../data/models.dart';

// The business registration form, checked the same way the server checks it
// (modules/businesses/schema.ts), so most mistakes are shown before sending.

/// "+998 90 123 45 67", "90 123 45 67" or "00998…" → "+998901234567";
/// null when it is not an Uzbek number.
String? normalizeUzPhone(String input) {
  var digits = input.replaceAll(RegExp(r'\D'), '');
  if (digits.startsWith('00')) digits = digits.substring(2);
  if (digits.length == 9) digits = '998$digits';
  return RegExp(r'^998\d{9}$').hasMatch(digits) ? '+$digits' : null;
}

/// "@name", "https://t.me/name/" or "instagram.com/name" → "name".
String cleanHandle(String input) => input
    .trim()
    .replaceFirst(RegExp(r'^https?://(www\.)?(t\.me|instagram\.com)/', caseSensitive: false), '')
    .replaceFirst(RegExp(r'^@'), '')
    .replaceFirst(RegExp(r'/+$'), '');

final _telegramHandle = RegExp(r'^[A-Za-z0-9_]{4,32}$');
final _instagramHandle = RegExp(r'^[A-Za-z0-9._]{1,30}$');
final _time = RegExp(r'^([01]\d|2[0-3]):[0-5]\d$');

bool isWebsite(String value) {
  final uri = Uri.tryParse(value.trim());
  return uri != null && (uri.scheme == 'http' || uri.scheme == 'https') && uri.host.isNotEmpty;
}

/// The city whose centre is closest to a point.
City? nearestCity(List<City> cities, double latitude, double longitude) {
  City? best;
  var bestDistance = double.infinity;
  for (final city in cities) {
    final dLat = (city.latitude - latitude) * pi / 180;
    final dLng = (city.longitude - longitude) * pi / 180;
    final a = sin(dLat / 2) * sin(dLat / 2) + cos(latitude * pi / 180) * cos(city.latitude * pi / 180) * sin(dLng / 2) * sin(dLng / 2);
    final distance = 2 * atan2(sqrt(a), sqrt(1 - a));
    if (distance < bestDistance) {
      bestDistance = distance;
      best = city;
    }
  }
  return best;
}

class BusinessDraft {
  BusinessDraft({
    this.name = '',
    this.description = '',
    this.categoryId,
    this.city,
    this.phone = '',
    this.address = '',
    this.open = '09:00',
    this.close = '21:00',
    this.telegram = '',
    this.instagram = '',
    this.website = '',
    this.latitude,
    this.longitude,
  });

  final String name;
  final String description;
  final String? categoryId;
  final String? city;
  final String phone;
  final String address;
  final String open;
  final String close;
  final String telegram;
  final String instagram;
  final String website;
  final double? latitude;
  final double? longitude;

  static const descriptionMin = 20;
  static const descriptionMax = 1200;

  /// Field → problem (tooShort, tooLong, invalid, phone, time, choose);
  /// empty when the form can be sent. Keys match the server's field names.
  Map<String, String> problems() {
    final problems = <String, String>{};
    void length(String field, String value, int min, int max) {
      final length = value.trim().length;
      if (length < min) {
        problems[field] = 'tooShort';
      } else if (length > max) {
        problems[field] = 'tooLong';
      }
    }

    length('name', name, 2, 80);
    if (categoryId == null || categoryId!.isEmpty) problems['categoryId'] = 'choose';
    if (city == null || city!.isEmpty) problems['city'] = 'choose';
    if (normalizeUzPhone(phone) == null) problems['phone'] = 'phone';
    length('address', address, 5, 240);
    if (!_time.hasMatch(open)) problems['open'] = 'time';
    if (!_time.hasMatch(close)) problems['close'] = 'time';
    length('description', description, descriptionMin, descriptionMax);
    final handle = cleanHandle(telegram);
    if (handle.isNotEmpty && !_telegramHandle.hasMatch(handle)) problems['telegram'] = 'invalid';
    final insta = cleanHandle(instagram);
    if (insta.isNotEmpty && !_instagramHandle.hasMatch(insta)) problems['instagram'] = 'invalid';
    if (website.trim().length > 200) {
      problems['website'] = 'tooLong';
    } else if (website.trim().isNotEmpty && !isWebsite(website)) {
      problems['website'] = 'invalid';
    }
    return problems;
  }

  /// What POST /api/v1/businesses takes (call after [problems] is empty).
  Map<String, Object?> toJson() => {
    'name': name.trim(),
    'description': description.trim(),
    'categoryId': categoryId,
    'city': city,
    'phone': normalizeUzPhone(phone) ?? phone.trim(),
    'address': address.trim(),
    'open': open,
    'close': close,
    'telegram': cleanHandle(telegram).isEmpty ? null : cleanHandle(telegram),
    'instagram': cleanHandle(instagram).isEmpty ? null : cleanHandle(instagram),
    'website': website.trim().isEmpty ? null : website.trim(),
    'latitude': latitude,
    'longitude': longitude,
  };
}
