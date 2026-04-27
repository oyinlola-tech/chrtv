// js/map.js
export function renderMap(vehicles) {
    const container = document.getElementById('markers-container');
    const svg = document.getElementById('route-svg');
    if (!container || !svg) return;

    // Clear previous
    container.innerHTML = '';
    svg.innerHTML = '';

    vehicles.forEach(vehicle => {
        const { x, y } = vehicle.position; // percentage
        if (x == null || y == null) return;

        // Determine marker style based on status
        const statusClass = {
            moving: 'bg-status-green',
            idle: 'bg-status-yellow',
            stopped: 'bg-status-red',
            offline: 'bg-status-gray'
        }[vehicle.status] || 'bg-status-gray';

        // Create marker element
        const marker = document.createElement('div');
        marker.className = 'absolute z-20 -translate-x-1/2 -translate-y-1/2 cursor-pointer group';
        marker.style.left = `${x}%`;
        marker.style.top = `${y}%`;
        marker.innerHTML = `
            <div class="relative flex items-center justify-center">
                <div class="w-7 h-7 ${statusClass} rounded-full border-2 border-surface flex items-center justify-center shadow-[0_0_10px_rgba(0,0,0,0.5)]">
                    <span class="material-symbols-outlined text-white text-[14px]" style="font-variation-settings:'FILL' 1;">local_shipping</span>
                </div>
                <div class="absolute top-10 left-1/2 -translate-x-1/2 bg-surface-card border border-border-subtle px-3 py-1.5 rounded shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-30">
                    <span class="font-mono-data text-mono-data text-text-primary">${vehicle.name}</span>
                </div>
            </div>
        `;
        marker.addEventListener('click', () => {
            // Dispatch custom event to open drawer (handled in main.js)
            document.dispatchEvent(new CustomEvent('vehicle-selected', { detail: vehicle }));
        });
        container.appendChild(marker);

        // Draw route if available
        if (vehicle.route && vehicle.route.length > 1) {
            let pathD = '';
            vehicle.route.forEach((point, i) => {
                // Convert percentage to SVG coordinate: viewBox 0 0 1000 800
                const px = point.x * 10;  // because 100% -> 1000
                const py = point.y * 8;   // 100% -> 800
                if (i === 0) pathD += `M ${px} ${py}`;
                else pathD += ` L ${px} ${py}`;
            });
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('d', pathD);
            path.setAttribute('fill', 'none');
            path.setAttribute('stroke', '#2E5BFF');
            path.setAttribute('stroke-width', '3');
            path.setAttribute('stroke-dasharray', '6 4');
            path.classList.add('opacity-60');
            svg.appendChild(path);
        }
    });
}