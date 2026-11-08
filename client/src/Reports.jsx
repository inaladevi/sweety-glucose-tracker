import { useEffect, useState } from 'react';
import { api } from './api';
import { SLOTS } from './Readings';

const TABS = [
  { type: 'daily', label: 'Daily' },
  { type: 'month-to-date', label: 'Month to date' },
  { type: 'monthly', label: 'Last month' },
];

const todayIST = () =>
  new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

export default function Reports() {
  const [type, setType] = useState('daily');
  const [date, setDate] = useState(todayIST());
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    api(`/reports/${type}?date=${date}`)
      .then((data) => { if (!cancelled) setReport(data.report); })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [type, date]);

  const rangeText = report
    ? report.from === report.to ? report.from : `${report.from} to ${report.to}`
    : '';

  return (
    <section>
      <div className="tabs">
        {TABS.map((t) => (
          <button
            key={t.type}
            className={t.type === type ? 'tab active' : 'tab'}
            onClick={() => setType(t.type)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <label className="inline">
        {type === 'monthly' ? 'Any date in the month after' : 'Date'}
        <input
          type="date"
          value={date}
          max={todayIST()}
          onChange={(e) => setDate(e.target.value)}
        />
      </label>

      <div className="panel">
        {error && <p className="error" role="alert">{error}</p>}
        {loading && <p className="muted">Loading...</p>}

        {!loading && report && (
          <>
            <h2>{rangeText}</h2>
            {report.count === 0 ? (
              <p className="muted">No readings in this period.</p>
            ) : (
              <div className="stats">
                <div><span>Readings</span><strong>{report.count}</strong></div>
                <div><span>Highest</span><strong>{report.highest}</strong></div>
                <div><span>Lowest</span><strong>{report.lowest}</strong></div>
                <div><span>Average</span><strong>{report.average}</strong></div>
              </div>
            )}

            {report.type === 'daily' && report.readings.length > 0 && (
              <ul className="list simple">
                {report.readings.map((r) => (
                  <li key={r.id}>
                    <span>{SLOTS[r.slot]}</span>
                    <strong>{r.value} mg/dL</strong>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </section>
  );
}