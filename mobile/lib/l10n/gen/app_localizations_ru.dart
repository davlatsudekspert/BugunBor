// ignore: unused_import
import 'package:intl/intl.dart' as intl;

import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Russian (`ru`).
class LRu extends L {
  LRu([String locale = 'ru']) : super(locale);

  @override
  String get appTitle => 'BugunBor';

  @override
  String get navHome => 'Главная';

  @override
  String get navSearch => 'Поиск';

  @override
  String get navSaved => 'Избранное';

  @override
  String get navCodes => 'Мои коды';

  @override
  String get navProfile => 'Профиль';

  @override
  String get retry => 'Повторить';

  @override
  String get errorGeneric => 'Что-то пошло не так. Попробуйте ещё раз.';

  @override
  String get errorNetwork => 'Нет связи с интернетом. Проверьте сеть и попробуйте снова.';

  @override
  String get errorServer => 'Ошибка сервера. Попробуйте чуть позже.';

  @override
  String get errorSessionExpired => 'Сессия истекла — войдите снова.';

  @override
  String get errorRateLimited => 'Слишком много попыток. Попробуйте чуть позже.';

  @override
  String get errorNotFound => 'Не найдено или больше недоступно.';

  @override
  String get cancel => 'Отмена';

  @override
  String get save => 'Сохранить';

  @override
  String get close => 'Закрыть';

  @override
  String get next => 'Далее';

  @override
  String get skip => 'Пропустить';

  @override
  String get ok => 'Понятно';

  @override
  String get yes => 'Да';

  @override
  String sum(String amount) {
    return '$amount сум';
  }

  @override
  String percentOff(String percent) {
    return '−$percent%';
  }

  @override
  String distanceKm(String distance) {
    return '$distance км';
  }

  @override
  String distanceM(String distance) {
    return '$distance м';
  }

  @override
  String endsIn(String time) {
    return 'До конца $time';
  }

  @override
  String daysShort(String days) {
    return '$days дн.';
  }

  @override
  String left(String count) {
    return 'Осталось: $count';
  }

  @override
  String get demoBadge => 'Пример';

  @override
  String get demoNotice =>
      'Это пример акции: он показывает, как работает приложение, такого бизнеса на самом деле нет. В настоящих акциях здесь будет кнопка «Забронировать».';

  @override
  String get demoCarouselTitle => 'Так будет выглядеть и ваш бизнес';

  @override
  String get demoCarouselText => 'Есть бизнес? Разместите акцию бесплатно — клиенты увидят её здесь.';

  @override
  String get addBusiness => 'Добавить бизнес';

  @override
  String get onbWelcomeTitle => 'Добро пожаловать в BugunBor';

  @override
  String get onbWelcomeText =>
      'Скидки кафе, магазинов, салонов и сервисов вашего города в одном месте. Выберите акцию, получите бесплатный код и покажите его на кассе — заплатите меньше.';

  @override
  String get onbStep1 => 'Найдите акцию';

  @override
  String get onbStep2 => 'Получите бесплатный код';

  @override
  String get onbStep3 => 'Покажите на кассе';

  @override
  String get onbLanguage => 'Выберите язык';

  @override
  String get onbInterestsTitle => 'Что вам нравится?';

  @override
  String get onbInterestsText => 'Выбранное будет первым на главной. Потом можно изменить в профиле.';

  @override
  String get onbLocationTitle => 'Показывать акции рядом?';

  @override
  String get onbLocationText => 'Местоположение используется только когда приложение открыто — чтобы сортировать акции по расстоянию. В фоне оно не берётся.';

  @override
  String get onbLocationAllow => 'Разрешить геолокацию';

  @override
  String get onbLocationCity => 'Выберу город сам';

  @override
  String get onbNotifyTitle => 'Узнавайте о новых акциях';

  @override
  String get onbNotifyText =>
      'Сообщим о новых акциях бизнесов, на которые вы подписаны, об окончании срока кода и об акциях рядом по вашим интересам. Не больше 3 в день и никогда ночью.';

  @override
  String get onbNotifyAllow => 'Включить уведомления';

  @override
  String get onbLater => 'Позже';

  @override
  String get onbStart => 'Начать';

  @override
  String get homeTitle => 'Что есть сегодня?';

  @override
  String get homeSearchHint => 'Плов, кофе, стрижка…';

  @override
  String get homeForYou => 'Для вас';

  @override
  String get homeForYouEmpty => 'Выберите интересы — подходящие акции появятся здесь.';

  @override
  String get homeChooseInterests => 'Выбрать интересы';

  @override
  String get homeNearby => 'Рядом со мной';

  @override
  String homeInCity(String city) {
    return '$city';
  }

  @override
  String get homeEnding => 'Скоро закончатся';

  @override
  String get homeAll => 'Все';

  @override
  String get homeEmptyTitle => 'Пока акций нет';

  @override
  String get homeEmptyText => 'Скоро появятся новые предложения. Попробуйте выбрать другой город.';

  @override
  String get homeUseLocation => 'По моему местоположению';

  @override
  String get homeLocationDenied => 'Доступ к геолокации не дан — показываем по городу.';

  @override
  String get chooseCity => 'Выберите город';

  @override
  String get searchHint => 'Найдите акцию или заведение';

  @override
  String get sortEnding => 'Скоро закончатся';

  @override
  String get sortDiscount => 'Большая скидка';

  @override
  String get sortNew => 'Новые';

  @override
  String get sortNear => 'Рядом';

  @override
  String get allCategories => 'Все';

  @override
  String get searchEmpty => 'Ничего не найдено. Попробуйте другое слово.';

  @override
  String get dealBook => 'Забронировать';

  @override
  String get dealLoginToBook => 'Войдите, чтобы забронировать';

  @override
  String get dealUnavailable => 'Сейчас забронировать нельзя';

  @override
  String get dealHaveCode => 'У вас есть активный код на эту акцию';

  @override
  String get dealViewCode => 'Смотреть код';

  @override
  String get dealLimitReached => 'Вы использовали лимит по этой акции';

  @override
  String get dealChooseBranch => 'Выберите филиал';

  @override
  String get dealBranches => 'Филиалы';

  @override
  String get dealTerms => 'Условия';

  @override
  String dealPerCustomer(String count) {
    return 'На одного клиента: $count';
  }

  @override
  String dealCodeValid(String minutes) {
    return 'Код действует $minutes мин. Оплата на месте.';
  }

  @override
  String get dealDirections => 'Маршрут';

  @override
  String get share => 'Поделиться';

  @override
  String get dealSave => 'Сохранить';

  @override
  String get dealSaved => 'Сохранено';

  @override
  String get report => 'Пожаловаться';

  @override
  String dealYouSave(String amount) {
    return 'Экономия $amount сум';
  }

  @override
  String get dealBooked => 'Акция забронирована!';

  @override
  String get follow => 'Подписаться';

  @override
  String get followingLabel => 'Вы подписаны';

  @override
  String get businessDeals => 'Акции';

  @override
  String get businessUpcoming => 'Скоро';

  @override
  String get businessReviews => 'Отзывы';

  @override
  String get businessNoDeals => 'Сейчас активных акций нет';

  @override
  String get block => 'Заблокировать';

  @override
  String get unblock => 'Разблокировать';

  @override
  String get blockAsk => 'Акции этого бизнеса перестанут показываться, подписка отменится. Продолжить?';

  @override
  String get blocked => 'Бизнес заблокирован';

  @override
  String get call => 'Позвонить';

  @override
  String get loginTitle => 'Вход';

  @override
  String get loginText => 'Войдите в BugunBor через Telegram — без пароля и SMS.';

  @override
  String get loginConsent => 'Принимаю политику конфиденциальности и условия использования';

  @override
  String get loginButton => 'Войти через Telegram';

  @override
  String get loginConsentHint => 'Чтобы войти, сначала отметьте согласие.';

  @override
  String get loginMatchCode => 'Код сверки';

  @override
  String get loginMatchHint => 'В боте Telegram вы увидите этот код — если совпадает, подтвердите.';

  @override
  String get loginOpenTelegram => 'Открыть Telegram';

  @override
  String get loginWaiting => 'Ждём подтверждения в Telegram…';

  @override
  String get loginExpired => 'Срок запроса истёк.';

  @override
  String get loginDenied => 'Запрос отклонён.';

  @override
  String get loginRestart => 'Начать заново';

  @override
  String get loginDone => 'Вы вошли!';

  @override
  String get loginReviewer => 'Код проверяющего';

  @override
  String get privacyPolicy => 'Политика конфиденциальности';

  @override
  String get terms => 'Условия использования';

  @override
  String get codesActive => 'Активные';

  @override
  String get codesHistory => 'История';

  @override
  String get codesEmpty => 'Активных кодов пока нет';

  @override
  String get codesEmptyText => 'Забронируйте акцию — код сохранится здесь.';

  @override
  String get historyEmpty => 'История пуста';

  @override
  String get codeShow => 'Покажите код кассиру';

  @override
  String codeValidUntil(String time) {
    return 'Действует до $time';
  }

  @override
  String get codeCancel => 'Отменить код';

  @override
  String get codeCancelAsk => 'Отменить код? Место вернётся другим.';

  @override
  String get statusClaimed => 'Активен';

  @override
  String get statusCompleted => 'Использован';

  @override
  String get statusExpired => 'Истёк';

  @override
  String get statusCanceled => 'Отменён';

  @override
  String get rateVisit => 'Оценить';

  @override
  String get rateTitle => 'Как прошёл визит?';

  @override
  String get rateComment => 'Ваш отзыв (необязательно)';

  @override
  String get rateThanks => 'Спасибо! Оценка принята.';

  @override
  String yourRating(String rating) {
    return 'Ваша оценка: $rating';
  }

  @override
  String get loginRequiredTitle => 'Нужен вход';

  @override
  String get loginRequiredText => 'Для этого раздела войдите через Telegram.';

  @override
  String get loginAction => 'Войти';

  @override
  String get savedDeals => 'Акции';

  @override
  String get savedBusinesses => 'Бизнесы';

  @override
  String get savedEmpty => 'Сохранённых акций нет';

  @override
  String get savedEmptyText => 'Нажмите ♡ на акции — она сохранится здесь.';

  @override
  String get followsEmpty => 'Подписок нет';

  @override
  String get followsEmptyText => 'Нажмите «Подписаться» на странице бизнеса — сообщим о его новых акциях.';

  @override
  String liveDeals(String count) {
    return 'Активных акций: $count';
  }

  @override
  String get endedDeals => 'Завершённые';

  @override
  String get profileGuestText => 'Войдите, чтобы видеть коды, избранное и уведомления.';

  @override
  String get profileSaved => 'Сэкономлено';

  @override
  String get profileRedeemed => 'Использовано кодов';

  @override
  String get profileName => 'Ваше имя';

  @override
  String get profileLanguage => 'Язык';

  @override
  String get profileCity => 'Город';

  @override
  String get profileTheme => 'Тема';

  @override
  String get themeSystem => 'Как в телефоне';

  @override
  String get themeLight => 'Светлая';

  @override
  String get themeDark => 'Тёмная';

  @override
  String get profileInterests => 'Интересы';

  @override
  String get profileNotifications => 'Уведомления';

  @override
  String get notifyDeals => 'Новые акции бизнесов, на которые вы подписаны';

  @override
  String get notifyReminders => 'Напоминание до окончания срока кода';

  @override
  String get notifyNearby => 'Новая акция рядом по моим интересам';

  @override
  String get notifyNearbyHint => 'Для этого сохраняется примерный район (≈1 км) на момент открытия приложения. При отключении он сразу удаляется.';

  @override
  String get notifyPermissionOff => 'Уведомления выключены в настройках телефона.';

  @override
  String get profileCashier => 'Проверка кода (касса)';

  @override
  String get profileBusiness => 'Кабинет бизнеса';

  @override
  String get profileContact => 'Связаться';

  @override
  String get profileLogout => 'Выйти';

  @override
  String get profileDelete => 'Удалить аккаунт';

  @override
  String get deleteAsk => 'Удалить аккаунт навсегда? Это нельзя отменить.';

  @override
  String get deleteSoleOwner =>
      'Вы единственный владелец бизнеса. Он исчезнет с сайта, акции остановятся, активные коды будут отменены. Закрыть бизнес и удалить аккаунт?';

  @override
  String get deleteCloseAndDelete => 'Закрыть бизнес и удалить';

  @override
  String get deleted => 'Аккаунт удалён';

  @override
  String appVersion(String version) {
    return 'Версия $version';
  }

  @override
  String get reportTitle => 'Жалоба';

  @override
  String get reportReason => 'Выберите причину';

  @override
  String get reportComment => 'Комментарий (необязательно)';

  @override
  String get reportSend => 'Отправить';

  @override
  String get reportThanks => 'Спасибо! Модератор рассмотрит.';

  @override
  String get reasonWrongInfo => 'Неверная информация';

  @override
  String get reasonScam => 'Мошенничество';

  @override
  String get reasonOffensive => 'Оскорбление или недопустимый контент';

  @override
  String get reasonProhibited => 'Запрещённый товар или услуга';

  @override
  String get reasonSpam => 'Спам';

  @override
  String get reasonOther => 'Другое';

  @override
  String get cashierTitle => 'Проверка кода';

  @override
  String get cashierChooseBusiness => 'Выберите бизнес';

  @override
  String get cashierScanHint => 'Наведите рамку на QR-код клиента';

  @override
  String get cashierManual => 'Введите код вручную';

  @override
  String get cashierCodeHint => 'Например, K7P 2QX';

  @override
  String get cashierCheck => 'Проверить';

  @override
  String get cashierValid => 'Код действителен';

  @override
  String get cashierCustomer => 'Клиент';

  @override
  String get cashierConfirm => 'Подтвердить — код использован';

  @override
  String get cashierDone => 'Код использован';

  @override
  String get cashierNext => 'Следующий клиент';

  @override
  String get cameraDenied => 'Нет доступа к камере — введите код вручную.';

  @override
  String get updateTitle => 'Обновите приложение';

  @override
  String get updateText => 'Эта версия больше не поддерживается. Обновите в Play Маркете.';

  @override
  String get updateAction => 'Обновить';

  @override
  String get offline => 'Нет интернета — показаны последние данные';

  @override
  String get open => 'Открыть';

  @override
  String get homeForYouNone => 'По вашим интересам пока нет акций.';

  @override
  String get homeChange => 'Изменить';

  @override
  String dealStartsAt(String time) {
    return 'Начало: $time';
  }

  @override
  String get dealSoldOut => 'Все места заняты';

  @override
  String get dealEnded => 'Акция завершилась';

  @override
  String get dealNotStarted => 'Акция ещё не началась';

  @override
  String get endsInLabel => 'До конца:';

  @override
  String get unblocked => 'Бизнес разблокирован';

  @override
  String followers(String count) {
    return 'Подписчиков: $count';
  }

  @override
  String get blockedNote => 'Вы заблокировали этот бизнес — его акции вам не показываются.';

  @override
  String get website => 'Сайт';

  @override
  String get codeOpenDeal => 'Открыть акцию';

  @override
  String get profileSettings => 'Настройки';

  @override
  String get notifyTurnOn => 'Включить';

  @override
  String get profileForBusiness => 'Для бизнеса';

  @override
  String get profileBusinessHint => 'Акции, филиалы и команда — на сайте';

  @override
  String get profileAbout => 'Информация';

  @override
  String get cashierBadCode => 'Неверный код. Проверьте 6 символов.';

  @override
  String get cashierNoBusiness => 'Проверять коды могут только сотрудники подтверждённого бизнеса.';

  @override
  String get homeSamplesNote => 'Здесь пока примеры акций: они показывают, как работает приложение. Настоящие акции появятся здесь, как только их добавят.';
}
