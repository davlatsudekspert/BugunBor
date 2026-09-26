// The app reads the server's answers exactly as ../contracts pins them. A key
// renamed on the server fails here (and in the server's own contract test)
// instead of silently showing an empty screen.
import 'package:bugunbor/data/models.dart';
import 'package:flutter_test/flutter_test.dart';

import 'support/fakes.dart';

void expectKeys(Map<String, dynamic> json, List<String> keys, String where) {
  for (final key in keys) {
    expect(json.containsKey(key), isTrue, reason: '$where is missing "$key"');
  }
}

void main() {
  test('config', () {
    final json = contractMap('config');
    expectKeys(json, ['demo', 'minAppBuild', 'privacyVersion', 'links', 'telegramBot', 'categories', 'cities', 'reportReasons'], 'config');
    final config = AppConfig.fromJson(json);
    expect(config.categories, isNotEmpty);
    expect(config.categories.first.slug, isNotEmpty);
    expect(config.categories.first.nameRu, isNotNull);
    // Business registration sends the category id.
    expect(config.categories.first.id, 'cat_food');
    expect(config.cities.map((city) => city.slug), contains('tashkent'));
    expect(config.city('tashkent')!.latitude, isNot(0));
    expect(config.reportReasons, containsAll(['WRONG_INFO', 'SCAM', 'OTHER']));
    expect(config.links['privacy'], '/privacy');
    expect(config.links['deleteAccount'], '/delete-account');
  });

  test('feed and deal cards', () {
    final json = contractMap('feed');
    expectKeys(json, ['city', 'located', 'forYou', 'nearby', 'ending', 'total'], 'feed');
    final card = ((json['nearby'] as List).first as Map).cast<String, dynamic>();
    expectKeys(card, [
      'id', 'slug', 'title', 'price', 'originalPrice', 'discountPercent', 'startsAt', 'endsAt', 'remaining', 'photo', //
      'categorySlug', 'business', 'branch', 'branchCount', 'distanceKm', 'effective', 'isDemo', 'isSponsored',
    ], 'deal card');
    expectKeys((card['business'] as Map).cast(), ['id', 'slug', 'name', 'logo', 'rating'], 'card business');
    expectKeys((card['branch'] as Map).cast(), ['id', 'name', 'address', 'city', 'latitude', 'longitude'], 'card branch');

    final feed = Feed.fromJson(json);
    expect(feed.city, 'tashkent');
    expect(feed.located, isTrue);
    final deal = feed.nearby.first;
    expect(deal.slug, 'osh');
    expect(deal.price, 30000);
    expect(deal.originalPrice, 50000);
    expect(deal.business.name, 'Kafe');
    expect(deal.branch.latitude, closeTo(41.31, 0.01));
    expect(deal.distanceKm, greaterThan(0));
    expect(deal.endsAt.isUtc, isTrue);
    expect(deal.endsAt, DateTime.utc(2026, 9, 25, 12));
  });

  test('deal page', () {
    final json = contractMap('deal');
    expectKeys(json, [
      'id', 'slug', 'title', 'description', 'terms', 'price', 'originalPrice', 'discountPercent', 'startsAt', 'endsAt', //
      'remaining', 'perCustomerLimit', 'claimTtlMinutes', 'photo', 'category', 'business', 'branches', 'effective', 'isDemo',
      'claimable', 'favorite', 'following', 'followers', 'usedCount', 'activeRedemptionId',
    ], 'deal');
    final deal = DealDetail.fromJson(json);
    expect(deal.branches, hasLength(2));
    expect(deal.categorySlug, 'taomlar');
    expect(deal.business.phone, isNotNull);
    expect(deal.claimable, isTrue);
    expect(deal.limitReached, isFalse);
    expect(deal.copyWith(favorite: true).favorite, isTrue);
  });

  test('business page', () {
    final json = contractMap('business');
    expectKeys(json, [
      'id',
      'slug',
      'name',
      'description',
      'phone',
      'logo',
      'cover',
      'rating',
      'isDemo',
      'branches',
      'deals',
      'upcoming',
      'reviews',
      'following',
      'followers',
    ], 'business');
    final business = BusinessPage.fromJson(json);
    expect(business.slug, isNotEmpty);
    expect(business.branches, isNotEmpty);
  });

  test('me', () {
    final json = contractMap('me');
    expectKeys(json, ['user', 'stats', 'notifications', 'interests', 'blockedBusinessIds', 'memberships'], 'me');
    expectKeys((json['notifications'] as Map).cast(), ['notifyDeals', 'notifyReminders', 'notifyNearby'], 'me.notifications');
    final me = Me.fromJson(json);
    expect(me.displayName, 'Alice Karimova');
    expect(me.interests, ['taomlar']);
    expect(me.blockedBusinessIds, {'biz'});
    expect(me.notifications.deals, isTrue);
    expect(me.notifications.nearby, isFalse);
    expect((json['user'] as Map).containsKey('telegramUsername'), isTrue);
    expect(me.telegramUsername, isNull);
    expect(me.hasBusiness, isFalse);
  });

  test('memberships and business registration', () {
    final list = (contract('me-memberships') as List).cast<Map<String, dynamic>>();
    expectKeys(list.first, ['businessId', 'name', 'slug', 'role', 'status', 'verified'], 'membership');
    final membership = Membership.fromJson(list.first);
    expect(membership.role, 'OWNER');
    expect(membership.status, 'VERIFIED');
    expect(membership.verified, isTrue);

    final json = contractMap('business-create');
    expectKeys(json, ['id', 'slug', 'status'], 'business-create');
    final created = BusinessCreated.fromJson(json);
    expect(created.id, membership.businessId);
    expect(created.verified, isTrue);
  });

  test('business workspace', () {
    final json = contractMap('business-workspace');
    expectKeys(json, ['business', 'role', 'can', 'stats', 'recent', 'setup'], 'workspace');
    expectKeys((json['business'] as Map).cast(), [
      'id',
      'name',
      'slug',
      'city',
      'status',
      'rejectionReason',
      'suspended',
      'isDemo',
      'logo',
    ], 'workspace.business');
    expectKeys((json['can'] as Map).cast(), ['edit', 'deals', 'validate', 'analytics'], 'workspace.can');
    expectKeys((json['stats'] as Map).cast(), [
      'live',
      'pending',
      'claimsToday',
      'redeemedToday',
      'views',
      'followers',
      'ratingBp',
      'reviewCount',
    ], 'workspace.stats');
    expectKeys(((json['recent'] as List).first as Map).cast(), ['id', 'status', 'createdAt', 'dealTitle', 'customerName', 'branchName'], 'workspace.recent');
    final workspace = BusinessWorkspace.fromJson(json);
    expect(workspace.business.status, 'VERIFIED');
    expect(workspace.canEdit && workspace.canDeals && workspace.canValidate && workspace.canAnalytics, isTrue);
    expect(workspace.stats!.live, 1);
    expect(workspace.stats!.claimsToday, 1);
    expect(workspace.recent.single.dealTitle, 'Osh');
    expect(workspace.recent.single.createdAt, DateTime.utc(2026, 9, 25, 10));
    expect(workspace.setup.map((item) => item.key), ['logo', 'cover', 'description', 'contacts', 'location', 'deal']);
    expect(workspace.setup.where((item) => item.done).length, 2);
  });

  test('my codes', () {
    final list = (contract('my-codes') as List).cast<Map<String, dynamic>>();
    expectKeys(list.first, [
      'id',
      'status',
      'expiresAt',
      'createdAt',
      'dealSlug',
      'dealTitle',
      'price',
      'businessName',
      'branchName',
      'address',
      'code',
      'canRate',
      'myRating',
    ], 'redemption');
    final code = Redemption.fromJson(list.first);
    expect(code.status, 'CLAIMED');
    expect(code.code, hasLength(6));
    expect(code.expiresAt, DateTime.utc(2026, 9, 25, 11));
    // Past its time a claimed code is no longer shown as active.
    expect(code.isActive, code.expiresAt.isAfter(DateTime.now().toUtc()));
  });

  test('login', () {
    final start = LoginStart.fromJson(contractMap('login-start'));
    expect(start.matchCode, isNotEmpty);
    expect(start.loginSecret, isNotEmpty);
    expect(start.deepLink, startsWith('https://t.me/'));
    expect(start.expiresAt.isUtc, isTrue);
    final status = LoginStatus.fromJson(contractMap('login-status'));
    expect(status.status, isNotEmpty);
  });
}
