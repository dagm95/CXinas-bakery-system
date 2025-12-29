import React, { useRef, useState } from "react";

function loadAdminCreds(){
  try{
    const raw = localStorage.getItem('bakery_app_creds');
    const creds = raw ? JSON.parse(raw) : { username:'admin', password:'admin123' };
    return { username: creds.username || 'admin', password: creds.password || 'admin123' };
  }catch(e){ return { username:'admin', password:'admin123' }; }
}

function loadRolePasswords(){
  try{
    const raw = localStorage.getItem('bakery_role_passwords');
    const roles = raw ? JSON.parse(raw) : { admin:'', cashir:'cashir123', manager:'', groundManagerU:'ground', groundManagerP:'ground123' };
    roles.cashir = roles.cashir || 'cashir123';
    roles.groundManagerU = roles.groundManagerU || 'ground';
    roles.groundManagerP = roles.groundManagerP || 'ground123';
    return roles;
  }catch(e){ return { admin:'', cashir:'cashir123', manager:'', groundManagerU:'ground', groundManagerP:'ground123' }; }
}


  const [adminU, setAdminU] = useState(() => loadAdminCreds().username);
  const [adminP, setAdminP] = useState(() => loadAdminCreds().password);
  const [cashierP, setCashierP] = useState(() => {
    const r = loadRolePasswords();
    return r.cashir || r.cashier || 'cashir123';
  });
  const [groundManagerU, setGroundManagerU] = useState(() => {
    const r = loadRolePasswords();
    return r.groundManagerU || 'ground';
  });
  const [groundManagerP, setGroundManagerP] = useState(() => {
    const r = loadRolePasswords();
    return r.groundManagerP || 'ground123';
  });
  const [saved, setSaved] = useState('');
  const adminPRef = useRef(null);
  const cashierPRef = useRef(null);
  const groundManagerPRef = useRef(null);

  function saveAll(){
    try{
      const adminCreds = { username: adminU || 'admin', password: adminP || 'admin123' };
      localStorage.setItem('bakery_app_creds', JSON.stringify(adminCreds));
      const roles = loadRolePasswords();
      roles.cashir = cashierP || roles.cashir || 'cashir123';
      roles.groundManagerU = groundManagerU || roles.groundManagerU || 'ground';
      roles.groundManagerP = groundManagerP || roles.groundManagerP || 'ground123';
      localStorage.setItem('bakery_role_passwords', JSON.stringify(roles));
      setSaved('Saved!');
      setTimeout(()=>setSaved(''), 2000);
    }catch(e){ setSaved('Failed to save'); setTimeout(()=>setSaved(''), 2500); }
  }

  function deleteCreds(){
    try{
      localStorage.removeItem('bakery_app_creds');
      localStorage.removeItem('bakery_role_passwords');
      setSaved('Deleted!');
      setTimeout(()=>setSaved(''), 2000);
    }catch(e){ setSaved('Failed to delete'); setTimeout(()=>setSaved(''), 2500); }
  }

  function forceLogout(){
    try{
      sessionStorage.removeItem('bakery_app_auth');
      sessionStorage.removeItem('bakery_user_role');
      localStorage.removeItem('bakery_app_auth_manager');
      localStorage.removeItem('bakery_presence_manager');
      localStorage.removeItem('bakery_app_auth_cashier');
      localStorage.removeItem('bakery_app_auth');
      setSaved('Logged out!');
      setTimeout(()=>setSaved(''), 2000);
    }catch(e){ setSaved('Failed to logout'); setTimeout(()=>setSaved(''), 2500); }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center py-10">
      <div className="flex items-center gap-3 mb-8">
        <div className="text-3xl bg-orange-100 rounded-full p-3 shadow text-orange-500">🔒</div>
        <h1 className="text-3xl font-extrabold text-slate-800">Security</h1>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-5xl">
                <div className="bg-white rounded-2xl shadow-lg p-8 border border-slate-200">
                  <h3 className="text-xl font-bold mb-4 text-orange-600">Ground Manager Credentials</h3>
                  <label className="block text-slate-600 mb-1" htmlFor="groundManagerU">Username</label>
                  <input id="groundManagerU" value={groundManagerU} onChange={e=>setGroundManagerU(e.target.value)}
                    className="w-full mb-4 px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-orange-400 focus:outline-none bg-slate-50" />
                  <label className="block text-slate-600 mb-1" htmlFor="groundManagerP">Password</label>
                  <input id="groundManagerP" type="password" value={groundManagerP} ref={groundManagerPRef} onFocus={e => e.target.select()} onChange={e=>setGroundManagerP(e.target.value)}
                    className="w-full mb-2 px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-orange-400 focus:outline-none bg-slate-50" />
                </div>
        <div className="bg-white rounded-2xl shadow-lg p-8 border border-slate-200">
          <h3 className="text-xl font-bold mb-4 text-orange-600">Admin Credentials</h3>
          <label className="block text-slate-600 mb-1" htmlFor="adminU">Username</label>
          <input id="adminU" value={adminU} onChange={e=>setAdminU(e.target.value)}
            className="w-full mb-4 px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-orange-400 focus:outline-none bg-slate-50" />
          <label className="block text-slate-600 mb-1" htmlFor="adminP">Password</label>
          <input id="adminP" type="password" value={adminP} ref={adminPRef} onFocus={e => e.target.select()} onChange={e=>setAdminP(e.target.value)}
            className="w-full mb-2 px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-orange-400 focus:outline-none bg-slate-50" />
        </div>
        <div className="bg-white rounded-2xl shadow-lg p-8 border border-slate-200">
          <h3 className="text-xl font-bold mb-4 text-orange-600">Cashier Password</h3>
          <p className="text-slate-500 mb-2">Used by username <span className="font-mono">"cashie"</span> or <span className="font-mono">"cashir"</span> on login.</p>
          <label className="block text-slate-600 mb-1" htmlFor="cashierP">Password</label>
          <input id="cashierP" type="password" value={cashierP} ref={cashierPRef} onFocus={e => e.target.select()} onChange={e=>setCashierP(e.target.value)}
            className="w-full mb-2 px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-orange-400 focus:outline-none bg-slate-50" />
        </div>
      </div>
      <div className="flex flex-wrap gap-4 items-center mt-8">
        <button className="bg-gradient-to-r from-orange-400 to-orange-500 text-white font-bold px-8 py-3 rounded-full shadow hover:from-orange-500 hover:to-orange-600 transition" onClick={saveAll}>Save</button>
        <button className="bg-gradient-to-r from-red-400 to-red-500 text-white font-bold px-8 py-3 rounded-full shadow hover:from-red-500 hover:to-red-600 transition" onClick={deleteCreds}>Delete Credentials</button>
        <button className="bg-gradient-to-r from-slate-400 to-slate-600 text-white font-bold px-8 py-3 rounded-full shadow hover:from-slate-500 hover:to-slate-700 transition" onClick={forceLogout}>Force Logout</button>
        {saved && <span className="text-slate-500 font-medium">{saved}</span>}
      </div>
    </div>
  );
}
