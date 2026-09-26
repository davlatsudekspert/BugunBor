import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/account.dart';
import '../../app/links.dart';
import '../../app/providers.dart';
import '../../app/push.dart';
import '../../core/api_error.dart';
import '../../core/env.dart';
import '../../core/format.dart';
import '../../data/models.dart';
import '../../design/theme.dart';
import '../../design/widgets/common.dart';
import '../../l10n/gen/app_localizations.dart';
import '../common/pickers.dart';

const _languages = {'uz': 'O‘zbekcha', 'ru': 'Русский', 'en': 'English'};

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = L.of(context);
    final signedIn = ref.watch(sessionProvider.select((session) => session.signedIn));
    final me = ref.watch(meProvider);
    return Scaffold(
      appBar: AppBar(title: Text(l.navProfile)),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(configProvider);
          ref.invalidate(pushAllowedProvider);
          if (signedIn) await ref.refresh(meProvider.future).then((_) {}, onError: (_) {});
        },
        child: ListView(
          padding: const EdgeInsets.fromLTRB(Gap.gutter, 0, Gap.gutter, Gap.xl),
          children: [
            if (!signedIn)
              const _GuestCard()
            else
              switch (me) {
                AsyncValue(:final value?) => _AccountCard(me: value),
                AsyncValue(:final error?) => StatePanel.error(context, error, onRetry: () => ref.invalidate(meProvider)),
                _ => const Skeleton(height: 150),
              },
            const SizedBox(height: Gap.lg),
            const _Preferences(),
            if (signedIn && me.value != null) ...[
              const SizedBox(height: Gap.lg),
              _Notifications(me: me.value!),
              const SizedBox(height: Gap.lg),
              _BusinessSection(me: me.value!),
            ],
            const SizedBox(height: Gap.lg),
            const _Links(),
            if (signedIn) ...[const SizedBox(height: Gap.lg), const _AccountActions()],
            const SizedBox(height: Gap.lg),
            Center(
              child: Text(l.appVersion('${Env.version} (${Env.build})'), style: TextStyle(color: context.mutedText, fontSize: 12)),
            ),
          ],
        ),
      ),
    );
  }
}

class _Section extends StatelessWidget {
  const _Section({required this.title, required this.children});
  final String title;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: [
      Padding(
        padding: const EdgeInsets.only(left: Gap.xs, bottom: Gap.sm),
        child: Text(title, style: Theme.of(context).textTheme.titleMedium),
      ),
      Card(
        clipBehavior: Clip.antiAlias,
        child: Column(children: children),
      ),
    ],
  );
}

class _GuestCard extends StatelessWidget {
  const _GuestCard();

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(Gap.lg),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Icon(Icons.account_circle_outlined, size: 48, color: Brand.primary),
            const SizedBox(height: Gap.sm),
            Text(l.profileGuestText, textAlign: TextAlign.center, style: const TextStyle(height: 1.4)),
            const SizedBox(height: Gap.md),
            FilledButton.icon(
              style: FilledButton.styleFrom(backgroundColor: Brand.telegram),
              onPressed: () => context.push('/login'),
              icon: const Icon(Icons.send_rounded),
              label: Text(l.loginButton),
            ),
          ],
        ),
      ),
    );
  }
}

class _AccountCard extends ConsumerWidget {
  const _AccountCard({required this.me});
  final Me me;

  Future<void> _editName(BuildContext context, WidgetRef ref) async {
    final l = L.of(context);
    final controller = TextEditingController(text: me.displayName);
    final name = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(l.profileName),
        content: TextField(controller: controller, autofocus: true, maxLength: 60, textCapitalization: TextCapitalization.words),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: Text(l.cancel)),
          TextButton(onPressed: () => Navigator.pop(context, controller.text.trim()), child: Text(l.save)),
        ],
      ),
    );
    controller.dispose();
    if (name == null || name.length < 2 || name == me.displayName || !context.mounted) return;
    try {
      await ref.read(apiProvider).updateMe(displayName: name);
      ref.invalidate(meProvider);
    } catch (error) {
      if (context.mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(errorText(context, error))));
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = L.of(context);
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(Gap.lg),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                CircleAvatar(
                  radius: 26,
                  backgroundColor: Brand.primary.withValues(alpha: 0.12),
                  child: Text(
                    me.displayName.isEmpty ? '?' : me.displayName.characters.first.toUpperCase(),
                    style: TextStyle(color: context.accentText, fontWeight: FontWeight.w900, fontSize: 22),
                  ),
                ),
                const SizedBox(width: Gap.md),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(me.displayName, style: Theme.of(context).textTheme.titleLarge),
                      if (me.phone != null) Text(formatPhone(me.phone), style: TextStyle(color: context.mutedText)),
                    ],
                  ),
                ),
                IconButton(tooltip: l.profileName, icon: const Icon(Icons.edit_outlined), onPressed: () => _editName(context, ref)),
              ],
            ),
            const SizedBox(height: Gap.lg),
            Row(
              children: [
                Expanded(
                  child: _Stat(value: money(context, me.savedUzs), label: l.profileSaved),
                ),
                const SizedBox(width: Gap.md),
                Expanded(
                  child: _Stat(value: '${me.redeemed}', label: l.profileRedeemed),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _Stat extends StatelessWidget {
  const _Stat({required this.value, required this.label});
  final String value;
  final String label;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(Gap.md),
    decoration: BoxDecoration(color: Brand.primary.withValues(alpha: 0.07), borderRadius: BorderRadius.circular(14)),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        FittedBox(
          fit: BoxFit.scaleDown,
          child: Text(
            value,
            style: TextStyle(fontSize: 20, fontWeight: FontWeight.w900, color: context.accentText),
          ),
        ),
        Text(label, style: TextStyle(color: context.mutedText, fontSize: 12.5)),
      ],
    ),
  );
}

/// A short list of options in a sheet (the labels never get cut).
Future<String?> _choose(BuildContext context, String title, Map<String, String> options, String current) {
  return showModalBottomSheet<String>(
    context: context,
    showDragHandle: true,
    builder: (context) => SafeArea(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(Gap.gutter, 0, Gap.gutter, Gap.sm),
            child: Text(title, style: Theme.of(context).textTheme.titleLarge),
          ),
          RadioGroup<String>(
            groupValue: current,
            onChanged: (value) => Navigator.pop(context, value),
            child: Column(
              children: [for (final entry in options.entries) RadioListTile<String>(value: entry.key, title: Text(entry.value))],
            ),
          ),
          const SizedBox(height: Gap.sm),
        ],
      ),
    ),
  );
}

class _Preferences extends ConsumerWidget {
  const _Preferences();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = L.of(context);
    final settings = ref.watch(settingsProvider);
    final config = ref.watch(configProvider).value;
    final interests = ref.watch(interestsProvider);
    final place = settings.useLocation ? l.homeUseLocation : (config?.city(settings.city)?.name(settings.locale) ?? l.chooseCity);
    final interestNames = interests.map((slug) => config?.category(slug)?.name(settings.locale)).nonNulls.join(', ');
    final themes = {'system': l.themeSystem, 'light': l.themeLight, 'dark': l.themeDark};
    return _Section(
      title: l.profileSettings,
      children: [
        ListTile(
          leading: const Icon(Icons.translate_rounded),
          title: Text(l.profileLanguage),
          subtitle: Text(_languages[settings.locale] ?? settings.locale),
          trailing: const Icon(Icons.chevron_right_rounded),
          onTap: () async {
            final locale = await _choose(context, l.profileLanguage, _languages, settings.locale);
            if (locale != null) await ref.read(accountProvider).setLocale(locale);
          },
        ),
        ListTile(
          leading: const Icon(Icons.brightness_6_outlined),
          title: Text(l.profileTheme),
          subtitle: Text(themes[settings.theme] ?? l.themeSystem),
          trailing: const Icon(Icons.chevron_right_rounded),
          onTap: () async {
            final theme = await _choose(context, l.profileTheme, themes, settings.theme);
            if (theme != null) ref.read(settingsProvider.notifier).setTheme(theme);
          },
        ),
        ListTile(
          leading: Icon(settings.useLocation ? Icons.my_location_rounded : Icons.place_outlined),
          title: Text(l.profileCity),
          subtitle: Text(place),
          trailing: const Icon(Icons.chevron_right_rounded),
          onTap: () async {
            final choice = await showPlacePicker(context, ref);
            if (choice == null || !context.mounted) return;
            final ok = await applyPlaceChoice(ref, choice);
            if (!ok && context.mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(l.homeLocationDenied)));
          },
        ),
        ListTile(
          leading: const Icon(Icons.favorite_outline_rounded),
          title: Text(l.profileInterests),
          subtitle: interestNames.isEmpty ? null : Text(interestNames, maxLines: 2, overflow: TextOverflow.ellipsis),
          trailing: const Icon(Icons.chevron_right_rounded),
          onTap: () => context.push('/interests'),
        ),
      ],
    );
  }
}

class _Notifications extends ConsumerStatefulWidget {
  const _Notifications({required this.me});
  final Me me;

  @override
  ConsumerState<_Notifications> createState() => _NotificationsState();
}

class _NotificationsState extends ConsumerState<_Notifications> {
  /// Switches flipped here, shown before the server confirms.
  final _pending = <String, bool>{};

  Future<void> _set(String key, bool value) async {
    setState(() => _pending[key] = value);
    final api = ref.read(apiProvider);
    try {
      switch (key) {
        case 'deals':
          await api.updateMe(notifyDeals: value);
        case 'reminders':
          await api.updateMe(notifyReminders: value);
        case 'nearby':
          await api.updateMe(notifyNearby: value);
          // The area is only known while the app may use the location.
          if (value && !ref.read(settingsProvider).useLocation) {
            final granted = await applyPlaceChoice(ref, const LocationChoice());
            if (!granted && mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(L.of(context).homeLocationDenied)));
          }
          ref.invalidate(feedProvider);
      }
      ref.invalidate(meProvider);
      await ref.read(meProvider.future);
    } catch (error) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(errorText(context, error))));
    } finally {
      if (mounted) setState(() => _pending.remove(key));
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    final settings = widget.me.notifications;
    final push = ref.watch(pushProvider);
    final allowed = ref.watch(pushAllowedProvider).value ?? true;
    return _Section(
      title: l.profileNotifications,
      children: [
        if (push.available && !allowed)
          Padding(
            padding: const EdgeInsets.fromLTRB(Gap.lg, Gap.md, Gap.lg, 0),
            child: Row(
              children: [
                const Icon(Icons.notifications_off_outlined, color: Brand.warning),
                const SizedBox(width: Gap.sm),
                Expanded(
                  child: Text(
                    l.notifyPermissionOff,
                    style: const TextStyle(color: Brand.warning, fontWeight: FontWeight.w600),
                  ),
                ),
                TextButton(onPressed: () => push.enable(), child: Text(l.notifyTurnOn)),
              ],
            ),
          ),
        SwitchListTile(
          title: Text(l.notifyDeals),
          value: _pending['deals'] ?? settings.deals,
          onChanged: _pending.containsKey('deals') ? null : (value) => _set('deals', value),
        ),
        SwitchListTile(
          title: Text(l.notifyReminders),
          value: _pending['reminders'] ?? settings.reminders,
          onChanged: _pending.containsKey('reminders') ? null : (value) => _set('reminders', value),
        ),
        SwitchListTile(
          title: Text(l.notifyNearby),
          subtitle: Text(l.notifyNearbyHint, style: TextStyle(color: context.mutedText, fontSize: 12.5, height: 1.35)),
          isThreeLine: true,
          value: _pending['nearby'] ?? settings.nearby,
          onChanged: _pending.containsKey('nearby') ? null : (value) => _set('nearby', value),
        ),
      ],
    );
  }
}

class _BusinessSection extends ConsumerWidget {
  const _BusinessSection({required this.me});
  final Me me;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = L.of(context);
    final locale = ref.watch(settingsProvider.select((settings) => settings.locale));
    return _Section(
      title: l.profileForBusiness,
      children: [
        if (me.counters.isNotEmpty)
          ListTile(
            leading: const Icon(Icons.qr_code_scanner_rounded, color: Brand.primary),
            title: Text(l.profileCashier, style: const TextStyle(fontWeight: FontWeight.w700)),
            trailing: const Icon(Icons.chevron_right_rounded),
            onTap: () => context.push('/cashier'),
          ),
        ListTile(
          leading: const Icon(Icons.storefront_outlined),
          title: Text(me.memberships.isEmpty ? l.addBusiness : l.profileBusiness),
          subtitle: Text(l.profileBusinessHint),
          trailing: const Icon(Icons.open_in_new_rounded, size: 20),
          onTap: () => openSite('/business', lang: locale),
        ),
      ],
    );
  }
}

class _Links extends ConsumerWidget {
  const _Links();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = L.of(context);
    final locale = ref.watch(settingsProvider.select((settings) => settings.locale));
    final signedIn = ref.watch(sessionProvider.select((session) => session.signedIn));
    Widget link(IconData icon, String title, String path) => ListTile(
      leading: Icon(icon),
      title: Text(title),
      trailing: const Icon(Icons.open_in_new_rounded, size: 20),
      onTap: () => openSite(path, lang: locale),
    );
    return _Section(
      title: l.profileAbout,
      children: [
        if (!signedIn)
          ListTile(
            leading: const Icon(Icons.storefront_outlined),
            title: Text(l.addBusiness),
            trailing: const Icon(Icons.open_in_new_rounded, size: 20),
            onTap: () => openSite('/business', lang: locale),
          ),
        link(Icons.privacy_tip_outlined, l.privacyPolicy, '/privacy'),
        link(Icons.description_outlined, l.terms, '/terms'),
        link(Icons.support_agent_rounded, l.profileContact, '/contact'),
      ],
    );
  }
}

class _AccountActions extends ConsumerStatefulWidget {
  const _AccountActions();

  @override
  ConsumerState<_AccountActions> createState() => _AccountActionsState();
}

class _AccountActionsState extends ConsumerState<_AccountActions> {
  bool _busy = false;

  Future<bool> _confirm(String text, String action, {bool danger = true}) async {
    final l = L.of(context);
    return await showDialog<bool>(
          context: context,
          builder: (context) => AlertDialog(
            content: Text(text, style: const TextStyle(height: 1.4)),
            actions: [
              TextButton(onPressed: () => Navigator.pop(context, false), child: Text(l.cancel)),
              TextButton(
                onPressed: () => Navigator.pop(context, true),
                style: danger ? TextButton.styleFrom(foregroundColor: Colors.red.shade700) : null,
                child: Text(action),
              ),
            ],
          ),
        ) ??
        false;
  }

  Future<void> _logout() async {
    setState(() => _busy = true);
    await ref.read(accountProvider).signOut();
    if (mounted) setState(() => _busy = false);
  }

  Future<void> _delete() async {
    final l = L.of(context);
    if (!await _confirm(l.deleteAsk, l.profileDelete) || !mounted) return;
    setState(() => _busy = true);
    try {
      try {
        await ref.read(accountProvider).deleteAccount();
      } on ApiError catch (error) {
        if (error.code != 'SOLE_OWNER' || !mounted) rethrow;
        setState(() => _busy = false);
        if (!await _confirm(l.deleteSoleOwner, l.deleteCloseAndDelete) || !mounted) return;
        setState(() => _busy = true);
        await ref.read(accountProvider).deleteAccount(closeBusinesses: true);
      }
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(l.deleted)));
      context.go('/');
    } catch (error) {
      if (!mounted) return;
      setState(() => _busy = false);
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(errorText(context, error))));
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    return Card(
      clipBehavior: Clip.antiAlias,
      child: Column(
        children: [
          ListTile(leading: const Icon(Icons.logout_rounded), title: Text(l.profileLogout), enabled: !_busy, onTap: _logout),
          ListTile(
            leading: Icon(Icons.delete_outline_rounded, color: Colors.red.shade700),
            title: Text(l.profileDelete, style: TextStyle(color: Colors.red.shade700)),
            enabled: !_busy,
            onTap: _delete,
          ),
        ],
      ),
    );
  }
}
