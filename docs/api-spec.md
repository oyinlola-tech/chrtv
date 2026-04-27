# Internal API Summary

## device-gateway

- `GET /health`
- `GET /devices`
- `POST /command`

## tracking-service

- `GET /health`
- `POST /ingest`
- `GET /positions/latest`
- `GET /positions/recent`
- `GET /events/recent`

## asset-service

- `GET /health`
- `GET /orders`
- `POST /orders`
- `PUT /orders/:id`
- `DELETE /orders/:id`
- `GET /facilities`
- `POST /facilities`
- `PUT /facilities/:id`
- `DELETE /facilities/:id`
- `GET /assignments`
- `POST /assignments`
- `PUT /assignments/:id`
- `GET /internal/assignment/:imei`
- `GET /internal/order/:orderId`

## integration-service

- `GET /health`
- `GET /config`
- `PUT /config`
- `POST /coordinates`
- `POST /events`
- `GET /logs/recent`

## admin-api

- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/dashboard/stats`
- `GET /api/dashboard/positions`
- `GET /api/dashboard/events`
- `GET /api/orders`
- `POST /api/orders`
- `PUT /api/orders/:id`
- `DELETE /api/orders/:id`
- `GET /api/facilities`
- `POST /api/facilities`
- `PUT /api/facilities/:id`
- `DELETE /api/facilities/:id`
- `GET /api/assignments`
- `POST /api/assignments`
- `PUT /api/assignments/:id`
- `GET /api/devices`
- `POST /api/devices/command`
- `GET /api/integration/config`
- `PUT /api/integration/config`
- `GET /api/users`
- `POST /api/users`

