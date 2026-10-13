import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  Clock,
  Wrench,
  Activity,
  Layers,
  ArrowRight,
  Flame,
  CheckCircle,
  XCircle,
  Hourglass
} from 'lucide-react';
import { Workstation, JobTraveler } from '../types';
import { api } from '../utils/api';
import { sounds } from '../utils/audio';

interface DashboardViewProps {
  onNavigate: (tab: string) => void;
  gloveMode: boolean;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate, gloveMode }) => {
  const [workstations, setWorkstations] = useState<Workstation[]>([]);
  const [travelers, setTravelers] = useState<JobTraveler[]>([]);
  const [bottlenecks, setBottlenecks] = useState<{ stations: { stationId: string; stationName: string; queueDepth: number; status: string; utilizationRate: number; currentCycleMin: number; }[] }>({ stations: [] });
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const [infra, trav, bnecks] = await Promise.all([
        api.getInfrastructure(),
        api.getJobTravelers(),
        api.getBottlenecks()
      ]);
      setWorkstations(infra.workstations || []);
      setTravelers(trav || []);
      setBottlenecks(bnecks || { stations: [] });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleClearPm = async (stationId: string) => {
    sounds.playTactileClick();
    await api.completePmCheck(stationId, 'SUPV-MORGAN');
    sounds.playPassChime();
    loadData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-slate-400">
        <Activity className="animate-spin mr-2 text-amber-500" size={28} />
        <span>Loading Real-Time Shopfloor Status...</span>
      </div>
    );
  }

  const overdueStations = workstations.filter((w) => w.pmStatus === 'Overdue');
  const activeTravelers = travelers.filter((t) => t.overallStatus !== 'Dispatched' && t.overallStatus !== 'Scrapped');
  const pendingPdi = travelers.filter((t) => t.pdiStatus.includes('Pending'));
  const coolingHolds = travelers.filter((t) =>
    t.operations.some((o) => o.holdStatus === 'Active Hold')
  );

  return (
    <div className={`p-4 lg:p-6 space-y-6 ${gloveMode ? 'max-w-none' : 'max-w-7xl mx-auto'}`}>
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-700/80 rounded-xl p-5 shadow-2xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-amber-500/5 -skew-x-12 pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 font-mono text-xs font-bold rounded border border-amber-500/30">
                LIVE PRODUCTION MONITOR
              </span>
              <span className="text-xs text-slate-400 font-mono">Shift: 07:00 - 15:30 (Day Shift)</span>
            </div>
            <h1 className="text-2xl font-black text-white mt-1 tracking-tight">
              Factory Operations & Digital Quality Assurance
            </h1>
            <p className="text-sm text-slate-300 max-w-2xl mt-1">
              Zero paper clipboards. Immediate locked digital boundaries at every workstation, automated tolerance verification, and strict shipping gatekeeping interlocks.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => onNavigate('tablet-inspector')}
              className="flex items-center space-x-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm rounded-lg shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
            >
              <span>Launch Floor Tablet</span>
              <ArrowRight size={16} />
            </button>
            <button
              onClick={() => onNavigate('shipping-interlock')}
              className="flex items-center space-x-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 font-semibold text-sm rounded-lg transition-all cursor-pointer"
            >
              <span>Dispatch Gates</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Zero Defect Escape */}
        <div className="bg-slate-900/90 border border-emerald-500/40 rounded-xl p-4 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 font-mono">
              Defect Escape Prevention
            </span>
            <ShieldCheck className="text-emerald-400" size={20} />
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-black text-white font-mono">100.0%</span>
            <span className="text-xs text-emerald-400 font-semibold">0 Escapes</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Shipping gate pass automatically locked for out-of-spec lots.</p>
        </div>

        {/* Active Production Lots */}
        <div className="bg-slate-900/90 border border-slate-700 rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono">
              Active Job Travelers
            </span>
            <Layers className="text-cyan-400" size={20} />
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-black text-white font-mono">{activeTravelers.length}</span>
            <span className="text-xs text-slate-400">Lots on Shopfloor</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Strict linear operation sequences enforced Op 10 → Op 70.</p>
        </div>

        {/* Cooling Hold Interlocks */}
        <div className="bg-slate-900/90 border border-amber-500/40 rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400 font-mono">
              Active Hold Timers
            </span>
            <Hourglass className="text-amber-400" size={20} />
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-black text-amber-300 font-mono">{coolingHolds.length}</span>
            <span className="text-xs text-amber-400 font-semibold">Interlocked</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Mandatory cooling/curing time countdown actively counting down.</p>
        </div>

        {/* PM & Tool Calibration Alerts */}
        <div className="bg-slate-900/90 border border-rose-500/40 rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-400 font-mono">
              Station PM Locks
            </span>
            <Wrench className="text-rose-400" size={20} />
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-black text-white font-mono">{overdueStations.length}</span>
            <span className="text-xs text-rose-400 font-semibold">
              {overdueStations.length > 0 ? 'Action Required' : 'All Compliant'}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {overdueStations.length > 0
              ? 'Job selection locked on overdue machines until PM verified.'
              : 'All machine zero-points & PM verified.'}
          </p>
        </div>
      </div>

      {/* Main Grid: Machine Status & Bottleneck Heatmap */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Workstation Status Register & PM Calibration Locks */}
        <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <Wrench className="text-amber-400" size={18} />
                <span>Master Workstation Register & Calibration Status</span>
              </h2>
              <p className="text-xs text-slate-400">
                Mandatory daily PM & zero-point verification prevents running production on unverified equipment.
              </p>
            </div>
            <span className="text-xs font-mono bg-slate-800 px-2.5 py-1 rounded text-slate-300 border border-slate-700">
              {workstations.length} Registered Machines
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {workstations.map((st) => {
              const isOverdue = st.pmStatus === 'Overdue';
              return (
                <div
                  key={st.id}
                  className={`p-3.5 rounded-lg border transition-all ${
                    isOverdue
                      ? 'bg-rose-950/30 border-rose-600/70 shadow-lg shadow-rose-950/50'
                      : 'bg-slate-800/60 border-slate-700/80 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-sm font-bold text-slate-100 flex items-center space-x-1.5">
                        <span>{st.name}</span>
                      </div>
                      <div className="text-xs text-slate-400 font-mono mt-0.5">{st.department}</div>
                    </div>
                    {isOverdue ? (
                      <span className="flex items-center space-x-1 text-xs px-2 py-0.5 bg-rose-500/20 text-rose-300 border border-rose-500/50 rounded font-mono font-bold animate-pulse">
                        <XCircle size={12} />
                        <span>PM OVERDUE</span>
                      </span>
                    ) : (
                      <span className="flex items-center space-x-1 text-xs px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded font-mono">
                        <CheckCircle size={12} />
                        <span>VERIFIED</span>
                      </span>
                    )}
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-700/50 text-xs flex items-center justify-between text-slate-300">
                    <div>
                      <span className="text-slate-400">QR Code: </span>
                      <code className="text-amber-300 font-mono bg-slate-900 px-1 py-0.5 rounded">
                        {st.qrCode}
                      </code>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-400">Operator: </span>
                      <span className="font-semibold text-slate-200">{st.currentOperator}</span>
                    </div>
                  </div>

                  {isOverdue && (
                    <div className="mt-2.5 pt-2 border-t border-rose-800/40 flex items-center justify-between">
                      <span className="text-[11px] text-rose-300 flex items-center space-x-1">
                        <AlertTriangle size={12} />
                        <span>Job Selection Disabled</span>
                      </span>
                      <button
                        onClick={() => handleClearPm(st.id)}
                        className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded shadow transition-colors"
                      >
                        Sign-off PM & Unlock
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Live Shopfloor Bottleneck & Queue Monitoring */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
          <div className="border-b border-slate-800 pb-3">
            <h2 className="text-base font-bold text-white flex items-center space-x-2">
              <Activity className="text-cyan-400" size={18} />
              <span>Live Bottleneck & Queue Heatmap</span>
            </h2>
            <p className="text-xs text-slate-400">
              Tracks elapsed time, active machining time, and idle queue time to identify floor congestion.
            </p>
          </div>

          <div className="space-y-3">
            {bottlenecks.stations.map((b) => {
              const isBottleneck = b.status.includes('Bottleneck') || b.status.includes('Alert');
              return (
                <div
                  key={b.stationId}
                  className={`p-3 rounded-lg border text-xs ${
                    isBottleneck
                      ? 'bg-amber-950/20 border-amber-600/50'
                      : 'bg-slate-800/40 border-slate-700/60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-slate-200">{b.stationName}</span>
                    <span
                      className={`font-mono text-[11px] px-1.5 py-0.5 rounded font-semibold ${
                        isBottleneck
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'bg-slate-700 text-slate-300'
                      }`}
                    >
                      Queue: {b.queueDepth} Jobs
                    </span>
                  </div>

                  {/* Progress bar of utilization */}
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        b.utilizationRate > 80
                          ? 'bg-rose-500'
                          : b.utilizationRate > 50
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${b.utilizationRate}%` }}
                    />
                  </div>

                  <div className="mt-2 flex items-center justify-between text-slate-400 text-[11px]">
                    <span>Status: <strong className={isBottleneck ? 'text-amber-400' : 'text-slate-300'}>{b.status}</strong></span>
                    <span>Avg Cycle: <strong className="text-slate-200">{b.currentCycleMin} min</strong></span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Action Navigation */}
          <div className="pt-2 border-t border-slate-800 space-y-2">
            <button
              onClick={() => onNavigate('supervisor-queue')}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-bold flex items-center justify-center space-x-2"
            >
              <AlertTriangle size={14} />
              <span>Inspect Pending Reviews ({pendingPdi.length})</span>
            </button>
            <button
              onClick={() => onNavigate('mrb-portal')}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-xs font-semibold flex items-center justify-center space-x-2"
            >
              <Flame size={14} className="text-rose-400" />
              <span>Digital Rejection Holding Area</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
