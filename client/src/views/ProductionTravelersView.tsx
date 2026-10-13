import React, { useEffect, useState } from 'react';
import {
  RefreshCw,
  Clock,
  Lock,
  Unlock,
  AlertTriangle,
  CheckCircle2,
  Hourglass,
  ArrowRight,
  ShieldCheck,
  UserCheck,
  Flame,
  Printer
} from 'lucide-react';
import { JobTraveler, OperationStep } from '../types';
import { api } from '../utils/api';
import { sounds } from '../utils/audio';
import { QrCodeBadge } from '../components/QrCodeBadge';

export const ProductionTravelersView: React.FC = () => {
  const [travelers, setTravelers] = useState<JobTraveler[]>([]);
  const [selectedTraveler, setSelectedTraveler] = useState<JobTraveler | null>(null);
  const [holdAlert, setHoldAlert] = useState<string | null>(null);
  const [sequenceAlert, setSequenceAlert] = useState<string | null>(null);
  const [showPrintTraveler, setShowPrintTraveler] = useState<JobTraveler | null>(null);

  // Time ticker to update countdown timers smoothly
  const [currentTime, setCurrentTime] = useState<number>(Date.now());

  const loadTravelers = async () => {
    try {
      const data = await api.getJobTravelers();
      setTravelers(data || []);
      if (data && data.length > 0 && !selectedTraveler) {
        setSelectedTraveler(data[0]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadTravelers();
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Operation Step Advance Handler (Enforcing Sequence and Hold Timer Interlocks!)
  const handleCompleteOp = async (op: OperationStep) => {
    if (!selectedTraveler) return;
    sounds.playTactileClick();

    // Check if this operation is currently blocked by an active hold timer from prior op!
    const opIndex = selectedTraveler.operations.findIndex(o => o.opNumber === op.opNumber);
    if (opIndex > 0) {
      const prevOp = selectedTraveler.operations[opIndex - 1];
      if (prevOp.holdDurationMinutes && prevOp.holdTargetRelease) {
        const releaseTime = new Date(prevOp.holdTargetRelease).getTime();
        const diffMs = releaseTime - currentTime;
        if (diffMs > 0) {
          // INTERLOCK VIOLATION! (Section 8.2)
          sounds.playFailBuzzer();
          const totalSec = Math.floor(diffMs / 1000);
          const hours = Math.floor(totalSec / 3600);
          const mins = Math.floor((totalSec % 3600) / 60);
          const secs = totalSec % 60;
          setHoldAlert(
            `MANDATORY COOLING HOLD ACTIVE (${hours} hr ${mins} min ${secs} sec remaining)! Tablet screen locked. Operator is prevented from starting ${op.operationName} until thermal cooling hold reaches zero.`
          );
          return;
        }
      }
    }

    // Call API (server checks strict numerical sequence: Op 10 -> Op 20 -> Op 30...)
    const res = await api.completeOperation(
      selectedTraveler.id,
      op.opNumber,
      'OP-104 (Sunil M.)',
      op.machineId
    );

    if (res.error) {
      sounds.playFailBuzzer();
      setSequenceAlert(res.error);
    } else {
      sounds.playPassChime();
      setHoldAlert(null);
      setSequenceAlert(null);
      loadTravelers();
      setSelectedTraveler(res.traveler);
    }
  };

  // First Piece Signoff
  const handleSignFirstPiece = async (opNumber: number) => {
    if (!selectedTraveler) return;
    sounds.playTactileClick();
    const res = await api.signOffFirstPiece(
      selectedTraveler.id,
      opNumber,
      'QA-LEAD-CARTER',
      'First-piece setup dimensions verified 100% within drawing limits. Station released from Setup Mode.'
    );
    if (res.success) {
      sounds.playPassChime();
      loadTravelers();
      setSelectedTraveler(res.traveler);
    }
  };

  // Format hold remaining time
  const getRemainingHoldString = (targetRelease: string) => {
    const diffMs = new Date(targetRelease).getTime() - currentTime;
    if (diffMs <= 0) return 'Hold Fulfilled (0 min)';
    const totalSec = Math.floor(diffMs / 1000);
    const hours = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    return `${hours > 0 ? `${hours}h ` : ''}${mins}m ${secs}s remaining`;
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <RefreshCw className="text-amber-500" size={24} />
            <h1 className="text-xl font-bold text-white">Digital Production Travelers & Sequential Routing</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Section 7 & 8 Standard: Strict numerical operation sequence lockouts, thermal cooling countdown timers, and first-piece quality clearances.
          </p>
        </div>

        {selectedTraveler && (
          <button
            onClick={() => {
              sounds.playTactileClick();
              setShowPrintTraveler(selectedTraveler);
            }}
            className="flex items-center space-x-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer self-start sm:self-auto"
          >
            <Printer size={14} />
            <span>Print Job Traveler Sheet</span>
          </button>
        )}
      </div>

      {/* Critical Hold Interlock Alert Banner (Flashes bright red when an operator tries to start before timer reaches zero!) */}
      {holdAlert && (
        <div className="bg-rose-950 border-4 border-rose-500 rounded-xl p-5 shadow-2xl animate-pulse flex items-start space-x-4">
          <Flame className="text-rose-400 shrink-0 mt-0.5" size={28} />
          <div className="space-y-1">
            <div className="text-sm font-black text-white font-mono tracking-wide">
              SECTION 8.2 AUTOMATED COOLING HOLD INTERLOCK ACTIVE
            </div>
            <p className="text-xs text-rose-200 font-mono">
              {holdAlert}
            </p>
            <button
              onClick={() => setHoldAlert(null)}
              className="mt-2 px-3 py-1 bg-rose-800 text-rose-100 text-[11px] font-bold rounded font-mono hover:bg-rose-700"
            >
              Acknowledge & Close Banner
            </button>
          </div>
        </div>
      )}

      {/* Sequence Lockout Alert Banner */}
      {sequenceAlert && (
        <div className="bg-amber-950 border-2 border-amber-500 rounded-xl p-4 shadow-xl flex items-start space-x-3">
          <AlertTriangle className="text-amber-400 shrink-0 mt-0.5" size={22} />
          <div className="space-y-1">
            <div className="text-xs font-bold text-amber-300 font-mono uppercase">
              Strict Sequential Routing Enforcement
            </div>
            <p className="text-xs text-slate-200 font-mono">{sequenceAlert}</p>
            <button
              onClick={() => setSequenceAlert(null)}
              className="mt-1 px-2.5 py-0.5 bg-amber-800 text-amber-200 text-[11px] font-bold rounded"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Traveler Selector (4 cols) */}
        <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider font-mono text-slate-400 border-b border-slate-800 pb-2">
            Active Digital Job Travelers
          </div>

          <div className="space-y-2">
            {travelers.map((trv) => {
              const isSelected = selectedTraveler?.id === trv.id;
              const hasActiveHold = trv.operations.some(o => o.holdStatus === 'Active Hold');

              return (
                <div
                  key={trv.id}
                  onClick={() => {
                    sounds.playTactileClick();
                    setSelectedTraveler(trv);
                    setHoldAlert(null);
                    setSequenceAlert(null);
                  }}
                  className={`p-3.5 rounded-lg border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-slate-800 border-amber-500 shadow'
                      : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-sm text-amber-300">{trv.id}</span>
                    {hasActiveHold ? (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center space-x-1">
                        <Hourglass size={11} className="animate-spin" />
                        <span>COOLING HOLD</span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded font-bold bg-slate-800 text-slate-300">
                        {trv.overallStatus}
                      </span>
                    )}
                  </div>

                  <div className="mt-1 text-xs text-white font-medium">
                    {trv.partNumber} - {trv.partName}
                  </div>

                  <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                    <span>WO: {trv.workOrder}</span>
                    <span>Heat #{trv.heatLot} • Qty: {trv.batchSize}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Sequential Operations Detail (8 cols) */}
        <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl">
          {selectedTraveler ? (
            <div className="space-y-6">
              {/* Traveler Top Bar */}
              <div className="border-b border-slate-800 pb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xl font-mono font-black text-white">{selectedTraveler.id}</span>
                    <span className="text-xs bg-slate-800 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded font-mono font-bold">
                      {selectedTraveler.partNumber}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      PO: {selectedTraveler.customerPo}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 font-mono mt-1">
                    Customer: <strong className="text-slate-200">{selectedTraveler.customer}</strong> • Target Dispatch: {new Date(selectedTraveler.targetDispatch).toLocaleDateString()}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <QrCodeBadge value={selectedTraveler.barcode} size={64} label={selectedTraveler.barcode} />
                </div>
              </div>

              {/* Master Process Routing Sequence */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-slate-300">
                    Master Process Routing Sequence (Op 10 → Op 70)
                  </h3>
                  <span className="text-[11px] text-slate-500 font-mono">
                    Sequential Gatekeeping Active
                  </span>
                </div>

                <div className="space-y-3">
                  {selectedTraveler.operations.map((op, idx) => {
                    const isCompleted = op.status === 'Completed';
                    const isHolding = op.status === 'Holding (Cooling/Curing)';
                    const hasActiveHold = op.holdStatus === 'Active Hold' && op.holdTargetRelease;
                    const isNextInLine = !isCompleted && (idx === 0 || selectedTraveler.operations[idx - 1].status === 'Completed');

                    return (
                      <div
                        key={op.opNumber}
                        className={`p-4 rounded-xl border transition-all ${
                          isCompleted
                            ? 'bg-slate-950/60 border-emerald-900/40 text-slate-300'
                            : isHolding || hasActiveHold
                            ? 'bg-amber-950/20 border-amber-500/60 shadow-lg'
                            : isNextInLine
                            ? 'bg-slate-800/80 border-amber-500/80 shadow-md ring-1 ring-amber-500/40'
                            : 'bg-slate-950/40 border-slate-800 text-slate-600'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-start space-x-3">
                            <span
                              className={`w-7 h-7 rounded-full flex items-center justify-center font-mono font-black text-xs shrink-0 ${
                                isCompleted
                                  ? 'bg-emerald-500 text-slate-950'
                                  : isHolding || hasActiveHold
                                  ? 'bg-amber-500 text-slate-950'
                                  : isNextInLine
                                  ? 'bg-amber-400 text-slate-950 ring-2 ring-amber-300'
                                  : 'bg-slate-800 text-slate-500'
                              }`}
                            >
                              {op.opNumber}
                            </span>
                            <div>
                              <div className="text-sm font-bold text-white flex items-center space-x-2">
                                <span>{op.operationName}</span>
                              </div>
                              <div className="text-xs text-slate-400 font-mono mt-0.5">
                                Machine: <strong className="text-slate-200">{op.machineId}</strong>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center space-x-3">
                            {isCompleted ? (
                              <span className="flex items-center space-x-1 text-emerald-400 font-mono text-xs font-bold">
                                <CheckCircle2 size={16} />
                                <span>COMPLETED</span>
                              </span>
                            ) : isHolding ? (
                              <span className="flex items-center space-x-1 text-amber-400 font-mono text-xs font-bold">
                                <Hourglass size={16} className="animate-spin" />
                                <span>INTERLOCKED (COOLING)</span>
                              </span>
                            ) : isNextInLine ? (
                              <button
                                onClick={() => handleCompleteOp(op)}
                                className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg shadow cursor-pointer flex items-center space-x-1"
                              >
                                <span>Advance Op {op.opNumber}</span>
                                <ArrowRight size={14} />
                              </button>
                            ) : (
                              <span className="flex items-center space-x-1 text-slate-500 font-mono text-xs">
                                <Lock size={14} />
                                <span>LOCKED (PRIOR OP PENDING)</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Hold Timer Countdown Banner (Section 8.2) */}
                        {hasActiveHold && op.holdTargetRelease && (
                          <div className="mt-3 p-3 bg-amber-950/40 border border-amber-500 rounded-lg flex items-center justify-between text-xs font-mono">
                            <div className="flex items-center space-x-2 text-amber-300 font-bold">
                              <Hourglass size={15} className="animate-spin" />
                              <span>MANDATORY COOLING HOLD TIMER RUNNING</span>
                            </div>
                            <span className="text-amber-400 font-black text-sm bg-slate-950 px-2 py-0.5 rounded border border-amber-500/50">
                              {getRemainingHoldString(op.holdTargetRelease)}
                            </span>
                          </div>
                        )}

                        {/* First-Piece Inspection Details (Section 9.1) */}
                        {op.firstPieceInspection ? (
                          <div className="mt-2 pt-2 border-t border-slate-800 text-[11px] font-mono text-emerald-400 flex items-center space-x-1">
                            <ShieldCheck size={13} />
                            <span>First-Piece Sign-off: Released from Setup Mode by {op.firstPieceInspection.inspectedBy}</span>
                          </div>
                        ) : isNextInLine && !isCompleted && (
                          <div className="mt-2 pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                            <span className="text-slate-400 font-mono text-[11px]">Setup Mode Active</span>
                            <button
                              onClick={() => handleSignFirstPiece(op.opNumber)}
                              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/40 text-[11px] font-mono rounded cursor-pointer"
                            >
                              QA First-Piece Sign-Off
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-16 text-slate-500 text-xs font-mono">
              Select a job traveler to inspect operations and hold timers.
            </div>
          )}
        </div>
      </div>

      {/* Printable Job Traveler Sheet Modal */}
      {showPrintTraveler && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center p-4 z-50">
          <div className="bg-white text-slate-900 rounded-xl p-6 max-w-2xl w-full shadow-2xl space-y-4 print-card">
            <div className="flex items-center justify-between border-b pb-2">
              <div>
                <h2 className="text-lg font-black tracking-wide">DIGITAL JOB TRAVELER SHEET</h2>
                <div className="text-xs font-mono text-slate-600">ZAPUZA PRECISION ENGINEERING LLP</div>
              </div>
              <button
                onClick={() => setShowPrintTraveler(null)}
                className="text-slate-500 hover:text-black no-print font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <div className="flex justify-between items-center bg-slate-50 p-3 rounded border">
              <div className="text-xs font-mono space-y-1">
                <div><strong>TRAVELER ID:</strong> {showPrintTraveler.id}</div>
                <div><strong>WORK ORDER:</strong> {showPrintTraveler.workOrder}</div>
                <div><strong>PART #:</strong> {showPrintTraveler.partNumber} - {showPrintTraveler.partName}</div>
                <div><strong>HEAT LOT #:</strong> {showPrintTraveler.heatLot}</div>
                <div><strong>BATCH SIZE:</strong> {showPrintTraveler.batchSize} pcs</div>
              </div>
              <QrCodeBadge
                value={showPrintTraveler.barcode}
                size={90}
                label={showPrintTraveler.barcode}
              />
            </div>

            <div className="text-xs font-mono">
              <div className="font-bold border-b pb-1 mb-2">OPERATION ROUTING CHECKLIST:</div>
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b">
                    <th className="p-1">Op</th>
                    <th className="p-1">Description</th>
                    <th className="p-1">Machine</th>
                    <th className="p-1">Sign-off</th>
                  </tr>
                </thead>
                <tbody>
                  {showPrintTraveler.operations.map((o) => (
                    <tr key={o.opNumber} className="border-b">
                      <td className="p-1 font-bold">Op {o.opNumber}</td>
                      <td className="p-1">{o.operationName}</td>
                      <td className="p-1 text-slate-600">{o.machineId}</td>
                      <td className="p-1 font-bold">{o.status === 'Completed' ? 'SIGNED ✓' : '[ PENDING ]'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="no-print pt-2 flex justify-end space-x-2">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded flex items-center space-x-1"
              >
                <Printer size={14} />
                <span>Print Traveler Card</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
