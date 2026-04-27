
// js/ui.js
import { fetchDashboard } from './api.js';


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

// Render all dashboard components
export async function renderDashboard() {
  try {
    const data = await fetchDashboard();
    renderKPI(data.kpis);
    renderFleetAllocation(data.fleetAllocation);
    renderDeliveryPerformance(data.deliveryPerformance);
    renderTrips(data.recentTrips);
    renderAlerts(data.recentAlerts);
    renderMiniMap(data.mapVehicles);
  } catch (err) {
    console.error('Dashboard load failed:', err);
    document.querySelectorAll('.skeleton').forEach(el => el.classList.add('hidden'));
    // You may show an error toast
  }
}

function renderKPI(kpis) {
  const container = document.getElementById('kpi-container');
  if (!container || !kpis) return;

  const kpiItems = [
    {
      label: 'Total Vehicles',
      value: kpis.totalVehicles,
      trend: kpis.totalVehiclesTrend,
      color: 'blue',
      icon: 'trending_up',
    },
    {
      label: 'Active Trips',
      value: kpis.activeTrips,
      trend: kpis.activeTripsTrend,
      color: 'indigo',
      icon: 'trending_up',
    },
    {
      label: 'Vehicles Online',
      value: kpis.onlineVehicles,
      trend: `${kpis.onlinePercent}%`,
      color: 'emerald',
      icon: 'arrow_upward',
    },
    {
      label: 'Vehicles Offline',
      value: kpis.offlineVehicles,
      trend: `${kpis.offlinePercent}%`,
      color: 'slate',
      icon: 'remove',
    },
    {
      label: 'Alerts Today',
      value: kpis.alertsToday,
      trend: kpis.alertsTrend,
      color: 'red',
      icon: 'trending_up',
    },
    {
      label: 'Delayed Deliveries',
      value: kpis.delayedDeliveries,
      trend: kpis.delayedTrend,
      color: 'orange',
      icon: 'trending_down',
    },
  ];

  container.innerHTML = kpiItems.map(item => `
    <div class="bg-surface-card border border-border-subtle rounded-xl p-5 flex flex-col relative overflow-hidden group">
      <div class="absolute top-0 right-0 w-24 h-24 bg-${item.color}-500/5 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
      <span class="text-text-secondary font-label-md text-label-md uppercase mb-2">${item.label}</span>
      <div class="flex items-end justify-between mt-auto">
        <span class="font-headline-xl text-headline-xl text-white leading-none">${item.value}</span>
        <div class="flex items-center text-status-green font-mono-data text-mono-data gap-1 bg-status-green/10 px-2 py-0.5 rounded">
          <span class="material-symbols-outlined text-[14px]">${item.icon}</span>
          ${item.trend}
        </div>
      </div>
    </div>
  `).join('');
}

function renderFleetAllocation(allocation) {
  const pieContainer = document.getElementById('pie-chart');
  const legendContainer = document.getElementById('pie-legend');
  if (!pieContainer || !allocation) return;

  const segments = [
    { label: 'In Transit', value: allocation.inTransit, color: '#10B981' },
    { label: 'Loading', value: allocation.loading, color: '#F59E0B' },
    { label: 'Maintenance', value: allocation.maintenance, color: '#EF4444' },
    { label: 'Idle', value: allocation.idle, color: '#64748B' },
  ];
  const total = segments.reduce((sum, seg) => sum + seg.value, 0);

  // Build SVG donut
  const radius = 72;
  const strokeWidth = 16;
  const circumference = 2 * Math.PI * radius;
  let dashOffset = 0;
  const slices = segments.map(seg => {
    const dashArray = (seg.value / total) * circumference;
    const offset = dashOffset;
    dashOffset += dashArray;
    return { ...seg, dashArray, offset };
  });

  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('class', 'w-40 h-40 -rotate-90');
  svg.setAttribute('viewBox', '0 0 160 160');
  slices.forEach(slice => {
    const circle = document.createElementNS(svgNS, 'circle');
    circle.setAttribute('cx', '80');
    circle.setAttribute('cy', '80');
    circle.setAttribute('r', `${radius}`);
    circle.setAttribute('fill', 'transparent');
    circle.setAttribute('stroke', slice.color);
    circle.setAttribute('stroke-width', `${strokeWidth}`);
    circle.setAttribute('stroke-dasharray', `${slice.dashArray} ${circumference}`);
    circle.setAttribute('stroke-dashoffset', `${-slice.offset}`);
    svg.appendChild(circle);
  });

  pieContainer.innerHTML = '';
  pieContainer.appendChild(svg);

  // Legend
  legendContainer.innerHTML = segments.map(seg => `
    <div class="flex items-center gap-2">
      <div class="w-3 h-3 rounded-sm" style="background-color: ${seg.color}"></div>
      <span class="text-text-secondary">${seg.label} (${seg.value}%)</span>
    </div>
  `).join('');
}

function renderDeliveryPerformance(perf) {
  const container = document.getElementById('chart-area');
  if (!container || !perf) return;

  const { labels, values } = perf;
  const max = Math.max(...values, 1);

  container.innerHTML = `
    <div class="absolute left-0 top-0 bottom-6 w-8 flex flex-col justify-between text-[10px] text-text-secondary text-right pr-2">
      <span>${max}%</span>
      <span>${Math.round(max*0.66)}%</span>
      <span>${Math.round(max*0.33)}%</span>
      <span>0%</span>
    </div>
    <div class="absolute left-8 right-4 top-1 bottom-6 border-l border-b border-border-subtle flex flex-col justify-between">
      <div class="w-full h-px bg-border-subtle/30"></div>
      <div class="w-full h-px bg-border-subtle/30"></div>
      <div class="w-full h-px bg-border-subtle/30"></div>
      <div class="w-full h-px bg-border-subtle/30"></div>
    </div>
    <div class="absolute left-8 right-4 top-1 bottom-6">
      <svg class="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
        <path d="${pointsToPath(values, 100, max)}" fill="none" stroke="#2E5BFF" stroke-linejoin="round" stroke-width="2" />
      </svg>
    </div>
    <div class="absolute left-8 right-4 bottom-0 h-6 flex justify-between text-[10px] text-text-secondary items-center">
      ${labels.map(l => `<span>${l}</span>`).join('')}
    </div>
  `;
}

function pointsToPath(values, viewWidth, maxVal) {
  if (values.length === 0) return '';
  const step = viewWidth / (values.length - 1);
  const points = values.map((v, i) => {
    const x = (step * i).toFixed(1);
    const y = (100 - (v / maxVal) * 100).toFixed(1);
    return `${x},${y}`;
  });
  return `M${points[0]} L${points.join(' ')}`;
}

function renderTrips(trips) {
  const tbody = document.getElementById('trips-tbody');
  if (!tbody || !trips) return;

  if (trips.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="py-8 text-center text-text-secondary">No active trips</td></tr>';
    return;
  }

  tbody.innerHTML = trips.map(trip => `
    <tr class="border-b border-border-subtle/50 hover:bg-surface-bright/30 transition-colors">
      <td class="py-3 px-5 font-mono-data text-white">${trip.tripId}</td>
      <td class="py-3 px-5 text-text-secondary">${trip.vehicle}</td>
      <td class="py-3 px-5 text-white">${trip.origin}</td>
      <td class="py-3 px-5 text-white">${trip.destination}</td>
      <td class="py-3 px-5">
        <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusClass(trip.status)}">
          <span class="w-1.5 h-1.5 rounded-full ${statusDotColor(trip.status)}"></span>
          ${trip.status.replace('_', ' ')}
        </span>
      </td>
      <td class="py-3 px-5 text-right font-mono-data text-text-secondary">${trip.eta}</td>
    </tr>
  `).join('');
}

function statusClass(status) {
  switch (status) {
    case 'on_schedule': return 'bg-status-green/10 text-status-green border border-status-green/20';
    case 'traffic_delay': return 'bg-status-yellow/10 text-status-yellow border border-status-yellow/20';
    default: return 'bg-status-gray/10 text-status-gray border border-status-gray/20';
  }
}
function statusDotColor(status) {
  switch (status) { case 'on_schedule': return 'bg-status-green'; case 'traffic_delay': return 'bg-status-yellow'; default: return 'bg-status-gray'; }
}

function renderAlerts(alerts) {
  const container = document.getElementById('alerts-container');
  const countEl = document.getElementById('alerts-new-count');
  if (!container || !alerts) return;

  countEl.textContent = `${alerts.length} New`;

  if (alerts.length === 0) {
    container.innerHTML = '<div class="text-center text-text-secondary py-8">No alerts</div>';
    return;
  }

  container.innerHTML = alerts.map(alert => `
    <div class="p-3 hover:bg-surface-bright/50 rounded-lg transition-colors flex gap-3 cursor-pointer group">
      <div class="mt-0.5 w-2 h-2 rounded-full bg-${alert.severity==='red'?'status-red':'status-yellow'} shrink-0 shadow-[0_0_8px_rgba(239,68,68,0.6)]"></div>
      <div class="flex-1">
        <div class="flex justify-between items-start mb-1">
          <h4 class="font-label-md text-label-md text-white uppercase">${alert.title}</h4>
          <span class="text-xs text-text-secondary">${alert.time}</span>
        </div>
        <p class="font-body-md text-sm text-text-secondary line-clamp-1">${alert.description}</p>
      </div>
    </div>
    <div class="h-px w-full bg-border-subtle/50 mx-2"></div>
  `).join('');
}

function renderMiniMap(vehicles) {
  const container = document.getElementById('mini-map-markers');
  if (!container || !vehicles) return;
  container.innerHTML = vehicles.map(v => {
    const color = v.status === 'moving' ? 'status-green' : v.status === 'idle' ? 'status-yellow' : 'status-red';
    return `
      <div class="absolute flex flex-col items-center" style="left:${v.x}%; top:${v.y}%">
        <div class="w-4 h-4 rounded-full bg-${color} shadow-[0_0_10px_rgba(0,0,0,0.8)] border-2 border-slate-900"></div>
        <div class="bg-surface-card border border-border-subtle px-2 py-1 rounded shadow-lg mt-1 text-[10px] font-mono-data text-white whitespace-nowrap">${v.id}</div>
      </div>
    `;
  }).join('');
}