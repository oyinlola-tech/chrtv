# CH RTV Platform

Carrier Haulage Real-Time Visibility platform for COBAN GPS trackers and CMA-CGM Option 1 direct API integration.

## Overview

This repository contains:

- a microservice backend built with Node.js and Express
- a MySQL schema bootstrap in JavaScript
- an admin frontend built with HTML, Tailwind CSS, and vanilla JavaScript
- clean frontend routes such as `/dashboard`, `/orders`, and `/devices`

## Architecture

Services in the platform:

- `device-gateway`
  TCP listener for COBAN devices, login/heartbeat handling, packet parsing, and device command dispatch
- `tracking-service`
  position ingest, device position storage, geofence evaluation, and event forwarding
- `asset-service`
  transport orders, facilities, assignments, and device geofence provisioning
- `integration-service`
  CMA-CGM Option 1 coordinates/events delivery and Option 2 stub
- `admin-api`
  JWT auth, service aggregation, API proxy, and frontend hosting

## Folder Structure

```text
CH RTV 1/
├── .env
├── .env.example
├── .gitignore
├── README.md
├── backend/
│   ├── package.json
│   ├── package-lock.json
│   ├── admin-api/
│   │   ├── server.js
│   │   └── src/
│   │       ├── middleware/
│   │       ├── routes/
│   │       └── services/
│   ├── asset-service/
│   │   ├── server.js
│   │   └── src/
│   │       ├── models/
│   │       ├── routes/
│   │       └── services/
│   ├── database/
│   │   └── schema.js
│   ├── device-gateway/
│   │   ├── server.js
│   │   └── src/
│   │       ├── routes/
│   │       ├── utils/
│   │       ├── commandSender.js
│   │       ├── deviceManager.js
│   │       ├── deviceProtocol.js
│   │       ├── eventPublisher.js
│   │       └── tcpServer.js
│   ├── integration-service/
│   │   ├── server.js
│   │   └── src/
│   │       ├── models/
│   │       ├── routes/
│   │       ├── services/
│   │       └── utils/
│   ├── scripts/
│   │   └── start-all.js
│   ├── shared/
│   │   ├── db.js
│   │   ├── env.js
│   │   ├── http.js
│   │   └── jwt.js
│   └── tracking-service/
│       ├── server.js
│       └── src/
│           ├── models/
│           ├── routes/
│           ├── services/
│           └── utils/
├── docs/
│   ├── api-spec.md
│   └── architecture.md
└── public/
    ├── assets/
    ├── auth/
    │   └── login/
    │       └── index.html
    ├── dashboard/
    │   └── index.html
    ├── orders/
    │   └── index.html
    ├── assignments/
    │   └── index.html
    ├── facilities/
    │   └── index.html
    ├── devices/
    │   └── index.html
    ├── integration/
    │   └── index.html
    ├── users/
    │   └── index.html
    ├── css/
    │   └── app.css
    ├── js/
    │   ├── api.js
    │   ├── main.js
    │   ├── map.js
    │   └── ui.js
    ├── command-center/
    ├── fleet/
    ├── logistic/
    └── tracking/
```

## Tech Stack

- Node.js
- Express
- MySQL with `mysql2/promise`
- Tailwind CSS via CDN
- Leaflet with OpenStreetMap tiles
- JWT authentication

## Ports

- `device-gateway` TCP: `5000`
- `device-gateway` HTTP API: `5001`
- `tracking-service`: `3001`
- `asset-service`: `3002`
- `integration-service`: `3003`
- `admin-api`: `4000`

## Environment

Copy [.env.example](/C:/Users/donri/Desktop/CH%20RTV%201/.env.example:1) to `.env` and review:

- database credentials
- `JWT_SECRET`
- service base URLs
- Option 1 CMA-CGM path values
- all internal service URLs are required and are loaded from the root `.env`

Important:

- the local workspace already has a `.env`
- change the JWT secret before production use
- use the internal loopback URLs from `.env` for service-to-service communication

## Setup

1. Make sure MySQL is installed and listening on `127.0.0.1:3306`.
2. Create or review the root `.env`.
3. Install backend dependencies:

```bash
cd backend
npm install
```

4. Initialize the schema:

```bash
npm run schema
```

5. Start the stack:

```bash
npm start
```

Or run services individually:

```bash
npm run start:device-gateway
npm run start:tracking-service
npm run start:asset-service
npm run start:integration-service
npm run start:admin-api
```

6. Open the frontend:

```text
http://localhost:4000/auth/login
```

## First Admin User

If the `users` table is empty, create the first admin:

`POST /api/auth/bootstrap`

```json
{
  "username": "admin",
  "password": "change-me"
}
```

## Frontend Routes

The frontend uses folder-based routes instead of `.html` URLs:

- `/auth/login`
- `/dashboard`
- `/orders`
- `/assignments`
- `/facilities`
- `/devices`
- `/integration`
- `/users`

## Default Flow

1. Login through `admin-api`.
2. Create facilities.
3. Create transport orders with facility sequence.
4. Create an assignment for a known IMEI.
5. The assignment triggers COBAN `121` geofence commands.
6. Device positions are ingested and stored.
7. Events and coordinates are forwarded to the integration service.
8. Option 1 can send CMA-CGM payloads when configured.

## Notes

- COBAN parsing is limited to details from the provided protocol document.
- CMA-CGM payload fields follow the provided presentation.
- external CMA-CGM endpoint paths are configurable rather than hardcoded
- invalid GPS packets should not be forwarded as coordinates
- the gateway uses TCP `5000` and HTTP `5001` because raw TCP and Express cannot share one port in the same process safely
- Option 2 is currently only a stub
- before real device testing, the COBAN SMS command `protocol<password> 18 out` must be sent outside the software

## Verification Status

Completed locally:

- `npm install` in `backend/`
- `npm audit --omit=dev`
- backend syntax validation with `node --check`
- health endpoint verification for:
  - `admin-api`
  - `device-gateway` HTTP API
  - `tracking-service`
  - `asset-service`

Current blocker:

- `integration-service` depends on MySQL being available on `127.0.0.1:3306`

## Useful Files

- [backend/database/schema.js](/C:/Users/donri/Desktop/CH%20RTV%201/backend/database/schema.js:1)
- [backend/package.json](/C:/Users/donri/Desktop/CH%20RTV%201/backend/package.json:1)
- [backend/scripts/start-all.js](/C:/Users/donri/Desktop/CH%20RTV%201/backend/scripts/start-all.js:1)
- [backend/admin-api/server.js](/C:/Users/donri/Desktop/CH%20RTV%201/backend/admin-api/server.js:1)
- [backend/device-gateway/server.js](/C:/Users/donri/Desktop/CH%20RTV%201/backend/device-gateway/server.js:1)
- [public/js/main.js](/C:/Users/donri/Desktop/CH%20RTV%201/public/js/main.js:1)
