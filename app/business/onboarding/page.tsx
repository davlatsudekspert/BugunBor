import type { Metadata } from 'next';
import { BadgeCheck, Building2, MapPin, ShieldCheck } from 'lucide-react';

import { BusinessForm } from '@/components/business/business-form';
import { getDb } from '@/db/client';
import { getI18n } from '@/lib/i18n/server';
import { requireUser } from '@/modules/auth/current';
import { categoryName, listCategories } from '@/modules/catalog/queries';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.onboarding.title, robots: { index: false, follow: false } };
}

const icons = [Building2, MapPin, BadgeCheck, ShieldCheck];

export default async function OnboardingPage() {
  const user = await requireUser('/business/onboarding');
  const [{ t, locale }, db] = await Promise.all([getI18n(), getDb()]);
  const categories = await listCategories(db);
  return (
    <main className="bg-cream">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[.75fr_1.25fr]">
        <aside>
          <span className="text-sm font-bold uppercase tracking-[.14em] text-primary">{t.onboarding.kicker}</span>
          <h1 className="mt-3 text-4xl font-black tracking-[-.05em] text-navy">{t.onboarding.title}</h1>
          <p className="mt-4 leading-7 text-slate-600">{t.onboarding.text}</p>
          <div className="mt-8 space-y-4 text-sm font-semibold text-slate-700">
            {t.onboarding.benefits.map((benefit, index) => {
              const Icon = icons[index] ?? BadgeCheck;
              return <p key={benefit} className="flex items-center gap-3"><Icon className="size-5 text-primary" aria-hidden /> {benefit}</p>;
            })}
          </div>
        </aside>
        <BusinessForm
          mode="create"
          categories={categories.map((category) => ({ id: category.id, name: categoryName(category, locale) }))}
          initial={{ phone: user.phone ?? '+998' }}
          locale={locale}
          t={{ businessForm: t.businessForm, validation: t.validation, onboarding: t.onboarding, common: t.common, biz: t.biz, errors: t.errors }}
        />
      </div>
    </main>
  );
}
