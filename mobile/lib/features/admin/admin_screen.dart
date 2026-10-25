import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../app/links.dart';
import '../../app/providers.dart';
import '../../core/format.dart';
import '../../core/time.dart';
import '../../data/models.dart';
import '../../design/theme.dart';
import '../../design/widgets/common.dart';
import '../../l10n/gen/app_localizations.dart';

/// The owner's admin panel inside the app: what waits for a decision
/// (businesses, deals, reports, messages) and the people. Every decision goes
/// through the server, which checks the owner again; the site's panel has the
/// rest (categories, settings, audit).
class AdminScreen extends ConsumerWidget {
  const AdminScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = L.of(context);
    final locale = ref.watch(settingsProvider.select((settings) => settings.locale));
    return DefaultTabController(
      length: 4,
      child: Scaffold(
        appBar: AppBar(
          title: Text(l.adminTitle),
          actions: [
            IconButton(
              tooltip: l.adminOpenSite,
              icon: const Icon(Icons.open_in_new_rounded),
              onPressed: () => openSite('/admin', lang: locale),
            ),
          ],
          bottom: TabBar(
            labelStyle: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w700),
            tabs: [
              Tab(text: l.adminQueueTab),
              Tab(text: l.adminReportsTab),
              Tab(text: l.adminMessagesTab),
              Tab(text: l.adminUsersTab),
            ],
          ),
        ),
        body: const TabBarView(children: [_ReviewTab(), _ReportsTab(), _MessagesTab(), _UsersTab()]),
      ),
    );
  }
}

/// Runs one decision, then the lists and the numbers are read again.
Future<bool> _act(BuildContext context, WidgetRef ref, Map<String, Object?> action) async {
  try {
    await ref.read(apiProvider).adminAction(action);
  } catch (error) {
    if (context.mounted) showErrorSnack(context, error);
    return false;
  }
  ref.invalidate(adminQueueProvider);
  ref.invalidate(adminOverviewProvider);
  if (context.mounted) {
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(content: Text(L.of(context).adminDone)));
  }
  return true;
}

/// A short text the person gives (a rejection reason); null when cancelled or empty.
Future<String?> _askText(BuildContext context, String title) async {
  final text = await showDialog<String>(
    context: context,
    builder: (context) => _TextDialog(title: title),
  );
  return text == null || text.isEmpty ? null : text;
}

class _TextDialog extends StatefulWidget {
  const _TextDialog({required this.title});
  final String title;

  @override
  State<_TextDialog> createState() => _TextDialogState();
}

class _TextDialogState extends State<_TextDialog> {
  final _controller = TextEditingController();

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    return AlertDialog(
      title: Text(widget.title, style: const TextStyle(fontSize: 17)),
      content: TextField(controller: _controller, autofocus: true, maxLines: 3, maxLength: 300, textCapitalization: TextCapitalization.sentences),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context), child: Text(l.cancel)),
        FilledButton(onPressed: () => Navigator.pop(context, _controller.text.trim()), child: Text(l.adminReject)),
      ],
    );
  }
}

Future<bool> _confirm(BuildContext context, String text, String action) async {
  final l = L.of(context);
  return await showDialog<bool>(
        context: context,
        builder: (context) => AlertDialog(
          content: Text(text, style: const TextStyle(height: 1.4)),
          actions: [
            TextButton(onPressed: () => Navigator.pop(context, false), child: Text(l.cancel)),
            TextButton(
              onPressed: () => Navigator.pop(context, true),
              style: TextButton.styleFrom(foregroundColor: context.dangerText),
              child: Text(action),
            ),
          ],
        ),
      ) ??
      false;
}

/// The queue, loaded once for the first three tabs.
class _QueueBody extends ConsumerWidget {
  const _QueueBody({required this.builder});
  final Widget Function(BuildContext context, WidgetRef ref, AdminQueue queue) builder;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final queue = ref.watch(adminQueueProvider);
    return RefreshIndicator(
      onRefresh: () => refreshing(context, ref.refresh(adminQueueProvider.future)),
      child: switch (queue) {
        AsyncValue(:final value?) => builder(context, ref, value),
        AsyncValue(:final error?) => ListView(children: [StatePanel.error(context, error, onRetry: () => ref.invalidate(adminQueueProvider))]),
        _ => const SkeletonList(),
      },
    );
  }
}

Widget _empty(BuildContext context) => ListView(
  children: [StatePanel(icon: Icons.check_circle_outline_rounded, title: L.of(context).adminEmpty)],
);

class _ReviewTab extends StatelessWidget {
  const _ReviewTab();

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    return _QueueBody(
      builder: (context, ref, queue) {
        if (queue.businesses.isEmpty && queue.deals.isEmpty) return _empty(context);
        return ListView(
          padding: const EdgeInsets.fromLTRB(Gap.gutter, Gap.md, Gap.gutter, Gap.xl),
          children: [
            if (queue.businesses.isNotEmpty) ...[
              _Heading('${l.adminBusinessesTitle} · ${queue.businesses.length}'),
              for (final business in queue.businesses) _BusinessCard(business: business),
            ],
            if (queue.deals.isNotEmpty) ...[_Heading('${l.adminDealsTitle} · ${queue.deals.length}'), for (final deal in queue.deals) _DealCard(deal: deal)],
          ],
        );
      },
    );
  }
}

class _Heading extends StatelessWidget {
  const _Heading(this.text);
  final String text;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(left: Gap.xs, top: Gap.sm, bottom: Gap.sm),
    child: Text(text, style: Theme.of(context).textTheme.titleMedium),
  );
}

/// Approve and reject buttons; a rejection asks for its reason.
class _Decide extends ConsumerWidget {
  const _Decide({required this.action});

  /// The action with everything but the decision and the reason.
  final Map<String, Object?> action;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = L.of(context);
    return Row(
      children: [
        Expanded(
          child: OutlinedButton(
            style: OutlinedButton.styleFrom(foregroundColor: context.dangerText),
            onPressed: () async {
              final reason = await _askText(context, l.adminRejectReason);
              if (reason != null && context.mounted) await _act(context, ref, {...action, 'decision': 'REJECT', 'reason': reason});
            },
            child: Text(l.adminReject),
          ),
        ),
        const SizedBox(width: Gap.sm),
        Expanded(
          child: FilledButton(onPressed: () => _act(context, ref, {...action, 'decision': 'APPROVE'}), child: Text(l.adminApprove)),
        ),
      ],
    );
  }
}

class _Note extends StatelessWidget {
  const _Note(this.text, {this.muted = true});
  final String text;
  final bool muted;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(top: Gap.xs),
    child: Text(text, style: TextStyle(color: muted ? context.mutedText : null, fontSize: 14, height: 1.4)),
  );
}

class _BusinessCard extends StatelessWidget {
  const _BusinessCard({required this.business});
  final AdminQueueBusiness business;

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    final b = business;
    return Card(
      margin: const EdgeInsets.only(bottom: Gap.md),
      child: Padding(
        padding: const EdgeInsets.all(Gap.md),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(b.name, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 17)),
            _Note([b.category, b.city, l.adminBranches(b.branches)].whereType<String>().join(' · ')),
            if (b.description.isNotEmpty) _Note(b.description, muted: false),
            if (b.ownerName != null || b.phone != null) _Note([b.ownerName, formatPhone(b.phone)].whereType<String>().where((s) => s.isNotEmpty).join(' · ')),
            if (b.autoNote != null && b.autoNote!.isNotEmpty) _Note(l.adminAutoNote(b.autoNote!)),
            const SizedBox(height: Gap.md),
            _Decide(action: {'type': 'business.decide', 'businessId': b.id}),
          ],
        ),
      ),
    );
  }
}

class _DealCard extends StatelessWidget {
  const _DealCard({required this.deal});
  final AdminQueueDeal deal;

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    final d = deal;
    return Card(
      margin: const EdgeInsets.only(bottom: Gap.md),
      child: Padding(
        padding: const EdgeInsets.all(Gap.md),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(d.title, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 17)),
            _Note([d.business, d.category].whereType<String>().join(' · ')),
            Padding(
              padding: const EdgeInsets.only(top: Gap.xs),
              child: Text.rich(
                TextSpan(
                  children: [
                    TextSpan(
                      text: money(context, d.price),
                      style: TextStyle(fontWeight: FontWeight.w800, color: context.accentText),
                    ),
                    if (d.originalPrice != null)
                      TextSpan(
                        text: '  ${money(context, d.originalPrice!)}',
                        style: TextStyle(color: context.mutedText, decoration: TextDecoration.lineThrough),
                      ),
                    TextSpan(
                      text: '  −${d.discountPercent}%',
                      style: const TextStyle(fontWeight: FontWeight.w700),
                    ),
                  ],
                ),
              ),
            ),
            if (d.description.isNotEmpty) _Note(d.description, muted: false),
            if (d.terms.isNotEmpty) _Note(d.terms),
            if (d.autoNote != null && d.autoNote!.isNotEmpty) _Note(l.adminAutoNote(d.autoNote!)),
            const SizedBox(height: Gap.md),
            _Decide(action: {'type': 'deal.decide', 'dealId': d.id}),
          ],
        ),
      ),
    );
  }
}

class _ReportsTab extends StatelessWidget {
  const _ReportsTab();

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    return _QueueBody(
      builder: (context, ref, queue) {
        if (queue.reports.isEmpty) return _empty(context);
        return ListView(
          padding: const EdgeInsets.fromLTRB(Gap.gutter, Gap.md, Gap.gutter, Gap.xl),
          children: [
            for (final r in queue.reports)
              Card(
                margin: const EdgeInsets.only(bottom: Gap.md),
                child: Padding(
                  padding: const EdgeInsets.all(Gap.md),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Text(r.title ?? r.targetType, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 17)),
                      _Note('${r.reason} · ${l.adminReportCount(r.count)} · ${momentLabel(r.createdAt)}'),
                      if (r.comment != null && r.comment!.isNotEmpty) _Note(r.comment!, muted: false),
                      if (r.reporter != null) _Note(r.reporter!),
                      const SizedBox(height: Gap.md),
                      Row(
                        children: [
                          Expanded(
                            child: OutlinedButton(
                              onPressed: () => _act(context, ref, {'type': 'report.resolve', 'reportId': r.id, 'status': 'DISMISSED'}),
                              child: Text(l.adminDismiss),
                            ),
                          ),
                          const SizedBox(width: Gap.sm),
                          Expanded(
                            child: FilledButton(
                              onPressed: () => _act(context, ref, {'type': 'report.resolve', 'reportId': r.id, 'status': 'RESOLVED'}),
                              child: Text(l.adminResolve),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
          ],
        );
      },
    );
  }
}

class _MessagesTab extends StatelessWidget {
  const _MessagesTab();

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    return _QueueBody(
      builder: (context, ref, queue) {
        if (queue.messages.isEmpty) return _empty(context);
        return ListView(
          padding: const EdgeInsets.fromLTRB(Gap.gutter, Gap.md, Gap.gutter, Gap.xl),
          children: [
            for (final m in queue.messages)
              Card(
                margin: const EdgeInsets.only(bottom: Gap.md),
                child: Padding(
                  padding: const EdgeInsets.all(Gap.md),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Text(m.subject, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 17)),
                      _Note('${m.name} · ${m.contact} · ${momentLabel(m.createdAt)}'),
                      _Note(m.message, muted: false),
                      const SizedBox(height: Gap.md),
                      Row(
                        children: [
                          Expanded(
                            child: OutlinedButton(
                              onPressed: () => _act(context, ref, {'type': 'message.status', 'messageId': m.id, 'status': 'ARCHIVED'}),
                              child: Text(l.adminArchive),
                            ),
                          ),
                          const SizedBox(width: Gap.sm),
                          Expanded(
                            child: FilledButton(
                              onPressed: () => _act(context, ref, {'type': 'message.status', 'messageId': m.id, 'status': 'READ'}),
                              child: Text(l.adminMarkRead),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
          ],
        );
      },
    );
  }
}

class _UsersTab extends ConsumerStatefulWidget {
  const _UsersTab();

  @override
  ConsumerState<_UsersTab> createState() => _UsersTabState();
}

class _UsersTabState extends ConsumerState<_UsersTab> {
  String _query = '';

  Future<void> _update(AdminUser user, Map<String, Object?> change) async {
    if (await _act(context, ref, {'type': 'user.update', 'userId': user.id, ...change})) ref.invalidate(adminUsersProvider);
  }

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    final users = ref.watch(adminUsersProvider(_query));
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(Gap.gutter, Gap.md, Gap.gutter, 0),
          child: TextField(
            decoration: InputDecoration(hintText: l.adminSearchUsers, prefixIcon: const Icon(Icons.search_rounded)),
            textInputAction: TextInputAction.search,
            onSubmitted: (value) => setState(() => _query = value.trim()),
          ),
        ),
        Expanded(
          child: switch (users) {
            AsyncValue(:final value?) =>
              value.isEmpty
                  ? _empty(context)
                  : ListView.builder(
                      padding: const EdgeInsets.fromLTRB(Gap.gutter, Gap.md, Gap.gutter, Gap.xl),
                      itemCount: value.length,
                      itemBuilder: (context, index) => _UserCard(user: value[index], onChange: (change) => _update(value[index], change)),
                    ),
            AsyncValue(:final error?) => StatePanel.error(context, error, onRetry: () => ref.invalidate(adminUsersProvider)),
            _ => const SkeletonList(),
          },
        ),
      ],
    );
  }
}

class _UserCard extends StatelessWidget {
  const _UserCard({required this.user, required this.onChange});
  final AdminUser user;
  final Future<void> Function(Map<String, Object?> change) onChange;

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    final u = user;
    final admin = u.role == 'ADMIN';
    return Card(
      margin: const EdgeInsets.only(bottom: Gap.sm),
      child: Padding(
        padding: const EdgeInsets.all(Gap.md),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(u.name, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
                ),
                if (u.blocked)
                  Text(
                    l.adminBlocked,
                    style: TextStyle(color: context.dangerText, fontWeight: FontWeight.w700, fontSize: 13),
                  )
                else if (u.role != 'CUSTOMER')
                  Text(
                    u.role,
                    style: TextStyle(color: context.accentText, fontWeight: FontWeight.w700, fontSize: 13),
                  ),
              ],
            ),
            _Note(
              [
                formatPhone(u.phone),
                l.adminUserBusinesses(u.businesses),
                if (u.lastLoginAt != null) momentLabel(u.lastLoginAt!),
              ].where((s) => s.isNotEmpty).join(' · '),
            ),
            if (!admin) ...[
              const SizedBox(height: Gap.sm),
              Wrap(
                spacing: Gap.sm,
                children: [
                  if (u.blocked)
                    FilledButton.tonal(onPressed: () => onChange({'status': 'ACTIVE'}), child: Text(l.adminUnblock))
                  else
                    OutlinedButton(
                      style: OutlinedButton.styleFrom(foregroundColor: context.dangerText),
                      onPressed: () async {
                        if (await _confirm(context, l.adminConfirmBlock(u.name), l.adminBlock)) await onChange({'status': 'BLOCKED'});
                      },
                      child: Text(l.adminBlock),
                    ),
                  if (u.role == 'MODERATOR')
                    OutlinedButton(onPressed: () => onChange({'role': 'CUSTOMER'}), child: Text(l.adminMakeCustomer))
                  else
                    OutlinedButton(onPressed: () => onChange({'role': 'MODERATOR'}), child: Text(l.adminMakeModerator)),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }
}
