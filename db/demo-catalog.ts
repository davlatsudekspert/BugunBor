import { CITIES, type City } from '@/lib/cities';
import { buildSearchText, slugify } from '@/lib/search';
import { addMinutes, toDbTime } from '@/lib/time';
import type { DealVisualKey } from '@/lib/visuals';

// Generated demo catalog: one fictional business in every city for every
// category, each with two deals. Prices are Tashkent shelf prices for 2026
// (so‘m) and are scaled down for the regions, the way real prices differ.
// Everything here is is_demo = 1 and only ever shown in demo mode.

/** Bump when the catalog content changes so existing databases pick it up. */
export const DEMO_CATALOG_VERSION = '2026-09-25.3';

export const DEMO_CATEGORIES = ['food', 'coffee', 'shop', 'beauty', 'sport', 'fun', 'services', 'delivery'] as const;
export type DemoCategory = (typeof DEMO_CATEGORIES)[number];

export const DEMO_CATEGORY_IDS: Record<DemoCategory, string> = {
  food: 'cat_food', coffee: 'cat_coffee', shop: 'cat_shop', beauty: 'cat_beauty',
  sport: 'cat_sport', fun: 'cat_fun', services: 'cat_services', delivery: 'cat_delivery',
};

type Template = {
  key: string;
  title: string;
  description: string;
  /** Regular price in Tashkent, so‘m. */
  price: number;
  /** Typical discount, percent. */
  discount: number;
  visual: DealVisualKey;
  limit?: number;
  unlimited?: boolean;
};

const food: Template[] = [
  { key: 'osh-salat-non', title: 'To‘y oshi + salat + non', description: 'Bir porsiya to‘y oshi, achchiq-chuchuk salat va issiq tandir non.', price: 58000, discount: 25, visual: 'plov' },
  { key: 'lagmon-choy', title: 'Qo‘lda cho‘zilgan lag‘mon + choy', description: 'Katta porsiya lag‘mon, ko‘k choy va non.', price: 45000, discount: 20, visual: 'noodles' },
  { key: 'shashlik-seti', title: 'Shashlik seti: 5 six + non + piyoz', description: 'Mol go‘shtidan besh six shashlik, tandir non va sirkali piyoz.', price: 120000, discount: 20, visual: 'shashlik' },
  { key: 'manti-5', title: 'Bug‘da pishgan manti (5 dona)', description: 'Qo‘y go‘shti va piyozli yirik manti, qatiq bilan.', price: 40000, discount: 25, visual: 'dumplings' },
  { key: 'somsa-choy', title: '3 ta tandir somsa + ko‘k choy', description: 'Go‘shtli tandir somsa, tandirdan yangi uzilgan.', price: 42000, discount: 30, visual: 'bread' },
  { key: 'biznes-lanch', title: 'Biznes-lanch: sho‘rva + ikkinchi taom + choy', description: 'Kunning sho‘rvasi, ikkinchi taom, salat va choy.', price: 55000, discount: 30, visual: 'lunch' },
  { key: 'qozon-kabob', title: 'Qozon kabob (1 porsiya)', description: 'Qozonda qovurilgan go‘sht va kartoshka, ko‘kat bilan.', price: 80000, discount: 20, visual: 'meat' },
  { key: 'tandir-tovuq', title: 'Butun tandir tovuq + non', description: 'Tandirda pishgan butun tovuq, 2–3 kishiga yetadi.', price: 110000, discount: 25, visual: 'chicken' },
  { key: 'dimlama-2', title: 'Dimlama (2 kishilik)', description: 'Go‘sht, kartoshka, karam va sabzavotlardan dimlama.', price: 90000, discount: 25, visual: 'soup' },
  { key: 'chuchvara', title: 'Uy chuchvarasi + qaymoq', description: 'Qo‘lda tugilgan chuchvara, qaymoq va ko‘kat bilan.', price: 38000, discount: 20, visual: 'dumplings' },
  { key: 'pitsa-30', title: 'Pitsa 30 sm + 1 l ichimlik', description: 'Istalgan klassik pitsa va bir litrli ichimlik.', price: 105000, discount: 30, visual: 'pizza' },
  { key: 'burger-kombo', title: 'Burger kombo: burger + fri + ichimlik', description: 'Mol go‘shtli burger, kartoshka fri va ichimlik.', price: 68000, discount: 30, visual: 'burger' },
  { key: 'sushi-24', title: 'Sushi set (24 dona)', description: 'Filadelfiya, Kaliforniya va maki rollari aralash seti.', price: 190000, discount: 30, visual: 'sushi' },
  { key: 'mastava', title: 'Mastava + non', description: 'Guruchli issiq mastava, qatiq va ko‘kat bilan.', price: 35000, discount: 20, visual: 'soup' },
  { key: 'norin', title: 'Norin (katta porsiya)', description: 'Qo‘lda to‘g‘ralgan xamir va qazi, sho‘rva bilan.', price: 48000, discount: 20, visual: 'noodles' },
  // Regional dishes, used by the city that is famous for them.
  { key: 'samarqand-oshi', title: 'Samarqand oshi + Samarqand noni', description: 'Sariq sabzi bilan damlangan Samarqand oshi va mashhur Samarqand noni.', price: 62000, discount: 25, visual: 'plov' },
  { key: 'oshi-sofi', title: 'Buxorocha oshi sofi', description: 'Buxoro uslubida, zira va mayizli bayram oshi.', price: 55000, discount: 20, visual: 'plov' },
  { key: 'andijon-oshi', title: 'Andijoncha devzira oshi', description: 'Devzira guruchidan, qazi va bedana tuxumi bilan.', price: 52000, discount: 20, visual: 'plov' },
  { key: 'fargona-oshi', title: 'Farg‘ona oshi + achchiq-chuchuk', description: 'Vodiy uslubidagi osh, yangi salat bilan.', price: 52000, discount: 25, visual: 'plov' },
  { key: 'namangan-kabobi', title: 'Jigar va qiyma kabob seti', description: 'Namangancha jigar kabob, qiyma kabob va tandir non.', price: 90000, discount: 25, visual: 'shashlik' },
  { key: 'jizzax-somsasi', title: 'Jizzax somsasi (2 dona) + choy', description: 'Mashhur katta Jizzax somsasi, tandirdan yangi uzilgan.', price: 50000, discount: 25, visual: 'bread' },
  { key: 'tandir-gosht', title: 'Tandir go‘sht (500 g) + non', description: 'Archa shoxida dimlangan tandir go‘sht, issiq non bilan.', price: 140000, discount: 20, visual: 'meat' },
  { key: 'tuxum-barak', title: 'Tuxum barak (10 dona) + choy', description: 'Xorazmcha tuxum barak, sariyog‘ bilan.', price: 40000, discount: 25, visual: 'dumplings' },
  { key: 'shivit-oshi', title: 'Shivit oshi', description: 'Ukropli yashil xamirdan Xorazm oshi, qatiq bilan.', price: 42000, discount: 20, visual: 'noodles' },
  { key: 'beshbarmoq', title: 'Qoraqalpoqcha beshbarmoq', description: 'Qaynatilgan go‘sht, yupqa xamir va sho‘rva.', price: 65000, discount: 20, visual: 'soup' },
];

const coffee: Template[] = [
  { key: 'kapuchino-kruassan', title: 'Kapuchino + kruassan', description: 'Katta kapuchino va sariyog‘li kruassan.', price: 62000, discount: 35, visual: 'coffee', limit: 2, unlimited: true },
  { key: 'ikki-latte', title: 'Ikkita latte — do‘stingiz bilan', description: 'Ikkita latte, istalgan sirop bilan.', price: 76000, discount: 30, visual: 'coffee' },
  { key: 'chizkeyk-kofe', title: 'Chizkeyk + amerikano', description: 'San-Sebastyan chizkeyki va amerikano.', price: 70000, discount: 30, visual: 'cake' },
  { key: 'butun-tort', title: 'Butun tort (1 kg) kechki narxda', description: 'Bugun pishirilgan tortlardan istalgani.', price: 230000, discount: 35, visual: 'cake' },
  { key: 'desert-seti', title: 'Kechki desert seti: 2 desert + 2 choy', description: 'Ikki desert va ikki choy — kechki suhbat uchun.', price: 115000, discount: 30, visual: 'dessert' },
  { key: 'pishiriqlar-qutisi', title: 'Bugungi pishiriqlar qutisi (6 dona)', description: 'Kun oxirida qolgan yangi pishiriqlar — isrof bo‘lmasin.', price: 90000, discount: 50, visual: 'bread' },
  { key: 'milksheyk-vafli', title: 'Milksheyk + vafli', description: 'Qulupnayli yoki shokoladli milksheyk va Belgiya vaflisi.', price: 58000, discount: 30, visual: 'icecream' },
  { key: 'nonushta', title: 'Nonushta: omlet, salat, non va kofe', description: 'To‘yimli nonushta soat 11:00 gacha.', price: 78000, discount: 30, visual: 'breakfast' },
  { key: 'muzqaymoq-3', title: '3 shar muzqaymoq', description: 'Uyda tayyorlangan muzqaymoq, uchta ta’m.', price: 45000, discount: 30, visual: 'icecream' },
  { key: 'choy-seti', title: 'Choy seti: ko‘k choy, navvot, holva', description: 'Choynakda ko‘k choy, navvot va uy holvasi.', price: 50000, discount: 25, visual: 'tea' },
  { key: 'samarqand-noni', title: 'Samarqand noni (3 dona) + choy', description: 'Tandirdan yangi uzilgan mashhur Samarqand noni.', price: 48000, discount: 20, visual: 'bread' },
  { key: 'buxoro-shirinliklari', title: 'Buxoro shirinliklari to‘plami', description: 'Navvot, pashmak va yong‘oqli holva — 1 kg.', price: 95000, discount: 25, visual: 'sweets' },
  { key: 'qoqon-halvosi', title: 'Qo‘qon halvosi (1 kg)', description: 'Qo‘lda tortilgan mashhur Qo‘qon halvosi.', price: 95000, discount: 25, visual: 'sweets' },
];

const shop: Template[] = [
  { key: 'biznes-kitoblar', title: 'Biznes kitoblar to‘plami (3 kitob)', description: 'O‘zbek tilidagi uchta mashhur biznes kitobi.', price: 255000, discount: 30, visual: 'books' },
  { key: 'bolalar-kitoblari', title: 'Bolalar ertaklari to‘plami (5 kitob)', description: 'Rasmli ertak kitoblari, 3–8 yosh uchun.', price: 175000, discount: 25, visual: 'books' },
  { key: 'erkaklar-koylagi', title: 'Erkaklar klassik ko‘ylagi', description: 'Paxta matodan klassik ko‘ylak, barcha o‘lchamlar.', price: 290000, discount: 40, visual: 'clothes' },
  { key: 'ipak-romol', title: 'Ipak ro‘mol', description: 'Tabiiy ipakdan milliy naqshli ro‘mol.', price: 180000, discount: 30, visual: 'clothes' },
  { key: 'atirgul-guldasta', title: 'Guldasta: 15 ta atirgul', description: 'Yangi uzilgan atirgullar, chiroyli o‘ram bilan.', price: 240000, discount: 25, visual: 'flowers' },
  { key: 'telefon-aksessuar', title: 'G‘ilof + himoya oynasi', description: 'Telefoningiz uchun g‘ilof va himoya oynasi, o‘rnatib beramiz.', price: 130000, discount: 40, visual: 'phone' },
  { key: 'quruq-mevalar', title: 'Quruq mevalar sovg‘a qutisi (1 kg)', description: 'Mayiz, o‘rik, yong‘oq va bodom — sovg‘a qutisida.', price: 190000, discount: 20, visual: 'gift' },
  { key: 'maktab-ryukzagi', title: 'Maktab ryukzagi', description: 'Ortopedik orqa qismli, yengil maktab ryukzagi.', price: 380000, discount: 35, visual: 'shopping' },
  { key: 'oila-savati', title: 'Oila savati: yog‘, un, guruch, shakar', description: 'Kundalik mahsulotlar to‘plami — bir haftaga yetadi.', price: 260000, discount: 15, visual: 'shopping' },
  { key: 'krossovka', title: 'Sport krossovkasi', description: 'Yengil va qulay krossovka, 36–45 o‘lchamlar.', price: 520000, discount: 40, visual: 'clothes' },
  { key: 'oshxona-idishlari', title: 'Oshxona idishlari to‘plami', description: 'Qopqoqli kastryulkalar va tova to‘plami.', price: 450000, discount: 30, visual: 'gift' },
  { key: 'samarqand-qogozi', title: 'Samarqand qog‘ozidan daftar', description: 'Qo‘lda tayyorlangan ipak qog‘oz, charm muqovada.', price: 150000, discount: 20, visual: 'crafts' },
  { key: 'buxoro-suzanasi', title: 'Buxoro so‘zanasi (kichik)', description: 'Qo‘lda tikilgan so‘zana, 60×60 sm.', price: 650000, discount: 20, visual: 'fabric' },
  { key: 'rishton-kosalari', title: 'Rishton kosalari (6 dona)', description: 'Ishqorli sirda qo‘lda chizilgan kosalar to‘plami.', price: 320000, discount: 25, visual: 'crafts' },
  { key: 'chust-doppisi', title: 'Chust do‘ppisi', description: 'Oq-qora naqshli klassik Chust do‘ppisi.', price: 180000, discount: 20, visual: 'crafts' },
  { key: 'atlas-mato', title: 'Marg‘ilon atlasi (3 metr)', description: 'Qo‘lda to‘qilgan tabiiy ipak atlas.', price: 420000, discount: 20, visual: 'fabric' },
  { key: 'xiva-oymakor', title: 'Xiva yog‘och o‘ymakorligi: laux', description: 'Kitob uchun o‘yma yog‘och laux — xivalik ustadan.', price: 250000, discount: 20, visual: 'crafts' },
  { key: 'qoraqalpoq-sovgasi', title: 'Qoraqalpoq sovg‘alar to‘plami', description: 'Kashta tikilgan sumka, magnit va milliy bezaklar.', price: 200000, discount: 25, visual: 'gift' },
];

const beauty: Template[] = [
  { key: 'gel-lak-manikyur', title: 'Gel-lak manikyur', description: 'Apparat manikyur va gel-lak qoplama.', price: 160000, discount: 30, visual: 'beauty' },
  { key: 'manikyur-pedikyur', title: 'Manikyur + pedikyur', description: 'Klassik manikyur va pedikyur, gel-lak bilan.', price: 290000, discount: 30, visual: 'beauty' },
  { key: 'erkaklar-soch', title: 'Erkaklar soch turmagi', description: 'Soch turmagi, yuvish va ukladka.', price: 90000, discount: 30, visual: 'barber' },
  { key: 'soch-soqol', title: 'Soch turmagi + soqolni shakllantirish', description: 'Barber xizmati: soch va soqol, issiq sochiq bilan.', price: 140000, discount: 30, visual: 'barber' },
  { key: 'soch-ukladka', title: 'Soch kesish + ukladka', description: 'Ayollar soch turmagi va fen bilan ukladka.', price: 190000, discount: 30, visual: 'hair' },
  { key: 'yuz-tozalash', title: 'Yuzni kompleks tozalash', description: 'Kosmetolog tomonidan tozalash va niqob.', price: 320000, discount: 35, visual: 'spa' },
  { key: 'massaj-60', title: 'Klassik massaj (60 daqiqa)', description: 'Butun tana massaji, tajribali mutaxassis.', price: 260000, discount: 30, visual: 'spa' },
  { key: 'kiprik', title: 'Kipriklarni uzaytirish (klassik)', description: 'Klassik usulda kiprik uzaytirish.', price: 250000, discount: 30, visual: 'beauty' },
  { key: 'qosh-dizayn', title: 'Qosh dizayni + bo‘yash', description: 'Qosh shaklini to‘g‘rilash va bo‘yash.', price: 90000, discount: 30, visual: 'beauty' },
  { key: 'soch-boyash', title: 'Soch bo‘yash (bir tusda)', description: 'Professional bo‘yoq, o‘rta uzunlikdagi soch.', price: 420000, discount: 25, visual: 'hair' },
];

const sport: Template[] = [
  { key: 'bir-martalik-zal', title: 'Trenajyor zaliga bir martalik tashrif', description: 'Zal, kardio zona va dush — bir martalik tashrif.', price: 70000, discount: 50, visual: 'fitness' },
  { key: 'oylik-abonement', title: 'Oylik abonement (cheksiz)', description: 'Bir oy davomida cheksiz tashrif.', price: 550000, discount: 30, visual: 'fitness' },
  { key: 'basseyn', title: 'Basseyn: 1 tashrif (90 daqiqa)', description: '25 metrli basseyn, sauna va dush.', price: 95000, discount: 30, visual: 'pool' },
  { key: 'yoga-darsi', title: 'Yoga darsi (guruhda)', description: 'Boshlovchilar uchun guruh darsi, gilamcha beriladi.', price: 90000, discount: 40, visual: 'yoga' },
  { key: 'mini-futbol', title: 'Mini-futbol maydoni (1 soat)', description: 'Sun’iy qoplamali yopiq maydon, kiyinish xonasi bilan.', price: 350000, discount: 30, visual: 'football' },
  { key: 'boks-sinov', title: 'Boks: sinov darsi', description: 'Murabbiy bilan birinchi dars, qo‘lqoplar beriladi.', price: 100000, discount: 50, visual: 'boxing' },
  { key: 'tennis-kort', title: 'Tennis korti (1 soat)', description: 'Yopiq kort, raketkalar ijarasi mumkin.', price: 260000, discount: 25, visual: 'tennis' },
  { key: 'shaxsiy-murabbiy', title: 'Shaxsiy murabbiy bilan mashg‘ulot', description: 'Bir soatlik individual mashg‘ulot va reja.', price: 220000, discount: 35, visual: 'fitness' },
  { key: 'bolalar-sport', title: 'Bolalar sport seksiyasi (1 oy)', description: 'Haftada uch marta, 6–14 yoshli bolalar uchun.', price: 380000, discount: 25, visual: 'football' },
  { key: 'kurash-sinov', title: 'Kurash: sinov darsi', description: 'Milliy kurash bo‘yicha birinchi dars.', price: 80000, discount: 50, visual: 'boxing' },
];

const fun: Template[] = [
  { key: 'kino-2', title: 'Kino: 2 ta chipta', description: 'Istalgan seansga ikki chipta.', price: 130000, discount: 30, visual: 'cinema' },
  { key: 'bouling', title: 'Bouling: 1 soat, 1 yo‘lak', description: '6 kishigacha, poyabzal ijarasi bilan.', price: 220000, discount: 30, visual: 'bowling' },
  { key: 'kvest-xona', title: 'Kvest xonasi (4 kishigacha)', description: '60 daqiqalik sirli kvest, yoshlar va kattalar uchun.', price: 420000, discount: 30, visual: 'quest' },
  { key: 'bolalar-markazi', title: 'Bolalar o‘yin markazi (2 soat)', description: 'Labirint, batut va animatorlar.', price: 90000, discount: 30, visual: 'kids' },
  { key: 'karaoke', title: 'Karaoke xona (1 soat)', description: '8 kishigacha, o‘zbek va xorijiy qo‘shiqlar.', price: 260000, discount: 30, visual: 'karaoke' },
  { key: 'playstation', title: 'PlayStation 5 klub (2 soat)', description: 'Katta ekran, ikki joystik, yangi o‘yinlar.', price: 70000, discount: 30, visual: 'game' },
  { key: 'batut', title: 'Batut markazi (1 soat)', description: 'Bolalar va kattalar uchun batut zali.', price: 65000, discount: 30, visual: 'kids' },
  { key: 'lazertag', title: 'Lazertag: 1 o‘yin (4 kishi)', description: 'Yopiq arenada 30 daqiqalik o‘yin.', price: 240000, discount: 30, visual: 'game' },
  { key: 'teatr', title: 'Teatr chiptasi', description: 'Bugungi spektaklga partere chipta.', price: 90000, discount: 25, visual: 'theater' },
  { key: 'ot-minish', title: 'Ot minish (30 daqiqa)', description: 'Instruktor bilan sayr, boshlovchilar uchun.', price: 120000, discount: 30, visual: 'horse' },
];

const services: Template[] = [
  { key: 'avtoyuvish', title: 'Kompleks avtoyuvish (ichki + tashqi)', description: 'Kuzov, salon, gilamchalar va shisha tozalash.', price: 110000, discount: 30, visual: 'car' },
  { key: 'kimyoviy-tozalash', title: 'Kostyumni kimyoviy tozalash', description: 'Ikki qismli kostyum, 24 soatda tayyor.', price: 130000, discount: 30, visual: 'laundry' },
  { key: 'noutbuk-profilaktika', title: 'Noutbuk profilaktikasi va tozalash', description: 'Changdan tozalash va termopasta almashtirish.', price: 170000, discount: 30, visual: 'repair' },
  { key: 'poyabzal-tamiri', title: 'Poyabzal ta’miri va tozalash', description: 'Taglik, tikuv va chuqur tozalash.', price: 80000, discount: 25, visual: 'repair' },
  { key: 'kiyim-tamiri', title: 'Kiyim tikish va ta’mirlash', description: 'Qisqartirish, zamok almashtirish va tikish.', price: 60000, discount: 25, visual: 'fabric' },
  { key: 'uy-tozalash', title: 'Uyni tozalash (2 xonali)', description: 'Ikki kishilik brigada, o‘z vositalari bilan.', price: 550000, discount: 25, visual: 'cleaning' },
  { key: 'konditsioner', title: 'Konditsionerni tozalash va gaz tekshiruvi', description: 'Ichki va tashqi blokni tozalash.', price: 230000, discount: 30, visual: 'repair' },
  { key: 'fotosessiya', title: 'Studiyada fotosessiya (30 daqiqa)', description: '20 ta ishlangan surat, fon tanlash mumkin.', price: 450000, discount: 35, visual: 'camera' },
  { key: 'shina-almashtirish', title: 'Shinalarni almashtirish (4 ta)', description: 'Yechish, o‘rnatish va balansirovka.', price: 140000, discount: 25, visual: 'car' },
  { key: 'ingliz-tili', title: 'Ingliz tili: 1 oylik kurs', description: 'Haftada uch dars, kichik guruhlarda.', price: 650000, discount: 30, visual: 'education' },
  { key: 'kompyuter-kursi', title: 'Kompyuter savodxonligi kursi (1 oy)', description: 'Word, Excel va internet — noldan, amaliy mashg‘ulotlarda.', price: 450000, discount: 30, visual: 'education' },
];

const delivery: Template[] = [
  { key: 'osh-yetkazish', title: 'Osh yetkazib berish (2 porsiya)', description: 'Issiq to‘y oshi, salat va non — eshigingizgacha.', price: 110000, discount: 25, visual: 'plov' },
  { key: 'pitsa-yetkazish', title: 'Pitsa 35 sm + ichimlik yetkazish', description: 'Katta pitsa va 1 l ichimlik, 45 daqiqada.', price: 125000, discount: 30, visual: 'pizza' },
  { key: 'lavash-2', title: 'Ikkita lavash + fri', description: 'Tovuqli yoki go‘shtli lavash, fri bilan.', price: 95000, discount: 30, visual: 'wrap' },
  { key: 'oilaviy-set', title: 'Oilaviy set (4 kishi)', description: 'Shashlik, salatlar, non va ichimliklar.', price: 290000, discount: 25, visual: 'delivery' },
  { key: 'sushi-yetkazish', title: 'Sushi set (32 dona) yetkazish', description: 'To‘rt xil roll, soya sousi va imbir bilan.', price: 270000, discount: 30, visual: 'sushi' },
  { key: 'somsa-10', title: '10 ta somsa yetkazish', description: 'Go‘shtli tandir somsa, issiq holda.', price: 130000, discount: 25, visual: 'bread' },
  { key: 'mevalar-savati', title: 'Mevalar savati (5 kg)', description: 'Mavsumiy mevalar — olma, uzum, anor.', price: 160000, discount: 20, visual: 'fruit' },
  { key: 'gul-yetkazish', title: 'Gul yetkazish: 11 ta atirgul', description: 'Guldasta va tabriknoma bilan.', price: 200000, discount: 25, visual: 'flowers' },
  { key: 'suv-19l', title: 'Ichimlik suvi: 2 ta 19 l', description: 'Tozalangan ichimlik suvi, qavatgacha olib chiqamiz.', price: 50000, discount: 20, visual: 'water', limit: 2 },
  { key: 'qanotchalar', title: 'Achchiq qanotchalar (24 dona)', description: 'Qarsildoq tovuq qanotchalari, ikki xil sous bilan.', price: 160000, discount: 30, visual: 'chicken' },
];

const TEMPLATES: Record<DemoCategory, Template[]> = { food, coffee, shop, beauty, sport, fun, services, delivery };

/** Templates only used where a business asks for them (regional specialities). */
const REGIONAL = new Set([
  'samarqand-oshi', 'oshi-sofi', 'andijon-oshi', 'fargona-oshi', 'namangan-kabobi', 'jizzax-somsasi', 'tandir-gosht',
  'tuxum-barak', 'shivit-oshi', 'beshbarmoq', 'samarqand-noni', 'buxoro-shirinliklari', 'qoqon-halvosi',
  'samarqand-qogozi', 'buxoro-suzanasi', 'rishton-kosalari', 'chust-doppisi', 'atlas-mato', 'xiva-oymakor', 'qoraqalpoq-sovgasi',
]);

const TERMS: Record<DemoCategory, string[]> = {
  food: ['Joyida tanovul qilish yoki olib ketish mumkin. Kodni kassada ko‘rsating.', 'Boshqa aksiyalar bilan qo‘shilmaydi. Kodni buyurtma berishda ayting.'],
  coffee: ['Kodni kassada ko‘rsating. Olib ketish ham mumkin.', 'Bugungi assortimentdan. Boshqa chegirmalar bilan qo‘shilmaydi.'],
  shop: ['Do‘kondan olib ketish. Chek bilan 3 kun ichida almashtirish mumkin.', 'Mahsulot tugaguncha amal qiladi. Kodni kassada ko‘rsating.'],
  beauty: ['Kodni tashrif paytida ko‘rsating. Navbat bo‘lsa, vaqtni joyida kelishib olasiz.', 'Bir mijozga bir marta. Qo‘shimcha xizmatlar alohida to‘lanadi.'],
  sport: ['Sport kiyimi va almashtiriladigan poyabzal bilan keling.', 'Kodni ma’muriyatda ko‘rsating. Birinchi tashrifda hujjat so‘raladi.'],
  fun: ['Seans vaqtini kassada tanlaysiz. Dam olish kunlari ham amal qiladi.', 'Kodni kassada ko‘rsating. Bolalar kattalar bilan kelishi kerak.'],
  services: ['Kodni usta bilan uchrashuvda ko‘rsating. Ehtiyot qismlar alohida to‘lanadi.', 'Navbatni joyida olasiz. Qo‘shimcha ishlar alohida kelishiladi.'],
  delivery: ['Buyurtma berishda kodni ayting. Shahar ichida yetkazish bepul, to‘lov kuryerga.', 'Kodni operatorga ayting. To‘lov naqd yoki karta orqali kuryerga.'],
};

const DESCRIPTIONS: Record<DemoCategory, string[]> = {
  food: ['Milliy taomlar, tandir non va oilaviy muhit.', 'Har kuni yangi pishirilgan issiq taomlar va tezkor tushliklar.', 'Qozonda pishgan taomlar, choyxona muhiti va keng dasturxon.'],
  coffee: ['Qovurilgan kofe, yangi pishiriqlar va shinam muhit.', 'Tortlar, desertlar va kechki choy uchun qulay joy.', 'Ertalabki kofe va kechki desertlar — har kuni yangi.'],
  shop: ['Kiyim-kechak, sovg‘alar va kundalik xaridlar.', 'Kitoblar, sovg‘alar va foydali to‘plamlar.', 'Oila uchun kerakli mahsulotlar bir joyda.'],
  beauty: ['Manikyur, soch turmagi va parvarish xizmatlari.', 'Tajribali ustalar va zamonaviy parvarish vositalari.', 'Ayollar va erkaklar uchun go‘zallik xizmatlari.'],
  sport: ['Zamonaviy trenajyorlar, guruh mashg‘ulotlari va dush.', 'Kattalar va bolalar uchun sport mashg‘ulotlari.', 'Tajribali murabbiylar va qulay jadval.'],
  fun: ['Oila va do‘stlar bilan dam olish uchun ko‘ngilochar markaz.', 'Kino, o‘yinlar va bayramlar uchun joy.', 'Bolalar va kattalar uchun faol dam olish.'],
  services: ['Tez va sifatli maishiy xizmatlar.', 'Avtomobil va uy uchun ishonchli xizmatlar.', 'Tajribali ustalar, kafolatli ish.'],
  delivery: ['Shahar bo‘ylab tezkor yetkazib berish.', 'Issiq taomlarni uyingizgacha yetkazamiz.', 'Buyurtma — bir soat ichida eshigingizda.'],
};

type BusinessSpec = { name: string; description?: string; picks?: [string, string?] };
type CitySpec = { level: number; streets: string[]; businesses: Record<DemoCategory, BusinessSpec> };

// level: regional price level relative to Tashkent.
const CITY_SPECS: Record<string, CitySpec> = {
  tashkent: {
    level: 1,
    streets: ['Shota Rustaveli ko‘chasi', 'Osiyo ko‘chasi', 'Mirobod ko‘chasi', 'Farobiy ko‘chasi', 'Qatortol ko‘chasi', 'Sebzor ko‘chasi', 'Buyuk Ipak Yo‘li ko‘chasi', 'Bog‘ishamol ko‘chasi'],
    businesses: {
      food: { name: 'Navro‘z Oshxonasi', picks: ['qozon-kabob', 'biznes-lanch'] },
      coffee: { name: 'Bulvar Kofe', picks: ['nonushta', 'chizkeyk-kofe'] },
      shop: { name: 'Uyg‘un Butik', picks: ['erkaklar-koylagi', 'krossovka'] },
      beauty: { name: 'Lola Go‘zallik Studiyasi', picks: ['gel-lak-manikyur', 'yuz-tozalash'] },
      sport: { name: 'Olimp Fitnes Klub', picks: ['oylik-abonement', 'basseyn'] },
      fun: { name: 'Sehrli Olam', picks: ['kvest-xona', 'karaoke'] },
      services: { name: 'Chaqmoq Avtoyuvish', picks: ['avtoyuvish', 'shina-almashtirish'] },
      delivery: { name: 'Tez Yetkaz', picks: ['sushi-yetkazish', 'lavash-2'] },
    },
  },
  samarkand: {
    level: 0.92,
    streets: ['Registon ko‘chasi', 'Mirzo Ulug‘bek ko‘chasi', 'Dahbed yo‘li', 'Amir Temur ko‘chasi'],
    businesses: {
      food: { name: 'Registon Oshxonasi', picks: ['samarqand-oshi', 'shashlik-seti'] },
      coffee: { name: 'Siyob Novvoyxonasi', description: 'Samarqand noni, patir va shirinliklar — tandirdan yangi.', picks: ['samarqand-noni', 'choy-seti'] },
      shop: { name: 'Afrosiyob Sovg‘alari', description: 'Samarqand qog‘ozi, sopol va hunarmandlar sovg‘alari.', picks: ['samarqand-qogozi', 'ipak-romol'] },
      beauty: { name: 'Bibixonim Salon' },
      sport: { name: 'Temir Iroda Fitnes' },
      fun: { name: 'Zarafshon Kinozali', picks: ['kino-2', 'playstation'] },
      services: { name: 'Toza Libos', picks: ['kimyoviy-tozalash', 'kiyim-tamiri'] },
      delivery: { name: 'Samarqand Express' },
    },
  },
  bukhara: {
    level: 0.92,
    streets: ['Bahouddin Naqshband ko‘chasi', 'Mustaqillik ko‘chasi', 'Alpomish ko‘chasi', 'Piridastgir ko‘chasi'],
    businesses: {
      food: { name: 'Labi Hovuz Choyxonasi', picks: ['oshi-sofi', 'manti-5'] },
      coffee: { name: 'Buxoro Shirinliklari', description: 'Navvot, pashmak, holva va ko‘k choy.', picks: ['buxoro-shirinliklari', 'desert-seti'] },
      shop: { name: 'Hunarmand Rastasi', description: 'So‘zana, zardo‘zi va misgarlik buyumlari.', picks: ['buxoro-suzanasi', 'quruq-mevalar'] },
      beauty: { name: 'Sitora Salon' },
      sport: { name: 'Buxoro Sport Majmuasi' },
      fun: { name: 'Ark Kvest Xonalari', picks: ['kvest-xona', 'lazertag'] },
      services: { name: 'Usta Xizmat' },
      delivery: { name: 'Buxoro Yetkazish' },
    },
  },
  andijan: {
    level: 0.85,
    streets: ['Bobur shoh ko‘chasi', 'Navoiy shoh ko‘chasi', 'Fitrat ko‘chasi', 'Mashrab ko‘chasi'],
    businesses: {
      food: { name: 'Bobur Osh Markazi', picks: ['andijon-oshi', 'norin'] },
      coffee: { name: 'Andijon Kofe Uyi' },
      shop: { name: 'Sarvinoz Kiyim Markazi', picks: ['ipak-romol', 'krossovka'] },
      beauty: { name: 'Nigora Salon' },
      sport: { name: 'Pahlavon Sport Zali', picks: ['kurash-sinov', 'oylik-abonement'] },
      fun: { name: 'Quvnoq Bolalar Markazi', picks: ['bolalar-markazi', 'batut'] },
      services: { name: 'Ideal Servis' },
      delivery: { name: 'Vodiy Dostavka' },
    },
  },
  fergana: {
    level: 0.85,
    streets: ['Al-Farg‘oniy ko‘chasi', 'Mustaqillik ko‘chasi', 'Marg‘ilon ko‘chasi', 'Kuvasoy ko‘chasi'],
    businesses: {
      food: { name: 'Farg‘ona Choyxonasi', picks: ['fargona-oshi', 'somsa-choy'] },
      coffee: { name: 'Al-Farg‘oniy Kofe' },
      shop: { name: 'Rishton Sopol Uyi', description: 'Rishton ustalarining qo‘lda chizilgan sopol buyumlari.', picks: ['rishton-kosalari', 'oshxona-idishlari'] },
      beauty: { name: 'Gulnora Go‘zallik' },
      sport: { name: 'Farg‘ona Arena', picks: ['mini-futbol', 'bolalar-sport'] },
      fun: { name: 'Kamalak Bouling', picks: ['bouling', 'karaoke'] },
      services: { name: 'Farg‘ona Maishiy Xizmat' },
      delivery: { name: 'Oq Bulut Suv', description: 'Toza ichimlik suvi va mevalar yetkazib berish.', picks: ['suv-19l', 'mevalar-savati'] },
    },
  },
  namangan: {
    level: 0.85,
    streets: ['Navoiy ko‘chasi', 'Uychi ko‘chasi', 'Boburshoh ko‘chasi', 'Lutfiy ko‘chasi'],
    businesses: {
      food: { name: 'Namangan Kabobxonasi', picks: ['namangan-kabobi', 'chuchvara'] },
      coffee: { name: 'Gulshan Kafe' },
      shop: { name: 'Chust Hunarmandlari', description: 'Chust do‘ppilari, pichoqlari va milliy sovg‘alar.', picks: ['chust-doppisi', 'quruq-mevalar'] },
      beauty: { name: 'Malika Salon' },
      sport: { name: 'Chempion Sport Klubi' },
      fun: { name: 'Kulgi Oroli' },
      services: { name: 'Kompyuter Klinikasi', description: 'Noutbuk, telefon va maishiy texnika ta’miri.', picks: ['noutbuk-profilaktika', 'konditsioner'] },
      delivery: { name: 'Meva Bog‘i Yetkazish', description: 'Namangan bog‘laridan meva va quruq mevalar.', picks: ['mevalar-savati', 'osh-yetkazish'] },
    },
  },
  kokand: {
    level: 0.82,
    streets: ['Istiqlol ko‘chasi', 'Turkiston ko‘chasi', 'Amir Temur ko‘chasi', 'Muqimiy ko‘chasi'],
    businesses: {
      food: { name: 'Qo‘qon Oshxonasi' },
      coffee: { name: 'Qo‘qon Halvogari', description: 'Mashhur Qo‘qon halvosi va milliy shirinliklar.', picks: ['qoqon-halvosi', 'choy-seti'] },
      shop: { name: 'Kitob Olami', picks: ['bolalar-kitoblari', 'biznes-kitoblar'] },
      beauty: { name: 'Zebo Salon' },
      sport: { name: 'Qo‘qon Basseyni', picks: ['basseyn', 'bir-martalik-zal'] },
      fun: { name: 'Yulduz Kinoteatri', picks: ['kino-2', 'bolalar-markazi'] },
      services: { name: 'Yaltiroq Avtoyuvish', picks: ['avtoyuvish', 'shina-almashtirish'] },
      delivery: { name: 'Lavash Stop', picks: ['lavash-2', 'qanotchalar'] },
    },
  },
  margilan: {
    level: 0.82,
    streets: ['Burhoniddin Marg‘inoniy ko‘chasi', 'Mustaqillik ko‘chasi', 'Ipakchi ko‘chasi', 'Toshloq ko‘chasi'],
    businesses: {
      food: { name: 'Marg‘ilon Tandir', picks: ['somsa-choy', 'tandir-tovuq'] },
      coffee: { name: 'Ipak Yo‘li Kofe' },
      shop: { name: 'Atlas Uyi', description: 'Marg‘ilon atlasi va adrasi — to‘g‘ridan-to‘g‘ri ustaxonadan.', picks: ['atlas-mato', 'ipak-romol'] },
      beauty: { name: 'Durdona Salon' },
      sport: { name: 'Marg‘ilon Kurash Klubi', picks: ['kurash-sinov', 'bolalar-sport'] },
      fun: { name: 'Oila Park' },
      services: { name: 'Ipak Tikuvchilik Ustaxonasi', description: 'Kiyim tikish, ta’mirlash va milliy liboslar.', picks: ['kiyim-tamiri', 'kimyoviy-tozalash'] },
      delivery: { name: 'Marg‘ilon Express' },
    },
  },
  nurafshon: {
    level: 0.9,
    streets: ['Toshkent yo‘li', 'Yoshlik ko‘chasi', 'Mustaqillik ko‘chasi'],
    businesses: {
      food: { name: 'Nurafshon Milliy Taomlar' },
      coffee: { name: 'Yangi Shahar Kofe' },
      shop: { name: 'Oila Do‘koni', picks: ['oila-savati', 'maktab-ryukzagi'] },
      beauty: { name: 'Oydin Salon' },
      sport: { name: 'Nurafshon Fitnes' },
      fun: { name: 'Bolajon Parki', picks: ['batut', 'bolalar-markazi'] },
      services: { name: 'Nurafshon Avtoservis' },
      delivery: { name: 'Nurafshon Yetkazish' },
    },
  },
  chirchiq: {
    level: 0.88,
    streets: ['Amir Temur ko‘chasi', 'Toshkent ko‘chasi', 'Gagarin ko‘chasi', 'Mustaqillik ko‘chasi'],
    businesses: {
      food: { name: 'Chirchiq Choyxonasi' },
      coffee: { name: 'Tog‘ Havosi Kofe' },
      shop: { name: 'Chirchiq Savdo Markazi' },
      beauty: { name: 'Farida Beauty' },
      sport: { name: 'Temir Odam Sport Zali' },
      fun: { name: 'Chirchiq Bouling', picks: ['bouling', 'playstation'] },
      services: { name: 'Chirchiq Maishiy Xizmat' },
      delivery: { name: 'Chirchiq Dostavka' },
    },
  },
  navoi: {
    level: 0.87,
    streets: ['Navoiy shoh ko‘chasi', 'Xalqlar do‘stligi ko‘chasi', 'G‘alaba shoh ko‘chasi', 'Tinchlik ko‘chasi'],
    businesses: {
      food: { name: 'Navoiy Kabobxonasi', picks: ['shashlik-seti', 'qozon-kabob'] },
      coffee: { name: 'Nur Kofe' },
      shop: { name: 'Navoiy Kitob Markazi', picks: ['biznes-kitoblar', 'bolalar-kitoblari'] },
      beauty: { name: 'Sabina Salon' },
      sport: { name: 'Energiya Fitnes' },
      fun: { name: 'Galaktika Kinozali', picks: ['kino-2', 'teatr'] },
      services: { name: 'Navoiy Avtoyuvish' },
      delivery: { name: 'Navoiy Express' },
    },
  },
  jizzakh: {
    level: 0.8,
    streets: ['Sharof Rashidov ko‘chasi', 'Mustaqillik ko‘chasi', 'Zarbdor ko‘chasi', 'Sangzor ko‘chasi'],
    businesses: {
      food: { name: 'Jizzax Somsaxonasi', picks: ['jizzax-somsasi', 'mastava'] },
      coffee: { name: 'Sangzor Kofe' },
      shop: { name: 'Jizzax Kiyim Do‘koni' },
      beauty: { name: 'Dilnoza Salon' },
      sport: { name: 'Jizzax Polvonlari', picks: ['kurash-sinov', 'boks-sinov'] },
      fun: { name: 'Quvnoq Park' },
      services: { name: 'Jizzax Avtoservis' },
      delivery: { name: 'Somsa Ekspress', picks: ['somsa-10', 'osh-yetkazish'] },
    },
  },
  gulistan: {
    level: 0.78,
    streets: ['Birlik ko‘chasi', 'Mustaqillik ko‘chasi', 'Navoiy ko‘chasi', 'Sirdaryo ko‘chasi'],
    businesses: {
      food: { name: 'Guliston Oshxonasi' },
      coffee: { name: 'Sirdaryo Kofe' },
      shop: { name: 'Guliston Gul Do‘koni', description: 'Yangi gullar, guldastalar va sovg‘alar.', picks: ['atirgul-guldasta', 'quruq-mevalar'] },
      beauty: { name: 'Mohira Salon' },
      sport: { name: 'Guliston Fitnes' },
      fun: { name: 'Guliston O‘yin Markazi' },
      services: { name: 'Toza Uy Servis', description: 'Uy va ofislarni professional tozalash.', picks: ['uy-tozalash', 'konditsioner'] },
      delivery: { name: 'Sirdaryo Dostavka' },
    },
  },
  karshi: {
    level: 0.82,
    streets: ['Mustaqillik ko‘chasi', 'Nasaf ko‘chasi', 'Amir Temur ko‘chasi', 'Qarshi ko‘chasi'],
    businesses: {
      food: { name: 'Nasaf Tandir Go‘sht', picks: ['tandir-gosht', 'shashlik-seti'] },
      coffee: { name: 'Qarshi Kofe Uyi' },
      shop: { name: 'Qarshi Savdo Uyi' },
      beauty: { name: 'Ra’no Salon' },
      sport: { name: 'Qarshi Sport Klubi' },
      fun: { name: 'Qarshi Kinoteatri', picks: ['kino-2', 'karaoke'] },
      services: { name: 'Sovuq Havo Servis', description: 'Konditsioner va sovutgichlar xizmati — issiq kunlarda ham tez.', picks: ['konditsioner', 'noutbuk-profilaktika'] },
      delivery: { name: 'Nasaf Express' },
    },
  },
  termez: {
    level: 0.8,
    streets: ['At-Termiziy ko‘chasi', 'Alpomish ko‘chasi', 'Mustaqillik ko‘chasi', 'Navoiy ko‘chasi'],
    businesses: {
      food: { name: 'Termiz Kabobxonasi' },
      coffee: { name: 'Surxon Kofe' },
      shop: { name: 'Termiz Kitob Uyi', picks: ['bolalar-kitoblari', 'biznes-kitoblar'] },
      beauty: { name: 'Shahnoza Salon' },
      sport: { name: 'Alpomish Sport' },
      fun: { name: 'Sirli Kalit Kvest', picks: ['kvest-xona', 'lazertag'] },
      services: { name: 'Suratchi Studiya', description: 'Fotosessiya, hujjat uchun surat va chop etish.', picks: ['fotosessiya', 'kiyim-tamiri'] },
      delivery: { name: 'Surxon Yetkazish' },
    },
  },
  urgench: {
    level: 0.84,
    streets: ['Al-Xorazmiy ko‘chasi', 'Amir Temur ko‘chasi', 'Pahlavon Mahmud ko‘chasi', 'Mustaqillik ko‘chasi'],
    businesses: {
      food: { name: 'Xorazm Oshxonasi', picks: ['tuxum-barak', 'shivit-oshi'] },
      coffee: { name: 'Urganch Shirinliklari' },
      shop: { name: 'Xiva Hunarmandlari', description: 'Xiva ustalarining yog‘och o‘ymakorligi va sovg‘alari.', picks: ['xiva-oymakor', 'ipak-romol'] },
      beauty: { name: 'Gulbahor Salon' },
      sport: { name: 'Urganch Fitnes' },
      fun: { name: 'Mo‘jiza O‘yin Markazi' },
      services: { name: 'Urganch Avtoservis' },
      delivery: { name: 'Xorazm Express' },
    },
  },
  nukus: {
    level: 0.8,
    streets: ['Qoraqalpog‘iston ko‘chasi', 'Berdaq ko‘chasi', 'Do‘stlik guzari', 'Amir Temur ko‘chasi'],
    businesses: {
      food: { name: 'Orol Taomlari', picks: ['beshbarmoq', 'manti-5'] },
      coffee: { name: 'Nukus Kofe' },
      shop: { name: 'Qoraqalpoq Sovg‘alari', description: 'Qoraqalpoq kashtasi, bezaklar va sovg‘alar.', picks: ['qoraqalpoq-sovgasi', 'ipak-romol'] },
      beauty: { name: 'Aru Salon' },
      sport: { name: 'Nukus Sport Markazi' },
      fun: { name: 'Oq Tulpor Dam Olish Parki', description: 'Ot minish, bolalar maydonchasi va oilaviy dam olish.', picks: ['ot-minish', 'batut'] },
      services: { name: 'Bilim Nuri O‘quv Markazi', description: 'Ingliz tili, kompyuter savodxonligi va tayyorlov kurslari.', picks: ['ingliz-tili', 'kompyuter-kursi'] },
      delivery: { name: 'Nukus Dostavka' },
    },
  },
};

const TASHKENT_DISTRICTS = ['Yunusobod', 'Chilonzor', 'Mirzo Ulug‘bek', 'Yakkasaroy', 'Shayxontohur', 'Mirobod', 'Olmazor', 'Sergeli'];

const HOURS: Record<DemoCategory, { open: string; close: string }> = {
  food: { open: '09:00', close: '23:00' }, coffee: { open: '08:00', close: '23:00' }, shop: { open: '09:00', close: '21:00' },
  beauty: { open: '09:00', close: '20:00' }, sport: { open: '06:00', close: '23:00' }, fun: { open: '10:00', close: '23:00' },
  services: { open: '08:00', close: '20:00' }, delivery: { open: '10:00', close: '23:30' },
};

const QUANTITY: Record<DemoCategory, [number, number]> = {
  food: [20, 60], coffee: [15, 40], shop: [5, 25], beauty: [5, 12], sport: [10, 40], fun: [10, 30], services: [5, 20], delivery: [20, 50],
};

const TTL: Record<DemoCategory, number> = { food: 120, coffee: 60, shop: 240, beauty: 240, sport: 240, fun: 240, services: 240, delivery: 120 };

/** Time windows relative to seeding, in minutes: [start, end]. */
const WINDOWS: Array<[number, number]> = [
  [-60, 90], [-120, 240], [-180, 480], [-1440, 2880], [120, 600], [-30, 1440], [-240, 180], [-60, 4320],
];

/** Small deterministic hash so the catalog is identical on every run. */
function hash(...parts: Array<string | number>) {
  let value = 2166136261;
  for (const char of parts.join('|')) {
    value ^= char.charCodeAt(0);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

const roundTo = (value: number, step: number) => Math.max(step, Math.round(value / step) * step);

/** Regional shelf price: scaled from Tashkent and rounded like a real menu. */
export function regionalPrice(tashkentPrice: number, level: number) {
  const raw = tashkentPrice * level;
  return roundTo(raw, raw < 100_000 ? 1000 : raw < 500_000 ? 5000 : 10_000);
}

/** Discounted price, rounded to a price a cashier would actually charge. */
export function discountedPrice(original: number, percent: number) {
  const raw = original * (1 - percent / 100);
  const price = roundTo(raw, raw < 100_000 ? 1000 : 5000);
  return Math.min(price, original - 1000);
}

export type DemoBusinessRow = {
  id: string; slug: string; name: string; description: string; city: string; categoryId: string; searchText: string;
};
export type DemoBranchRow = {
  id: string; businessId: string; name: string; city: string; address: string; latitudeE6: number; longitudeE6: number; hoursJson: string;
};
export type DemoDealRow = {
  id: string; businessId: string; branchId: string; categoryId: string; slug: string; title: string; description: string; terms: string;
  originalPrice: number; price: number; discountPercent: number; startsAt: string; endsAt: string;
  totalQuantity: number | null; remainingQuantity: number | null; perCustomerLimit: number; claimTtlMinutes: number;
  visual: DealVisualKey; searchText: string;
};

function pickTemplates(category: DemoCategory, city: City, cityIndex: number, spec: BusinessSpec): [Template, Template] {
  const all = TEMPLATES[category];
  const byKey = (key: string) => {
    const template = all.find((item) => item.key === key);
    if (!template) throw new Error(`Unknown demo template ${category}/${key} for ${city.slug}`);
    return template;
  };
  const pool = all.filter((item) => !REGIONAL.has(item.key));
  const categoryIndex = DEMO_CATEGORIES.indexOf(category);
  const first = spec.picks?.[0] ? byKey(spec.picks[0]) : pool[(cityIndex * 3 + categoryIndex) % pool.length];
  let second = spec.picks?.[1] ? byKey(spec.picks[1]) : pool[(cityIndex * 5 + categoryIndex * 2 + 4) % pool.length];
  if (second.key === first.key) second = pool[(pool.indexOf(second) + 1) % pool.length];
  return [first, second];
}

/** Builds the whole generated catalog relative to `now`. Pure and deterministic for a given `now`. */
export function buildDemoCatalog(now: Date) {
  const businesses: DemoBusinessRow[] = [];
  const branches: DemoBranchRow[] = [];
  const deals: DemoDealRow[] = [];

  CITIES.forEach((city, cityIndex) => {
    const citySpec = CITY_SPECS[city.slug];
    if (!citySpec) throw new Error(`Missing demo catalog for ${city.slug}`);
    DEMO_CATEGORIES.forEach((category, categoryIndex) => {
      const spec = citySpec.businesses[category];
      const businessId = `gbiz_${city.slug}_${category}`;
      const branchId = `gbr_${city.slug}_${category}`;
      const description = spec.description ?? DESCRIPTIONS[category][(cityIndex + categoryIndex) % DESCRIPTIONS[category].length];
      businesses.push({
        id: businessId,
        slug: `${slugify(spec.name)}-${city.slug}`,
        name: spec.name,
        description,
        city: city.slug,
        categoryId: DEMO_CATEGORY_IDS[category],
        searchText: buildSearchText(spec.name, description, city.uz, city.ru),
      });

      const street = citySpec.streets[(cityIndex + categoryIndex) % citySpec.streets.length];
      const number = (hash(city.slug, category, 'house') % 118) + 1;
      const dLat = ((hash(city.slug, category, 'lat') % 401) - 200) / 10_000;
      const dLon = ((hash(city.slug, category, 'lon') % 401) - 200) / 10_000;
      branches.push({
        id: branchId,
        businessId,
        name: city.slug === 'tashkent' ? `${TASHKENT_DISTRICTS[categoryIndex]} filiali` : 'Markaziy filial',
        city: city.slug,
        address: `${street}, ${number}`,
        latitudeE6: Math.round((city.latitude + dLat) * 1e6),
        longitudeE6: Math.round((city.longitude + dLon) * 1e6),
        hoursJson: JSON.stringify(HOURS[category]),
      });

      pickTemplates(category, city, cityIndex, spec).forEach((template, slot) => {
        const seed = hash(city.slug, category, slot);
        // Vary the discount by -5/0/+5 points so neighbouring cities differ.
        const percentTarget = Math.min(60, Math.max(10, template.discount + ((seed % 3) - 1) * 5));
        const originalPrice = regionalPrice(template.price, citySpec.level);
        const price = discountedPrice(originalPrice, percentTarget);
        const [minQty, maxQty] = QUANTITY[category];
        const unlimited = Boolean(template.unlimited) && seed % 2 === 0;
        const total = unlimited ? null : minQty + (seed % (maxQty - minQty + 1));
        const remaining = total === null ? null : Math.max(1, Math.round(total * [0.2, 0.35, 0.5, 0.65, 0.8, 0.95][seed % 6]));
        const [startMin, endMin] = WINDOWS[(cityIndex + categoryIndex * 3 + slot * 5) % WINDOWS.length];
        deals.push({
          id: `gdeal_${city.slug}_${category}_${slot + 1}`,
          businessId,
          branchId,
          categoryId: DEMO_CATEGORY_IDS[category],
          slug: `${template.key}-${city.slug}`,
          title: template.title,
          description: template.description,
          terms: TERMS[category][(cityIndex + slot) % TERMS[category].length],
          originalPrice,
          price,
          discountPercent: Math.round(((originalPrice - price) / originalPrice) * 100),
          startsAt: toDbTime(addMinutes(now, startMin)),
          endsAt: toDbTime(addMinutes(now, endMin)),
          totalQuantity: total,
          remainingQuantity: remaining,
          perCustomerLimit: template.limit ?? 1,
          claimTtlMinutes: TTL[category],
          visual: template.visual,
          searchText: buildSearchText(template.title, template.description, spec.name, city.uz, city.ru),
        });
      });
    });
  });

  return { businesses, branches, deals };
}
