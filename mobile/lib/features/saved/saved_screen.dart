import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/providers.dart';
import '../../data/models.dart';
import '../../design/theme.dart';
import '../../design/widgets/common.dart';
import '../../design/widgets/deal_card.dart';
import '../../l10n/gen/app_localizations.dart';
import '../shell/shell_screen.dart';

class SavedScreen extends ConsumerWidget {
  const SavedScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = L.of(context);
    final signedIn = ref.watch(sessionProvider.select((session) => session.signedIn));
    if (!signedIn) {
      return Scaffold(
        appBar: AppBar(title: Text(l.navSaved)),
        body: const LoginRequired(icon: Icons.favorite_border_rounded),
      );
    }
    return DefaultTabController(
      length: 2,
      child: Scaffold(
        appBar: AppBar(
          title: Text(l.navSaved),
          bottom: TabBar(
            tabs: [
              Tab(text: l.savedDeals),
              Tab(text: l.savedBusinesses),
            ],
          ),
        ),
        body: const TabBarView(children: [_SavedDeals(), _Follows()]),
      ),
    );
  }
}

/// Pull-to-refresh that also works on the empty and error states.
class _Refreshable extends StatelessWidget {
  const _Refreshable({required this.onRefresh, required this.child});
  final Future<void> Function() onRefresh;
  final Widget child;

  @override
  Widget build(BuildContext context) => RefreshIndicator(
    onRefresh: onRefresh,
    child: LayoutBuilder(
      builder: (context, constraints) => SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        child: ConstrainedBox(
          constraints: BoxConstraints(minHeight: constraints.maxHeight),
          child: child,
        ),
      ),
    ),
  );
}

class _SavedDeals extends ConsumerWidget {
  const _SavedDeals();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = L.of(context);
    final favorites = ref.watch(favoritesProvider);
    Future<void> reload() => ref.refresh(favoritesProvider.future).then((_) {}, onError: (_) {});
    return switch (favorites) {
      AsyncValue(:final value?) when value.live.isEmpty && value.ended.isEmpty => _Refreshable(
        onRefresh: reload,
        child: StatePanel(
          icon: Icons.favorite_border_rounded,
          title: l.savedEmpty,
          text: l.savedEmptyText,
          actionLabel: l.navSearch,
          onAction: () => context.go('/search'),
        ),
      ),
      AsyncValue(:final value?) => RefreshIndicator(
        onRefresh: reload,
        child: ListView(
          padding: const EdgeInsets.all(Gap.gutter),
          children: [
            for (final deal in value.live)
              Padding(
                padding: const EdgeInsets.only(bottom: Gap.md),
                child: DealTile(deal),
              ),
            if (value.ended.isNotEmpty) ...[
              Padding(
                padding: const EdgeInsets.only(top: Gap.md, bottom: Gap.sm),
                child: Text(l.endedDeals, style: Theme.of(context).textTheme.titleMedium),
              ),
              for (final deal in value.ended)
                Padding(
                  padding: const EdgeInsets.only(bottom: Gap.md),
                  child: Opacity(opacity: 0.7, child: DealTile(deal)),
                ),
            ],
          ],
        ),
      ),
      AsyncValue(:final error?) => _Refreshable(
        onRefresh: reload,
        child: StatePanel.error(context, error, onRetry: () => ref.invalidate(favoritesProvider)),
      ),
      _ => const SkeletonList(count: 3),
    };
  }
}

class _Follows extends ConsumerWidget {
  const _Follows();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = L.of(context);
    final follows = ref.watch(followsProvider);
    Future<void> reload() => ref.refresh(followsProvider.future).then((_) {}, onError: (_) {});
    return switch (follows) {
      AsyncValue(:final value?) when value.isEmpty => _Refreshable(
        onRefresh: reload,
        child: StatePanel(icon: Icons.storefront_outlined, title: l.followsEmpty, text: l.followsEmptyText),
      ),
      AsyncValue(:final value?) => RefreshIndicator(
        onRefresh: reload,
        child: ListView.separated(
          padding: const EdgeInsets.all(Gap.gutter),
          itemCount: value.length,
          separatorBuilder: (_, _) => const SizedBox(height: Gap.sm),
          itemBuilder: (context, index) => _FollowTile(business: value[index]),
        ),
      ),
      AsyncValue(:final error?) => _Refreshable(
        onRefresh: reload,
        child: StatePanel.error(context, error, onRetry: () => ref.invalidate(followsProvider)),
      ),
      _ => const SkeletonList(count: 4, height: 72),
    };
  }
}

class _FollowTile extends ConsumerWidget {
  const _FollowTile({required this.business});
  final FollowedBusiness business;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = L.of(context);
    final city = ref.watch(configProvider).value?.city(business.city)?.name(ref.watch(settingsProvider).locale);
    return Card(
      clipBehavior: Clip.antiAlias,
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: Gap.md, vertical: Gap.xs),
        leading: ClipRRect(
          borderRadius: BorderRadius.circular(12),
          child: SizedBox.square(dimension: 48, child: AppImage(business.logo, small: true, icon: Icons.storefront_rounded)),
        ),
        title: Text(business.name, style: const TextStyle(fontWeight: FontWeight.w800)),
        subtitle: Text([?city, if (business.liveDeals > 0) l.liveDeals('${business.liveDeals}')].join(' · ')),
        trailing: const Icon(Icons.chevron_right_rounded),
        onTap: () => context.push('/businesses/${business.slug}'),
      ),
    );
  }
}
