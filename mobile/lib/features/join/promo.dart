import 'package:flutter/material.dart';

import '../../design/theme.dart';
import '../../l10n/gen/app_localizations.dart';

/// Why a business owner should join: the home card and the join screen.
class PromoPoints extends StatelessWidget {
  const PromoPoints({super.key, this.onDark = false});

  /// White text for the navy card.
  final bool onDark;

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    final iconColor = onDark ? Brand.accentOnDark : context.successText;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        for (final point in [l.promoPoint1, l.promoPoint2, l.promoPoint3, l.promoPoint4])
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 5),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(Icons.check_circle_rounded, size: 20, color: iconColor),
                const SizedBox(width: Gap.sm),
                Expanded(
                  child: Text(
                    point,
                    style: TextStyle(color: onDark ? Colors.white : null, fontWeight: FontWeight.w600, height: 1.3),
                  ),
                ),
              ],
            ),
          ),
      ],
    );
  }
}

/// Home: invites people who have a business to add it.
class BusinessPromoCard extends StatelessWidget {
  const BusinessPromoCard({super.key, required this.onOpen, this.onHide});
  final VoidCallback onOpen;
  final VoidCallback? onHide;

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    final radius = BorderRadius.circular(Gap.radius + 4);
    return DecoratedBox(
      decoration: BoxDecoration(
        borderRadius: radius,
        gradient: const LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: [Brand.navy, Color(0xFF274A66)]),
        border: context.isDark ? Border.all(color: Brand.darkBorder) : null,
        boxShadow: context.isDark
            ? null
            : [BoxShadow(color: Brand.navy.withValues(alpha: 0.12), blurRadius: 24, spreadRadius: -6, offset: const Offset(0, 10))],
      ),
      child: ClipRRect(
        borderRadius: radius,
        child: Stack(
          children: [
            // A soft orange glow in the corner.
            Positioned(
              right: -40,
              top: -40,
              child: IgnorePointer(
                child: Container(
                  width: 170,
                  height: 170,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: RadialGradient(colors: [Brand.primary.withValues(alpha: 0.45), Brand.primary.withValues(alpha: 0)]),
                  ),
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(Gap.lg, Gap.lg, Gap.sm, Gap.lg),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Row(
                    children: [
                      Container(
                        width: 46,
                        height: 46,
                        decoration: BoxDecoration(color: Brand.primary, borderRadius: BorderRadius.circular(14)),
                        child: const Icon(Icons.storefront_rounded, color: Colors.white, size: 26),
                      ),
                      const Spacer(),
                      if (onHide != null)
                        IconButton(
                          tooltip: l.promoHide,
                          onPressed: onHide,
                          icon: Icon(Icons.close_rounded, color: Colors.white.withValues(alpha: 0.75)),
                        ),
                    ],
                  ),
                  Padding(
                    padding: const EdgeInsets.only(right: Gap.sm),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        const SizedBox(height: Gap.md),
                        Text(
                          l.promoTitle,
                          style: const TextStyle(color: Colors.white, fontSize: 21, fontWeight: FontWeight.w900, letterSpacing: -0.4, height: 1.2),
                        ),
                        const SizedBox(height: Gap.sm),
                        Text(l.promoText, style: TextStyle(color: Colors.white.withValues(alpha: 0.88), height: 1.4)),
                        const SizedBox(height: Gap.md),
                        const PromoPoints(onDark: true),
                        const SizedBox(height: Gap.lg),
                        FilledButton.icon(
                          style: FilledButton.styleFrom(backgroundColor: Brand.primaryStrong, foregroundColor: Colors.white),
                          onPressed: onOpen,
                          icon: const Icon(Icons.add_business_rounded),
                          label: Text(l.promoAction),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
