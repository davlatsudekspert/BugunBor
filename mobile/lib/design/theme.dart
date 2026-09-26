import 'package:flutter/material.dart';

/// Colours from the site (app/globals.css): milky cream background, navy
/// text, orange accent. The dark theme keeps the same accent.
class Brand {
  const Brand._();
  static const primary = Color(0xFFF55937);
  static const navy = Color(0xFF152A3B);
  static const navySoft = Color(0xFF1E3A50);
  static const cream = Color(0xFFFFFDF9);
  static const sand = Color(0xFFF8F1E8);
  static const border = Color(0xFFE9E2D8);
  static const muted = Color(0xFF5D6B7A);
  static const success = Color(0xFF059669);
  static const warning = Color(0xFFB45309);
  static const telegram = Color(0xFF229ED9);

  static const darkBackground = Color(0xFF0E1A24);
  static const darkSurface = Color(0xFF16263A);
  static const darkBorder = Color(0xFF26384A);
  static const darkText = Color(0xFFEAF0F5);
  static const darkMuted = Color(0xFF9FB0C0);
}

/// Spacing on a 4-point grid and the 16 px screen gutter.
class Gap {
  const Gap._();
  static const xs = 4.0;
  static const sm = 8.0;
  static const md = 12.0;
  static const lg = 16.0;
  static const xl = 24.0;
  static const gutter = 16.0;
  static const radius = 18.0;

  /// Nothing tappable is smaller than this.
  static const tap = 48.0;
}

ThemeData buildTheme(Brightness brightness) {
  final dark = brightness == Brightness.dark;
  final scheme = ColorScheme.fromSeed(
    seedColor: Brand.primary,
    brightness: brightness,
    primary: Brand.primary,
    onPrimary: Colors.white,
    surface: dark ? Brand.darkSurface : Colors.white,
    onSurface: dark ? Brand.darkText : Brand.navy,
    outline: dark ? Brand.darkBorder : Brand.border,
  );
  final text = (dark ? Typography.material2021().white : Typography.material2021().black).apply(
    bodyColor: dark ? Brand.darkText : Brand.navy,
    displayColor: dark ? Brand.darkText : Brand.navy,
  );
  final shape = RoundedRectangleBorder(borderRadius: BorderRadius.circular(14));
  return ThemeData(
    useMaterial3: true,
    colorScheme: scheme,
    brightness: brightness,
    scaffoldBackgroundColor: dark ? Brand.darkBackground : Brand.cream,
    textTheme: text.copyWith(
      headlineMedium: text.headlineMedium?.copyWith(fontWeight: FontWeight.w900, letterSpacing: -0.8),
      headlineSmall: text.headlineSmall?.copyWith(fontWeight: FontWeight.w900, letterSpacing: -0.6),
      titleLarge: text.titleLarge?.copyWith(fontWeight: FontWeight.w800),
      titleMedium: text.titleMedium?.copyWith(fontWeight: FontWeight.w700),
    ),
    appBarTheme: AppBarTheme(
      backgroundColor: dark ? Brand.darkBackground : Brand.cream,
      foregroundColor: dark ? Brand.darkText : Brand.navy,
      elevation: 0,
      scrolledUnderElevation: 0.5,
      centerTitle: false,
    ),
    cardTheme: CardThemeData(
      color: dark ? Brand.darkSurface : Colors.white,
      elevation: 0,
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(Gap.radius),
        side: BorderSide(color: dark ? Brand.darkBorder : Brand.border),
      ),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        minimumSize: const Size(Gap.tap, 52),
        shape: shape,
        textStyle: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        minimumSize: const Size(Gap.tap, Gap.tap),
        shape: shape,
        textStyle: const TextStyle(fontWeight: FontWeight.w700),
      ),
    ),
    textButtonTheme: TextButtonThemeData(style: TextButton.styleFrom(minimumSize: const Size(Gap.tap, Gap.tap))),
    iconButtonTheme: IconButtonThemeData(style: IconButton.styleFrom(minimumSize: const Size(Gap.tap, Gap.tap))),
    chipTheme: ChipThemeData(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
      side: BorderSide(color: dark ? Brand.darkBorder : Brand.border),
      labelStyle: const TextStyle(fontWeight: FontWeight.w700),
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: dark ? Brand.darkSurface : Colors.white,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: BorderSide(color: dark ? Brand.darkBorder : Brand.border),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: BorderSide(color: dark ? Brand.darkBorder : Brand.border),
      ),
    ),
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: dark ? Brand.darkSurface : Colors.white,
      indicatorColor: Brand.primary.withValues(alpha: 0.14),
      labelTextStyle: WidgetStateProperty.all(const TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
    ),
    snackBarTheme: const SnackBarThemeData(behavior: SnackBarBehavior.floating),
  );
}

extension ThemeX on BuildContext {
  bool get isDark => Theme.of(this).brightness == Brightness.dark;
  Color get mutedText => isDark ? Brand.darkMuted : Brand.muted;
  Color get borderColor => isDark ? Brand.darkBorder : Brand.border;
}
