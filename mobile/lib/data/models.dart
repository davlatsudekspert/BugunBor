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
  const Category({this.id = '', required this.slug, required this.nameUz, required this.nameRu, this.icon});
  factory Category.fromJson(Json json) => Category(
    id: _str(json['id']),
    slug: _str(json['slug']),
    nameUz: _str(json['nameUz']),
    nameRu: _strOrNull(json['nameRu']),
    icon: _strOrNull(json['icon']),
  );

  /// What business registration sends (`slug` is used everywhere else).
  final String id;
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
    this.deal = const DealRules(),
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
    deal: json['deal'] is Map ? DealRules.fromJson(_map(json['deal'])) : const DealRules(),
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

  /// Rules and pictures for the deal form (empty visuals: an older server).
  final DealRules deal;

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
  const Membership({required this.businessId, required this.name, required this.slug, required this.role, required this.verified, this.status = 'PENDING'});
  factory Membership.fromJson(Json json) => Membership(
    businessId: _str(json['businessId']),
    name: _str(json['name']),
    slug: _str(json['slug']),
    role: _str(json['role']),
    verified: _bool(json['verified']),
    status: _strOrNull(json['status']) ?? (_bool(json['verified']) ? 'VERIFIED' : 'PENDING'),
  );

  final String businessId;
  final String name;
  final String slug;

  /// OWNER, MANAGER or CASHIER.
  final String role;

  /// Verified and not suspended: codes can be checked.
  final bool verified;

  /// Review state: PENDING, VERIFIED or REJECTED.
  final String status;
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
    this.telegramUsername,
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
      telegramUsername: _strOrNull(user['telegramUsername']),
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

  /// Offered with one tap as the business's Telegram contact.
  final String? telegramUsername;

  bool get hasBusiness => memberships.isNotEmpty;

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

/// Answer to a business registration: VERIFIED when the automatic check
/// passed, otherwise PENDING until a moderator decides.
class BusinessCreated {
  const BusinessCreated({required this.id, required this.slug, required this.status});
  factory BusinessCreated.fromJson(Json json) => BusinessCreated(id: _str(json['id']), slug: _str(json['slug']), status: _str(json['status'], 'PENDING'));
  final String id;
  final String slug;
  final String status;

  bool get verified => status == 'VERIFIED';
}

class WorkspaceBusiness {
  const WorkspaceBusiness({
    required this.id,
    required this.name,
    required this.slug,
    required this.city,
    required this.status,
    required this.rejectionReason,
    required this.suspended,
    required this.isDemo,
    required this.logo,
    this.categoryId,
  });

  factory WorkspaceBusiness.fromJson(Json json) => WorkspaceBusiness(
    id: _str(json['id']),
    name: _str(json['name']),
    slug: _str(json['slug']),
    city: _str(json['city']),
    status: _str(json['status'], 'PENDING'),
    rejectionReason: _strOrNull(json['rejectionReason']),
    suspended: _bool(json['suspended']),
    isDemo: _bool(json['isDemo']),
    logo: _strOrNull(json['logo']),
    categoryId: _strOrNull(json['categoryId']),
  );

  final String id;
  final String name;
  final String slug;
  final String city;
  final String status;
  final String? rejectionReason;
  final bool suspended;
  final bool isDemo;
  final String? logo;

  /// The business's own category: where a new deal starts.
  final String? categoryId;
}

class WorkspaceStats {
  const WorkspaceStats({
    required this.live,
    required this.pending,
    required this.claimsToday,
    required this.redeemedToday,
    required this.views,
    required this.followers,
    required this.ratingBp,
    required this.reviewCount,
  });

  factory WorkspaceStats.fromJson(Json json) => WorkspaceStats(
    live: _int(json['live']),
    pending: _int(json['pending']),
    claimsToday: _int(json['claimsToday']),
    redeemedToday: _int(json['redeemedToday']),
    views: _int(json['views']),
    followers: _int(json['followers']),
    ratingBp: _int(json['ratingBp']),
    reviewCount: _int(json['reviewCount']),
  );

  final int live;
  final int pending;
  final int claimsToday;
  final int redeemedToday;
  final int views;
  final int followers;
  final int ratingBp;
  final int reviewCount;
}

/// A code claimed at this business (latest first).
class WorkspaceCode {
  const WorkspaceCode({
    required this.id,
    required this.status,
    required this.createdAt,
    required this.dealTitle,
    required this.customerName,
    required this.branchName,
  });
  factory WorkspaceCode.fromJson(Json json) => WorkspaceCode(
    id: _str(json['id']),
    status: _str(json['status']),
    createdAt: parseServerTime(_str(json['createdAt'], '1970-01-01 00:00:00')),
    dealTitle: _str(json['dealTitle']),
    customerName: _str(json['customerName']),
    branchName: _str(json['branchName']),
  );
  final String id;
  final String status;
  final DateTime createdAt;
  final String dealTitle;
  final String customerName;
  final String branchName;
}

/// The business profile a member sees: what they may do, and for owners
/// and managers today's numbers, the latest codes and the setup steps.
class BusinessWorkspace {
  const BusinessWorkspace({
    required this.business,
    required this.role,
    required this.canEdit,
    required this.canDeals,
    required this.canValidate,
    required this.canAnalytics,
    required this.stats,
    required this.recent,
    required this.setup,
    this.branches = const [],
  });

  factory BusinessWorkspace.fromJson(Json json) {
    final can = _map(json['can']);
    return BusinessWorkspace(
      business: WorkspaceBusiness.fromJson(_map(json['business'])),
      role: _str(json['role'], 'CASHIER'),
      canEdit: _bool(can['edit']),
      canDeals: _bool(can['deals']),
      canValidate: _bool(can['validate']),
      canAnalytics: _bool(can['analytics']),
      stats: json['stats'] is Map ? WorkspaceStats.fromJson(_map(json['stats'])) : null,
      recent: _list(json['recent'], WorkspaceCode.fromJson),
      setup: [for (final item in (json['setup'] as List? ?? const []).whereType<Map<dynamic, dynamic>>()) (key: '${item['key']}', done: _bool(item['done']))],
      branches: _list(json['branches'], WorkspaceBranch.fromJson),
    );
  }

  final WorkspaceBusiness business;
  final String role;
  final bool canEdit;
  final bool canDeals;
  final bool canValidate;
  final bool canAnalytics;
  final WorkspaceStats? stats;
  final List<WorkspaceCode> recent;
  final List<({String key, bool done})> setup;

  /// Where a deal can run (for those who may add deals).
  final List<WorkspaceBranch> branches;
}

class WorkspaceBranch {
  const WorkspaceBranch({required this.id, required this.name, required this.address});
  factory WorkspaceBranch.fromJson(Json json) => WorkspaceBranch(id: _str(json['id']), name: _str(json['name']), address: _str(json['address']));
  final String id;
  final String name;
  final String address;
}

/// The deal form's rules (DEAL_RULES in modules/deals/status.ts) and the
/// pictures a deal without a photo shows.
class DealRules {
  const DealRules({
    this.minDiscountPercent = 10,
    this.minDurationMinutes = 30,
    this.maxDurationDays = 30,
    this.maxQuantity = 10000,
    this.maxPerCustomer = 10,
    this.claimTtlOptions = const [30, 60, 120, 240],
    this.defaultClaimTtl = 120,
    this.visuals = const [],
    this.categoryVisuals = const {},
  });

  factory DealRules.fromJson(Json json) => DealRules(
    minDiscountPercent: _int(json['minDiscountPercent'], 10),
    minDurationMinutes: _int(json['minDurationMinutes'], 30),
    maxDurationDays: _int(json['maxDurationDays'], 30),
    maxQuantity: _int(json['maxQuantity'], 10000),
    maxPerCustomer: _int(json['maxPerCustomer'], 10),
    claimTtlOptions: (json['claimTtlOptions'] as List?)?.map((value) => _int(value)).toList() ?? const [30, 60, 120, 240],
    defaultClaimTtl: _int(json['defaultClaimTtl'], 120),
    visuals: _list(json['visuals'], DealVisual.fromJson),
    categoryVisuals: _map(json['categoryVisuals']).map((key, value) => MapEntry(key, _str(value))),
  );

  final int minDiscountPercent;
  final int minDurationMinutes;
  final int maxDurationDays;
  final int maxQuantity;
  final int maxPerCustomer;
  final List<int> claimTtlOptions;
  final int defaultClaimTtl;
  final List<DealVisual> visuals;

  /// Category slug → the picture a new deal in it starts with.
  final Map<String, String> categoryVisuals;

  String visualFor(String? categorySlug) =>
      categoryVisuals[categorySlug] ?? (visuals.any((visual) => visual.key == 'gift') ? 'gift' : visuals.firstOrNull?.key ?? 'gift');

  String emojiOf(String? key) => visuals.where((visual) => visual.key == key).firstOrNull?.emoji ?? '🎁';
}

class DealVisual {
  const DealVisual({required this.key, required this.emoji});
  factory DealVisual.fromJson(Json json) => DealVisual(key: _str(json['key']), emoji: _str(json['emoji']));
  final String key;
  final String emoji;
}

/// A deal in the business's own list (any status).
class BusinessDeal {
  const BusinessDeal({
    required this.id,
    required this.slug,
    required this.title,
    required this.status,
    required this.effective,
    required this.startsAt,
    required this.endsAt,
    required this.originalPrice,
    required this.price,
    required this.discountPercent,
    required this.total,
    required this.remaining,
    required this.visual,
    required this.isSponsored,
    required this.rejectionReason,
    required this.claims,
    required this.redeemed,
    required this.photo,
    required this.views,
  });

  factory BusinessDeal.fromJson(Json json) => BusinessDeal(
    id: _str(json['id']),
    slug: _str(json['slug']),
    title: _str(json['title']),
    status: _str(json['status'], 'DRAFT'),
    effective: _str(json['effective'], _str(json['status'], 'DRAFT')),
    startsAt: parseServerTime(_str(json['startsAt'], '1970-01-01 00:00:00')),
    endsAt: parseServerTime(_str(json['endsAt'], '1970-01-01 00:00:00')),
    originalPrice: _intOrNull(json['originalPrice']),
    price: _int(json['price']),
    discountPercent: _int(json['discountPercent']),
    total: _intOrNull(json['total']),
    remaining: _intOrNull(json['remaining']),
    visual: _strOrNull(json['visual']),
    isSponsored: _bool(json['isSponsored']),
    rejectionReason: _strOrNull(json['rejectionReason']),
    claims: _int(json['claims']),
    redeemed: _int(json['redeemed']),
    photo: _strOrNull(json['photo']),
    views: _int(json['views']),
  );

  final String id;
  final String slug;
  final String title;

  /// Stored: DRAFT, PENDING_REVIEW, ACTIVE, PAUSED, REJECTED or ARCHIVED.
  final String status;

  /// What people see: ACTIVE is split into LIVE, SCHEDULED, SOLD_OUT, EXPIRED.
  final String effective;
  final DateTime startsAt;
  final DateTime endsAt;
  final int? originalPrice;
  final int price;
  final int discountPercent;
  final int? total;
  final int? remaining;
  final String? visual;
  final bool isSponsored;
  final String? rejectionReason;
  final int claims;
  final int redeemed;
  final String? photo;
  final int views;

  /// Only drafts and rejected deals can be changed; others are copied.
  bool get editable => status == 'DRAFT' || status == 'REJECTED';
}

/// A deal as the edit form needs it; times are Tashkent `YYYY-MM-DDTHH:MM`.
class EditableDeal {
  const EditableDeal({
    required this.id,
    required this.status,
    required this.title,
    required this.description,
    required this.terms,
    required this.categoryId,
    required this.visual,
    required this.originalPrice,
    required this.price,
    required this.startsAt,
    required this.endsAt,
    required this.total,
    required this.perCustomerLimit,
    required this.claimTtlMinutes,
    required this.branchIds,
    required this.rejectionReason,
    required this.photoId,
    required this.photo,
  });

  factory EditableDeal.fromJson(Json json) => EditableDeal(
    id: _str(json['id']),
    status: _str(json['status'], 'DRAFT'),
    title: _str(json['title']),
    description: _str(json['description']),
    terms: _str(json['terms']),
    categoryId: _str(json['categoryId']),
    visual: _strOrNull(json['visual']),
    originalPrice: _intOrNull(json['originalPrice']),
    price: _int(json['price']),
    startsAt: _str(json['startsAt']),
    endsAt: _str(json['endsAt']),
    total: _intOrNull(json['total']),
    perCustomerLimit: _int(json['perCustomerLimit'], 1),
    claimTtlMinutes: _int(json['claimTtlMinutes'], 120),
    branchIds: (json['branchIds'] as List?)?.map((id) => '$id').toList() ?? const [],
    rejectionReason: _strOrNull(json['rejectionReason']),
    photoId: _strOrNull(json['photoId']),
    photo: _strOrNull(json['photo']),
  );

  final String id;
  final String status;
  final String title;
  final String description;
  final String terms;
  final String categoryId;
  final String? visual;
  final int? originalPrice;
  final int price;
  final String startsAt;
  final String endsAt;
  final int? total;
  final int perCustomerLimit;
  final int claimTtlMinutes;
  final List<String> branchIds;
  final String? rejectionReason;
  final String? photoId;
  final String? photo;
}

/// A deal after saving: DRAFT, or ACTIVE / PENDING_REVIEW after the check.
class DealSaved {
  const DealSaved({required this.id, required this.status});
  factory DealSaved.fromJson(Json json) => DealSaved(id: _str(json['id']), status: _str(json['status'], 'DRAFT'));
  final String id;
  final String status;
}

class UploadedPhoto {
  const UploadedPhoto({required this.id, required this.url});
  factory UploadedPhoto.fromJson(Json json) => UploadedPhoto(id: _str(json['id']), url: _str(json['url']));
  final String id;
  final String url;
}
