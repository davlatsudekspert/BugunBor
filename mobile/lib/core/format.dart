import 'dart:math' as math;

/// 1234567 → "1 234 567" (thin grouping as on the site).
String groupDigits(int value) {
  final digits = value.abs().toString();
  final buffer = StringBuffer(value < 0 ? '−' : '');
  for (var index = 0; index < digits.length; index++) {
    if (index > 0 && (digits.length - index) % 3 == 0) buffer.write(' ');
    buffer.write(digits[index]);
  }
  return buffer.toString();
}

/// "450 m" under a kilometre, "1,2 km" / "12 km" above.
({String value, bool meters}) formatDistance(double km) {
  if (km < 1) return (value: '${(math.max(km * 1000, 50) / 50).round() * 50}', meters: true);
  if (km < 10) return (value: km.toStringAsFixed(1).replaceAll('.', ','), meters: false);
  return (value: '${km.round()}', meters: false);
}

/// Time left as "2:05:09" (with days handled by the caller).
String formatClock(Duration left) {
  final clamped = left.isNegative ? Duration.zero : left;
  final hours = clamped.inHours % 24;
  final minutes = clamped.inMinutes % 60;
  final seconds = clamped.inSeconds % 60;
  String two(int value) => value.toString().padLeft(2, '0');
  return '$hours:${two(minutes)}:${two(seconds)}';
}

/// "K7P2QX" → "K7P 2QX".
String formatCode(String code) => code.length == 6 ? '${code.substring(0, 3)} ${code.substring(3)}' : code;

/// +998 90 123 45 67
String formatPhone(String? phone) {
  if (phone == null) return '';
  final digits = phone.replaceAll(RegExp(r'\D'), '');
  if (digits.length == 12 && digits.startsWith('998')) {
    return '+998 ${digits.substring(3, 5)} ${digits.substring(5, 8)} ${digits.substring(8, 10)} ${digits.substring(10)}';
  }
  return phone;
}
