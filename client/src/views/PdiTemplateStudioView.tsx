import React, { useEffect, useState, useRef } from 'react';
import {
  Radio,
  Plus,
  CheckCircle2,
  AlertCircle,
  Wrench,
  ShieldAlert,
  Save,
  Crosshair,
  Trash2
} from 'lucide-react';
import { PdiTemplate, BlueprintPin, Gauge } from '../types';
import { api } from '../utils/api';
import { sounds } from '../utils/audio';

export const PdiTemplateStudioView: React.FC = () => {
  const [templates, setTemplates] = useState<PdiTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<PdiTemplate | null>(null);
  const [gauges, setGauges] = useState<Gauge[]>([]);
  const [activePinId, setActivePinId] = useState<number | null>(null);
  const [isPlacingPin, setIsPlacingPin] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Blueprint image ref for click coordinates
  const imageContainerRef = useRef<HTMLDivElement>(null);

  const loadData = async () => {
    try {
      const [tmpls, infra] = await Promise.all([api.getTemplates(), api.getInfrastructure()]);
      setTemplates(tmpls || []);
      setGauges(infra.gauges || []);
      if (tmpls && tmpls.length > 0 && !selectedTemplate) {
        setSelectedTemplate(tmpls[0]);
        if (tmpls[0].pins.length > 0) {
          setActivePinId(tmpls[0].pins[0].pinId);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleBlueprintClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isPlacingPin || !selectedTemplate || !imageContainerRef.current) return;

    sounds.playTactileClick();
    const rect = imageContainerRef.current.getBoundingClientRect();
    const xPct = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const yPct = Math.round(((e.clientY - rect.top) / rect.height) * 100);

    const nextPinId = selectedTemplate.pins.length > 0
      ? Math.max(...selectedTemplate.pins.map(p => p.pinId)) + 1
      : 1;

    const newPin: BlueprintPin = {
      pinId: nextPinId,
      x: xPct,
      y: yPct,
      label: `Inspection Feature #${nextPinId}`,
      type: 'tolerance',
      nominal: 30.00,
      upper: 0.05,
      lower: -0.05,
      unit: 'mm',
      toolGaugeId: gauges[0]?.id || 'VC-104',
      toolName: gauges[0]?.name || 'Vernier Caliper',
      isCtq: false,
      notes: 'New inspection point pinned directly onto CAD blueprint'
    };

    const updatedTemplate: PdiTemplate = {
      ...selectedTemplate,
      pins: [...selectedTemplate.pins, newPin]
    };

    setSelectedTemplate(updatedTemplate);
    setActivePinId(nextPinId);
    setIsPlacingPin(false);
    showNotice(`Pin #${nextPinId} placed at coordinates (${xPct}%, ${yPct}%). Configure parameters below.`);
  };

  const handleUpdateActivePin = (updatedProps: Partial<BlueprintPin>) => {
    if (!selectedTemplate || activePinId === null) return;
    const updatedPins = selectedTemplate.pins.map(p =>
      p.pinId === activePinId ? { ...p, ...updatedProps } : p
    );
    setSelectedTemplate({
      ...selectedTemplate,
      pins: updatedPins
    });
  };

  const handleDeletePin = (pinId: number) => {
    if (!selectedTemplate) return;
    sounds.playTactileClick();
    const updatedPins = selectedTemplate.pins.filter(p => p.pinId !== pinId);
    setSelectedTemplate({
      ...selectedTemplate,
      pins: updatedPins
    });
    if (activePinId === pinId) {
      setActivePinId(updatedPins[0]?.pinId || null);
    }
    showNotice(`Pin #${pinId} removed from template.`);
  };

  const handleSaveTemplate = async () => {
    if (!selectedTemplate) return;
    sounds.playTactileClick();
    const res = await api.createTemplate({
      ...selectedTemplate,
      revision: selectedTemplate.revision === 'Rev A' ? 'Rev B' : selectedTemplate.revision,
      createdBy: 'Quality Engineer Dave'
    });
    if (res.success) {
      sounds.playPassChime();
      showNotice(`Template ${selectedTemplate.id} successfully updated and deployed to shopfloor tablets!`);
      loadData();
    }
  };

  const showNotice = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  const activePin = selectedTemplate?.pins.find(p => p.pinId === activePinId);

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Studio Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <Radio className="text-amber-500" size={24} />
            <h1 className="text-xl font-bold text-white">Central PDI Template Studio & Blueprint Pinning</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Section 4 Standard: Map physical CAD blueprint pins directly to tolerances, gauge calibration checks, and CTQ interlocks.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleSaveTemplate}
            className="flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg shadow-lg shadow-emerald-600/20 cursor-pointer"
          >
            <Save size={15} />
            <span>Save & Release Revision</span>
          </button>
        </div>
      </div>

      {notification && (
        <div className="p-3 bg-emerald-950/40 border border-emerald-500 rounded-lg text-emerald-300 text-xs font-mono flex items-center space-x-2 animate-pulse">
          <CheckCircle2 size={16} />
          <span>{notification}</span>
        </div>
      )}

      {/* Main Studio Viewport */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Interactive Blueprint Canvas (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="font-mono text-sm font-bold text-amber-300">
                {selectedTemplate?.partNumber} ({selectedTemplate?.revision})
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {selectedTemplate?.partName}
              </span>
            </div>

            <button
              onClick={() => {
                sounds.playTactileClick();
                setIsPlacingPin(!isPlacingPin);
              }}
              className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                isPlacingPin
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-lg shadow-amber-500/30'
                  : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
              }`}
            >
              <Crosshair size={14} />
              <span>{isPlacingPin ? 'Click Blueprint to Drop Pin' : '+ Place New Pin'}</span>
            </button>
          </div>

          {/* Interactive Canvas Container */}
          <div
            ref={imageContainerRef}
            onClick={handleBlueprintClick}
            className={`relative w-full aspect-[2/1] bg-slate-950 rounded-lg overflow-hidden border border-slate-800 select-none ${
              isPlacingPin ? 'cursor-crosshair ring-2 ring-amber-500 ring-offset-2 ring-offset-slate-900' : 'cursor-default'
            }`}
          >
            {/* Embedded Blueprint Image */}
            <img
              src="/blueprints/shaft_ts204_schematic.svg"
              alt="Part CAD Schematic"
              className="w-full h-full object-contain pointer-events-none"
            />

            {/* Visual Color-Coded Numbered Pins */}
            {selectedTemplate?.pins.map((pin) => {
              const isActive = pin.pinId === activePinId;
              const isCtq = pin.isCtq;

              return (
                <div
                  key={pin.pinId}
                  onClick={(e) => {
                    e.stopPropagation();
                    sounds.playTactileClick();
                    setActivePinId(pin.pinId);
                  }}
                  style={{
                    left: `${pin.x}%`,
                    top: `${pin.y}%`,
                    transform: 'translate(-50%, -50%)'
                  }}
                  className={`absolute z-20 cursor-pointer transition-all duration-150 flex items-center justify-center rounded-full shadow-lg font-mono font-black text-xs ${
                    isActive
                      ? 'w-9 h-9 ring-4 ring-white scale-110'
                      : 'w-7 h-7 hover:scale-110'
                  } ${
                    isCtq
                      ? 'bg-amber-500 text-slate-950 border-2 border-amber-300'
                      : 'bg-cyan-500 text-slate-950 border-2 border-cyan-200'
                  }`}
                  title={`${pin.label} (${isCtq ? 'CRITICAL CTQ' : 'Standard'})`}
                >
                  <span>{pin.pinId}</span>
                  {isCtq && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-600 rounded-full border border-white" />
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono pt-1">
            <div className="flex items-center space-x-3">
              <span className="flex items-center space-x-1">
                <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" />
                <span>CTQ Feature (Critical-to-Quality)</span>
              </span>
              <span className="flex items-center space-x-1">
                <span className="w-3 h-3 rounded-full bg-cyan-500 inline-block" />
                <span>Standard Dimension</span>
              </span>
            </div>
            <span>{selectedTemplate?.pins.length || 0} Pins Defined</span>
          </div>
        </div>

        {/* Right Column: Pin Feature Configuration Form (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-sm font-bold text-white flex items-center space-x-2">
              <Crosshair className="text-amber-400" size={16} />
              <span>Inspection Field Parameters</span>
            </h2>
            {activePin && (
              <button
                onClick={() => handleDeletePin(activePin.pinId)}
                className="text-slate-400 hover:text-rose-400 text-xs flex items-center space-x-1"
                title="Delete this pin"
              >
                <Trash2 size={14} />
                <span>Delete</span>
              </button>
            )}
          </div>

          {activePin ? (
            <div className="space-y-4 text-xs">
              {/* Feature Title & CTQ Toggle */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-400">Feature Description / Dimension Label</label>
                  <span className="font-mono text-amber-400 font-bold">Pin #{activePin.pinId}</span>
                </div>
                <input
                  type="text"
                  value={activePin.label}
                  onChange={(e) => handleUpdateActivePin({ label: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-medium"
                />
              </div>

              {/* CTQ (Critical-to-Quality) Priority Tagging */}
              <div className={`p-3 rounded-lg border transition-all ${
                activePin.isCtq
                  ? 'bg-amber-950/40 border-amber-500 text-amber-200'
                  : 'bg-slate-950 border-slate-800 text-slate-400'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <ShieldAlert size={16} className={activePin.isCtq ? 'text-amber-400' : 'text-slate-500'} />
                    <span className="font-bold text-slate-200">Critical-to-Quality (CTQ) Priority</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={activePin.isCtq}
                    onChange={(e) => handleUpdateActivePin({ isCtq: e.target.checked })}
                    className="w-4 h-4 accent-amber-500 cursor-pointer"
                  />
                </div>
                <p className="text-[11px] mt-1 text-slate-400">
                  {activePin.isCtq
                    ? 'CTQ dimensions carry strict tolerance locks. Out-of-spec entries instantly freeze the checklist and PREVENT supervisor concessions.'
                    : 'Standard inspection parameter. Non-critical deviations can be evaluated by shift supervisor.'}
                </p>
              </div>

              {/* Inspection Type Selector */}
              <div>
                <label className="block text-slate-400 mb-1">Inspection Evaluation Type</label>
                <select
                  value={activePin.type}
                  onChange={(e) => handleUpdateActivePin({ type: e.target.value as 'tolerance' | 'max' | 'min' | 'visual' })}
                  className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono"
                >
                  <option value="tolerance">Bilateral Tolerance (Nominal ± Tolerance)</option>
                  <option value="max">Maximum Allowable Limit (Ra Roughness / Runout)</option>
                  <option value="visual">Visual Pass / Fail Check (Go / No-Go Gauge)</option>
                </select>
              </div>

              {/* Tolerance Fields */}
              {activePin.type === 'tolerance' && (
                <div className="grid grid-cols-3 gap-2 bg-slate-950 p-3 rounded-lg border border-slate-800">
                  <div>
                    <label className="block text-slate-400 text-[11px] mb-1">Nominal (Target)</label>
                    <input
                      type="number"
                      step="0.001"
                      value={activePin.nominal ?? 0}
                      onChange={(e) => handleUpdateActivePin({ nominal: Number(e.target.value) })}
                      className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-[11px] mb-1">Upper Limit (+)</label>
                    <input
                      type="number"
                      step="0.001"
                      value={activePin.upper ?? 0}
                      onChange={(e) => handleUpdateActivePin({ upper: Number(e.target.value) })}
                      className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-emerald-400 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-[11px] mb-1">Lower Limit (-)</label>
                    <input
                      type="number"
                      step="0.001"
                      value={activePin.lower ?? 0}
                      onChange={(e) => handleUpdateActivePin({ lower: Number(e.target.value) })}
                      className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-rose-400 font-mono"
                    />
                  </div>
                </div>
              )}

              {activePin.type === 'max' && (
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                  <label className="block text-slate-400 text-[11px] mb-1">Maximum Allowed Threshold</label>
                  <input
                    type="number"
                    step="0.01"
                    value={activePin.maxLimit ?? 0.8}
                    onChange={(e) => handleUpdateActivePin({ maxLimit: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-white font-mono"
                  />
                </div>
              )}

              {/* Tool / Gauge Requirement */}
              <div>
                <label className="block text-slate-400 mb-1 flex items-center space-x-1">
                  <Wrench size={13} className="text-amber-400" />
                  <span>Mandatory Inspection Tool / Gauge ID</span>
                </label>
                <select
                  value={activePin.toolGaugeId}
                  onChange={(e) => {
                    const found = gauges.find(g => g.id === e.target.value);
                    handleUpdateActivePin({
                      toolGaugeId: e.target.value,
                      toolName: found?.name || 'Inspection Tool'
                    });
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono"
                >
                  {gauges.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.id} - {g.name} ({g.status})
                    </option>
                  ))}
                  <option value="VISUAL">VISUAL - Optical Visual Examination</option>
                </select>
                <p className="text-[10px] text-slate-500 mt-1">
                  System verifies gauge calibration validity during shopfloor measurement entry.
                </p>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-slate-400 mb-1">Blueprint Inspection Notes</label>
                <textarea
                  rows={2}
                  value={activePin.notes || ''}
                  onChange={(e) => handleUpdateActivePin({ notes: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-slate-200"
                />
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-slate-500 text-xs">
              Click a pin on the CAD blueprint to configure its tolerances.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
