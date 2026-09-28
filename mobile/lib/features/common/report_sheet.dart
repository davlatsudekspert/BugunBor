import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/providers.dart';
import '../../data/models.dart';
import '../../design/theme.dart';
import '../../design/widgets/common.dart';
import '../../l10n/gen/app_localizations.dart';

const _reasons = ['WRONG_INFO', 'SCAM', 'OFFENSIVE', 'PROHIBITED', 'SPAM', 'OTHER'];

String reasonLabel(L l, String reason) => switch (reason) {
  'WRONG_INFO' => l.reasonWrongInfo,
  'SCAM' => l.reasonScam,
  'OFFENSIVE' => l.reasonOffensive,
  'PROHIBITED' => l.reasonProhibited,
  'SPAM' => l.reasonSpam,
  _ => l.reasonOther,
};

/// Report a deal, business or review to the moderators. Needs an account
/// (so reports can't be sent anonymously in bulk).
Future<void> showReportSheet(BuildContext context, WidgetRef ref, {required String targetType, required String targetId}) async {
  if (!ref.read(sessionProvider).signedIn) {
    await context.push('/login');
    if (!context.mounted || !ref.read(sessionProvider).signedIn) return;
  }
  final sent = await showModalBottomSheet<bool>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    useSafeArea: true,
    builder: (context) => _ReportSheet(targetType: targetType, targetId: targetId),
  );
  if (sent == true && context.mounted) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(L.of(context).reportThanks)));
  }
}

/// What can go wrong at the counter with a booked code; once it was used,
/// only the price (or something else) is left to complain about.
const codeIssues = ['NOT_AVAILABLE', 'CODE_REFUSED', 'WRONG_PRICE', 'BRANCH_CLOSED', 'OTHER'];
const usedCodeIssues = ['WRONG_PRICE', 'OTHER'];

String codeIssueLabel(L l, String issue) => switch (issue) {
  'NOT_AVAILABLE' => l.issueNotAvailable,
  'CODE_REFUSED' => l.issueCodeRefused,
  'WRONG_PRICE' => l.issueWrongPrice,
  'BRANCH_CLOSED' => l.issueBranchClosed,
  _ => l.reasonOther,
};

/// "Aksiya berilmadimi?": tells the moderators what happened with a booked
/// code (within three days, once). When three different people say so in a
/// week, the deal waits for a moderator.
Future<void> showCodeIssueSheet(BuildContext context, WidgetRef ref, Redemption code) async {
  final sent = await showModalBottomSheet<bool>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    useSafeArea: true,
    builder: (context) => _ReportSheet(
      targetType: 'REDEMPTION',
      targetId: code.id,
      title: L.of(context).codeIssueTitle,
      reasons: code.status == 'COMPLETED' ? usedCodeIssues : codeIssues,
      labelOf: codeIssueLabel,
    ),
  );
  if (sent != true) return;
  // The complaint can lift a no-show pause and put the deal on hold: the
  // person's state and the deal page follow at once.
  ref
    ..invalidate(myCodesProvider)
    ..invalidate(meProvider)
    ..invalidate(dealProvider(code.dealSlug));
  if (context.mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(L.of(context).codeIssueSent)));
}

class _ReportSheet extends ConsumerStatefulWidget {
  const _ReportSheet({required this.targetType, required this.targetId, this.title, this.reasons, this.labelOf = reasonLabel});
  final String targetType;
  final String targetId;

  /// A complaint about a booked code has its own heading and reasons.
  final String? title;
  final List<String>? reasons;
  final String Function(L l, String reason) labelOf;

  @override
  ConsumerState<_ReportSheet> createState() => _ReportSheetState();
}

class _ReportSheetState extends ConsumerState<_ReportSheet> {
  final _comment = TextEditingController();
  String? _reason;
  bool _sending = false;
  Object? _error;

  @override
  void dispose() {
    _comment.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    final reason = _reason;
    if (reason == null) return;
    setState(() {
      _sending = true;
      _error = null;
    });
    try {
      await ref.read(apiProvider).report(targetType: widget.targetType, targetId: widget.targetId, reason: reason, comment: _comment.text);
      if (mounted) Navigator.pop(context, true);
    } catch (error) {
      if (mounted) {
        setState(() {
          _sending = false;
          _error = error;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    final configured = ref.watch(currentConfigProvider)?.reportReasons ?? const [];
    final reasons = widget.reasons ?? (configured.isEmpty ? _reasons : configured);
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(Gap.gutter, 0, Gap.gutter, Gap.xl),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(widget.title ?? l.reportTitle, style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: Gap.xs),
            Text(l.reportReason, style: TextStyle(color: context.mutedText)),
            const SizedBox(height: Gap.sm),
            RadioGroup<String>(
              groupValue: _reason,
              onChanged: (value) => setState(() => _reason = value),
              child: Column(
                children: [
                  for (final reason in reasons) RadioListTile<String>(value: reason, title: Text(widget.labelOf(l, reason)), contentPadding: EdgeInsets.zero),
                ],
              ),
            ),
            const SizedBox(height: Gap.sm),
            TextField(
              controller: _comment,
              maxLength: 500,
              minLines: 2,
              maxLines: 4,
              textCapitalization: TextCapitalization.sentences,
              decoration: InputDecoration(labelText: l.reportComment),
            ),
            if (_error != null) ...[Text(errorText(context, _error!), style: TextStyle(color: context.dangerText)), const SizedBox(height: Gap.sm)],
            FilledButton(
              onPressed: _reason == null || _sending ? null : _send,
              child: _sending
                  ? const SizedBox.square(dimension: 22, child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white))
                  : Text(l.reportSend),
            ),
          ],
        ),
      ),
    );
  }
}
