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