import React, { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { PRODUCTS as DEFAULT_PRODUCTS } from "../data/products";
import { createBroadcaster } from "../utils/broadcast";
import { MdPointOfSale } from "react-icons/md";

function loadStore(){
  try{ const raw = localStorage.getItem('bakery_app_v1'); return raw ? JSON.parse(raw) : { products: DEFAULT_PRODUCTS, sales: [] }; }catch(e){ return { products: DEFAULT_PRODUCTS, sales: [] }; }
}

export default function Sales(){
  const navigate = useNavigate();
  const [store, setStore] = useState(() => loadStore());
  const [products, setProducts] = useState(() => (loadStore().products) || DEFAULT_PRODUCTS);
  const [dirty, setDirty] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(Object.keys(products)[0] || '');
  const [status, setStatus] = useState('');
  const ackTimerRef = useRef(null);
  const pendingAckRef = useRef(null);
  const broadcasterRef = useRef(null);
  const [ackStatus, setAckStatus] = useState('');

  // ensure per-tab id for broadcast origin identification
  const tabId = (() => {
    try{
      let id = sessionStorage.getItem('bakery_tab_id');
      if(!id){ id = 'tab-' + Date.now().toString(36) + '-' + Math.floor(Math.random()*10000); sessionStorage.setItem('bakery_tab_id', id); }
      return id;
    }catch(e){ return 'tab-local'; }
  })();

  useEffect(()=>{ if(!selectedGroup) setSelectedGroup(Object.keys(products)[0] || ''); }, [products]);

  useEffect(()=>{ try{ const raw = localStorage.getItem('bakery_app_v1'); if(raw){ const s = JSON.parse(raw); if(s.products) setProducts(s.products); } }catch(e){} }, []);

  // setup broadcaster listener for ACKs
  useEffect(()=>{
    const b = createBroadcaster();
    broadcasterRef.current = b;
    const off = b.listen(msg => {
      try{
        if(!msg || !msg.type) return;
        if(msg.type === 'product:update:ack'){
          const { id, from, __via } = msg;
          console.debug('[Sales] received product:update:ack', { id, from, via: __via });
          // only consider ACKs for our pending update and from other tabs
          if(pendingAckRef.current && pendingAckRef.current === id && from && from !== tabId){
            // mark done
            setAckStatus('Done');
            setStatus('Saved');
            setDirty(false);
            pendingAckRef.current = null;
            if(ackTimerRef.current){ clearTimeout(ackTimerRef.current); ackTimerRef.current = null; }
            // clear status shortly
            setTimeout(()=>setAckStatus(''), 1200);
          }
        }
      }catch(e){}
    });
    return ()=>{ try{ off(); }catch(e){} };
  }, []);

  // debug storage events so admin can see cross-tab changes
  useEffect(()=>{
    function onStorage(e){
      try{
        if(!e) return;
        if(e.key === 'bakery_app_v1'){
          console.debug('[Sales] storage event bakery_app_v1 changed', { key: e.key, newValue: e.newValue ? JSON.parse(e.newValue) : null });
        }
        if(e.key && e.key.startsWith('__bc_')){
          console.debug('[Sales] storage event (broadcast fallback) key', e.key, e.newValue);
        }
      }catch(err){}
    }
    window.addEventListener('storage', onStorage);
    return ()=> window.removeEventListener('storage', onStorage);
  }, []);

  function persist(next){
    // ensure we write a full store snapshot, preserving sales/notifications/daySession
    try{
      const existingRaw = localStorage.getItem('bakery_app_v1');
      const existing = existingRaw ? JSON.parse(existingRaw) : {};
      const clonedProducts = JSON.parse(JSON.stringify(next || {}));
      const ns = { ...(existing || {}), products: clonedProducts };
      console.debug('[Sales] persist: writing full bakery_app_v1', { ns, fromTab: tabId });
      localStorage.setItem('bakery_app_v1', JSON.stringify(ns));
      // Always dispatch custom event for live updates after any sales/product/localStorage update
      try { window.dispatchEvent(new Event('sales-updated')); } catch (e) {}
      setStore(ns); setProducts(clonedProducts);
      setStatus('Saved');
      // broadcast with an id and await ack
      try{
        const id = 'upd-' + Date.now().toString(36) + '-' + Math.floor(Math.random()*10000);
        pendingAckRef.current = id;
        setAckStatus('Waiting for cashier...');
        // post product update with id and origin
        try{ console.debug('[Sales] broadcasting product:update', { id, from: tabId }); createBroadcaster().post({ type: 'product:update', payload: clonedProducts, id, from: tabId }); }catch(e){ console.error('[Sales] broadcast failed', e); }
        // set a timeout to clear waiting state if no ACK
        if(ackTimerRef.current) clearTimeout(ackTimerRef.current);
        ackTimerRef.current = setTimeout(()=>{
          if(pendingAckRef.current === id){
            setAckStatus('Saved (no ACK)');
            pendingAckRef.current = null;
            setDirty(false);
            setTimeout(()=>setAckStatus(''), 1500);
          }
        }, 1600);
      }catch(e){}
      setDirty(false);
      setTimeout(()=>setStatus(''),1600);
    }catch(e){ setStatus('Save failed'); }
  }

  function addGroup(){
    const name = prompt('New product group name (e.g. Cake)');
    if(!name) return;
    const key = name.replace(/\s+/g,'');
    if(products[key]){ alert('Group already exists'); return; }
    const next = {...products, [key]: [{ label: `${name} - 0.00`, value: 0 }] };
    setProducts(next);
    setSelectedGroup(key);
    setDirty(true);
  }

  function removeGroup(key){
    // open custom confirm dialog
    setConfirmDialog({ open: true, type: 'group', key });
  }

  function addVariant(){
    if(!selectedGroup) return;
    const label = prompt('Variant label (e.g. 1kg - 500.00)');
    if(!label) return;
    const priceStr = prompt('Price amount (numbers only)');
    const value = Number(priceStr||0);
    const next = {...products};
    next[selectedGroup] = [...(next[selectedGroup]||[]), { label: label, value }];
    setProducts(next);
    setDirty(true);
  }

  function updateVariant(idx, patch){
    const next = {...products};
    next[selectedGroup] = next[selectedGroup].map((v,i)=> i===idx ? {...v, ...patch} : v);
    setProducts(next);
    setDirty(true);
  }

  function removeVariant(idx){
    // open custom confirm dialog
    setConfirmDialog({ open: true, type: 'variant', index: idx, group: selectedGroup });
  }

  function resetDefaults(){
    if(!confirm('Reset products to bundled defaults?')) return;
    setProducts(DEFAULT_PRODUCTS);
    setDirty(true);
    setSelectedGroup(Object.keys(DEFAULT_PRODUCTS)[0] || '');
  }

  const groups = useMemo(()=> Object.keys(products || {}), [products]);
  const [renameValue, setRenameValue] = useState('');
  const [renaming, setRenaming] = useState(false);
  const renameInputRef = useRef(null);

  useEffect(()=>{
    if(selectedGroup){
      const display = selectedGroup.replace(/([A-Z])/g,' $1').trim();
      setRenameValue(display);
    } else {
      setRenameValue('');
    }
    setRenaming(false);
  }, [selectedGroup]);

  function commitRename(){
    if(!selectedGroup) return;
    const display = (renameValue||'').trim();
    if(!display){ setRenameValue(selectedGroup.replace(/([A-Z])/g,' $1').trim()); setRenaming(false); return; }
    const key = display.replace(/\s+/g,'');
    if(key === selectedGroup){ setRenaming(false); setRenameValue(display); return; }
    if(products[key]){ alert('Group already exists'); setRenameValue(selectedGroup.replace(/([A-Z])/g,' $1').trim()); setRenaming(false); return; }
    const next = {...products};
    // copy variants array to avoid accidental shared references/mutations
    const variants = Array.isArray(next[selectedGroup]) ? next[selectedGroup].map(v => ({ ...v })) : [];
    next[key] = variants;
    delete next[selectedGroup];
    console.debug('[Sales] commitRename', { from: selectedGroup, to: key, variantsCount: variants.length, nextKeys: Object.keys(next) });
    setProducts(next);
    setSelectedGroup(key);
    setDirty(true);
    setRenaming(false);
  }

  // UI bars for reset/add actions
  const [showResetBar, setShowResetBar] = useState(false);
  const [showAddGroupBar, setShowAddGroupBar] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [showAddVariantBar, setShowAddVariantBar] = useState(false);
  const [newVariantLabel, setNewVariantLabel] = useState('');
  const [newVariantPrice, setNewVariantPrice] = useState('');

  function resetDefaults(){
    // show confirmation bar (Reset & Save) instead of immediate confirm()
    setShowResetBar(true);
  }

  function confirmResetAndSave(){
    // persist defaults immediately and broadcast
    try{
      persist(DEFAULT_PRODUCTS);
    }catch(e){}
    setShowResetBar(false);
  }

  function cancelReset(){ setShowResetBar(false); }

  function addGroup(){
    // open inline add group bar
    setShowAddGroupBar(true);
    setNewGroupName('');
    setTimeout(()=>{ try{ const el=document.getElementById('newGroupInput'); if(el) el.focus(); }catch(e){} }, 50);
  }

  function confirmAddGroup(){
    const name = (newGroupName||'').trim(); if(!name) return alert('Enter a group name');
    const key = name.replace(/\s+/g,'');
    if(products[key]){ alert('Group already exists'); return; }
    const next = {...products, [key]: [{ label: `${name} - 0.00`, value: 0 }] };
    setProducts(next); setSelectedGroup(key); setDirty(true); setShowAddGroupBar(false);
  }

  function cancelAddGroup(){ setShowAddGroupBar(false); setNewGroupName(''); }

  function addVariant(){
    if(!selectedGroup){ alert('Select a group first'); return; }
    setShowAddVariantBar(true); setNewVariantLabel(''); setNewVariantPrice('');
    setTimeout(()=>{ try{ const el=document.getElementById('newVariantInput'); if(el) el.focus(); }catch(e){} }, 50);
  }

  function confirmAddVariant(){
    const label = (newVariantLabel||'').trim(); if(!label) return alert('Enter variant label');
    const value = Number(newVariantPrice||0);
    const next = {...products};
    next[selectedGroup] = [...(next[selectedGroup]||[]), { label, value }];
    setProducts(next); setDirty(true); setShowAddVariantBar(false);
  }

  function cancelAddVariant(){ setShowAddVariantBar(false); setNewVariantLabel(''); setNewVariantPrice(''); }

  // Confirm dialog state and handlers
  const [confirmDialog, setConfirmDialog] = useState({ open: false, type: '', key: '', index: -1, group: '' });
  function confirmDelete(){
    const { type } = confirmDialog || {};
    if(type === 'group'){
      const key = confirmDialog.key;
      const next = { ...products };
      delete next[key];
      setProducts(next);
      setDirty(true);
      if(selectedGroup === key) setSelectedGroup(Object.keys(next)[0] || '');
    } else if(type === 'variant'){
      const idx = confirmDialog.index;
      const grp = confirmDialog.group || selectedGroup;
      if(!grp) { setConfirmDialog({ open:false, type:'' }); return; }
      const next = { ...products };
      next[grp] = (next[grp]||[]).filter((_,i)=> i!==idx);
      setProducts(next);
      setDirty(true);
    }
    setConfirmDialog({ open:false, type:'' });
  }
  function cancelDelete(){ setConfirmDialog({ open:false, type:'' }); }

  return (
    <div className="container">
      <div className="header page-header">
        {null}
        <div style={{flex:1}}>
          <h1 className="page-title" style={{display:'flex',alignItems:'center',gap:12}}>
            <MdPointOfSale style={{width:28,height:28,color:'#1f2937'}} aria-hidden="true" />
            <span>Sales Management</span>
          </h1>
          <div className="muted small">Manage cashier products and price variants</div>
        </div>
        <div style={{display:'flex',gap:8}}>
          <button className="btn" onClick={()=>navigate('/admin')} style={{
            background: 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)',
            color: '#fff',
            border: 'none',
            borderRadius: 9999,
            padding: '10px 16px',
            fontWeight: 600,
            boxShadow: '0 10px 24px rgba(249,115,22,0.35)'
          }}>Back to Dashboard</button>
        </div>
      </div>



      <div className="card product-crud">
        {confirmDialog.open && (
          <div style={{position:'fixed',inset:0,display:'flex',alignItems:'center',justifyContent:'center',zIndex:2000}}>
            <div onClick={cancelDelete} style={{position:'absolute',inset:0,background:'rgba(15,23,42,0.45)'}} />
            <div style={{position:'relative',background:'#fff',borderRadius:12,boxShadow:'0 30px 60px rgba(2,6,23,0.20)',width:'92%',maxWidth:420,padding:18}}>
              <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:10}}>
                <div style={{width:44,height:44,display:'flex',alignItems:'center',justifyContent:'center',background:'#fef3c7',borderRadius:10,fontWeight:800}}>!</div>
                <div>
                  <div style={{fontWeight:800,fontSize:18}}>Confirm deletion</div>
                  <div className="muted" style={{fontSize:13}}>
                    {confirmDialog.type === 'group' ? (
                      <>Are you sure you want to delete the group <strong>{confirmDialog.key.replace(/([A-Z])/g,' $1').trim()}</strong>? This will remove all its variants.</>
                    ) : (
                      <>Are you sure you want to remove this variant from <strong>{(confirmDialog.group||selectedGroup).replace(/([A-Z])/g,' $1').trim()}</strong>?</>
                    )}
                  </div>
                </div>
              </div>
              <div style={{display:'flex',justifyContent:'flex-end',gap:8,marginTop:8}}>
                <button className="btn secondary" onClick={cancelDelete}>Cancel</button>
                <button className="btn" onClick={confirmDelete} style={{
                  background:'linear-gradient(135deg,#ef4444 0%, #dc2626 100%)',
                  border:'none', color:'#fff', borderRadius:9999, padding:'8px 14px', fontWeight:600,
                  boxShadow:'0 10px 24px rgba(220,38,38,0.35)'
                }}>Delete</button>
              </div>
            </div>
          </div>
        )}
        {/* Action bars: Reset confirmation, Add Group, Add Variant */}
        {showResetBar && (
          <div style={{marginBottom:12,padding:12,display:'flex',alignItems:'center',justifyContent:'space-between',background:'linear-gradient(90deg,#fff7ed,#fffbeb)',borderRadius:10,boxShadow:'0 6px 18px rgba(16,24,40,0.06)',border:'1px solid #fde68a'}}>
            <div style={{display:'flex',alignItems:'center',gap:12}}>
              <div style={{width:42,height:42,display:'flex',alignItems:'center',justifyContent:'center',background:'#fef3c7',borderRadius:8,fontWeight:700}}>!</div>
              <div>
                <div style={{fontWeight:700}}>Reset products to defaults?</div>
                <div style={{fontSize:13,color:'#475569'}}>This will replace all groups and variants with the bundled defaults and save immediately.</div>
              </div>
            </div>
            <div style={{display:'flex',gap:8}}>
              <button className="btn secondary" onClick={cancelReset}>Cancel</button>
              <button className="btn" onClick={confirmResetAndSave} style={{
                background: 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)',
                border: 'none',
                color: '#fff',
                borderRadius: 9999,
                padding: '10px 16px',
                fontWeight: 600,
                boxShadow: '0 10px 24px rgba(249,115,22,0.35)'
              }}>Reset & Save</button>
            </div>
          </div>
        )}

        {showAddGroupBar && (
          <div style={{marginBottom:12,padding:12,display:'flex',alignItems:'center',justifyContent:'space-between',background:'linear-gradient(90deg,#eef2ff,#f8fafc)',borderRadius:10,boxShadow:'0 6px 18px rgba(2,6,23,0.04)',border:'1px solid #c7d2fe'}}>
            <div style={{display:'flex',alignItems:'center',gap:12}}>
              <div style={{width:40,height:40,display:'flex',alignItems:'center',justifyContent:'center',background:'#eef2ff',borderRadius:8,fontWeight:700}}>＋</div>
              <div style={{display:'flex',gap:8,alignItems:'center'}}>
                <input id="newGroupInput" value={newGroupName} onChange={e=>setNewGroupName(e.target.value)} placeholder="New group name (e.g. Cake)" style={{padding:8,borderRadius:8,border:'1px solid #e6e9ef'}} />
                <button className="btn" onClick={confirmAddGroup} style={{
                  background: 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)',
                  color: '#fff', border: 'none', borderRadius: 9999, padding: '8px 14px', fontWeight: 600
                }}>Add</button>
                <button className="btn secondary" onClick={cancelAddGroup}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        {showAddVariantBar && (
          <div style={{marginBottom:12,padding:12,display:'flex',alignItems:'center',justifyContent:'space-between',background:'linear-gradient(90deg,#ecfdf5,#f0fdf4)',borderRadius:10,boxShadow:'0 6px 18px rgba(4,120,87,0.04)',border:'1px solid #bbf7d0'}}>
            <div style={{display:'flex',alignItems:'center',gap:12}}>
              <div style={{width:40,height:40,display:'flex',alignItems:'center',justifyContent:'center',background:'#dcfce7',borderRadius:8,fontWeight:700}}>⋯</div>
              <div style={{display:'flex',gap:8,alignItems:'center'}}>
                <input id="newVariantInput" value={newVariantLabel} onChange={e=>setNewVariantLabel(e.target.value)} placeholder="Variant label (e.g. 1kg)" style={{padding:8,borderRadius:8,border:'1px solid #e6e9ef'}} />
                <input value={newVariantPrice} onChange={e=>setNewVariantPrice(e.target.value)} placeholder="Price" style={{padding:8,borderRadius:8,border:'1px solid #e6e9ef',width:100}} />
                <button className="btn" onClick={confirmAddVariant} style={{
                  background: 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)',
                  color: '#fff', border: 'none', borderRadius: 9999, padding: '8px 14px', fontWeight: 600
                }}>Add</button>
                <button className="btn secondary" onClick={cancelAddVariant}>Cancel</button>
              </div>
            </div>
          </div>
        )}
        <div className="crud-top" style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12}}>
          <div style={{display:'flex',gap:8}}>
            <button className="btn" onClick={addGroup} style={{
              background: 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)',
              color: '#fff', border: 'none', borderRadius: 9999, padding: '8px 14px', fontWeight: 600
            }}>+ Add Group</button>
            <button className="btn" onClick={addVariant} disabled={!selectedGroup} style={{
              background: 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)',
              color: '#fff', border: 'none', borderRadius: 9999, padding: '8px 14px', fontWeight: 600
            }}>+ Add Variant</button>
            <button className="btn secondary" onClick={resetDefaults}>Reset to Defaults</button>
          </div>
          <div style={{color:'#6b7280'}}>{ackStatus || status}</div>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'240px 1fr',gap:18,marginTop:14}}>
          <aside style={{borderRight:'1px solid #f1f5f9',paddingRight:12}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
              <strong>Product groups</strong>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {groups.length === 0 ? <div className="muted">No groups</div> : groups.map(g => (
                <div key={g} className={`side-btn ${g===selectedGroup ? 'active' : ''}`} style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div style={{cursor:'pointer'}} onClick={()=>setSelectedGroup(g)}>{g.replace(/([A-Z])/g,' $1').trim()}</div>
                  <div style={{display:'flex',gap:6}}>
                    <button className="side-small-btn" onClick={()=>{
                      setSelectedGroup(g);
                      setRenameValue(g.replace(/([A-Z])/g,' $1').trim());
                      setRenaming(true);
                      setTimeout(()=>{ try{ renameInputRef.current && renameInputRef.current.focus(); }catch(e){} },50);
                    }}>Rename</button>
                    <button className="side-small-btn" onClick={()=>removeGroup(g)} style={{
                      background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', color:'#fff', border:'none', borderRadius:9999
                    }}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </aside>

          <section>
            <div style={{marginTop:0,marginBottom:10}}>
              {selectedGroup ? (
                <input
                  ref={renameInputRef}
                  aria-label="Group name"
                  value={renameValue}
                  onChange={(e)=>setRenameValue(e.target.value)}
                  onBlur={()=>{ commitRename(); }}
                  onKeyDown={(e)=>{ if(e.key === 'Enter'){ commitRename(); } if(e.key === 'Escape'){ setRenameValue(selectedGroup.replace(/([A-Z])/g,' $1').trim()); setRenaming(false); } }}
                  style={{fontSize:18,fontWeight:700,border:0,outline:'none',background:'transparent',padding:0}}
                />
              ) : (
                <h3 style={{marginTop:0,marginBottom:10}}>Select a group</h3>
              )}
            </div>
            {selectedGroup ? (
              <div>
                <table style={{width:'100%',borderCollapse:'collapse'}}>
                  <thead>
                    <tr style={{textAlign:'left',borderBottom:'1px solid #eef2f6'}}>
                      <th style={{padding:'8px 6px'}}>Variant</th>
                      <th style={{padding:'8px 6px',width:140}}>Price (Birr)</th>
                      <th style={{padding:'8px 6px',width:120}}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(products[selectedGroup] || []).map((v,idx) => (
                      <tr key={idx} style={{borderBottom:'1px solid #f6f8fb'}}>
                        <td style={{padding:8}}>
                          <input value={v.label} onChange={(e)=>updateVariant(idx,{label:e.target.value})} style={{width:'100%',padding:8,borderRadius:6,border:'1px solid #e6e9ef'}} />
                        </td>
                        <td style={{padding:8}}>
                          <input value={v.value} onChange={(e)=>{ const val = Number(e.target.value||0); updateVariant(idx,{value: val}); }} style={{width:'100%',padding:8,borderRadius:6,border:'1px solid #e6e9ef'}} />
                        </td>
                        <td style={{padding:8}}>
                          <button className="side-small-btn" onClick={()=>removeVariant(idx)}>Remove</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div style={{display:'flex',gap:8,marginTop:12,alignItems:'center'}}>
                  <button className="btn" onClick={()=>persist(products)} disabled={!dirty}>Save Changes</button>
                  <button className="btn secondary" onClick={()=>{ const current = (store && store.products) || DEFAULT_PRODUCTS; setProducts(current); setSelectedGroup(Object.keys(current)[0]||''); setStatus('No changes'); setDirty(false); setTimeout(()=>setStatus(''),1200); }}>Cancel</button>
                  <div style={{marginLeft:12,color:'#6b7280',fontSize:13}}>{ackStatus}</div>
                </div>
              </div>
            ) : (
              <div className="muted">Select a product group to edit its variants and prices.</div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
