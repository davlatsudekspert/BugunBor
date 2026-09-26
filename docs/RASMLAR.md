# Demo fotolar

Demo katalogdagi har bir aksiya o‘z turiga mos **haqiqiy fotosurat** bilan chiqadi: osh, somsa, tandir non, navvot, Siyob bozori, Chust do‘ppisi, Xiva o‘ymakorligi, so‘zana, kurash va boshqalar. Jami 74 tur uchun 85 ta foto bor; mashhur turlarda 2–3 xil foto. Bitta aksiya har doim o‘sha fotoni ko‘rsatadi, turli shaharlarda esa fotolar almashib turadi.

- **Manba:** Wikimedia Commons, erkin litsenziya (CC0, Public domain, CC BY, CC BY-SA). AI rasm, ikonka, kartina, brend logotipi va harbiy mavzu (qurol, harbiy forma, harbiy texnika) yo‘q. Har bir foto qo‘lda tekshirilgan.
- **Mualliflar:** «Rasm mualliflari» sahifasida (`/credits`, saytning pastki qismidagi havola).
- **Fayllar:** `public/photos/<kalit>.webp` (1200 px) va `<kalit>.sm.webp` (720 px, telefonlar uchun).
- **Faqat demo uchun.** Haqiqiy biznes aksiyasiga o‘z mahsulotining fotosini o‘zi yuklaydi.

## Yangi foto qo‘shish

1. Fotolarni Google Drive’dagi **«BugunBor rasmlar»** papkasiga yuklang. Fayl nomi foto turining kaliti yoki uning o‘zbekcha nomi bo‘lsin: `plov.jpg`, `osh-2.jpg`, `somsa.jpg`, `choy.jpg`, `atlas.jpg`. Yana `mualliflar.csv` faylini qo‘shing. Uning ustunlari `fayl,muallif,litsenziya,manba_url`. O‘zingiz olgan fotolar uchun bu fayl shart emas.
2. Claude Code papkani yuklab oladi va `npm run photos:import -- <papka>` bilan qo‘shadi: rasm siqiladi, ikki o‘lchami yaratiladi va muallif `/credits`da chiqadi. NC yoki ND litsenziyali fayl rad etiladi.
3. Commons’dagi tanlangan fotolarni qayta yuklash: `npm run photos:fetch`. Import qilingan fotolar saqlanib qoladi.

## Yordamchi uchun promt

Yordamchi foto qidirsa, quyidagi matnni to‘liq bering:

```
VAZIFA: BugunBor sayti uchun haqiqiy fotosuratlar topish

BugunBor — O‘zbekistondagi chegirmalar sayti. Yaqin atrofdagi bizneslar (kafe, do‘kon, salon, sport zali, xizmatlar) vaqti va soni cheklangan aksiyalar joylaydi. Demo katalogdagi aksiyalar uchun turli sohalarga mos HAQIQIY fotolar kerak.

MANBA: faqat commons.wikimedia.org, unsplash.com, pexels.com. Canva, Freepik, Shutterstock va Google Images'dan olma.

QAT’IY QOIDALAR
1. Faqat haqiqiy fotosurat bo‘lsin. AI (Canva AI va boshqalar) bilan yaratilgan rasm, 3D ikonka, clipart, illyustratsiya va kartina mumkin emas.
2. Litsenziya tijoriy foydalanishga ruxsat bersin: CC0, Public Domain, CC BY, CC BY-SA, Unsplash License yoki Pexels License. Litsenziyada «NC» yoki «ND» bo‘lsa, olma.
3. Suratda brend logotipi, reklama yozuvi va suv belgisi (watermark) bo‘lmasin.
4. Yuzi aniq ko‘rinadigan odam bo‘lmasin. Qo‘llar, orqa tomon yoki uzoqdan olingan kadr mumkin. Bolalarning yuzi umuman bo‘lmasin.
5. Kadr gorizontal, kamida 1280×960 piksel bo‘lsin. Asosiy narsa markazda tursin, chunki sayt suratni 4:3 qilib kesadi.
6. Taom va hunarmandchilikda o‘zbekcha variant afzal (osh, somsa, lag‘mon, Rishton sopoli, atlas, do‘ppi).
7. Harbiy mavzu umuman bo‘lmasin: qurol, harbiy forma, harbiy texnika va urush sahnasi mumkin emas. Harbiylar biror narsani ta’mirlayotgan yoki tuzatayotgan fotolar ham olinmaydi.

QANDAY TOPSHIRISH
- Fayl nomi aynan quyidagi kalit bo‘lsin, masalan plov.jpg. Bir tur uchun 2–3 xil foto bo‘lsa: plov.jpg, plov-2.jpg, plov-3.jpg.
- mualliflar.csv fayli ham bo‘lsin. Ustunlari: fayl,muallif,litsenziya,manba_url. Har bir foto uchun bitta qator yoz; manba_url — rasm sahifasining havolasi.
- Hammasini Google Drive'dagi «BugunBor rasmlar» papkasiga yukla (papka bo‘lmasa, yarat). Drive'ga yuklay olmasang, hammasini bitta ZIP fayl qilib ber.
- Sayt kodiga tegma va deploy qilma. Rasmlarni saytga Claude Code qo‘shadi: siqadi va mualliflarni /credits sahifasida ko‘rsatadi.

KERAKLI FOTOLAR (* belgisi: birinchi navbatda)

Taomlar: plov — laganda osh, yaqindan | noodles — lag‘mon | shashlik — sixdagi shashlik | meat — qozon kabob yoki tandir go‘sht | dumplings — manti yoki chuchvara | samsa — tandir somsa | bread — tandir non (Samarqand noni) | soup — mastava yoki sho‘rva | chicken — tandir tovuq yoki qanotchalar | lunch — biznes-lanch (sho‘rva, ikkinchi taom, salat) | burger | pizza | wrap — lavash | sushi

Kafe va shirinliklar: coffee — kapuchino | breakfast — omletli nonushta | tea — choynak va piyola | cake — tort bo‘lagi | dessert — pishiriq yoki kapkeyk | icecream — muzqaymoq sharlari | sweets — navvot, holva, parvarda

Xaridlar: *shopping — bozorda guruch, un, yog‘ (oila savati) | clothes — kiyim do‘koni | *sneakers — brendsiz krossovka | backpack — maktab ryukzagi | books — kitob javoni | gift — sovg‘a qutisi | nuts — quruq meva va yong‘oq | *kitchen — kastryulka va tova to‘plami | flowers — atirgul guldastasi | *phone — telefon g‘ilofi va himoya oynasi | crafts — Rishton kosalari | doppi — Chust do‘ppisi | woodcarving — Xiva yog‘och o‘ymakorligi | doll — milliy libosli qo‘g‘irchoq | fabric — Marg‘ilon atlasi | suzani — so‘zana

Go‘zallik: beauty — manikyur | makeup — kiprik yoki qosh | hair — ayollar soch turmagi | barber — barbershop | spa — massaj | facial — yuzni tozalash (kosmetolog)

Sport: fitness — trenajyor zali | pool — basseyn | yoga — gilamchada yoga | football — mini-futbol | boxing — boks qo‘lqoplari | kurash — milliy kurash | tennis — tennis korti

Ko‘ngilochar: cinema — kinozal | *bowling — bouling yo‘lagi va keglilar | quest — kvest xonasi | kids — bolalar o‘yin markazi yoki batut | karaoke | game — PlayStation joystigi | billiards — bilyard stoli | theater — teatr zali | horse — ot minish | fun — istirohat bog‘i

Xizmatlar: car — avtoyuvish | tires — shina almashtirish | *laundry — kimyoviy tozalash (ilgichdagi kostyumlar) | *repair — konditsioner ta’miri | laptop — noutbuk ta’miri | *shoes — poyabzal ta’miri | sewing — tikuv mashinasi | cleaning — uy tozalash | camera — fotostudiya | education — o‘quv xonasi | computer — kompyuter sinfi

Yetkazib berish: delivery — mototsikldagi kuryer | fruit — meva savati | water — 19 litrli suv idishlari

Oxirida qisqa hisobot ber: nechta foto topildi va qaysilari topilmadi.
```
