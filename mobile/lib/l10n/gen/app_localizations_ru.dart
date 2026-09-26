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

  @override
  String get bizJoinTitle => 'Добавьте свой бизнес в BugunBor';

  @override
  String get bizJoinText => 'Укажите основную информацию — после проверки сможете размещать акции.';

  @override
  String get bizJoinLogin => 'Чтобы добавить бизнес, войдите через Telegram — бизнес будет привязан к вашему аккаунту.';

  @override
  String get bizName => 'Название бизнеса';

  @override
  String get bizNameHint => 'Например, Oqtepa Lavash';

  @override
  String get bizCategory => 'Категория';

  @override
  String get bizCity => 'Город';

  @override
  String get bizPhone => 'Телефон';

  @override
  String get bizAddress => 'Адрес основного филиала';

  @override
  String get bizAddressHint => 'Например: Чиланзар 9-й квартал, дом 12';

  @override
  String get bizAddressNote => 'Добавьте ориентир — клиенту будет проще найти (например, «рядом с Korzinka»).';

  @override
  String get bizHours => 'Часы работы';

  @override
  String get bizOpens => 'Открытие';

  @override
  String get bizCloses => 'Закрытие';

  @override
  String get bizDescription => 'Краткое описание';

  @override
  String get bizDescriptionHint => 'Расскажите клиентам о своём бизнесе коротко и понятно…';

  @override
  String get bizTemplate => 'Пример текста';

  @override
  String get bizTemplateAsk => 'Заменить написанное описание примером?';

  @override
  String get bizTemplateHint => 'Измените пример под свой бизнес.';

  @override
  String bizTplFood(String name) {
    return '$name — национальная и европейская кухня. Каждый день свежие блюда и доброжелательное обслуживание. Ждём вас на обед и ужин.';
  }

  @override
  String bizTplCoffee(String name) {
    return '$name — кофе, чай и десерты. Уютное место для встреч с друзьями и отдыха.';
  }

  @override
  String bizTplShop(String name) {
    return '$name — качественные товары и доступные цены. Поможем с выбором, новинки поступают регулярно.';
  }

  @override
  String bizTplBeauty(String name) {
    return '$name — услуги красоты и ухода. Работают опытные мастера, используем качественные средства.';
  }

  @override
  String bizTplSport(String name) {
    return '$name — место для спорта и здорового образа жизни. Занятия для новичков и опытных спортсменов.';
  }

  @override
  String bizTplFun(String name) {
    return '$name — место, где весело провести время с друзьями и семьёй. Приглашаем отдохнуть.';
  }

  @override
  String bizTplServices(String name) {
    return '$name — быстро и качественно выполняем бытовые услуги. Цену называем заранее.';
  }

  @override
  String bizTplDelivery(String name) {
    return '$name — быстро и вовремя доставляем заказы. Заказать просто.';
  }

  @override
  String bizTplDefault(String name) {
    return '$name — качественные товары и доброжелательный сервис. Приходите к нам!';
  }

  @override
  String bizCounter(String count, String max) {
    return '$count / $max';
  }

  @override
  String get bizMore => 'Telegram, Instagram и сайт (необязательно)';

  @override
  String get bizHandleHint => 'имя пользователя (без @)';

  @override
  String bizMyTelegram(String username) {
    return 'Мой Telegram: @$username';
  }

  @override
  String get bizLocate => 'Определить моё местоположение';

  @override
  String get bizLocating => 'Определяем…';

  @override
  String bizLocated(String city) {
    return 'Местоположение определено: $city. Точка на карте сохранится.';
  }

  @override
  String get bizLocateFailed => 'Не удалось определить местоположение — выберите город из списка.';

  @override
  String get bizLocateNote => 'Нажмите, если вы сейчас на месте бизнеса — клиенты найдут вас на карте и в разделе «Рядом со мной».';

  @override
  String get bizSubmit => 'Отправить на проверку';

  @override
  String get bizSubmitting => 'Отправка…';

  @override
  String get bizConsent => 'Отправляя заявку, вы соглашаетесь на проверку данных. До подтверждения бизнес не публикуется.';

  @override
  String get bizFixErrors => 'Проверьте отмеченные поля.';

  @override
  String get bizLimit => 'С одного аккаунта можно добавить не больше 5 бизнесов.';

  @override
  String get bizSentTitle => 'Заявка отправлена';

  @override
  String get bizVerifiedTitle => 'Ваш бизнес подтверждён!';

  @override
  String get bizVerifiedText => 'Теперь разместите первую акцию — клиенты увидят её в приложении и на сайте.';

  @override
  String get bizPendingText =>
      'Модератор рассмотрит заявку (обычно в течение 24 часов). После подтверждения бизнес увидят все — акции можно подготовить уже сейчас.';

  @override
  String get bizOpenProfile => 'Перейти в профиль бизнеса';

  @override
  String get bizAddFirstDeal => 'Добавить первую акцию';

  @override
  String valTooShort(String min) {
    return 'Минимум символов: $min';
  }

  @override
  String valTooLong(String max) {
    return 'Максимум символов: $max';
  }

  @override
  String get valInvalid => 'Неверное значение';

  @override
  String get valPhone => 'Введите номер в формате +998 90 123 45 67';

  @override
  String get valTime => 'Выберите время';

  @override
  String get valChoose => 'Выберите вариант';

  @override
  String get bizProfileTitle => 'Профиль бизнеса';

  @override
  String get modeBusiness => 'Бизнес';

  @override
  String get modePersonal => 'Личный';

  @override
  String get bizStatusVerified => 'Подтверждён';

  @override
  String get bizStatusPending => 'На проверке';

  @override
  String get bizStatusRejected => 'Отклонён';

  @override
  String get bizStatusSuspended => 'Приостановлен';

  @override
  String get roleOwner => 'Владелец';

  @override
  String get roleManager => 'Менеджер';

  @override
  String get roleCashier => 'Кассир';

  @override
  String get bizPendingNote =>
      'Ваш бизнес проверяет модератор (обычно в течение 24 часов). После подтверждения акции станут видны — их можно подготовить уже сейчас.';

  @override
  String bizRejectedNote(String reason) {
    return 'Бизнес отклонён: $reason';
  }

  @override
  String get bizRejectedFix => 'Исправить на сайте и отправить снова';

  @override
  String get bizSuspendedNote => 'Бизнес временно приостановлен — его акции не показываются. Если есть вопросы, свяжитесь с нами.';

  @override
  String get bizQuick => 'Быстрые действия';

  @override
  String get bizAddDeal => 'Добавить акцию';

  @override
  String get bizViewPage => 'Страница бизнеса';

  @override
  String get bizAddAnother => 'Добавить ещё бизнес';

  @override
  String get bizStats => 'Статистика';

  @override
  String get statLive => 'Активные акции';

  @override
  String get statClaimsToday => 'Забронировано сегодня';

  @override
  String get statRedeemedToday => 'Использовано сегодня';

  @override
  String get statViews => 'Просмотры';

  @override
  String get statFollowers => 'Подписчики';

  @override
  String get statRating => 'Рейтинг';

  @override
  String get bizSetupTitle => 'Заполните профиль';

  @override
  String bizSetupProgress(String done, String total) {
    return 'Выполнено $done из $total';
  }

  @override
  String get bizSetupHint => 'Полный профиль вызывает больше доверия — ваши акции увидят чаще.';

  @override
  String get setupLogo => 'Загрузите логотип';

  @override
  String get setupCover => 'Загрузите обложку';

  @override
  String get setupDescription => 'Опишите бизнес подробнее (не меньше 80 символов)';

  @override
  String get setupContacts => 'Добавьте Telegram или Instagram';

  @override
  String get setupLocation => 'Отметьте филиал на карте';

  @override
  String get setupDeal => 'Разместите первую акцию';

  @override
  String get bizRecent => 'Последние коды';

  @override
  String get bizRecentEmpty => 'Кодов пока нет.';

  @override
  String get bizCashierOnly => 'Вы кассир этого бизнеса: проверяете коды клиентов.';

  @override
  String get promoTitle => 'Есть бизнес? Продавайте больше';

  @override
  String get promoText => 'Добавьте его в BugunBor — вашу акцию увидят покупатели поблизости и придут к вам с кодом.';

  @override
  String get promoPoint1 => 'Покупатели рядом найдут вас';

  @override
  String get promoPoint2 => 'Подписчики узнают о ваших новых акциях';

  @override
  String get promoPoint3 => 'Результат виден: брони и использованные коды';

  @override
  String get promoPoint4 => 'Регистрация бесплатная — пара минут';

  @override
  String get promoAction => 'Добавить мой бизнес';

  @override
  String get promoHide => 'Скрыть';

  @override
  String get bizDiscardAsk => 'Введённые данные не сохранятся. Выйти?';

  @override
  String get bizDiscard => 'Выйти';

  @override
  String get bizJoinSoon => 'Добавление бизнеса в приложении заработает после обновления сервера. Пока его можно добавить на сайте.';

  @override
  String get bizOnSite => 'Добавить на сайте';

  @override
  String get dealsTitle => 'Акции';

  @override
  String get dealsNew => 'Новая акция';

  @override
  String get dealsFilterAll => 'Все';

  @override
  String get dealsFilterLive => 'Активные';

  @override
  String get dealsFilterReview => 'На проверке';

  @override
  String get dealsFilterDraft => 'Черновики';

  @override
  String get dealsFilterEnded => 'Завершённые';

  @override
  String get dealsEmpty => 'В этом разделе акций нет.';

  @override
  String get dealsEmptyTitle => 'Акций пока нет';

  @override
  String get dealsEmptyText => 'Добавьте первую акцию — покупатели поблизости сразу её увидят.';

  @override
  String dealsStock(String left, String total) {
    return 'Остаток: $left из $total';
  }

  @override
  String get dealsUnlimited => 'Без ограничения количества';

  @override
  String dealsClaims(String count) {
    return 'Брони: $count';
  }

  @override
  String dealsRedeemed(String count) {
    return 'Использовано: $count';
  }

  @override
  String dealsViews(String count) {
    return 'Просмотры: $count';
  }

  @override
  String dealsRejected(String reason) {
    return 'Причина отклонения: $reason';
  }

  @override
  String get dealActEdit => 'Изменить';

  @override
  String get dealActSubmit => 'Отправить на проверку';

  @override
  String get dealActWithdraw => 'Отозвать';

  @override
  String get dealActPause => 'Пауза';

  @override
  String get dealActResume => 'Возобновить';

  @override
  String get dealActEnd => 'Завершить';

  @override
  String get dealActDuplicate => 'Копировать';

  @override
  String get dealActDelete => 'Удалить';

  @override
  String get dealActView => 'Открыть как у клиентов';

  @override
  String get dealConfirmEnd => 'Завершить акцию? Это необратимо, выданные коды продолжат действовать.';

  @override
  String get dealConfirmDelete => 'Удалить черновик?';

  @override
  String get dealLocked => 'Условия одобренной акции менять нельзя. Чтобы изменить, создайте копию.';

  @override
  String get dealStLive => 'Активна';

  @override
  String get dealStScheduled => 'Скоро';

  @override
  String get dealStSoldOut => 'Закончилась';

  @override
  String get dealStExpired => 'Срок истёк';

  @override
  String get dealStPaused => 'На паузе';

  @override
  String get dealStDraft => 'Черновик';

  @override
  String get dealStReview => 'На проверке';

  @override
  String get dealStRejected => 'Отклонена';

  @override
  String get dealStArchived => 'Завершена';

  @override
  String get dealSavedLive => 'Акция опубликована — клиенты уже её видят!';

  @override
  String get dealSavedReview => 'Акция отправлена на проверку. Появится после подтверждения.';

  @override
  String get dealSavedDraft => 'Черновик сохранён.';

  @override
  String get dealDonePause => 'Акция на паузе.';

  @override
  String get dealDoneResume => 'Акция возобновлена.';

  @override
  String get dealDoneEnd => 'Акция завершена.';

  @override
  String get dealDoneDuplicate => 'Копия добавлена в черновики.';

  @override
  String get dealDoneDelete => 'Черновик удалён.';

  @override
  String get dealDoneWithdraw => 'Акция отозвана с проверки.';

  @override
  String get dealNewTitle => 'Новая акция';

  @override
  String get dealEditTitle => 'Редактирование акции';

  @override
  String get dealTitleLabel => 'Название акции';

  @override
  String get dealTitleHint => 'Например, Лагман и салат';

  @override
  String get dealDescriptionLabel => 'Описание';

  @override
  String get dealDescriptionHint => 'Что получит клиент? Пишите конкретно.';

  @override
  String get dealTermsHint => 'Например: только в зале. Не суммируется с другими скидками.';

  @override
  String get dealPhoto => 'Фото акции';

  @override
  String get dealPhotoHint => 'Настоящее фото вашего товара или услуги, снятое вами. Без фото покажем красивую иконку.';

  @override
  String get dealPhotoAdd => 'Добавить фото';

  @override
  String get dealPhotoChange => 'Заменить';

  @override
  String get dealPhotoRemove => 'Убрать';

  @override
  String get dealPhotoCamera => 'Камера';

  @override
  String get dealPhotoGallery => 'Галерея';

  @override
  String get dealPhotoUploading => 'Загрузка…';

  @override
  String get dealPhotoUnsupported => 'Не удалось прочитать это изображение. Выберите JPG или PNG.';

  @override
  String get dealVisualLabel => 'Иконка';

  @override
  String get dealVisualHint => 'Без фото будет показана эта иконка.';

  @override
  String get dealOriginalPrice => 'Обычная цена, сум';

  @override
  String get dealPriceLabel => 'Цена по акции, сум';

  @override
  String dealDiscountPreview(String percent) {
    return 'Скидка: $percent%';
  }

  @override
  String get dealStarts => 'Начало';

  @override
  String get dealEnds => 'Окончание';

  @override
  String get dealTimeHint => 'По времени Ташкента';

  @override
  String get dealQuick2h => '2 часа';

  @override
  String get dealQuick4h => '4 часа';

  @override
  String get dealQuickToday => 'До конца дня';

  @override
  String get dealQuick1d => '1 день';

  @override
  String get dealQuick3d => '3 дня';

  @override
  String get dealQuick7d => '7 дней';

  @override
  String get dealQuantity => 'Количество';

  @override
  String get dealUnlimited => 'Без ограничений';

  @override
  String get dealPerCustomerLabel => 'На одного клиента';

  @override
  String get dealTtl => 'Срок действия кода';

  @override
  String get dealTtl30 => '30 минут';

  @override
  String get dealTtl60 => '1 час';

  @override
  String get dealTtl120 => '2 часа';

  @override
  String get dealTtl240 => '4 часа';

  @override
  String get dealWhere => 'В каких филиалах';

  @override
  String get dealNoBranches => 'Нет филиалов — сначала добавьте филиал в кабинете на сайте.';

  @override
  String dealRulesNote(String min) {
    return 'Правила: скидка от $min%, длительность от 30 минут до 30 дней.';
  }

  @override
  String get dealPreview => 'Так увидят клиенты';

  @override
  String get dealSaveDraft => 'Сохранить черновик';

  @override
  String get dealSaving => 'Сохранение…';

  @override
  String get dealAutoNote => 'После отправки акция проверяется автоматически — обычно появляется за несколько секунд.';

  @override
  String get dealNeedsUpdate => 'Добавление акций в приложении заработает после обновления сервера. Пока добавьте акцию на сайте.';

  @override
  String get valPriceOrder => 'Цена по акции должна быть ниже обычной';

  @override
  String valMinDiscount(String min) {
    return 'Скидка должна быть не меньше $min%';
  }

  @override
  String get valEndAfterStart => 'Окончание должно быть позже начала';

  @override
  String get valDuration => 'Акция может длиться от 30 минут до 30 дней';

  @override
  String get valEndInPast => 'Время окончания уже прошло';

  @override
  String get valBranches => 'Выберите хотя бы один филиал';

  @override
  String valMinAmount(String amount) {
    return 'Минимум $amount сум';
  }

  @override
  String get bizDeals => 'Акции';

  @override
  String get bizSiteHint => 'Филиалы, команда и фото профиля — в кабинете на сайте';

  @override
  String get dealPhotoCameraDenied => 'Нет доступа к камере — выберите фото из галереи или разрешите камеру в настройках телефона.';

  @override
  String get dealWhen => 'Когда';
}
