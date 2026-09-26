# BugunBor tizimi — aniq tavsif

Bu hujjat BugunBor qanday ishlashining yagona manbasi. Sayt ham, keyingi bosqichdagi Android ilova (APK) ham shu qoidalar asosida ishlaydi. Qoida o‘zgarsa, avval shu hujjat, keyin kod o‘zgaradi.

**Shior:** «Bugun bor — ertaga bo‘lmasligi mumkin.»

**Mohiyat:** bizneslar vaqti va soni cheklangan aksiya joylaydi. Mijoz aksiyani saytda band qilib, bir martalik kod oladi. Kodni biznesga borib ko‘rsatadi va to‘lovni joyida qiladi.

---

## 1. Rollar

### Platforma rollari

| Rol | Kim | Nima qila oladi |
| --- | --- | --- |
| Mehmon | Kirmagan foydalanuvchi | Aksiyalarni ko‘rish, qidirish, biznes sahifasini ochish |
| Foydalanuvchi (`CUSTOMER`) | Telegram orqali kirgan har kim | Aksiyani band qilish, kodlarini ko‘rish, saqlash, biznes ochish |
| Moderator (`MODERATOR`) | Platforma xodimi | Bizneslarni va aksiyalarni tekshirish (tasdiqlash yoki rad etish) |
| Admin (`ADMIN`) | Platforma egasi | Moderator huquqlari + foydalanuvchilar, rollar, bloklash, kategoriyalar, murojaatlar, audit, sozlamalar |

Birinchi admin `ADMIN_PHONES` sozlamasidagi telefon raqam bilan Telegram orqali kirganda avtomatik admin bo‘ladi.

### Biznes ichidagi rollar

Bir foydalanuvchi bir nechta biznesda turli rolda bo‘lishi mumkin. Har bir so‘rovda server foydalanuvchining **shu biznesga** a’zoligini tekshiradi.

| Huquq | Egasi (`OWNER`) | Menejer (`MANAGER`) | Kassir (`CASHIER`) |
| --- | :---: | :---: | :---: |
| Kodni tekshirish va tasdiqlash | ✓ | ✓ | ✓ |
| Aksiya yaratish, yuborish, pauza, yakunlash | ✓ | ✓ | — |
| Filiallarni boshqarish | ✓ | ✓ | — |
| Statistika | ✓ | ✓ | — |
| Biznes profilini tahrirlash | ✓ | — | — |
| Jamoani boshqarish (xodim qo‘shish/o‘chirish) | ✓ | — | — |

---

## 2. Asosiy tushunchalar

- **Foydalanuvchi** — tasdiqlangan telefon raqami bo‘lgan odam. Telefon Telegram orqali tasdiqlanadi.
- **Biznes** — kafe, do‘kon, salon va hokazo. Nomi, tavsifi, kategoriyasi, shahri, telefoni, ixtiyoriy Telegram/Instagram/sayt manzili bor.
- **Filial** — biznesning manzili: shahar, manzil, xaritadagi nuqta, telefon, ish vaqti. Har biznesda kamida bitta filial bo‘ladi.
- **Aksiya** — chegirmali taklif: nomi, tavsifi, shartlari, asl va chegirmali narx, boshlanish va tugash vaqti, miqdori, bir mijozga limit, kod muddati, qaysi filiallarda amal qilishi.
- **Kod** — mijoz aksiyani band qilganda beriladigan bir martalik kod (masalan `K7P2QX`) va uning QR-kodi.
- **Saqlanganlar** — mijoz yoqtirgan aksiyalar ro‘yxati.
- **Audit jurnali** — muhim amallar tarixi (kim, qachon, nima qildi, oldin/keyin holat, sabab). Jurnaldan yozuv o‘chirilmaydi.

---

## 3. Holatlar

### 3.1. Biznes

```
Tekshiruvda (PENDING) ──tasdiq──▶ Tasdiqlangan (VERIFIED)
        │
        └──rad etish (sabab bilan)──▶ Rad etilgan (REJECTED) ──tahrirlab qayta yuborish──▶ Tekshiruvda
```

- Admin istalgan biznesni **to‘xtatib qo‘yishi** (suspend) va qayta yoqishi mumkin. To‘xtatilgan biznes aksiyalari saytda ko‘rinmaydi, yangi kod berilmaydi.
- Faqat **tasdiqlangan va to‘xtatilmagan** biznesning aksiyalari saytda ko‘rinadi.

### 3.2. Aksiya

```
Qoralama (DRAFT) ──yuborish──▶ Tekshiruvda (PENDING_REVIEW) ──tasdiq──▶ Tasdiqlangan (ACTIVE)
      ▲                              │   │                                  │  ▲
      └────qaytarib olish────────────┘   └─rad etish─▶ Rad etilgan (REJECTED) │  │
                                                     (tahrirlab qayta yuborish)│  │
                                                      Pauza (PAUSED) ◀────────┘  │
                                                             └──────davom────────┘
Tasdiqlangan yoki Pauza ──yakunlash──▶ Yakunlangan (ARCHIVED)
```

Tasdiqlangan aksiyaning saytdagi ko‘rinishi vaqt va miqdorga qarab o‘zi hisoblanadi:

| Ko‘rinish | Shart |
| --- | --- |
| Tez orada | Boshlanish vaqti hali kelmagan |
| **Faol** | Vaqt oralig‘ida va miqdor qolgan — faqat shu holatda band qilish mumkin |
| Tugadi | Miqdor 0 ga yetgan |
| Muddati o‘tgan | Tugash vaqti o‘tgan |

- Tasdiqlangan aksiyaning shartlari va narxini o‘zgartirib bo‘lmaydi. Aldov bo‘lmasligi uchun o‘zgartirish kerak bo‘lsa, nusxa olinadi va yangi aksiya tekshiruvdan o‘tadi.
- Aksiyani faqat biznes **tasdiqlangan** bo‘lsa tasdiqlash mumkin.

### 3.3. Kod

```
Faol (CLAIMED) ──kassir tasdiqladi──▶ Ishlatilgan (COMPLETED)
      ├──muddati tugadi──▶ Muddati o‘tgan (EXPIRED)    [joy qaytadi]
      └──mijoz bekor qildi──▶ Bekor qilingan (CANCELED) [joy qaytadi]
```

### 3.4. Kirish so‘rovi (Telegram)

```
Yaratildi (PENDING) ──botda /start──▶ Kutilmoqda (WAITING) ──tasdiq──▶ Tasdiqlandi (APPROVED) ──sayt sessiya ochdi──▶ Ishlatildi (CONSUMED)
Istalgan bosqichda: 10 daqiqa o‘tsa ▶ Muddati o‘tgan (EXPIRED); botda «Men emas» bosilsa ▶ Rad etildi (DENIED)
```

---

## 4. Jarayonlar

### 4.1. Kirish (Telegram bot orqali)

1. Mijoz saytda «Telegram orqali kirish» tugmasini bosadi. Sayt 4 xonali **moslik kodi** ko‘rsatadi va botni ochadigan havola beradi (kompyuterda QR ham chiqadi).
2. Botda «Start» bosiladi. Bot shu 4 xonali kodni ko‘rsatib, «Saytdagi kod bilan bir xilmi?» deb so‘raydi.
3. Birinchi marta kirayotgan foydalanuvchi «📱 Raqamni yuborish» tugmasi bilan **o‘z** kontaktini yuboradi. Bot kontakt aynan shu Telegram hisobiniki ekanini tekshiradi. Oldin kirgan foydalanuvchi «✅ Ha, men kiryapman» tugmasini bosadi.
4. Sayt so‘rov tasdiqlanganini ko‘radi va sessiya ochadi. Sessiya faqat so‘rovni boshlagan brauzerda ochiladi.
5. Sessiya 30 kun amal qiladi. «Chiqish» bosilganda darhol bekor qilinadi.

### 4.2. Mijoz: aksiyadan foydalanish

1. Aksiyani topadi: shahar, kategoriya, qidiruv yoki «Yaqinimdagilar» (joylashuv ruxsati bilan).
2. Aksiya sahifasida filialni tanlaydi va «Band qilish» ni bosadi. Kirmagan bo‘lsa, avval kirishga yo‘naltiriladi va keyin shu sahifaga qaytadi.
3. Server bitta tranzaksiyada holat, vaqt, miqdor va limitni tekshiradi, miqdorni 1 taga kamaytiradi va kod beradi.
4. Mijoz «Kodlarim» bo‘limida kodni, QR-kodni va qolgan vaqtni ko‘radi.
5. Filialga borib kodni ko‘rsatadi, kassir tasdiqlaydi va to‘lov joyida qilinadi.
   Kartada filial hozir ochiq yoki yopiqligi ko‘rinadi; filial kod muddati ichida ochilmasa, band qilishdan oldin ogohlantirish chiqadi.
6. Kodni bekor qilish mumkin. Bekor qilinsa yoki muddati o‘tsa, joy boshqalarga qaytadi.

### 4.3. Biznes: ro‘yxatdan o‘tish va aksiya

1. Foydalanuvchi «Biznes qo‘shish» formasini to‘ldiradi:
   - nom va kategoriya (belgili tugmalar);
   - shahar («Joylashuvimni aniqlash» eng yaqin shaharni o‘zi tanlaydi);
   - telefon (Telegram’dagi raqam oldindan yozilgan);
   - asosiy filial manzili (mo‘ljal bilan) va ish vaqti;
   - tavsif (kategoriyaga mos «Namuna matn» bor).

   Biznes **Tekshiruvda** holatiga tushadi va foydalanuvchi uning **Egasi** bo‘ladi.
2. Tizim arizani darhol **avtomatik tekshiradi** (4.6). Toza ariza o‘sha zahoti tasdiqlanadi va bepul davr boshlanadi. Shubhali ariza moderatorga qoladi, moderator uni tasdiqlaydi yoki sabab bilan rad etadi.
   Kabinetda «Profilni to‘ldiring» ro‘yxati turadi: logotip, muqova, batafsil tavsif, Telegram/Instagram, xaritadagi nuqta, birinchi aksiya.
3. Egasi yoki menejer aksiya yaratadi (qoralama) va tekshiruvga yuboradi.
4. Aksiya ham avtomatik tekshiriladi: toza bo‘lsa darhol tasdiqlanadi, shubhali bo‘lsa moderator tasdiqlaydi. Boshlanish vaqti kelganda aksiya saytda **Faol** bo‘ladi. Yangi aksiyaning boshlanish vaqti standart bo‘yicha «hozir», ya’ni aksiya tasdiqlanishi bilan saytda chiqadi. Egasi keyinroq vaqtni ham tanlashi mumkin.
5. Kassir «Kodni tekshirish» sahifasida kodni yozadi yoki QR-kodni kamera bilan skanerlaydi. Mijoz, aksiya va filial ma’lumotini ko‘rib «Tasdiqlash» ni bosadi.
6. Biznes aksiyaga o‘z mahsulotining **haqiqiy fotosuratini**, profiliga esa logotip va muqova rasmini yuklaydi. Rasm telefonda siqiladi (WebP, 1280 px gacha). Rasm bo‘lmasa, chiroyli belgi (emoji + rang) ko‘rsatiladi.
   Demo aksiyalarda o‘sha turdagi erkin litsenziyali haqiqiy foto chiqadi (Wikimedia Commons). Mualliflar «Rasm mualliflari» sahifasida ko‘rsatiladi (batafsil: `docs/RASMLAR.md`).

### 4.4. Mijoz bilan aloqa: obuna, xabarnoma, baho

1. Mijoz yoqqan biznesga **obuna** bo‘ladi (biznes yoki aksiya sahifasida «Obuna bo‘lish»).
2. Biznesning yangi aksiyasi tasdiqlanib, boshlanish vaqti kelganda obunachilarga **Telegram xabari** boradi.
3. Olingan kod tugashiga **30 daqiqa qolganda** eslatma boradi (kod muddati kamida 60 daqiqa bo‘lsa).
4. Kod ishlatilgach, mijozga «Siz N so‘m tejadingiz» xabari va **baholash** havolasi boradi.
5. Baho (1–5 yulduz va ixtiyoriy izoh) faqat ishlatilgan kod uchun, bir marta, 30 kun ichida qoldiriladi. Biznes reytingi shu baholardan hisoblanadi. Ism «Aziza K.» ko‘rinishida chiqadi.
6. Biznes egasi va menejerlari moderatsiya natijasini (tasdiqlandi / rad etildi va sababi) Telegram’da oladi.
7. Mijoz profilida xabarnoma turlarini o‘chirishi mumkin. Botni bloklagan foydalanuvchiga xabar yuborilmaydi.

### 4.5. Moderator va admin

- Navbatda tekshiruvdagi bizneslar va aksiyalar turadi. Rad etishda sabab majburiy. Sabab biznesga ko‘rsatiladi.
- Admin foydalanuvchini bloklashi mumkin: sessiyalari yopiladi va kira olmaydi. Admin rol berishi, biznesni to‘xtatishi, kategoriyalarni boshqarishi, murojaatlarni o‘qishi va audit jurnalini ko‘rishi mumkin.
- Moderator nomaqbul rasmni (logotip, muqova, aksiya rasmi) va haqoratli sharhni olib tashlaydi yoki yashiradi — sabab bilan.
- Admin tariflarni (narx va limitlar), bepul davr uzunligini (1–3 oy) va to‘lov ko‘rsatmalarini boshqaradi, to‘lov so‘rovlarini tasdiqlaydi yoki biznesga qo‘lda bepul oy/tarif beradi.
- Admin kompaniya rekvizitlarini kiritadi: yuridik nom, STIR, manzil, telefon. Ular futer, «Bog‘lanish» va oferta sahifalarida chiqadi.
- Odam kerak bo‘lganda moderator va adminlarga Telegram xabari boradi: tekshiruvni kutayotgan ariza yoki aksiya (sababi bilan). Qo‘lda to‘lov so‘rovi kelganda esa adminlarga xabar boradi.

### 4.6. Avtomatik moderatsiya

Har bir yangi (yoki qayta yuborilgan) biznes va aksiya yuborilgan zahoti tekshiriladi.
Hech narsa topilmasa, tizim moderatori (`usr_system`) tasdiqlaydi va bu audit jurnaliga yoziladi.
Biror belgi topilsa, ariza navbatda qoladi, sababi yoziladi va moderatorlarga xabar boradi.
**Tizim hech narsani rad etmaydi — rad etishni faqat odam qiladi.**

| Belgi | Biznes | Aksiya |
| --- | --- | --- |
| Matnda havola yoki sayt manzili | ✓ | ✓ |
| Taqiqlangan mavzu: qurol, giyohvandlik, qimor, 18+, «tez boyish» | ✓ | ✓ |
| Alkogol, tamaki, vape, kalyan (reklamasi cheklangan) | ✓ | ✓ |
| Karta raqami yoki kartaga pul o‘tkazish so‘rovi | ✓ | ✓ |
| Matn juda qisqa yoki tushunarsiz | ✓ | ✓ |
| Shu shaharda shu nomli biznes bor | ✓ | |
| Egasining boshqa biznesi rad etilgan yoki to‘xtatilgan | ✓ | |
| Xaritadagi nuqta O‘zbekistondan tashqarida | ✓ | |
| Oldin moderator rad etgan (qayta yuborilgan) | ✓ | ✓ |
| Chegirma 80% dan katta, narx 1 000 so‘mdan past yoki asl narx 50 mln so‘mdan yuqori | | ✓ |
| Biznesning 30 kun ichida rad etilgan yoki to‘xtatilgan aksiyasi bor | | ✓ |

- So‘zlar o‘zbek (lotin va kirill) va rus tilida qidiriladi.
- Oddiy matnlarga xato bilan tegmaydi: «sport seksiyasi», «alkogolsiz», «shisha idish», «travmatolog» va hokazo. Demo katalogdagi barcha 136 biznes va 272 aksiya tekshiruvdan o‘tadi.
- Egasi o‘zi tuzata oladigan sabablarni (havola, karta raqami, narx, qisqa matn, xarita) kabinetda ko‘radi.
- Tuzatib saqlasa, ariza darhol qayta tekshiriladi.
- Haqoratli so‘z, havola yoki karta raqami bor sharh avtomatik yashiriladi, moderator uni qaytarishi mumkin.
- Uchala avtomatik funksiya **Admin → Sozlamalar → Avtomatik moderatsiya** da alohida yoqiladi yoki o‘chiriladi.
- Avtomatik tasdiqlash o‘chiq bo‘lsa ham tekshiruv ishlaydi, moderatorga natijasi ko‘rsatiladi.
- «Avto tasdiqlangan» filtri oxirgi 7 kunda avtomatik tasdiqlanganlarni qayta ko‘rish uchun.

---

## 5. Qoidalar (raqamlar)

| Qoida | Qiymat |
| --- | --- |
| Minimal chegirma | 10% |
| Aksiya davomiyligi | 30 daqiqadan 30 kungacha |
| Aksiya miqdori | 1–10 000 dona yoki cheklanmagan |
| Bir mijozga limit | 1–10 (standart 1) |
| Kod amal qilish muddati | 30, 60, 120 yoki 240 daqiqa (standart 120). Kod olingan paytdan hisoblanadi |
| Bir aksiyada bir vaqtda faol kod | Mijozga 1 ta |
| Kod formati | 6 belgi: A–Z va 2–9, chalkash belgilarsiz (0, O, 1, I yo‘q). QR-kodda `bugunbor.uz/r/KOD` havolasi bo‘ladi |
| Kod tekshirish urinishlari | Bitta xodimga 10 daqiqada 30 ta |
| Kirish so‘rovi | 10 daqiqa amal qiladi, bitta IP dan 10 daqiqada 10 ta |
| Sessiya | 30 kun |
| Band qilish | Bitta foydalanuvchiga daqiqada 10 ta so‘rov |
| Murojaat formasi | Bitta IP dan 10 daqiqada 5 ta |
| Rad etish sababi | Kamida 10 belgi |
| Vaqt zonasi | Hamma vaqt Toshkent vaqtida ko‘rsatiladi (UTC+5), bazada UTC saqlanadi |
| Demo aksiyalar | Faqat namuna uchun: production’da (`DEMO_SEED=true`) ko‘rinadi, lekin band qilib bo‘lmaydi. Band qilish faqat ishlab chiqish muhitida ishlaydi |

**To‘lov:** mijoz biznesga joyida to‘laydi. BugunBor mijozdan pul olmaydi. Bizneslar tarifni Payme yoki Click orqali yoki bank o‘tkazmasi bilan to‘laydi (`docs/TOLOV.md`).

### 5.1. Bizneslar uchun tariflar

| | Start | Biznes | Premium |
| --- | --- | --- | --- |
| Oylik narx | 149 000 so‘m | 299 000 so‘m | 599 000 so‘m |
| Filiallar | 1 | 3 | cheklanmagan |
| Bir vaqtda faol aksiyalar | 3 | 10 | cheklanmagan |
| Xodimlar | 2 | 5 | cheklanmagan |
| «Top» (yuqorida ko‘rsatish) | — | 1 | 3 |

- Biznes tasdiqlangan kuni **bepul davr** boshlanadi (standart 3 oy, admin 1–3 oy qilib o‘zgartiradi). Bepul davrda «Biznes» tarifi imkoniyatlari ishlaydi.
- 3, 6 va 12 oylik to‘lovga mos ravishda 5%, 10% va 15% chegirma bor. Biznes tarifni «Tarif» sahifasida tanlaydi.
- **Onlayn to‘lov (Payme, Click):** to‘lov tizimi serverga tasdiq yuborganda tarif o‘zi yoqiladi. «To‘landi» holatini faqat server qo‘yadi.
  `PAYMENTS_ENABLED=true` bo‘lmaguncha tugmalar ustida «Tez kunda» turadi.
- **Bank o‘tkazmasi:** biznes ko‘rsatmaga ko‘ra to‘laydi, admin to‘lovni tasdiqlaydi.
- To‘lov, qaytarish va bekor qilish shartlari ommaviy ofertada: `/oferta`.
- Bepul davr yoki tarif tugasa, biznes aksiyalari saytda ko‘rinmaydi va yangi kod berilmaydi; ma’lumotlar saqlanadi. Tarif tanlangach, hammasi qayta ishlaydi.
- Narx va limitlar admin panelda o‘zgartiriladi.

---

## 6. Sahifalar

**Ommaviy:** `/` bosh sahifa · `/discover` aksiyalar (qidiruv, filtr, saralash) · `/categories` va `/categories/[slug]` · `/businesses/[slug]` biznes sahifasi · `/deals/[slug]` aksiya sahifasi · `/business` bizneslar uchun · `/how-it-works` · `/faq` · `/contact` · `/terms` · `/privacy` · `/oferta` ommaviy oferta · `/login`

**Mijoz:** `/account` profil (tejalgan summa, xabarnomalar) · `/account/codes` kodlarim va baholash · `/account/saved` saqlanganlar va obunalar

**Biznes:** `/business/onboarding` · `/business/dashboard` · `/business/redeem` kodni tekshirish · `/business/deals` · `/business/deals/new` · `/business/deals/[id]` · `/business/branches` · `/business/team` · `/business/profile` (logotip, muqova) · `/business/billing` tarif

**Admin:** `/admin` · `/admin/businesses` · `/admin/deals` · `/admin/reviews` sharhlar · `/admin/messages` · `/admin/billing` tariflar · `/admin/users` · `/admin/categories` · `/admin/audit` · `/admin/settings`

Mobil pastki menyu: Asosiy · Qidiruv · Saqlangan · Kodlarim · Profil.

---

## 7. Tillar

Sayt o‘zbek (lotin) va rus tillarida ishlaydi. Til tepadagi UZ/RU tugmasi bilan almashadi va brauzerda eslab qolinadi. Tizim matnlari tarjima qilingan. Biznes yozgan aksiya matni u yozgan tilda ko‘rsatiladi.

---

## 8. Xavfsizlik

- Kirish faqat Telegram orqali tasdiqlangan telefon bilan. Sessiya tokeni bazada faqat hash ko‘rinishida saqlanadi. Cookie `HttpOnly` va `SameSite=Lax`, HTTPS da `Secure`.
- Har bir o‘zgartiruvchi so‘rovda manba (Origin) tekshiriladi.
- Biznes ma’lumotiga faqat shu biznes a’zosi, rol ruxsat bergan amal doirasida kira oladi. Bu server tomonida tekshiriladi.
- Kod bazada hash ko‘rinishida saqlanadi. To‘liq kod faqat egasiga ko‘rsatiladi.
- Band qilish atomar bajariladi: ikki kishi oxirgi joyni bir vaqtda olsa, faqat bittasiga beriladi.
- Telegram webhook maxfiy token bilan tekshiriladi.
- Kirish, band qilish, kod tekshirish va murojaat so‘rovlari cheklanadi (rate limit).
- Moderatsiya, rollar, bloklash va kod tasdiqlash audit jurnaliga yoziladi.

---

## 9. Keyingi bosqichlar

1. **Android ilova (APK)** — sayt PWA sifatida tayyor (manifest, ikonkalar, oflayn sahifa). Ilova Trusted Web Activity bo‘ladi: saytning o‘zi, lekin Play Market’dan o‘rnatiladi.
2. **iOS ilova** — xuddi shu asosda.
3. **Onlayn to‘lovni yoqish** — kod tayyor. Kalitlar kiritilib sandbox’da tekshirilgach, `PAYMENTS_ENABLED=true` qilinadi (`docs/TOLOV.md`).
