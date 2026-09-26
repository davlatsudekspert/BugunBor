import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../features/auth/login_screen.dart';
import '../features/business/business_screen.dart';
import '../features/cashier/cashier_screen.dart';
import '../features/codes/code_screen.dart';
import '../features/codes/codes_screen.dart';
import '../features/deal/deal_screen.dart';
import '../features/deals/deal_form_screen.dart';
import '../features/deals/deals_screen.dart';
import '../features/home/home_screen.dart';
import '../features/join/join_screen.dart';
import '../features/onboarding/onboarding_screen.dart';
import '../features/profile/interests_screen.dart';
import '../features/profile/profile_screen.dart';
import '../features/saved/saved_screen.dart';
import '../features/search/search_screen.dart';
import '../features/shell/shell_screen.dart';
import 'providers.dart';

final rootNavigatorKey = GlobalKey<NavigatorState>();

/// Paths match the site (`/deals/<slug>`, `/businesses/<slug>`, `/r/<code>`),
/// so App Links and notification links open the same thing in the app.
final routerProvider = Provider<GoRouter>((ref) {
  final router = GoRouter(
    navigatorKey: rootNavigatorKey,
    initialLocation: '/',
    redirect: (context, state) {
      final onboarded = ref.read(settingsProvider).onboarded;
      if (!onboarded && state.matchedLocation != '/onboarding') {
        final next = state.uri.toString();
        return Uri(path: '/onboarding', queryParameters: next == '/' ? null : {'next': next}).toString();
      }
      return null;
    },
    routes: [
      GoRoute(
        path: '/onboarding',
        builder: (context, state) => OnboardingScreen(next: state.uri.queryParameters['next']),
      ),
      StatefulShellRoute.indexedStack(
        builder: (context, state, shell) => ShellScreen(shell: shell),
        branches: [
          StatefulShellBranch(
            routes: [GoRoute(path: '/', builder: (context, state) => const HomeScreen())],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/search',
                builder: (context, state) => SearchScreen(
                  category: state.uri.queryParameters['category'],
                  sort: state.uri.queryParameters['sort'],
                  query: state.uri.queryParameters['q'],
                  focus: state.uri.queryParameters['focus'] == '1',
                ),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [GoRoute(path: '/saved', builder: (context, state) => const SavedScreen())],
          ),
          StatefulShellBranch(
            routes: [GoRoute(path: '/codes', builder: (context, state) => const CodesScreen())],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/profile',
                builder: (context, state) => ProfileScreen(businessId: state.uri.queryParameters['business']),
              ),
            ],
          ),
        ],
      ),
      GoRoute(
        path: '/deals/:slug',
        builder: (context, state) => DealScreen(slug: state.pathParameters['slug']!),
      ),
      GoRoute(
        path: '/businesses/:slug',
        builder: (context, state) => BusinessScreen(slug: state.pathParameters['slug']!),
      ),
      GoRoute(
        path: '/codes/:id',
        builder: (context, state) => CodeScreen(id: state.pathParameters['id']!),
      ),
      GoRoute(path: '/login', builder: (context, state) => const LoginScreen()),
      GoRoute(path: '/interests', builder: (context, state) => const InterestsScreen()),
      GoRoute(
        path: '/cashier',
        builder: (context, state) => CashierScreen(businessId: state.uri.queryParameters['business']),
      ),
      GoRoute(path: '/business/new', builder: (context, state) => const JoinScreen()),
      GoRoute(
        path: '/business/:businessId/deals',
        builder: (context, state) => DealsScreen(businessId: state.pathParameters['businessId']!),
      ),
      GoRoute(
        path: '/business/:businessId/deals/new',
        builder: (context, state) => DealFormScreen(businessId: state.pathParameters['businessId']!),
      ),
      GoRoute(
        path: '/business/:businessId/deals/:dealId/edit',
        builder: (context, state) => DealFormScreen(businessId: state.pathParameters['businessId']!, dealId: state.pathParameters['dealId']),
      ),
      GoRoute(
        path: '/r/:code',
        builder: (context, state) => CashierScreen(code: state.pathParameters['code']),
      ),
    ],
    errorBuilder: (context, state) => const NotFoundScreen(),
  );
  ref.onDispose(router.dispose);
  return router;
});
