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
- **Access Governance Dashboard (HR):** Visual management of ephemeral (24-hour) HR Invite tokens and instant session revocation tools to safeguard the platform.
- **ReceiptsOS (Sales & Merchandising):** A robust PDF Receipt Builder with dynamic calculations (taxes, subtotals), time-tracking, and secure auto-saving functionality. History viewer is strictly restricted by HR hierarchy.
- **Invoice Price Calculator (Sales):** A dedicated tool for the sales team to compute markups, taxes, and final selling prices.
- **Advanced HR Hierarchy:** Introduced the `Assistente de RH` (HR Assistant) role with secure code validation, bridging the gap between employees and the HR Manager.
- **Smart Auto-Breaks:** Non-intrusive WebSocket alerts that notify employees to take a break after 1 hour of continuous work, rather than forcefully manipulating database punching records.
- **Architectural Refactoring:** Successfully modularized the backend architecture by decoupling file upload routes, WebSocket initialization, and background cron schedulers out of the main `server.js` loop.
- **Unified Authentication Pipeline:** Streamlined the frontend's JWT resolution strategy across all components (Inbox, Chat, Profile) to natively support both HR Administrative tokens and ephemeral Employee session tokens.

## How to Run Locally

### Prerequisites
- Node.js (v18+)
- npm

### Installation
1. Install dependencies for both the backend and frontend:
   ```bash
   cd backend && npm install
   cd ../frontend && npm install
   ```
2. Set up the `.env` configuration in the `backend` directory (e.g., `JWT_SECRET`, `CLOUDINARY_URL`).
3. Start the application:
   ```bash
   cd backend && npm run build:frontend && npm start
   ```
4. Access the app via `http://localhost:3001` or run the Vite dev server for isolated frontend development (`npm run dev` inside `/frontend`).
