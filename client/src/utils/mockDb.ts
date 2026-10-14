import initialDataRaw from '../data/initialData.json';

const STORAGE_KEY = 'zapuza_factory_db_v5';

function getStoredDb(): any {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && parsed.workstations && parsed.jobTravelers) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Failed to parse localStorage db:', err);
  }
  const cloned = JSON.parse(JSON.stringify(initialDataRaw));
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cloned));
  } catch {}
  return cloned;
}

function persistDb(db: any) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch (err) {
    console.warn('Failed to persist to localStorage:', err);
  }
}

function logAudit(
  db: any,
  userId: string,
  role: string,
  action: string,
  entityType: string,
  entityId: string,
  details: string,
  oldValue: any = null,
  newValue: any = null
) {
  const logEntry = {
    id: 'AUD-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
    timestamp: new Date().toISOString(),
    userId: userId || 'SYSTEM_OP',
    userRole: role || 'System',
    action,
    entityType,
    entityId,
    details,
    oldValue,
    newValue,
    ipAddress: '127.0.0.1 (Offline/PWA Node)',
    deviceSerial: 'TAB-SHOPFLOOR-07'
  };
  if (!db.auditLogs) db.auditLogs = [];
  db.auditLogs.unshift(logEntry);
  if (db.auditLogs.length > 500) db.auditLogs.pop();
  return logEntry;
}

export const mockDb = {
  resetDatabase() {
    const fresh = JSON.parse(JSON.stringify(initialDataRaw));
    persistDb(fresh);
    return fresh;
  },

  getInfrastructure() {
    const db = getStoredDb();
    return {
      factories: db.factories || [],
      departments: db.departments || [],
      workstations: db.workstations || [],
      gauges: db.gauges || [],
      parts: db.parts || []
    };
  },

  completePmCheck(stationId: string, operatorId: string) {
    const db = getStoredDb();
    const station = (db.workstations || []).find((w: any) => w.id === stationId);
    if (!station) return { error: 'Workstation not found' };

    const oldStatus = station.pmStatus;
    station.pmStatus = 'Completed';
    station.lastPmDate = new Date().toISOString();
    station.pmCheckedBy = operatorId || 'OP-104';
    station.zeroPointVerified = true;

    logAudit(
      db,
      operatorId,
      'Operator',
      'PM_CHECK_COMPLETED',
      'Workstation',
      stationId,
      `Daily PM completed for ${station.name}`,
      { pmStatus: oldStatus },
      { pmStatus: 'Completed' }
    );

    persistDb(db);
    return { success: true, workstation: station };
  },

  getGauges() {
    const db = getStoredDb();
    return db.gauges || [];
  },

  validateGauge(gaugeId: string) {
    const db = getStoredDb();
    const gauge = (db.gauges || []).find(
      (g: any) =>
        g.id.toLowerCase() === gaugeId.toLowerCase() ||
        g.serialNumber.toLowerCase() === gaugeId.toLowerCase()
    );
    if (!gauge) {
      return { valid: false, error: 'Gauge not found in calibration register' };
    }

    const isExpired = new Date(gauge.expiryDate) < new Date();
    if (isExpired || gauge.status !== 'Valid') {
      return {
        valid: false,
        gauge,
        error: `Expired Tool Calibration! Calibration for ${gauge.id} (${gauge.name}) expired on ${gauge.expiryDate}. Instruct worker to obtain a calibrated tool from the tool crib.`
      };
    }

    return { valid: true, gauge };
  },

  getRawMaterials() {
    const db = getStoredDb();
    return db.rawMaterials || [];
  },

  createRawMaterialIntake(data: any) {
    const db = getStoredDb();
    const id = 'RMI-' + Date.now().toString().slice(-6);
    const newIntake = {
      id,
      heatNumber: data.heatNumber,
      supplierName: data.supplierName,
      poNumber: data.poNumber || 'PO-' + Math.floor(10000 + Math.random() * 90000),
      materialGrade: data.materialGrade,
      quantity: Number(data.quantity) || 100,
      unit: data.unit || 'Billets',
      receivedDate: new Date().toISOString(),
      recordedBy: data.recordedBy || 'DOCK-CLERK-01',
      status: 'In Lab Testing',
      barcodeTag: `RAW-${data.heatNumber}-${(data.materialGrade || '').replace(/[^A-Za-z0-9]/g, '')}`,
      mtcFileName: data.mtcFileName || 'MTC_' + data.heatNumber + '.pdf',
      chemicalSpecs: data.chemicalSpecs || [],
      mechanicalSpecs: data.mechanicalSpecs || []
    };

    if (!db.rawMaterials) db.rawMaterials = [];
    db.rawMaterials.unshift(newIntake);
    logAudit(
      db,
      data.recordedBy,
      'Dock Clerk',
      'RAW_MATERIAL_INTAKE_LOGGED',
      'RawMaterial',
      id,
      `Intake logged for Heat #${data.heatNumber} from ${data.supplierName}`,
      null,
      newIntake
    );
    persistDb(db);
    return { success: true, intake: newIntake };
  },

  verifyRawMaterial(id: string, decision: 'APPROVE' | 'REJECT', reason?: string, verifiedBy?: string) {
    const db = getStoredDb();
    const item = (db.rawMaterials || []).find((r: any) => r.id === id);
    if (!item) return { error: 'Record not found' };

    const oldStatus = item.status;
    if (decision === 'APPROVE') {
      item.status = 'Cleared to Store';
      item.clearedDate = new Date().toISOString();
      item.verifiedBy = verifiedBy || 'QA-LAB-TECH-02';
      logAudit(
        db,
        verifiedBy || 'QA-LAB-TECH-02',
        'QA Lab Specialist',
        'RAW_MATERIAL_APPROVED',
        'RawMaterial',
        id,
        `Heat #${item.heatNumber} passed lab verification and released to shopfloor store.`,
        { status: oldStatus },
        { status: item.status }
      );
    } else {
      item.status = 'Supplier Quarantine';
      item.sncrNumber = 'SNCR-' + Math.floor(1000 + Math.random() * 9000);
      item.rejectionReason = reason || 'Non-conforming chemical or physical specs';
      item.rejectedDate = new Date().toISOString();
      item.verifiedBy = verifiedBy || 'QA-LAB-TECH-02';
      logAudit(
        db,
        verifiedBy || 'QA-LAB-TECH-02',
        'QA Lab Specialist',
        'RAW_MATERIAL_QUARANTINED',
        'RawMaterial',
        id,
        `SNCR logged: Heat #${item.heatNumber} quarantined: ${item.rejectionReason}`,
        { status: oldStatus },
        { status: item.status, sncrNumber: item.sncrNumber }
      );
    }

    persistDb(db);
    return { success: true, item };
  },

  getTemplates() {
    const db = getStoredDb();
    return db.templates || [];
  },

  createTemplate(data: any) {
    const db = getStoredDb();
    const id = 'TMPL-' + data.partNumber + '-' + (data.revision || 'RevA');
    const newTemplate = {
      id,
      partNumber: data.partNumber,
      partName: data.partName || data.partNumber,
      revision: data.revision || 'Rev A',
      status: 'Approved',
      approvedBy: 'Robert Vance (Quality Manager)',
      approvedDate: new Date().toISOString(),
      blueprintUrl: data.blueprintUrl || './blueprints/shaft_ts204_schematic.svg',
      pins: data.pins || [],
      createdAt: new Date().toISOString(),
      createdBy: data.createdBy || 'Quality Engineer Dave'
    };

    if (!db.templates) db.templates = [];
    db.templates.unshift(newTemplate);
    logAudit(
      db,
      data.createdBy,
      'Quality Engineer',
      'PDI_TEMPLATE_CREATED',
      'Template',
      id,
      `Created PDI checklist template for ${data.partNumber} (${newTemplate.revision})`,
      null,
      newTemplate
    );
    persistDb(db);
    return { success: true, template: newTemplate };
  },

  getJobTravelers() {
    const db = getStoredDb();
    return db.jobTravelers || [];
  },

  getJobTraveler(id: string) {
    const db = getStoredDb();
    const traveler = (db.jobTravelers || []).find((t: any) => t.id === id || t.barcode === id);
    if (!traveler) return { error: 'Job Traveler not found' };
    return traveler;
  },

  completeOperation(travelerId: string, opNumber: number, operatorId: string, machineId: string, cycleMinutes?: number, notes?: string) {
    const db = getStoredDb();
    const traveler = (db.jobTravelers || []).find((t: any) => t.id === travelerId || t.barcode === travelerId);
    if (!traveler) return { error: 'Job Traveler not found' };

    const opIndex = (traveler.operations || []).findIndex((o: any) => o.opNumber === Number(opNumber));
    if (opIndex === -1) return { error: 'Operation step not found' };

    for (let i = 0; i < opIndex; i++) {
      if (traveler.operations[i].status !== 'Completed') {
        return {
          error: `Strict Sequential Routing Lock! Cannot start or complete Op ${opNumber} before Op ${traveler.operations[i].opNumber} (${traveler.operations[i].operationName}) is completed and electronically signed off.`
        };
      }
    }

    const op = traveler.operations[opIndex];
    op.status = 'Completed';
    op.completedAt = new Date().toISOString();
    op.operatorId = operatorId || 'OP-104';
    op.machineId = machineId || op.machineId;
    op.cycleMinutes = Number(cycleMinutes) || op.cycleMinutes || 45;
    op.notes = notes || '';

    if (op.holdDurationMinutes && op.holdDurationMinutes > 0) {
      op.holdStartedAt = new Date().toISOString();
      op.holdTargetRelease = new Date(Date.now() + op.holdDurationMinutes * 60 * 1000).toISOString();
      op.holdStatus = 'Active Hold';
    }

    if (opIndex + 1 < traveler.operations.length) {
      const nextOp = traveler.operations[opIndex + 1];
      if (op.holdDurationMinutes > 0) {
        nextOp.status = 'Holding (Cooling/Curing)';
      } else {
        nextOp.status = 'Ready / In Queue';
      }
    } else {
      traveler.overallStatus = 'Awaiting Final PDI';
    }

    logAudit(
      db,
      operatorId,
      'Machinist',
      'OPERATION_COMPLETED',
      'JobTraveler',
      traveler.id,
      `Completed Op ${op.opNumber}: ${op.operationName} on ${op.machineId}`,
      null,
      { opNumber, completedAt: op.completedAt }
    );

    persistDb(db);
    return { success: true, traveler, operation: op };
  },

  signOffFirstPiece(travelerId: string, opNumber: number, qaInspectorId: string, remarks: string, measurements?: any[]) {
    const db = getStoredDb();
    const traveler = (db.jobTravelers || []).find((t: any) => t.id === travelerId || t.barcode === travelerId);
    if (!traveler) return { error: 'Job Traveler not found' };

    const op = (traveler.operations || []).find((o: any) => o.opNumber === Number(opNumber));
    if (!op) return { error: 'Operation not found' };

    op.firstPieceInspection = {
      status: 'Approved',
      inspectedBy: qaInspectorId || 'QA-LEAD-CARTER',
      timestamp: new Date().toISOString(),
      measurements: measurements || [],
      remarks: remarks || 'First-piece setup dimensions verified 100% within drawing tolerances. Released from Setup Mode.'
    };

    logAudit(
      db,
      qaInspectorId,
      'QA Inspector',
      'FIRST_PIECE_RELEASE',
      'JobTraveler',
      traveler.id,
      `First-Piece inspection approved for Op ${opNumber} on ${op.machineId}. Full production unlocked.`,
      null,
      op.firstPieceInspection
    );

    persistDb(db);
    return { success: true, traveler, operation: op };
  },

  logHourlyInspection(travelerId: string, opNumber: number, operatorId: string, sampleCount: number) {
    const db = getStoredDb();
    const traveler = (db.jobTravelers || []).find((t: any) => t.id === travelerId || t.barcode === travelerId);
    if (!traveler) return { error: 'Job Traveler not found' };

    if (!traveler.hourlyInspections) traveler.hourlyInspections = [];

    const logEntry = {
      id: 'HINSP-' + Date.now().toString().slice(-6),
      opNumber: Number(opNumber),
      timestamp: new Date().toISOString(),
      operatorId: operatorId || 'OP-104',
      sampleCount: Number(sampleCount) || 3,
      status: 'Pass',
      measurements: []
    };

    traveler.hourlyInspections.unshift(logEntry);
    traveler.lastHourlyCheckTime = new Date().toISOString();

    logAudit(
      db,
      operatorId,
      'Operator',
      'HOURLY_INSPECTION_LOGGED',
      'JobTraveler',
      traveler.id,
      `Logged hourly sample check (${sampleCount} pcs) for Op ${opNumber}`,
      null,
      logEntry
    );

    persistDb(db);
    return { success: true, traveler, hourlyCheck: logEntry };
  },

  submitInspection(payload: any, isOffline: boolean = false) {
    const db = getStoredDb();
    const {
      travelerId,
      stationId,
      inspectorId,
      gaugeId,
      templateId,
      inspectionType,
      measurements,
      remarks
    } = payload;

    const traveler = (db.jobTravelers || []).find((t: any) => t.id === travelerId || t.barcode === travelerId);
    if (!traveler) return { error: 'Job Traveler not found' };

    let hasFailures = false;
    let hasCtqFailures = false;
    const processedMeasurements = (measurements || []).map((m: any) => {
      let passed = true;
      if (m.type === 'visual') {
        passed = m.actual === 'Pass' || m.actual === 'true' || m.actual === true;
      } else if (m.type === 'max') {
        passed = Number(m.actual) <= Number(m.maxLimit);
      } else {
        const actualVal = Number(m.actual);
        const minAllowed = Number(m.nominal) + Number(m.lower);
        const maxAllowed = Number(m.nominal) + Number(m.upper);
        passed = !isNaN(actualVal) && actualVal >= minAllowed && actualVal <= maxAllowed;
      }

      if (!passed) {
        hasFailures = true;
        if (m.isCtq) hasCtqFailures = true;
      }

      return {
        ...m,
        passed,
        photos: m.photos || []
      };
    });

    const inspectionId = 'INSP-' + Date.now().toString().slice(-6);
    const newInspection = {
      id: inspectionId,
      travelerId: traveler.id,
      workOrder: traveler.workOrder,
      partNumber: traveler.partNumber,
      heatNumber: traveler.heatLot,
      stationId,
      inspectorId: inspectorId || 'QA-INSP-JOHN',
      gaugeId: gaugeId || 'VC-104',
      templateId,
      inspectionType: inspectionType || 'PDI',
      submittedAt: new Date().toISOString(),
      measurements: processedMeasurements,
      hasFailures,
      hasCtqFailures,
      remarks: remarks || '',
      isOfflineSync: !!isOffline,
      status: hasFailures ? 'Pending Review (Out-of-Tolerance)' : 'Approved (In-Spec)'
    };

    if (!db.inspections) db.inspections = [];
    db.inspections.unshift(newInspection);

    if (!hasFailures) {
      traveler.pdiStatus = 'Approved';
      traveler.pdiCompletedAt = new Date().toISOString();
      traveler.pdiInspectionId = inspectionId;
    } else {
      traveler.pdiStatus = 'Pending Supervisor Review';
      traveler.pdiInspectionId = inspectionId;
    }

    logAudit(
      db,
      inspectorId,
      'QA Floor Inspector',
      'INSPECTION_SUBMITTED',
      'Inspection',
      inspectionId,
      `Submitted inspection for ${traveler.id}. Out-of-spec: ${hasFailures ? 'YES' : 'NO'}, CTQ Failure: ${hasCtqFailures ? 'CRITICAL YES' : 'NO'}`,
      null,
      { hasFailures, hasCtqFailures, status: newInspection.status }
    );

    persistDb(db);
    return {
      success: true,
      inspection: newInspection,
      alert: hasCtqFailures
        ? 'CRITICAL ALERT: CTQ parameter out-of-spec! Inspection frozen and escalated to Quality Head. Concessions blocked!'
        : (hasFailures ? 'Out-of-tolerance entries recorded. Moved to Shift Supervisor Approval Queue.' : 'All dimensions in tolerance. PDI cleared.')
    };
  },

  getInspections() {
    const db = getStoredDb();
    return db.inspections || [];
  },

  getSupervisorQueue() {
    const db = getStoredDb();
    return (db.inspections || []).filter((i: any) => (i.status || '').includes('Pending Review'));
  },

  supervisorDecision(payload: any) {
    const db = getStoredDb();
    const {
      inspectionId,
      action,
      supervisorId,
      concessionReasonCode,
      concessionJustification,
      notes
    } = payload;

    const inspection = (db.inspections || []).find((i: any) => i.id === inspectionId);
    if (!inspection) return { error: 'Inspection record not found' };

    const traveler = (db.jobTravelers || []).find((t: any) => t.id === inspection.travelerId);
    const oldStatus = inspection.status;

    if (action === 'APPROVE') {
      inspection.status = 'Approved by Supervisor';
      inspection.supervisorDecision = {
        action: 'APPROVE',
        supervisorId: supervisorId || 'SUPV-MORGAN',
        timestamp: new Date().toISOString(),
        notes: notes || 'All dimensions and defect clarifications approved.'
      };
      if (traveler) {
        traveler.pdiStatus = 'Approved';
        traveler.pdiCompletedAt = new Date().toISOString();
      }
    } else if (action === 'CONCESSION') {
      if (inspection.hasCtqFailures) {
        return {
          error: 'CRITICAL SECURITY LOCK: Concessions CANNOT be granted on Critical-to-Quality (CTQ) parameters! Material must be quarantined.'
        };
      }

      if (!concessionReasonCode || !concessionJustification) {
        return {
          error: 'Mandatory engineering justification and concession reason code required for conditional concession release.'
        };
      }

      inspection.status = 'Released under Concession';
      inspection.supervisorDecision = {
        action: 'CONCESSION',
        supervisorId: supervisorId || 'SUPV-MORGAN',
        timestamp: new Date().toISOString(),
        reasonCode: concessionReasonCode,
        justification: concessionJustification,
        notes: notes || ''
      };
      if (traveler) {
        traveler.pdiStatus = 'Approved (Concession Flagged)';
        traveler.pdiCompletedAt = new Date().toISOString();
        traveler.isConcession = true;
        traveler.concessionDetails = inspection.supervisorDecision;
      }
    } else if (action === 'QUARANTINE') {
      inspection.status = 'Rejected & Quarantined';
      inspection.supervisorDecision = {
        action: 'QUARANTINE',
        supervisorId: supervisorId || 'SUPV-MORGAN',
        timestamp: new Date().toISOString(),
        notes: notes || 'Non-conformance confirmed. Sent to Digital Rejection Holding Area.'
      };
      if (traveler) {
        traveler.overallStatus = 'Quarantined';
        traveler.pdiStatus = 'Rejected';
        traveler.physicalFloorLocation = 'Digital Rejection Holding Area (Bay 107)';
        traveler.isQuarantined = true;

        const mrbCase = {
          id: 'MRB-' + Date.now().toString().slice(-6),
          travelerId: traveler.id,
          workOrder: traveler.workOrder,
          partNumber: traveler.partNumber,
          batchSize: traveler.batchSize,
          heatNumber: traveler.heatLot,
          rejectionReason: notes || 'Dimensional failure during PDI',
          quarantinedAt: new Date().toISOString(),
          dispositionStatus: 'Pending MRB Review'
        };
        if (!db.mrbCases) db.mrbCases = [];
        db.mrbCases.unshift(mrbCase);
      }
    }

    logAudit(
      db,
      supervisorId,
      'Shift Supervisor',
      'SUPERVISOR_DECISION_' + action,
      'Inspection',
      inspectionId,
      `Supervisor decided ${action} for ${inspection.travelerId}. ${notes || ''}`,
      { status: oldStatus },
      { status: inspection.status }
    );

    persistDb(db);
    return { success: true, inspection, traveler };
  },

  getMrbCases() {
    const db = getStoredDb();
    return db.mrbCases || [];
  },

  resolveMrbCase(id: string, payload: any) {
    const db = getStoredDb();
    const {
      dispositionType,
      reviewedBy,
      costCode,
      reworkInstructions,
      customerAuthDoc,
      notes
    } = payload;

    const mrbCase = (db.mrbCases || []).find((m: any) => m.id === id);
    if (!mrbCase) return { error: 'MRB case not found' };

    const traveler = (db.jobTravelers || []).find((t: any) => t.id === mrbCase.travelerId);

    mrbCase.dispositionStatus = dispositionType;
    mrbCase.dispositionDate = new Date().toISOString();
    mrbCase.dispositionedBy = reviewedBy || 'MRB Board (Plant Mgr + Quality Head)';
    mrbCase.notes = notes || '';

    if (dispositionType === 'REWORK') {
      mrbCase.reworkOrder = 'RWK-' + Math.floor(1000 + Math.random() * 9000);
      mrbCase.reworkInstructions = reworkInstructions || 'Corrective skim cut on face + polishing';
      if (traveler) {
        traveler.overallStatus = 'In Rework Routing';
        traveler.physicalFloorLocation = 'Main Machining Shop (Rework Bench)';
        traveler.operations.push({
          opNumber: 25,
          operationName: 'MRB Corrective Rework Machining',
          machineId: 'CNC Lathe #04',
          status: 'In Queue',
          notes: mrbCase.reworkInstructions
        });
        traveler.operations.sort((a: any, b: any) => a.opNumber - b.opNumber);
      }
    } else if (dispositionType === 'SCRAP') {
      mrbCase.scrapCostCode = costCode || 'SCRAP-CC-409';
      mrbCase.scrapBinVerified = true;
      if (traveler) {
        traveler.overallStatus = 'Scrapped / Written Off';
        traveler.physicalFloorLocation = 'Scrap Quarantine Bin #02';
      }
    } else if (dispositionType === 'RETURN_TO_VENDOR') {
      mrbCase.debitNoteNumber = 'DN-' + Math.floor(10000 + Math.random() * 90000);
      if (traveler) {
        traveler.overallStatus = 'Returned to Vendor (RTV)';
        traveler.physicalFloorLocation = 'Dock Shipping Bay (Vendor Return)';
      }
    } else if (dispositionType === 'CUSTOMER_CONCESSION') {
      mrbCase.customerApprovalDoc = customerAuthDoc || 'CUSTOMER_CONCESSION_AUTH_PAC.pdf';
      if (traveler) {
        traveler.overallStatus = 'Customer Concession Cleared';
        traveler.pdiStatus = 'Approved (Customer Concession)';
        traveler.isQuarantined = false;
        traveler.physicalFloorLocation = 'Packing & Assembly Bay';
      }
    }

    logAudit(
      db,
      reviewedBy,
      'Material Review Board',
      'MRB_DISPOSITION_' + dispositionType,
      'MRB',
      id,
      `MRB executed disposition ${dispositionType} for ${mrbCase.travelerId}`,
      null,
      mrbCase
    );

    persistDb(db);
    return { success: true, mrbCase, traveler };
  },

  checkShippingInterlock(travelerId: string) {
    const db = getStoredDb();
    const traveler = (db.jobTravelers || []).find((t: any) => t.id === travelerId || t.barcode === travelerId);
    if (!traveler) return { error: 'Job Traveler not found' };

    const pendingOps = (traveler.operations || []).filter((o: any) => o.status !== 'Completed');
    const conditionA = {
      rule: '100% Manufacturing Operations Complete & Signed Off',
      passed: pendingOps.length === 0,
      details: pendingOps.length === 0 ? 'All operations signed off' : `${pendingOps.length} operation(s) incomplete: ${pendingOps.map((o: any) => 'Op ' + o.opNumber).join(', ')}`
    };

    let activeHolds: string[] = [];
    (traveler.operations || []).forEach((o: any) => {
      if (o.holdDurationMinutes > 0 && o.holdTargetRelease) {
        const releaseTime = new Date(o.holdTargetRelease);
        if (releaseTime > new Date()) {
          const remainingMin = Math.ceil((releaseTime.getTime() - Date.now()) / 60000);
          activeHolds.push(`Op ${o.opNumber} cooling hold active (${remainingMin} min remaining)`);
        }
      }
    });

    const isQuarantined = traveler.isQuarantined || traveler.overallStatus === 'Quarantined';
    const conditionB = {
      rule: 'Process Aging, Cooling Holds Fulfilled & No Active Holds',
      passed: activeHolds.length === 0 && !isQuarantined,
      details: isQuarantined ? 'Lot is currently Quarantined in Digital Rejection Area' : (activeHolds.length === 0 ? 'All cooling/curing holds cleared' : activeHolds.join('; '))
    };

    const conditionC = {
      rule: 'Final Pre-Dispatch Inspection (PDI) Signed & Approved by Quality',
      passed: traveler.pdiStatus === 'Approved' || traveler.pdiStatus === 'Approved (Concession Flagged)' || traveler.pdiStatus === 'Approved (Customer Concession)',
      details: `Current PDI Status: ${traveler.pdiStatus || 'Not Conducted'}`
    };

    const allPassed = conditionA.passed && conditionB.passed && conditionC.passed;

    return {
      travelerId: traveler.id,
      partNumber: traveler.partNumber,
      workOrder: traveler.workOrder,
      batchSize: traveler.batchSize,
      clearedForShipping: allPassed,
      conditions: [conditionA, conditionB, conditionC],
      lockoutWarning: allPassed ? null : 'SHIPPING GATE INTERLOCK ACTIVE! Commercial invoice, packing manifest, and gate pass printing locked until all three conditions are verified.'
    };
  },

  generateGatePass(payload: any) {
    const db = getStoredDb();
    const {
      travelerId,
      vehicleNumber,
      driverName,
      driverPhone,
      destinationCustomer,
      customerPoNumber,
      warehouseClerkId
    } = payload;

    const traveler = (db.jobTravelers || []).find((t: any) => t.id === travelerId || t.barcode === travelerId);
    if (!traveler) return { error: 'Job Traveler not found' };

    const pendingOps = (traveler.operations || []).filter((o: any) => o.status !== 'Completed');
    const pdiApproved = traveler.pdiStatus === 'Approved' || traveler.pdiStatus === 'Approved (Concession Flagged)' || traveler.pdiStatus === 'Approved (Customer Concession)';
    if (pendingOps.length > 0 || !pdiApproved || traveler.isQuarantined) {
      return {
        error: 'SECURITY INTERLOCK VIOLATION: Cannot generate gate pass. Quality gates not cleared!'
      };
    }

    const passId = 'GP-2026-' + Math.floor(10000 + Math.random() * 90000);
    const digitalSignature = 'ZAPUZA-DIGISIGN-' + Math.random().toString(36).substring(2, 12).toUpperCase();

    const gatePass = {
      gatePassId: passId,
      travelerId: traveler.id,
      workOrder: traveler.workOrder,
      partNumber: traveler.partNumber,
      heatLot: traveler.heatLot,
      batchSize: traveler.batchSize,
      serialNumbers: traveler.finishedSerialNumbers || [`SN-${traveler.id}-01..${traveler.batchSize}`],
      vehicleNumber: vehicleNumber || 'KA-04-E-8821',
      driverName: driverName || 'Ramesh Kumar',
      driverPhone: driverPhone || '+91 98765 43210',
      destinationCustomer: destinationCustomer || traveler.customer || 'Pratt Aerospace Corp',
      customerPoNumber: customerPoNumber || traveler.customerPo || 'PO-PAC-2026-789',
      issuedAt: new Date().toISOString(),
      issuedBy: warehouseClerkId || 'DISPATCH-CLERK-SITA',
      digitalSignature,
      qrVerificationUrl: `./#coa-${traveler.id}`,
      status: 'Cleared & Dispatched'
    };

    if (!db.gatePasses) db.gatePasses = [];
    db.gatePasses.unshift(gatePass);
    traveler.overallStatus = 'Dispatched';
    traveler.gatePassId = passId;

    logAudit(
      db,
      warehouseClerkId,
      'Dispatch Clerk',
      'SHIPPING_GATE_PASS_GENERATED',
      'GatePass',
      passId,
      `Shipping gate pass generated for ${traveler.id}. Vehicle: ${vehicleNumber}`,
      null,
      gatePass
    );

    persistDb(db);
    return { success: true, gatePass };
  },

  forwardTraceability(heatNumber: string) {
    const db = getStoredDb();
    const rawItem = (db.rawMaterials || []).find((r: any) => r.heatNumber.toLowerCase() === heatNumber.toLowerCase());
    const matchingTravelers = (db.jobTravelers || []).filter((t: any) => (t.heatLot || '').toLowerCase() === heatNumber.toLowerCase());
    const matchedCraterPasses = (db.gatePasses || []).filter((gp: any) => (gp.heatLot || '').toLowerCase() === heatNumber.toLowerCase());

    return {
      heatNumber,
      rawMaterial: rawItem || null,
      totalWorkOrdersAffected: matchingTravelers.length,
      totalComponentsAffected: matchingTravelers.reduce((acc: number, t: any) => acc + (t.batchSize || 0), 0),
      workOrders: matchingTravelers,
      shippingGatePasses: matchedCraterPasses
    };
  },

  backwardTraceability(serialNumber: string) {
    const db = getStoredDb();
    const targetSerial = serialNumber.trim().toLowerCase();

    const traveler = (db.jobTravelers || []).find((t: any) => {
      if ((t.id || '').toLowerCase() === targetSerial) return true;
      if (t.finishedSerialNumbers && t.finishedSerialNumbers.some((s: string) => s.toLowerCase() === targetSerial)) return true;
      return false;
    });

    if (!traveler) {
      return { error: `Component Serial Number "${serialNumber}" not found in manufacturing registry.` };
    }

    const rawItem = (db.rawMaterials || []).find((r: any) => r.heatNumber === traveler.heatLot);
    const inspection = (db.inspections || []).find((i: any) => i.travelerId === traveler.id);
    const gatePass = (db.gatePasses || []).find((g: any) => g.travelerId === traveler.id);

    return {
      serialNumber,
      birthCertificate: {
        travelerId: traveler.id,
        workOrder: traveler.workOrder,
        partNumber: traveler.partNumber,
        customer: traveler.customer,
        customerPo: traveler.customerPo,
        heatLot: traveler.heatLot,
        rawMaterialMillCert: rawItem ? rawItem.mtcFileName : 'MTC-H8042.pdf',
        rawSupplier: rawItem ? rawItem.supplierName : 'Jindal High-Strength Alloys Ltd',
        chemicalComposition: rawItem ? rawItem.chemicalSpecs : [],
        mechanicalProperties: rawItem ? rawItem.mechanicalSpecs : [],
        machiningOperations: traveler.operations,
        pdiInspection: inspection || null,
        concessionDetails: traveler.concessionDetails || null,
        gatePassClearance: gatePass || null,
        certifiedAt: traveler.pdiCompletedAt || (traveler.operations && traveler.operations.length > 0 ? traveler.operations[traveler.operations.length - 1].completedAt : new Date().toISOString()),
        qualityHeadSignOff: 'Robert Vance, Quality Assurance Director (Zapuza Technologies)'
      }
    };
  },

  getPublicCoa(travelerId: string) {
    const db = getStoredDb();
    const traveler = (db.jobTravelers || []).find((t: any) => t.id === travelerId || t.barcode === travelerId);
    if (!traveler) return { error: 'Shipment Certificate not found' };

    const rawItem = (db.rawMaterials || []).find((r: any) => r.heatNumber === traveler.heatLot);
    const inspection = (db.inspections || []).find((i: any) => i.travelerId === traveler.id);

    return {
      certificateNumber: 'COA-ZAP-' + traveler.id,
      dateOfIssue: new Date().toISOString(),
      customer: traveler.customer,
      customerPo: traveler.customerPo,
      partNumber: traveler.partNumber,
      batchSize: traveler.batchSize,
      serialNumbers: traveler.finishedSerialNumbers,
      heatLot: traveler.heatLot,
      rawMaterialSupplier: rawItem ? rawItem.supplierName : 'Jindal Alloys',
      materialGrade: rawItem ? rawItem.materialGrade : 'AISI 4340 Alloy Steel',
      chemicalComposition: rawItem ? rawItem.chemicalSpecs : [],
      mechanicalProperties: rawItem ? rawItem.mechanicalSpecs : [],
      pdiMeasurements: inspection ? inspection.measurements : [],
      concessionNote: traveler.isConcession ? 'Approved with engineering concession justification: ' + traveler.concessionDetails?.justification : '100% Conforming to Engineering Standards',
      authorizedSignatory: 'Robert Vance, QA Director',
      digitalVerificationHash: 'ZAP-VERIFIED-' + Math.random().toString(36).substring(2, 10).toUpperCase()
    };
  },

  getShiftHandovers() {
    const db = getStoredDb();
    return db.shiftHandovers || [];
  },

  createShiftHandover(data: any) {
    const db = getStoredDb();
    const handoverId = 'SHO-' + Date.now().toString().slice(-6);
    const newHandover = {
      id: handoverId,
      timestamp: new Date().toISOString(),
      shiftName: data.shiftName || 'Morning to Evening Shift',
      outgoingSupervisor: data.outgoingSupervisor || 'Devin Vance',
      incomingSupervisor: data.incomingSupervisor || 'Sarah Chen',
      activeJobsCount: Number(data.activeJobsCount) || 12,
      partsProduced: Number(data.partsProduced) || 340,
      scrapCount: Number(data.scrapCount) || 3,
      toolWearNotes: data.toolWearNotes || 'Insert T02 on CNC #04 due for index change after 50 more cycles.',
      machineHealthNotes: data.machineHealthNotes || 'All spindles running cool. Hydraulic pressure normal.',
      openQualityAlerts: data.openQualityAlerts || 'One pending PDI concession on TRV-9042.',
      outgoingSignature: data.outgoingSignature || 'D. Vance',
      acknowledgedByIncoming: false
    };

    if (!db.shiftHandovers) db.shiftHandovers = [];
    db.shiftHandovers.unshift(newHandover);

    logAudit(
      db,
      data.outgoingSupervisor,
      'Shift Supervisor',
      'SHIFT_HANDOVER_FILED',
      'ShiftHandover',
      handoverId,
      `Shift handover filed by ${data.outgoingSupervisor} for ${newHandover.shiftName}`,
      null,
      newHandover
    );

    persistDb(db);
    return { success: true, handover: newHandover };
  },

  acknowledgeShiftHandover(id: string, incomingSupervisor?: string, incomingSignature?: string) {
    const db = getStoredDb();
    const handover = (db.shiftHandovers || []).find((h: any) => h.id === id);
    if (!handover) return { error: 'Handover record not found' };

    handover.acknowledgedByIncoming = true;
    handover.incomingSupervisor = incomingSupervisor || handover.incomingSupervisor;
    handover.incomingSignature = incomingSignature || 'S. Chen';
    handover.acknowledgedAt = new Date().toISOString();

    logAudit(
      db,
      incomingSupervisor || 'SUPV-MORGAN',
      'Shift Supervisor',
      'SHIFT_HANDOVER_ACKNOWLEDGED',
      'ShiftHandover',
      id,
      `Shift handover acknowledged and accepted by ${incomingSupervisor || 'incoming supervisor'}`,
      null,
      handover
    );

    persistDb(db);
    return { success: true, handover };
  },

  getBottlenecks() {
    const db = getStoredDb();
    const stations = (db.workstations || []).map((w: any) => {
      const activeJobs = (db.jobTravelers || []).filter((t: any) => {
        const activeOp = (t.operations || []).find((o: any) => o.status === 'In Progress' || o.status === 'Ready / In Queue');
        return activeOp && (activeOp.machineId === w.name || activeOp.machineId === w.id);
      });

      return {
        stationId: w.id,
        stationName: w.name,
        department: w.department,
        queueDepth: activeJobs.length,
        status: w.pmStatus === 'Overdue' ? 'Maintenance Alert' : (activeJobs.length > 2 ? 'Congested / Bottleneck' : 'Optimal'),
        utilizationRate: Math.min(100, 40 + activeJobs.length * 25),
        currentCycleMin: activeJobs.length * 35
      };
    });

    return { stations };
  },

  getAuditLogs() {
    const db = getStoredDb();
    return db.auditLogs || [];
  }
};
