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
  /// **'Bu versiya endi qo‘llab-quvvatlanmaydi — ilovaning yangi versiyasini o‘rnating.'**
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

  /// No description provided for @bizJoinTitle.
  ///
  /// In uz, this message translates to:
  /// **'Biznesingizni BugunBor’ga qo‘shing'**
  String get bizJoinTitle;

  /// No description provided for @bizJoinText.
  ///
  /// In uz, this message translates to:
  /// **'Asosiy ma’lumotni kiriting — tekshiruvdan so‘ng aksiya joylay olasiz.'**
  String get bizJoinText;

  /// No description provided for @bizJoinLogin.
  ///
  /// In uz, this message translates to:
  /// **'Biznes qo‘shish uchun Telegram orqali kiring — biznes hisobingizga bog‘lanadi.'**
  String get bizJoinLogin;

  /// No description provided for @bizName.
  ///
  /// In uz, this message translates to:
  /// **'Biznes nomi'**
  String get bizName;

  /// No description provided for @bizNameHint.
  ///
  /// In uz, this message translates to:
  /// **'Masalan, Oqtepa Lavash'**
  String get bizNameHint;

  /// No description provided for @bizCategory.
  ///
  /// In uz, this message translates to:
  /// **'Kategoriya'**
  String get bizCategory;

  /// No description provided for @bizCity.
  ///
  /// In uz, this message translates to:
  /// **'Shahar'**
  String get bizCity;

  /// No description provided for @bizPhone.
  ///
  /// In uz, this message translates to:
  /// **'Telefon'**
  String get bizPhone;

  /// No description provided for @bizAddress.
  ///
  /// In uz, this message translates to:
  /// **'Asosiy filial manzili'**
  String get bizAddress;

  /// No description provided for @bizAddressHint.
  ///
  /// In uz, this message translates to:
  /// **'Masalan: Chilonzor 9-kvartal, 12-uy'**
  String get bizAddressHint;

  /// No description provided for @bizAddressNote.
  ///
  /// In uz, this message translates to:
  /// **'Mo‘ljalni ham yozing — mijoz oson topadi (masalan, «Korzinka yonida»).'**
  String get bizAddressNote;

  /// No description provided for @bizHours.
  ///
  /// In uz, this message translates to:
  /// **'Ish vaqti'**
  String get bizHours;

  /// No description provided for @bizOpens.
  ///
  /// In uz, this message translates to:
  /// **'Ochiladi'**
  String get bizOpens;

  /// No description provided for @bizCloses.
  ///
  /// In uz, this message translates to:
  /// **'Yopiladi'**
  String get bizCloses;

  /// No description provided for @bizDescription.
  ///
  /// In uz, this message translates to:
  /// **'Qisqa tavsif'**
  String get bizDescription;

  /// No description provided for @bizDescriptionHint.
  ///
  /// In uz, this message translates to:
  /// **'Mijozlarga biznesingiz haqida aniq va tabiiy yozing…'**
  String get bizDescriptionHint;

  /// No description provided for @bizTemplate.
  ///
  /// In uz, this message translates to:
  /// **'Namuna matn'**
  String get bizTemplate;

  /// No description provided for @bizTemplateAsk.
  ///
  /// In uz, this message translates to:
  /// **'Yozilgan tavsif namuna bilan almashtirilsinmi?'**
  String get bizTemplateAsk;

  /// No description provided for @bizTemplateHint.
  ///
  /// In uz, this message translates to:
  /// **'Namunani o‘zingizga moslab o‘zgartiring.'**
  String get bizTemplateHint;

  /// No description provided for @bizTplFood.
  ///
  /// In uz, this message translates to:
  /// **'{name} — milliy va yevropa taomlari. Har kuni yangi tayyorlangan taomlar va samimiy xizmat. Tushlik va kechki ovqatga kutib qolamiz.'**
  String bizTplFood(String name);

  /// No description provided for @bizTplCoffee.
  ///
  /// In uz, this message translates to:
  /// **'{name} — kofe, choy va shirinliklar. Do‘stlar bilan uchrashish yoki dam olish uchun shinam joy.'**
  String bizTplCoffee(String name);

  /// No description provided for @bizTplShop.
  ///
  /// In uz, this message translates to:
  /// **'{name} — sifatli mahsulotlar va qulay narxlar. Tanlashda yordam beramiz, yangi mahsulotlar muntazam keladi.'**
  String bizTplShop(String name);

  /// No description provided for @bizTplBeauty.
  ///
  /// In uz, this message translates to:
  /// **'{name} — go‘zallik va parvarish xizmatlari. Tajribali ustalar va sifatli vositalar bilan ishlaymiz.'**
  String bizTplBeauty(String name);

  /// No description provided for @bizTplSport.
  ///
  /// In uz, this message translates to:
  /// **'{name} — sport va sog‘lom turmush uchun joy. Mashg‘ulotlar yangi boshlovchilar va tajribali sportchilar uchun.'**
  String bizTplSport(String name);

  /// No description provided for @bizTplFun.
  ///
  /// In uz, this message translates to:
  /// **'{name} — do‘stlar va oila bilan maroqli vaqt o‘tkazish uchun joy. Sizni quvnoq dam olishga taklif qilamiz.'**
  String bizTplFun(String name);

  /// No description provided for @bizTplServices.
  ///
  /// In uz, this message translates to:
  /// **'{name} — kundalik xizmatlarni tez va sifatli bajaramiz. Narxni oldindan aniq aytamiz.'**
  String bizTplServices(String name);

  /// No description provided for @bizTplDelivery.
  ///
  /// In uz, this message translates to:
  /// **'{name} — buyurtmalarni tez va o‘z vaqtida yetkazib beramiz. Buyurtma berish oson.'**
  String bizTplDelivery(String name);

  /// No description provided for @bizTplDefault.
  ///
  /// In uz, this message translates to:
  /// **'{name} — sifatli mahsulot va samimiy xizmat. Bizga tashrif buyuring!'**
  String bizTplDefault(String name);

  /// No description provided for @bizCounter.
  ///
  /// In uz, this message translates to:
  /// **'{count} / {max}'**
  String bizCounter(String count, String max);

  /// No description provided for @bizMore.
  ///
  /// In uz, this message translates to:
  /// **'Telegram, Instagram va sayt (ixtiyoriy)'**
  String get bizMore;

  /// No description provided for @bizHandleHint.
  ///
  /// In uz, this message translates to:
  /// **'username (@ siz)'**
  String get bizHandleHint;

  /// No description provided for @bizMyTelegram.
  ///
  /// In uz, this message translates to:
  /// **'Mening Telegramim: @{username}'**
  String bizMyTelegram(String username);

  /// No description provided for @bizLocate.
  ///
  /// In uz, this message translates to:
  /// **'Joylashuvimni aniqlash'**
  String get bizLocate;

  /// No description provided for @bizLocating.
  ///
  /// In uz, this message translates to:
  /// **'Aniqlanmoqda…'**
  String get bizLocating;

  /// No description provided for @bizLocated.
  ///
  /// In uz, this message translates to:
  /// **'Joylashuv aniqlandi: {city}. Xaritadagi nuqta saqlanadi.'**
  String bizLocated(String city);

  /// No description provided for @bizLocateFailed.
  ///
  /// In uz, this message translates to:
  /// **'Joylashuvni aniqlab bo‘lmadi — shaharni ro‘yxatdan tanlang.'**
  String get bizLocateFailed;

  /// No description provided for @bizLocateNote.
  ///
  /// In uz, this message translates to:
  /// **'Biznes joyida turgan bo‘lsangiz bosing — mijozlar sizni xaritada va «Yaqinimda» bo‘limida topadi.'**
  String get bizLocateNote;

  /// No description provided for @bizSubmit.
  ///
  /// In uz, this message translates to:
  /// **'Tekshiruvga yuborish'**
  String get bizSubmit;

  /// No description provided for @bizSubmitting.
  ///
  /// In uz, this message translates to:
  /// **'Yuborilmoqda…'**
  String get bizSubmitting;

  /// No description provided for @bizConsent.
  ///
  /// In uz, this message translates to:
  /// **'Yuborish orqali ma’lumotlar tekshirilishiga rozilik bildirasiz. Biznes tasdiqlanmaguncha ochiq e’lon qilinmaydi.'**
  String get bizConsent;

  /// No description provided for @bizFixErrors.
  ///
  /// In uz, this message translates to:
  /// **'Belgilangan maydonlarni tekshiring.'**
  String get bizFixErrors;

  /// No description provided for @bizLimit.
  ///
  /// In uz, this message translates to:
  /// **'Bitta hisobdan ko‘pi bilan 5 ta biznes qo‘shish mumkin.'**
  String get bizLimit;

  /// No description provided for @bizSentTitle.
  ///
  /// In uz, this message translates to:
  /// **'Ariza yuborildi'**
  String get bizSentTitle;

  /// No description provided for @bizVerifiedTitle.
  ///
  /// In uz, this message translates to:
  /// **'Biznesingiz tasdiqlandi!'**
  String get bizVerifiedTitle;

  /// No description provided for @bizVerifiedText.
  ///
  /// In uz, this message translates to:
  /// **'Endi birinchi aksiyani joylang — mijozlar uni ilovada va saytda ko‘radi.'**
  String get bizVerifiedText;

  /// No description provided for @bizPendingText.
  ///
  /// In uz, this message translates to:
  /// **'Moderator arizani ko‘rib chiqadi (odatda 24 soat ichida). Tasdiqlangach biznesingiz hammaga ko‘rinadi — aksiyalarni hozirdan tayyorlab qo‘yishingiz mumkin.'**
  String get bizPendingText;

  /// No description provided for @bizOpenProfile.
  ///
  /// In uz, this message translates to:
  /// **'Biznes profiliga o‘tish'**
  String get bizOpenProfile;

  /// No description provided for @bizAddFirstDeal.
  ///
  /// In uz, this message translates to:
  /// **'Birinchi aksiyani qo‘shish'**
  String get bizAddFirstDeal;

  /// No description provided for @valTooShort.
  ///
  /// In uz, this message translates to:
  /// **'Kamida {min} ta belgi'**
  String valTooShort(String min);

  /// No description provided for @valTooLong.
  ///
  /// In uz, this message translates to:
  /// **'Ko‘pi bilan {max} ta belgi'**
  String valTooLong(String max);

  /// No description provided for @valInvalid.
  ///
  /// In uz, this message translates to:
  /// **'Noto‘g‘ri qiymat'**
  String get valInvalid;

  /// No description provided for @valPhone.
  ///
  /// In uz, this message translates to:
  /// **'Raqamni +998 90 123 45 67 ko‘rinishida kiriting'**
  String get valPhone;

  /// No description provided for @valTime.
  ///
  /// In uz, this message translates to:
  /// **'Vaqtni tanlang'**
  String get valTime;

  /// No description provided for @valChoose.
  ///
  /// In uz, this message translates to:
  /// **'Birini tanlang'**
  String get valChoose;

  /// No description provided for @bizProfileTitle.
  ///
  /// In uz, this message translates to:
  /// **'Biznes profili'**
  String get bizProfileTitle;

  /// No description provided for @modeBusiness.
  ///
  /// In uz, this message translates to:
  /// **'Biznes'**
  String get modeBusiness;

  /// No description provided for @modePersonal.
  ///
  /// In uz, this message translates to:
  /// **'Shaxsiy'**
  String get modePersonal;

  /// No description provided for @bizStatusVerified.
  ///
  /// In uz, this message translates to:
  /// **'Tasdiqlangan'**
  String get bizStatusVerified;

  /// No description provided for @bizStatusPending.
  ///
  /// In uz, this message translates to:
  /// **'Tekshiruvda'**
  String get bizStatusPending;

  /// No description provided for @bizStatusRejected.
  ///
  /// In uz, this message translates to:
  /// **'Rad etilgan'**
  String get bizStatusRejected;

  /// No description provided for @bizStatusSuspended.
  ///
  /// In uz, this message translates to:
  /// **'To‘xtatilgan'**
  String get bizStatusSuspended;

  /// No description provided for @roleOwner.
  ///
  /// In uz, this message translates to:
  /// **'Egasi'**
  String get roleOwner;

  /// No description provided for @roleManager.
  ///
  /// In uz, this message translates to:
  /// **'Menejer'**
  String get roleManager;

  /// No description provided for @roleCashier.
  ///
  /// In uz, this message translates to:
  /// **'Kassir'**
  String get roleCashier;

  /// No description provided for @bizPendingNote.
  ///
  /// In uz, this message translates to:
  /// **'Biznesingizni moderator ko‘rib chiqmoqda (odatda 24 soat ichida). Tasdiqlangach aksiyalaringiz ko‘rinadi — ularni hozir tayyorlab qo‘yishingiz mumkin.'**
  String get bizPendingNote;

  /// No description provided for @bizRejectedNote.
  ///
  /// In uz, this message translates to:
  /// **'Biznes rad etildi: {reason}'**
  String bizRejectedNote(String reason);

  /// No description provided for @bizRejectedFix.
  ///
  /// In uz, this message translates to:
  /// **'Saytda tuzatib, qayta yuborish'**
  String get bizRejectedFix;

  /// No description provided for @bizSuspendedNote.
  ///
  /// In uz, this message translates to:
  /// **'Biznes vaqtincha to‘xtatilgan — aksiyalari ko‘rinmaydi. Savol bo‘lsa, biz bilan bog‘laning.'**
  String get bizSuspendedNote;

  /// No description provided for @bizQuick.
  ///
  /// In uz, this message translates to:
  /// **'Tezkor amallar'**
  String get bizQuick;

  /// No description provided for @bizAddDeal.
  ///
  /// In uz, this message translates to:
  /// **'Aksiya qo‘shish'**
  String get bizAddDeal;

  /// No description provided for @bizViewPage.
  ///
  /// In uz, this message translates to:
  /// **'Biznes sahifasi'**
  String get bizViewPage;

  /// No description provided for @bizAddAnother.
  ///
  /// In uz, this message translates to:
  /// **'Yana biznes qo‘shish'**
  String get bizAddAnother;

  /// No description provided for @bizStats.
  ///
  /// In uz, this message translates to:
  /// **'Statistika'**
  String get bizStats;

  /// No description provided for @statLive.
  ///
  /// In uz, this message translates to:
  /// **'Faol aksiyalar'**
  String get statLive;

  /// No description provided for @statClaimsToday.
  ///
  /// In uz, this message translates to:
  /// **'Bugun band qilindi'**
  String get statClaimsToday;

  /// No description provided for @statRedeemedToday.
  ///
  /// In uz, this message translates to:
  /// **'Bugun ishlatildi'**
  String get statRedeemedToday;

  /// No description provided for @statViews.
  ///
  /// In uz, this message translates to:
  /// **'Ko‘rishlar'**
  String get statViews;

  /// No description provided for @statFollowers.
  ///
  /// In uz, this message translates to:
  /// **'Obunachilar'**
  String get statFollowers;

  /// No description provided for @statRating.
  ///
  /// In uz, this message translates to:
  /// **'Reyting'**
  String get statRating;

  /// No description provided for @bizSetupTitle.
  ///
  /// In uz, this message translates to:
  /// **'Profilni to‘ldiring'**
  String get bizSetupTitle;

  /// No description provided for @bizSetupProgress.
  ///
  /// In uz, this message translates to:
  /// **'{done} / {total} bajarildi'**
  String bizSetupProgress(String done, String total);

  /// No description provided for @bizSetupHint.
  ///
  /// In uz, this message translates to:
  /// **'To‘liq profil mijozlar ishonchini oshiradi — aksiyalaringiz ko‘proq ko‘riladi.'**
  String get bizSetupHint;

  /// No description provided for @setupLogo.
  ///
  /// In uz, this message translates to:
  /// **'Logotip yuklang'**
  String get setupLogo;

  /// No description provided for @setupCover.
  ///
  /// In uz, this message translates to:
  /// **'Muqova rasmini yuklang'**
  String get setupCover;

  /// No description provided for @setupDescription.
  ///
  /// In uz, this message translates to:
  /// **'Tavsifni batafsilroq yozing (kamida 80 belgi)'**
  String get setupDescription;

  /// No description provided for @setupContacts.
  ///
  /// In uz, this message translates to:
  /// **'Telegram yoki Instagram qo‘shing'**
  String get setupContacts;

  /// No description provided for @setupLocation.
  ///
  /// In uz, this message translates to:
  /// **'Filialni xaritada belgilang'**
  String get setupLocation;

  /// No description provided for @setupDeal.
  ///
  /// In uz, this message translates to:
  /// **'Birinchi aksiyani joylang'**
  String get setupDeal;

  /// No description provided for @bizRecent.
  ///
  /// In uz, this message translates to:
  /// **'So‘nggi kodlar'**
  String get bizRecent;

  /// No description provided for @bizRecentEmpty.
  ///
  /// In uz, this message translates to:
  /// **'Hali kod olinmagan.'**
  String get bizRecentEmpty;

  /// No description provided for @bizCashierOnly.
  ///
  /// In uz, this message translates to:
  /// **'Siz bu biznesda kassirsiz: mijozlarning kodlarini tekshirasiz.'**
  String get bizCashierOnly;

  /// No description provided for @promoTitle.
  ///
  /// In uz, this message translates to:
  /// **'Biznesingiz bormi? Ko‘proq soting'**
  String get promoTitle;

  /// No description provided for @promoText.
  ///
  /// In uz, this message translates to:
  /// **'BugunBor’ga qo‘shing — aksiyangizni yaqin atrofdagi xaridorlar ko‘radi va kod bilan to‘g‘ri sizga keladi.'**
  String get promoText;

  /// No description provided for @promoPoint1.
  ///
  /// In uz, this message translates to:
  /// **'Yaqin atrofdagi xaridorlar sizni topadi'**
  String get promoPoint1;

  /// No description provided for @promoPoint2.
  ///
  /// In uz, this message translates to:
  /// **'Obunachilar yangi aksiyangizdan xabar topadi'**
  String get promoPoint2;

  /// No description provided for @promoPoint3.
  ///
  /// In uz, this message translates to:
  /// **'Natijani ko‘rasiz: band qilingan va ishlatilgan kodlar'**
  String get promoPoint3;

  /// No description provided for @promoPoint4.
  ///
  /// In uz, this message translates to:
  /// **'Ro‘yxatdan o‘tish bepul — bir necha daqiqa'**
  String get promoPoint4;

  /// No description provided for @promoAction.
  ///
  /// In uz, this message translates to:
  /// **'Biznesimni qo‘shish'**
  String get promoAction;

  /// No description provided for @promoHide.
  ///
  /// In uz, this message translates to:
  /// **'Yashirish'**
  String get promoHide;

  /// No description provided for @bizDiscardAsk.
  ///
  /// In uz, this message translates to:
  /// **'Kiritilgan ma’lumotlar saqlanmaydi. Chiqasizmi?'**
  String get bizDiscardAsk;

  /// No description provided for @bizDiscard.
  ///
  /// In uz, this message translates to:
  /// **'Chiqish'**
  String get bizDiscard;

  /// No description provided for @bizJoinSoon.
  ///
  /// In uz, this message translates to:
  /// **'Ilovadan biznes qo‘shish server yangilangach ishlaydi. Hozircha saytda qo‘shishingiz mumkin.'**
  String get bizJoinSoon;

  /// No description provided for @bizOnSite.
  ///
  /// In uz, this message translates to:
  /// **'Saytda qo‘shish'**
  String get bizOnSite;

  /// No description provided for @dealsTitle.
  ///
  /// In uz, this message translates to:
  /// **'Aksiyalar'**
  String get dealsTitle;

  /// No description provided for @dealsNew.
  ///
  /// In uz, this message translates to:
  /// **'Yangi aksiya'**
  String get dealsNew;

  /// No description provided for @dealsFilterAll.
  ///
  /// In uz, this message translates to:
  /// **'Hammasi'**
  String get dealsFilterAll;

  /// No description provided for @dealsFilterLive.
  ///
  /// In uz, this message translates to:
  /// **'Faol'**
  String get dealsFilterLive;

  /// No description provided for @dealsFilterReview.
  ///
  /// In uz, this message translates to:
  /// **'Tekshiruvda'**
  String get dealsFilterReview;

  /// No description provided for @dealsFilterDraft.
  ///
  /// In uz, this message translates to:
  /// **'Qoralama'**
  String get dealsFilterDraft;

  /// No description provided for @dealsFilterEnded.
  ///
  /// In uz, this message translates to:
  /// **'Yakunlangan'**
  String get dealsFilterEnded;

  /// No description provided for @dealsEmpty.
  ///
  /// In uz, this message translates to:
  /// **'Bu bo‘limda aksiya yo‘q.'**
  String get dealsEmpty;

  /// No description provided for @dealsEmptyTitle.
  ///
  /// In uz, this message translates to:
  /// **'Hali aksiya yo‘q'**
  String get dealsEmptyTitle;

  /// No description provided for @dealsEmptyText.
  ///
  /// In uz, this message translates to:
  /// **'Birinchi aksiyangizni qo‘shing — yaqin atrofdagi xaridorlar uni shu zahoti ko‘radi.'**
  String get dealsEmptyText;

  /// No description provided for @dealsStock.
  ///
  /// In uz, this message translates to:
  /// **'Qoldiq: {left} / {total}'**
  String dealsStock(String left, String total);

  /// No description provided for @dealsUnlimited.
  ///
  /// In uz, this message translates to:
  /// **'Miqdor cheklanmagan'**
  String get dealsUnlimited;

  /// No description provided for @dealsClaims.
  ///
  /// In uz, this message translates to:
  /// **'Band: {count}'**
  String dealsClaims(String count);

  /// No description provided for @dealsRedeemed.
  ///
  /// In uz, this message translates to:
  /// **'Ishlatilgan: {count}'**
  String dealsRedeemed(String count);

  /// No description provided for @dealsViews.
  ///
  /// In uz, this message translates to:
  /// **'Ko‘rishlar: {count}'**
  String dealsViews(String count);

  /// No description provided for @dealsRejected.
  ///
  /// In uz, this message translates to:
  /// **'Rad etish sababi: {reason}'**
  String dealsRejected(String reason);

  /// No description provided for @dealActEdit.
  ///
  /// In uz, this message translates to:
  /// **'Tahrirlash'**
  String get dealActEdit;

  /// No description provided for @dealActSubmit.
  ///
  /// In uz, this message translates to:
  /// **'Tekshiruvga yuborish'**
  String get dealActSubmit;

  /// No description provided for @dealActWithdraw.
  ///
  /// In uz, this message translates to:
  /// **'Qaytarib olish'**
  String get dealActWithdraw;

  /// No description provided for @dealActPause.
  ///
  /// In uz, this message translates to:
  /// **'Pauza'**
  String get dealActPause;

  /// No description provided for @dealActResume.
  ///
  /// In uz, this message translates to:
  /// **'Davom ettirish'**
  String get dealActResume;

  /// No description provided for @dealActEnd.
  ///
  /// In uz, this message translates to:
  /// **'Yakunlash'**
  String get dealActEnd;

  /// No description provided for @dealActDuplicate.
  ///
  /// In uz, this message translates to:
  /// **'Nusxa olish'**
  String get dealActDuplicate;

  /// No description provided for @dealActDelete.
  ///
  /// In uz, this message translates to:
  /// **'O‘chirish'**
  String get dealActDelete;

  /// No description provided for @dealActView.
  ///
  /// In uz, this message translates to:
  /// **'Mijozlar ko‘rinishida ochish'**
  String get dealActView;

  /// No description provided for @dealConfirmEnd.
  ///
  /// In uz, this message translates to:
  /// **'Aksiyani yakunlaysizmi? Buni qaytarib bo‘lmaydi, berilgan kodlar amal qilishda davom etadi.'**
  String get dealConfirmEnd;

  /// No description provided for @dealConfirmDelete.
  ///
  /// In uz, this message translates to:
  /// **'Qoralamani o‘chirasizmi?'**
  String get dealConfirmDelete;

  /// No description provided for @dealLocked.
  ///
  /// In uz, this message translates to:
  /// **'Tasdiqlangan aksiyaning shartlarini o‘zgartirib bo‘lmaydi. O‘zgartirish uchun nusxa oling.'**
  String get dealLocked;

  /// No description provided for @dealStLive.
  ///
  /// In uz, this message translates to:
  /// **'Faol'**
  String get dealStLive;

  /// No description provided for @dealStScheduled.
  ///
  /// In uz, this message translates to:
  /// **'Tez orada'**
  String get dealStScheduled;

  /// No description provided for @dealStSoldOut.
  ///
  /// In uz, this message translates to:
  /// **'Tugadi'**
  String get dealStSoldOut;

  /// No description provided for @dealStExpired.
  ///
  /// In uz, this message translates to:
  /// **'Muddati o‘tgan'**
  String get dealStExpired;

  /// No description provided for @dealStPaused.
  ///
  /// In uz, this message translates to:
  /// **'Pauzada'**
  String get dealStPaused;

  /// No description provided for @dealStDraft.
  ///
  /// In uz, this message translates to:
  /// **'Qoralama'**
  String get dealStDraft;

  /// No description provided for @dealStReview.
  ///
  /// In uz, this message translates to:
  /// **'Tekshiruvda'**
  String get dealStReview;

  /// No description provided for @dealStRejected.
  ///
  /// In uz, this message translates to:
  /// **'Rad etilgan'**
  String get dealStRejected;

  /// No description provided for @dealStArchived.
  ///
  /// In uz, this message translates to:
  /// **'Yakunlangan'**
  String get dealStArchived;

  /// No description provided for @dealSavedLive.
  ///
  /// In uz, this message translates to:
  /// **'Aksiya chiqdi — mijozlar uni hozir ko‘ryapti!'**
  String get dealSavedLive;

  /// No description provided for @dealSavedReview.
  ///
  /// In uz, this message translates to:
  /// **'Aksiya tekshiruvga yuborildi. Tasdiqlangach chiqadi.'**
  String get dealSavedReview;

  /// No description provided for @dealSavedDraft.
  ///
  /// In uz, this message translates to:
  /// **'Qoralama saqlandi.'**
  String get dealSavedDraft;

  /// No description provided for @dealDonePause.
  ///
  /// In uz, this message translates to:
  /// **'Aksiya pauzaga qo‘yildi.'**
  String get dealDonePause;

  /// No description provided for @dealDoneResume.
  ///
  /// In uz, this message translates to:
  /// **'Aksiya davom etyapti.'**
  String get dealDoneResume;

  /// No description provided for @dealDoneEnd.
  ///
  /// In uz, this message translates to:
  /// **'Aksiya yakunlandi.'**
  String get dealDoneEnd;

  /// No description provided for @dealDoneDuplicate.
  ///
  /// In uz, this message translates to:
  /// **'Nusxa qoralamaga qo‘shildi.'**
  String get dealDoneDuplicate;

  /// No description provided for @dealDoneDelete.
  ///
  /// In uz, this message translates to:
  /// **'Qoralama o‘chirildi.'**
  String get dealDoneDelete;

  /// No description provided for @dealDoneWithdraw.
  ///
  /// In uz, this message translates to:
  /// **'Aksiya tekshiruvdan qaytarildi.'**
  String get dealDoneWithdraw;

  /// No description provided for @dealNewTitle.
  ///
  /// In uz, this message translates to:
  /// **'Yangi aksiya'**
  String get dealNewTitle;

  /// No description provided for @dealEditTitle.
  ///
  /// In uz, this message translates to:
  /// **'Aksiyani tahrirlash'**
  String get dealEditTitle;

  /// No description provided for @dealTitleLabel.
  ///
  /// In uz, this message translates to:
  /// **'Aksiya nomi'**
  String get dealTitleLabel;

  /// No description provided for @dealTitleHint.
  ///
  /// In uz, this message translates to:
  /// **'Masalan, Lag‘mon va salat kombo'**
  String get dealTitleHint;

  /// No description provided for @dealDescriptionLabel.
  ///
  /// In uz, this message translates to:
  /// **'Tavsif'**
  String get dealDescriptionLabel;

  /// No description provided for @dealDescriptionHint.
  ///
  /// In uz, this message translates to:
  /// **'Mijoz nima oladi? Aniq yozing.'**
  String get dealDescriptionHint;

  /// No description provided for @dealTermsHint.
  ///
  /// In uz, this message translates to:
  /// **'Masalan: Faqat restoranda. Boshqa chegirmalar bilan qo‘shilmaydi.'**
  String get dealTermsHint;

  /// No description provided for @dealPhoto.
  ///
  /// In uz, this message translates to:
  /// **'Aksiya rasmi'**
  String get dealPhoto;

  /// No description provided for @dealPhotoHint.
  ///
  /// In uz, this message translates to:
  /// **'Mahsulot yoki xizmatingizning o‘zingiz olgan haqiqiy fotosurati. Rasm bo‘lmasa, chiroyli belgi ko‘rsatiladi.'**
  String get dealPhotoHint;

  /// No description provided for @dealPhotoAdd.
  ///
  /// In uz, this message translates to:
  /// **'Rasm qo‘shish'**
  String get dealPhotoAdd;

  /// No description provided for @dealPhotoChange.
  ///
  /// In uz, this message translates to:
  /// **'Almashtirish'**
  String get dealPhotoChange;

  /// No description provided for @dealPhotoRemove.
  ///
  /// In uz, this message translates to:
  /// **'Olib tashlash'**
  String get dealPhotoRemove;

  /// No description provided for @dealPhotoCamera.
  ///
  /// In uz, this message translates to:
  /// **'Kamera'**
  String get dealPhotoCamera;

  /// No description provided for @dealPhotoGallery.
  ///
  /// In uz, this message translates to:
  /// **'Galereya'**
  String get dealPhotoGallery;

  /// No description provided for @dealPhotoUploading.
  ///
  /// In uz, this message translates to:
  /// **'Yuklanmoqda…'**
  String get dealPhotoUploading;

  /// No description provided for @dealPhotoUnsupported.
  ///
  /// In uz, this message translates to:
  /// **'Bu rasmni o‘qib bo‘lmadi. JPG yoki PNG rasm tanlang.'**
  String get dealPhotoUnsupported;

  /// No description provided for @dealVisualLabel.
  ///
  /// In uz, this message translates to:
  /// **'Belgi'**
  String get dealVisualLabel;

  /// No description provided for @dealVisualHint.
  ///
  /// In uz, this message translates to:
  /// **'Rasm bo‘lmasa, shu belgi ko‘rsatiladi.'**
  String get dealVisualHint;

  /// No description provided for @dealOriginalPrice.
  ///
  /// In uz, this message translates to:
  /// **'Asl narx, so‘m'**
  String get dealOriginalPrice;

  /// No description provided for @dealPriceLabel.
  ///
  /// In uz, this message translates to:
  /// **'Aksiya narxi, so‘m'**
  String get dealPriceLabel;

  /// No description provided for @dealDiscountPreview.
  ///
  /// In uz, this message translates to:
  /// **'Chegirma: {percent}%'**
  String dealDiscountPreview(String percent);

  /// No description provided for @dealStarts.
  ///
  /// In uz, this message translates to:
  /// **'Boshlanish'**
  String get dealStarts;

  /// No description provided for @dealEnds.
  ///
  /// In uz, this message translates to:
  /// **'Tugash'**
  String get dealEnds;

  /// No description provided for @dealTimeHint.
  ///
  /// In uz, this message translates to:
  /// **'Toshkent vaqti bilan'**
  String get dealTimeHint;

  /// No description provided for @dealQuick2h.
  ///
  /// In uz, this message translates to:
  /// **'2 soat'**
  String get dealQuick2h;

  /// No description provided for @dealQuick4h.
  ///
  /// In uz, this message translates to:
  /// **'4 soat'**
  String get dealQuick4h;

  /// No description provided for @dealQuickToday.
  ///
  /// In uz, this message translates to:
  /// **'Kun oxirigacha'**
  String get dealQuickToday;

  /// No description provided for @dealQuick1d.
  ///
  /// In uz, this message translates to:
  /// **'1 kun'**
  String get dealQuick1d;

  /// No description provided for @dealQuick3d.
  ///
  /// In uz, this message translates to:
  /// **'3 kun'**
  String get dealQuick3d;

  /// No description provided for @dealQuick7d.
  ///
  /// In uz, this message translates to:
  /// **'7 kun'**
  String get dealQuick7d;

  /// No description provided for @dealQuantity.
  ///
  /// In uz, this message translates to:
  /// **'Miqdor'**
  String get dealQuantity;

  /// No description provided for @dealUnlimited.
  ///
  /// In uz, this message translates to:
  /// **'Cheklanmagan'**
  String get dealUnlimited;

  /// No description provided for @dealPerCustomerLabel.
  ///
  /// In uz, this message translates to:
  /// **'Bir mijozga'**
  String get dealPerCustomerLabel;

  /// No description provided for @dealTtl.
  ///
  /// In uz, this message translates to:
  /// **'Kod amal qilish muddati'**
  String get dealTtl;

  /// No description provided for @dealTtl30.
  ///
  /// In uz, this message translates to:
  /// **'30 daqiqa'**
  String get dealTtl30;

  /// No description provided for @dealTtl60.
  ///
  /// In uz, this message translates to:
  /// **'1 soat'**
  String get dealTtl60;

  /// No description provided for @dealTtl120.
  ///
  /// In uz, this message translates to:
  /// **'2 soat'**
  String get dealTtl120;

  /// No description provided for @dealTtl240.
  ///
  /// In uz, this message translates to:
  /// **'4 soat'**
  String get dealTtl240;

  /// No description provided for @dealWhere.
  ///
  /// In uz, this message translates to:
  /// **'Qaysi filiallarda'**
  String get dealWhere;

  /// No description provided for @dealNoBranches.
  ///
  /// In uz, this message translates to:
  /// **'Filial yo‘q — avval saytdagi kabinetda filial qo‘shing.'**
  String get dealNoBranches;

  /// No description provided for @dealRulesNote.
  ///
  /// In uz, this message translates to:
  /// **'Qoidalar: chegirma kamida {min}%, davomiylik 30 daqiqadan 30 kungacha.'**
  String dealRulesNote(String min);

  /// No description provided for @dealPreview.
  ///
  /// In uz, this message translates to:
  /// **'Mijozlarga shunday ko‘rinadi'**
  String get dealPreview;

  /// No description provided for @dealSaveDraft.
  ///
  /// In uz, this message translates to:
  /// **'Qoralama sifatida saqlash'**
  String get dealSaveDraft;

  /// No description provided for @dealSaving.
  ///
  /// In uz, this message translates to:
  /// **'Saqlanmoqda…'**
  String get dealSaving;

  /// No description provided for @dealAutoNote.
  ///
  /// In uz, this message translates to:
  /// **'Yuborilgach aksiya avtomatik tekshiriladi — odatda bir necha soniyada chiqadi.'**
  String get dealAutoNote;

  /// No description provided for @dealNeedsUpdate.
  ///
  /// In uz, this message translates to:
  /// **'Ilovadan aksiya qo‘shish server yangilangach ishlaydi. Hozircha saytda qo‘shishingiz mumkin.'**
  String get dealNeedsUpdate;

  /// No description provided for @valPriceOrder.
  ///
  /// In uz, this message translates to:
  /// **'Aksiya narxi asl narxdan past bo‘lishi kerak'**
  String get valPriceOrder;

  /// No description provided for @valMinDiscount.
  ///
  /// In uz, this message translates to:
  /// **'Chegirma kamida {min}% bo‘lishi kerak'**
  String valMinDiscount(String min);

  /// No description provided for @valEndAfterStart.
  ///
  /// In uz, this message translates to:
  /// **'Tugash vaqti boshlanishdan keyin bo‘lishi kerak'**
  String get valEndAfterStart;

  /// No description provided for @valDuration.
  ///
  /// In uz, this message translates to:
  /// **'Aksiya 30 daqiqadan 30 kungacha davom etishi mumkin'**
  String get valDuration;

  /// No description provided for @valEndInPast.
  ///
  /// In uz, this message translates to:
  /// **'Tugash vaqti o‘tib ketgan'**
  String get valEndInPast;

  /// No description provided for @valBranches.
  ///
  /// In uz, this message translates to:
  /// **'Kamida bitta filialni tanlang'**
  String get valBranches;

  /// No description provided for @valMinAmount.
  ///
  /// In uz, this message translates to:
  /// **'Kamida {amount} so‘m'**
  String valMinAmount(String amount);

  /// No description provided for @bizDeals.
  ///
  /// In uz, this message translates to:
  /// **'Aksiyalar'**
  String get bizDeals;

  /// No description provided for @bizSiteHint.
  ///
  /// In uz, this message translates to:
  /// **'Filiallar, jamoa va profil rasmlari saytdagi kabinetda boshqariladi'**
  String get bizSiteHint;

  /// No description provided for @dealPhotoCameraDenied.
  ///
  /// In uz, this message translates to:
  /// **'Kameraga ruxsat berilmadi — rasmni galereyadan tanlang yoki telefon sozlamalarida kameraga ruxsat bering.'**
  String get dealPhotoCameraDenied;

  /// No description provided for @dealWhen.
  ///
  /// In uz, this message translates to:
  /// **'Qachon'**
  String get dealWhen;

  /// No description provided for @dealsNeedUpdate.
  ///
  /// In uz, this message translates to:
  /// **'Aksiyalarni ilovada ko‘rish va boshqarish server yangilangach ishlaydi. Hozircha saytdagi biznes kabinetidan foydalaning.'**
  String get dealsNeedUpdate;

  /// No description provided for @newVersionTitle.
  ///
  /// In uz, this message translates to:
  /// **'Yangi versiya bor'**
  String get newVersionTitle;

  /// No description provided for @newVersionText.
  ///
  /// In uz, this message translates to:
  /// **'Ilovaning yangi versiyasi chiqdi — yangilab oling. Hisobingiz va ma’lumotlaringiz saqlanadi.'**
  String get newVersionText;

  /// No description provided for @newVersionAction.
  ///
  /// In uz, this message translates to:
  /// **'Yangilash'**
  String get newVersionAction;

  /// No description provided for @profileGuides.
  ///
  /// In uz, this message translates to:
  /// **'Video qo‘llanma'**
  String get profileGuides;
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
