# Zapuza Factory Operations & Quality Control System

**Version:** 5.1 (Enterprise Production & IIoT Edition)  
**Target System:** Complete Shopfloor Quality Assurance, In-Process Tracking & Final Dispatch Clearance System  
**Developed by:** Zapuza Technologies LLP  
**Effective Standard Date:** October 10, 2026  

---

## 🚀 Overview & Executive Vision

The **Zapuza Factory Operations & Quality Control System** is an enterprise-grade digital manufacturing operating system built to eliminate paper clipboards, loose inspection sheets, hand-written traveler cards, and verbal handoffs across the entire manufacturing floor. 

It establishes an immediate, locked digital boundary at every workstation, ensuring no job lot advances to downstream CNC machines, enters heat treatment, or leaves through the factory dispatch gate unless every dimension, material certificate, process hold time, and supervisor sign-off is 100% complete and verified.

---

## 🛠️ Architecture & Tech Stack

- **Frontend:** React 19, TypeScript, Tailwind CSS, Lucide Icons, Web Audio API Sound Synthesizer, SVG CAD Blueprint Pinning Canvas, SVG QR/Barcode Engine, `html5-qrcode` Camera Scanner, Web Bluetooth API (BLE tool transmission), Web NFC badge reader.
- **Backend:** Node.js, Express, REST API, Persistent JSON database with real-world aerospace & automotive manufacturing seed data, Multer upload pipelines for MTC certificates and defect photos.
- **Quality & Statistical Intelligence:** Statistical Process Control (SPC) with X-Bar & R Control Charts, Process Capability ($C_p / C_{pk}$), Predictive CNC Tool Offset Drift Compensation, and Pareto 80/20 Non-Conformance Root Cause Analytics.
- **AI Intelligence:** AI Smart MTC Document OCR Extraction & Computer Vision Defect Pre-Screening.
- **Regulatory & Security:** AS9100D Aerospace, ISO 9001:2015, IATF 16949, and FDA 21 CFR Part 11 compliant Cryptographic Electronic Signatures & Write-Once Read-Many (WORM) audit logging.
- **Deployment:** Progressive Web App (PWA) with Service Worker offline caching, Docker multi-stage containerization, and Docker Compose on-premises orchestration.

---

## 🌟 Newly Implemented Enterprise Features (v5.1)

### 1. 📷 Live Camera QR & Barcode Scanner (`CameraScannerModal`)
- Real-time video stream scanning directly using tablet/device cameras via `html5-qrcode`.
- Laser alignment target box with auto-detection for Machine Frame QR Plates (`STATION-CNC-04`) and Traveler Barcodes (`TRV-9041`).
- Hardware fallback simulators for desktop browser testing.

### 2. 📈 Statistical Process Control (SPC) & Quality Analytics (`SpcAnalyticsView`)
- **Live X-Bar & R Control Charts:** Renders SVG control charts with Upper Specification Limit (USL), Lower Specification Limit (LSL), Upper Control Limit (UCL), Lower Control Limit (LCL), and sample trendlines.
- **Process Capability ($C_p$ & $C_{pk}$):** Automatic calculation of Six Sigma capability metrics.
- **Predictive CNC Tool Wear Compensation:** Identifies runs of consecutive sample drift (e.g. cutting insert wear) and automatically calculates the recommended machine offset compensation (e.g., `X -0.012 mm on T02`).
- **Pareto Analysis (80/20 Rule):** Visual defect root cause breakdown across the factory floor.
- **Certified Supplier Scorecards:** Tracks acceptance rates and audit status for raw material vendors (Jindal, Apex, Global Metallurgy).

### 3. 🤖 AI Smart MTC Document OCR Extraction
- In the **Dock Intake & MTC Module**, an automated document parsing engine scans supplier Mill Test Certificate PDFs to automatically extract chemical composition (C, Mn, Si, Cr, Ni, Mo) and mechanical properties (Yield, Tensile, Hardness) with 99.1% confidence.

### 4. 👁️ AI Computer Vision Defect Pre-Screening
- When floor inspectors capture non-conformance photos on their tablets, the embedded vision engine pre-screens the defect (e.g., chatter marks, flange thickness steps, burrs), assesses confidence and severity, and recommends rework instructions for the shift supervisor.

### 5. 📡 Bluetooth Low Energy (BLE) Wireless Gauge Transmission
- Pairs directly with digital calipers/micrometers (Mitutoyo U-WAVE wireless receivers / USB Digimatic) using the browser's Web Bluetooth API.
- Tapping **Auto-Send Reading** transmits the exact micron dimension directly into the checklist field without manual typing.

### 6. 📇 RFID / NFC Badge Tap Login (Web NFC)
- Inspectors and leads tap their physical RFID employee card against the tablet bezel to switch user credentials and permissions without removing gloves.

### 7. 🔒 FDA 21 CFR Part 11 & AS9100 Cryptographic Signatures
- Secondary PIN verification (`8842`) and SHA-256 cryptographic digital signature hashes on high-consequence supervisor actions (conditional concessions, MRB scrap dispositions).

### 8. 📴 PWA Standalone Kiosk & Offline Service Worker
- `manifest.json` and `sw.js` enable installing the app as a standalone industrial kiosk application.
- Caches all application code, SVGs, and schematics offline; queues inspection entries locally in IndexedDB/`localStorage` and auto-synchronizes when reconnecting to plant Wi-Fi.

### 9. 🐳 Docker & Docker Compose Containerization
- Multi-stage `Dockerfile` and `docker-compose.yml` for 1-command deployment on factory on-premise edge servers.

---

## 📋 Comprehensive Operational Coverage (Sections 1 – 14)

### 1. Master Plant Infrastructure Setup (Section 2)
- Hierarchy: Plant Sites & Departments (Main Machining Shop, Heat Treatment Bay, Precision Grinding, QA CMM Lab, Packing Line, Raw Dock, Rejection Bay 107).
- Machine Calibration & PM Locks: Daily Preventive Maintenance (PM) verification. Overdue machines (e.g., *Precision Grinder #03*) are locked from running jobs.
- Measuring Tool Calibration Enforcement: Expired tools (e.g., *Insize Caliper #VC-99*) trigger instant measurement entry lockouts.

### 2. Raw Material Intake & Mill Test Certificate (MTC) Verification (Section 3)
- Dock receiving logs, chemical spectro cross-checks, weatherproof barcode tagging, and Supplier Non-Conformance Report (SNCR) quarantine.

### 3. PDI Checklist Template Studio & Interactive Blueprint Pinning (Section 4)
- Interactive CAD schematic canvas with color-coded inspection pins, tolerance configuration ($\pm$, max limits, visual pass/fail), tool requirements, and Critical-to-Quality (**CTQ**) priority tagging.

### 4. Rugged Tablet-Based Shopfloor Inspector Workflow (Section 5 & 9)
- Glove-friendly touch UI, **anti-cheat 2-step QR presence rule** (station QR plate + traveler barcode), linear step-by-step locks, instant green/red tolerance feedback, mandatory defect photo capture, first-piece quality sign-offs ("Setup Mode"), and hourly periodic inspection alerts.

### 5. Supervisor Review & Concession Workflow (Section 6)
- Live review queue, approval sign-off, **conditional engineering concessions** with mandatory reason codes and justifications (strictly blocked on CTQ dimensions), or quarantine to Digital Rejection Holding Bay 107.

### 6. Material Review Board (MRB) Portal (Section 6.3)
- 4 digital dispositions: Rework Order generation (Op 25 corrective machining), Scrap write-offs with cost codes, Return to Vendor (RTV), or Customer Special Concession.

### 7. Process Routing Sequences & Mandatory Hold Timers (Section 7 & 8)
- Strict numerical sequence enforcement ($\text{Op } 10 \rightarrow \text{Op } 70$), active cycle time tracking, and **mandatory cooling/aging hold countdown timers** with automated lockout banners.

### 8. Pre-Dispatch Clearance Gates & Shipping Interlocks (Section 10 & 11)
- Automated gatekeeping verifying the 3 mandatory rules (100% ops signed off, all hold timers fulfilled, final PDI approved). Locked gate passes with high-visibility lockout warnings if unfulfilled; unlocked digital gate pass & customer QR labels once cleared.

### 9. Customer Certificate of Analysis (CoA) & Lineage Traceability (Section 7.2 & 11.3)
- **Forward Recall Traceability:** Query Heat Lot # (e.g. `H-8042`) to locate all affected work orders, parts, and customer crates in seconds.
- **Backward Field Traceability:** Query component serials to generate complete manufacturing birth certificates.
- **Customer CoA Dossier:** End-customer inspection certificate accessible via crate QR code scan.

### 10. Digital Shift Handover Logbook (Section 12.2)
- Shift handover logs tracking active jobs, parts output, scrap count, tool wear, and machine health with incoming supervisor digital signature acknowledgment.

### 11. Tamper-Proof Audit Trail (Section 13.3)
- Immutable Write-Once Read-Many (WORM) audit log recording User ID, timestamp, IP, device serial, previous values, and new values for ISO 9001 / AS9100D compliance.

---

## 🏃 Quick Start Guide

### 1. Prerequisites
- Node.js (v18+)
- npm (v9+)
- Docker (optional for container deployment)

### 2. Running Locally
```bash
# Install dependencies
npm install
cd client && npm install && cd ..

# Build frontend client
npm --prefix client run build

# Start Full Production Server on Port 5000
npm start
```
Open **`http://localhost:5000`** in any web browser or industrial tablet.

### 3. Running with Docker Compose
```bash
docker compose up -d --build
```
Open **`http://localhost:5000`**.
