import 'package:flutter/cupertino.dart';
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
import '../deals/photo.dart';
import '../workspace/workspace_view.dart';

const _languages = {'uz': 'O‘zbekcha', 'ru': 'Русский', 'en': 'English'};

/// The Profile tab. For business members it has two sides: the business
/// profile (shown first) and the personal one.
class ProfileScreen extends ConsumerStatefulWidget {
  const ProfileScreen({super.key, this.businessId});

  /// Opens this business's profile (from an "approved" notification).
  final String? businessId;

  @override
  ConsumerState<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends ConsumerState<ProfileScreen> {
  String? _shown;

  void _showRequested(Me? me) {
    final id = widget.businessId;
    if (id == null || id == _shown || me == null || !me.memberships.any((item) => item.businessId == id)) return;
    _shown = id;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) ref.read(profileViewProvider.notifier).showBusiness(id);
    });
  }

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    final signedIn = ref.watch(sessionProvider.select((session) => session.signedIn));
    final me = ref.watch(meProvider);
    final account = signedIn ? me.value : null;
    _showRequested(account);
    final member = account != null && account.hasBusiness;
    final business = member && ref.watch(profileViewProvider.select((view) => view.business));
    return Scaffold(
      appBar: AppBar(title: Text(business ? l.bizProfileTitle : l.navProfile)),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(configProvider);
          ref.invalidate(pushAllowedProvider);
          if (business) ref.invalidate(workspaceProvider);
          if (signedIn) await ref.refresh(meProvider.future).then((_) {}, onError: (_) {});
        },
        child: ListView(
          padding: const EdgeInsets.fromLTRB(Gap.gutter, 0, Gap.gutter, Gap.xl),
          children: [
            if (member) _ModeSwitch(business: business),
            if (business)
              WorkspaceView(me: account)
            else ...[
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
              if (account != null) ...[
                const SizedBox(height: Gap.lg),
                _Notifications(me: account),
                if (!account.hasBusiness) ...[const SizedBox(height: Gap.lg), const _BusinessSection()],
              ],
              const SizedBox(height: Gap.lg),
              const _Links(),
              if (signedIn) ...[const SizedBox(height: Gap.lg), const _AccountActions()],
              const SizedBox(height: Gap.lg),
              Center(
                child: Text(l.appVersion('${Env.version} (${Env.build})'), style: TextStyle(color: context.mutedText, fontSize: 12)),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

/// Business / Personal, like the iOS segmented control.
class _ModeSwitch extends ConsumerWidget {
  const _ModeSwitch({required this.business});
  final bool business;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = L.of(context);
    final dark = context.isDark;
    final color = dark ? Brand.darkText : Brand.navy;
    Widget segment(IconData icon, String label) => ConstrainedBox(
      constraints: const BoxConstraints(minHeight: Gap.tap),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, size: 18, color: color),
          const SizedBox(width: 6),
          Flexible(
            child: Text(
              label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(color: color, fontWeight: FontWeight.w700),
            ),
          ),
        ],
      ),
    );
    return Padding(
      padding: const EdgeInsets.only(top: Gap.xs, bottom: Gap.lg),
      child: CupertinoSlidingSegmentedControl<String>(
        groupValue: business ? 'business' : 'personal',
        thumbColor: dark ? Brand.darkBorder : Colors.white,
        backgroundColor: dark ? Brand.darkSurface : const Color(0xFFEDE6DC),
        padding: const EdgeInsets.all(3),
        children: {'business': segment(CupertinoIcons.briefcase, l.modeBusiness), 'personal': segment(CupertinoIcons.person, l.modePersonal)},
        onValueChanged: (mode) {
          if (mode != null) ref.read(profileViewProvider.notifier).setMode(mode);
        },
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
                _AvatarButton(me: me),
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

/// The person's own photo, or their initial. A tap offers the camera, the
/// gallery or removal; only they ever see the photo.
class _AvatarButton extends ConsumerStatefulWidget {
  const _AvatarButton({required this.me});
  final Me me;

  @override
  ConsumerState<_AvatarButton> createState() => _AvatarButtonState();
}

class _AvatarButtonState extends ConsumerState<_AvatarButton> {
  var _busy = false;

  void _say(String text) {
    if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(text)));
  }

  Future<void> _choose() async {
    final l = L.of(context);
    final hasPhoto = widget.me.avatar != null;
    final choice = await showModalBottomSheet<String>(
      context: context,
      showDragHandle: true,
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(Gap.lg, 0, Gap.lg, Gap.sm),
              child: Text(l.profilePhotoHint, style: TextStyle(color: context.mutedText)),
            ),
            ListTile(leading: const Icon(Icons.photo_camera_outlined), title: Text(l.dealPhotoCamera), onTap: () => Navigator.pop(context, 'camera')),
            ListTile(leading: const Icon(Icons.photo_library_outlined), title: Text(l.dealPhotoGallery), onTap: () => Navigator.pop(context, 'gallery')),
            if (hasPhoto)
              ListTile(
                leading: Icon(Icons.delete_outline_rounded, color: Theme.of(context).colorScheme.error),
                title: Text(l.profilePhotoRemove, style: TextStyle(color: Theme.of(context).colorScheme.error)),
                onTap: () => Navigator.pop(context, 'remove'),
              ),
          ],
        ),
      ),
    );
    if (choice == null || !mounted) return;
    setState(() => _busy = true);
    try {
      final api = ref.read(apiProvider);
      if (choice == 'remove') {
        await api.removeAvatar();
      } else {
        final bytes = await ref.read(photoPickerProvider)(camera: choice == 'camera', use: PhotoUse.avatar);
        if (bytes == null) return;
        await api.uploadAvatar(bytes);
      }
      ref.invalidate(meProvider);
    } on CameraDenied {
      _say(l.dealPhotoCameraDenied);
    } on UnreadablePhoto {
      _say(l.dealPhotoUnsupported);
    } catch (error) {
      if (mounted) _say(errorText(context, error));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    final me = widget.me;
    final avatar = me.avatar;
    final photo = avatar == null ? null : ref.watch(avatarImageProvider(avatar)).value;
    return Semantics(
      container: true,
      button: true,
      label: avatar == null ? l.profilePhotoAdd : l.profilePhotoChange,
      onTap: _busy ? null : _choose,
      excludeSemantics: true,
      child: InkWell(
        customBorder: const CircleBorder(),
        onTap: _busy ? null : _choose,
        child: SizedBox.square(
          dimension: 56,
          child: Stack(
            children: [
              Center(
                child: CircleAvatar(
                  radius: 26,
                  backgroundColor: Brand.primary.withValues(alpha: 0.12),
                  foregroundImage: photo == null ? null : MemoryImage(photo),
                  child: Text(
                    me.displayName.isEmpty ? '?' : me.displayName.characters.first.toUpperCase(),
                    style: TextStyle(color: context.accentText, fontWeight: FontWeight.w900, fontSize: 22),
                  ),
                ),
              ),
              Positioned(
                right: 0,
                bottom: 0,
                child: Container(
                  width: 22,
                  height: 22,
                  decoration: BoxDecoration(
                    color: Brand.primary,
                    shape: BoxShape.circle,
                    border: Border.all(color: Theme.of(context).cardColor, width: 2),
                  ),
                  child: _busy
                      ? const Padding(
                          padding: EdgeInsets.all(4),
                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                        )
                      : const Icon(Icons.photo_camera_rounded, size: 12, color: Colors.white),
                ),
              ),
            ],
          ),
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

/// For people without a business yet: registering one is in the app.
class _BusinessSection extends StatelessWidget {
  const _BusinessSection();

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    return _Section(
      title: l.profileForBusiness,
      children: [
        ListTile(
          leading: CircleAvatar(
            backgroundColor: Brand.primary.withValues(alpha: 0.12),
            child: Icon(Icons.add_business_rounded, color: context.accentText),
          ),
          title: Text(l.addBusiness, style: const TextStyle(fontWeight: FontWeight.w700)),
          subtitle: Text(l.promoPoint1),
          trailing: const Icon(Icons.chevron_right_rounded),
          onTap: () => context.push('/business/new'),
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
            leading: const Icon(Icons.add_business_outlined),
            title: Text(l.addBusiness),
            trailing: const Icon(Icons.chevron_right_rounded),
            onTap: () => context.push('/business/new'),
          ),
        link(Icons.ondemand_video_rounded, l.profileGuides, '/qollanma'),
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
