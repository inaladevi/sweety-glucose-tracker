import { useCallback, useEffect, useState } from 'react';
import { api } from './api';

export const SLOTS = {
  morning_fasting: 'Morning (fasting)',
  after_breakfast: 'After breakfast',
  after_lunch: 'After lunch',
  after_dinner: 'After dinner',
};

const todayIST = () =>
  new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

export default function Readings() {
  const [date, setDate] = useState(todayIST());
  const [readings, setReadings] = useState([]);
  const [slot, setSlot] = useState('morning_fasting');
  const [value, setValue] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api(`/readings?date=${date}`);
      setReadings(Array.isArray(data) ? data : data.readings);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    load();
  }, [load]);

  function resetForm() {
    setEditingId(null);
    setSlot('morning_fasting');
    setValue('');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSaving(true);
    try {
        const body = { date, slot, value: value === '' ? null : Number(value) };
      if (editingId) {
        await api(`/readings/${editingId}`, { method: 'PUT', body });
      } else {
        await api('/readings', { method: 'POST', body });
      }
      resetForm();
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function startEdit(r) {
    setEditingId(r.id);
    setSlot(r.slot);
    setValue(String(r.value));
    setError('');
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this reading?')) return;
    setError('');
    try {
      await api(`/readings/${id}`, { method: 'DELETE' });
      if (editingId === id) resetForm();
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <section>
      <label className="inline">
        Date
        <input
          type="date"
          value={date}
          max={todayIST()}
          onChange={(e) => { setDate(e.target.value); resetForm(); setError(''); }}
        />
      </label>

      <form className="panel" onSubmit={handleSubmit}>
        <h2>{editingId ? 'Edit reading' : 'Add a reading'}</h2>
        <label>
          When
          <select value={slot} onChange={(e) => setSlot(e.target.value)}>
            {Object.entries(SLOTS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </label>
        <label>
          Glucose (mg/dL)
          <input
            type="number"
            inputMode="numeric"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </label>
        {error && <p className="error" role="alert">{error}</p>}
        <div className="row">
          <button type="submit" disabled={saving}>
            {saving ? 'Saving...' : editingId ? 'Update' : 'Add reading'}
          </button>
          {editingId && (
            <button type="button" className="secondary" onClick={resetForm}>Cancel</button>
          )}
        </div>
      </form>

      <div className="panel">
        <h2>Readings for {date}</h2>
        {loading ? (
          <p className="muted">Loading...</p>
        ) : readings.length === 0 ? (
          <p className="muted">No readings for this date yet.</p>
        ) : (
          <ul className="list">
            {readings.map((r) => (
              <li key={r.id}>
                <span>{SLOTS[r.slot]}</span>
                <strong>{r.value} mg/dL</strong>
                <span className="row">
                  <button className="link" onClick={() => startEdit(r)}>Edit</button>
                  <button className="link danger" onClick={() => handleDelete(r.id)}>Delete</button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}