import 'dart:async';

import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import '../../core/api_error.dart';
import '../../core/format.dart';
import '../../core/media.dart';
import '../../l10n/gen/app_localizations.dart';
import '../theme.dart';

/// The text for any error: the server's own (localized) message when it has
/// one and the app speaks Uzbek or Russian, otherwise the app's wording.
String errorText(BuildContext context, Object error) {
  final l = L.of(context);
  if (error is ApiError) {
    if (error.isNetwork) return l.errorNetwork;
    if (error.isUnauthenticated) return l.errorSessionExpired;
    if (error.code == 'RATE_LIMITED') return l.errorRateLimited;
    if (error.isNotFound) return l.errorNotFound;
    final language = Localizations.localeOf(context).languageCode;
    if (error.message != null && language != 'en') return error.message!;
    if (error.code == 'SERVER') return l.errorServer;
  }
  return l.errorGeneric;
}

String money(BuildContext context, int amount) => L.of(context).sum(groupDigits(amount));

/// A photo from the site (relative path) with a calm placeholder.
class AppImage extends StatelessWidget {
  const AppImage(this.path, {super.key, this.fit = BoxFit.cover, this.small = false, this.icon = Icons.local_offer_outlined});

  final String? path;
  final BoxFit fit;
  final bool small;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    final url = small ? thumbnailUrl(path) : mediaUrl(path);
    final placeholder = ColoredBox(
      color: context.isDark ? Brand.darkBorder : Brand.sand,
      child: Center(child: Icon(icon, color: Brand.primary.withValues(alpha: 0.55), size: 32)),
    );
    if (url == null) return placeholder;
    return LayoutBuilder(
      builder: (context, constraints) {
        final ratio = MediaQuery.devicePixelRatioOf(context);
        final width = constraints.maxWidth.isFinite ? (constraints.maxWidth * ratio).round() : null;
        return CachedNetworkImage(
          imageUrl: url,
          fit: fit,
          // Decode at the box size, not the full photo.
          memCacheWidth: width,
          fadeInDuration: const Duration(milliseconds: 120),
          placeholder: (_, _) => placeholder,
          errorWidget: (_, _, _) => placeholder,
        );
      },
    );
  }
}

/// Empty or error state: what happened and one clear next step.
class StatePanel extends StatelessWidget {
  const StatePanel({super.key, required this.icon, required this.title, this.text, this.actionLabel, this.onAction});

  factory StatePanel.error(BuildContext context, Object error, {required VoidCallback onRetry}) => StatePanel(
    icon: error is ApiError && error.isNetwork ? Icons.wifi_off_rounded : Icons.error_outline_rounded,
    title: errorText(context, error),
    actionLabel: L.of(context).retry,
    onAction: onRetry,
  );

  final IconData icon;
  final String title;
  final String? text;
  final String? actionLabel;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(Gap.xl),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 64,
              height: 64,
              decoration: BoxDecoration(color: Brand.primary.withValues(alpha: 0.1), shape: BoxShape.circle),
              child: Icon(icon, color: Brand.primary, size: 30),
            ),
            const SizedBox(height: Gap.lg),
            Text(title, textAlign: TextAlign.center, style: Theme.of(context).textTheme.titleMedium),
            if (text != null) ...[
              const SizedBox(height: Gap.sm),
              Text(
                text!,
                textAlign: TextAlign.center,
                style: TextStyle(color: context.mutedText, height: 1.4),
              ),
            ],
            if (actionLabel != null && onAction != null) ...[const SizedBox(height: Gap.lg), FilledButton(onPressed: onAction, child: Text(actionLabel!))],
          ],
        ),
      ),
    );
  }
}

/// Grey placeholder blocks while a list loads (no spinner flashing).
class Skeleton extends StatefulWidget {
  const Skeleton({super.key, this.height = 96, this.width, this.radius = Gap.radius});
  final double height;
  final double? width;
  final double radius;

  @override
  State<Skeleton> createState() => _SkeletonState();
}

class _SkeletonState extends State<Skeleton> with SingleTickerProviderStateMixin {
  late final AnimationController _pulse = AnimationController(vsync: this, duration: const Duration(milliseconds: 900))..repeat(reverse: true);

  @override
  void dispose() {
    _pulse.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final base = context.isDark ? Brand.darkBorder : Brand.sand;
    final reduceMotion = MediaQuery.of(context).disableAnimations;
    return AnimatedBuilder(
      animation: _pulse,
      builder: (context, _) => Container(
        height: widget.height,
        width: widget.width,
        decoration: BoxDecoration(
          color: reduceMotion ? base : Color.lerp(base, base.withValues(alpha: 0.45), _pulse.value),
          borderRadius: BorderRadius.circular(widget.radius),
        ),
      ),
    );
  }
}

class SkeletonList extends StatelessWidget {
  const SkeletonList({super.key, this.count = 4, this.height = 110});
  final int count;
  final double height;

  @override
  Widget build(BuildContext context) => ListView.separated(
    physics: const NeverScrollableScrollPhysics(),
    shrinkWrap: true,
    padding: const EdgeInsets.all(Gap.gutter),
    itemCount: count,
    separatorBuilder: (_, _) => const SizedBox(height: Gap.md),
    itemBuilder: (_, _) => Skeleton(height: height),
  );
}

class SectionTitle extends StatelessWidget {
  const SectionTitle(this.title, {super.key, this.action, this.onAction});
  final String title;
  final String? action;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.fromLTRB(Gap.gutter, Gap.xl, Gap.sm, Gap.sm),
    child: Row(
      children: [
        Expanded(child: Text(title, style: Theme.of(context).textTheme.titleLarge)),
        if (action != null) TextButton(onPressed: onAction, child: Text(action!)),
      ],
    ),
  );
}

class DemoBadge extends StatelessWidget {
  const DemoBadge({super.key});

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
    decoration: BoxDecoration(
      color: const Color(0xFFFEF3C7),
      borderRadius: BorderRadius.circular(999),
      border: Border.all(color: const Color(0xFFFCD34D)),
    ),
    child: Text(
      L.of(context).demoBadge,
      style: const TextStyle(color: Color(0xFF92400E), fontSize: 11, fontWeight: FontWeight.w800),
    ),
  );
}

class DiscountBadge extends StatelessWidget {
  const DiscountBadge(this.percent, {super.key});
  final int percent;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
    decoration: BoxDecoration(
      color: Colors.white,
      borderRadius: BorderRadius.circular(999),
      boxShadow: const [BoxShadow(color: Color(0x22000000), blurRadius: 8)],
    ),
    child: Text(
      L.of(context).percentOff('$percent'),
      style: const TextStyle(color: Brand.navy, fontWeight: FontWeight.w900),
    ),
  );
}

class PriceLine extends StatelessWidget {
  const PriceLine({super.key, required this.price, this.original, this.large = false});
  final int price;
  final int? original;
  final bool large;

  @override
  Widget build(BuildContext context) => Wrap(
    crossAxisAlignment: WrapCrossAlignment.center,
    spacing: Gap.sm,
    children: [
      Text(
        money(context, price),
        style: TextStyle(color: Brand.primary, fontWeight: FontWeight.w900, fontSize: large ? 28 : 17),
      ),
      if (original != null && original! > price)
        Text(
          money(context, original!),
          style: TextStyle(color: context.mutedText, decoration: TextDecoration.lineThrough, fontSize: large ? 15 : 13),
        ),
    ],
  );
}

/// Counts down to [target] every second; "2 kun 3:04:05" style.
class Countdown extends StatefulWidget {
  const Countdown(this.target, {super.key, this.style});
  final DateTime target;
  final TextStyle? style;

  @override
  State<Countdown> createState() => _CountdownState();
}

class _CountdownState extends State<Countdown> {
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted) setState(() {});
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final left = widget.target.difference(DateTime.now().toUtc());
    final days = left.inDays;
    final clock = formatClock(left);
    final text = days > 0 ? '${L.of(context).daysShort('$days')} $clock' : clock;
    return Text(
      text,
      style: widget.style ?? const TextStyle(fontFeatures: [FontFeature.tabularFigures()], fontWeight: FontWeight.w800),
    );
  }
}

class RatingStars extends StatelessWidget {
  const RatingStars(this.value, {super.key, this.size = 16});
  final double value;
  final double size;

  @override
  Widget build(BuildContext context) => Row(
    mainAxisSize: MainAxisSize.min,
    children: [
      for (var index = 1; index <= 5; index++)
        Icon(
          value >= index - 0.25 ? Icons.star_rounded : (value >= index - 0.75 ? Icons.star_half_rounded : Icons.star_outline_rounded),
          size: size,
          color: const Color(0xFFF59E0B),
        ),
    ],
  );
}
