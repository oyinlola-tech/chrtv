// js/api.js
const BASE_URL = 'http://localhost:3000/api';

export async function fetchFleet() {
    const res = await fetch(`${BASE_URL}/fleet`);
    if (!res.ok) throw new Error(`Fleet fetch failed: ${res.status}`);
    return res.json();
}

export async function fetchVehicle(id) {
    const res = await fetch(`${BASE_URL}/vehicle/${encodeURIComponent(id)}`);
    if (!res.ok) throw new Error(`Vehicle fetch failed: ${res.status}`);
    return res.json();
}

export async function sendCommand(vehicleId, command) {
    const res = await fetch(`${BASE_URL}/command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vehicleId, command })
    });
    return res.ok;
}

export async function fetchDashboard() {
  const res = await fetch(`${BASE_URL}/dashboard`);
  if (!res.ok) throw new Error(`Dashboard fetch failed: ${res.status}`);
  return res.json();
}

export async function fetchFleet(page = 1, limit = 10) {
    const res = await fetch(`${BASE_URL}/fleet?page=${page}&limit=${limit}`);
    if (!res.ok) throw new Error(`Fleet fetch failed: ${res.status}`);
    return res.json();
}

export async function fetchShipments() {
    const res = await fetch(`${BASE_URL}/shipments`);
    if (!res.ok) throw new Error(`Shipments fetch failed: ${res.status}`);
    return res.json();
}

export async function fetchAlertStats() {
    const res = await fetch(`${BASE_URL}/alert-stats`);
    if (!res.ok) throw new Error('Failed to fetch stats');
    return res.json();
}

export async function fetchAlerts(severity = '', sort = '') {
    const params = new URLSearchParams();
    if (severity) params.append('severity', severity);
    if (sort) params.append('sort', sort);
    const res = await fetch(`${BASE_URL}/alerts?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch alerts');
    return res.json();
}

export async function fetchReports() {
    const res = await fetch(`${BASE_URL}/reports`);
    if (!res.ok) throw new Error('Failed to fetch reports');
    return res.json();
}

