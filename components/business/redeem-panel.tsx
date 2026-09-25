'use client';

import { Camera, CameraOff, CheckCircle2, LoaderCircle, RotateCcw, ScanLine, TriangleAlert } from 'lucide-react';
import { useEffect, useEffectEvent, useRef, useState } from 'react';

import { apiRequest } from '@/lib/api-client';
import { formatClock, parseDbTime } from '@/lib/time';
import { codeFromScan, formatRedemptionCode } from '@/modules/redemptions/codes';

type Lookup = { id: string; dealTitle: string; price: number; originalPrice: number | null; branchName: string; customerName: string; customerPhone: string; createdAt: string; expiresAt: string };

type Labels = {
  text: string; code: string; check: string; checking: string; scan: string; stopScan: string; scanHint: string;
  cameraUnsupported: string; cameraDenied: string; found: string; customer: string; deal: string; branch: string;
  claimedAt: string; validUntil: string; toPay: string; confirm: string; completing: string; completed: string; next: string;
  networkError: string; codeInvalid: string; sum: string;
};

type BarcodeDetectorLike = { detect(source: CanvasImageSource): Promise<Array<{ rawValue: string }>> };
type BarcodeDetectorConstructor = new (options: { formats: string[] }) => BarcodeDetectorLike;

/** Polls video frames (~5 per second) until a BugunBor code decodes or the camera stops. */
function scanFrames(detector: BarcodeDetectorLike, getVideo: () => HTMLVideoElement | null, getStream: () => MediaStream | null, onCode: (rawValue: string) => void) {
  const tick = async () => {
    const element = getVideo();
    const current = getStream();
    if (!current || !element) return;
    if (element.srcObject !== current) {
      element.srcObject = current;
      await element.play().catch(() => undefined);
    }
    try {
      const [hit] = await detector.detect(element);
      if (hit && codeFromScan(hit.rawValue)) {
        onCode(hit.rawValue);
        return;
      }
    } catch {
      // Frames before the video is ready fail to decode; keep scanning.
    }
    setTimeout(() => requestAnimationFrame(() => void tick()), 200);
  };
  requestAnimationFrame(() => void tick());
}

const formatPrice = (value: number, sum: string) => `${value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} ${sum}`;

export function RedeemPanel({ businessId, initialCode, labels }: { businessId: string; initialCode: string | null; labels: Labels }) {
  const [code, setCode] = useState(initialCode ?? '');
  const [phase, setPhase] = useState<'idle' | 'checking' | 'found' | 'completing' | 'completed' | 'error'>('idle');
  const [lookup, setLookup] = useState<Lookup | null>(null);
  const [error, setError] = useState('');
  const [scanning, setScanning] = useState(false);
  const [cameraMessage, setCameraMessage] = useState('');
  const video = useRef<HTMLVideoElement | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const autoChecked = useRef(false);

  async function check(value = code) {
    const normalized = codeFromScan(value);
    if (!normalized) {
      setPhase('error');
      setError(labels.codeInvalid);
      return;
    }
    setCode(formatRedemptionCode(normalized));
    setPhase('checking');
    setError('');
    const result = await apiRequest<Lookup>(`/api/v1/business/${businessId}`, { type: 'redeem.lookup', code: normalized }, { networkError: labels.networkError });
    if (!result.ok) {
      setPhase('error');
      setError(result.message);
      return;
    }
    setLookup(result.data);
    setPhase('found');
  }

  async function complete() {
    if (!lookup) return;
    setPhase('completing');
    const result = await apiRequest(`/api/v1/business/${businessId}`, { type: 'redeem.complete', redemptionId: lookup.id }, { networkError: labels.networkError });
    if (!result.ok) {
      setPhase('error');
      setError(result.message);
      return;
    }
    setPhase('completed');
    if ('vibrate' in navigator) navigator.vibrate?.(80);
  }

  function reset() {
    setCode('');
    setLookup(null);
    setError('');
    setPhase('idle');
  }

  function stopCamera() {
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
    setScanning(false);
  }

  async function startCamera() {
    const Detector = (window as unknown as { BarcodeDetector?: BarcodeDetectorConstructor }).BarcodeDetector;
    if (!Detector || !navigator.mediaDevices?.getUserMedia) {
      setCameraMessage(labels.cameraUnsupported);
      return;
    }
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
    } catch {
      setCameraMessage(labels.cameraDenied);
      return;
    }
    setCameraMessage('');
    setScanning(true);
    scanFrames(new Detector({ formats: ['qr_code'] }), () => video.current, () => stream.current, (rawValue) => {
      stopCamera();
      void check(rawValue);
    });
  }

  // A code arriving via /r/KOD (scanned with the phone camera app) is checked straight away.
  const checkInitialCode = useEffectEvent(() => {
    if (initialCode && !autoChecked.current) {
      autoChecked.current = true;
      void check(initialCode);
    }
  });

  useEffect(() => {
    checkInitialCode();
    return () => stream.current?.getTracks().forEach((track) => track.stop());
  }, []);

  if (phase === 'completed' && lookup) {
    return (
      <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-8 text-center" aria-live="polite">
        <CheckCircle2 className="mx-auto size-14 text-emerald-600" aria-hidden />
        <p className="mt-3 text-2xl font-black text-emerald-950">{labels.completed}</p>
        <p className="mt-2 font-bold text-navy">{lookup.dealTitle}</p>
        <p className="mt-1 text-3xl font-black text-primary">{formatPrice(lookup.price, labels.sum)}</p>
        <button type="button" onClick={reset} className="mt-6 inline-flex h-12 items-center gap-2 rounded-xl bg-navy px-6 font-bold text-white"><RotateCcw className="size-4" aria-hidden /> {labels.next}</button>
      </div>
    );
  }

  return (
    <div className="space-y-4" aria-live="polite">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void check();
        }}
        className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6"
      >
        <p className="text-sm text-slate-600">{labels.text}</p>
        <label className="mt-4 block">
          <span className="sr-only">{labels.code}</span>
          <input
            value={code}
            onChange={(event) => {
              setCode(event.target.value.toUpperCase());
              if (phase === 'error' || phase === 'found') setPhase('idle');
            }}
            inputMode="text"
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            maxLength={9}
            placeholder="K7P 2QX"
            className="h-16 w-full rounded-2xl border-2 border-slate-200 bg-slate-50 text-center font-mono text-3xl font-black tracking-[.25em] text-navy outline-none focus:border-primary"
          />
        </label>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <button disabled={phase === 'checking' || code.replace(/\s/g, '').length < 6} className="flex h-12 items-center justify-center gap-2 rounded-xl bg-primary font-bold text-white disabled:opacity-50">
            {phase === 'checking' ? <LoaderCircle className="size-5 animate-spin" aria-hidden /> : null}
            {phase === 'checking' ? labels.checking : labels.check}
          </button>
          <button type="button" onClick={scanning ? stopCamera : startCamera} className="flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 font-bold text-navy hover:border-primary/40">
            {scanning ? <CameraOff className="size-5" aria-hidden /> : <Camera className="size-5" aria-hidden />}
            {scanning ? labels.stopScan : labels.scan}
          </button>
        </div>
        {cameraMessage ? <p className="mt-3 text-sm font-semibold text-amber-700">{cameraMessage}</p> : null}
        {scanning ? (
          <div className="relative mt-4 overflow-hidden rounded-2xl bg-black">
            <video ref={video} playsInline muted className="aspect-square w-full object-cover" />
            <div className="pointer-events-none absolute inset-[18%] rounded-2xl border-4 border-white/80" />
            <p className="absolute inset-x-0 bottom-3 flex items-center justify-center gap-2 text-sm font-bold text-white"><ScanLine className="size-4" aria-hidden /> {labels.scanHint}</p>
          </div>
        ) : null}
      </form>

      {phase === 'error' ? (
        <p role="alert" className="flex items-center gap-2 rounded-2xl bg-red-50 p-4 font-bold text-red-700"><TriangleAlert className="size-5 shrink-0" aria-hidden /> {error}</p>
      ) : null}

      {(phase === 'found' || phase === 'completing') && lookup ? (
        <div className="rounded-3xl border-2 border-emerald-300 bg-white p-5 sm:p-6">
          <p className="flex items-center gap-2 text-sm font-black uppercase tracking-[.12em] text-emerald-700"><CheckCircle2 className="size-5" aria-hidden /> {labels.found}</p>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div><dt className="text-slate-500">{labels.deal}</dt><dd className="font-bold text-navy">{lookup.dealTitle}</dd></div>
            <div><dt className="text-slate-500">{labels.customer}</dt><dd className="font-bold text-navy">{lookup.customerName} <span className="font-normal text-slate-500">{lookup.customerPhone}</span></dd></div>
            <div><dt className="text-slate-500">{labels.branch}</dt><dd className="font-bold text-navy">{lookup.branchName}</dd></div>
            <div><dt className="text-slate-500">{labels.validUntil}</dt><dd className="font-bold text-navy">{formatClock(parseDbTime(lookup.expiresAt))}</dd></div>
          </dl>
          <div className="mt-4 flex items-end justify-between rounded-2xl bg-slate-50 p-4">
            <span className="text-sm font-bold text-slate-600">{labels.toPay}</span>
            <span className="text-right">
              <strong className="block text-3xl font-black text-primary">{formatPrice(lookup.price, labels.sum)}</strong>
              {lookup.originalPrice ? <span className="text-sm text-slate-400 line-through">{formatPrice(lookup.originalPrice, labels.sum)}</span> : null}
            </span>
          </div>
          <button type="button" onClick={complete} disabled={phase === 'completing'} className="mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 text-lg font-black text-white disabled:opacity-60">
            {phase === 'completing' ? <LoaderCircle className="size-5 animate-spin" aria-hidden /> : <CheckCircle2 className="size-6" aria-hidden />}
            {phase === 'completing' ? labels.completing : labels.confirm}
          </button>
        </div>
      ) : null}
    </div>
  );
}
