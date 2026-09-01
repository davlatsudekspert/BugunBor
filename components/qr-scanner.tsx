'use client';

import { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { Camera, X } from 'lucide-react';

// The native BarcodeDetector API (Chrome/Edge/Android) decodes a QR frame far faster and more
// reliably than any pure-JS library — used when the browser supports it. jsQR (pure JS, no WASM)
// is the fallback everywhere else (notably Safari/iOS, which doesn't ship BarcodeDetector).
type BarcodeDetectorLike = { detect(source: CanvasImageSource): Promise<Array<{ rawValue: string }>> };
declare global {
  interface Window {
    BarcodeDetector?: new (options: { formats: string[] }) => BarcodeDetectorLike;
  }
}

export function QrScanner({ onDetect, onClose }: { onDetect: (value: string) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let stream: MediaStream | null = null;
    let rafId = 0;
    let stopped = false;
    canvasRef.current = document.createElement('canvas');
    const detector = window.BarcodeDetector ? new window.BarcodeDetector({ formats: ['qr_code'] }) : null;

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      } catch {
        setError('Kameraga ruxsat berilmadi. Brauzer sozlamalaridan ruxsat bering yoki kodni qo‘lda kiriting.');
        return;
      }
      if (stopped || !videoRef.current) { stream.getTracks().forEach((track) => track.stop()); return; }
      videoRef.current.srcObject = stream;
      await videoRef.current.play().catch(() => {});
      void tick();
    }

    async function tick() {
      if (stopped || !videoRef.current || videoRef.current.readyState < 2) {
        rafId = requestAnimationFrame(tick);
        return;
      }
      const video = videoRef.current;
      try {
        if (detector) {
          const codes = await detector.detect(video);
          if (codes[0]?.rawValue) { onDetect(codes[0].rawValue); return; }
        } else if (canvasRef.current) {
          const canvas = canvasRef.current;
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (ctx && canvas.width && canvas.height) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(frame.data, frame.width, frame.height);
            if (code?.data) { onDetect(code.data); return; }
          }
        }
      } catch {
        // A single bad frame is normal — just try the next one.
      }
      rafId = requestAnimationFrame(tick);
    }

    void start();
    return () => {
      stopped = true;
      cancelAnimationFrame(rafId);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [onDetect]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-black p-2">
      <div className="flex items-center justify-between px-2 pb-2">
        <p className="flex items-center gap-1.5 text-xs font-bold text-white"><Camera className="size-3.5" /> QR kodni kameraga yaqinlashtiring</p>
        <button type="button" onClick={onClose} aria-label="Skanerlashni yopish" className="rounded-full p-1 text-white/80 hover:bg-white/10"><X className="size-4" /></button>
      </div>
      {error ? (
        <p className="rounded-xl bg-red-50 p-4 text-center text-sm font-semibold text-red-700">{error}</p>
      ) : (
        // eslint-disable-next-line jsx-a11y/media-has-caption -- live camera preview, not a media file
        <video ref={videoRef} muted playsInline className="aspect-square w-full rounded-xl object-cover" />
      )}
    </div>
  );
}
