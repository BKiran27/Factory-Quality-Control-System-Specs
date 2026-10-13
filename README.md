# Zapuza Factory Operations & Quality Control System

**Version:** 5.0 (Comprehensive Factory Operational Specification)  
**Target System:** Complete Shopfloor Quality Assurance, In-Process Tracking & Final Dispatch Clearance System  
**Developed by:** Zapuza Technologies LLP  
**Effective Standard Date:** October 10, 2026  

---

## 🚀 Overview & Executive Vision

The **Zapuza Factory Operations & Quality Control System** is an enterprise-grade digital manufacturing operating system built to eliminate paper clipboards, loose inspection sheets, hand-written traveler cards, and verbal handoffs across the entire manufacturing floor. 

It establishes an immediate, locked digital boundary at every workstation, ensuring no job lot advances to downstream CNC machines, enters heat treatment, or leaves through the factory dispatch gate unless every dimension, material certificate, process hold time, and supervisor sign-off is 100% complete and verified.

---

## 🛠️ Architecture & Tech Stack

- **Frontend:** React 19, TypeScript, Tailwind CSS, Lucide Icons, Web Audio API Sound Synthesizer, SVG CAD Blueprint Pinning Canvas, SVG QR/Barcode Engine.
- **Backend:** Node.js, Express, REST API, Persistent JSON database with real-world aerospace & automotive manufacturing seed data, Multer upload pipelines for MTC certificates and defect photos.
- **Rugged Hardware Ergonomics:** Glove-friendly touch mode (high-contrast, ≥56px tactile touch buttons), offline local cache queue (`localStorage`) with automatic synchronization on Wi-Fi reconnect.
- **Quality Standards Compliance:** ISO 9001:2015, AS9100D Aerospace, and IATF 16949 compliant immutable audit trail.

---

## 📋 Comprehensive Operational Coverage (Sections 1 – 14)

### 1. Master Plant Infrastructure Setup (Section 2)
- **Hierarchy:** Plant Sites & Departments (Main Machining Shop, Heat Treatment Bay, Precision Grinding, QA CMM Lab, Packing Line, Raw Dock, Rejection Bay 107).
- **Machine Calibration & PM Locks (2.2):** Daily Preventive Maintenance (PM) and zero-point calibration sign-offs. If a machine's PM is overdue (e.g., *Precision Grinder #03*), the system disables job selection and locks the station until signed off.
- **Measuring Tool Calibration Enforcement (2.3):** Master calibration register for Vernier calipers, micrometers, height gauges, and CMMs. If an inspector selects an expired tool (e.g., *Insize Caliper #VC-99*), the tablet freezes entry with an `"Expired Tool Calibration"` lockout.

### 2. Raw Material Intake & Mill Test Certificate (MTC) Verification (Section 3)
- **Dock Intake Logging:** Records supplier name, PO number, material grade, heat number, and physical quantity received.
- **Digital MTC Cross-Checking:** Automated comparison of certified chemical composition (C, Mn, Si, Cr, Ni, Mo) and mechanical properties (Yield, Tensile, Hardness) against ASTM / API engineering standards.
- **Weather-Resistant Barcode Labels:** Generates scannable QR/barcode tags for raw bundles and billets.
- **Supplier Non-Conformance Report (SNCR):** Out-of-spec materials (e.g. *Heat #H-6621*) are quarantined to `"Supplier Quarantine"`. Stock cannot be issued to production work orders under any circumstances.

### 3. PDI Checklist Template Studio & Interactive Blueprint Pinning (Section 4)
- **Central Design Studio:** Allows Quality Engineers to map inspection forms to specific part numbers (e.g., *TS-204 Turbine Shaft*) with revision control (*Rev A*, *Rev B*).
- **Interactive CAD Blueprint Pinning:** Click directly on technical CAD schematics to drop color-coded inspection pins (Pin 1 on Shaft Diameter, Pin 2 on Spline Length, Pin 3 on Flange Thickness).
- **Critical-to-Quality (CTQ) Tagging:** Highlights vital safety dimensions in orange. Out-of-spec entries on CTQ items immediately freeze the inspection and strictly disallow supervisor concessions.

### 4. Rugged Tablet-Based Shopfloor Inspector Workflow (Section 5 & 9)
- **Mandatory Physical Presence QR Rule (5.1):** Manual keyboard search is strictly disabled on inspector tablets. Workers must physically scan:
  1. The machine frame QR plate mounted on the workstation.
  2. The barcode printed on the active Job Traveler Sheet.
- **Locked Step-by-Step Inspection (5.2):** Linear sequence lock; inspectors cannot skip dimensions or switch jobs until all features are entered.
- **Instant Visual Green/Red Feedback (5.4):** Inputs illuminate in vivid GREEN for in-tolerance or RED for out-of-spec with audio chime/buzzer cues.
- **Mandatory Defect Photo Capture (5.4):** When an out-of-tolerance value is entered, the tablet forces capturing at least **two clear photos** before proceeding.
- **First-Piece Sign-Off Protocol (9.1):** Machine stations are locked in `"Setup Mode"` until QA signs off on the first piece. Production counters cannot increment before clearance.
- **Hourly Periodic Inspection Alerts (9.2):** Audible alarms and visual banners prompt operators to measure sample parts with a 15-minute countdown grace period.

### 5. Supervisor Review & Concession Workflow (Section 6)
- **Live Approval Queue:** Supervisors sort pending inspections by shift, line, machine, or urgency.
- **Three Decision Paths:**
  1. **Approved:** 100% conforming; cleared for next operation or dispatch.
  2. **Conditional Concession Release:** For non-CTQ slight deviations only; forces selection of reason codes and mandatory engineering justification. Concession lots are permanently flagged in quality history. *(Strictly blocked on CTQ parameters!)*
  3. **Quarantine to Rejection Area:** Moves lot to `"Digital Rejection Holding Area (Bay 107)"`. Prevents downstream machines from running work.

### 6. Material Review Board (MRB) Portal (Section 6.3)
Four digital dispositions executed by Plant Manager, Quality Head, and Production Lead:
1. **Rework Order Generation:** Automatically creates dedicated rework routing traveler (e.g., Op 25 corrective machining).
2. **Scrap Disposition:** Writes off material, logs scrap cost codes, and requires physical verification at the scrap bin.
3. **Return to Vendor (RTV):** Routes material back to dock and issues vendor debit note requests.
4. **Customer Special Concession:** Holds lot until formal written customer deviation approval is uploaded.

### 7. Process Routing Sequences & Mandatory Hold Timers (Section 7 & 8)
- **Strict Sequential Routing:** Op 10 → Op 20 → Op 30 → Op 40 → Op 50 → Op 60 → Op 70. Operators cannot start or log time on Op 30 if Op 20 is incomplete.
- **Automated Hold Countdown Timers & Interlocks:** Processes requiring thermal cooling or chemical curing (e.g., 4-hour cooling hold after Heat Treatment) start an automated countdown. Scanning into Op 40 before timer hits zero flashes a RED banner: `"Mandatory Cooling Hold Active (X hr remaining)"` and disables the operation.

### 8. Pre-Dispatch Clearance Gates & Shipping Interlocks (Section 10 & 11)
Automated verification of the **3 Mandatory Shipping Rules**:
1. 100% of required manufacturing operations signed off as complete.
2. All process aging and cooling hold times fulfilled without outstanding holds.
3. Final Pre-Dispatch Inspection (PDI) checklist signed and Approved by Quality.
- **Gate Lockout Warning:** If any rule fails, shipping gate passes, commercial invoices, and packing manifests are completely locked.
- **Cleared Dispatch:** Generates digital Gate Pass, transport vehicle manifests, and printable customer verification QR crate labels.

### 9. Customer Certificate of Analysis (CoA) & Lineage Traceability (Section 7.2 & 11.3)
- **Forward Recall Traceability:** Query Heat Lot # (e.g. `H-8042`) to immediately identify every machined part, work order, and customer crate containing that steel batch.
- **Backward Field Traceability:** Query Component Serial # to reveal complete manufacturing birth certificate: supplier MTC, heat chemistry, CNC operator, shift date, exact PDI measurements, calibration IDs of gauges used, and gate pass clearance.
- **Customer CoA Dossier:** Scanning the crate QR label opens the official AS9100D Certificate of Analysis with digital verification hash and quality lead signatures.

### 10. Digital Shift Handover Logbook (Section 12.2)
- Captures active jobs, parts produced, scrap counts, tool wear notes, and machine health at shift transitions (Morning → Evening → Night).
- Requires incoming worker digital signature acknowledgment before resuming work.

### 11. Tamper-Proof Audit Trail (Section 13.3)
- Immutable Write-Once Read-Many (WORM) audit log recording User ID, timestamp, IP address, device serial number, previous value, and new value.

---

## 🏃 Quick Start Guide

### 1. Prerequisites
- Node.js (v18+)
- npm (v9+)

### 2. Running the System
From the repository root:
```bash
# Terminal 1: Start Backend Server (runs on Port 5000)
npm run server

# Terminal 2: Start Vite Frontend Client (runs on Port 5173)
npm run client
```

Or run the full production application directly on Port 5000:
```bash
node server/server.js
```
Open **`http://localhost:5000`** (or **`http://localhost:5173`** for hot reload development).

---

## 🧪 Demonstration Walkthrough Scenarios

1. **Test Machine PM Lock:**  
   On the **Dashboard**, observe that *Precision Grinder #03* is marked `"PM OVERDUE"`. Click *"Sign-off PM & Unlock"* to release it.
2. **Test Expired Tool Calibration Lock:**  
   Switch role to **QA Floor Inspector** (or go to **Inspector Tablet**). In the *Active Tool Serial* dropdown, select `VC-99` (Insize Caliper). Observe the instant red alert: `"TOOL CALIBRATION EXPIRED - MEASUREMENT ENTRY BLOCKED"`. Switch back to `VC-104` to unlock.
3. **Test Anti-Cheat Physical Presence QR Scan:**  
   On the **Inspector Tablet**, click `CNC-04` under *Step 1*, then select traveler `TRV-2026-9041` under *Step 2* to unlock the step-by-step checklist.
4. **Test Real-Time Tolerance Feedback & Defect Photo Capture:**  
   For Pin 1 (Nominal 45.000 mm, +0.025 / -0.010 mm):
   - Type `45.015`: Screen illuminates bright **GREEN** (within limits) with high pass chime.
   - Type `45.050`: Screen turns vivid **RED** (out of tolerance) with warning buzzer. Clicking confirm launches the **Mandatory Defect Photo Capture modal** (requiring 2 photos).
5. **Test Cooling Hold Interlock:**  
   Go to **Job Travelers & Holds** and inspect `TRV-2026-9041`. Observe that Op 30 has an active cooling hold countdown. Attempting to click Op 40 triggers the red **Automated Cooling Hold Interlock** banner.
6. **Test Shipping Clearance Interlock:**  
   Go to **Dispatch Clearance**. Select `TRV-2026-9041` to see the **High-Visibility Gate Lockout Active** (rules incomplete). Select `TRV-2026-9040` to see all 3 gates pass and print the customer verification crate QR label!
7. **Test Forward & Backward Traceability:**  
   Go to **Lineage & Traceability**. Query Heat `#H-8042` for forward supplier recall analysis, or traveler `TRV-2026-9040` to view the full birth certificate and export the Customer Certificate of Analysis (CoA).
