# Ertalabki hisobot — BugunBor

**Qisqacha:** sayt to‘liq ishlaydi va xatolarsiz. Barcha o‘zgarishlar GitHub’da, `claude/salom-b335gf` branchida. Endi APK’ga o‘tsak bo‘ladi.

| Tekshiruv | Natija |
| --- | --- |
| Avtomatik testlar | **78 / 78** o‘tdi (band qilish, kod, to‘lov davri, rasmlar, obuna, xabarnoma, baho, demo katalog, demo fotolar) |
| Sahifalar | 38 ta sahifa × 2 til (o‘zbek, rus) × 2 o‘lcham (telefon, kompyuter): **xato yo‘q**, ekrandan chiqib ketish yo‘q |
| To‘liq ssenariylar (brauzerda) | 5 ta: mijoz → kod → kassir; obuna → baho; rasm yuklash → moderatsiya; biznes ro‘yxatdan o‘tishi → tarif; admin panel — **hammasi ishladi** |
| Production build | Yig‘iladi va ishga tushadi. Demo login production’da o‘chiq (tekshirildi) |
| Kod sifati | Lint va TypeScript — **0 xato** |

---

## 1. Tunda nima qilindi

### Demo: har bir viloyat, har bir soha
- 17 viloyat markazi × 8 soha = **136 ta biznes, 272 ta aksiya**, har viloyatda boshqacha.
- Mahalliy taomlar va hunarmandchilik: Samarqand oshi va noni, Buxoro oshi sofi va so‘zanasi, Jizzax somsasi, Qarshi tandir go‘shti, Xorazm tuxum barakasi va shivit oshi, Nukus beshbarmog‘i, Marg‘ilon atlasi, Rishton kosalari, Chust do‘ppisi, Qo‘qon halvosi…
- **Narxlar realga yaqin (2026):** Toshkent narxlari asos, viloyatlarda 8–22% arzonroq. Narxlar menyudagidek yaxlitlangan: masalan, Toshkentda biznes-lanch 55 000 → 41 000 so‘m, Nukusda manti (5 dona) 32 000 → 24 000 so‘m.
- Demo bizneslarda **telefon raqami yo‘q**, shuning uchun hech kim tasodifan begona odamga qo‘ng‘iroq qilib qolmaydi. Saytning tepasida «Demo rejim» yozuvi turadi.

### Original fotolar
- Bizneslar aksiyaga **o‘z mahsulotining haqiqiy fotosini**, profiliga esa logotip va muqova rasmini yuklaydi. Rasm telefonning o‘zida siqiladi, sayt tez ochiladi.
- Server faqat haqiqiy rasm fayllarini (JPG, PNG, WebP) qabul qiladi. Moderator nomaqbul rasmni olib tashlay oladi.
- **Demo katalogda 85 ta haqiqiy foto bor** (Wikimedia Commons, erkin litsenziya). Har bir aksiyaning fotosi o‘z turiga mos: osh, somsa, tandir non, navvot, Siyob bozori, Chust do‘ppisi, Xiva o‘ymakorligi, so‘zana, kurash va boshqalar. Mashhur taomlarda 2–3 xil foto bor, shuning uchun katalogda bir xil rasm takrorlanavermaydi. Mualliflar «Rasm mualliflari» sahifasida ko‘rsatilgan.
- Harbiy mavzu umuman yo‘q: qurol, harbiy forma va harbiy texnika tushgan fotolar olinmaydi. Rasm skriptlari bunday fotolarni o‘zi chiqarib tashlaydi. Lazertag o‘rniga bilyard qo‘yildi.
- Telefonga fotoning kichik (720 px) nusxasi boradi, shuning uchun ro‘yxat tez ochiladi.

### Odamlarga qiziq bo‘ladigan yangi funksiyalar
- **Obuna:** mijoz yoqqan biznesga obuna bo‘ladi va uning yangi aksiyasi haqida **Telegram’da birinchi bo‘lib** xabar oladi.
- **Eslatma:** kod tugashiga 30 daqiqa qolganda Telegram’da ogohlantiriladi.
- **«Siz 16 000 so‘m tejadingiz»:** kod ishlatilgach shunday xabar va «⭐ Baholash» tugmasi keladi. Profilda jami tejalgan summa katta yashil bannerda ko‘rinadi.
- **Baholar:** faqat kodni haqiqatda ishlatgan mijoz baho qo‘yadi, shuning uchun soxta baho bo‘lmaydi. Reyting kartalarda, aksiya va biznes sahifasida ko‘rinadi.
- **Hozir ochiq / yopiq:** har bir kartada «Ochiq · 23:00 gacha» yoki «Yopiq · 09:00 da ochiladi» yoziladi. Filial kod muddati ichida ochilmasa, band qilishdan oldin ogohlantirish chiqadi.
- **Bosh sahifada jonli statistika:** faol aksiyalar, bizneslar soni, eng katta chegirma.
- Telegram’da aksiya havolasi ulashilganda **mahsulot rasmi** ko‘rinadi.

### Biznes uchun
- Kabinetda obunachilar soni, reyting va so‘nggi baholar ko‘rinadi.
- **QR poster:** biznes bitta tugma bilan A4 poster chop etadi va uni kassa yoki eshikka yopishtiradi. Mijoz skanerlab obuna bo‘ladi: yangi mijoz jalb qilishning oddiy yo‘li.
- Google uchun tuzilgan ma’lumot (JSON-LD) qo‘shildi: biznes manzili, reytingi, aksiya narxi. Bu qidiruvda yaxshiroq chiqishga yordam beradi.
- Moderatsiya natijasi (tasdiqlandi yoki rad etildi va sababi) egasiga Telegram’da boradi.
- «Biznes uchun» sahifasi va savol-javoblar yangi tizimga moslandi: avval bepul davr, keyin tarif.

### APK uchun tayyorgarlik
- Sayt endi o‘rnatiladigan ilova (PWA): manifest, BugunBor brendidagi «B» ikonkalari, oflayn sahifa va service worker.
- Kassir QR kodni kamera bilan skanerlashi uchun kamera ruxsati to‘g‘rilandi (avval bloklangan edi).

---

## 2. Topilgan va tuzatilgan xatolar

1. **Biznes profilini saqlab bo‘lmasdi**, agar Telegram, Instagram yoki sayt maydoni bo‘sh bo‘lsa. Ro‘yxatdan o‘tishda ham xuddi shu muammo bor edi. Tuzatildi va test qo‘shildi.
2. **Telefonsiz filial qo‘shib bo‘lmasdi.** Tuzatildi.
3. **Production’da shrift yuklanmasdi:** Inter fayllari 404 berar edi va sayt oddiy shriftda ko‘rinardi. Tuzatildi.
4. **Telefonda sahifa yon tomonga siljirdi:** admin kartalari, rus tilidagi «Разместить акцию» tugmasi va «Политика конфиденциальности» sarlavhasi. Tuzatildi.
5. **Bosh sahifada xavfsizlik sarlavhalari yo‘q edi** (vinext’ning kamchiligi). Tuzatildi.
6. **Kamera bloklangan edi,** shuning uchun QR skaner ishlamasdi. Tuzatildi.
7. Eski demo filialda **haqiqiy ko‘rinishdagi telefon raqami** qolgan ekan. O‘chirildi.

---

## 3. Sizdan kerak bo‘ladigan narsalar

1. **Telegram bot** (5 daqiqa): @BotFather → `/newbot` → nomi `BugunBor`, username masalan `bugunbor_bot`. Token menga kerak bo‘ladi.
2. **Serverdagi sozlamalar:**
   - `APP_URL`: saytingiz manzili.
   - `HASH_SECRET`: uzun tasodifiy matn. Bir marta qo‘yiladi va keyin o‘zgartirilmaydi.
   - `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME`, `TELEGRAM_WEBHOOK_SECRET`.
   - `ADMIN_PHONES`: sizning telefon raqamingiz. Shu raqam bilan kirsangiz, avtomatik admin bo‘lasiz.

   Bot saytga o‘zi ulanadi: deploydan keyin saytni bir marta ochishning o‘zi yetadi. Holatini Admin → Sozlamalar sahifasida ko‘rasiz.
3. **Original fotolar** tayyor, sizdan hech narsa kerak emas. Yana foto qo‘shmoqchi bo‘lsangiz, ularni Google Drive’dagi «BugunBor rasmlar» papkasiga tashlang. Yo‘riqnoma va yordamchi uchun promt `docs/RASMLAR.md` faylida.

---

## 4. Tariflar (taklif, admin panelda o‘zgartiriladi)

| | Start | Biznes | Premium |
| --- | --- | --- | --- |
| Oyiga | 149 000 so‘m | 299 000 so‘m | 599 000 so‘m |
| Filiallar | 1 | 3 | cheklanmagan |
| Bir vaqtda faol aksiyalar | 3 | 10 | cheklanmagan |
| Xodimlar | 2 | 5 | cheklanmagan |
| «Top»da ko‘rsatish | — | 1 | 3 |

- Biznes tasdiqlangan kuni **3 oy bepul** davr boshlanadi. Admin uni 1, 2 yoki 3 oy qilib o‘zgartira oladi.
- 3, 6 va 12 oylik to‘lovga mos ravishda 5%, 10% va 15% chegirma bor.
- Hozircha to‘lov qo‘lda tasdiqlanadi. Keyingi bosqichda Payme yoki Click ulanadi.

---

## 5. Keyingi qadam: APK

Sayt APK uchun tayyor. APK — bu Play Market’dan o‘rnatiladigan, lekin ichida shu saytning o‘zi ishlaydigan ilova (TWA). Buning uchun kerak:

1. Sayt doimiy manzilda (domen) ishlashi. Masalan, `bugunbor.uz`.
2. Google Play Developer hisobi (bir martalik $25).
3. Ilova paketi nomi. Taklif: `uz.bugunbor.app`.

Qolganini men qilaman: ilovani yig‘ish, imzolash, `assetlinks.json` va Play Market uchun rasmlar. iOS ilova ham xuddi shu asosda keyin qilinadi.

---

*To‘liq texnik tavsif: `docs/TIZIM.md` (qoidalar va jarayonlar), `docs/operations.md` (ishga tushirish), `README.md`.*
