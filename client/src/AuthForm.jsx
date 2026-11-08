import { useState } from 'react';
import { api, setToken } from './api';

export default function AuthForm({ onAuth }) {
  const [mode, setMode] = useState('login'); // 'login' or 'signup'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isSignup = mode === 'signup';

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const path = isSignup ? '/auth/signup' : '/auth/login';
      const body = isSignup ? { name, email, password } : { email, password };
      const data = await api(path, { method: 'POST', body });
      setToken(data.token);
      onAuth(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="card" onSubmit={handleSubmit}>
      <h1>Sweety</h1>
      <p className="muted">{isSignup ? 'Create your account' : 'Log in to track your glucose'}</p>

      {isSignup && (
        <label>
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
        </label>
      )}
      <label>
        Email
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
      </label>
      <label>
        Password
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={isSignup ? 'new-password' : 'current-password'}
        />
      </label>

      {error && <p className="error" role="alert">{error}</p>}

      <button type="submit" disabled={loading}>
        {loading ? 'Please wait...' : isSignup ? 'Sign up' : 'Log in'}
      </button>

      <p className="muted">
        {isSignup ? 'Already have an account?' : 'New here?'}{' '}
        <button type="button" className="link" onClick={() => { setMode(isSignup ? 'login' : 'signup'); setError(''); }}>
          {isSignup ? 'Log in' : 'Create an account'}
        </button>
      </p>
    </form>
  );
}