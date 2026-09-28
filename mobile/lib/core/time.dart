/// The server sends times as UTC `YYYY-MM-DD HH:MM:SS` (no zone mark); login
/// expiry comes as ISO 8601. Both become UTC [DateTime]s here.
DateTime parseServerTime(String value) {
  final iso = value.contains('T') ? value : value.replaceFirst(' ', 'T');
  return DateTime.parse(iso.endsWith('Z') || iso.contains('+') ? iso : '${iso}Z');
}

DateTime? parseServerTimeOrNull(Object? value) => value is String && value.isNotEmpty ? parseServerTime(value) : null;

/// Tashkent is UTC+5 all year (no daylight saving).
DateTime toTashkent(DateTime utc) => utc.toUtc().add(const Duration(hours: 5));

/// A moment for people, on Tashkent clocks: "25.09 15:00", with the year when
/// it is not this year's.
String momentLabel(DateTime utc, {DateTime? now}) {
  final wall = toTashkent(utc);
  final year = toTashkent(now ?? DateTime.now().toUtc()).year == wall.year ? '' : '.${wall.year}';
  String two(int value) => value.toString().padLeft(2, '0');
  return '${two(wall.day)}.${two(wall.month)}$year ${two(wall.hour)}:${two(wall.minute)}';
}
