import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/links.dart';
import '../../app/providers.dart';
import '../../core/env.dart';
import '../../data/models.dart';
import '../../design/icons.dart';
import '../../design/theme.dart';
import '../../design/widgets/common.dart';
import '../../design/widgets/deal_card.dart';
import '../../l10n/gen/app_localizations.dart';
import '../common/pickers.dart';
import '../join/promo.dart';

/// Home: what is on today where the person is — deals for their interests
/// first, then nearby (or in the chosen city), then the ones ending soon.
class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> with WidgetsBindingObserver {
  bool _locationFailed = false;

  /// The "add your business" card, hidden for a month when closed.
  late bool _promoHidden;

  /// The newest build whose "new version" card was closed.
  late int _updateHidden;

  /// The "how BugunBor works" card was closed.
  late bool _howHidden;

  @override
  void initState() {
    super.initState();
    final hiddenAt = ref.read(prefsProvider).promoHiddenAt;
    _promoHidden = hiddenAt != null && DateTime.now().difference(hiddenAt) < const Duration(days: 30);
    _updateHidden = ref.read(prefsProvider).dismissedUpdate;
    _howHidden = ref.read(prefsProvider).howHidden;
    WidgetsBinding.instance.addObserver(this);
    WidgetsBinding.instance.addPostFrameCallback((_) => _refreshLocation());
  }

  void _hidePromo() {
    ref.read(prefsProvider).promoHiddenAt = DateTime.now();
    setState(() => _promoHidden = true);
  }

  void _hideHow() {
    ref.read(prefsProvider).howHidden = true;
    setState(() => _howHidden = true);
  }

  /// Closed for this build only: a later one shows the card again.
  void _hideUpdate(int build) {
    ref.read(prefsProvider).dismissedUpdate = build;
    setState(() => _updateHidden = build);
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
    // Explained until it is closed or the person has used a code.
    final me = ref.watch(meProvider).value;
    // (Not over an error: the retry button stays on the first screen.)
    final showHow = !_howHidden && (me == null || (me.redeemed == 0 && me.activeCodes == 0)) && !(feed.hasError && !feed.hasValue);

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
              // An app installed from the site hears about a newer build here.
              if (config?.update case final update? when update.build > Env.build && update.build > _updateHidden)
                SliverToBoxAdapter(
                  child: _UpdateCard(onOpen: () => openExternal(Uri.parse(update.url)), onHide: () => _hideUpdate(update.build)),
                ),
              if (showHow) SliverToBoxAdapter(child: _HowItWorks(onHide: _hideHow)),
              if (config != null && config.categories.isNotEmpty)
                SliverToBoxAdapter(
                  child: _CategoryGrid(config: config, locale: settings.locale),
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
    final me = ref.watch(meProvider).value;
    final blocked = me?.blockedBusinessIds ?? const <String>{};
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
    // For people who may have a business: guests and accounts without one
    // (for an account, only once it is known, so owners never see it flash).
    final signedIn = ref.watch(sessionProvider.select((session) => session.signedIn));
    final promo = _promoHidden || (signedIn ? me == null || me.hasBusiness : false)
        ? null
        : SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(Gap.gutter, Gap.xl, Gap.gutter, 0),
              child: BusinessPromoCard(compact: true, onOpen: () => context.push('/business/new'), onHide: _hidePromo),
            ),
          );

    if (nearby.isEmpty) {
      final empty = StatePanel(
        icon: Icons.storefront_outlined,
        title: l.homeEmptyTitle,
        text: l.homeEmptyText,
        actionLabel: l.chooseCity,
        onAction: _pickPlace,
      );
      if (promo == null) return [SliverFillRemaining(hasScrollBody: false, child: empty)];
      return [SliverToBoxAdapter(child: empty), promo];
    }

    final forYouTitle = SliverToBoxAdapter(
      child: SectionTitle(l.homeForYou, action: interests.isEmpty ? null : l.profileInterests, onAction: () => context.push('/interests')),
    );
    final allDeals = '/search?sort=${located ? 'near' : 'ending'}';
    return [
      if (onlySamples)
        SliverToBoxAdapter(
          child: _Note(icon: Icons.info_outline_rounded, text: l.homeSamplesNote),
        ),
      // Picks for the person's interests lead when there are any.
      if (forYou.isNotEmpty) ...[forYouTitle, SliverToBoxAdapter(child: _DealRow(deals: forYou))],
      SliverToBoxAdapter(child: SectionTitle(located ? l.homeNearby : l.homeInCity(cityName ?? ''))),
      // A few nearby deals, then one clear way to all of them.
      _tiles(nearby.take(4).toList()),
      if (data.total > 4 || nearby.length > 4)
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(Gap.gutter, Gap.md, Gap.gutter, 0),
            child: OutlinedButton.icon(onPressed: () => context.go(allDeals), icon: const Icon(Icons.arrow_forward_rounded), label: Text(l.homeAllDeals)),
          ),
        ),
      if (ending.length > 3 && data.total > 4) ...[
        SliverToBoxAdapter(
          child: SectionTitle(l.homeEnding, action: l.homeAll, onAction: () => context.go('/search?sort=ending')),
        ),
        SliverToBoxAdapter(child: _DealRow(deals: ending)),
      ],
      // For business owners: this is how their deals would look.
      if (demo.isNotEmpty) ...[
        SliverToBoxAdapter(child: SectionTitle(l.demoCarouselTitle)),
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(Gap.gutter, 0, Gap.gutter, Gap.sm),
            child: Text(l.demoCarouselText, style: TextStyle(color: context.mutedText, height: 1.4)),
          ),
        ),
        SliverToBoxAdapter(child: _DealRow(deals: demo)),
      ],
      // No interests chosen yet: an invitation to choose them (chosen ones with no deal today add nothing here).
      if (forYou.isEmpty && interests.isEmpty) ...[forYouTitle, const SliverToBoxAdapter(child: _InterestsPrompt(hasInterests: false))],
      // For people who may have a business: small and last, after the deals.
      ?promo,
    ];
  }
}

Widget _tiles(List<DealCard> deals) => SliverPadding(
  padding: const EdgeInsets.symmetric(horizontal: Gap.gutter),
  sliver: SliverList.separated(
    itemCount: deals.length,
    separatorBuilder: (_, _) => const SizedBox(height: Gap.md),
    itemBuilder: (context, index) => DealTile(deals[index]),
  ),
);

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

/// All categories at a glance: four in a row, an icon over each name.
class _CategoryGrid extends StatelessWidget {
  const _CategoryGrid({required this.config, required this.locale});
  final AppConfig config;
  final String locale;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.fromLTRB(Gap.gutter - Gap.xs, Gap.md, Gap.gutter - Gap.xs, 0),
    child: LayoutBuilder(
      builder: (context, constraints) {
        final width = constraints.maxWidth / 4;
        final categories = config.categories.take(8).toList();
        // One size for all names: the longest decides, so no single name looks smaller.
        final widest = categories.fold(0.0, (most, category) => math.max(most, textWidth(context, category.name(locale), _CategoryTile.labelStyle)));
        final fit = math.min(1.0, (width - 2 * Gap.xs) / math.max(widest, 1));
        return Wrap(
          children: [
            for (final category in categories)
              SizedBox(
                width: width,
                child: _CategoryTile(
                  icon: iconFor(category.icon),
                  label: category.name(locale),
                  fit: fit,
                  onTap: () => context.go('/search?category=${category.slug}'),
                ),
              ),
          ],
        );
      },
    ),
  );
}

class _CategoryTile extends StatelessWidget {
  const _CategoryTile({required this.icon, required this.label, required this.fit, required this.onTap});
  final IconData icon;
  final String label;

  /// Below 1 when the longest name in the grid needs a smaller size.
  final double fit;
  final VoidCallback onTap;

  static const labelStyle = TextStyle(fontSize: 13, fontWeight: FontWeight.w600, height: 1.2);

  @override
  Widget build(BuildContext context) => Semantics(
    button: true,
    label: label,
    excludeSemantics: true,
    child: InkWell(
      borderRadius: BorderRadius.circular(16),
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: Gap.xs, vertical: Gap.sm),
        child: Column(
          children: [
            Container(
              width: 52,
              height: 52,
              decoration: BoxDecoration(
                color: context.isDark ? Brand.darkSurface : Brand.primary.withValues(alpha: 0.09),
                borderRadius: BorderRadius.circular(16),
                border: context.isDark ? Border.all(color: Brand.darkBorder) : null,
              ),
              child: Icon(icon, color: context.accentText, size: 26),
            ),
            const SizedBox(height: 6),
            // A long name makes all names a little smaller rather than being broken in two.
            FittedBox(
              fit: BoxFit.scaleDown,
              child: Text(label, maxLines: 1, style: labelStyle.copyWith(fontSize: labelStyle.fontSize! * fit)),
            ),
          ],
        ),
      ),
    ),
  );
}

/// For newcomers: what BugunBor is, in three steps. Closed for good by the ×.
class _HowItWorks extends StatelessWidget {
  const _HowItWorks({required this.onHide});
  final VoidCallback onHide;

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    Widget step(IconData icon, String label) => Expanded(
      child: Column(
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(color: Brand.primary.withValues(alpha: 0.12), shape: BoxShape.circle),
            child: Icon(icon, color: context.accentText, size: 24),
          ),
          const SizedBox(height: Gap.sm),
          Text(
            label,
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w700, height: 1.25),
          ),
        ],
      ),
    );
    final arrow = Padding(
      padding: const EdgeInsets.only(top: 12),
      child: Icon(Icons.chevron_right_rounded, size: 22, color: context.mutedText),
    );
    return Padding(
      padding: const EdgeInsets.fromLTRB(Gap.gutter, Gap.md, Gap.gutter, 0),
      child: Card(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(Gap.lg, Gap.sm, Gap.xs, Gap.lg),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(child: Text(l.homeHowTitle, style: Theme.of(context).textTheme.titleMedium)),
                  IconButton(tooltip: l.close, onPressed: onHide, icon: const Icon(Icons.close_rounded)),
                ],
              ),
              Padding(
                padding: const EdgeInsets.only(right: Gap.md),
                child: Text(l.homeHowText, style: TextStyle(color: context.mutedText, height: 1.35)),
              ),
              const SizedBox(height: Gap.lg),
              Padding(
                padding: const EdgeInsets.only(right: Gap.md),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    step(Icons.search_rounded, l.onbStep1),
                    arrow,
                    step(Icons.qr_code_2_rounded, l.onbStep2),
                    arrow,
                    step(Icons.point_of_sale_rounded, l.onbStep3),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
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

class _UpdateCard extends StatelessWidget {
  const _UpdateCard({required this.onOpen, required this.onHide});
  final VoidCallback onOpen;
  final VoidCallback onHide;

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    return Padding(
      padding: const EdgeInsets.fromLTRB(Gap.gutter, Gap.md, Gap.gutter, 0),
      child: Card(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(Gap.md, Gap.md, Gap.xs, Gap.md),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(color: Brand.primary.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(14)),
                child: const Icon(Icons.system_update_rounded, color: Brand.primary),
              ),
              const SizedBox(width: Gap.md),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(l.newVersionTitle, style: Theme.of(context).textTheme.titleMedium),
                    const SizedBox(height: 2),
                    Text(l.newVersionText, style: TextStyle(color: context.mutedText, height: 1.35)),
                    const SizedBox(height: Gap.sm),
                    FilledButton.icon(onPressed: onOpen, icon: const Icon(Icons.download_rounded, size: 18), label: Text(l.newVersionAction)),
                  ],
                ),
              ),
              IconButton(onPressed: onHide, tooltip: l.close, icon: const Icon(Icons.close_rounded)),
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
