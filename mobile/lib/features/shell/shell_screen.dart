import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/providers.dart';
import '../../design/widgets/common.dart';
import '../../l10n/gen/app_localizations.dart';

/// The five tabs. Each keeps its own history (back returns within the tab).
class ShellScreen extends ConsumerWidget {
  const ShellScreen({super.key, required this.shell});
  final StatefulNavigationShell shell;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = L.of(context);
    final activeCodes = ref.watch(myCodesProvider).value?.where((code) => code.isActive).length ?? 0;
    return Scaffold(
      body: shell,
      bottomNavigationBar: NavigationBar(
        selectedIndex: shell.currentIndex,
        onDestinationSelected: (index) => shell.goBranch(index, initialLocation: index == shell.currentIndex),
        destinations: [
          NavigationDestination(icon: const Icon(Icons.home_outlined), selectedIcon: const Icon(Icons.home_rounded), label: l.navHome),
          NavigationDestination(icon: const Icon(Icons.search_rounded), label: l.navSearch),
          NavigationDestination(icon: const Icon(Icons.favorite_border_rounded), selectedIcon: const Icon(Icons.favorite_rounded), label: l.navSaved),
          NavigationDestination(
            icon: Badge(isLabelVisible: activeCodes > 0, label: Text('$activeCodes'), child: const Icon(Icons.qr_code_2_rounded)),
            label: l.navCodes,
          ),
          NavigationDestination(icon: const Icon(Icons.person_outline_rounded), selectedIcon: const Icon(Icons.person_rounded), label: l.navProfile),
        ],
      ),
    );
  }
}

class NotFoundScreen extends StatelessWidget {
  const NotFoundScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    return Scaffold(
      appBar: AppBar(),
      body: StatePanel(icon: Icons.search_off_rounded, title: l.errorNotFound, actionLabel: l.navHome, onAction: () => context.go('/')),
    );
  }
}

/// Shown inside a tab that needs an account, instead of a redirect.
class LoginRequired extends StatelessWidget {
  const LoginRequired({super.key, this.icon = Icons.lock_outline_rounded});
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    return StatePanel(icon: icon, title: l.loginRequiredTitle, text: l.loginRequiredText, actionLabel: l.loginAction, onAction: () => context.push('/login'));
  }
}
