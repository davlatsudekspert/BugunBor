# Onlayn to‘lov: Payme va Click

Bizneslar tarifni (Start, Biznes, Premium) Payme yoki Click orqali to‘laydi. To‘lov tizimi
serverimizga to‘lovni tasdiqlaganda tarif o‘zi yoqiladi. Qo‘lda to‘lov (bank o‘tkazmasi va admin
tasdig‘i) avvalgidek ishlaydi.

Hozir to‘lov **o‘chiq**. Bundan tashqari, tariflarning o‘zi ham yopiq (bepul ishga tushirish, `docs/TIZIM.md` 5.1).
Shuning uchun onlayn to‘lov tariflar ochilgandan keyin kerak bo‘ladi.

Tariflar ochiq, to‘lov esa o‘chiq bo‘lsa, «Tarif» sahifasida Payme va Click tugmalari rasmiy logotiplar bilan
ko‘rinadi, lekin bosilmaydi va ustida **«Tez kunda»** yozuvi turadi.

## Qanday ishlaydi

1. Biznes egasi tarif va muddatni tanlab, Payme yoki Click tugmasini bosadi.
2. Server buyurtma yaratadi (`billing_requests`, holati `PENDING`). Keyin to‘lov sahifasiga havola beradi:
   - Payme: `checkout.paycom.uz` (test rejimida `test.paycom.uz`);
   - Click: `my.click.uz/services/pay`.
3. To‘lov tizimi serverimizni chaqiradi: Payme — `CheckPerformTransaction`, `CreateTransaction`, `PerformTransaction`; Click — `Prepare` va `Complete`.
4. Buyurtma faqat **server** tomonida, `PerformTransaction` yoki `Complete` muvaffaqiyatli kelganda `PAID` bo‘ladi. O‘sha tranzaksiyada tarif muddati uzayadi.
   Brauzer yoki mijoz ilovasi «to‘landi» holatini qo‘ya olmaydi.
5. Egasiga Telegram’da «To‘lov qabul qilindi» xabari boradi. Tarif sahifasi natijani o‘zi ko‘rsatadi.

Himoya:

- summa tiyinda solishtiriladi;
- takroriy chaqiriq bir xil javob oladi (tranzaksiya ID bo‘yicha);
- bir buyurtmaga bitta ochiq tranzaksiya bo‘ladi;
- Payme’da 12 soatdan eski tranzaksiya bekor qilinadi;
- Payme to‘lovni qaytarsa (`CancelTransaction`), tarif muddati orqaga qaytariladi;
- har bir amal audit jurnaliga yoziladi.

## Kassa kabinetiga kiritiladigan manzillar

| Tizim | Manzil |
| --- | --- |
| Payme (Merchant API endpoint) | `https://bugunbor.uz/api/v1/payments/payme` |
| Click Prepare URL | `https://bugunbor.uz/api/v1/payments/click/prepare` |
| Click Complete URL | `https://bugunbor.uz/api/v1/payments/click/complete` |

- Hisob maydoni (Payme `account`): **`order_id`** — buyurtma raqami.
- Click’da buyurtma raqami `merchant_trans_id` bo‘lib keladi.
- Manzillar **Admin → Sozlamalar → Onlayn to‘lov** bo‘limida ham ko‘rinadi.

## Sozlamalar (Cloudflare Worker)

Kalitlar **faqat Worker secret** sifatida kiritiladi. Ular kodda, repoda, logda yoki chatda bo‘lmaydi.
NFCSTORE kassasining kalitlari ishlatilmaydi: BugunBor uchun alohida Payme kassasi va Click servisi ochiladi.

| Nomi | Nima | Standart |
| --- | --- | --- |
| `PAYME_MERCHANT_ID` | Payme kassa ID | — |
| `PAYME_KEY` | Payme kaliti (test yoki haqiqiy) | — |
| `PAYME_SANDBOX` | `true` — test kassa (`test.paycom.uz`) | `true` |
| `CLICK_SERVICE_ID`, `CLICK_MERCHANT_ID`, `CLICK_SECRET_KEY` | Click servis ma’lumotlari | — |
| `CLICK_SANDBOX` | `true` — test rejimi | `true` |
| `PAYMENTS_ENABLED` | `true` bo‘lsa, tugmalar ishlaydi | `false` |
| `PAYME_IKPU`, `PAYME_PACKAGE_CODE`, `PAYME_VAT_PERCENT` | Fiskal chek uchun MXIK (IKPU), qadoq kodi va QQS foizi. Faqat kassa talab qilsa | — |

Qaysi holatda nima ishlaydi:

- Kalitlar yo‘q yoki noto‘liq bo‘lsa, to‘lov manzillari xavfsiz rad javobini qaytaradi. Saytda «Tez kunda» turadi.
- Test rejimida (`*_SANDBOX=true`) to‘lov tizimi manzillarni **`PAYMENTS_ENABLED=false` bo‘lsa ham** chaqira oladi. Shu bilan sandbox testini o‘tkazish mumkin, tugmalar esa hali yopiq turadi.

## Dushanba: ishga tushirish tartibi

1. **Payme.** Business kabinetida bugunbor.uz uchun alohida kassa oching. Endpoint sifatida yuqoridagi manzilni kiriting.
   Worker secret’lariga `PAYME_MERCHANT_ID` va **test** kalitini (`PAYME_KEY`) qo‘shing. `PAYME_SANDBOX=true` qolsin.
2. **Payme sandbox.** `test.paycom.uz` dagi tekshiruvlarni o‘tkazing:
   - to‘g‘ri va noto‘g‘ri avtorizatsiya;
   - noto‘g‘ri summa va noto‘g‘ri hisob;
   - yaratish, bajarish, bekor qilish;
   - `CheckTransaction`, `GetStatement`.
3. **Click.** merchant.click.uz da servis oching. Prepare va Complete manzillarini kiriting.
   `CLICK_SERVICE_ID`, `CLICK_MERCHANT_ID`, `CLICK_SECRET_KEY` ni secret qiling. Test to‘lovni o‘tkazing.
4. **Rekvizitlar.** Admin → Sozlamalar → Kompaniya rekvizitlari: yuridik nom, STIR, manzil, telefon.
   Ular futerda, «Bog‘lanish» sahifasida va ofertada chiqadi.
5. **Haqiqiy rejim.**
   - Payme’ning haqiqiy kalitini `PAYME_KEY` ga qo‘ying.
   - `PAYME_SANDBOX=false` va `CLICK_SANDBOX=false` qiling.
   - Oxirida `PAYMENTS_ENABLED=true` qiling.
6. «Tez kunda» yozuvi o‘zi yo‘qoladi. Bitta kichik haqiqiy to‘lov bilan tekshirib, uni Payme/Click kabinetidan bekor qilib ko‘ring.
   Tarif muddati orqaga qaytishi kerak.

## Saytda bo‘lishi kerak bo‘lgan ma’lumotlar (Payme/Click tekshiradi)

| Talab | Qayerda | Holat |
| --- | --- | --- |
| Ommaviy oferta | `/oferta` | tayyor |
| Qaytarish va bekor qilish shartlari | `/oferta#qaytarish` | tayyor |
| Maxfiylik siyosati | `/privacy` (uz/ru/en) | tayyor; operator ma’lumotlari kiritilishi kerak |
| Hisobni o‘chirish | `/delete-account` | tayyor |
| Foydalanish shartlari | `/terms` | tayyor |
| Narxlar so‘mda | `/business` (tariflar), `/oferta#tariflar`, kabinetdagi «Tarif» | tayyor (bazadan olinadi) |
| Xizmat tavsifi | `/business`, `/how-it-works` | tayyor |
| Yuridik nom (STIR — Payme/Click so‘rasa) | futer, `/contact`, `/oferta#rekvizitlar` | **admin kiritishi kerak** |
| Aloqa: telefon, manzil | futer, `/contact` | **admin kiritishi kerak** |
| Fiskal MXIK (IKPU) | `PAYME_IKPU` secret | kassa talab qilsa |

Oferta matni bazadagi tariflar, bepul davr va rekvizitlardan yig‘iladi. Ishga tushirishdan oldin uni yurist yoki buxgalter bilan ko‘rib chiqing.

## Tekshirish (avtomatik testlar)

`npx vitest run modules/payments` quyidagi holatlarni sinaydi:

- to‘g‘ri va noto‘g‘ri imzo yoki avtorizatsiya;
- noto‘g‘ri summa;
- takroriy chaqiriq;
- bekor qilish va qaytarish;
- 12 soatlik muddat;
- orada yopilgan buyurtma;
- fiskal ma’lumot;
- Click `Prepare`/`Complete`, jumladan muvaffaqiyatsiz to‘lov va qayta urinish.

Haqiqiy pul ishlatilmaydi.
