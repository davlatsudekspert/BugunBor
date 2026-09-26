// ignore: unused_import
import 'package:intl/intl.dart' as intl;

import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Uzbek (`uz`).
class LUz extends L {
  LUz([String locale = 'uz']) : super(locale);

  @override
  String get appTitle => 'BugunBor';

  @override
  String get navHome => 'Asosiy';

  @override
  String get navSearch => 'Qidiruv';

  @override
  String get navSaved => 'Saqlangan';

  @override
  String get navCodes => 'Kodlarim';

  @override
  String get navProfile => 'Profil';

  @override
  String get retry => 'Qayta urinish';

  @override
  String get errorGeneric => 'Nimadir xato ketdi. Qayta urinib ko‘ring.';

  @override
  String get errorNetwork => 'Internet bilan aloqa yo‘q. Tarmoqni tekshirib, qayta urinib ko‘ring.';

  @override
  String get errorServer => 'Serverda xatolik. Birozdan keyin qayta urinib ko‘ring.';

  @override
  String get errorSessionExpired => 'Sessiya tugadi — qaytadan kiring.';

  @override
  String get errorRateLimited => 'Juda ko‘p urinish. Birozdan keyin qayta urinib ko‘ring.';

  @override
  String get errorNotFound => 'Topilmadi yoki endi mavjud emas.';

  @override
  String get cancel => 'Bekor qilish';

  @override
  String get save => 'Saqlash';

  @override
  String get close => 'Yopish';

  @override
  String get next => 'Keyingi';

  @override
  String get skip => 'O‘tkazib yuborish';

  @override
  String get ok => 'Tushunarli';

  @override
  String get yes => 'Ha';

  @override
  String sum(String amount) {
    return '$amount so‘m';
  }

  @override
  String percentOff(String percent) {
    return '−$percent%';
  }

  @override
  String distanceKm(String distance) {
    return '$distance km';
  }

  @override
  String distanceM(String distance) {
    return '$distance m';
  }

  @override
  String endsIn(String time) {
    return 'Tugashiga $time';
  }

  @override
  String daysShort(String days) {
    return '$days kun';
  }

  @override
  String left(String count) {
    return '$count ta qoldi';
  }

  @override
  String get demoBadge => 'Namuna';

  @override
  String get demoNotice =>
      'Bu namuna aksiya: u ilova qanday ishlashini ko‘rsatadi, bunday biznes aslida yo‘q. Haqiqiy aksiyalarda shu yerda «Band qilish» tugmasi bo‘ladi.';

  @override
  String get demoCarouselTitle => 'Biznesingiz ham shunday ko‘rinadi';

  @override
  String get demoCarouselText => 'Biznesingiz bormi? Aksiyangizni bepul joylang — mijozlar uni shu yerda ko‘radi.';

  @override
  String get addBusiness => 'Biznes qo‘shish';

  @override
  String get onbWelcomeTitle => 'BugunBor’ga xush kelibsiz';

  @override
  String get onbWelcomeText =>
      'Shahringizdagi kafe, do‘kon, salon va xizmatlarning chegirmalari bir joyda. Aksiyani tanlang, bepul kod oling va kassada ko‘rsatib, arzonroq to‘lang.';

  @override
  String get onbStep1 => 'Aksiyani toping';

  @override
  String get onbStep2 => 'Bepul kod oling';

  @override
  String get onbStep3 => 'Kassada ko‘rsating';

  @override
  String get onbLanguage => 'Tilni tanlang';

  @override
  String get onbInterestsTitle => 'Sizga nima yoqadi?';

  @override
  String get onbInterestsText => 'Tanlaganlaringiz «Asosiy» bo‘limida birinchi chiqadi. Keyin Profilda o‘zgartirishingiz mumkin.';

  @override
  String get onbLocationTitle => 'Yaqin aksiyalarni ko‘rsataylikmi?';

  @override
  String get onbLocationText => 'Joylashuvingiz faqat ilova ochiq turganda, aksiyalarni masofa bo‘yicha saralash uchun ishlatiladi. Fonda olinmaydi.';

  @override
  String get onbLocationAllow => 'Joylashuvga ruxsat berish';

  @override
  String get onbLocationCity => 'Shaharni o‘zim tanlayman';

  @override
  String get onbNotifyTitle => 'Yangi aksiyalardan xabardor bo‘ling';

  @override
  String get onbNotifyText =>
      'Obuna bo‘lgan bizneslarning yangi aksiyalari, kod muddati tugashi va yaqin atrofdagi qiziqishingizga mos aksiyalar haqida xabar beramiz. Kuniga ko‘pi bilan 3 ta, kechasi — hech qachon.';

  @override
  String get onbNotifyAllow => 'Xabarnomalarni yoqish';

  @override
  String get onbLater => 'Keyinroq';

  @override
  String get onbStart => 'Boshlash';

  @override
  String get homeTitle => 'Bugun nima bor?';

  @override
  String get homeSearchHint => 'Osh, kofe, soch turmagi…';

  @override
  String get homeForYou => 'Siz uchun';

  @override
  String get homeForYouEmpty => 'Qiziqishlaringizni tanlang — mos aksiyalar shu yerda chiqadi.';

  @override
  String get homeChooseInterests => 'Qiziqishlarni tanlash';

  @override
  String get homeNearby => 'Yaqinimda';

  @override
  String homeInCity(String city) {
    return '$city bo‘yicha';
  }

  @override
  String get homeEnding => 'Tez tugaydi';

  @override
  String get homeAll => 'Barchasi';

  @override
  String get homeEmptyTitle => 'Hozircha aksiya yo‘q';

  @override
  String get homeEmptyText => 'Tez orada yangi takliflar paydo bo‘ladi. Boshqa shaharni tanlab ko‘ring.';

  @override
  String get homeUseLocation => 'Joylashuvim bo‘yicha';

  @override
  String get homeLocationDenied => 'Joylashuvga ruxsat berilmadi — shahar bo‘yicha ko‘rsatyapmiz.';

  @override
  String get chooseCity => 'Shaharni tanlang';

  @override
  String get searchHint => 'Aksiya yoki biznes qidiring';

  @override
  String get sortEnding => 'Tez tugaydi';

  @override
  String get sortDiscount => 'Katta chegirma';

  @override
  String get sortNew => 'Yangi';

  @override
  String get sortNear => 'Yaqin';

  @override
  String get allCategories => 'Hammasi';

  @override
  String get searchEmpty => 'Hech narsa topilmadi. Boshqa so‘z bilan qidirib ko‘ring.';

  @override
  String get dealBook => 'Band qilish';

  @override
  String get dealLoginToBook => 'Band qilish uchun kiring';

  @override
  String get dealUnavailable => 'Hozir band qilib bo‘lmaydi';

  @override
  String get dealHaveCode => 'Sizda bu aksiya uchun faol kod bor';

  @override
  String get dealViewCode => 'Kodni ko‘rish';

  @override
  String get dealLimitReached => 'Bu aksiyadan foydalanish chegarasiga yetdingiz';

  @override
  String get dealChooseBranch => 'Filialni tanlang';

  @override
  String get dealBranches => 'Filiallar';

  @override
  String get dealTerms => 'Shartlar';

  @override
  String dealPerCustomer(String count) {
    return 'Bir mijozga: $count ta';
  }

  @override
  String dealCodeValid(String minutes) {
    return 'Kod $minutes daqiqa amal qiladi. To‘lov joyida.';
  }

  @override
  String get dealDirections => 'Yo‘l ko‘rsatish';

  @override
  String get share => 'Ulashish';

  @override
  String get dealSave => 'Saqlash';

  @override
  String get dealSaved => 'Saqlangan';

  @override
  String get report => 'Shikoyat qilish';

  @override
  String dealYouSave(String amount) {
    return '$amount so‘m tejaysiz';
  }

  @override
  String get dealBooked => 'Aksiya band qilindi!';

  @override
  String get follow => 'Obuna bo‘lish';

  @override
  String get followingLabel => 'Obuna bo‘lingan';

  @override
  String get businessDeals => 'Aksiyalar';

  @override
  String get businessUpcoming => 'Tez orada';

  @override
  String get businessReviews => 'Sharhlar';

  @override
  String get businessNoDeals => 'Hozir faol aksiya yo‘q';

  @override
  String get block => 'Bloklash';

  @override
  String get unblock => 'Blokdan chiqarish';

  @override
  String get blockAsk => 'Bu biznesning aksiyalari sizga ko‘rsatilmaydi va obuna bekor bo‘ladi. Davom etasizmi?';

  @override
  String get blocked => 'Biznes bloklandi';

  @override
  String get call => 'Qo‘ng‘iroq qilish';

  @override
  String get loginTitle => 'Kirish';

  @override
  String get loginText => 'BugunBor’ga Telegram orqali kiring — parol va SMS kerak emas.';

  @override
  String get loginConsent => 'Maxfiylik siyosati va foydalanish shartlariga roziman';

  @override
  String get loginButton => 'Telegram orqali kirish';

  @override
  String get loginConsentHint => 'Kirish uchun avval rozilik belgisini qo‘ying.';

  @override
  String get loginMatchCode => 'Moslik kodi';

  @override
  String get loginMatchHint => 'Telegram’dagi botda shu kodni ko‘rasiz — bir xil bo‘lsa, tasdiqlang.';

  @override
  String get loginOpenTelegram => 'Telegram’ni ochish';

  @override
  String get loginWaiting => 'Telegram’dagi tasdiqni kutyapmiz…';

  @override
  String get loginExpired => 'So‘rov muddati tugadi.';

  @override
  String get loginDenied => 'So‘rov rad etildi.';

  @override
  String get loginRestart => 'Qaytadan boshlash';

  @override
  String get loginDone => 'Kirdingiz!';

  @override
  String get loginReviewer => 'Tekshiruvchi kodi';

  @override
  String get privacyPolicy => 'Maxfiylik siyosati';

  @override
  String get terms => 'Foydalanish shartlari';

  @override
  String get codesActive => 'Faol';

  @override
  String get codesHistory => 'Tarix';

  @override
  String get codesEmpty => 'Hali faol kod yo‘q';

  @override
  String get codesEmptyText => 'Aksiyani band qiling — kod shu yerda saqlanadi.';

  @override
  String get historyEmpty => 'Tarix bo‘sh';

  @override
  String get codeShow => 'Kodni kassirga ko‘rsating';

  @override
  String codeValidUntil(String time) {
    return '$time gacha amal qiladi';
  }

  @override
  String get codeCancel => 'Kodni bekor qilish';

  @override
  String get codeCancelAsk => 'Kodni bekor qilasizmi? Joy boshqalarga qaytadi.';

  @override
  String get statusClaimed => 'Faol';

  @override
  String get statusCompleted => 'Ishlatilgan';

  @override
  String get statusExpired => 'Muddati o‘tgan';

  @override
  String get statusCanceled => 'Bekor qilingan';

  @override
  String get rateVisit => 'Baholash';

  @override
  String get rateTitle => 'Tashrif qanday o‘tdi?';

  @override
  String get rateComment => 'Fikringiz (ixtiyoriy)';

  @override
  String get rateThanks => 'Rahmat! Bahoingiz qabul qilindi.';

  @override
  String yourRating(String rating) {
    return 'Bahoingiz: $rating';
  }

  @override
  String get loginRequiredTitle => 'Kirish kerak';

  @override
  String get loginRequiredText => 'Bu bo‘lim uchun Telegram orqali kiring.';

  @override
  String get loginAction => 'Kirish';

  @override
  String get savedDeals => 'Aksiyalar';

  @override
  String get savedBusinesses => 'Bizneslar';

  @override
  String get savedEmpty => 'Saqlangan aksiya yo‘q';

  @override
  String get savedEmptyText => 'Aksiyadagi ♡ ni bosing — u shu yerda saqlanadi.';

  @override
  String get followsEmpty => 'Obunalar yo‘q';

  @override
  String get followsEmptyText => 'Biznes sahifasida «Obuna bo‘lish»ni bosing — yangi aksiyalari haqida xabar beramiz.';

  @override
  String liveDeals(String count) {
    return '$count ta faol aksiya';
  }

  @override
  String get endedDeals => 'Tugaganlar';

  @override
  String get profileGuestText => 'Kodlaringiz, saqlanganlar va xabarnomalar uchun kiring.';

  @override
  String get profileSaved => 'Tejalgan summa';

  @override
  String get profileRedeemed => 'Ishlatilgan kodlar';

  @override
  String get profileName => 'Ismingiz';

  @override
  String get profileLanguage => 'Til';

  @override
  String get profileCity => 'Shahar';

  @override
  String get profileTheme => 'Mavzu';

  @override
  String get themeSystem => 'Telefon bo‘yicha';

  @override
  String get themeLight => 'Yorug‘';

  @override
  String get themeDark => 'Qorong‘i';

  @override
  String get profileInterests => 'Qiziqishlar';

  @override
  String get profileNotifications => 'Xabarnomalar';

  @override
  String get notifyDeals => 'Obuna bo‘lgan bizneslarning yangi aksiyalari';

  @override
  String get notifyReminders => 'Kod muddati tugashidan oldin eslatma';

  @override
  String get notifyNearby => 'Yaqin atrofda qiziqishimga mos yangi aksiya';

  @override
  String get notifyNearbyHint => 'Buning uchun ilovani ochgan paytingizdagi taxminiy hudud (≈1 km) saqlanadi. O‘chirsangiz, darhol o‘chiriladi.';

  @override
  String get notifyPermissionOff => 'Telefon sozlamalarida xabarnomalar o‘chiq.';

  @override
  String get profileCashier => 'Kodni tekshirish (kassa)';

  @override
  String get profileBusiness => 'Biznes kabineti';

  @override
  String get profileContact => 'Bog‘lanish';

  @override
  String get profileLogout => 'Chiqish';

  @override
  String get profileDelete => 'Hisobni o‘chirish';

  @override
  String get deleteAsk => 'Hisobingizni butunlay o‘chirasizmi? Buni qaytarib bo‘lmaydi.';

  @override
  String get deleteSoleOwner =>
      'Siz biznesning yagona egasisiz. Biznes saytdan olinadi, aksiyalari to‘xtaydi va faol kodlar bekor qilinadi. Biznesni yopib, hisobni o‘chirasizmi?';

  @override
  String get deleteCloseAndDelete => 'Biznesni yopib, o‘chirish';

  @override
  String get deleted => 'Hisob o‘chirildi';

  @override
  String appVersion(String version) {
    return 'Versiya $version';
  }

  @override
  String get reportTitle => 'Shikoyat';

  @override
  String get reportReason => 'Sababni tanlang';

  @override
  String get reportComment => 'Izoh (ixtiyoriy)';

  @override
  String get reportSend => 'Yuborish';

  @override
  String get reportThanks => 'Rahmat! Moderator ko‘rib chiqadi.';

  @override
  String get reasonWrongInfo => 'Noto‘g‘ri ma’lumot';

  @override
  String get reasonScam => 'Firibgarlik';

  @override
  String get reasonOffensive => 'Haqorat yoki nomaqbul kontent';

  @override
  String get reasonProhibited => 'Taqiqlangan mahsulot yoki xizmat';

  @override
  String get reasonSpam => 'Spam';

  @override
  String get reasonOther => 'Boshqa';

  @override
  String get cashierTitle => 'Kodni tekshirish';

  @override
  String get cashierChooseBusiness => 'Biznesni tanlang';

  @override
  String get cashierScanHint => 'Mijozning QR-kodini ramkaga to‘g‘rilang';

  @override
  String get cashierManual => 'Kodni qo‘lda kiriting';

  @override
  String get cashierCodeHint => 'Masalan, K7P 2QX';

  @override
  String get cashierCheck => 'Tekshirish';

  @override
  String get cashierValid => 'Kod haqiqiy';

  @override
  String get cashierCustomer => 'Mijoz';

  @override
  String get cashierConfirm => 'Tasdiqlash — kod ishlatildi';

  @override
  String get cashierDone => 'Kod ishlatildi';

  @override
  String get cashierNext => 'Keyingi mijoz';

  @override
  String get cameraDenied => 'Kameraga ruxsat berilmadi — kodni qo‘lda kiriting.';

  @override
  String get updateTitle => 'Ilovani yangilang';

  @override
  String get updateText => 'Bu versiya endi qo‘llab-quvvatlanmaydi. Play Market’dan yangilang.';

  @override
  String get updateAction => 'Yangilash';

  @override
  String get offline => 'Internet yo‘q — oxirgi ma’lumot ko‘rsatilmoqda';

  @override
  String get open => 'Ochish';

  @override
  String get homeForYouNone => 'Qiziqishlaringiz bo‘yicha hozircha aksiya yo‘q.';

  @override
  String get homeChange => 'O‘zgartirish';

  @override
  String dealStartsAt(String time) {
    return '$time dan boshlanadi';
  }

  @override
  String get dealSoldOut => 'Hammasi band qilindi';

  @override
  String get dealEnded => 'Aksiya tugagan';

  @override
  String get dealNotStarted => 'Aksiya hali boshlanmagan';

  @override
  String get endsInLabel => 'Tugashiga:';

  @override
  String get unblocked => 'Biznes blokdan chiqarildi';

  @override
  String followers(String count) {
    return '$count obunachi';
  }

  @override
  String get blockedNote => 'Siz bu biznesni bloklagansiz — uning aksiyalari sizga ko‘rsatilmaydi.';

  @override
  String get website => 'Sayt';

  @override
  String get codeOpenDeal => 'Aksiyani ochish';

  @override
  String get profileSettings => 'Sozlamalar';

  @override
  String get notifyTurnOn => 'Yoqish';

  @override
  String get profileForBusiness => 'Biznes uchun';

  @override
  String get profileBusinessHint => 'Aksiyalar, filiallar va jamoa saytda boshqariladi';

  @override
  String get profileAbout => 'Ma’lumot';

  @override
  String get cashierBadCode => 'Kod noto‘g‘ri. 6 ta belgini tekshiring.';

  @override
  String get cashierNoBusiness => 'Kodlarni faqat tasdiqlangan biznes xodimlari tekshira oladi.';

  @override
  String get homeSamplesNote =>
      'Bu hududda hozircha namuna aksiyalar: ular ilova qanday ishlashini ko‘rsatadi. Haqiqiy aksiyalar paydo bo‘lishi bilan shu yerda chiqadi.';

  @override
  String get bizJoinTitle => 'Biznesingizni BugunBor’ga qo‘shing';

  @override
  String get bizJoinText => 'Asosiy ma’lumotni kiriting — tekshiruvdan so‘ng aksiya joylay olasiz.';

  @override
  String get bizJoinLogin => 'Biznes qo‘shish uchun Telegram orqali kiring — biznes hisobingizga bog‘lanadi.';

  @override
  String get bizName => 'Biznes nomi';

  @override
  String get bizNameHint => 'Masalan, Oqtepa Lavash';

  @override
  String get bizCategory => 'Kategoriya';

  @override
  String get bizCity => 'Shahar';

  @override
  String get bizPhone => 'Telefon';

  @override
  String get bizAddress => 'Asosiy filial manzili';

  @override
  String get bizAddressHint => 'Masalan: Chilonzor 9-kvartal, 12-uy';

  @override
  String get bizAddressNote => 'Mo‘ljalni ham yozing — mijoz oson topadi (masalan, «Korzinka yonida»).';

  @override
  String get bizHours => 'Ish vaqti';

  @override
  String get bizOpens => 'Ochiladi';

  @override
  String get bizCloses => 'Yopiladi';

  @override
  String get bizDescription => 'Qisqa tavsif';

  @override
  String get bizDescriptionHint => 'Mijozlarga biznesingiz haqida aniq va tabiiy yozing…';

  @override
  String get bizTemplate => 'Namuna matn';

  @override
  String get bizTemplateAsk => 'Yozilgan tavsif namuna bilan almashtirilsinmi?';

  @override
  String get bizTemplateHint => 'Namunani o‘zingizga moslab o‘zgartiring.';

  @override
  String bizTplFood(String name) {
    return '$name — milliy va yevropa taomlari. Har kuni yangi tayyorlangan taomlar va samimiy xizmat. Tushlik va kechki ovqatga kutib qolamiz.';
  }

  @override
  String bizTplCoffee(String name) {
    return '$name — kofe, choy va shirinliklar. Do‘stlar bilan uchrashish yoki dam olish uchun shinam joy.';
  }

  @override
  String bizTplShop(String name) {
    return '$name — sifatli mahsulotlar va qulay narxlar. Tanlashda yordam beramiz, yangi mahsulotlar muntazam keladi.';
  }

  @override
  String bizTplBeauty(String name) {
    return '$name — go‘zallik va parvarish xizmatlari. Tajribali ustalar va sifatli vositalar bilan ishlaymiz.';
  }

  @override
  String bizTplSport(String name) {
    return '$name — sport va sog‘lom turmush uchun joy. Mashg‘ulotlar yangi boshlovchilar va tajribali sportchilar uchun.';
  }

  @override
  String bizTplFun(String name) {
    return '$name — do‘stlar va oila bilan maroqli vaqt o‘tkazish uchun joy. Sizni quvnoq dam olishga taklif qilamiz.';
  }

  @override
  String bizTplServices(String name) {
    return '$name — kundalik xizmatlarni tez va sifatli bajaramiz. Narxni oldindan aniq aytamiz.';
  }

  @override
  String bizTplDelivery(String name) {
    return '$name — buyurtmalarni tez va o‘z vaqtida yetkazib beramiz. Buyurtma berish oson.';
  }

  @override
  String bizTplDefault(String name) {
    return '$name — sifatli mahsulot va samimiy xizmat. Bizga tashrif buyuring!';
  }

  @override
  String bizCounter(String count, String max) {
    return '$count / $max';
  }

  @override
  String get bizMore => 'Telegram, Instagram va sayt (ixtiyoriy)';

  @override
  String get bizHandleHint => 'username (@ siz)';

  @override
  String bizMyTelegram(String username) {
    return 'Mening Telegramim: @$username';
  }

  @override
  String get bizLocate => 'Joylashuvimni aniqlash';

  @override
  String get bizLocating => 'Aniqlanmoqda…';

  @override
  String bizLocated(String city) {
    return 'Joylashuv aniqlandi: $city. Xaritadagi nuqta saqlanadi.';
  }

  @override
  String get bizLocateFailed => 'Joylashuvni aniqlab bo‘lmadi — shaharni ro‘yxatdan tanlang.';

  @override
  String get bizLocateNote => 'Biznes joyida turgan bo‘lsangiz bosing — mijozlar sizni xaritada va «Yaqinimda» bo‘limida topadi.';

  @override
  String get bizSubmit => 'Tekshiruvga yuborish';

  @override
  String get bizSubmitting => 'Yuborilmoqda…';

  @override
  String get bizConsent => 'Yuborish orqali ma’lumotlar tekshirilishiga rozilik bildirasiz. Biznes tasdiqlanmaguncha ochiq e’lon qilinmaydi.';

  @override
  String get bizFixErrors => 'Belgilangan maydonlarni tekshiring.';

  @override
  String get bizLimit => 'Bitta hisobdan ko‘pi bilan 5 ta biznes qo‘shish mumkin.';

  @override
  String get bizSentTitle => 'Ariza yuborildi';

  @override
  String get bizVerifiedTitle => 'Biznesingiz tasdiqlandi!';

  @override
  String get bizVerifiedText => 'Endi birinchi aksiyani joylang — mijozlar uni ilovada va saytda ko‘radi.';

  @override
  String get bizPendingText =>
      'Moderator arizani ko‘rib chiqadi (odatda 24 soat ichida). Tasdiqlangach biznesingiz hammaga ko‘rinadi — aksiyalarni hozirdan tayyorlab qo‘yishingiz mumkin.';

  @override
  String get bizOpenProfile => 'Biznes profiliga o‘tish';

  @override
  String get bizAddFirstDeal => 'Birinchi aksiyani qo‘shish';

  @override
  String valTooShort(String min) {
    return 'Kamida $min ta belgi';
  }

  @override
  String valTooLong(String max) {
    return 'Ko‘pi bilan $max ta belgi';
  }

  @override
  String get valInvalid => 'Noto‘g‘ri qiymat';

  @override
  String get valPhone => 'Raqamni +998 90 123 45 67 ko‘rinishida kiriting';

  @override
  String get valTime => 'Vaqtni tanlang';

  @override
  String get valChoose => 'Birini tanlang';

  @override
  String get bizProfileTitle => 'Biznes profili';

  @override
  String get modeBusiness => 'Biznes';

  @override
  String get modePersonal => 'Shaxsiy';

  @override
  String get bizStatusVerified => 'Tasdiqlangan';

  @override
  String get bizStatusPending => 'Tekshiruvda';

  @override
  String get bizStatusRejected => 'Rad etilgan';

  @override
  String get bizStatusSuspended => 'To‘xtatilgan';

  @override
  String get roleOwner => 'Egasi';

  @override
  String get roleManager => 'Menejer';

  @override
  String get roleCashier => 'Kassir';

  @override
  String get bizPendingNote =>
      'Biznesingizni moderator ko‘rib chiqmoqda (odatda 24 soat ichida). Tasdiqlangach aksiyalaringiz ko‘rinadi — ularni hozir tayyorlab qo‘yishingiz mumkin.';

  @override
  String bizRejectedNote(String reason) {
    return 'Biznes rad etildi: $reason';
  }

  @override
  String get bizRejectedFix => 'Saytda tuzatib, qayta yuborish';

  @override
  String get bizSuspendedNote => 'Biznes vaqtincha to‘xtatilgan — aksiyalari ko‘rinmaydi. Savol bo‘lsa, biz bilan bog‘laning.';

  @override
  String get bizQuick => 'Tezkor amallar';

  @override
  String get bizAddDeal => 'Aksiya qo‘shish';

  @override
  String get bizViewPage => 'Biznes sahifasi';

  @override
  String get bizAddAnother => 'Yana biznes qo‘shish';

  @override
  String get bizStats => 'Statistika';

  @override
  String get statLive => 'Faol aksiyalar';

  @override
  String get statClaimsToday => 'Bugun band qilindi';

  @override
  String get statRedeemedToday => 'Bugun ishlatildi';

  @override
  String get statViews => 'Ko‘rishlar';

  @override
  String get statFollowers => 'Obunachilar';

  @override
  String get statRating => 'Reyting';

  @override
  String get bizSetupTitle => 'Profilni to‘ldiring';

  @override
  String bizSetupProgress(String done, String total) {
    return '$done / $total bajarildi';
  }

  @override
  String get bizSetupHint => 'To‘liq profil mijozlar ishonchini oshiradi — aksiyalaringiz ko‘proq ko‘riladi.';

  @override
  String get setupLogo => 'Logotip yuklang';

  @override
  String get setupCover => 'Muqova rasmini yuklang';

  @override
  String get setupDescription => 'Tavsifni batafsilroq yozing (kamida 80 belgi)';

  @override
  String get setupContacts => 'Telegram yoki Instagram qo‘shing';

  @override
  String get setupLocation => 'Filialni xaritada belgilang';

  @override
  String get setupDeal => 'Birinchi aksiyani joylang';

  @override
  String get bizRecent => 'So‘nggi kodlar';

  @override
  String get bizRecentEmpty => 'Hali kod olinmagan.';

  @override
  String get bizCashierOnly => 'Siz bu biznesda kassirsiz: mijozlarning kodlarini tekshirasiz.';

  @override
  String get promoTitle => 'Biznesingiz bormi? Ko‘proq soting';

  @override
  String get promoText => 'BugunBor’ga qo‘shing — aksiyangizni yaqin atrofdagi xaridorlar ko‘radi va kod bilan to‘g‘ri sizga keladi.';

  @override
  String get promoPoint1 => 'Yaqin atrofdagi xaridorlar sizni topadi';

  @override
  String get promoPoint2 => 'Obunachilar yangi aksiyangizdan xabar topadi';

  @override
  String get promoPoint3 => 'Natijani ko‘rasiz: band qilingan va ishlatilgan kodlar';

  @override
  String get promoPoint4 => 'Ro‘yxatdan o‘tish bepul — bir necha daqiqa';

  @override
  String get promoAction => 'Biznesimni qo‘shish';

  @override
  String get promoHide => 'Yashirish';

  @override
  String get bizDiscardAsk => 'Kiritilgan ma’lumotlar saqlanmaydi. Chiqasizmi?';

  @override
  String get bizDiscard => 'Chiqish';
}
