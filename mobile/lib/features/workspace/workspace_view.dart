import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/links.dart';
import '../../app/providers.dart';
import '../../core/format.dart';
import '../../data/models.dart';
import '../../design/theme.dart';
import '../../design/widgets/common.dart';
import '../../l10n/gen/app_localizations.dart';
import '../codes/codes_screen.dart';

/// The business shown in the business profile: the one chosen last, else
/// one the person owns, else the first.
Membership currentMembership(Me me, ProfileView view) =>
    me.memberships.where((item) => item.businessId == view.businessId).firstOrNull ??
    me.memberships.where((item) => item.role == 'OWNER').firstOrNull ??
    me.memberships.first;

String roleLabel(L l, String role) => switch (role) {
  'OWNER' => l.roleOwner,
  'MANAGER' => l.roleManager,
  _ => l.roleCashier,
};

/// Where each profile step is done on the site.
const _setupPaths = {
  'logo': '/business/profile',
  'cover': '/business/profile',
  'description': '/business/profile',
  'contacts': '/business/profile',
  'location': '/business/branches',
  'deal': '/business/deals/new',
};

/// The "Biznes" side of the Profile tab: what the business needs next,
/// today's numbers and the latest codes. Deals, branches and the team are
/// still edited in the site's workspace.
class WorkspaceView extends ConsumerWidget {
  const WorkspaceView({super.key, required this.me});
  final Me me;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final membership = currentMembership(me, ref.watch(profileViewProvider));
    final workspace = ref.watch(workspaceProvider(membership.businessId));
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (me.memberships.length > 1) ...[_BusinessPicker(me: me, current: membership), const SizedBox(height: Gap.md)],
        switch (workspace) {
          AsyncValue(:final value?) => _Workspace(workspace: value, membership: membership),
          AsyncValue(:final error?) => StatePanel.error(context, error, onRetry: () => ref.invalidate(workspaceProvider(membership.businessId))),
          _ => const Column(
            children: [
              Skeleton(height: 96),
              SizedBox(height: Gap.md),
              Skeleton(height: 140),
              SizedBox(height: Gap.md),
              Skeleton(height: 180),
            ],
          ),
        },
      ],
    );
  }
}

class _BusinessPicker extends ConsumerWidget {
  const _BusinessPicker({required this.me, required this.current});
  final Me me;
  final Membership current;

  Future<void> _choose(BuildContext context, WidgetRef ref) async {
    final l = L.of(context);
    final picked = await showModalBottomSheet<String>(
      context: context,
      showDragHandle: true,
      isScrollControlled: true,
      builder: (context) => SafeArea(
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(Gap.gutter, 0, Gap.gutter, Gap.sm),
                child: Text(l.cashierChooseBusiness, style: Theme.of(context).textTheme.titleLarge),
              ),
              for (final item in me.memberships)
                ListTile(
                  leading: const Icon(Icons.storefront_outlined),
                  title: Text(item.name, maxLines: 2, overflow: TextOverflow.ellipsis),
                  subtitle: Text(roleLabel(l, item.role)),
                  trailing: item.businessId == current.businessId ? Icon(Icons.check_rounded, color: context.accentText) : null,
                  onTap: () => Navigator.pop(context, item.businessId),
                ),
              const SizedBox(height: Gap.sm),
            ],
          ),
        ),
      ),
    );
    if (picked != null) ref.read(profileViewProvider.notifier).showBusiness(picked);
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = L.of(context);
    return Card(
      clipBehavior: Clip.antiAlias,
      child: ListTile(
        leading: const Icon(Icons.swap_horiz_rounded),
        title: Text(l.cashierChooseBusiness, style: TextStyle(color: context.mutedText, fontSize: 13)),
        subtitle: Text(
          current.name,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16),
        ),
        trailing: const Icon(Icons.expand_more_rounded),
        onTap: () => _choose(context, ref),
      ),
    );
  }
}

class _Workspace extends ConsumerWidget {
  const _Workspace({required this.workspace, required this.membership});
  final BusinessWorkspace workspace;
  final Membership membership;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = L.of(context);
    final business = workspace.business;
    final locale = ref.watch(settingsProvider.select((settings) => settings.locale));
    void site(String next) => openSite(workspacePath(business.id, next), lang: locale);
    final live = business.status == 'VERIFIED' && !business.suspended;
    final stats = workspace.stats;
    final setupDone = workspace.setup.where((item) => item.done).length;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _Header(business: business, role: workspace.role),
        if (business.suspended)
          _Notice(tone: _Tone.danger, text: l.bizSuspendedNote)
        else if (business.status == 'PENDING')
          _Notice(tone: _Tone.warning, text: l.bizPendingNote)
        else if (business.status == 'REJECTED')
          _Notice(
            tone: _Tone.danger,
            text: l.bizRejectedNote(business.rejectionReason ?? '—'),
            action: workspace.canEdit ? l.bizRejectedFix : null,
            onAction: () => site('/business/profile'),
          ),
        const SizedBox(height: Gap.lg),
        _Title(l.bizQuick),
        _ActionGrid(
          actions: [
            if (workspace.canValidate && membership.verified)
              _Action(
                icon: Icons.qr_code_scanner_rounded,
                label: l.cashierTitle,
                primary: true,
                onTap: () => context.push(Uri(path: '/cashier', queryParameters: {'business': business.id}).toString()),
              ),
            if (workspace.canDeals)
              _Action(icon: Icons.add_circle_outline_rounded, label: l.bizAddDeal, external: true, onTap: () => site('/business/deals/new')),
            if (live) _Action(icon: Icons.storefront_outlined, label: l.bizViewPage, onTap: () => context.push('/businesses/${business.slug}')),
            _Action(icon: Icons.dashboard_outlined, label: l.profileBusiness, external: true, onTap: () => site('/business/dashboard')),
          ],
        ),
        if (workspace.role == 'CASHIER')
          Padding(
            padding: const EdgeInsets.only(top: Gap.sm, left: Gap.xs),
            child: Text(l.bizCashierOnly, style: TextStyle(color: context.mutedText, height: 1.35)),
          ),
        if (workspace.setup.isNotEmpty && setupDone < workspace.setup.length) ...[
          const SizedBox(height: Gap.lg),
          _Setup(items: workspace.setup, done: setupDone, onOpen: (key) => site(_setupPaths[key] ?? '/business/profile')),
        ],
        if (stats != null) ...[const SizedBox(height: Gap.lg), _Title(l.bizStats), _Stats(stats: stats)],
        if (stats != null) ...[const SizedBox(height: Gap.lg), _Title(l.bizRecent), _Recent(codes: workspace.recent)],
        const SizedBox(height: Gap.lg),
        Text(
          l.profileBusinessHint,
          textAlign: TextAlign.center,
          style: TextStyle(color: context.mutedText, fontSize: 13),
        ),
        const SizedBox(height: Gap.xs),
        Center(
          child: TextButton.icon(onPressed: () => context.push('/business/new'), icon: const Icon(Icons.add_business_outlined), label: Text(l.bizAddAnother)),
        ),
      ],
    );
  }
}

class _Title extends StatelessWidget {
  const _Title(this.text);
  final String text;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(left: Gap.xs, bottom: Gap.sm),
    child: Text(text, style: Theme.of(context).textTheme.titleMedium),
  );
}

class _Header extends StatelessWidget {
  const _Header({required this.business, required this.role});
  final WorkspaceBusiness business;
  final String role;

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    final (status, tone) = business.suspended
        ? (l.bizStatusSuspended, _Tone.danger)
        : switch (business.status) {
            'VERIFIED' => (l.bizStatusVerified, _Tone.success),
            'REJECTED' => (l.bizStatusRejected, _Tone.danger),
            _ => (l.bizStatusPending, _Tone.warning),
          };
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(Gap.lg),
        child: Row(
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(16),
              child: SizedBox.square(dimension: 64, child: AppImage(business.logo, small: true, icon: Icons.storefront_rounded)),
            ),
            const SizedBox(width: Gap.md),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(business.name, maxLines: 2, overflow: TextOverflow.ellipsis, style: Theme.of(context).textTheme.titleLarge),
                  const SizedBox(height: Gap.xs),
                  Wrap(
                    spacing: Gap.sm,
                    runSpacing: Gap.xs,
                    crossAxisAlignment: WrapCrossAlignment.center,
                    children: [
                      _Pill(text: status, tone: tone),
                      Text(
                        roleLabel(l, role),
                        style: TextStyle(color: context.mutedText, fontWeight: FontWeight.w600),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

enum _Tone { success, warning, danger, neutral }

/// Text and tint for a tone, readable (4.5:1+) in both themes.
Color _toneColor(BuildContext context, _Tone tone) => switch (tone) {
  _Tone.success => context.isDark ? const Color(0xFF34D399) : const Color(0xFF006B47),
  _Tone.warning => context.isDark ? const Color(0xFFFBBF24) : const Color(0xFF92400E),
  _Tone.danger => context.isDark ? const Color(0xFFFF8A80) : const Color(0xFFB3261E),
  _Tone.neutral => context.mutedText,
};

class _Pill extends StatelessWidget {
  const _Pill({required this.text, required this.tone});
  final String text;
  final _Tone tone;

  @override
  Widget build(BuildContext context) {
    final color = _toneColor(context, tone);
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

class _Notice extends StatelessWidget {
  const _Notice({required this.tone, required this.text, this.action, this.onAction});
  final _Tone tone;
  final String text;
  final String? action;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) {
    final color = _toneColor(context, tone);
    return Padding(
      padding: const EdgeInsets.only(top: Gap.md),
      child: Container(
        padding: const EdgeInsets.fromLTRB(Gap.md, Gap.md, Gap.md, Gap.sm),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.09),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: color.withValues(alpha: 0.25)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(tone == _Tone.warning ? Icons.hourglass_top_rounded : Icons.error_outline_rounded, color: color, size: 20),
                const SizedBox(width: Gap.sm),
                Expanded(child: Text(text, style: const TextStyle(height: 1.4))),
              ],
            ),
            if (action != null)
              Align(
                alignment: AlignmentDirectional.centerEnd,
                child: TextButton.icon(onPressed: onAction, icon: const Icon(Icons.open_in_new_rounded, size: 18), label: Text(action!)),
              )
            else
              const SizedBox(height: Gap.xs),
          ],
        ),
      ),
    );
  }
}

class _Action {
  const _Action({required this.icon, required this.label, required this.onTap, this.external = false, this.primary = false});
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  /// Opens the site in the browser.
  final bool external;
  final bool primary;
}

/// Tiles in rows of [columns], each row as tall as its tallest tile.
class _Grid extends StatelessWidget {
  const _Grid({required this.columns, required this.gap, required this.children});
  final int columns;
  final double gap;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: [
      for (var start = 0; start < children.length; start += columns) ...[
        if (start > 0) SizedBox(height: gap),
        IntrinsicHeight(
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              for (var index = start; index < start + columns; index++) ...[
                if (index > start) SizedBox(width: gap),
                Expanded(child: index < children.length ? children[index] : const SizedBox()),
              ],
            ],
          ),
        ),
      ],
    ],
  );
}

/// How many columns of at least [minWidth] fit at the person's text size.
int _columnsFor(BuildContext context, double width, double minWidth, int most) =>
    (width / MediaQuery.textScalerOf(context).scale(minWidth)).floor().clamp(1, most);

/// Two tiles per row (one when the text is very large).
class _ActionGrid extends StatelessWidget {
  const _ActionGrid({required this.actions});
  final List<_Action> actions;

  @override
  Widget build(BuildContext context) => LayoutBuilder(
    builder: (context, constraints) => _Grid(
      columns: _columnsFor(context, constraints.maxWidth, 125, 2),
      gap: Gap.md,
      children: [for (final action in actions) _ActionTile(action: action)],
    ),
  );
}

class _ActionTile extends StatelessWidget {
  const _ActionTile({required this.action});
  final _Action action;

  @override
  Widget build(BuildContext context) {
    final accent = context.accentText;
    final filled = action.primary;
    return Material(
      color: filled ? Brand.primaryStrong : Theme.of(context).cardTheme.color,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: filled ? BorderSide.none : BorderSide(color: context.borderColor),
      ),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: action.onTap,
        child: ConstrainedBox(
          constraints: const BoxConstraints(minHeight: 88),
          child: Padding(
            padding: const EdgeInsets.all(Gap.md),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Icon(action.icon, color: filled ? Colors.white : accent, size: 26),
                    const Spacer(),
                    if (action.external) Icon(Icons.open_in_new_rounded, size: 16, color: filled ? Colors.white : context.mutedText),
                  ],
                ),
                const SizedBox(height: Gap.sm),
                Text(
                  action.label,
                  style: TextStyle(fontWeight: FontWeight.w800, height: 1.25, color: filled ? Colors.white : null),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _Setup extends StatelessWidget {
  const _Setup({required this.items, required this.done, required this.onOpen});
  final List<({String key, bool done})> items;
  final int done;
  final ValueChanged<String> onOpen;

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    String label(String key) => switch (key) {
      'logo' => l.setupLogo,
      'cover' => l.setupCover,
      'description' => l.setupDescription,
      'contacts' => l.setupContacts,
      'location' => l.setupLocation,
      _ => l.setupDeal,
    };
    return Card(
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(Gap.lg, Gap.lg, Gap.lg, Gap.sm),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  children: [
                    Expanded(child: Text(l.bizSetupTitle, style: Theme.of(context).textTheme.titleMedium)),
                    Text(
                      l.bizSetupProgress('$done', '${items.length}'),
                      style: TextStyle(color: context.successText, fontWeight: FontWeight.w800),
                    ),
                  ],
                ),
                const SizedBox(height: Gap.sm),
                ClipRRect(
                  borderRadius: BorderRadius.circular(999),
                  child: LinearProgressIndicator(
                    value: items.isEmpty ? 0 : done / items.length,
                    minHeight: 8,
                    color: context.successText,
                    backgroundColor: context.borderColor,
                  ),
                ),
                const SizedBox(height: Gap.sm),
                Text(l.bizSetupHint, style: TextStyle(color: context.mutedText, fontSize: 13, height: 1.35)),
              ],
            ),
          ),
          for (final item in items)
            ListTile(
              visualDensity: const VisualDensity(vertical: -2),
              leading: Icon(
                item.done ? Icons.check_circle_rounded : Icons.radio_button_unchecked_rounded,
                color: item.done ? context.successText : context.mutedText,
              ),
              title: Text(
                label(item.key),
                style: TextStyle(color: item.done ? context.mutedText : null, fontSize: 15, fontWeight: item.done ? FontWeight.w500 : FontWeight.w600),
              ),
              trailing: item.done ? null : const Icon(Icons.open_in_new_rounded, size: 18),
              onTap: item.done ? null : () => onOpen(item.key),
            ),
          const SizedBox(height: Gap.xs),
        ],
      ),
    );
  }
}

class _Stats extends StatelessWidget {
  const _Stats({required this.stats});
  final WorkspaceStats stats;

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    final tiles = [
      (groupDigits(stats.live), l.statLive),
      (groupDigits(stats.claimsToday), l.statClaimsToday),
      (groupDigits(stats.redeemedToday), l.statRedeemedToday),
      (groupDigits(stats.views), l.statViews),
      (groupDigits(stats.followers), l.statFollowers),
      (stats.reviewCount > 0 ? '★ ${(stats.ratingBp / 100).toStringAsFixed(1)}' : '—', l.statRating),
    ];
    return LayoutBuilder(
      builder: (context, constraints) => _Grid(
        columns: _columnsFor(context, constraints.maxWidth, 100, 3),
        gap: Gap.sm,
        children: [
          for (final (value, label) in tiles)
            Container(
              padding: const EdgeInsets.all(Gap.md),
              decoration: BoxDecoration(
                color: Theme.of(context).cardTheme.color,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: context.borderColor),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  FittedBox(
                    fit: BoxFit.scaleDown,
                    alignment: AlignmentDirectional.centerStart,
                    child: Text(value, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w900)),
                  ),
                  const SizedBox(height: 2),
                  Text(label, style: TextStyle(color: context.mutedText, fontSize: 12, height: 1.25)),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

class _Recent extends StatelessWidget {
  const _Recent({required this.codes});
  final List<WorkspaceCode> codes;

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    if (codes.isEmpty) {
      return Card(
        child: Padding(
          padding: const EdgeInsets.all(Gap.lg),
          child: Text(l.bizRecentEmpty, style: TextStyle(color: context.mutedText)),
        ),
      );
    }
    return Card(
      clipBehavior: Clip.antiAlias,
      child: Column(
        children: [
          for (var index = 0; index < codes.length; index++) ...[
            if (index > 0) Divider(height: 1, color: context.borderColor),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: Gap.lg, vertical: Gap.md),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          codes[index].dealTitle,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(fontWeight: FontWeight.w700),
                        ),
                        Text(
                          '${codes[index].customerName} · ${codes[index].branchName}',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(color: context.mutedText, fontSize: 13),
                        ),
                        Text(dateLabel(codes[index].createdAt), style: TextStyle(color: context.mutedText, fontSize: 12)),
                      ],
                    ),
                  ),
                  const SizedBox(width: Gap.sm),
                  _Pill(text: statusLabel(l, codes[index].status), tone: codes[index].status == 'CLAIMED' ? _Tone.success : _Tone.neutral),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}
