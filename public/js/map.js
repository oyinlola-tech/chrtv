function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function createPositionMap(elementId, center = [6.5244, 3.3792], zoom = 5) {
  const map = L.map(elementId).setView(center, zoom);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);
  return map;
}

export function renderPositionMarkers(map, positions) {
  const bounds = [];
  positions.forEach((position) => {
    if (position.latitude == null || position.longitude == null) return;
    const marker = L.circleMarker([position.latitude, position.longitude], {
      radius: 7,
      color: '#0f4c81',
      fillColor: '#f97316',
      fillOpacity: 0.9,
      weight: 2
    }).addTo(map);
    marker.bindPopup(`<strong>${escapeHtml(position.imei)}</strong><br>${escapeHtml(new Date(position.utc_timestamp).toLocaleString())}`);
    bounds.push([position.latitude, position.longitude]);
  });
  if (bounds.length) {
    map.fitBounds(bounds, { padding: [32, 32] });
  }
}

export function enableFacilityPicker(map, onSelect) {
  let marker;
  let circle;

  map.on('click', (event) => {
    const { lat, lng } = event.latlng;
    if (marker) marker.remove();
    if (circle) circle.remove();
    marker = L.marker([lat, lng]).addTo(map);
    circle = L.circle([lat, lng], { radius: 500, color: '#f97316' }).addTo(map);
    onSelect({ lat, lng, updateRadius(radius) { circle.setRadius(radius); } });
  });
}
