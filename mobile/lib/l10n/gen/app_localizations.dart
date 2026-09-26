import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/intl.dart' as intl;

import 'app_localizations_en.dart';
import 'app_localizations_ru.dart';
import 'app_localizations_uz.dart';

// ignore_for_file: type=lint

/// Callers can lookup localized strings with an instance of L
/// returned by `L.of(context)`.
///
/// Applications need to include `L.delegate()` in their app's
/// `localizationDelegates` list, and the locales they support in the app's
/// `supportedLocales` list. For example:
///
/// ```dart
/// import 'gen/app_localizations.dart';
///
/// return MaterialApp(
///   localizationsDelegates: L.localizationsDelegates,
///   supportedLocales: L.supportedLocales,
///   home: MyApplicationHome(),
/// );
/// ```
///
/// ## Update pubspec.yaml
///
/// Please make sure to update your pubspec.yaml to include the following
/// packages:
///
/// ```yaml
/// dependencies:
///   # Internationalization support.
///   flutter_localizations:
///     sdk: flutter
///   intl: any # Use the pinned version from flutter_localizations
///
///   # Rest of dependencies
/// ```
///
/// ## iOS Applications
///
/// iOS applications define key application metadata, including supported
/// locales, in an Info.plist file that is built into the application bundle.
/// To configure the locales supported by your app, you’ll need to edit this
/// file.
///
/// First, open your project’s ios/Runner.xcworkspace Xcode workspace file.
/// Then, in the Project Navigator, open the Info.plist file under the Runner
/// project’s Runner folder.
///
/// Next, select the Information Property List item, select Add Item from the
/// Editor menu, then select Localizations from the pop-up menu.
///
/// Select and expand the newly-created Localizations item then, for each
/// locale your application supports, add a new item and select the locale
/// you wish to add from the pop-up menu in the Value field. This list should
/// be consistent with the languages listed in the L.supportedLocales
/// property.
abstract class L {
  L(String locale) : localeName = intl.Intl.canonicalizedLocale(locale.toString());

  final String localeName;

  static L of(BuildContext context) {
    return Localizations.of<L>(context, L)!;
  }

  static const LocalizationsDelegate<L> delegate = _LDelegate();

  /// A list of this localizations delegate along with the default localizations
  /// delegates.
  ///
  /// Returns a list of localizations delegates containing this delegate along with
  /// GlobalMaterialLocalizations.delegate, GlobalCupertinoLocalizations.delegate,
  /// and GlobalWidgetsLocalizations.delegate.
  ///
  /// Additional delegates can be added by appending to this list in
  /// MaterialApp. This list does not have to be used at all if a custom list
  /// of delegates is preferred or required.
  static const List<LocalizationsDelegate<dynamic>> localizationsDelegates = <LocalizationsDelegate<dynamic>>[
    delegate,
    GlobalMaterialLocalizations.delegate,
    GlobalCupertinoLocalizations.delegate,
    GlobalWidgetsLocalizations.delegate,
  ];

  /// A list of this localizations delegate's supported locales.
  static const List<Locale> supportedLocales = <Locale>[Locale('en'), Locale('ru'), Locale('uz')];

  /// No description provided for @appTitle.
  ///
  /// In uz, this message translates to:
  /// **'BugunBor'**
  String get appTitle;

  /// No description provided for @navHome.
  ///
  /// In uz, this message translates to:
  /// **'Asosiy'**
  String get navHome;

  /// No description provided for @navSearch.
  ///
  /// In uz, this message translates to:
  /// **'Qidiruv'**
  String get navSearch;

  /// No description provided for @navSaved.
  ///
  /// In uz, this message translates to:
  /// **'Saqlangan'**
  String get navSaved;

  /// No description provided for @navCodes.
  ///
  /// In uz, this message translates to:
  /// **'Kodlarim'**
  String get navCodes;

  /// No description provided for @navProfile.
  ///
  /// In uz, this message translates to:
  /// **'Profil'**
  String get navProfile;

  /// No description provided for @retry.
  ///
  /// In uz, this message translates to:
  /// **'Qayta urinish'**
  String get retry;

  /// No description provided for @errorGeneric.
  ///
  /// In uz, this message translates to:
  /// **'Nimadir xato ketdi. Qayta urinib ko‘ring.'**
  String get errorGeneric;

  /// No description provided for @errorNetwork.
  ///
  /// In uz, this message translates to:
  /// **'Internet bilan aloqa yo‘q. Tarmoqni tekshirib, qayta urinib ko‘ring.'**
  String get errorNetwork;

  /// No description provided for @errorServer.
  ///
  /// In uz, this message translates to:
  /// **'Serverda xatolik. Birozdan keyin qayta urinib ko‘ring.'**
  String get errorServer;

  /// No description provided for @errorSessionExpired.
  ///
  /// In uz, this message translates to:
  /// **'Sessiya tugadi — qaytadan kiring.'**
  String get errorSessionExpired;

  /// No description provided for @errorRateLimited.
  ///
  /// In uz, this message translates to:
  /// **'Juda ko‘p urinish. Birozdan keyin qayta urinib ko‘ring.'**
  String get errorRateLimited;

  /// No description provided for @errorNotFound.
  ///
  /// In uz, this message translates to:
  /// **'Topilmadi yoki endi mavjud emas.'**
  String get errorNotFound;

  /// No description provided for @cancel.
  ///
  /// In uz, this message translates to:
  /// **'Bekor qilish'**
  String get cancel;

  /// No description provided for @save.
  ///
  /// In uz, this message translates to:
  /// **'Saqlash'**
  String get save;

  /// No description provided for @close.
  ///
  /// In uz, this message translates to:
  /// **'Yopish'**
  String get close;

  /// No description provided for @next.
  ///
  /// In uz, this message translates to:
  /// **'Keyingi'**
  String get next;

  /// No description provided for @skip.
  ///
  /// In uz, this message translates to:
  /// **'O‘tkazib yuborish'**
  String get skip;

  /// No description provided for @ok.
  ///
  /// In uz, this message translates to:
  /// **'Tushunarli'**
  String get ok;

  /// No description provided for @yes.
  ///
  /// In uz, this message translates to:
  /// **'Ha'**
  String get yes;

  /// No description provided for @sum.
  ///
  /// In uz, this message translates to:
  /// **'{amount} so‘m'**
  String sum(String amount);

  /// No description provided for @percentOff.
  ///
  /// In uz, this message translates to:
  /// **'−{percent}%'**
  String percentOff(String percent);

  /// No description provided for @distanceKm.
  ///
  /// In uz, this message translates to:
  /// **'{distance} km'**
  String distanceKm(String distance);

  /// No description provided for @distanceM.
  ///
  /// In uz, this message translates to:
  /// **'{distance} m'**
  String distanceM(String distance);

  /// No description provided for @endsIn.
  ///
  /// In uz, this message translates to:
  /// **'Tugashiga {time}'**
  String endsIn(String time);

  /// No description provided for @daysShort.
  ///
  /// In uz, this message translates to:
  /// **'{days} kun'**
  String daysShort(String days);

  /// No description provided for @left.
  ///
  /// In uz, this message translates to:
  /// **'{count} ta qoldi'**
  String left(String count);

  /// No description provided for @demoBadge.
  ///
  /// In uz, this message translates to:
  /// **'Namuna'**
  String get demoBadge;

  /// No description provided for @demoNotice.
  ///
  /// In uz, this message translates to:
  /// **'Bu namuna aksiya: u ilova qanday ishlashini ko‘rsatadi, bunday biznes aslida yo‘q. Haqiqiy aksiyalarda shu yerda «Band qilish» tugmasi bo‘ladi.'**
  String get demoNotice;

  /// No description provided for @demoCarouselTitle.
  ///
  /// In uz, this message translates to:
  /// **'Biznesingiz ham shunday ko‘rinadi'**
  String get demoCarouselTitle;

  /// No description provided for @demoCarouselText.
  ///
  /// In uz, this message translates to:
  /// **'Biznesingiz bormi? Aksiyangizni bepul joylang — mijozlar uni shu yerda ko‘radi.'**
  String get demoCarouselText;

  /// No description provided for @addBusiness.
  ///
  /// In uz, this message translates to:
  /// **'Biznes qo‘shish'**
  String get addBusiness;

  /// No description provided for @onbWelcomeTitle.
  ///
  /// In uz, this message translates to:
  /// **'BugunBor’ga xush kelibsiz'**
  String get onbWelcomeTitle;

  /// No description provided for @onbWelcomeText.
  ///
  /// In uz, this message translates to:
  /// **'Shahringizdagi kafe, do‘kon, salon va xizmatlarning chegirmalari bir joyda. Aksiyani tanlang, bepul kod oling va kassada ko‘rsatib, arzonroq to‘lang.'**
  String get onbWelcomeText;

  /// No description provided for @onbStep1.
  ///
  /// In uz, this message translates to:
  /// **'Aksiyani toping'**
  String get onbStep1;

  /// No description provided for @onbStep2.
  ///
  /// In uz, this message translates to:
  /// **'Bepul kod oling'**
  String get onbStep2;

  /// No description provided for @onbStep3.
  ///
  /// In uz, this message translates to:
  /// **'Kassada ko‘rsating'**
  String get onbStep3;

  /// No description provided for @onbLanguage.
  ///
  /// In uz, this message translates to:
  /// **'Tilni tanlang'**
  String get onbLanguage;

  /// No description provided for @onbInterestsTitle.
  ///
  /// In uz, this message translates to:
  /// **'Sizga nima yoqadi?'**
  String get onbInterestsTitle;

  /// No description provided for @onbInterestsText.
  ///
  /// In uz, this message translates to:
  /// **'Tanlaganlaringiz «Asosiy» bo‘limida birinchi chiqadi. Keyin Profilda o‘zgartirishingiz mumkin.'**
  String get onbInterestsText;

  /// No description provided for @onbLocationTitle.
  ///
  /// In uz, this message translates to:
  /// **'Yaqin aksiyalarni ko‘rsataylikmi?'**
  String get onbLocationTitle;

  /// No description provided for @onbLocationText.
  ///
  /// In uz, this message translates to:
  /// **'Joylashuvingiz faqat ilova ochiq turganda, aksiyalarni masofa bo‘yicha saralash uchun ishlatiladi. Fonda olinmaydi.'**
  String get onbLocationText;

  /// No description provided for @onbLocationAllow.
  ///
  /// In uz, this message translates to:
  /// **'Joylashuvga ruxsat berish'**
  String get onbLocationAllow;

  /// No description provided for @onbLocationCity.
  ///
  /// In uz, this message translates to:
  /// **'Shaharni o‘zim tanlayman'**
  String get onbLocationCity;

  /// No description provided for @onbNotifyTitle.
  ///
  /// In uz, this message translates to:
  /// **'Yangi aksiyalardan xabardor bo‘ling'**
  String get onbNotifyTitle;

  /// No description provided for @onbNotifyText.
  ///
  /// In uz, this message translates to:
  /// **'Obuna bo‘lgan bizneslarning yangi aksiyalari, kod muddati tugashi va yaqin atrofdagi qiziqishingizga mos aksiyalar haqida xabar beramiz. Kuniga ko‘pi bilan 3 ta, kechasi — hech qachon.'**
  String get onbNotifyText;

  /// No description provided for @onbNotifyAllow.
  ///
  /// In uz, this message translates to:
  /// **'Xabarnomalarni yoqish'**
  String get onbNotifyAllow;

  /// No description provided for @onbLater.
  ///
  /// In uz, this message translates to:
  /// **'Keyinroq'**
  String get onbLater;

  /// No description provided for @onbStart.
  ///
  /// In uz, this message translates to:
  /// **'Boshlash'**
  String get onbStart;

  /// No description provided for @homeTitle.
  ///
  /// In uz, this message translates to:
  /// **'Bugun nima bor?'**
  String get homeTitle;

  /// No description provided for @homeSearchHint.
  ///
  /// In uz, this message translates to:
  /// **'Osh, kofe, soch turmagi…'**
  String get homeSearchHint;

  /// No description provided for @homeForYou.
  ///
  /// In uz, this message translates to:
  /// **'Siz uchun'**
  String get homeForYou;

  /// No description provided for @homeForYouEmpty.
  ///
  /// In uz, this message translates to:
  /// **'Qiziqishlaringizni tanlang — mos aksiyalar shu yerda chiqadi.'**
  String get homeForYouEmpty;

  /// No description provided for @homeChooseInterests.
  ///
  /// In uz, this message translates to:
  /// **'Qiziqishlarni tanlash'**
  String get homeChooseInterests;

  /// No description provided for @homeNearby.
  ///
  /// In uz, this message translates to:
  /// **'Yaqinimda'**
  String get homeNearby;

  /// No description provided for @homeInCity.
  ///
  /// In uz, this message translates to:
  /// **'{city} bo‘yicha'**
  String homeInCity(String city);

  /// No description provided for @homeEnding.
  ///
  /// In uz, this message translates to:
  /// **'Tez tugaydi'**
  String get homeEnding;

  /// No description provided for @homeAll.
  ///
  /// In uz, this message translates to:
  /// **'Barchasi'**
  String get homeAll;

  /// No description provided for @homeEmptyTitle.
  ///
  /// In uz, this message translates to:
  /// **'Hozircha aksiya yo‘q'**
  String get homeEmptyTitle;

  /// No description provided for @homeEmptyText.
  ///
  /// In uz, this message translates to:
  /// **'Tez orada yangi takliflar paydo bo‘ladi. Boshqa shaharni tanlab ko‘ring.'**
  String get homeEmptyText;

  /// No description provided for @homeUseLocation.
  ///
  /// In uz, this message translates to:
  /// **'Joylashuvim bo‘yicha'**
  String get homeUseLocation;

  /// No description provided for @homeLocationDenied.
  ///
  /// In uz, this message translates to:
  /// **'Joylashuvga ruxsat berilmadi — shahar bo‘yicha ko‘rsatyapmiz.'**
  String get homeLocationDenied;

  /// No description provided for @chooseCity.
  ///
  /// In uz, this message translates to:
  /// **'Shaharni tanlang'**
  String get chooseCity;

  /// No description provided for @searchHint.
  ///
  /// In uz, this message translates to:
  /// **'Aksiya yoki biznes qidiring'**
  String get searchHint;

  /// No description provided for @sortEnding.
  ///
  /// In uz, this message translates to:
  /// **'Tez tugaydi'**
  String get sortEnding;

  /// No description provided for @sortDiscount.
  ///
  /// In uz, this message translates to:
  /// **'Katta chegirma'**
  String get sortDiscount;

  /// No description provided for @sortNew.
  ///
  /// In uz, this message translates to:
  /// **'Yangi'**
  String get sortNew;

  /// No description provided for @sortNear.
  ///
  /// In uz, this message translates to:
  /// **'Yaqin'**
  String get sortNear;

  /// No description provided for @allCategories.
  ///
  /// In uz, this message translates to:
  /// **'Hammasi'**
  String get allCategories;

  /// No description provided for @searchEmpty.
  ///
  /// In uz, this message translates to:
  /// **'Hech narsa topilmadi. Boshqa so‘z bilan qidirib ko‘ring.'**
  String get searchEmpty;

  /// No description provided for @dealBook.
  ///
  /// In uz, this message translates to:
  /// **'Band qilish'**
  String get dealBook;

  /// No description provided for @dealLoginToBook.
  ///
  /// In uz, this message translates to:
  /// **'Band qilish uchun kiring'**
  String get dealLoginToBook;

  /// No description provided for @dealUnavailable.
  ///
  /// In uz, this message translates to:
  /// **'Hozir band qilib bo‘lmaydi'**
  String get dealUnavailable;

  /// No description provided for @dealHaveCode.
  ///
  /// In uz, this message translates to:
  /// **'Sizda bu aksiya uchun faol kod bor'**
  String get dealHaveCode;

  /// No description provided for @dealViewCode.
  ///
  /// In uz, this message translates to:
  /// **'Kodni ko‘rish'**
  String get dealViewCode;

  /// No description provided for @dealLimitReached.
  ///
  /// In uz, this message translates to:
  /// **'Bu aksiyadan foydalanish chegarasiga yetdingiz'**
  String get dealLimitReached;

  /// No description provided for @dealChooseBranch.
  ///
  /// In uz, this message translates to:
  /// **'Filialni tanlang'**
  String get dealChooseBranch;

  /// No description provided for @dealBranches.
  ///
  /// In uz, this message translates to:
  /// **'Filiallar'**
  String get dealBranches;

  /// No description provided for @dealTerms.
  ///
  /// In uz, this message translates to:
  /// **'Shartlar'**
  String get dealTerms;

  /// No description provided for @dealPerCustomer.
  ///
  /// In uz, this message translates to:
  /// **'Bir mijozga: {count} ta'**
  String dealPerCustomer(String count);

  /// No description provided for @dealCodeValid.
  ///
  /// In uz, this message translates to:
  /// **'Kod {minutes} daqiqa amal qiladi. To‘lov joyida.'**
  String dealCodeValid(String minutes);

  /// No description provided for @dealDirections.
  ///
  /// In uz, this message translates to:
  /// **'Yo‘l ko‘rsatish'**
  String get dealDirections;

  /// No description provided for @share.
  ///
  /// In uz, this message translates to:
  /// **'Ulashish'**
  String get share;

  /// No description provided for @dealSave.
  ///
  /// In uz, this message translates to:
  /// **'Saqlash'**
  String get dealSave;

  /// No description provided for @dealSaved.
  ///
  /// In uz, this message translates to:
  /// **'Saqlangan'**
  String get dealSaved;

  /// No description provided for @report.
  ///
  /// In uz, this message translates to:
  /// **'Shikoyat qilish'**
  String get report;

  /// No description provided for @dealYouSave.
  ///
  /// In uz, this message translates to:
  /// **'{amount} so‘m tejaysiz'**
  String dealYouSave(String amount);

  /// No description provided for @dealBooked.
  ///
  /// In uz, this message translates to:
  /// **'Aksiya band qilindi!'**
  String get dealBooked;

  /// No description provided for @follow.
  ///
  /// In uz, this message translates to:
  /// **'Obuna bo‘lish'**
  String get follow;

  /// No description provided for @followingLabel.
  ///
  /// In uz, this message translates to:
  /// **'Obuna bo‘lingan'**
  String get followingLabel;

  /// No description provided for @businessDeals.
  ///
  /// In uz, this message translates to:
  /// **'Aksiyalar'**
  String get businessDeals;

  /// No description provided for @businessUpcoming.
  ///
  /// In uz, this message translates to:
  /// **'Tez orada'**
  String get businessUpcoming;

  /// No description provided for @businessReviews.
  ///
  /// In uz, this message translates to:
  /// **'Sharhlar'**
  String get businessReviews;

  /// No description provided for @businessNoDeals.
  ///
  /// In uz, this message translates to:
  /// **'Hozir faol aksiya yo‘q'**
  String get businessNoDeals;

  /// No description provided for @block.
  ///
  /// In uz, this message translates to:
  /// **'Bloklash'**
  String get block;

  /// No description provided for @unblock.
  ///
  /// In uz, this message translates to:
  /// **'Blokdan chiqarish'**
  String get unblock;

  /// No description provided for @blockAsk.
  ///
  /// In uz, this message translates to:
  /// **'Bu biznesning aksiyalari sizga ko‘rsatilmaydi va obuna bekor bo‘ladi. Davom etasizmi?'**
  String get blockAsk;

  /// No description provided for @blocked.
  ///
  /// In uz, this message translates to:
  /// **'Biznes bloklandi'**
  String get blocked;

  /// No description provided for @call.
  ///
  /// In uz, this message translates to:
  /// **'Qo‘ng‘iroq qilish'**
  String get call;

  /// No description provided for @loginTitle.
  ///
  /// In uz, this message translates to:
  /// **'Kirish'**
  String get loginTitle;

  /// No description provided for @loginText.
  ///
  /// In uz, this message translates to:
  /// **'BugunBor’ga Telegram orqali kiring — parol va SMS kerak emas.'**
  String get loginText;

  /// No description provided for @loginConsent.
  ///
  /// In uz, this message translates to:
  /// **'Maxfiylik siyosati va foydalanish shartlariga roziman'**
  String get loginConsent;

  /// No description provided for @loginButton.
  ///
  /// In uz, this message translates to:
  /// **'Telegram orqali kirish'**
  String get loginButton;

  /// No description provided for @loginConsentHint.
  ///
  /// In uz, this message translates to:
  /// **'Kirish uchun avval rozilik belgisini qo‘ying.'**
  String get loginConsentHint;

  /// No description provided for @loginMatchCode.
  ///
  /// In uz, this message translates to:
  /// **'Moslik kodi'**
  String get loginMatchCode;

  /// No description provided for @loginMatchHint.
  ///
  /// In uz, this message translates to:
  /// **'Telegram’dagi botda shu kodni ko‘rasiz — bir xil bo‘lsa, tasdiqlang.'**
  String get loginMatchHint;

  /// No description provided for @loginOpenTelegram.
  ///
  /// In uz, this message translates to:
  /// **'Telegram’ni ochish'**
  String get loginOpenTelegram;

  /// No description provided for @loginWaiting.
  ///
  /// In uz, this message translates to:
  /// **'Telegram’dagi tasdiqni kutyapmiz…'**
  String get loginWaiting;

  /// No description provided for @loginExpired.
  ///
  /// In uz, this message translates to:
  /// **'So‘rov muddati tugadi.'**
  String get loginExpired;

  /// No description provided for @loginDenied.
  ///
  /// In uz, this message translates to:
  /// **'So‘rov rad etildi.'**
  String get loginDenied;

  /// No description provided for @loginRestart.
  ///
  /// In uz, this message translates to:
  /// **'Qaytadan boshlash'**
  String get loginRestart;

  /// No description provided for @loginDone.
  ///
  /// In uz, this message translates to:
  /// **'Kirdingiz!'**
  String get loginDone;

  /// No description provided for @loginReviewer.
  ///
  /// In uz, this message translates to:
  /// **'Tekshiruvchi kodi'**
  String get loginReviewer;

  /// No description provided for @privacyPolicy.
  ///
  /// In uz, this message translates to:
  /// **'Maxfiylik siyosati'**
  String get privacyPolicy;

  /// No description provided for @terms.
  ///
  /// In uz, this message translates to:
  /// **'Foydalanish shartlari'**
  String get terms;

  /// No description provided for @codesActive.
  ///
  /// In uz, this message translates to:
  /// **'Faol'**
  String get codesActive;

  /// No description provided for @codesHistory.
  ///
  /// In uz, this message translates to:
  /// **'Tarix'**
  String get codesHistory;

  /// No description provided for @codesEmpty.
  ///
  /// In uz, this message translates to:
  /// **'Hali faol kod yo‘q'**
  String get codesEmpty;

  /// No description provided for @codesEmptyText.
  ///
  /// In uz, this message translates to:
  /// **'Aksiyani band qiling — kod shu yerda saqlanadi.'**
  String get codesEmptyText;

  /// No description provided for @historyEmpty.
  ///
  /// In uz, this message translates to:
  /// **'Tarix bo‘sh'**
  String get historyEmpty;

  /// No description provided for @codeShow.
  ///
  /// In uz, this message translates to:
  /// **'Kodni kassirga ko‘rsating'**
  String get codeShow;

  /// No description provided for @codeValidUntil.
  ///
  /// In uz, this message translates to:
  /// **'{time} gacha amal qiladi'**
  String codeValidUntil(String time);

  /// No description provided for @codeCancel.
  ///
  /// In uz, this message translates to:
  /// **'Kodni bekor qilish'**
  String get codeCancel;

  /// No description provided for @codeCancelAsk.
  ///
  /// In uz, this message translates to:
  /// **'Kodni bekor qilasizmi? Joy boshqalarga qaytadi.'**
  String get codeCancelAsk;

  /// No description provided for @statusClaimed.
  ///
  /// In uz, this message translates to:
  /// **'Faol'**
  String get statusClaimed;

  /// No description provided for @statusCompleted.
  ///
  /// In uz, this message translates to:
  /// **'Ishlatilgan'**
  String get statusCompleted;

  /// No description provided for @statusExpired.
  ///
  /// In uz, this message translates to:
  /// **'Muddati o‘tgan'**
  String get statusExpired;

  /// No description provided for @statusCanceled.
  ///
  /// In uz, this message translates to:
  /// **'Bekor qilingan'**
  String get statusCanceled;

  /// No description provided for @rateVisit.
  ///
  /// In uz, this message translates to:
  /// **'Baholash'**
  String get rateVisit;

  /// No description provided for @rateTitle.
  ///
  /// In uz, this message translates to:
  /// **'Tashrif qanday o‘tdi?'**
  String get rateTitle;

  /// No description provided for @rateComment.
  ///
  /// In uz, this message translates to:
  /// **'Fikringiz (ixtiyoriy)'**
  String get rateComment;

  /// No description provided for @rateThanks.
  ///
  /// In uz, this message translates to:
  /// **'Rahmat! Bahoingiz qabul qilindi.'**
  String get rateThanks;

  /// No description provided for @yourRating.
  ///
  /// In uz, this message translates to:
  /// **'Bahoingiz: {rating}'**
  String yourRating(String rating);

  /// No description provided for @loginRequiredTitle.
  ///
  /// In uz, this message translates to:
  /// **'Kirish kerak'**
  String get loginRequiredTitle;

  /// No description provided for @loginRequiredText.
  ///
  /// In uz, this message translates to:
  /// **'Bu bo‘lim uchun Telegram orqali kiring.'**
  String get loginRequiredText;

  /// No description provided for @loginAction.
  ///
  /// In uz, this message translates to:
  /// **'Kirish'**
  String get loginAction;

  /// No description provided for @savedDeals.
  ///
  /// In uz, this message translates to:
  /// **'Aksiyalar'**
  String get savedDeals;

  /// No description provided for @savedBusinesses.
  ///
  /// In uz, this message translates to:
  /// **'Bizneslar'**
  String get savedBusinesses;

  /// No description provided for @savedEmpty.
  ///
  /// In uz, this message translates to:
  /// **'Saqlangan aksiya yo‘q'**
  String get savedEmpty;

  /// No description provided for @savedEmptyText.
  ///
  /// In uz, this message translates to:
  /// **'Aksiyadagi ♡ ni bosing — u shu yerda saqlanadi.'**
  String get savedEmptyText;

  /// No description provided for @followsEmpty.
  ///
  /// In uz, this message translates to:
  /// **'Obunalar yo‘q'**
  String get followsEmpty;

  /// No description provided for @followsEmptyText.
  ///
  /// In uz, this message translates to:
  /// **'Biznes sahifasida «Obuna bo‘lish»ni bosing — yangi aksiyalari haqida xabar beramiz.'**
  String get followsEmptyText;

  /// No description provided for @liveDeals.
  ///
  /// In uz, this message translates to:
  /// **'{count} ta faol aksiya'**
  String liveDeals(String count);

  /// No description provided for @endedDeals.
  ///
  /// In uz, this message translates to:
  /// **'Tugaganlar'**
  String get endedDeals;

  /// No description provided for @profileGuestText.
  ///
  /// In uz, this message translates to:
  /// **'Kodlaringiz, saqlanganlar va xabarnomalar uchun kiring.'**
  String get profileGuestText;

  /// No description provided for @profileSaved.
  ///
  /// In uz, this message translates to:
  /// **'Tejalgan summa'**
  String get profileSaved;

  /// No description provided for @profileRedeemed.
  ///
  /// In uz, this message translates to:
  /// **'Ishlatilgan kodlar'**
  String get profileRedeemed;

  /// No description provided for @profileName.
  ///
  /// In uz, this message translates to:
  /// **'Ismingiz'**
  String get profileName;

  /// No description provided for @profileLanguage.
  ///
  /// In uz, this message translates to:
  /// **'Til'**
  String get profileLanguage;

  /// No description provided for @profileCity.
  ///
  /// In uz, this message translates to:
  /// **'Shahar'**
  String get profileCity;

  /// No description provided for @profileTheme.
  ///
  /// In uz, this message translates to:
  /// **'Mavzu'**
  String get profileTheme;

  /// No description provided for @themeSystem.
  ///
  /// In uz, this message translates to:
  /// **'Telefon bo‘yicha'**
  String get themeSystem;

  /// No description provided for @themeLight.
  ///
  /// In uz, this message translates to:
  /// **'Yorug‘'**
  String get themeLight;

  /// No description provided for @themeDark.
  ///
  /// In uz, this message translates to:
  /// **'Qorong‘i'**
  String get themeDark;

  /// No description provided for @profileInterests.
  ///
  /// In uz, this message translates to:
  /// **'Qiziqishlar'**
  String get profileInterests;

  /// No description provided for @profileNotifications.
  ///
  /// In uz, this message translates to:
  /// **'Xabarnomalar'**
  String get profileNotifications;

  /// No description provided for @notifyDeals.
  ///
  /// In uz, this message translates to:
  /// **'Obuna bo‘lgan bizneslarning yangi aksiyalari'**
  String get notifyDeals;

  /// No description provided for @notifyReminders.
  ///
  /// In uz, this message translates to:
  /// **'Kod muddati tugashidan oldin eslatma'**
  String get notifyReminders;

  /// No description provided for @notifyNearby.
  ///
  /// In uz, this message translates to:
  /// **'Yaqin atrofda qiziqishimga mos yangi aksiya'**
  String get notifyNearby;

  /// No description provided for @notifyNearbyHint.
  ///
  /// In uz, this message translates to:
  /// **'Buning uchun ilovani ochgan paytingizdagi taxminiy hudud (≈1 km) saqlanadi. O‘chirsangiz, darhol o‘chiriladi.'**
  String get notifyNearbyHint;

  /// No description provided for @notifyPermissionOff.
  ///
  /// In uz, this message translates to:
  /// **'Telefon sozlamalarida xabarnomalar o‘chiq.'**
  String get notifyPermissionOff;

  /// No description provided for @profileCashier.
  ///
  /// In uz, this message translates to:
  /// **'Kodni tekshirish (kassa)'**
  String get profileCashier;

  /// No description provided for @profileBusiness.
  ///
  /// In uz, this message translates to:
  /// **'Biznes kabineti'**
  String get profileBusiness;

  /// No description provided for @profileContact.
  ///
  /// In uz, this message translates to:
  /// **'Bog‘lanish'**
  String get profileContact;

  /// No description provided for @profileLogout.
  ///
  /// In uz, this message translates to:
  /// **'Chiqish'**
  String get profileLogout;

  /// No description provided for @profileDelete.
  ///
  /// In uz, this message translates to:
  /// **'Hisobni o‘chirish'**
  String get profileDelete;

  /// No description provided for @deleteAsk.
  ///
  /// In uz, this message translates to:
  /// **'Hisobingizni butunlay o‘chirasizmi? Buni qaytarib bo‘lmaydi.'**
  String get deleteAsk;

  /// No description provided for @deleteSoleOwner.
  ///
  /// In uz, this message translates to:
  /// **'Siz biznesning yagona egasisiz. Biznes saytdan olinadi, aksiyalari to‘xtaydi va faol kodlar bekor qilinadi. Biznesni yopib, hisobni o‘chirasizmi?'**
  String get deleteSoleOwner;

  /// No description provided for @deleteCloseAndDelete.
  ///
  /// In uz, this message translates to:
  /// **'Biznesni yopib, o‘chirish'**
  String get deleteCloseAndDelete;

  /// No description provided for @deleted.
  ///
  /// In uz, this message translates to:
  /// **'Hisob o‘chirildi'**
  String get deleted;

  /// No description provided for @appVersion.
  ///
  /// In uz, this message translates to:
  /// **'Versiya {version}'**
  String appVersion(String version);

  /// No description provided for @reportTitle.
  ///
  /// In uz, this message translates to:
  /// **'Shikoyat'**
  String get reportTitle;

  /// No description provided for @reportReason.
  ///
  /// In uz, this message translates to:
  /// **'Sababni tanlang'**
  String get reportReason;

  /// No description provided for @reportComment.
  ///
  /// In uz, this message translates to:
  /// **'Izoh (ixtiyoriy)'**
  String get reportComment;

  /// No description provided for @reportSend.
  ///
  /// In uz, this message translates to:
  /// **'Yuborish'**
  String get reportSend;

  /// No description provided for @reportThanks.
  ///
  /// In uz, this message translates to:
  /// **'Rahmat! Moderator ko‘rib chiqadi.'**
  String get reportThanks;

  /// No description provided for @reasonWrongInfo.
  ///
  /// In uz, this message translates to:
  /// **'Noto‘g‘ri ma’lumot'**
  String get reasonWrongInfo;

  /// No description provided for @reasonScam.
  ///
  /// In uz, this message translates to:
  /// **'Firibgarlik'**
  String get reasonScam;

  /// No description provided for @reasonOffensive.
  ///
  /// In uz, this message translates to:
  /// **'Haqorat yoki nomaqbul kontent'**
  String get reasonOffensive;

  /// No description provided for @reasonProhibited.
  ///
  /// In uz, this message translates to:
  /// **'Taqiqlangan mahsulot yoki xizmat'**
  String get reasonProhibited;

  /// No description provided for @reasonSpam.
  ///
  /// In uz, this message translates to:
  /// **'Spam'**
  String get reasonSpam;

  /// No description provided for @reasonOther.
  ///
  /// In uz, this message translates to:
  /// **'Boshqa'**
  String get reasonOther;

  /// No description provided for @cashierTitle.
  ///
  /// In uz, this message translates to:
  /// **'Kodni tekshirish'**
  String get cashierTitle;

  /// No description provided for @cashierChooseBusiness.
  ///
  /// In uz, this message translates to:
  /// **'Biznesni tanlang'**
  String get cashierChooseBusiness;

  /// No description provided for @cashierScanHint.
  ///
  /// In uz, this message translates to:
  /// **'Mijozning QR-kodini ramkaga to‘g‘rilang'**
  String get cashierScanHint;

  /// No description provided for @cashierManual.
  ///
  /// In uz, this message translates to:
  /// **'Kodni qo‘lda kiriting'**
  String get cashierManual;

  /// No description provided for @cashierCodeHint.
  ///
  /// In uz, this message translates to:
  /// **'Masalan, K7P 2QX'**
  String get cashierCodeHint;

  /// No description provided for @cashierCheck.
  ///
  /// In uz, this message translates to:
  /// **'Tekshirish'**
  String get cashierCheck;

  /// No description provided for @cashierValid.
  ///
  /// In uz, this message translates to:
  /// **'Kod haqiqiy'**
  String get cashierValid;

  /// No description provided for @cashierCustomer.
  ///
  /// In uz, this message translates to:
  /// **'Mijoz'**
  String get cashierCustomer;

  /// No description provided for @cashierConfirm.
  ///
  /// In uz, this message translates to:
  /// **'Tasdiqlash — kod ishlatildi'**
  String get cashierConfirm;

  /// No description provided for @cashierDone.
  ///
  /// In uz, this message translates to:
  /// **'Kod ishlatildi'**
  String get cashierDone;

  /// No description provided for @cashierNext.
  ///
  /// In uz, this message translates to:
  /// **'Keyingi mijoz'**
  String get cashierNext;

  /// No description provided for @cameraDenied.
  ///
  /// In uz, this message translates to:
  /// **'Kameraga ruxsat berilmadi — kodni qo‘lda kiriting.'**
  String get cameraDenied;

  /// No description provided for @updateTitle.
  ///
  /// In uz, this message translates to:
  /// **'Ilovani yangilang'**
  String get updateTitle;

  /// No description provided for @updateText.
  ///
  /// In uz, this message translates to:
  /// **'Bu versiya endi qo‘llab-quvvatlanmaydi. Play Market’dan yangilang.'**
  String get updateText;

  /// No description provided for @updateAction.
  ///
  /// In uz, this message translates to:
  /// **'Yangilash'**
  String get updateAction;

  /// No description provided for @offline.
  ///
  /// In uz, this message translates to:
  /// **'Internet yo‘q — oxirgi ma’lumot ko‘rsatilmoqda'**
  String get offline;

  /// No description provided for @open.
  ///
  /// In uz, this message translates to:
  /// **'Ochish'**
  String get open;

  /// No description provided for @homeForYouNone.
  ///
  /// In uz, this message translates to:
  /// **'Qiziqishlaringiz bo‘yicha hozircha aksiya yo‘q.'**
  String get homeForYouNone;

  /// No description provided for @homeChange.
  ///
  /// In uz, this message translates to:
  /// **'O‘zgartirish'**
  String get homeChange;

  /// No description provided for @dealStartsAt.
  ///
  /// In uz, this message translates to:
  /// **'{time} dan boshlanadi'**
  String dealStartsAt(String time);

  /// No description provided for @dealSoldOut.
  ///
  /// In uz, this message translates to:
  /// **'Hammasi band qilindi'**
  String get dealSoldOut;

  /// No description provided for @dealEnded.
  ///
  /// In uz, this message translates to:
  /// **'Aksiya tugagan'**
  String get dealEnded;

  /// No description provided for @dealNotStarted.
  ///
  /// In uz, this message translates to:
  /// **'Aksiya hali boshlanmagan'**
  String get dealNotStarted;

  /// No description provided for @endsInLabel.
  ///
  /// In uz, this message translates to:
  /// **'Tugashiga:'**
  String get endsInLabel;

  /// No description provided for @unblocked.
  ///
  /// In uz, this message translates to:
  /// **'Biznes blokdan chiqarildi'**
  String get unblocked;

  /// No description provided for @followers.
  ///
  /// In uz, this message translates to:
  /// **'{count} obunachi'**
  String followers(String count);

  /// No description provided for @blockedNote.
  ///
  /// In uz, this message translates to:
  /// **'Siz bu biznesni bloklagansiz — uning aksiyalari sizga ko‘rsatilmaydi.'**
  String get blockedNote;

  /// No description provided for @website.
  ///
  /// In uz, this message translates to:
  /// **'Sayt'**
  String get website;

  /// No description provided for @codeOpenDeal.
  ///
  /// In uz, this message translates to:
  /// **'Aksiyani ochish'**
  String get codeOpenDeal;

  /// No description provided for @profileSettings.
  ///
  /// In uz, this message translates to:
  /// **'Sozlamalar'**
  String get profileSettings;

  /// No description provided for @notifyTurnOn.
  ///
  /// In uz, this message translates to:
  /// **'Yoqish'**
  String get notifyTurnOn;

  /// No description provided for @profileForBusiness.
  ///
  /// In uz, this message translates to:
  /// **'Biznes uchun'**
  String get profileForBusiness;

  /// No description provided for @profileBusinessHint.
  ///
  /// In uz, this message translates to:
  /// **'Aksiyalar, filiallar va jamoa saytda boshqariladi'**
  String get profileBusinessHint;

  /// No description provided for @profileAbout.
  ///
  /// In uz, this message translates to:
  /// **'Ma’lumot'**
  String get profileAbout;

  /// No description provided for @cashierBadCode.
  ///
  /// In uz, this message translates to:
  /// **'Kod noto‘g‘ri. 6 ta belgini tekshiring.'**
  String get cashierBadCode;

  /// No description provided for @cashierNoBusiness.
  ///
  /// In uz, this message translates to:
  /// **'Kodlarni faqat tasdiqlangan biznes xodimlari tekshira oladi.'**
  String get cashierNoBusiness;

  /// No description provided for @homeSamplesNote.
  ///
  /// In uz, this message translates to:
  /// **'Bu hududda hozircha namuna aksiyalar: ular ilova qanday ishlashini ko‘rsatadi. Haqiqiy aksiyalar paydo bo‘lishi bilan shu yerda chiqadi.'**
  String get homeSamplesNote;
}

class _LDelegate extends LocalizationsDelegate<L> {
  const _LDelegate();

  @override
  Future<L> load(Locale locale) {
    return SynchronousFuture<L>(lookupL(locale));
  }

  @override
  bool isSupported(Locale locale) => <String>['en', 'ru', 'uz'].contains(locale.languageCode);

  @override
  bool shouldReload(_LDelegate old) => false;
}

L lookupL(Locale locale) {
  // Lookup logic when only language code is specified.
  switch (locale.languageCode) {
    case 'en':
      return LEn();
    case 'ru':
      return LRu();
    case 'uz':
      return LUz();
  }

  throw FlutterError(
    'L.delegate failed to load unsupported locale "$locale". This is likely '
    'an issue with the localizations generation tool. Please file an issue '
    'on GitHub with a reproducible sample app and the gen-l10n configuration '
    'that was used.',
  );
}
