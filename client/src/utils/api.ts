import { mockDb } from './mockDb';

const API_BASE = '/api';

const isStaticHosting = typeof window !== 'undefined' && (
  window.location.hostname.includes('github.io') ||
  window.location.protocol === 'file:'
);

async function safeFetch(fetcher: () => Promise<Response>, fallback: () => any): Promise<any> {
  if (isStaticHosting) {
    return Promise.resolve(fallback());
  }
  try {
    const res = await fetcher();
    if (!res.ok) {
      console.warn(`API returned ${res.status}, falling back to local database`);
      return Promise.resolve(fallback());
    }
    return await res.json();
  } catch (err) {
    console.warn('Network request failed, falling back to local database:', err);
    return Promise.resolve(fallback());
  }
}

export const api: Record<string, (...args: any[]) => Promise<any>> = {
  // Database Reset
  async resetDatabase(): Promise<any> {
    return mockDb.resetDatabase();
  },

  // Infrastructure
  async getInfrastructure(): Promise<any> {
    return safeFetch(
      () => fetch(`${API_BASE}/infrastructure`),
      () => mockDb.getInfrastructure()
    );
  },

  async completePmCheck(stationId: string, operatorId: string): Promise<any> {
    return safeFetch(
      () => fetch(`${API_BASE}/workstations/${stationId}/pm-check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operatorId, zeroPointVerified: true })
      }),
      () => mockDb.completePmCheck(stationId, operatorId)
    );
  },

  async validateGauge(gaugeId: string): Promise<any> {
    return safeFetch(
      () => fetch(`${API_BASE}/gauges/${encodeURIComponent(gaugeId)}/validate`),
      () => mockDb.validateGauge(gaugeId)
    );
  },

  // Raw Materials
  async getRawMaterials(): Promise<any> {
    return safeFetch(
      () => fetch(`${API_BASE}/raw-materials`),
      () => mockDb.getRawMaterials()
    );
  },

  async createRawMaterialIntake(data: any): Promise<any> {
    return safeFetch(
      () => fetch(`${API_BASE}/raw-materials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }),
      () => mockDb.createRawMaterialIntake(data)
    );
  },

  async verifyRawMaterial(id: string, decision: 'APPROVE' | 'REJECT', reason?: string, verifiedBy?: string): Promise<any> {
    return safeFetch(
      () => fetch(`${API_BASE}/raw-materials/${id}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, reason, verifiedBy })
      }),
      () => mockDb.verifyRawMaterial(id, decision, reason, verifiedBy)
    );
  },

  // Templates
  async getTemplates(): Promise<any> {
    return safeFetch(
      () => fetch(`${API_BASE}/templates`),
      () => mockDb.getTemplates()
    );
  },

  async createTemplate(data: any): Promise<any> {
    return safeFetch(
      () => fetch(`${API_BASE}/templates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }),
      () => mockDb.createTemplate(data)
    );
  },

  // Job Travelers
  async getJobTravelers(): Promise<any> {
    return safeFetch(
      () => fetch(`${API_BASE}/job-travelers`),
      () => mockDb.getJobTravelers()
    );
  },

  async getJobTraveler(id: string): Promise<any> {
    return safeFetch(
      () => fetch(`${API_BASE}/job-travelers/${id}`),
      () => mockDb.getJobTraveler(id)
    );
  },

  async completeOperation(travelerId: string, opNumber: number, operatorId: string, machineId: string, cycleMinutes?: number, notes?: string): Promise<any> {
    return safeFetch(
      () => fetch(`${API_BASE}/job-travelers/${travelerId}/complete-operation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ opNumber, operatorId, machineId, cycleMinutes, notes })
      }),
      () => mockDb.completeOperation(travelerId, opNumber, operatorId, machineId, cycleMinutes, notes)
    );
  },

  async signOffFirstPiece(travelerId: string, opNumber: number, qaInspectorId: string, remarks: string, measurements?: any[]): Promise<any> {
    return safeFetch(
      () => fetch(`${API_BASE}/job-travelers/${travelerId}/first-piece-signoff`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ opNumber, qaInspectorId, remarks, measurements })
      }),
      () => mockDb.signOffFirstPiece(travelerId, opNumber, qaInspectorId, remarks, measurements)
    );
  },

  async logHourlyInspection(travelerId: string, opNumber: number, operatorId: string, sampleCount: number): Promise<any> {
    return safeFetch(
      () => fetch(`${API_BASE}/job-travelers/${travelerId}/hourly-inspection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ opNumber, operatorId, sampleCount, status: 'Pass' })
      }),
      () => mockDb.logHourlyInspection(travelerId, opNumber, operatorId, sampleCount)
    );
  },

  // Inspections
  async submitInspection(data: any, isOffline = false): Promise<any> {
    if (isOffline) {
      // Save to offline queue in localStorage
      const queue = JSON.parse(localStorage.getItem('zapuza_offline_inspections') || '[]');
      queue.push({ ...(data as object), queuedAt: new Date().toISOString() });
      localStorage.setItem('zapuza_offline_inspections', JSON.stringify(queue));
      return { success: true, offlineQueued: true, message: 'Saved to local rugged tablet offline cache. Will auto-sync when online.' };
    }

    return safeFetch(
      () => fetch(`${API_BASE}/inspections/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }),
      () => mockDb.submitInspection(data, isOffline)
    );
  },

  async syncOfflineInspections(): Promise<any> {
    const raw = localStorage.getItem('zapuza_offline_inspections');
    if (!raw) return { syncedCount: 0 };
    const queue = JSON.parse(raw);
    if (!queue.length) return { syncedCount: 0 };

    let syncedCount = 0;
    for (const item of queue) {
      try {
        if (isStaticHosting) {
          mockDb.submitInspection(item, true);
        } else {
          try {
            await fetch(`${API_BASE}/inspections/submit`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ...item, isOfflineSync: true })
            });
          } catch {
            mockDb.submitInspection(item, true);
          }
        }
        syncedCount++;
      } catch (err) {
        console.error('Failed to sync offline item', err);
      }
    }
    localStorage.removeItem('zapuza_offline_inspections');
    return { syncedCount };
  },

  async getInspections(): Promise<any> {
    return safeFetch(
      () => fetch(`${API_BASE}/inspections`),
      () => mockDb.getInspections()
    );
  },

  // Supervisor Approvals
  async getSupervisorQueue(): Promise<any> {
    return safeFetch(
      () => fetch(`${API_BASE}/supervisor/queue`),
      () => mockDb.getSupervisorQueue()
    );
  },

  async submitSupervisorDecision(data: any): Promise<any> {
    return safeFetch(
      () => fetch(`${API_BASE}/supervisor/decision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }),
      () => mockDb.supervisorDecision(data)
    );
  },

  // MRB Cases
  async getMrbCases(): Promise<any> {
    return safeFetch(
      () => fetch(`${API_BASE}/mrb`),
      () => mockDb.getMrbCases()
    );
  },

  async submitMrbDisposition(id: string, data: any): Promise<any> {
    return safeFetch(
      () => fetch(`${API_BASE}/mrb/${id}/disposition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }),
      () => mockDb.resolveMrbCase(id, data)
    );
  },

  // Shipping Interlock
  async checkShippingInterlock(travelerId: string): Promise<any> {
    return safeFetch(
      () => fetch(`${API_BASE}/shipping/check-interlock/${travelerId}`),
      () => mockDb.checkShippingInterlock(travelerId)
    );
  },

  async generateGatePass(data: any): Promise<any> {
    return safeFetch(
      () => fetch(`${API_BASE}/shipping/generate-gate-pass`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }),
      () => mockDb.generateGatePass(data)
    );
  },

  // Traceability
  async queryForwardTraceability(heatNumber: string): Promise<any> {
    return safeFetch(
      () => fetch(`${API_BASE}/traceability/forward/${encodeURIComponent(heatNumber)}`),
      () => mockDb.forwardTraceability(heatNumber)
    );
  },

  async queryBackwardTraceability(serialNumber: string): Promise<any> {
    return safeFetch(
      () => fetch(`${API_BASE}/traceability/backward/${encodeURIComponent(serialNumber)}`),
      () => mockDb.backwardTraceability(serialNumber)
    );
  },

  // Customer Public Certificate
  async getPublicCertificate(travelerId: string): Promise<any> {
    return safeFetch(
      () => fetch(`${API_BASE}/public/coa/${travelerId}`),
      () => mockDb.getPublicCoa(travelerId)
    );
  },

  // Shift Handovers
  async getShiftHandovers(): Promise<any> {
    return safeFetch(
      () => fetch(`${API_BASE}/shift-handovers`),
      () => mockDb.getShiftHandovers()
    );
  },

  async createShiftHandover(data: any): Promise<any> {
    return safeFetch(
      () => fetch(`${API_BASE}/shift-handovers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }),
      () => mockDb.createShiftHandover(data)
    );
  },

  async acknowledgeShiftHandover(id: string, data: any): Promise<any> {
    return safeFetch(
      () => fetch(`${API_BASE}/shift-handovers/${id}/acknowledge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }),
      () => mockDb.acknowledgeShiftHandover(id, data?.incomingSupervisor, data?.incomingSignature)
    );
  },

  // Bottlenecks
  async getBottlenecks(): Promise<any> {
    return safeFetch(
      () => fetch(`${API_BASE}/bottlenecks`),
      () => mockDb.getBottlenecks()
    );
  },

  // Audit Logs
  async getAuditLogs(): Promise<any> {
    return safeFetch(
      () => fetch(`${API_BASE}/audit-logs`),
      () => mockDb.getAuditLogs()
    );
  }
};
