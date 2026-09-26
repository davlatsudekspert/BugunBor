'use client';

import { Printer } from 'lucide-react';

export function PrintButton({ label }: { label: string }) {
  return (
    <button type="button" onClick={() => window.print()} className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 font-bold text-white print:hidden">
      <Printer className="size-5" aria-hidden /> {label}
    </button>
  );
}
