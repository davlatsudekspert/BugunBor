import { formatNumber } from '@/lib/format';
import type { Locale } from '@/lib/i18n';

// Public offer for business plans (what Payme and Click look for on the site).
// Prices, periods, the free trial and the operator's details come from the
// database, so the text never disagrees with the billing page.

export type OfferPlan = { name: string; priceMonthlyUzs: number; maxBranches: number | null; maxLiveDeals: number | null; maxStaff: number | null; topSlots: number };
export type OfferInput = {
  company: { legalName: string; tin: string; address: string; phone: string; email: string };
  plans: OfferPlan[];
  periods: ReadonlyArray<{ months: number; discountPercent: number }>;
  trialMonths: number;
  site: string;
};
export type OfferSection = { id: string; title: string; paragraphs: string[]; items?: string[] };

const limit = (value: number | null, unlimited: string) => (value === null ? unlimited : String(value));

export function offerSections(locale: Locale, input: OfferInput): OfferSection[] {
  const { company, plans, periods, trialMonths, site } = input;
  const discounts = periods.filter((period) => period.discountPercent > 0);
  if (locale === 'ru') {
    const operator = company.legalName || 'оператор платформы BugunBor';
    return [
      { id: 'umumiy', title: 'Общие положения', paragraphs: [
        `Настоящий документ — публичная оферта ${operator} (далее — «Исполнитель») об оказании услуг по тарифам платформы ${site} (далее — «Платформа») владельцам бизнеса (далее — «Заказчик»).`,
        'Оплачивая выбранный тариф, Заказчик полностью и безоговорочно принимает условия оферты (акцепт) в соответствии с Гражданским кодексом Республики Узбекистан.',
      ] },
      { id: 'predmet', title: 'Предмет договора', paragraphs: [
        'Исполнитель предоставляет Заказчику в пределах выбранного тарифа: размещение акций на Платформе, кабинет бизнеса, управление филиалами и сотрудниками, проверку кодов клиентов и статистику.',
        'Для клиентов (покупателей) Платформа бесплатна. Товар или услугу по акции клиент оплачивает на месте у Заказчика; Исполнитель в этих расчётах не участвует.',
      ] },
      { id: 'tariflar', title: 'Тарифы и цены', paragraphs: [
        'Цены указаны в узбекских сумах и являются окончательными:',
      ], items: [
        ...plans.map((plan) => `${plan.name} — ${formatNumber(plan.priceMonthlyUzs)} сум в месяц: филиалов — ${limit(plan.maxBranches, 'без ограничений')}, активных акций — ${limit(plan.maxLiveDeals, 'без ограничений')}, сотрудников — ${limit(plan.maxStaff, 'без ограничений')}, мест в ТОП — ${plan.topSlots}.`),
        ...(discounts.length ? [`Скидка при оплате вперёд: ${discounts.map((period) => `${period.months} мес. — ${period.discountPercent}%`).join(', ')}.`] : []),
        `Новый бизнес после проверки получает бесплатный период на ${trialMonths} мес.`,
      ] },
      { id: 'tolov', title: 'Порядок оплаты', paragraphs: [
        'Оплата производится банковской картой (Uzcard, Humo и др.) через платёжные системы Payme или Click, либо банковским переводом по реквизитам, указанным в кабинете.',
        'При онлайн-оплате тариф включается автоматически, как только платёжная система подтвердит платёж. При банковском переводе — в течение 1 рабочего дня после поступления денег на счёт Исполнителя. Чек об оплате выдаёт платёжная система.',
      ] },
      { id: 'muddat', title: 'Срок оказания услуг', paragraphs: [
        'Тариф действует выбранный срок (1, 3, 6 или 12 месяцев) с момента подтверждения оплаты. При продлении до окончания срока новый срок прибавляется к текущему.',
        'После окончания срока акции бизнеса не показываются на сайте, данные кабинета сохраняются.',
      ] },
      { id: 'qaytarish', title: 'Отмена и возврат денег', paragraphs: [
        'В течение 14 календарных дней после оплаты Заказчик может отказаться от тарифа и получить полный возврат, если за это время не размещал новых акций.',
        'В остальных случаях возвращается оплата за полностью неиспользованные месяцы; текущий месяц не возвращается.',
        `Заявление на возврат отправляется через страницу «Связаться»${company.phone ? ` или по телефону ${company.phone}` : ''}. Деньги возвращаются тем же способом, которым была произведена оплата, в течение 10 рабочих дней; онлайн-платежи отменяются по правилам Payme и Click.`,
      ] },
      { id: 'majburiyat', title: 'Права и обязанности сторон', paragraphs: [
        'Заказчик предоставляет достоверные сведения, соблюдает условия своих акций, не рекламирует запрещённые законом товары и услуги и отвечает за сохранность доступа к кабинету.',
        'Исполнитель обеспечивает работу Платформы, проверяет бизнесы и акции и вправе приостановить акцию или бизнес, нарушающие правила Платформы. О плановых технических работах Исполнитель сообщает заранее.',
      ] },
      { id: 'javobgarlik', title: 'Ответственность', paragraphs: [
        'За качество товаров и услуг по акциям отвечает Заказчик. Ответственность Исполнителя ограничена суммой, уплаченной Заказчиком за тариф. Стороны освобождаются от ответственности при обстоятельствах непреодолимой силы.',
      ] },
      { id: 'maxfiylik', title: 'Персональные данные', paragraphs: ['Персональные данные обрабатываются в соответствии с Политикой конфиденциальности Платформы.'] },
      { id: 'nizolar', title: 'Разрешение споров', paragraphs: ['Споры решаются путём переговоров, а при недостижении согласия — в суде по законодательству Республики Узбекистан.'] },
      { id: 'rekvizitlar', title: 'Реквизиты Исполнителя', paragraphs: [], items: [
        `Наименование: ${company.legalName || '—'}`,
        `ИНН (СТИР): ${company.tin || '—'}`,
        `Адрес: ${company.address || '—'}`,
        `Телефон: ${company.phone || '—'}`,
        ...(company.email ? [`E-mail: ${company.email}`] : []),
      ] },
    ];
  }
  const operator = company.legalName || 'BugunBor platformasi operatori';
  return [
    { id: 'umumiy', title: 'Umumiy qoidalar', paragraphs: [
      `Ushbu hujjat ${operator} (keyingi o‘rinlarda — «Ijrochi») tomonidan ${site} platformasida (keyingi o‘rinlarda — «Platforma») biznes egalariga (keyingi o‘rinlarda — «Buyurtmachi») tarif xizmatlarini ko‘rsatish bo‘yicha ommaviy ofertadir.`,
      'Buyurtmachi tanlangan tarifni to‘lash orqali oferta shartlarini O‘zbekiston Respublikasi Fuqarolik kodeksiga muvofiq to‘liq va so‘zsiz qabul qiladi (aksept).',
    ] },
    { id: 'predmet', title: 'Shartnoma predmeti', paragraphs: [
      'Ijrochi Buyurtmachiga tanlangan tarif doirasida: Platformada aksiyalar joylash, biznes kabineti, filiallar va xodimlarni boshqarish, mijoz kodlarini tekshirish va statistika xizmatlarini ko‘rsatadi.',
      'Mijozlar (xaridorlar) uchun Platforma bepul. Aksiya bo‘yicha mahsulot yoki xizmat uchun mijoz Buyurtmachining o‘zida to‘laydi; Ijrochi bu hisob-kitoblarda ishtirok etmaydi.',
    ] },
    { id: 'tariflar', title: 'Tariflar va narxlar', paragraphs: [
      'Narxlar O‘zbekiston so‘mida ko‘rsatilgan va yakuniy hisoblanadi:',
    ], items: [
      ...plans.map((plan) => `${plan.name} — oyiga ${formatNumber(plan.priceMonthlyUzs)} so‘m: filiallar — ${limit(plan.maxBranches, 'cheksiz')}, faol aksiyalar — ${limit(plan.maxLiveDeals, 'cheksiz')}, xodimlar — ${limit(plan.maxStaff, 'cheksiz')}, TOP o‘rinlari — ${plan.topSlots}.`),
      ...(discounts.length ? [`Oldindan to‘lashda chegirma: ${discounts.map((period) => `${period.months} oy — ${period.discountPercent}%`).join(', ')}.`] : []),
      `Tekshiruvdan o‘tgan yangi biznes ${trialMonths} oylik bepul davr oladi.`,
    ] },
    { id: 'tolov', title: 'To‘lov tartibi', paragraphs: [
      'To‘lov bank kartasi (Uzcard, Humo va boshqalar) bilan Payme yoki Click to‘lov tizimlari orqali yoki kabinetda ko‘rsatilgan rekvizitlar bo‘yicha bank o‘tkazmasi bilan amalga oshiriladi.',
      'Onlayn to‘lovda tarif to‘lov tizimi to‘lovni tasdiqlashi bilan avtomatik yoqiladi. Bank o‘tkazmasida — pul Ijrochi hisobiga tushgandan keyin 1 ish kuni ichida. To‘lov chekini to‘lov tizimi beradi.',
    ] },
    { id: 'muddat', title: 'Xizmat ko‘rsatish muddati', paragraphs: [
      'Tarif to‘lov tasdiqlangan paytdan boshlab tanlangan muddatga (1, 3, 6 yoki 12 oy) amal qiladi. Muddat tugashidan oldin uzaytirilsa, yangi muddat joriy muddat oxiriga qo‘shiladi.',
      'Muddat tugagach biznes aksiyalari saytda ko‘rsatilmaydi, kabinet ma’lumotlari saqlanib qoladi.',
    ] },
    { id: 'qaytarish', title: 'Bekor qilish va pulni qaytarish', paragraphs: [
      'To‘lovdan keyin 14 kalendar kun ichida, agar shu vaqtda yangi aksiya joylamagan bo‘lsa, Buyurtmachi tarifdan voz kechib, pulni to‘liq qaytarib olishi mumkin.',
      'Boshqa hollarda to‘liq foydalanilmagan oylar uchun to‘lov qaytariladi; joriy oy qaytarilmaydi.',
      `Qaytarish so‘rovi «Bog‘lanish» sahifasi orqali${company.phone ? ` yoki ${company.phone} telefoni orqali` : ''} yuboriladi. Pul 10 ish kuni ichida to‘lov qilingan usulning o‘ziga qaytariladi; onlayn to‘lovlar Payme va Click qoidalari bo‘yicha bekor qilinadi.`,
    ] },
    { id: 'majburiyat', title: 'Tomonlarning huquq va majburiyatlari', paragraphs: [
      'Buyurtmachi to‘g‘ri ma’lumot beradi, aksiya shartlariga amal qiladi, qonun taqiqlagan mahsulot va xizmatlarni reklama qilmaydi hamda kabinetga kirish xavfsizligi uchun javob beradi.',
      'Ijrochi Platforma ishlashini ta’minlaydi, biznes va aksiyalarni tekshiradi, Platforma qoidalarini buzgan aksiya yoki biznesni to‘xtatishga haqli. Rejali texnik ishlar haqida oldindan xabar beradi.',
    ] },
    { id: 'javobgarlik', title: 'Javobgarlik', paragraphs: [
      'Aksiya bo‘yicha mahsulot va xizmatlar sifati uchun Buyurtmachi javob beradi. Ijrochining javobgarligi Buyurtmachi tarif uchun to‘lagan summa bilan cheklanadi. Fors-major holatlarida tomonlar javobgarlikdan ozod bo‘ladi.',
    ] },
    { id: 'maxfiylik', title: 'Shaxsiy ma’lumotlar', paragraphs: ['Shaxsiy ma’lumotlar Platformaning Maxfiylik siyosatiga muvofiq qayta ishlanadi.'] },
    { id: 'nizolar', title: 'Nizolarni hal qilish', paragraphs: ['Nizolar muzokaralar yo‘li bilan, kelishuvga erishilmasa — O‘zbekiston Respublikasi qonunchiligiga muvofiq sud orqali hal qilinadi.'] },
    { id: 'rekvizitlar', title: 'Ijrochi rekvizitlari', paragraphs: [], items: [
      `Nomi: ${company.legalName || '—'}`,
      `STIR: ${company.tin || '—'}`,
      `Manzil: ${company.address || '—'}`,
      `Telefon: ${company.phone || '—'}`,
      ...(company.email ? [`E-mail: ${company.email}`] : []),
    ] },
  ];
}
