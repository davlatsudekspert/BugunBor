# BugunBor — loyiha konsepsiyasi (asl brif)

Bu hujjat BugunBor'ning to‘liq mahsulot konsepsiyasi — mahsulot va xizmat e’lonlari,
joylashuv tizimi, vaqt asosidagi status avtomatikasi, biznes va admin panellari,
monetizatsiya va texnik arxitektura bo‘yicha asl o‘zbek tilidagi brif. `product-spec.md`
ushbu konsepsiyani ingliz tilidagi qisqa xulosaga va joriy bosqichda nima
qurilgani/qurilmaganiga tarjima qiladi — konsepsiya bilan spec o‘rtasida
nomuvofiqlik topilsa, spec'dagi "Ushbu bosqichda amalga oshirilgan" bo‘limi haqiqiy
holatni ko‘rsatadi.

---

## 1. BugunBor nima?

**BugunBor — O‘zbekiston bo‘ylab faqat ma’lum vaqt davomida amal qiladigan mahsulot va xizmat chegirmalari platformasi.**

Oddiy marketplace'dan asosiy farqi: **har bir taklifning boshlanish va tugash vaqti bor.**

Masalan:

🔥 -35%

Erkaklar krossovkasi
Oddiy narx: 450 000 so‘m
BugunBor: **299 000 so‘m**

⏱ Tugashiga: **02:17:43**

📦 Qoldi: **4 dona**

📍 Andijon shahri · 1.8 km

---

Yoki xizmat:

🚗 Premium avtomoyka

Oddiy narx: 150 000 so‘m
BugunBor: **99 000 so‘m**

⏱ Taklif 19:00 gacha

🎟 Bo‘sh joy: **3 ta**

📍 Andijon shahri

[BRON QILISH]

---

## 2. Platformada 2 xil e’lon bo‘ladi

### A. MAHSULOT

Aniq tovar sotiladi: kiyim, oyoq kiyim, telefon aksessuarlari, elektronika,
uy-ro‘zg‘or buyumlari, kosmetika, gullar, sovg‘alar, kitoblar, kanselyariya,
bolalar tovarlari, sport buyumlari.

Birinchi bosqichda faqat **tekshirilgan bizneslar** mahsulot joylashtiradi. Oddiy
odamlarning OLXga o‘xshab istagan narsasini joylashtirishiga MVPda ruxsat
bermaymiz. Bu BugunBor'ni oddiy e’lonlar saytidan ajratadi.

### B. XIZMAT

Vaqti bo‘sh qolgan bizneslar skidka chiqaradi: barber, go‘zallik saloni,
avtomoyka, detailing, fotosessiya, fotostudiya, coworking, futbol maydoni, sport
zali, repetitorlik, ustalar xizmatlari, boshqa bron qilinadigan xizmatlar.

---

## 3. Joylashuv tizimi

Foydalanuvchi sayt yoki Mini App'ni ochganda:

**Variant 1 — Mening joylashuvimdan foydalanish.** Telefon lokatsiyaga ruxsat
so‘raydi; ruxsat berilsa tizim eng yaqin skidkalarni chiqaradi ("Sizga yaqin:
Barber — 700 metr, Krossovka — 1.2 km, ...").

**Variant 2 — Qo‘lda tanlash.** Viloyat → Shahar/tuman → (kerak bo‘lsa) Mahalla
yoki xaritada nuqta.

**Masofa filtri:** 1 km / 3 km / 5 km / 10 km / 25 km / 50 km yoki Butun tuman /
Butun viloyat.

---

## 4–6. E’lon joylashtirish — mahsulot

1-qadam: Mahsulot yoki Xizmat tanlash.

Mahsulot uchun shart: aniq nom ("Poyabzal skidkada" kabi noaniq bo‘lmaydi),
kamida 2 ta va maksimal 6 ta rasm (1-rasm — asosiy cover), xususiyatlar
(kategoriya, jins, razmer, rang, holat, brend, model), Oddiy narx + BugunBor
narxi (tizim foizni avtomatik hisoblaydi).

**Mahsulot soni** aniq yoziladi ("Sotuvda: 7 dona") va har bron/xariddan keyin
avtomatik kamayadi; 0 dona bo‘lganda "SOTILDI" va e’lon faol ro‘yxatdan
avtomatik olib tashlanadi. Biznes xohlasa bir xaridorga limit qo‘yadi (1/2/3
dona yoki cheklanmagan).

## 7. E’lon joylashtirish — xizmat

Xizmatda "dona" o‘rniga **bo‘sh slotlar** bo‘ladi (masalan 15:00, 16:00, 17:30,
19:00). Bir odam bir slotni bron qilsa, o‘sha slot boshqalarga yopiladi.

## 8–12. Skidka hayot davri

Biznes skidkani hozir chiqarishi shart emas — boshlanish va tugash vaqtini
oldindan belgilaydi, e’lon **REJALASHTIRILGAN** holatda saytda ko‘rinmay turadi.
Belgilangan vaqtda **server o‘zi** e’lonni **FAOL** holatiga o‘tkazadi — biznes
telefonni ochishi shart emas.

Boshlanishdan oldin: narx, rasmlar, mahsulot soni, boshlanish/tugash vaqti,
tavsif — hammasi erkin tahrirlanadi, e’lonni o‘chirish ham mumkin.

FAOL bo‘lgandan keyin qoidalar qattiqlashadi — foydalanuvchi ishonchini
saqlash uchun: ❌ narxni oshirish, ❌ boshqa mahsulotga almashtirish, ❌ asosiy
xususiyatlarni almashtirish mumkin emas. Lekin: ✅ narxni yanada tushirish,
✅ mahsulot sonini ko‘paytirish, ✅ e’lonni muddatidan oldin tugatish mumkin.

Tugash vaqti kelganda server avtomatik **TUGAGAN** holatiga o‘tkazadi.

## 13. Auto Skidka

Biznes vaqt oralig‘iga qarab bosqichma-bosqich pasayadigan narx belgilashi
mumkin (masalan 12:00–15:00 -10%, 15:00–18:00 -20%, 18:00–20:00 -30%), minimal
narx chegarasi bilan. _(Keyingi bosqichga qoldirilgan — pastdagi "Ushbu
bosqichda" bo‘limiga qarang.)_

## 14. E’lon statuslari

DRAFT → SCHEDULED → LIVE → (SOLD_OUT | EXPIRED | STOPPED), moderatsiyada
PENDING_REVIEW yoki REJECTED, tarixiy yozuv sifatida ARCHIVED.

## 15–18. Bosh sahifa, kartochka, "tez tugaydi" hook, eslatma

Bosh sahifada: joylashuv tanlagich, "Hozir eng ko‘p olinmoqda", "Tugashiga oz
qoldi", "Sizga yaqin", "-50% va undan yuqori", "Hozirgina boshlandi",
"Mahsulotlar"/"Xizmatlar" bo‘limlari. Har bir kartochka rasm, foiz, nom, eski/
yangi narx, countdown, qolgan miqdor, masofa va reytingni bitta qarashda
ko‘rsatadi. "🔔 Boshlanganda menga ayt" — Telegram orqali eslatma yuboradi.
_(Eslatma — keyingi bosqich.)_

## 19–20. Telegram Mini App

bugunbor.uz (sayt/PWA), @BugunBorBot va uning ichidagi Mini App — bir xil
backend/database, Telegram orqali kirish (alohida parol yo‘q), Mini App ham
lokatsiya so‘raydi. _(Mini App qobig‘i — keyingi bosqich; API allaqachon
Telegram-mos.)_

## 21–23. Biznes profili, tasdiqlash, soxta skidkaga qarshi

Biznes akkauntlar Oddiy/Tasdiqlangan bo‘ladi, admin STIR/faoliyat/manzil kabi
ma’lumotlarni tekshiradi. Narx tarixi saqlanadi — biznes sun’iy ravishda "oddiy
narx"ni oshirib, keyin "chegirma" qilib ko‘rsata olmaydi; ko‘p shikoyat tushsa
e’lon bloklanadi.

## 24–26. Kabinetlar va 5 qadamli e’lon yaratish

Foydalanuvchi kabineti: Sevimlilar, Bronlarim, Buyurtmalarim, Eslatmalar,
Joylashuv, Baholarim, Profil. Biznes kabineti: bugungi natija, e’lonlar holati
bo‘yicha sanoq (Faol/Rejalashtirilgan/Tugagan), + Mahsulot / + Xizmat. E’lon
yaratish 5 qadamda: tur → nom/kategoriya/rasmlar → narx → dona/slot →
boshlanish/tugash → Rejalashtirish.

## 27–28. Admin panel va real-time statistika

Foydalanuvchilar, bizneslar, tasdiqlash so‘rovlari, e’lonlar, shikoyatlar,
kategoriyalar, viloyatlar/tumanlar, bannerlar, promokodlar, bronlar, to‘lovlar,
statistika, bloklangan akkauntlar, audit log. _(To‘liq admin UI — keyingi
bosqich; audit log va moderatsiya bu bosqichda ishlaydi.)_

## 29–30. Monetizatsiya va to‘lov

FREE (10 ta faol e’longacha) / PRO (cheksiz e’lon, Auto Skidka, kengaytirilgan
statistika) / BOOST (bitta e’lonni 24 soatga TOP qilish). MVP uchun to‘lov —
BugunBor orqali bron qil, biznesning o‘zida to‘la; Click/Payme keyinroq
qo‘shiladi. _(Tariflar va onlayn to‘lov — keyingi bosqich.)_

## 31. Bron kodi

Foydalanuvchi bron qilganda bir martalik kod/QR oladi (`BB-######`), biznes
skanerlaydi, status BRON QILINGAN → FOYDALANILDI bo‘ladi.

## 32–35. Texnik arxitektura va xavfsizlik

Next.js/React/TypeScript/Tailwind/PWA, Supabase/PostgreSQL, telefon+OTP yoki
Telegram Mini App autentifikatsiyasi, Supabase Storage/S3, region_id/
district_id/latitude/longitude. Har bir biznes faqat o‘z e’lonlarini
o‘zgartira oladi, admin amallari audit logda yoziladi, rate-limit va bot
himoyasi bo‘ladi, xaridorning aniq GPS nuqtasi sotuvchiga hech qachon
berilmaydi — faqat masofa hisoblash uchun ishlatiladi.

## 36. MVPda nimalarni qilamiz? (1-bosqich)

Sayt, PWA, Telegram Mini App, ro‘yxatdan o‘tish, viloyat/tuman, GPS, mahsulot
va xizmat e’lonlari, rasm upload, aniq mahsulot soni, xizmat slotlari,
countdown, rejalashtirilgan nashr, avtomatik muddat tugashi, bron qilish,
QR/bron kod, admin panel.

## 37–40. Kelajak (AI, brend g‘oyasi, asosiy printsip)

BugunBor AI bo‘sh vaqtlarni aniqlab avtomatik skidka tavsiya qiladi
_(keyingi bosqich)_. Brend: "Bugun bor. Vaqtida ol." Asosiy formula:

**Qayerdaman? × Yaqinimda nima bor? × Qancha arzon? × Nechta qoldi? × Qachongacha? = BUGUNBOR**
