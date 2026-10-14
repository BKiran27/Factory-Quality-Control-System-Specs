import { mockDb } from './mockDb';

const API_BASE = '/api';

async function safeFetch(url: string, options?: RequestInit, fallbackFn?: () => any): Promise<any> {
  try {
    const res = await fetch(url, options);
    // If static host returns 404 or index.html fallback for /api/*
    const contentType = res.headers.get('content-type') || '';
    if (!res.ok || !contentType.includes('application/json')) {
      throw new Error(`API unreachable or non-JSON response (${res.status})`);
    }
    return await res.json();
  } catch (err) {
    if (fallbackFn) {
      return fallbackFn();
    }
    throw err;
  }
}

export const api = {
  // Reset Sample Data
  async resetDatabase() {
    return mockDb.resetDatabase();
  },

  // Infrastructure
  async getInfrastructure() {
    return safeFetch(
      `${API_BASE}/infrastructure`,
      undefined,
      () => mockDb.getInfrastructure()
    );
  },

  async completePmCheck(stationId: string, operatorId: string) {
    return safeFetch(
      `${API_BASE}/workstations/${stationId}/pm-check`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operatorId, zeroPointVerified: true })
      },
      () => mockDb.completePmCheck(stationId, operatorId)
    );
  },

  async validateGauge(gaugeId: string) {
    return safeFetch(
      `${API_BASE}/gauges/${encodeURIComponent(gaugeId)}/validate`,
      undefined,
      () => mockDb.validateGauge(gaugeId)
    );
  },

  // Raw Materials
  async getRawMaterials() {
    return safeFetch(
      `${API_BASE}/raw-materials`,
      undefined,
      () => mockDb.getRawMaterials()
    );
  },

  async createRawMaterialIntake(data: any) {
    return safeFetch(
      `${API_BASE}/raw-materials`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      },
      () => mockDb.createRawMaterialIntake(data)
    );
  },

  async verifyRawMaterial(id: string, decision: 'APPROVE' | 'REJECT', reason?: string, verifiedBy?: string) {
    return safeFetch(
      `${API_BASE}/raw-materials/${id}/verify`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, reason, verifiedBy })
      },
      () => mockDb.verifyRawMaterial(id, decision, reason, verifiedBy)
    );
  },

  // Templates
  async getTemplates() {
    return safeFetch(
      `${API_BASE}/templates`,
      undefined,
      () => mockDb.getTemplates()
    );
  },

  async createTemplate(data: any) {
    return safeFetch(
      `${API_BASE}/templates`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      },
      () => mockDb.createTemplate(data)
    );
  },

  // Job Travelers
  async getJobTravelers() {
    return safeFetch(
      `${API_BASE}/job-travelers`,
      undefined,
      () => mockDb.getJobTravelers()
    );
  },

  async getJobTraveler(id: string) {
    return safeFetch(
      `${API_BASE}/job-travelers/${id}`,
      undefined,
      () => mockDb.getJobTraveler(id)
    );
  },

  async completeOperation(travelerId: string, opNumber: number, operatorId: string, machineId: string, cycleMinutes?: number, notes?: string) {
    return safeFetch(
      `${API_BASE}/job-travelers/${travelerId}/complete-operation`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ opNumber, operatorId, machineId, cycleMinutes, notes })
      },
      () => mockDb.completeOperation(travelerId, opNumber, operatorId, machineId, cycleMinutes, notes)
    );
  },

  async signOffFirstPiece(travelerId: string, opNumber: number, qaInspectorId: string, remarks: string) {
    return safeFetch(
      `${API_BASE}/job-travelers/${travelerId}/first-piece-signoff`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ opNumber, qaInspectorId, remarks })
      },
      () => mockDb.signOffFirstPiece(travelerId, opNumber, qaInspectorId, remarks)
    );
  },

  async logHourlyInspection(travelerId: string, opNumber: number, operatorId: string, sampleCount: number) {
    return safeFetch(
      `${API_BASE}/job-travelers/${travelerId}/hourly-inspection`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ opNumber, operatorId, sampleCount, status: 'Pass' })
      },
      () => mockDb.logHourlyInspection(travelerId, opNumber, operatorId, sampleCount)
    );
  },

  // Inspections
  async submitInspection(data: any, isOffline = false) {
    if (isOffline) {
      const queue = JSON.parse(localStorage.getItem('zapuza_offline_inspections') || '[]');
      queue.push({ ...(data as object), queuedAt: new Date().toISOString() });
      localStorage.setItem('zapuza_offline_inspections', JSON.stringify(queue));
      return { success: true, offlineQueued: true, message: 'Saved to local rugged tablet offline cache. Will auto-sync when online.' };
    }

    return safeFetch(
      `${API_BASE}/inspections/submit`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      },
      () => mockDb.submitInspection(data, false)
    );
  },

  async syncOfflineInspections() {
    const raw = localStorage.getItem('zapuza_offline_inspections');
    if (!raw) return { syncedCount: 0 };
    const queue = JSON.parse(raw);
    if (!queue.length) return { syncedCount: 0 };

    let syncedCount = 0;
    for (const item of queue) {
      try {
        await api.submitInspection(item, false);
        syncedCount++;
      } catch (err) {
        console.error('Failed to sync offline item', err);
      }
    }
    localStorage.removeItem('zapuza_offline_inspections');
    return { syncedCount };
  },

  async getInspections() {
    return safeFetch(
      `${API_BASE}/inspections`,
      undefined,
      () => mockDb.getInspections()
    );
  },

  // Supervisor Approvals
  async getSupervisorQueue() {
    return safeFetch(
      `${API_BASE}/supervisor/queue`,
      undefined,
      () => mockDb.getSupervisorQueue()
    );
  },

  async submitSupervisorDecision(data: any) {
    return safeFetch(
      `${API_BASE}/supervisor/decision`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      },
      () => mockDb.supervisorDecision(data)
    );
  },

  // MRB Cases
  async getMrbCases() {
    return safeFetch(
      `${API_BASE}/mrb`,
      undefined,
      () => mockDb.getMrbCases()
    );
  },

  async submitMrbDisposition(id: string, data: any) {
    return safeFetch(
      `${API_BASE}/mrb/${id}/disposition`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      },
      () => mockDb.resolveMrbCase(id, data)
    );
  },

  // Shipping Interlock
  async checkShippingInterlock(travelerId: string) {
    return safeFetch(
      `${API_BASE}/shipping/check-interlock/${travelerId}`,
      undefined,
      () => mockDb.checkShippingInterlock(travelerId)
    );
  },

  async generateGatePass(data: any) {
    return safeFetch(
      `${API_BASE}/shipping/generate-gate-pass`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      },
      () => mockDb.generateGatePass(data)
    );
  },

  // Traceability
  async queryForwardTraceability(heatNumber: string) {
    return safeFetch(
      `${API_BASE}/traceability/forward/${encodeURIComponent(heatNumber)}`,
      undefined,
      () => mockDb.forwardTraceability(heatNumber)
    );
  },

  async queryBackwardTraceability(serialNumber: string) {
    return safeFetch(
      `${API_BASE}/traceability/backward/${encodeURIComponent(serialNumber)}`,
      undefined,
      () => mockDb.backwardTraceability(serialNumber)
    );
  },

  // Customer Public Certificate
  async getPublicCertificate(travelerId: string) {
    return safeFetch(
      `${API_BASE}/public/coa/${travelerId}`,
      undefined,
      () => mockDb.getPublicCoa(travelerId)
    );
  },

  // Shift Handovers
  async getShiftHandovers() {
    return safeFetch(
      `${API_BASE}/shift-handovers`,
      undefined,
      () => mockDb.getShiftHandovers()
    );
  },

  async createShiftHandover(data: any) {
    return safeFetch(
      `${API_BASE}/shift-handovers`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      },
      () => mockDb.createShiftHandover(data)
    );
  },

  async acknowledgeShiftHandover(id: string, data: any) {
    return safeFetch(
      `${API_BASE}/shift-handovers/${id}/acknowledge`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      },
      () => mockDb.acknowledgeShiftHandover(id, data?.incomingSupervisor, data?.incomingSignature)
    );
  },

  // Bottlenecks
  async getBottlenecks() {
    return safeFetch(
      `${API_BASE}/bottlenecks`,
      undefined,
      () => mockDb.getBottlenecks()
    );
  },

  // Audit Logs
  async getAuditLogs() {
    return safeFetch(
      `${API_BASE}/audit-logs`,
      undefined,
      () => mockDb.getAuditLogs()
    );
  }
};
