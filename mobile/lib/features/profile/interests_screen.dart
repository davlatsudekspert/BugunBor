import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/account.dart';
import '../../app/providers.dart';
import '../../data/models.dart';
import '../../design/icons.dart';
import '../../design/theme.dart';
import '../../design/widgets/common.dart';
import '../../l10n/gen/app_localizations.dart';

/// Category chips; the chosen ones fill "For you" on the home screen and
/// drive "new deal nearby" notifications.
class InterestPicker extends ConsumerWidget {
  const InterestPicker({super.key, required this.selected, required this.onChanged});
  final Set<String> selected;
  final ValueChanged<Set<String>> onChanged;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final config = ref.watch(configProvider);
    final locale = ref.watch(settingsProvider.select((settings) => settings.locale));
    final categories = config.value?.categories ?? const <Category>[];
    if (categories.isEmpty) {
      if (config.hasError) return StatePanel.error(context, config.error!, onRetry: () => ref.invalidate(configProvider));
      return const Padding(
        padding: EdgeInsets.all(Gap.xl),
        child: Center(child: CircularProgressIndicator()),
      );
    }
    return Wrap(
      spacing: Gap.sm,
      runSpacing: Gap.sm,
      children: [
        for (final category in categories)
          FilterChip(
            avatar: Icon(iconFor(category.icon), size: 18, color: selected.contains(category.slug) ? Colors.white : Brand.primary),
            label: Text(category.name(locale)),
            selected: selected.contains(category.slug),
            showCheckmark: false,
            onSelected: (on) => onChanged(on ? {...selected, category.slug} : ({...selected}..remove(category.slug))),
          ),
      ],
    );
  }
}

class InterestsScreen extends ConsumerStatefulWidget {
  const InterestsScreen({super.key});

  @override
  ConsumerState<InterestsScreen> createState() => _InterestsScreenState();
}

class _InterestsScreenState extends ConsumerState<InterestsScreen> {
  late Set<String> _selected = ref.read(interestsProvider).toSet();
  bool _saving = false;

  Future<void> _save() async {
    setState(() => _saving = true);
    try {
      await ref.read(accountProvider).setInterests(_selected.toList());
      if (mounted) context.pop();
    } catch (error) {
      if (!mounted) return;
      setState(() => _saving = false);
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(errorText(context, error))));
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    return Scaffold(
      appBar: AppBar(title: Text(l.profileInterests)),
      body: ListView(
        padding: const EdgeInsets.all(Gap.gutter),
        children: [
          Text(l.onbInterestsText, style: TextStyle(color: context.mutedText, height: 1.4)),
          const SizedBox(height: Gap.lg),
          InterestPicker(selected: _selected, onChanged: (value) => setState(() => _selected = value)),
        ],
      ),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(Gap.gutter),
          child: FilledButton(
            onPressed: _saving ? null : _save,
            child: _saving ? const SizedBox.square(dimension: 22, child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white)) : Text(l.save),
          ),
        ),
      ),
    );
  }
}
