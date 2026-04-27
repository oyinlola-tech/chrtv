
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

// js/ui.js
import { fetchShipments } from './api.js';

let selectedShipment = null;

export async function loadShipments() {
    const grid = document.getElementById('shipments-grid');
    if (!grid) return;

    grid.innerHTML = `
        <div class="skeleton rounded-xl h-56"></div>
        <div class="skeleton rounded-xl h-56"></div>
    `;

    try {
        const shipments = await fetchShipments();
        grid.innerHTML = shipments.map(s => renderShipmentCard(s)).join('');

        // Attach click handlers
        grid.querySelectorAll('[data-shipment-id]').forEach(card => {
            card.addEventListener('click', () => {
                const id = card.dataset.shipmentId;
                const shipment = shipments.find(s => s.id === id);
                if (shipment) openDetailsPanel(shipment);
            });
        });
    } catch (error) {
        console.error('Failed to load shipments:', error);
        grid.innerHTML = `<div class="col-span-full text-center py-12 text-text-secondary">Failed to load shipments. Please try again.</div>`;
    }
}

function getStatusBadge(status) {
    const map = {
        'in_transit': { label: 'In transit', color: 'status-yellow', dot: 'bg-status-yellow', border: 'border-status-yellow/20', bg: 'bg-status-yellow/10', text: 'text-status-yellow' },
        'picked_up': { label: 'Picked up', color: 'status-gray', dot: 'bg-status-gray', border: 'border-status-gray/20', bg: 'bg-status-gray/10', text: 'text-status-gray' },
        'delivered': { label: 'Delivered', color: 'status-green', dot: 'bg-status-green', border: 'border-status-green/20', bg: 'bg-status-green/10', text: 'text-status-green' },
        'delayed': { label: 'Delayed', color: 'status-red', dot: 'bg-status-red', border: 'border-status-red/20', bg: 'bg-status-red/10', text: 'text-status-red' }
    };
    return map[status] || { label: status, color: 'status-gray', dot: 'bg-status-gray', border: 'border-status-gray/20', bg: 'bg-status-gray/10', text: 'text-status-gray' };
}

function renderShipmentCard(shipment) {
    const badge = getStatusBadge(shipment.status);
    const isSelected = selectedShipment && selectedShipment.id === shipment.id;
    const borderClass = isSelected ? 'border-primary-container/50 shadow-[0_0_15px_rgba(46,91,255,0.15)]' : 'border-border-subtle';
    const titleClass = isSelected ? 'text-primary' : 'text-white';

    return `
        <div data-shipment-id="${shipment.id}" class="bg-surface-card rounded-xl p-5 border ${borderClass} relative cursor-pointer hover:bg-surface-container-highest transition-colors flex flex-col gap-4">
            <div class="flex justify-between items-start">
                <div>
                    <h3 class="font-mono-data text-mono-data ${titleClass}">${shipment.id}</h3>
                    <p class="font-label-md text-label-md text-text-secondary mt-0.5">Booking: ${shipment.bookingRef}</p>
                </div>
                <div class="flex items-center gap-1.5 px-2 py-1 rounded ${badge.bg} ${badge.border}">
                    <span class="w-2 h-2 rounded-full ${badge.dot}"></span>
                    <span class="font-label-md text-label-md ${badge.text}">${badge.label}</span>
                </div>
            </div>
            <div class="flex items-center justify-between py-2 border-y border-border-subtle/50">
                <div class="flex flex-col">
                    <span class="font-label-md text-label-md text-text-secondary">ORIGIN</span>
                    <span class="font-body-md text-body-md text-white font-medium">${shipment.origin}</span>
                </div>
                <div class="flex-1 px-4 flex items-center">
                    <div class="h-[1px] bg-border-subtle flex-1"></div>
                    <span class="material-symbols-outlined text-status-gray mx-2 text-[16px]">arrow_forward</span>
                    <div class="h-[1px] bg-border-subtle flex-1"></div>
                </div>
                <div class="flex flex-col text-right">
                    <span class="font-label-md text-label-md text-text-secondary">DESTINATION</span>
                    <span class="font-body-md text-body-md text-white font-medium">${shipment.destination}</span>
                </div>
            </div>
            <div class="flex justify-between items-end mt-auto pt-2">
                <div class="flex items-center gap-2">
                    <div class="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center border border-border-subtle">
                        <span class="material-symbols-outlined text-[16px] text-text-secondary">directions_car</span>
                    </div>
                    <div class="flex flex-col">
                        <span class="font-label-md text-label-md text-text-secondary">TRUCK</span>
                        <span class="font-body-md text-body-md text-white">${shipment.truck}</span>
                    </div>
                </div>
                <div class="flex flex-col text-right">
                    <span class="font-label-md text-label-md text-text-secondary">ETA</span>
                    <span class="font-mono-data text-mono-data text-white">${shipment.eta}</span>
                </div>
            </div>
        </div>
    `;
}

export function openDetailsPanel(shipment) {
    selectedShipment = shipment;
    const panel = document.getElementById('details-panel');
    const overlay = document.getElementById('details-panel-overlay');
    const empty = document.getElementById('details-empty');
    const content = document.getElementById('details-content');

    if (!panel) return;

    // Fill data
    document.getElementById('detail-id').textContent = shipment.id;
    document.getElementById('detail-description').textContent = shipment.description || '';
    document.getElementById('detail-booking').textContent = shipment.bookingRef;
    document.getElementById('detail-transport').textContent = shipment.transportOrder;
    document.getElementById('detail-driver-name').textContent = shipment.driver?.name || 'Unassigned';
    if (shipment.driver?.avatar) {
        document.getElementById('detail-driver-avatar').src = shipment.driver.avatar;
    }

    // Timeline
    const timeline = document.getElementById('detail-timeline');
    if (timeline && shipment.timeline) {
        timeline.innerHTML = shipment.timeline.map((step, i) => {
            const isActive = step.status === 'active';
            const isCompleted = step.status === 'completed';
            const isPending = step.status === 'pending';

            let dotHtml = '';
            if (isCompleted) {
                dotHtml = `<div class="absolute -left-[26px] w-[24px] h-[24px] rounded-full bg-status-green flex items-center justify-center ring-4 ring-surface-container-low shadow-[0_0_10px_rgba(16,185,129,0.3)]"><span class="material-symbols-outlined text-surface-container-lowest text-[14px] font-bold">check</span></div>`;
            } else if (isActive) {
                dotHtml = `<div class="absolute -left-[26px] w-[24px] h-[24px] rounded-full bg-surface-container-low border-2 border-status-yellow flex items-center justify-center ring-4 ring-surface-container-low shadow-[0_0_15px_rgba(245,158,11,0.4)]"><div class="w-2.5 h-2.5 rounded-full bg-status-yellow"></div></div>`;
            } else {
                dotHtml = `<div class="absolute -left-[26px] w-[24px] h-[24px] rounded-full bg-surface-container border border-border-subtle flex items-center justify-center ring-4 ring-surface-container-low"><div class="w-1.5 h-1.5 rounded-full bg-status-gray"></div></div>`;
            }

            let contentHtml = '';
            if (isActive) {
                contentHtml = `
                    <div class="flex flex-col ml-2 bg-status-yellow/5 border border-status-yellow/20 p-3 rounded-lg -mt-1.5">
                        <span class="font-body-md text-body-md text-status-yellow font-semibold flex items-center gap-1.5">
                            <span class="material-symbols-outlined text-[16px]">local_shipping</span> ${step.label}
                        </span>
                        <span class="font-label-md text-label-md text-text-secondary mt-1">${step.speed ? `Current Speed: ${step.speed}` : ''}</span>
                        ${step.location ? `<span class="font-label-md text-label-md text-text-secondary">${step.time} - ${step.location}</span>` : ''}
                    </div>`;
            } else {
                contentHtml = `
                    <div class="flex flex-col ml-2 ${isPending ? 'opacity-50' : ''}">
                        <span class="font-body-md text-body-md text-white font-medium">${step.label}</span>
                        <span class="font-label-md text-label-md text-text-secondary">${step.time}${step.location ? ' - ' + step.location : ''}</span>
                    </div>`;
            }

            return `<div class="relative z-10">${dotHtml}${contentHtml}</div>`;
        }).join('');
    }

    // Show panel
    empty.classList.add('hidden');
    content.classList.remove('hidden');
    panel.classList.remove('translate-x-full');
    if (overlay) overlay.classList.remove('hidden');

    // Highlight selected card
    document.querySelectorAll('[data-shipment-id]').forEach(card => {
        const border = card.querySelector('.border');
        card.classList.remove('border-primary-container/50', 'shadow-[0_0_15px_rgba(46,91,255,0.15)]');
        card.classList.add('border-border-subtle');
        if (card.dataset.shipmentId === shipment.id) {
            card.classList.add('border-primary-container/50', 'shadow-[0_0_15px_rgba(46,91,255,0.15)]');
            card.classList.remove('border-border-subtle');
        }
    });
}

// js/ui.js
import { fetchAlertStats, fetchAlerts } from './api.js';

let currentAlerts = [];
let activeFilters = { severity: '', sort: 'time' };

export async function loadPage() {
    try {
        const stats = await fetchAlertStats();
        renderStats(stats);
        const alerts = await fetchAlerts(activeFilters.severity, activeFilters.sort);
        currentAlerts = alerts;
        renderFilters();
        renderAlertList(alerts);
    } catch (error) {
        console.error('Alert page load failed:', error);
    }
}

function renderStats(stats) {
    const container = document.getElementById('stats-grid');
    if (!container) return;
    const cards = [
        {
            title: 'Critical (SOS/Breach)',
            count: stats.critical.count,
            trend: stats.critical.trend,
            icon: 'emergency',
            color: 'status-red',
            trendIcon: 'trending_up',
        },
        {
            title: 'Warnings (Speed/Batt)',
            count: stats.warning.count,
            trend: stats.warning.trend,
            icon: 'warning',
            color: 'status-yellow',
            trendIcon: stats.warning.trend.startsWith('+') ? 'trending_up' : 'trending_down',
        },
        {
            title: 'Resolved Incidents',
            count: stats.resolved.count,
            trend: stats.resolved.trend,
            icon: 'check_circle',
            color: 'status-green',
            trendIcon: 'today',
        },
    ];
    container.innerHTML = cards.map(card => `
        <div class="bg-surface-card border border-${card.color}/20 rounded-xl p-5 relative overflow-hidden group">
            <div class="absolute top-0 right-0 w-32 h-32 bg-${card.color}/5 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
            <div class="flex justify-between items-start mb-4 relative z-10">
                <div class="w-10 h-10 rounded bg-${card.color}/10 flex items-center justify-center text-${card.color}">
                    <span class="material-symbols-outlined" style="font-variation-settings:'FILL'1;">${card.icon}</span>
                </div>
                <span class="font-mono-data text-mono-data text-${card.color} flex items-center gap-1">
                    <span class="material-symbols-outlined text-[14px]">${card.trendIcon}</span> ${card.trend}
                </span>
            </div>
            <div class="relative z-10">
                <h3 class="font-headline-xl text-headline-xl text-text-primary">${card.count}</h3>
                <p class="font-label-md text-label-md text-text-secondary uppercase tracking-wider mt-1">${card.title}</p>
            </div>
        </div>
    `).join('');
}

function renderFilters() {
    const container = document.getElementById('filters-bar');
    if (!container) return;
    const severities = [
        { label: 'Critical', value: 'critical', color: 'status-red' },
        { label: 'Warning', value: 'warning', color: 'status-yellow' },
        { label: 'Info', value: 'info', color: 'status-gray' },
    ];
    const activeSeverity = activeFilters.severity;
    const sortOptions = [
        { label: 'Severity (High-Low)', value: 'severity' },
        { label: 'Time (Newest)', value: 'time' },
    ];
    container.innerHTML = `
        <div class="flex items-center gap-4 flex-1">
            <span class="font-label-md text-label-md text-text-secondary pl-2">FILTER BY:</span>
            <div class="flex gap-2">
                ${severities.map(s => `
                    <button data-filter="${s.value}" class="px-3 py-1.5 rounded-full border ${activeSeverity === s.value ? 'border-'+s.color+'/30 bg-'+s.color+'/10 text-'+s.color : 'border-border-subtle text-text-primary'} font-label-md text-label-md hover:bg-${s.color}/10 transition-colors">
                        ${s.label} ${activeSeverity === s.value ? '<span class="material-symbols-outlined text-[14px] ml-1">close</span>' : ''}
                    </button>
                `).join('')}
            </div>
            <div class="h-6 w-px bg-border-subtle mx-2 hidden sm:block"></div>
            <button class="flex items-center gap-2 text-text-secondary hover:text-text-primary font-label-md text-label-md transition-colors hidden sm:flex">
                <span class="material-symbols-outlined text-[18px]">calendar_today</span>
                Last 24 Hours
                <span class="material-symbols-outlined text-[16px]">arrow_drop_down</span>
            </button>
        </div>
        <div class="flex items-center gap-3 pr-2">
            <span class="font-label-md text-label-md text-text-secondary">SORT:</span>
            <select id="sort-select" class="bg-transparent border-none text-text-primary font-label-md text-label-md focus:ring-0 cursor-pointer p-0 pr-6 appearance-none">
                ${sortOptions.map(o => `<option value="${o.value}" ${activeFilters.sort === o.value ? 'selected' : ''}>${o.label}</option>`).join('')}
            </select>
        </div>
    `;

    // Attach filter click events
    container.querySelectorAll('[data-filter]').forEach(btn => {
        btn.addEventListener('click', () => {
            const value = btn.dataset.filter;
            if (activeFilters.severity === value) {
                activeFilters.severity = ''; // toggle off
            } else {
                activeFilters.severity = value;
            }
            loadAlertsWithFilters();
        });
    });

    container.querySelector('#sort-select').addEventListener('change', (e) => {
        activeFilters.sort = e.target.value;
        loadAlertsWithFilters();
    });
}

async function loadAlertsWithFilters() {
    const alerts = await fetchAlerts(activeFilters.severity, activeFilters.sort);
    currentAlerts = alerts;
    renderAlertList(alerts);
}

function renderAlertList(alerts) {
    const container = document.getElementById('alerts-list');
    if (!container) return;
    if (alerts.length === 0) {
        container.innerHTML = `<div class="text-center py-12 text-text-secondary">No alerts match your filters.</div>`;
        return;
    }
    container.innerHTML = alerts.map(alert => {
        const severityColor = alert.severity === 'critical' ? 'status-red' : alert.severity === 'warning' ? 'status-yellow' : 'status-gray';
        const iconName = alert.severity === 'critical' ? 'sos' : alert.severity === 'warning' ? 'speed' : 'info';
        return `
            <div class="bg-surface-card border border-border-subtle rounded-lg flex items-stretch hover:border-${severityColor}/50 transition-colors cursor-pointer group" data-alert-id="${alert.id}">
                <div class="w-1.5 bg-${severityColor} rounded-l-lg"></div>
                <div class="flex-1 p-4 flex items-center gap-4 sm:gap-6">
                    <div class="w-12 h-12 rounded-full bg-${severityColor}/10 border border-${severityColor}/20 flex items-center justify-center shrink-0">
                        <span class="material-symbols-outlined text-${severityColor}" style="font-variation-settings:'FILL'1;">${iconName}</span>
                    </div>
                    <div class="flex-1 grid grid-cols-1 sm:grid-cols-4 gap-4 items-center">
                        <div>
                            <h4 class="font-headline-md text-headline-md text-text-primary mb-0.5">${alert.title}</h4>
                            <span class="font-mono-data text-mono-data text-${severityColor} bg-${severityColor}/10 px-2 py-0.5 rounded text-[11px] uppercase">${alert.severity}</span>
                        </div>
                        <div>
                            <p class="font-label-md text-label-md text-text-secondary mb-0.5">VEHICLE ID</p>
                            <p class="font-body-md text-body-md text-text-primary font-medium">${alert.vehicleId}</p>
                        </div>
                        <div>
                            <p class="font-label-md text-label-md text-text-secondary mb-0.5">LOCATION</p>
                            <p class="font-body-md text-body-md text-text-primary truncate">${alert.location}</p>
                        </div>
                        <div class="text-right">
                            <p class="font-label-md text-label-md text-text-secondary mb-0.5">TIME</p>
                            <p class="font-mono-data text-mono-data text-text-primary">${alert.time}</p>
                        </div>
                    </div>
                    <div class="pl-4 border-l border-border-subtle shrink-0 hidden sm:block">
                        <button class="w-8 h-8 rounded-full bg-surface hover:bg-surface-bright flex items-center justify-center text-text-secondary hover:text-white transition-colors">
                            <span class="material-symbols-outlined text-[20px]">chevron_right</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    // Attach click to open drawer
    container.querySelectorAll('[data-alert-id]').forEach(row => {
        row.addEventListener('click', () => {
            const alertId = row.dataset.alertId;
            const alert = currentAlerts.find(a => a.id === alertId);
            if (alert) openDrawer(alert);
        });
    });
}

function openDrawer(alert) {
    const drawer = document.getElementById('details-drawer');
    const content = document.getElementById('drawer-content');
    const iconContainer = document.getElementById('drawer-icon');
    if (!drawer || !content) return;

    // Update icon color
    const severityColor = alert.severity === 'critical' ? 'status-red' : alert.severity === 'warning' ? 'status-yellow' : 'status-gray';
    iconContainer.className = `w-8 h-8 rounded bg-${severityColor}/10 flex items-center justify-center text-${severityColor}`;
    iconContainer.innerHTML = `<span class="material-symbols-outlined text-[18px]" style="font-variation-settings:'FILL'1;">${alert.severity==='critical'?'sos':'speed'}</span>`;

    const details = alert.details || {};
    content.innerHTML = `
        <div class="rounded-xl overflow-hidden border border-border-subtle relative h-48 bg-slate-900 group">
            <img alt="Map" class="w-full h-full object-cover opacity-80 mix-blend-luminosity" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAcljjrP3WtsEqrYzd5Mub87Bxqw4JdQOTwB3yV_fuAMJvqLYqC6ltWYEMVq5XMX8aJk26F4enifE759pmRlDYg5xsJoMRNHjPaFsDgsFWUUGd0t58VF5fju8uIODY2AfbqoovXL92DHXmSkjQUqh3wsA0vlwFiDxvfGswDEGXUl4ZIDL0x61CrE4NOzvdI1WlcUAc1WQ4l1Q-IATd-7fP-KpR9IjA5yR21P7Ap1iy5906B-nLRGRIc3XYzVHBN-kzAz7uePynwlpm4"/>
            <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                <div class="w-4 h-4 bg-status-red rounded-full shadow-[0_0_15px_rgba(239,68,68,0.8)] border-2 border-white relative z-10"></div>
                <div class="w-12 h-12 bg-status-red/20 rounded-full absolute animate-ping"></div>
            </div>
            <div class="absolute bottom-2 left-2 right-2 flex justify-between items-end">
                <div class="bg-surface/90 backdrop-blur border border-border-subtle px-2 py-1 rounded text-[10px] font-mono-data text-text-primary">34°53'42.1"N 117°01'23.8"W</div>
                <button class="w-8 h-8 rounded bg-surface/90 backdrop-blur border border-border-subtle flex items-center justify-center text-text-primary hover:bg-surface-bright transition-colors">
                    <span class="material-symbols-outlined text-[16px]">fullscreen</span>
                </button>
            </div>
        </div>
        <div class="grid grid-cols-2 gap-4">
            <div class="bg-surface-container border border-border-subtle rounded-lg p-3">
                <p class="font-label-md text-label-md text-text-secondary mb-1">VEHICLE</p>
                <p class="font-body-lg text-body-lg text-text-primary font-semibold">${details.vehicle || alert.vehicleId}</p>
                <p class="font-body-md text-body-md text-text-secondary text-xs mt-0.5">${details.vehicleModel || ''}</p>
            </div>
            <div class="bg-surface-container border border-border-subtle rounded-lg p-3">
                <p class="font-label-md text-label-md text-text-secondary mb-1">DRIVER</p>
                <div class="flex items-center gap-2">
                    <div class="w-6 h-6 rounded-full bg-primary-container text-white flex items-center justify-center font-bold text-[10px]">${details.driver?.initials || '--'}</div>
                    <p class="font-body-lg text-body-lg text-text-primary font-semibold">${details.driver?.name || 'Unknown'}</p>
                </div>
                <p class="font-body-md text-body-md text-status-yellow text-xs mt-0.5 flex items-center gap-1"><span class="material-symbols-outlined text-[12px]">schedule</span> On Duty: 8h 12m</p>
            </div>
        </div>
        <div>
            <h4 class="font-label-md text-label-md text-text-secondary border-b border-border-subtle pb-2 mb-3">TELEMETRY AT TIME OF ALERT</h4>
            <div class="space-y-2 font-mono-data text-mono-data text-sm">
                <div class="flex justify-between items-center py-1"><span class="text-text-secondary">Speed:</span><span class="text-text-primary">${details.speed || '--'}</span></div>
                <div class="flex justify-between items-center py-1"><span class="text-text-secondary">Engine Status:</span><span class="text-status-green">${details.engineStatus || '--'}</span></div>
                <div class="flex justify-between items-center py-1"><span class="text-text-secondary">Fuel Level:</span><span class="text-text-primary">${details.fuelLevel || '--'}</span></div>
                <div class="flex justify-between items-center py-1"><span class="text-text-secondary">Dashcam:</span><span class="text-status-green flex items-center gap-1"><span class="material-symbols-outlined text-[14px]">videocam</span>${details.dashcam || '--'}</span></div>
            </div>
        </div>
        <div>
            <h4 class="font-label-md text-label-md text-text-secondary border-b border-border-subtle pb-2 mb-3">SYSTEM LOG</h4>
            <div class="relative pl-3 border-l-2 border-border-subtle space-y-4">
                ${(details.log || []).map(entry => `
                    <div class="relative">
                        <div class="absolute -left-[19px] top-1 w-3 h-3 rounded-full bg-${entry.source === 'Cab Interface' ? 'status-red' : 'status-gray'} ring-4 ring-surface"></div>
                        <p class="font-body-md text-body-md text-text-primary">${entry.action}</p>
                        <p class="font-label-md text-label-md text-text-secondary mt-0.5">${entry.time} • ${entry.source}</p>
                    </div>
                `).join('')}
            </div>
        </div>
    `;

    // Show the drawer
    document.getElementById('details-drawer').classList.remove('translate-x-full');
    document.getElementById('drawer-overlay').classList.remove('hidden');
}