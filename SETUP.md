# CH RTV Setup

## Prerequisites

- Node.js 18 or newer
- npm
- AMPPS MySQL running locally on `127.0.0.1:3306`

## Localhost Run Flow

1. Copy `.env.example` to `.env` if needed and set a strong `JWT_SECRET`.
2. Start AMPPS MySQL before running schema or seed commands.
3. From the repository root run:

```bash
npm install
npm run schema
npm run seed
npm run dev
```

4. Open `http://localhost:4000`.
5. Sign in with the initial admin from `.env`, or use the seeded users after `npm run seed`.

## Default Ports

- `4000`: admin API and frontend
- `5000`: COBAN TCP listener
- `5001`: device gateway HTTP API
- `3001`: tracking service
- `3002`: asset service
- `3003`: integration service

## Local Testing Notes

- Internal microservice HTTP endpoints are loopback-only by design.
- The integration service defaults to `option2` so localhost runs do not require an external CMA-CGM endpoint.
- If schema or seed fails with `ECONNREFUSED 127.0.0.1:3306`, AMPPS MySQL is not running or is listening on a different port.
