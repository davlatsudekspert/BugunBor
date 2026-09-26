import 'package:bugunbor/app/links.dart';
import 'package:bugunbor/core/format.dart';
import 'package:bugunbor/core/media.dart';
import 'package:bugunbor/core/time.dart';
import 'package:bugunbor/features/cashier/cashier_screen.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  // Groups are split by a no-break space, so a price never wraps mid-number.
  test('money and distances read like the site', () {
    expect(groupDigits(0), '0');
    expect(groupDigits(950), '950');
    expect(groupDigits(30000), '30\u00A0000');
    expect(groupDigits(1234567), '1\u00A0234\u00A0567');
    expect(formatDistance(0.012), (value: '50', meters: true));
    expect(formatDistance(0.46), (value: '450', meters: true));
    expect(formatDistance(1.476), (value: '1,5', meters: false));
    expect(formatDistance(12.4), (value: '12', meters: false));
  });

  test('codes, phones and clocks', () {
    expect(formatCode('K7P2QX'), 'K7P 2QX');
    expect(formatPhone('+998901234567'), '+998 90 123 45 67');
    expect(formatPhone('998901234567'), '+998 90 123 45 67');
    expect(formatClock(const Duration(hours: 26, minutes: 4, seconds: 5)), '2:04:05');
    expect(formatClock(const Duration(seconds: -3)), '0:00:00');
  });

  test('server times are UTC; Tashkent is UTC+5', () {
    expect(parseServerTime('2026-09-25 09:00:00'), DateTime.utc(2026, 9, 25, 9));
    expect(parseServerTime('2026-09-25T10:10:00.000Z'), DateTime.utc(2026, 9, 25, 10, 10));
    expect(toTashkent(DateTime.utc(2026, 9, 25, 20)).hour, 1);
    expect(parseServerTimeOrNull(null), isNull);
  });

  test('images become absolute URLs; stock photos use the small copy', () {
    expect(mediaUrl(null), isNull);
    expect(mediaUrl('/media/a.webp', base: 'https://x.uz'), 'https://x.uz/media/a.webp');
    expect(mediaUrl('media/a.webp', base: 'https://x.uz'), 'https://x.uz/media/a.webp');
    expect(mediaUrl('https://cdn.uz/a.webp'), 'https://cdn.uz/a.webp');
    expect(thumbnailUrl('/photos/osh.webp', base: 'https://x.uz'), 'https://x.uz/photos/osh.sm.webp');
    expect(thumbnailUrl('/photos/osh.sm.webp', base: 'https://x.uz'), 'https://x.uz/photos/osh.sm.webp');
    expect(thumbnailUrl('/media/u.webp', base: 'https://x.uz'), 'https://x.uz/media/u.webp');
  });

  test('notification and App Links open the matching screen', () {
    expect(appPathFor('https://bugunbor.uz/deals/osh'), '/deals/osh');
    expect(appPathFor('https://bugunbor.uz/businesses/kafe'), '/businesses/kafe');
    expect(appPathFor('https://bugunbor.uz/r/K7P2QX'), '/r/K7P2QX');
    expect(appPathFor('https://bugunbor.uz/account/codes#review-1'), '/codes');
    // "Your business was approved" opens its business profile in the app.
    expect(appPathFor('https://bugunbor.uz/business/switch/b1?next=%2Fbusiness%2Fdashboard'), '/profile?business=b1');
    expect(appPathFor('https://bugunbor.uz/business/dashboard'), '/profile');
    // "Deal approved / rejected": the business profile, where the deals are.
    expect(appPathFor('https://bugunbor.uz/business/deals/d1'), '/profile');
    // Billing (payments are only on the site) and admin stay on the site.
    expect(appPathFor('https://bugunbor.uz/business/switch/b1?next=%2Fbusiness%2Fbilling'), isNull);
    expect(appPathFor('https://bugunbor.uz/business/branches'), isNull);
    expect(appPathFor('https://bugunbor.uz/admin/reports'), isNull);
    expect(appPathFor('https://bugunbor.uz/deals/osh/edit'), isNull);
  });

  test('counter codes from typing or scanning', () {
    expect(codeFromInput('k7p 2qx'), 'K7P2QX');
    expect(codeFromInput('K7P-2QX'), 'K7P2QX');
    expect(codeFromInput('https://bugunbor.uz/r/K7P2QX'), 'K7P2QX');
    expect(codeFromInput('https://bugunbor.uz/business/redeem?code=K7P2QX'), 'K7P2QX');
    expect(codeFromInput('K7P2Q'), isNull);
    // 0/O and 1/I are never used in codes.
    expect(codeFromInput('K7P2Q0'), isNull);
    expect(codeFromInput('K7P2QI'), isNull);
  });

  test('outside links', () {
    expect(telegramUri('@kafe').toString(), 'https://t.me/kafe');
    expect(instagramUri('kafe_uz').toString(), 'https://instagram.com/kafe_uz');
    expect(websiteUri('kafe.uz').toString(), 'https://kafe.uz');
    expect(websiteUri('http://kafe.uz').toString(), 'http://kafe.uz');
  });
}
