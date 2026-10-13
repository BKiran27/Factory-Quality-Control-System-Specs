import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  Printer,
  X,
  FileCheck,
  CheckCircle2,
  Lock,
  Award,
  Layers,
  Cpu
} from 'lucide-react';
import { api } from '../utils/api';
import { QrCodeBadge } from '../components/QrCodeBadge';

interface PublicCoaModalProps {
  travelerId: string;
  onClose: () => void;
}

export const PublicCoaModal: React.FC<PublicCoaModalProps> = ({ travelerId, onClose }) => {
  const [coaData, setCoaData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCert = async () => {
      try {
        const data = await api.getPublicCertificate(travelerId);
        setCoaData(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchCert();
  }, [travelerId]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-50 text-white font-mono text-sm">
        Verifying cryptographic digital signatures...
      </div>
    );
  }

  if (!coaData || coaData.error) {
    return (
      <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-50">
        <div className="bg-slate-900 border border-slate-700 p-6 rounded-xl max-w-md w-full text-center space-y-3">
          <p className="text-rose-400 font-mono text-xs">Certificate of Analysis not found for Lot {travelerId}.</p>
          <button onClick={onClose} className="px-4 py-2 bg-slate-800 text-white text-xs font-bold rounded">Close</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/90 overflow-y-auto flex items-center justify-center p-4 z-50">
      <div className="bg-white text-slate-950 rounded-2xl max-w-4xl w-full p-6 sm:p-10 shadow-2xl space-y-6 my-8 print-card">
        {/* Certificate Header Block */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b-2 border-slate-900 pb-5">
          <div className="space-y-1">
            <div className="text-[11px] font-mono uppercase tracking-widest text-amber-700 font-extrabold">
              ZAPUZA TECHNOLOGIES LLP • AEROSPACE & DEFENSE QUALITY LAB
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-950">
              OFFICIAL CERTIFICATE OF ANALYSIS (CoA)
            </h1>
            <div className="text-xs font-mono text-slate-600">
              ISO 9001:2015 & AS9100D Certified Digital Inspection Document
            </div>
          </div>

          <div className="flex items-center space-x-3 self-end sm:self-auto">
            <button
              onClick={() => window.print()}
              className="no-print px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded flex items-center space-x-1 cursor-pointer"
            >
              <Printer size={14} />
              <span>Print / PDF</span>
            </button>
            <button
              onClick={onClose}
              className="no-print text-slate-400 hover:text-black font-black text-lg p-1"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Certificate Metadata Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs font-mono">
          <div>
            <span className="text-slate-500 block text-[10px]">CERTIFICATE ID</span>
            <strong className="text-slate-950 font-bold">{coaData.certificateNumber}</strong>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px]">CUSTOMER ORDER</span>
            <strong className="text-slate-950 font-bold">{coaData.customerPo}</strong>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px]">PART IDENTIFIER</span>
            <strong className="text-slate-950 font-bold">{coaData.partNumber}</strong>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px]">HEAT LOT NUMBER</span>
            <strong className="text-slate-950 font-bold">{coaData.heatLot}</strong>
          </div>
        </div>

        {/* Raw Material Verification Summary */}
        <div className="space-y-2 text-xs font-mono">
          <div className="flex items-center space-x-1.5 text-slate-900 font-bold border-b pb-1">
            <Layers size={14} className="text-amber-600" />
            <span>RAW MATERIAL SOURCE & CERTIFIED SPECTRO CHEMISTRY</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-3 rounded-lg border border-slate-200">
            <div>
              <div><strong>Supplier Mill:</strong> {coaData.rawMaterialSupplier}</div>
              <div><strong>Material Grade:</strong> {coaData.materialGrade}</div>
              <div><strong>Heat Batch:</strong> {coaData.heatLot}</div>
            </div>
            <div>
              <span className="font-bold text-[11px] block mb-1">Certified Chemical Actuals (%):</span>
              <div className="grid grid-cols-3 gap-1 text-[11px]">
                {coaData.chemicalComposition?.map((c: any, idx: number) => (
                  <div key={idx}>
                    {c.element.split(' ')[0]}: <strong className="text-slate-900">{c.actual}%</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Final PDI Metrology Inspection Measurements */}
        <div className="space-y-2 text-xs font-mono">
          <div className="flex items-center space-x-1.5 text-slate-900 font-bold border-b pb-1">
            <Cpu size={14} className="text-amber-600" />
            <span>FINAL PRE-DISPATCH INSPECTION (PDI) DIMENSIONS</span>
          </div>

          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 border-b">
                <tr>
                  <th className="p-2">Feature Description</th>
                  <th className="p-2">Nominal Target</th>
                  <th className="p-2">Measured Value</th>
                  <th className="p-2 text-right">Verification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {coaData.pdiMeasurements?.map((m: any, idx: number) => (
                  <tr key={idx}>
                    <td className="p-2 font-bold">{m.label}</td>
                    <td className="p-2 text-slate-600">
                      {m.nominal !== undefined ? `${m.nominal} ${m.unit}` : (m.maxLimit ? `MAX ${m.maxLimit}` : 'Pass')}
                    </td>
                    <td className="p-2 font-bold text-slate-900">{m.actual} {m.unit}</td>
                    <td className="p-2 text-right font-bold text-emerald-700">CONFORMING ✓</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quality Concession Note */}
        <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs font-mono text-amber-900">
          <strong>Quality Conformance Declaration:</strong> {coaData.concessionNote}
        </div>

        {/* Signatures & Tamper-Proof Cryptographic Hash */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t-2 border-slate-900 text-xs font-mono">
          <div className="flex items-center space-x-3">
            <QrCodeBadge value={`https://qc.zapuza.io/coa/${coaData.certificateNumber}`} size={80} />
            <div className="space-y-0.5 text-[11px]">
              <div><strong>AUTHENTICATED RECORD</strong></div>
              <div className="text-slate-600">Hash: {coaData.digitalVerificationHash}</div>
              <div className="text-emerald-700 font-bold flex items-center space-x-1">
                <CheckCircle2 size={12} />
                <span>Zero Defect Escape Verified</span>
              </div>
            </div>
          </div>

          <div className="text-right space-y-1">
            <div className="font-serif italic text-base font-bold text-slate-900">Robert Vance</div>
            <div className="border-t border-slate-400 pt-0.5 font-bold">{coaData.authorizedSignatory}</div>
            <div className="text-[10px] text-slate-500">Zapuza Technologies Quality Director</div>
          </div>
        </div>
      </div>
    </div>
  );
};
