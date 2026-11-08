function toDateString(ms) {
  return new Date(ms).toISOString().slice(0, 10);
}

function getRange(type, date) {
  const [year, month] = date.split('-').map(Number);

  if (type === 'daily') {
    return { from: date, to: date };
  }
  if (type === 'month-to-date') {
    return { from: toDateString(Date.UTC(year, month - 1, 1)), to: date };
  }
  if (type === 'monthly') {
    return {
      from: toDateString(Date.UTC(year, month - 2, 1)),
      to: toDateString(Date.UTC(year, month - 1, 0)),
    };
  }
  return null;
}

module.exports = { getRange };