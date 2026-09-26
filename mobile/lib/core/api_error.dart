/// A failed API call. [code] is the server's error code (e.g. `SOLD_OUT`),
/// or `NETWORK` / `SERVER` / `UNAUTHENTICATED` from the client itself.
class ApiError implements Exception {
  const ApiError(this.code, {this.message, this.status});

  final String code;

  /// Localized text from the server (Uzbek or Russian), when it sent one.
  final String? message;
  final int? status;

  bool get isNetwork => code == 'NETWORK';
  bool get isUnauthenticated => code == 'UNAUTHENTICATED';
  bool get isNotFound => code == 'NOT_FOUND' || status == 404;

  @override
  String toString() => 'ApiError($code, $status, $message)';
}
