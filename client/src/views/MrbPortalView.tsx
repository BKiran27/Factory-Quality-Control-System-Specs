import React, { useEffect, useState } from 'react';
import {
  Scale,
  Flame,
  Wrench,
  Trash2,
  Undo2,
  FileCheck,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { MrbCase } from '../types';
import { api } from '../utils/api';
import { sounds } from '../utils/audio';

export const MrbPortalView: React.FC = () => {
  const [cases, setCases] = useState<MrbCase[]>([]);
  const [selectedCase, setSelectedCase] = useState<MrbCase | null>(null);
  const [activeDisposition, setActiveDisposition] = useState<'REWORK' | 'SCRAP' | 'RETURN_TO_VENDOR' | 'CUSTOMER_CONCESSION' | null>(null);

  // Form inputs
  const [reworkInstructions, setReworkInstructions] = useState('Corrective skim cut on face + polishing to bring runout within 0.015mm.');
  const [scrapCostCode, setScrapCostCode] = useState('SCRAP-CC-409');
  const [notes, setNotes] = useState('');
  const [reviewedBy] = useState('MRB Board (Plant Mgr Rajesh + Quality Head Robert)');

  const loadCases = async () => {
    try {
      const data = await api.getMrbCases();
      setCases(data || []);
      if (data && data.length > 0 && !selectedCase) {
        setSelectedCase(data[0]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadCases();
  }, []);

  const handleExecuteDisposition = async () => {
    if (!selectedCase || !activeDisposition) return;
    sounds.playTactileClick();

    const payload = {
      dispositionType: activeDisposition,
      reviewedBy,
      reworkInstructions,
      costCode: scrapCostCode,
      customerAuthDoc: 'CUSTOMER_CONCESSION_AUTH_PAC.pdf',
      notes: notes || `MRB executed ${activeDisposition} disposition.`
    };

    if (activeDisposition === 'SCRAP') {
      sounds.playFailBuzzer();
    } else {
      sounds.playPassChime();
    }

    const res = await api.submitMrbDisposition(selectedCase.id, payload);
    if (res.success) {
      setActiveDisposition(null);
      loadCases();
      setSelectedCase(res.mrbCase);
    }
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <Scale className="text-amber-500" size={24} />
            <h1 className="text-xl font-bold text-white">Digital Rejection Holding Area & MRB Portal</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Section 6.3 Standard: Material Review Board (Plant Mgr, Quality Head, Production Lead) disposition for quarantined lots.
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs font-mono bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg text-slate-300">
          <Flame size={14} className="text-rose-400" />
          <span>Quarantined Cases: </span>
          <strong className="text-rose-400 font-bold">{cases.length} Lots</strong>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Quarantined Cases List (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider font-mono text-slate-400 border-b border-slate-800 pb-2">
            Quarantine Inventory (Bay 107)
          </div>

          <div className="space-y-2">
            {cases.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 font-mono">
                No active quarantined lots in holding area.
              </div>
            ) : (
              cases.map((c) => {
                const isSelected = selectedCase?.id === c.id;
                const isResolved = c.dispositionStatus !== 'Pending MRB Review';

                return (
                  <div
                    key={c.id}
                    onClick={() => {
                      sounds.playTactileClick();
                      setSelectedCase(c);
                    }}
                    className={`p-3.5 rounded-lg border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-slate-800 border-amber-500 shadow-lg'
                        : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-sm text-rose-300">{c.id}</span>
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                          isResolved
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        }`}
                      >
                        {c.dispositionStatus}
                      </span>
                    </div>

                    <div className="mt-1 text-xs text-slate-200">
                      Traveler: <strong className="font-mono text-amber-300">{c.travelerId}</strong> • Part: <strong className="font-mono text-white">{c.partNumber}</strong>
                    </div>

                    <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">
                      {c.rejectionReason}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Selected MRB Case Disposition Panel (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl">
          {selectedCase ? (
            <div className="space-y-5">
              {/* Header */}
              <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-lg font-mono font-black text-white">{selectedCase.id}</span>
                    <span className="text-xs bg-rose-950/80 text-rose-300 border border-rose-700/60 px-2 py-0.5 rounded font-mono font-bold">
                      QUARANTINE DISPOSITION
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 font-mono mt-1">
                    Job Traveler: {selectedCase.travelerId} • Work Order: {selectedCase.workOrder} • Heat #{selectedCase.heatLot}
                  </div>
                </div>

                <div className="text-right text-xs font-mono">
                  <div className="text-slate-400">Batch Qty: <strong className="text-white">{selectedCase.batchSize} pcs</strong></div>
                </div>
              </div>

              {/* Rejection Details */}
              <div className="p-3 bg-rose-950/30 border border-rose-800/60 rounded-lg text-xs space-y-1">
                <span className="text-rose-400 font-mono font-bold block">NON-CONFORMANCE ROOT CAUSE:</span>
                <p className="text-slate-200">{selectedCase.rejectionReason}</p>
                {selectedCase.notes && <p className="text-slate-400 text-[11px] font-mono">{selectedCase.notes}</p>}
              </div>

              {/* Existing Disposition Banner if already resolved */}
              {selectedCase.dispositionStatus !== 'Pending MRB Review' && (
                <div className="p-3 bg-emerald-950/30 border border-emerald-600 rounded-lg text-xs space-y-1 font-mono">
                  <div className="text-emerald-300 font-bold flex items-center space-x-2">
                    <CheckCircle2 size={16} />
                    <span>DISPOSITION EXECUTED: {selectedCase.dispositionStatus}</span>
                  </div>
                  <div className="text-slate-300 text-[11px]">
                    Authorized By: {selectedCase.dispositionedBy} on {new Date(selectedCase.dispositionDate || '').toLocaleString()}
                  </div>
                  {selectedCase.reworkOrder && <div>Rework Order: <strong className="text-amber-300">{selectedCase.reworkOrder}</strong></div>}
                  {selectedCase.scrapCostCode && <div>Scrap Cost Code: <strong className="text-rose-300">{selectedCase.scrapCostCode}</strong> (Scrap Bin Verified)</div>}
                  {selectedCase.debitNoteNumber && <div>Vendor Debit Note: <strong className="text-cyan-300">{selectedCase.debitNoteNumber}</strong></div>}
                </div>
              )}

              {/* 4 MRB Disposition Options (Section 6.3) */}
              {selectedCase.dispositionStatus === 'Pending MRB Review' && (
                <div className="space-y-4 pt-2">
                  <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
                    Select Material Review Board (MRB) Digital Disposition:
                  </h3>

                  <div className="grid grid-cols-2 gap-3">
                    {/* Option 1: Rework Order Generation */}
                    <button
                      onClick={() => {
                        sounds.playTactileClick();
                        setActiveDisposition('REWORK');
                      }}
                      className={`p-3 rounded-lg border text-left text-xs transition-all cursor-pointer ${
                        activeDisposition === 'REWORK'
                          ? 'bg-amber-500/20 border-amber-500 text-white shadow'
                          : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center space-x-2 font-bold text-amber-300 mb-1">
                        <Wrench size={16} />
                        <span>1. Rework Order</span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Generates dedicated corrective rework traveler Op 25 for corrective machining/polishing.
                      </p>
                    </button>

                    {/* Option 2: Scrap Disposition */}
                    <button
                      onClick={() => {
                        sounds.playTactileClick();
                        setActiveDisposition('SCRAP');
                      }}
                      className={`p-3 rounded-lg border text-left text-xs transition-all cursor-pointer ${
                        activeDisposition === 'SCRAP'
                          ? 'bg-rose-500/20 border-rose-500 text-white shadow'
                          : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center space-x-2 font-bold text-rose-400 mb-1">
                        <Trash2 size={16} />
                        <span>2. Scrap Material</span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Permanently writes off material, logs scrap cost codes, requires physical scrap bin verification.
                      </p>
                    </button>

                    {/* Option 3: Return to Vendor (RTV) */}
                    <button
                      onClick={() => {
                        sounds.playTactileClick();
                        setActiveDisposition('RETURN_TO_VENDOR');
                      }}
                      className={`p-3 rounded-lg border text-left text-xs transition-all cursor-pointer ${
                        activeDisposition === 'RETURN_TO_VENDOR'
                          ? 'bg-cyan-500/20 border-cyan-500 text-white shadow'
                          : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center space-x-2 font-bold text-cyan-300 mb-1">
                        <Undo2 size={16} />
                        <span>3. Return to Vendor</span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Routes stock back to raw dock for supplier return and issues debit note request.
                      </p>
                    </button>

                    {/* Option 4: Customer Special Concession */}
                    <button
                      onClick={() => {
                        sounds.playTactileClick();
                        setActiveDisposition('CUSTOMER_CONCESSION');
                      }}
                      className={`p-3 rounded-lg border text-left text-xs transition-all cursor-pointer ${
                        activeDisposition === 'CUSTOMER_CONCESSION'
                          ? 'bg-emerald-500/20 border-emerald-500 text-white shadow'
                          : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center space-x-2 font-bold text-emerald-300 mb-1">
                        <FileCheck size={16} />
                        <span>4. Customer Waiver</span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Holds batch until written customer concession approval is attached to the record.
                      </p>
                    </button>
                  </div>

                  {/* Disposition Form Detail */}
                  {activeDisposition === 'REWORK' && (
                    <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-lg space-y-2 text-xs">
                      <label className="block text-slate-400 font-bold">Rework Machining Instructions</label>
                      <textarea
                        rows={2}
                        value={reworkInstructions}
                        onChange={(e) => setReworkInstructions(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white"
                      />
                    </div>
                  )}

                  {activeDisposition === 'SCRAP' && (
                    <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-lg space-y-2 text-xs">
                      <label className="block text-slate-400 font-bold">Scrap Cost Allocation Code</label>
                      <input
                        type="text"
                        value={scrapCostCode}
                        onChange={(e) => setScrapCostCode(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white font-mono"
                      />
                    </div>
                  )}

                  {activeDisposition && (
                    <div className="flex justify-end pt-2">
                      <button
                        onClick={handleExecuteDisposition}
                        className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg shadow-lg cursor-pointer"
                      >
                        Sign & Execute MRB Disposition
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-16 text-slate-500 text-xs font-mono">
              Select a quarantined lot from the left to review MRB options.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
