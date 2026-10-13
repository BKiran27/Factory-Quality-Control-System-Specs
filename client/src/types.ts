export type UserRole =
  | 'Plant Manager'
  | 'Quality Engineer'
  | 'Quality Manager'
  | 'Shift Supervisor'
  | 'QA Floor Inspector'
  | 'Dispatch Clerk';

export interface Workstation {
  id: string;
  name: string;
  qrCode: string;
  department: string;
  pmStatus: 'Completed' | 'Overdue' | 'Pending';
  lastPmDate: string | null;
  pmCheckedBy: string | null;
  zeroPointVerified: boolean;
  currentOperator: string;
  targetCycleMinutes: number;
}

export interface Gauge {
  id: string;
  name: string;
  serialNumber: string;
  type: string;
  lastCalibrationDate: string;
  expiryDate: string;
  status: 'Valid' | 'Expired' | 'In Calibration Lab';
  accuracy: string;
  cribLocation: string;
}

export interface PartComponent {
  partNumber: string;
  partName: string;
  materialGrade: string;
  revision: string;
  cncProgram: string;
  fixtureSetup: string;
  toolingOffsets: string;
  primaryCustomer: string;
  nominalWeightKg: number;
}

export interface ChemicalSpec {
  element: string;
  min: number;
  max: number;
  actual: number;
  unit: string;
  passed: boolean;
}

export interface MechanicalSpec {
  property: string;
  min: number;
  max: number;
  actual: number;
  unit: string;
  passed: boolean;
}

export interface RawMaterialIntake {
  id: string;
  heatNumber: string;
  supplierName: string;
  poNumber: string;
  materialGrade: string;
  quantity: number;
  unit: string;
  receivedDate: string;
  recordedBy: string;
  status: 'Cleared to Store' | 'In Lab Testing' | 'Supplier Quarantine';
  barcodeTag: string;
  mtcFileName: string;
  verifiedBy?: string;
  clearedDate?: string;
  sncrNumber?: string;
  rejectionReason?: string;
  rejectedDate?: string;
  chemicalSpecs: ChemicalSpec[];
  mechanicalSpecs: MechanicalSpec[];
}

export interface BlueprintPin {
  pinId: number;
  x: number; // percentage (0-100)
  y: number; // percentage (0-100)
  label: string;
  type: 'tolerance' | 'max' | 'min' | 'visual';
  nominal?: number;
  upper?: number;
  lower?: number;
  maxLimit?: number;
  minLimit?: number;
  expected?: string;
  unit: string;
  toolGaugeId: string;
  toolName: string;
  isCtq: boolean;
  notes?: string;
}

export interface PdiTemplate {
  id: string;
  partNumber: string;
  partName: string;
  revision: string;
  status: 'Approved' | 'Draft' | 'Pending Review';
  approvedBy: string;
  approvedDate: string;
  blueprintUrl: string;
  pins: BlueprintPin[];
}

export interface OperationStep {
  opNumber: number;
  operationName: string;
  machineId: string;
  status: 'Completed' | 'In Progress' | 'Ready / In Queue' | 'Holding (Cooling/Curing)' | 'Pending' | 'In Review';
  completedAt?: string;
  operatorId?: string | null;
  cycleMinutes?: number;
  notes?: string;
  holdDurationMinutes?: number;
  holdStartedAt?: string;
  holdTargetRelease?: string;
  holdStatus?: 'Active Hold' | 'Hold Cleared' | 'Not Started';
  firstPieceInspection?: {
    status: 'Approved' | 'Pending' | 'Rejected';
    inspectedBy: string;
    timestamp: string;
    remarks: string;
  };
}

export interface JobTraveler {
  id: string;
  barcode: string;
  workOrder: string;
  partNumber: string;
  partName: string;
  heatLot: string;
  batchSize: number;
  customer: string;
  customerPo: string;
  releaseDate: string;
  targetDispatch: string;
  overallStatus: string;
  physicalFloorLocation: string;
  pdiStatus: string;
  pdiInspectionId?: string;
  pdiCompletedAt?: string;
  finishedSerialNumbers: string[];
  operations: OperationStep[];
  isConcession?: boolean;
  concessionDetails?: {
    action: string;
    supervisorId: string;
    timestamp: string;
    reasonCode: string;
    justification: string;
    notes?: string;
  };
  isQuarantined?: boolean;
  gatePassId?: string;
}

export interface MeasurementRecord {
  pinId: number;
  label: string;
  nominal?: number;
  upper?: number;
  lower?: number;
  maxLimit?: number;
  actual: number | string;
  unit: string;
  isCtq: boolean;
  passed: boolean;
  type?: string;
  photos?: string[];
}

export interface InspectionSubmission {
  id: string;
  travelerId: string;
  workOrder: string;
  partNumber: string;
  heatNumber: string;
  stationId: string;
  inspectorId: string;
  gaugeId: string;
  templateId: string;
  inspectionType: 'PDI' | 'IN_PROCESS';
  submittedAt: string;
  measurements: MeasurementRecord[];
  hasFailures: boolean;
  hasCtqFailures: boolean;
  remarks: string;
  status: string;
  isOfflineSync?: boolean;
  supervisorDecision?: {
    action: 'APPROVE' | 'CONCESSION' | 'QUARANTINE';
    supervisorId: string;
    timestamp: string;
    reasonCode?: string;
    justification?: string;
    notes?: string;
  };
}

export interface MrbCase {
  id: string;
  travelerId: string;
  workOrder: string;
  partNumber: string;
  batchSize: number;
  heatLot: string;
  rejectionReason: string;
  quarantinedAt: string;
  dispositionStatus: 'Pending MRB Review' | 'REWORK' | 'SCRAP' | 'RETURN_TO_VENDOR' | 'CUSTOMER_CONCESSION';
  dispositionDate?: string;
  dispositionedBy?: string;
  notes?: string;
  reworkOrder?: string;
  reworkInstructions?: string;
  scrapCostCode?: string;
  scrapBinVerified?: boolean;
  debitNoteNumber?: string;
  customerApprovalDoc?: string;
}

export interface GatePass {
  gatePassId: string;
  travelerId: string;
  workOrder: string;
  partNumber: string;
  heatLot: string;
  batchSize: number;
  serialNumbers: string[];
  vehicleNumber: string;
  driverName: string;
  driverPhone: string;
  destinationCustomer: string;
  customerPoNumber: string;
  issuedAt: string;
  issuedBy: string;
  digitalSignature: string;
  qrVerificationUrl: string;
  status: string;
}

export interface ShiftHandover {
  id: string;
  timestamp: string;
  shiftName: string;
  outgoingSupervisor: string;
  incomingSupervisor: string;
  activeJobsCount: number;
  partsProduced: number;
  scrapCount: number;
  toolWearNotes: string;
  machineHealthNotes: string;
  openQualityAlerts: string;
  outgoingSignature: string;
  acknowledgedByIncoming: boolean;
  acknowledgedAt?: string;
  incomingSignature?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userRole: string;
  action: string;
  entityType: string;
  entityId: string;
  details: string;
  ipAddress: string;
  deviceSerial: string;
  oldValue?: unknown;
  newValue?: unknown;
}
