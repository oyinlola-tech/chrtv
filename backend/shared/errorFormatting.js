function formatError(error) {
  if (!error) {
    return 'Unknown error';
  }

  if (error.errors && Array.isArray(error.errors) && error.errors.length > 0) {
    return error.errors
      .map((item) => item?.message || item?.code || String(item))
      .filter(Boolean)
      .join('; ');
  }

  if (error.message) {
    return error.message;
  }

  if (error.code) {
    return String(error.code);
  }

  return String(error);
}

module.exports = {
  formatError,
};
