import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:qr_flutter/qr_flutter.dart';

import '../../app/links.dart';
import '../../app/providers.dart';
import '../../core/format.dart';
import '../../data/models.dart';
import '../../design/theme.dart';
import '../../design/widgets/common.dart';
import '../../l10n/gen/app_localizations.dart';
import 'codes_screen.dart';

/// One claimed code, big enough for the cashier to scan or read.
class CodeScreen extends ConsumerStatefulWidget {
  const CodeScreen({super.key, required this.id});
  final String id;

  @override
  ConsumerState<CodeScreen> createState() => _CodeScreenState();
}

class _CodeScreenState extends ConsumerState<CodeScreen> {
  bool _canceling = false;

  Future<void> _cancel(Redemption code) async {
    final l = L.of(context);
    final ok = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        content: Text(l.codeCancelAsk),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: Text(l.close)),
          TextButton(onPressed: () => Navigator.pop(context, true), child: Text(l.codeCancel)),
        ],
      ),
    );
    if (ok != true || !mounted) return;
    setState(() => _canceling = true);
    try {
      await ref.read(apiProvider).cancelCode(code.id);
      ref
        ..invalidate(myCodesProvider)
        ..invalidate(meProvider)
        ..invalidate(dealProvider(code.dealSlug));
      if (!mounted) return;
      if (context.canPop()) {
        context.pop();
      } else {
        context.go('/codes');
      }
    } catch (error) {
      if (!mounted) return;
      setState(() => _canceling = false);
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(errorText(context, error))));
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    final codes = ref.watch(myCodesProvider);
    final code = codes.value?.where((item) => item.id == widget.id).firstOrNull;
    if (code == null) {
      return Scaffold(
        appBar: AppBar(),
        body: codes.hasError
            ? StatePanel.error(context, codes.error!, onRetry: () => ref.invalidate(myCodesProvider))
            : codes.isLoading
            ? const Center(child: CircularProgressIndicator())
            : StatePanel(icon: Icons.qr_code_2_rounded, title: l.errorNotFound, actionLabel: l.navCodes, onAction: () => context.go('/codes')),
      );
    }
    final expired = !code.isActive || code.expiresAt.isBefore(DateTime.now().toUtc());
    return Scaffold(
      appBar: AppBar(title: Text(l.navCodes)),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(Gap.gutter, 0, Gap.gutter, Gap.xl),
          children: [
            Text(code.dealTitle, textAlign: TextAlign.center, style: Theme.of(context).textTheme.titleLarge),
            Text(
              '${code.businessName} · ${code.branchName}',
              textAlign: TextAlign.center,
              style: TextStyle(color: context.mutedText),
            ),
            const SizedBox(height: Gap.lg),
            if (!expired && code.code != null) ...[
              Text(
                l.codeShow,
                textAlign: TextAlign.center,
                style: const TextStyle(fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: Gap.md),
              Center(
                child: Container(
                  padding: const EdgeInsets.all(Gap.md),
                  // Always white behind the QR, also in the dark theme, so scanners read it.
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(Gap.radius),
                    border: Border.all(color: Brand.border),
                  ),
                  child: QrImageView(
                    data: siteUrl('/r/${code.code}'),
                    size: (MediaQuery.sizeOf(context).width * 0.62).clamp(200.0, 280.0),
                    backgroundColor: Colors.white,
                    semanticsLabel: formatCode(code.code!),
                  ),
                ),
              ),
              const SizedBox(height: Gap.md),
              SelectableText(
                formatCode(code.code!),
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 38, fontWeight: FontWeight.w900, letterSpacing: 4),
              ),
              const SizedBox(height: Gap.xs),
              Center(
                child: Wrap(
                  spacing: 6,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  children: [
                    const Icon(Icons.schedule_rounded, size: 18),
                    Countdown(
                      code.expiresAt,
                      style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800, fontFeatures: [FontFeature.tabularFigures()]),
                    ),
                  ],
                ),
              ),
              Text(
                l.codeValidUntil(dateLabel(code.expiresAt)),
                textAlign: TextAlign.center,
                style: TextStyle(color: context.mutedText),
              ),
            ] else
              StatePanel(icon: Icons.timer_off_outlined, title: statusLabel(l, code.status == 'CLAIMED' ? 'EXPIRED' : code.status)),
            const SizedBox(height: Gap.lg),
            Card(
              child: ListTile(
                leading: const Icon(Icons.place_outlined),
                title: Text(code.branchName, style: const TextStyle(fontWeight: FontWeight.w700)),
                subtitle: Text(code.address),
                trailing: IconButton(
                  tooltip: l.dealDirections,
                  icon: const Icon(Icons.directions_outlined, color: Brand.primary),
                  onPressed: () => openDirections(code.latitude, code.longitude, code.branchName),
                ),
              ),
            ),
            const SizedBox(height: Gap.md),
            PriceLine(price: code.price, original: code.originalPrice),
            const SizedBox(height: Gap.lg),
            OutlinedButton(onPressed: () => context.push('/deals/${code.dealSlug}'), child: Text(l.codeOpenDeal)),
            if (!expired) ...[
              const SizedBox(height: Gap.sm),
              TextButton(
                onPressed: _canceling ? null : () => _cancel(code),
                style: TextButton.styleFrom(foregroundColor: Colors.red.shade700),
                child: Text(l.codeCancel),
              ),
            ],
            const SizedBox(height: Gap.sm),
            Text(
              dateLabel(code.createdAt),
              textAlign: TextAlign.center,
              style: TextStyle(color: context.mutedText, fontSize: 12),
            ),
          ],
        ),
      ),
    );
  }
}
