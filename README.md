# CH RTV Platform

Carrier Haulage Real-Time Visibility platform for COBAN GPS trackers and CMA-CGM integration workflows.

## Ownership

- **Owner:** OLuwayemi Oyinlola Michael
- **Portfolio:** https://www.oyinlola.site/
- **GitHub:** https://github.com/oyinlola-tech

## Legal Status

This repository is **proprietary**.

It is **not open source** and **not free to use**. No person or organization may use, copy, modify, deploy, distribute, sublicense, sell, or create derivative works from this project without prior written permission from OLuwayemi Oyinlola Michael.

See [LICENSE.md](LICENSE.md) for full legal terms and [NOTICE.md](NOTICE.md) for the ownership notice.

## Quick Start

1. Read [SETUP.md](SETUP.md) for installation and deployment details.
2. Review [SECURITY.md](SECURITY.md) before testing, sharing, or deploying.
3. Review [AUDIT_REPORT.md](AUDIT_REPORT.md) for the current hardening and audit summary.
4. Run `npm install`, `npm run schema`, `npm run seed`, and `npm run dev` from `backend`.
5. Open `http://localhost:4000`.

## Overview

This repository contains:

- a Node.js microservice backend
- a MySQL schema bootstrap and seed workflow
- an admin dashboard built with HTML, Tailwind CSS, and vanilla JavaScript
- COBAN TCP device ingestion and command handling
- transport order, facility, assignment, and visibility workflows
- integration support for CMA-CGM Option 1 and an Option 2 stub path

## Core Services

- `device-gateway`: TCP listener, device login handling, packet parsing, and outbound command dispatch
- `tracking-service`: position ingest, storage, geofence evaluation, and event forwarding
- `asset-service`: orders, facilities, assignments, and supporting lookup workflows
- `integration-service`: CMA-CGM-facing configuration, payload shaping, and delivery paths
- `admin-api`: authentication, API aggregation, frontend hosting, and Swagger access

## Main Features

- real-time GPS position tracking for COBAN devices
- device-to-order assignment workflows
- geofence and facility management
- dashboard, alerts, reports, and tracking views
- integration mode configuration
- JWT-based admin authentication
- rate limiting, validation, and internal service isolation

## Documentation

- [SETUP.md](SETUP.md): installation, environment setup, deployment notes, and troubleshooting
- [SECURITY.md](SECURITY.md): vulnerability reporting, secret handling, and hardening expectations
- [CONTRIBUTING.md](CONTRIBUTING.md): private collaboration expectations and contribution rules
- [AUDIT_REPORT.md](AUDIT_REPORT.md): audit summary and implementation status
- [LICENSE.md](LICENSE.md): proprietary legal terms
- [NOTICE.md](NOTICE.md): ownership and reuse notice
- [docs/architecture.md](docs/architecture.md): architecture detail
- [docs/api-spec.md](docs/api-spec.md): API reference notes

## Setup Summary

### Prerequisites

- Node.js 16+
- MySQL 5.7+
- npm

### Install and Run

```bash
cd backend
npm install
npm run schema
npm run seed
npm run dev
```

### Default Access

- URL: `http://localhost:4000`
- Login page: `http://localhost:4000/auth/login`
- Initial credentials come from `.env`

## Available Scripts

```bash
npm run dev
npm run schema
npm run seed
npm run test
npm run check
npm run swagger:generate
npm run security:audit
```

## Security Notes

Security controls currently documented or implemented include:

- JWT secret loading from environment variables
- loopback-only internal service communication by default
- request validation on sensitive routes
- rate limiting for auth and API traffic
- `helmet` security headers
- CSRF token support in auth flow
- bounded TCP buffers and socket timeouts
- parameterized database queries

Read [SECURITY.md](SECURITY.md) before sharing this repository, performing security testing, or deploying to any environment outside localhost.

## Repository Structure

```text
CH RTV 1/
+-- README.md
+-- LICENSE.md
+-- NOTICE.md
+-- SECURITY.md
+-- SETUP.md
+-- AUDIT_REPORT.md
+-- docs/
+-- backend/
\-- public/
```

## Important Usage Restriction

Even if you can view or clone this repository, that access does not grant permission to reuse the codebase, documentation, data model, or UI in another personal, academic, internal, or commercial project.

All reuse requires prior written permission from OLuwayemi Oyinlola Michael.
