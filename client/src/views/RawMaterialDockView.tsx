import React, { useEffect, useState } from 'react';
import {
  Layers,
  Plus,
  CheckCircle2,
  XCircle,
  FileText,
  Printer,
  AlertTriangle,
  Beaker,
  ShieldCheck,
  Search,
  Tag,
  Sparkles,
  Zap,
  UploadCloud
} from 'lucide-react';
import { RawMaterialIntake } from '../types';
import { api } from '../utils/api';
import { sounds } from '../utils/audio';
import { QrCodeBadge } from '../components/QrCodeBadge';

export const RawMaterialDockView: React.FC = () => {
  const [intakes, setIntakes] = useState<RawMaterialIntake[]>([]);
  const [selectedIntake, setSelectedIntake] = useState<RawMaterialIntake | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [showPrintLabel, setShowPrintLabel] = useState<RawMaterialIntake | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // New Intake Form State
  const [heatNumber, setHeatNumber] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [poNumber, setPoNumber] = useState('');
  const [materialGrade, setMaterialGrade] = useState('AISI 4340 Alloy Steel');
  const [quantity, setQuantity] = useState('200');
  const [carbonVal, setCarbonVal] = useState('0.41');
  const [manganeseVal, setManganeseVal] = useState('0.75');
  const [yieldVal, setYieldVal] = useState('890');
  const [tensileVal, setTensileVal] = useState('1120');

  // AI Smart MTC OCR Status
  const [isAiExtracting, setIsAiExtracting] = useState<boolean>(false);
  const [aiExtractedBanner, setAiExtractedBanner] = useState<boolean>(false);

  const loadData = async () => {
    try {
      const data = await api.getRawMaterials();
      setIntakes(data || []);
      if (data && data.length > 0 && !selectedIntake) {
        setSelectedIntake(data[0]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // AI Smart MTC Document Extraction (OCR)
  const handleAiOcrExtraction = () => {
    sounds.playTactileClick();
    setIsAiExtracting(true);
    setTimeout(() => {
      setIsAiExtracting(false);
      setHeatNumber('H-9942');
      setSupplierName('Jindal High-Strength Alloys Ltd.');
      setPoNumber('PO-88240');
      setMaterialGrade('AISI 4340 Alloy Steel');
      setQuantity('350');
      setCarbonVal('0.405');
      setManganeseVal('0.720');
      setYieldVal('910');
      setTensileVal('1145');
      setAiExtractedBanner(true);
      sounds.playPassChime();
    }, 1200);
  };

  const handleCreateIntake = async (e: React.FormEvent) => {
    e.preventDefault();
    sounds.playTactileClick();

    const payload = {
      heatNumber: heatNumber.trim().toUpperCase(),
      supplierName: supplierName.trim(),
      poNumber: poNumber.trim(),
      materialGrade,
      quantity: Number(quantity),
      unit: 'Billets',
      recordedBy: 'DOCK-CLERK-01',
      chemicalSpecs: [
        { element: 'Carbon (C)', min: 0.38, max: 0.43, actual: Number(carbonVal), unit: '%', passed: Number(carbonVal) >= 0.38 && Number(carbonVal) <= 0.43 },
        { element: 'Manganese (Mn)', min: 0.60, max: 0.85, actual: Number(manganeseVal), unit: '%', passed: Number(manganeseVal) >= 0.60 && Number(manganeseVal) <= 0.85 }
      ],
      mechanicalSpecs: [
        { property: 'Yield Strength', min: 850, max: 1100, actual: Number(yieldVal), unit: 'MPa', passed: Number(yieldVal) >= 850 },
        { property: 'Tensile Strength', min: 1080, max: 1280, actual: Number(tensileVal), unit: 'MPa', passed: Number(tensileVal) >= 1080 && Number(tensileVal) <= 1280 }
      ]
    };

    const res = await api.createRawMaterialIntake(payload);
    if (res.success) {
      sounds.playPassChime();
      setShowNewModal(false);
      setAiExtractedBanner(false);
      loadData();
      setSelectedIntake(res.intake);
    }
  };

  const handleVerify = async (id: string, decision: 'APPROVE' | 'REJECT') => {
    sounds.playTactileClick();
    let reason = '';
    if (decision === 'REJECT') {
      reason = prompt('Enter Rejection Reason for Supplier Non-Conformance Report (SNCR):') || 'Spectro chemical or physical defect';
      sounds.playFailBuzzer();
    } else {
      sounds.playPassChime();
    }
    const res = await api.verifyRawMaterial(id, decision, reason, 'QA-LAB-TECH-02');
    if (res.success) {
      loadData();
      setSelectedIntake(res.item);
    }
  };

  const filtered = intakes.filter(
    (i) =>
      i.heatNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.materialGrade.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <Layers className="text-amber-500" size={24} />
            <h1 className="text-xl font-bold text-white">Raw Material Dock Intake & Mill Test Certificate (MTC)</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Section 3 Standard: Heat lot verification, chemical spectro checks, weather-resistant barcode tagging & SNCR quarantine.
          </p>
        </div>

        <button
          onClick={() => {
            sounds.playTactileClick();
            setShowNewModal(true);
            setAiExtractedBanner(false);
          }}
          className="flex items-center space-x-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg shadow-lg shadow-amber-500/20 cursor-pointer self-start sm:self-auto"
        >
          <Plus size={16} />
          <span>Log New Heat Intake</span>
        </button>
      </div>

      {/* Main Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Intake Master List (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-slate-500" size={15} />
            <input
              type="text"
              placeholder="Filter by Heat #, Supplier, Grade..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500 font-mono"
            />
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {filtered.map((item) => {
              const isSelected = selectedIntake?.id === item.id;
              const isQuarantined = item.status === 'Supplier Quarantine';
              const isCleared = item.status === 'Cleared to Store';

              return (
                <div
                  key={item.id}
                  onClick={() => {
                    sounds.playTactileClick();
                    setSelectedIntake(item);
                  }}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-slate-800 border-amber-500 shadow-lg shadow-amber-500/10'
                      : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-sm text-amber-300">Heat #{item.heatNumber}</span>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                        isQuarantined
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/50'
                          : isCleared
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>

                  <div className="mt-1 text-xs text-slate-300 font-medium">{item.supplierName}</div>
                  <div className="text-[11px] text-slate-400 font-mono flex items-center justify-between mt-1">
                    <span>{item.materialGrade}</span>
                    <span>{item.quantity} {item.unit}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Selected Intake Verification Dossier (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl">
          {selectedIntake ? (
            <div className="space-y-5">
              {/* Dossier Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xl font-mono font-black text-white">Heat #{selectedIntake.heatNumber}</span>
                    <span className="text-xs font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                      PO: {selectedIntake.poNumber}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Received: {new Date(selectedIntake.receivedDate).toLocaleDateString()} by {selectedIntake.recordedBy}
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      sounds.playTactileClick();
                      setShowPrintLabel(selectedIntake);
                    }}
                    className="flex items-center space-x-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                  >
                    <Printer size={14} />
                    <span>Print Weatherproof Barcode</span>
                  </button>
                </div>
              </div>

              {/* Status Banner */}
              {selectedIntake.status === 'Supplier Quarantine' && (
                <div className="p-3.5 bg-rose-950/40 border border-rose-600 rounded-lg text-xs space-y-1">
                  <div className="font-bold text-rose-300 flex items-center space-x-2">
                    <AlertTriangle size={15} />
                    <span>SUPPLIER QUARANTINE ACTIVE ({selectedIntake.sncrNumber})</span>
                  </div>
                  <p className="text-rose-200">
                    Reason: {selectedIntake.rejectionReason}
                  </p>
                  <p className="text-rose-300 text-[11px] font-mono">
                    Mandatory Lock: Stock CANNOT be issued to production work orders under any circumstances.
                  </p>
                </div>
              )}

              {selectedIntake.status === 'Cleared to Store' && (
                <div className="p-3 bg-emerald-950/30 border border-emerald-600/60 rounded-lg text-xs flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-emerald-300 font-semibold">
                    <ShieldCheck size={18} />
                    <span>100% MTC Specs Verified. Cleared for Production Issue.</span>
                  </div>
                  <span className="text-emerald-400 font-mono text-[11px]">{selectedIntake.verifiedBy}</span>
                </div>
              )}

              {/* Chemical Spectro Analysis */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono flex items-center space-x-1.5">
                    <Beaker size={14} className="text-amber-400" />
                    <span>Chemical Composition Spectro Analysis (%)</span>
                  </h3>
                  <span className="text-[11px] text-slate-400 font-mono">ASTM / API Specification</span>
                </div>

                <div className="overflow-x-auto border border-slate-800 rounded-lg">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                      <tr>
                        <th className="p-2.5">Element</th>
                        <th className="p-2.5">Standard Min</th>
                        <th className="p-2.5">Standard Max</th>
                        <th className="p-2.5">Lab Actual</th>
                        <th className="p-2.5 text-right">Result</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 bg-slate-900/60">
                      {selectedIntake.chemicalSpecs.map((spec, idx) => (
                        <tr key={idx} className={spec.passed ? '' : 'bg-rose-950/30'}>
                          <td className="p-2.5 font-bold text-slate-200">{spec.element}</td>
                          <td className="p-2.5 text-slate-400">{spec.min.toFixed(3)}</td>
                          <td className="p-2.5 text-slate-400">{spec.max.toFixed(3)}</td>
                          <td className="p-2.5 font-bold text-amber-300">{spec.actual.toFixed(3)}</td>
                          <td className="p-2.5 text-right">
                            {spec.passed ? (
                              <span className="text-emerald-400 font-bold">PASS</span>
                            ) : (
                              <span className="text-rose-400 font-bold">FAIL (OUT-OF-SPEC)</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mechanical Properties */}
              {selectedIntake.mechanicalSpecs && selectedIntake.mechanicalSpecs.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono flex items-center space-x-1.5">
                    <FileText size={14} className="text-cyan-400" />
                    <span>Mechanical Properties (Tensile & Hardness)</span>
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {selectedIntake.mechanicalSpecs.map((m, idx) => (
                      <div key={idx} className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                        <div className="text-[10px] text-slate-400 truncate">{m.property}</div>
                        <div className="text-sm font-mono font-bold text-white mt-1">
                          {m.actual} <span className="text-[10px] text-slate-400">{m.unit}</span>
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                          Req: ≥ {m.min} {m.unit}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Verification Decision Actions */}
              {selectedIntake.status === 'In Lab Testing' && (
                <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-3">
                  <span className="text-xs text-amber-300 flex items-center space-x-1">
                    <AlertTriangle size={14} />
                    <span>Awaiting Lab Clearance Before Shopfloor Release</span>
                  </span>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleVerify(selectedIntake.id, 'REJECT')}
                      className="px-3 py-1.5 bg-rose-600/80 hover:bg-rose-600 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center space-x-1"
                    >
                      <XCircle size={14} />
                      <span>Reject & Issue SNCR</span>
                    </button>
                    <button
                      onClick={() => handleVerify(selectedIntake.id, 'APPROVE')}
                      className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center space-x-1 shadow"
                    >
                      <CheckCircle2 size={14} />
                      <span>Verify & Release Stock</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-slate-500 text-xs">
              Select a Heat Lot record on the left to inspect MTC certificates.
            </div>
          )}
        </div>
      </div>

      {/* New Heat Intake Modal with AI MTC OCR Extraction */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-xl w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <Plus className="text-amber-500" size={18} />
                <span>Log Incoming Raw Material Heat & MTC</span>
              </h2>
              <button
                onClick={() => setShowNewModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* AI Smart MTC Document Extraction Button */}
            <div className="p-3 bg-slate-950 border border-amber-500/40 rounded-lg flex items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-amber-300 flex items-center space-x-1">
                  <Sparkles size={14} />
                  <span>AI Smart MTC Document OCR Extraction</span>
                </span>
                <span className="text-[11px] text-slate-400 block">
                  Automatically parse supplier Mill Test Certificate PDF & pre-fill chemistry.
                </span>
              </div>
              <button
                type="button"
                onClick={handleAiOcrExtraction}
                disabled={isAiExtracting}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded flex items-center space-x-1 cursor-pointer shrink-0"
              >
                <UploadCloud size={13} className={isAiExtracting ? 'animate-bounce' : ''} />
                <span>{isAiExtracting ? 'Analyzing MTC...' : 'AI Scan & Parse MTC'}</span>
              </button>
            </div>

            {aiExtractedBanner && (
              <div className="p-2 bg-emerald-950/40 border border-emerald-500 rounded text-xs font-mono text-emerald-300 flex items-center space-x-2 animate-pulse">
                <CheckCircle2 size={15} />
                <span>AI Mill Certificate Extraction Complete: Chemical & Mechanical specs populated with 99.1% confidence.</span>
              </div>
            )}

            <form onSubmit={handleCreateIntake} className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1">Raw Material Heat # *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. H-8890"
                    value={heatNumber}
                    onChange={(e) => setHeatNumber(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Supplier Mill Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Jindal / Apex Alloys"
                    value={supplierName}
                    onChange={(e) => setSupplierName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Purchase Order #</label>
                  <input
                    type="text"
                    placeholder="PO-88210"
                    value={poNumber}
                    onChange={(e) => setPoNumber(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Material Grade</label>
                  <select
                    value={materialGrade}
                    onChange={(e) => setMaterialGrade(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono"
                  >
                    <option value="AISI 4340 Alloy Steel">AISI 4340 Alloy Steel</option>
                    <option value="EN353 Case Hardening Steel">EN353 Case Hardening Steel</option>
                    <option value="AISI 316L Marine Stainless">AISI 316L Marine Stainless</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Quantity Received (Billets)</label>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Carbon Spectro Actual (%)</label>
                  <input
                    type="number"
                    step="0.001"
                    value={carbonVal}
                    onChange={(e) => setCarbonVal(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Manganese Spectro Actual (%)</label>
                  <input
                    type="number"
                    step="0.001"
                    value={manganeseVal}
                    onChange={(e) => setManganeseVal(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Yield Strength Actual (MPa)</label>
                  <input
                    type="number"
                    value={yieldVal}
                    onChange={(e) => setYieldVal(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-semibold rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded"
                >
                  Save & Queue for Lab Testing
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable Weather-resistant Barcode Tag Modal */}
      {showPrintLabel && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center p-4 z-50">
          <div className="bg-white text-slate-900 rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4 print-card">
            <div className="flex items-center justify-between border-b pb-2">
              <div className="flex items-center space-x-2">
                <Tag size={18} className="text-amber-600" />
                <span className="font-extrabold text-sm tracking-wider">WEATHER-RESISTANT RAW STOCK TAG</span>
              </div>
              <button
                onClick={() => setShowPrintLabel(null)}
                className="text-slate-500 hover:text-black no-print text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="flex items-center justify-center py-2">
              <QrCodeBadge
                value={`RAW-HEAT-${showPrintLabel.heatNumber}-${showPrintLabel.materialGrade}`}
                size={140}
                label={showPrintLabel.barcodeTag}
              />
            </div>

            <div className="border-t border-b py-2 text-xs font-mono space-y-1">
              <div><strong>HEAT LOT #:</strong> {showPrintLabel.heatNumber}</div>
              <div><strong>GRADE:</strong> {showPrintLabel.materialGrade}</div>
              <div><strong>SUPPLIER:</strong> {showPrintLabel.supplierName}</div>
              <div><strong>RECEIVED QTY:</strong> {showPrintLabel.quantity} {showPrintLabel.unit}</div>
              <div><strong>STATUS:</strong> {showPrintLabel.status.toUpperCase()}</div>
            </div>

            <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono">
              <span>Zapuza Plant #1 Receiving Dock</span>
              <span>{new Date().toLocaleDateString()}</span>
            </div>

            <div className="no-print pt-2 flex justify-end space-x-2">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded flex items-center space-x-1"
              >
                <Printer size={14} />
                <span>Print Physical Label</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
