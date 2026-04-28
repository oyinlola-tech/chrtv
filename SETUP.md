# CH RTV Setup

## Prerequisites

- Node.js 18 or newer
- npm
- AMPPS MySQL running locally on `127.0.0.1:3306`

## Environment

1. Copy `.env.example` to `.env`.
2. Set a strong `JWT_SECRET`.
3. Set `INITIAL_ADMIN_USERNAME`, `INITIAL_ADMIN_EMAIL`, and `INITIAL_ADMIN_PASSWORD`.
4. Configure SMTP before testing OTP reset:
   - `SMTP_HOST`
   - `SMTP_PORT`
   - `SMTP_SECURE`
   - `SMTP_USER`
   - `SMTP_PASS`
   - `SMTP_FROM`
5. On Windows with AMPPS, prefer `DB_HOST=127.0.0.1` instead of `localhost`.

## Localhost Run Flow

1. Start AMPPS MySQL.
2. From the repository root run:

```bash
npm install
npm run schema
npm run seed
npm run dev
```

3. Open `http://localhost:4000`.
4. Sign in with the bootstrap admin from `.env` or a seeded user.

## Default Ports

- `4000`: admin API and frontend
- `5000`: COBAN TCP listener
- `5001`: device gateway HTTP API
- `3001`: tracking service
- `3002`: asset service
- `3003`: integration service

## Notes

- Internal microservice HTTP traffic is loopback-only by design.
- The integration service defaults to `option2` for local testing.
- If schema or seed fails with `connect ECONNREFUSED 127.0.0.1:3306`, AMPPS MySQL is not running or is listening on a different port.
- If password reset fails with an SMTP configuration message, fill in the SMTP settings in `.env` first.
