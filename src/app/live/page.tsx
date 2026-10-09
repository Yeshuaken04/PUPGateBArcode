'use client';

import React, { useState, useRef, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import BarcodeRenderer from '@/components/BarcodeRenderer';
import {
  Camera,
  CameraOff,
  Eye,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ShieldCheck,
  Barcode,
  Radio,
  Zap,
  Volume2,
  Car,
  UserCheck,
} from 'lucide-react';
import { ScanApiResponse } from '@/types/database';

export default function LiveScannerPage() {
  const [token, setToken] = useState('');
  const [type, setType] = useState<'barcode' | 'rfid' | 'qr'>('barcode');
  const [direction, setDirection] = useState<'entry' | 'exit'>('entry');
  const [gateCode, setGateCode] = useState('GATE-01');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ScanApiResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Live Camera Stream State
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<any>(null);

  // Play audio sound feedback using Web Audio API
  const playSound = (allowed: boolean) => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      if (allowed) {
        // High double beep for allowed
        osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
        osc.frequency.setValueAtTime(1174.66, audioCtx.currentTime + 0.1); // D6
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        osc.start(audioCtx.currentTime);
        osc.stop(audioCtx.currentTime + 0.3);
      } else {
        // Low buzz for denied
        osc.frequency.setValueAtTime(220, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.4, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
        osc.start(audioCtx.currentTime);
        osc.stop(audioCtx.currentTime + 0.4);
      }
    } catch {
      // AudioContext might be blocked until user gesture
    }
  };

  // Turn Camera On
  const startCamera = async () => {
    setCameraError(null);
    try {
      const constraints: MediaStreamConstraints = {
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);

      // Start BarcodeDetector if supported in modern browsers
      if ('BarcodeDetector' in window) {
        const barcodeDetector = new (window as any).BarcodeDetector({
          formats: ['code_128', 'code_39', 'qr_code', 'ean_13'],
        });

        scanIntervalRef.current = setInterval(async () => {
          if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
            try {
              const barcodes = await barcodeDetector.detect(videoRef.current);
              if (barcodes.length > 0) {
                const detectedVal = barcodes[0].rawValue;
                if (detectedVal && !busy) {
                  triggerScan(detectedVal, 'barcode');
                }
              }
            } catch {
              // ignore frame detection errors
            }
          }
        }, 500);
      }
    } catch (err: any) {
      setCameraError(err.message || 'Hindi ma-access ang camera. Pakitingnan ang browser permissions.');
      setCameraActive(false);
    }
  };

  // Turn Camera Off
  const stopCamera = () => {
    if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Send Scan to API
  const triggerScan = async (scanToken: string, credentialType: string = type) => {
    if (!scanToken.trim() || busy) return;

    setBusy(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer pup_bataan_gate_device_secret_secure_key_2026',
        },
        body: JSON.stringify({
          credential: scanToken.trim(),
          type: credentialType,
          gateCode,
          direction,
        }),
      });

      const data = await res.json();
      setResult(data);
      playSound(data.allowed);

      if (!res.ok) {
        setErrorMsg(data.reason || 'Denied access');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Scan error occurred');
      playSound(false);
    } finally {
      setBusy(false);
    }
  };

  const handleManualScanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    triggerScan(token);
  };

  return (
    <DashboardLayout
      title="Live Camera Barcode Scanner & Turnstile Console"
      subtitle="I-scan ang visual barcode gamit ang live camera o barcode reader para mag-verify at magbukas ng gate barrier"
    >
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Column: Live Camera & Scanner Interface */}
        <div className="lg:col-span-7 space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Camera className="h-4 w-4 text-pup-700" />
                <span>Live Camera Viewfinder</span>
              </h3>
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                  cameraActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                }`}>
                  <span className={`h-2 w-2 rounded-full ${cameraActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                  {cameraActive ? 'CAMERA LIVE' : 'CAMERA STANDBY'}
                </span>
              </div>
            </div>

            {/* Video Viewfinder / Scanner Screen */}
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-slate-950 flex items-center justify-center text-white">
              <video
                ref={videoRef}
                playsInline
                muted
                className={`h-full w-full object-cover ${cameraActive ? 'block' : 'hidden'}`}
              />

              {/* Viewfinder Target & Laser Animation when Camera is Active */}
              {cameraActive && (
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center p-8">
                  <div className="relative h-48 w-64 rounded-2xl border-2 border-emerald-400/80 bg-emerald-500/5 shadow-[0_0_20px_rgba(16,185,129,0.3)] flex items-center justify-center">
                    {/* Animated Red Scanning Laser */}
                    <div className="absolute left-2 right-2 h-0.5 bg-rose-500 shadow-[0_0_8px_#f43f5e] animate-bounce" />
                    <div className="text-[11px] font-bold tracking-wider uppercase text-emerald-300/80">
                      I-align ang Barcode Dito
                    </div>
                  </div>
                  <div className="mt-3 rounded-full bg-black/60 px-3 py-1 font-mono text-[10px] text-slate-300 backdrop-blur-sm">
                    {gateCode} • {direction.toUpperCase()}
                  </div>
                </div>
              )}

              {/* Standby Placeholder when Camera is Off */}
              {!cameraActive && (
                <div className="p-8 text-center space-y-3">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 ring-4 ring-white/5">
                    <Barcode className="h-8 w-8 text-amber-400" />
                  </div>
                  <div className="text-base font-black tracking-wide">PUP BATAAN BARCODE TERMINAL</div>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto">
                    Pindutin ang &quot;Buksan ang Camera&quot; para i-scan ang barcode ng estudyante gamit ang webcam o camera ng device.
                  </p>
                  <button
                    onClick={startCamera}
                    type="button"
                    className="inline-flex items-center gap-2 rounded-xl bg-pup-700 px-5 py-2.5 text-xs font-bold text-white shadow-lg hover:bg-pup-800 transition cursor-pointer"
                  >
                    <Camera className="h-4 w-4" />
                    Buksan ang Camera Scanner
                  </button>
                </div>
              )}
            </div>

            {/* Camera Control Toggle Bar */}
            <div className="flex items-center justify-between gap-2 pt-1">
              {cameraActive ? (
                <button
                  onClick={stopCamera}
                  className="flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 transition cursor-pointer"
                >
                  <CameraOff className="h-4 w-4" />
                  Patayin ang Camera
                </button>
              ) : (
                <button
                  onClick={startCamera}
                  className="flex items-center gap-1.5 rounded-xl border border-pup-300 bg-pup-50 px-3.5 py-2 text-xs font-bold text-pup-900 hover:bg-pup-100 transition cursor-pointer"
                >
                  <Camera className="h-4 w-4" />
                  Buksan ang Camera
                </button>
              )}

              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                <span>Direction:</span>
                <button
                  onClick={() => setDirection(direction === 'entry' ? 'exit' : 'entry')}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-bold uppercase transition ${
                    direction === 'entry'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {direction === 'entry' ? 'Entrance Gate (Papasok)' : 'Exit Gate (Palabas)'}
                </button>
              </div>
            </div>

            {cameraError && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 font-semibold">
                {cameraError}
              </div>
            )}

            {/* Handheld Barcode Gun / Manual Input */}
            <form onSubmit={handleManualScanSubmit} className="pt-2 border-t border-slate-100 space-y-2">
              <label className="block text-xs font-bold uppercase text-slate-600">
                O I-type / I-scan gamit ang Handheld Barcode Scanner Gun:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="I-type o i-tap ang scanner (Hal. 2021-12345 o ABC-1234)..."
                  className="flex-1 rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs font-mono font-bold uppercase outline-none focus:border-pup-700"
                />
                <button
                  type="submit"
                  disabled={busy || !token.trim()}
                  className="rounded-xl bg-pup-700 px-5 py-2.5 text-xs font-bold text-white hover:bg-pup-800 transition disabled:opacity-50 cursor-pointer"
                >
                  {busy ? 'Scanning...' : 'I-verify'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column: Live Gate Authorization & Visual Barcode Pass */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <span>Gate Authentication Result</span>
              </h3>
              {result && (
                <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-black uppercase ${
                  result.allowed ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                }`}>
                  {result.action}
                </span>
              )}
            </div>

            {/* Gate Barrier Status Banner */}
            {result ? (
              <div className={`rounded-2xl p-4 text-center transition ${
                result.allowed
                  ? 'border-2 border-emerald-500 bg-emerald-50 text-emerald-950'
                  : 'border-2 border-rose-500 bg-rose-50 text-rose-950'
              }`}>
                <div className="flex items-center justify-center gap-2 text-xl font-black">
                  {result.allowed ? (
                    <>
                      <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                      <span>GATE BARRIER OPEN</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-6 w-6 text-rose-600" />
                      <span>ACCESS DENIED</span>
                    </>
                  )}
                </div>
                <div className="mt-1 text-xs font-semibold">
                  {result.allowed
                    ? 'Awtorisado ang pagpasok / paglabas sa kampus.'
                    : `Dahilan: ${result.reason || 'Hindi awtorisado o hindi natagpuan sa database.'}`}
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-xs text-slate-400">
                Wala pang na-scan na barcode. I-tutok ang barcode sa camera o mag-type ng ID number.
              </div>
            )}

            {/* Scanned Student Information */}
            {result?.student && (
              <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-sm font-black text-slate-900">
                      {result.student.fullName}
                    </div>
                    <div className="text-xs text-slate-500 font-mono">
                      {result.student.studentNumber} • {result.student.course || result.student.personType?.toUpperCase()}
                    </div>
                  </div>
                  <span className="rounded-md bg-pup-100 px-2 py-0.5 text-[10px] font-bold text-pup-800 uppercase">
                    {result.student.personType || 'STUDENT'}
                  </span>
                </div>

                {/* THE ACTUAL REAL VISUAL BARCODE OF SCANNED STUDENT */}
                <div className="pt-2">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 text-center">
                    Visual Pass Barcode
                  </div>
                  <BarcodeRenderer
                    value={result.student.studentNumber}
                    height={65}
                    width={1.8}
                    fontSize={12}
                  />
                </div>
              </div>
            )}

            {/* Scanned Vehicle Information (if applicable) */}
            {result?.vehicle && (
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
                <div className="flex items-center gap-2">
                  <Car className="h-4 w-4 text-slate-600" />
                  <div>
                    <div className="font-bold text-slate-900">{result.vehicle.brandModel}</div>
                    <div className="text-[11px] text-slate-500 capitalize">{result.vehicle.type}</div>
                  </div>
                </div>
                <span className="font-mono font-black text-slate-900 text-sm bg-white px-2 py-1 rounded border border-slate-300">
                  {result.vehicle.plateNumber}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
