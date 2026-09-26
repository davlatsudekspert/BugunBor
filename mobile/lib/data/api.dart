import 'package:dio/dio.dart';

import '../core/api_error.dart';
import '../core/env.dart';
import 'models.dart';

/// Everything the app asks the BugunBor server. Every call sends
/// `x-app: bugunbor`, the build number and the UI language; signed-in calls
/// add `Authorization: Bearer <token>`. Errors become [ApiError].
class BugunBorApi {
  BugunBorApi({required this._locale, required this._token, required this._onUnauthorized, Dio? dio, String baseUrl = Env.apiBase})
    : _dio =
          dio ??
          Dio(
            BaseOptions(
              baseUrl: baseUrl,
              connectTimeout: const Duration(seconds: 15),
              receiveTimeout: const Duration(seconds: 20),
              sendTimeout: const Duration(seconds: 20),
              // Every status comes back as a response; errors are mapped below.
              validateStatus: (_) => true,
              responseType: ResponseType.json,
            ),
          );

  final Dio _dio;
  final String Function() _locale;
  final String? Function() _token;
  final void Function() _onUnauthorized;

  Map<String, String> headers({bool withAuth = true}) {
    final token = withAuth ? _token() : null;
    final locale = _locale();
    return {
      'x-app': 'bugunbor',
      'x-app-build': '${Env.build}',
      // The server speaks Uzbek and Russian; English screens use the app's own texts.
      'x-locale': locale == 'ru' ? 'ru' : 'uz',
      'accept': 'application/json',
      if (token != null) 'authorization': 'Bearer $token',
    };
  }

  Future<Json> _request(
    String method,
    String path, {
    Object? body,
    Map<String, Object?>? query,
    Map<String, String>? extra,
    bool withAuth = true,
    Duration? sendTimeout,
  }) async {
    final Response<dynamic> response;
    try {
      response = await _dio.request<dynamic>(
        path,
        data: body,
        queryParameters: query == null
            ? null
            : {
                for (final entry in query.entries)
                  if (entry.value != null) entry.key: entry.value,
              },
        options: Options(
          method: method,
          sendTimeout: sendTimeout,
          headers: {
            ...headers(withAuth: withAuth),
            // A form upload sets its own multipart type.
            if (body != null && body is! FormData) 'content-type': 'application/json',
            ...?extra,
          },
        ),
      );
    } on DioException catch (error) {
      if (error.type == DioExceptionType.badResponse && error.response != null) {
        throw _fromResponse(error.response!);
      }
      throw const ApiError('NETWORK');
    }
    final status = response.statusCode ?? 0;
    if (status >= 200 && status < 300) {
      final data = response.data;
      if (data is Map) return data.cast<String, dynamic>();
      throw ApiError('SERVER', status: status);
    }
    throw _fromResponse(response);
  }

  ApiError _fromResponse(Response<dynamic> response) {
    final status = response.statusCode ?? 0;
    final data = response.data;
    final error = data is Map && data['error'] is Map ? (data['error'] as Map).cast<String, dynamic>() : const <String, dynamic>{};
    final code = error['code'] is String
        ? error['code'] as String
        : (status == 401
              ? 'UNAUTHENTICATED'
              : status == 404
              ? 'NOT_FOUND'
              : 'SERVER');
    final fields = error['fields'] is Map
        ? {for (final entry in (error['fields'] as Map<dynamic, dynamic>).entries) '${entry.key}': '${entry.value}'}
        : const <String, String>{};
    final apiError = ApiError(code, message: error['message'] as String?, status: status, fields: fields);
    if (code == 'UNAUTHENTICATED' && _token() != null) _onUnauthorized();
    return apiError;
  }

  Json _data(Json body) => body['data'] is Map ? (body['data'] as Map).cast<String, dynamic>() : const {};
  List<dynamic> _dataList(Json body) => body['data'] is List ? body['data'] as List<dynamic> : const [];

  // Catalogue ---------------------------------------------------------------

  Future<AppConfig> config() async => AppConfig.fromJson(_data(await _request('GET', '/api/v1/config')));

  Future<Feed> feed({double? lat, double? lng, String? city, List<String> interests = const []}) async => Feed.fromJson(
    _data(await _request('GET', '/api/v1/feed', query: {'lat': lat, 'lng': lng, 'city': city, if (interests.isNotEmpty) 'interests': interests.join(',')})),
  );

  Future<DealPage> deals({String? city, String? category, String? query, String? sort, double? lat, double? lng, int limit = 24, int offset = 0}) async {
    final body = await _request(
      'GET',
      '/api/v1/deals',
      query: {
        'city': city,
        'category': category,
        'q': (query ?? '').trim().isEmpty ? null : query!.trim(),
        'sort': sort,
        'lat': lat,
        'lng': lng,
        'limit': limit,
        'offset': offset,
      },
    );
    final page = body['page'] is Map ? (body['page'] as Map).cast<String, dynamic>() : const <String, dynamic>{};
    return DealPage(
      items: _dataList(body).whereType<Map<dynamic, dynamic>>().map((item) => DealCard.fromJson(item.cast<String, dynamic>())).toList(),
      total: page['total'] is num ? (page['total'] as num).toInt() : 0,
    );
  }

  Future<DealDetail> deal(String slug) async => DealDetail.fromJson(_data(await _request('GET', '/api/v1/deals/${Uri.encodeComponent(slug)}')));

  Future<BusinessPage> business(String slug) async => BusinessPage.fromJson(_data(await _request('GET', '/api/v1/businesses/${Uri.encodeComponent(slug)}')));

  Future<void> countView(String dealId) async {
    if (Env.e2e) return;
    await _request('POST', '/api/v1/deals/${Uri.encodeComponent(dealId)}/view', withAuth: false).catchError((_) => <String, dynamic>{});
  }

  // Sign-in -----------------------------------------------------------------

  Future<LoginStart> startLogin() async =>
      LoginStart.fromJson(_data(await _request('POST', '/api/v1/auth/telegram/start', body: {'client': 'app', 'consent': true}, withAuth: false)));

  Future<LoginStatus> loginStatus(String loginSecret) async =>
      LoginStatus.fromJson(_data(await _request('GET', '/api/v1/auth/telegram/status', extra: {'x-login-secret': loginSecret}, withAuth: false)));

  Future<String> reviewLogin(String code) async => '${_data(await _request('POST', '/api/v1/auth/review', body: {'code': code}, withAuth: false))['token']}';

  Future<void> logout() async => _request('POST', '/api/v1/auth/logout');

  // The signed-in customer --------------------------------------------------

  Future<Me> me() async => Me.fromJson(_data(await _request('GET', '/api/v1/me')));

  Future<void> updateMe({String? displayName, String? locale, bool? notifyDeals, bool? notifyReminders, bool? notifyNearby}) => _request(
    'PATCH',
    '/api/v1/me',
    body: {'displayName': ?displayName, 'locale': ?locale, 'notifyDeals': ?notifyDeals, 'notifyReminders': ?notifyReminders, 'notifyNearby': ?notifyNearby},
  );

  Future<void> deleteAccount({bool closeBusinesses = false}) => _request('DELETE', '/api/v1/me', body: {'closeBusinesses': closeBusinesses});

  Future<List<Redemption>> myCodes() async =>
      _dataList(await _request('GET', '/api/v1/me/redemptions'))
          .whereType<Map<dynamic, dynamic>>()
          .map((item) => Redemption.fromJson(item.cast<String, dynamic>()))
          .toList();

  Future<Favorites> favorites() async => Favorites.fromJson(_data(await _request('GET', '/api/v1/me/favorites')));

  Future<List<FollowedBusiness>> follows() async =>
      _dataList(await _request('GET', '/api/v1/me/follows'))
          .whereType<Map<dynamic, dynamic>>()
          .map((item) => FollowedBusiness.fromJson(item.cast<String, dynamic>()))
          .toList();

  Future<List<String>> setInterests(List<String> slugs) async =>
      ((_data(await _request('PUT', '/api/v1/me/interests', body: {'categories': slugs}))['interests'] as List?) ?? const []).map((slug) => '$slug').toList();

  Future<void> registerDevice(String token, {required String locale}) =>
      _request('PUT', '/api/v1/me/devices', body: {'token': token, 'platform': 'android', 'locale': locale});

  Future<void> removeDevice(String token) => _request('DELETE', '/api/v1/me/devices', body: {'token': token});

  Future<void> setBlocked(String businessId, bool blocked) => _request(blocked ? 'PUT' : 'DELETE', '/api/v1/me/blocks/${Uri.encodeComponent(businessId)}');

  // Actions -----------------------------------------------------------------

  Future<ClaimResult> claim(String dealId, {required String branchId, required String idempotencyKey}) async => ClaimResult.fromJson(
    _data(
      await _request(
        'POST',
        '/api/v1/deals/${Uri.encodeComponent(dealId)}/redemptions',
        body: {'branchId': branchId},
        extra: {'idempotency-key': idempotencyKey},
      ),
    ),
  );

  Future<void> cancelCode(String redemptionId) => _request('POST', '/api/v1/redemptions/${Uri.encodeComponent(redemptionId)}/cancel');

  Future<bool> setFavorite(String dealId, bool saved) async =>
      _data(await _request(saved ? 'PUT' : 'DELETE', '/api/v1/favorites/${Uri.encodeComponent(dealId)}'))['saved'] == true;

  Future<({bool following, int followers})> setFollowing(String businessId, bool follow) async {
    final data = _data(await _request(follow ? 'PUT' : 'DELETE', '/api/v1/follows/${Uri.encodeComponent(businessId)}'));
    return (following: data['following'] == true, followers: data['followers'] is num ? (data['followers'] as num).toInt() : 0);
  }

  Future<void> rate(String redemptionId, int rating, String? comment) => _request(
    'POST',
    '/api/v1/reviews',
    body: {'redemptionId': redemptionId, 'rating': rating, if (comment != null && comment.trim().isNotEmpty) 'comment': comment.trim()},
  );

  Future<void> report({required String targetType, required String targetId, required String reason, String? comment}) => _request(
    'POST',
    '/api/v1/reports',
    body: {'targetType': targetType, 'targetId': targetId, 'reason': reason, if (comment != null && comment.trim().isNotEmpty) 'comment': comment.trim()},
  );

  // Business ----------------------------------------------------------------

  /// Registration: [body] is what the site's onboarding form sends.
  Future<BusinessCreated> createBusiness(Map<String, Object?> body) async =>
      BusinessCreated.fromJson(_data(await _request('POST', '/api/v1/businesses', body: body)));

  Future<BusinessWorkspace> businessWorkspace(String businessId) async =>
      BusinessWorkspace.fromJson(_data(await _request('GET', '/api/v1/business/${Uri.encodeComponent(businessId)}')));

  String _business(String businessId) => '/api/v1/business/${Uri.encodeComponent(businessId)}';

  Future<List<BusinessDeal>> businessDeals(String businessId) async =>
      _dataList(await _request('GET', '${_business(businessId)}/deals'))
          .whereType<Map<dynamic, dynamic>>()
          .map((item) => BusinessDeal.fromJson(item.cast<String, dynamic>()))
          .toList();

  Future<EditableDeal> businessDeal(String businessId, String dealId) async =>
      EditableDeal.fromJson(_data(await _request('GET', '${_business(businessId)}/deals/${Uri.encodeComponent(dealId)}')));

  /// A new deal, or changes to a draft; [submit] sends it for review too.
  Future<DealSaved> saveDeal(String businessId, Map<String, Object?> input, {String? dealId, required bool submit}) async => DealSaved.fromJson(
    _data(
      await _request(
        'POST',
        _business(businessId),
        body: dealId == null
            ? {'type': 'deal.create', 'input': input, 'submit': submit}
            : {'type': 'deal.update', 'dealId': dealId, 'input': input, 'submit': submit},
      ),
    ),
  );

  /// submit, withdraw, pause, resume, end or delete; returns the new status.
  Future<String> dealAction(String businessId, String dealId, String action) async {
    final data = _data(await _request('POST', _business(businessId), body: {'type': 'deal.transition', 'dealId': dealId, 'action': action}));
    return '${data['status']}';
  }

  /// A copy as a new draft; returns its id.
  Future<String> duplicateDeal(String businessId, String dealId) async =>
      '${_data(await _request('POST', _business(businessId), body: {'type': 'deal.duplicate', 'dealId': dealId}))['id']}';

  /// A photo already made small on the phone (JPEG, at most ~650 KB).
  Future<UploadedPhoto> uploadPhoto(String businessId, List<int> bytes, {String kind = 'DEAL'}) async => UploadedPhoto.fromJson(
    _data(
      await _request(
        'POST',
        '${_business(businessId)}/media',
        body: FormData.fromMap({'kind': kind, 'file': MultipartFile.fromBytes(bytes, filename: 'photo.jpg', contentType: DioMediaType('image', 'jpeg'))}),
        sendTimeout: const Duration(seconds: 90),
      ),
    ),
  );

  // Counter (business staff) -------------------------------------------------

  Future<CodeLookup> lookupCode(String businessId, String code) async =>
      CodeLookup.fromJson(_data(await _request('POST', '/api/v1/business/${Uri.encodeComponent(businessId)}', body: {'type': 'redeem.lookup', 'code': code})));

  Future<void> completeCode(String businessId, String redemptionId) =>
      _request('POST', '/api/v1/business/${Uri.encodeComponent(businessId)}', body: {'type': 'redeem.complete', 'redemptionId': redemptionId});
}
