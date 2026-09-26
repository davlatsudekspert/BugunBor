# BugunBor Android ilovasi — reja

Bu faqat reja. Ilova kodi «boshla» deganingizdan keyin yoziladi.

Ilova sayt bilan **bitta backend** va **bitta hisobdan** foydalanadi. Keyin iOS ham shu Flutter kodidan chiqadi.

Arxitektura va saboqlar NFCSTORE ilovasidan (`nfcx/mobile_nova`) faqat o‘qib o‘rganildi. Uning brendi, paket nomi va kalitlari ko‘chirilmaydi.

---

## 0. Boshlashdan oldin: sayt holati

Ilova saytning API’sidan foydalanadi, shuning uchun avval sayt tekshirildi.

Oxirgi yig‘ma (build) toza bazada, brauzerda to‘liq sinaldi (2026-09-26). Hammasi o‘tdi, konsolda xato yo‘q:

| Tekshiruv | Natija |
| --- | --- |
| Ro‘yxatdan o‘tish (Telegram), majburiy rozilik belgisi | ✅ belgisiz tugma ishlamaydi, server ham rad etadi |
| Biznes qo‘shish → avtomatik tasdiq → aksiya → avtomatik tasdiq | ✅ |
| Qidiruv va «Yaqinimdagilar» | ✅ |
| Band qilish → kassada tekshirish (telefon yashirin) → baho | ✅ |
| To‘lov: tariflar yopiq bo‘lsa narx ko‘rinmaydi; ochilsa Payme/Click «Tez kunda» | ✅ |
| Namuna (demo) aksiya: aniq izoh, band qilinmaydi | ✅ |
| Maxfiylik siyosati uz/ru/en, 360/390/430 px | ✅ |
| Hisobni o‘chirish: `/delete-account`, yagona egaga tushuntirish | ✅ |
| Chiqish | ✅ |

Ilovadan oldin yana ikki narsa kerak:
- Operator ma’lumotlari (maxfiylik siyosatidagi `[TO'LDIRISH KERAK]` joylar);
- bu o‘zgarishlarning production’ga chiqishi.

---

## 1. Birinchi kundan qat’iy qarorlar

| Qaror | Taklif | Izoh |
| --- | --- | --- |
| Paket nomi (applicationId) | **`uz.bugunbor.app`** | Bir marta tanlanadi, **hech qachon o‘zgarmaydi**. |
| Imzolash | Play App Signing + alohida **upload kaliti** | Kalit faqat GitHub Actions secret’ida, repoga tushmaydi. |
| versionCode | CI raqami (`github.run_number`) | Bitta raqam ikki marta ishlatilmaydi. |
| Tillar | uz / ru / en, `.arb` fayllar orqali | O‘zbekchada ‘ (o‘, g‘) va ’ (tutuq). Testlar oddiy `'` ni rad etadi. |
| Dizayn | Sayt tokenlari: sutli fon, to‘q ko‘k matn, to‘q sariq urg‘u + qorong‘i mavzu | 360/390/430 px, tugma ≥ 44 px, klaviatura maydonni yopmaydi, pastki menyu tizim paneli ostiga kirmaydi. |
| Texnologiya | Flutter (versiya qotiriladi), Riverpod 2 (kod generatsiyasiz), go_router, dio, flutter_secure_storage, cached_network_image | NFCSTORE’da sinalgan to‘plam. |
| Reklama SDK | Yo‘q | Data safety sodda bo‘ladi. |
| Push xabarnomalar | MVP’da yo‘q — Telegram xabarnomalari ishlashda davom etadi | Firebase keyin qo‘shiladi, shunda Data safety yangilanadi. |

---

## 2. Ekranlar va navigatsiya

### 2.1. Pastki menyu (saytdagi kabi)

**Asosiy · Qidiruv · Saqlangan · Kodlarim · Profil**

### 2.2. Navigatsiya xaritasi

```
Ishga tushish (sessiyani tiklash)
 ├─ Birinchi marta: Tanishuv (3 slayd + til tanlash)
 └─ Pastki menyu
     ├─ Asosiy
     │   ├─ Shahar tanlash · Qidiruv maydoni · Kategoriyalar
     │   ├─ «Hozir tugayotganlar» · «Yaqinimdagilar»
     │   ├─ «Sizning sahifangiz shunday ko‘rinadi» (namuna bizneslar karuseli)
     │   └─ → Aksiya sahifasi / Biznes sahifasi / Kategoriya
     ├─ Qidiruv (filtr: shahar, kategoriya; saralash: tez tugaydi, chegirma, yangi, yaqin)
     │   └─ → Aksiya sahifasi
     ├─ Saqlangan (aksiyalar · obuna bo‘lgan bizneslar)
     ├─ Kodlarim (faol · tarix)
     │   ├─ → Kod ekrani (QR + kod + taymer + filial manzili)
     │   └─ → Baho qoldirish
     └─ Profil
         ├─ Ism · Til · Mavzu · Telegram xabarnomalari · Tejalgan summa
         ├─ Maxfiylik siyosati · Foydalanish shartlari · Bog‘lanish
         ├─ (xodim bo‘lsa) Kodni tekshirish — QR skaner
         ├─ Chiqish
         └─ Hisobni o‘chirish → tasdiqlash

Aksiya sahifasi → Band qilish (kirish kerak bo‘lsa → Kirish) → Kod ekrani
               → Biznes sahifasi · Yo‘l ko‘rsatish (xarita ilovasi) · Ulashish · Saqlash
               → Shikoyat qilish
Biznes sahifasi → aksiyalar · filiallar · sharhlar · obuna · shikoyat · bloklash
Kirish → rozilik belgisi → Telegram → kutish (moslik kodi) → qaytish
```

### 2.3. Ekranlar ro‘yxati (MVP)

**Mijoz uchun:**
1. Ishga tushish, tanishuv, til tanlash.
2. Asosiy.
3. Qidiruv (ro‘yxat sahifalab yuklanadi).
4. Kategoriya.
5. Aksiya sahifasi.
6. Biznes sahifasi.
7. Kirish (Telegram, rozilik belgisi bilan).
8. Kod ekrani.
9. Kodlarim.
10. Baho qoldirish.
11. Saqlanganlar.
12. Profil.
13. Bog‘lanish va shikoyat.
14. Hisobni o‘chirish.

**Biznes xodimi uchun (MVP’da faqat bittasi):**
15. Kodni tekshirish: QR skaner yoki kodni qo‘lda yozish → tasdiqlash.

Biznes kabinetining qolgani (aksiya yaratish, filiallar, jamoa, rasmlar) 5-bosqichda qo‘shiladi. Unga qadar egalar saytdan foydalanadi.

Har bir ekranda 3 holat bo‘ladi:
- yuklanmoqda (skelet);
- bo‘sh (tushuntirish va tugma);
- xato («Qayta urinish» tugmasi bilan).

### 2.4. Namuna (demo) kontent ilovada

- Har bir namuna yozuvda **«Namuna»** belgisi turadi.
- Band qilish tugmasi o‘rnida saytdagidek izoh chiqadi.
- Namuna yozuvlar haqiqiy hisobotlarga kirmasligi kerak. Hozir bosh sahifadagi «faol aksiyalar» soni namunalarni ham sanaydi; bu 0-bosqichda ajratiladi.
- Asosiy sahifada va biznes ochish ekranida «Sizning sahifangiz shunday ko‘rinadi» karuseli.
- Haqiqiy bizneslar ko‘paygach, admin bitta tugma bilan namunalarni yashiradi (Admin → Sozlamalar; bu allaqachon bor). Ilova buni `/config` orqali darhol biladi.

---

## 3. API: nima bor, nima qo‘shiladi

Hozir sayt sahifalari ma’lumotni bazadan to‘g‘ridan-to‘g‘ri oladi. Ochiq API’da faqat ro‘yxat va yozish amallari bor.

### 3.1. Hozir bor (ilova shundayligicha ishlata oladi)

| API | Vazifa |
| --- | --- |
| `GET /api/v1/deals` | Aksiyalar ro‘yxati, qidiruv, filtr, «yaqin» saralash |
| `POST /deals/{id}/redemptions` | Band qilish (`Idempotency-Key` bilan) |
| `POST /redemptions/{id}/cancel` | Kodni bekor qilish |
| `PUT/DELETE /favorites/{dealId}`, `/follows/{businessId}` | Saqlash, obuna |
| `POST /reviews` | Baho |
| `PATCH /me`, `DELETE /me` | Profil, hisobni o‘chirish |
| `POST /contact` | Murojaat |
| `POST /business/{id}` → `redeem.lookup`, `redeem.complete` | Kassada kodni tekshirish |
| `POST /business/{id}/media` | Rasm yuklash (JPEG/PNG/WebP, ≤ 700 KB) |

### 3.2. Qo‘shilishi kerak (0-bosqich, ilovadan oldin)

| # | Nima | Nega |
| --- | --- | --- |
| 1 | **Bearer token** (`Authorization: Bearer …`) — sessiyalar jadvali o‘sha | Ilovada cookie ishonchsiz; NFCSTORE ham shunga o‘tgan |
| 2 | Telegram orqali kirish ilovada: `start` so‘rov kalitini JSON’da qaytaradi, `status` tasdiqlanganda tokenni qaytaradi; bot «Ilovaga qaytish» havolasini beradi | Hozir token faqat cookie’da keladi |
| 3 | `x-app: bugunbor` va `x-app-build` sarlavhalari sessiyaga yoziladi; admin panelda «Ilova / sayt» statistikasi | Kim ilovadan foydalanayotgani ko‘rinsin |
| 4 | `GET /api/v1/config`: demo rejimi, tariflar ochiqmi, to‘lov yoqilganmi, ilovaning eng past versiyasi | Ilova narx va to‘lovni o‘zi yashirsin; eski versiyani yangilashga majburlash |
| 5 | Har bir aksiya va biznesda `isDemo` belgisi | Hozir API’da yo‘q — «Namuna» belgisi uchun kerak |
| 6 | `GET /deals/{slug}` (filiallar, shartlar, biznes, reyting) va `GET /businesses/{slug}` (+ sharhlar) | Hozir faqat sahifa sifatida bor |
| 7 | `GET /categories`, `GET /cities` | Ilovada slug emas, nom ko‘rsatish uchun |
| 8 | `GET /me`, `GET /me/redemptions` (faol kod bilan), `GET /me/favorites`, `GET /me/follows` | Profil, Kodlarim, Saqlanganlar |
| 9 | Shikoyat: `POST /reports` (aksiya, biznes, sharh + yopiq sabablar ro‘yxati) + admin navbati + Telegram ogohlantirishi | Google Play foydalanuvchi kontenti qoidasi |
| 10 | Bloklash: `PUT/DELETE /me/blocks/{businessId}` — bloklangan biznes lentada chiqmaydi | Google Play foydalanuvchi kontenti qoidasi |
| 11 | Yagona ega ham hisobini o‘chira olsin: «Biznesni yopish va hisobni o‘chirish» bitta qadamda | Play: hisobni o‘chirish har doim mumkin bo‘lishi kerak |
| 12 | Xatolar kod bilan (`error.code`); ilova matnni o‘zi tarjima qiladi | Hozir ba’zi maydon xatolari inglizcha keladi |
| 13 | `/.well-known/assetlinks.json` (upload va Play imzo barmoq izlari, secret’dan) | App Links: `bugunbor.uz/deals/…` havolalari ilovada ochilsin |
| 14 | Tekshiruvchi (reviewer) uchun kirish: alohida, oldindan tayyorlangan hisob va Worker secret’dagi kod bilan; admin o‘chira oladi, har kirish jurnalga yoziladi | Google tekshiruvchisi Telegram orqali kira olmaydi. Shaxsiy hisob berilmaydi |
| 15 | Rasm manzillari nisbiy (`/media/…`, `/photos/…`) qoladi — ilova to‘liq manzilga aylantiradi (test bilan) | Keng tarqalgan xato — oldindan test |

**Kontrakt testlari (0-bosqichning bir qismi):**
- Server tomonida har bir ilova API’sining javob kalitlari va query parametrlari testda qotiriladi. Namuna JSON’lar repoda `contracts/` papkasida saqlanadi.
- Ilova testlari xuddi shu JSON’larni o‘qiydi.
- Kalit o‘zgarsa, ikkala tomonda ham test qizil bo‘ladi. NFCSTORE’dagi «jim bo‘sh ro‘yxat» xatolari shunday yopilgan.

---

## 4. To‘lov va Google Play Billing

**Qaror (2026-09-26):** ilovada hech qanday to‘lov bo‘lmaydi. Onlayn to‘lov hozircha o‘chiq. Keyin qo‘shilganda ham faqat saytda ishlaydi.

- **Mijoz ilovada hech narsa sotib olmaydi.** Band qilish bepul, to‘lov joyida — biznesning kassasida (jismoniy mahsulot yoki xizmat). Google Play Billing talab qilinmaydi.
- **Biznes tariflari** raqamli xizmat. Agar ilova ichida sotilsa, Play Billing talab qilinadi. Shuning uchun ilovada tarif sahifasi, narx va «saytda to‘lang» havolasi **umuman bo‘lmaydi**. Tarif faqat saytda boshqariladi.
- Ilova hech qachon «to‘landi» holatini qo‘ymaydi, buni faqat server qiladi (saytdagi qoida o‘zgarmaydi).
- Chiqarishdan oldin Google’ning to‘lov siyosatining joriy matni qayta tekshiriladi.

---

## 5. Media va tezlik

- Rasm yuklashdan oldin siqiladi:
  - saytdagidek eng uzun tomoni 1280 / 1600 / 512 px;
  - ≤ 650 KB;
  - qayta kodlanganda EXIF, jumladan GPS, olib tashlanadi;
  - telefon HEIC rasmlari ham JPEG/WebP’ga o‘tkaziladi.
- Video va istoriya BugunBor’da yo‘q, shuning uchun MVP’ga kirmaydi. Keyin qo‘shilsa, NFCSTORE saboqlari qo‘llanadi:
  - faqat ekranda ko‘ringan video o‘ynaydi;
  - oldindan yuklanadi;
  - tayyor bo‘lguncha skelet ko‘rsatiladi.
- Rasmlar keshlanadi va o‘lchamiga qarab dekodlanadi (`memCacheWidth`).
- Ro‘yxatlar lazy. Og‘ir ish asosiy oqimda bajarilmaydi.
- Tablar almashganda qotmaydi. Router sessiya yangilanganda qayta qurilmaydi — NFCSTORE’dagi qotish sababi shu edi.

---

## 6. Xavfsizlik

- **Sessiya kaliti:** faqat `flutter_secure_storage`da. Zaxira nusxaga (Auto Backup) va boshqa telefonga ko‘chirishga kirmaydi.
- **Ilova ichida maxfiy kalit yo‘q:** Payme/Click, Telegram token va boshqalar faqat serverda.
- **Loglar:** shaxsiy ma’lumot va token chiqmaydi.
- **401 (sessiya tugadi):**
  - bitta joyda ushlanadi va kirish ekraniga yuboradi;
  - foydalanuvchiga bog‘liq ma’lumotlar foydalanuvchi ID’siga bog‘lanadi;
  - kirgandan keyin qayta so‘raladi, shuning uchun kirishdan oldingi xato «abadiy» qolmaydi.
- **Ruxsatlar:**
  - **Joylashuv:** faqat «Yaqinimdagilar» bosilganda. Oldin tushuntirish oynasi chiqadi, «faqat ishlatayotganda» ruxsati so‘raladi, taxminiy aniqlik yetarli. **Fonda olinmaydi.**
  - **Kamera:** faqat xodimning «Kodni tekshirish» ekranida.
  - **Rasm tanlash:** tizimning photo picker’i orqali, galereyaga to‘liq ruxsat so‘ralmaydi.
  - CI build’da ortiqcha ruxsat paydo bo‘lsa, build to‘xtaydi.

---

## 7. Testlar va CI — «qayta-qayta yuklash» yo‘q

**Tartib:**
1. O‘zgarishlar yig‘iladi.
2. CI’da hamma testlar yashil bo‘ladi: unit, widget, kontrakt, qatorlar (tarjima) testi, 360/390/430 kengliklar, 44 px tugmalar.
3. CI imzolangan APK va AAB quradi.
4. APK telefonda qo‘lda sinaladi. Test ro‘yxati `MANUAL_TEST.md`da bo‘ladi.
5. Shundan keyingina bitta build Internal testing’ga **qoralama (draft)** bo‘lib chiqadi.
6. **«Publish» tugmasini faqat siz bosasiz.**

**Qat’iy qoidalar:**
- Qizil test bilan build qilinmaydi.
- Testni o‘chirib yoki o‘tkazib yuborib «yashil» qilinmaydi.
- Har yangi funksiya bilan birga uning testi yoziladi: ekran ochiladi, tugma ishlaydi, bo‘sh va xato holatlar ishlaydi.
- CI’da emulyatorda haqiqiy backend bilan E2E sinov bo‘ladi: ro‘yxatdan o‘tish → kirish → aksiya ko‘rish → shikoyat → chiqish.
  - Telegram qadami test server’ida webhook bilan simulyatsiya qilinadi, xuddi saytni tekshirgandek.
  - Production’dagi haqiqiy ma’lumotga tegmaydi.
- «Nima yangi» matni uz/ru/en, har biri ≤ 500 belgi.

**Ilova joylashuvi:** kod shu repoda, `mobile/` papkasida bo‘ladi. Shunda kontrakt testlari server kodini ham ko‘ra oladi.

---

## 8. Google Play Console uchun tayyorlanadiganlar

| Narsa | Holat / kim qiladi |
| --- | --- |
| Dasturchi hisobi turi (shaxsiy yoki tashkilot) | **Siz aytasiz.** Shaxsiy bo‘lsa, Closed testing’da 12 tester 14 kun uzluksiz turishi shart (Internal testing sanalmaydi) |
| 12+ tester (Gmail manzillari) va fikr uchun Telegram guruhi | **Hozirdan yig‘ish kerak** |
| Maxfiylik siyosati URL | `https://bugunbor.uz/privacy` — tayyor, operator ma’lumotlari kerak |
| Hisobni o‘chirish URL | `https://bugunbor.uz/delete-account` — tayyor |
| Ilova ichida «Hisobni o‘chirish» | Profil → Hisobni o‘chirish (MVP’da bor) |
| App access (tekshiruvchi hisobi) | Alohida hisob + kod (3.2-jadval, 14-band). Ko‘rsatma matnini men tayyorlayman |
| Data safety | Pastdagi qoralama. Kodda haqiqatan nima yig‘ilsa, shunga mos |
| Content rating (IARC so‘rovnomasi) | Foydalanuvchi kontenti bor (sharh, biznes e’lonlari), qimor yo‘q, reklama yo‘q |
| Target audience | Yosh chegarasi (16 yoki 18) — maxfiylik siyosatidagi bilan bir xil |
| Ads | «Yo‘q» |
| Do‘kon sahifasi | Nomi, qisqa va to‘liq tavsif uz/ru/en; 512 px ikonka; 1024×500 banner; kamida 4 ta telefon skrinshoti (1080×1920, shaffoflik yo‘q). Skrinshotlar testlardan avtomatik olinadi |
| Aloqa emaili | Siz berasiz (maxfiylik siyosatidagi bilan bir xil) |
| Upload kaliti | CI yaratadi. Faqat GitHub secret’ida, sizda zaxira nusxasi bo‘ladi |
| App Links | `assetlinks.json` (3.2-jadval, 13-band) |

**Data safety qoralamasi:**

| Ma’lumot | Yig‘iladi | Maqsad | Uchinchi shaxsga beriladi |
| --- | --- | --- | --- |
| Ism | ha | hisob, kassirga ko‘rsatish | yo‘q |
| Telefon raqami | ha | hisob (Telegram tasdiqlaydi) | yo‘q |
| Foydalanuvchi ID (Telegram ID) | ha | kirish, xabarnoma | yo‘q |
| Taxminiy joylashuv | ha, **saqlanmaydi** (vaqtincha) | yaqin aksiyalar | yo‘q |
| Rasmlar (faqat biznes egalari) | ha | biznes va aksiya rasmlari | yo‘q |
| Ilovadagi harakatlar (band qilish, saqlash, baho) | ha | xizmat ishlashi | yo‘q |
| Boshqa xabarlar (Bog‘lanish, shikoyat) | ha | qo‘llab-quvvatlash, moderatsiya | yo‘q |
| Reklama ID, kontaktlar, SMS, fayllar | yo‘q | — | — |

- Uzatishda shifrlanadi (HTTPS).
- Foydalanuvchi o‘chirishni so‘rashi mumkin.

---

## 9. Bosqichma-bosqich reja

| Bosqich | Ichida | Tugash sharti |
| --- | --- | --- |
| **0. Server tayyorligi** | 3.2-jadvaldagi 1–15 bandlar, kontrakt testlari, admin panelda «Ilova» statistikasi | Hamma testlar yashil; sayt ishlashi o‘zgarmagan (saytdagi to‘liq sinov qayta o‘tadi) |
| **1. MVP ilova** | Asos: mavzu, uz/ru/en, navigatsiya, API mijoz, secure storage, 401. Keyin 2.3-dagi 15 ta ekran, namuna belgilari, shikoyat va bloklash, hisobni o‘chirish, kassir skaneri. CI: imzolangan APK/AAB | CI yashil; APK’ni siz telefonda sinab «bo‘ldi» deysiz |
| **2. Testerlar** | Bitta build Internal testing’ga qoralama bo‘lib chiqadi, siz Publish qilasiz. Shu vaqtda 12+ tester yig‘iladi | Testerlar ro‘yxati tayyor, ilova ularning telefonida ochiladi |
| **3. Closed testing** | 14 kun uzluksiz, ≥ 12 tester. Xatolar yig‘iladi va **haftasiga ko‘pi bilan bitta** tuzatilgan build chiqadi | 14 kun to‘ldi, jiddiy xato qolmadi |
| **4. Production** | Production’ga kirish arizasi (Google savollariga javoblar tayyorlanadi). Bosqichma-bosqich tarqatish: 20% → 100% | Siz «Publish» bosasiz |
| **5. Keyin** | Biznes kabineti ilovada, push xabarnomalar (Firebase), iOS (Apple talablari alohida tekshiriladi, masalan, uchinchi tomon orqali kirish qoidasi) | — |

---

## 10. Sizdan kerak bo‘ladigan qarorlar

1. Paket nomi `uz.bugunbor.app` — tasdiqlaysizmi? Keyin o‘zgarmaydi.
2. Google Play dasturchi hisobi bormi? Shaxsiymi yoki tashkilotmi? NFCSTORE bilan bir hisob bo‘lishi mumkin, lekin kalitlar alohida bo‘ladi.
3. MVP’da kassir skaneri bo‘lsinmi (taklif: ha), biznes kabineti esa keyinroq?
4. Push xabarnomalar: MVP’da faqat Telegram (taklif), Firebase keyin?
5. Yosh chegarasi: 16 yoki 18?
6. 12 tester: kimlarni taklif qilamiz? Ro‘yxatni hozirdan boshlash kerak.
