import React, { useState } from 'react';
import {
  TrendingUp,
  BarChart2,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Layers,
  Wrench,
  ShieldCheck,
  Zap,
  Info
} from 'lucide-react';
import { sounds } from '../utils/audio';

export const SpcAnalyticsView: React.FC = () => {
  const [selectedFeature, setSelectedFeature] = useState<'shaft_dia' | 'spline_length' | 'flange_thick'>('shaft_dia');

  // Sample production subgroup inspection series (e.g., 20 parts measured across Shift 1 & 2)
  const datasets = {
    shaft_dia: {
      partNumber: 'TS-204',
      featureName: 'Bearing Journal Outer Diameter (Pin #1)',
      nominal: 45.000,
      usl: 45.025, // Upper Spec Limit
      lsl: 44.990, // Lower Spec Limit
      unit: 'mm',
      samples: [
        45.008, 45.010, 45.007, 45.011, 45.012,
        45.014, 45.013, 45.015, 45.016, 45.018,
        45.019, 45.021, 45.022, 45.023, 45.020,
        45.018, 45.019, 45.021, 45.022, 45.024
      ],
      toolUsed: 'Micrometer MIC-201',
      cncMachine: 'CNC Lathe #04 (Haas ST-20)',
      toolId: 'T02-Finish Diamond Insert'
    },
    spline_length: {
      partNumber: 'TS-204',
      featureName: 'Spline Section Overall Length (Pin #2)',
      nominal: 110.00,
      usl: 110.15,
      lsl: 109.85,
      unit: 'mm',
      samples: [
        110.02, 110.05, 110.04, 110.08, 110.09,
        110.11, 110.12, 110.14, 110.16, 110.18,
        110.15, 110.14, 110.13, 110.11, 110.09,
        110.07, 110.08, 110.06, 110.05, 110.03
      ],
      toolUsed: 'Vernier Caliper VC-104',
      cncMachine: 'CNC Lathe #04',
      toolId: 'T01-Rough Turning'
    },
    flange_thick: {
      partNumber: 'TS-204',
      featureName: 'Mounting Flange Step Thickness (Pin #3 - CTQ)',
      nominal: 22.50,
      usl: 22.55,
      lsl: 22.45,
      unit: 'mm',
      samples: [
        22.502, 22.498, 22.501, 22.503, 22.499,
        22.504, 22.501, 22.497, 22.502, 22.500,
        22.503, 22.501, 22.499, 22.502, 22.500,
        22.501, 22.498, 22.502, 22.503, 22.501
      ],
      toolUsed: 'Height Gauge HG-12',
      cncMachine: 'VMC Station #02',
      toolId: 'T04-Endmill 16mm'
    }
  };

  const current = datasets[selectedFeature];

  // Statistical calculations
  const n = current.samples.length;
  const mean = current.samples.reduce((a, b) => a + b, 0) / n;
  const variance = current.samples.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (n - 1);
  const stdDev = Math.sqrt(variance);

  // Control limits (3-sigma)
  const ucl = mean + 3 * stdDev;
  const lcl = mean - 3 * stdDev;

  // Process Capability Indices (Cp and Cpk)
  const cp = (current.usl - current.lsl) / (6 * stdDev);
  const cpu = (current.usl - mean) / (3 * stdDev);
  const cpl = (mean - current.lsl) / (3 * stdDev);
  const cpk = Math.min(cpu, cpl);

  // Tool Wear Drift Analysis (check if last 5 samples consecutively drift upwards)
  const last5 = current.samples.slice(-5);
  let isDriftingUp = true;
  for (let i = 1; i < last5.length; i++) {
    if (last5[i] <= last5[i - 1]) isDriftingUp = false;
  }
  const toolWearAlert = isDriftingUp && mean > (current.nominal + (current.usl - current.nominal) * 0.4);

  // SVG Chart bounds
  const minY = Math.min(current.lsl - 0.005, ...current.samples) - 0.005;
  const maxY = Math.max(current.usl + 0.005, ...current.samples) + 0.005;
  const rangeY = maxY - minY;

  const getYCoord = (val: number) => {
    return 260 - ((val - minY) / rangeY) * 220;
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <TrendingUp className="text-amber-500" size={24} />
            <h1 className="text-xl font-bold text-white">Statistical Process Control (SPC) & Quality Analytics</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time X-bar & R charts, Process Capability (Cp/Cpk), automated CNC tool wear compensation, and Pareto defect intelligence.
          </p>
        </div>

        {/* Feature Selector */}
        <div className="flex items-center space-x-2 bg-slate-900 border border-slate-800 p-2 rounded-xl">
          <span className="text-xs text-slate-400 font-mono">Inspect Dimension:</span>
          <select
            value={selectedFeature}
            onChange={(e) => {
              sounds.playTactileClick();
              setSelectedFeature(e.target.value as any);
            }}
            className="bg-slate-950 text-amber-300 font-mono font-bold text-xs rounded px-2.5 py-1 border border-slate-700 cursor-pointer"
          >
            <option value="shaft_dia">TS-204 Journal Dia (Pin 1)</option>
            <option value="spline_length">TS-204 Spline Length (Pin 2)</option>
            <option value="flange_thick">TS-204 Flange Thickness [CTQ] (Pin 3)</option>
          </select>
        </div>
      </div>

      {/* KPI Cards: Cp, Cpk, Process Mean, Tool Wear State */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Cpk Metric */}
        <div className={`p-4 rounded-xl border shadow-lg ${
          cpk >= 1.67
            ? 'bg-emerald-950/30 border-emerald-500/60'
            : cpk >= 1.33
            ? 'bg-cyan-950/30 border-cyan-500/60'
            : cpk >= 1.00
            ? 'bg-amber-950/30 border-amber-500/60'
            : 'bg-rose-950/40 border-rose-500/80'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold uppercase text-slate-300">Process Capability (Cpk)</span>
            <ShieldCheck size={18} className={cpk >= 1.33 ? 'text-emerald-400' : 'text-amber-400'} />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-3xl font-black font-mono text-white">{cpk.toFixed(2)}</span>
            <span className="text-xs font-bold font-mono text-emerald-400">
              {cpk >= 1.67 ? 'Six Sigma (World Class)' : cpk >= 1.33 ? 'Capable (Aerospace)' : 'Marginal'}
            </span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Cp: {cp.toFixed(2)} • Centering Ratio: {(cpl / cpu).toFixed(2)}</div>
        </div>

        {/* Process Mean (X-Bar) */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold uppercase text-slate-300">Subgroup Mean (X̄)</span>
            <Cpu size={18} className="text-amber-400" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-3xl font-black font-mono text-amber-300">{mean.toFixed(3)}</span>
            <span className="text-xs text-slate-400">{current.unit}</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Target Nominal: {current.nominal.toFixed(3)} {current.unit}</div>
        </div>

        {/* Sigma (Standard Deviation) */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold uppercase text-slate-300">Process Variation (σ)</span>
            <BarChart2 size={18} className="text-cyan-400" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-3xl font-black font-mono text-white">{stdDev.toFixed(4)}</span>
            <span className="text-xs text-slate-400">{current.unit}</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">3-Sigma Spread: ±{(3 * stdDev).toFixed(4)} {current.unit}</div>
        </div>

        {/* Predictive Tool Wear Status */}
        <div className={`p-4 rounded-xl border shadow-lg ${
          toolWearAlert
            ? 'bg-amber-950/40 border-amber-500 animate-pulse'
            : 'bg-slate-900 border-slate-800'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold uppercase text-slate-300">Tool Wear Trend</span>
            <Wrench size={18} className={toolWearAlert ? 'text-amber-400' : 'text-slate-500'} />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className={`text-xl font-bold font-mono ${toolWearAlert ? 'text-amber-300' : 'text-emerald-400'}`}>
              {toolWearAlert ? 'Drift Warning' : 'Stable Tooling'}
            </span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {toolWearAlert ? 'Consecutive upward drift detected on insert.' : 'Insert cutting geometry is centered.'}
          </div>
        </div>
      </div>

      {/* CNC Tool Wear Offset Compensation Banner */}
      {toolWearAlert && (
        <div className="bg-amber-950/80 border-2 border-amber-500 rounded-xl p-4 shadow-xl flex items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <Zap size={24} className="text-amber-400 shrink-0" />
            <div>
              <div className="text-sm font-bold text-amber-200 font-mono">
                PREDICTIVE TOOL OFFSET COMPENSATION RECOMMENDATION
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Consecutive sample drift detected on <strong>{current.cncMachine}</strong>. Tool <strong>{current.toolId}</strong> has worn by approximately +0.012 mm.
              </p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <span className="text-xs font-mono text-slate-400 block">Suggested CNC Offset:</span>
            <code className="text-sm font-mono font-black text-amber-300 bg-slate-900 px-2.5 py-1 rounded border border-amber-500/40">
              X -0.012 mm
            </code>
          </div>
        </div>
      )}

      {/* Main Control Chart: Interactive X-Bar Chart (SVG) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <h2 className="text-base font-bold text-white flex items-center space-x-2">
              <BarChart2 className="text-amber-400" size={18} />
              <span>Statistical Process Control (X-Bar) Chart — {current.featureName}</span>
            </h2>
            <div className="text-xs text-slate-400 font-mono mt-0.5">
              USL: {current.usl.toFixed(3)} | LSL: {current.lsl.toFixed(3)} | UCL: {ucl.toFixed(3)} | LCL: {lcl.toFixed(3)}
            </div>
          </div>

          <div className="flex items-center space-x-3 text-xs font-mono">
            <span className="flex items-center space-x-1 text-rose-400 font-bold">
              <span className="w-3 h-0.5 bg-rose-500 inline-block" />
              <span>USL / LSL (Spec Limits)</span>
            </span>
            <span className="flex items-center space-x-1 text-amber-400 font-bold">
              <span className="w-3 h-0.5 bg-amber-500 inline-block stroke-dasharray" />
              <span>UCL / LCL (3σ Control Limits)</span>
            </span>
            <span className="flex items-center space-x-1 text-cyan-400 font-bold">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block" />
              <span>Measured Subgroup</span>
            </span>
          </div>
        </div>

        {/* SVG Rendered X-Bar Trendline Chart */}
        <div className="w-full aspect-[21/9] bg-slate-950 rounded-xl p-4 border border-slate-800 relative select-none">
          <svg className="w-full h-full" viewBox="0 0 900 280">
            {/* Grid background horizontal lines */}
            {[0, 1, 2, 3, 4].map((step) => {
              const y = 30 + step * 50;
              return <line key={step} x1="50" y1={y} x2="870" y2={y} stroke="#1e293b" strokeWidth="1" strokeDasharray="4,4" />;
            })}

            {/* Upper Spec Limit (USL) - Solid Red */}
            <line x1="50" y1={getYCoord(current.usl)} x2="870" y2={getYCoord(current.usl)} stroke="#f43f5e" strokeWidth="1.5" />
            <text x="875" y={getYCoord(current.usl) + 4} fill="#f43f5e" fontSize="10" fontFamily="monospace" fontWeight="bold">USL ({current.usl})</text>

            {/* Upper Control Limit (UCL) - Dashed Amber */}
            <line x1="50" y1={getYCoord(ucl)} x2="870" y2={getYCoord(ucl)} stroke="#f59e0b" strokeWidth="1.2" strokeDasharray="5,4" />
            <text x="875" y={getYCoord(ucl) + 4} fill="#f59e0b" fontSize="9" fontFamily="monospace">UCL ({ucl.toFixed(3)})</text>

            {/* Nominal Centerline - Solid Cyan/White */}
            <line x1="50" y1={getYCoord(current.nominal)} x2="870" y2={getYCoord(current.nominal)} stroke="#38bdf8" strokeWidth="1.2" opacity="0.6" />
            <text x="875" y={getYCoord(current.nominal) + 4} fill="#38bdf8" fontSize="10" fontFamily="monospace" fontWeight="bold">TARGET ({current.nominal})</text>

            {/* Lower Control Limit (LCL) - Dashed Amber */}
            <line x1="50" y1={getYCoord(lcl)} x2="870" y2={getYCoord(lcl)} stroke="#f59e0b" strokeWidth="1.2" strokeDasharray="5,4" />
            <text x="875" y={getYCoord(lcl) + 4} fill="#f59e0b" fontSize="9" fontFamily="monospace">LCL ({lcl.toFixed(3)})</text>

            {/* Lower Spec Limit (LSL) - Solid Red */}
            <line x1="50" y1={getYCoord(current.lsl)} x2="870" y2={getYCoord(current.lsl)} stroke="#f43f5e" strokeWidth="1.5" />
            <text x="875" y={getYCoord(current.lsl) + 4} fill="#f43f5e" fontSize="10" fontFamily="monospace" fontWeight="bold">LSL ({current.lsl})</text>

            {/* Connect Sample Points with Trendline */}
            <polyline
              fill="none"
              stroke="#06b6d4"
              strokeWidth="2.5"
              points={current.samples
                .map((val, idx) => {
                  const x = 70 + (idx * (800 / (current.samples.length - 1)));
                  const y = getYCoord(val);
                  return `${x},${y}`;
                })
                .join(' ')}
            />

            {/* Render Circles for Sample Points */}
            {current.samples.map((val, idx) => {
              const x = 70 + (idx * (800 / (current.samples.length - 1)));
              const y = getYCoord(val);
              const isOut = val > current.usl || val < current.lsl;

              return (
                <g key={idx}>
                  <circle
                    cx={x}
                    cy={y}
                    r={isOut ? 6 : 4}
                    fill={isOut ? '#ef4444' : '#06b6d4'}
                    stroke="#ffffff"
                    strokeWidth="1.5"
                  />
                  <text
                    x={x}
                    y={y - 8}
                    fill="#e2e8f0"
                    fontSize="9"
                    fontFamily="monospace"
                    textAnchor="middle"
                  >
                    {val.toFixed(3)}
                  </text>
                  <text
                    x={x}
                    y="275"
                    fill="#64748b"
                    fontSize="9"
                    fontFamily="monospace"
                    textAnchor="middle"
                  >
                    #{idx + 1}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Two-Column Bottom Grid: Pareto Analysis & Supplier Scorecard */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pareto Defect Root Causes (80/20 Rule) */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <AlertTriangle className="text-amber-400" size={16} />
              <span>Pareto Analysis of Non-Conformances (80/20 Rule)</span>
            </h3>
            <p className="text-xs text-slate-400">
              Breakdown of total floor defect causes across the last 30 operational days.
            </p>
          </div>

          <div className="space-y-3 text-xs font-mono">
            {[
              { label: 'Spline Length Oversize (+0.18mm)', count: 18, pct: 38, cumulative: 38 },
              { label: 'Total Radial Runout > 0.020mm', count: 13, pct: 28, cumulative: 66 },
              { label: 'Journal Surface Roughness Ra > 0.8', count: 9, pct: 19, cumulative: 85 },
              { label: 'Raw Stock Chemistry Carbon High', count: 5, pct: 10, cumulative: 95 },
              { label: 'Edge Burr Visual Chamfer Defect', count: 2, pct: 5, cumulative: 100 }
            ].map((defect, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex items-center justify-between text-slate-200">
                  <span>{defect.label}</span>
                  <span className="font-bold text-amber-300">{defect.count} incidents ({defect.pct}%)</span>
                </div>
                <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden flex">
                  <div className="bg-amber-500 h-full" style={{ width: `${defect.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Supplier Quality Scorecard */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <Layers className="text-cyan-400" size={16} />
              <span>Certified Raw Material Supplier Scorecards</span>
            </h3>
            <p className="text-xs text-slate-400">
              Evaluated on MTC chemistry accuracy, dock dimension conformance, and SNCR rejection rate.
            </p>
          </div>

          <div className="space-y-3 text-xs font-mono">
            {[
              { name: 'Jindal High-Strength Alloys Ltd.', grade: 'AISI 4340 Billets', acceptanceRate: '98.5%', status: 'Tier 1 Certified (Preferred)', color: 'text-emerald-400' },
              { name: 'Apex Special Steels Corp.', grade: 'EN353 Alloy Bars', acceptanceRate: '95.2%', status: 'Approved Supplier', color: 'text-cyan-400' },
              { name: 'Global Metallurgy Inc.', grade: 'AISI 316L Round Bar', acceptanceRate: '78.0%', status: 'Audit Quarantine Flagged (SNCR-042)', color: 'text-rose-400' }
            ].map((sup, idx) => (
              <div key={idx} className="p-3 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="font-bold text-white">{sup.name}</div>
                  <div className="text-[11px] text-slate-400">{sup.grade}</div>
                  <div className={`text-[10px] font-bold ${sup.color} mt-0.5`}>{sup.status}</div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-500 block uppercase">Acceptance</span>
                  <span className="text-base font-black text-white">{sup.acceptanceRate}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
