import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  function validate() {
    if (!username) return "Please enter your username";
    if (!password) return "Please enter your password";
    return null;
  }

  function handleSubmit(e) {
    e.preventDefault();
    setError("");
    const v = validate();
    if (v) { setError(v); return; }
    setLoading(true);

    const params = new URLSearchParams(location.search);
    const next = params.get('next') || params.get('redirect') || '/admin';

    setTimeout(() => {
      // Role passwords
      let rolePasswords;
      try {
        rolePasswords = JSON.parse(localStorage.getItem('bakery_role_passwords') || 'null') || { admin: '', cashir: '', manager: '' };
      } catch (err) {
        rolePasswords = { admin: '', cashir: '', manager: '' };
      }
      const cashierPassword = rolePasswords.cashir || 'cashir123';
      const managerPassword = rolePasswords.manager || 'manager123';
      const managerPasswordAlt = 'manger123';

      // Cashier login: read configured username from localStorage
      let configuredUsers;
      try { configuredUsers = JSON.parse(localStorage.getItem('bakery_usernames') || 'null') || { cashier:'cashier', manager:'manager' }; } catch { configuredUsers = { cashier:'cashier', manager:'manager' }; }
      const cashierUser = (configuredUsers.cashier || 'cashier').trim();
      const managerUser = (configuredUsers.manager || 'manager').trim();
      const isCashierUsername = username === cashierUser;
      const isManagerUsername = username === managerUser;

      // Manager login
      if (isManagerUsername && (password === managerPassword || password === managerPasswordAlt)) {
        const user = { username, name: 'Inventory Manager' };
        const authObj = { user, token: 'manager-token' };
        try {
          sessionStorage.setItem('bakery_app_auth', JSON.stringify(authObj));
          sessionStorage.setItem('bakery_user_role', 'manager');
          localStorage.setItem('bakery_app_auth_manager', JSON.stringify(authObj));
          localStorage.setItem('bakery_presence_manager', JSON.stringify({ role:'manager', user: username, timestamp: Date.now() }));
          localStorage.removeItem('bakery_force_logout_manager');
        } catch (err) { /* ignore */ }
        setLoading(false);
        const dest = (next && next.includes('inventory')) ? next : '/inventory-manager';
        navigate(dest, { replace: true });
        return;
      }

      // Cashier login
      if (isCashierUsername && password === cashierPassword) {
        const user = { username, name: 'Cashier' };
        const authObj = { user, token: 'cashier-token' };
        try {
          sessionStorage.setItem('bakery_app_auth', JSON.stringify(authObj));
          sessionStorage.setItem('bakery_user_role', 'cashier');
          localStorage.setItem('bakery_app_auth_cashier', JSON.stringify(authObj));
          localStorage.setItem('bakery_presence_cashier', JSON.stringify({ role:'cashier', user: username, timestamp: Date.now() }));
          localStorage.removeItem('bakery_force_logout_cashier');
        } catch (err) { /* ignore */ }
        setLoading(false);
        const dest = (next && next.includes('cashier')) ? next : '/cashier';
        navigate(dest, { replace: true });
        return;
      }

      // Admin credentials
      let adminCreds;
      try {
        adminCreds = JSON.parse(localStorage.getItem('bakery_app_creds') || 'null') || { username: 'admin', password: 'admin123' };
      } catch (err) {
        adminCreds = { username: 'admin', password: 'admin123' };
      }
      adminCreds.username = adminCreds.username || 'admin';
      adminCreds.password = adminCreds.password || 'admin123';

      if (username !== adminCreds.username || password !== adminCreds.password) {
        setLoading(false);
        setError("Incorrect username or password");
        return;
      }

      const user = { username, name: username || 'Admin' };
      const authObj = { user, token: 'admin-token' };
      try {
        sessionStorage.setItem('bakery_app_auth', JSON.stringify(authObj));
        sessionStorage.setItem('bakery_user_role', 'admin');
      } catch (err) { /* ignore */ }
      setLoading(false);
      navigate(next || '/admin', { replace: true });
    }, 600);
  }

  return (
    <main className="auth-page min-h-screen flex flex-col items-center justify-start py-12 px-4 bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50">
      {/* Hero Title */}
      <div className="text-center mb-6 select-none">
        <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-400 bg-clip-text text-transparent drop-shadow-sm">Bakery Engine</h1>
        <p className="mt-3 text-sm sm:text-base font-medium text-amber-700 flex flex-col sm:flex-row items-center justify-center gap-2">
          <span className="inline-flex items-center gap-1">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-80">
              <path d="M3 8l7.89 5.26a2 2 0 0 0 2.22 0L21 8" />
              <path d="M21 8v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8" />
              <path d="M3 8l9-6 9 6" />
            </svg>
            Crafted Daily
          </span>
          <span className="hidden sm:inline text-amber-400">•</span>
          <span className="inline-flex items-center gap-1">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-80">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
            Fast • Fresh • Friendly
          </span>
          <span className="hidden sm:inline text-amber-400">•</span>
          <span className="inline-flex items-center gap-1">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-80">
              <path d="M4 4h16v4H4z" />
              <path d="M4 12h16v8H4z" />
            </svg>
            Point of Sweet Sale
          </span>
        </p>
      </div>
      <div className="card w-full max-w-md mx-auto rounded-xl shadow-lg border border-amber-100/70 bg-white/90 backdrop-blur-sm">
        <h2 className="mt-4 mb-2 text-xl font-bold text-amber-900 flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 12c2.21 0 4-1.79 4-4S14.21 4 12 4 8 5.79 8 8s1.79 4 4 4z" />
              <path d="M6 20v-2c0-1.1.9-2 2-2h8c1.1 0 2 .9 2 2v2" />
            </svg>
          </span>
          Sign In
        </h2>
        <form onSubmit={handleSubmit} aria-label="Login form" className="px-4 pb-4">
          <label htmlFor="username" className="text-sm font-medium text-amber-900">Username</label>
          <input
            id="username"
            name="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            autoComplete="username"
            className="w-full mt-1 mb-3 px-3 py-2 rounded-md border border-amber-200 focus:outline-none focus:ring-2 focus:ring-orange-400/70 focus:border-orange-400 text-[15px] bg-white/70"
          />

          <label htmlFor="password" className="text-sm font-medium text-amber-900">Password</label>
          <div className="relative mt-1 mb-3">
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full px-3 py-2 pr-10 rounded-md border border-amber-200 focus:outline-none focus:ring-2 focus:ring-orange-400/70 focus:border-orange-400 text-[15px] bg-white/70"
            />
            <button
              type="button"
              onClick={()=>setShowPassword(p=>!p)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute inset-y-0 right-2 inline-flex items-center justify-center px-2 text-amber-700 hover:text-amber-900 focus:outline-none focus:ring-2 focus:ring-orange-400 rounded"
            >
              {showPassword ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20C7 20 2.73 16.11 1 12c.74-1.64 1.76-3.12 3-4.38" />
                  <path d="M10.58 10.58a2 2 0 0 0 2.84 2.84" />
                  <path d="M23 1 1 23" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>

          <div className="mb-3">
            <label className="inline-flex items-center gap-2 text-sm text-amber-800">
              <input type="checkbox" name="remember" className="rounded border-amber-300 text-orange-600 focus:ring-orange-400" />
              <span>Remember me</span>
            </label>
          </div>

          {error && <div className="text-red-600 text-sm font-medium mb-3">{error}</div>}

          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex justify-center items-center gap-2 font-semibold px-4 py-2.5 rounded-lg bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-400 text-white shadow hover:shadow-md hover:brightness-105 focus:outline-none focus:ring-2 focus:ring-orange-400 disabled:opacity-60 disabled:cursor-not-allowed transition"
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                  <path d="M12 2a10 10 0 0 1 10 10" />
                </svg>
                Signing in…
              </span>
            ) : (
              <span className="inline-flex items-center gap-2">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14" />
                  <path d="M12 5l7 7-7 7" />
                </svg>
                Sign In
              </span>
            )}
          </button>
        </form>
      </div>
    </main>
  );
}
