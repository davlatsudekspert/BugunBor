# Ilova ishining holati

Bu fayl avtomatik davom ettirish uchun: har qadamdan keyin yangilanadi.
Reja: `docs/ILOVA-REJA.md`.

## Bajarildi

- [x] **0-bosqich: server API** (2026-09-26)
  - Bearer token, ilova uchun Telegram orqali kirish, `x-app` va build hisobi.
  - `/config`, `/feed` (qiziqish va joylashuv), aksiya va biznes sahifalari.
  - `/me` va uning bo'limlari: kodlar, saqlanganlar, obunalar, qiziqishlar, qurilmalar, bloklar.
  - Shikoyatlar va admin navbati.
  - Push: FCM, xabarnomalar ilovaga, qolganlari Telegramga.
  - «Yaqin atrofda yangi aksiya» xabarnomasi: kuniga 3 tagacha, kechasi yuborilmaydi.
  - Yagona ega biznesni yopib, hisobini o'chira oladi.
  - `assetlinks.json` va tekshiruvchi kirishi.
  - Maxfiylik siyosatiga ilova ma'lumotlari qo'shildi.
  - Kontraktlar: `contracts/`.
- [x] **1-bosqich: Flutter ilova** (`mobile/`, `uz.bugunbor.app`)
  - Birinchi ochilish: til → qiziqishlar → joylashuv (avval tushuntirish) → xabarnomalar.
  - Asosiy (tepadan pastga): qidiruv; yangi odamga «BugunBor qanday ishlaydi» (3 qadam,
    ✕ bilan butunlay yopiladi, birinchi koddan keyin chiqmaydi); 8 ta kategoriya katakda
    (nomlar bir xil o'lchamda); «Siz uchun» (qiziqishlar); «Yaqinimda»/shahar bo'yicha 4 ta
    aksiya va «Barcha aksiyalar»; «Tez tugaydi»; «Namuna» karuseli. Vaqt «3 soat qoldi»
    ko'rinishida, oxirgi soat ajralib turadi. Shahar yoki joylashuvni tanlash; bloklangan
    bizneslar ko'rinmaydi.
  - Qidiruv: so'z, kategoriya, saralash, sahifalab yuklash.
  - Aksiya: band qilish (filial tanlash, takroriy so'rovdan himoya kaliti), saqlash,
    obuna, ulashish, yo'l ko'rsatish, shikoyat; namunada «Band qilish» yo'q.
  - Biznes: obuna, bloklash, shikoyat (biznes va sharh), aloqa, filiallar.
  - Kodlarim: faol kod (QR + qolgan vaqt), bekor qilish, tarix, baholash.
  - Saqlangan: aksiyalar va obunalar. Profil: ism, til, mavzu, shahar, qiziqishlar,
    xabarnoma sozlamalari, kassa, biznes kabineti (saytda), hisobni o'chirish.
  - Kirish: rozilik belgisi → Telegram → moslik kodi → tasdiq; token faqat xavfsiz xotirada.
  - Kassa: QR skaner yoki qo'lda kod, tekshirish → tasdiqlash (faqat server belgilaydi).
  - 401 markazda: sessiya bir marta tugaydi, eski token boshqa yuborilmaydi.
  - App Links (`/deals`, `/businesses`, `/r`), push bosilganda kerakli ekran ochiladi.
  - Zaxira nusxaga sessiya kaliti tushmaydi (`backup_rules.xml`, `data_extraction_rules.xml`).
  - Testlar (47): kontraktlar, API sarlavhalari va 401, matnlar (uz/ru/en), yordamchilar,
    ekranlar 360/390/430 px, 130% katta shrift, tugmalar ≥ 48 px, yuklanish/bo'sh/xato holatlari.
- [x] **CI** (`.github/workflows/app.yml`)
  - format + analyze + test + matnlar yangiligi + «Nima yangi» ≤ 500 belgi.
  - Emulyatorda E2E (haqiqiy sayt, faqat o'qish, ko'rishlar sanalmaydi).
  - Release AAB + APK: `versionCode` = run raqami; paket nomi, ruxsatlar ro'yxati
    (`mobile/android/permissions.txt`) va imzo tekshiriladi.
  - Play: faqat qo'lda (Actions → App → Run workflow → `play_draft`), Internal testing'ga **qoralama**.
    Chiqarish tugmasini faqat egasi bosadi.

- [x] **PR #6, CI yashil** (2026-09-26): check, e2e (emulyator, 13 ta skrinshot), build, verify.
  - Emulyator skrinshotlari bo'yicha tuzatildi: ko'rinmas chip yozuvlari, rasm ustidagi sarlavha,
    profildagi kesilgan yozuv, sayt qidiruvi (so'z boshidan), tugmalar kontrasti (WCAG AA).
  - Test APK va ekranlar egasiga yuborildi.

- [x] **Biznes ilovada** (2026-09-26)
  - Biznesni ilovaning o'zida ro'yxatdan o'tkazish (`/business/new`): saytdagi forma va tekshiruvlar,
    joylashuv nuqtasi (tugma bosilgandagina), ish vaqti, kategoriya bo'yicha namuna tavsif,
    server xatolari maydon ostida, 5 ta biznes chegarasi oldindan aytiladi, chiqishda so'raladi.
  - Biznes a'zosi uchun Profil «Biznes profili»ga aylanadi: holat (tasdiqlangan / tekshiruvda /
    rad etilgan sababi bilan), tezkor amallar, statistika, profilni to'ldirish ro'yxati, so'nggi kodlar.
    Kassir faqat kod tekshirishni ko'radi. «Shaxsiy» tomoni bir bosishda.
  - «Biznes tasdiqlandi» xabarnomasi ilovada o'sha biznes profilini ochadi (to'lov sahifalari saytda qoladi).
  - Asosiy ekran oxirida biznes egalari uchun kichik taklif kartochkasi (yopilsa 30 kun ko'rinmaydi, biznesi borlarga chiqmaydi).
  - iOS uslubidagi pastki menyu: ingichka to'q ikonkalar, tanlangani to'ldirilgan.
  - Server: `GET /api/v1/business/{id}`, `/config`da kategoriya `id`, `/me`da Telegram username va a'zolik holati.
  - Testlar: ilova 77, sayt 158. Emulyator E2E yangi ekranlarni ham suratga oladi.
- [x] **PR #6 `main`ga birlashtirildi va saytga chiqdi** (2026-09-26, 15:03 UTC)
  - Tekshirildi: `/config`da kategoriya `id`; `GET /api/v1/business/{id}` kirmasdan 401;
    qidiruvda «osh» endi 3 ta mos natija (oldin 17); asosiy sahifalar 200.
  - Ilovadagi biznes ro'yxatdan o'tishi va biznes profili endi haqiqiy server bilan ishlaydi.
- [x] **Aksiyalar ilovada** (2026-09-26)
  - Ega va menejer aksiyani ilovaning o'zida qo'shadi: rasm (kamera yoki galereya, telefonda kichraytiriladi,
    burilishi to'g'rilanadi), nomi, tavsif, shartlar, kategoriya, belgi, narxlar (chegirma darhol ko'rinadi),
    vaqt (Toshkent vaqti, tezkor tugmalar: 2 soat … 7 kun), soni, bir kishiga nechta, kod muddati, filiallar,
    mijozlarga qanday ko'rinishi. Tekshiruvlar saytdagi bilan bir xil; server xatosi maydon ostida chiqadi.
  - «Aksiyalar» ro'yxati: holatlar, filtrlar (hammasi, faol, tekshiruvda, qoralama, tugagan), band qilish,
    ishlatish va ko'rishlar soni, rad etish sababi. Amallar: tahrirlash, yuborish, qaytarib olish, pauza,
    davom ettirish, yakunlash (so'raladi), nusxa olish, o'chirish (so'raladi).
  - Tasdiqlangan aksiya o'zgarmaydi: nusxasi olinadi. Kameraga ruxsat berilmasa, sababi aytiladi.
  - Server: `GET /api/v1/business/{id}/deals`, `GET /api/v1/business/{id}/deals/{dealId}`;
    `/config`da aksiya qoidalari va belgilar; biznes profilida kategoriya va filiallar. Kassir ko'ra olmaydi.
  - Testlar: ilova 97, sayt 159.
- [x] **PR #7 `main`ga birlashtirildi** (2026-09-26): CI yashil (check, e2e, build, verify).
- [x] **Saytda ilova bo'limi** (2026-09-26)
  - Bosh sahifada «BugunBor ilovasi» bo'limi va sayt pastida «Ilovani yuklab oling».
  - `bugunbor.uz/ilova`: yuklab olish tugmasi va o'rnatish yo'riqnomasi (uz/ru).
  - «Android ilova» tugmasi Admin → Sozlamalar → «Mobil ilova»da tanlanganiga qarab ishlaydi:
    «Tez kunda» (standart), «Saytdan APK» (GitHub'dagi eng so'nggi reliz) yoki «Google Play».
    App Store: «Tez kunda».
  - APK'ni chiqarish: GitHub → Actions → «App» → Run workflow → `publish_apk`. Faqat egasi ishga
    tushiradi; testlar, E2E va tekshirilgan build'dan keyin, faqat egasining upload kaliti bilan
    (debug kalit bilan imzolangan APK hech qachon chiqmaydi). 64-bit va 32-bit APK, versionCode = run raqami.

- [x] **Qo'llanma videolari** (2026-09-26, ilova ekranlaridan, 1080×1920): 1/4 ilovani yuklab olish
  (sayt → o'rnatish → birinchi ochilish), 2/4 ro'yxatdan o'tish, 3/4 biznesni qo'shish, 4/4 aksiya qo'shish
  va «Nima uchun BugunBor?» promo. Egasiga yuborildi (Instagram uchun).

- [x] **Saytda video qo'llanmalar** (2026-09-26): `bugunbor.uz/qollanma` — promo va 1–4 qo'llanmalar, posterlar,
  o'zbekcha subtitrlar (WebVTT). iPhone (Safari) uchun videolar Worker orqali qismlab beriladi (`/qollanma/video/…`).
  Ilovada: Profil → «Video qo'llanma».
- [x] **Profil rasmi** (2026-09-26): saytdagi kabinetda va ilovadagi Profil'da rasm qo'yish/almashtirish/olib tashlash.
  Rasm faqat egasiga ko'rinadi (alohida `user_avatars` jadvali), hisob o'chirilganda o'chadi; maxfiylik siyosatiga yozildi.
- [x] **Namuna belgilari** (2026-09-26): tepadagi «Demo rejim» yozuvi olib tashlandi; har bir namuna aksiya kartochkasi,
  aksiya va biznes sahifasida «Namuna» belgisi, namuna biznesda «Tasdiqlangan» belgisi yo'q.

## Navbatda

- [ ] Egasi kalitlarni qo'ygach: imzolangan build, qo'lda APK sinovi, Internal testing qoralamasi.
- [ ] Saytdan APK: egasi upload kalitini yaratib GitHub secret'lariga qo'yadi (pastda) → Actions → «App» →
  `publish_apk` → Admin → Sozlamalar → «Mobil ilova» → «Saytdan APK».
- [ ] Ilova Google Play'da chiqqach: Admin → Sozlamalar → «Mobil ilova» → «Google Play».
- [ ] Qo'llanma videolarini saytga (`/qollanma`) va ilovaga (Profil → «Qo'llanma») qo'yish — egasi ma'qullagach.

## Egasidan kerak

### Cloudflare secret'lari (sayt)

- `FCM_SERVICE_ACCOUNT`: Firebase loyihasi → Service accounts → yangi kalit (JSON). Bu bo'lmasa, push o'chiq, xabarlar Telegramga ketadi.
- `REVIEW_LOGIN_CODE`: Google tekshiruvchisi uchun kod, 12+ belgi.
- `ANDROID_CERT_SHA256`: Play Console → App signing'dagi SHA-256 barmoq izlari.
- `MIN_APP_BUILD`: ixtiyoriy. Eski ilovani yangilashga majburlash uchun.

### Upload kalitini yaratish (bir marta; kalit faqat sizda qoladi)

Kalitsiz saytga APK chiqmaydi: boshqa kalit bilan imzolangan versiyani telefon yangilanish sifatida qabul qilmaydi.

1. Kompyuterda Java bo'lsin (Android Studio yoki https://adoptium.net dan Temurin JDK).
2. Kalit uchun OneDrive'dan tashqarida papka oching (Windows: `mkdir C:\BugunBor-kalit -Force; cd C:\BugunBor-kalit`,
   macOS: `mkdir -p ~/BugunBor-kalit && cd ~/BugunBor-kalit`) va kalitni yarating (parollarni o'zingiz o'ylab toping va saqlab qo'ying):
   `keytool -genkeypair -v -keystore bugunbor-upload.jks -keyalg RSA -keysize 2048 -validity 10000 -alias bugunbor`
3. Faylni base64 qiling:
   - Windows (PowerShell): `[Convert]::ToBase64String([IO.File]::ReadAllBytes((Resolve-Path bugunbor-upload.jks).Path)) | Set-Clipboard`
   - macOS: `base64 -i bugunbor-upload.jks | pbcopy`
4. GitHub → Settings → Secrets and variables → Actions → New repository secret: pastdagi 4 ta `ANDROID_UPLOAD_*`.
5. `bugunbor-upload.jks` faylini va parollarni xavfsiz joyda saqlang (masalan, ikki joyda zaxira).
   Yo'qolsa, ilovani yangilab bo'lmaydi. Hech kimga, chatga yoki repoga bermang.

Google Play'ga chiqqanda: Play Console → App integrity → App signing'da **o'z kalitingizni yuklash**ni tanlang
(«Export and upload a key from Java keystore»). Shunda saytdan o'rnatganlar ilovani Play orqali yangilay oladi.

### GitHub secret'lari (ilova, Settings → Secrets and variables → Actions)

- `ANDROID_UPLOAD_KEYSTORE_BASE64`: upload kaliti (`.jks`), base64 ko'rinishida.
- `ANDROID_UPLOAD_STORE_PASSWORD`, `ANDROID_UPLOAD_KEY_ALIAS`, `ANDROID_UPLOAD_KEY_PASSWORD`.
- `ANDROID_GOOGLE_SERVICES_JSON`: Firebase → Android ilova (`uz.bugunbor.app`) → `google-services.json` matni. Bo'lmasa, ilova push'siz quriladi.
- `PLAY_SERVICE_ACCOUNT_JSON`: Play Console API uchun xizmat hisobi (faqat qoralama yuklash uchun).
- Ixtiyoriy o'zgaruvchi `PLAY_WHATSNEW_LOCALES` (standart `ru-RU en-US`; Play sahifasiga o'zbek tili qo'shilsa, `uz` qo'shiladi).

### Play Console

- Tekshiruvchi kirishi: «Kirish» sarlavhasini **bosib turing** → kod oynasi → `REVIEW_LOGIN_CODE`.
- Maxfiylik siyosati: `https://bugunbor.uz/privacy`; hisobni o'chirish: ilovada Profil → «Hisobni o'chirish» va `https://bugunbor.uz/delete-account`.
- Data safety: telefon raqami, ism, taxminiy/aniq joylashuv (faqat ilova ochiq paytda), push token; reklama yo'q; ma'lumot sotilmaydi.
