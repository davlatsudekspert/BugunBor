import { renderSVG } from 'uqr';

import { cn } from '@/lib/utils';

/** QR code rendered as an SVG image; works in server and client components. */
export function QrCode({ value, label, className }: { value: string; label: string; className?: string }) {
  const svg = renderSVG(value, { border: 1, whiteColor: '#ffffff', blackColor: '#152a3b' });
  return <img src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`} alt={label} className={cn('block', className)} />;
}
