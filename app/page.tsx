import {
  ArrowRight,
  BadgeCheck,
  Bike,
  Clock3,
  Coffee,
  Heart,
  LocateFixed,
  MapPin,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Utensils,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { listActiveDeals, listCategories } from '@/modules/catalog/repository';

const categoryVisuals = {
  taomlar: { icon: Utensils, color: 'bg-orange-50 text-orange-700' },
  kofe: { icon: Coffee, color: 'bg-amber-50 text-amber-700' },
  xaridlar: { icon: ShoppingBag, color: 'bg-sky-50 text-sky-700' },
  yetkazish: { icon: Bike, color: 'bg-emerald-50 text-emerald-700' },
} as const;

function formatPrice(value: number | null) {
  return value === null ? '' : new Intl.NumberFormat('uz-UZ').format(value);
}

function formatTimeLeft(endsAt: string) {
  const seconds = Math.max(0, Math.floor((new Date(`${endsAt}Z`).getTime() - Date.now()) / 1000));
  const hours = Math.floor(seconds / 3600).toString().padStart(2, '0');
  const minutes = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
  const rest = (seconds % 60).toString().padStart(2, '0');
  return `${hours}:${minutes}:${rest}`;
}

function dealVisual(slug: string) {
  if (slug.includes('tort')) return { palette: 'from-[#f3ba61] to-[#d9852e]', symbol: '🍰' };
  if (slug.includes('kitob')) return { palette: 'from-[#345a76] to-[#18334c]', symbol: '📚' };
  if (slug.includes('lagmon')) return { palette: 'from-[#f59e5d] to-[#df542c]', symbol: '🍜' };
  return { palette: 'from-[#ff895d] to-[#f44e2f]', symbol: '🍚' };
}

export default async function Home() {
  const [dealRecords, categoryRecords] = await Promise.all([
    listActiveDeals({ limit: 3 }),
    listCategories(),
  ]);
  const deals = dealRecords.map((deal, index) => ({
    ...deal,
    business: deal.businessName,
    monogram: deal.businessName.split(/\s+/).map((word) => word[0]).join('').slice(0, 2),
    branch: deal.branchName,
    price: formatPrice(deal.discountedPriceUzs),
    oldPrice: formatPrice(deal.originalPriceUzs),
    discount: `-${deal.discountPercent}%`,
    distance: `${(1.2 + index * 1.4).toFixed(1).replace('.', ',')} km`,
    left: formatTimeLeft(deal.endsAt),
    quantity: deal.remainingQuantity === null ? 'Cheklanmagan' : `${deal.remainingQuantity} ta qoldi`,
    ...dealVisual(deal.slug),
  }));
  const categories = categoryRecords.map((category) => ({
    label: category.name,
    slug: category.slug,
    count: category.activeCount,
    ...(categoryVisuals[category.slug as keyof typeof categoryVisuals] ?? categoryVisuals.xaridlar),
  }));
  const activeDealCount = categoryRecords.reduce((total, category) => total + Number(category.activeCount), 0);
  return (
    <main className="min-h-screen overflow-hidden bg-background pb-24 text-foreground md:pb-0">
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-[#fffdf9]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <a href="/" className="flex items-center gap-2" aria-label="BugunBor bosh sahifa">
            <span className="grid size-9 place-items-center rounded-[12px] bg-primary text-lg font-black text-primary-foreground shadow-[0_6px_18px_rgba(245,89,55,.25)]">B</span>
            <span className="text-xl font-black tracking-[-0.04em] text-[#152a3b]">Bugun<span className="text-primary">Bor</span></span>
          </a>

          <nav className="hidden items-center gap-7 text-sm font-semibold text-slate-600 md:flex" aria-label="Asosiy navigatsiya">
            <a className="text-[#152a3b]" href="#deals">Aksiyalar</a>
            <a className="transition-colors hover:text-primary" href="#categories">Kategoriyalar</a>
            <a className="transition-colors hover:text-primary" href="/business">Biznes uchun</a>
          </nav>

          <div className="flex items-center gap-2">
            <a className={cn(buttonVariants({ variant: 'ghost' }), 'hidden sm:inline-flex')} href="/login">Kirish</a>
            <a className={cn(buttonVariants(), 'h-10 rounded-xl px-4 shadow-[0_6px_16px_rgba(245,89,55,.18)]')} href="/business/onboarding">Aksiya joylash</a>
          </div>
        </div>
      </header>

      <section className="relative border-b border-slate-200/70 bg-[#fffdf9]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_14%,rgba(255,182,135,.3),transparent_28%),radial-gradient(circle_at_8%_84%,rgba(255,222,184,.35),transparent_22%)]" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[1.06fr_.94fr] lg:px-8 lg:py-20">
          <div>
            <Badge className="mb-5 h-7 border-orange-200 bg-orange-50 px-3 text-orange-700" variant="outline">
              <Sparkles className="size-3.5" /> Bugun Toshkentda {activeDealCount} ta faol aksiya
            </Badge>
            <h1 className="max-w-3xl text-[clamp(2.6rem,6vw,5.4rem)] font-black leading-[.95] tracking-[-.065em] text-[#152a3b]">
              Bugun bor — <span className="text-primary">ertaga bo‘lmasligi</span> mumkin
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-slate-600 sm:text-lg">
              Yoningizdagi eng yaxshi takliflarni toping, vaqt tugashidan oldin band qiling va ko‘proq tejang.
            </p>

            <form action="/discover" className="mt-8 flex max-w-2xl flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_18px_60px_rgba(30,50,65,.12)] sm:flex-row">
              <label className="flex h-12 min-w-0 flex-1 items-center gap-3 rounded-xl px-3 focus-within:ring-2 focus-within:ring-primary/25">
                <Search className="size-5 shrink-0 text-slate-400" />
                <span className="sr-only">Aksiya yoki biznes qidiring</span>
                <input name="q" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400" placeholder="Osh, kofe, kitob..." />
              </label>
              <label className="flex h-12 items-center gap-2 border-slate-200 px-3 text-sm font-semibold text-slate-700 sm:border-l">
                <MapPin className="size-4 text-primary" />
                <span className="sr-only">Shahar</span>
                <select name="city" defaultValue="tashkent" className="bg-transparent pr-3 outline-none">
                  <option value="tashkent">Toshkent</option>
                  <option value="samarkand">Samarqand</option>
                  <option value="bukhara">Buxoro</option>
                </select>
              </label>
              <button className="h-12 rounded-xl bg-primary px-6 text-sm font-bold text-white transition hover:bg-primary/90" type="submit">Topish</button>
            </form>

            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-500">
              <span className="flex items-center gap-1.5"><LocateFixed className="size-4 text-primary" /> 2 km ichida</span>
              <span className="flex items-center gap-1.5"><ShieldCheck className="size-4 text-emerald-600" /> Faqat tekshirilgan bizneslar</span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[520px] lg:justify-self-end">
            <div className="absolute -inset-8 -z-10 rounded-full bg-orange-200/30 blur-3xl" />
            <div className="rounded-[32px] border border-white/80 bg-[#152a3b] p-4 shadow-[0_30px_80px_rgba(18,43,61,.24)] sm:p-5">
              <div className="mb-4 flex items-center justify-between px-1 text-white">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[.14em] text-orange-200">Yaqiningizda</p>
                  <p className="mt-1 text-xl font-bold">Hozir tugayotganlar</p>
                </div>
                <span className="rounded-xl bg-white/10 px-3 py-2 text-xs font-semibold">Jonli</span>
              </div>
              <div className="relative overflow-hidden rounded-[24px] bg-[#f7efe5] p-5">
                <div className="absolute right-0 top-0 grid h-32 w-36 place-items-center rounded-bl-[70px] bg-[#ff7651] text-6xl">🍜</div>
                <div className="relative max-w-[68%]">
                  <Badge className="bg-[#152a3b] text-white">-35%</Badge>
                  <h2 className="mt-8 text-2xl font-black leading-tight tracking-[-.04em] text-[#152a3b]">Lag‘mon va salat kombo</h2>
                  <p className="mt-2 text-sm font-semibold text-slate-600">Anhor Lokomotiv</p>
                  <p className="mt-5 text-2xl font-black text-primary">42 000 <span className="text-sm">so‘m</span></p>
                </div>
                <div className="mt-5 flex items-center justify-between rounded-2xl bg-white p-3 shadow-sm">
                  <span className="flex items-center gap-2 text-sm font-bold text-[#152a3b]"><Clock3 className="size-4 text-primary" /> 00:48:22</span>
                  <a href="/deals/lagmon-kombo" className="text-sm font-bold text-primary">Ko‘rish <ArrowRight className="ml-1 inline size-4" /></a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="categories" className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[.12em] text-primary">Bir bosishda toping</p>
            <h2 className="mt-2 text-3xl font-black tracking-[-.04em] text-[#152a3b]">Mashhur kategoriyalar</h2>
          </div>
          <a href="/categories" className="hidden items-center gap-1 text-sm font-bold text-primary sm:flex">Barchasi <ArrowRight className="size-4" /></a>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {categories.map(({ label, slug, count, icon: Icon, color }) => (
            <a key={label} href={`/categories/${slug}`} className="group flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 transition hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-lg">
              <span className={cn('grid size-11 place-items-center rounded-xl', color)}><Icon className="size-5" /></span>
              <span><strong className="block text-[#152a3b]">{label}</strong><small className="text-slate-500">{count} aksiya</small></span>
            </a>
          ))}
        </div>
      </section>

      <section id="deals" className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-[.12em] text-primary">Vaqt ketmoqda</p>
            <h2 className="mt-2 text-3xl font-black tracking-[-.04em] text-[#152a3b]">Yaqiningizdagi aksiyalar</h2>
          </div>
          <div className="flex gap-2" aria-label="Aksiya filtrlari">
            <a href="/discover?sort=near" className="rounded-full bg-[#152a3b] px-4 py-2 text-xs font-bold text-white">Yaqin</a>
            <a href="/discover?sort=ending" className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600">Tez tugaydi</a>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {deals.map((deal) => (
            <Card key={deal.title} className="group border-0 py-0 shadow-[0_10px_40px_rgba(25,45,60,.08)] ring-slate-200 transition hover:-translate-y-1 hover:shadow-[0_18px_55px_rgba(25,45,60,.14)]">
              <div className={cn('relative h-48 overflow-hidden bg-gradient-to-br p-5', deal.palette)}>
                <div className="absolute -bottom-10 -right-6 text-[9rem] leading-none opacity-95 transition-transform duration-500 group-hover:scale-105 group-hover:-rotate-3">{deal.symbol}</div>
                <Badge className="h-8 bg-white px-3 text-base font-black text-[#152a3b] shadow-sm">{deal.discount}</Badge>
                <a href={`/login?returnTo=${encodeURIComponent(`/deals/${deal.slug}`)}`} className="absolute right-4 top-4 grid size-10 place-items-center rounded-full bg-white/95 text-slate-600 shadow-sm transition hover:text-primary focus-visible:ring-2 focus-visible:ring-white" aria-label={`${deal.title} aksiyasini saqlash`}><Heart className="size-5" /></a>
                <div className="absolute bottom-4 left-4 flex items-center gap-2 rounded-full bg-[#152a3b]/90 px-3 py-2 text-xs font-bold text-white backdrop-blur"><Clock3 className="size-3.5 text-orange-300" /> {deal.left}</div>
              </div>
              <CardHeader>
                <div className="flex items-center gap-2.5 text-sm font-bold text-slate-700">
                  <span className="grid size-8 place-items-center rounded-full bg-slate-100 text-xs text-[#152a3b]">{deal.monogram}</span>
                  {deal.business} <BadgeCheck className="size-4 fill-emerald-500 text-white" />
                </div>
                <CardTitle className="mt-2 text-xl font-black tracking-[-.025em] text-[#152a3b]">{deal.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-2"><strong className="text-2xl font-black text-primary">{deal.price} <span className="text-sm">so‘m</span></strong><span className="pb-1 text-sm text-slate-400 line-through">{deal.oldPrice}</span></div>
                <div className="mt-3 flex items-center justify-between text-xs text-slate-500"><span className="flex items-center gap-1"><MapPin className="size-3.5" /> {deal.branch} · {deal.distance}</span><span className="font-bold text-amber-700">{deal.quantity}</span></div>
              </CardContent>
              <CardFooter className="mt-1 border-slate-100 bg-slate-50/70">
                <a className={cn(buttonVariants(), 'h-10 w-full rounded-xl font-bold')} href={`/deals/${deal.slug}`}>Aksiyani ko‘rish <ArrowRight className="ml-1 size-4" /></a>
              </CardFooter>
            </Card>
          ))}
        </div>
      </section>

      <section className="bg-[#152a3b] text-white">
        <div className="mx-auto grid max-w-7xl items-center gap-8 px-4 py-12 sm:px-6 md:grid-cols-[1fr_auto] lg:px-8">
          <div><Badge className="bg-orange-400/15 text-orange-200">Bizneslar uchun</Badge><h2 className="mt-4 max-w-2xl text-3xl font-black tracking-[-.04em]">Bo‘sh joyni daromadga, qolgan mahsulotni yangi mijozga aylantiring.</h2><p className="mt-3 text-slate-300">Aksiyani 3 daqiqada yarating. Natijani real vaqtda kuzating.</p></div>
          <a className={cn(buttonVariants(), 'h-12 rounded-xl bg-white px-6 font-bold text-[#152a3b] hover:bg-orange-50')} href="/business/onboarding">Bepul boshlash <ArrowRight className="ml-2 size-4" /></a>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl items-center gap-8 px-4 py-14 sm:px-6 md:grid-cols-2 lg:px-8">
        <img src="/og.png" width="1728" height="905" alt="BugunBor — yaqin aksiyalar va vaqtli takliflar" className="w-full rounded-[24px] border border-orange-100 shadow-[0_18px_50px_rgba(25,45,60,.12)]" />
        <div>
          <Badge className="bg-orange-50 text-orange-700">NFCStore bilan tayyor</Badge>
          <h2 className="mt-4 text-3xl font-black tracking-[-.04em] text-[#152a3b]">Bir tegish — biznesning bugungi takliflari.</h2>
          <p className="mt-3 leading-7 text-slate-600">NFC karta yoki stiker xavfsiz token orqali biznes profilini ochadi, tashrif manbasini qayd etadi va ayni paytdagi faol aksiyalarni ko‘rsatadi. NFCStore va BugunBor ma’lumotlari alohida qoladi.</p>
          <a href="/nfcstore" className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-primary">Integratsiya qanday ishlaydi <ArrowRight className="size-4" /></a>
        </div>
      </section>

      <nav className="fixed inset-x-3 bottom-3 z-50 grid grid-cols-4 rounded-2xl border border-slate-200 bg-white/95 p-2 shadow-[0_12px_50px_rgba(18,43,61,.2)] backdrop-blur md:hidden" aria-label="Mobil navigatsiya">
        <a className="flex flex-col items-center gap-1 rounded-xl py-1.5 text-[10px] font-bold text-primary" href="/"><Search className="size-5" />Topish</a>
        <a className="flex flex-col items-center gap-1 rounded-xl py-1.5 text-[10px] font-bold text-slate-500" href="/discover?view=map"><MapPin className="size-5" />Xarita</a>
        <a className="flex flex-col items-center gap-1 rounded-xl py-1.5 text-[10px] font-bold text-slate-500" href="/login?returnTo=%2Faccount%2Fsaved"><Heart className="size-5" />Saqlangan</a>
        <a className="flex flex-col items-center gap-1 rounded-xl py-1.5 text-[10px] font-bold text-slate-500" href="/login?returnTo=%2Faccount"><span className="grid size-5 place-items-center rounded-full border border-current text-[9px]">A</span>Profil</a>
      </nav>
    </main>
  );
}
