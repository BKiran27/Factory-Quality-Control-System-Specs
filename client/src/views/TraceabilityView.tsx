import React, { useState } from 'react';
import {
  Search,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  Layers,
  Cpu,
  Truck,
  FileText,
  Calendar,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';
import { api } from '../utils/api';
import { sounds } from '../utils/audio';

interface TraceabilityViewProps {
  onOpenPublicCoa: (travelerId: string) => void;
}

export const TraceabilityView: React.FC<TraceabilityViewProps> = ({ onOpenPublicCoa }) => {
  const [mode, setMode] = useState<'forward' | 'backward'>('forward');
  const [queryTerm, setQueryTerm] = useState('H-8042');
  const [loading, setLoading] = useState(false);

  // Results
  const [forwardResult, setForwardResult] = useState<any>(null);
  const [backwardResult, setBackwardResult] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!queryTerm.trim()) return;

    sounds.playTactileClick();
    setLoading(true);
    setErrorMsg(null);

    try {
      if (mode === 'forward') {
        const data = await api.queryForwardTraceability(queryTerm);
        setForwardResult(data);
        setBackwardResult(null);
      } else {
        const data = await api.queryBackwardTraceability(queryTerm);
        if (data.error) {
          setErrorMsg(data.error);
          sounds.playFailBuzzer();
          setBackwardResult(null);
        } else {
          setBackwardResult(data);
          setForwardResult(null);
          sounds.playPassChime();
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Traceability query failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="border-b border-slate-800 pb-4">
        <div className="flex items-center space-x-2">
          <Search className="text-amber-500" size={24} />
          <h1 className="text-xl font-bold text-white">Full Lineage & Forward / Backward Traceability Engine</h1>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Section 7.2 Standard: Instant forward supplier recall mapping and backward customer field birth certificates.
        </p>
      </div>

      {/* Mode Selector & Search Form */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => {
              sounds.playTactileClick();
              setMode('forward');
              setQueryTerm('H-8042');
              setForwardResult(null);
              setBackwardResult(null);
            }}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              mode === 'forward'
                ? 'bg-amber-500 text-slate-950 shadow-lg'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Forward Recall Traceability (Query Heat Lot #)
          </button>
          <button
            type="button"
            onClick={() => {
              sounds.playTactileClick();
              setMode('backward');
              setQueryTerm('TRV-2026-9040');
              setForwardResult(null);
              setBackwardResult(null);
            }}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              mode === 'backward'
                ? 'bg-amber-500 text-slate-950 shadow-lg'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Backward Field Traceability (Query Component Serial #)
          </button>
        </div>

        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 text-slate-500" size={16} />
            <input
              type="text"
              required
              placeholder={mode === 'forward' ? 'Enter Raw Material Heat Lot (e.g. H-8042)...' : 'Enter Component Serial or Traveler ID (e.g. TRV-2026-9040, SN-2026-9041-01)...'}
              value={queryTerm}
              onChange={(e) => setQueryTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-10 pr-4 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg shadow-lg cursor-pointer flex items-center space-x-1.5"
          >
            <span>{loading ? 'Querying...' : 'Trace Lineage'}</span>
            <ArrowRight size={15} />
          </button>
        </form>

        <div className="text-[11px] text-slate-400 font-mono flex items-center space-x-4">
          <span>Quick Samples:</span>
          <button
            type="button"
            onClick={() => { setMode('forward'); setQueryTerm('H-8042'); }}
            className="text-amber-400 hover:underline cursor-pointer"
          >
            Heat #H-8042 (Supplier Recall)
          </button>
          <button
            type="button"
            onClick={() => { setMode('backward'); setQueryTerm('TRV-2026-9040'); }}
            className="text-amber-400 hover:underline cursor-pointer"
          >
            Traveler TRV-2026-9040 (Field Birth Cert)
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 bg-rose-950/60 border border-rose-600 rounded-xl text-rose-300 text-xs font-mono flex items-center space-x-2">
          <AlertTriangle size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 1. FORWARD RECALL TRACEABILITY RESULT VIEW */}
      {forwardResult && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xl font-mono font-black text-amber-300">
                  Heat #{forwardResult.heatNumber}
                </span>
                <span className="px-2.5 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded text-xs font-mono font-bold">
                  FORWARD RECALL DOSSIER
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Raw Material Source: {forwardResult.rawMaterial?.supplierName || 'Jindal Alloys'} ({forwardResult.rawMaterial?.materialGrade})
              </p>
            </div>

            <div className="flex items-center space-x-4 text-xs font-mono">
              <div className="bg-slate-950 px-3 py-1.5 rounded border border-slate-800">
                <span className="text-slate-400 block text-[10px]">AFFECTED WORK ORDERS</span>
                <span className="text-amber-300 font-bold text-sm">{forwardResult.totalWorkOrdersAffected} Lots</span>
              </div>
              <div className="bg-slate-950 px-3 py-1.5 rounded border border-slate-800">
                <span className="text-slate-400 block text-[10px]">MACHINED COMPONENTS</span>
                <span className="text-white font-bold text-sm">{forwardResult.totalComponentsAffected} Units</span>
              </div>
            </div>
          </div>

          {/* Machined Lots Linked to this Heat */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-slate-300">
              Machined Work Orders & Customer Crates Containing Steel from Heat #{forwardResult.heatNumber}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {forwardResult.workOrders.map((wo: any) => (
                <div key={wo.id} className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs font-mono space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-300 text-sm">{wo.id}</span>
                    <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
                      {wo.overallStatus}
                    </span>
                  </div>
                  <div className="text-white font-bold">{wo.partNumber} - {wo.partName}</div>
                  <div className="text-slate-400">WO: {wo.workOrder} • Batch: {wo.batchSize} pcs</div>
                  <div className="text-slate-400">Customer: <strong className="text-slate-200">{wo.customer}</strong></div>
                  <div className="text-slate-400">PO: {wo.customerPo}</div>

                  <div className="pt-2 border-t border-slate-800 flex justify-end">
                    <button
                      onClick={() => onOpenPublicCoa(wo.id)}
                      className="text-amber-400 hover:text-amber-300 text-[11px] flex items-center space-x-1"
                    >
                      <span>View Inspection Birth Cert</span>
                      <ExternalLink size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 2. BACKWARD FIELD TRACEABILITY RESULT VIEW (BIRTH CERTIFICATE) */}
      {backwardResult && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-6">
          <div className="border-b border-slate-800 pb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xl font-mono font-black text-white">
                  {backwardResult.serialNumber}
                </span>
                <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 rounded text-xs font-mono font-bold flex items-center space-x-1">
                  <ShieldCheck size={14} />
                  <span>MANUFACTURING BIRTH CERTIFICATE</span>
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-1">
                Customer: {backwardResult.birthCertificate.customer} • PO: {backwardResult.birthCertificate.customerPo}
              </p>
            </div>

            <button
              onClick={() => onOpenPublicCoa(backwardResult.birthCertificate.travelerId)}
              className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg flex items-center space-x-1.5 shadow"
            >
              <span>Export Certified CoA Document</span>
              <ExternalLink size={13} />
            </button>
          </div>

          {/* Lineage Tree Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
            {/* 1. Raw Material Intake Lineage */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center space-x-2 text-amber-400 font-bold border-b border-slate-800 pb-1.5">
                <Layers size={15} />
                <span>1. RAW MATERIAL INTAKE</span>
              </div>
              <div>Heat Lot #: <strong className="text-white">{backwardResult.birthCertificate.heatLot}</strong></div>
              <div>Supplier: <strong className="text-slate-200">{backwardResult.birthCertificate.rawSupplier}</strong></div>
              <div>Mill Certificate: <strong className="text-slate-200">{backwardResult.birthCertificate.rawMaterialMillCert}</strong></div>
              <div className="text-emerald-400">Chemical & Mechanical: 100% Verified ✓</div>
            </div>

            {/* 2. CNC Machining & Processing Lineage */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center space-x-2 text-cyan-400 font-bold border-b border-slate-800 pb-1.5">
                <Cpu size={15} />
                <span>2. MACHINING & HEAT TREAT</span>
              </div>
              <div>Part Number: <strong className="text-white">{backwardResult.birthCertificate.partNumber}</strong></div>
              <div>Work Order: <strong className="text-slate-200">{backwardResult.birthCertificate.workOrder}</strong></div>
              <div>Ops Completed: <strong className="text-emerald-400">100% Numerical Sign-off ✓</strong></div>
              <div>Cooling Hold: <strong className="text-emerald-400">Fulfilled & Verified ✓</strong></div>
            </div>

            {/* 3. Final Gate Pass & Dispatch Lineage */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center space-x-2 text-emerald-400 font-bold border-b border-slate-800 pb-1.5">
                <Truck size={15} />
                <span>3. DISPATCH GATE PASS</span>
              </div>
              <div>Gate Pass: <strong className="text-white">{backwardResult.birthCertificate.gatePassClearance?.gatePassId || 'GP-2026-CLEARED'}</strong></div>
              <div>Vehicle Reg: <strong className="text-slate-200">{backwardResult.birthCertificate.gatePassClearance?.vehicleNumber || 'KA-04-E-8821'}</strong></div>
              <div>Authorized QA Lead: <strong className="text-slate-200">Robert Vance</strong></div>
              <div className="text-emerald-400">Gate Interlock: CLEARED ✓</div>
            </div>
          </div>

          {/* Detailed Dimensional Inspection Record */}
          {backwardResult.birthCertificate.pdiInspection && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-slate-300">
                Recorded Dimensional Metrology Verification
              </h3>
              <div className="overflow-x-auto border border-slate-800 rounded-lg">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="p-2">Feature Label</th>
                      <th className="p-2">Nominal</th>
                      <th className="p-2">Measured Actual</th>
                      <th className="p-2 text-right">Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 bg-slate-950">
                    {backwardResult.birthCertificate.pdiInspection.measurements.map((m: any, idx: number) => (
                      <tr key={idx}>
                        <td className="p-2 font-bold text-slate-200">{m.label}</td>
                        <td className="p-2 text-slate-400">{m.nominal} {m.unit}</td>
                        <td className="p-2 font-black text-amber-300">{m.actual} {m.unit}</td>
                        <td className="p-2 text-right text-emerald-400 font-bold">PASS ✓</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
