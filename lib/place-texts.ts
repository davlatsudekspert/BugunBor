import { fmt, type Locale } from './i18n/config';

// What search engines show under a category or city page, and the short
// intro under its heading. Each category and each city has its own text, so
// no two pages share one; a category an admin adds later gets one made from
// its name. Kept apart from lib/cities.ts, which the city picker ships to the
// browser.

type Text = Record<Locale, string>;

const CATEGORY_ABOUT: Record<string, Text> = {
  taomlar: {
    uz: 'Osh, somsa, lavash, pitsa va milliy taomlarga bugungi chegirmalar. Yaqin kafe yoki restoranni tanlang, kodni oling va aksiya tugashidan oldin boring.',
    ru: 'Скидки сегодня на плов, самсу, лаваш, пиццу и национальные блюда. Выберите кафе или ресторан рядом, получите код и успейте, пока акция не закончилась.',
  },
  kofe: {
    uz: 'Kofe, choy, desert va nonushtalarga bugungi aksiyalar. Yaqin qahvaxonalarda ichimlik va shirinliklar arzonroq — kodni oling va vaqtida boring.',
    ru: 'Акции сегодня на кофе, чай, десерты и завтраки. В кофейнях рядом напитки и сладости дешевле — получите код и приходите вовремя.',
  },
  xaridlar: {
    uz: 'Kiyim, poyabzal, kitob, o‘yinchoq, uy buyumlari va hunarmandchilik mahsulotlariga bugungi chegirmalar. Yaqin do‘konlarning takliflarini solishtiring.',
    ru: 'Скидки сегодня на одежду, обувь, книги, игрушки, товары для дома и изделия ремесленников. Сравните предложения магазинов рядом.',
  },
  gozallik: {
    uz: 'Soch turmagi, manikyur, kosmetologiya va spa xizmatlariga bugungi aksiyalar. Yaqin go‘zallik salonini tanlang va chegirma bilan yoziling.',
    ru: 'Акции сегодня на стрижки, маникюр, косметологию и спа. Выберите салон красоты рядом и запишитесь на процедуру со скидкой.',
  },
  sport: {
    uz: 'Fitnes, suzish havzasi, boks, kurash va boshqa mashg‘ulotlarga bugungi chegirmalar. Yaqin sport klublarida arzonroq shug‘ullaning.',
    ru: 'Скидки сегодня на фитнес, бассейн, бокс, кураш и другие тренировки. Занимайтесь дешевле в спортивных клубах рядом.',
  },
  kongilochar: {
    uz: 'Kino, bouling, o‘yin markazlari, kvest va dam olish maskanlariga bugungi aksiyalar. Do‘stlar va oila bilan hordiq chiqarishning arzonroq yo‘li.',
    ru: 'Акции сегодня на кино, боулинг, игровые центры, квесты и места отдыха. Выгодный способ провести время с друзьями и семьёй.',
  },
  xizmatlar: {
    uz: 'Avtoservis, kimyoviy tozalash, ta’mirlash, o‘quv kurslari va boshqa xizmatlarga bugungi chegirmalar. Yaqin ustalar va markazlarning takliflari.',
    ru: 'Скидки сегодня на автосервис, химчистку, ремонт, учебные курсы и другие услуги. Предложения мастеров и центров рядом с вами.',
  },
  yetkazish: {
    uz: 'Taom, gul, meva va boshqa mahsulotlarni yetkazib berishga bugungi aksiyalar. Uydan chiqmasdan chegirma bilan buyurtma bering.',
    ru: 'Акции сегодня на доставку еды, цветов, фруктов и других товаров. Заказывайте со скидкой, не выходя из дома.',
  },
};

const CATEGORY_ABOUT_OTHER: Text = {
  uz: '«{name}» bo‘yicha bugungi aksiyalar va chegirmalar. Yaqin bizneslarning vaqt bilan cheklangan takliflarini toping va tugashidan oldin foydalaning.',
  ru: 'Акции и скидки сегодня в категории «{name}». Находите предложения заведений рядом, ограниченные по времени, и успейте ими воспользоваться.',
};

const CITY_ABOUT: Record<string, Text> = {
  tashkent: {
    uz: 'Toshkentdagi bugungi aksiyalar — Chilonzordan Yunusobodgacha: kafe, go‘zallik salonlari, sport zallari va do‘konlarning vaqt bilan cheklangan chegirmalari.',
    ru: 'Акции и скидки в Ташкенте сегодня — от Чиланзара до Юнусабада: кафе, салоны красоты, спортзалы и магазины с предложениями на ограниченное время.',
  },
  samarkand: {
    uz: 'Samarqanddagi bugungi aksiyalar: kafe va choyxonalar, nonvoyxonalar, do‘konlar va xizmatlarning chegirmalari. Kodni oling va aksiya tugashidan oldin boring.',
    ru: 'Акции в Самарканде сегодня: скидки кафе и чайхан, пекарен, магазинов и услуг. Получите код и успейте, пока акция не закончилась.',
  },
  bukhara: {
    uz: 'Buxorodagi bugungi aksiyalar va chegirmalar: milliy taomlar, qahvaxonalar, hunarmandchilik do‘konlari va xizmatlar. Yaqin takliflarni toping.',
    ru: 'Акции и скидки в Бухаре сегодня: национальная кухня, кофейни, ремесленные лавки и услуги. Находите выгодные предложения рядом.',
  },
  andijan: {
    uz: 'Andijondagi bugungi aksiyalar: kafe va restoranlar, kiyim do‘konlari, go‘zallik salonlari va xizmatlarning chegirmalari. Kodni oling va vaqtida foydalaning.',
    ru: 'Акции в Андижане сегодня: скидки кафе и ресторанов, магазинов одежды, салонов красоты и услуг. Получите код и воспользуйтесь вовремя.',
  },
  fergana: {
    uz: 'Farg‘onadagi bugungi aksiyalar va chegirmalar: kafe, qahvaxonalar, sport zallari, do‘konlar va xizmatlar. Yaqin takliflarni vaqt tugashidan oldin toping.',
    ru: 'Акции и скидки в Фергане сегодня: кафе, кофейни, спортзалы, магазины и услуги. Находите предложения рядом, пока не истекло время.',
  },
  namangan: {
    uz: 'Namangandagi bugungi aksiyalar — gullar shahridagi kafe, gul do‘konlari, go‘zallik salonlari va xizmatlarning vaqt bilan cheklangan chegirmalari.',
    ru: 'Акции в Намангане сегодня — скидки кафе, цветочных магазинов, салонов красоты и услуг в городе цветов на ограниченное время.',
  },
  kokand: {
    uz: 'Qo‘qondagi bugungi aksiyalar va chegirmalar: taomlar, shirinliklar, do‘konlar va xizmatlar. Yaqin bizneslarning takliflarini kod bilan oling.',
    ru: 'Акции и скидки в Коканде сегодня: еда, сладости, магазины и услуги. Получайте предложения заведений рядом по коду, пока они действуют.',
  },
  margilan: {
    uz: 'Marg‘ilondagi bugungi aksiyalar: atlas va adras do‘konlari, kafe, go‘zallik salonlari va xizmatlarning vaqt bilan cheklangan chegirmalari.',
    ru: 'Акции в Маргилане сегодня: скидки магазинов атласа и адраса, кафе, салонов красоты и услуг на ограниченное время.',
  },
  nurafshon: {
    uz: 'Nurafshondagi bugungi aksiyalar va chegirmalar: kafe, do‘konlar, sport va go‘zallik xizmatlari. Toshkent viloyati markazidagi yaqin takliflar.',
    ru: 'Акции и скидки в Нурафшане сегодня: кафе, магазины, спорт и красота. Выгодные предложения рядом в центре Ташкентской области.',
  },
  chirchiq: {
    uz: 'Chirchiqdagi bugungi aksiyalar — Chimyon va Chorvoq yo‘lida: kafe, dam olish maskanlari, do‘konlar va xizmatlarning chegirmalari.',
    ru: 'Акции в Чирчике сегодня — по дороге в Чимган и Чарвак: скидки кафе, мест отдыха, магазинов и услуг на ограниченное время.',
  },
  navoi: {
    uz: 'Navoiydagi bugungi aksiyalar va chegirmalar: kafe va restoranlar, do‘konlar, sport zallari va xizmatlar. Kodni oling va aksiya tugashidan oldin boring.',
    ru: 'Акции и скидки в Навои сегодня: кафе и рестораны, магазины, спортзалы и услуги. Получите код и приходите, пока предложение действует.',
  },
  jizzakh: {
    uz: 'Jizzaxdagi bugungi aksiyalar: Jizzax somsasidan tortib kiyim do‘konlari va xizmatlargacha — yaqin bizneslarning vaqt bilan cheklangan chegirmalari.',
    ru: 'Акции в Джизаке сегодня: от джизакской самсы до магазинов одежды и услуг — скидки заведений рядом на ограниченное время.',
  },
  gulistan: {
    uz: 'Gulistondagi bugungi aksiyalar va chegirmalar: kafe, do‘konlar, go‘zallik va maishiy xizmatlar. Sirdaryo viloyati markazidagi yaqin takliflar.',
    ru: 'Акции и скидки в Гулистане сегодня: кафе, магазины, красота и бытовые услуги. Выгодные предложения рядом в центре Сырдарьинской области.',
  },
  karshi: {
    uz: 'Qarshidagi bugungi aksiyalar: kafe va restoranlar, do‘konlar, sport zallari va xizmatlarning chegirmalari. Qashqadaryodagi yaqin takliflarni toping.',
    ru: 'Акции в Карши сегодня: скидки кафе и ресторанов, магазинов, спортзалов и услуг. Находите выгодные предложения в Кашкадарье.',
  },
  termez: {
    uz: 'Termizdagi bugungi aksiyalar va chegirmalar: taomlar, qahvaxonalar, do‘konlar va xizmatlar. Surxondaryo viloyati markazidagi takliflarni vaqtida oling.',
    ru: 'Акции и скидки в Термезе сегодня: еда, кофейни, магазины и услуги. Успейте воспользоваться предложениями в центре Сурхандарьинской области.',
  },
  urgench: {
    uz: 'Urganchdagi bugungi aksiyalar: tuxum barak va shivit oshidan tortib do‘konlar va xizmatlargacha — Xorazmdagi vaqt bilan cheklangan chegirmalar.',
    ru: 'Акции в Ургенче сегодня: от тухум-бараков и шивит оши до магазинов и услуг — скидки Хорезма на ограниченное время.',
  },
  nukus: {
    uz: 'Nukusdagi bugungi aksiyalar va chegirmalar: kafe va restoranlar, do‘konlar, go‘zallik salonlari va xizmatlar. Kodni oling va vaqt tugashidan oldin boring.',
    ru: 'Акции и скидки в Нукусе сегодня: кафе и рестораны, магазины, салоны красоты и услуги. Получите код и успейте воспользоваться вовремя.',
  },
};

/** The description of a category page: its own text, or one made from its name. */
export function categoryAbout(category: { slug: string; nameUz: string; nameRu: string | null }, locale: Locale) {
  if (Object.hasOwn(CATEGORY_ABOUT, category.slug)) return CATEGORY_ABOUT[category.slug][locale];
  const name = locale === 'ru' ? (category.nameRu ?? category.nameUz) : category.nameUz;
  return fmt(CATEGORY_ABOUT_OTHER[locale], { name });
}

/** The description of a city's deals; null for a place that is not one of the cities. */
export function cityAbout(slug: string | null | undefined, locale: Locale): string | null {
  return (slug && Object.hasOwn(CITY_ABOUT, slug) && CITY_ABOUT[slug][locale]) || null;
}
