import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/providers.dart';
import '../../data/models.dart';
import '../../design/theme.dart';
import '../../design/widgets/common.dart';
import '../../design/widgets/deal_card.dart';
import '../../l10n/gen/app_localizations.dart';

const _pageSize = 24;
const _sorts = ['ending', 'discount', 'new', 'near'];

/// Search and filters over all live deals of the city (or around the phone).
/// The chosen category, order and «Setlar» live in the address
/// (/search?category=…&set=1), so a link from Home always shows what it names.
class SearchScreen extends ConsumerStatefulWidget {
  const SearchScreen({super.key, this.category, this.sort, this.sets = false, this.query, this.focus = false});
  final String? category;
  final String? sort;

  /// Only sets (restaurants' «to‘plam» deals).
  final bool sets;
  final String? query;
  final bool focus;

  @override
  ConsumerState<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends ConsumerState<SearchScreen> {
  final _text = TextEditingController();
  final _focus = FocusNode();
  final _scroll = ScrollController();
  Timer? _debounce;

  String? _category;
  String _sort = 'ending';
  bool _sets = false;
  final _items = <DealCard>[];
  int _total = 0;
  bool _loading = false;
  Object? _error;

  /// Answers to older requests are dropped when filters changed meanwhile.
  int _generation = 0;

  @override
  void initState() {
    super.initState();
    _applyRoute();
    _scroll.addListener(_maybeLoadMore);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _reload();
      if (widget.focus) _focus.requestFocus();
    });
  }

  @override
  void didUpdateWidget(SearchScreen old) {
    super.didUpdateWidget(old);
    if (old.category != widget.category || old.sort != widget.sort || old.sets != widget.sets || old.query != widget.query) {
      _applyRoute();
      _reload();
    }
    if (widget.focus && !old.focus) _focus.requestFocus();
  }

  void _applyRoute() {
    _category = widget.category;
    _sort = _sorts.contains(widget.sort) ? widget.sort! : 'ending';
    _sets = widget.sets;
    if (widget.query != null) _text.text = widget.query!;
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _text.dispose();
    _focus.dispose();
    _scroll.dispose();
    super.dispose();
  }

  void _maybeLoadMore() {
    if (!mounted || !_scroll.hasClients) return;
    if (_scroll.position.extentAfter < 600 && !_loading && _error == null && _items.length < _total) _load();
  }

  void _onQueryChanged(String _) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 400), _reload);
  }

  void _reload() {
    _generation++;
    setState(() {
      _items.clear();
      _total = 0;
      _error = null;
      _loading = false;
    });
    _load();
  }

  Future<void> _load() async {
    final generation = _generation;
    setState(() {
      _loading = true;
      _error = null;
    });
    final settings = ref.read(settingsProvider);
    final position = settings.useLocation ? ref.read(locationProvider) : null;
    // The city the person chose; without one, the city the server picked for Home.
    final city = settings.city ?? ref.read(feedProvider).value?.city;
    try {
      final page = await ref
          .read(apiProvider)
          .deals(
            // Around the phone when located, otherwise the chosen city.
            city: position == null ? city : null,
            category: _category,
            query: _text.text,
            sort: _sort == 'near' && position == null ? 'ending' : _sort,
            sets: _sets,
            lat: position?.latitude,
            lng: position?.longitude,
            limit: _pageSize,
            offset: _items.length,
          );
      if (!mounted || generation != _generation) return;
      setState(() {
        _items.addAll(page.items);
        _total = page.total;
        _loading = false;
      });
    } catch (error) {
      if (!mounted || generation != _generation) return;
      setState(() {
        _error = error;
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    // Another city on Home, or the phone's place turned on, off or moved: other deals.
    ref.listen(settingsProvider.select((settings) => (settings.city, settings.useLocation)), (_, _) => _reload());
    ref.listen(locationProvider, (_, _) {
      if (ref.read(settingsProvider).useLocation) _reload();
    });
    final config = ref.watch(currentConfigProvider);
    final locale = ref.watch(settingsProvider.select((settings) => settings.locale));
    final located = ref.watch(settingsProvider.select((settings) => settings.useLocation)) && ref.watch(locationProvider) != null;
    // "Near me" without a place is sorted by the end time instead.
    final sort = _sort == 'near' && !located ? 'ending' : _sort;
    final blocked = ref.watch(meProvider).value?.blockedBusinessIds ?? const <String>{};
    final visible = _items.where((deal) => !blocked.contains(deal.business.id)).toList();
    final sortLabels = {'ending': l.sortEnding, 'discount': l.sortDiscount, 'new': l.sortNew, 'near': l.sortNear};

    return Scaffold(
      body: SafeArea(
        bottom: false,
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(Gap.gutter, Gap.md, Gap.gutter, 0),
              child: TextField(
                controller: _text,
                focusNode: _focus,
                textInputAction: TextInputAction.search,
                onChanged: _onQueryChanged,
                onSubmitted: (_) => _reload(),
                decoration: InputDecoration(
                  hintText: l.searchHint,
                  prefixIcon: const Icon(Icons.search_rounded),
                  suffixIcon: ListenableBuilder(
                    listenable: _text,
                    builder: (context, _) => _text.text.isEmpty
                        ? const SizedBox.shrink()
                        : IconButton(
                            tooltip: l.close,
                            icon: const Icon(Icons.close_rounded),
                            onPressed: () {
                              _text.clear();
                              _reload();
                            },
                          ),
                  ),
                ),
              ),
            ),
            SizedBox(
              height: 56,
              child: ListView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.fromLTRB(Gap.gutter, Gap.sm, Gap.gutter, 0),
                children: [
                  _chip(l.allCategories, _category == null, () => _setCategory(null)),
                  for (final category in config?.categories ?? const <Category>[])
                    _chip(category.name(locale), _category == category.slug, () => _setCategory(category.slug)),
                ],
              ),
            ),
            SizedBox(
              height: 52,
              child: ListView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.fromLTRB(Gap.gutter, Gap.xs, Gap.gutter, 0),
                children: [
                  Padding(
                    padding: const EdgeInsets.only(right: Gap.sm),
                    child: FilterChip(
                      avatar: Icon(Icons.layers_outlined, size: 18, color: _sets ? null : Brand.primary),
                      label: Text(l.filterSets),
                      selected: _sets,
                      showCheckmark: false,
                      onSelected: (on) => _show(category: _category, sort: _sort, sets: on),
                    ),
                  ),
                  for (final option in _sorts)
                    if (option != 'near' || located) _chip(sortLabels[option]!, sort == option, () => _setSort(option)),
                ],
              ),
            ),
            Expanded(child: _results(context, visible)),
          ],
        ),
      ),
    );
  }

  Widget _chip(String label, bool selected, VoidCallback onTap) => Padding(
    padding: const EdgeInsets.only(right: Gap.sm),
    child: ChoiceChip(label: Text(label), selected: selected, showCheckmark: false, onSelected: (_) => onTap()),
  );

  void _setCategory(String? slug) {
    if (_category != slug) _show(category: slug, sort: _sort, sets: _sets);
  }

  void _setSort(String sort) {
    if (_sort != sort) _show(category: _category, sort: sort, sets: _sets);
  }

  /// The new choice goes into the address; didUpdateWidget then loads it.
  void _show({required String? category, required String sort, required bool sets}) =>
      context.go(Uri(path: '/search', queryParameters: {'category': ?category, 'sort': sort, if (sets) 'set': '1'}).toString());

  Widget _results(BuildContext context, List<DealCard> visible) {
    final l = L.of(context);
    if (_items.isEmpty) {
      if (_error != null) return StatePanel.error(context, _error!, onRetry: _reload);
      if (_loading) return const SingleChildScrollView(child: SkeletonList());
      return StatePanel(icon: Icons.search_off_rounded, title: l.searchEmpty);
    }
    final more = _items.length < _total;
    return RefreshIndicator(
      onRefresh: () async => _reload(),
      child: ListView.separated(
        controller: _scroll,
        keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
        padding: const EdgeInsets.fromLTRB(Gap.gutter, Gap.sm, Gap.gutter, Gap.xl),
        itemCount: visible.length + (more || _error != null ? 1 : 0),
        separatorBuilder: (_, _) => const SizedBox(height: Gap.md),
        itemBuilder: (context, index) {
          if (index < visible.length) return DealTile(visible[index]);
          if (_error != null) {
            return Center(
              child: TextButton.icon(onPressed: _load, icon: const Icon(Icons.refresh_rounded), label: Text(l.retry)),
            );
          }
          // A short first page never scrolls: the loader itself asks for more.
          if (!_loading) WidgetsBinding.instance.addPostFrameCallback((_) => _maybeLoadMore());
          return const Padding(
            padding: EdgeInsets.all(Gap.lg),
            child: Center(child: CircularProgressIndicator()),
          );
        },
      ),
    );
  }
}
