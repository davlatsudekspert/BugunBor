import 'package:flutter/material.dart';

import '../theme.dart';

// Small pieces shared by the app's forms (business registration, deals).

/// Error text that stays readable in both themes.
Color errorColor(BuildContext context) => context.isDark ? const Color(0xFFFF8A80) : const Color(0xFFB3261E);

/// A field's error under something that is not a text field (chips, lists).
class FieldError extends StatelessWidget {
  const FieldError(this.text, {super.key});
  final String text;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(top: Gap.xs, left: Gap.md),
    child: Text(text, style: TextStyle(color: errorColor(context), fontSize: 12)),
  );
}

/// A small icon and a line of text under a field.
class NoteLine extends StatelessWidget {
  const NoteLine({super.key, required this.icon, required this.color, required this.text});
  final IconData icon;
  final Color color;
  final String text;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(horizontal: Gap.xs),
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 18, color: color),
        const SizedBox(width: Gap.sm),
        Expanded(
          child: Text(text, style: TextStyle(color: color, fontSize: 13, height: 1.35)),
        ),
      ],
    ),
  );
}

/// A form field that opens a picker (city, date, time) instead of the keyboard.
class TapField extends StatelessWidget {
  const TapField({super.key, required this.label, required this.value, required this.icon, required this.onTap, this.error});
  final String label;
  final String value;
  final IconData icon;
  final VoidCallback onTap;
  final String? error;

  @override
  Widget build(BuildContext context) => Semantics(
    button: true,
    label: '$label: $value',
    excludeSemantics: true,
    child: InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: InputDecorator(
        isEmpty: value.isEmpty,
        decoration: InputDecoration(labelText: label, errorText: error, suffixIcon: Icon(icon)),
        child: Text(value, style: const TextStyle(fontSize: 16)),
      ),
    ),
  );
}
