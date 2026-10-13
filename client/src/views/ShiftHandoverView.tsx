import React, { useEffect, useState } from 'react';
import {
  BookOpen,
  Plus,
  CheckCircle2,
  Clock,
  UserCheck,
  AlertTriangle,
  Wrench,
  PenTool,
  Check
} from 'lucide-react';
import { ShiftHandover } from '../types';
import { api } from '../utils/api';
import { sounds } from '../utils/audio';

export const ShiftHandoverView: React.FC = () => {
  const [handovers, setHandovers] = useState<ShiftHandover[]>([]);
  const [selectedHandover, setSelectedHandover] = useState<ShiftHandover | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);

  // Form State
  const [shiftName, setShiftName] = useState('Morning to Evening Shift');
  const [outgoingSupervisor, setOutgoingSupervisor] = useState('Devin Vance (Day Lead)');
  const [incomingSupervisor, setIncomingSupervisor] = useState('Sarah Chen (Evening Lead)');
  const [partsProduced, setPartsProduced] = useState('320');
  const [scrapCount, setScrapCount] = useState('2');
  const [activeJobsCount, setActiveJobsCount] = useState('14');
  const [toolWearNotes, setToolWearNotes] = useState('Insert T02 on CNC #04 due for index change after ~40 cycles.');
  const [machineHealthNotes, setMachineHealthNotes] = useState('Precision Grinder #03 PM checklist overdue. Other stations running optimal.');
  const [openQualityAlerts, setOpenQualityAlerts] = useState('One pending PDI concession on TRV-9042.');

  const loadHandovers = async () => {
    try {
      const data = await api.getShiftHandovers();
      setHandovers(data || []);
      if (data && data.length > 0 && !selectedHandover) {
        setSelectedHandover(data[0]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadHandovers();
  }, []);

  const handleCreateHandover = async (e: React.FormEvent) => {
    e.preventDefault();
    sounds.playTactileClick();

    const payload = {
      shiftName,
      outgoingSupervisor,
      incomingSupervisor,
      activeJobsCount: Number(activeJobsCount),
      partsProduced: Number(partsProduced),
      scrapCount: Number(scrapCount),
      toolWearNotes,
      machineHealthNotes,
      openQualityAlerts,
      outgoingSignature: outgoingSupervisor.split(' ')[0]
    };

    const res = await api.createShiftHandover(payload);
    if (res.success) {
      sounds.playPassChime();
      setShowNewModal(false);
      loadHandovers();
      setSelectedHandover(res.handover);
    }
  };

  const handleAcknowledge = async (id: string) => {
    sounds.playTactileClick();
    const sig = prompt('Enter Incoming Supervisor Signature Initials (e.g. S. Chen):') || 'S. Chen';
    const res = await api.acknowledgeShiftHandover(id, {
      incomingSupervisor: 'Sarah Chen (Evening Lead)',
      incomingSignature: sig
    });
    if (res.success) {
      sounds.playPassChime();
      loadHandovers();
      setSelectedHandover(res.handover);
    }
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <BookOpen className="text-amber-500" size={24} />
            <h1 className="text-xl font-bold text-white">Digital Shift Handover Logbook</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Section 12.2 Standard: Mandatory digital shift handovers capturing machine health, tool wear, scrap count, and incoming acknowledgment.
          </p>
        </div>

        <button
          onClick={() => {
            sounds.playTactileClick();
            setShowNewModal(true);
          }}
          className="flex items-center space-x-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg shadow-lg cursor-pointer self-start sm:self-auto"
        >
          <Plus size={16} />
          <span>File Shift Handover</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Handover Logs (4 cols) */}
        <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider font-mono text-slate-400 border-b border-slate-800 pb-2">
            Shift Handover History
          </div>

          <div className="space-y-2">
            {handovers.map((h) => {
              const isSelected = selectedHandover?.id === h.id;
              return (
                <div
                  key={h.id}
                  onClick={() => {
                    sounds.playTactileClick();
                    setSelectedHandover(h);
                  }}
                  className={`p-3.5 rounded-lg border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-slate-800 border-amber-500 shadow'
                      : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-xs text-amber-300">{h.id}</span>
                    {h.acknowledgedByIncoming ? (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                        ACKNOWLEDGED
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                        PENDING ACK
                      </span>
                    )}
                  </div>

                  <div className="mt-1 text-xs text-white font-bold">{h.shiftName}</div>
                  <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                    {new Date(h.timestamp).toLocaleDateString()} • {h.outgoingSupervisor}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Selected Handover Details (8 cols) */}
        <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl">
          {selectedHandover ? (
            <div className="space-y-6">
              {/* Top Banner */}
              <div className="border-b border-slate-800 pb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-lg font-mono font-black text-white">{selectedHandover.shiftName}</span>
                    <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">
                      {selectedHandover.id}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 font-mono mt-1">
                    Filed: {new Date(selectedHandover.timestamp).toLocaleString()} by {selectedHandover.outgoingSupervisor}
                  </div>
                </div>

                {!selectedHandover.acknowledgedByIncoming ? (
                  <button
                    onClick={() => handleAcknowledge(selectedHandover.id)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg flex items-center space-x-1.5 shadow cursor-pointer"
                  >
                    <UserCheck size={16} />
                    <span>Acknowledge & Sign Log</span>
                  </button>
                ) : (
                  <div className="text-right text-xs font-mono text-emerald-400">
                    <div className="font-bold">✓ Digitally Acknowledged</div>
                    <div className="text-[11px] text-slate-400">By {selectedHandover.incomingSupervisor}</div>
                  </div>
                )}
              </div>

              {/* Shift KPI Metrics */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-center font-mono">
                  <span className="text-slate-500 text-[10px] block">ACTIVE JOBS RUNNING</span>
                  <span className="text-xl font-bold text-amber-300">{selectedHandover.activeJobsCount} Lots</span>
                </div>
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-center font-mono">
                  <span className="text-slate-500 text-[10px] block">PARTS PRODUCED</span>
                  <span className="text-xl font-bold text-white">{selectedHandover.partsProduced} Units</span>
                </div>
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-center font-mono">
                  <span className="text-slate-500 text-[10px] block">SCRAP REJECT COUNT</span>
                  <span className="text-xl font-bold text-rose-400">{selectedHandover.scrapCount} Units</span>
                </div>
              </div>

              {/* Handover Sections */}
              <div className="space-y-3 text-xs font-mono">
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
                  <span className="text-amber-400 font-bold block flex items-center space-x-1">
                    <Wrench size={13} />
                    <span>TOOL WEAR & REPLACEMENT STATUS:</span>
                  </span>
                  <p className="text-slate-200">{selectedHandover.toolWearNotes}</p>
                </div>

                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
                  <span className="text-cyan-400 font-bold block flex items-center space-x-1">
                    <Clock size={13} />
                    <span>MACHINE HEALTH & SPINDLE STATUS:</span>
                  </span>
                  <p className="text-slate-200">{selectedHandover.machineHealthNotes}</p>
                </div>

                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
                  <span className="text-rose-400 font-bold block flex items-center space-x-1">
                    <AlertTriangle size={13} />
                    <span>OPEN QUALITY ALERTS & SUPERVISOR REVIEWS:</span>
                  </span>
                  <p className="text-slate-200">{selectedHandover.openQualityAlerts}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-16 text-slate-500 text-xs font-mono">
              Select a shift handover log from the left.
            </div>
          )}
        </div>
      </div>

      {/* New Handover Modal */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-lg w-full shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-white">File Digital Shift Handover Log</h2>
              <button onClick={() => setShowNewModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreateHandover} className="space-y-3">
              <div>
                <label className="block text-slate-400 mb-1">Shift Transition</label>
                <select
                  value={shiftName}
                  onChange={(e) => setShiftName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono"
                >
                  <option value="Morning to Evening Shift">Morning to Evening Shift (07:00 - 15:30)</option>
                  <option value="Evening to Night Shift">Evening to Night Shift (15:30 - 23:30)</option>
                  <option value="Night to Morning Shift">Night to Morning Shift (23:30 - 07:00)</option>
                </select>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-slate-400 mb-1">Active Jobs</label>
                  <input
                    type="number"
                    value={activeJobsCount}
                    onChange={(e) => setActiveJobsCount(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Parts Output</label>
                  <input
                    type="number"
                    value={partsProduced}
                    onChange={(e) => setPartsProduced(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Scrap Count</label>
                  <input
                    type="number"
                    value={scrapCount}
                    onChange={(e) => setScrapCount(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-rose-400 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Tool Wear & Insert Condition</label>
                <input
                  type="text"
                  value={toolWearNotes}
                  onChange={(e) => setToolWearNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Machine Health & PM Notes</label>
                <input
                  type="text"
                  value={machineHealthNotes}
                  onChange={(e) => setMachineHealthNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Open Quality Alerts / PDI Pending</label>
                <input
                  type="text"
                  value={openQualityAlerts}
                  onChange={(e) => setOpenQualityAlerts(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 font-semibold rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded"
                >
                  Sign & Submit Handover
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
