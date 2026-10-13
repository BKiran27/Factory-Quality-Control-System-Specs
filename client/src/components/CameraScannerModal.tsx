import React, { useEffect, useRef, useState } from 'react';
import { Camera, X, RefreshCw, AlertCircle, Sparkles } from 'lucide-react';
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
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const elementId = 'zapuza-camera-viewport';

  useEffect(() => {
    let html5QrCode: Html5Qrcode | null = null;

    const startScanner = async () => {
      try {
        html5QrCode = new Html5Qrcode(elementId, {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.QR_CODE,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.EAN_13
          ],
          verbose: false
        });
        scannerRef.current = html5QrCode;

        await html5QrCode.start(
          { facingMode: 'environment' },
          {
            fps: 15,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0
          },
          (decodedText) => {
            sounds.playPassChime();
            html5QrCode?.stop().catch(() => {});
            onScanSuccess(decodedText);
          },
          () => {
            // Frame scan failure (ignore until found)
          }
        );
        setCameraActive(true);
      } catch (err: unknown) {
        console.warn('Camera stream initialisation:', err);
        setCameraError(
          'Live camera unavailable (permission denied or no camera device found). Use the simulated barcode scanner below.'
        );
      }
    };

    startScanner();

    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, [onScanSuccess]);

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="bg-slate-900 border-2 border-amber-500 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4 text-white">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <Camera className="text-amber-400" size={20} />
            <h3 className="font-bold text-sm tracking-wide">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white font-bold p-1"
          >
            <X size={18} />
          </button>
        </div>

        {/* Live Camera Viewport Box */}
        <div className="relative aspect-square bg-slate-950 rounded-xl overflow-hidden border-2 border-slate-700 flex items-center justify-center">
          <div id={elementId} className="w-full h-full" />

          {/* Scanner Overlay Graphics */}
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
            <div className="w-60 h-60 border-2 border-amber-400/80 rounded-lg relative">
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
        </div>

        {cameraError && (
          <div className="p-2.5 bg-amber-950/40 border border-amber-600/50 rounded-lg text-xs text-amber-200 flex items-start space-x-2">
            <AlertCircle size={15} className="text-amber-400 shrink-0 mt-0.5" />
            <span>{cameraError}</span>
          </div>
        )}

        {/* Quick Simulated Plate Scanners */}
        {quickOptions.length > 0 && (
          <div className="space-y-2 pt-1 border-t border-slate-800">
            <div className="text-[11px] font-mono text-slate-400 flex items-center space-x-1">
              <Sparkles size={12} className="text-amber-400" />
              <span>Direct Hardware Tap / Test Simulators:</span>
            </div>
            <div className="grid grid-cols-1 gap-1.5 max-h-36 overflow-y-auto">
              {quickOptions.map((opt) => (
                <button
                  key={opt.code}
                  onClick={() => {
                    sounds.playPassChime();
                    onScanSuccess(opt.code);
                  }}
                  className="p-2 bg-slate-800/80 hover:bg-slate-750 border border-slate-700 hover:border-amber-400 rounded-lg text-left text-xs font-mono flex items-center justify-between cursor-pointer"
                >
                  <div>
                    <strong className="text-slate-100">{opt.label}</strong>
                    <div className="text-[10px] text-slate-400">{opt.sub}</div>
                  </div>
                  <span className="text-[11px] text-amber-400 font-bold bg-slate-900 px-2 py-0.5 rounded">
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
