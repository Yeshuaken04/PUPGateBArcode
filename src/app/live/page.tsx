'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import BarcodeRenderer from '@/components/BarcodeRenderer';
import {
  Camera,
  CameraOff,
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
  RefreshCw,
  LogIn,
  LogOut,
  Layers,
  SlidersHorizontal,
} from 'lucide-react';
import { ScanApiResponse } from '@/types/database';
import { BrowserMultiFormatReader, IScannerControls } from '@zxing/browser';
import { BarcodeFormat, DecodeHintType } from '@zxing/library';

export default function LiveScannerPage() {
  // Manual / Handheld barcode gun input
  const [token, setToken] = useState('');
  const [type, setType] = useState<'barcode' | 'rfid' | 'qr'>('barcode');
  const [manualDirection, setManualDirection] = useState<'entry' | 'exit'>('entry');
  const [manualGateCode, setManualGateCode] = useState('GATE-01');

  // Global scan state & result
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ScanApiResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [lastScanGateInfo, setLastScanGateInfo] = useState<{ gate: string; direction: 'entry' | 'exit' }>({
    gate: 'GATE-01',
    direction: 'entry',
  });

  // View mode: 'dual' (Entrance & Exit side-by-side), 'entrance' (focus on Entrance), 'exit' (focus on Exit)
  const [viewMode, setViewMode] = useState<'dual' | 'entrance' | 'exit'>('dual');

  // Device enumeration state
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [entranceDeviceId, setEntranceDeviceId] = useState<string>('');
  const [exitDeviceId, setExitDeviceId] = useState<string>('');

  // Entrance Camera State (GATE-01 • Inbound Entry)
  const [entranceActive, setEntranceActive] = useState(false);
  const [entranceError, setEntranceError] = useState<string | null>(null);
  const [entranceLastToken, setEntranceLastToken] = useState<string>('');
  const entranceVideoRef = useRef<HTMLVideoElement | null>(null);
  const entranceControlsRef = useRef<IScannerControls | null>(null);
  const entranceLastScannedRef = useRef<{ value: string; time: number }>({ value: '', time: 0 });

  // Exit Camera State (GATE-02 • Outbound Exit)
  const [exitActive, setExitActive] = useState(false);
  const [exitError, setExitError] = useState<string | null>(null);
  const [exitLastToken, setExitLastToken] = useState<string>('');
  const exitVideoRef = useRef<HTMLVideoElement | null>(null);
  const exitControlsRef = useRef<IScannerControls | null>(null);
  const exitLastScannedRef = useRef<{ value: string; time: number }>({ value: '', time: 0 });

  // Audio Feedback
  const playSound = (allowed: boolean) => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      if (allowed) {
        // High double chime for allowed
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
      // AudioContext may be blocked before interaction
    }
  };

  // Helper to create hints for ZXing multi-format reading
  const createReaderHints = () => {
    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.CODE_128,
      BarcodeFormat.CODE_39,
      BarcodeFormat.QR_CODE,
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
      BarcodeFormat.ITF,
      BarcodeFormat.CODABAR,
      BarcodeFormat.DATA_MATRIX,
    ]);
    hints.set(DecodeHintType.TRY_HARDER, true);
    return hints;
  };

  // Enumerate all camera video input devices
  const refreshDeviceList = useCallback(async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return;
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter((d) => d.kind === 'videoinput');
      setVideoDevices(videoInputs);

      if (videoInputs.length > 0) {
        setEntranceDeviceId((prev) =>
          prev && videoInputs.some((d) => d.deviceId === prev) ? prev : videoInputs[0].deviceId
        );

        setExitDeviceId((prev) => {
          if (prev && videoInputs.some((d) => d.deviceId === prev)) return prev;
          // If 2 or more cameras exist, default Exit to the 2nd camera
          return videoInputs.length > 1 ? videoInputs[1].deviceId : videoInputs[0].deviceId;
        });
      }
    } catch (err) {
      console.error('Error enumerating devices:', err);
    }
  }, []);

  // Listen to device changes (e.g. plugging in a new USB camera)
  useEffect(() => {
    refreshDeviceList();

    if (navigator.mediaDevices && navigator.mediaDevices.addEventListener) {
      navigator.mediaDevices.addEventListener('devicechange', refreshDeviceList);
      return () => {
        navigator.mediaDevices.removeEventListener('devicechange', refreshDeviceList);
      };
    }
  }, [refreshDeviceList]);

  // Execute API scan call
  const triggerScan = async (
    scanToken: string,
    credentialType: string = 'barcode',
    targetGateCode: string = 'GATE-01',
    targetDirection: 'entry' | 'exit' = 'entry'
  ) => {
    if (!scanToken.trim() || busy) return;

    setBusy(true);
    setErrorMsg('');
    setLastScanGateInfo({ gate: targetGateCode, direction: targetDirection });

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
          gateCode: targetGateCode,
          direction: targetDirection,
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

  // -------------------------------------------------------------
  // ENTRANCE CAMERA CONTROLS (GATE-01 • Inbound Entry)
  // -------------------------------------------------------------
  const startEntranceCamera = async (overrideDeviceId?: string) => {
    setEntranceError(null);
    const chosenDeviceId = overrideDeviceId || entranceDeviceId;

    try {
      const codeReader = new BrowserMultiFormatReader(createReaderHints(), {
        delayBetweenScanAttempts: 120,
      });

      if (!entranceVideoRef.current) return;

      const constraints: MediaStreamConstraints = {
        video: chosenDeviceId
          ? { deviceId: { exact: chosenDeviceId }, width: { ideal: 1280 }, height: { ideal: 720 } }
          : { facingMode: { ideal: 'environment' } },
      };

      const controls = await codeReader.decodeFromConstraints(
        constraints,
        entranceVideoRef.current,
        (scanResult) => {
          if (scanResult) {
            const raw = scanResult.getText();
            if (raw && raw.trim()) {
              const cleanToken = raw.trim();
              const now = Date.now();
              // Debounce 2.5s for identical token
              if (
                cleanToken === entranceLastScannedRef.current.value &&
                now - entranceLastScannedRef.current.time < 2500
              ) {
                return;
              }
              entranceLastScannedRef.current = { value: cleanToken, time: now };
              setEntranceLastToken(cleanToken);
              setToken(cleanToken);
              triggerScan(cleanToken, 'barcode', 'GATE-01', 'entry');
            }
          }
        }
      );

      entranceControlsRef.current = controls;
      setEntranceActive(true);
      refreshDeviceList();
    } catch (err: any) {
      console.error('Entrance camera error:', err);
      setEntranceError(
        err?.message || 'Could not start Entrance camera. Please verify camera permissions.'
      );
      setEntranceActive(false);
    }
  };

  const stopEntranceCamera = () => {
    if (entranceControlsRef.current) {
      try {
        entranceControlsRef.current.stop();
      } catch {}
      entranceControlsRef.current = null;
    }
    if (entranceVideoRef.current && entranceVideoRef.current.srcObject) {
      try {
        const stream = entranceVideoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      } catch {}
      entranceVideoRef.current.srcObject = null;
    }
    setEntranceActive(false);
  };

  // Switch entrance camera device dynamically
  const handleSwitchEntranceCamera = async (newDeviceId: string) => {
    setEntranceDeviceId(newDeviceId);
    if (entranceActive) {
      stopEntranceCamera();
      setTimeout(() => {
        startEntranceCamera(newDeviceId);
      }, 300);
    }
  };

  // -------------------------------------------------------------
  // EXIT CAMERA CONTROLS (GATE-02 • Outbound Exit)
  // -------------------------------------------------------------
  const startExitCamera = async (overrideDeviceId?: string) => {
    setExitError(null);
    const chosenDeviceId = overrideDeviceId || exitDeviceId;

    try {
      const codeReader = new BrowserMultiFormatReader(createReaderHints(), {
        delayBetweenScanAttempts: 120,
      });

      if (!exitVideoRef.current) return;

      const constraints: MediaStreamConstraints = {
        video: chosenDeviceId
          ? { deviceId: { exact: chosenDeviceId }, width: { ideal: 1280 }, height: { ideal: 720 } }
          : { facingMode: { ideal: 'user' } },
      };

      const controls = await codeReader.decodeFromConstraints(
        constraints,
        exitVideoRef.current,
        (scanResult) => {
          if (scanResult) {
            const raw = scanResult.getText();
            if (raw && raw.trim()) {
              const cleanToken = raw.trim();
              const now = Date.now();
              // Debounce 2.5s for identical token
              if (
                cleanToken === exitLastScannedRef.current.value &&
                now - exitLastScannedRef.current.time < 2500
              ) {
                return;
              }
              exitLastScannedRef.current = { value: cleanToken, time: now };
              setExitLastToken(cleanToken);
              setToken(cleanToken);
              triggerScan(cleanToken, 'barcode', 'GATE-02', 'exit');
            }
          }
        }
      );

      exitControlsRef.current = controls;
      setExitActive(true);
      refreshDeviceList();
    } catch (err: any) {
      console.error('Exit camera error:', err);
      setExitError(
        err?.message || 'Could not start Exit camera. Please verify camera permissions.'
      );
      setExitActive(false);
    }
  };

  const stopExitCamera = () => {
    if (exitControlsRef.current) {
      try {
        exitControlsRef.current.stop();
      } catch {}
      exitControlsRef.current = null;
    }
    if (exitVideoRef.current && exitVideoRef.current.srcObject) {
      try {
        const stream = exitVideoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      } catch {}
      exitVideoRef.current.srcObject = null;
    }
    setExitActive(false);
  };

  // Switch exit camera device dynamically
  const handleSwitchExitCamera = async (newDeviceId: string) => {
    setExitDeviceId(newDeviceId);
    if (exitActive) {
      stopExitCamera();
      setTimeout(() => {
        startExitCamera(newDeviceId);
      }, 300);
    }
  };

  // Start both cameras simultaneously
  const startBothCameras = async () => {
    await startEntranceCamera();
    await startExitCamera();
  };

  // Stop both cameras simultaneously
  const stopBothCameras = () => {
    stopEntranceCamera();
    stopExitCamera();
  };

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      stopEntranceCamera();
      stopExitCamera();
    };
  }, []);

  // Handle manual submit (USB Gun or typed input)
  const handleManualScanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    triggerScan(token, type, manualGateCode, manualDirection);
  };

  return (
    <DashboardLayout
      title="Live Dual-Camera Gate Scanner & Turnstile Console"
      subtitle="Connected cameras for Entrance and Exit barriers with automatic barcode recognition and relay control"
    >
      <div className="space-y-5">
        {/* Top Control Bar: View Mode Switcher & Global Camera Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          {/* View Mode Tabs */}
          <div className="flex rounded-xl bg-slate-100 p-1">
            <button
              onClick={() => setViewMode('dual')}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
                viewMode === 'dual'
                  ? 'bg-white text-pup-800 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="h-4 w-4" />
              <span>Dual Gate (Entrance & Exit)</span>
            </button>
            <button
              onClick={() => setViewMode('entrance')}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
                viewMode === 'entrance'
                  ? 'bg-white text-emerald-800 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LogIn className="h-4 w-4 text-emerald-600" />
              <span>Entrance Only</span>
            </button>
            <button
              onClick={() => setViewMode('exit')}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
                viewMode === 'exit'
                  ? 'bg-white text-rose-800 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LogOut className="h-4 w-4 text-rose-600" />
              <span>Exit Only</span>
            </button>
          </div>

          {/* Quick Dual Camera Action Buttons */}
          <div className="flex items-center gap-2">
            {!entranceActive && !exitActive ? (
              <button
                onClick={startBothCameras}
                className="flex items-center gap-2 rounded-xl bg-pup-700 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-pup-800 transition cursor-pointer"
              >
                <Camera className="h-4 w-4" />
                <span>Start Both Cameras</span>
              </button>
            ) : (
              <button
                onClick={stopBothCameras}
                className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 transition cursor-pointer"
              >
                <CameraOff className="h-4 w-4" />
                <span>Stop All Cameras</span>
              </button>
            )}

            <button
              onClick={refreshDeviceList}
              title="Refresh camera device list"
              className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 transition"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Main Grid: Cameras on Left / Top, Scan Verification Result on Right */}
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Left Column: Camera Feeds */}
          <div className="lg:col-span-7 space-y-5">
            {/* ENTRANCE CAMERA CARD (GATE-01) */}
            {(viewMode === 'dual' || viewMode === 'entrance') && (
              <div className="rounded-3xl border border-emerald-200 bg-white p-5 shadow-sm space-y-4">
                {/* Header & Camera Device Selector */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
                      <LogIn className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <span>Entrance Gate Barrier</span>
                        <span className="rounded bg-emerald-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-emerald-800">
                          GATE-01 • ENTRY
                        </span>
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        Inbound turnstile camera for arriving students and faculty.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                        entranceActive
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      <span
                        className={`h-2 w-2 rounded-full ${
                          entranceActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                        }`}
                      />
                      {entranceActive ? 'ENTRANCE LIVE' : 'STANDBY'}
                    </span>
                  </div>
                </div>

                {/* Camera Selector Dropdown */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <label className="text-xs font-bold uppercase text-slate-600 shrink-0">
                    Entrance Camera Device:
                  </label>
                  <select
                    value={entranceDeviceId}
                    onChange={(e) => handleSwitchEntranceCamera(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-emerald-600"
                  >
                    {videoDevices.length > 0 ? (
                      videoDevices.map((d, idx) => (
                        <option key={d.deviceId || idx} value={d.deviceId}>
                          📷 {d.label || `Camera ${idx + 1} (${d.deviceId.slice(0, 8)})`}
                        </option>
                      ))
                    ) : (
                      <option value="">Default System Webcam</option>
                    )}
                  </select>
                </div>

                {/* Entrance Video Screen (CLEAN: NO ALIGNMENT BOX, NO LASER) */}
                <div className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl bg-slate-950 flex items-center justify-center text-white">
                  <video
                    ref={entranceVideoRef}
                    playsInline
                    muted
                    className={`h-full w-full object-cover ${entranceActive ? 'block' : 'hidden'}`}
                  />

                  {/* Corner indicator only - No box blocking the camera */}
                  {entranceActive && (
                    <div className="pointer-events-none absolute top-3 right-3 flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur-md border border-white/10">
                        <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span>GATE-01 Entry Active</span>
                      </span>
                    </div>
                  )}

                  {/* Standby Placeholder when Entrance Camera is Off */}
                  {!entranceActive && (
                    <div className="p-6 text-center space-y-2.5">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 ring-4 ring-white/5">
                        <LogIn className="h-6 w-6 text-emerald-400" />
                      </div>
                      <div className="text-sm font-black tracking-wide">
                        ENTRANCE BARRIER CAMERA TERMINAL
                      </div>
                      <p className="text-xs text-slate-400 max-w-xs mx-auto">
                        Click the button below to activate the Entrance Camera (GATE-01).
                      </p>
                      <button
                        onClick={() => startEntranceCamera()}
                        type="button"
                        className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-emerald-800 transition cursor-pointer"
                      >
                        <Camera className="h-4 w-4" />
                        Start Entrance Camera
                      </button>
                    </div>
                  )}
                </div>

                {/* Entrance Controls Toggle */}
                <div className="flex items-center justify-between pt-1">
                  {entranceActive ? (
                    <button
                      onClick={stopEntranceCamera}
                      className="flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 transition cursor-pointer"
                    >
                      <CameraOff className="h-4 w-4" />
                      Stop Entrance Camera
                    </button>
                  ) : (
                    <button
                      onClick={() => startEntranceCamera()}
                      className="flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-900 hover:bg-emerald-100 transition cursor-pointer"
                    >
                      <Camera className="h-4 w-4" />
                      Start Entrance Camera
                    </button>
                  )}

                  {entranceLastToken && (
                    <span className="font-mono text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                      Last Scan: {entranceLastToken}
                    </span>
                  )}
                </div>

                {entranceError && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 font-semibold">
                    {entranceError}
                  </div>
                )}
              </div>
            )}

            {/* EXIT CAMERA CARD (GATE-02) */}
            {(viewMode === 'dual' || viewMode === 'exit') && (
              <div className="rounded-3xl border border-rose-200 bg-white p-5 shadow-sm space-y-4">
                {/* Header & Camera Device Selector */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-100 text-rose-800">
                      <LogOut className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <span>Exit Gate Barrier</span>
                        <span className="rounded bg-rose-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-rose-800">
                          GATE-02 • EXIT
                        </span>
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        Outbound turnstile camera for departing students and faculty.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                        exitActive ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      <span
                        className={`h-2 w-2 rounded-full ${
                          exitActive ? 'bg-rose-500 animate-pulse' : 'bg-slate-400'
                        }`}
                      />
                      {exitActive ? 'EXIT LIVE' : 'STANDBY'}
                    </span>
                  </div>
                </div>

                {/* Camera Selector Dropdown */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <label className="text-xs font-bold uppercase text-slate-600 shrink-0">
                    Exit Camera Device:
                  </label>
                  <select
                    value={exitDeviceId}
                    onChange={(e) => handleSwitchExitCamera(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-rose-600"
                  >
                    {videoDevices.length > 0 ? (
                      videoDevices.map((d, idx) => (
                        <option key={d.deviceId || idx} value={d.deviceId}>
                          📷 {d.label || `Camera ${idx + 1} (${d.deviceId.slice(0, 8)})`}
                        </option>
                      ))
                    ) : (
                      <option value="">Default System Webcam</option>
                    )}
                  </select>
                </div>

                {/* Exit Video Screen (CLEAN: NO ALIGNMENT BOX, NO LASER) */}
                <div className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl bg-slate-950 flex items-center justify-center text-white">
                  <video
                    ref={exitVideoRef}
                    playsInline
                    muted
                    className={`h-full w-full object-cover ${exitActive ? 'block' : 'hidden'}`}
                  />

                  {/* Corner indicator only - No box blocking the camera */}
                  {exitActive && (
                    <div className="pointer-events-none absolute top-3 right-3 flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur-md border border-white/10">
                        <span className="h-2 w-2 rounded-full bg-rose-400 animate-pulse" />
                        <span>GATE-02 Exit Active</span>
                      </span>
                    </div>
                  )}

                  {/* Standby Placeholder when Exit Camera is Off */}
                  {!exitActive && (
                    <div className="p-6 text-center space-y-2.5">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 ring-4 ring-white/5">
                        <LogOut className="h-6 w-6 text-rose-400" />
                      </div>
                      <div className="text-sm font-black tracking-wide">
                        EXIT BARRIER CAMERA TERMINAL
                      </div>
                      <p className="text-xs text-slate-400 max-w-xs mx-auto">
                        Click the button below to activate the Exit Camera (GATE-02).
                      </p>
                      <button
                        onClick={() => startExitCamera()}
                        type="button"
                        className="inline-flex items-center gap-2 rounded-xl bg-rose-700 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-rose-800 transition cursor-pointer"
                      >
                        <Camera className="h-4 w-4" />
                        Start Exit Camera
                      </button>
                    </div>
                  )}
                </div>

                {/* Exit Controls Toggle */}
                <div className="flex items-center justify-between pt-1">
                  {exitActive ? (
                    <button
                      onClick={stopExitCamera}
                      className="flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 transition cursor-pointer"
                    >
                      <CameraOff className="h-4 w-4" />
                      Stop Exit Camera
                    </button>
                  ) : (
                    <button
                      onClick={() => startExitCamera()}
                      className="flex items-center gap-1.5 rounded-xl border border-rose-300 bg-rose-50 px-3.5 py-2 text-xs font-bold text-rose-900 hover:bg-rose-100 transition cursor-pointer"
                    >
                      <Camera className="h-4 w-4" />
                      Start Exit Camera
                    </button>
                  )}

                  {exitLastToken && (
                    <span className="font-mono text-xs font-semibold text-rose-800 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200">
                      Last Scan: {exitLastToken}
                    </span>
                  )}
                </div>

                {exitError && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 font-semibold">
                    {exitError}
                  </div>
                )}
              </div>
            )}

            {/* Handheld Barcode Gun / Manual Input Section */}
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <label className="block text-xs font-bold uppercase text-slate-700 flex items-center gap-2">
                  <Barcode className="h-4 w-4 text-pup-700" />
                  <span>Manual Input or Handheld Barcode Scanner Gun</span>
                </label>
                <div className="flex rounded-lg bg-slate-100 p-0.5 text-[11px] font-bold">
                  <button
                    type="button"
                    onClick={() => {
                      setManualDirection('entry');
                      setManualGateCode('GATE-01');
                    }}
                    className={`px-2.5 py-1 rounded-md transition ${
                      manualDirection === 'entry'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600'
                    }`}
                  >
                    Entrance (Inbound)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setManualDirection('exit');
                      setManualGateCode('GATE-02');
                    }}
                    className={`px-2.5 py-1 rounded-md transition ${
                      manualDirection === 'exit'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'text-slate-600'
                    }`}
                  >
                    Exit (Outbound)
                  </button>
                </div>
              </div>

              <form onSubmit={handleManualScanSubmit} className="flex gap-2">
                <input
                  type="text"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder={`Scan barcode or enter ID for ${
                    manualDirection === 'entry' ? 'Entrance' : 'Exit'
                  } (e.g. 2023-00112-BT-0)...`}
                  className="flex-1 rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs font-mono font-bold uppercase outline-none focus:border-pup-700"
                />
                <button
                  type="submit"
                  disabled={busy || !token.trim()}
                  className="rounded-xl bg-pup-700 px-5 py-2.5 text-xs font-bold text-white hover:bg-pup-800 transition disabled:opacity-50 cursor-pointer"
                >
                  {busy ? 'Scanning...' : 'Verify'}
                </button>
              </form>
            </div>
          </div>

          {/* Right Column: Gate Authorization Result & Visual Pass */}
          <div className="lg:col-span-5 space-y-4">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-4 sticky top-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  <span>Gate Authentication Result</span>
                </h3>
                {result && (
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-black uppercase ${
                      result.allowed ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {result.action}
                  </span>
                )}
              </div>

              {/* Gate Barrier Status Banner */}
              {result ? (
                <div
                  className={`rounded-2xl p-4 text-center transition ${
                    result.allowed
                      ? 'border-2 border-emerald-500 bg-emerald-50 text-emerald-950'
                      : 'border-2 border-rose-500 bg-rose-50 text-rose-950'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2 text-xl font-black">
                    {result.allowed ? (
                      <>
                        <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                        <span>
                          {lastScanGateInfo.direction === 'entry' ? 'ENTRANCE' : 'EXIT'} BARRIER
                          OPEN
                        </span>
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
                      ? `Authorized ${
                          lastScanGateInfo.direction === 'entry' ? 'entry' : 'exit'
                        } through ${lastScanGateInfo.gate}.`
                      : `Reason: ${
                          result.reason || 'Not authorized or not found in database.'
                        }`}
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-xs text-slate-400">
                  No barcode scanned yet. Present ID card to Entrance or Exit camera for verification.
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
                        {result.student.studentNumber} •{' '}
                        {result.student.course || result.student.personType?.toUpperCase()}
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
                      <div className="text-[11px] text-slate-500 capitalize">
                        {result.vehicle.type}
                      </div>
                    </div>
                  </div>
                  <span className="font-mono font-black text-slate-900 text-sm bg-white px-2 py-1 rounded border border-slate-300">
                    {result.vehicle.plateNumber}
                  </span>
                </div>
              )}

              {/* Summary of Active Gates */}
              <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3.5 space-y-2 text-xs">
                <div className="font-bold text-slate-700 flex items-center justify-between">
                  <span>Hardware Barrier Status:</span>
                  <span className="text-[10px] text-emerald-700 font-mono">ALL SYSTEMS READY</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200/60">
                  <span>Entrance: GATE-01</span>
                  <span className="font-semibold text-emerald-800">
                    {entranceActive ? '🟢 Live Streaming' : '⚪ Standby'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>Exit: GATE-02</span>
                  <span className="font-semibold text-rose-800">
                    {exitActive ? '🟢 Live Streaming' : '⚪ Standby'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
