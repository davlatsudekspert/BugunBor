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
  - Asosiy: «Siz uchun» (qiziqishlar), «Yaqinimda»/shahar bo'yicha, «Tez tugaydi»,
    «Namuna» karuseli; shahar yoki joylashuvni tanlash; bloklangan bizneslar ko'rinmaydi.
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
  - Asosiy ekranda biznes egalari uchun taklif kartochkasi (yopilsa 30 kun ko'rinmaydi, biznesi borlarga chiqmaydi).
  - iOS uslubidagi pastki menyu: ingichka to'q ikonkalar, tanlangani to'ldirilgan.
  - Server: `GET /api/v1/business/{id}`, `/config`da kategoriya `id`, `/me`da Telegram username va a'zolik holati.
  - Testlar: ilova 75, sayt 158.

## Navbatda

- [ ] Egasi ruxsat bersa: PR #6 ni `main`ga birlashtirish (saytdagi qidiruv tuzatishi ham chiqadi).
  Shundan keyin ilovadagi biznes ro'yxatdan o'tishi va biznes profili ishlaydi (yangi API serverga chiqadi).
- [ ] Egasi kalitlarni qo'ygach: imzolangan build, qo'lda APK sinovi, Internal testing qoralamasi.

## Egasidan kerak

### Cloudflare secret'lari (sayt)

- `FCM_SERVICE_ACCOUNT`: Firebase loyihasi → Service accounts → yangi kalit (JSON). Bu bo'lmasa, push o'chiq, xabarlar Telegramga ketadi.
- `REVIEW_LOGIN_CODE`: Google tekshiruvchisi uchun kod, 12+ belgi.
- `ANDROID_CERT_SHA256`: Play Console → App signing'dagi SHA-256 barmoq izlari.
- `MIN_APP_BUILD`: ixtiyoriy. Eski ilovani yangilashga majburlash uchun.

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
