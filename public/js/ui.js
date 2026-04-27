// js/ui.js
export function updateStatusButtons(vehicles) {
    const counts = { moving: 0, idle: 0, stopped: 0, offline: 0 };
    vehicles.forEach(v => {
        if (counts.hasOwnProperty(v.status)) counts[v.status]++;
    });

    const container = document.getElementById('status-buttons');
    if (!container) return;

    const buttons = [
        { status: 'moving', color: 'status-green', label: 'Moving' },
        { status: 'idle', color: 'status-yellow', label: 'Idle' },
        { status: 'stopped', color: 'status-red', label: 'Stopped' },
        { status: 'offline', color: 'status-gray', label: 'Offline' }
    ];

    container.innerHTML = buttons.map(b => `
        <button class="flex items-center gap-2 p-2 bg-surface-container border border-${b.color}/30 rounded text-sm text-text-primary hover:bg-surface-bright transition-colors">
            <div class="w-2.5 h-2.5 rounded-full bg-${b.color}"></div>
            ${b.label} (${counts[b.status] || 0})
        </button>
    `).join('');
}

export function openVehicleDrawer(vehicle) {
    const drawer = document.getElementById('vehicle-drawer');
    if (!drawer || !vehicle) return;

    document.getElementById('drawer-title').textContent = vehicle.name;
    document.getElementById('drawer-status').textContent = vehicle.status === 'moving' ? 'In Transit' : vehicle.status;
    document.getElementById('drawer-status').className = `px-2 py-0.5 rounded bg-${vehicle.status==='moving'?'status-green':vehicle.status==='idle'?'status-yellow':'status-red'}/20 text-${vehicle.status==='moving'?'status-green':vehicle.status==='idle'?'status-yellow':'status-red'} border border-${vehicle.status==='moving'?'status-green':vehicle.status==='idle'?'status-yellow':'status-red'}/30 font-label-md text-label-md uppercase tracking-wider`;
    document.getElementById('drawer-location').innerHTML = `<span class="material-symbols-outlined text-[16px]">pin_drop</span> Route position`;
    document.getElementById('drawer-speed').textContent = vehicle.speed || '--';
    document.getElementById('drawer-fuel').textContent = vehicle.fuel || '--';
    document.getElementById('drawer-fuel-bar').style.width = `${vehicle.fuel}%`;
    document.getElementById('drawer-imei').textContent = vehicle.imei || '--';
    document.getElementById('drawer-driver').innerHTML = `<span class="material-symbols-outlined text-[16px] text-primary-container">account_circle</span> ${vehicle.driver || '--'}`;
    document.getElementById('drawer-acc').textContent = vehicle.acc ? 'ON' : 'OFF';
    document.getElementById('drawer-acc').className = `font-mono-data text-mono-data ${vehicle.acc ? 'text-status-green' : 'text-status-red'}`;
    document.getElementById('drawer-update').textContent = vehicle.lastUpdate || '--';
    document.getElementById('drawer-heading').textContent = vehicle.heading ? `${vehicle.heading}°` : '--';
    document.getElementById('drawer-destination').textContent = vehicle.destination || '--';
    document.getElementById('drawer-eta').textContent = vehicle.eta ? `ETA: ${vehicle.eta}` : 'ETA: --';

    // Show drawer
    drawer.classList.remove('translate-x-full');
}