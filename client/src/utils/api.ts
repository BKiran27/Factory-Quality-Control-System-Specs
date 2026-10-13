const API_BASE = '/api';

export const api = {
  // Infrastructure
  async getInfrastructure() {
    const res = await fetch(`${API_BASE}/infrastructure`);
    return res.json();
  },

  async completePmCheck(stationId: string, operatorId: string) {
    const res = await fetch(`${API_BASE}/workstations/${stationId}/pm-check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ operatorId, zeroPointVerified: true })
    });
    return res.json();
  },

  async validateGauge(gaugeId: string) {
    const res = await fetch(`${API_BASE}/gauges/${encodeURIComponent(gaugeId)}/validate`);
    return res.json();
  },

  // Raw Materials
  async getRawMaterials() {
    const res = await fetch(`${API_BASE}/raw-materials`);
    return res.json();
  },

  async createRawMaterialIntake(data: unknown) {
    const res = await fetch(`${API_BASE}/raw-materials`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async verifyRawMaterial(id: string, decision: 'APPROVE' | 'REJECT', reason?: string, verifiedBy?: string) {
    const res = await fetch(`${API_BASE}/raw-materials/${id}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision, reason, verifiedBy })
    });
    return res.json();
  },

  // Templates
  async getTemplates() {
    const res = await fetch(`${API_BASE}/templates`);
    return res.json();
  },

  async createTemplate(data: unknown) {
    const res = await fetch(`${API_BASE}/templates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  // Job Travelers
  async getJobTravelers() {
    const res = await fetch(`${API_BASE}/job-travelers`);
    return res.json();
  },

  async getJobTraveler(id: string) {
    const res = await fetch(`${API_BASE}/job-travelers/${id}`);
    return res.json();
  },

  async completeOperation(travelerId: string, opNumber: number, operatorId: string, machineId: string) {
    const res = await fetch(`${API_BASE}/job-travelers/${travelerId}/complete-operation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ opNumber, operatorId, machineId })
    });
    return res.json();
  },

  async signOffFirstPiece(travelerId: string, opNumber: number, qaInspectorId: string, remarks: string) {
    const res = await fetch(`${API_BASE}/job-travelers/${travelerId}/first-piece-signoff`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ opNumber, qaInspectorId, remarks })
    });
    return res.json();
  },

  async logHourlyInspection(travelerId: string, opNumber: number, operatorId: string, sampleCount: number) {
    const res = await fetch(`${API_BASE}/job-travelers/${travelerId}/hourly-inspection`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ opNumber, operatorId, sampleCount, status: 'Pass' })
    });
    return res.json();
  },

  // Inspections
  async submitInspection(data: unknown, isOffline = false) {
    if (isOffline) {
      // Save to offline queue in localStorage
      const queue = JSON.parse(localStorage.getItem('zapuza_offline_inspections') || '[]');
      queue.push({ ...(data as object), queuedAt: new Date().toISOString() });
      localStorage.setItem('zapuza_offline_inspections', JSON.stringify(queue));
      return { success: true, offlineQueued: true, message: 'Saved to local rugged tablet offline cache. Will auto-sync when online.' };
    }

    const res = await fetch(`${API_BASE}/inspections/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async syncOfflineInspections() {
    const raw = localStorage.getItem('zapuza_offline_inspections');
    if (!raw) return { syncedCount: 0 };
    const queue = JSON.parse(raw);
    if (!queue.length) return { syncedCount: 0 };

    let syncedCount = 0;
    for (const item of queue) {
      try {
        await fetch(`${API_BASE}/inspections/submit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...item, isOfflineSync: true })
        });
        syncedCount++;
      } catch (err) {
        console.error('Failed to sync offline item', err);
      }
    }
    localStorage.removeItem('zapuza_offline_inspections');
    return { syncedCount };
  },

  async getInspections() {
    const res = await fetch(`${API_BASE}/inspections`);
    return res.json();
  },

  // Supervisor Approvals
  async getSupervisorQueue() {
    const res = await fetch(`${API_BASE}/supervisor/queue`);
    return res.json();
  },

  async submitSupervisorDecision(data: unknown) {
    const res = await fetch(`${API_BASE}/supervisor/decision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  // MRB Cases
  async getMrbCases() {
    const res = await fetch(`${API_BASE}/mrb`);
    return res.json();
  },

  async submitMrbDisposition(id: string, data: unknown) {
    const res = await fetch(`${API_BASE}/mrb/${id}/disposition`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  // Shipping Interlock
  async checkShippingInterlock(travelerId: string) {
    const res = await fetch(`${API_BASE}/shipping/check-interlock/${travelerId}`);
    return res.json();
  },

  async generateGatePass(data: unknown) {
    const res = await fetch(`${API_BASE}/shipping/generate-gate-pass`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  // Traceability
  async queryForwardTraceability(heatNumber: string) {
    const res = await fetch(`${API_BASE}/traceability/forward/${encodeURIComponent(heatNumber)}`);
    return res.json();
  },

  async queryBackwardTraceability(serialNumber: string) {
    const res = await fetch(`${API_BASE}/traceability/backward/${encodeURIComponent(serialNumber)}`);
    return res.json();
  },

  // Customer Public Certificate
  async getPublicCertificate(travelerId: string) {
    const res = await fetch(`${API_BASE}/public/coa/${travelerId}`);
    return res.json();
  },

  // Shift Handovers
  async getShiftHandovers() {
    const res = await fetch(`${API_BASE}/shift-handovers`);
    return res.json();
  },

  async createShiftHandover(data: unknown) {
    const res = await fetch(`${API_BASE}/shift-handovers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async acknowledgeShiftHandover(id: string, data: unknown) {
    const res = await fetch(`${API_BASE}/shift-handovers/${id}/acknowledge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  // Bottlenecks
  async getBottlenecks() {
    const res = await fetch(`${API_BASE}/bottlenecks`);
    return res.json();
  },

  // Audit Logs
  async getAuditLogs() {
    const res = await fetch(`${API_BASE}/audit-logs`);
    return res.json();
  }
};
