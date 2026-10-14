import React from 'react';
import {
  ShieldAlert,
  Layers,
  Cpu,
  Tablet,
  CheckCircle2,
  Scale,
  Truck,
  Search,
  BookOpen,
  History,
  Wifi,
  WifiOff,
  User,
  Radio,
  RefreshCw
} from 'lucide-react';
import { UserRole } from '../types';
import { sounds } from '../utils/audio';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  currentRole: UserRole;
  setCurrentRole: (role: UserRole) => void;
  gloveMode: boolean;
  setGloveMode: (mode: boolean) => void;
  isOffline: boolean;
  setIsOffline: (offline: boolean) => void;
  pendingSyncCount: number;
  onSync: () => void;
  onOpenComplianceGuide: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  currentRole,
  setCurrentRole,
  gloveMode,
  setGloveMode,
  isOffline,
  setIsOffline,
  pendingSyncCount,
  onSync,
  onOpenComplianceGuide
}) => {
  const roles: UserRole[] = [
    'Plant Manager',
    'Quality Engineer',
    'Quality Manager',
    'Shift Supervisor',
    'QA Floor Inspector',
    'Dispatch Clerk'
  ];

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Cpu },
    { id: 'raw-material', label: 'Dock Intake & MTC', icon: Layers },
    { id: 'blueprint-studio', label: 'Blueprint & PDI Studio', icon: Radio },
    { id: 'tablet-inspector', label: 'Inspector Tablet', icon: Tablet, highlight: true },
    { id: 'supervisor-queue', label: 'Supervisor Approvals', icon: CheckCircle2 },
    { id: 'mrb-portal', label: 'MRB Holding Area', icon: Scale },
    { id: 'travelers', label: 'Job Travelers & Holds', icon: RefreshCw },
    { id: 'shipping-interlock', label: 'Dispatch Clearance', icon: Truck },
    { id: 'traceability', label: 'Lineage & Traceability', icon: Search },
    { id: 'shift-handover', label: 'Shift Handover', icon: BookOpen },
    { id: 'audit-trail', label: 'Audit Trail', icon: History }
  ];

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-slate-100 sticky top-0 z-50 shadow-xl">
      {/* Top Plant Status Bar */}
      <div className="bg-slate-950 px-4 py-1.5 flex flex-wrap items-center justify-between text-xs text-slate-400 border-b border-slate-800/80">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5 font-semibold text-amber-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            <span>ZAPUZA FACTORY OS 5.0</span>
          </div>
          <span className="text-slate-600">|</span>
          <span className="truncate">Plant #1 • Main Machining & Aerospace QA Line</span>
          <span className="text-slate-600 hidden sm:inline">|</span>
          <span className="text-emerald-400 font-mono hidden sm:inline">Zero Defect Escape Active</span>
        </div>

        <div className="flex items-center space-x-3">
          {/* SOP Compliance & Walkthrough Modal Launcher */}
          <button
            onClick={() => {
              sounds.playTactileClick();
              onOpenComplianceGuide();
            }}
            className="flex items-center space-x-1.5 px-2.5 py-0.5 rounded font-mono text-[11px] bg-amber-500/15 text-amber-300 border border-amber-500/40 hover:bg-amber-500/25 transition-colors cursor-pointer"
            title="Open SOP Standard v5.0 Requirements & Live Demonstration Walkthrough Guide"
          >
            <BookOpen size={12} className="text-amber-400" />
            <span>SOP & Demo Guide</span>
          </button>

          {/* Offline/Online Simulation Switch */}
          <button
            onClick={() => {
              sounds.playTactileClick();
              setIsOffline(!isOffline);
            }}
            className={`flex items-center space-x-1.5 px-2.5 py-0.5 rounded font-mono text-[11px] transition-colors ${
              isOffline
                ? 'bg-rose-950/80 text-rose-300 border border-rose-700/60'
                : 'bg-emerald-950/80 text-emerald-300 border border-emerald-700/60'
            }`}
            title="Toggle Wi-Fi connection simulation to test offline tablet caching"
          >
            {isOffline ? <WifiOff size={13} className="text-rose-400" /> : <Wifi size={13} className="text-emerald-400" />}
            <span>{isOffline ? 'OFFLINE (Local Cache)' : 'ONLINE (Factory Wi-Fi)'}</span>
          </button>

          {pendingSyncCount > 0 && (
            <button
              onClick={() => {
                sounds.playTactileClick();
                onSync();
              }}
              className="flex items-center space-x-1 px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/50 rounded font-mono text-[11px] hover:bg-amber-500/30"
            >
              <RefreshCw size={11} className="animate-spin" />
              <span>Sync Queue ({pendingSyncCount})</span>
            </button>
          )}

          {/* Glove Mode Switch */}
          <button
            onClick={() => {
              sounds.playTactileClick();
              setGloveMode(!gloveMode);
            }}
            className={`px-2 py-0.5 rounded font-mono text-[11px] transition-colors border ${
              gloveMode
                ? 'bg-amber-500 text-slate-950 font-bold border-amber-400'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            🧤 Glove Mode: {gloveMode ? 'ON (Rugged UI)' : 'OFF'}
          </button>

          {/* Role Dropdown */}
          <div className="flex items-center space-x-1.5 bg-slate-800/90 px-2 py-0.5 rounded border border-slate-700">
            <User size={12} className="text-amber-400" />
            <select
              value={currentRole}
              onChange={(e) => {
                sounds.playTactileClick();
                setCurrentRole(e.target.value as UserRole);
              }}
              aria-label="Active Role"
              className="bg-transparent text-amber-300 text-xs font-semibold focus:outline-none cursor-pointer"
            >
              {roles.map((r) => (
                <option key={r} value={r} className="bg-slate-900 text-slate-200">
                  {r}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="px-4 py-2.5 flex items-center justify-between overflow-x-auto">
        <div className="flex items-center space-x-3 mr-4">
          <div className="w-9 h-9 bg-gradient-to-br from-amber-500 to-amber-700 rounded-lg flex items-center justify-center shadow-lg shadow-amber-500/20 border border-amber-400/40">
            <ShieldAlert size={20} className="text-slate-950 font-black" />
          </div>
          <div>
            <div className="font-extrabold text-base tracking-wider text-slate-100 flex items-center space-x-1.5">
              <span>ZAPUZA</span>
              <span className="text-[10px] px-1.5 py-0.2 bg-amber-500 text-slate-950 font-mono font-bold rounded">
                QC & DISPATCH
              </span>
            </div>
            <div className="text-[10px] text-slate-400 font-mono">
              Role: <span className="text-amber-300 font-semibold">{currentRole}</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation Links */}
        <nav className="flex items-center space-x-1.5 flex-nowrap shrink-0">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  sounds.playTactileClick();
                  setCurrentTab(item.id);
                }}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-xs font-medium transition-all shrink-0 ${
                  isActive
                    ? item.highlight
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-lg shadow-amber-500/30'
                      : 'bg-slate-800 text-amber-400 border border-amber-500/40 shadow'
                    : item.highlight
                    ? 'bg-amber-950/40 text-amber-300 border border-amber-600/40 hover:bg-amber-900/50'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Icon size={15} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
