# CH RTV Platform

Carrier Haulage Real-Time Visibility platform built as Node.js microservices with a Tailwind + vanilla JavaScript admin frontend.

## Backend Layout

All backend code now lives under [backend](/C:/Users/donri/Desktop/CH%20RTV%201/backend:1):

- `backend/device-gateway`
- `backend/tracking-service`
- `backend/asset-service`
- `backend/integration-service`
- `backend/admin-api`
- `backend/shared`
- `backend/database`

## Tech Stack

- Node.js
- Express
- MySQL (`rtv_platform`)
- Tailwind CSS via CDN
- Leaflet for maps

## Quick Start

1. Create MySQL database `rtv_platform`.
2. Copy [.env.example](/C:/Users/donri/Desktop/CH%20RTV%201/.env.example:1) to `.env` and adjust values.
3. Install backend dependencies:
   - `cd backend`
   - `npm install`
4. Initialize the database schema:
   - `npm run schema`
5. Start services from `backend`:
   - `npm start`
   - or individually:
   - `npm run start:device-gateway`
   - `npm run start:tracking-service`
   - `npm run start:asset-service`
   - `npm run start:integration-service`
   - `npm run start:admin-api`
6. Open `http://localhost:4000/auth/login`.

## First Admin

If the `users` table is empty, create the first admin with:

`POST /api/auth/bootstrap`

```json
{
  "username": "admin",
  "password": "change-me"
}
```

## Default Frontend Flow

1. Login through `admin-api`.
2. Create facilities.
3. Create transport orders with ordered facility sequence.
4. Assign an IMEI to a transport order.
5. The assignment provisions device-side geofences with `121`.
6. Track device positions and watch event/integration logs from the dashboard.

## Notes

- COBAN packet parsing is limited to details present in the provided protocol document.
- CMA-CGM outbound payloads follow the fields shown in the provided presentation.
- The external CMA-CGM endpoint paths are configurable rather than hardcoded because the presentation shows payload shapes but not fixed production URL paths.
- Frontend routes are folder-based, so the app uses `/dashboard`, `/orders`, `/devices`, and similar clean URLs instead of `.html` paths.
- The device gateway listens on TCP `5000` for COBAN trackers and HTTP `5001` for internal command/device APIs. A single process cannot safely host raw TCP and Express HTTP on the same port.
- A local `.env` has been created for this workspace. Review `JWT_SECRET`, DB credentials, and CMA-CGM Option 1 config before production use.

## Verification

- `npm install` completed successfully in `backend/`
- `npm audit --omit=dev` returned `0 vulnerabilities`
- Health endpoints verified locally:
  - `admin-api` on `4000`
  - `device-gateway` HTTP API on `5001`
  - `tracking-service` on `3001`
  - `asset-service` on `3002`
- `integration-service` did not start because MySQL is not currently listening on `127.0.0.1:3306` in this machine
