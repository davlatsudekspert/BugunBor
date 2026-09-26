import 'dart:math';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:share_plus/share_plus.dart';

import '../../app/links.dart';
import '../../app/providers.dart';
import '../../core/api_error.dart';
import '../../core/format.dart';
import '../../core/time.dart';
import '../../data/models.dart';
import '../../design/icons.dart';
import '../../design/theme.dart';
import '../../design/widgets/common.dart';
import '../../design/widgets/deal_card.dart';
import '../../l10n/gen/app_localizations.dart';
import '../common/report_sheet.dart';

String _randomKey() {
  final random = Random.secure();
  return List.generate(16, (_) => random.nextInt(256).toRadixString(16).padLeft(2, '0')).join();
}

class DealScreen extends ConsumerStatefulWidget {
  const DealScreen({super.key, required this.slug});
  final String slug;

  @override
  ConsumerState<DealScreen> createState() => _DealScreenState();
}

class _DealScreenState extends ConsumerState<DealScreen> {
  /// Local copy after favorite/follow taps (shown before the server answers).
  DealDetail? _local;
  bool _booking = false;
  bool _counted = false;

  /// One key per booking attempt: a retry after a lost answer can't book twice.
  String? _claimKey;

  bool get _signedIn => ref.read(sessionProvider).signedIn;

  void _snack(String text) => ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(text)));

  Future<bool> _ensureSignedIn() async {
    if (_signedIn) return true;
    await context.push('/login');
    return mounted && _signedIn;
  }

  Future<void> _toggleFavorite(DealDetail deal) async {
    if (!await _ensureSignedIn()) return;
    final want = !deal.favorite;
    setState(() => _local = deal.copyWith(favorite: want));
    try {
      final saved = await ref.read(apiProvider).setFavorite(deal.id, want);
      if (mounted) setState(() => _local = deal.copyWith(favorite: saved));
      ref.invalidate(favoritesProvider);
    } catch (error) {
      if (!mounted) return;
      setState(() => _local = deal);
      _snack(errorText(context, error));
    }
  }

  Future<void> _toggleFollow(DealDetail deal) async {
    if (!await _ensureSignedIn()) return;
    final want = !deal.following;
    setState(() => _local = deal.copyWith(following: want, followers: max(0, deal.followers + (want ? 1 : -1))));
    try {
      final result = await ref.read(apiProvider).setFollowing(deal.business.id, want);
      if (mounted) setState(() => _local = deal.copyWith(following: result.following, followers: result.followers));
      ref.invalidate(followsProvider);
    } catch (error) {
      if (!mounted) return;
      setState(() => _local = deal);
      _snack(errorText(context, error));
    }
  }

  Future<void> _book(DealDetail deal) async {
    final wasSignedIn = _signedIn;
    if (!await _ensureSignedIn()) return;
    if (!wasSignedIn) {
      // Signing in may change the answer (a code already taken, the limit).
      try {
        deal = await ref.refresh(dealProvider(widget.slug).future);
      } catch (_) {
        return;
      }
      if (!mounted || deal.activeRedemptionId != null || deal.limitReached || !deal.claimable) return;
    }
    final branch = deal.branches.length == 1 ? deal.branches.first : await _chooseBranch(deal);
    if (branch == null || !mounted) return;
    final l = L.of(context);
    _claimKey ??= _randomKey();
    setState(() => _booking = true);
    try {
      final result = await ref.read(apiProvider).claim(deal.id, branchId: branch.id, idempotencyKey: _claimKey!);
      _claimKey = null;
      ref
        ..invalidate(myCodesProvider)
        ..invalidate(meProvider)
        ..invalidate(dealProvider(widget.slug));
      if (!mounted) return;
      setState(() {
        _booking = false;
        _local = null;
      });
      _snack(l.dealBooked);
      context.push('/codes/${result.id}');
    } catch (error) {
      // Only a lost answer keeps the key; any real answer ends this attempt.
      if (!(error is ApiError && error.isNetwork)) _claimKey = null;
      if (!mounted) return;
      setState(() => _booking = false);
      _snack(errorText(context, error));
      if (error is ApiError && !error.isNetwork) ref.invalidate(dealProvider(widget.slug));
    }
  }

  Future<Branch?> _chooseBranch(DealDetail deal) {
    final position = ref.read(settingsProvider).useLocation ? ref.read(locationProvider) : null;
    return showModalBottomSheet<Branch>(
      context: context,
      showDragHandle: true,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (context) {
        final l = L.of(context);
        return SafeArea(
          child: ListView(
            shrinkWrap: true,
            padding: const EdgeInsets.only(bottom: Gap.lg),
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(Gap.gutter, 0, Gap.gutter, Gap.sm),
                child: Text(l.dealChooseBranch, style: Theme.of(context).textTheme.titleLarge),
              ),
              for (final branch in deal.branches)
                ListTile(
                  leading: const Icon(Icons.storefront_outlined),
                  title: Text(branch.name, style: const TextStyle(fontWeight: FontWeight.w700)),
                  subtitle: Text(branch.address),
                  trailing: position == null
                      ? const Icon(Icons.chevron_right_rounded)
                      : Text(distanceLabel(context, _km(position.latitude, position.longitude, branch.latitude, branch.longitude)) ?? ''),
                  onTap: () => Navigator.pop(context, branch),
                ),
            ],
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    final async = ref.watch(dealProvider(widget.slug));
    ref.listen(dealProvider(widget.slug), (previous, next) {
      // Fresh data from the server replaces local taps.
      if (next.hasValue && !next.isLoading) _local = null;
      final deal = next.value;
      if (deal != null && !_counted) {
        _counted = true;
        ref.read(apiProvider).countView(deal.id);
      }
    });
    final deal = _local ?? async.value;
    if (deal == null) {
      return Scaffold(
        appBar: AppBar(),
        body: async.hasError
            ? StatePanel.error(context, async.error!, onRetry: () => ref.invalidate(dealProvider(widget.slug)))
            : const SkeletonList(count: 3, height: 140),
      );
    }
    final locale = ref.watch(settingsProvider.select((settings) => settings.locale));
    final category = ref.watch(configProvider).value?.category(deal.categorySlug);
    final saving = (deal.originalPrice ?? 0) - deal.price;

    return Scaffold(
      body: RefreshIndicator(
        onRefresh: () => ref.refresh(dealProvider(widget.slug).future).then((_) {}, onError: (_) {}),
        child: CustomScrollView(
          slivers: [
            SliverAppBar(
              pinned: true,
              expandedHeight: 260,
              title: Text(deal.title, maxLines: 1, overflow: TextOverflow.ellipsis),
              actions: [
                IconButton(
                  tooltip: l.share,
                  icon: const Icon(Icons.ios_share_rounded),
                  onPressed: () => SharePlus.instance.share(ShareParams(text: '${deal.title} — ${deal.business.name}\n${siteUrl('/deals/${deal.slug}')}')),
                ),
                if (!deal.isDemo)
                  IconButton(
                    tooltip: deal.favorite ? l.dealSaved : l.dealSave,
                    icon: Icon(deal.favorite ? Icons.favorite_rounded : Icons.favorite_border_rounded, color: deal.favorite ? Brand.primary : null),
                    onPressed: () => _toggleFavorite(deal),
                  ),
                PopupMenuButton<String>(
                  onSelected: (value) {
                    if (value == 'report') showReportSheet(context, ref, targetType: 'DEAL', targetId: deal.id);
                  },
                  itemBuilder: (context) => [PopupMenuItem(value: 'report', child: Text(l.report))],
                ),
              ],
              flexibleSpace: FlexibleSpaceBar(
                collapseMode: CollapseMode.parallax,
                background: Stack(
                  fit: StackFit.expand,
                  children: [
                    AppImage(deal.photo, icon: categoryIcon(deal.categorySlug)),
                    const DecoratedBox(
                      decoration: BoxDecoration(
                        gradient: LinearGradient(begin: Alignment.topCenter, end: Alignment(0, -0.2), colors: [Color(0x88000000), Color(0x00000000)]),
                      ),
                    ),
                    if (deal.discountPercent > 0) Positioned(left: Gap.gutter, bottom: Gap.md, child: DiscountBadge(deal.discountPercent)),
                  ],
                ),
              ),
            ),
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(Gap.gutter, Gap.lg, Gap.gutter, Gap.xl),
              sliver: SliverList.list(
                children: [
                  Wrap(
                    spacing: Gap.sm,
                    runSpacing: Gap.xs,
                    children: [
                      if (deal.isDemo) const DemoBadge(),
                      if (category != null)
                        Text(
                          category.name(locale),
                          style: TextStyle(color: context.mutedText, fontWeight: FontWeight.w700),
                        ),
                    ],
                  ),
                  const SizedBox(height: Gap.xs),
                  Text(deal.title, style: Theme.of(context).textTheme.headlineSmall),
                  const SizedBox(height: Gap.md),
                  PriceLine(price: deal.price, original: deal.originalPrice, large: true),
                  if (saving > 0) ...[
                    const SizedBox(height: Gap.xs),
                    Text(
                      l.dealYouSave(groupDigits(saving)),
                      style: const TextStyle(color: Brand.success, fontWeight: FontWeight.w800),
                    ),
                  ],
                  const SizedBox(height: Gap.lg),
                  _Facts(deal: deal),
                  if (deal.isDemo) ...[const SizedBox(height: Gap.lg), _DemoNotice(text: l.demoNotice)],
                  const SizedBox(height: Gap.lg),
                  _BusinessCard(deal: deal, onFollow: () => _toggleFollow(deal)),
                  if (deal.description.trim().isNotEmpty) ...[
                    const SizedBox(height: Gap.lg),
                    Text(deal.description, style: const TextStyle(fontSize: 16, height: 1.5)),
                  ],
                  if (deal.terms.trim().isNotEmpty) ...[
                    const SizedBox(height: Gap.lg),
                    Text(l.dealTerms, style: Theme.of(context).textTheme.titleMedium),
                    const SizedBox(height: Gap.xs),
                    Text(deal.terms, style: TextStyle(height: 1.5, color: context.mutedText)),
                  ],
                  if (deal.branches.isNotEmpty) ...[
                    const SizedBox(height: Gap.xl),
                    Text(l.dealBranches, style: Theme.of(context).textTheme.titleMedium),
                    const SizedBox(height: Gap.sm),
                    for (final branch in deal.branches) _BranchRow(branch: branch),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
      bottomNavigationBar: deal.isDemo ? null : _BookBar(deal: deal, busy: _booking, onBook: () => _book(deal)),
    );
  }
}

double _km(double lat1, double lng1, double lat2, double lng2) {
  const radius = 6371.0;
  double rad(double degrees) => degrees * pi / 180;
  final dLat = rad(lat2 - lat1);
  final dLng = rad(lng2 - lng1);
  final a = sin(dLat / 2) * sin(dLat / 2) + cos(rad(lat1)) * cos(rad(lat2)) * sin(dLng / 2) * sin(dLng / 2);
  return radius * 2 * atan2(sqrt(a), sqrt(1 - a));
}

class _Facts extends StatelessWidget {
  const _Facts({required this.deal});
  final DealDetail deal;

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    final now = DateTime.now().toUtc();
    final scheduled = deal.effective == 'SCHEDULED' || deal.startsAt.isAfter(now);
    final starts = toTashkent(deal.startsAt);
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(Gap.md),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (scheduled)
              _Fact(
                icon: Icons.event_rounded,
                child: Text(
                  l.dealStartsAt(
                    '${starts.day.toString().padLeft(2, '0')}.${starts.month.toString().padLeft(2, '0')} ${starts.hour}:${starts.minute.toString().padLeft(2, '0')}',
                  ),
                ),
              )
            else if (deal.endsAt.isAfter(now))
              _Fact(
                icon: Icons.schedule_rounded,
                child: Wrap(spacing: 4, children: [Text(l.endsInLabel), Countdown(deal.endsAt)]),
              ),
            if (deal.remaining != null) _Fact(icon: Icons.local_fire_department_outlined, child: Text(l.left('${deal.remaining}'))),
            _Fact(icon: Icons.person_outline_rounded, child: Text(l.dealPerCustomer('${deal.perCustomerLimit}'))),
            _Fact(icon: Icons.qr_code_2_rounded, child: Text(l.dealCodeValid('${deal.claimTtlMinutes}'))),
          ],
        ),
      ),
    );
  }
}

class _Fact extends StatelessWidget {
  const _Fact({required this.icon, required this.child});
  final IconData icon;
  final Widget child;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 5),
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 20, color: Brand.primary),
        const SizedBox(width: Gap.sm),
        Expanded(
          child: DefaultTextStyle.merge(style: const TextStyle(fontSize: 15, height: 1.35), child: child),
        ),
      ],
    ),
  );
}

class _DemoNotice extends StatelessWidget {
  const _DemoNotice({required this.text});
  final String text;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(Gap.md),
    decoration: BoxDecoration(
      color: const Color(0xFFFEF3C7),
      borderRadius: BorderRadius.circular(14),
      border: Border.all(color: const Color(0xFFFCD34D)),
    ),
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Icon(Icons.info_outline_rounded, color: Color(0xFF92400E)),
        const SizedBox(width: Gap.sm),
        Expanded(
          child: Text(text, style: const TextStyle(color: Color(0xFF78350F), height: 1.4)),
        ),
      ],
    ),
  );
}

class _BusinessCard extends StatelessWidget {
  const _BusinessCard({required this.deal, required this.onFollow});
  final DealDetail deal;
  final VoidCallback onFollow;

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    final business = deal.business;
    return Card(
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          InkWell(
            onTap: () => context.push('/businesses/${business.slug}'),
            child: Padding(
              padding: const EdgeInsets.all(Gap.md),
              child: Row(
                children: [
                  ClipRRect(
                    borderRadius: BorderRadius.circular(12),
                    child: SizedBox.square(dimension: 52, child: AppImage(business.logo, small: true, icon: Icons.storefront_rounded)),
                  ),
                  const SizedBox(width: Gap.md),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(business.name, maxLines: 2, overflow: TextOverflow.ellipsis, style: Theme.of(context).textTheme.titleMedium),
                        if (business.rating != null && business.rating!.count > 0)
                          Wrap(
                            spacing: 4,
                            crossAxisAlignment: WrapCrossAlignment.center,
                            children: [
                              RatingStars(business.rating!.average, size: 14),
                              Text(
                                '${business.rating!.average.toStringAsFixed(1)} (${business.rating!.count})',
                                style: TextStyle(color: context.mutedText, fontSize: 12.5),
                              ),
                            ],
                          ),
                        Text(l.followers('${deal.followers}'), style: TextStyle(color: context.mutedText, fontSize: 12.5)),
                      ],
                    ),
                  ),
                  const Icon(Icons.chevron_right_rounded),
                ],
              ),
            ),
          ),
          if (!deal.isDemo)
            Padding(
              padding: const EdgeInsets.fromLTRB(Gap.md, 0, Gap.md, Gap.md),
              child: deal.following
                  ? OutlinedButton.icon(onPressed: onFollow, icon: const Icon(Icons.check_rounded), label: Text(l.followingLabel))
                  : FilledButton.tonalIcon(
                      onPressed: onFollow,
                      style: FilledButton.styleFrom(minimumSize: const Size(Gap.tap, Gap.tap)),
                      icon: const Icon(Icons.notifications_active_outlined),
                      label: Text(l.follow),
                    ),
            ),
        ],
      ),
    );
  }
}

class _BranchRow extends StatelessWidget {
  const _BranchRow({required this.branch});
  final Branch branch;

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    return Padding(
      padding: const EdgeInsets.only(bottom: Gap.sm),
      child: Card(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(Gap.md, Gap.sm, Gap.xs, Gap.sm),
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(branch.name, style: const TextStyle(fontWeight: FontWeight.w800)),
                    Text(branch.address, style: TextStyle(color: context.mutedText)),
                  ],
                ),
              ),
              if (branch.phone != null) IconButton(tooltip: l.call, icon: const Icon(Icons.call_outlined), onPressed: () => callPhone(branch.phone!)),
              if (branch.latitude != 0 || branch.longitude != 0)
                IconButton(
                  tooltip: l.dealDirections,
                  icon: const Icon(Icons.directions_outlined, color: Brand.primary),
                  onPressed: () => openDirections(branch.latitude, branch.longitude, branch.name),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _BookBar extends ConsumerWidget {
  const _BookBar({required this.deal, required this.busy, required this.onBook});
  final DealDetail deal;
  final bool busy;
  final VoidCallback onBook;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = L.of(context);
    final signedIn = ref.watch(sessionProvider.select((session) => session.signedIn));
    final Widget child;
    if (deal.activeRedemptionId != null) {
      child = Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            l.dealHaveCode,
            textAlign: TextAlign.center,
            style: TextStyle(color: context.mutedText),
          ),
          const SizedBox(height: Gap.xs),
          FilledButton.icon(
            onPressed: () => context.push('/codes/${deal.activeRedemptionId}'),
            icon: const Icon(Icons.qr_code_2_rounded),
            label: Text(l.dealViewCode),
          ),
        ],
      );
    } else if (signedIn && deal.limitReached) {
      child = FilledButton(onPressed: null, child: Text(l.dealLimitReached, textAlign: TextAlign.center));
    } else if (!deal.claimable) {
      final text = switch (deal.effective) {
        'SOLD_OUT' => l.dealSoldOut,
        'EXPIRED' => l.dealEnded,
        'SCHEDULED' => l.dealNotStarted,
        _ => l.dealUnavailable,
      };
      child = FilledButton(onPressed: null, child: Text(text, textAlign: TextAlign.center));
    } else {
      child = FilledButton(
        onPressed: busy ? null : onBook,
        child: busy
            ? const SizedBox.square(dimension: 22, child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white))
            : Text(signedIn ? l.dealBook : l.dealLoginToBook),
      );
    }
    return Material(
      color: Theme.of(context).colorScheme.surface,
      elevation: 8,
      child: SafeArea(
        top: false,
        child: Padding(padding: const EdgeInsets.fromLTRB(Gap.gutter, Gap.md, Gap.gutter, Gap.md), child: child),
      ),
    );
  }
}
