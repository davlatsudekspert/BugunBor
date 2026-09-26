import { RETENTION } from '@/lib/retention';
import { SESSION_DAYS } from '@/modules/auth/sessions';

// The privacy policy (/privacy) in Uzbek, Russian and English. It describes
// only what the code really does: every data field, cookie, service and
// retention period below was checked against the code, and the retention
// numbers come from the same constants the cleanup jobs use.
//
// Operator details are exactly what the operator confirmed (2026-09-26); a
// missing value would render as a highlighted [TO'LDIRISH KERAK: …] marker.
// JShShIR, passport number and home address never go on the site.

export const PRIVACY_LOCALES = ['uz', 'ru', 'en'] as const;
export type PrivacyLocale = (typeof PRIVACY_LOCALES)[number];

export const isPrivacyLocale = (value: unknown): value is PrivacyLocale =>
  typeof value === 'string' && (PRIVACY_LOCALES as readonly string[]).includes(value);

/** The text's date. Each user's consent is stored with the version they accepted. */
export const PRIVACY_VERSION = '2026-09-26';

/** Minutes a Telegram login request stays open (modules/auth/login.ts LOGIN_TTL_MINUTES). */
export const LOGIN_REQUEST_MINUTES = 10;

type Localized = Record<PrivacyLocale, string>;

export type PrivacyDetails = {
  /** Who the operator is: name, registration and region (never a home address). */
  operator: Localized | null;
  /** The person responsible for processing personal data, with their position. */
  officer: Localized | null;
  email: string | null;
  /** Cloudflare dashboard → D1 → the database → Location. */
  databaseLocation: Localized | null;
  minAge: number | null;
};

export const PRIVACY_DETAILS: PrivacyDetails = {
  operator: {
    uz: 'yakka tartibdagi tadbirkor Abduraxmonova Shaxnozaxon Xasanboyevna (Andijon viloyati, Shahrixon tumani; YATT sifatida davlat ro‘yxatidan o‘tkazilgan: 08.10.2025, № 7199859)',
    ru: 'индивидуальный предприниматель Abduraxmonova Shaxnozaxon Xasanboyevna (Андижанская область, Шахриханский район; зарегистрирована как индивидуальный предприниматель 08.10.2025, № 7199859)',
    en: 'Abduraxmonova Shaxnozaxon Xasanboyevna, an individual entrepreneur registered on 8 October 2025 under No. 7199859 (Shahrixon district, Andijan region, Uzbekistan)',
  },
  officer: {
    uz: 'Abduraxmonov Yo‘ldoshali Toshtemirovich, sayt ma’muri',
    ru: 'Abduraxmonov Yo‘ldoshali Toshtemirovich, администратор сайта',
    en: 'Abduraxmonov Yo‘ldoshali Toshtemirovich, site administrator',
  },
  email: 'davlatsudekspert@gmail.com',
  databaseLocation: {
    uz: 'Sharqiy Yevropa (Cloudflare D1 «Eastern Europe» mintaqasi)',
    ru: 'Восточная Европа (регион Cloudflare D1 «Eastern Europe»)',
    en: 'Eastern Europe (Cloudflare D1 “Eastern Europe” region)',
  },
  minAge: 16,
};

type Required = keyof PrivacyDetails;

export const MISSING_LABELS: Record<Required, string> = {
  operator: 'operator — YATT F.I.Sh., ro‘yxatdan o‘tganlik ma’lumoti va hudud (uy manzili emas)',
  officer: 'ma’lumotlarga ishlov berish uchun mas’ul shaxs — F.I.Sh. va lavozimi',
  email: 'aloqa emaili',
  databaseLocation: 'ma’lumotlar bazasi mintaqasi (Cloudflare → D1 → baza → Location)',
  minAge: 'yosh chegarasi — 16 yoki 18',
};

export const PLACEHOLDER = /\[TO'LDIRISH KERAK: [^\]]*\]/g;
const missing = (key: Required) => `[TO'LDIRISH KERAK: ${MISSING_LABELS[key]}]`;

/** What still has to come from the operator before the text is final. */
export function missingDetails(details: PrivacyDetails = PRIVACY_DETAILS) {
  return (Object.keys(MISSING_LABELS) as Required[]).filter((key) => details[key] === null).map((key) => MISSING_LABELS[key]);
}

export type PrivacySection = { id: string; title: string; paragraphs?: string[]; items?: string[]; after?: string };
export type PrivacyPolicy = { title: string; updated: string; intro: string; contents: string; sections: PrivacySection[] };

export const LANGUAGE_NAMES: Localized = { uz: 'O‘zbekcha', ru: 'Русский', en: 'English' };

const MONTHS: Record<PrivacyLocale, string[]> = {
  uz: ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'],
  ru: ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
};

function versionDate(locale: PrivacyLocale) {
  const [year, month, day] = PRIVACY_VERSION.split('-').map(Number);
  const name = MONTHS[locale][month - 1];
  if (locale === 'uz') return `${year}-yil ${day}-${name}`;
  if (locale === 'ru') return `${day} ${name} ${year} г.`;
  return `${day} ${name} ${year}`;
}

export function privacyPolicy(locale: PrivacyLocale, details: PrivacyDetails = PRIVACY_DETAILS): PrivacyPolicy {
  const pick = (key: 'operator' | 'officer' | 'databaseLocation') => details[key]?.[locale] ?? missing(key);
  const d = {
    operator: pick('operator'),
    officer: pick('officer'),
    email: details.email ?? missing('email'),
    region: pick('databaseLocation'),
    age: details.minAge === null ? missing('minAge') : String(details.minAge),
  };
  const r = { session: SESSION_DAYS, login: LOGIN_REQUEST_MINUTES, notices: RETENTION.notificationDays, logs: RETENTION.logYears };
  if (locale === 'ru') return ru(d, r);
  if (locale === 'en') return en(d, r);
  return uz(d, r);
}

type Values = { operator: string; officer: string; email: string; region: string; age: string };
type Periods = { session: number; login: number; notices: number; logs: number };

function uz(d: Values, r: Periods): PrivacyPolicy {
  return {
    title: 'Maxfiylik siyosati',
    updated: `Oxirgi yangilanish: ${versionDate('uz')}`,
    contents: 'Mundarija',
    intro: 'Ushbu siyosat bugunbor.uz sayti (keyingi o‘rinlarda — BugunBor) qanday ma’lumot yig‘ishi, nima uchun ishlatishi, kimga yuborishi va qanday saqlashini tushuntiradi. BugunBor — bizneslar chegirma va aksiyalarini e’lon qiladigan, mijozlar esa ularni band qilib, joyida bir martalik kod bilan oladigan platforma.',
    sections: [
      { id: 'operator', title: 'Operator', paragraphs: [
        `Shaxsga doir ma’lumotlar operatori va ma’lumotlar bazasining egasi — ${d.operator}. Ma’lumotlarga ishlov berish uchun mas’ul shaxs — ${d.officer}. Murojaat uchun: ${d.email}.`,
      ] },
      { id: 'collect', title: 'Qanday ma’lumot yig‘amiz', items: [
        'Hisob: tizimga Telegram orqali kirasiz. Telegram ID raqamingiz, foydalanuvchi nomingiz (bo‘lsa), Telegram’dagi ism va familiyangiz, Telegram tasdiqlagan telefon raqamingiz (kontaktni botga o‘zingiz yuborasiz) va interfeys tili. Parol va elektron pochta so‘ralmaydi.',
        'Profil: ko‘rinadigan ismingiz, interfeys tili, Telegram xabarnomalari sozlamalari, oxirgi kirish vaqti, rozilik bergan vaqtingiz va siyosat tahriri.',
        'Ilova (Android): ilova versiyasi, xabarnomalar uchun qurilma tokeni (Firebase Cloud Messaging), tanlagan qiziqishlaringiz (kategoriyalar), bloklagan bizneslaringiz va — «Yaqin atrofdagi yangi aksiyalar» xabarnomasini yoqsangiz — taxminiy hududingiz (taxminan 1 km aniqlikda).',
        'Aksiyalardan foydalanish: band qilgan aksiyalaringiz va bir martalik kodlaringiz (kodning o‘zi bazada ochiq holda saqlanmaydi), kod qaysi filialda va qachon ishlatilgani, saqlangan aksiyalar, obuna bo‘lgan bizneslaringiz, qoldirgan baho va sharhlaringiz.',
        'Biznes egalari va xodimlari: biznes nomi, tavsifi va toifasi, logotip va rasmlar, telefon, Telegram, Instagram va sayt havolalari, filiallar manzili, xaritadagi nuqtasi, telefoni va ish vaqti, aksiyalar, jamoa a’zolari (mavjud foydalanuvchi telefon raqami orqali qo‘shiladi) va ularning roli, tarif so‘rovlari va to‘lov yozuvlari (tariflar ochilganda).',
        'Murojaatlar: «Bog‘lanish» sahifasi orqali yuborgan xabaringiz — ismingiz, javob uchun telefon, Telegram yoki email, mavzu va matn.',
        'Texnik: IP-manzil — faqat qaytarib bo‘lmaydigan xesh ko‘rinishida (xavfsizlik va urinishlarni cheklash uchun), brauzer va qurilma turi (user-agent), kirish va sessiya vaqtlari, muhim amallar jurnali.',
      ], after: 'Pasport ma’lumotlari, JShShIR, biometrik va genetik ma’lumotlar so‘ralmaydi va yig‘ilmaydi. Bank kartasi ma’lumotlari bizga kelmaydi — to‘lov Payme yoki Click sahifasida qilinadi.' },
      { id: 'purpose', title: 'Nima uchun ishlatamiz', paragraphs: [
        'Hisobingizga kirish va uni himoya qilish; aksiyalarni ko‘rsatish va band qilish, kod berish va uni kassada tekshirish; ilovada qiziqishlaringiz va joylashuvingizga mos aksiyalarni ko‘rsatish; obuna bo‘lgan bizneslaringizning yangi aksiyalari, kod muddati tugashi, kod ishlatilgani va (yoqsangiz) yaqin atrofdagi yangi aksiyalar haqida Telegram yoki ilova xabarnomalari (har birini sozlamalarda o‘chirib qo‘yish mumkin); biznes kabineti va jamoa ishini ta’minlash; e’lon va sharhlarni tekshirish (moderatsiya), firibgarlik va suiiste’molning oldini olish; murojaatlarga javob berish; tariflar ochilganda to‘lovlarni hisobga olish.',
        'Ma’lumotlar sotilmaydi va reklama uchun ishlatilmaydi. Saytda reklama, kuzatuv va analitika skriptlari yo‘q; aksiya ko‘rishlari faqat umumiy son sifatida sanaladi — kim ko‘rgani yozilmaydi.',
      ] },
      { id: 'public', title: 'Ommaviy ma’lumot', paragraphs: [
        'Biznes profili (nomi, tavsifi, rasmlari, filiallari manzili, xaritadagi nuqtasi, ish vaqti, telefon va ijtimoiy tarmoq havolalari) va aksiyalar saytda hammaga ko‘rinadi. Sharhingiz ismingizning qisqa shakli bilan chiqadi (masalan, «Aziza K.»).',
        'Kodni tekshirayotgan biznes xodimi ismingizni va telefon raqamingizning yashirilgan qismini (+998 90 *** ** 67) ko‘radi; biznes egasi va xodimlari o‘z aksiyalari bo‘yicha kodlar ro‘yxatida ismingizni ko‘radi. Telefon raqamingiz, Telegram ma’lumotlaringiz, saqlangan aksiyalar va obunalaringiz boshqa foydalanuvchilarga ko‘rsatilmaydi.',
      ] },
      { id: 'photos', title: 'Rasmlar va avtomatik tekshiruv', paragraphs: [
        'Biznes logotipi, muqovasi va aksiya rasmlari yuklashdan oldin brauzeringizning o‘zida qayta chiziladi va siqiladi — bunda fayl ichidagi yashirin ma’lumotlar (masalan, suratga olingan joy koordinatalari) olib tashlanadi. Rasmlar serverimizda saqlanadi va biznes sahifasida hammaga ko‘rinadi; hech qayerda ishlatilmayotgan rasm 1 kun ichida o‘chiriladi.',
        'Yangi biznes, aksiya va sharhlar matni avtomatik tekshiriladi (havola, taqiqlangan mavzu, karta raqami, haqoratli so‘z, shubhali narx). Tekshiruv o‘z serverimizda bajariladi — matn va rasmlar tashqi xizmat yoki sun’iy intellektga yuborilmaydi. Avtomatik tekshiruv hech narsani rad etmaydi: toza e’lon darhol chiqadi, shubhalisini moderator ko‘rib chiqadi; haqoratli so‘z topilgan sharh avtomatik yashiriladi.',
      ] },
      { id: 'location', title: 'Joylashuv', paragraphs: [
        '«Yaqinimdagilar» tugmasini bossangiz, brauzer ruxsat so‘raydi. Ruxsat bersangiz, joylashuvingiz taxminan 100 metrgacha yaxlitlanib, faqat aksiyalarni masofa bo‘yicha saralash uchun serverga yuboriladi va bazaga yozilmaydi. Joylashuv fonda olinmaydi.',
        'Ilovada joylashuv faqat ilova ochiq turganda va ruxsatingizdan keyin olinadi, yaqin aksiyalarni saralash uchun ishlatiladi va bazaga yozilmaydi. «Yaqin atrofdagi yangi aksiyalar» xabarnomasini yoqsangiz, ilovani ochgan paytingizdagi taxminiy hudud (≈1 km) faqat shu xabarnoma uchun saqlanadi; xabarnomani o‘chirsangiz, u darhol o‘chiriladi. Fonda joylashuv olinmaydi.',
        'Biznes kabinetidagi «Joylashuvimni aniqlash» tugmasi filialning xaritadagi nuqtasini to‘ldiradi — bu nuqta mijozlar yo‘l topishi uchun ommaviy. «Yo‘l ko‘rsatish» tugmasi Google Xaritalar’ni ochadi: bunda filial manzili Google’ga uzatiladi va Google o‘z maxfiylik siyosatiga ko‘ra ishlaydi.',
      ] },
      { id: 'cookies', title: 'Cookie va brauzer xotirasi', items: [
        `bb_session — tizimga kirganingizni eslab qoladi, ${r.session} kun; sahifadagi skriptlar uni o‘qiy olmaydi.`,
        `bb_login — Telegram orqali kirish so‘rovini shu brauzerga bog‘laydi, ${r.login} daqiqa.`,
        'bb_locale — tanlangan til, 1 yil.',
        'bb_city — tanlangan shahar, 1 yil.',
        'bb_business — biznes kabinetida tanlangan biznes, 1 yil.',
        'Brauzer xotirasi: bitta aksiya ko‘rishini qayta sanamaslik uchun vaqtinchalik belgi (brauzer yorlig‘i yopilganda o‘chadi) hamda sayt tez ochilishi va internet bo‘lmaganda xabar ko‘rsatishi uchun sayt fayllari keshi. Sahifalar va shaxsiy ma’lumotlar keshga yozilmaydi.',
        'Ilova: sessiya kaliti telefonning himoyalangan xotirasida saqlanadi (zaxira nusxaga tushmaydi); til, shahar va qiziqishlar kabi sozlamalar va rasmlar keshi telefonning o‘zida.',
      ], after: 'Reklama, kuzatuv va analitika cookie’lari ishlatilmaydi. Cookie’larni brauzer sozlamalarida o‘chirishingiz mumkin, ammo unda tizimga kira olmaysiz.' },
      { id: 'services', title: 'Ma’lumot yuboriladigan xizmatlar', items: [
        'Cloudflare, Inc. — sayt serveri, ma’lumotlar bazasi, rasmlarni saqlash va sahifalar keshi.',
        'Telegram — kirish tasdig‘i va xabarnomalar: botimiz sizga Telegram ID raqamingiz orqali xabar yuboradi (xabarda aksiya nomi, manzil, kod muddati kabi ma’lumotlar bo‘ladi).',
        'Google Firebase Cloud Messaging — ilova xabarnomalarini telefoningizga yetkazish: qurilma tokeni va xabar matni uzatiladi. Ilovani o‘rnatgan bo‘lsangiz, xabarnoma Telegram o‘rniga ilovaga keladi.',
        'Payme va Click — faqat tariflar ochilganda, biznes tarifini to‘lash uchun: to‘lov sahifasiga buyurtma raqami va summa uzatiladi, karta ma’lumotlarini faqat to‘lov tizimi ko‘radi. Hozircha tariflar yopiq va onlayn to‘lov o‘chiq.',
        'Google Xaritalar — faqat «Yo‘l ko‘rsatish» tugmasini bosganingizda (filial manzili uzatiladi).',
      ], after: 'Cloudflare va Firebase ma’lumotni faqat bizning topshirig‘imiz bilan va faqat shu maqsadlarda qayta ishlaydi; Telegram, Payme, Click va Google esa ularning xizmatidan foydalanganingizda o‘z shartlari bo‘yicha ishlaydi. Elektron pochta, SMS, reklama, analitika yoki sun’iy intellekt xizmatlariga ma’lumot yuborilmaydi. Qonun talab qilgan holatlardan tashqari ma’lumot boshqa uchinchi shaxslarga berilmaydi.' },
      { id: 'age', title: 'Yosh cheklovi', paragraphs: [
        `BugunBor ${d.age} yoshga to‘lgan foydalanuvchilar uchun. Bu yoshga to‘lmagan bo‘lsangiz, ro‘yxatdan o‘tmang. Bunday hisob aniqlansa, u o‘chiriladi. Biznesni faqat uning egasi yoki vakolatli vakili ro‘yxatdan o‘tkazadi.`,
      ] },
      { id: 'security', title: 'Xavfsizlik', paragraphs: [
        'Ulanish shifrlangan (HTTPS). Parol yo‘q: kirish Telegram’dagi tasdiq va brauzerdagi 4 xonali kod bilan bo‘ladi. Sessiya kaliti, kirish so‘rovi va bir martalik kodlar bazada ochiq holda saqlanmaydi; IP-manzil ham faqat xesh ko‘rinishida yoziladi. Sessiya cookie’sini sahifadagi skriptlar o‘qiy olmaydi, boshqa saytlardan yuborilgan so‘rovlar rad etiladi, urinishlar soni cheklangan. Admin va moderatorlarning muhim amallari jurnalga yoziladi, ma’lumotlarga kirish xodimning vazifasiga qarab cheklangan.',
      ] },
      { id: 'retention', title: 'Saqlash muddati', items: [
        'Hisob va profil — hisobingiz faol ekan.',
        `Sessiyalar — ${r.session} kun; tugagan yoki yopilgan sessiya yozuvi 1 kun ichida o‘chiriladi.`,
        'Kirish so‘rovlari va urinishlar hisoblagichi — 24 soat ichida o‘chiriladi.',
        `Telegram xabarnomalari navbati — ${r.notices} kun.`,
        'Hech qayerda ishlatilmayotgan rasmlar — 1 kun.',
        'Ilova qurilma tokeni — ilovadan chiqquningizcha yoki hisob o‘chirilguncha; ishlamay qolgan token avtomatik o‘chiriladi. Qiziqishlar va bloklar — o‘zingiz o‘zgartirguningizcha. Xabarnoma hududi — xabarnomani o‘chirguningizcha.',
        'Biznes profili va aksiyalar — biznes faol ekan. Yopilgan biznes saytda ko‘rsatilmaydi; uning yozuvlari kodlar tarixi va hisob-kitob uchun saqlanadi. Biznes egasi aloqa ma’lumotlarini o‘chirishni «Hisobni va ma’lumotni o‘chirish» bo‘limidagi tartibda so‘rashi mumkin.',
        'Kodlar tarixi va baholar — hisob o‘chirilgandan keyin shaxsiy ma’lumotsiz (anonim) qoladi: bu bizneslar statistikasi uchun kerak.',
        'To‘lov va hisob-kitob yozuvlari — buxgalteriya va soliq qonunchiligida belgilangan muddat davomida.',
        `Xavfsizlik va amallar jurnali, moderatsiya tarixi hamda «Bog‘lanish» orqali kelgan murojaatlar — ${r.logs} yilgacha.`,
        'Zaxira nusxalar — o‘chirilgan ma’lumot zaxiradan 30 kun ichida yo‘qoladi.',
      ], after: 'Muddati tugagan yozuvlar avtomatik o‘chiriladi.' },
      { id: 'rights', title: 'Qonunchilik va huquqlaringiz', paragraphs: [
        'Shaxsga doir ma’lumotlaringiz O‘zbekiston Respublikasining 2019-yil 2-iyuldagi O‘RQ-547-son «Shaxsga doir ma’lumotlar to‘g‘risida»gi Qonuni (2026-yil 26-martdagi O‘RQ-1125-son Qonun bilan kiritilgan o‘zgartishlar bilan) asosida, ro‘yxatdan o‘tishda (tizimga kirishda) bergan roziligingiz bilan qayta ishlanadi.',
        'Siz o‘zingiz haqingizdagi ma’lumotni va u qanday qayta ishlanayotganini bilish, noto‘g‘ri ma’lumotni tuzattirish, uni o‘chirishni talab qilish, rozilikni qaytarib olish (bu hisobni o‘chirish bilan teng) hamda vakolatli davlat organiga — O‘zbekiston Respublikasi Adliya vazirligi huzuridagi Personallashtirish agentligiga shikoyat qilish huquqiga egasiz. So‘rovlarga 30 kun ichida javob beramiz.',
      ] },
      { id: 'disclosure', title: 'Ma’lumotni oshkor qilish', paragraphs: [
        'Ma’lumotlaringiz sotilmaydi va uchinchi shaxslarga berilmaydi. Istisno — qonunda nazarda tutilgan hollar: sud, tergov va boshqa vakolatli davlat organlarining rasmiylashtirilgan so‘roviga ma’lumot faqat so‘ralgan hajmda beriladi.',
      ] },
      { id: 'storage', title: 'Ma’lumotlar qayerda saqlanadi va chegaradan tashqariga uzatish', paragraphs: [
        `Ma’lumotlar bazasi va yuklangan rasmlar Cloudflare, Inc. (AQSh) serverlarida saqlanadi; bazaning mintaqasi — ${d.region}. Qonunning 27¹-moddasiga ko‘ra O‘zbekiston hududida saqlanishi majburiy bo‘lgan biometrik va genetik ma’lumotlar BugunBor tomonidan yig‘ilmaydi.`,
        'Boshqa ma’lumotlar Vazirlar Mahkamasining 2026-yil 29-iyuldagi 415-son qarori bilan tasdiqlangan, shaxsga doir ma’lumotlarning teng darajada himoyasini ta’minlovchi xorijiy davlatlar ro‘yxati asosida chet elda saqlanadi: AQSh bu ro‘yxatga EI–AQSh «Data Privacy Framework» dasturi ishtirokchilari uchun kiritilgan, Cloudflare esa shu dastur ishtirokchisi. Telegram va Google (Firebase) serverlari ham O‘zbekistondan tashqarida bo‘lishi mumkin; ularga faqat kirish va xabarnomalar uchun zarur ma’lumot uzatiladi. Ro‘yxatdan o‘tishda (tizimga kirishda) siz bunga rozilik berasiz.',
      ] },
      { id: 'deletion', title: 'Hisobni va ma’lumotni o‘chirish', paragraphs: [
        'Hisobingizni istalgan vaqtda o‘zingiz o‘chirishingiz mumkin: bugunbor.uz/delete-account sahifasida yoki saytga kirib → «Kabinet» (telefonda pastki menyuda «Profil») → «Hisobni o‘chirish». Hisob darhol o‘chiriladi: telefon raqamingiz, Telegram ma’lumotlaringiz va ismingiz o‘chiriladi, barcha sessiyalar yopiladi, faol kodlar bekor qilinadi, saqlangan aksiyalar, obunalar va xabarnomalar o‘chiriladi, sharhlaringiz matni olib tashlanadi (baho anonim qoladi), biznes jamoalaridan chiqarilasiz, ilova qurilmalari, qiziqishlar, bloklar va xabarnoma hududi o‘chiriladi. Kodlar tarixi bizneslar statistikasi uchun anonim holda qoladi. Ilovada ham: Profil → «Hisobni o‘chirish».',
        `Agar biznesning yagona egasi bo‘lsangiz, jamoaga boshqa egani qo‘shing yoki o‘chirishda biznesni ham yoping: u saytdan olinadi, aksiyalari to‘xtaydi va faol kodlar bekor qilinadi. Saytga kira olmasangiz, ${d.email} manziliga yoki «Bog‘lanish» sahifasi orqali yozing — so‘rovingizni 30 kun ichida bajaramiz.`,
      ] },
      { id: 'contact', title: 'Aloqa', paragraphs: [
        `Savollar va so‘rovlar uchun: ${d.email}. Saytdagi «Bog‘lanish» sahifasi orqali ham yozishingiz mumkin.`,
      ] },
    ],
  };
}

function ru(d: Values, r: Periods): PrivacyPolicy {
  return {
    title: 'Политика конфиденциальности',
    updated: `Последнее обновление: ${versionDate('ru')}`,
    contents: 'Содержание',
    intro: 'Эта политика объясняет, какие данные собирает сайт bugunbor.uz (далее — BugunBor), зачем они используются, кому передаются и как хранятся. BugunBor — платформа, где бизнесы публикуют скидки и акции, а покупатели бронируют их и получают на месте по одноразовому коду.',
    sections: [
      { id: 'operator', title: 'Оператор', paragraphs: [
        `Оператор персональных данных и владелец базы данных — ${d.operator}. Ответственный за обработку персональных данных — ${d.officer}. Для обращений: ${d.email}.`,
      ] },
      { id: 'collect', title: 'Какие данные мы собираем', items: [
        'Аккаунт: вход через Telegram. Ваш Telegram ID, имя пользователя (если есть), имя и фамилия в Telegram, номер телефона, подтверждённый Telegram (контакт вы сами отправляете боту), и язык интерфейса. Пароль и электронная почта не запрашиваются.',
        'Профиль: отображаемое имя, язык интерфейса, настройки уведомлений в Telegram, время последнего входа, время вашего согласия и версия политики.',
        'Приложение (Android): версия приложения, токен устройства для уведомлений (Firebase Cloud Messaging), выбранные интересы (категории), заблокированные вами бизнесы и — если вы включите уведомления «Новые акции рядом» — примерный район (с точностью около 1 км).',
        'Использование акций: забронированные акции и одноразовые коды (сам код в базе в открытом виде не хранится), где и когда код использован, сохранённые акции, бизнесы, на которые вы подписаны, ваши оценки и отзывы.',
        'Владельцы и сотрудники бизнеса: название, описание и категория бизнеса, логотип и фото, телефон, ссылки на Telegram, Instagram и сайт, адреса филиалов, точка на карте, телефон и часы работы, акции, участники команды (добавляются по номеру телефона существующего пользователя) и их роли, заявки на тариф и записи о платежах (когда тарифы открыты).',
        'Обращения: сообщение через страницу «Связаться» — имя, телефон, Telegram или email для ответа, тема и текст.',
        'Технические: IP-адрес — только в виде необратимого хеша (для безопасности и ограничения попыток), тип браузера и устройства (user-agent), время входа и сессий, журнал важных действий.',
      ], after: 'Паспортные данные, ПИНФЛ, биометрические и генетические данные не запрашиваются и не собираются. Данные банковской карты к нам не поступают — оплата проходит на странице Payme или Click.' },
      { id: 'purpose', title: 'Зачем мы их используем', paragraphs: [
        'Вход в аккаунт и его защита; показ и бронирование акций, выдача кода и его проверка на кассе; показ в приложении акций по вашим интересам и местоположению; уведомления в Telegram или в приложении о новых акциях бизнесов, на которые вы подписаны, об окончании срока кода, о его использовании и (если включено) о новых акциях рядом (каждое можно отключить в настройках); работа кабинета бизнеса и команды; проверка объявлений и отзывов (модерация), предотвращение мошенничества и злоупотреблений; ответы на обращения; учёт платежей, когда тарифы открыты.',
        'Данные не продаются и не используются для рекламы. На сайте нет рекламы, трекеров и скриптов аналитики; просмотры акций считаются только общим числом — кто смотрел, не записывается.',
      ] },
      { id: 'public', title: 'Публичные данные', paragraphs: [
        'Профиль бизнеса (название, описание, фото, адреса филиалов, точка на карте, часы работы, телефон и ссылки на соцсети) и акции видны всем на сайте. Ваш отзыв показывается с сокращённым именем (например, «Aziza K.»).',
        'Сотрудник бизнеса, проверяющий код, видит ваше имя и скрытый номер телефона (+998 90 *** ** 67); владелец и сотрудники бизнеса видят ваше имя в списке кодов по своим акциям. Ваш номер телефона, данные Telegram, сохранённые акции и подписки другим пользователям не показываются.',
      ] },
      { id: 'photos', title: 'Фото и автоматическая проверка', paragraphs: [
        'Логотип, обложка и фото акций перед загрузкой перерисовываются и сжимаются прямо в вашем браузере — при этом удаляются скрытые данные файла (например, координаты места съёмки). Фото хранятся на нашем сервере и видны всем на странице бизнеса; фото, которое нигде не используется, удаляется в течение 1 дня.',
        'Тексты новых бизнесов, акций и отзывов проверяются автоматически (ссылки, запрещённые темы, номера карт, оскорбления, подозрительные цены). Проверка выполняется на нашем сервере — тексты и фото не передаются внешним сервисам или искусственному интеллекту. Автоматическая проверка ничего не отклоняет: чистое объявление публикуется сразу, подозрительное смотрит модератор; отзыв с оскорблениями скрывается автоматически.',
      ] },
      { id: 'location', title: 'Геолокация', paragraphs: [
        'Когда вы нажимаете «Рядом со мной», браузер запрашивает разрешение. Если вы разрешите, местоположение округляется примерно до 100 метров и отправляется на сервер только для сортировки акций по расстоянию; в базу оно не записывается. В фоновом режиме геолокация не используется.',
        'В приложении местоположение берётся только когда приложение открыто и после вашего разрешения, используется для сортировки акций по расстоянию и в базу не записывается. Если вы включите уведомления «Новые акции рядом», примерный район (≈1 км) на момент открытия приложения хранится только для этих уведомлений и удаляется сразу, как только вы их отключите. В фоновом режиме местоположение не используется.',
        'Кнопка «Определить моё местоположение» в кабинете бизнеса заполняет точку филиала на карте — эта точка публична, чтобы покупатели нашли дорогу. Кнопка «Маршрут» открывает Google Карты: при этом адрес филиала передаётся Google, который действует по своей политике конфиденциальности.',
      ] },
      { id: 'cookies', title: 'Cookie и память браузера', items: [
        `bb_session — запоминает вход, ${r.session} дней; скрипты на странице не могут его прочитать.`,
        `bb_login — привязывает запрос входа через Telegram к этому браузеру, ${r.login} минут.`,
        'bb_locale — выбранный язык, 1 год.',
        'bb_city — выбранный город, 1 год.',
        'bb_business — выбранный бизнес в кабинете, 1 год.',
        'Память браузера: временная отметка, чтобы не считать повторно просмотр одной акции (удаляется при закрытии вкладки), и кеш файлов сайта для быстрой загрузки и сообщения при отсутствии интернета. Страницы и личные данные в кеш не записываются.',
        'Приложение: ключ сессии хранится в защищённом хранилище телефона (не попадает в резервные копии); настройки (язык, город, интересы) и кеш изображений — на самом телефоне.',
      ], after: 'Рекламные, трекинговые и аналитические cookie не используются. Cookie можно отключить в настройках браузера, но тогда войти не получится.' },
      { id: 'services', title: 'Сервисы, которым передаются данные', items: [
        'Cloudflare, Inc. — сервер сайта, база данных, хранение фото и кеш страниц.',
        'Telegram — подтверждение входа и уведомления: наш бот отправляет вам сообщения по вашему Telegram ID (в сообщении — название акции, адрес, срок кода и т. п.).',
        'Google Firebase Cloud Messaging — доставка уведомлений приложения на телефон: передаются токен устройства и текст уведомления. Если приложение установлено, уведомления приходят в него вместо Telegram.',
        'Payme и Click — только когда тарифы открыты, для оплаты тарифа бизнеса: на страницу оплаты передаются номер заказа и сумма, данные карты видит только платёжная система. Сейчас тарифы закрыты, онлайн-оплата выключена.',
        'Google Карты — только когда вы нажимаете «Маршрут» (передаётся адрес филиала).',
      ], after: 'Cloudflare и Firebase обрабатывают данные только по нашему поручению и только для этих целей; Telegram, Payme, Click и Google действуют по своим условиям, когда вы пользуетесь их сервисами. Данные не передаются сервисам электронной почты, SMS, рекламы, аналитики или искусственного интеллекта. Другим третьим лицам данные не передаются, кроме случаев, требуемых законом.' },
      { id: 'age', title: 'Возрастное ограничение', paragraphs: [
        `BugunBor предназначен для пользователей, которым исполнилось ${d.age} лет. Если вам меньше, не регистрируйтесь. Такой аккаунт при обнаружении удаляется. Зарегистрировать бизнес может только его владелец или уполномоченный представитель.`,
      ] },
      { id: 'security', title: 'Безопасность', paragraphs: [
        'Соединение зашифровано (HTTPS). Паролей нет: вход подтверждается в Telegram и 4-значным кодом в браузере. Ключ сессии, запрос входа и одноразовые коды не хранятся в базе в открытом виде; IP-адрес записывается только в виде хеша. Скрипты на странице не могут прочитать cookie сессии, запросы с чужих сайтов отклоняются, число попыток ограничено. Важные действия администраторов и модераторов записываются в журнал, доступ к данным ограничен обязанностями сотрудника.',
      ] },
      { id: 'retention', title: 'Срок хранения', items: [
        'Аккаунт и профиль — пока аккаунт активен.',
        `Сессии — ${r.session} дней; запись о завершённой или закрытой сессии удаляется в течение 1 дня.`,
        'Запросы входа и счётчики попыток — удаляются в течение 24 часов.',
        `Очередь уведомлений Telegram — ${r.notices} дней.`,
        'Неиспользуемые фото — 1 день.',
        'Токен устройства приложения — пока вы не выйдете из приложения или не удалите аккаунт; нерабочий токен удаляется автоматически. Интересы и блокировки — пока вы их не измените. Район для уведомлений — пока вы не отключите уведомления.',
        'Профиль бизнеса и акции — пока бизнес активен. Закрытый бизнес на сайте не показывается; его записи сохраняются для истории кодов и расчётов. Владелец может запросить удаление контактных данных бизнеса в порядке, описанном в разделе «Удаление аккаунта и данных».',
        'История кодов и оценки — после удаления аккаунта остаются без личных данных (анонимно): это нужно для статистики бизнесов.',
        'Записи о платежах и расчётах — в течение срока, установленного законодательством о бухгалтерии и налогах.',
        `Журнал безопасности и действий, история модерации и обращения через «Связаться» — до ${r.logs} лет.`,
        'Резервные копии — удалённые данные исчезают из резервных копий в течение 30 дней.',
      ], after: 'Записи с истёкшим сроком удаляются автоматически.' },
      { id: 'rights', title: 'Законодательство и ваши права', paragraphs: [
        'Ваши персональные данные обрабатываются на основании Закона Республики Узбекистан от 2 июля 2019 года № ЗРУ-547 «О персональных данных» (с изменениями, внесёнными Законом от 26 марта 2026 года № ЗРУ-1125) и согласия, которое вы даёте при регистрации (входе).',
        'Вы вправе знать, какие данные о вас есть и как они обрабатываются, требовать исправления неверных данных, требовать их удаления, отозвать согласие (это равносильно удалению аккаунта) и подать жалобу в уполномоченный государственный орган — Агентство персонализации при Министерстве юстиции Республики Узбекистан. Мы отвечаем на запросы в течение 30 дней.',
      ] },
      { id: 'disclosure', title: 'Раскрытие данных', paragraphs: [
        'Ваши данные не продаются и не передаются третьим лицам. Исключение — случаи, предусмотренные законом: по оформленному запросу суда, следствия и других уполномоченных государственных органов данные предоставляются только в запрошенном объёме.',
      ] },
      { id: 'storage', title: 'Где хранятся данные и трансграничная передача', paragraphs: [
        `База данных и загруженные фото хранятся на серверах Cloudflare, Inc. (США); регион базы данных — ${d.region}. Биометрические и генетические данные, которые по статье 27¹ Закона обязательно хранятся на территории Узбекистана, BugunBor не собирает.`,
        'Остальные данные хранятся за рубежом на основании перечня иностранных государств, обеспечивающих равноценную защиту персональных данных, утверждённого постановлением Кабинета Министров от 29 июля 2026 года № 415: США включены в перечень для участников программы EU–U.S. Data Privacy Framework, а Cloudflare — её участник. Серверы Telegram и Google (Firebase) также могут находиться за пределами Узбекистана; им передаются только данные, необходимые для входа и уведомлений. При регистрации (входе) вы даёте на это согласие.',
      ] },
      { id: 'deletion', title: 'Удаление аккаунта и данных', paragraphs: [
        'Удалить аккаунт можно в любой момент самостоятельно: на странице bugunbor.uz/delete-account или войдя на сайт → «Кабинет» (на телефоне в нижнем меню — «Профиль») → «Удалить аккаунт». Аккаунт удаляется сразу: номер телефона, данные Telegram и имя стираются, все сессии закрываются, активные коды отменяются, сохранённые акции, подписки и уведомления удаляются, текст ваших отзывов убирается (оценка остаётся анонимно), вы выходите из команд бизнесов, удаляются устройства приложения, интересы, блокировки и район для уведомлений. История кодов остаётся анонимно для статистики бизнесов. В приложении: Профиль → «Удалить аккаунт».',
        `Если вы единственный владелец бизнеса, добавьте в команду другого владельца или закройте бизнес вместе с аккаунтом: он исчезнет с сайта, акции остановятся, активные коды будут отменены. Если не можете войти на сайт, напишите на ${d.email} или через страницу «Связаться» — мы выполним запрос в течение 30 дней.`,
      ] },
      { id: 'contact', title: 'Контакты', paragraphs: [
        `Вопросы и запросы: ${d.email}. Также можно написать через страницу «Связаться» на сайте.`,
      ] },
    ],
  };
}

function en(d: Values, r: Periods): PrivacyPolicy {
  return {
    title: 'Privacy Policy',
    updated: `Last updated: ${versionDate('en')}`,
    contents: 'Contents',
    intro: 'This policy explains what data the bugunbor.uz website (BugunBor) collects, why, who it is sent to and how it is kept. BugunBor is a platform where businesses publish discounts and deals, and customers reserve them and get them on the spot with a one-time code. The site itself is in Uzbek and Russian; button names are given in Uzbek.',
    sections: [
      { id: 'operator', title: 'Operator', paragraphs: [
        `The personal data operator and owner of the database is ${d.operator}. The person responsible for processing personal data is ${d.officer}. Contact: ${d.email}.`,
      ] },
      { id: 'collect', title: 'What data we collect', items: [
        'Account: you sign in with Telegram. Your Telegram ID, username (if any), first and last name in Telegram, the phone number verified by Telegram (you send your contact to our bot yourself) and interface language. No password or email is requested.',
        'Profile: display name, interface language, Telegram notification settings, last sign-in time, the time of your consent and the policy version.',
        'App (Android): app version, a device token for notifications (Firebase Cloud Messaging), the interests (categories) you choose, businesses you block and — if you turn on “New deals nearby” alerts — your approximate area (to about 1 km).',
        'Using deals: deals you reserved and your one-time codes (the code itself is not stored in readable form), where and when a code was used, saved deals, businesses you follow, your ratings and reviews.',
        'Business owners and staff: business name, description and category, logo and photos, phone, Telegram, Instagram and website links, branch addresses, map location, phone and opening hours, deals, team members (added by the phone number of an existing user) and their roles, plan requests and payment records (once plans are open).',
        'Messages: what you send via the Contact page (Bog‘lanish) — your name, a phone, Telegram or email to reply to, subject and text.',
        'Technical: IP address — only as an irreversible hash (for security and limiting attempts), browser and device type (user agent), sign-in and session times, a log of important actions.',
      ], after: 'We do not ask for or collect passport data, personal identification numbers (JShShIR), biometric or genetic data. Bank card details never reach us — payment happens on the Payme or Click page.' },
      { id: 'purpose', title: 'Why we use it', paragraphs: [
        'To sign you in and protect your account; to show and reserve deals, issue a code and check it at the counter; to show deals matching your interests and location in the app; to send Telegram or app notifications about new deals from businesses you follow, codes about to expire, codes used and (if turned on) new deals nearby (each can be turned off in settings); to run the business workspace and teams; to review listings and reviews (moderation) and prevent fraud and abuse; to answer your messages; to account for payments once plans are open.',
        'Data is not sold and not used for advertising. The site has no ads, trackers or analytics scripts; deal views are counted only as a total — who viewed is not recorded.',
      ] },
      { id: 'public', title: 'Public information', paragraphs: [
        'Business profiles (name, description, photos, branch addresses, map location, opening hours, phone and social links) and deals are visible to everyone on the site. Your review is shown with a shortened name (e.g. “Aziza K.”).',
        'Staff checking your code see your name and a masked phone number (+998 90 *** ** 67); the business owner and staff see your name in the list of codes for their deals. Your phone number, Telegram details, saved deals and follows are not shown to other users.',
      ] },
      { id: 'photos', title: 'Photos and automatic checks', paragraphs: [
        'Logos, covers and deal photos are redrawn and compressed in your own browser before upload, which removes hidden file data (such as the place where the photo was taken). Photos are stored on our server and are visible to everyone on the business page; a photo that is not used anywhere is deleted within 1 day.',
        'The text of new businesses, deals and reviews is checked automatically (links, prohibited topics, card numbers, insults, suspicious prices). The check runs on our own server — texts and photos are not sent to external services or artificial intelligence. Automatic checks never reject anything: a clean listing goes live at once and a suspicious one is reviewed by a moderator; a review with insults is hidden automatically.',
      ] },
      { id: 'location', title: 'Location', paragraphs: [
        'When you tap the near-me button (Yaqinimdagilar), your browser asks for permission. If you allow it, your location is rounded to about 100 metres and sent to the server only to sort deals by distance; it is not written to the database. Location is never collected in the background.',
        'In the app, location is taken only while the app is open and after you allow it; it is used to sort deals by distance and is not written to the database. If you turn on “New deals nearby” alerts, your approximate area (≈1 km) when you open the app is kept only for those alerts and is deleted as soon as you turn them off. Location is never collected in the background.',
        'In the business workspace, the locate button (Joylashuvimni aniqlash) fills in the branch’s map location — this point is public so that customers can find their way. The directions button (Yo‘l ko‘rsatish) opens Google Maps, which then receives the branch address and acts under its own privacy policy.',
      ] },
      { id: 'cookies', title: 'Cookies and browser storage', items: [
        `bb_session — keeps you signed in, ${r.session} days; scripts on the page cannot read it.`,
        `bb_login — ties a Telegram sign-in request to this browser, ${r.login} minutes.`,
        'bb_locale — chosen language, 1 year.',
        'bb_city — chosen city, 1 year.',
        'bb_business — business chosen in the workspace, 1 year.',
        'Browser storage: a temporary mark so that one deal view is not counted twice (cleared when the tab is closed), and a cache of site files so that pages open fast and an offline notice can be shown. Pages and personal data are not cached.',
        'App: the session key is kept in the phone’s protected storage (excluded from backups); settings such as language, city and interests, and an image cache stay on the phone.',
      ], after: 'No advertising, tracking or analytics cookies are used. You can block cookies in your browser settings, but then you will not be able to sign in.' },
      { id: 'services', title: 'Service providers', items: [
        'Cloudflare, Inc. — website server, database, photo storage and page cache.',
        'Telegram — sign-in confirmation and notifications: our bot messages you by your Telegram ID (a message contains details such as the deal title, address and code expiry).',
        'Google Firebase Cloud Messaging — delivering app notifications to your phone: the device token and the notification text are passed on. If you have the app, notifications go to the app instead of Telegram.',
        'Payme and Click — only once plans are open, to pay for a business plan: the order number and amount are passed to the payment page, and card details are seen only by the payment system. Plans are closed and online payment is switched off for now.',
        'Google Maps — only when you tap the directions button (the branch address is passed on).',
      ], after: 'Cloudflare and Firebase process data only on our behalf and only for these purposes; Telegram, Payme, Click and Google act under their own terms when you use their services. No data is sent to email, SMS, advertising, analytics or artificial intelligence services. Data is not shared with other third parties except where required by law.' },
      { id: 'age', title: 'Age restriction', paragraphs: [
        `BugunBor is for users aged ${d.age} and over. If you are younger, do not sign up. Such accounts are deleted when found. Only the owner of a business or their authorised representative may register it.`,
      ] },
      { id: 'security', title: 'Security', paragraphs: [
        'Connections are encrypted (HTTPS). There are no passwords: sign-in is confirmed in Telegram and matched with a 4-digit code in the browser. Session keys, sign-in requests and one-time codes are not stored in readable form; IP addresses are recorded only as hashes. Scripts on the page cannot read the session cookie, requests from other sites are rejected and the number of attempts is limited. Important actions of admins and moderators are logged, and access to data is limited to what each staff member needs.',
      ] },
      { id: 'retention', title: 'Retention', items: [
        'Account and profile — while your account is active.',
        `Sessions — ${r.session} days; the record of an ended or closed session is deleted within 1 day.`,
        'Sign-in requests and attempt counters — deleted within 24 hours.',
        `Telegram notification queue — ${r.notices} days.`,
        'Unused photos — 1 day.',
        'App device token — until you sign out of the app or delete the account; a token that stops working is deleted automatically. Interests and blocks — until you change them. Notification area — until you turn the alerts off.',
        'Business profiles and deals — while the business is active. A closed business is no longer shown on the site; its records are kept for the code history and accounting. The owner can ask for the business’s contact details to be deleted as described under “Account and data deletion”.',
        'Code history and ratings — stay without personal data (anonymously) after the account is deleted, because businesses need them for statistics.',
        'Payment and accounting records — for the period required by accounting and tax law.',
        `Security and activity log, moderation history and messages sent via the Contact page — up to ${r.logs} years.`,
        'Backups — deleted data disappears from backups within 30 days.',
      ], after: 'Expired records are deleted automatically.' },
      { id: 'rights', title: 'Law and your rights', paragraphs: [
        'Your personal data is processed under Law of the Republic of Uzbekistan No. ZRU-547 “On Personal Data” of 2 July 2019 (as amended by Law No. ZRU-1125 of 26 March 2026) and the consent you give when signing up (signing in).',
        'You have the right to know what data we hold about you and how it is processed, to have incorrect data corrected, to request deletion, to withdraw consent (which equals deleting your account) and to complain to the authorised state body — the Personalization Agency under the Ministry of Justice of the Republic of Uzbekistan. We answer requests within 30 days.',
      ] },
      { id: 'disclosure', title: 'Disclosure', paragraphs: [
        'Your data is not sold or given to third parties. The exception is cases provided by law: on a formal request from a court, investigators or another authorised state body, data is provided only to the extent requested.',
      ] },
      { id: 'storage', title: 'Where data is stored and cross-border transfer', paragraphs: [
        `The database and uploaded photos are stored on servers of Cloudflare, Inc. (USA); database region: ${d.region}. BugunBor does not collect biometric or genetic data, which under Article 27¹ of the Law must be stored in Uzbekistan.`,
        'Other data is stored abroad on the basis of the list of foreign states providing equivalent protection of personal data approved by Cabinet of Ministers Resolution No. 415 of 29 July 2026: the USA is on the list for participants of the EU–U.S. Data Privacy Framework, and Cloudflare is a participant. Telegram’s and Google’s (Firebase) servers may also be outside Uzbekistan; only the data needed for sign-in and notifications is sent to them. You consent to this when signing up (signing in).',
      ] },
      { id: 'deletion', title: 'Account and data deletion', paragraphs: [
        'You can delete your account yourself at any time: on the bugunbor.uz/delete-account page, or sign in → your account page (Kabinet; on a phone, Profil in the bottom menu) → Hisobni o‘chirish (Delete account). The account is deleted immediately: your phone number, Telegram details and name are erased, all sessions are closed, active codes are cancelled, saved deals, follows and notifications are deleted, the text of your reviews is removed (the rating stays anonymously), you leave business teams, and app devices, interests, blocks and the notification area are deleted. Code history stays anonymously for businesses’ statistics. In the app: Profile → Delete account.',
        `If you are the only owner of a business, add another owner to the team or close the business together with the account: it disappears from the site, its deals stop and active codes are cancelled. If you cannot sign in, write to ${d.email} or use the Contact page — we will complete the request within 30 days.`,
      ] },
      { id: 'contact', title: 'Contact', paragraphs: [
        `Questions and requests: ${d.email}. You can also write via the Contact page on the site.`,
      ] },
    ],
  };
}
