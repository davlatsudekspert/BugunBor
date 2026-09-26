import 'package:flutter/material.dart';
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
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _startPush());
  }

  Future<void> _startPush() async {
    await ref.read(pushProvider).init(onOpen: _openLink, onForeground: _showForeground);
  }

  void _openLink(String link) {
    final path = appPathFor(link);
    final router = ref.read(routerProvider);
    if (path == null) {
      openExternal(Uri.parse(link));
    } else if (path == '/' || path == '/codes' || path == '/saved') {
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
      builder: (context, child) => _UpdateGate(child: child ?? const SizedBox.shrink()),
    );
  }
}

/// Blocks a build older than the server's minimum with one clear next step.
class _UpdateGate extends ConsumerWidget {
  const _UpdateGate({required this.child});
  final Widget child;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final minimum = ref.watch(configProvider).value?.minAppBuild ?? 0;
    if (minimum <= Env.build) return child;
    final l = L.of(context);
    return Scaffold(
      body: SafeArea(
        child: StatePanel(
          icon: Icons.system_update_rounded,
          title: l.updateTitle,
          text: l.updateText,
          actionLabel: l.updateAction,
          onAction: () => openExternal(Uri.parse(Env.playStoreUrl)),
        ),
      ),
    );
  }
}
