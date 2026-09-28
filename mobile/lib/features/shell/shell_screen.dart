import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/providers.dart';
import '../../design/theme.dart';
import '../../design/widgets/common.dart';
import '../../l10n/gen/app_localizations.dart';

/// The five tabs. Each keeps its own history (back returns within the tab).
class ShellScreen extends ConsumerWidget {
  const ShellScreen({super.key, required this.shell});
  final StatefulNavigationShell shell;

  /// The shell as last built, for the tab bar of pages shown above the tabs.
  static StatefulNavigationShell? _current;

  /// The tab those pages sit over (the one they were opened from).
  static final currentTab = ValueNotifier<int>(0);

  /// Goes to a tab as it was left; from a page above the tabs, that page closes.
  static void goTab(BuildContext context, int index) {
    final shell = _current;
    if (shell != null) {
      shell.goBranch(index);
    } else {
      context.go(const ['/', '/search', '/saved', '/codes', '/profile'][index]);
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    _current = shell;
    if (currentTab.value != shell.currentIndex) {
      // Told after this frame: the pages listening are not rebuilt mid-build.
      WidgetsBinding.instance.addPostFrameCallback((_) => currentTab.value = shell.currentIndex);
    }
    return Scaffold(
      body: shell,
      bottomNavigationBar: TabBarIos(
        index: shell.currentIndex,
        onSelect: (index) => shell.goBranch(index, initialLocation: index == shell.currentIndex),
        tabs: appTabs(context, ref),
      ),
    );
  }
}

/// The five tabs, with the number of active codes and a briefcase for a
/// business member's Profile (it opens on the business profile).
List<TabItem> appTabs(BuildContext context, WidgetRef ref) {
  final l = L.of(context);
  final activeCodes = ref.watch(myCodesProvider).value?.where((code) => code.isActive).length ?? 0;
  final business =
      (ref.watch(meProvider).value?.hasBusiness ?? false) &&
      ref.watch(sessionProvider.select((session) => session.signedIn)) &&
      ref.watch(profileViewProvider.select((view) => view.business));
  return [
    (icon: CupertinoIcons.house, selected: CupertinoIcons.house_fill, label: l.navHome, badge: 0),
    (icon: CupertinoIcons.search, selected: CupertinoIcons.search, label: l.navSearch, badge: 0),
    (icon: CupertinoIcons.heart, selected: CupertinoIcons.heart_fill, label: l.navSaved, badge: 0),
    (icon: CupertinoIcons.qrcode, selected: CupertinoIcons.qrcode, label: l.navCodes, badge: activeCodes),
    business
        ? (icon: CupertinoIcons.briefcase, selected: CupertinoIcons.briefcase_fill, label: l.navProfile, badge: 0)
        : (icon: CupertinoIcons.person, selected: CupertinoIcons.person_fill, label: l.navProfile, badge: 0),
  ];
}

/// The same tab bar on pages shown above the tabs (a deal, a business, a
/// code, the counter): the tab they were opened from stays lit, and a tap
/// goes to that tab as it was left.
class PageTabBar extends ConsumerWidget {
  const PageTabBar({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return ValueListenableBuilder<int>(
      valueListenable: ShellScreen.currentTab,
      builder: (context, index, _) => TabBarIos(index: index, tabs: appTabs(context, ref), onSelect: (tab) => ShellScreen.goTab(context, tab)),
    );
  }
}

typedef TabItem = ({IconData icon, IconData selected, String label, int badge});

/// A tab bar in the manner of iOS: thin line icons in a dark, soft navy,
/// the chosen tab filled in the brand colour, a hairline on top and no
/// highlight pill.
class TabBarIos extends StatelessWidget {
  const TabBarIos({super.key, required this.index, required this.tabs, required this.onSelect});
  final int index;
  final List<TabItem> tabs;
  final ValueChanged<int> onSelect;

  @override
  Widget build(BuildContext context) {
    final dark = context.isDark;
    return DecoratedBox(
      decoration: BoxDecoration(
        color: dark ? Brand.darkSurface : Colors.white,
        border: Border(top: BorderSide(color: dark ? Brand.darkBorder : const Color(0x26000000), width: 0.5)),
      ),
      child: SafeArea(
        top: false,
        child: SizedBox(
          height: 58,
          child: Row(
            children: [
              for (var item = 0; item < tabs.length; item++)
                Expanded(
                  child: _Tab(
                    tab: tabs[item],
                    selected: item == index,
                    onTap: () {
                      if (item != index) HapticFeedback.selectionClick();
                      onSelect(item);
                    },
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Tab extends StatelessWidget {
  const _Tab({required this.tab, required this.selected, required this.onTap});
  final TabItem tab;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final dark = context.isDark;
    final color = selected ? (dark ? Brand.accentOnDark : Brand.primaryStrong) : (dark ? Brand.darkMuted : Brand.navy);
    final icon = Icon(selected ? tab.selected : tab.icon, size: 25, color: color);
    return Semantics(
      container: true,
      selected: selected,
      button: true,
      child: InkResponse(
        onTap: onTap,
        radius: 34,
        highlightColor: Colors.transparent,
        splashColor: color.withValues(alpha: 0.10),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            if (tab.badge > 0) Badge(label: Text('${tab.badge}'), child: icon) else icon,
            const SizedBox(height: 3),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 2),
              child: FittedBox(
                fit: BoxFit.scaleDown,
                child: Text(
                  tab.label,
                  maxLines: 1,
                  style: TextStyle(fontSize: 12, fontWeight: selected ? FontWeight.w700 : FontWeight.w600, color: color, letterSpacing: 0.1),
                ),
              ),
            ),
          ],
        ),
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
      bottomNavigationBar: const PageTabBar(),
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
