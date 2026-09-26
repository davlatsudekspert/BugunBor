import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/links.dart';
import '../../app/providers.dart';
import '../../core/api_error.dart';
import '../../core/format.dart';
import '../../data/models.dart';
import '../../design/icons.dart';
import '../../design/theme.dart';
import '../../design/widgets/common.dart';
import '../../design/widgets/form_fields.dart';
import '../../l10n/gen/app_localizations.dart';
import 'deal_draft.dart';
import 'deal_visual.dart';
import 'photo.dart';

/// What to tell the owner after saving, by the deal's new status.
String savedMessage(L l, String status) => switch (status) {
  'ACTIVE' => l.dealSavedLive,
  'PENDING_REVIEW' => l.dealSavedReview,
  _ => l.dealSavedDraft,
};

/// Adding a deal, or changing a draft, from the app: the site's deal form
/// and its checks. The server's automatic review decides whether a deal
/// sent for review goes live at once.
class DealFormScreen extends ConsumerWidget {
  const DealFormScreen({super.key, required this.businessId, this.dealId});
  final String businessId;
  final String? dealId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = L.of(context);
    final id = dealId;
    final config = ref.watch(configProvider);
    final workspace = ref.watch(workspaceProvider(businessId));
    final deal = id == null ? null : ref.watch(editableDealProvider((businessId: businessId, dealId: id)));
    final title = Text(id == null ? l.dealNewTitle : l.dealEditTitle);
    final configValue = config.value;
    final workspaceValue = workspace.value;
    final dealValue = deal?.value;
    if (configValue == null || workspaceValue == null || (id != null && dealValue == null)) {
      final error = config.error ?? workspace.error ?? deal?.error;
      return Scaffold(
        appBar: AppBar(title: title),
        body: error == null
            ? const Center(child: CircularProgressIndicator())
            : StatePanel.error(
                context,
                error,
                onRetry: () {
                  ref.invalidate(configProvider);
                  ref.invalidate(workspaceProvider(businessId));
                  if (id != null) ref.invalidate(editableDealProvider((businessId: businessId, dealId: id)));
                },
              ),
      );
    }
    // A server without the deal rules (not yet updated): the site still works.
    if (configValue.deal.visuals.isEmpty) {
      final locale = ref.watch(settingsProvider.select((settings) => settings.locale));
      return Scaffold(
        appBar: AppBar(title: title),
        body: StatePanel(
          icon: Icons.local_offer_outlined,
          title: l.dealNeedsUpdate,
          actionLabel: l.bizOnSite,
          onAction: () => openSite(workspacePath(businessId, '/business/deals/new'), lang: locale),
        ),
      );
    }
    if (dealValue != null && dealValue.status != 'DRAFT' && dealValue.status != 'REJECTED') {
      return Scaffold(
        appBar: AppBar(title: title),
        body: StatePanel(icon: Icons.lock_outline_rounded, title: l.dealLocked),
      );
    }
    return _DealForm(businessId: businessId, config: configValue, workspace: workspaceValue, deal: dealValue);
  }
}

/// Field order on the form: the first problem in this order is scrolled to.
const _fields = [
  'photo',
  'title',
  'description',
  'terms',
  'categoryId',
  'visual',
  'originalPrice',
  'price',
  'startsAt',
  'endsAt',
  'quantity',
  'perCustomerLimit',
  'claimTtlMinutes',
  'branchIds',
];

const _limits = {'title': (5, 90), 'description': (20, 600), 'terms': (5, 600)};

/// Digits only, grouped as the prices are shown: "20 000".
class _AmountFormatter extends TextInputFormatter {
  @override
  TextEditingValue formatEditUpdate(TextEditingValue oldValue, TextEditingValue newValue) {
    var digits = newValue.text.replaceAll(RegExp(r'\D'), '');
    if (digits.length > 9) digits = digits.substring(0, 9);
    if (digits.isEmpty) return TextEditingValue.empty;
    final text = groupDigits(int.parse(digits));
    return TextEditingValue(
      text: text,
      selection: TextSelection.collapsed(offset: text.length),
    );
  }
}

class _DealForm extends ConsumerStatefulWidget {
  const _DealForm({required this.businessId, required this.config, required this.workspace, required this.deal});
  final String businessId;
  final AppConfig config;
  final BusinessWorkspace workspace;
  final EditableDeal? deal;

  @override
  ConsumerState<_DealForm> createState() => _DealFormState();
}

class _DealFormState extends ConsumerState<_DealForm> {
  final _title = TextEditingController();
  final _description = TextEditingController();
  final _terms = TextEditingController();
  final _original = TextEditingController();
  final _price = TextEditingController();
  final _quantity = TextEditingController(text: '20');
  final _keys = {for (final field in _fields) field: GlobalKey()};
  String? _categoryId;
  String? _visual;
  bool _visualChosen = false;
  late DateTime _starts;
  late DateTime _ends;
  bool _unlimited = false;
  int _perCustomer = 1;
  late int _ttl;
  late List<String> _branchIds;
  String? _photoId;
  String? _photoUrl;
  Uint8List? _photoBytes;
  bool _uploading = false;

  /// 'submit' or 'draft' while that button's request runs.
  String? _saving;
  bool _touched = false;
  bool _done = false;
  Map<String, String> _errors = const {};
  String? _formError;

  DealRules get _rules => widget.config.deal;

  String? _slugOf(String? categoryId) => widget.config.categories.where((category) => category.id == categoryId).firstOrNull?.slug;

  @override
  void initState() {
    super.initState();
    final deal = widget.deal;
    if (deal != null) {
      _title.text = deal.title;
      _description.text = deal.description;
      _terms.text = deal.terms;
      _original.text = deal.originalPrice == null ? '' : groupDigits(deal.originalPrice!);
      _price.text = groupDigits(deal.price);
      // A category or branch removed since the deal was saved is chosen again.
      _categoryId = widget.config.categories.any((category) => category.id == deal.categoryId) ? deal.categoryId : null;
      _visual = deal.visual ?? _rules.visualFor(_slugOf(deal.categoryId));
      _visualChosen = deal.visual != null;
      _starts = parseTashkentInput(deal.startsAt) ?? tashkentNow();
      _ends = parseTashkentInput(deal.endsAt) ?? _starts.add(const Duration(hours: 4));
      _unlimited = deal.total == null;
      _quantity.text = '${deal.total ?? 20}';
      _perCustomer = deal.perCustomerLimit;
      _ttl = deal.claimTtlMinutes;
      _branchIds = [
        for (final branch in widget.workspace.branches)
          if (deal.branchIds.contains(branch.id)) branch.id,
      ];
      _photoId = deal.photoId;
      _photoUrl = deal.photo;
    } else {
      _categoryId = widget.workspace.business.categoryId ?? widget.config.categories.firstOrNull?.id;
      _visual = _rules.visualFor(_slugOf(_categoryId));
      _starts = tashkentNow();
      _ends = _starts.add(const Duration(hours: 4));
      _ttl = _rules.defaultClaimTtl;
      _branchIds = [for (final branch in widget.workspace.branches) branch.id];
    }
  }

  @override
  void dispose() {
    for (final controller in [_title, _description, _terms, _original, _price, _quantity]) {
      controller.dispose();
    }
    super.dispose();
  }

  DealDraft get _draft => DealDraft(
    title: _title.text,
    description: _description.text,
    terms: _terms.text,
    categoryId: _categoryId,
    visual: _visual,
    originalPrice: _original.text,
    price: _price.text,
    startsAt: _starts,
    endsAt: _ends,
    quantity: _quantity.text,
    unlimited: _unlimited,
    perCustomerLimit: _perCustomer,
    claimTtlMinutes: _ttl,
    branchIds: _branchIds,
    photoId: _photoId,
  );

  /// Changes made here clear that field's problem.
  void _edit(List<String> fields, VoidCallback change) {
    setState(() {
      change();
      _touched = true;
      if (fields.any(_errors.containsKey)) _errors = {..._errors}..removeWhere((key, _) => fields.contains(key));
    });
  }

  String? _message(L l, String field) {
    final problem = _errors[field];
    if (problem == null) return null;
    final limits = _limits[field];
    return switch (problem) {
      'tooShort' when limits != null => l.valTooShort('${limits.$1}'),
      'tooLong' when limits != null => l.valTooLong('${limits.$2}'),
      'choose' => l.valChoose,
      'minAmount' => l.valMinAmount(groupDigits(DealDraft.minOriginalPrice)),
      'priceOrder' => l.valPriceOrder,
      'minDiscount' => l.valMinDiscount('${_rules.minDiscountPercent}'),
      'endAfterStart' => l.valEndAfterStart,
      'duration' => l.valDuration,
      'endInPast' => l.valEndInPast,
      'branchesRequired' => l.valBranches,
      _ => l.valInvalid,
    };
  }

  /// Shows [problems] under their fields and scrolls to the first one.
  void _show(Map<String, String> problems) {
    final l = L.of(context);
    final known = {
      for (final entry in problems.entries)
        if (_fields.contains(entry.key)) entry.key: entry.value,
    };
    setState(() {
      _errors = known;
      _formError = known.length < problems.length ? l.bizFixErrors : null;
    });
    final first = _fields.where(known.containsKey).firstOrNull;
    if (first == null) return;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final target = _keys[first]?.currentContext;
      if (target != null && target.mounted) Scrollable.ensureVisible(target, duration: const Duration(milliseconds: 300), alignment: 0.15);
    });
  }

  /// The newest message replaces the one showing, so it is never queued.
  void _snack(String text) => ScaffoldMessenger.of(context)
    ..hideCurrentSnackBar()
    ..showSnackBar(SnackBar(content: Text(text)));

  Future<void> _pickPhoto() async {
    final l = L.of(context);
    final camera = await showModalBottomSheet<bool>(
      context: context,
      showDragHandle: true,
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(leading: const Icon(Icons.photo_camera_outlined), title: Text(l.dealPhotoCamera), onTap: () => Navigator.pop(context, true)),
            ListTile(leading: const Icon(Icons.photo_library_outlined), title: Text(l.dealPhotoGallery), onTap: () => Navigator.pop(context, false)),
            const SizedBox(height: Gap.sm),
          ],
        ),
      ),
    );
    if (camera == null || !mounted) return;
    final Uint8List? bytes;
    try {
      bytes = await ref.read(photoPickerProvider)(camera: camera);
    } on UnreadablePhoto {
      if (mounted) _snack(l.dealPhotoUnsupported);
      return;
    } on CameraDenied {
      if (mounted) _snack(l.dealPhotoCameraDenied);
      return;
    } catch (_) {
      if (mounted) _snack(l.errorGeneric);
      return;
    }
    if (bytes == null || !mounted) return;
    _edit(['photo'], () {
      _uploading = true;
      _photoBytes = bytes;
    });
    try {
      final uploaded = await ref.read(apiProvider).uploadPhoto(widget.businessId, bytes);
      if (!mounted) return;
      setState(() {
        _uploading = false;
        _photoId = uploaded.id;
        _photoUrl = uploaded.url;
      });
    } catch (error) {
      if (!mounted) return;
      // The photo that was there before stays.
      setState(() {
        _uploading = false;
        _photoBytes = null;
      });
      _snack(errorText(context, error));
    }
  }

  void _removePhoto() => _edit(['photo'], () {
    _photoId = null;
    _photoUrl = null;
    _photoBytes = null;
  });

  Future<void> _pickTime({required bool start}) async {
    final current = start ? _starts : _ends;
    final today = tashkentNow();
    final first = DateTime.utc(today.year, today.month, today.day);
    final earliest = current.isBefore(first) ? DateTime.utc(current.year, current.month, current.day) : first;
    final date = await showDatePicker(
      context: context,
      initialDate: DateTime.utc(current.year, current.month, current.day),
      firstDate: earliest,
      lastDate: first.add(Duration(days: _rules.maxDurationDays + 30)),
    );
    if (date == null || !mounted) return;
    final time = await showTimePicker(
      context: context,
      initialTime: TimeOfDay(hour: current.hour, minute: current.minute),
      builder: (context, child) => MediaQuery(data: MediaQuery.of(context).copyWith(alwaysUse24HourFormat: true), child: child!),
    );
    if (time == null || !mounted) return;
    final picked = DateTime.utc(date.year, date.month, date.day, time.hour, time.minute);
    _edit(['startsAt', 'endsAt'], () {
      if (start) {
        // Moving the start keeps the length of the deal.
        final length = _ends.difference(_starts);
        _starts = picked;
        _ends = picked.add(length.isNegative ? const Duration(hours: 4) : length);
      } else {
        _ends = picked;
      }
    });
  }

  void _quick(Duration? length) => _edit(['startsAt', 'endsAt'], () {
    _ends = length == null ? DateTime.utc(_starts.year, _starts.month, _starts.day, 23, 59) : _starts.add(length);
  });

  Future<void> _save({required bool submit}) async {
    final l = L.of(context);
    FocusScope.of(context).unfocus();
    if (_uploading || _saving != null) return;
    final draft = _draft;
    final problems = draft.problems(_rules, now: tashkentNow(), submit: submit);
    if (problems.isNotEmpty) {
      _show(problems);
      return;
    }
    setState(() {
      _saving = submit ? 'submit' : 'draft';
      _errors = const {};
      _formError = null;
    });
    try {
      final saved = await ref.read(apiProvider).saveDeal(widget.businessId, draft.toJson(), dealId: widget.deal?.id, submit: submit);
      ref.invalidate(businessDealsProvider(widget.businessId));
      ref.invalidate(workspaceProvider(widget.businessId));
      if (!mounted) return;
      setState(() {
        _saving = null;
        _done = true;
      });
      _snack(savedMessage(l, saved.status));
      if (context.canPop()) {
        context.pop();
      } else {
        context.go('/profile');
      }
    } catch (error) {
      if (!mounted) return;
      if (error is ApiError && error.code == 'VALIDATION' && error.fields.isNotEmpty) {
        setState(() => _saving = null);
        // The server names fields by their path, e.g. `input.price`.
        _show({for (final entry in error.fields.entries) entry.key.split('.').last: entry.value});
        return;
      }
      setState(() {
        _saving = null;
        _formError = errorText(context, error);
      });
    }
  }

  Future<void> _leave() async {
    final l = L.of(context);
    final leave =
        !_touched ||
        (await showDialog<bool>(
              context: context,
              builder: (context) => AlertDialog(
                content: Text(l.bizDiscardAsk),
                actions: [
                  TextButton(onPressed: () => Navigator.pop(context, false), child: Text(l.cancel)),
                  TextButton(onPressed: () => Navigator.pop(context, true), child: Text(l.bizDiscard)),
                ],
              ),
            ) ??
            false);
    if (!leave || !mounted) return;
    if (context.canPop()) {
      context.pop();
    } else {
      context.go('/profile');
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    return PopScope(
      // Nothing typed yet: back simply goes back.
      canPop: _done || !_touched,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop && _saving == null) _leave();
      },
      child: Scaffold(
        appBar: AppBar(title: Text(widget.deal == null ? l.dealNewTitle : l.dealEditTitle)),
        body: _form(context, l),
      ),
    );
  }

  Widget _form(BuildContext context, L l) {
    final locale = ref.watch(settingsProvider.select((settings) => settings.locale));
    final deal = widget.deal;
    final original = parseAmount(_original.text);
    final price = parseAmount(_price.text);
    final percent = original != null && price != null && price < original ? discountPercent(original, price) : null;
    Widget field(String name, Widget child) => KeyedSubtree(key: _keys[name], child: child);
    Widget label(String text) => Padding(
      padding: const EdgeInsets.only(bottom: Gap.sm),
      child: Text(text, style: Theme.of(context).textTheme.titleSmall),
    );
    const gap = SizedBox(height: Gap.lg);

    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(Gap.gutter, Gap.sm, Gap.gutter, Gap.xl),
      keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (deal?.status == 'REJECTED' && deal?.rejectionReason != null) ...[
            NoteLine(icon: Icons.error_outline_rounded, color: errorColor(context), text: l.dealsRejected(deal!.rejectionReason!)),
            gap,
          ],
          field('photo', _photoCard(l)),
          gap,
          field(
            'title',
            TextField(
              controller: _title,
              maxLength: 90,
              textCapitalization: TextCapitalization.sentences,
              textInputAction: TextInputAction.next,
              onChanged: (_) => _edit(['title'], () {}),
              decoration: InputDecoration(labelText: l.dealTitleLabel, hintText: l.dealTitleHint, counterText: '', errorText: _message(l, 'title')),
            ),
          ),
          gap,
          field(
            'description',
            TextField(
              controller: _description,
              minLines: 3,
              maxLines: 6,
              maxLength: 600,
              textCapitalization: TextCapitalization.sentences,
              onChanged: (_) => _edit(['description'], () {}),
              decoration: InputDecoration(
                labelText: l.dealDescriptionLabel,
                hintText: l.dealDescriptionHint,
                alignLabelWithHint: true,
                errorText: _message(l, 'description'),
              ),
            ),
          ),
          const SizedBox(height: Gap.sm),
          field(
            'terms',
            TextField(
              controller: _terms,
              minLines: 2,
              maxLines: 5,
              maxLength: 600,
              textCapitalization: TextCapitalization.sentences,
              onChanged: (_) => _edit(['terms'], () {}),
              decoration: InputDecoration(labelText: l.dealTerms, hintText: l.dealTermsHint, alignLabelWithHint: true, errorText: _message(l, 'terms')),
            ),
          ),
          gap,
          field(
            'categoryId',
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                label(l.bizCategory),
                Wrap(
                  spacing: Gap.sm,
                  runSpacing: Gap.sm,
                  children: [
                    for (final category in widget.config.categories)
                      ChoiceChip(
                        avatar: Icon(iconFor(category.icon), size: 18, color: category.id == _categoryId ? Colors.white : Brand.primary),
                        label: Text(category.name(locale)),
                        selected: category.id == _categoryId,
                        showCheckmark: false,
                        onSelected: (_) => _edit(['categoryId', 'visual'], () {
                          _categoryId = category.id;
                          // Until an icon is picked by hand, it follows the category.
                          if (!_visualChosen) _visual = _rules.visualFor(category.slug);
                        }),
                      ),
                  ],
                ),
                if (_message(l, 'categoryId') case final error?) FieldError(error),
              ],
            ),
          ),
          gap,
          field('visual', _visualPicker(l)),
          gap,
          field(
            'originalPrice',
            TextField(
              controller: _original,
              keyboardType: TextInputType.number,
              inputFormatters: [_AmountFormatter()],
              textInputAction: TextInputAction.next,
              onChanged: (_) => _edit(['originalPrice', 'price'], () {}),
              decoration: InputDecoration(labelText: l.dealOriginalPrice, errorText: _message(l, 'originalPrice')),
            ),
          ),
          const SizedBox(height: Gap.md),
          field(
            'price',
            TextField(
              controller: _price,
              keyboardType: TextInputType.number,
              inputFormatters: [_AmountFormatter()],
              textInputAction: TextInputAction.next,
              onChanged: (_) => _edit(['price'], () {}),
              decoration: InputDecoration(
                labelText: l.dealPriceLabel,
                errorText: _message(l, 'price'),
                helperText: percent == null ? null : l.dealDiscountPreview('$percent'),
                helperStyle: TextStyle(
                  color: percent != null && percent >= _rules.minDiscountPercent ? context.successText : context.mutedText,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
          ),
          gap,
          label(l.dealWhen),
          field(
            'startsAt',
            TapField(
              label: l.dealStarts,
              value: wallLabel(_starts),
              icon: Icons.event_outlined,
              error: _message(l, 'startsAt'),
              onTap: () => _pickTime(start: true),
            ),
          ),
          const SizedBox(height: Gap.md),
          field(
            'endsAt',
            TapField(
              label: l.dealEnds,
              value: wallLabel(_ends),
              icon: Icons.event_available_outlined,
              error: _message(l, 'endsAt'),
              onTap: () => _pickTime(start: false),
            ),
          ),
          const SizedBox(height: Gap.sm),
          Wrap(
            spacing: Gap.sm,
            runSpacing: Gap.sm,
            children: [
              for (final (text, length) in [
                (l.dealQuick2h, const Duration(hours: 2)),
                (l.dealQuick4h, const Duration(hours: 4)),
                (l.dealQuickToday, null),
                (l.dealQuick1d, const Duration(days: 1)),
                (l.dealQuick3d, const Duration(days: 3)),
                (l.dealQuick7d, const Duration(days: 7)),
              ])
                ActionChip(label: Text(text), onPressed: () => _quick(length)),
            ],
          ),
          const SizedBox(height: Gap.xs),
          Text(l.dealTimeHint, style: TextStyle(color: context.mutedText, fontSize: 12.5)),
          gap,
          field(
            'quantity',
            Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                TextField(
                  controller: _quantity,
                  enabled: !_unlimited,
                  keyboardType: TextInputType.number,
                  inputFormatters: [FilteringTextInputFormatter.digitsOnly, LengthLimitingTextInputFormatter(5)],
                  onChanged: (_) => _edit(['quantity'], () {}),
                  decoration: InputDecoration(labelText: l.dealQuantity, errorText: _unlimited ? null : _message(l, 'quantity')),
                ),
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  title: Text(l.dealUnlimited),
                  value: _unlimited,
                  onChanged: (value) => _edit(['quantity'], () => _unlimited = value),
                ),
              ],
            ),
          ),
          const SizedBox(height: Gap.sm),
          field(
            'perCustomerLimit',
            DropdownButtonFormField<int>(
              initialValue: _perCustomer,
              decoration: InputDecoration(labelText: l.dealPerCustomerLabel, errorText: _message(l, 'perCustomerLimit')),
              items: [for (var count = 1; count <= _rules.maxPerCustomer; count++) DropdownMenuItem(value: count, child: Text('$count'))],
              onChanged: (value) => _edit(['perCustomerLimit'], () => _perCustomer = value ?? 1),
            ),
          ),
          gap,
          field(
            'claimTtlMinutes',
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                label(l.dealTtl),
                Wrap(
                  spacing: Gap.sm,
                  runSpacing: Gap.sm,
                  children: [
                    for (final minutes in _rules.claimTtlOptions)
                      ChoiceChip(
                        label: Text(switch (minutes) {
                          30 => l.dealTtl30,
                          60 => l.dealTtl60,
                          120 => l.dealTtl120,
                          240 => l.dealTtl240,
                          _ => '$minutes',
                        }),
                        selected: minutes == _ttl,
                        showCheckmark: false,
                        onSelected: (_) => _edit(['claimTtlMinutes'], () => _ttl = minutes),
                      ),
                  ],
                ),
                if (_message(l, 'claimTtlMinutes') case final error?) FieldError(error),
              ],
            ),
          ),
          gap,
          field('branchIds', _branches(l)),
          gap,
          Text(l.dealPreview, style: Theme.of(context).textTheme.titleSmall),
          const SizedBox(height: Gap.sm),
          _preview(context, price, original, percent),
          const SizedBox(height: Gap.md),
          Text(l.dealRulesNote('${_rules.minDiscountPercent}'), style: TextStyle(color: context.mutedText, fontSize: 12.5, height: 1.4)),
          const SizedBox(height: Gap.lg),
          if (_errors.isNotEmpty ? l.bizFixErrors : _formError case final error?) ...[
            Container(
              padding: const EdgeInsets.all(Gap.md),
              decoration: BoxDecoration(color: Colors.red.withValues(alpha: 0.08), borderRadius: BorderRadius.circular(14)),
              child: Row(
                children: [
                  Icon(Icons.error_outline_rounded, color: errorColor(context)),
                  const SizedBox(width: Gap.sm),
                  Expanded(
                    child: Text(
                      error,
                      style: TextStyle(color: errorColor(context), fontWeight: FontWeight.w600),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: Gap.md),
          ],
          Text(l.dealAutoNote, style: TextStyle(color: context.mutedText, fontSize: 12.5, height: 1.4)),
          const SizedBox(height: Gap.md),
          FilledButton(
            onPressed: _saving != null || _uploading ? null : () => _save(submit: true),
            child: _saving == 'submit' ? _Busy(text: l.dealSaving) : Text(l.bizSubmit),
          ),
          const SizedBox(height: Gap.sm),
          OutlinedButton(
            onPressed: _saving != null || _uploading ? null : () => _save(submit: false),
            child: _saving == 'draft' ? _Busy(text: l.dealSaving, dark: true) : Text(l.dealSaveDraft),
          ),
        ],
      ),
    );
  }

  Widget _photoCard(L l) {
    final hasPhoto = _photoBytes != null || _photoUrl != null;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(l.dealPhoto, style: Theme.of(context).textTheme.titleSmall),
        const SizedBox(height: Gap.sm),
        ClipRRect(
          borderRadius: BorderRadius.circular(Gap.radius),
          child: AspectRatio(
            aspectRatio: 16 / 10,
            child: Stack(
              fit: StackFit.expand,
              children: [
                DealPicture(bytes: _photoBytes, photo: _photoUrl, emoji: _rules.emojiOf(_visual), emojiSize: 64),
                if (_uploading)
                  ColoredBox(
                    color: Colors.black.withValues(alpha: 0.45),
                    child: Center(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const CircularProgressIndicator(color: Colors.white),
                          const SizedBox(height: Gap.sm),
                          Text(
                            l.dealPhotoUploading,
                            style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700),
                          ),
                        ],
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ),
        const SizedBox(height: Gap.sm),
        Row(
          children: [
            Expanded(
              child: OutlinedButton.icon(
                onPressed: _uploading ? null : _pickPhoto,
                icon: Icon(hasPhoto ? Icons.refresh_rounded : Icons.add_a_photo_outlined),
                label: Text(hasPhoto ? l.dealPhotoChange : l.dealPhotoAdd),
              ),
            ),
            if (hasPhoto) ...[
              const SizedBox(width: Gap.sm),
              TextButton.icon(onPressed: _uploading ? null : _removePhoto, icon: const Icon(Icons.delete_outline_rounded), label: Text(l.dealPhotoRemove)),
            ],
          ],
        ),
        const SizedBox(height: Gap.xs),
        Text(l.dealPhotoHint, style: TextStyle(color: context.mutedText, fontSize: 12.5, height: 1.4)),
      ],
    );
  }

  Widget _visualPicker(L l) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Text(l.dealVisualLabel, style: Theme.of(context).textTheme.titleSmall),
      const SizedBox(height: Gap.xs),
      Text(l.dealVisualHint, style: TextStyle(color: context.mutedText, fontSize: 12.5)),
      const SizedBox(height: Gap.sm),
      SizedBox(
        height: 56,
        child: ListView.separated(
          scrollDirection: Axis.horizontal,
          itemCount: _rules.visuals.length,
          separatorBuilder: (_, _) => const SizedBox(width: Gap.xs),
          itemBuilder: (context, index) {
            final visual = _rules.visuals[index];
            final selected = visual.key == _visual;
            return Semantics(
              button: true,
              selected: selected,
              label: visual.key,
              excludeSemantics: true,
              child: InkResponse(
                onTap: () => _edit(['visual'], () {
                  _visual = visual.key;
                  _visualChosen = true;
                }),
                radius: 28,
                child: Container(
                  width: 52,
                  height: 52,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: selected ? Brand.primary.withValues(alpha: 0.12) : null,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: selected ? Brand.primary : context.borderColor, width: selected ? 2 : 1),
                  ),
                  child: Text(visual.emoji, style: const TextStyle(fontSize: 24)),
                ),
              ),
            );
          },
        ),
      ),
      if (_message(l, 'visual') case final error?) FieldError(error),
    ],
  );

  Widget _branches(L l) {
    final branches = widget.workspace.branches;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(l.dealWhere, style: Theme.of(context).textTheme.titleSmall),
        const SizedBox(height: Gap.sm),
        if (branches.isEmpty)
          NoteLine(icon: Icons.info_outline_rounded, color: context.mutedText, text: l.dealNoBranches)
        else
          Card(
            clipBehavior: Clip.antiAlias,
            child: Column(
              children: [
                for (final branch in branches)
                  CheckboxListTile(
                    value: _branchIds.contains(branch.id),
                    title: Text(branch.name, style: const TextStyle(fontWeight: FontWeight.w700)),
                    subtitle: branch.address.isEmpty ? null : Text(branch.address, maxLines: 2, overflow: TextOverflow.ellipsis),
                    onChanged: (checked) => _edit(['branchIds'], () {
                      _branchIds = checked == true ? [..._branchIds, branch.id] : _branchIds.where((id) => id != branch.id).toList();
                    }),
                  ),
              ],
            ),
          ),
        if (_message(l, 'branchIds') case final error?) FieldError(error),
      ],
    );
  }

  /// Roughly how the deal will look in the customers' list.
  Widget _preview(BuildContext context, int? price, int? original, int? percent) {
    final l = L.of(context);
    final title = _title.text.trim();
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(Gap.md),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(14),
              child: SizedBox.square(
                dimension: 96,
                child: DealPicture(bytes: _photoBytes, photo: _photoUrl, emoji: _rules.emojiOf(_visual)),
              ),
            ),
            const SizedBox(width: Gap.md),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    widget.workspace.business.name,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(color: context.mutedText, fontSize: 13, fontWeight: FontWeight.w600),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    title.isEmpty ? l.dealTitleHint : title,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(color: title.isEmpty ? context.mutedText : null),
                  ),
                  const SizedBox(height: Gap.xs),
                  if (price != null) PriceLine(price: price, original: original),
                  if (percent != null) ...[const SizedBox(height: Gap.xs), DiscountBadge(percent)],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Busy extends StatelessWidget {
  const _Busy({required this.text, this.dark = false});
  final String text;
  final bool dark;

  @override
  Widget build(BuildContext context) => Row(
    mainAxisSize: MainAxisSize.min,
    children: [
      SizedBox.square(dimension: 20, child: CircularProgressIndicator(strokeWidth: 2.5, color: dark ? context.accentText : Colors.white)),
      const SizedBox(width: Gap.md),
      Text(text),
    ],
  );
}
