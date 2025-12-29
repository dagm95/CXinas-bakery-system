import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Topbar(){
  const navigate = useNavigate();
  const [username, setUsername] = useState('');

  useEffect(()=>{
    try{
      // Prefer sessionStorage (per-tab active session), fall back to per-role localStorage or global localStorage
      let raw = sessionStorage.getItem('bakery_app_auth');
      if(!raw){
        // try per-role local copies based on user role in localStorage
        const role = sessionStorage.getItem('bakery_user_role') || localStorage.getItem('bakery_user_role');
        if(role === 'admin') raw = localStorage.getItem('bakery_app_auth_admin');
        else if(role === 'cashier') raw = localStorage.getItem('bakery_app_auth_cashier');
        if(!raw) raw = localStorage.getItem('bakery_app_auth');
      }
      if(raw){ const parsed = JSON.parse(raw); setUsername(parsed.user?.username || parsed.user?.name || 'cashie'); }
      else setUsername('cashie');
    }catch(e){ setUsername('cashie'); }
  },[]);

  const [notifCount, setNotifCount] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifItems, setNotifItems] = useState([]);

  useEffect(()=>{
    function loadNotifs(){
      try{
        const raw = localStorage.getItem('bakery_app_v1');
        if(raw){
          const st = JSON.parse(raw);
          const items = (st.notifications || []).slice().reverse();
          setNotifCount(items.length);
          setNotifItems(items);
        }
      }catch(e){}
    }
    loadNotifs();
    window.addEventListener('storage', loadNotifs);
    return ()=> window.removeEventListener('storage', loadNotifs);
  }, []);

  const logout = () => {
    try {
      // Clear only this tab's session (leave per-role stored copies intact)
      sessionStorage.removeItem('bakery_app_auth');
      sessionStorage.removeItem('bakery_user_role');
    } catch (err) { console.warn('failed clearing session', err); }
    navigate('/login');
  };

  const role = localStorage.getItem('bakery_user_role') || 'admin';
  const brandTitle = 'Bakery Admin';

  function setUsernameLocal(value){
    setUsername(value);
    try{
      const raw = localStorage.getItem('bakery_app_auth');
      const parsed = raw ? JSON.parse(raw) : { user: {} };
      parsed.user = parsed.user || {};
      parsed.user.username = value;
      localStorage.setItem('bakery_app_auth', JSON.stringify(parsed));
    }catch(e){}
  }

  // Presence heartbeat: mark current role as active in localStorage
  useEffect(()=>{
    function beat(){
      try{
        const currentRole = sessionStorage.getItem('bakery_user_role') || localStorage.getItem('bakery_user_role') || 'admin';
        const payload = { role: currentRole, user: username || 'admin', timestamp: Date.now() };
        localStorage.setItem(`bakery_presence_${currentRole}`, JSON.stringify(payload));
      }catch(e){}
    }
    beat();
    const id = setInterval(beat, 15000);
    return ()=> clearInterval(id);
  }, [username]);

  return (
    <header role="banner" className="sticky top-0 z-[1200] bg-white/90 backdrop-blur border-b border-slate-100 shadow-sm">
      <div className="w-full px-3 h-20 flex items-center justify-between">
        {/* Left: Hamburger + Brand */}
        <div className="flex items-center gap-3">
          {/* Mobile drawer toggle */}
          <button
            className="inline-flex md:hidden items-center justify-center w-9 h-9 rounded-md border border-slate-200 text-slate-700"
            aria-label="Open menu"
            onClick={() => window.dispatchEvent(new CustomEvent('toggleMobileSidebar'))}
          >
            ☰
          </button>
          {/* Desktop collapse toggle removed per request */}
          <div aria-hidden className="flex items-baseline gap-2 select-none">
            <span className="text-[22px] font-extrabold text-slate-900">Bakery</span>
            <span className="text-[22px] font-extrabold bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">Admin</span>
          </div>
        </div>

        {/* Right: Zoom pill + icons + logout */}
        <div className="flex items-center gap-3">
          <div id="zoomControls" className="hidden sm:flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 shadow-sm">
            <button className="px-2 py-1 text-slate-700" onClick={()=>{ const v=Number(document.documentElement.style.zoom||1)-0.1; document.documentElement.style.zoom = String(Math.max(0.5,Math.round(v*100)/100)); }}>−</button>
            <button className="px-2 py-1 font-semibold text-slate-800" onClick={()=>{ document.documentElement.style.zoom = '1'; }}>100%</button>
            <button className="px-2 py-1 text-slate-700" onClick={()=>{ const v=Number(document.documentElement.style.zoom||1)+0.1; document.documentElement.style.zoom = String(Math.min(2,Math.round(v*100)/100)); }}>+</button>
          </div>
          <div className="relative">
          <button className="relative w-9 h-9 inline-flex items-center justify-center rounded-md text-slate-700 hover:bg-slate-100" onClick={()=>setNotifOpen(v=>!v)} aria-label="Notifications">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-slate-700">
              <path d="M12 3c-3 0-5 2.5-5 5.5v3.5l-2 2v1h14v-1l-2-2V8.5C17 5.5 15 3 12 3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M10 19a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            {notifCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] px-1.5 py-[2px] rounded-full font-bold">{notifCount}</span>
            )}
          </button>
          {notifOpen && (
            <div role="dialog" aria-label="Notifications" className="absolute right-0 mt-2 w-80 max-h-[60vh] overflow-auto rounded-lg border border-slate-200 bg-white shadow-xl z-[1300]">
              <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between">
                <span className="font-semibold text-slate-800">Admin activity</span>
                <button className="text-xs text-slate-500 hover:text-slate-700" onClick={()=>setNotifOpen(false)}>Close</button>
              </div>
              {notifItems.length === 0 ? (
                <div className="px-3 py-4 text-slate-500 text-sm">No activity yet.</div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {notifItems.map((n, idx)=> (
                    <li key={idx} className="px-3 py-3 text-sm text-slate-700">
                      <div className="font-medium">{n.title || n.message || 'Activity'}</div>
                      {n.detail && <div className="text-slate-500">{n.detail}</div>}
                      <div className="text-xs text-slate-400 mt-1">{new Date(n.time || n.timestamp || Date.now()).toLocaleString()}</div>
                    </li>
                  ))}
                </ul>
              )}
              <div className="px-3 py-2 border-t border-slate-100 flex gap-2">
                <button className="text-xs px-2 py-1 rounded border border-slate-200 hover:bg-slate-50" onClick={()=>{
                  try{
                    const raw = localStorage.getItem('bakery_app_v1');
                    if(!raw) return;
                    const st = JSON.parse(raw);
                    st.notifications = [];
                    localStorage.setItem('bakery_app_v1', JSON.stringify(st));
                    setNotifItems([]); setNotifCount(0);
                  }catch(e){}
                }}>Clear</button>
                <button className="text-xs px-2 py-1 rounded border border-slate-200 hover:bg-slate-50" onClick={()=>navigate('/admin/notifications')}>Open page</button>
              </div>
            </div>
          )}
          </div>
          
          <button className="inline-flex items-center rounded-md px-3 h-9 text-white font-semibold bg-gradient-to-r from-orange-500 to-amber-500 hover:brightness-105" onClick={logout}>
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
