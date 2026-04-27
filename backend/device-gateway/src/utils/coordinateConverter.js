function convertNmeaToDecimal(raw, hemisphere) {
  if (!raw) {
    return null;
  }

  const value = Number(raw);
  if (Number.isNaN(value)) {
    return null;
  }

  const degrees = Math.floor(value / 100);
  const minutes = value - degrees * 100;
  let decimal = degrees + minutes / 60;

  if (hemisphere === 'S' || hemisphere === 'W') {
    decimal *= -1;
  }

  return Number(decimal.toFixed(7));
}

module.exports = {
  convertNmeaToDecimal,
};

