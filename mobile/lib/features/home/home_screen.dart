import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/links.dart';
import '../../app/providers.dart';
import '../../data/models.dart';
import '../../design/icons.dart';
import '../../design/theme.dart';
import '../../design/widgets/common.dart';
import '../../design/widgets/deal_card.dart';
import '../../l10n/gen/app_localizations.dart';
import '../common/pickers.dart';

/// Home: what is on today where the person is — deals for their interests
/// first, then nearby (or in the chosen city), then the ones ending soon.
class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> with WidgetsBindingObserver {
  bool _locationFailed = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    WidgetsBinding.instance.addPostFrameCallback((_) => _refreshLocation());
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    // Back in the app after a while: the person may have moved.
    if (state == AppLifecycleState.resumed) _refreshLocation();
  }

  Future<void> _refreshLocation() async {
    if (!ref.read(settingsProvider).useLocation) return;
    final ok = await ref.read(locationProvider.notifier).refresh();
    if (mounted) setState(() => _locationFailed = !ok);
  }

  Future<void> _reload() async {
    await _refreshLocation();
    ref.invalidate(configProvider);
    // A failure is shown by the feed itself.
    await ref.refresh(feedProvider.future).then((_) {}, onError: (_) {});
  }

  Future<void> _pickPlace() async {
    final choice = await showPlacePicker(context, ref);
    if (choice == null || !mounted) return;
    final ok = await applyPlaceChoice(ref, choice);
    if (!mounted) return;
    setState(() => _locationFailed = !ok);
    if (!ok) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(L.of(context).homeLocationDenied)));
  }

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    final settings = ref.watch(settingsProvider);
    final feed = ref.watch(feedProvider);
    final config = ref.watch(configProvider).value;
    final located = settings.useLocation && ref.watch(locationProvider) != null;
    final cityName = config?.city(feed.value?.city ?? settings.city)?.name(settings.locale);
    final placeLabel = located ? l.homeUseLocation : (cityName ?? l.chooseCity);

    return Scaffold(
      body: SafeArea(
        bottom: false,
        child: RefreshIndicator(
          onRefresh: _reload,
          child: CustomScrollView(
            slivers: [
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(Gap.gutter, Gap.md, Gap.sm, 0),
                  child: Row(
                    children: [
                      Expanded(child: Text(l.homeTitle, style: Theme.of(context).textTheme.headlineSmall)),
                      Flexible(
                        child: TextButton.icon(
                          onPressed: _pickPlace,
                          icon: Icon(located ? Icons.my_location_rounded : Icons.place_outlined, size: 18),
                          label: Text(placeLabel, maxLines: 1, overflow: TextOverflow.ellipsis),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(Gap.gutter, Gap.sm, Gap.gutter, 0),
                  child: _SearchEntry(hint: l.homeSearchHint, onTap: () => context.go('/search?focus=1')),
                ),
              ),
              if (config != null && config.categories.isNotEmpty)
                SliverToBoxAdapter(
                  child: _CategoryRow(config: config, locale: settings.locale),
                ),
              if (_locationFailed && settings.useLocation)
                SliverToBoxAdapter(
                  child: _Note(icon: Icons.location_off_outlined, text: l.homeLocationDenied),
                ),
              if (feed.hasError && feed.hasValue)
                SliverToBoxAdapter(
                  child: _Note(icon: Icons.wifi_off_rounded, text: l.offline),
                ),
              ..._body(context, feed, located: located, cityName: cityName),
              const SliverToBoxAdapter(child: SizedBox(height: Gap.xl)),
            ],
          ),
        ),
      ),
    );
  }

  List<Widget> _body(BuildContext context, AsyncValue<Feed> feed, {required bool located, required String? cityName}) {
    final l = L.of(context);
    if (!feed.hasValue) {
      if (feed.hasError) {
        return [SliverFillRemaining(hasScrollBody: false, child: StatePanel.error(context, feed.error!, onRetry: () => ref.invalidate(feedProvider)))];
      }
      return const [SliverToBoxAdapter(child: _HomeSkeleton())];
    }
    final data = feed.requireValue;
    final blocked = ref.watch(meProvider).value?.blockedBusinessIds ?? const <String>{};
    bool visible(DealCard deal) => !blocked.contains(deal.business.id);
    final hasReal = data.nearby.any((deal) => visible(deal) && !deal.isDemo);
    // Real deals first. Where there are none yet, the sample ones (marked
    // «Namuna», never bookable) fill the sections to show how it works.
    List<DealCard> pick(List<DealCard> deals) => deals.where((deal) => visible(deal) && (!hasReal || !deal.isDemo)).toList();
    final forYou = pick(data.forYou);
    final nearby = pick(data.nearby);
    final ending = pick(data.ending);
    final seen = <String>{};
    final demo = hasReal ? [...data.nearby, ...data.ending, ...data.forYou].where((deal) => deal.isDemo && seen.add(deal.id)).toList() : <DealCard>[];
    final onlySamples = !hasReal && nearby.isNotEmpty;
    final interests = ref.watch(interestsProvider);

    if (nearby.isEmpty) {
      return [
        SliverFillRemaining(
          hasScrollBody: false,
          child: StatePanel(icon: Icons.storefront_outlined, title: l.homeEmptyTitle, text: l.homeEmptyText, actionLabel: l.chooseCity, onAction: _pickPlace),
        ),
      ];
    }

    return [
      if (onlySamples)
        SliverToBoxAdapter(
          child: _Note(icon: Icons.info_outline_rounded, text: l.homeSamplesNote),
        ),
      SliverToBoxAdapter(
        child: SectionTitle(l.homeForYou, action: interests.isEmpty ? null : l.profileInterests, onAction: () => context.push('/interests')),
      ),
      SliverToBoxAdapter(
        child: forYou.isEmpty ? _InterestsPrompt(hasInterests: interests.isNotEmpty) : _DealRow(deals: forYou),
      ),
      SliverToBoxAdapter(
        child: SectionTitle(
          located ? l.homeNearby : l.homeInCity(cityName ?? ''),
          action: data.total > nearby.length || nearby.length > 8 ? l.homeAll : null,
          onAction: () => context.go('/search?sort=${located ? 'near' : 'ending'}'),
        ),
      ),
      SliverPadding(
        padding: const EdgeInsets.symmetric(horizontal: Gap.gutter),
        sliver: SliverList.separated(
          itemCount: nearby.length.clamp(0, 8),
          separatorBuilder: (_, _) => const SizedBox(height: Gap.md),
          itemBuilder: (context, index) => DealTile(nearby[index]),
        ),
      ),
      if (ending.length > 3 && data.total > 4) ...[
        SliverToBoxAdapter(
          child: SectionTitle(l.homeEnding, action: l.homeAll, onAction: () => context.go('/search?sort=ending')),
        ),
        SliverToBoxAdapter(child: _DealRow(deals: ending)),
      ],
      // For business owners: this is how their deals would look.
      if (demo.isNotEmpty || onlySamples) ...[
        SliverToBoxAdapter(child: SectionTitle(l.demoCarouselTitle)),
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(Gap.gutter, 0, Gap.gutter, Gap.sm),
            child: Text(l.demoCarouselText, style: TextStyle(color: context.mutedText, height: 1.4)),
          ),
        ),
        if (demo.isNotEmpty) SliverToBoxAdapter(child: _DealRow(deals: demo)),
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(Gap.gutter, Gap.md, Gap.gutter, 0),
            child: OutlinedButton.icon(
              onPressed: () => openSite('/business', lang: ref.read(settingsProvider).locale),
              icon: const Icon(Icons.add_business_outlined),
              label: Text(l.addBusiness),
            ),
          ),
        ),
      ],
    ];
  }
}

class _SearchEntry extends StatelessWidget {
  const _SearchEntry({required this.hint, required this.onTap});
  final String hint;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Semantics(
    button: true,
    label: hint,
    child: Material(
      color: context.isDark ? Brand.darkSurface : Colors.white,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(14),
        side: BorderSide(color: context.borderColor),
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: onTap,
        child: SizedBox(
          height: 52,
          child: Row(
            children: [
              const SizedBox(width: Gap.md),
              Icon(Icons.search_rounded, color: context.mutedText),
              const SizedBox(width: Gap.sm),
              Expanded(
                child: Text(
                  hint,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(color: context.mutedText),
                ),
              ),
            ],
          ),
        ),
      ),
    ),
  );
}

class _CategoryRow extends StatelessWidget {
  const _CategoryRow({required this.config, required this.locale});
  final AppConfig config;
  final String locale;

  @override
  Widget build(BuildContext context) => SizedBox(
    height: 64,
    child: ListView.separated(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.fromLTRB(Gap.gutter, Gap.md, Gap.gutter, 0),
      itemCount: config.categories.length,
      separatorBuilder: (_, _) => const SizedBox(width: Gap.sm),
      itemBuilder: (context, index) {
        final category = config.categories[index];
        return ActionChip(
          avatar: Icon(iconFor(category.icon), size: 18, color: Brand.primary),
          label: Text(category.name(locale)),
          onPressed: () => context.go('/search?category=${category.slug}'),
        );
      },
    ),
  );
}

class _DealRow extends StatelessWidget {
  const _DealRow({required this.deals});
  final List<DealCard> deals;

  @override
  Widget build(BuildContext context) {
    final width = (MediaQuery.sizeOf(context).width * 0.72).clamp(220.0, 300.0);
    // At most a dozen cards (the server's limit), so a plain row: its height
    // follows the content at any text size instead of a guessed number.
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.symmetric(horizontal: Gap.gutter),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          for (var index = 0; index < deals.length; index++) ...[if (index > 0) const SizedBox(width: Gap.md), DealCompactCard(deals[index], width: width)],
        ],
      ),
    );
  }
}

class _InterestsPrompt extends StatelessWidget {
  const _InterestsPrompt({required this.hasInterests});
  final bool hasInterests;

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: Gap.gutter),
      child: Card(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(Gap.lg, Gap.lg, Gap.sm, Gap.xs),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Icon(Icons.favorite_outline_rounded, color: Brand.primary),
                  const SizedBox(width: Gap.md),
                  Expanded(child: Text(hasInterests ? l.homeForYouNone : l.homeForYouEmpty, style: const TextStyle(height: 1.35))),
                ],
              ),
              Align(
                alignment: AlignmentDirectional.centerEnd,
                child: TextButton(onPressed: () => context.push('/interests'), child: Text(hasInterests ? l.homeChange : l.homeChooseInterests)),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Note extends StatelessWidget {
  const _Note({required this.icon, required this.text});
  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.fromLTRB(Gap.gutter, Gap.md, Gap.gutter, 0),
    child: Container(
      padding: const EdgeInsets.all(Gap.md),
      decoration: BoxDecoration(color: Brand.primary.withValues(alpha: 0.08), borderRadius: BorderRadius.circular(14)),
      child: Row(
        children: [
          Icon(icon, size: 20, color: Brand.primary),
          const SizedBox(width: Gap.sm),
          Expanded(child: Text(text, style: const TextStyle(height: 1.35))),
        ],
      ),
    ),
  );
}

class _HomeSkeleton extends StatelessWidget {
  const _HomeSkeleton();

  @override
  Widget build(BuildContext context) => const Padding(
    padding: EdgeInsets.all(Gap.gutter),
    child: Column(
      children: [
        Skeleton(height: 28, width: 160),
        SizedBox(height: Gap.md),
        Skeleton(height: 190),
        SizedBox(height: Gap.xl),
        Skeleton(height: 128),
        SizedBox(height: Gap.md),
        Skeleton(height: 128),
      ],
    ),
  );
}
