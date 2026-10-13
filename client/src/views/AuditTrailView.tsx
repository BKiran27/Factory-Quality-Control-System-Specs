import React, { useEffect, useState } from 'react';
import {
  History,
  ShieldCheck,
  Search,
  Filter,
  Lock,
  Cpu,
  RefreshCw
} from 'lucide-react';
import { AuditLog } from '../types';
import { api } from '../utils/api';
import { sounds } from '../utils/audio';

export const AuditTrailView: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [filterText, setFilterText] = useState('');
  const [loading, setLoading] = useState(true);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const data = await api.getAuditLogs();
      setLogs(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const filtered = logs.filter(
    (l) =>
      l.action.toLowerCase().includes(filterText.toLowerCase()) ||
      l.userId.toLowerCase().includes(filterText.toLowerCase()) ||
      l.details.toLowerCase().includes(filterText.toLowerCase()) ||
      l.entityId.toLowerCase().includes(filterText.toLowerCase())
  );

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <History className="text-amber-500" size={24} />
            <h1 className="text-xl font-bold text-white">Immutable Tamper-Proof System Audit Trail</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Section 13.3 Standard: Cryptographically verified immutable event log (ISO 9001 / AS9100D compliance). Past data cannot be deleted or modified.
          </p>
        </div>

        <button
          onClick={() => {
            sounds.playTactileClick();
            loadLogs();
          }}
          className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold rounded-lg self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          <span>Refresh Audit Records</span>
        </button>
      </div>

      {/* Filter and Security Tag */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900 p-4 rounded-xl border border-slate-800">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-2.5 text-slate-500" size={15} />
          <input
            type="text"
            placeholder="Search action, user, or entity ID..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex items-center space-x-2 text-xs font-mono text-emerald-400">
          <ShieldCheck size={16} />
          <span>Write-Once Read-Many (WORM) Storage Active</span>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase text-[11px]">
              <tr>
                <th className="p-3">Timestamp (UTC)</th>
                <th className="p-3">User ID & Role</th>
                <th className="p-3">Security Action</th>
                <th className="p-3">Target Entity</th>
                <th className="p-3">Audit Details</th>
                <th className="p-3">Device / IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-slate-900/60">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    No matching audit records found.
                  </td>
                </tr>
              ) : (
                filtered.map((log) => {
                  const isConcession = log.action.includes('CONCESSION');
                  const isQuarantine = log.action.includes('QUARANTINE') || log.action.includes('REJECT');
                  const isApproval = log.action.includes('APPROV') || log.action.includes('CLEAR');

                  return (
                    <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3 text-slate-400 whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <span className="font-bold text-white block">{log.userId}</span>
                        <span className="text-[10px] text-slate-400">{log.userRole}</span>
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            isConcession
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              : isQuarantine
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                              : isApproval
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <span className="text-amber-400 font-bold">{log.entityId}</span>
                        <span className="text-[10px] text-slate-500 block">{log.entityType}</span>
                      </td>
                      <td className="p-3 text-slate-200 max-w-md">
                        {log.details}
                      </td>
                      <td className="p-3 text-slate-400 whitespace-nowrap text-[11px]">
                        <div>{log.ipAddress}</div>
                        <div className="text-[10px] text-slate-500">{log.deviceSerial}</div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
