// Where Payme and Click send the browser back after checkout. A plain path (no
// "?" or "=") keeps Payme's "key=value;…" checkout parameters unambiguous.
export function GET(request: Request, context: { params: Promise<{ order: string }> }) {
  return context.params.then(({ order }) => Response.redirect(new URL(`/business/billing?order=${encodeURIComponent(order.slice(0, 100))}`, request.url), 302));
}
