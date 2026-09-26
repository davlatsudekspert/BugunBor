import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/account.dart';
import '../../app/providers.dart';
import '../../app/push.dart';
import '../../core/env.dart';
import '../../design/theme.dart';
import '../../l10n/gen/app_localizations.dart';
import '../common/pickers.dart';
import '../profile/interests_screen.dart';

const _languages = {'uz': 'O‘zbekcha', 'ru': 'Русский', 'en': 'English'};

/// First start: language, interests, then location and notifications, each
/// explained before the phone asks. Everything can be skipped.
class OnboardingScreen extends ConsumerStatefulWidget {
  const OnboardingScreen({super.key, this.next});

  /// Where a link wanted to go before onboarding (opened afterwards).
  final String? next;

  @override
  ConsumerState<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends ConsumerState<OnboardingScreen> {
  final _pages = PageController();
  int _page = 0;
  bool _busy = false;
  late Set<String> _interests = ref.read(settingsProvider).guestInterests.toSet();

  int get _count => Env.pushEnabled ? 4 : 3;

  @override
  void dispose() {
    _pages.dispose();
    super.dispose();
  }

  void _next() {
    if (_page == 1) ref.read(accountProvider).setInterests(_interests.toList());
    if (_page >= _count - 1) return _finish();
    _pages.nextPage(duration: const Duration(milliseconds: 260), curve: Curves.easeOut);
  }

  void _finish() {
    ref.read(settingsProvider.notifier).finishOnboarding();
    context.go('/');
    final next = widget.next;
    if (next != null && next != '/') context.push(next);
  }

  Future<void> _allowLocation() async {
    setState(() => _busy = true);
    final granted = await applyPlaceChoice(ref, const LocationChoice());
    if (!mounted) return;
    setState(() => _busy = false);
    if (granted) {
      _next();
    } else {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(L.of(context).homeLocationDenied)));
      await _chooseCity();
    }
  }

  Future<void> _chooseCity() async {
    final choice = await showPlacePicker(context, ref, offerLocation: false);
    if (choice == null || !mounted) return;
    await applyPlaceChoice(ref, choice);
    if (mounted) _next();
  }

  Future<void> _allowPush() async {
    setState(() => _busy = true);
    await ref.read(pushProvider).enable();
    if (!mounted) return;
    setState(() => _busy = false);
    _finish();
  }

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    final pages = [
      _welcome(context),
      _Step(
        icon: Icons.favorite_rounded,
        title: l.onbInterestsTitle,
        text: l.onbInterestsText,
        body: InterestPicker(selected: _interests, onChanged: (value) => setState(() => _interests = value)),
      ),
      _Step(icon: Icons.near_me_rounded, title: l.onbLocationTitle, text: l.onbLocationText),
      if (Env.pushEnabled) _Step(icon: Icons.notifications_active_rounded, title: l.onbNotifyTitle, text: l.onbNotifyText),
    ];
    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(Gap.gutter, Gap.sm, Gap.sm, 0),
              child: Row(
                children: [
                  for (var index = 0; index < _count; index++)
                    AnimatedContainer(
                      duration: const Duration(milliseconds: 200),
                      margin: const EdgeInsets.only(right: 6),
                      width: index == _page ? 22 : 8,
                      height: 8,
                      decoration: BoxDecoration(color: index <= _page ? Brand.primary : context.borderColor, borderRadius: BorderRadius.circular(99)),
                    ),
                  const Spacer(),
                  if (_page > 0) TextButton(onPressed: _busy ? null : _finish, child: Text(l.skip)),
                ],
              ),
            ),
            Expanded(
              child: PageView(
                controller: _pages,
                physics: const NeverScrollableScrollPhysics(),
                onPageChanged: (page) => setState(() => _page = page),
                children: pages,
              ),
            ),
            Padding(padding: const EdgeInsets.fromLTRB(Gap.gutter, Gap.sm, Gap.gutter, Gap.lg), child: _actions(context)),
          ],
        ),
      ),
    );
  }

  Widget _actions(BuildContext context) {
    final l = L.of(context);
    Widget busy(String label) =>
        _busy ? const SizedBox.square(dimension: 22, child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white)) : Text(label);
    return switch (_page) {
      0 => FilledButton(onPressed: _next, child: Text(l.next)),
      1 => FilledButton(onPressed: _next, child: Text(l.next)),
      2 => Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          FilledButton.icon(onPressed: _busy ? null : _allowLocation, icon: const Icon(Icons.my_location_rounded), label: busy(l.onbLocationAllow)),
          const SizedBox(height: Gap.sm),
          OutlinedButton(onPressed: _busy ? null : _chooseCity, child: Text(l.onbLocationCity)),
        ],
      ),
      _ => Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          FilledButton.icon(onPressed: _busy ? null : _allowPush, icon: const Icon(Icons.notifications_active_outlined), label: busy(l.onbNotifyAllow)),
          const SizedBox(height: Gap.sm),
          TextButton(onPressed: _busy ? null : _finish, child: Text(l.onbLater)),
        ],
      ),
    };
  }

  Widget _welcome(BuildContext context) {
    final l = L.of(context);
    final locale = ref.watch(settingsProvider.select((settings) => settings.locale));
    final steps = [l.onbStep1, l.onbStep2, l.onbStep3];
    return ListView(
      padding: const EdgeInsets.fromLTRB(Gap.gutter, Gap.xl, Gap.gutter, Gap.lg),
      children: [
        Container(
          width: 64,
          height: 64,
          alignment: Alignment.centerLeft,
          child: Container(
            width: 64,
            height: 64,
            decoration: BoxDecoration(color: Brand.primary, borderRadius: BorderRadius.circular(18)),
            child: const Icon(Icons.local_offer_rounded, color: Colors.white, size: 34),
          ),
        ),
        const SizedBox(height: Gap.lg),
        Text(l.onbWelcomeTitle, style: Theme.of(context).textTheme.headlineMedium),
        const SizedBox(height: Gap.sm),
        Text(l.onbWelcomeText, style: TextStyle(color: context.mutedText, fontSize: 16, height: 1.45)),
        const SizedBox(height: Gap.lg),
        for (var index = 0; index < steps.length; index++)
          Padding(
            padding: const EdgeInsets.only(bottom: Gap.sm),
            child: Row(
              children: [
                CircleAvatar(
                  radius: 15,
                  backgroundColor: Brand.primary.withValues(alpha: 0.12),
                  child: Text(
                    '${index + 1}',
                    style: TextStyle(color: context.accentText, fontWeight: FontWeight.w900),
                  ),
                ),
                const SizedBox(width: Gap.md),
                Expanded(
                  child: Text(steps[index], style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                ),
              ],
            ),
          ),
        const SizedBox(height: Gap.xl),
        Text(l.onbLanguage, style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: Gap.sm),
        SegmentedButton<String>(
          showSelectedIcon: false,
          segments: [
            for (final entry in _languages.entries)
              ButtonSegment(
                value: entry.key,
                label: Text(entry.value, maxLines: 1, overflow: TextOverflow.ellipsis),
              ),
          ],
          selected: {locale},
          onSelectionChanged: (value) => ref.read(accountProvider).setLocale(value.first),
        ),
      ],
    );
  }
}

class _Step extends StatelessWidget {
  const _Step({required this.icon, required this.title, required this.text, this.body});
  final IconData icon;
  final String title;
  final String text;
  final Widget? body;

  @override
  Widget build(BuildContext context) => ListView(
    padding: const EdgeInsets.fromLTRB(Gap.gutter, Gap.xl, Gap.gutter, Gap.lg),
    children: [
      Align(
        alignment: Alignment.centerLeft,
        child: Container(
          width: 64,
          height: 64,
          decoration: BoxDecoration(color: Brand.primary.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(18)),
          child: Icon(icon, color: Brand.primary, size: 32),
        ),
      ),
      const SizedBox(height: Gap.lg),
      Text(title, style: Theme.of(context).textTheme.headlineSmall),
      const SizedBox(height: Gap.sm),
      Text(text, style: TextStyle(color: context.mutedText, fontSize: 16, height: 1.45)),
      if (body != null) ...[const SizedBox(height: Gap.xl), body!],
    ],
  );
}
