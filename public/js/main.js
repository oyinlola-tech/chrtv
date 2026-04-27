// js/main.js
import { fetchFleet } from './api.js';
import { renderMap } from './map.js';
import { updateStatusButtons, openVehicleDrawer } from './ui.js';

let currentVehicles = [];

async function loadData() {
    try {
        const vehicles = await fetchFleet();
        currentVehicles = vehicles;
        renderMap(vehicles);
        updateStatusButtons(vehicles);
    } catch (err) {
        console.error('Failed to load fleet:', err);
        // Optionally show error toast
    } finally {
        document.getElementById('map-loading').classList.add('hidden');
    }
}

// Listen for vehicle selection from map markers
document.addEventListener('vehicle-selected', (e) => {
    openVehicleDrawer(e.detail);
});

// Initial load
document.addEventListener('DOMContentLoaded', loadData);

// Refresh every 30s (optional)
setInterval(loadData, 30000);