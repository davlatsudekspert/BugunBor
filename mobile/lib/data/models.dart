import '../core/time.dart';

// API models, parsed defensively: the shapes are pinned in ../contracts and
// the tests parse those files, so a renamed key fails a test instead of
// silently showing an empty list.

typedef Json = Map<String, dynamic>;

String _str(Object? value, [String fallback = '']) => value is String ? value : (value?.toString() ?? fallback);
String? _strOrNull(Object? value) => value is String && value.isNotEmpty ? value : null;
int _int(Object? value, [int fallback = 0]) => value is num ? value.toInt() : int.tryParse('$value') ?? fallback;
int? _intOrNull(Object? value) => value is num ? value.toInt() : (value is String ? int.tryParse(value) : null);
double? _doubleOrNull(Object? value) => value is num ? value.toDouble() : (value is String ? double.tryParse(value) : null);
bool _bool(Object? value) => value == true || value == 1 || value == '1' || value == 'true';
Json _map(Object? value) => value is Map ? value.cast<String, dynamic>() : const {};
List<T> _list<T>(Object? value, T Function(Json) parse) =>
    value is List ? value.whereType<Map<dynamic, dynamic>>().map((item) => parse(item.cast<String, dynamic>())).toList() : <T>[];

class Category {
  const Category({required this.slug, required this.nameUz, required this.nameRu, this.icon});
  factory Category.fromJson(Json json) =>
      Category(slug: _str(json['slug']), nameUz: _str(json['nameUz']), nameRu: _strOrNull(json['nameRu']), icon: _strOrNull(json['icon']));

  final String slug;
  final String nameUz;
  final String? nameRu;
  final String? icon;

  String name(String locale) => locale == 'ru' ? (nameRu ?? nameUz) : nameUz;
}

class City {
  const City({required this.slug, required this.nameUz, required this.nameRu, required this.latitude, required this.longitude});
  factory City.fromJson(Json json) => City(
    slug: _str(json['slug']),
    nameUz: _str(json['nameUz']),
    nameRu: _str(json['nameRu']),
    latitude: _doubleOrNull(json['latitude']) ?? 0,
    longitude: _doubleOrNull(json['longitude']) ?? 0,
  );

  final String slug;
  final String nameUz;
  final String nameRu;
  final double latitude;
  final double longitude;

  String name(String locale) => locale == 'ru' ? nameRu : nameUz;
}

class AppConfig {
  const AppConfig({
    required this.demo,
    required this.tariffsEnabled,
    required this.minAppBuild,
    required this.privacyVersion,
    required this.links,
    required this.telegramBot,
    required this.categories,
    required this.cities,
    required this.reportReasons,
  });

  factory AppConfig.fromJson(Json json) => AppConfig(
    demo: _bool(json['demo']),
    tariffsEnabled: _bool(json['tariffsEnabled']),
    minAppBuild: _int(json['minAppBuild']),
    privacyVersion: _str(json['privacyVersion']),
    links: _map(json['links']).map((key, value) => MapEntry(key, _str(value))),
    telegramBot: _strOrNull(json['telegramBot']),
    categories: _list(json['categories'], Category.fromJson),
    cities: _list(json['cities'], City.fromJson),
    reportReasons: (json['reportReasons'] as List?)?.map((reason) => '$reason').toList() ?? const [],
  );

  final bool demo;
  final bool tariffsEnabled;
  final int minAppBuild;
  final String privacyVersion;
  final Map<String, String> links;
  final String? telegramBot;
  final List<Category> categories;
  final List<City> cities;
  final List<String> reportReasons;

  City? city(String? slug) => cities.where((city) => city.slug == slug).firstOrNull;
  Category? category(String? slug) => categories.where((category) => category.slug == slug).firstOrNull;
}

class Rating {
  const Rating({required this.basisPoints, required this.count});
  factory Rating.fromJson(Json json) => Rating(basisPoints: _int(json['basisPoints']), count: _int(json['count']));
  static Rating? maybe(Object? value) => value is Map ? Rating.fromJson(value.cast<String, dynamic>()) : null;

  /// Average rating in basis points (470 = 4.7).
  final int basisPoints;
  final int count;

  double get average => basisPoints / 100;
}

class Branch {
  const Branch({
    required this.id,
    required this.name,
    required this.address,
    required this.city,
    required this.latitude,
    required this.longitude,
    this.phone,
    this.hoursJson,
  });

  factory Branch.fromJson(Json json) => Branch(
    id: _str(json['id']),
    name: _str(json['name']),
    address: _str(json['address']),
    city: _str(json['city']),
    latitude: _doubleOrNull(json['latitude']) ?? 0,
    longitude: _doubleOrNull(json['longitude']) ?? 0,
    phone: _strOrNull(json['phone']),
    hoursJson: _strOrNull(json['hoursJson']),
  );

  final String id;
  final String name;
  final String address;
  final String city;
  final double latitude;
  final double longitude;
  final String? phone;
  final String? hoursJson;
}

class BusinessSummary {
  const BusinessSummary({required this.id, required this.slug, required this.name, this.logo, this.rating});
  factory BusinessSummary.fromJson(Json json) => BusinessSummary(
    id: _str(json['id']),
    slug: _str(json['slug']),
    name: _str(json['name']),
    logo: _strOrNull(json['logo']),
    rating: Rating.maybe(json['rating']),
  );

  final String id;
  final String slug;
  final String name;
  final String? logo;
  final Rating? rating;
}

/// One deal in a list (feed, search, business page).
class DealCard {
  const DealCard({
    required this.id,
    required this.slug,
    required this.title,
    required this.price,
    required this.originalPrice,
    required this.discountPercent,
    required this.startsAt,
    required this.endsAt,
    required this.remaining,
    required this.photo,
    required this.categorySlug,
    required this.business,
    required this.branch,
    required this.branchCount,
    required this.distanceKm,
    required this.effective,
    required this.isDemo,
    required this.isSponsored,
  });

  factory DealCard.fromJson(Json json) => DealCard(
    id: _str(json['id']),
    slug: _str(json['slug']),
    title: _str(json['title']),
    price: _int(json['price']),
    originalPrice: _intOrNull(json['originalPrice']),
    discountPercent: _int(json['discountPercent']),
    startsAt: parseServerTime(_str(json['startsAt'], '1970-01-01 00:00:00')),
    endsAt: parseServerTime(_str(json['endsAt'], '1970-01-01 00:00:00')),
    remaining: _intOrNull(json['remaining']),
    photo: _strOrNull(json['photo']),
    categorySlug: _str(json['categorySlug']),
    business: BusinessSummary.fromJson(_map(json['business'])),
    branch: Branch.fromJson(_map(json['branch'])),
    branchCount: _int(json['branchCount'], 1),
    distanceKm: _doubleOrNull(json['distanceKm']),
    effective: _str(json['effective']),
    isDemo: _bool(json['isDemo']),
    isSponsored: _bool(json['isSponsored']),
  );

  final String id;
  final String slug;
  final String title;
  final int price;
  final int? originalPrice;
  final int discountPercent;
  final DateTime startsAt;
  final DateTime endsAt;
  final int? remaining;
  final String? photo;
  final String categorySlug;
  final BusinessSummary business;
  final Branch branch;
  final int branchCount;
  final double? distanceKm;
  final String effective;
  final bool isDemo;
  final bool isSponsored;
}

class Feed {
  const Feed({required this.city, required this.located, required this.forYou, required this.nearby, required this.ending, required this.total});
  factory Feed.fromJson(Json json) => Feed(
    city: _str(json['city']),
    located: _bool(json['located']),
    forYou: _list(json['forYou'], DealCard.fromJson),
    nearby: _list(json['nearby'], DealCard.fromJson),
    ending: _list(json['ending'], DealCard.fromJson),
    total: _int(json['total']),
  );

  final String city;
  final bool located;
  final List<DealCard> forYou;
  final List<DealCard> nearby;
  final List<DealCard> ending;
  final int total;
}

class DealPage {
  const DealPage({required this.items, required this.total});
  final List<DealCard> items;
  final int total;
}

class BusinessInfo {
  const BusinessInfo({
    required this.id,
    required this.slug,
    required this.name,
    required this.description,
    required this.phone,
    required this.telegram,
    required this.instagram,
    required this.website,
    required this.logo,
    required this.rating,
    required this.isDemo,
    required this.onAir,
  });

  factory BusinessInfo.fromJson(Json json) => BusinessInfo(
    id: _str(json['id']),
    slug: _str(json['slug']),
    name: _str(json['name']),
    description: _str(json['description']),
    phone: _strOrNull(json['phone']),
    telegram: _strOrNull(json['telegram']),
    instagram: _strOrNull(json['instagram']),
    website: _strOrNull(json['website']),
    logo: _strOrNull(json['logo']),
    rating: Rating.maybe(json['rating']),
    isDemo: _bool(json['isDemo']),
    onAir: json['onAir'] == null || _bool(json['onAir']),
  );

  final String id;
  final String slug;
  final String name;
  final String description;
  final String? phone;
  final String? telegram;
  final String? instagram;
  final String? website;
  final String? logo;
  final Rating? rating;
  final bool isDemo;
  final bool onAir;
}

class DealDetail {
  const DealDetail({
    required this.id,
    required this.slug,
    required this.title,
    required this.description,
    required this.terms,
    required this.price,
    required this.originalPrice,
    required this.discountPercent,
    required this.startsAt,
    required this.endsAt,
    required this.remaining,
    required this.perCustomerLimit,
    required this.claimTtlMinutes,
    required this.photo,
    required this.categorySlug,
    required this.business,
    required this.branches,
    required this.effective,
    required this.isDemo,
    required this.claimable,
    required this.favorite,
    required this.following,
    required this.followers,
    required this.usedCount,
    required this.activeRedemptionId,
  });

  factory DealDetail.fromJson(Json json) => DealDetail(
    id: _str(json['id']),
    slug: _str(json['slug']),
    title: _str(json['title']),
    description: _str(json['description']),
    terms: _str(json['terms']),
    price: _int(json['price']),
    originalPrice: _intOrNull(json['originalPrice']),
    discountPercent: _int(json['discountPercent']),
    startsAt: parseServerTime(_str(json['startsAt'], '1970-01-01 00:00:00')),
    endsAt: parseServerTime(_str(json['endsAt'], '1970-01-01 00:00:00')),
    remaining: _intOrNull(json['remaining']),
    perCustomerLimit: _int(json['perCustomerLimit'], 1),
    claimTtlMinutes: _int(json['claimTtlMinutes'], 60),
    photo: _strOrNull(json['photo']),
    categorySlug: _str(_map(json['category'])['slug']),
    business: BusinessInfo.fromJson(_map(json['business'])),
    branches: _list(json['branches'], Branch.fromJson),
    effective: _str(json['effective']),
    isDemo: _bool(json['isDemo']),
    claimable: _bool(json['claimable']),
    favorite: _bool(json['favorite']),
    following: _bool(json['following']),
    followers: _int(json['followers']),
    usedCount: _int(json['usedCount']),
    activeRedemptionId: _strOrNull(json['activeRedemptionId']),
  );

  final String id;
  final String slug;
  final String title;
  final String description;
  final String terms;
  final int price;
  final int? originalPrice;
  final int discountPercent;
  final DateTime startsAt;
  final DateTime endsAt;
  final int? remaining;
  final int perCustomerLimit;
  final int claimTtlMinutes;
  final String? photo;
  final String categorySlug;
  final BusinessInfo business;
  final List<Branch> branches;
  final String effective;
  final bool isDemo;
  final bool claimable;
  final bool favorite;
  final bool following;
  final int followers;
  final int usedCount;
  final String? activeRedemptionId;

  bool get limitReached => usedCount >= perCustomerLimit;

  DealDetail copyWith({bool? favorite, bool? following, int? followers}) => DealDetail(
    id: id,
    slug: slug,
    title: title,
    description: description,
    terms: terms,
    price: price,
    originalPrice: originalPrice,
    discountPercent: discountPercent,
    startsAt: startsAt,
    endsAt: endsAt,
    remaining: remaining,
    perCustomerLimit: perCustomerLimit,
    claimTtlMinutes: claimTtlMinutes,
    photo: photo,
    categorySlug: categorySlug,
    business: business,
    branches: branches,
    effective: effective,
    isDemo: isDemo,
    claimable: claimable,
    favorite: favorite ?? this.favorite,
    following: following ?? this.following,
    followers: followers ?? this.followers,
    usedCount: usedCount,
    activeRedemptionId: activeRedemptionId,
  );
}

class Review {
  const Review({required this.id, required this.rating, required this.comment, required this.author, required this.createdAt});
  factory Review.fromJson(Json json) => Review(
    id: _str(json['id']),
    rating: _int(json['rating']),
    comment: _strOrNull(json['comment']),
    author: _strOrNull(json['author']),
    createdAt: parseServerTimeOrNull(json['createdAt']),
  );

  final String id;
  final int rating;
  final String? comment;
  final String? author;
  final DateTime? createdAt;
}

class BusinessPage {
  const BusinessPage({
    required this.id,
    required this.slug,
    required this.name,
    required this.description,
    required this.phone,
    required this.telegram,
    required this.instagram,
    required this.website,
    required this.logo,
    required this.cover,
    required this.rating,
    required this.isDemo,
    required this.branches,
    required this.deals,
    required this.upcoming,
    required this.reviews,
    required this.following,
    required this.followers,
  });

  factory BusinessPage.fromJson(Json json) => BusinessPage(
    id: _str(json['id']),
    slug: _str(json['slug']),
    name: _str(json['name']),
    description: _str(json['description']),
    phone: _strOrNull(json['phone']),
    telegram: _strOrNull(json['telegram']),
    instagram: _strOrNull(json['instagram']),
    website: _strOrNull(json['website']),
    logo: _strOrNull(json['logo']),
    cover: _strOrNull(json['cover']),
    rating: Rating.maybe(json['rating']),
    isDemo: _bool(json['isDemo']),
    branches: _list(json['branches'], Branch.fromJson),
    deals: _list(json['deals'], DealCard.fromJson),
    upcoming: _list(json['upcoming'], DealCard.fromJson),
    reviews: _list(json['reviews'], Review.fromJson),
    following: _bool(json['following']),
    followers: _int(json['followers']),
  );

  final String id;
  final String slug;
  final String name;
  final String description;
  final String? phone;
  final String? telegram;
  final String? instagram;
  final String? website;
  final String? logo;
  final String? cover;
  final Rating? rating;
  final bool isDemo;
  final List<Branch> branches;
  final List<DealCard> deals;
  final List<DealCard> upcoming;
  final List<Review> reviews;
  final bool following;
  final int followers;
}

class Membership {
  const Membership({required this.businessId, required this.name, required this.slug, required this.role, required this.verified});
  factory Membership.fromJson(Json json) => Membership(
    businessId: _str(json['businessId']),
    name: _str(json['name']),
    slug: _str(json['slug']),
    role: _str(json['role']),
    verified: _bool(json['verified']),
  );

  final String businessId;
  final String name;
  final String slug;
  final String role;
  final bool verified;
}

class NotificationSettings {
  const NotificationSettings({required this.deals, required this.reminders, required this.nearby});
  factory NotificationSettings.fromJson(Json json) =>
      NotificationSettings(deals: _bool(json['notifyDeals']), reminders: _bool(json['notifyReminders']), nearby: _bool(json['notifyNearby']));

  final bool deals;
  final bool reminders;
  final bool nearby;
}

class Me {
  const Me({
    required this.id,
    required this.displayName,
    required this.phone,
    required this.locale,
    required this.role,
    required this.redeemed,
    required this.savedUzs,
    required this.activeCodes,
    required this.notifications,
    required this.interests,
    required this.blockedBusinessIds,
    required this.memberships,
  });

  factory Me.fromJson(Json json) {
    final user = _map(json['user']);
    final stats = _map(json['stats']);
    return Me(
      id: _str(user['id']),
      displayName: _str(user['displayName']),
      phone: _strOrNull(user['phone']),
      locale: _str(user['locale'], 'uz'),
      role: _str(user['role'], 'CUSTOMER'),
      redeemed: _int(stats['redeemed']),
      savedUzs: _int(stats['savedUzs']),
      activeCodes: _int(stats['active']),
      notifications: NotificationSettings.fromJson(_map(json['notifications'])),
      interests: (json['interests'] as List?)?.map((slug) => '$slug').toList() ?? const [],
      blockedBusinessIds: (json['blockedBusinessIds'] as List?)?.map((id) => '$id').toSet() ?? const {},
      memberships: _list(json['memberships'], Membership.fromJson),
    );
  }

  final String id;
  final String displayName;
  final String? phone;
  final String locale;
  final String role;
  final int redeemed;
  final int savedUzs;
  final int activeCodes;
  final NotificationSettings notifications;
  final List<String> interests;
  final Set<String> blockedBusinessIds;
  final List<Membership> memberships;

  /// Businesses where this person may check codes at the counter.
  List<Membership> get counters => memberships.where((membership) => membership.verified).toList();
}

class Redemption {
  const Redemption({
    required this.id,
    required this.status,
    required this.expiresAt,
    required this.createdAt,
    required this.completedAt,
    required this.dealSlug,
    required this.dealTitle,
    required this.price,
    required this.originalPrice,
    required this.businessName,
    required this.branchName,
    required this.address,
    required this.photo,
    required this.latitude,
    required this.longitude,
    required this.code,
    required this.canRate,
    required this.myRating,
  });

  factory Redemption.fromJson(Json json) => Redemption(
    id: _str(json['id']),
    status: _str(json['status']),
    expiresAt: parseServerTime(_str(json['expiresAt'], '1970-01-01 00:00:00')),
    createdAt: parseServerTime(_str(json['createdAt'], '1970-01-01 00:00:00')),
    completedAt: parseServerTimeOrNull(json['completedAt']),
    dealSlug: _str(json['dealSlug']),
    dealTitle: _str(json['dealTitle']),
    price: _int(json['price']),
    originalPrice: _intOrNull(json['originalPrice']),
    businessName: _str(json['businessName']),
    branchName: _str(json['branchName']),
    address: _str(json['address']),
    photo: _strOrNull(json['photo']),
    latitude: _doubleOrNull(json['latitude']) ?? 0,
    longitude: _doubleOrNull(json['longitude']) ?? 0,
    code: _strOrNull(json['code']),
    canRate: _bool(json['canRate']),
    myRating: _intOrNull(json['myRating']),
  );

  final String id;

  /// CLAIMED, COMPLETED, EXPIRED or CANCELED (the server already turns
  /// claims past their time into EXPIRED).
  final String status;
  final DateTime expiresAt;
  final DateTime createdAt;
  final DateTime? completedAt;
  final String dealSlug;
  final String dealTitle;
  final int price;
  final int? originalPrice;
  final String businessName;
  final String branchName;
  final String address;
  final String? photo;
  final double latitude;
  final double longitude;
  final String? code;
  final bool canRate;
  final int? myRating;

  /// Can still be shown at the counter (a claim past its time counts as
  /// expired even before the server marks it so).
  bool get isActive => status == 'CLAIMED' && code != null && expiresAt.isAfter(DateTime.now().toUtc());
}

class Favorites {
  const Favorites({required this.live, required this.ended});
  factory Favorites.fromJson(Json json) => Favorites(live: _list(json['live'], DealCard.fromJson), ended: _list(json['ended'], DealCard.fromJson));
  final List<DealCard> live;
  final List<DealCard> ended;
}

class FollowedBusiness {
  const FollowedBusiness({required this.id, required this.slug, required this.name, required this.city, required this.logo, required this.liveDeals});
  factory FollowedBusiness.fromJson(Json json) => FollowedBusiness(
    id: _str(json['id']),
    slug: _str(json['slug']),
    name: _str(json['name']),
    city: _str(json['city']),
    logo: _strOrNull(json['logo']),
    liveDeals: _int(json['liveDeals']),
  );

  final String id;
  final String slug;
  final String name;
  final String city;
  final String? logo;
  final int liveDeals;
}

class LoginStart {
  const LoginStart({required this.matchCode, required this.expiresAt, required this.deepLink, required this.loginSecret});
  factory LoginStart.fromJson(Json json) => LoginStart(
    matchCode: _str(json['matchCode']),
    expiresAt: parseServerTime(_str(json['expiresAt'], '1970-01-01T00:00:00Z')),
    deepLink: _str(json['deepLink']),
    loginSecret: _str(json['loginSecret']),
  );

  final String matchCode;
  final DateTime expiresAt;
  final String deepLink;
  final String loginSecret;
}

/// PENDING / WAITING / EXPIRED / DENIED / MISSING, or APPROVED with a token.
class LoginStatus {
  const LoginStatus({required this.status, this.token});
  factory LoginStatus.fromJson(Json json) => LoginStatus(status: _str(json['status']), token: _strOrNull(json['token']));
  final String status;
  final String? token;
}

class ClaimResult {
  const ClaimResult({required this.id, required this.code, required this.expiresAt});
  factory ClaimResult.fromJson(Json json) =>
      ClaimResult(id: _str(json['id']), code: _str(json['code']), expiresAt: parseServerTime(_str(json['expiresAt'], '1970-01-01 00:00:00')));
  final String id;
  final String code;
  final DateTime expiresAt;
}

class CodeLookup {
  const CodeLookup({
    required this.id,
    required this.dealTitle,
    required this.price,
    required this.branchName,
    required this.customerName,
    required this.customerPhone,
  });
  factory CodeLookup.fromJson(Json json) => CodeLookup(
    id: _str(json['id']),
    dealTitle: _str(json['dealTitle']),
    price: _int(json['price']),
    branchName: _str(json['branchName']),
    customerName: _str(json['customerName']),
    customerPhone: _str(json['customerPhone']),
  );

  final String id;
  final String dealTitle;
  final int price;
  final String branchName;
  final String customerName;
  final String customerPhone;
}
