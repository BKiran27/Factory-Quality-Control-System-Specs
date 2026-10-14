import React, { useEffect, useRef, useState } from 'react';
import { Camera, X, RefreshCw, AlertCircle, Sparkles, Upload, SwitchCamera, CheckCircle2 } from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { sounds } from '../utils/audio';

interface CameraScannerModalProps {
  title: string;
  expectedType: 'station' | 'traveler';
  onScanSuccess: (decodedText: string) => void;
  onClose: () => void;
  quickOptions?: { label: string; code: string; sub: string }[];
}

export const CameraScannerModal: React.FC<CameraScannerModalProps> = ({
  title,
  expectedType,
  onScanSuccess,
  onClose,
  quickOptions = []
}) => {
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [availableCameras, setAvailableCameras] = useState<{ id: string; label: string }[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [isInitializing, setIsInitializing] = useState<boolean>(true);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isScanningRef = useRef<boolean>(false);
  const isStoppingRef = useRef<boolean>(false);
  const containerId = useRef(`qr-reader-${Math.random().toString(36).substring(2, 9)}`).current;
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Initialize and start scanner
  const startCamera = async (targetCamId?: string) => {
    setIsInitializing(true);
    setCameraError(null);

    // Stop existing scanner safely if running
    if (scannerRef.current && isScanningRef.current && !isStoppingRef.current) {
      try {
        isStoppingRef.current = true;
        await scannerRef.current.stop();
      } catch (err) {
        console.warn('Silent stop error during restart:', err);
      } finally {
        isScanningRef.current = false;
        isStoppingRef.current = false;
      }
    }

    try {
      // 1. Enumerate available cameras
      let devices: { id: string; label: string }[] = [];
      try {
        const rawDevices = await Html5Qrcode.getCameras();
        if (rawDevices && rawDevices.length > 0) {
          devices = rawDevices.map((d, index) => ({
            id: d.id,
            label: d.label || `Camera ${index + 1}`
          }));
          setAvailableCameras(devices);
        }
      } catch (enumErr) {
        console.warn('Camera enumeration error (trying facingMode fallback):', enumErr);
      }

      // Check if container exists in DOM
      const elem = document.getElementById(containerId);
      if (!elem) {
        throw new Error('Camera viewport container not ready');
      }

      // 2. Create Html5Qrcode instance
      const scanner = new Html5Qrcode(containerId, {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.EAN_13
        ],
        verbose: false
      });
      scannerRef.current = scanner;

      const onDecoded = (decodedText: string) => {
        sounds.playPassChime();
        if (isScanningRef.current && !isStoppingRef.current) {
          isStoppingRef.current = true;
          scanner
            .stop()
            .then(() => {
              isScanningRef.current = false;
              isStoppingRef.current = false;
              onScanSuccess(decodedText);
            })
            .catch(() => {
              isScanningRef.current = false;
              isStoppingRef.current = false;
              onScanSuccess(decodedText);
            });
        } else {
          onScanSuccess(decodedText);
        }
      };

      const qrConfig = {
        fps: 15,
        qrbox: { width: 240, height: 240 },
        aspectRatio: 1.0
      };

      // 3. Select camera source: Back camera preference, or selected ID, or facingMode environment
      let cameraConfig: any = { facingMode: 'environment' };

      if (targetCamId) {
        cameraConfig = targetCamId;
      } else if (devices.length > 0) {
        // Find back camera if available
        const backCam = devices.find(d => /back|rear|environment|main/i.test(d.label));
        const chosen = backCam || devices[0];
        cameraConfig = chosen.id;
        setSelectedCameraId(chosen.id);
      }

      // Attempt start with chosen camera
      try {
        await scanner.start(cameraConfig, qrConfig, onDecoded, () => {});
        isScanningRef.current = true;
        setCameraActive(true);
        setIsInitializing(false);
      } catch (firstStartErr: any) {
        console.warn('Initial camera start failed, trying fallback mode:', firstStartErr);
        // Fallback: Try generic facingMode user or first camera ID
        try {
          const fallbackConfig = devices.length > 0 ? devices[0].id : { facingMode: 'user' };
          await scanner.start(fallbackConfig, qrConfig, onDecoded, () => {});
          isScanningRef.current = true;
          setCameraActive(true);
          setIsInitializing(false);
        } catch (fallbackErr: any) {
          throw fallbackErr;
        }
      }
    } catch (err: any) {
      console.warn('Camera failed to start:', err);
      setCameraActive(false);
      setIsInitializing(false);

      const errName = err?.name || '';
      if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
        setCameraError('Camera access permission was denied. Please allow camera permissions in your browser or use the quick hardware tap buttons below.');
      } else if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
        setCameraError('No physical camera device was detected. Use the quick test simulator or upload a photo of the barcode.');
      } else if (errName === 'NotReadableError' || errName === 'TrackStartError') {
        setCameraError('Camera is already in use by another application or browser tab.');
      } else {
        setCameraError(
          'Live camera stream unavailable on this device. You can upload an image or click any registered hardware barcode below.'
        );
      }
    }
  };

  useEffect(() => {
    // Small timeout to allow DOM element to render
    const timer = setTimeout(() => {
      startCamera();
    }, 150);

    return () => {
      clearTimeout(timer);
      if (scannerRef.current && isScanningRef.current && !isStoppingRef.current) {
        isStoppingRef.current = true;
        scannerRef.current
          .stop()
          .catch(() => {})
          .finally(() => {
            isScanningRef.current = false;
            isStoppingRef.current = false;
          });
      }
    };
  }, []);

  // Handle camera switch
  const handleSwitchCamera = (newCamId: string) => {
    setSelectedCameraId(newCamId);
    startCamera(newCamId);
  };

  // Handle image file scan
  const handleFileScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    sounds.playTactileClick();
    try {
      const scanner = scannerRef.current || new Html5Qrcode(containerId);
      const decoded = await scanner.scanFile(file, true);
      sounds.playPassChime();
      onScanSuccess(decoded);
    } catch (err) {
      alert('Could not detect a clear barcode/QR code in the selected image. Please try another image or tap the simulator below.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="bg-slate-900 border-2 border-amber-500 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4 text-white max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <Camera className="text-amber-400" size={20} />
            <h3 className="font-bold text-sm tracking-wide">{title}</h3>
          </div>
          <button
            onClick={() => {
              sounds.playTactileClick();
              onClose();
            }}
            className="text-slate-400 hover:text-white font-bold p-1 rounded hover:bg-slate-800 cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Camera Selector Toolbar (if multiple cameras detected) */}
        {availableCameras.length > 1 && (
          <div className="flex items-center justify-between bg-slate-950 p-2 rounded-lg border border-slate-800 text-xs font-mono">
            <span className="flex items-center space-x-1 text-slate-400">
              <SwitchCamera size={14} className="text-amber-400" />
              <span>Camera:</span>
            </span>
            <select
              value={selectedCameraId}
              onChange={(e) => handleSwitchCamera(e.target.value)}
              className="bg-slate-900 text-amber-300 font-bold px-2 py-0.5 rounded border border-slate-700 text-xs focus:outline-none"
            >
              {availableCameras.map((cam) => (
                <option key={cam.id} value={cam.id}>
                  {cam.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Live Camera Viewport Box */}
        <div className="relative aspect-square bg-slate-950 rounded-xl overflow-hidden border-2 border-slate-700 flex items-center justify-center">
          <div id={containerId} className="w-full h-full" />

          {/* Loading state indicator */}
          {isInitializing && (
            <div className="absolute inset-0 bg-slate-950/80 flex flex-col items-center justify-center space-y-2 text-slate-300 text-xs font-mono">
              <RefreshCw size={24} className="text-amber-400 animate-spin" />
              <span>Initializing camera feed...</span>
            </div>
          )}

          {/* Scanner Overlay Graphics */}
          {cameraActive && !isInitializing && (
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
              <div className="w-56 h-56 border-2 border-amber-400/80 rounded-lg relative">
                <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-amber-400" />
                <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-amber-400" />
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-amber-400" />
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-amber-400" />
                <div className="w-full h-0.5 bg-rose-500 absolute top-1/2 -translate-y-1/2 animate-pulse shadow-lg shadow-rose-500/50" />
              </div>
              <span className="mt-3 text-[11px] font-mono font-bold text-amber-300 bg-slate-900/90 px-2 py-0.5 rounded border border-amber-500/30">
                Align {expectedType === 'station' ? 'Machine QR Plate' : 'Traveler Barcode'} within frame
              </span>
            </div>
          )}
        </div>

        {/* Error / Fallback Banner */}
        {cameraError && (
          <div className="p-3 bg-amber-950/50 border border-amber-600/60 rounded-xl text-xs text-amber-200 space-y-2">
            <div className="flex items-start space-x-2">
              <AlertCircle size={16} className="text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="font-bold text-amber-100">Camera Notice:</div>
                <div className="text-[11px] leading-relaxed text-slate-300">{cameraError}</div>
              </div>
            </div>
            <div className="flex items-center space-x-2 pt-1 border-t border-amber-800/40">
              <button
                onClick={() => startCamera(selectedCameraId)}
                className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded text-[11px] flex items-center space-x-1 cursor-pointer"
              >
                <RefreshCw size={12} />
                <span>Retry Camera</span>
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-600 rounded text-[11px] flex items-center space-x-1 cursor-pointer"
              >
                <Upload size={12} />
                <span>Upload QR Image</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileScan}
                className="hidden"
              />
            </div>
          </div>
        )}

        {/* Direct Hardware Tap / Test Simulators */}
        {quickOptions.length > 0 && (
          <div className="space-y-2 pt-1 border-t border-slate-800">
            <div className="text-[11px] font-mono text-slate-400 flex items-center justify-between">
              <div className="flex items-center space-x-1">
                <Sparkles size={12} className="text-amber-400" />
                <span>Quick Scan Simulator / Hardware Tap:</span>
              </div>
              <span className="text-[10px] text-amber-400/80">Click any code to scan</span>
            </div>
            <div className="grid grid-cols-1 gap-1.5 max-h-36 overflow-y-auto pr-1">
              {quickOptions.map((opt) => (
                <button
                  key={opt.code}
                  onClick={() => {
                    sounds.playPassChime();
                    onScanSuccess(opt.code);
                  }}
                  className="p-2 bg-slate-800/80 hover:bg-slate-750 border border-slate-700 hover:border-amber-400 rounded-lg text-left text-xs font-mono flex items-center justify-between cursor-pointer transition-all"
                >
                  <div>
                    <strong className="text-slate-100">{opt.label}</strong>
                    <div className="text-[10px] text-slate-400">{opt.sub}</div>
                  </div>
                  <span className="text-[11px] text-amber-400 font-bold bg-slate-900 px-2 py-0.5 rounded border border-amber-500/20">
                    {opt.code}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
