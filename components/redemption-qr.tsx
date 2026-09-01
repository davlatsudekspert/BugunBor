'use client';

import { useEffect, useRef } from 'react';
import QRCode from 'qrcode';

/** Renders the plaintext redemption code as a scannable QR — staff can scan it with the camera
 * instead of retyping it (see components/qr-scanner.tsx on the business side). */
export function RedemptionQr({ value }: { value: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, value, { width: 176, margin: 1, color: { dark: '#152a3b', light: '#ffffff' } }).catch(() => {});
  }, [value]);

  return <canvas ref={canvasRef} className="mx-auto mt-2 block rounded-xl border border-emerald-200 bg-white p-2" aria-label="Skanerlash uchun QR kod" />;
}
