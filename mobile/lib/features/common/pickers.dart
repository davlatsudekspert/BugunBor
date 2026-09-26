import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../app/providers.dart';
import '../../design/theme.dart';
import '../../l10n/gen/app_localizations.dart';

/// Result of the city sheet: a city slug, or "use my location".
sealed class PlaceChoice {
  const PlaceChoice();
}

class CityChoice extends PlaceChoice {
  const CityChoice(this.slug);
  final String slug;
}

class LocationChoice extends PlaceChoice {
  const LocationChoice();
}

Future<PlaceChoice?> showPlacePicker(BuildContext context, WidgetRef ref, {bool offerLocation = true}) {
  return showModalBottomSheet<PlaceChoice>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    useSafeArea: true,
    builder: (context) => _PlaceSheet(offerLocation: offerLocation),
  );
}

class _PlaceSheet extends ConsumerWidget {
  const _PlaceSheet({required this.offerLocation});
  final bool offerLocation;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = L.of(context);
    final settings = ref.watch(settingsProvider);
    final config = ref.watch(configProvider);
    final cities = config.value?.cities ?? const [];
    return DraggableScrollableSheet(
      expand: false,
      initialChildSize: 0.7,
      maxChildSize: 0.92,
      builder: (context, controller) => ListView(
        controller: controller,
        padding: const EdgeInsets.only(bottom: Gap.xl),
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(Gap.gutter, 0, Gap.gutter, Gap.sm),
            child: Text(l.chooseCity, style: Theme.of(context).textTheme.titleLarge),
          ),
          if (offerLocation)
            ListTile(
              leading: const Icon(Icons.my_location_rounded, color: Brand.primary),
              title: Text(l.homeUseLocation, style: const TextStyle(fontWeight: FontWeight.w700)),
              trailing: settings.useLocation ? const Icon(Icons.check_rounded, color: Brand.primary) : null,
              onTap: () => Navigator.pop(context, const LocationChoice()),
            ),
          if (config.isLoading && cities.isEmpty)
            const Padding(
              padding: EdgeInsets.all(Gap.xl),
              child: Center(child: CircularProgressIndicator()),
            ),
          for (final city in cities)
            ListTile(
              title: Text(city.name(settings.locale)),
              trailing: !settings.useLocation && settings.city == city.slug ? const Icon(Icons.check_rounded, color: Brand.primary) : null,
              onTap: () => Navigator.pop(context, CityChoice(city.slug)),
            ),
        ],
      ),
    );
  }
}

/// Applies the choice. Returns false when the phone refused location
/// (then the city stays as it was).
Future<bool> applyPlaceChoice(WidgetRef ref, PlaceChoice choice) async {
  final settings = ref.read(settingsProvider.notifier);
  switch (choice) {
    case CityChoice(:final slug):
      settings.setCity(slug);
      settings.setUseLocation(false);
      ref.read(locationProvider.notifier).clear();
      return true;
    case LocationChoice():
      final granted = await ref.read(locationProvider.notifier).refresh(ask: true);
      settings.setUseLocation(granted);
      return granted;
  }
}
