import 'package:flutter/material.dart';
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
import '../common/pickers.dart';
import 'business_draft.dart';
import 'promo.dart';

/// The sample description for a category, with the business name in it.
String descriptionTemplate(L l, String? categorySlug, String name) => switch (categorySlug) {
  'taomlar' => l.bizTplFood(name),
  'kofe' => l.bizTplCoffee(name),
  'xaridlar' => l.bizTplShop(name),
  'gozallik' => l.bizTplBeauty(name),
  'sport' => l.bizTplSport(name),
  'kongilochar' => l.bizTplFun(name),
  'xizmatlar' => l.bizTplServices(name),
  'yetkazish' => l.bizTplDelivery(name),
  _ => l.bizTplDefault(name),
};

/// Registering a business from the app: the same form and checks as the
/// site's onboarding. The server decides whether it is approved at once.
class JoinScreen extends ConsumerWidget {
  const JoinScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = L.of(context);
    final signedIn = ref.watch(sessionProvider.select((session) => session.signedIn));
    if (!signedIn) return const _JoinGuest();
    final me = ref.watch(meProvider);
    final config = ref.watch(configProvider);
    final meValue = me.value;
    final configValue = config.value;
    if (meValue == null || configValue == null) {
      final error = me.error ?? config.error;
      return Scaffold(
        appBar: AppBar(title: Text(l.addBusiness)),
        body: error == null
            ? const Center(child: CircularProgressIndicator())
            : StatePanel.error(
                context,
                error,
                onRetry: () {
                  ref.invalidate(meProvider);
                  ref.invalidate(configProvider);
                },
              ),
      );
    }
    // A server without category ids (not yet updated) cannot take the form.
    if (configValue.categories.isEmpty || configValue.categories.any((category) => category.id.isEmpty)) {
      final locale = ref.watch(settingsProvider.select((settings) => settings.locale));
      return Scaffold(
        appBar: AppBar(title: Text(l.addBusiness)),
        body: StatePanel(
          icon: Icons.storefront_outlined,
          title: l.bizJoinSoon,
          actionLabel: l.bizOnSite,
          onAction: () => openSite('/business/onboarding', lang: locale),
        ),
      );
    }
    // The server's limit, said before the form is filled in.
    if (meValue.memberships.where((item) => item.role == 'OWNER').length >= maxOwnedBusinesses) {
      return Scaffold(
        appBar: AppBar(title: Text(l.addBusiness)),
        body: StatePanel(icon: Icons.storefront_outlined, title: l.bizLimit, actionLabel: l.bizOpenProfile, onAction: () => context.go('/profile')),
      );
    }
    return _JoinForm(me: meValue, config: configValue);
  }
}

/// MAX_OWNED_BUSINESSES in modules/businesses/service.ts.
const maxOwnedBusinesses = 5;

class _JoinHeader extends StatelessWidget {
  const _JoinHeader();

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: 52,
          height: 52,
          decoration: BoxDecoration(color: Brand.primary.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(16)),
          child: Icon(Icons.add_business_rounded, color: context.accentText, size: 28),
        ),
        const SizedBox(height: Gap.md),
        Text(l.bizJoinTitle, style: Theme.of(context).textTheme.headlineSmall),
        const SizedBox(height: Gap.xs),
        Text(l.bizJoinText, style: TextStyle(color: context.mutedText, height: 1.4)),
      ],
    );
  }
}

class _JoinGuest extends StatelessWidget {
  const _JoinGuest();

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    return Scaffold(
      appBar: AppBar(title: Text(l.addBusiness)),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(Gap.gutter, Gap.sm, Gap.gutter, Gap.xl),
        children: [
          const _JoinHeader(),
          const SizedBox(height: Gap.lg),
          const Card(
            child: Padding(padding: EdgeInsets.all(Gap.lg), child: PromoPoints()),
          ),
          const SizedBox(height: Gap.xl),
          Text(l.bizJoinLogin, style: const TextStyle(height: 1.4)),
          const SizedBox(height: Gap.md),
          FilledButton.icon(
            style: FilledButton.styleFrom(backgroundColor: Brand.telegram),
            onPressed: () => context.push('/login'),
            icon: const Icon(Icons.send_rounded),
            label: Text(l.loginButton),
          ),
        ],
      ),
    );
  }
}

/// Field order on the form: the first problem in this order is scrolled to.
const _fields = ['name', 'categoryId', 'city', 'phone', 'address', 'open', 'close', 'description', 'telegram', 'instagram', 'website'];
const _optional = {'telegram', 'instagram', 'website'};

/// Length limits for the "at least / at most N characters" messages.
const _limits = {'name': (2, 80), 'address': (5, 240), 'description': (BusinessDraft.descriptionMin, BusinessDraft.descriptionMax), 'website': (0, 200)};

class _JoinForm extends ConsumerStatefulWidget {
  const _JoinForm({required this.me, required this.config});
  final Me me;
  final AppConfig config;

  @override
  ConsumerState<_JoinForm> createState() => _JoinFormState();
}

class _JoinFormState extends ConsumerState<_JoinForm> {
  final _name = TextEditingController();
  final _phone = TextEditingController();
  final _address = TextEditingController();
  final _description = TextEditingController();
  final _telegram = TextEditingController();
  final _instagram = TextEditingController();
  final _website = TextEditingController();
  final _keys = {for (final field in _fields) field: GlobalKey()};
  String? _categoryId;
  String? _city;
  String _open = '09:00';
  String _close = '21:00';
  Pin? _pin;
  bool _locating = false;
  bool _locateFailed = false;
  bool _more = false;
  bool _usedTemplate = false;
  bool _sending = false;
  Map<String, String> _errors = const {};
  String? _formError;
  BusinessCreated? _created;

  @override
  void initState() {
    super.initState();
    _phone.text = formatPhone(widget.me.phone);
    final settings = ref.read(settingsProvider);
    _city = (widget.config.city(settings.city) ?? widget.config.city(ref.read(feedProvider).value?.city))?.slug;
  }

  @override
  void dispose() {
    for (final controller in [_name, _phone, _address, _description, _telegram, _instagram, _website]) {
      controller.dispose();
    }
    super.dispose();
  }

  bool get _dirty =>
      _name.text.trim().isNotEmpty ||
      _address.text.trim().isNotEmpty ||
      _description.text.trim().isNotEmpty ||
      _telegram.text.trim().isNotEmpty ||
      _instagram.text.trim().isNotEmpty ||
      _website.text.trim().isNotEmpty ||
      _categoryId != null ||
      _pin != null;

  BusinessDraft get _draft => BusinessDraft(
    name: _name.text,
    description: _description.text,
    categoryId: _categoryId,
    city: _city,
    phone: _phone.text,
    address: _address.text,
    open: _open,
    close: _close,
    telegram: _telegram.text,
    instagram: _instagram.text,
    website: _website.text,
    latitude: _pin?.latitude,
    longitude: _pin?.longitude,
  );

  void _clear(String field) {
    if (!_errors.containsKey(field)) return;
    setState(() => _errors = {..._errors}..remove(field));
  }

  String? _message(L l, String field) {
    final problem = _errors[field];
    if (problem == null) return null;
    final limits = _limits[field];
    return switch (problem) {
      'tooShort' when limits != null => l.valTooShort('${limits.$1}'),
      'tooLong' when limits != null => l.valTooLong('${limits.$2}'),
      'phone' => l.valPhone,
      'time' => l.valTime,
      'choose' => l.valChoose,
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
      // Problems the form cannot point at are said above the button.
      _formError = known.length < problems.length ? l.bizFixErrors : null;
      if (known.keys.any(_optional.contains)) _more = true;
    });
    final first = _fields.where(known.containsKey).firstOrNull;
    if (first == null) return;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final target = _keys[first]?.currentContext;
      if (target != null && target.mounted) {
        Scrollable.ensureVisible(target, duration: const Duration(milliseconds: 300), alignment: 0.15);
      }
    });
  }

  Future<void> _submit() async {
    final l = L.of(context);
    FocusScope.of(context).unfocus();
    final draft = _draft;
    final problems = draft.problems();
    if (problems.isNotEmpty) {
      _show(problems);
      return;
    }
    setState(() {
      _sending = true;
      _formError = null;
      _errors = const {};
    });
    final before = widget.me.memberships.map((membership) => membership.businessId).toSet();
    try {
      final created = await ref.read(apiProvider).createBusiness(draft.toJson());
      if (mounted) _done(created);
    } catch (error) {
      if (!mounted) return;
      if (error is ApiError && error.code == 'VALIDATION' && error.fields.isNotEmpty) {
        setState(() => _sending = false);
        _show(error.fields);
        return;
      }
      if (error is ApiError && error.isNetwork) {
        // The answer may have been lost after the business was made: look
        // before offering to send it again (a second one would be a copy).
        Me? me;
        try {
          me = await ref.refresh(meProvider.future);
        } catch (_) {}
        final name = draft.name.trim().toLowerCase();
        final made = me?.memberships.where((item) => !before.contains(item.businessId) && item.name.trim().toLowerCase() == name).firstOrNull;
        if (made != null && mounted) {
          _done(BusinessCreated(id: made.businessId, slug: made.slug, status: made.status));
          return;
        }
      }
      if (!mounted) return;
      setState(() {
        _sending = false;
        _formError = error is ApiError && error.code == 'BUSINESS_LIMIT' ? l.bizLimit : errorText(context, error);
      });
    }
  }

  void _done(BusinessCreated created) {
    // The Profile tab now opens on this business.
    ref.read(profileViewProvider.notifier).showBusiness(created.id);
    ref.invalidate(meProvider);
    setState(() {
      _sending = false;
      _created = created;
    });
  }

  Future<void> _locate() async {
    final l = L.of(context);
    setState(() {
      _locating = true;
      _locateFailed = false;
    });
    final pin = await ref.read(pinLocatorProvider)();
    if (!mounted) return;
    setState(() {
      _locating = false;
      _locateFailed = pin == null;
      _pin = pin ?? _pin;
      if (pin != null) {
        _city = nearestCity(widget.config.cities, pin.latitude, pin.longitude)?.slug ?? _city;
        _errors = {..._errors}..remove('city');
      }
    });
    if (pin == null) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(l.bizLocateFailed)));
  }

  Future<void> _pickCity() async {
    final choice = await showPlacePicker(context, ref, offerLocation: false);
    if (choice is! CityChoice || !mounted) return;
    setState(() {
      // A pin elsewhere would not match the new city.
      if (choice.slug != _city) _pin = null;
      _city = choice.slug;
      _errors = {..._errors}..remove('city');
    });
  }

  Future<void> _pickTime({required bool opening}) async {
    final current = opening ? _open : _close;
    final picked = await showTimePicker(
      context: context,
      initialTime: TimeOfDay(hour: int.parse(current.substring(0, 2)), minute: int.parse(current.substring(3))),
      initialEntryMode: TimePickerEntryMode.input,
      builder: (context, child) => MediaQuery(data: MediaQuery.of(context).copyWith(alwaysUse24HourFormat: true), child: child!),
    );
    if (picked == null || !mounted) return;
    String two(int value) => value.toString().padLeft(2, '0');
    final value = '${two(picked.hour)}:${two(picked.minute)}';
    setState(() {
      if (opening) {
        _open = value;
      } else {
        _close = value;
      }
      _errors = {..._errors}
        ..remove('open')
        ..remove('close');
    });
  }

  Future<void> _useTemplate() async {
    final l = L.of(context);
    final name = _name.text.trim();
    if (name.length < 2) {
      _show({'name': 'tooShort'});
      return;
    }
    if (_description.text.trim().isNotEmpty) {
      final replace = await showDialog<bool>(
        context: context,
        builder: (context) => AlertDialog(
          content: Text(l.bizTemplateAsk),
          actions: [
            TextButton(onPressed: () => Navigator.pop(context, false), child: Text(l.cancel)),
            TextButton(onPressed: () => Navigator.pop(context, true), child: Text(l.yes)),
          ],
        ),
      );
      if (replace != true || !mounted) return;
    }
    final slug = widget.config.categories.where((category) => category.id == _categoryId).firstOrNull?.slug;
    setState(() {
      _description.text = descriptionTemplate(l, slug, name);
      _usedTemplate = true;
      _errors = {..._errors}..remove('description');
    });
  }

  Future<void> _leave() async {
    final l = L.of(context);
    final leave =
        !_dirty ||
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
      context.go('/');
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    final created = _created;
    return PopScope(
      canPop: created != null,
      onPopInvokedWithResult: (didPop, _) {
        // While sending, stay: the answer decides what comes next.
        if (!didPop && !_sending) _leave();
      },
      child: Scaffold(
        appBar: AppBar(title: Text(l.addBusiness)),
        body: created == null ? _form(context, l) : _Created(created: created),
      ),
    );
  }

  Widget _form(BuildContext context, L l) {
    final locale = ref.watch(settingsProvider.select((settings) => settings.locale));
    final config = widget.config;
    final cityName = config.city(_city)?.name(locale);
    final telegramName = widget.me.telegramUsername;
    Widget field(String name, Widget child) => KeyedSubtree(key: _keys[name], child: child);
    const gap = SizedBox(height: Gap.lg);

    // Not a lazy list: every field stays built, so a problem can always be
    // scrolled to (a ListView drops the ones out of sight).
    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(Gap.gutter, Gap.sm, Gap.gutter, Gap.xl),
      keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const _JoinHeader(),
          const SizedBox(height: Gap.xl),
          field(
            'name',
            TextField(
              controller: _name,
              maxLength: 80,
              textCapitalization: TextCapitalization.sentences,
              textInputAction: TextInputAction.next,
              onChanged: (_) => _clear('name'),
              decoration: InputDecoration(labelText: l.bizName, hintText: l.bizNameHint, counterText: '', errorText: _message(l, 'name')),
            ),
          ),
          gap,
          field(
            'categoryId',
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(l.bizCategory, style: Theme.of(context).textTheme.titleSmall),
                const SizedBox(height: Gap.sm),
                Wrap(
                  spacing: Gap.sm,
                  runSpacing: Gap.sm,
                  children: [
                    for (final category in config.categories)
                      ChoiceChip(
                        avatar: Icon(iconFor(category.icon), size: 18, color: category.id == _categoryId ? Colors.white : Brand.primary),
                        label: Text(category.name(locale)),
                        selected: category.id == _categoryId,
                        showCheckmark: false,
                        onSelected: (_) => setState(() {
                          _categoryId = category.id;
                          _errors = {..._errors}..remove('categoryId');
                        }),
                      ),
                  ],
                ),
                if (_message(l, 'categoryId') case final error?) FieldError(error),
              ],
            ),
          ),
          gap,
          field('city', TapField(label: l.bizCity, value: cityName ?? '', icon: Icons.expand_more_rounded, error: _message(l, 'city'), onTap: _pickCity)),
          const SizedBox(height: Gap.xs),
          Align(
            alignment: AlignmentDirectional.centerStart,
            child: TextButton.icon(
              onPressed: _locating ? null : _locate,
              icon: _locating ? const SizedBox.square(dimension: 18, child: CircularProgressIndicator(strokeWidth: 2)) : const Icon(Icons.my_location_rounded),
              label: Text(_locating ? l.bizLocating : l.bizLocate),
            ),
          ),
          if (_pin != null)
            NoteLine(icon: Icons.check_circle_rounded, color: context.successText, text: l.bizLocated(cityName ?? ''))
          else
            NoteLine(
              icon: _locateFailed ? Icons.location_off_outlined : Icons.info_outline_rounded,
              color: context.mutedText,
              text: _locateFailed ? l.bizLocateFailed : l.bizLocateNote,
            ),
          gap,
          field(
            'phone',
            TextField(
              controller: _phone,
              keyboardType: TextInputType.phone,
              autofillHints: const [AutofillHints.telephoneNumber],
              textInputAction: TextInputAction.next,
              onChanged: (_) => _clear('phone'),
              decoration: InputDecoration(labelText: l.bizPhone, hintText: '+998 90 123 45 67', errorText: _message(l, 'phone')),
            ),
          ),
          gap,
          field(
            'address',
            TextField(
              controller: _address,
              maxLength: 240,
              textCapitalization: TextCapitalization.sentences,
              textInputAction: TextInputAction.next,
              onChanged: (_) => _clear('address'),
              decoration: InputDecoration(
                labelText: l.bizAddress,
                hintText: l.bizAddressHint,
                helperText: l.bizAddressNote,
                helperMaxLines: 3,
                counterText: '',
                errorText: _message(l, 'address'),
                errorMaxLines: 2,
              ),
            ),
          ),
          gap,
          Text(l.bizHours, style: Theme.of(context).textTheme.titleSmall),
          const SizedBox(height: Gap.sm),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: field(
                  'open',
                  TapField(label: l.bizOpens, value: _open, icon: Icons.schedule_rounded, error: _message(l, 'open'), onTap: () => _pickTime(opening: true)),
                ),
              ),
              const SizedBox(width: Gap.md),
              Expanded(
                child: field(
                  'close',
                  TapField(
                    label: l.bizCloses,
                    value: _close,
                    icon: Icons.schedule_rounded,
                    error: _message(l, 'close'),
                    onTap: () => _pickTime(opening: false),
                  ),
                ),
              ),
            ],
          ),
          gap,
          field(
            'description',
            TextField(
              controller: _description,
              minLines: 4,
              maxLines: 8,
              maxLength: BusinessDraft.descriptionMax,
              textCapitalization: TextCapitalization.sentences,
              onChanged: (_) => _clear('description'),
              buildCounter: (context, {required currentLength, required isFocused, required maxLength}) =>
                  Text(l.bizCounter('$currentLength', '$maxLength'), style: TextStyle(color: context.mutedText, fontSize: 12)),
              decoration: InputDecoration(
                labelText: l.bizDescription,
                hintText: l.bizDescriptionHint,
                alignLabelWithHint: true,
                helperText: _usedTemplate ? l.bizTemplateHint : null,
                errorText: _message(l, 'description'),
              ),
            ),
          ),
          Align(
            alignment: AlignmentDirectional.centerStart,
            child: TextButton.icon(onPressed: _useTemplate, icon: const Icon(Icons.auto_awesome_rounded), label: Text(l.bizTemplate)),
          ),
          const SizedBox(height: Gap.sm),
          Card(
            clipBehavior: Clip.antiAlias,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                ListTile(
                  title: Text(l.bizMore, style: const TextStyle(fontWeight: FontWeight.w700)),
                  trailing: Icon(_more ? Icons.expand_less_rounded : Icons.expand_more_rounded),
                  onTap: () => setState(() => _more = !_more),
                ),
                if (_more)
                  Padding(
                    padding: const EdgeInsets.fromLTRB(Gap.lg, 0, Gap.lg, Gap.lg),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        field(
                          'telegram',
                          TextField(
                            controller: _telegram,
                            autocorrect: false,
                            enableSuggestions: false,
                            textInputAction: TextInputAction.next,
                            onChanged: (_) => _clear('telegram'),
                            decoration: InputDecoration(labelText: 'Telegram', hintText: l.bizHandleHint, prefixText: '@', errorText: _message(l, 'telegram')),
                          ),
                        ),
                        if (telegramName != null && cleanHandle(_telegram.text) != telegramName)
                          Padding(
                            padding: const EdgeInsets.only(top: Gap.sm),
                            child: Align(
                              alignment: AlignmentDirectional.centerStart,
                              child: ActionChip(
                                avatar: const Icon(Icons.send_rounded, size: 18, color: Brand.telegram),
                                label: Text(l.bizMyTelegram(telegramName)),
                                onPressed: () => setState(() {
                                  _telegram.text = telegramName;
                                  _errors = {..._errors}..remove('telegram');
                                }),
                              ),
                            ),
                          ),
                        const SizedBox(height: Gap.md),
                        field(
                          'instagram',
                          TextField(
                            controller: _instagram,
                            autocorrect: false,
                            enableSuggestions: false,
                            textInputAction: TextInputAction.next,
                            onChanged: (_) => _clear('instagram'),
                            decoration: InputDecoration(
                              labelText: 'Instagram',
                              hintText: l.bizHandleHint,
                              prefixText: '@',
                              errorText: _message(l, 'instagram'),
                            ),
                          ),
                        ),
                        const SizedBox(height: Gap.md),
                        field(
                          'website',
                          TextField(
                            controller: _website,
                            autocorrect: false,
                            enableSuggestions: false,
                            keyboardType: TextInputType.url,
                            onChanged: (_) => _clear('website'),
                            decoration: InputDecoration(labelText: l.website, hintText: 'https://', errorText: _message(l, 'website')),
                          ),
                        ),
                      ],
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(height: Gap.xl),
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
          Text(l.bizConsent, style: TextStyle(color: context.mutedText, fontSize: 12.5, height: 1.4)),
          const SizedBox(height: Gap.md),
          FilledButton(
            onPressed: _sending ? null : _submit,
            child: _sending
                ? Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const SizedBox.square(dimension: 20, child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white)),
                      const SizedBox(width: Gap.md),
                      Text(l.bizSubmitting),
                    ],
                  )
                : Text(l.bizSubmit),
          ),
        ],
      ),
    );
  }
}

class _Created extends ConsumerWidget {
  const _Created({required this.created});
  final BusinessCreated created;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = L.of(context);
    final verified = created.verified;
    final color = verified ? context.successText : context.accentText;
    return ListView(
      padding: const EdgeInsets.fromLTRB(Gap.gutter, Gap.xl, Gap.gutter, Gap.xl),
      children: [
        Center(
          child: Container(
            width: 84,
            height: 84,
            decoration: BoxDecoration(color: color.withValues(alpha: 0.12), shape: BoxShape.circle),
            child: Icon(verified ? Icons.verified_rounded : Icons.hourglass_top_rounded, color: color, size: 44),
          ),
        ),
        const SizedBox(height: Gap.lg),
        Text(verified ? l.bizVerifiedTitle : l.bizSentTitle, textAlign: TextAlign.center, style: Theme.of(context).textTheme.headlineSmall),
        const SizedBox(height: Gap.sm),
        Text(
          verified ? l.bizVerifiedText : l.bizPendingText,
          textAlign: TextAlign.center,
          style: TextStyle(color: context.mutedText, height: 1.45),
        ),
        const SizedBox(height: Gap.xl),
        FilledButton.icon(onPressed: () => context.go('/profile'), icon: const Icon(Icons.storefront_rounded), label: Text(l.bizOpenProfile)),
        const SizedBox(height: Gap.sm),
        OutlinedButton.icon(
          onPressed: () => context.pushReplacement('/business/${created.id}/deals/new'),
          icon: const Icon(Icons.add_circle_outline_rounded, size: 20),
          label: Text(l.bizAddFirstDeal),
        ),
        const SizedBox(height: Gap.sm),
        TextButton(onPressed: () => context.go('/'), child: Text(l.navHome)),
      ],
    );
  }
}
