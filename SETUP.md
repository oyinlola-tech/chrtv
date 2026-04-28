# CH RTV Platform - Setup & Deployment Guide

## Overview

CH RTV (Carrier Haulage Real-Time Visibility) is a comprehensive fleet tracking and logistics management platform that integrates COBAN GPS trackers via TCP sockets with a real-time monitoring dashboard.

**Platform Components:**
- TCP Device Gateway (COBAN protocol)
- Tracking Service (position storage & geofencing)
- Asset Service (orders, facilities, assignments)
- Integration Service (CMA-CGM Option 1/2 support)
- Admin API (JWT auth, service aggregation)
- Web Dashboard (HTML/JS/Tailwind)

## Prerequisites

### System Requirements
- Node.js 16+ 
- MySQL 5.7+ (or AMPPS MySQL)
- 512MB RAM minimum
- TCP port 5000 (device gateway), ports 3001-3003 (services), 4000 (admin API)

### Local Development
- Windows/macOS/Linux
- npm or yarn
- Git (optional)

## Installation

### 1. Clone or Extract Project
```bash
cd CH\ RTV\ 1
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Edit `.env` with your settings:
```env
# Database
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=rtv_platform

# JWT & Security
JWT_SECRET=your-secret-key-min-32-chars
JWT_EXPIRES_IN=12h

# Admin User (initial bootstrap)
INITIAL_ADMIN_USERNAME=admin
INITIAL_ADMIN_PASSWORD=change-me-now

# Port Configuration
DGW_PORT=5000              # TCP socket listener
DGW_API_PORT=5001          # Device gateway HTTP API
TS_PORT=3001               # Tracking service
AS_PORT=3002               # Asset service
IS_PORT=3003               # Integration service
AA_PORT=4000               # Admin API (frontend)

# CORS
ALLOWED_ORIGIN=http://localhost:4000
```

### 3. Initialize Database

The database schema initializes automatically on first run. To manually initialize:

```bash
npm run schema
```

This creates:
- `transport_orders` - Logistics orders
- `facilities` - Warehouse/facility geofences
- `assignments` - Device-to-order mappings
- `device_positions` - GPS coordinates history
- `integration_config` - CMA-CGM settings
- `users` - Admin users

### 4. Create Database (MySQL)

```sql
CREATE DATABASE IF NOT EXISTS rtv_platform CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

## Running the Application

### Development Mode (All Services)

Start all 5 microservices in one terminal:
```bash
npm run dev
```

Expected output:
```
[device-gateway] device-gateway tcp listening on 127.0.0.1:5000
[device-gateway] device-gateway http listening on 127.0.0.1:5001
[tracking-service] tracking-service listening on 127.0.0.1:3001
[asset-service] asset-service listening on 127.0.0.1:3002
[integration-service] integration-service listening on 127.0.0.1:3003
[admin-api] admin-api listening on 4000
```

### Individual Service Start

```bash
npm run start:device-gateway
npm run start:tracking-service
npm run start:asset-service
npm run start:integration-service
npm run start:admin-api
```

### Access Dashboard

**URL:** http://localhost:4000

**Default Credentials:**
- Username: `admin`
- Password: `change-me-now` (from INITIAL_ADMIN_PASSWORD in .env)

**First Login:**
- Go to login page at `/auth/login`
- Use initial admin credentials
- Dashboard opens automatically upon success

## API Documentation

### Swagger/OpenAPI

**URL:** http://localhost:4000/api/docs

Auto-generated API documentation for all endpoints.

### Key Endpoints

**Authentication:**
- `POST /api/auth/login` - Login with username/password
- `GET /api/auth/me` - Get current user info

**Dashboard:**
- `GET /api/dashboard/stats` - Device count, active orders, events
- `GET /api/dashboard/positions` - Latest device positions
- `GET /api/dashboard/events` - Recent geofence/alarm events

**Orders:**
- `GET /api/orders` - List all orders
- `POST /api/orders` - Create order
- `PUT /api/orders/:id` - Update order
- `DELETE /api/orders/:id` - Delete order

**Facilities (Geofences):**
- `GET /api/facilities` - List facilities
- `POST /api/facilities` - Create facility
- `PUT /api/facilities/:id` - Update facility
- `DELETE /api/facilities/:id` - Delete facility

**Devices:**
- `GET /api/devices` - List connected devices
- `POST /api/devices/command` - Send command to device

**Integration:**
- `GET /api/integration/config` - Get current integration config
- `PUT /api/integration/config` - Update config (Option 1/2 toggle)
- `GET /api/integration/logs` - View integration logs

## Device Connection

### COBAN Device Setup

1. **Device IP/Port Configuration:**
   - Server IP: Your server IP or `127.0.0.1` for local
   - Server Port: `5000` (from DGW_PORT)

2. **Device Login Packet Format:**
   ```
   ##,imei:XXXXXXXXXXXXX,A
   ```
   Where XXXXXXXXXXXXX is the 15-digit IMEI

3. **Position Packet Format:**
   ```
   imei:XXXXXXXXXXXXX,001,020824092154,13.148270,S,100.664070,E,0.00,0,0,0.0,0,0,1,00000000,00,4.1,0,0
   ```

4. **Geofence Event Format:**
   ```
   imei:XXXXXXXXXXXXX,area01 in,020824092154,...
   imei:XXXXXXXXXXXXX,area01 out,020824092154,...
   ```

## Testing

### Syntax Check
```bash
npm run check
```

### Security Audit
```bash
npm run security:audit
```

## Frontend Pages

- `/dashboard` - Overview, device count, live positions, events
- `/tracking` - Live map with all device positions
- `/fleet` - Fleet management and status
- `/shipments` - Active shipments and trips
- `/alerts` - Real-time alerts and alarms
- `/geofences` - Geofence management
- `/devices` - Device commands and configuration
- `/orders` - Transport orders CRUD
- `/facilities` - Facility/warehouse geofences
- `/reports` - Analytics and reports
- `/settings` - Configuration management
- `/users` - User management (admin only)

## Docker Deployment

### Build Image
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY . .
RUN npm ci --omit=dev
EXPOSE 5000 5001 3001 3002 3003 4000
CMD ["npm", "run", "dev"]
```

### Run Container
```bash
docker run -p 5000:5000 -p 5001:5001 -p 3001:3001 -p 3002:3002 -p 3003:3003 -p 4000:4000 \
  -e DB_HOST=host.docker.internal \
  -e JWT_SECRET=your-secret \
  ch-rtv:latest
```

## Troubleshooting

### Database Connection Issues
- Verify MySQL is running
- Check DB_HOST, DB_PORT, DB_USER, DB_PASSWORD in .env
- Ensure database exists: `CREATE DATABASE rtv_platform;`

### Port Already in Use
- Change DGW_PORT, TS_PORT, AS_PORT, IS_PORT, AA_PORT in .env
- Or kill process using the port:
  - Windows: `netstat -ano | findstr :5000`
  - macOS/Linux: `lsof -i :5000`

### CORS Errors
- Update ALLOWED_ORIGIN in .env to match your frontend URL
- For local: `http://localhost:4000`

### Device Not Connecting
- Verify TCP listener is running: `netstat -an | grep 5000`
- Check firewall rules
- Verify device is sending to correct IP/port

### JWT Validation Errors
- Ensure JWT_SECRET is at least 32 characters
- Clear browser localStorage and re-login
- Check token expiry with JWT_EXPIRES_IN

## Security Considerations

### Production Deployment

1. **Change Default Credentials**
   - Update INITIAL_ADMIN_PASSWORD
   - Create strong passwords for all users

2. **Generate Secure Secrets**
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
   Use output for JWT_SECRET

3. **Enable HTTPS**
   - Configure reverse proxy (nginx, Apache)
   - Install SSL certificate

4. **Database Security**
   - Use strong DB_PASSWORD
   - Restrict MySQL network access
   - Enable MySQL SSL connections

5. **Environment Variables**
   - Never commit .env to version control
   - Use secrets management system
   - Restrict .env file permissions

6. **Network Security**
   - Firewall TCP 5000 to trusted device IPs
   - Use VPN for admin access
   - Enable rate limiting (already configured)

7. **Logging & Monitoring**
   - Enable syslog forwarding
   - Monitor failed login attempts
   - Alert on integration failures

## Performance Optimization

### Database Tuning
```sql
-- Add missing indexes
CREATE INDEX idx_positions_device_time ON device_positions(imei, utc_timestamp);
CREATE INDEX idx_assignments_order ON assignments(transport_order_id);
```

### Caching
- Consider Redis for device list caching
- Cache facility/order data at application layer

### Connection Pooling
- MySQL connection limit configurable via DB_CONNECTION_LIMIT
- Default: 10 connections

## Maintenance

### Regular Tasks
- Monitor disk space for device_positions table
- Archive old positions quarterly
- Review integration logs for failures
- Update npm dependencies: `npm update`

### Backup
```bash
mysqldump -u root rtv_platform > backup_$(date +%Y%m%d).sql
```

## Support & Documentation

- **Architecture:** See `docs/architecture.md`
- **API Spec:** See `docs/api-spec.md`
- **Issues:** Check README.md for project overview

## License

Proprietary - Carrier Haulage Real Time Visibility Platform
