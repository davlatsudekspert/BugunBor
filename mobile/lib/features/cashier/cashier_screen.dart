import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

import '../../app/providers.dart';
import '../../core/format.dart';
import '../../data/models.dart';
import '../../design/theme.dart';
import '../../design/widgets/common.dart';
import '../../l10n/gen/app_localizations.dart';
import '../shell/shell_screen.dart';

/// "K7P 2QX", "k7p-2qx" or a scanned `…/r/K7P2QX` link → "K7P2QX".
String? codeFromInput(String value) {
  final text = value.trim();
  final fromPath = RegExp(r'/r/([A-Za-z0-9-]{6,8})/?(?:[?#].*)?$').firstMatch(text)?.group(1);
  final fromQuery = RegExp(r'[?&]code=([A-Za-z0-9-]{6,8})').firstMatch(text)?.group(1);
  final code = (fromPath ?? fromQuery ?? text).replaceAll(RegExp(r'[\s-]'), '').toUpperCase();
  // The server's alphabet: no 0/O or 1/I.
  return RegExp(r'^[ABCDEFGHJKLMNPQRSTUVWXYZ2-9]{6}$').hasMatch(code) ? code : null;
}

/// Counter staff check a customer's code: scan the QR or type the code,
/// see what it is for, then confirm it as used. Only the server marks it.
class CashierScreen extends ConsumerStatefulWidget {
  const CashierScreen({super.key, this.code, this.businessId});
  final String? code;

  /// The business to check codes for (from the business profile).
  final String? businessId;

  @override
  ConsumerState<CashierScreen> createState() => _CashierScreenState();
}

class _CashierScreenState extends ConsumerState<CashierScreen> {
  final _manual = TextEditingController();
  final _scanner = MobileScannerController(detectionSpeed: DetectionSpeed.noDuplicates, formats: const [BarcodeFormat.qrCode]);
  String? _businessId;
  CodeLookup? _found;
  bool _busy = false;
  bool _done = false;
  Object? _error;
  bool _usedInitial = false;

  @override
  void dispose() {
    _manual.dispose();
    _scanner.dispose();
    super.dispose();
  }

  Future<void> _lookup(String input) async {
    final businessId = _businessId;
    final code = codeFromInput(input);
    if (businessId == null || _busy) return;
    if (code == null) {
      setState(() => _error = L.of(context).cashierBadCode);
      return;
    }
    _manual.text = formatCode(code);
    setState(() {
      _busy = true;
      _error = null;
      _found = null;
      _done = false;
    });
    try {
      final found = await ref.read(apiProvider).lookupCode(businessId, code);
      if (!mounted) return;
      await _scanner.stop();
      setState(() {
        _found = found;
        _busy = false;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _busy = false;
        _error = error;
      });
    }
  }

  Future<void> _complete() async {
    final found = _found;
    final businessId = _businessId;
    if (found == null || businessId == null) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ref.read(apiProvider).completeCode(businessId, found.id);
      if (!mounted) return;
      setState(() {
        _busy = false;
        _done = true;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _busy = false;
        _error = error;
      });
    }
  }

  Future<void> _reset() async {
    _manual.clear();
    setState(() {
      _found = null;
      _done = false;
      _error = null;
    });
    await _scanner.start();
  }

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    final signedIn = ref.watch(sessionProvider.select((session) => session.signedIn));
    if (!signedIn) {
      return Scaffold(
        appBar: AppBar(title: Text(l.cashierTitle)),
        body: const LoginRequired(icon: Icons.qr_code_scanner_rounded),
      );
    }
    final me = ref.watch(meProvider);
    final counters = me.value?.counters ?? const <Membership>[];
    if (me.value == null) {
      return Scaffold(
        appBar: AppBar(title: Text(l.cashierTitle)),
        body: me.hasError ? StatePanel.error(context, me.error!, onRetry: () => ref.invalidate(meProvider)) : const Center(child: CircularProgressIndicator()),
      );
    }
    if (counters.isEmpty) {
      return Scaffold(
        appBar: AppBar(title: Text(l.cashierTitle)),
        body: StatePanel(
          icon: Icons.storefront_outlined,
          title: l.cashierNoBusiness,
          actionLabel: me.value!.hasBusiness ? l.bizProfileTitle : l.addBusiness,
          onAction: () => me.value!.hasBusiness ? context.go('/profile') : context.push('/business/new'),
        ),
      );
    }
    if (_businessId == null || !counters.any((item) => item.businessId == _businessId)) {
      _businessId = counters.any((item) => item.businessId == widget.businessId) ? widget.businessId : counters.first.businessId;
    }
    if (!_usedInitial && widget.code != null) {
      _usedInitial = true;
      WidgetsBinding.instance.addPostFrameCallback((_) => _lookup(widget.code!));
    }
    final width = MediaQuery.sizeOf(context).width - Gap.gutter * 2;

    return Scaffold(
      appBar: AppBar(title: Text(l.cashierTitle)),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(Gap.gutter, 0, Gap.gutter, Gap.xl),
        keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
        children: [
          if (counters.length > 1) ...[
            DropdownButtonFormField<String>(
              initialValue: _businessId,
              decoration: InputDecoration(labelText: l.cashierChooseBusiness),
              items: [for (final item in counters) DropdownMenuItem(value: item.businessId, child: Text(item.name))],
              onChanged: (value) => setState(() {
                _businessId = value;
                _found = null;
                _done = false;
              }),
            ),
            const SizedBox(height: Gap.md),
          ],
          if (_found == null) ...[
            ClipRRect(
              borderRadius: BorderRadius.circular(Gap.radius),
              child: SizedBox(
                height: width.clamp(220.0, 360.0),
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    MobileScanner(
                      controller: _scanner,
                      onDetect: (capture) {
                        final raw = capture.barcodes.firstOrNull?.rawValue;
                        if (raw != null && !_busy) _lookup(raw);
                      },
                      errorBuilder: (context, error) => ColoredBox(
                        color: Brand.navy,
                        child: Center(
                          child: Padding(
                            padding: const EdgeInsets.all(Gap.lg),
                            child: Text(
                              l.cameraDenied,
                              textAlign: TextAlign.center,
                              style: const TextStyle(color: Colors.white, height: 1.4),
                            ),
                          ),
                        ),
                      ),
                    ),
                    IgnorePointer(
                      child: Center(
                        child: Container(
                          width: 200,
                          height: 200,
                          decoration: BoxDecoration(
                            border: Border.all(color: Colors.white, width: 3),
                            borderRadius: BorderRadius.circular(20),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: Gap.sm),
            Text(
              l.cashierScanHint,
              textAlign: TextAlign.center,
              style: TextStyle(color: context.mutedText),
            ),
            const SizedBox(height: Gap.lg),
            Text(l.cashierManual, style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: Gap.sm),
            TextField(
              controller: _manual,
              textCapitalization: TextCapitalization.characters,
              autocorrect: false,
              enableSuggestions: false,
              textInputAction: TextInputAction.done,
              onSubmitted: _lookup,
              style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800, letterSpacing: 2),
              decoration: InputDecoration(hintText: l.cashierCodeHint),
            ),
            const SizedBox(height: Gap.sm),
            FilledButton(
              onPressed: _busy ? null : () => _lookup(_manual.text),
              child: _busy
                  ? const SizedBox.square(dimension: 22, child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white))
                  : Text(l.cashierCheck),
            ),
          ] else
            _Result(found: _found!, done: _done, busy: _busy, onConfirm: _complete, onNext: _reset),
          if (_error != null) ...[
            const SizedBox(height: Gap.md),
            Text(
              _error is String ? _error! as String : errorText(context, _error!),
              style: const TextStyle(color: Colors.red, fontWeight: FontWeight.w600),
            ),
          ],
        ],
      ),
    );
  }
}

class _Result extends StatelessWidget {
  const _Result({required this.found, required this.done, required this.busy, required this.onConfirm, required this.onNext});
  final CodeLookup found;
  final bool done;
  final bool busy;
  final VoidCallback onConfirm;
  final VoidCallback onNext;

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    final color = done ? context.successText : context.accentText;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(Gap.lg),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                Icon(done ? Icons.check_circle_rounded : Icons.verified_outlined, color: color, size: 30),
                const SizedBox(width: Gap.sm),
                Expanded(
                  child: Text(
                    done ? l.cashierDone : l.cashierValid,
                    style: TextStyle(color: color, fontSize: 20, fontWeight: FontWeight.w900),
                  ),
                ),
              ],
            ),
            const SizedBox(height: Gap.md),
            Text(found.dealTitle, style: Theme.of(context).textTheme.titleLarge),
            Text(
              money(context, found.price),
              style: const TextStyle(color: Brand.primary, fontWeight: FontWeight.w900, fontSize: 18),
            ),
            const SizedBox(height: Gap.sm),
            Text(found.branchName, style: TextStyle(color: context.mutedText)),
            const Divider(height: Gap.xl),
            Text(l.cashierCustomer, style: TextStyle(color: context.mutedText, fontSize: 13)),
            Text('${found.customerName}  ${found.customerPhone}', style: const TextStyle(fontWeight: FontWeight.w700)),
            const SizedBox(height: Gap.lg),
            if (done)
              FilledButton(onPressed: onNext, child: Text(l.cashierNext))
            else ...[
              FilledButton(
                style: FilledButton.styleFrom(backgroundColor: Brand.success),
                onPressed: busy ? null : onConfirm,
                child: busy
                    ? const SizedBox.square(dimension: 22, child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white))
                    : Text(l.cashierConfirm),
              ),
              const SizedBox(height: Gap.sm),
              TextButton(onPressed: busy ? null : onNext, child: Text(l.cancel)),
            ],
          ],
        ),
      ),
    );
  }
}
