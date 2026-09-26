import '../../core/time.dart';
import '../../data/models.dart';

// The deal form, checked the way the server checks it
// (modules/deals/schema.ts), so most mistakes show before sending.

/// A Tashkent wall-clock time (its fields read as in Tashkent) in the form
/// the server takes: `2026-09-25T15:00`.
String tashkentInput(DateTime wall) {
  String two(int value) => value.toString().padLeft(2, '0');
  return '${wall.year}-${two(wall.month)}-${two(wall.day)}T${two(wall.hour)}:${two(wall.minute)}';
}

/// `2026-09-25T15:00` → a wall-clock time; null when it is not a real date.
DateTime? parseTashkentInput(String value) {
  final match = RegExp(r'^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$').firstMatch(value.trim());
  if (match == null) return null;
  final parts = [for (var group = 1; group <= 5; group++) int.parse(match.group(group)!)];
  final date = DateTime.utc(parts[0], parts[1], parts[2], parts[3], parts[4]);
  final same = date.year == parts[0] && date.month == parts[1] && date.day == parts[2] && date.hour == parts[3] && date.minute == parts[4];
  return same ? date : null;
}

/// Now on Tashkent clocks, rounded down to five minutes.
DateTime tashkentNow([DateTime? utcNow]) {
  final now = toTashkent(utcNow ?? DateTime.now().toUtc());
  return DateTime.utc(now.year, now.month, now.day, now.hour, now.minute - now.minute % 5);
}

/// "25.09 15:00" (with the year when it is not this year's).
String wallLabel(DateTime wall, {DateTime? now}) {
  String two(int value) => value.toString().padLeft(2, '0');
  final year = (now ?? tashkentNow()).year == wall.year ? '' : '.${wall.year}';
  return '${two(wall.day)}.${two(wall.month)}$year ${two(wall.hour)}:${two(wall.minute)}';
}

/// The server's rounding (Math.round of the percentage).
int discountPercent(int original, int price) => original <= 0 ? 0 : (((original - price) / original) * 100).round();

/// "20 000" or "20000" → 20000; null when there are no digits.
int? parseAmount(String text) {
  final digits = text.replaceAll(RegExp(r'\D'), '');
  return digits.isEmpty || digits.length > 12 ? null : int.parse(digits);
}

class DealDraft {
  DealDraft({
    this.title = '',
    this.description = '',
    this.terms = '',
    this.categoryId,
    this.visual,
    this.originalPrice = '',
    this.price = '',
    required this.startsAt,
    required this.endsAt,
    this.quantity = '20',
    this.unlimited = false,
    this.perCustomerLimit = 1,
    this.claimTtlMinutes = 120,
    this.branchIds = const [],
    this.photoId,
  });

  final String title;
  final String description;
  final String terms;
  final String? categoryId;
  final String? visual;
  final String originalPrice;
  final String price;
  final DateTime startsAt;
  final DateTime endsAt;
  final String quantity;
  final bool unlimited;
  final int perCustomerLimit;
  final int claimTtlMinutes;
  final List<String> branchIds;
  final String? photoId;

  static const minOriginalPrice = 1000;
  static const maxPrice = 100000000;

  /// Field → problem (tooShort, tooLong, choose, minAmount, invalid,
  /// priceOrder, minDiscount, endAfterStart, duration, endInPast,
  /// branchesRequired); empty when it can be sent. [now] is Tashkent wall
  /// time; a deal sent for review must not have ended already.
  Map<String, String> problems(DealRules rules, {required DateTime now, required bool submit}) {
    final problems = <String, String>{};
    void length(String field, String value, int min, int max) {
      final length = value.trim().length;
      if (length < min) {
        problems[field] = 'tooShort';
      } else if (length > max) {
        problems[field] = 'tooLong';
      }
    }

    length('title', title, 5, 90);
    length('description', description, 20, 600);
    length('terms', terms, 5, 600);
    if (categoryId == null || categoryId!.isEmpty) problems['categoryId'] = 'choose';
    if (visual == null || visual!.isEmpty) problems['visual'] = 'choose';
    final original = parseAmount(originalPrice);
    final deal = parseAmount(price);
    if (original == null || original < minOriginalPrice || original > maxPrice) problems['originalPrice'] = 'minAmount';
    if (deal == null || deal > maxPrice) {
      problems['price'] = 'invalid';
    } else if (original != null && !problems.containsKey('originalPrice')) {
      if (deal >= original) {
        problems['price'] = 'priceOrder';
      } else if (discountPercent(original, deal) < rules.minDiscountPercent) {
        problems['price'] = 'minDiscount';
      }
    }
    final minutes = endsAt.difference(startsAt).inMinutes;
    if (minutes <= 0) {
      problems['endsAt'] = 'endAfterStart';
    } else if (minutes < rules.minDurationMinutes || minutes > rules.maxDurationDays * 1440) {
      problems['endsAt'] = 'duration';
    } else if (submit && !endsAt.isAfter(now)) {
      problems['endsAt'] = 'endInPast';
    }
    if (!unlimited) {
      final count = parseAmount(quantity);
      if (count == null || count < 1 || count > rules.maxQuantity) problems['quantity'] = 'invalid';
    }
    if (perCustomerLimit < 1 || perCustomerLimit > rules.maxPerCustomer) problems['perCustomerLimit'] = 'invalid';
    if (!rules.claimTtlOptions.contains(claimTtlMinutes)) problems['claimTtlMinutes'] = 'invalid';
    if (branchIds.isEmpty) problems['branchIds'] = 'branchesRequired';
    return problems;
  }

  /// The `input` of deal.create / deal.update (call after [problems] is empty).
  Map<String, Object?> toJson() => {
    'title': title.trim(),
    'description': description.trim(),
    'terms': terms.trim(),
    'categoryId': categoryId,
    'visual': visual,
    'originalPrice': parseAmount(originalPrice),
    'price': parseAmount(price),
    'startsAt': tashkentInput(startsAt),
    'endsAt': tashkentInput(endsAt),
    'quantity': unlimited ? null : parseAmount(quantity),
    'perCustomerLimit': perCustomerLimit,
    'claimTtlMinutes': claimTtlMinutes,
    'branchIds': branchIds,
    'photoId': photoId,
  };
}
