import 'package:flutter/material.dart';

/// The site's category icon names (lucide) as Material icons.
const _byIcon = <String, IconData>{
  'utensils': Icons.restaurant_rounded,
  'coffee': Icons.local_cafe_rounded,
  'shopping-bag': Icons.shopping_bag_rounded,
  'sparkles': Icons.auto_awesome_rounded,
  'dumbbell': Icons.fitness_center_rounded,
  'ticket': Icons.confirmation_number_rounded,
  'wrench': Icons.build_rounded,
  'bike': Icons.pedal_bike_rounded,
};

const _bySlug = <String, String>{
  'taomlar': 'utensils',
  'kofe': 'coffee',
  'xaridlar': 'shopping-bag',
  'gozallik': 'sparkles',
  'sport': 'dumbbell',
  'kongilochar': 'ticket',
  'xizmatlar': 'wrench',
  'yetkazish': 'bike',
};

IconData iconFor(String? icon) => _byIcon[icon] ?? Icons.local_offer_rounded;

IconData categoryIcon(String? slug) => iconFor(_bySlug[slug]);
