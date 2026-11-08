const { validateReading } = require('../src/validation/reading');
const { getRange } = require('../src/utils/dateRange');

describe('validateReading', () => {
  const ok = { date: '2026-11-01', slot: 'after_lunch', value: 120 };

  test('accepts a valid reading', () => {
    expect(validateReading(ok)).toEqual({ value: 120 });
  });

  test('accepts the boundary values 40 and 600', () => {
    expect(validateReading({ ...ok, value: 40 }).error).toBeUndefined();
    expect(validateReading({ ...ok, value: 600 }).error).toBeUndefined();
  });

  test('requires a value', () => {
    expect(validateReading({ ...ok, value: '' }).error).toBe('Please enter a glucose value.');
  });

  test.each([39, 601, 120.5, 'abc'])('rejects the value %p', (value) => {
    expect(validateReading({ ...ok, value }).error).toBe('Value must be between 40 and 600 mg/dl.');
  });

  test('rejects a future date', () => {
    expect(validateReading({ ...ok, date: '2999-01-01' }).error).toBe('Date cannot be in the future.');
  });

  test('rejects an unknown slot', () => {
    expect(validateReading({ ...ok, slot: 'midnight' }).error).toBe('Please choose a time slot.');
  });
});

describe('getRange', () => {
  test('daily is the selected date only', () => {
    expect(getRange('daily', '2026-10-15')).toEqual({ from: '2026-10-15', to: '2026-10-15' });
  });

  test('month-to-date runs from the 1st to the selected date', () => {
    expect(getRange('month-to-date', '2026-10-15')).toEqual({ from: '2026-10-01', to: '2026-10-15' });
  });

  test('monthly is the whole previous month', () => {
    expect(getRange('monthly', '2026-10-15')).toEqual({ from: '2026-09-01', to: '2026-09-30' });
  });

  test('monthly in January uses December of the previous year', () => {
    expect(getRange('monthly', '2026-01-15')).toEqual({ from: '2025-12-01', to: '2025-12-31' });
  });

  test('monthly in March uses the end of February', () => {
    expect(getRange('monthly', '2026-03-10')).toEqual({ from: '2026-02-01', to: '2026-02-28' });
  });
});