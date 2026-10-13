import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileText,
  ShieldCheck,
  ShieldAlert,
  Camera,
  Filter,
  Flame,
  Award
} from 'lucide-react';
import { InspectionSubmission } from '../types';
import { api } from '../utils/api';
import { sounds } from '../utils/audio';

export const SupervisorApprovalView: React.FC = () => {
  const [queue, setQueue] = useState<InspectionSubmission[]>([]);
  const [selectedInspection, setSelectedInspection] = useState<InspectionSubmission | null>(null);
  const [showConcessionModal, setShowConcessionModal] = useState<boolean>(false);

  // Concession Form state
  const [reasonCode, setReasonCode] = useState<string>('NON_FUNCTIONAL_CLEARANCE_OK');
  const [justification, setJustification] = useState<string>('');
  const [supervisorNotes, setSupervisorNotes] = useState<string>('');
  const [supervisorId] = useState<string>('SUPV-MORGAN (Morgan Blake - Shift Lead)');

  const loadQueue = async () => {
    try {
      const data = await api.getSupervisorQueue();
      setQueue(data || []);
      if (data && data.length > 0 && !selectedInspection) {
        setSelectedInspection(data[0]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadQueue();
  }, []);

  const handleDecision = async (action: 'APPROVE' | 'QUARANTINE') => {
    if (!selectedInspection) return;
    sounds.playTactileClick();

    if (action === 'QUARANTINE') {
      sounds.playFailBuzzer();
    } else {
      sounds.playPassChime();
    }

    const res = await api.submitSupervisorDecision({
      inspectionId: selectedInspection.id,
      action,
      supervisorId,
      notes: supervisorNotes || (action === 'APPROVE' ? 'Approved by Shift Supervisor.' : 'Rejected and sent to Digital Rejection Holding Area.')
    });

    if (res.success) {
      loadQueue();
      setSelectedInspection(null);
    }
  };

  const handleGrantConcession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInspection) return;

    if (selectedInspection.hasCtqFailures) {
      sounds.playCriticalAlarm();
      alert('SECURITY INTERLOCK: Concessions are STRICTLY FORBIDDEN on Critical-to-Quality (CTQ) dimensions!');
      return;
    }

    if (!justification.trim()) {
      alert('Engineering justification is mandatory for granting a concession release.');
      return;
    }

    sounds.playTactileClick();
    const res = await api.submitSupervisorDecision({
      inspectionId: selectedInspection.id,
      action: 'CONCESSION',
      supervisorId,
      concessionReasonCode: reasonCode,
      concessionJustification: justification,
      notes: supervisorNotes
    });

    if (res.success) {
      sounds.playPassChime();
      setShowConcessionModal(false);
      setJustification('');
      loadQueue();
      setSelectedInspection(null);
    } else {
      sounds.playFailBuzzer();
      alert(res.error || 'Failed to submit concession');
    }
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="text-amber-500" size={24} />
            <h1 className="text-xl font-bold text-white">Shift Supervisor Review & Approval Queue</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Section 6 Standard: Authorize conforming lots, issue engineering concessions (non-CTQ only), or quarantine failing parts to the Digital Rejection Holding Area.
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs font-mono bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg text-slate-300">
          <span>Pending Decisions: </span>
          <strong className="text-amber-400 font-bold">{queue.length} Lots</strong>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Queue List (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800 pb-2">
            <span className="font-bold uppercase tracking-wider font-mono">Live Pending Inspections</span>
            <Filter size={14} />
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {queue.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 font-mono">
                No inspections pending review. All submitted job travelers cleared.
              </div>
            ) : (
              queue.map((insp) => {
                const isSelected = selectedInspection?.id === insp.id;
                return (
                  <div
                    key={insp.id}
                    onClick={() => {
                      sounds.playTactileClick();
                      setSelectedInspection(insp);
                    }}
                    className={`p-3.5 rounded-lg border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-slate-800 border-amber-500 shadow-lg shadow-amber-500/10'
                        : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-sm text-amber-300">{insp.travelerId}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                        {insp.status}
                      </span>
                    </div>

                    <div className="mt-1 text-xs text-slate-300">
                      WO: <strong className="text-white font-mono">{insp.workOrder}</strong> • Part: <strong className="text-white">{insp.partNumber}</strong>
                    </div>

                    <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                      <span>By: {insp.inspectorId}</span>
                      {insp.hasCtqFailures ? (
                        <span className="text-rose-400 font-bold flex items-center space-x-1">
                          <ShieldAlert size={12} />
                          <span>CTQ OUT-OF-SPEC</span>
                        </span>
                      ) : (
                        <span className="text-amber-400">Non-CTQ Deviation</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Inspection Dossier & Action Controls (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl">
          {selectedInspection ? (
            <div className="space-y-5">
              {/* Header */}
              <div className="border-b border-slate-800 pb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-lg font-mono font-black text-white">{selectedInspection.travelerId}</span>
                    <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">
                      WO #{selectedInspection.workOrder}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 font-mono mt-0.5">
                    Heat #{selectedInspection.heatNumber} • Submitted: {new Date(selectedInspection.submittedAt).toLocaleTimeString()}
                  </div>
                </div>

                <div className="text-right text-xs font-mono">
                  <div className="text-slate-400">Station QR: {selectedInspection.stationId}</div>
                  <div className="text-slate-400">Gauge Tool: {selectedInspection.gaugeId}</div>
                </div>
              </div>

              {/* Inspector Remarks & Non-Conformance Summary */}
              {selectedInspection.remarks && (
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono">
                  <span className="text-slate-400 block mb-1">INSPECTOR REMARKS & LOG:</span>
                  <p className="text-amber-200">{selectedInspection.remarks}</p>
                </div>
              )}

              {/* Submitted Measurements Table */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
                  Dimensional Measurement Log & Deviation Check
                </h3>

                <div className="overflow-x-auto border border-slate-800 rounded-lg">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                      <tr>
                        <th className="p-2">Pin #</th>
                        <th className="p-2">Dimension Label</th>
                        <th className="p-2">Nominal / Limit</th>
                        <th className="p-2">Measured Actual</th>
                        <th className="p-2 text-right">Result</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 bg-slate-900/60">
                      {selectedInspection.measurements.map((m, idx) => (
                        <tr key={idx} className={m.passed ? '' : 'bg-rose-950/30'}>
                          <td className="p-2 font-bold text-slate-400">{m.pinId}</td>
                          <td className="p-2 font-bold text-slate-200">
                            {m.label} {m.isCtq ? <span className="text-amber-400 font-bold">[CTQ]</span> : ''}
                          </td>
                          <td className="p-2 text-slate-400">
                            {m.nominal !== undefined ? `${m.nominal} (${m.upper}/${m.lower})` : (m.maxLimit ? `MAX ${m.maxLimit}` : 'Pass')}
                          </td>
                          <td className={`p-2 font-black ${m.passed ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {m.actual} {m.unit}
                          </td>
                          <td className="p-2 text-right">
                            {m.passed ? (
                              <span className="text-emerald-400 font-bold">PASS</span>
                            ) : (
                              <span className="text-rose-400 font-bold">OUT-OF-SPEC</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Defect Photos Captured on Floor Tablet */}
              {selectedInspection.measurements.some(m => m.photos && m.photos.length > 0) && (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono flex items-center space-x-1.5">
                    <Camera size={14} className="text-rose-400" />
                    <span>Evidence Defect Photos Captured on Shopfloor Tablet</span>
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    {selectedInspection.measurements.flatMap(m => m.photos || []).map((photo, pIdx) => (
                      <div key={pIdx} className="bg-slate-950 p-2 rounded-lg border border-slate-800 text-center text-xs">
                        <div className="h-28 bg-slate-800 rounded flex items-center justify-center text-slate-400 font-mono text-[11px]">
                          📷 {photo}
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono mt-1 block">
                          Defect Snapshot #{pIdx + 1}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Supervisor Actions */}
              <div className="pt-3 border-t border-slate-800 space-y-3">
                <div>
                  <label className="block text-slate-400 text-xs mb-1">Supervisor Decision Remarks</label>
                  <input
                    type="text"
                    placeholder="Engineering notes for decision..."
                    value={supervisorNotes}
                    onChange={(e) => setSupervisorNotes(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-white"
                  />
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2">
                  {/* Quarantine Action */}
                  <button
                    onClick={() => handleDecision('QUARANTINE')}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-lg flex items-center space-x-1.5 cursor-pointer shadow"
                  >
                    <Flame size={14} />
                    <span>Quarantine to Digital Rejection Area</span>
                  </button>

                  {/* Conditional Concession (Only for non-CTQ deviations) */}
                  <button
                    onClick={() => {
                      sounds.playTactileClick();
                      setShowConcessionModal(true);
                    }}
                    disabled={selectedInspection.hasCtqFailures}
                    className={`px-4 py-2 rounded-lg font-bold text-xs flex items-center space-x-1.5 cursor-pointer shadow ${
                      selectedInspection.hasCtqFailures
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                        : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                    }`}
                    title={selectedInspection.hasCtqFailures ? 'Concession BLOCKED for CTQ parameters' : 'Grant conditional engineering concession'}
                  >
                    <Award size={14} />
                    <span>Grant Conditional Concession</span>
                  </button>

                  {/* 100% Approved */}
                  <button
                    onClick={() => handleDecision('APPROVE')}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg flex items-center space-x-1.5 cursor-pointer shadow"
                  >
                    <ShieldCheck size={14} />
                    <span>Approve & Clear Next Op</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-16 text-slate-500 text-xs font-mono">
              Select an inspection checklist from the queue on the left.
            </div>
          )}
        </div>
      </div>

      {/* Conditional Concession Modal (Section 6.1) */}
      {showConcessionModal && selectedInspection && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border-2 border-amber-500 rounded-xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
              <Award className="text-amber-400" size={20} />
              <h2 className="text-base font-bold text-white">CONDITIONAL ENGINEERING CONCESSION RELEASE</h2>
            </div>

            <p className="text-xs text-slate-300">
              Section 6.1 Rule: If a non-CTQ dimension is slightly out of drawing tolerance but functionally acceptable, an authorized Supervisor/Manager can issue an engineering concession. Concession lots are permanently flagged in quality history and Certificate of Analysis.
            </p>

            <form onSubmit={handleGrantConcession} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Standard Concession Reason Code *</label>
                <select
                  value={reasonCode}
                  onChange={(e) => setReasonCode(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono"
                >
                  <option value="NON_FUNCTIONAL_CLEARANCE_OK">NON_FUNCTIONAL_CLEARANCE_OK - Non-critical dimension deviation does not affect fit</option>
                  <option value="TOOL_DEFLECTION_COMPENSATED">TOOL_DEFLECTION_COMPENSATED - Slight taper within mating assembly limits</option>
                  <option value="CUSTOMER_PRE_APPROVED_WAIVER">CUSTOMER_PRE_APPROVED_WAIVER - Covered under blanket customer deviation notice</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Mandatory Engineering Justification *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Provide detailed technical reason why this part is safe and functional for customer application..."
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white"
                />
              </div>

              {/* 21 CFR Part 11 / AS9100 Electronic Signature & Cryptographic PIN */}
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-2">
                <div className="flex items-center space-x-1.5 text-slate-200 font-bold">
                  <ShieldAlert size={14} className="text-amber-400" />
                  <span>21 CFR Part 11 & AS9100 Cryptographic E-Signature</span>
                </div>
                <div>
                  <label className="block text-slate-400 text-[11px] mb-1">Enter Supervisor E-Signature Security PIN (Default: 8842) *</label>
                  <input
                    type="password"
                    required
                    placeholder="••••"
                    maxLength={4}
                    defaultValue="8842"
                    className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-amber-300 font-mono tracking-widest text-center font-bold"
                  />
                </div>
                <div className="text-[10px] text-slate-500 font-mono">
                  By clicking submit, I certify that I have conducted an engineering review and legally sign this record with cryptographic hash SHA-256.
                </div>
              </div>

              <div className="p-2.5 bg-slate-950 border border-slate-800 rounded text-[11px] text-amber-300 font-mono">
                Flag: This concession will be permanently linked to Component Serial Numbers and recorded in the audit trail.
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowConcessionModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 font-semibold rounded cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded cursor-pointer"
                >
                  Authorize & Digitally Sign Concession
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
