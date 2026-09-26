import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/format.dart';
import '../../data/models.dart';
import '../../l10n/gen/app_localizations.dart';
import '../icons.dart';
import '../theme.dart';
import 'common.dart';

/// "1,4 km" or "450 m" for a card, or null without a distance.
String? distanceLabel(BuildContext context, double? km) {
  if (km == null) return null;
  final l = L.of(context);
  final distance = formatDistance(km);
  return distance.meters ? l.distanceM(distance.value) : l.distanceKm(distance.value);
}

/// Full-width deal card for vertical lists (search, saved, business page).
class DealTile extends StatelessWidget {
  const DealTile(this.deal, {super.key});
  final DealCard deal;

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    final distance = distanceLabel(context, deal.distanceKm);
    final ended = !(deal.effective == 'LIVE' || deal.effective == 'SCHEDULED') || deal.endsAt.isBefore(DateTime.now().toUtc());
    return Semantics(
      button: true,
      label: deal.title,
      child: Card(
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: () => context.push('/deals/${deal.slug}'),
          child: Padding(
            padding: const EdgeInsets.all(Gap.md),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(14),
                  child: SizedBox(
                    width: 104,
                    height: 104,
                    child: Stack(
                      fit: StackFit.expand,
                      children: [
                        AppImage(deal.photo, small: true, icon: categoryIcon(deal.categorySlug)),
                        if (ended) ColoredBox(color: Colors.black.withValues(alpha: 0.35)),
                      ],
                    ),
                  ),
                ),
                const SizedBox(width: Gap.md),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              deal.business.name,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(color: context.mutedText, fontSize: 13, fontWeight: FontWeight.w600),
                            ),
                          ),
                          if (deal.isDemo) const DemoBadge(),
                        ],
                      ),
                      const SizedBox(height: 2),
                      Text(deal.title, maxLines: 2, overflow: TextOverflow.ellipsis, style: Theme.of(context).textTheme.titleMedium),
                      const SizedBox(height: Gap.xs),
                      PriceLine(price: deal.price, original: deal.originalPrice),
                      const SizedBox(height: Gap.xs),
                      Wrap(
                        spacing: Gap.sm,
                        runSpacing: 2,
                        crossAxisAlignment: WrapCrossAlignment.center,
                        children: [
                          if (deal.discountPercent > 0)
                            Text(
                              l.percentOff('${deal.discountPercent}'),
                              style: const TextStyle(color: Brand.primary, fontWeight: FontWeight.w900, fontSize: 13),
                            ),
                          if (distance != null) _Meta(icon: Icons.near_me_outlined, text: distance),
                          if (!ended)
                            _Meta(
                              icon: Icons.schedule_rounded,
                              child: Countdown(deal.endsAt, style: _metaStyle(context)),
                            ),
                          if (deal.remaining != null && deal.remaining! <= 5 && !ended)
                            _Meta(icon: Icons.local_fire_department_outlined, text: l.left('${deal.remaining}')),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

TextStyle _metaStyle(BuildContext context) =>
    TextStyle(color: context.mutedText, fontSize: 12.5, fontWeight: FontWeight.w600, fontFeatures: const [FontFeature.tabularFigures()]);

class _Meta extends StatelessWidget {
  const _Meta({required this.icon, this.text, this.child});
  final IconData icon;
  final String? text;
  final Widget? child;

  @override
  Widget build(BuildContext context) => Row(
    mainAxisSize: MainAxisSize.min,
    children: [
      Icon(icon, size: 14, color: context.mutedText),
      const SizedBox(width: 3),
      child ?? Text(text ?? '', style: _metaStyle(context)),
    ],
  );
}

/// Photo-first card for the horizontal rows on the home screen.
class DealCompactCard extends StatelessWidget {
  const DealCompactCard(this.deal, {super.key, this.width = 256});
  final DealCard deal;
  final double width;

  @override
  Widget build(BuildContext context) {
    final distance = distanceLabel(context, deal.distanceKm);
    return SizedBox(
      width: width,
      child: Semantics(
        button: true,
        label: deal.title,
        child: Card(
          clipBehavior: Clip.antiAlias,
          child: InkWell(
            onTap: () => context.push('/deals/${deal.slug}'),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                AspectRatio(
                  aspectRatio: 16 / 10,
                  child: Stack(
                    fit: StackFit.expand,
                    children: [
                      AppImage(deal.photo, small: true, icon: categoryIcon(deal.categorySlug)),
                      if (deal.discountPercent > 0) Positioned(left: Gap.sm, top: Gap.sm, child: DiscountBadge(deal.discountPercent)),
                      if (deal.isDemo) const Positioned(right: Gap.sm, top: Gap.sm, child: DemoBadge()),
                    ],
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(Gap.md, Gap.sm, Gap.md, Gap.md),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(deal.title, maxLines: 1, overflow: TextOverflow.ellipsis, style: Theme.of(context).textTheme.titleMedium),
                      Text(
                        [deal.business.name, ?distance].join(' · '),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(color: context.mutedText, fontSize: 13),
                      ),
                      const SizedBox(height: Gap.xs),
                      Row(
                        children: [
                          Expanded(
                            child: PriceLine(price: deal.price, original: deal.originalPrice),
                          ),
                        ],
                      ),
                      const SizedBox(height: 2),
                      _Meta(
                        icon: Icons.schedule_rounded,
                        child: Countdown(deal.endsAt, style: _metaStyle(context)),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
