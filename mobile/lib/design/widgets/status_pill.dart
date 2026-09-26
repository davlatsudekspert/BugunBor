import 'package:flutter/material.dart';

import '../theme.dart';

enum Tone { success, warning, danger, neutral }

/// Text and tint for a tone, readable (4.5:1+) in both themes.
Color toneColor(BuildContext context, Tone tone) => switch (tone) {
  Tone.success => context.isDark ? const Color(0xFF34D399) : const Color(0xFF006B47),
  Tone.warning => context.isDark ? const Color(0xFFFBBF24) : const Color(0xFF92400E),
  Tone.danger => context.isDark ? const Color(0xFFFF8A80) : const Color(0xFFB3261E),
  Tone.neutral => context.mutedText,
};

/// A short status in a tinted pill.
class StatusPill extends StatelessWidget {
  const StatusPill({super.key, required this.text, required this.tone});
  final String text;
  final Tone tone;

  @override
  Widget build(BuildContext context) {
    final color = toneColor(context, tone);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
      decoration: BoxDecoration(color: color.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(999)),
      child: Text(
        text,
        style: TextStyle(color: color, fontSize: 12.5, fontWeight: FontWeight.w800),
      ),
    );
  }
}
