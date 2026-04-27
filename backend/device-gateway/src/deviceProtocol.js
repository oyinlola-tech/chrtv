const { convertNmeaToDecimal } = require('./utils/coordinateConverter');
const { parseUtcTimestamp } = require('./utils/dateUtils');

const ALARM_KEYWORDS = new Set([
  'help me',
  'low battery',
  'move',
  'speed',
  'stockade',
  'ac alarm',
  'door alarm',
  'sensor alarm',
  'acc alarm',
  'accident alarm',
  'bonnet alarm',
  'footbrake alarm',
  'oil',
  'oil1',
  'oil2',
  'dtc',
  'service',
  'rfid',
  'tpms',
]);

function cleanToken(token = '') {
  return String(token).replace(/;$/, '').trim();
}

function splitMessage(message) {
  return String(message)
    .trim()
    .replace(/;$/, '')
    .split(',')
    .map(cleanToken);
}

function parsePosition(parts, rawMessage) {
  const keyword = parts[1];
  const dateToken = parts[2] || '';
  const phone = parts[3] || '';
  const gpsSignal = parts[4] || '';
  const fixTime = parts[5] || '';
  const gpsValidity = parts[6] || '';
  const latRaw = parts[7] || '';
  const latHemisphere = parts[8] || '';
  const lonRaw = parts[9] || '';
  const lonHemisphere = parts[10] || '';
  const speed = parts[11] || '';
  const headingOrAddress = parts[12] || '';
  const altitude = parts[13] || '';
  const accState = parts[14] || '';
  const doorState = parts[15] || '';
  const fuel1 = parts[16] || '';
  const fuel2OrMileage = parts[17] || '';
  const temperature = parts[18] || '';

  return {
    imei: parts[0].replace(/^imei:/i, ''),
    type: 'position',
    data: {
      keyword,
      rawMessage,
      dateToken,
      phone,
      gpsSignal,
      gpsValid: gpsSignal === 'F' || gpsValidity === 'A',
      utcFixTime: fixTime,
      utcTimestamp: parseUtcTimestamp(dateToken, fixTime),
      latitude: convertNmeaToDecimal(latRaw, latHemisphere),
      longitude: convertNmeaToDecimal(lonRaw, lonHemisphere),
      speed: speed ? Number(speed) : null,
      heading: headingOrAddress && headingOrAddress !== '1' ? Number(headingOrAddress) : null,
      addressRequest: headingOrAddress === '1',
      altitude: altitude ? Number(altitude) : null,
      accState: accState === '1',
      doorState: doorState === '1',
      fuel1Percent: parsePercent(fuel1),
      fuel2Percent: parsePercent(fuel2OrMileage),
      mileageKm: parseMileage(fuel2OrMileage),
      temperature: temperature ? Number(temperature) : null,
    },
  };
}

function parsePercent(value) {
  if (!value) {
    return null;
  }
  const normalized = String(value).replace('%', '');
  const parsed = Number(normalized);
  return Number.isNaN(parsed) ? null : parsed;
}

function parseMileage(value) {
  if (!value || String(value).includes('%')) {
    return null;
  }
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function parseGeofence(parts, rawMessage) {
  const keyword = parts[1];
  const match = keyword.match(/^(area\d{2})\s+(in|out)$/i);
  if (!match) {
    return null;
  }

  const position = parsePosition([parts[0], '001', parts[2], parts[3], parts[4], parts[5], parts[6], parts[7], parts[8], parts[9], parts[10], parts[11], parts[12], parts[13], parts[14], parts[15], parts[16], parts[17], parts[18]], rawMessage);

  return {
    imei: parts[0].replace(/^imei:/i, ''),
    type: 'geofence',
    data: {
      rawMessage,
      areaName: match[1].toLowerCase(),
      direction: match[2].toLowerCase(),
      utcTimestamp: position.data.utcTimestamp,
      latitude: position.data.latitude,
      longitude: position.data.longitude,
      speed: position.data.speed,
    },
  };
}

function parseAlarm(parts, rawMessage) {
  const keyword = cleanToken(parts[1]).toLowerCase();
  const alarmName = keyword.startsWith('t:') ? 't:' : keyword;

  if (!ALARM_KEYWORDS.has(alarmName) && !keyword.startsWith('dtc')) {
    return null;
  }

  const position = parsePosition([parts[0], '001', parts[2], parts[3], parts[4], parts[5], parts[6], parts[7], parts[8], parts[9], parts[10], parts[11], parts[12], parts[13], parts[14], parts[15], parts[16], parts[17], parts[18]], rawMessage);

  return {
    imei: parts[0].replace(/^imei:/i, ''),
    type: 'alarm',
    data: {
      rawMessage,
      keyword,
      utcTimestamp: position.data.utcTimestamp,
      latitude: position.data.latitude,
      longitude: position.data.longitude,
      speed: position.data.speed,
      temperature: keyword.startsWith('t:') ? Number(keyword.replace(/^t:/, '')) : position.data.temperature,
      fuel1Percent: position.data.fuel1Percent,
      fuel2Percent: position.data.fuel2Percent,
      mileageKm: position.data.mileageKm,
      diagnosticCode: keyword === 'dtc' ? cleanToken(parts[17]) : null,
      maintenanceDaysOrExpiration: keyword === 'service' ? cleanToken(parts[17]) : null,
      maintenanceMileage: keyword === 'service' ? cleanToken(parts[18]) : null,
    },
  };
}

function parse(rawMessage) {
  const message = String(rawMessage || '').trim();
  if (!message || !message.startsWith('imei:')) {
    return null;
  }

  const parts = splitMessage(message);
  const keyword = cleanToken(parts[1]).replace(/\s+/g, ' ').toLowerCase();

  if (keyword === '001') {
    return parsePosition(parts, rawMessage);
  }

  if (/^area\d{2}\s+(in|out)$/i.test(keyword)) {
    return parseGeofence([parts[0], keyword, ...parts.slice(2)], rawMessage);
  }

  if (keyword.startsWith('t:') || ALARM_KEYWORDS.has(keyword) || keyword === 'dtc') {
    return parseAlarm([parts[0], keyword, ...parts.slice(2)], rawMessage);
  }

  return {
    imei: parts[0].replace(/^imei:/i, ''),
    type: 'unknown',
    data: {
      rawMessage,
      keyword,
    },
  };
}

module.exports = {
  parse,
};

