import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/providers.dart';
import '../../core/format.dart';
import '../../core/time.dart';
import '../../data/models.dart';
import '../../design/theme.dart';
import '../../design/widgets/common.dart';
import '../../l10n/gen/app_localizations.dart';
import '../shell/shell_screen.dart';

String statusLabel(L l, String status) => switch (status) {
  'CLAIMED' => l.statusClaimed,
  'COMPLETED' => l.statusCompleted,
  'EXPIRED' => l.statusExpired,
  _ => l.statusCanceled,
};

String dateLabel(DateTime utc) {
  final local = toTashkent(utc);
  String two(int value) => value.toString().padLeft(2, '0');
  return '${two(local.day)}.${two(local.month)}.${local.year} ${local.hour}:${two(local.minute)}';
}

class CodesScreen extends ConsumerWidget {
  const CodesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = L.of(context);
    final signedIn = ref.watch(sessionProvider.select((session) => session.signedIn));
    if (!signedIn) {
      return Scaffold(
        appBar: AppBar(title: Text(l.navCodes)),
        body: const LoginRequired(icon: Icons.qr_code_2_rounded),
      );
    }
    final codes = ref.watch(myCodesProvider);
    return DefaultTabController(
      length: 2,
      child: Scaffold(
        appBar: AppBar(
          title: Text(l.navCodes),
          bottom: TabBar(
            tabs: [
              Tab(text: l.codesActive),
              Tab(text: l.codesHistory),
            ],
          ),
        ),
        body: switch (codes) {
          AsyncValue(:final value?) => TabBarView(
            children: [
              _CodeList(
                items: value.where((code) => code.isActive).toList(),
                empty: StatePanel(
                  icon: Icons.qr_code_2_rounded,
                  title: l.codesEmpty,
                  text: l.codesEmptyText,
                  actionLabel: l.navSearch,
                  onAction: () => context.go('/search'),
                ),
              ),
              _CodeList(
                items: value.where((code) => !code.isActive).toList(),
                empty: StatePanel(icon: Icons.history_rounded, title: l.historyEmpty),
              ),
            ],
          ),
          AsyncValue(:final error?) => StatePanel.error(context, error, onRetry: () => ref.invalidate(myCodesProvider)),
          _ => const SkeletonList(count: 3),
        },
      ),
    );
  }
}

class _CodeList extends ConsumerWidget {
  const _CodeList({required this.items, required this.empty});
  final List<Redemption> items;
  final Widget empty;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    Future<void> reload() => ref.refresh(myCodesProvider.future).then((_) {}, onError: (_) {});
    if (items.isEmpty) {
      return RefreshIndicator(
        onRefresh: reload,
        child: LayoutBuilder(
          builder: (context, constraints) => SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            child: ConstrainedBox(
              constraints: BoxConstraints(minHeight: constraints.maxHeight),
              child: empty,
            ),
          ),
        ),
      );
    }
    return RefreshIndicator(
      onRefresh: reload,
      child: ListView.separated(
        padding: const EdgeInsets.all(Gap.gutter),
        itemCount: items.length,
        separatorBuilder: (_, _) => const SizedBox(height: Gap.md),
        itemBuilder: (context, index) => _CodeCard(code: items[index]),
      ),
    );
  }
}

class _CodeCard extends ConsumerWidget {
  const _CodeCard({required this.code});
  final Redemption code;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = L.of(context);
    final active = code.isActive;
    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: active ? () => context.push('/codes/${code.id}') : () => context.push('/deals/${code.dealSlug}'),
        child: Padding(
          padding: const EdgeInsets.all(Gap.md),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  ClipRRect(
                    borderRadius: BorderRadius.circular(12),
                    child: SizedBox.square(dimension: 60, child: AppImage(code.photo, small: true)),
                  ),
                  const SizedBox(width: Gap.md),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(code.dealTitle, maxLines: 2, overflow: TextOverflow.ellipsis, style: Theme.of(context).textTheme.titleMedium),
                        Text(
                          '${code.businessName} · ${code.branchName}',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(color: context.mutedText),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          money(context, code.price),
                          style: TextStyle(color: context.accentText, fontWeight: FontWeight.w900),
                        ),
                      ],
                    ),
                  ),
                  _StatusChip(status: code.status),
                ],
              ),
              const SizedBox(height: Gap.sm),
              if (active)
                Row(
                  children: [
                    Expanded(
                      child: FittedBox(
                        fit: BoxFit.scaleDown,
                        alignment: AlignmentDirectional.centerStart,
                        child: Text(formatCode(code.code!), style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w900, letterSpacing: 2)),
                      ),
                    ),
                    const SizedBox(width: Gap.sm),
                    const Icon(Icons.schedule_rounded, size: 16),
                    const SizedBox(width: 4),
                    Countdown(code.expiresAt),
                  ],
                )
              else
                Row(
                  children: [
                    Expanded(
                      child: Text(dateLabel(code.completedAt ?? code.createdAt), style: TextStyle(color: context.mutedText, fontSize: 13)),
                    ),
                    if (code.myRating != null)
                      Text(l.yourRating('${code.myRating}'), style: const TextStyle(fontWeight: FontWeight.w700))
                    else if (code.canRate)
                      FilledButton.tonalIcon(
                        onPressed: () => showRateSheet(context, ref, code),
                        icon: const Icon(Icons.star_outline_rounded),
                        label: Text(l.rateVisit),
                      ),
                  ],
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _StatusChip extends StatelessWidget {
  const _StatusChip({required this.status});
  final String status;

  @override
  Widget build(BuildContext context) {
    final color = switch (status) {
      'CLAIMED' => context.successText,
      'COMPLETED' => Brand.navySoft,
      _ => context.mutedText,
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(color: color.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(999)),
      child: Text(
        statusLabel(L.of(context), status),
        style: TextStyle(color: context.isDark && status == 'COMPLETED' ? Brand.darkText : color, fontSize: 12, fontWeight: FontWeight.w800),
      ),
    );
  }
}

Future<void> showRateSheet(BuildContext context, WidgetRef ref, Redemption code) async {
  final done = await showModalBottomSheet<bool>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    useSafeArea: true,
    builder: (context) => _RateSheet(code: code),
  );
  if (done == true && context.mounted) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(L.of(context).rateThanks)));
  }
}

class _RateSheet extends ConsumerStatefulWidget {
  const _RateSheet({required this.code});
  final Redemption code;

  @override
  ConsumerState<_RateSheet> createState() => _RateSheetState();
}

class _RateSheetState extends ConsumerState<_RateSheet> {
  final _comment = TextEditingController();
  int _rating = 0;
  bool _sending = false;
  Object? _error;

  @override
  void dispose() {
    _comment.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    setState(() {
      _sending = true;
      _error = null;
    });
    try {
      await ref.read(apiProvider).rate(widget.code.id, _rating, _comment.text);
      ref.invalidate(myCodesProvider);
      if (mounted) Navigator.pop(context, true);
    } catch (error) {
      if (mounted) {
        setState(() {
          _sending = false;
          _error = error;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(Gap.gutter, 0, Gap.gutter, Gap.xl),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(l.rateTitle, style: Theme.of(context).textTheme.titleLarge),
            Text(widget.code.dealTitle, style: TextStyle(color: context.mutedText)),
            const SizedBox(height: Gap.md),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                for (var star = 1; star <= 5; star++)
                  IconButton(
                    tooltip: '$star',
                    iconSize: 36,
                    onPressed: () => setState(() => _rating = star),
                    icon: Icon(star <= _rating ? Icons.star_rounded : Icons.star_outline_rounded, color: const Color(0xFFF59E0B)),
                  ),
              ],
            ),
            const SizedBox(height: Gap.sm),
            TextField(
              controller: _comment,
              maxLength: 500,
              minLines: 2,
              maxLines: 4,
              textCapitalization: TextCapitalization.sentences,
              decoration: InputDecoration(labelText: l.rateComment),
            ),
            if (_error != null) ...[Text(errorText(context, _error!), style: const TextStyle(color: Colors.red)), const SizedBox(height: Gap.sm)],
            FilledButton(
              onPressed: _rating == 0 || _sending ? null : _send,
              child: _sending ? const SizedBox.square(dimension: 22, child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white)) : Text(l.save),
            ),
          ],
        ),
      ),
    );
  }
}
