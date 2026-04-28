# CH RTV Architecture

## Service Layout

- `device-gateway`: accepts COBAN TCP socket traffic, tracks active device sockets, parses packets, and forwards normalized payloads
- `tracking-service`: stores positions, evaluates geofences, and forwards transport events and coordinates
- `asset-service`: manages transport orders, facilities, and IMEI assignments
- `integration-service`: buffers outbound coordinates and sends events to either Option 1 or the local stub path
- `admin-api`: serves the dashboard, handles authentication, and proxies browser requests to internal services

## Request Flow

1. A COBAN device connects to `device-gateway` over TCP.
2. Login, heartbeat, and location/alarm packets are normalized by `deviceProtocol`.
3. The gateway publishes parsed payloads to `tracking-service`.
4. `tracking-service` stores positions in MySQL and enriches them with assignment data from `asset-service`.
5. Coordinates and transport events are forwarded to `integration-service`.
6. The frontend reads all operational data through `admin-api`.

## Security Boundaries

- Internal service HTTP traffic is loopback-only.
- Browser API access is protected by JWT authentication, rate limiting, security headers, and CSRF checks on mutating routes.
- Database writes use parameterized queries throughout the Node services.
