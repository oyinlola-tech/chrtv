import { api, openDashboardStream, setSession } from './api.js';
import { card, escapeHtml, flash, formatDate, protectPage, renderShell, table } from './ui.js';
import { createPositionMap, enableFacilityPicker, renderPositionMarkers } from './map.js';

const page = document.body.dataset.page;

if (page !== 'login') {
  protectPage();
}

const pages = {
  login: initLogin,
  dashboard: initDashboard,
  tracking: initTracking,
  fleet: initFleet,
  shipments: initShipments,
  orders: initOrders,
  assignments: initAssignments,
  alerts: initAlerts,
  facilities: () => initFacilitiesPage('facilities', 'Facilities and Geofences'),
  geofences: () => initFacilitiesPage('geofences', 'Geofence Management'),
  devices: () => initDevicesPage('devices', 'Device Commands'),
  'command-center': () => initDevicesPage('devices', 'Device Commands'),
  integration: initIntegration,
  reports: initReports,
  settings: initSettings,
  users: initUsers,
};

bootstrap();

async function bootstrap() {
  const init = pages[page];
  if (!init) return;

  try {
    await init();
  } catch (error) {
    if (page === 'login') {
      const errorBox = document.getElementById('login-error');
      if (errorBox) {
        errorBox.textContent = error.message;
        errorBox.classList.remove('hidden');
      }
      return;
    }

    renderShell(page, 'Page Error', 'This page could not be loaded.', `
      <div class="rounded-[1.8rem] border border-red-100 bg-red-50 p-5 text-red-700">
        ${escapeHtml(error.message || 'Unable to load page')}
      </div>
    `);
  }
}

function rowsOrEmpty(rowsHtml, colspan, message) {
  return rowsHtml || `<tr><td colspan="${colspan}" class="px-4 py-6 text-sm text-slate-500">${escapeHtml(message)}</td></tr>`;
}

function metric(value, fallback = '--') {
  return value == null || value === '' ? fallback : value;
}

function boolLabel(value) {
  return value ? 'Active' : 'Inactive';
}

function attachPageCleanup(cleanup) {
  window.addEventListener('beforeunload', cleanup, { once: true });
}

function renderDashboardCards(stats) {
  document.getElementById('dashboard-cards').innerHTML = [
    card('Connected Devices', stats.deviceCount || 0),
    card('Active Assignments', stats.activeAssignments || 0, 'bg-orange-50 border-orange-100'),
    card('Orders In Progress', stats.activeOrders || 0),
    card('Integration Mode', stats.integrationOption === 'option1' ? 'Option 1' : 'Option 2', 'bg-blue-50 border-blue-100'),
  ].join('');
}

function renderDashboardEvents(events) {
  const rows = (events || []).slice(0, 10).map((event) => `
    <tr class="border-t border-slate-100">
      <td class="px-4 py-3 text-sm font-medium text-slate-800">${escapeHtml(metric(event.event_type))}</td>
      <td class="px-4 py-3 text-sm text-slate-600">${escapeHtml(metric(event.equipmentReference || event.equipment_reference))}</td>
      <td class="px-4 py-3 text-sm text-slate-600">${escapeHtml(metric(event.facility?.name))}</td>
      <td class="px-4 py-3 text-sm text-slate-500">${escapeHtml(formatDate(event.timestamp))}</td>
    </tr>
  `).join('');

  document.getElementById('dashboard-events').innerHTML = `
    <div class="rounded-[1.8rem] border border-slate-200 bg-white p-4 shadow-sm">
      <h3 class="mb-4 font-display text-xl text-ink">Recent Events</h3>
      ${table(['Event', 'Equipment', 'Facility', 'Timestamp'], rowsOrEmpty(rows, 4, 'No recent events yet.'))}
    </div>
  `;
}

async function initLogin() {
  const form = document.getElementById('login-form');
  const errorBox = document.getElementById('login-error');
  const successBox = document.getElementById('login-success');
  const loginTab = document.getElementById('login-tab');
  const resetTab = document.getElementById('reset-tab');
  const resetPanel = document.getElementById('reset-panel');
  const otpRequestForm = document.getElementById('otp-request-form');
  const resetPasswordForm = document.getElementById('reset-password-form');
  const invalidCredentialsMessage = 'Incorrect username/email or password.';

  const getLoginErrorMessage = (error) => (
    error?.message === 'Invalid credentials' ? invalidCredentialsMessage : (error?.message || 'Unable to sign in')
  );

  const setMode = (mode) => {
    const isLogin = mode === 'login';
    form.classList.toggle('hidden', !isLogin);
    resetPanel.classList.toggle('hidden', isLogin);
    loginTab.className = isLogin
      ? 'rounded-2xl bg-white px-4 py-3 font-medium text-ink shadow-sm'
      : 'rounded-2xl px-4 py-3 font-medium text-slate-500';
    resetTab.className = !isLogin
      ? 'rounded-2xl bg-white px-4 py-3 font-medium text-ink shadow-sm'
      : 'rounded-2xl px-4 py-3 font-medium text-slate-500';
    errorBox.classList.add('hidden');
    successBox.classList.add('hidden');
  };

  loginTab.addEventListener('click', () => setMode('login'));
  resetTab.addEventListener('click', () => setMode('reset'));
  setMode('login');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    errorBox.classList.add('hidden');
    successBox.classList.add('hidden');
    try {
      const session = await api.login({
        identifier: document.getElementById('identifier').value.trim(),
        password: document.getElementById('password').value,
      });
      setSession(session);
      window.location.href = '/dashboard';
    } catch (error) {
      errorBox.textContent = getLoginErrorMessage(error);
      errorBox.classList.remove('hidden');
    }
  });

  otpRequestForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    errorBox.classList.add('hidden');
    successBox.classList.add('hidden');
    try {
      const response = await api.requestPasswordReset({
        identifier: document.getElementById('reset-identifier').value.trim(),
      });
      successBox.textContent = response.message;
      successBox.classList.remove('hidden');
    } catch (error) {
      errorBox.textContent = error.message;
      errorBox.classList.remove('hidden');
    }
  });

  resetPasswordForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    errorBox.classList.add('hidden');
    successBox.classList.add('hidden');
    try {
      const response = await api.resetPassword({
        email: document.getElementById('reset-email').value.trim(),
        otp: document.getElementById('reset-otp').value.trim(),
        password: document.getElementById('reset-password').value,
      });
      setMode('login');
      successBox.textContent = response.message;
      successBox.classList.remove('hidden');
      document.getElementById('identifier').value = document.getElementById('reset-email').value.trim();
      document.getElementById('password').value = '';
      resetPasswordForm.reset();
    } catch (error) {
      errorBox.textContent = error.message;
      errorBox.classList.remove('hidden');
    }
  });
}

async function initDashboard() {
  renderShell('dashboard', 'Operational Dashboard', 'Live device count, latest coordinates, and recent transport events across the platform.', `
    <section class="grid gap-4 md:grid-cols-2 xl:grid-cols-4" id="dashboard-cards"></section>
    <section class="mt-6 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
      <div class="rounded-[1.8rem] border border-slate-200 bg-white p-4 shadow-sm">
        <div class="mb-4 flex items-center justify-between">
          <h3 class="font-display text-xl text-ink">Live Positions</h3>
          <span class="rounded-full bg-orange-50 px-3 py-1 text-xs uppercase tracking-[0.24em] text-orange-600">OpenStreetMap</span>
        </div>
        <div id="dashboard-map" class="h-[420px] rounded-[1.4rem]"></div>
      </div>
      <div id="dashboard-events"></div>
    </section>
  `);

  const map = createPositionMap('dashboard-map');
  const stats = await api.dashboardStats();
  renderDashboardCards(stats);
  renderPositionMarkers(map, stats.recentPositions || []);
  renderDashboardEvents(stats.recentEvents || []);

  const stopStream = openDashboardStream({
    onSnapshot(snapshot) {
      renderDashboardCards(snapshot.stats || {});
      renderPositionMarkers(map, snapshot.positions || []);
      renderDashboardEvents(snapshot.events || []);
    },
    onError() {
      flash('Live dashboard stream reconnecting...', 'error');
    },
  });

  attachPageCleanup(stopStream);
}

async function initTracking() {
  renderShell('tracking', 'Live Tracking', 'Recent tracker coordinates with a live map and latest telemetry feed.', `
    <section class="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
      <div class="rounded-[1.8rem] border border-slate-200 bg-white p-4 shadow-sm">
        <h3 class="mb-4 font-display text-xl text-ink">Position Map</h3>
        <div id="tracking-map" class="h-[520px] rounded-[1.4rem]"></div>
      </div>
      <div id="tracking-table"></div>
    </section>
  `);

  const map = createPositionMap('tracking-map');
  const renderTrackingView = (positions = [], events = []) => {
    renderPositionMarkers(map, positions);

    const rows = positions.slice(0, 15).map((position) => `
      <tr class="border-t border-slate-100">
        <td class="px-4 py-3 text-sm font-medium text-slate-800">${escapeHtml(metric(position.imei))}</td>
        <td class="px-4 py-3 text-sm text-slate-600">${escapeHtml(metric(position.latitude))}, ${escapeHtml(metric(position.longitude))}</td>
        <td class="px-4 py-3 text-sm text-slate-600">${escapeHtml(metric(position.speed, 0))}</td>
        <td class="px-4 py-3 text-sm text-slate-500">${escapeHtml(formatDate(position.utc_timestamp))}</td>
      </tr>
    `).join('');

    const eventChips = events.slice(0, 8).map((event) => `
      <div class="rounded-2xl border border-slate-100 bg-slate-50 p-3">
        <p class="text-sm font-medium text-slate-800">${escapeHtml(metric(event.event_type))}</p>
        <p class="mt-1 text-xs text-slate-500">${escapeHtml(metric(event.equipmentReference || event.equipment_reference))} at ${escapeHtml(metric(event.facility?.name))}</p>
      </div>
    `).join('');

    document.getElementById('tracking-table').innerHTML = `
      <div class="grid gap-6">
        <div class="rounded-[1.8rem] border border-slate-200 bg-white p-4 shadow-sm">
          <h3 class="mb-4 font-display text-xl text-ink">Latest Positions</h3>
          ${table(['IMEI', 'Coordinates', 'Speed', 'Timestamp'], rowsOrEmpty(rows, 4, 'No positions available.'))}
        </div>
        <div class="rounded-[1.8rem] border border-slate-200 bg-white p-4 shadow-sm">
          <h3 class="mb-4 font-display text-xl text-ink">Recent Alerts</h3>
          <div class="grid gap-3">${eventChips || '<p class="text-sm text-slate-500">No recent events.</p>'}</div>
        </div>
      </div>
    `;
  };

  const stats = await api.dashboardStats();
  renderTrackingView(stats.recentPositions || [], stats.recentEvents || []);

  const stopStream = openDashboardStream({
    onSnapshot(snapshot) {
      renderTrackingView(snapshot.positions || [], snapshot.events || []);
    },
    onError() {
      flash('Live tracking stream reconnecting...', 'error');
    },
  });

  attachPageCleanup(stopStream);
}

async function initFleet() {
  renderShell('fleet', 'Fleet Management', 'Watch socket connectivity and assignment coverage across known devices.', `
    <section class="grid gap-4 md:grid-cols-2 xl:grid-cols-4" id="fleet-cards"></section>
    <section class="mt-6" id="fleet-table"></section>
  `);

  const [devicesRes, assignmentsRes] = await Promise.all([api.devices(), api.assignments()]);
  const devices = devicesRes.devices || [];
  const assignments = assignmentsRes.assignments || [];

  document.getElementById('fleet-cards').innerHTML = [
    card('Connected Sockets', devices.length),
    card('Assigned Devices', assignments.length),
    card('Active Assignments', assignments.filter((item) => item.is_active).length, 'bg-orange-50 border-orange-100'),
    card('Unassigned Connected', Math.max(devices.length - assignments.length, 0), 'bg-blue-50 border-blue-100'),
  ].join('');

  const rows = assignments.map((assignment) => `
    <tr class="border-t border-slate-100">
      <td class="px-4 py-3 text-sm font-medium text-slate-800">${escapeHtml(metric(assignment.imei))}</td>
      <td class="px-4 py-3 text-sm text-slate-600">${escapeHtml(metric(assignment.order_number))}</td>
      <td class="px-4 py-3 text-sm text-slate-600">${escapeHtml(metric(assignment.license_plate))}</td>
      <td class="px-4 py-3 text-sm text-slate-600">${escapeHtml(boolLabel(assignment.is_active))}</td>
    </tr>
  `).join('');

  document.getElementById('fleet-table').innerHTML = table(['IMEI', 'Order', 'License Plate', 'Status'], rowsOrEmpty(rows, 4, 'No fleet assignments available.'));
}

async function initShipments() {
  renderShell('shipments', 'Trips / Shipments', 'Transport orders and assignment counts grouped for operations visibility.', `
    <section id="shipments-table"></section>
  `);

  const [ordersRes, assignmentsRes] = await Promise.all([api.orders(), api.assignments()]);
  const assignmentsByOrder = new Map();
  (assignmentsRes.assignments || []).forEach((assignment) => {
    assignmentsByOrder.set(assignment.transport_order_id, (assignmentsByOrder.get(assignment.transport_order_id) || 0) + 1);
  });

  const rows = (ordersRes.orders || []).map((order) => `
    <tr class="border-t border-slate-100">
      <td class="px-4 py-3 text-sm font-medium text-slate-800">${escapeHtml(metric(order.order_number))}</td>
      <td class="px-4 py-3 text-sm text-slate-600">${escapeHtml(metric(order.equipment_reference))}</td>
      <td class="px-4 py-3 text-sm text-slate-600">${escapeHtml(metric(order.transportation_phase))}</td>
      <td class="px-4 py-3 text-sm text-slate-600">${escapeHtml(metric(order.status))}</td>
      <td class="px-4 py-3 text-sm text-slate-600">${escapeHtml(assignmentsByOrder.get(order.id) || 0)}</td>
    </tr>
  `).join('');

  document.getElementById('shipments-table').innerHTML = table(['Order', 'Equipment', 'Phase', 'Status', 'Assignments'], rowsOrEmpty(rows, 5, 'No trips or shipments available.'));
}

async function initOrders() {
  renderShell('shipments', 'Transport Orders', 'Create transport orders with ordered facility sequence and manage the shipment setup flow.', `
    <section class="grid gap-6 xl:grid-cols-[420px_1fr]">
      <form id="order-form" class="rounded-[1.8rem] border border-slate-200 bg-white p-5 shadow-sm space-y-4"></form>
      <div id="orders-table"></div>
    </section>
  `);

  const [ordersRes, facilitiesRes] = await Promise.all([api.orders(), api.facilities()]);
  renderOrderForm(facilitiesRes.facilities || []);
  renderOrdersTable(ordersRes.orders || []);
}

function renderOrderForm(facilities) {
  const host = document.getElementById('order-form');
  const facilityOptions = facilities.map((facility) => `
    <label class="flex items-start gap-3 rounded-2xl border border-slate-200 p-3">
      <input type="checkbox" name="facility-sequence" value="${facility.id}" class="mt-1">
      <span>
        <span class="block text-sm font-medium text-slate-800">${escapeHtml(facility.name)}</span>
        <span class="text-xs text-slate-500">${escapeHtml(facility.facility_type_code)} · ${escapeHtml(facility.location_code || 'No code')}</span>
      </span>
    </label>
  `).join('');

  host.innerHTML = `
    <div>
      <p class="text-xs uppercase tracking-[0.24em] text-tide">Create Order</p>
      <h3 class="mt-2 font-display text-2xl text-ink">New transport order</h3>
    </div>
    <input id="order-number" class="field" placeholder="Order number" required>
    <input id="booking-ref" class="field" placeholder="Carrier booking reference">
    <input id="equipment-reference" class="field" placeholder="Equipment reference" required>
    <select id="transportation-phase" class="field"><option value="EXPORT">EXPORT</option><option value="IMPORT">IMPORT</option></select>
    <select id="mode-of-transport" class="field"><option value="TRUCK">TRUCK</option><option value="RAIL">RAIL</option><option value="BARGE">BARGE</option><option value="VESSEL">VESSEL</option></select>
    <div class="space-y-2">
      <p class="text-sm font-medium text-slate-700">Facility sequence</p>
      <div class="grid gap-2 max-h-[280px] overflow-auto">${facilityOptions || '<p class="text-sm text-slate-500">Create facilities first.</p>'}</div>
    </div>
    <button class="rounded-2xl bg-ember px-4 py-3 text-white">Save order</button>
  `;

  host.addEventListener('submit', async (event) => {
    event.preventDefault();
    const facilitySequence = Array.from(host.querySelectorAll('input[name="facility-sequence"]:checked')).map((item) => Number(item.value));
    await api.createOrder({
      order_number: document.getElementById('order-number').value.trim(),
      carrier_booking_ref: document.getElementById('booking-ref').value.trim(),
      equipment_reference: document.getElementById('equipment-reference').value.trim(),
      transportation_phase: document.getElementById('transportation-phase').value,
      mode_of_transport: document.getElementById('mode-of-transport').value,
      facility_sequence: facilitySequence,
    });
    flash('Order created', 'success');
    await initOrders();
  });
}

function renderOrdersTable(orders) {
  const rows = orders.map((order) => `
    <tr class="border-t border-slate-100">
      <td class="px-4 py-3 text-sm font-medium text-slate-800">${escapeHtml(order.order_number)}</td>
      <td class="px-4 py-3 text-sm text-slate-600">${escapeHtml(order.equipment_reference)}</td>
      <td class="px-4 py-3 text-sm text-slate-600">${escapeHtml(order.transportation_phase)}</td>
      <td class="px-4 py-3 text-sm text-slate-600">${escapeHtml((order.facilities || []).map((item) => item.name).join(' -> ') || '--')}</td>
      <td class="px-4 py-3 text-right text-sm">
        <button class="rounded-xl border border-red-200 px-3 py-2 text-red-600 transition hover:bg-red-50" data-order-delete="${order.id}">Delete</button>
      </td>
    </tr>
  `).join('');

  document.getElementById('orders-table').innerHTML = table(['Order', 'Equipment', 'Phase', 'Facility Sequence', 'Action'], rowsOrEmpty(rows, 5, 'No orders available.'));
  document.getElementById('orders-table').onclick = async (event) => {
    const id = event.target.dataset.orderDelete;
    if (!id) return;
    if (!window.confirm('Delete this order and its assignments?')) return;
    await api.deleteOrder(id);
    flash('Order deleted', 'success');
    await initOrders();
  };
}

async function initAssignments() {
  renderShell('fleet', 'Assignments', 'Bind a COBAN IMEI to a transport order and provision up to five device-side geofences.', `
    <section class="grid gap-6 xl:grid-cols-[420px_1fr]">
      <form id="assignment-form" class="rounded-[1.8rem] border border-slate-200 bg-white p-5 shadow-sm space-y-4"></form>
      <div id="assignments-table"></div>
    </section>
  `);

  const [ordersRes, assignmentsRes] = await Promise.all([api.orders(), api.assignments()]);
  const orders = ordersRes.orders || [];
  if (!orders.length) {
    document.getElementById('assignment-form').innerHTML = `
      <div class="rounded-2xl bg-orange-50 p-4 text-sm text-orange-700">
        Create a transport order before assigning a device.
      </div>
      <a href="/orders" class="inline-flex rounded-2xl bg-ember px-4 py-3 text-white">Go to Orders</a>
    `;
  } else {
    const orderOptions = orders.map((order) => `<option value="${order.id}">${escapeHtml(order.order_number)} · ${escapeHtml(order.equipment_reference)}</option>`).join('');
    document.getElementById('assignment-form').innerHTML = `
      <div>
        <p class="text-xs uppercase tracking-[0.24em] text-tide">New Assignment</p>
        <h3 class="mt-2 font-display text-2xl text-ink">Assign device</h3>
      </div>
      <select id="assignment-order" class="field">${orderOptions}</select>
      <input id="assignment-imei" class="field" placeholder="IMEI">
      <input id="assignment-plate" class="field" placeholder="License plate">
      <input id="assignment-originator" class="field" placeholder="Originator name">
      <input id="assignment-partner" class="field" placeholder="Partner name (optional)">
      <button class="rounded-2xl bg-ember px-4 py-3 text-white">Save assignment</button>
    `;

    document.getElementById('assignment-form').addEventListener('submit', async (event) => {
      event.preventDefault();
      await api.createAssignment({
        transport_order_id: Number(document.getElementById('assignment-order').value),
        imei: document.getElementById('assignment-imei').value.trim(),
        license_plate: document.getElementById('assignment-plate').value.trim(),
        originator_name: document.getElementById('assignment-originator').value.trim(),
        partner_name: document.getElementById('assignment-partner').value.trim(),
        is_active: true,
      });
      flash('Assignment created and geofence commands queued', 'success');
      await initAssignments();
    });
  }

  const rows = (assignmentsRes.assignments || []).map((assignment) => `
    <tr class="border-t border-slate-100">
      <td class="px-4 py-3 text-sm font-medium text-slate-800">${escapeHtml(assignment.imei)}</td>
      <td class="px-4 py-3 text-sm text-slate-600">${escapeHtml(metric(assignment.order_number))}</td>
      <td class="px-4 py-3 text-sm text-slate-600">${escapeHtml(metric(assignment.license_plate))}</td>
      <td class="px-4 py-3 text-sm text-slate-600">${escapeHtml(metric(assignment.originator_name))}</td>
      <td class="px-4 py-3 text-sm text-slate-600">${escapeHtml(boolLabel(assignment.is_active))}</td>
      <td class="px-4 py-3 text-right text-sm">
        <button class="rounded-xl border border-red-200 px-3 py-2 text-red-600 transition hover:bg-red-50" data-assignment-delete="${assignment.id}">Delete</button>
      </td>
    </tr>
  `).join('');

  document.getElementById('assignments-table').innerHTML = table(['IMEI', 'Order', 'Plate', 'Originator', 'Status', 'Action'], rowsOrEmpty(rows, 6, 'No assignments available.'));
  document.getElementById('assignments-table').onclick = async (event) => {
    const id = event.target.dataset.assignmentDelete;
    if (!id) return;
    if (!window.confirm('Delete this assignment?')) return;
    await api.deleteAssignment(id);
    flash('Assignment deleted', 'success');
    await initAssignments();
  };
}

async function initAlerts() {
  renderShell('alerts', 'Alerts', 'Recent transport events and outbound integration responses in one operational feed.', `
    <section class="grid gap-6 xl:grid-cols-2">
      <div id="alerts-events"></div>
      <div id="alerts-logs"></div>
    </section>
  `);

  const [eventsRes, logsRes] = await Promise.all([api.dashboardEvents(), api.integrationLogs()]);

  const eventRows = (eventsRes.events || []).map((event) => `
    <tr class="border-t border-slate-100">
      <td class="px-4 py-3 text-sm font-medium text-slate-800">${escapeHtml(metric(event.event_type))}</td>
      <td class="px-4 py-3 text-sm text-slate-600">${escapeHtml(metric(event.equipmentReference || event.equipment_reference))}</td>
      <td class="px-4 py-3 text-sm text-slate-500">${escapeHtml(formatDate(event.timestamp))}</td>
    </tr>
  `).join('');

  const logRows = (logsRes.logs || []).map((log) => `
    <tr class="border-t border-slate-100">
      <td class="px-4 py-3 text-sm font-medium text-slate-800">${escapeHtml(metric(log.direction))}</td>
      <td class="px-4 py-3 text-sm text-slate-600">${escapeHtml(metric(log.response_http_code))}</td>
      <td class="px-4 py-3 text-sm text-slate-500">${escapeHtml(formatDate(log.created_at))}</td>
    </tr>
  `).join('');

  document.getElementById('alerts-events').innerHTML = `
    <div class="rounded-[1.8rem] border border-slate-200 bg-white p-4 shadow-sm">
      <h3 class="mb-4 font-display text-xl text-ink">Transport Events</h3>
      ${table(['Event', 'Equipment', 'Timestamp'], rowsOrEmpty(eventRows, 3, 'No recent transport events.'))}
    </div>
  `;

  document.getElementById('alerts-logs').innerHTML = `
    <div class="rounded-[1.8rem] border border-slate-200 bg-white p-4 shadow-sm">
      <h3 class="mb-4 font-display text-xl text-ink">Integration Responses</h3>
      ${table(['Direction', 'HTTP Code', 'Created'], rowsOrEmpty(logRows, 3, 'No integration logs yet.'))}
    </div>
  `;
}

async function initFacilitiesPage(pageKey, title) {
  renderShell(pageKey, title, 'Create depot, customer, terminal, and ramp facilities. Click the map to capture coordinates and radius for the geofence center.', `
    <section class="grid gap-6 xl:grid-cols-[420px_1fr]">
      <form id="facility-form" class="rounded-[1.8rem] border border-slate-200 bg-white p-5 shadow-sm space-y-4"></form>
      <div class="grid gap-6">
        <div class="rounded-[1.8rem] border border-slate-200 bg-white p-4 shadow-sm">
          <h3 class="mb-4 font-display text-xl text-ink">Facility Map</h3>
          <div id="facility-map" class="h-[360px] rounded-[1.4rem]"></div>
        </div>
        <div id="facilities-table"></div>
      </div>
    </section>
  `);

  const facilitiesRes = await api.facilities();
  document.getElementById('facility-form').innerHTML = `
    <div>
      <p class="text-xs uppercase tracking-[0.24em] text-tide">New Facility</p>
      <h3 class="mt-2 font-display text-2xl text-ink">Save geofence center</h3>
    </div>
    <input id="facility-name" class="field" placeholder="Facility name">
    <select id="facility-type" class="field"><option value="DEPO">DEPO</option><option value="CLOC">CLOC</option><option value="POTE">POTE</option><option value="RAMP">RAMP</option></select>
    <input id="facility-code" class="field" placeholder="Location code">
    <input id="facility-lat" class="field" placeholder="Latitude">
    <input id="facility-lng" class="field" placeholder="Longitude">
    <input id="facility-radius" class="field" type="number" value="500" placeholder="Radius meters">
    <textarea id="facility-address" class="field min-h-[120px]" placeholder='Address JSON, e.g. {"city":"Lagos","country":"Nigeria"}'></textarea>
    <button class="rounded-2xl bg-ember px-4 py-3 text-white">Save facility</button>
  `;

  const map = createPositionMap('facility-map');
  enableFacilityPicker(map, ({ lat, lng, updateRadius }) => {
    document.getElementById('facility-lat').value = lat.toFixed(7);
    document.getElementById('facility-lng').value = lng.toFixed(7);
    document.getElementById('facility-radius').oninput = (event) => updateRadius(Number(event.target.value || 500));
  });

  document.getElementById('facility-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const addressRaw = document.getElementById('facility-address').value.trim();
    let addressJson = null;
    if (!document.getElementById('facility-lat').value || !document.getElementById('facility-lng').value) {
      flash('Pick a point on the map before saving the facility.', 'error');
      return;
    }

    if (addressRaw) {
      try {
        addressJson = JSON.parse(addressRaw);
      } catch (_error) {
        flash('Address JSON is invalid', 'error');
        return;
      }
    }

    await api.createFacility({
      name: document.getElementById('facility-name').value.trim(),
      facility_type_code: document.getElementById('facility-type').value,
      location_code: document.getElementById('facility-code').value.trim(),
      latitude: Number(document.getElementById('facility-lat').value),
      longitude: Number(document.getElementById('facility-lng').value),
      radius_meters: Number(document.getElementById('facility-radius').value || 500),
      address_json: addressJson,
    });
    flash('Facility created', 'success');
    await initFacilitiesPage(pageKey, title);
  });

  const rows = (facilitiesRes.facilities || []).map((facility) => `
    <tr class="border-t border-slate-100">
      <td class="px-4 py-3 text-sm font-medium text-slate-800">${escapeHtml(facility.name)}</td>
      <td class="px-4 py-3 text-sm text-slate-600">${escapeHtml(facility.facility_type_code)}</td>
      <td class="px-4 py-3 text-sm text-slate-600">${escapeHtml(facility.latitude)}, ${escapeHtml(facility.longitude)}</td>
      <td class="px-4 py-3 text-sm text-slate-600">${escapeHtml(facility.radius_meters)}m</td>
      <td class="px-4 py-3 text-right text-sm">
        <button class="rounded-xl border border-red-200 px-3 py-2 text-red-600 transition hover:bg-red-50" data-facility-delete="${facility.id}">Delete</button>
      </td>
    </tr>
  `).join('');
  document.getElementById('facilities-table').innerHTML = table(['Name', 'Type', 'Coordinates', 'Radius', 'Action'], rowsOrEmpty(rows, 5, 'No facilities yet.'));
  document.getElementById('facilities-table').onclick = async (event) => {
    const id = event.target.dataset.facilityDelete;
    if (!id) return;
    if (!window.confirm('Delete this facility?')) return;
    await api.deleteFacility(id);
    flash('Facility deleted', 'success');
    await initFacilitiesPage(pageKey, title);
  };
}

async function initDevicesPage(pageKey, title) {
  renderShell(pageKey, title, 'Monitor active gateway sockets and send COBAN server commands through the gateway proxy.', `
    <section class="grid gap-6 xl:grid-cols-[420px_1fr]">
      <form id="command-form" class="rounded-[1.8rem] border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <div>
          <p class="text-xs uppercase tracking-[0.24em] text-tide">Command Center</p>
          <h3 class="mt-2 font-display text-2xl text-ink">Send device command</h3>
        </div>
        <input id="command-imei" class="field" placeholder="IMEI">
        <input id="command-keyword" class="field" placeholder="Keyword, e.g. 121">
        <textarea id="command-params" class="field min-h-[120px]" placeholder="Params, e.g. 22.353648,113.543678 area01,800m"></textarea>
        <button class="rounded-2xl bg-ember px-4 py-3 text-white">Send command</button>
      </form>
      <div id="devices-table"></div>
    </section>
  `);

  const devicesRes = await api.devices();
  document.getElementById('command-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    await api.sendDeviceCommand({
      imei: document.getElementById('command-imei').value.trim(),
      keyword: document.getElementById('command-keyword').value.trim(),
      params: document.getElementById('command-params').value.trim(),
    });
    flash('Command sent', 'success');
  });

  const rows = (devicesRes.devices || []).map((device) => `
    <tr class="border-t border-slate-100">
      <td class="px-4 py-3 text-sm font-medium text-slate-800">${escapeHtml(device.imei)}</td>
      <td class="px-4 py-3 text-sm text-slate-600">${escapeHtml(formatDate(device.connectedAt))}</td>
      <td class="px-4 py-3 text-sm text-slate-600">${escapeHtml(formatDate(device.lastSeenAt))}</td>
    </tr>
  `).join('');
  document.getElementById('devices-table').innerHTML = table(['IMEI', 'Connected', 'Last Seen'], rowsOrEmpty(rows, 3, 'No active devices connected.'));
}

async function initIntegration() {
  renderShell('settings', 'Integration Control', 'Switch between direct CMA-CGM delivery and the Option 2 stub. Review the current configuration and recent outbound logs.', `
    <section class="grid gap-6 xl:grid-cols-[420px_1fr]">
      <form id="integration-form" class="rounded-[1.8rem] border border-slate-200 bg-white p-5 shadow-sm space-y-4"></form>
      <div id="integration-logs"></div>
    </section>
  `);

  const [configRes, logsRes] = await Promise.all([api.integrationConfig(), api.integrationLogs()]);
  const config = configRes.config;
  document.getElementById('integration-form').innerHTML = `
    <div>
      <p class="text-xs uppercase tracking-[0.24em] text-tide">Outbound Mode</p>
      <h3 class="mt-2 font-display text-2xl text-ink">Configuration</h3>
    </div>
    <select id="active-option" class="field">
      <option value="option1" ${config.active_option === 'option1' ? 'selected' : ''}>Option 1 - Direct API</option>
      <option value="option2" ${config.active_option === 'option2' ? 'selected' : ''}>Option 2 - S3PWEB Stub</option>
    </select>
    <input id="base-url" class="field" placeholder="Option 1 API base URL" value="${escapeHtml(config.option1_api_base_url || '')}">
    <input id="auth-token" class="field" placeholder="Bearer token" value="${escapeHtml(config.option1_auth_token || '')}">
    <div class="space-y-2">
      <input id="interval-seconds" class="field" type="number" min="300" max="600" value="${escapeHtml(config.option1_coordinates_interval_seconds || 600)}">
      <p class="text-sm text-slate-500">Option 1 requires coordinate updates every 5 to 10 minutes (300 to 600 seconds).</p>
    </div>
    <button class="rounded-2xl bg-ember px-4 py-3 text-white">Save configuration</button>
  `;

  document.getElementById('integration-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    await api.updateIntegrationConfig({
      ...config,
      active_option: document.getElementById('active-option').value,
      option1_api_base_url: document.getElementById('base-url').value.trim(),
      option1_auth_token: document.getElementById('auth-token').value.trim(),
      option1_coordinates_interval_seconds: Number(document.getElementById('interval-seconds').value || 600),
      option2_settings_json: {},
    });
    flash('Integration configuration updated', 'success');
    await initIntegration();
  });

  const rows = (logsRes.logs || []).map((log) => `
    <tr class="border-t border-slate-100">
      <td class="px-4 py-3 text-sm font-medium text-slate-800">${escapeHtml(log.direction)}</td>
      <td class="px-4 py-3 text-sm text-slate-600">${escapeHtml(metric(log.response_http_code))}</td>
      <td class="px-4 py-3 text-sm text-slate-500">${escapeHtml(formatDate(log.created_at))}</td>
    </tr>
  `).join('');
  document.getElementById('integration-logs').innerHTML = table(['Direction', 'HTTP Code', 'Created'], rowsOrEmpty(rows, 3, 'No integration logs yet.'));
}

async function initReports() {
  renderShell('reports', 'Reports', 'A quick operational report covering devices, assignments, positions, and recent events.', `
    <section class="grid gap-4 md:grid-cols-2 xl:grid-cols-4" id="report-cards"></section>
    <section class="mt-6 grid gap-6 xl:grid-cols-2">
      <div id="report-positions"></div>
      <div id="report-events"></div>
    </section>
  `);

  const [stats, positionsRes, eventsRes] = await Promise.all([
    api.dashboardStats(),
    api.dashboardPositions(),
    api.dashboardEvents(),
  ]);

  document.getElementById('report-cards').innerHTML = [
    card('Connected Devices', stats.deviceCount || 0),
    card('Planned Orders', stats.plannedOrders || 0),
    card('Active Assignments', stats.activeAssignments || 0, 'bg-orange-50 border-orange-100'),
    card('Recent Positions', (positionsRes.positions || []).length, 'bg-blue-50 border-blue-100'),
  ].join('');

  const positionRows = (positionsRes.positions || []).slice(0, 10).map((position) => `
    <tr class="border-t border-slate-100">
      <td class="px-4 py-3 text-sm font-medium text-slate-800">${escapeHtml(position.imei)}</td>
      <td class="px-4 py-3 text-sm text-slate-600">${escapeHtml(metric(position.speed, 0))}</td>
      <td class="px-4 py-3 text-sm text-slate-500">${escapeHtml(formatDate(position.utc_timestamp))}</td>
    </tr>
  `).join('');

  const eventRows = (eventsRes.events || []).slice(0, 10).map((event) => `
    <tr class="border-t border-slate-100">
      <td class="px-4 py-3 text-sm font-medium text-slate-800">${escapeHtml(metric(event.event_type))}</td>
      <td class="px-4 py-3 text-sm text-slate-600">${escapeHtml(metric(event.facility?.name))}</td>
      <td class="px-4 py-3 text-sm text-slate-500">${escapeHtml(formatDate(event.timestamp))}</td>
    </tr>
  `).join('');

  document.getElementById('report-positions').innerHTML = `
    <div class="rounded-[1.8rem] border border-slate-200 bg-white p-4 shadow-sm">
      <h3 class="mb-4 font-display text-xl text-ink">Latest Positions</h3>
      ${table(['IMEI', 'Speed', 'Timestamp'], rowsOrEmpty(positionRows, 3, 'No recent positions.'))}
    </div>
  `;

  document.getElementById('report-events').innerHTML = `
    <div class="rounded-[1.8rem] border border-slate-200 bg-white p-4 shadow-sm">
      <h3 class="mb-4 font-display text-xl text-ink">Latest Events</h3>
      ${table(['Event', 'Facility', 'Timestamp'], rowsOrEmpty(eventRows, 3, 'No recent events.'))}
    </div>
  `;
}

async function initSettings() {
  renderShell('settings', 'Settings', 'Platform configuration, auth session, and integration mode for localhost testing.', `
    <section class="grid gap-6 xl:grid-cols-[1fr_420px]">
      <div id="settings-overview"></div>
      <div id="settings-actions"></div>
    </section>
  `);

  const [sessionRes, configRes] = await Promise.all([api.me(), api.integrationConfig()]);
  document.getElementById('settings-overview').innerHTML = `
    <div class="rounded-[1.8rem] border border-slate-200 bg-white p-5 shadow-sm">
      <h3 class="font-display text-2xl text-ink">Platform Summary</h3>
      <div class="mt-5 grid gap-4 sm:grid-cols-2">
        ${card('Signed In User', sessionRes.user?.username || 'Unknown')}
        ${card('Account Email', sessionRes.user?.email || '--')}
        ${card('Role', sessionRes.user?.role || 'operator', 'bg-blue-50 border-blue-100')}
        ${card('Integration Mode', configRes.config?.active_option === 'option1' ? 'Option 1' : 'Option 2', 'bg-orange-50 border-orange-100')}
        ${card('Coordinate Interval', `${configRes.config?.option1_coordinates_interval_seconds || 600}s`)}
      </div>
    </div>
  `;

  document.getElementById('settings-actions').innerHTML = `
    <div class="rounded-[1.8rem] border border-slate-200 bg-white p-5 shadow-sm">
      <h3 class="font-display text-2xl text-ink">Quick Links</h3>
      <div class="mt-5 grid gap-3">
        <a href="/integration" class="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 transition hover:bg-slate-50">Open Integration Control</a>
        <a href="/users" class="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 transition hover:bg-slate-50">Manage Users</a>
        <a href="/api/docs" class="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 transition hover:bg-slate-50">Open API Docs</a>
      </div>
    </div>
  `;
}

async function initUsers() {
  renderShell('users', 'User Management', 'Create admin or operator users with email-backed login and OTP password recovery.', `
    <section class="grid gap-6 xl:grid-cols-[420px_1fr]">
      <div id="user-form-host"></div>
      <div id="users-table"></div>
    </section>
  `);

  const [usersRes, sessionRes] = await Promise.all([api.users(), api.me()]);
  const isAdmin = sessionRes.user?.role === 'admin';
  const formHost = document.getElementById('user-form-host');

  formHost.innerHTML = isAdmin ? `
    <form id="user-form" class="rounded-[1.8rem] border border-slate-200 bg-white p-5 shadow-sm space-y-4">
      <div>
        <p class="text-xs uppercase tracking-[0.24em] text-tide">Create User</p>
        <h3 class="mt-2 font-display text-2xl text-ink">Access account</h3>
      </div>
      <input id="new-username" class="field" placeholder="Username">
      <input id="new-email" type="email" class="field" placeholder="Email address">
      <input id="new-password" type="password" class="field" placeholder="Password">
      <select id="new-role" class="field"><option value="admin">admin</option><option value="operator">operator</option></select>
      <button class="rounded-2xl bg-ember px-4 py-3 text-white">Create user</button>
    </form>
  ` : `
    <div class="rounded-[1.8rem] border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800 shadow-sm">
      Only admin users can create new accounts.
    </div>
  `;

  if (isAdmin) {
    document.getElementById('user-form').addEventListener('submit', async (event) => {
      event.preventDefault();
      await api.createUser({
        username: document.getElementById('new-username').value.trim(),
        email: document.getElementById('new-email').value.trim(),
        password: document.getElementById('new-password').value,
        role: document.getElementById('new-role').value,
      });
      flash('User created', 'success');
      await initUsers();
    });
  }

  const rows = (usersRes.users || []).map((user) => `
    <tr class="border-t border-slate-100">
      <td class="px-4 py-3 text-sm font-medium text-slate-800">${escapeHtml(user.username)}</td>
      <td class="px-4 py-3 text-sm text-slate-600">${escapeHtml(user.email)}</td>
      <td class="px-4 py-3 text-sm text-slate-600">${escapeHtml(user.role)}</td>
      <td class="px-4 py-3 text-sm text-slate-500">${escapeHtml(formatDate(user.created_at))}</td>
    </tr>
  `).join('');
  document.getElementById('users-table').innerHTML = table(['Username', 'Email', 'Role', 'Created'], rowsOrEmpty(rows, 4, 'No users yet.'));
}
