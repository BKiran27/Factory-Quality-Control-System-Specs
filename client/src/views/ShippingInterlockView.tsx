import React, { useEffect, useState } from 'react';
import {
  Truck,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Unlock,
  Printer,
  FileText,
  CheckCircle2,
  XCircle,
  AlertOctagon,
  ExternalLink,
  QrCode
} from 'lucide-react';
import { JobTraveler, GatePass } from '../types';
import { api } from '../utils/api';
import { sounds } from '../utils/audio';
import { QrCodeBadge } from '../components/QrCodeBadge';

interface ShippingInterlockViewProps {
  onOpenPublicCoa: (travelerId: string) => void;
}

export const ShippingInterlockView: React.FC<ShippingInterlockViewProps> = ({ onOpenPublicCoa }) => {
  const [travelers, setTravelers] = useState<JobTraveler[]>([]);
  const [selectedTravelerId, setSelectedTravelerId] = useState<string>('');
  const [interlockStatus, setInterlockStatus] = useState<{
    travelerId: string;
    clearedForShipping: boolean;
    conditions: { rule: string; passed: boolean; details: string; }[];
    lockoutWarning: string | null;
  } | null>(null);

  // Gate Pass Form State
  const [vehicleNumber, setVehicleNumber] = useState('KA-04-E-8821');
  const [driverName, setDriverName] = useState('Ramesh Kumar');
  const [driverPhone, setDriverPhone] = useState('+91 98765 43210');
  const [generatedPass, setGeneratedPass] = useState<GatePass | null>(null);
  const [showPrintLabel, setShowPrintLabel] = useState<boolean>(false);

  const loadTravelers = async () => {
    try {
      const data = await api.getJobTravelers();
      setTravelers(data || []);
      if (data && data.length > 0 && !selectedTravelerId) {
        setSelectedTravelerId(data[0].id);
        checkInterlock(data[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadTravelers();
  }, []);

  const checkInterlock = async (travelerId: string) => {
    try {
      const res = await api.checkShippingInterlock(travelerId);
      setInterlockStatus(res);
      setGeneratedPass(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectTraveler = (id: string) => {
    sounds.playTactileClick();
    setSelectedTravelerId(id);
    checkInterlock(id);
  };

  const handleGenerateGatePass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!interlockStatus?.clearedForShipping) {
      sounds.playFailBuzzer();
      alert('INTERLOCK LOCKOUT: Quality rules not cleared for shipping!');
      return;
    }

    sounds.playTactileClick();
    const current = travelers.find(t => t.id === selectedTravelerId);
    const res = await api.generateGatePass({
      travelerId: selectedTravelerId,
      vehicleNumber,
      driverName,
      driverPhone,
      destinationCustomer: current?.customer,
      customerPoNumber: current?.customerPo,
      warehouseClerkId: 'DISPATCH-CLERK-SITA'
    });

    if (res.success) {
      sounds.playSuccessFanfare();
      setGeneratedPass(res.gatePass);
      loadTravelers();
    }
  };

  const currentTraveler = travelers.find(t => t.id === selectedTravelerId);

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <Truck className="text-amber-500" size={24} />
            <h1 className="text-xl font-bold text-white">Pre-Dispatch Clearance Gates & Shipping Interlocks</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Section 10 Standard: Automated shipping interlock checking 3 mandatory gates before unlocking packing slips and customer QR labels.
          </p>
        </div>

        {/* Traveler Switcher */}
        <div className="flex items-center space-x-2 bg-slate-900 border border-slate-800 p-2 rounded-lg">
          <span className="text-xs text-slate-400 font-mono">Select Lot:</span>
          <select
            value={selectedTravelerId}
            onChange={(e) => handleSelectTraveler(e.target.value)}
            className="bg-slate-950 text-amber-300 font-mono font-bold text-xs rounded px-2 py-1 border border-slate-700"
          >
            {travelers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.id} - {t.partNumber} ({t.overallStatus})
              </option>
            ))}
          </select>
        </div>
      </div>

      {interlockStatus && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: 3 Mandatory Quality Gates Verification (7 cols) */}
          <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <span className="text-base font-mono font-bold text-white">
                  Gate Verification for Lot {interlockStatus.travelerId}
                </span>
              </div>

              {interlockStatus.clearedForShipping ? (
                <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 rounded-full font-mono text-xs font-bold flex items-center space-x-1.5">
                  <Unlock size={14} />
                  <span>ALL GATES CLEARED (UNLOCKED)</span>
                </span>
              ) : (
                <span className="px-3 py-1 bg-rose-500/20 text-rose-300 border border-rose-500/50 rounded-full font-mono text-xs font-bold flex items-center space-x-1.5 animate-pulse">
                  <Lock size={14} />
                  <span>SHIPPING INTERLOCK ACTIVE (LOCKED)</span>
                </span>
              )}
            </div>

            {/* Lockout Warning Banner if any condition fails */}
            {!interlockStatus.clearedForShipping && (
              <div className="p-4 bg-rose-950/60 border-2 border-rose-600 rounded-xl flex items-start space-x-3 text-xs font-mono">
                <AlertOctagon className="text-rose-400 shrink-0 mt-0.5" size={24} />
                <div className="space-y-1">
                  <strong className="text-rose-200 text-sm block">HIGH-VISIBILITY GATE LOCKOUT ACTIVE</strong>
                  <p className="text-rose-300">{interlockStatus.lockoutWarning}</p>
                  <p className="text-slate-400 text-[11px]">
                    Warehouse clerks cannot generate shipping manifests, packing slips, or gate passes until all 3 conditions pass.
                  </p>
                </div>
              </div>
            )}

            {/* The Three Mandatory Rules (Section 10.1) */}
            <div className="space-y-3">
              {interlockStatus.conditions.map((cond, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-xl border transition-all ${
                    cond.passed
                      ? 'bg-emerald-950/20 border-emerald-700/60 text-slate-200'
                      : 'bg-rose-950/25 border-rose-600/60 text-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center font-mono font-bold text-xs shrink-0 ${
                        cond.passed ? 'bg-emerald-500 text-slate-950' : 'bg-rose-600 text-white'
                      }`}>
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <div>
                        <div className="text-xs font-bold text-white">{cond.rule}</div>
                        <div className="text-[11px] font-mono mt-1 text-slate-400">{cond.details}</div>
                      </div>
                    </div>

                    <div>
                      {cond.passed ? (
                        <span className="flex items-center space-x-1 text-emerald-400 font-mono text-xs font-bold">
                          <CheckCircle2 size={16} />
                          <span>PASSED</span>
                        </span>
                      ) : (
                        <span className="flex items-center space-x-1 text-rose-400 font-mono text-xs font-bold">
                          <XCircle size={16} />
                          <span>FAILED</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Public Certificate Preview Link */}
            {currentTraveler && (
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-400">View Public Certificate of Analysis:</span>
                <button
                  onClick={() => onOpenPublicCoa(currentTraveler.id)}
                  className="text-amber-400 hover:text-amber-300 text-xs font-mono font-bold flex items-center space-x-1 cursor-pointer"
                >
                  <span>Open Customer CoA Dossier</span>
                  <ExternalLink size={13} />
                </button>
              </div>
            )}
          </div>

          {/* Right Column: Gate Pass Generator & Printable Customer Crate Label (5 cols) */}
          <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
            <div className="border-b border-slate-800 pb-3">
              <h2 className="text-sm font-bold text-white flex items-center space-x-2">
                <FileText className="text-amber-400" size={16} />
                <span>Dispatch Gate Pass & Manifest Issuance</span>
              </h2>
              <p className="text-xs text-slate-400">
                Authorized gate pass issuance and printable customer verification QR label.
              </p>
            </div>

            {generatedPass ? (
              <div className="bg-slate-950 border border-emerald-500/80 rounded-xl p-4 space-y-4 text-xs font-mono">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-emerald-400 font-bold">GATE PASS CLEARED: {generatedPass.gatePassId}</span>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded">
                    {generatedPass.status}
                  </span>
                </div>

                <div className="flex items-center justify-center py-2">
                  <QrCodeBadge
                    value={generatedPass.qrVerificationUrl}
                    size={130}
                    label={generatedPass.digitalSignature}
                  />
                </div>

                <div className="space-y-1 text-slate-300">
                  <div><strong>Customer:</strong> {generatedPass.destinationCustomer}</div>
                  <div><strong>Customer PO:</strong> {generatedPass.customerPoNumber}</div>
                  <div><strong>Vehicle #:</strong> {generatedPass.vehicleNumber}</div>
                  <div><strong>Driver:</strong> {generatedPass.driverName} ({generatedPass.driverPhone})</div>
                  <div><strong>Quantity:</strong> {generatedPass.batchSize} Units (Serials Attached)</div>
                </div>

                <div className="pt-2 flex justify-end space-x-2">
                  <button
                    onClick={() => setShowPrintLabel(true)}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg flex items-center space-x-1 shadow cursor-pointer"
                  >
                    <Printer size={14} />
                    <span>Print Customer Crate Label</span>
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleGenerateGatePass} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1">Dispatch Vehicle Registration Number *</label>
                  <input
                    type="text"
                    required
                    value={vehicleNumber}
                    onChange={(e) => setVehicleNumber(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Driver Full Name *</label>
                  <input
                    type="text"
                    required
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Driver Contact Phone</label>
                  <input
                    type="text"
                    value={driverPhone}
                    onChange={(e) => setDriverPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono"
                  />
                </div>

                <div className="p-2.5 bg-slate-950 border border-slate-800 rounded text-[11px] text-slate-400 font-mono">
                  All serial numbers will be cryptographically signed with the Zapuza Digital Certificate.
                </div>

                <button
                  type="submit"
                  disabled={!interlockStatus.clearedForShipping}
                  className={`w-full py-3 rounded-lg font-bold text-xs flex items-center justify-center space-x-2 shadow-lg transition-all ${
                    interlockStatus.clearedForShipping
                      ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 cursor-pointer'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                  }`}
                >
                  <Truck size={16} />
                  <span>Issue Gate Pass & Unlock Manifest</span>
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Printable Customer Verification Crate Label Modal (Section 11.2) */}
      {showPrintLabel && generatedPass && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center p-4 z-50">
          <div className="bg-white text-slate-900 rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4 print-card">
            <div className="flex items-center justify-between border-b pb-2">
              <div>
                <span className="font-extrabold text-sm tracking-wider block">CUSTOMER SHIPPING VERIFICATION LABEL</span>
                <span className="text-[10px] font-mono text-slate-600">ZAPUZA PRECISION AEROSPACE QA</span>
              </div>
              <button
                onClick={() => setShowPrintLabel(false)}
                className="text-slate-500 hover:text-black no-print font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <div className="flex justify-center py-2">
              <QrCodeBadge
                value={generatedPass.qrVerificationUrl}
                size={140}
                label={generatedPass.digitalSignature}
              />
            </div>

            <div className="border-t border-b py-2 text-xs font-mono space-y-1">
              <div><strong>CUSTOMER:</strong> {generatedPass.destinationCustomer}</div>
              <div><strong>CUSTOMER PO:</strong> {generatedPass.customerPoNumber}</div>
              <div><strong>PART NUMBER:</strong> {generatedPass.partNumber}</div>
              <div><strong>HEAT LOT:</strong> {generatedPass.heatLot}</div>
              <div><strong>LOT SIZE:</strong> {generatedPass.batchSize} UNITS</div>
              <div><strong>GATE PASS #:</strong> {generatedPass.gatePassId}</div>
            </div>

            <div className="text-[10px] text-slate-600 text-center font-mono">
              Scan QR code on crate to access certified Certificate of Analysis (CoA) & birth certificate.
            </div>

            <div className="no-print pt-2 flex justify-end space-x-2">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded flex items-center space-x-1"
              >
                <Printer size={14} />
                <span>Print Physical Crate Label</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
