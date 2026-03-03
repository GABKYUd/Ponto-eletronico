# Ponto Eletrônico - Threat Model (STRIDE)

This document outlines the threat modeling assessment applied to the architecture of the Ponto Eletrônico application.

## 1. STRIDE Framework Overview
STRIDE is an acronym for:
- **S**poofing
- **T**ampering
- **R**epudiation
- **I**nformation Disclosure
- **D**enial of Service
- **E**levation of Privilege

## 2. Threat Scenarios
| Category | Identified Threat | Likelihood | Impact | Mitigation Implemented |
|---|---|---|---|---|
| **Spoofing** | JWT token theft allowing attacker to impersonate user. | Medium | High | Short-lived (15m) access tokens, global Kill-Switch (`session_valid_after`), refresh token rotation, strict IP tracking. |
| **Spoofing** | Brute force or credential stuffing attacks against the login form. | High | High | Rate limiting applied to `/auth/login`, account lockout after 5 failed attempts (15m wait), and 2FA (TOTP) enforcement. |
| **Tampering** | Uploading malicious files (e.g. Polyglot reverse shells). | Low | Critical | L3 Upload Hardening: Magic byte inspection (`file-type`), EXIF stripping and re-encoding (`sharp`), strict memory staging. |
| **Tampering** | Data injection through JWT payload or Parameter Tampering. | Low | High | Cryptographically signed tokens (AES-GCM for 2FA secrets + SHA256 for HR Invites). |
| **Repudiation** | Employee denying a shift punch or an admin denying a critical action. | Medium | Medium | Immutable SQLite WAL/PostgreSQL transaction logs with centralized `x-request-id` JSON structured logging (`winston`) and Action Audit trails (`audit_logs` table). |
| **Information Disclosure** | Discovering credentials/configurations or viewing other employees' data. | Low | High | IDOR checks in `auth.js` (`assertOwnership`), database `bio`/`email` restrictions for standard employees, Helmet CSP headers, JSON stripping. |
| **Denial of Service** | Overwhelming the API or Socket.io connection. | High | Medium | `express-rate-limit` implemented globally (max 800 req/15m). |
| **Elevation of Privilege** | An Employee attempting to access HR or IT Analyst actions. | Low | Critical | Centralized RBAC Matrix (`authorize(action)`), separation of `MANAGE_USERS` vs `VIEW_PROFILES` with `hasPermission`. |

## 3. Data Flow Trust Boundaries
- **Untrusted (Internet):** End-users interacting with the React SPA.
- **Semi-Trusted:** Authenticated JWT bearers requesting normal shift punches or receipts.
- **Trusted (Backend/HR/IT):** Requests containing active Admin/Infra/MasterAdmin signatures.

## 4. Conclusion
The environment requires continuous monitoring of `logs/security*.json`. Future tasks should involve SIEM integration for the generated NDJSON schema.
