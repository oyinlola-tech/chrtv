const pendingByImei = new Map();

function enqueue(imei, pendingItem) {
  const queue = pendingByImei.get(imei) || [];
  queue.push({ ...pendingItem });
  pendingByImei.set(imei, queue);
}

function acknowledge(imei) {
  const queue = pendingByImei.get(imei) || [];
  const next = queue.shift() || null;

  if (queue.length > 0) {
    pendingByImei.set(imei, queue);
  } else {
    pendingByImei.delete(imei);
  }

  return next;
}

function remove(imei, matcher) {
  const queue = (pendingByImei.get(imei) || []).filter((item) => !matcher(item));
  if (queue.length > 0) {
    pendingByImei.set(imei, queue);
  } else {
    pendingByImei.delete(imei);
  }
}

function replaceAll(rows = []) {
  pendingByImei.clear();
  rows.forEach((row) => {
    enqueue(String(row.imei), { ...row });
  });
}

function clear() {
  pendingByImei.clear();
}

module.exports = {
  enqueue,
  acknowledge,
  remove,
  replaceAll,
  clear,
};
