import 'dart:convert';

import 'time.dart';

/// A branch's opening hours on Tashkent clocks, as the site keeps them
/// (lib/hours.ts): `{"open":"09:00","close":"22:00"}` or the older
/// `{"mon-sun":"10:00-23:00"}`. Overnight hours (18:00–02:00) work, and
/// open == close means all day.
class WorkingHours {
  const WorkingHours(this.open, this.close);

  final String open;
  final String close;

  static final _time = RegExp(r'^([01]\d|2[0-3]):[0-5]\d$');

  static WorkingHours? parse(String? json) {
    if (json == null || json.isEmpty) return null;
    Object? value;
    try {
      value = jsonDecode(json);
    } catch (_) {
      return null;
    }
    if (value is! Map) return null;
    final open = value['open'];
    final close = value['close'];
    if (open is String && close is String && _time.hasMatch(open) && _time.hasMatch(close)) return WorkingHours(open, close);
    for (final entry in value.values) {
      if (entry is! String) continue;
      final match = RegExp(r'^(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})$').firstMatch(entry.trim());
      if (match != null && _time.hasMatch(match.group(1)!) && _time.hasMatch(match.group(2)!)) return WorkingHours(match.group(1)!, match.group(2)!);
    }
    return null;
  }

  bool get allDay => open == close;

  static int _minutes(String time) => int.parse(time.substring(0, 2)) * 60 + int.parse(time.substring(3, 5));

  static int _nowMinutes(DateTime utc) {
    final wall = toTashkent(utc);
    return wall.hour * 60 + wall.minute;
  }

  bool isOpenAt(DateTime utc) {
    if (allDay) return true;
    final now = _nowMinutes(utc);
    final from = _minutes(open);
    final to = _minutes(close);
    return from < to ? now >= from && now < to : now >= from || now < to;
  }

  /// Minutes until it next opens; 0 while it is open.
  int minutesUntilOpen(DateTime utc) => isOpenAt(utc) ? 0 : (_minutes(open) - _nowMinutes(utc) + 1440) % 1440;
}
