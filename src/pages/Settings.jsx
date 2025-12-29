import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiSettings } from "react-icons/fi";

export default function Settings() {
  const KEY = "bakery_role_passwords";
  const CREDS_KEY = "bakery_app_creds";
  const USERS_KEY = "bakery_usernames";

  const [pw, setPw] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(KEY)) || { admin: "", cashir: "", manager: "" };
    } catch {
      return { admin: "", cashir: "", manager: "" };
    }
  });

  const [creds, setCreds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(CREDS_KEY)) || { username: "admin", password: "admin123" };
    } catch {
      return { username: "admin", password: "admin123" };
    }
  });

  const [saved, setSaved] = useState(false);
  const [section, setSection] = useState('security');
  const [userNames, setUserNames] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(USERS_KEY)) || { admin: 'admin', cashier: 'cashier', inventory: 'manager' };
    } catch {
      return { admin: 'admin', cashier: 'cashier', inventory: 'manager' };
    }
  });

  const navigate = useNavigate();

  const save = () => {
    try {
      localStorage.setItem(KEY, JSON.stringify(pw));
      localStorage.setItem(CREDS_KEY, JSON.stringify(creds));
      localStorage.setItem(USERS_KEY, JSON.stringify(userNames));

      // If a user is currently signed in, update their stored username
      try {
        const authRaw = localStorage.getItem("bakery_app_auth");
        if (authRaw) {
          const auth = JSON.parse(authRaw);
          auth.user = auth.user || {};
          auth.user.username = creds.username;
          localStorage.setItem("bakery_app_auth", JSON.stringify(auth));
        }
      } catch (e) {
        console.warn("updating bakery_app_auth failed", e);
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 2200);
    } catch (err) {
      console.error("failed saving settings", err);
    }
  };


  const LinkItem = ({ id, label, icon }) => (
    <button
      className={`settings-link ${section === id ? 'active' : ''}`}
      onClick={() => setSection(id)}
      aria-current={section === id ? 'page' : undefined}
    >
      <span className="settings-link-icon" aria-hidden="true">{icon}</span>
      <span className="settings-link-label">{label}</span>
    </button>
  );

  const PillButton = ({ children, onClick, style, type = 'button' }) => (
    <button
      type={type}
      onClick={onClick}
      style={{
        background: 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)',
        color: '#fff',
        border: 'none',
        borderRadius: 9999,
        padding: '10px 16px',
        fontWeight: 600,
        boxShadow: '0 10px 24px rgba(249,115,22,0.35)',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        ...style,
      }}
    >
      {children}
    </button>
  );

  // Tailwind-styled password input with inline show/hide icon
  const PasswordInput = ({ id, value, onChange, placeholder }) => {
    const [visible, setVisible] = useState(false);
    const EyeIcon = () => (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        className="h-5 w-5"
      >
        <path
          d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="12" cy="12" r="3" strokeWidth="1.8" />
      </svg>
    );
    const EyeOffIcon = () => (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        className="h-5 w-5"
      >
        <path
          d="M2 12s3.5-7 10-7c2 0 3.8.5 5.2 1.3M22 12s-3.5 7-10 7c-2.2 0-4.1-.6-5.8-1.6"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M3 3l18 18" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
    return (
      <div className="relative w-full">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="w-full border rounded-md px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="button"
          onClick={() => setVisible(v => !v)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          className="absolute inset-y-0 right-2 flex items-center text-gray-400 hover:text-gray-600"
        >
          {visible ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>
    );
  };

  return (
    <div className="card">
      {/* Lightweight global toast for Save confirmation */}
      {saved && (
        <div style={{
          position: 'fixed',
          top: 16,
          right: 16,
          background: '#16a34a',
          color: '#fff',
          padding: '8px 12px',
          borderRadius: 8,
          boxShadow: '0 10px 24px rgba(22,163,74,0.25)',
          zIndex: 1000,
          fontWeight: 600
        }} aria-live="polite" role="status">
          Saved
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12, gap:12 }}>
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700 shadow">
          <FiSettings size={18} />
        </div>
        <h1 style={{ margin: 0, flex: 1, fontWeight: 700 }}>Settings</h1>
        <PillButton onClick={() => navigate('/admin')}>Back to Dashboard</PillButton>
      </div>

      <div className="settings-layout">
        <nav className="settings-nav" aria-label="Settings sections">
          <LinkItem id="security" label="Security" icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 3l7 4v5c0 5-3.5 8.5-7 9-3.5-.5-7-4-7-9V7l7-4Z" stroke="currentColor" strokeWidth="2"/><path d="M9.5 12a2.5 2.5 0 1 0 5 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          }/>
        </nav>

        <section className="settings-content">
          {section === 'security' && (
            <div>
              {null}
              {null}

              {null}

              

              {/* User Management (RUD) */}
              <div className="card" style={{marginTop:16}}>
                <h4 style={{margin:'0 0 8px'}}>User Management</h4>
                <p className="muted" style={{marginTop:0}}>Edit usernames and passwords for Admin, Cashier, and Inventory. Delete accounts or force logout active sessions.</p>
                <div style={{overflowX:'auto'}}>
                  <table style={{width:'100%', borderCollapse:'collapse'}}>
                    <thead>
                      <tr style={{textAlign:'left'}}>
                        <th style={{padding:'8px'}}>Role</th>
                        <th style={{padding:'8px'}}>Username</th>
                        <th style={{padding:'8px'}}>Password</th>
                        <th style={{padding:'8px'}}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Admin row */}
                      <tr>
                        <td style={{padding:'8px'}}>Admin</td>
                        <td style={{padding:'8px'}}>
                          <input type="text" value={creds.username} onChange={e=>{ setCreds({...creds, username:e.target.value}); setUserNames({...userNames, admin: e.target.value || 'admin'}); }} />
                        </td>
                        <td style={{padding:'8px'}}>
                          <PasswordInput id="admin_table_pw" value={creds.password} onChange={e=>setCreds({...creds, password:e.target.value})} />
                        </td>
                        <td style={{padding:'8px', display:'flex', gap:8}}>
                          <PillButton onClick={save}>Save</PillButton>
                          <button className="btn secondary" onClick={()=>{
                            // Prevent deleting admin entirely; instead reset to defaults
                            const next = { username:'admin', password:'admin123' };
                            setCreds(next);
                            localStorage.setItem(CREDS_KEY, JSON.stringify(next));
                          }}>Reset</button>
                        </td>
                      </tr>
                      {/* Cashier row */}
                      <tr>
                        <td style={{padding:'8px'}}>Cashier</td>
                        <td style={{padding:'8px'}}>
                          {/* Editable cashier username (single) */}
                          <input type="text" value={userNames.cashier || 'cashier'} onChange={e=>setUserNames({...userNames, cashier: e.target.value || 'cashier'})} />
                        </td>
                        <td style={{padding:'8px'}}>
                          <PasswordInput id="cashier_table_pw" value={pw.cashir || ''} onChange={e=>setPw({...pw, cashir:e.target.value})} />
                        </td>
                        <td style={{padding:'8px', display:'flex', gap:8, flexWrap:'wrap'}}>
                          <PillButton onClick={save}>Save</PillButton>
                          <button className="btn secondary" onClick={()=>{
                            // Delete cashier account: clear password and auth mirrors
                            const nextPw = {...pw, cashir:''};
                            setPw(nextPw);
                            localStorage.setItem(KEY, JSON.stringify(nextPw));
                            setUserNames({...userNames, cashier: 'cashier'});
                            localStorage.setItem(USERS_KEY, JSON.stringify({...userNames, cashier: 'cashier'}));
                            try{
                              localStorage.removeItem('bakery_app_auth_cashier');
                              localStorage.removeItem('bakery_presence_cashier');
                            }catch(e){}
                          }}>Delete</button>
                          <button className="btn" style={{ background:'#ef4444' }} onClick={()=>{
                            try{
                              localStorage.setItem('bakery_force_logout_cashier', String(Date.now()));
                              alert('Cashier sessions will be logged out.');
                            }catch(e){}
                          }}>Force logout</button>
                        </td>
                      </tr>
                      {/* Inventory row */}
                      <tr>
                        <td style={{padding:'8px'}}>Inventory</td>
                        <td style={{padding:'8px'}}>
                          <input type="text" value={'manager'} readOnly />
                        </td>
                        <td style={{padding:'8px'}}>
                          <PasswordInput id="manager_table_pw" value={pw.manager || ''} onChange={e=>setPw({...pw, manager:e.target.value})} />
                        </td>
                        <td style={{padding:'8px', display:'flex', gap:8, flexWrap:'wrap'}}>
                          <PillButton onClick={save}>Save</PillButton>
                          <button className="btn secondary" onClick={()=>{
                            // Delete inventory account: clear password and mirrors
                            const nextPw = {...pw, manager:''};
                            setPw(nextPw);
                            localStorage.setItem(KEY, JSON.stringify(nextPw));
                            try{
                              localStorage.removeItem('bakery_app_auth_inventory');
                              localStorage.removeItem('bakery_presence_inventory');
                            }catch(e){}
                          }}>Delete</button>
                          <button className="btn" style={{ background:'#ef4444' }} onClick={()=>{
                            try{
                              localStorage.setItem('bakery_force_logout_inventory', String(Date.now()));
                              alert('Inventory sessions will be logged out.');
                            }catch(e){}
                          }}>Force logout</button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {null}

          {null}
        </section>
      </div>
    </div>
  );
}
