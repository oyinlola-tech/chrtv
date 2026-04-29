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

const PREFIX_ALARM_KEYWORDS = new Set([
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

function normalizePositionParts(parts) {
  const keywordToken = cleanToken(parts[1]).replace(/\s+/g, ' ');
  const keywordParts = keywordToken.split(' ').filter(Boolean);
  const keyword = keywordParts[0] || '';
  const extendedPrefix = keywordParts.slice(1);

  return {
    keyword,
    extendedPrefix,
    fields: parts.slice(2),
  };
}

function normalizeKeyword(keyword = '') {
  return cleanToken(keyword).replace(/\s+/g, ' ').trim().toLowerCase();
}

function extractAlarmInfo(keyword = '') {
  const normalized = normalizeKeyword(keyword);
  if (!normalized) {
    return null;
  }

  if (/^area\d{2}\s+(in|out)$/i.test(normalized)) {
    return null;
  }

  if (normalized.startsWith('t:')) {
    return {
      alarmName: 't:',
      keyword: normalized,
      keywordSuffix: normalized.slice(2).trim(),
    };
  }

  if (/^acc\s+(on|off)$/i.test(normalized)) {
    return {
      alarmName: normalized,
      keyword: normalized,
      keywordSuffix: normalized.split(/\s+/).slice(1).join(' '),
    };
  }

  if (ALARM_KEYWORDS.has(normalized)) {
    return {
      alarmName: normalized,
      keyword: normalized,
      keywordSuffix: '',
    };
  }

  const firstToken = normalized.split(' ')[0];
  if (PREFIX_ALARM_KEYWORDS.has(firstToken)) {
    return {
      alarmName: firstToken,
      keyword: normalized,
      keywordSuffix: normalized.slice(firstToken.length).trim(),
    };
  }

  return null;
}

function parsePosition(parts, rawMessage) {
  const normalized = normalizePositionParts(parts);
  const extendedFuel = extendedPrefixPercent(normalized.extendedPrefix[0]);
  const extendedTemperature = extendedPrefixTemperature(normalized.extendedPrefix[1]);
  const dateToken = normalized.fields[0] || '';
  const phone = normalized.fields[1] || '';
  const gpsSignal = normalized.fields[2] || '';
  const fixTime = normalized.fields[3] || '';
  const gpsValidity = normalized.fields[4] || '';
  const latRaw = normalized.fields[5] || '';
  const latHemisphere = normalized.fields[6] || '';
  const lonRaw = normalized.fields[7] || '';
  const lonHemisphere = normalized.fields[8] || '';
  const speed = normalized.fields[9] || '';
  const headingOrAddress = normalized.fields[10] || '';
  const altitude = normalized.fields[11] || '';
  const accState = normalized.fields[12] || '';
  const doorState = normalized.fields[13] || '';
  const fuel1 = normalized.fields[14] || '';
  const fuel2OrMileage = normalized.fields[15] || '';
  const temperature = normalized.fields[16] || '';
  const gpsValid = gpsSignal === 'F' && gpsValidity === 'A';
  const latitude = gpsSignal === 'L' ? null : convertNmeaToDecimal(latRaw, latHemisphere);
  const longitude = gpsSignal === 'L' ? null : convertNmeaToDecimal(lonRaw, lonHemisphere);
  let utcTimestamp = null;

  try {
    utcTimestamp = parseUtcTimestamp(dateToken, fixTime);
  } catch (_error) {
    console.warn(`Invalid COBAN timestamp in message: ${rawMessage}`);
  }

  return {
    imei: parts[0].replace(/^imei:/i, ''),
    type: 'position',
    data: {
      keyword: normalized.keyword,
      rawMessage,
      dateToken,
      phone,
      gpsSignal,
      gpsValid,
      utcFixTime: fixTime,
      utcTimestamp,
      latitude,
      longitude,
      speed: speed ? Number(speed) : null,
      heading: headingOrAddress && headingOrAddress !== '1' ? Number(headingOrAddress) : null,
      addressRequest: headingOrAddress === '1',
      altitude: altitude ? Number(altitude) : null,
      accState: accState === '1',
      doorState: doorState === '1',
      fuel1Percent: extendedFuel ?? parsePercent(fuel1),
      fuel2Percent: parsePercent(fuel2OrMileage),
      mileageKm: parseMileage(fuel2OrMileage),
      temperature: extendedTemperature ?? (temperature ? Number(temperature) : null),
      lac: gpsSignal === 'L' ? latRaw || null : null,
      cellId: gpsSignal === 'L' ? lonRaw || null : null,
      extendedPrefix: normalized.extendedPrefix,
    },
  };
}

function extendedPrefixPercent(value) {
  if (!value || !String(value).includes('%')) {
    return null;
  }

  return parsePercent(value);
}

function extendedPrefixTemperature(value) {
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
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

  const position = parsePosition([parts[0], '001', ...parts.slice(2)], rawMessage);
  if (!position.data.gpsValid || position.data.latitude == null || position.data.longitude == null) {
    return null;
  }

  return {
    imei: parts[0].replace(/^imei:/i, ''),
    type: 'geofence',
    data: {
      rawMessage,
      areaName: match[1].toLowerCase(),
      direction: match[2].toLowerCase(),
      gpsValid: true,
      utcTimestamp: position.data.utcTimestamp,
      latitude: position.data.latitude,
      longitude: position.data.longitude,
      speed: position.data.speed,
    },
  };
}

function parseAlarm(parts, rawMessage) {
  const alarm = extractAlarmInfo(parts[1]);
  const keyword = alarm?.keyword || normalizeKeyword(parts[1]);
  const alarmName = alarm?.alarmName || keyword;

  if (!alarm) {
    return null;
  }

  const position = parsePosition([parts[0], '001', ...parts.slice(2)], rawMessage);
  const originalKeyword = cleanToken(parts[1]).replace(/\s+/g, ' ').trim();
  const embeddedDiagnosticCode = alarmName === 'dtc'
    ? originalKeyword.split(/\s+/).slice(1).join(' ').trim() || null
    : null;
  const embeddedFuelPercent = alarmName === 'oil' ? parsePercent(alarm.keywordSuffix) : null;

  return {
    imei: parts[0].replace(/^imei:/i, ''),
    type: 'alarm',
    data: {
      rawMessage,
      keyword,
      dateToken: position.data.dateToken,
      gpsSignal: position.data.gpsSignal,
      gpsValid: position.data.gpsValid,
      utcFixTime: position.data.utcFixTime,
      utcTimestamp: position.data.utcTimestamp,
      latitude: position.data.latitude,
      longitude: position.data.longitude,
      speed: position.data.speed,
      temperature: keyword.startsWith('t:') ? Number(keyword.replace(/^t:/, '')) : position.data.temperature,
      fuel1Percent: embeddedFuelPercent ?? position.data.fuel1Percent,
      fuel2Percent: position.data.fuel2Percent,
      mileageKm: position.data.mileageKm,
      diagnosticCode: alarmName === 'dtc' ? (embeddedDiagnosticCode || cleanToken(parts[17])) : null,
      maintenanceDaysOrExpiration: alarmName === 'service' ? cleanToken(parts[17]) : null,
      maintenanceMileage: alarmName === 'service' ? cleanToken(parts[18]) : null,
    },
  };
}

function parseAck(parts, rawMessage) {
  return {
    imei: parts[0].replace(/^imei:/i, ''),
    type: 'ack',
    data: {
      rawMessage,
      keyword: cleanToken(parts[1]),
    },
  };
}

function parse(rawMessage) {
  const message = String(rawMessage || '').trim();
  if (!message || !message.startsWith('imei:')) {
    return null;
  }

  const parts = splitMessage(message);
  const keyword = normalizeKeyword(parts[1]);

  if (keyword === '001' || keyword.startsWith('001 ')) {
    return parsePosition(parts, rawMessage);
  }

  if (keyword === '121') {
    return parseAck(parts, rawMessage);
  }

  if (/^area\d{2}\s+(in|out)$/i.test(keyword)) {
    return parseGeofence([parts[0], keyword, ...parts.slice(2)], rawMessage);
  }

  if (extractAlarmInfo(keyword)) {
    return parseAlarm(parts, rawMessage);
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
