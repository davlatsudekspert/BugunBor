import { getDb } from '@/db/client';
import { json, route } from '@/lib/http';
import { listAdminBusinesses, listAdminDeals, listMessages } from '@/modules/admin/service';
import { appOwner } from '@/modules/auth/app-owner';
import { listReports } from '@/modules/reports';

// GET /api/v1/admin/queue — what waits for the owner in the app: businesses
// and deals in review, open reports and new messages. Each item carries what
// a decision needs, nothing more.
export const GET = route(async (request: Request) => {
  const db = await getDb();
  await appOwner(request, db);
  const [businesses, deals, reports, messages] = await Promise.all([
    listAdminBusinesses(db, { list: 'pending' }),
    listAdminDeals(db, 'pending'),
    listReports(db, { status: 'NEW' }),
    listMessages(db, 'NEW'),
  ]);
  return json({
    data: {
      businesses: businesses.map((b) => ({
        id: b.id, name: b.name, city: b.city, category: b.categoryName, description: b.description, phone: b.phone, ownerName: b.ownerName,
        branches: b.branchCount, createdAt: b.createdAt, autoNote: b.autoNote,
      })),
      deals: deals.map((d) => ({
        id: d.id, title: d.title, business: d.businessName, description: d.description, terms: d.terms, category: d.categoryName,
        price: d.price, originalPrice: d.originalPrice, discountPercent: d.discountPercent, endsAt: d.endsAt, photo: d.photo, submittedAt: d.submittedAt, autoNote: d.autoNote,
      })),
      reports: reports.map((r) => ({
        id: r.id, targetType: r.targetType, reason: r.reason, comment: r.comment, title: r.title, count: r.count, createdAt: r.createdAt, reporter: r.reporter, held: r.held,
      })),
      messages: messages.map((m) => ({ id: m.id, name: m.name, contact: m.contact, subject: m.subject, message: m.message, createdAt: m.createdAt })),
    },
  });
});
