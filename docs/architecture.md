# Architecture

## Service Ports

- `device-gateway` TCP: `DGW_PORT` default `5000`
- `device-gateway` HTTP API: `DGW_API_PORT` default `5001`
- `tracking-service`: `TS_PORT` default `3001`
- `asset-service`: `AS_PORT` default `3002`
- `integration-service`: `IS_PORT` default `3003`
- `admin-api`: `AA_PORT` default `4000`

## Backend Root

All backend code is grouped under `backend/`, with shared modules in `backend/shared` and schema bootstrap in `backend/database/schema.js`.

## REST Flow

1. COBAN device connects to `device-gateway` over TCP.
2. Parsed packets are posted to `tracking-service /ingest`.
3. `tracking-service` stores positions, evaluates facility transitions, and forwards:
   - latest coordinates to `integration-service /coordinates`
   - arrival/departure events to `integration-service /events`
4. `asset-service` manages orders, facilities, assignments, and geofence provisioning via `device-gateway /command`.
5. `admin-api` authenticates users, aggregates service data, and serves the frontend.

## Geofence Strategy

- Device-side geofencing uses COBAN `121` multi-area management.
- Sequence maps to `area01` through `area05`.
- If an assignment does not have a fully provisioned device-side area map, `tracking-service` falls back to server-side distance checks against assigned facilities.

## Integration Options

- `option1`: CMA-CGM direct API payload delivery
- `option2`: stubbed flow that preserves collection without outbound CMA-CGM delivery
