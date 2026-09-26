import type { Metadata } from 'next';

import { CategoryForm } from '@/components/admin/admin-controls';
import { AdminShell } from '@/components/admin/admin-shell';
import { CATEGORY_ICON_KEYS } from '@/components/deals/category-icon';
import { getDb } from '@/db/client';
import { getI18n } from '@/lib/i18n/server';
import { requireAdmin } from '@/modules/auth/current';
import { listCategories } from '@/modules/catalog/queries';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.admin.categories.title, robots: { index: false, follow: false } };
}

export default async function AdminCategoriesPage() {
  const user = await requireAdmin('/admin/categories');
  const [{ t }, db] = await Promise.all([getI18n(), getDb()]);
  const categories = await listCategories(db, { includeInactive: true });
  const c = t.admin.categories;
  const labels = { slug: c.slug, nameUz: c.nameUz, nameRu: c.nameRu, icon: c.icon, order: c.order, active: c.active, save: t.common.save, networkError: t.common.networkError };
  return (
    <AdminShell t={t} role={user.role} active="categories">
      <div className="space-y-3">
        {categories.map((category) => (
          <div key={category.id} className="rounded-2xl border border-slate-200 bg-white p-4">
            <CategoryForm
              value={{ id: category.id, slug: category.slug, nameUz: category.nameUz, nameRu: category.nameRu ?? '', icon: category.icon ?? 'utensils', sortOrder: category.sortOrder, isActive: category.isActive }}
              icons={CATEGORY_ICON_KEYS}
              labels={labels}
            />
          </div>
        ))}
        <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-white p-4">
          <p className="mb-3 text-sm font-black text-navy">{c.add}</p>
          <CategoryForm value={{ id: null, slug: '', nameUz: '', nameRu: '', icon: 'utensils', sortOrder: (categories.at(-1)?.sortOrder ?? 0) + 10, isActive: true }} icons={CATEGORY_ICON_KEYS} labels={labels} />
        </div>
      </div>
    </AdminShell>
  );
}
