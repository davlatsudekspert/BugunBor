import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/env.dart';
import '../design/theme.dart';
import '../design/widgets/common.dart';
import '../l10n/gen/app_localizations.dart';
import 'links.dart';
import 'providers.dart';
import 'push.dart';
import 'router.dart';

final messengerKey = GlobalKey<ScaffoldMessengerState>();

class BugunBorApp extends ConsumerStatefulWidget {
  const BugunBorApp({super.key});

  @override
  ConsumerState<BugunBorApp> createState() => _BugunBorAppState();
}

class _BugunBorAppState extends ConsumerState<BugunBorApp> {
  late final AppLifecycleListener _lifecycle;
  DateTime? _hiddenAt;

  @override
  void initState() {
    super.initState();
    _lifecycle = AppLifecycleListener(onHide: () => _hiddenAt = DateTime.now(), onShow: _refreshAfterPause);
    WidgetsBinding.instance.addPostFrameCallback((_) => _startPush());
  }

  @override
  void dispose() {
    _lifecycle.dispose();
    super.dispose();
  }

  /// Back in the app after a while: a code may have been used at the counter
  /// (and the savings grew), so the person's own data is asked again.
  void _refreshAfterPause() {
    final hiddenAt = _hiddenAt;
    _hiddenAt = null;
    if (hiddenAt == null || DateTime.now().difference(hiddenAt) < const Duration(seconds: 30)) return;
    if (!ref.read(sessionProvider).signedIn) return;
    ref
      ..invalidate(myCodesProvider)
      ..invalidate(meProvider);
  }

  Future<void> _startPush() async {
    await ref.read(pushProvider).init(onOpen: _openLink, onForeground: _showForeground);
  }

  void _openLink(String link) {
    final path = appPathFor(link);
    final router = ref.read(routerProvider);
    if (path == null) {
      openExternal(Uri.parse(link));
    } else if (path == '/' || path.startsWith('/codes') || path == '/saved' || path.startsWith('/profile')) {
      // Messages about codes (used, rate the visit) mean the list has changed.
      if (path.startsWith('/codes')) {
        ref
          ..invalidate(myCodesProvider)
          ..invalidate(meProvider);
      }
      router.go(path);
    } else {
      router.push(path);
    }
  }

  void _showForeground(ForegroundPush push) {
    final messenger = messengerKey.currentState;
    final context = messengerKey.currentContext;
    if (messenger == null || context == null) return;
    final link = push.link;
    messenger.showSnackBar(
      SnackBar(
        duration: const Duration(seconds: 6),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(push.title, style: const TextStyle(fontWeight: FontWeight.w800)),
            if (push.body.isNotEmpty) Text(push.body, maxLines: 3, overflow: TextOverflow.ellipsis),
          ],
        ),
        action: link == null ? null : SnackBarAction(label: L.of(context).open, onPressed: () => _openLink(link)),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final settings = ref.watch(settingsProvider);
    final router = ref.watch(routerProvider);
    ref.listen(sessionProvider, (previous, next) {
      if (!next.expired || (previous?.expired ?? false)) return;
      final context = messengerKey.currentContext;
      if (context != null) {
        messengerKey.currentState?.showSnackBar(
          SnackBar(
            content: Text(L.of(context).errorSessionExpired),
            action: SnackBarAction(label: L.of(context).loginAction, onPressed: () => router.push('/login')),
          ),
        );
      }
      ref.read(sessionProvider.notifier).acknowledgeExpiry();
    });
    return MaterialApp.router(
      onGenerateTitle: (context) => L.of(context).appTitle,
      debugShowCheckedModeBanner: false,
      routerConfig: router,
      scaffoldMessengerKey: messengerKey,
      locale: Locale(settings.locale),
      supportedLocales: L.supportedLocales,
      localizationsDelegates: const [
        L.delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      theme: buildTheme(Brightness.light),
      darkTheme: buildTheme(Brightness.dark),
      themeMode: settings.themeMode,
      builder: (context, child) => _NavBarBand(child: _UpdateGate(child: child ?? const SizedBox.shrink())),
    );
  }
}

/// Android draws its own buttons (or the gesture line) over the app: at the
/// bottom, or at the side of a phone turned sideways, where a camera cutout
/// can also be. Each phone says how much they take. The whole app keeps clear
/// of them, on a band of the tab bar's colour: no line of any page, sheet or
/// form ever sits under the buttons, on any phone, and the buttons stay
/// readable on the band (dark on light, light on dark). A phone without such
/// buttons gets no band. The top is left to each page (a photo may run under
/// the status bar).
class _NavBarBand extends StatelessWidget {
  const _NavBarBand({required this.child});
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final dark = context.isDark;
    final band = dark ? Brand.darkSurface : Colors.white;
    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: SystemUiOverlayStyle(
        // Older Android paints its bar in this colour; Android 15 and later
        // draw the buttons over the app, so over this band.
        systemNavigationBarColor: band,
        systemNavigationBarDividerColor: band,
        systemNavigationBarIconBrightness: dark ? Brightness.light : Brightness.dark,
        // No grey veil over the band behind three-button navigation.
        systemNavigationBarContrastEnforced: false,
      ),
      child: ColoredBox(
        color: band,
        child: SafeArea(top: false, child: child),
      ),
    );
  }
}

/// Blocks a build older than the server's minimum with one clear next step.
class _UpdateGate extends ConsumerWidget {
  const _UpdateGate({required this.child});
  final Widget child;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final config = ref.watch(configProvider).value;
    final minimum = config?.minAppBuild ?? 0;
    if (minimum <= Env.build) return child;
    final l = L.of(context);
    return Scaffold(
      body: SafeArea(
        child: StatePanel(
          icon: Icons.system_update_rounded,
          title: l.updateTitle,
          text: l.updateText,
          actionLabel: l.updateAction,
          // An app from the site is updated from the site; otherwise from Google Play.
          onAction: () => openExternal(Uri.parse(config?.update?.url ?? Env.playStoreUrl)),
        ),
      ),
    );
  }
}
