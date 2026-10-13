const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Ensure upload directories exist
const uploadsDir = path.join(__dirname, 'uploads');
const defectPhotosDir = path.join(uploadsDir, 'defects');
const mtcFilesDir = path.join(uploadsDir, 'mtc');
fs.mkdirSync(defectPhotosDir, { recursive: true });
fs.mkdirSync(mtcFilesDir, { recursive: true });

app.use('/uploads', express.static(uploadsDir));

// Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === 'mtc') {
      cb(null, mtcFilesDir);
    } else {
      cb(null, defectPhotosDir);
    }
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});
const upload = multer({ storage });

// Database storage file
const DB_PATH = path.join(__dirname, 'data', 'db.json');
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

// Load initial seed or existing database
let db = {};
if (fs.existsSync(DB_PATH)) {
  try {
    db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  } catch (err) {
    console.error('Error reading DB, re-initializing seed data', err);
    db = require('./seedData.js');
    saveDb();
  }
} else {
  db = require('./seedData.js');
  saveDb();
}

function saveDb() {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
}

// Audit Log Helper
function logAudit(userId, role, action, entityType, entityId, details, oldValue = null, newValue = null, req = null) {
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
    ipAddress: req ? (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1') : '127.0.0.1',
    deviceSerial: req?.headers['x-device-serial'] || 'TAB-SHOPFLOOR-07',
  };
  if (!db.auditLogs) db.auditLogs = [];
  db.auditLogs.unshift(logEntry);
  if (db.auditLogs.length > 500) db.auditLogs.pop(); // Keep 500 latest entries
  saveDb();
  return logEntry;
}

// ======================== API ROUTES ========================

// Health & Status
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    version: '5.0-Enterprise',
    plant: 'Zapuza Technologies Main Plant #1',
    systemTime: new Date().toISOString()
  });
});

// Master Factory Structure & Infrastructure
app.get('/api/infrastructure', (req, res) => {
  res.json({
    factories: db.factories || [],
    departments: db.departments || [],
    workstations: db.workstations || [],
    gauges: db.gauges || [],
    parts: db.parts || []
  });
});

// Workstation PM & Calibration check
app.post('/api/workstations/:id/pm-check', (req, res) => {
  const { id } = req.params;
  const { operatorId, zeroPointVerified, notes } = req.body;
  const station = db.workstations.find(w => w.id === id);
  if (!station) return res.status(404).json({ error: 'Workstation not found' });

  const oldStatus = station.pmStatus;
  station.pmStatus = 'Completed';
  station.lastPmDate = new Date().toISOString();
  station.pmCheckedBy = operatorId || 'OP-104';
  station.zeroPointVerified = zeroPointVerified !== false;

  logAudit(operatorId, 'Operator', 'PM_CHECK_COMPLETED', 'Workstation', id, `Daily PM completed for ${station.name}`, { pmStatus: oldStatus }, { pmStatus: 'Completed' }, req);
  saveDb();
  res.json({ success: true, workstation: station });
});

// Gauges Register
app.get('/api/gauges', (req, res) => {
  res.json(db.gauges || []);
});

app.get('/api/gauges/:id/validate', (req, res) => {
  const { id } = req.params;
  const gauge = db.gauges.find(g => g.id.toLowerCase() === id.toLowerCase() || g.serialNumber.toLowerCase() === id.toLowerCase());
  if (!gauge) {
    return res.status(404).json({ valid: false, error: 'Gauge not found in calibration register' });
  }

  const now = new Date();
  const expiry = new Date(gauge.expiryDate);
  const isExpired = expiry < now;

  if (isExpired || gauge.status !== 'Valid') {
    return res.json({
      valid: false,
      gauge,
      error: `Expired Tool Calibration! Calibration for ${gauge.id} (${gauge.name}) expired on ${gauge.expiryDate}. Instruct worker to obtain a calibrated tool from the tool crib.`
    });
  }

  res.json({ valid: true, gauge });
});

// Raw Material Dock Intake & MTC
app.get('/api/raw-materials', (req, res) => {
  res.json(db.rawMaterials || []);
});

app.post('/api/raw-materials', (req, res) => {
  const {
    heatNumber,
    supplierName,
    poNumber,
    materialGrade,
    quantity,
    unit,
    chemicalSpecs,
    mechanicalSpecs,
    mtcFileName,
    recordedBy
  } = req.body;

  if (!heatNumber || !supplierName || !materialGrade) {
    return res.status(400).json({ error: 'Missing mandatory intake fields' });
  }

  const id = 'RMI-' + Date.now().toString().slice(-6);
  const newIntake = {
    id,
    heatNumber,
    supplierName,
    poNumber: poNumber || 'PO-' + Math.floor(10000 + Math.random() * 90000),
    materialGrade,
    quantity: Number(quantity) || 100,
    unit: unit || 'Billets',
    receivedDate: new Date().toISOString(),
    recordedBy: recordedBy || 'DOCK-CLERK-01',
    status: 'In Lab Testing',
    barcodeTag: `RAW-${heatNumber}-${materialGrade.replace(/[^A-Za-z0-9]/g, '')}`,
    mtcFileName: mtcFileName || 'MTC_' + heatNumber + '.pdf',
    chemicalSpecs: chemicalSpecs || [],
    mechanicalSpecs: mechanicalSpecs || []
  };

  db.rawMaterials.unshift(newIntake);
  logAudit(recordedBy, 'Dock Clerk', 'RAW_MATERIAL_INTAKE_LOGGED', 'RawMaterial', id, `Intake logged for Heat #${heatNumber} from ${supplierName}`, null, newIntake, req);
  saveDb();
  res.json({ success: true, intake: newIntake });
});

// Clear Raw Material or Reject (SNCR)
app.post('/api/raw-materials/:id/verify', (req, res) => {
  const { id } = req.params;
  const { decision, reason, verifiedBy } = req.body; // decision: 'APPROVE' or 'REJECT'
  const item = db.rawMaterials.find(r => r.id === id);
  if (!item) return res.status(404).json({ error: 'Record not found' });

  const oldStatus = item.status;
  if (decision === 'APPROVE') {
    item.status = 'Cleared to Store';
    item.clearedDate = new Date().toISOString();
    item.verifiedBy = verifiedBy || 'QA-LAB-TECH-02';
    logAudit(verifiedBy, 'QA Lab Specialist', 'RAW_MATERIAL_APPROVED', 'RawMaterial', id, `Heat #${item.heatNumber} passed lab verification and released to shopfloor store.`, { status: oldStatus }, { status: item.status }, req);
  } else {
    item.status = 'Supplier Quarantine';
    item.sncrNumber = 'SNCR-' + Math.floor(1000 + Math.random() * 9000);
    item.rejectionReason = reason || 'Non-conforming chemical or physical specs';
    item.rejectedDate = new Date().toISOString();
    item.verifiedBy = verifiedBy || 'QA-LAB-TECH-02';
    logAudit(verifiedBy, 'QA Lab Specialist', 'RAW_MATERIAL_QUARANTINED', 'RawMaterial', id, `SNCR logged: Heat #${item.heatNumber} quarantined: ${item.rejectionReason}`, { status: oldStatus }, { status: item.status, sncrNumber: item.sncrNumber }, req);
  }

  saveDb();
  res.json({ success: true, item });
});

// PDI Checklist Templates
app.get('/api/templates', (req, res) => {
  res.json(db.templates || []);
});

app.post('/api/templates', (req, res) => {
  const {
    partNumber,
    partName,
    revision,
    blueprintUrl,
    pins,
    createdBy
  } = req.body;

  const id = 'TMPL-' + partNumber + '-' + (revision || 'RevA');
  const newTemplate = {
    id,
    partNumber,
    partName: partName || partNumber,
    revision: revision || 'Rev A',
    status: 'Approved',
    approvedBy: 'Robert Vance (Quality Manager)',
    approvedDate: new Date().toISOString(),
    blueprintUrl: blueprintUrl || '/blueprints/shaft_ts204_schematic.svg',
    pins: pins || [],
    createdAt: new Date().toISOString(),
    createdBy: createdBy || 'Quality Engineer Dave'
  };

  db.templates.unshift(newTemplate);
  logAudit(createdBy, 'Quality Engineer', 'PDI_TEMPLATE_CREATED', 'Template', id, `Created PDI checklist template for ${partNumber} (${newTemplate.revision})`, null, newTemplate, req);
  saveDb();
  res.json({ success: true, template: newTemplate });
});

// Digital Job Travelers (Production Tracking & Lineage)
app.get('/api/job-travelers', (req, res) => {
  res.json(db.jobTravelers || []);
});

app.get('/api/job-travelers/:id', (req, res) => {
  const traveler = db.jobTravelers.find(t => t.id === req.params.id || t.barcode === req.params.id);
  if (!traveler) return res.status(404).json({ error: 'Job Traveler not found' });
  res.json(traveler);
});

// Operation Sign-off & Hold Timer Trigger
app.post('/api/job-travelers/:id/complete-operation', (req, res) => {
  const { id } = req.params;
  const { opNumber, operatorId, machineId, cycleMinutes, notes } = req.body;
  const traveler = db.jobTravelers.find(t => t.id === id || t.barcode === id);
  if (!traveler) return res.status(404).json({ error: 'Job Traveler not found' });

  const opIndex = traveler.operations.findIndex(o => o.opNumber === Number(opNumber));
  if (opIndex === -1) return res.status(404).json({ error: 'Operation step not found' });

  // Numerical Sequence Enforcement
  for (let i = 0; i < opIndex; i++) {
    if (traveler.operations[i].status !== 'Completed') {
      return res.status(400).json({
        error: `Strict Sequential Routing Lock! Cannot start or complete Op ${opNumber} before Op ${traveler.operations[i].opNumber} (${traveler.operations[i].operationName}) is completed and electronically signed off.`
      });
    }
  }

  const op = traveler.operations[opIndex];
  op.status = 'Completed';
  op.completedAt = new Date().toISOString();
  op.operatorId = operatorId || 'OP-104';
  op.machineId = machineId || op.machineId;
  op.cycleMinutes = Number(cycleMinutes) || op.cycleMinutes || 45;
  op.notes = notes || '';

  // Check if this operation has a mandatory process aging / cooling hold time
  if (op.holdDurationMinutes && op.holdDurationMinutes > 0) {
    op.holdStartedAt = new Date().toISOString();
    op.holdTargetRelease = new Date(Date.now() + op.holdDurationMinutes * 60 * 1000).toISOString();
    op.holdStatus = 'Active Hold';
  }

  // Update next operation state
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

  logAudit(operatorId, 'Machinist', 'OPERATION_COMPLETED', 'JobTraveler', traveler.id, `Completed Op ${op.opNumber}: ${op.operationName} on ${op.machineId}`, null, { opNumber, completedAt: op.completedAt }, req);
  saveDb();
  res.json({ success: true, traveler, operation: op });
});

// First-Piece Sign-off
app.post('/api/job-travelers/:id/first-piece-signoff', (req, res) => {
  const { id } = req.params;
  const { opNumber, qaInspectorId, measurements, remarks } = req.body;
  const traveler = db.jobTravelers.find(t => t.id === id || t.barcode === id);
  if (!traveler) return res.status(404).json({ error: 'Job Traveler not found' });

  const op = traveler.operations.find(o => o.opNumber === Number(opNumber));
  if (!op) return res.status(404).json({ error: 'Operation not found' });

  op.firstPieceInspection = {
    status: 'Approved',
    inspectedBy: qaInspectorId || 'QA-LEAD-CARTER',
    timestamp: new Date().toISOString(),
    measurements: measurements || [],
    remarks: remarks || 'First-piece setup dimensions verified 100% within drawing tolerances. Released from Setup Mode.'
  };

  logAudit(qaInspectorId, 'QA Inspector', 'FIRST_PIECE_RELEASE', 'JobTraveler', traveler.id, `First-Piece inspection approved for Op ${opNumber} on ${op.machineId}. Full production unlocked.`, null, op.firstPieceInspection, req);
  saveDb();
  res.json({ success: true, traveler, operation: op });
});

// Hourly In-process Inspection Log
app.post('/api/job-travelers/:id/hourly-inspection', (req, res) => {
  const { id } = req.params;
  const { opNumber, operatorId, sampleCount, measurements, status } = req.body;
  const traveler = db.jobTravelers.find(t => t.id === id || t.barcode === id);
  if (!traveler) return res.status(404).json({ error: 'Job Traveler not found' });

  if (!traveler.hourlyInspections) traveler.hourlyInspections = [];

  const logEntry = {
    id: 'HINSP-' + Date.now().toString().slice(-6),
    opNumber: Number(opNumber),
    timestamp: new Date().toISOString(),
    operatorId: operatorId || 'OP-104',
    sampleCount: Number(sampleCount) || 3,
    status: status || 'Pass',
    measurements: measurements || []
  };

  traveler.hourlyInspections.unshift(logEntry);
  traveler.lastHourlyCheckTime = new Date().toISOString();

  logAudit(operatorId, 'Operator', 'HOURLY_INSPECTION_LOGGED', 'JobTraveler', traveler.id, `Logged hourly sample check (${sampleCount} pcs) for Op ${opNumber}`, null, logEntry, req);
  saveDb();
  res.json({ success: true, traveler, hourlyCheck: logEntry });
});

// Tablet Floor Inspections (PDI / In-process)
app.post('/api/inspections/submit', (req, res) => {
  const {
    travelerId,
    stationId,
    inspectorId,
    gaugeId,
    templateId,
    inspectionType, // 'PDI' or 'IN_PROCESS'
    measurements, // array of { pinId, label, nominal, upper, lower, actual, unit, isCtq, passed, photos: [] }
    remarks,
    isOfflineSync
  } = req.body;

  const traveler = db.jobTravelers.find(t => t.id === travelerId || t.barcode === travelerId);
  if (!traveler) return res.status(404).json({ error: 'Job Traveler not found' });

  // Gauge Calibration Check
  const gauge = db.gauges.find(g => g.id.toLowerCase() === (gaugeId || '').toLowerCase());
  if (gauge) {
    const isExpired = new Date(gauge.expiryDate) < new Date();
    if (isExpired || gauge.status !== 'Valid') {
      return res.status(400).json({
        error: `Expired Tool Calibration! Tool ${gauge.id} expired on ${gauge.expiryDate}. Inspection entry rejected.`
      });
    }
  }

  // Assess CTQ and overall pass/fail
  let hasFailures = false;
  let hasCtqFailures = false;
  const processedMeasurements = (measurements || []).map(m => {
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
    isOfflineSync: !!isOfflineSync,
    status: hasFailures ? 'Pending Review (Out-of-Tolerance)' : 'Approved (In-Spec)'
  };

  if (!db.inspections) db.inspections = [];
  db.inspections.unshift(newInspection);

  // If inspection passed completely, mark final PDI approved
  if (!hasFailures) {
    traveler.pdiStatus = 'Approved';
    traveler.pdiCompletedAt = new Date().toISOString();
    traveler.pdiInspectionId = inspectionId;
  } else {
    traveler.pdiStatus = 'Pending Supervisor Review';
    traveler.pdiInspectionId = inspectionId;
  }

  logAudit(
    inspectorId,
    'QA Floor Inspector',
    'INSPECTION_SUBMITTED',
    'Inspection',
    inspectionId,
    `Submitted inspection for ${traveler.id}. Out-of-spec: ${hasFailures ? 'YES' : 'NO'}, CTQ Failure: ${hasCtqFailures ? 'CRITICAL YES' : 'NO'}`,
    null,
    { hasFailures, hasCtqFailures, status: newInspection.status },
    req
  );

  saveDb();
  res.json({
    success: true,
    inspection: newInspection,
    alert: hasCtqFailures
      ? 'CRITICAL ALERT: CTQ parameter out-of-spec! Inspection frozen and escalated to Quality Head. Concessions blocked!'
      : (hasFailures ? 'Out-of-tolerance entries recorded. Moved to Shift Supervisor Approval Queue.' : 'All dimensions in tolerance. PDI cleared.')
  });
});

app.get('/api/inspections', (req, res) => {
  res.json(db.inspections || []);
});

// Shift Supervisor Approvals & Concessions
app.get('/api/supervisor/queue', (req, res) => {
  // Pending reviews
  const pending = (db.inspections || []).filter(i => i.status.includes('Pending Review'));
  res.json(pending);
});

app.post('/api/supervisor/decision', (req, res) => {
  const {
    inspectionId,
    action, // 'APPROVE', 'CONCESSION', 'QUARANTINE'
    supervisorId,
    concessionReasonCode,
    concessionJustification,
    notes
  } = req.body;

  const inspection = (db.inspections || []).find(i => i.id === inspectionId);
  if (!inspection) return res.status(404).json({ error: 'Inspection record not found' });

  const traveler = db.jobTravelers.find(t => t.id === inspection.travelerId);
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
    // Check CTQ lock
    if (inspection.hasCtqFailures) {
      return res.status(403).json({
        error: 'CRITICAL SECURITY LOCK: Concessions CANNOT be granted on Critical-to-Quality (CTQ) parameters! Material must be quarantined.'
      });
    }

    if (!concessionReasonCode || !concessionJustification) {
      return res.status(400).json({
        error: 'Mandatory engineering justification and concession reason code required for conditional concession release.'
      });
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

      // Create MRB Case
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
    supervisorId,
    'Shift Supervisor',
    'SUPERVISOR_DECISION_' + action,
    'Inspection',
    inspectionId,
    `Supervisor decided ${action} for ${inspection.travelerId}. ${notes || ''}`,
    { status: oldStatus },
    { status: inspection.status },
    req
  );

  saveDb();
  res.json({ success: true, inspection, traveler });
});

// MRB (Material Review Board) Dispositions
app.get('/api/mrb', (req, res) => {
  res.json(db.mrbCases || []);
});

app.post('/api/mrb/:id/disposition', (req, res) => {
  const { id } = req.params;
  const {
    dispositionType, // 'REWORK', 'SCRAP', 'RETURN_TO_VENDOR', 'CUSTOMER_CONCESSION'
    reviewedBy,
    costCode,
    reworkInstructions,
    customerAuthDoc,
    notes
  } = req.body;

  const mrbCase = (db.mrbCases || []).find(m => m.id === id);
  if (!mrbCase) return res.status(404).json({ error: 'MRB case not found' });

  const traveler = db.jobTravelers.find(t => t.id === mrbCase.travelerId);

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
      traveler.operations.sort((a, b) => a.opNumber - b.opNumber);
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

  logAudit(reviewedBy, 'Material Review Board', 'MRB_DISPOSITION_' + dispositionType, 'MRB', id, `MRB executed disposition ${dispositionType} for ${mrbCase.travelerId}`, null, mrbCase, req);
  saveDb();
  res.json({ success: true, mrbCase, traveler });
});

// Shipping Interlocks & Gate Pass Verification
app.get('/api/shipping/check-interlock/:travelerId', (req, res) => {
  const { travelerId } = req.params;
  const traveler = db.jobTravelers.find(t => t.id === travelerId || t.barcode === travelerId);
  if (!traveler) return res.status(404).json({ error: 'Job Traveler not found' });

  // Condition A: 100% of all required machining and manufacturing operations signed off
  const pendingOps = (traveler.operations || []).filter(o => o.status !== 'Completed');
  const conditionA = {
    rule: '100% Manufacturing Operations Complete & Signed Off',
    passed: pendingOps.length === 0,
    details: pendingOps.length === 0 ? 'All operations signed off' : `${pendingOps.length} operation(s) incomplete: ${pendingOps.map(o => 'Op ' + o.opNumber).join(', ')}`
  };

  // Condition B: All process aging and hold-time requirements fulfilled without quality holds
  let activeHolds = [];
  (traveler.operations || []).forEach(o => {
    if (o.holdDurationMinutes > 0 && o.holdTargetRelease) {
      const releaseTime = new Date(o.holdTargetRelease);
      if (releaseTime > new Date()) {
        const remainingMin = Math.ceil((releaseTime - new Date()) / 60000);
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

  // Condition C: Final Pre-Dispatch Inspection (PDI) signed and Approved by Quality
  const conditionC = {
    rule: 'Final Pre-Dispatch Inspection (PDI) Signed & Approved by Quality',
    passed: traveler.pdiStatus === 'Approved' || traveler.pdiStatus === 'Approved (Concession Flagged)' || traveler.pdiStatus === 'Approved (Customer Concession)',
    details: `Current PDI Status: ${traveler.pdiStatus || 'Not Conducted'}`
  };

  const allPassed = conditionA.passed && conditionB.passed && conditionC.passed;

  res.json({
    travelerId: traveler.id,
    partNumber: traveler.partNumber,
    workOrder: traveler.workOrder,
    batchSize: traveler.batchSize,
    clearedForShipping: allPassed,
    conditions: [conditionA, conditionB, conditionC],
    lockoutWarning: allPassed ? null : 'SHIPPING GATE INTERLOCK ACTIVE! Commercial invoice, packing manifest, and gate pass printing locked until all three conditions are verified.'
  });
});

// Generate Gate Pass & Shipping Manifest
app.post('/api/shipping/generate-gate-pass', (req, res) => {
  const {
    travelerId,
    vehicleNumber,
    driverName,
    driverPhone,
    destinationCustomer,
    customerPoNumber,
    warehouseClerkId
  } = req.body;

  const traveler = db.jobTravelers.find(t => t.id === travelerId || t.barcode === travelerId);
  if (!traveler) return res.status(404).json({ error: 'Job Traveler not found' });

  // Strictly verify the 3 conditions before issuing gate pass
  const pendingOps = (traveler.operations || []).filter(o => o.status !== 'Completed');
  const pdiApproved = traveler.pdiStatus === 'Approved' || traveler.pdiStatus === 'Approved (Concession Flagged)' || traveler.pdiStatus === 'Approved (Customer Concession)';
  if (pendingOps.length > 0 || !pdiApproved || traveler.isQuarantined) {
    return res.status(403).json({
      error: 'SECURITY INTERLOCK VIOLATION: Cannot generate gate pass. Quality gates not cleared!'
    });
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
    qrVerificationUrl: `http://localhost:5173/public/coa/${traveler.id}`,
    status: 'Cleared & Dispatched'
  };

  if (!db.gatePasses) db.gatePasses = [];
  db.gatePasses.unshift(gatePass);
  traveler.overallStatus = 'Dispatched';
  traveler.gatePassId = passId;

  logAudit(warehouseClerkId, 'Dispatch Clerk', 'SHIPPING_GATE_PASS_GENERATED', 'GatePass', passId, `Shipping gate pass generated for ${traveler.id}. Vehicle: ${vehicleNumber}`, null, gatePass, req);
  saveDb();
  res.json({ success: true, gatePass });
});

// Traceability Engines
// 1. Forward Recall Traceability (Query Heat Lot # -> Machined Parts, Work Orders, Shipping Crates)
app.get('/api/traceability/forward/:heatNumber', (req, res) => {
  const { heatNumber } = req.params;
  const rawItem = (db.rawMaterials || []).find(r => r.heatNumber.toLowerCase() === heatNumber.toLowerCase());
  const matchingTravelers = (db.jobTravelers || []).filter(t => (t.heatLot || '').toLowerCase() === heatNumber.toLowerCase());

  const matchedCraterPasses = (db.gatePasses || []).filter(gp => (gp.heatLot || '').toLowerCase() === heatNumber.toLowerCase());

  res.json({
    heatNumber,
    rawMaterial: rawItem || null,
    totalWorkOrdersAffected: matchingTravelers.length,
    totalComponentsAffected: matchingTravelers.reduce((acc, t) => acc + (t.batchSize || 0), 0),
    workOrders: matchingTravelers,
    shippingGatePasses: matchedCraterPasses
  });
});

// 2. Backward Field Traceability (Query Component Serial Number -> Birth Certificate)
app.get('/api/traceability/backward/:serialNumber', (req, res) => {
  const { serialNumber } = req.params;
  const targetSerial = serialNumber.trim().toLowerCase();

  const traveler = (db.jobTravelers || []).find(t => {
    if ((t.id || '').toLowerCase() === targetSerial) return true;
    if (t.finishedSerialNumbers && t.finishedSerialNumbers.some(s => s.toLowerCase() === targetSerial)) return true;
    return false;
  });

  if (!traveler) {
    return res.status(404).json({ error: `Component Serial Number "${serialNumber}" not found in manufacturing registry.` });
  }

  const rawItem = (db.rawMaterials || []).find(r => r.heatNumber === traveler.heatLot);
  const inspection = (db.inspections || []).find(i => i.travelerId === traveler.id);
  const gatePass = (db.gatePasses || []).find(g => g.travelerId === traveler.id);

  res.json({
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
      certifiedAt: traveler.pdiCompletedAt || traveler.operations[traveler.operations.length - 1].completedAt,
      qualityHeadSignOff: 'Robert Vance, Quality Assurance Director (Zapuza Technologies)'
    }
  });
});

// Public Customer Certificate of Analysis (CoA)
app.get('/api/public/coa/:travelerId', (req, res) => {
  const { travelerId } = req.params;
  const traveler = (db.jobTravelers || []).find(t => t.id === travelerId || t.barcode === travelerId);
  if (!traveler) return res.status(404).json({ error: 'Shipment Certificate not found' });

  const rawItem = (db.rawMaterials || []).find(r => r.heatNumber === traveler.heatLot);
  const inspection = (db.inspections || []).find(i => i.travelerId === traveler.id);
  const gatePass = (db.gatePasses || []).find(g => g.travelerId === traveler.id);

  res.json({
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
  });
});

// Shift Handovers
app.get('/api/shift-handovers', (req, res) => {
  res.json(db.shiftHandovers || []);
});

app.post('/api/shift-handovers', (req, res) => {
  const {
    shiftName, // 'Morning Shift', 'Evening Shift', 'Night Shift'
    outgoingSupervisor,
    incomingSupervisor,
    activeJobsCount,
    partsProduced,
    scrapCount,
    toolWearNotes,
    machineHealthNotes,
    openQualityAlerts,
    outgoingSignature
  } = req.body;

  const handoverId = 'SHO-' + Date.now().toString().slice(-6);
  const newHandover = {
    id: handoverId,
    timestamp: new Date().toISOString(),
    shiftName: shiftName || 'Morning to Evening Shift',
    outgoingSupervisor: outgoingSupervisor || 'Devin Vance',
    incomingSupervisor: incomingSupervisor || 'Sarah Chen',
    activeJobsCount: Number(activeJobsCount) || 12,
    partsProduced: Number(partsProduced) || 340,
    scrapCount: Number(scrapCount) || 3,
    toolWearNotes: toolWearNotes || 'Insert T02 on CNC #04 due for index change after 50 more cycles.',
    machineHealthNotes: machineHealthNotes || 'All spindles running cool. Hydraulic pressure normal.',
    openQualityAlerts: openQualityAlerts || 'One pending PDI concession on TRV-9042.',
    outgoingSignature: outgoingSignature || 'D. Vance',
    acknowledgedByIncoming: false
  };

  if (!db.shiftHandovers) db.shiftHandovers = [];
  db.shiftHandovers.unshift(newHandover);

  logAudit(outgoingSupervisor, 'Shift Supervisor', 'SHIFT_HANDOVER_FILED', 'ShiftHandover', handoverId, `Shift handover filed by ${outgoingSupervisor} for ${shiftName}`, null, newHandover, req);
  saveDb();
  res.json({ success: true, handover: newHandover });
});

app.post('/api/shift-handovers/:id/acknowledge', (req, res) => {
  const { id } = req.params;
  const { incomingSupervisor, incomingSignature } = req.body;
  const handover = (db.shiftHandovers || []).find(h => h.id === id);
  if (!handover) return res.status(404).json({ error: 'Handover record not found' });

  handover.acknowledgedByIncoming = true;
  handover.incomingSupervisor = incomingSupervisor || handover.incomingSupervisor;
  handover.incomingSignature = incomingSignature || 'S. Chen';
  handover.acknowledgedAt = new Date().toISOString();

  logAudit(incomingSupervisor, 'Shift Supervisor', 'SHIFT_HANDOVER_ACKNOWLEDGED', 'ShiftHandover', id, `Shift handover acknowledged and accepted by ${incomingSupervisor}`, null, handover, req);
  saveDb();
  res.json({ success: true, handover });
});

// Bottleneck & Shopfloor Heatmap Data
app.get('/api/bottlenecks', (req, res) => {
  // Compute queue times, active times, and station bottlenecks
  const stations = (db.workstations || []).map(w => {
    const activeJobs = (db.jobTravelers || []).filter(t => {
      const activeOp = (t.operations || []).find(o => o.status === 'In Progress' || o.status === 'Ready / In Queue');
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

  res.json({ stations });
});

// Audit Trail (Immutable Log)
app.get('/api/audit-logs', (req, res) => {
  res.json(db.auditLogs || []);
});

// Serve static client in production/built mode
const clientDist = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.use((req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      return next();
    }
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// Start Server
app.listen(PORT, () => {
  console.log(`Zapuza Factory OS Backend Server running on port ${PORT}`);
});

