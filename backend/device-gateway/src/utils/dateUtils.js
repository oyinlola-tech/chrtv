function parseUtcTimestamp(dateToken, timeToken) {
  if (!dateToken || !timeToken) {
    throw new Error('Missing date or time token');
  }

  const normalizedDate = String(dateToken).replace(/\D/g, '');
  const normalizedTime = String(timeToken).replace(/[^\d.]/g, '');
  if (normalizedDate.length < 6 || normalizedTime.length < 6) {
    throw new Error('Incomplete date or time token');
  }
  const yy = normalizedDate.slice(0, 2);
  const mm = normalizedDate.slice(2, 4);
  const dd = normalizedDate.slice(4, 6);
  const hh = normalizedTime.slice(0, 2).padEnd(2, '0');
  const mi = normalizedTime.slice(2, 4).padEnd(2, '0');
  const ss = normalizedTime.slice(4, 6).padEnd(2, '0');
  const ms = (normalizedTime.split('.')[1] || '0').padEnd(3, '0').slice(0, 3);
  const year = Number(yy) >= 70 ? `19${yy}` : `20${yy}`;
  const parsed = new Date(`${year}-${mm}-${dd}T${hh}:${mi}:${ss}.${ms}Z`);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error('Invalid UTC timestamp');
  }
  return parsed.toISOString();
}

module.exports = {
  parseUtcTimestamp,
};
