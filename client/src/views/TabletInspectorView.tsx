import React, { useEffect, useState, useRef } from 'react';
import {
  Tablet,
  QrCode,
  Scan,
  Camera,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Lock,
  Wrench,
  ShieldAlert,
  Bell,
  Image as ImageIcon,
  Check,
  Radio,
  Wifi,
  Sparkles,
  Zap,
  CreditCard,
  UserCheck,
  Upload,
  Trash2,
  RefreshCw
} from 'lucide-react';
import {
  JobTraveler,
  Workstation,
  PdiTemplate,
  Gauge,
  BlueprintPin,
  MeasurementRecord
} from '../types';
import { api } from '../utils/api';
import { sounds } from '../utils/audio';
import { CameraScannerModal } from '../components/CameraScannerModal';

interface TabletInspectorViewProps {
  isOffline: boolean;
  gloveMode: boolean;
  onRefreshSyncCount: () => void;
}

export const TabletInspectorView: React.FC<TabletInspectorViewProps> = ({
  isOffline,
  gloveMode,
  onRefreshSyncCount
}) => {
  // Master lists
  const [workstations, setWorkstations] = useState<Workstation[]>([]);
  const [travelers, setTravelers] = useState<JobTraveler[]>([]);
  const [gauges, setGauges] = useState<Gauge[]>([]);
  const [template, setTemplate] = useState<PdiTemplate | null>(null);

  // Physical Presence Anti-Cheat QR Scanning state (Step 1: Station QR, Step 2: Traveler Barcode)
  const [scannedStation, setScannedStation] = useState<Workstation | null>(null);
  const [scannedTraveler, setScannedTraveler] = useState<JobTraveler | null>(null);
  const [isScanningMode, setIsScanningMode] = useState<boolean>(true);

  // Live Camera Scanner Modal state
  const [activeCameraScan, setActiveCameraScan] = useState<'station' | 'traveler' | null>(null);

  // Bluetooth Low Energy (BLE) Wireless Gauge state
  const [bleConnected, setBleConnected] = useState<boolean>(false);
  const [bleDeviceName, setBleDeviceName] = useState<string>('Mitutoyo U-WAVE Bluetooth Caliper');

  // RFID / NFC Badge Tap Login state
  const [inspectorBadge, setInspectorBadge] = useState<string>('QA-INSP-JOHN (John Reynolds)');
  const [badgeTapSuccess, setBadgeTapSuccess] = useState<boolean>(false);

  // Tool validation
  const [selectedGaugeId, setSelectedGaugeId] = useState<string>('VC-104');
  const [gaugeError, setGaugeError] = useState<string | null>(null);

  // Active Step-by-Step Locked Checklist
  const [currentPinIndex, setCurrentPinIndex] = useState<number>(0);
  const [measurements, setMeasurements] = useState<{ [pinId: number]: MeasurementRecord }>({});
  const [activeInputVal, setActiveInputVal] = useState<string>('');

  // Mandatory Defect Photo Capture Modal (Requires 2 photos when out-of-spec)
  const [photoCapturePin, setPhotoCapturePin] = useState<BlueprintPin | null>(null);
  const [capturedPhotos, setCapturedPhotos] = useState<string[]>([]);
  const [aiVisionAnalysis, setAiVisionAnalysis] = useState<{
    classification: string;
    confidence: string;
    severity: string;
    recommendation: string;
  } | null>(null);

  // Defect Photo Live Camera & File Stream State
  const [photoCameraActive, setPhotoCameraActive] = useState<boolean>(false);
  const [photoCameraError, setPhotoCameraError] = useState<string | null>(null);
  const photoVideoRef = useRef<HTMLVideoElement | null>(null);
  const photoStreamRef = useRef<MediaStream | null>(null);
  const photoFileInputRef = useRef<HTMLInputElement | null>(null);

  // Hourly Inspection Alert simulation
  const [showHourlyAlert, setShowHourlyAlert] = useState<boolean>(false);
  const [hourlyMinutesLeft] = useState<number>(15);

  // Submit status
  const [submissionResult, setSubmissionResult] = useState<{ success: boolean; message: string; alert?: string } | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        const [infra, travs, tmpls] = await Promise.all([
          api.getInfrastructure(),
          api.getJobTravelers(),
          api.getTemplates()
        ]);
        setWorkstations(infra.workstations || []);
        setTravelers(travs || []);
        setGauges(infra.gauges || []);
        if (tmpls && tmpls.length > 0) {
          setTemplate(tmpls[0]);
        }
      } catch (err) {
        console.error(err);
      }
    };
    init();
  }, []);

  // Gauge Calibration Check
  const handleSelectGauge = async (gaugeId: string) => {
    setSelectedGaugeId(gaugeId);
    sounds.playTactileClick();
    const res = await api.validateGauge(gaugeId);
    if (!res.valid) {
      setGaugeError(res.error || 'Tool Calibration Expired');
      sounds.playFailBuzzer();
    } else {
      setGaugeError(null);
      sounds.playPassChime();
    }
  };

  // Bluetooth Gauge Auto-Transmit
  const handleConnectBle = () => {
    sounds.playTactileClick();
    setBleConnected(true);
    sounds.playPassChime();
  };

  const handleBleDataTransmit = () => {
    if (!currentPin) return;
    sounds.playTactileClick();
    // Simulate streaming the exact micron reading from the wireless caliper
    const target = currentPin.nominal || 45.000;
    const reading = (target + (Math.random() * 0.02 - 0.005)).toFixed(3);
    setActiveInputVal(reading);
    sounds.playPassChime();
  };

  // NFC Badge Tap Simulation
  const handleNfcBadgeTap = () => {
    sounds.playTactileClick();
    const badges = [
      'QA-INSP-JOHN (John Reynolds - Level 3)',
      'QA-LEAD-CARTER (David Carter - Lead Metrologist)',
      'QA-SPEC-ANANYA (Dr. Ananya Roy - Materials Specialist)'
    ];
    const nextBadge = badges[(badges.indexOf(inspectorBadge) + 1) % badges.length];
    setInspectorBadge(nextBadge);
    setBadgeTapSuccess(true);
    sounds.playPassChime();
    setTimeout(() => setBadgeTapSuccess(false), 3000);
  };

  // QR Scan Handlers
  const handleScanStation = (station: Workstation) => {
    sounds.playTactileClick();
    if (station.pmStatus === 'Overdue') {
      sounds.playFailBuzzer();
      alert(`MACHINE LOCKOUT: ${station.name} has overdue PM checks. Complete PM sign-off on dashboard first!`);
      return;
    }
    setScannedStation(station);
    sounds.playPassChime();
  };

  const handleScanTraveler = (traveler: JobTraveler) => {
    sounds.playTactileClick();
    if (!scannedStation) {
      alert('Must scan workstation QR plate FIRST to verify physical station presence!');
      return;
    }
    setScannedTraveler(traveler);
    setIsScanningMode(false);
    setCurrentPinIndex(0);
    setMeasurements({});
    setActiveInputVal('');
    sounds.playPassChime();
  };

  // Measurement Entry Logic
  const currentPin = template?.pins[currentPinIndex];

  const evaluatePinValue = (pin: BlueprintPin, valStr: string) => {
    if (pin.type === 'visual') {
      return valStr.toLowerCase() === 'pass';
    }
    const val = Number(valStr);
    if (isNaN(val)) return false;

    if (pin.type === 'max') {
      return val <= (pin.maxLimit ?? 0.8);
    }
    // Bilateral tolerance
    const min = (pin.nominal ?? 0) + (pin.lower ?? 0);
    const max = (pin.nominal ?? 0) + (pin.upper ?? 0);
    return val >= min && val <= max;
  };

  const handleEnterValue = (valStr: string) => {
    if (!currentPin) return;
    setActiveInputVal(valStr);

    const passed = evaluatePinValue(currentPin, valStr);
    if (valStr.trim() !== '') {
      if (passed) {
        sounds.playPassChime();
      } else {
        sounds.playFailBuzzer();
      }
    }
  };

  const handleConfirmDimension = () => {
    if (!currentPin || gaugeError) return;

    sounds.playTactileClick();
    const passed = evaluatePinValue(currentPin, activeInputVal);

    if (!passed) {
      sounds.playFailBuzzer();
      setPhotoCapturePin(currentPin);
      setCapturedPhotos([]);
      setAiVisionAnalysis(null);
      return;
    }

    const record: MeasurementRecord = {
      pinId: currentPin.pinId,
      label: currentPin.label,
      nominal: currentPin.nominal,
      upper: currentPin.upper,
      lower: currentPin.lower,
      maxLimit: currentPin.maxLimit,
      actual: activeInputVal,
      unit: currentPin.unit,
      isCtq: currentPin.isCtq,
      passed: true,
      photos: []
    };

    setMeasurements(prev => ({ ...prev, [currentPin.pinId]: record }));
    advanceToNextPin();
  };

  const startDefectCamera = async () => {
    setPhotoCameraError(null);
    setPhotoCameraActive(true);
    sounds.playTactileClick();
    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }
      photoStreamRef.current = stream;
      if (photoVideoRef.current) {
        photoVideoRef.current.srcObject = stream;
        photoVideoRef.current.play();
      }
    } catch (err: any) {
      console.warn('Defect camera start error:', err);
      setPhotoCameraActive(false);
      setPhotoCameraError('Unable to open live camera. Check permissions or upload/select a photo.');
    }
  };

  const stopDefectCamera = () => {
    if (photoStreamRef.current) {
      photoStreamRef.current.getTracks().forEach(t => t.stop());
      photoStreamRef.current = null;
    }
    setPhotoCameraActive(false);
  };

  const snapDefectPhoto = () => {
    if (!photoVideoRef.current) return;
    const video = photoVideoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'rgba(0,0,0,0.65)';
      ctx.fillRect(10, canvas.height - 35, canvas.width - 20, 25);
      ctx.fillStyle = '#f59e0b';
      ctx.font = 'bold 12px monospace';
      ctx.fillText(`DEFECT AUDIT | PIN #${photoCapturePin?.pinId || ''} | ${new Date().toISOString()}`, 20, canvas.height - 18);
      
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      sounds.playPassChime();
      addCapturedPhoto(dataUrl);
      stopDefectCamera();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      if (dataUrl) {
        sounds.playPassChime();
        addCapturedPhoto(dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSampleDefectPhoto = () => {
    sounds.playTactileClick();
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 260;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, 400, 260);

      // Shaft body
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.roundRect(40, 50, 320, 160, 10);
      ctx.fill();
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Flange chatter marks
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      for (let x = 110; x <= 270; x += 14) {
        ctx.beginPath();
        ctx.moveTo(x, 60);
        ctx.lineTo(x + 6, 200);
        ctx.stroke();
      }

      // Defect bounding callout
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.strokeRect(95, 80, 200, 105);

      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 11px monospace';
      ctx.fillText('NON-CONFORMANCE DETECTED', 105, 102);
      ctx.fillStyle = '#f8fafc';
      ctx.font = '10px monospace';
      ctx.fillText(`Pin #${photoCapturePin?.pinId}: Chatter Marks`, 105, 120);
      ctx.fillText(`Actual: ${activeInputVal} mm`, 105, 138);
      ctx.fillText(`Time: ${new Date().toLocaleTimeString()}`, 105, 156);
    }
    const sampleUrl = canvas.toDataURL('image/jpeg', 0.85);
    addCapturedPhoto(sampleUrl);
  };

  const addCapturedPhoto = (dataUrl: string) => {
    const newPhotos = [...capturedPhotos, dataUrl];
    setCapturedPhotos(newPhotos);

    if (newPhotos.length >= 2) {
      sounds.playPassChime();
      setAiVisionAnalysis({
        classification: 'Surface Chatter & Dimensional Step Non-Conformance',
        confidence: '97.2%',
        severity: photoCapturePin?.isCtq ? 'CRITICAL (CTQ Feature Impacted)' : 'Medium Deviation',
        recommendation: 'Recommend Rework Order Op 25: Corrective skim pass on CNC Lathe #04.'
      });
    }
  };

  const removePhoto = (index: number) => {
    sounds.playTactileClick();
    const updated = capturedPhotos.filter((_, i) => i !== index);
    setCapturedPhotos(updated);
    if (updated.length < 2) {
      setAiVisionAnalysis(null);
    }
  };

  const handleCompletePhotoCapture = () => {
    if (!photoCapturePin) return;
    if (capturedPhotos.length < 2) {
      alert('Section 5.4 Rule: You must capture at least TWO distinct photos of the non-conformance before proceeding!');
      return;
    }

    sounds.playTactileClick();
    const record: MeasurementRecord = {
      pinId: photoCapturePin.pinId,
      label: photoCapturePin.label,
      nominal: photoCapturePin.nominal,
      upper: photoCapturePin.upper,
      lower: photoCapturePin.lower,
      maxLimit: photoCapturePin.maxLimit,
      actual: activeInputVal,
      unit: photoCapturePin.unit,
      isCtq: photoCapturePin.isCtq,
      passed: false,
      photos: capturedPhotos
    };

    setMeasurements(prev => ({ ...prev, [photoCapturePin.pinId]: record }));
    setPhotoCapturePin(null);
    setCapturedPhotos([]);
    advanceToNextPin();
  };

  const advanceToNextPin = () => {
    if (!template) return;
    if (currentPinIndex < template.pins.length - 1) {
      setCurrentPinIndex(currentPinIndex + 1);
      setActiveInputVal('');
    }
  };

  const handleSubmitChecklist = async () => {
    if (!scannedTraveler || !template || !scannedStation) return;
    sounds.playTactileClick();

    const measurementList = template.pins.map(p => measurements[p.pinId]);

    const payload = {
      travelerId: scannedTraveler.id,
      stationId: scannedStation.qrCode,
      inspectorId: inspectorBadge,
      gaugeId: selectedGaugeId,
      templateId: template.id,
      inspectionType: 'PDI',
      measurements: measurementList,
      remarks: 'Digital tablet floor inspection completed under Station QR Lock.'
    };

    try {
      const res = await api.submitInspection(payload, isOffline);
      if (isOffline) {
        sounds.playPassChime();
        setSubmissionResult({
          success: true,
          message: 'Inspection securely cached to rugged tablet offline storage. Ready to auto-sync upon Wi-Fi reconnect.'
        });
        onRefreshSyncCount();
      } else {
        if (res.success) {
          if (res.inspection.hasCtqFailures) {
            sounds.playCriticalAlarm();
          } else if (res.inspection.hasFailures) {
            sounds.playFailBuzzer();
          } else {
            sounds.playPassChime();
          }
          setSubmissionResult({
            success: true,
            message: 'Checklist successfully registered and signed off.',
            alert: res.alert
          });
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleReset = () => {
    sounds.playTactileClick();
    setScannedStation(null);
    setScannedTraveler(null);
    setIsScanningMode(true);
    setCurrentPinIndex(0);
    setMeasurements({});
    setActiveInputVal('');
    setSubmissionResult(null);
  };

  const allPinsCompleted = template ? template.pins.every(p => !!measurements[p.pinId]) : false;
  const isInputPassed = currentPin && activeInputVal.trim() !== '' ? evaluatePinValue(currentPin, activeInputVal) : null;

  return (
    <div className={`p-4 lg:p-6 space-y-6 ${gloveMode ? 'max-w-none text-base' : 'max-w-6xl mx-auto'}`}>
      {/* Top Rugged Tablet Header */}
      <div className="bg-slate-900 border-2 border-amber-500/60 rounded-xl p-4 shadow-2xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-amber-500 text-slate-950 rounded-lg flex items-center justify-center font-black shadow">
            <Tablet size={22} />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-mono font-bold text-sm text-white">SHOPFLOOR INSPECTOR TABLET</span>
              <span className="px-2 py-0.2 bg-amber-500/20 text-amber-300 font-mono text-[10px] font-bold rounded border border-amber-500/40">
                STATION-LOCKED WORKFLOW
              </span>
            </div>
            {/* NFC Badge Tap Component */}
            <div className="text-xs text-slate-300 font-mono flex items-center space-x-2 mt-0.5">
              <span>Inspector: <strong className="text-white">{inspectorBadge}</strong></span>
              <button
                onClick={handleNfcBadgeTap}
                className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-500/30 rounded text-[10px] flex items-center space-x-1 cursor-pointer"
                title="Tap RFID/NFC Badge on Tablet Bezel"
              >
                <CreditCard size={11} />
                <span>NFC Tap Badge</span>
              </button>
              {badgeTapSuccess && <span className="text-emerald-400 font-bold animate-pulse">✓ BADGE VERIFIED</span>}
            </div>
          </div>
        </div>

        {/* Wireless BLE Gauge & Tool Calibration Header */}
        <div className="flex items-center space-x-3">
          {/* Wireless BLE Tool Transmitter */}
          <div className="bg-slate-950 p-2 rounded-lg border border-slate-800 flex items-center space-x-2">
            <Radio size={16} className={bleConnected ? 'text-emerald-400 animate-pulse' : 'text-slate-500'} />
            <div className="text-xs">
              <div className="text-[10px] text-slate-400 uppercase font-mono">Wireless Tool (BLE)</div>
              {bleConnected ? (
                <div className="flex items-center space-x-1.5">
                  <span className="text-emerald-400 font-mono font-bold text-[11px]">Mitutoyo Connected</span>
                  <button
                    onClick={handleBleDataTransmit}
                    className="px-2 py-0.5 bg-amber-500 text-slate-950 font-bold text-[10px] rounded hover:bg-amber-400 cursor-pointer"
                  >
                    Auto-Send Reading
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleConnectBle}
                  className="text-amber-400 hover:text-amber-300 font-bold text-[11px] underline cursor-pointer"
                >
                  Pair Caliper (BLE)
                </button>
              )}
            </div>
          </div>

          {/* Gauge Selector */}
          <div className="flex items-center space-x-2 bg-slate-950 p-2 rounded-lg border border-slate-800">
            <Wrench size={16} className="text-amber-400" />
            <div className="text-xs">
              <div className="text-[10px] text-slate-400 uppercase font-mono">Active Tool Serial</div>
              <select
                value={selectedGaugeId}
                onChange={(e) => handleSelectGauge(e.target.value)}
                className="bg-slate-900 text-amber-300 font-mono font-bold text-xs rounded px-1.5 py-0.5 focus:outline-none"
              >
                {gauges.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.id} ({g.type} - {g.status})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Tool Calibration Expiry Error Banner */}
      {gaugeError && (
        <div className="bg-rose-950/80 border-2 border-rose-600 rounded-xl p-4 shadow-xl flex items-center space-x-3 animate-pulse">
          <AlertTriangle className="text-rose-400 shrink-0" size={24} />
          <div className="text-xs text-rose-200 font-mono">
            <strong className="text-rose-100 font-bold block text-sm">TOOL CALIBRATION EXPIRED - MEASUREMENT ENTRY BLOCKED</strong>
            {gaugeError}
          </div>
        </div>
      )}

      {/* STEP 1: PHYSICAL PRESENCE QR SCANNING (Section 5.1) */}
      {isScanningMode ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-6">
          <div className="border-b border-slate-800 pb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                <Scan className="text-amber-500" size={20} />
                <span>Mandatory Physical Presence Rule: Scan Station & Traveler QR Codes</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Point tablet camera directly at the workstation QR plate or printed traveler sheet to unlock inspection.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Step A: Scan Station QR Code */}
            <div className={`p-4 rounded-xl border-2 transition-all ${
              scannedStation
                ? 'bg-emerald-950/20 border-emerald-500/80'
                : 'bg-slate-950 border-amber-500/50'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <span className="font-bold text-xs uppercase tracking-wider font-mono text-amber-400">
                  Step 1: Machine Frame QR Code
                </span>
                {scannedStation ? (
                  <span className="flex items-center space-x-1 text-emerald-400 text-xs font-mono font-bold">
                    <CheckCircle2 size={15} />
                    <span>VERIFIED</span>
                  </span>
                ) : (
                  <button
                    onClick={() => setActiveCameraScan('station')}
                    className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded flex items-center space-x-1 shadow cursor-pointer"
                  >
                    <Camera size={13} />
                    <span>Launch Live Camera</span>
                  </button>
                )}
              </div>

              {scannedStation ? (
                <div className="bg-slate-900 p-3 rounded-lg border border-slate-700 text-xs space-y-1 font-mono">
                  <div className="text-white font-bold">{scannedStation.name}</div>
                  <div className="text-slate-400">QR: {scannedStation.qrCode} • {scannedStation.department}</div>
                  <div className="text-emerald-400">PM Status: {scannedStation.pmStatus} (Zero-Point Locked)</div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-slate-400">
                    Scan via live camera or tap a machine plate below:
                  </p>
                  <div className="grid grid-cols-1 gap-2">
                    {workstations.map((ws) => (
                      <button
                        key={ws.id}
                        onClick={() => handleScanStation(ws)}
                        className={`p-2 rounded text-left text-xs font-mono flex items-center justify-between border cursor-pointer ${
                          ws.pmStatus === 'Overdue'
                            ? 'bg-rose-950/20 border-rose-800 text-rose-300'
                            : 'bg-slate-900 border-slate-700 text-slate-200 hover:border-amber-400'
                        }`}
                      >
                        <div>
                          <strong>{ws.name}</strong>
                          <div className="text-[10px] text-slate-400">Scan: {ws.qrCode}</div>
                        </div>
                        <QrCode size={18} className="text-amber-400 shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Step B: Scan Job Traveler Barcode */}
            <div className={`p-4 rounded-xl border-2 transition-all ${
              !scannedStation
                ? 'opacity-50 pointer-events-none bg-slate-950 border-slate-800'
                : 'bg-slate-950 border-amber-500/50'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <span className="font-bold text-xs uppercase tracking-wider font-mono text-amber-400">
                  Step 2: Job Traveler Barcode
                </span>
                <button
                  onClick={() => setActiveCameraScan('traveler')}
                  className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded flex items-center space-x-1 shadow cursor-pointer"
                >
                  <Camera size={13} />
                  <span>Launch Live Camera</span>
                </button>
              </div>

              <p className="text-xs text-slate-400 mb-3">
                Scan traveler sheet with camera or select lot:
              </p>

              <div className="space-y-2">
                {travelers.map((trv) => (
                  <button
                    key={trv.id}
                    onClick={() => handleScanTraveler(trv)}
                    className="w-full p-2.5 bg-slate-900 hover:bg-slate-850 border border-slate-700 hover:border-amber-400 rounded-lg text-left text-xs font-mono flex items-center justify-between cursor-pointer"
                  >
                    <div>
                      <div className="text-amber-300 font-bold">{trv.id} • WO: {trv.workOrder}</div>
                      <div className="text-slate-400 text-[11px]">{trv.partNumber} - {trv.partName} (Heat #{trv.heatLot})</div>
                    </div>
                    <Scan size={18} className="text-amber-400" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* STEP 2: LOCKED STEP-BY-STEP PDI INSPECTION (Section 5.2) */
        <div className="space-y-6">
          {/* Active Job & Station Lock Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center space-x-3">
              <Lock size={16} className="text-emerald-400" />
              <div>
                <span className="text-slate-400">Locked to Station: </span>
                <strong className="text-white font-mono">{scannedStation?.name}</strong>
              </div>
              <span className="text-slate-600">|</span>
              <div>
                <span className="text-slate-400">Job Traveler: </span>
                <strong className="text-amber-300 font-mono">{scannedTraveler?.id}</strong> ({scannedTraveler?.partNumber})
              </div>
            </div>

            <button
              onClick={handleReset}
              className="text-xs text-slate-400 hover:text-white underline cursor-pointer"
            >
              Cancel & Unlock Station
            </button>
          </div>

          {/* Submission Result Feedback */}
          {submissionResult && (
            <div className="bg-slate-900 border-2 border-emerald-500 rounded-xl p-6 text-center space-y-3">
              <CheckCircle2 size={40} className="text-emerald-400 mx-auto" />
              <h2 className="text-lg font-bold text-white">{submissionResult.message}</h2>
              {submissionResult.alert && (
                <div className="p-3 bg-amber-950/40 border border-amber-500/60 rounded text-xs text-amber-200 font-mono">
                  {submissionResult.alert}
                </div>
              )}
              <button
                onClick={handleReset}
                className="px-6 py-2 bg-amber-500 text-slate-950 font-bold rounded-lg text-xs"
              >
                Scan Next Station / Job
              </button>
            </div>
          )}

          {!submissionResult && currentPin && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Active Pin Card & Large Touchpad Input (7 cols) */}
              <div className="lg:col-span-7 bg-slate-900 border-2 border-slate-700 rounded-xl p-5 shadow-2xl space-y-5">
                {/* Pin Header */}
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center space-x-2">
                    <span className="w-8 h-8 rounded-full bg-amber-500 text-slate-950 font-black font-mono flex items-center justify-center text-sm shadow">
                      {currentPin.pinId}
                    </span>
                    <div>
                      <h3 className="text-base font-bold text-white">{currentPin.label}</h3>
                      <div className="text-xs text-slate-400 font-mono">
                        Target Tool: <strong className="text-amber-300">{currentPin.toolGaugeId}</strong> ({currentPin.toolName})
                      </div>
                    </div>
                  </div>

                  {currentPin.isCtq && (
                    <span className="px-2.5 py-1 bg-amber-500/20 text-amber-300 border border-amber-500 rounded font-mono font-bold text-xs flex items-center space-x-1">
                      <ShieldAlert size={14} />
                      <span>CTQ CRITICAL</span>
                    </span>
                  )}
                </div>

                {/* Specification Limits Reference */}
                <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 text-xs font-mono grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className="text-slate-500 text-[10px] uppercase">Nominal</div>
                    <div className="text-sm font-bold text-white">{currentPin.nominal ?? 'N/A'} {currentPin.unit}</div>
                  </div>
                  <div>
                    <div className="text-slate-500 text-[10px] uppercase">Allowable Upper</div>
                    <div className="text-sm font-bold text-emerald-400">
                      {currentPin.upper !== undefined ? `+${currentPin.upper}` : (currentPin.maxLimit ? `MAX ${currentPin.maxLimit}` : 'Pass')}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500 text-[10px] uppercase">Allowable Lower</div>
                    <div className="text-sm font-bold text-rose-400">
                      {currentPin.lower !== undefined ? `${currentPin.lower}` : '0.00'}
                    </div>
                  </div>
                </div>

                {/* Visual Tolerance Feedback Screen (Turns GREEN if in spec, RED if out) */}
                <div
                  className={`p-6 rounded-xl border-4 text-center transition-all duration-200 ${
                    isInputPassed === true
                      ? 'bg-emerald-950/60 border-emerald-500 shadow-xl shadow-emerald-950'
                      : isInputPassed === false
                      ? 'bg-rose-950/60 border-rose-500 shadow-xl shadow-rose-950 animate-pulse-fast'
                      : 'bg-slate-950 border-slate-700'
                  }`}
                >
                  <div className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-1">
                    {currentPin.type === 'visual' ? 'Visual Evaluation' : 'Live Measurement Reading'}
                  </div>

                  {currentPin.type === 'visual' ? (
                    <div className="flex justify-center space-x-4 py-2">
                      <button
                        onClick={() => handleEnterValue('Pass')}
                        className={`glove-touch-button px-6 py-3 rounded-lg font-bold text-sm cursor-pointer ${
                          activeInputVal.toLowerCase() === 'pass'
                            ? 'bg-emerald-500 text-slate-950 shadow-lg'
                            : 'bg-slate-800 text-slate-200'
                        }`}
                      >
                        PASS (Conforming)
                      </button>
                      <button
                        onClick={() => handleEnterValue('Fail')}
                        className={`glove-touch-button px-6 py-3 rounded-lg font-bold text-sm cursor-pointer ${
                          activeInputVal.toLowerCase() === 'fail'
                            ? 'bg-rose-600 text-white shadow-lg'
                            : 'bg-slate-800 text-slate-200'
                        }`}
                      >
                        FAIL (Defect)
                      </button>
                    </div>
                  ) : (
                    <div>
                      <input
                        type="number"
                        step="0.001"
                        placeholder="0.000"
                        value={activeInputVal}
                        onChange={(e) => handleEnterValue(e.target.value)}
                        disabled={!!gaugeError}
                        className="w-full text-center bg-transparent text-4xl sm:text-5xl font-mono font-black text-white focus:outline-none"
                      />
                      <div className="text-xs font-mono mt-2">
                        {isInputPassed === true && (
                          <span className="text-emerald-400 font-bold flex items-center justify-center space-x-1">
                            <CheckCircle2 size={16} />
                            <span>WITHIN SPECIFICATION LIMITS</span>
                          </span>
                        )}
                        {isInputPassed === false && (
                          <span className="text-rose-400 font-bold flex items-center justify-center space-x-1">
                            <XCircle size={16} />
                            <span>OUT OF TOLERANCE — MANDATORY DEFECT PHOTO REQUIRED</span>
                          </span>
                        )}
                        {isInputPassed === null && (
                          <span className="text-slate-500 font-mono">Enter tool gauge measurement</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Tactile Glove Touchpad for Numeric Keypad entry */}
                {currentPin.type !== 'visual' && (
                  <div className="grid grid-cols-3 gap-2">
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'CLR'].map((btn) => (
                      <button
                        key={btn}
                        onClick={() => {
                          sounds.playTactileClick();
                          if (btn === 'CLR') {
                            handleEnterValue('');
                          } else {
                            handleEnterValue(activeInputVal + btn);
                          }
                        }}
                        className="glove-touch-button bg-slate-800 hover:bg-slate-700 text-white font-mono font-bold rounded-lg text-lg border border-slate-700 active:scale-95 transition-transform"
                      >
                        {btn}
                      </button>
                    ))}
                  </div>
                )}

                {/* Confirm Button */}
                <button
                  onClick={handleConfirmDimension}
                  disabled={activeInputVal.trim() === '' || !!gaugeError}
                  className={`w-full glove-touch-button rounded-xl font-black text-base flex items-center justify-center space-x-2 shadow-xl transition-all cursor-pointer ${
                    activeInputVal.trim() === '' || !!gaugeError
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      : isInputPassed === false
                      ? 'bg-rose-600 hover:bg-rose-500 text-white'
                      : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                  }`}
                >
                  {isInputPassed === false ? (
                    <>
                      <Camera size={20} />
                      <span>Take Mandatory Defect Photos (2 Required)</span>
                    </>
                  ) : (
                    <>
                      <Check size={20} />
                      <span>Confirm & Lock Dimension</span>
                    </>
                  )}
                </button>
              </div>

              {/* Right Column: Step-by-Step Dimension List & CAD Blueprint Pin Marker (5 cols) */}
              <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <span className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
                    Linear Inspection Checklist
                  </span>
                  <span className="text-xs font-mono text-amber-400 font-bold">
                    Step {currentPinIndex + 1} of {template.pins.length}
                  </span>
                </div>

                <div className="space-y-2">
                  {template.pins.map((pin, idx) => {
                    const record = measurements[pin.pinId];
                    const isCurrent = idx === currentPinIndex;

                    return (
                      <div
                        key={pin.pinId}
                        className={`p-3 rounded-lg border text-xs flex items-center justify-between transition-all ${
                          isCurrent
                            ? 'bg-slate-800 border-amber-500 shadow'
                            : record
                            ? record.passed
                              ? 'bg-emerald-950/20 border-emerald-700/50 text-slate-300'
                              : 'bg-rose-950/20 border-rose-700/50 text-rose-300'
                            : 'bg-slate-950/60 border-slate-800 text-slate-500'
                        }`}
                      >
                        <div className="flex items-center space-x-2.5">
                          <span
                            className={`w-6 h-6 rounded-full flex items-center justify-center font-mono font-bold text-[11px] ${
                              isCurrent
                                ? 'bg-amber-500 text-slate-950'
                                : record
                                ? record.passed
                                  ? 'bg-emerald-500 text-slate-950'
                                  : 'bg-rose-600 text-white'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {pin.pinId}
                          </span>
                          <div>
                            <div className="font-semibold text-slate-100">{pin.label}</div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              Nominal: {pin.nominal} {pin.unit} {pin.isCtq ? '• [CTQ]' : ''}
                            </div>
                          </div>
                        </div>

                        <div>
                          {record ? (
                            <span
                              className={`font-mono font-bold px-2 py-0.5 rounded text-[11px] ${
                                record.passed ? 'text-emerald-400' : 'text-rose-400'
                              }`}
                            >
                              {record.actual} {record.passed ? 'PASS' : 'FAIL'}
                            </span>
                          ) : isCurrent ? (
                            <span className="text-amber-400 font-mono text-[11px] animate-pulse">MEASURING</span>
                          ) : (
                            <Lock size={14} className="text-slate-600" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {allPinsCompleted && (
                  <div className="pt-3 border-t border-slate-800">
                    <button
                      onClick={handleSubmitChecklist}
                      className="w-full glove-touch-button bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-base shadow-xl shadow-amber-500/20 cursor-pointer flex items-center justify-center space-x-2"
                    >
                      <CheckCircle2 size={20} />
                      <span>Electronically Sign & Submit Inspection</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* MANDATORY DEFECT PHOTO CAPTURE & AI VISION PRE-SCREENING MODAL */}
      {photoCapturePin && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border-2 border-rose-500 rounded-xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 border-b border-slate-800 pb-3">
              <Camera className="text-rose-400" size={24} />
              <div>
                <h2 className="text-base font-bold text-white">MANDATORY DEFECT PHOTO CAPTURE & AI VISION PRE-SCREENING</h2>
                <p className="text-xs text-rose-300 font-mono">
                  Out-of-tolerance recorded for Pin #{photoCapturePin.pinId} ({photoCapturePin.label})
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-300">
              Section 5.4 Standard: The inspector cannot proceed without capturing at least two clear photos of the defect or gauge reading.
            </p>

            {/* Live Camera Viewfinder (when active) */}
            {photoCameraActive ? (
              <div className="relative aspect-video bg-black rounded-xl overflow-hidden border-2 border-rose-500 shadow-xl flex items-center justify-center">
                <video
                  ref={photoVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />

                {/* Laser Alignment Reticle */}
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                  <div className="w-48 h-32 border-2 border-amber-400/80 rounded relative">
                    <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-amber-400" />
                    <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-amber-400" />
                    <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-amber-400" />
                    <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-amber-400" />
                    <div className="w-full h-0.5 bg-rose-500/80 absolute top-1/2 -translate-y-1/2" />
                  </div>
                  <span className="mt-2 text-[10px] font-mono text-amber-300 bg-slate-900/90 px-2 py-0.5 rounded border border-amber-500/30">
                    Focus Camera on Defect or Caliper Display
                  </span>
                </div>

                {/* Floating Snap & Cancel Buttons */}
                <div className="absolute bottom-3 inset-x-0 flex justify-center space-x-3 z-10">
                  <button
                    onClick={snapDefectPhoto}
                    className="px-4 py-1.5 bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs rounded-full shadow-lg flex items-center space-x-1.5 cursor-pointer"
                  >
                    <Camera size={14} />
                    <span>Snap Photo #{capturedPhotos.length + 1}</span>
                  </button>
                  <button
                    onClick={stopDefectCamera}
                    className="px-3 py-1.5 bg-slate-900/90 hover:bg-slate-800 text-slate-300 text-xs rounded-full border border-slate-700 cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : null}

            {photoCameraError && (
              <div className="p-2.5 bg-amber-950/40 border border-amber-600/50 rounded-lg text-xs text-amber-200 flex items-center space-x-2">
                <AlertTriangle size={15} className="text-amber-400 shrink-0" />
                <span>{photoCameraError}</span>
              </div>
            )}

            {/* Photo Preview Slots (2 Required) */}
            <div className="grid grid-cols-2 gap-3">
              {[0, 1].map((idx) => (
                <div
                  key={idx}
                  className="aspect-video bg-slate-950 border-2 border-dashed border-slate-700 rounded-lg relative overflow-hidden flex flex-col items-center justify-center p-2 text-center"
                >
                  {capturedPhotos[idx] ? (
                    <div className="relative w-full h-full group">
                      <img
                        src={capturedPhotos[idx]}
                        alt={`Defect ${idx + 1}`}
                        className="w-full h-full object-cover rounded"
                      />
                      <div className="absolute top-1 left-1 bg-slate-950/80 text-emerald-400 text-[10px] font-mono px-1.5 py-0.5 rounded font-bold border border-emerald-500/30">
                        Photo #{idx + 1} ✓
                      </div>
                      <button
                        onClick={() => removePhoto(idx)}
                        className="absolute top-1 right-1 p-1 bg-rose-950/90 hover:bg-rose-800 text-rose-300 rounded border border-rose-700 cursor-pointer"
                        title="Retake or Delete Photo"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-1.5 w-full flex flex-col items-center justify-center">
                      <div className="text-[11px] font-mono text-slate-400">Photo #{idx + 1} Slot</div>
                      <div className="flex flex-col gap-1 w-full max-w-[150px]">
                        <button
                          onClick={startDefectCamera}
                          className="px-2 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[10px] rounded flex items-center justify-center space-x-1 cursor-pointer"
                        >
                          <Camera size={12} />
                          <span>Live Camera</span>
                        </button>
                        <button
                          onClick={() => photoFileInputRef.current?.click()}
                          className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 text-[10px] rounded flex items-center justify-center space-x-1 cursor-pointer"
                        >
                          <Upload size={11} />
                          <span>Upload / Roll</span>
                        </button>
                        <button
                          onClick={handleSampleDefectPhoto}
                          className="px-2 py-0.5 bg-slate-900 hover:bg-slate-800 text-amber-400 border border-amber-500/30 text-[10px] rounded flex items-center justify-center space-x-1 cursor-pointer"
                        >
                          <Sparkles size={11} />
                          <span>Demo Sample</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Hidden File Picker */}
            <input
              ref={photoFileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileUpload}
              className="hidden"
            />

            {/* AI Computer Vision Defect Pre-Screening Result */}
            {aiVisionAnalysis && (
              <div className="p-3 bg-slate-950 border border-amber-500/50 rounded-lg space-y-1 text-xs font-mono">
                <div className="flex items-center justify-between text-amber-300 font-bold">
                  <span className="flex items-center space-x-1">
                    <Sparkles size={14} />
                    <span>AI COMPUTER VISION DEFECT PRE-SCREENING</span>
                  </span>
                  <span className="text-[10px] bg-amber-500/20 px-2 py-0.5 rounded">Confidence: {aiVisionAnalysis.confidence}</span>
                </div>
                <div className="text-slate-200">Defect: <strong>{aiVisionAnalysis.classification}</strong></div>
                <div className="text-slate-400">Severity: <strong className="text-rose-400">{aiVisionAnalysis.severity}</strong></div>
                <div className="text-slate-300 text-[11px] mt-1">{aiVisionAnalysis.recommendation}</div>
              </div>
            )}

            <div className="flex justify-between items-center pt-2">
              <span className="text-xs font-mono text-slate-400">
                Photos Captured: <strong className="text-white">{capturedPhotos.length} of 2 required</strong>
              </span>

              <button
                onClick={handleCompletePhotoCapture}
                disabled={capturedPhotos.length < 2}
                className={`px-5 py-2.5 rounded-lg font-bold text-xs shadow transition-all ${
                  capturedPhotos.length >= 2
                    ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 cursor-pointer'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                Proceed with Logged Defect
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LIVE CAMERA QR SCANNER MODAL */}
      {activeCameraScan && (
        <CameraScannerModal
          title={activeCameraScan === 'station' ? 'Scan Machine Frame QR Plate' : 'Scan Job Traveler Barcode'}
          expectedType={activeCameraScan}
          onScanSuccess={(decodedText) => {
            if (activeCameraScan === 'station') {
              const matched = workstations.find(w => w.qrCode.toLowerCase() === decodedText.toLowerCase() || w.id.toLowerCase() === decodedText.toLowerCase());
              if (matched) {
                handleScanStation(matched);
              } else {
                alert(`Scanned QR code "${decodedText}" not found in registered workstations.`);
              }
            } else {
              const matched = travelers.find(t => t.barcode.toLowerCase() === decodedText.toLowerCase() || t.id.toLowerCase() === decodedText.toLowerCase());
              if (matched) {
                handleScanTraveler(matched);
              } else {
                alert(`Scanned Traveler code "${decodedText}" not found in active work orders.`);
              }
            }
            setActiveCameraScan(null);
          }}
          onClose={() => setActiveCameraScan(null)}
          quickOptions={
            activeCameraScan === 'station'
              ? workstations.map(w => ({ label: w.name, code: w.qrCode, sub: w.department }))
              : travelers.map(t => ({ label: `${t.partNumber} (${t.id})`, code: t.barcode, sub: `WO: ${t.workOrder} • Heat #${t.heatLot}` }))
          }
        />
      )}
    </div>
  );
};
