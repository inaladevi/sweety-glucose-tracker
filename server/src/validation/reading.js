const { SLOTS, MIN_VALUE, MAX_VALUE } = require('../constants');

function todayInIndia() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}

function isRealDate(text) {
  if (typeof text !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(text)) return false;
  const d = new Date(`${text}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === text;
}

function validateReading({ date, slot, value }) {
  if (!isRealDate(date)) return { error: 'Please choose a valid date.' };
  if (date > todayInIndia()) return { error: 'Date cannot be in the future.' };
  if (!SLOTS[slot]) return { error: 'Please choose a time slot.' };

  if (value === undefined || value === null || value === '') {
    return { error: 'Please enter a glucose value.' };
  }
  const number = Number(value);
  if (!Number.isInteger(number) || number < MIN_VALUE || number > MAX_VALUE) {
    return { error: `Value must be between ${MIN_VALUE} and ${MAX_VALUE} mg/dl.` };
  }
  return { value: number };
}

module.exports = { validateReading, isRealDate, todayInIndia };