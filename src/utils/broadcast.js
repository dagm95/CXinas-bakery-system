// Small BroadcastChannel helper with localStorage fallback
export function createBroadcaster(channelName = 'bakery_channel'){
  let bc = null;
  try{ if('BroadcastChannel' in window) bc = new BroadcastChannel(channelName); }catch(e){ bc = null; }

  function post(message){
    try{
      if(bc){ try{ bc.postMessage(message); console.debug('[Broadcast] post via BroadcastChannel', message); }catch(e){ console.debug('[Broadcast] bc.postMessage error', e); } return; }
      // fallback: localStorage write with timestamp key
      const key = `__bc_${channelName}`;
      // write a wrapper so listeners can detect fallback vs BC
      localStorage.setItem(key, JSON.stringify({ message, t: Date.now(), __via: 'localStorage' }));
      // cleanup immediately
      setTimeout(()=>{ try{ localStorage.removeItem(key); }catch(e){} }, 500);
    }catch(e){ console.warn('broadcast post failed', e); }
  }

  function listen(handler){
    if(bc){ bc.onmessage = (ev) => { try{ let m = ev.data; if(m && m.message) m = m.message; if(m && typeof m === 'object') m.__via = m.__via || 'broadcast'; console.debug('[Broadcast] received via BroadcastChannel', m); handler(m); }catch(e){} }; return () => { try{ bc.close(); }catch(e){} }; }

    function onStorage(e){
      try{
        if(!e.key) return;
        const key = `__bc_${channelName}`;
        if(e.key !== key) return;
        if(!e.newValue) return;
        const obj = JSON.parse(e.newValue);
        let m = obj && obj.message ? obj.message : obj;
        if(m && typeof m === 'object') m.__via = m.__via || 'localStorage';
        console.debug('[Broadcast] received via localStorage fallback', m, obj);
        handler(m);
      }catch(err){}
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }

  return { post, listen };
}

export default createBroadcaster;
