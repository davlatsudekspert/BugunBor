/// The server sends times as UTC `YYYY-MM-DD HH:MM:SS` (no zone mark); login
/// expiry comes as ISO 8601. Both become UTC [DateTime]s here.
DateTime parseServerTime(String value) {
  final iso = value.contains('T') ? value : value.replaceFirst(' ', 'T');
  return DateTime.parse(iso.endsWith('Z') || iso.contains('+') ? iso : '${iso}Z');
}

DateTime? parseServerTimeOrNull(Object? value) => value is String && value.isNotEmpty ? parseServerTime(value) : null;

/// Tashkent is UTC+5 all year (no daylight saving).
DateTime toTashkent(DateTime utc) => utc.toUtc().add(const Duration(hours: 5));
