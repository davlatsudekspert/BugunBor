import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/links.dart';
import '../../app/providers.dart';
import '../../core/time.dart';
import '../../data/models.dart';
import '../../design/theme.dart';
import '../../design/widgets/common.dart';
import '../../design/widgets/form_fields.dart';
import '../../design/widgets/status_pill.dart';
import '../../l10n/gen/app_localizations.dart';
import 'deal_draft.dart';
import 'deal_form_screen.dart';
import 'deal_visual.dart';

String dealStatusLabel(L l, String effective) => switch (effective) {
  'LIVE' => l.dealStLive,
  'SCHEDULED' => l.dealStScheduled,
  'SOLD_OUT' => l.dealStSoldOut,
  'EXPIRED' => l.dealStExpired,
  'PAUSED' => l.dealStPaused,
  'DRAFT' => l.dealStDraft,
  'PENDING_REVIEW' => l.dealStReview,
  'REJECTED' => l.dealStRejected,
  _ => l.dealStArchived,
};

Tone dealTone(String effective) => switch (effective) {
  'LIVE' => Tone.success,
  'SCHEDULED' || 'PENDING_REVIEW' => Tone.warning,
  'REJECTED' => Tone.danger,
  _ => Tone.neutral,
};

/// What can be done next with [deal] (the server's rules in
/// modules/deals/service.ts): changed while a draft or rejected, withdrawn
/// from review, paused, resumed or ended on the air, copied any time.
List<String> dealActions(BusinessDeal deal) {
  final onAir = deal.status == 'ACTIVE' && deal.effective != 'EXPIRED';
  return [
    if (deal.editable) ...['edit', 'submit'],
    if (deal.status == 'PENDING_REVIEW') 'withdraw',
    if (onAir) ...['view', 'pause'],
    if (deal.status == 'PAUSED') 'resume',
    if (deal.status == 'ACTIVE' || deal.status == 'PAUSED') 'end',
    'duplicate',
    if (deal.editable) 'delete',
  ];
}

enum DealFilter { all, live, review, draft, ended }

bool dealMatches(DealFilter filter, BusinessDeal deal) => switch (filter) {
  DealFilter.all => true,
  DealFilter.live => (deal.status == 'ACTIVE' && deal.effective != 'EXPIRED') || deal.status == 'PAUSED',
  DealFilter.review => deal.status == 'PENDING_REVIEW',
  DealFilter.draft => deal.editable,
  DealFilter.ended => deal.status == 'ARCHIVED' || deal.effective == 'EXPIRED',
};

/// "25.09 15:00 — 19:00", or with both dates when it runs over midnight.
String dealWindow(BusinessDeal deal) {
  final start = toTashkent(deal.startsAt);
  final end = toTashkent(deal.endsAt);
  String two(int value) => value.toString().padLeft(2, '0');
  final sameDay = start.year == end.year && start.month == end.month && start.day == end.day;
  return '${wallLabel(start)} — ${sameDay ? '${two(end.hour)}:${two(end.minute)}' : wallLabel(end)}';
}

/// A business's own deals, every status, with what can be done next.
class DealsScreen extends ConsumerStatefulWidget {
  const DealsScreen({super.key, required this.businessId});
  final String businessId;

  @override
  ConsumerState<DealsScreen> createState() => _DealsScreenState();
}

class _DealsScreenState extends ConsumerState<DealsScreen> {
  DealFilter _filter = DealFilter.all;

  /// The deal whose action is running.
  String? _busy;

  String get _base => '/business/${widget.businessId}/deals';

  /// The newest message replaces the one showing, so it is never queued.
  void _snack(String text) => ScaffoldMessenger.of(context)
    ..hideCurrentSnackBar()
    ..showSnackBar(SnackBar(content: Text(text)));

  Future<bool> _confirm(String text, String action) async {
    final l = L.of(context);
    return await showDialog<bool>(
          context: context,
          builder: (context) => AlertDialog(
            content: Text(text, style: const TextStyle(height: 1.4)),
            actions: [
              TextButton(onPressed: () => Navigator.pop(context, false), child: Text(l.cancel)),
              TextButton(
                onPressed: () => Navigator.pop(context, true),
                style: TextButton.styleFrom(foregroundColor: errorColor(context)),
                child: Text(action),
              ),
            ],
          ),
        ) ??
        false;
  }

  Future<void> _run(BusinessDeal deal, String action) async {
    final l = L.of(context);
    switch (action) {
      case 'edit':
        await context.push('$_base/${deal.id}/edit');
        return;
      case 'view':
        await context.push('/deals/${deal.slug}');
        return;
      case 'end':
        if (!await _confirm(l.dealConfirmEnd, l.dealActEnd)) return;
      case 'delete':
        if (!await _confirm(l.dealConfirmDelete, l.dealActDelete)) return;
    }
    if (!mounted) return;
    setState(() => _busy = deal.id);
    final api = ref.read(apiProvider);
    try {
      String? copy;
      final String message;
      if (action == 'duplicate') {
        copy = await api.duplicateDeal(widget.businessId, deal.id);
        message = l.dealDoneDuplicate;
      } else {
        final status = await api.dealAction(widget.businessId, deal.id, action);
        message = switch (action) {
          'submit' => savedMessage(l, status),
          'withdraw' => l.dealDoneWithdraw,
          'pause' => l.dealDonePause,
          'resume' => l.dealDoneResume,
          'end' => l.dealDoneEnd,
          _ => l.dealDoneDelete,
        };
      }
      ref.invalidate(businessDealsProvider(widget.businessId));
      ref.invalidate(workspaceProvider(widget.businessId));
      if (!mounted) return;
      _snack(message);
      // A copy is made to be changed: open it.
      if (copy != null) await context.push('$_base/$copy/edit');
    } catch (error) {
      if (mounted) _snack(errorText(context, error));
    } finally {
      if (mounted) setState(() => _busy = null);
    }
  }

  Future<void> _actions(BusinessDeal deal) async {
    final l = L.of(context);
    final danger = errorColor(context);
    final choice = await showModalBottomSheet<String>(
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
                child: Text(deal.title, maxLines: 2, overflow: TextOverflow.ellipsis, style: Theme.of(context).textTheme.titleMedium),
              ),
              if (!deal.editable && deal.status != 'ARCHIVED')
                Padding(
                  padding: const EdgeInsets.fromLTRB(Gap.gutter, 0, Gap.gutter, Gap.sm),
                  child: Text(l.dealLocked, style: TextStyle(color: context.mutedText, fontSize: 13, height: 1.35)),
                ),
              for (final action in dealActions(deal))
                ListTile(
                  leading: Icon(_icon(action), color: action == 'delete' || action == 'end' ? danger : null),
                  title: Text(
                    _label(l, action),
                    style: TextStyle(color: action == 'delete' || action == 'end' ? danger : null, fontWeight: FontWeight.w600),
                  ),
                  onTap: () => Navigator.pop(context, action),
                ),
              const SizedBox(height: Gap.sm),
            ],
          ),
        ),
      ),
    );
    if (choice != null && mounted) await _run(deal, choice);
  }

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    final config = ref.watch(configProvider).value;
    // A server without the deal rules (not yet updated) has no deals list
    // either: the site's workspace still works.
    if (config != null && config.deal.visuals.isEmpty) {
      final locale = ref.watch(settingsProvider.select((settings) => settings.locale));
      return Scaffold(
        appBar: AppBar(title: Text(l.dealsTitle)),
        body: StatePanel(
          icon: Icons.local_offer_outlined,
          title: l.dealsNeedUpdate,
          actionLabel: l.profileBusiness,
          onAction: () => openSite(workspacePath(widget.businessId, '/business/deals'), lang: locale),
        ),
      );
    }
    final deals = ref.watch(businessDealsProvider(widget.businessId));
    final visuals = config?.deal ?? const DealRules();
    return Scaffold(
      appBar: AppBar(title: Text(l.dealsTitle)),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: Brand.primaryStrong,
        foregroundColor: Colors.white,
        onPressed: () => context.push('$_base/new'),
        icon: const Icon(Icons.add_rounded),
        label: Text(l.dealsNew, style: const TextStyle(fontWeight: FontWeight.w800)),
      ),
      body: switch (deals) {
        AsyncValue(:final value?) => RefreshIndicator(
          onRefresh: () => ref.refresh(businessDealsProvider(widget.businessId).future).then((_) {}, onError: (_) {}),
          child: _list(context, l, value, visuals),
        ),
        AsyncValue(:final error?) => StatePanel.error(context, error, onRetry: () => ref.invalidate(businessDealsProvider(widget.businessId))),
        _ => const SkeletonList(count: 3),
      },
    );
  }

  Widget _list(BuildContext context, L l, List<BusinessDeal> deals, DealRules visuals) {
    if (deals.isEmpty) {
      return LayoutBuilder(
        builder: (context, constraints) => SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          child: ConstrainedBox(
            constraints: BoxConstraints(minHeight: constraints.maxHeight),
            child: StatePanel(icon: Icons.local_offer_outlined, title: l.dealsEmptyTitle, text: l.dealsEmptyText),
          ),
        ),
      );
    }
    final shown = deals.where((deal) => dealMatches(_filter, deal)).toList();
    final labels = {
      DealFilter.all: l.dealsFilterAll,
      DealFilter.live: l.dealsFilterLive,
      DealFilter.review: l.dealsFilterReview,
      DealFilter.draft: l.dealsFilterDraft,
      DealFilter.ended: l.dealsFilterEnded,
    };
    return ListView(
      // Room for the button at the bottom.
      padding: const EdgeInsets.fromLTRB(0, 0, 0, 96),
      children: [
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.fromLTRB(Gap.gutter, Gap.xs, Gap.gutter, Gap.md),
          child: Row(
            children: [
              for (final filter in DealFilter.values) ...[
                if (filter != DealFilter.all) const SizedBox(width: Gap.sm),
                ChoiceChip(
                  label: Text('${labels[filter]} · ${deals.where((deal) => dealMatches(filter, deal)).length}'),
                  selected: filter == _filter,
                  showCheckmark: false,
                  onSelected: (_) => setState(() => _filter = filter),
                ),
              ],
            ],
          ),
        ),
        if (shown.isEmpty)
          Padding(
            padding: const EdgeInsets.all(Gap.xl),
            child: Text(
              l.dealsEmpty,
              textAlign: TextAlign.center,
              style: TextStyle(color: context.mutedText),
            ),
          ),
        for (final deal in shown)
          Padding(
            padding: const EdgeInsets.fromLTRB(Gap.gutter, 0, Gap.gutter, Gap.md),
            child: _DealCard(deal: deal, emoji: visuals.emojiOf(deal.visual), busy: _busy == deal.id, onTap: () => _actions(deal)),
          ),
      ],
    );
  }
}

IconData _icon(String action) => switch (action) {
  'edit' => Icons.edit_outlined,
  'submit' => Icons.send_rounded,
  'withdraw' => Icons.undo_rounded,
  'view' => Icons.visibility_outlined,
  'pause' => Icons.pause_circle_outline_rounded,
  'resume' => Icons.play_circle_outline_rounded,
  'end' => Icons.stop_circle_outlined,
  'duplicate' => Icons.copy_rounded,
  _ => Icons.delete_outline_rounded,
};

String _label(L l, String action) => switch (action) {
  'edit' => l.dealActEdit,
  'submit' => l.dealActSubmit,
  'withdraw' => l.dealActWithdraw,
  'view' => l.dealActView,
  'pause' => l.dealActPause,
  'resume' => l.dealActResume,
  'end' => l.dealActEnd,
  'duplicate' => l.dealActDuplicate,
  _ => l.dealActDelete,
};

class _DealCard extends StatelessWidget {
  const _DealCard({required this.deal, required this.emoji, required this.busy, required this.onTap});
  final BusinessDeal deal;
  final String emoji;
  final bool busy;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    final muted = TextStyle(color: context.mutedText, fontSize: 12.5, height: 1.35);
    final stock = deal.total == null ? l.dealsUnlimited : l.dealsStock('${deal.remaining ?? deal.total}', '${deal.total}');
    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: busy ? null : onTap,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Padding(
              padding: const EdgeInsets.all(Gap.md),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  ClipRRect(
                    borderRadius: BorderRadius.circular(14),
                    child: SizedBox.square(
                      dimension: 76,
                      child: DealPicture(photo: deal.photo, emoji: emoji, emojiSize: 32),
                    ),
                  ),
                  const SizedBox(width: Gap.md),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Wrap(
                          spacing: Gap.sm,
                          runSpacing: Gap.xs,
                          crossAxisAlignment: WrapCrossAlignment.center,
                          children: [
                            StatusPill(text: dealStatusLabel(l, deal.effective), tone: dealTone(deal.effective)),
                            Text(dealWindow(deal), style: muted),
                          ],
                        ),
                        const SizedBox(height: Gap.xs),
                        Text(deal.title, maxLines: 2, overflow: TextOverflow.ellipsis, style: Theme.of(context).textTheme.titleMedium),
                        const SizedBox(height: 2),
                        PriceLine(price: deal.price, original: deal.originalPrice),
                        const SizedBox(height: 2),
                        // Each figure stays whole; a line breaks only between them.
                        Wrap(
                          spacing: Gap.md,
                          children: [
                            for (final figure in [stock, l.dealsClaims('${deal.claims}'), l.dealsRedeemed('${deal.redeemed}'), l.dealsViews('${deal.views}')])
                              Text(figure, style: muted),
                          ],
                        ),
                        if (deal.status == 'REJECTED' && deal.rejectionReason != null) ...[
                          const SizedBox(height: Gap.xs),
                          Text(
                            l.dealsRejected(deal.rejectionReason!),
                            style: TextStyle(color: errorColor(context), fontSize: 13, fontWeight: FontWeight.w600, height: 1.35),
                          ),
                        ],
                      ],
                    ),
                  ),
                  Icon(Icons.more_vert_rounded, color: context.mutedText),
                ],
              ),
            ),
            if (busy) const LinearProgressIndicator(minHeight: 3),
          ],
        ),
      ),
    );
  }
}
