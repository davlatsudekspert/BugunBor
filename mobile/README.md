# BugunBor — Android ilova

Flutter ilova (`uz.bugunbor.app`), sayt bilan bir xil server API’dan foydalanadi
(`/api/v1/…`). To‘lov ilovada yo‘q — faqat saytda.

## Tuzilishi

| Papka | Nima bor |
| --- | --- |
| `lib/core` | Sozlamalar (`--dart-define`), xato turi, vaqt, format, xotira |
| `lib/data` | API mijozi (`x-app`, build, til, Bearer) va modellar |
| `lib/app` | Holat (Riverpod), marshrutlar, kirish/chiqish, push |
| `lib/design` | Sayt ranglari, umumiy vidjetlar, aksiya kartalari |
| `lib/features` | Ekranlar: asosiy, qidiruv, aksiya, biznes, kodlar, profil, kassa… |
| `lib/l10n` | Matnlar: `app_uz.arb`, `app_ru.arb`, `app_en.arb` |
| `test` | Kontrakt, API, matn, yordamchi va ekran testlari |
| `integration_test` | Emulyatorda, haqiqiy server bilan E2E |

## Ishga tushirish

```sh
flutter pub get
flutter analyze
flutter test
flutter run --dart-define=APP_BUILD=1
```

Mahalliy server bilan: `--dart-define=API_BASE=http://10.0.2.2:8787`.

## Qurish sozlamalari

| `--dart-define` | Ma’nosi |
| --- | --- |
| `API_BASE` | Sayt manzili (standart: `https://bugunbor.uz`) |
| `APP_BUILD` | Build raqami (CI’da run raqami, `versionCode` bilan bir xil) |
| `APP_VERSION` | Ko‘rinadigan versiya |
| `PUSH_ENABLED` | `true` — `google-services.json` bor bo‘lsa (push yoqiladi) |

Maxfiy kalitlar ilovada yo‘q. Imzolash kaliti va Play kaliti faqat CI
sirlarida saqlanadi (`docs/ILOVA-HOLAT.md`).
