import React, { useEffect, useState } from 'react';
import { createBroadcaster } from '../utils/broadcast';
import { useNavigate } from 'react-router-dom';

function loadStore(){
  try{ const raw = localStorage.getItem('bakery_app_v1'); return raw ? JSON.parse(raw) : {}; }catch(e){ return {}; }
}

export default function Notifications(){
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState(() => loadStore().notifications || []);
  const [message, setMessage] = useState('');
  const [target, setTarget] = useState('cashier');
  const [quickMsg, setQuickMsg] = useState('');

  useEffect(()=>{
    function onStorage(e){
      if(e && e.key && e.key !== 'bakery_app_v1') return;
      setNotifications((loadStore().notifications) || []);
    }
    window.addEventListener('storage', onStorage);
    return ()=> window.removeEventListener('storage', onStorage);
  }, []);

  function sendNotification(){
    const msg = (message || '').trim();
    if(!msg){ alert('Enter a message'); return; }
    const st = loadStore();
    st.notifications = st.notifications || [];
    const note = { id: 'N-'+Date.now(), from: 'admin', to: target, message: msg, timestamp: new Date().toISOString(), dismissedFor: [] };
    st.notifications.push(note);
      try{ localStorage.setItem('bakery_app_v1', JSON.stringify(st)); setNotifications(st.notifications); setMessage(''); alert('Notification sent');
      try{ window.dispatchEvent(new Event('storage')); }catch(e){}
      try{ const b = createBroadcaster(); b.post({ type: 'notification', payload: note }); }catch(e){}
    }catch(e){ console.error(e); alert('Failed to save notification'); }
  }

  function removeNotification(id){ if(!confirm('Delete this notification?')) return; try{ const st = loadStore(); st.notifications = (st.notifications||[]).filter(n=>n.id!==id); localStorage.setItem('bakery_app_v1', JSON.stringify(st)); setNotifications(st.notifications||[]); }catch(e){ console.error(e); } }

  return (
    <div className="container">
      <div className="header page-header">
        <div className="logo" aria-hidden><span className="logo-mark">🔔</span></div>
        <div style={{flex:1}}>
          <h1 className="page-title">Notifications</h1>
          <div className="muted small">Send messages to Cashier or Ground Manager</div>
        </div>
        <div style={{display:'flex',gap:8}}>
          <button className="btn" onClick={()=>navigate('/admin')}>Back</button>
        </div>
      </div>

      <div className="card">
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          <div style={{display:'flex',gap:8,alignItems:'center'}}>
            <input aria-label="Quick message" placeholder="Quick message" value={quickMsg} onChange={(e)=>setQuickMsg(e.target.value)} style={{flex:1,padding:8,borderRadius:6,border:'1px solid #e6e9ef'}} />
              <button className="btn" onClick={()=>{
              const msg = (quickMsg||'').trim(); if(!msg){ alert('Enter a quick message'); return; }
              const st = loadStore(); st.notifications = st.notifications || [];
              const note = { id: 'N-'+Date.now(), from: 'admin', to: target, message: msg, timestamp: new Date().toISOString(), dismissedFor: [] };
              st.notifications.push(note);
              try{ localStorage.setItem('bakery_app_v1', JSON.stringify(st)); setNotifications(st.notifications); setQuickMsg(''); try{ window.dispatchEvent(new Event('storage')); }catch(e){}
                try{ const b = createBroadcaster(); b.post({ type: 'notification', payload: note }); }catch(e){}
                alert('Notification sent'); }catch(e){ console.error(e); alert('Failed to save notification'); }
            }}>Send Quick</button>
          </div>

          <div style={{display:'flex',gap:8,alignItems:'center'}}>
            <select value={target} onChange={(e)=>setTarget(e.target.value)} style={{padding:8,borderRadius:6,border:'1px solid #e6e9ef'}}>
              <option value="cashier">Cashier</option>
              <option value="ground">Ground</option>
              <option value="all">All</option>
            </select>
            <textarea value={message} onChange={(e)=>setMessage(e.target.value)} placeholder="Type your message" style={{flex:1,padding:8,borderRadius:8,border:'1px solid #e6e9ef'}} rows={3} />
            <button className="btn" onClick={sendNotification}>Send</button>
          </div>
        </div>
        <div style={{marginTop:12}}>
          <h3 style={{margin:0,marginBottom:8}}>Sent notifications</h3>
          {notifications.length === 0 ? <div className="muted">No notifications sent yet</div> : (
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {notifications.slice().reverse().map(n => {
                const colorMap = { cashier: '#2563eb', ground: '#10b981', all: '#7c3aed' };
                const color = colorMap[n.to] || '#6b7280';
                return (
                <div key={n.id} style={{padding:10,borderRadius:8,background:'#fff',border:'1px solid #eef2f6',display:'flex',justifyContent:'space-between',alignItems:'center',borderLeft:`4px solid ${color}`}}>
                  <div style={{display:'flex',flexDirection:'column'}}>
                    <div style={{fontWeight:700,display:'flex',alignItems:'center',gap:8}}>
                      <span style={{display:'inline-block',width:10,height:10,borderRadius:3,background:color}}></span>
                      <span>{n.message}</span>
                    </div>
                    <div style={{fontSize:12,color:'#6b7280'}}><strong style={{textTransform:'capitalize',color}}>{n.to}</strong> • {new Date(n.timestamp).toLocaleString()}</div>
                  </div>
                  <div style={{display:'flex',gap:8}}>
                    <button className="side-small-btn" onClick={()=>removeNotification(n.id)}>Delete</button>
                  </div>
                </div>
              )})}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
