import 'dart:math';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:share_plus/share_plus.dart';

import '../../app/links.dart';
import '../../app/providers.dart';
import '../../data/models.dart';
import '../../design/theme.dart';
import '../../design/widgets/common.dart';
import '../../design/widgets/deal_card.dart';
import '../../l10n/gen/app_localizations.dart';
import '../common/report_sheet.dart';

class BusinessScreen extends ConsumerStatefulWidget {
  const BusinessScreen({super.key, required this.slug});
  final String slug;

  @override
  ConsumerState<BusinessScreen> createState() => _BusinessScreenState();
}

class _BusinessScreenState extends ConsumerState<BusinessScreen> {
  ({bool following, int followers})? _follow;
  bool _busy = false;

  void _snack(String text) => ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(text)));

  Future<bool> _ensureSignedIn() async {
    if (ref.read(sessionProvider).signedIn) return true;
    await context.push('/login');
    return mounted && ref.read(sessionProvider).signedIn;
  }

  Future<void> _toggleFollow(BusinessPage business, bool following, int followers) async {
    if (!await _ensureSignedIn()) return;
    final want = !following;
    setState(() => _follow = (following: want, followers: max(0, followers + (want ? 1 : -1))));
    try {
      final result = await ref.read(apiProvider).setFollowing(business.id, want);
      if (mounted) setState(() => _follow = result);
      ref.invalidate(followsProvider);
    } catch (error) {
      if (!mounted) return;
      setState(() => _follow = (following: following, followers: followers));
      _snack(errorText(context, error));
    }
  }

  Future<void> _toggleBlock(BusinessPage business, bool blocked) async {
    if (!await _ensureSignedIn() || !mounted) return;
    final l = L.of(context);
    if (!blocked) {
      final ok = await showDialog<bool>(
        context: context,
        builder: (context) => AlertDialog(
          content: Text(l.blockAsk),
          actions: [
            TextButton(onPressed: () => Navigator.pop(context, false), child: Text(l.cancel)),
            TextButton(onPressed: () => Navigator.pop(context, true), child: Text(l.block)),
          ],
        ),
      );
      if (ok != true || !mounted) return;
    }
    setState(() => _busy = true);
    try {
      await ref.read(apiProvider).setBlocked(business.id, !blocked);
      ref
        ..invalidate(meProvider)
        ..invalidate(feedProvider)
        ..invalidate(followsProvider)
        ..invalidate(businessProvider(widget.slug));
      if (!mounted) return;
      setState(() {
        _busy = false;
        _follow = null;
      });
      _snack(blocked ? l.unblocked : l.blocked);
    } catch (error) {
      if (!mounted) return;
      setState(() => _busy = false);
      _snack(errorText(context, error));
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    final async = ref.watch(businessProvider(widget.slug));
    ref.listen(businessProvider(widget.slug), (_, next) {
      if (next.hasValue && !next.isLoading) _follow = null;
    });
    final business = async.value;
    if (business == null) {
      return Scaffold(
        appBar: AppBar(),
        body: async.hasError
            ? StatePanel.error(context, async.error!, onRetry: () => ref.invalidate(businessProvider(widget.slug)))
            : const SkeletonList(count: 3, height: 140),
      );
    }
    final blocked = ref.watch(meProvider).value?.blockedBusinessIds.contains(business.id) ?? false;
    final following = _follow?.following ?? business.following;
    final followers = _follow?.followers ?? business.followers;

    return Scaffold(
      body: RefreshIndicator(
        onRefresh: () => ref.refresh(businessProvider(widget.slug).future).then((_) {}, onError: (_) {}),
        child: CustomScrollView(
          slivers: [
            SliverAppBar(
              pinned: true,
              expandedHeight: business.cover == null ? null : 200,
              title: Text(business.name, maxLines: 1, overflow: TextOverflow.ellipsis),
              actions: [
                IconButton(
                  tooltip: l.share,
                  icon: const Icon(Icons.ios_share_rounded),
                  onPressed: () => SharePlus.instance.share(ShareParams(text: '${business.name}\n${siteUrl('/businesses/${business.slug}')}')),
                ),
                if (!business.isDemo)
                  PopupMenuButton<String>(
                    enabled: !_busy,
                    onSelected: (value) {
                      if (value == 'report') showReportSheet(context, ref, targetType: 'BUSINESS', targetId: business.id);
                      if (value == 'block') _toggleBlock(business, blocked);
                    },
                    itemBuilder: (context) => [
                      PopupMenuItem(value: 'report', child: Text(l.report)),
                      PopupMenuItem(value: 'block', child: Text(blocked ? l.unblock : l.block)),
                    ],
                  ),
              ],
              flexibleSpace: business.cover == null ? null : FlexibleSpaceBar(background: AppImage(business.cover, icon: Icons.storefront_rounded)),
            ),
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(Gap.gutter, Gap.lg, Gap.gutter, Gap.xl),
              sliver: SliverList.list(
                children: [
                  Row(
                    children: [
                      ClipRRect(
                        borderRadius: BorderRadius.circular(16),
                        child: SizedBox.square(dimension: 68, child: AppImage(business.logo, small: true, icon: Icons.storefront_rounded)),
                      ),
                      const SizedBox(width: Gap.md),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Wrap(
                              spacing: Gap.sm,
                              crossAxisAlignment: WrapCrossAlignment.center,
                              children: [
                                Text(business.name, style: Theme.of(context).textTheme.titleLarge),
                                if (business.isDemo) const DemoBadge(),
                              ],
                            ),
                            if (business.rating != null && business.rating!.count > 0)
                              Row(
                                children: [
                                  RatingStars(business.rating!.average),
                                  const SizedBox(width: 4),
                                  Text(
                                    '${business.rating!.average.toStringAsFixed(1)} (${business.rating!.count})',
                                    style: TextStyle(color: context.mutedText),
                                  ),
                                ],
                              ),
                            Text(l.followers('$followers'), style: TextStyle(color: context.mutedText, fontSize: 13)),
                          ],
                        ),
                      ),
                    ],
                  ),
                  if (blocked) ...[
                    const SizedBox(height: Gap.md),
                    Text(
                      l.blockedNote,
                      style: const TextStyle(color: Brand.warning, fontWeight: FontWeight.w700),
                    ),
                  ],
                  if (!business.isDemo && !blocked) ...[
                    const SizedBox(height: Gap.md),
                    following
                        ? OutlinedButton.icon(
                            onPressed: () => _toggleFollow(business, following, followers),
                            icon: const Icon(Icons.check_rounded),
                            label: Text(l.followingLabel),
                          )
                        : FilledButton.icon(
                            onPressed: () => _toggleFollow(business, following, followers),
                            icon: const Icon(Icons.notifications_active_outlined),
                            label: Text(l.follow),
                          ),
                  ],
                  const SizedBox(height: Gap.md),
                  _Contacts(business: business),
                  if (business.description.trim().isNotEmpty) ...[
                    const SizedBox(height: Gap.md),
                    Text(business.description, style: const TextStyle(fontSize: 15.5, height: 1.5)),
                  ],
                  const SizedBox(height: Gap.xl),
                  Text(l.businessDeals, style: Theme.of(context).textTheme.titleLarge),
                  const SizedBox(height: Gap.sm),
                  if (business.deals.isEmpty)
                    Text(l.businessNoDeals, style: TextStyle(color: context.mutedText))
                  else
                    for (final deal in business.deals)
                      Padding(
                        padding: const EdgeInsets.only(bottom: Gap.md),
                        child: DealTile(deal),
                      ),
                  if (business.upcoming.isNotEmpty) ...[
                    const SizedBox(height: Gap.lg),
                    Text(l.businessUpcoming, style: Theme.of(context).textTheme.titleLarge),
                    const SizedBox(height: Gap.sm),
                    for (final deal in business.upcoming)
                      Padding(
                        padding: const EdgeInsets.only(bottom: Gap.md),
                        child: DealTile(deal),
                      ),
                  ],
                  if (business.branches.isNotEmpty) ...[
                    const SizedBox(height: Gap.lg),
                    Text(l.dealBranches, style: Theme.of(context).textTheme.titleLarge),
                    const SizedBox(height: Gap.sm),
                    for (final branch in business.branches) _Branch(branch: branch),
                  ],
                  if (business.reviews.isNotEmpty) ...[
                    const SizedBox(height: Gap.lg),
                    Text(l.businessReviews, style: Theme.of(context).textTheme.titleLarge),
                    const SizedBox(height: Gap.sm),
                    for (final review in business.reviews) _ReviewTile(review: review, canReport: !business.isDemo),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Contacts extends StatelessWidget {
  const _Contacts({required this.business});
  final BusinessPage business;

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    final buttons = <Widget>[
      if (business.phone != null) _ContactButton(icon: Icons.call_outlined, label: l.call, onTap: () => callPhone(business.phone!)),
      if (business.telegram != null) _ContactButton(icon: Icons.send_outlined, label: 'Telegram', onTap: () => openExternal(telegramUri(business.telegram!))),
      if (business.instagram != null)
        _ContactButton(icon: Icons.camera_alt_outlined, label: 'Instagram', onTap: () => openExternal(instagramUri(business.instagram!))),
      if (business.website != null) _ContactButton(icon: Icons.language_rounded, label: l.website, onTap: () => openExternal(websiteUri(business.website!))),
    ];
    if (buttons.isEmpty) return const SizedBox.shrink();
    return Wrap(spacing: Gap.sm, runSpacing: Gap.sm, children: buttons);
  }
}

class _ContactButton extends StatelessWidget {
  const _ContactButton({required this.icon, required this.label, required this.onTap});
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => OutlinedButton.icon(onPressed: onTap, icon: Icon(icon, size: 18), label: Text(label));
}

class _Branch extends StatelessWidget {
  const _Branch({required this.branch});
  final Branch branch;

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    return Padding(
      padding: const EdgeInsets.only(bottom: Gap.sm),
      child: Card(
        child: ListTile(
          contentPadding: const EdgeInsets.only(left: Gap.md, right: Gap.xs),
          title: Text(branch.name, style: const TextStyle(fontWeight: FontWeight.w800)),
          subtitle: Text(branch.address),
          trailing: IconButton(
            tooltip: l.dealDirections,
            icon: const Icon(Icons.directions_outlined, color: Brand.primary),
            onPressed: () => openDirections(branch.latitude, branch.longitude, branch.name),
          ),
        ),
      ),
    );
  }
}

class _ReviewTile extends ConsumerWidget {
  const _ReviewTile({required this.review, required this.canReport});
  final Review review;
  final bool canReport;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = L.of(context);
    return Padding(
      padding: const EdgeInsets.only(bottom: Gap.sm),
      child: Card(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(Gap.md, Gap.sm, 0, Gap.md),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  RatingStars(review.rating.toDouble(), size: 15),
                  const SizedBox(width: Gap.sm),
                  Expanded(
                    child: Text(
                      review.author ?? '',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(color: context.mutedText, fontSize: 13),
                    ),
                  ),
                  if (canReport)
                    IconButton(
                      tooltip: l.report,
                      icon: Icon(Icons.flag_outlined, size: 20, color: context.mutedText),
                      onPressed: () => showReportSheet(context, ref, targetType: 'REVIEW', targetId: review.id),
                    ),
                ],
              ),
              if (review.comment != null)
                Padding(
                  padding: const EdgeInsets.only(right: Gap.md),
                  child: Text(review.comment!, style: const TextStyle(height: 1.4)),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
