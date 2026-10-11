# Ilovani do‘konlarga chiqarish (iOS TestFlight va Google Play test)

Usul egasining boshqa ilovalaridagidek: build GitHub Actions’da yig‘iladi va do‘konga o‘zi yuklanadi.
Kalitlar faqat GitHub secret’larida turadi, repoga, logga yoki chatga yozilmaydi.

## 1. Bir martalik sozlash (egasi)

### GitHub secret’lari (BugunBor → Settings → Secrets and variables → Actions)

Boshqa ilova repolaringizdagi qiymatlarning o‘zi qo‘yiladi (Apple API kaliti va Play xizmat hisobi butun hisob uchun).

| Secret | Nima |
|---|---|
| `IOS_TEAM_ID` | Apple Developer → Membership → Team ID |
| `ASC_KEY_ID`, `ASC_ISSUER_ID` | App Store Connect → Users and Access → Integrations → API kaliti (**Admin** roli: bulutli imzo shuni talab qiladi) |
| `ASC_KEY_P8_BASE64` | o‘sha kalitning `.p8` fayli: fayl o‘zi, uning base64’i yoki BEGIN/END qatorlarisiz tanasi — uchalasi ham bo‘ladi |
| `PLAY_SERVICE_ACCOUNT_JSON` | Play uchun xizmat hisobining JSON kaliti (butun matn) |

### App Store Connect

1. Bundle ID `uz.bugunbor.app` ni CI o‘zi ro‘yxatdan o‘tkazadi: iOS workflow’ining birinchi ishga tushishi.
2. Ilova yozuvini API orqali yaratib bo‘lmaydi, uni bir marta qo‘lda yarating: Apps → **+** → New App.
   - Platforma: iOS.
   - Nomi: BugunBor.
   - Til: Russian yoki English.
   - Bundle ID: `uz.bugunbor.app`.
   - SKU: `uz.bugunbor.app`.
3. TestFlight → Internal Testing → **+** → guruh oching va testerlarni qo‘shing (App Store Connect foydalanuvchilari, 100 tagacha, Apple tekshiruvisiz).

### Google Play Console

1. Create app: BugunBor, App, Free.
2. **Birinchi AAB’ni qo‘lda yuklang:** Testing → Internal testing → Create release.
   - Fayl: App workflow’ining oxirgi «bugunbor-N» artifact’idagi `app-release.aab`.
   - Shu yerda imzo kaliti tanlanadi:
     - **Google-generated key** (boshqa ilovangizda shunday): eng oddiy yo‘l. Saytdan APK o‘rnatganlar Play versiyasiga o‘tish uchun ilovani bir marta o‘chirib, qayta o‘rnatadi.
     - **O‘z kalitingiz** (Export and upload a key from Java keystore, `bugunbor-upload.jks`): sayt APK’si va Play bir-birini yangilay oladi.
   - Google API’si yangi ilovaning birinchi bundle’ini qabul qilmaydi; keyingilarini CI o‘zi yuklaydi.
3. Users and permissions → xizmat hisobi emailiga **BugunBor** ilovasi uchun «Release apps to testing tracks» ruxsatini bering.
4. Internal testing → Testers → email ro‘yxati. Opt-in havolasini testerlarga yuboring.
5. Ichki test uchun Data safety shart emas. Yopiq test va production uchun esa ilova haqidagi barcha bo‘limlar kerak (`docs/ILOVA-HOLAT.md`, «Play Console»).

## 2. Har bir reliz

### iOS → TestFlight

Actions → **iOS** → Run workflow → `upload_to_testflight` ✓.

1. Ubuntu’da App Store Connect tekshiruvi:
   - Bundle ID va ilova yozuvi bormi;
   - keyingi build raqami = do‘kondagi eng kattasi + 1.
2. macOS’da Xcode 26 imzosiz arxiv qiladi. Keyin API kaliti bilan bulutli imzo qo‘yiladi (sertifikat va profil hech qayerda saqlanmaydi) va build TestFlight’ga yuboriladi.
3. 10–30 daqiqadan keyin build TestFlight’da ko‘rinadi, ichki testerlarga o‘zi chiqadi.

Shifrlash so‘rovi chiqmaydi: `ITSAppUsesNonExemptEncryption = false`.

`upload_to_testflight` ni belgilamasangiz, imzolangan IPA faqat tekshiriladi va hech qayerga yuborilmaydi.

Har PR’da iOS imzosiz yig‘ib ko‘riladi, shuning uchun iOS buzilsa darrov ko‘rinadi.

### Android → Google Play test

Actions → **App** → Run workflow:
- `play_upload` ✓;
- `play_track`: `internal` (Internal testing) yoki `alpha` (Closed testing);
- `play_status`: `draft` (Play Console’da «Roll out»ni o‘zingiz bosasiz) yoki `completed` (testerlarga darhol chiqadi).

Production’ga chiqarish faqat Play Console’da, qo‘lda.

## 3. App Store’ga topshirishdan oldin (TestFlight uchun shart emas)

- **Kirish usuli (Guideline 4.8).** Ilovada kirish faqat Telegram orqali. Apple uchinchi tomon orqali kirishda unga teng huquqli boshqa variantni (masalan, Sign in with Apple) talab qilishi mumkin.
- **Tekshiruvchi kirishi.** Cloudflare’da `REVIEW_LOGIN_CODE` secret’i bo‘lishi kerak, hozir yo‘q. App Review Information’ga yoziladi: «Kirish» sarlavhasini bosib turing va kodni kiriting.
- **Havolalar.** `bugunbor.uz/deals/…` havolalari iOS’da hozircha Safari’da ochiladi. Ilovada ochilishi uchun Associated Domains va saytda `apple-app-site-association` kerak (Team ID bilan).
- **Push.** iOS build’larda push o‘chiq. Yoqish uchun Firebase’ga APNs kaliti va `GoogleService-Info.plist` kerak.
- **App Privacy.** App Store Connect’dagi javoblar Play’dagi Data safety bilan bir xil: telefon, ism, Telegram ID, taxminiy va aniq joylashuv (faqat ilova ochiq paytda), rasmlar. Kuzatish (tracking) yo‘q.
