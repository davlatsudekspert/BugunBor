import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { BadgeCheck, CalendarClock, Clock3, Heart, MapPin, Navigation, Phone, ShieldCheck, TriangleAlert } from 'lucide-react';

import { ClaimButton } from '@/components/claim-button';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getActiveDealBySlug } from '@/modules/catalog/repository';

const formatPrice = (value: number | null) => value === null ? '' : new Intl.NumberFormat('uz-UZ').format(value);

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const deal = await getActiveDealBySlug(slug);
  if (!deal) return { title: 'Aksiya topilmadi', robots: { index: false, follow: false }, openGraph: { images: [] }, twitter: { images: [] } };
  const title = `${deal.title} — ${deal.discountPercent}% chegirma`;
  const description = `${deal.businessName}: ${deal.description}`;
  return { title, description, alternates: { canonical: `/deals/${deal.slug}` }, openGraph: { title, description, images: [] }, twitter: { title, description, images: [] } };
}

export default async function DealPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const deal = await getActiveDealBySlug(slug);
  if (!deal) notFound();
  const directions = `https://www.google.com/maps/dir/?api=1&destination=${deal.latitudeE6 / 1_000_000},${deal.longitudeE6 / 1_000_000}`;
  const share = `https://t.me/share/url?url=${encodeURIComponent(`https://bugunbor.uz/deals/${deal.slug}`)}&text=${encodeURIComponent(`${deal.title} — ${deal.discountPercent}% chegirma`)}`;

  return (
    <main className="min-h-screen bg-[#fffdf9] pb-24 text-[#152a3b]">
      <header className="border-b border-slate-200 bg-white"><div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6"><a href="/" className="text-xl font-black tracking-[-.04em]">Bugun<span className="text-primary">Bor</span></a><a href="/discover" className="text-sm font-bold text-slate-600">← Aksiyalarga qaytish</a></div></header>
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[1.15fr_.85fr]">
        <section>
          <div className="relative grid min-h-72 place-items-center overflow-hidden rounded-[28px] bg-gradient-to-br from-[#ff895d] to-[#ed4c2a] shadow-[0_20px_60px_rgba(245,89,55,.18)]">
            <span className="text-[9rem]">{deal.categorySlug === 'xaridlar' ? '📚' : '🍽️'}</span>
            <Badge className="absolute left-5 top-5 h-10 bg-white px-4 text-lg font-black text-[#152a3b]">-{deal.discountPercent}%</Badge>
          </div>
          <div className="mt-7 flex items-center gap-2 text-sm font-bold text-slate-600">{deal.businessName}{deal.verified ? <BadgeCheck className="size-5 fill-emerald-500 text-white" /> : null}</div>
          <h1 className="mt-3 text-4xl font-black tracking-[-.05em] sm:text-5xl">{deal.title}</h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">{deal.description}</p>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="flex items-center gap-2 text-sm font-bold"><MapPin className="size-4 text-primary" /> {deal.branchName}</p><p className="mt-2 text-sm leading-6 text-slate-500">{deal.address}</p></div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="flex items-center gap-2 text-sm font-bold"><CalendarClock className="size-4 text-primary" /> Ish vaqti</p><p className="mt-2 text-sm text-slate-500">Har kuni, 10:00–23:00</p></div>
          </div>

          <div className="mt-7 rounded-2xl border border-slate-200 bg-white p-5"><h2 className="font-black">Shartlar va cheklovlar</h2><p className="mt-2 leading-7 text-slate-600">{deal.terms}</p><p className="mt-3 flex items-center gap-2 text-sm text-emerald-700"><ShieldCheck className="size-4" /> Ma’lumot biznes va moderator tomonidan tekshirilgan.</p></div>
          <div className="mt-5 flex flex-wrap gap-2">
            {deal.phone ? <a className={cn(buttonVariants({ variant: 'outline' }), 'h-10 rounded-xl px-4')} href={`tel:${deal.phone}`}><Phone className="mr-2 size-4" /> Qo‘ng‘iroq</a> : null}
            <a className={cn(buttonVariants({ variant: 'outline' }), 'h-10 rounded-xl px-4')} href={directions} target="_blank" rel="noreferrer"><Navigation className="mr-2 size-4" /> Yo‘l ko‘rsatish</a>
            <a className={cn(buttonVariants({ variant: 'outline' }), 'h-10 rounded-xl px-4')} href={share} target="_blank" rel="noreferrer">Ulashish</a>
            <a className={cn(buttonVariants({ variant: 'ghost' }), 'h-10 rounded-xl px-4')} href={`/login?returnTo=${encodeURIComponent(`/deals/${deal.slug}`)}`}><Heart className="mr-2 size-4" /> Saqlash</a>
          </div>
          <a href={`/contact?subject=${encodeURIComponent(`Noto‘g‘ri ma’lumot: ${deal.title}`)}`} className="mt-7 inline-flex items-center gap-2 text-sm text-slate-500 underline-offset-4 hover:underline"><TriangleAlert className="size-4" /> Noto‘g‘ri ma’lumot haqida xabar berish</a>
        </section>

        <aside className="lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_rgba(20,40,55,.1)]">
            <div className="flex items-end gap-2"><strong className="text-4xl font-black text-primary">{formatPrice(deal.discountedPriceUzs)}</strong><span className="pb-1 font-bold">so‘m</span></div>
            {deal.originalPriceUzs ? <p className="mt-1 text-sm text-slate-400 line-through">{formatPrice(deal.originalPriceUzs)} so‘m</p> : null}
            <div className="mt-5 flex items-center justify-between rounded-2xl bg-[#152a3b] p-4 text-white"><span className="flex items-center gap-2 text-sm font-bold"><Clock3 className="size-5 text-orange-300" /> Tugash vaqti</span><span className="font-mono text-lg font-black">{new Date(`${deal.endsAt}Z`).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tashkent' })}</span></div>
            <p className="mt-4 text-sm font-semibold text-amber-700">{deal.remainingQuantity === null ? 'Miqdor cheklanmagan' : `${deal.remainingQuantity} ta taklif qoldi`}</p>
            {deal.remainingQuantity !== null && deal.remainingQuantity <= 3 && deal.phone ? (
              <p className="mt-2 flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold leading-5 text-amber-800">
                <Phone className="mt-0.5 size-3.5 shrink-0" /> Joy kam qoldi — filialga borishdan oldin <a href={`tel:${deal.phone}`} className="underline underline-offset-2">{deal.phone}</a> raqamiga qo‘ng‘iroq qilib tasdiqlashingiz tavsiya etiladi.
              </p>
            ) : null}
            <div className="mt-5"><ClaimButton dealId={deal.id} branchId={deal.branchId} phone={deal.phone} /></div>
            <p className="mt-4 text-xs leading-5 text-slate-500">Band qilingandan so‘ng 15 daqiqalik bir martalik kod beriladi. Takroriy tasdiqlash rad etiladi. BugunBor onlayn bron qiladi — filial xodimi tizimni doim kuzatib turmasligi mumkin, shu sabab borishdan oldin qo‘ng‘iroq qilib tasdiqlash tavsiya etiladi.</p>
          </div>
        </aside>
      </div>
    </main>
  );
}
