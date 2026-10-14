import React from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  BookOpen,
  ArrowRight,
  Tablet,
  Wrench,
  Clock,
  Layers,
  Scale,
  Truck,
  Search,
  X
} from 'lucide-react';
import { sounds } from '../utils/audio';

interface ComplianceGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab: (tabId: string) => void;
}

export const ComplianceGuideModal: React.FC<ComplianceGuideModalProps> = ({
  isOpen,
  onClose,
  onNavigateTab
}) => {
  if (!isOpen) return null;

  const subsystems = [
    {
      module: 'Plant Infrastructure & Calibration Locks',
      ref: 'Section 2',
      desc: 'Machine master hierarchy, daily PM verification locks (overdue stations locked from running jobs), and tool calibration register with automated expiry lockouts (e.g., VC-99).',
      targetTab: 'dashboard'
    },
    {
      module: 'Raw Material Intake & MTC Module',
      ref: 'Section 3',
      desc: 'Dock receiving logs, Mill Test Certificate (MTC) chemistry (C, Mn, Si, Cr, Ni) & mechanical property cross-checking, weatherproof barcode tagging, and Supplier Non-Conformance Report (SNCR) quarantine.',
      targetTab: 'raw-material'
    },
    {
      module: 'PDI Template Studio & Blueprint Pinning',
      ref: 'Section 4',
      desc: 'Interactive CAD schematic canvas with color-coded inspection pins, tolerance configuration (±, max limits, visual pass/fail), tool requirements, and Critical-to-Quality (CTQ) priority tagging.',
      targetTab: 'blueprint-studio'
    },
    {
      module: 'Rugged Inspector Tablet Application',
      ref: 'Section 5 & 9',
      desc: 'Glove-friendly touch UI, anti-cheat 2-step QR presence rule (station QR plate + traveler barcode), linear step-by-step locks, instant green/red tolerance feedback, mandatory defect photo capture (2 photos minimum), first-piece quality sign-offs ("Setup Mode"), and hourly periodic inspection alert siren.',
      targetTab: 'tablet-inspector'
    },
    {
      module: 'Shift Supervisor Approvals & Concessions',
      ref: 'Section 6',
      desc: 'Live review queue, approval sign-off, conditional engineering concessions with mandatory reason codes and justifications (strictly blocked on CTQ dimensions), or quarantine to Digital Rejection Holding Bay 107.',
      targetTab: 'supervisor-queue'
    },
    {
      module: 'Material Review Board (MRB) Portal',
      ref: 'Section 6.3',
      desc: 'Quarantined lot reviews executing 4 digital dispositions: Rework Order generation (Op 25 corrective machining), Scrap write-offs with cost codes, Return to Vendor (RTV), or Customer Special Concession.',
      targetTab: 'mrb-portal'
    },
    {
      module: 'Process Routings & Hold Interlocks',
      ref: 'Section 7 & 8',
      desc: 'Strict numerical sequence enforcement (Op 10 → Op 70), active cycle time tracking, and mandatory cooling/aging hold countdown timers with automated lockout banners.',
      targetTab: 'travelers'
    },
    {
      module: 'Pre-Dispatch Clearance & Shipping Interlocks',
      ref: 'Section 10 & 11',
      desc: 'Automated gatekeeping verifying the 3 mandatory rules (100% ops signed off, all hold timers fulfilled, final PDI approved). Locked gate passes with high-visibility lockout warnings if unfulfilled; unlocked digital gate pass & customer QR labels once cleared.',
      targetTab: 'shipping-interlock'
    },
    {
      module: 'Lineage & Traceability Engine',
      ref: 'Section 7.2',
      desc: 'Forward Recall Traceability: Query Heat Lot # (e.g. H-8042) to locate all affected work orders, parts, and customer crates in seconds. Backward Field Traceability: Query component serials to generate complete manufacturing birth certificates.',
      targetTab: 'traceability'
    },
    {
      module: 'Customer Certificate of Analysis (CoA)',
      ref: 'Section 11.3',
      desc: 'End-customer inspection certificate accessible via crate QR code scan, detailing nominal vs actual measurements, MTC chemistry, and authorized QA director signatures.',
      targetTab: 'shipping-interlock'
    },
    {
      module: 'Digital Shift Handover Logbook',
      ref: 'Section 12.2',
      desc: 'Shift handover logs tracking active jobs, parts output, scrap count, tool wear, and machine health with incoming supervisor digital signature acknowledgment.',
      targetTab: 'shift-handover'
    },
    {
      module: 'Tamper-Proof System Audit Trail',
      ref: 'Section 13.3',
      desc: 'Immutable Write-Once Read-Many (WORM) audit log recording User ID, timestamp, IP, device serial, previous values, and new values for ISO 9001 / AS9100D compliance.',
      targetTab: 'audit-trail'
    },
    {
      module: 'Offline Storage & Caching Engine',
      ref: 'Section 13.2',
      desc: 'Local offline caching queue when Wi-Fi drops, with automatic background synchronization upon reconnection.',
      targetTab: 'tablet-inspector'
    }
  ];

  const walkthroughs = [
    {
      title: 'Test Machine PM Lock',
      step: 'On the Dashboard, note that Precision Grinder #03 has an active PM overdue lockout. Click "Sign-off PM & Unlock" to verify and clear the station.',
      tab: 'dashboard'
    },
    {
      title: 'Test Tool Calibration Lock',
      step: 'Open the Inspector Tablet tab. In the tool dropdown, select expired caliper VC-99. Observe the red "TOOL CALIBRATION EXPIRED" alert that blocks measurement entry. Select VC-104 to unlock.',
      tab: 'tablet-inspector'
    },
    {
      title: 'Test Mandatory QR Presence Scan',
      step: 'In the Inspector Tablet, click CNC-04 (Step 1) and then traveler TRV-2026-9041 (Step 2) to unlock the linear checklist.',
      tab: 'tablet-inspector'
    },
    {
      title: 'Test Real-Time Green/Red Feedback & Defect Photos',
      step: 'Enter 45.015 for Pin 1 to see the green pass illumination; enter an out-of-spec value like 45.060 to trigger the red alert and mandatory defect photo capture modal.',
      tab: 'tablet-inspector'
    },
    {
      title: 'Test Cooling Hold Interlock',
      step: 'Go to Job Travelers & Holds and inspect TRV-2026-9041. Attempting to start Op 40 while Op 30 cooling is active flashes the automated cooling hold interlock banner.',
      tab: 'travelers'
    },
    {
      title: 'Test Shipping Gate Interlock',
      step: 'Go to Dispatch Clearance. Note how TRV-2026-9041 triggers the high-visibility gate lockout, whereas fully cleared lot TRV-2026-9040 unlocks the gate pass and printable crate QR labels.',
      tab: 'shipping-interlock'
    },
    {
      title: 'Test Traceability & Customer CoA',
      step: 'Go to Lineage & Traceability to run a forward query on Heat H-8042 or a backward query on TRV-2026-9040 to view the authenticated digital Certificate of Analysis.',
      tab: 'traceability'
    }
  ];

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-slate-900 border-2 border-amber-500/80 rounded-2xl max-w-5xl w-full p-6 shadow-2xl space-y-6 my-8 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-amber-400 font-mono font-bold text-xs uppercase tracking-wider">
                SOP Standard v5.0 Specification Compliance
              </span>
            </div>
            <h2 className="text-xl font-black text-white flex items-center space-x-2">
              <span>🏗️ Implemented Subsystems & Standard Operating Requirements</span>
            </h2>
            <p className="text-xs text-slate-400">
              Complete implementation matrix and live interactive demonstration walkthroughs.
            </p>
          </div>

          <button
            onClick={() => {
              sounds.playTactileClick();
              onClose();
            }}
            className="text-slate-400 hover:text-white p-1 rounded-lg bg-slate-800/80 border border-slate-700"
          >
            <X size={18} />
          </button>
        </div>

        {/* Requirements Matrix Table */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider font-mono flex items-center space-x-2">
            <BookOpen size={16} className="text-amber-400" />
            <span>1. Implemented Subsystems Matrix</span>
          </h3>

          <div className="overflow-x-auto border border-slate-800 rounded-xl">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase text-[11px]">
                <tr>
                  <th className="p-3">Module</th>
                  <th className="p-3">Standard Reference</th>
                  <th className="p-3">Key Capabilities Implemented</th>
                  <th className="p-3 text-right">Quick Jump</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-900/60">
                {subsystems.map((sub, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3 font-bold text-white whitespace-nowrap">
                      {sub.module}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[11px] font-bold">
                        {sub.ref}
                      </span>
                    </td>
                    <td className="p-3 text-slate-300 max-w-md font-sans text-xs">
                      {sub.desc}
                    </td>
                    <td className="p-3 text-right whitespace-nowrap">
                      <button
                        onClick={() => {
                          sounds.playTactileClick();
                          onClose();
                          onNavigateTab(sub.targetTab);
                        }}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-amber-300 font-bold text-[11px] rounded transition-colors inline-flex items-center space-x-1"
                      >
                        <span>Open</span>
                        <ArrowRight size={11} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Demonstration Walkthroughs */}
        <div className="space-y-3 pt-2">
          <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider font-mono flex items-center space-x-2">
            <CheckCircle2 size={16} className="text-emerald-400" />
            <span>🧪 2. Quick Demonstration Walkthroughs</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {walkthroughs.map((w, idx) => (
              <div
                key={idx}
                className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 hover:border-amber-500/50 transition-all flex flex-col justify-between space-y-2"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-amber-400 font-mono">
                      #{idx + 1} {w.title}
                    </span>
                    <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-mono">
                      {w.tab}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1.5 font-sans leading-relaxed">
                    {w.step}
                  </p>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={() => {
                      sounds.playTactileClick();
                      onClose();
                      onNavigateTab(w.tab);
                    }}
                    className="px-3 py-1 bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-200 text-xs font-bold rounded flex items-center space-x-1 transition-colors"
                  >
                    <span>Launch Scenario</span>
                    <ArrowRight size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-3 border-t border-slate-800 flex justify-end">
          <button
            onClick={() => {
              sounds.playTactileClick();
              onClose();
            }}
            className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg shadow-lg cursor-pointer"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
