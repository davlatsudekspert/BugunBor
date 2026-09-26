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

## Navbatda

- [ ] **1-bosqich: Flutter ilova** (`mobile/`), `uz.bugunbor.app`.
- [ ] **CI:** analyze + test + kontrakt + imzolangan APK/AAB, Play'ga qoralama.

## Egasidan kerak (Cloudflare secret'lari)

- `FCM_SERVICE_ACCOUNT`: Firebase loyihasi → Service accounts → yangi kalit (JSON). Bu bo'lmasa, push o'chiq, xabarlar Telegramga ketadi.
- `REVIEW_LOGIN_CODE`: Google tekshiruvchisi uchun kod, 12+ belgi.
- `ANDROID_CERT_SHA256`: Play Console → App signing'dagi SHA-256 barmoq izlari.
- `MIN_APP_BUILD`: ixtiyoriy. Eski ilovani yangilashga majburlash uchun.
