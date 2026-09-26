import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/account.dart';
import '../../app/links.dart';
import '../../app/providers.dart';
import '../../data/models.dart';
import '../../design/theme.dart';
import '../../design/widgets/common.dart';
import '../../l10n/gen/app_localizations.dart';

enum _Stage { idle, starting, waiting, expired, denied }

/// Sign-in through the Telegram bot: the app asks the server for a request,
/// opens the bot, and polls until the person confirms there. The session
/// token then goes straight into secure storage. No password, no SMS.
class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> with WidgetsBindingObserver {
  bool _consent = false;
  bool _showConsentHint = false;
  _Stage _stage = _Stage.idle;
  LoginStart? _request;
  Timer? _poll;
  bool _polling = false;
  bool _finishing = false;
  Object? _error;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _poll?.cancel();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    // Back from Telegram: check right away instead of waiting for the timer.
    if (state == AppLifecycleState.resumed && _stage == _Stage.waiting) _check();
  }

  void _openPolicy(String path) => openSite(path, lang: ref.read(settingsProvider).locale);

  Future<void> _start() async {
    if (!_consent) {
      setState(() => _showConsentHint = true);
      return;
    }
    setState(() {
      _stage = _Stage.starting;
      _error = null;
    });
    try {
      final request = await ref.read(apiProvider).startLogin();
      if (!mounted) return;
      setState(() {
        _request = request;
        _stage = _Stage.waiting;
      });
      _poll?.cancel();
      _poll = Timer.periodic(const Duration(seconds: 2), (_) => _check());
      await openExternal(Uri.parse(request.deepLink));
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _stage = _Stage.idle;
        _error = error;
      });
    }
  }

  Future<void> _check() async {
    final request = _request;
    if (request == null || _polling || _finishing) return;
    if (DateTime.now().toUtc().isAfter(request.expiresAt)) return _stop(_Stage.expired);
    _polling = true;
    try {
      final status = await ref.read(apiProvider).loginStatus(request.loginSecret);
      if (!mounted || _request != request) return;
      switch (status.status) {
        case 'APPROVED' when status.token != null:
          await _finish(status.token!);
        case 'EXPIRED' || 'MISSING':
          _stop(_Stage.expired);
        case 'DENIED':
          _stop(_Stage.denied);
      }
    } catch (_) {
      // A dropped connection: the next tick tries again until the request expires.
    } finally {
      _polling = false;
    }
  }

  void _stop(_Stage stage) {
    _poll?.cancel();
    if (mounted) setState(() => _stage = stage);
  }

  Future<void> _finish(String token) async {
    _finishing = true;
    _poll?.cancel();
    await ref.read(accountProvider).signIn(token);
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(L.of(context).loginDone)));
    if (context.canPop()) {
      context.pop(true);
    } else {
      context.go('/');
    }
  }

  Future<void> _reviewerLogin() async {
    final l = L.of(context);
    final controller = TextEditingController();
    final code = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(l.loginReviewer),
        content: TextField(controller: controller, autofocus: true, obscureText: true, autocorrect: false, enableSuggestions: false),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: Text(l.cancel)),
          TextButton(onPressed: () => Navigator.pop(context, controller.text.trim()), child: Text(l.loginAction)),
        ],
      ),
    );
    controller.dispose();
    if (code == null || code.isEmpty || !mounted) return;
    try {
      final token = await ref.read(apiProvider).reviewLogin(code);
      if (mounted) await _finish(token);
    } catch (error) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(errorText(context, error))));
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    return Scaffold(
      appBar: AppBar(),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(Gap.gutter, 0, Gap.gutter, Gap.xl),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              GestureDetector(
                // Hidden entry for app-store reviewers (a code the owner sets on the server).
                onLongPress: _reviewerLogin,
                child: Text(l.loginTitle, style: Theme.of(context).textTheme.headlineMedium),
              ),
              const SizedBox(height: Gap.sm),
              Text(l.loginText, style: TextStyle(color: context.mutedText, fontSize: 16, height: 1.4)),
              const SizedBox(height: Gap.xl),
              if (_stage == _Stage.waiting && _request != null) ..._waiting(context, _request!) else ..._intro(context),
            ],
          ),
        ),
      ),
    );
  }

  List<Widget> _intro(BuildContext context) {
    final l = L.of(context);
    return [
      if (_stage == _Stage.expired || _stage == _Stage.denied) ...[
        _Banner(text: _stage == _Stage.expired ? l.loginExpired : l.loginDenied),
        const SizedBox(height: Gap.lg),
      ],
      Card(
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: Gap.xs),
          child: CheckboxListTile(
            value: _consent,
            controlAffinity: ListTileControlAffinity.leading,
            onChanged: (value) => setState(() {
              _consent = value ?? false;
              if (_consent) _showConsentHint = false;
            }),
            title: Text(l.loginConsent, style: const TextStyle(height: 1.4)),
          ),
        ),
      ),
      // Real buttons (not inline links) so each is easy to tap.
      Wrap(
        spacing: Gap.sm,
        children: [
          TextButton.icon(onPressed: () => _openPolicy('/privacy'), icon: const Icon(Icons.privacy_tip_outlined, size: 18), label: Text(l.privacyPolicy)),
          TextButton.icon(onPressed: () => _openPolicy('/terms'), icon: const Icon(Icons.description_outlined, size: 18), label: Text(l.terms)),
        ],
      ),
      if (_showConsentHint) ...[
        const SizedBox(height: Gap.sm),
        Text(
          l.loginConsentHint,
          style: const TextStyle(color: Colors.red, fontWeight: FontWeight.w600),
        ),
      ],
      if (_error != null) ...[const SizedBox(height: Gap.sm), Text(errorText(context, _error!), style: const TextStyle(color: Colors.red))],
      const SizedBox(height: Gap.lg),
      FilledButton.icon(
        style: FilledButton.styleFrom(backgroundColor: Brand.telegram),
        onPressed: _stage == _Stage.starting ? null : _start,
        icon: _stage == _Stage.starting
            ? const SizedBox.square(dimension: 20, child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white))
            : const Icon(Icons.send_rounded),
        label: Text(_stage == _Stage.expired || _stage == _Stage.denied ? l.loginRestart : l.loginButton),
      ),
    ];
  }

  List<Widget> _waiting(BuildContext context, LoginStart request) {
    final l = L.of(context);
    return [
      Card(
        child: Padding(
          padding: const EdgeInsets.all(Gap.lg),
          child: Column(
            children: [
              Text(
                l.loginMatchCode,
                style: TextStyle(color: context.mutedText, fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: Gap.sm),
              Semantics(
                label: request.matchCode.split('').join(' '),
                child: Text(
                  request.matchCode,
                  style: const TextStyle(fontSize: 44, fontWeight: FontWeight.w900, letterSpacing: 10, fontFeatures: [FontFeature.tabularFigures()]),
                ),
              ),
              const SizedBox(height: Gap.sm),
              Text(l.loginMatchHint, textAlign: TextAlign.center, style: const TextStyle(height: 1.4)),
            ],
          ),
        ),
      ),
      const SizedBox(height: Gap.lg),
      Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const SizedBox.square(dimension: 18, child: CircularProgressIndicator(strokeWidth: 2.5)),
          const SizedBox(width: Gap.md),
          Flexible(child: Text(l.loginWaiting)),
        ],
      ),
      const SizedBox(height: Gap.lg),
      FilledButton.icon(
        style: FilledButton.styleFrom(backgroundColor: Brand.telegram),
        onPressed: () => openExternal(Uri.parse(request.deepLink)),
        icon: const Icon(Icons.send_rounded),
        label: Text(l.loginOpenTelegram),
      ),
      const SizedBox(height: Gap.sm),
      TextButton(
        onPressed: () {
          _poll?.cancel();
          setState(() {
            _stage = _Stage.idle;
            _request = null;
          });
        },
        child: Text(l.cancel),
      ),
    ];
  }
}

class _Banner extends StatelessWidget {
  const _Banner({required this.text});
  final String text;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(Gap.md),
    decoration: BoxDecoration(color: Brand.warning.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(14)),
    child: Text(
      text,
      style: const TextStyle(color: Brand.warning, fontWeight: FontWeight.w700),
    ),
  );
}
