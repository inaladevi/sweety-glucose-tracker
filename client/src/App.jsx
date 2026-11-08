import { useEffect, useState } from 'react';
import { api, getToken, setToken } from './api';
import AuthForm from './AuthForm';
import Readings from './Readings';
import Reports from './Reports';

export default function App() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const [view, setView] = useState('readings');

  useEffect(() => {
    if (!getToken()) {
      setChecking(false);
      return;
    }
    api('/auth/me')
      .then((data) => setUser(data.user))
      .catch(() => setToken(null))
      .finally(() => setChecking(false));
  }, []);

  function logout() {
    setToken(null);
    setUser(null);
  }

  if (checking) return <p className="center">Loading...</p>;
  if (!user) return <AuthForm onAuth={setUser} />;

  return (
    <div className="page">
      <header className="topbar">
        <strong>Sweety</strong>
        <span>
          {user.name}{" "}
          <button className="link" onClick={logout}>
            Log out
          </button>
        </span>
      </header>
      <div className="tabs main">
        <button
          className={view === "readings" ? "tab active" : "tab"}
          onClick={() => setView("readings")}
        >
          Readings
        </button>
        <button
          className={view === "reports" ? "tab active" : "tab"}
          onClick={() => setView("reports")}
        >
          Reports
        </button>
      </div>
      {view === "readings" ? <Readings /> : <Reports />}
    </div>
  );
}