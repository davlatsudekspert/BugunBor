# App Store Connect: BugunBor’ni tekshiruvga yuborish

App Store’da o‘zbek tili yo‘q, shuning uchun asosiy til — ruscha, qo‘shimcha til — inglizcha.

## 1. Bir martalik sozlash (egasi)

1. **Cloudflare secret `REVIEW_LOGIN_CODE`**, kamida 12 belgi. Bo‘lmasa, Apple tekshiruvchisi ilovaga kira olmaydi.
2. **Sign in with Apple kaliti.** Hisob o‘chirilganda Apple’ga kirish ruxsatini bekor qilish uchun kerak (guideline 5.1.1(v)).
   - developer.apple.com → Keys → **+** → «Sign in with Apple» ✓ → Configure → BugunBor (`uz.bugunbor.app`) → Register.
   - `.p8` faylini yuklab oling, u faqat bir marta beriladi.
   - Cloudflare Worker secret’lari:
     - `APPLE_TEAM_ID` — Team ID;
     - `APPLE_SIWA_KEY_ID` — kalit ID’si;
     - `APPLE_SIWA_PRIVATE_KEY` — `.p8` matni.
3. **Identifiers → BugunBor** → Capabilities’da «Sign In with Apple» ✓ → Save. Bulutli imzo buni odatda o‘zi qiladi, faqat tekshirib qo‘ying.

## 2. Ilova sahifasi (App Store → 1.0)

| Maydon | Ruscha | Inglizcha |
|---|---|---|
| Name | BugunBor | BugunBor |
| Subtitle (30) | Скидки рядом на сегодня | Today’s deals near you |
| Keywords (100) | скидки,акции,кафе,рестораны,магазины,купоны,красота,доставка,Ташкент,Узбекистан | deals,discounts,coupons,cafe,restaurants,shops,beauty,delivery,Tashkent,Uzbekistan |
| Promotional text | Сегодняшние скидки кафе, магазинов и услуг рядом с вами. Бесплатный код — оплата на месте. | Today’s deals from cafes, shops and services near you. Free code — pay at the place. |

- **Description:** Play uchun yozilgan ruscha va inglizcha to‘liq tavsif. Undagi «Google Play» yoki «Android» so‘zlarini olib tashlang.
- **Support URL:** https://bugunbor.uz/contact
- **Marketing URL:** https://bugunbor.uz
- **Privacy Policy URL:** https://bugunbor.uz/privacy
- **Category:** Shopping. Ikkinchi kategoriya: Food & Drink.
- **Copyright:** © 2026 BugunBor
- **Screenshots:** 6.9″ iPhone uchun (1320×2868). Ularni Actions → iOS → Run workflow → `screenshots` ✓ beradi, artifact nomi «ios-screenshots-N». 3–8 tasini tanlang.

## 3. Yosh reytingi (Age Rating)

- Zo‘ravonlik, jinsiy mazmun, so‘kinish, giyohvand moddalar, qimor, qo‘rqinchli mazmun va sog‘liq bo‘yicha mavzular — barchasiga **None / No**.
- Unrestricted web access: **No**. Havolalar Safari’da ochiladi.
- User-generated content: **Yes**. Bizneslar aksiya va rasm joylaydi, ular moderatsiyadan o‘tadi, shikoyat qilish va bloklash mumkin.
- Messaging, chat: **No**.

## 4. App Privacy (ma’lumotlar)

Tracking (kuzatuv): **No**. Quyidagi barcha ma’lumotlar: **Linked to user**, maqsadi **App Functionality**.

- **Contact Info:**
  - Name;
  - Phone Number — Telegram orqali kirganda.
- **Identifiers:** User ID — Telegram ID yoki Apple identifikatori.
- **Location:**
  - Precise Location;
  - Coarse Location — faqat ilova ochiq paytda, aksiyalarni masofa bo‘yicha saralash uchun.
- **User Content:** Photos or Videos — biznes rasmlari va profil rasmi.
- **Usage Data:** Product Interaction — saqlanganlar, kodlar, obunalar.

## 5. App Review Information

- Sign-in required: **Yes**.
- Contact: ismingiz, telefoningiz va emailingiz.
- Notes (inglizcha, so‘zma-so‘z):

```
Sign-in options: "Sign in with Apple" and Telegram. For review, either use Sign in with Apple,
or on the sign-in screen (Profile → sign-in button) press and hold the title "Sign in" for 2 seconds:
a "Reviewer code" box opens — enter: <REVIEW_LOGIN_CODE> and tap "Sign in". This opens a test customer account.
Deals can be browsed without signing in. Payments are not made in the app: customers get a free code
and pay at the business. Account deletion: Profile → "Delete account".
```

## 6. Build va yuborish

1. Actions → **iOS** → Run workflow → `upload_to_testflight` ✓. 10–30 daqiqadan keyin build App Store Connect’da paydo bo‘ladi.
2. App Store → 1.0 → **Build** → oxirgi build’ni tanlang.
3. **Add for Review** → **Submit for Review**.
