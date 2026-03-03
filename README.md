# Ponto-Eletronico (Electronic Time Clock App)

An enterprise-grade electronic time tracking and HR management application designed to streamline employee shift logging, internal communications, and HR reporting.

## Project Purpose
The goal of this project is to provide a robust, reliable, and secure environment for employees to register their work hours (Clock In, Clock Out, and Breaks). It also serves as a centralized hub for HR to monitor attendance, send company-wide announcements, export analytics (via PowerBI-ready CSVs), and for employees to customize their profiles and upload professional certifications.

## Features
- **Time Clocking system:** Secure Clock IN, OUT, and Break management.
- **HR Dashboard & Analytics:** Auto-generated attendance reports, anomaly detection (missing shifts/breaks), and seamless PowerBI CSV exports.
- **Real-time Internal Chat:** WebSocket-powered messaging allowing employees to communicate seamlessly direct-to-peer or in team channels.
- **Social Feed:** A lightweight internal social network for company announcements and achievements.
- **User Profiles:** Customizable bios, profile pictures (via Cloudinary), and professional certification tracking.
- **2FA Authentication:** Enhanced security utilizing Time-based One-Time Passwords (TOTP).

## Tech Stack
- **Frontend:** React + Vite
- **Backend:** Node.js, Express.js
- **Database:** SQLite (local development), easily portable
- **Real-time Communications:** Socket.io for live chat updates
- **Storage:** Local Disk Storage or Cloudinary (for production-ready image uploads)

## Recent Highlights & Security Hardening
Through an iterative development and security prioritization process, the application has matured significantly:
1. **Core Focus:** Removed non-essential experimental modules (like internal game hubs and tabletop RPG trackers) to strictly focus on its core HR functionality and optimize build sizes.
2. **Production Readiness:** Configured production builds, static front-end serving via Node, and Cloudinary integration for scalable file uploads.
3. **Advanced Security Mitigations:**
   - **IDOR Patched:** Shift expectations, personal email data, and mail access are strictly siloed via a global `assertOwnership` helper.
   - **User Spoofing Prevented:** Chat and posts robustly tie back to server-side authenticated JWT tokens, ignoring spoofed payloads.
   - **Stored XSS & Arbitrary Executions Blocked:** Implemented strict MIME-type whitelisting mapped to secure disk extensions (`.png`, `.webp`, `.jpg`), and patched internal DOMPurify type-juggling bypasses via robust string constraints.
   - **Rate Limiting & Account Lockouts:** Guarded authentication routes against brute-force attacks via `express-rate-limit` and temporary 15-minute account lockouts after 5 failed attempts.
   - **Authenticated Encryption (AEAD):** Upgraded 2FA (TOTP) secret encryption from `AES-256-CBC` to **`AES-256-GCM`** to ensure both confidentiality and strict data integrity.
   - **Global Session Revocation (The "Kill-Switch"):** Implemented explicit JWT denylisting (`jti`) upon logout and global session invalidation capabilities for compromised accounts.

## Latest Additions
- **Security Hardening:**
  - **Zero-Trust RBAC:** Complete overhaul separating strictly defined functions across HR, Infraestructura (TI), and Analista de TI roles.
  - **Dynamic Session Control (The "Kill-Switch"):** Integrated `sessionVersion` validation directly against the active database, allowing leadership to instantly purge active sessions of compromised accounts globally.
  - **Dual-Token Architecture:** Replaced long-lived sessions with 15-minute Access Tokens and secure, rotating 7-day Refresh Tokens.
  - **Upload Hardening:** Migrated user avatar uploads away from disk to RAM buffers. Introduced Magic Byte detection and EXIF Stripping to prevent arbitrary shell executions, forcefully re-encoding images securely via `sharp`.
  - **Structured Audit Logging:** Deployed a sophisticated JSON logging pipeline powered by `winston`, tagging every API request with an `x-request-id` to trace execution flows. Monitored via the dedicated visual `/security` dashboard.
  - **Anomaly Detection:** Silent user profiling capturing shifts in IP addresses and User-Agents during login phases to flag stolen credentials.
  - **DoS Mitigation:** Implemented aggressive rate-limiting protocols on WebSocket connections at the `socket.io` layer to prevent message flooding.

- **Backend Modularization:**
  - Refactored `server.js` from a monolithic entrypoint into a streamlined application bootstrap file.
  - Extracted core services into isolated modules: `upload.routes.js`, `websockets.js`, and cron jobs inside `scripts/scheduler.js`.
  - Frontend components were heavily split, abstracting logical units like `SecurityDashboard.jsx`, `HRMailModule.jsx`, and `WeeklyReportModal.jsx` away from the massive HR dashboard root.

- **Advanced HR Hierarchy:** Introduced the *Assistente de RH* (HR Assistant) role with secure code validation, bridging the gap between employees and the HR Manager.
- **Smart Auto-Breaks:** Non-intrusive WebSocket alerts that notify employees to take a break after continuous work frames, preserving the integrity of punch logs.

## How to Run Locally

### Prerequisites
- Node.js (v18+)
- npm

### Installation
1. Install dependencies for both the backend and frontend:
   ```bash
   cd backend && npm install --legacy-peer-deps
   cd ../frontend && npm install
   ```
2. Set up the `.env` configuration in the `backend` directory (e.g., `JWT_SECRET`, `CLOUDINARY_URL`, `DATABASE_URL`).
3. Start the application stack:
   - Provide the backend (Development mode):
     ```bash
     cd backend && npm start
     ```
   - Provide the frontend (Vite Hot-Reload):
     ```bash
     cd frontend && npm run dev
     ```
4. Access the app via `http://localhost:5173`. Production builds should be served out of `http://localhost:3001` with `npm run build` prepended.
