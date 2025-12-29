import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Cashier.css";
import { createBroadcaster } from '../../utils/broadcast';
import { PRODUCTS, CATEGORY_ICONS } from '../../data/products';

function formatBirr(v){ return Number(v || 0).toFixed(2) + ' Birr'; }

function loadStore(){
  try{
    const raw = localStorage.getItem('bakery_app_v1');
    return raw ? JSON.parse(raw) : { products: PRODUCTS, sales: [], notifications: [] };
  }catch(e){ return { products: PRODUCTS, sales: [], notifications: [] }; }
}

export default function Cashier(){
  const navigate = useNavigate();
  const [store, setStore] = useState(() => loadStore());
  const [receipts, setReceipts] = useState(() => (loadStore().sales || []).map(s => ({...s, timestamp: new Date(s.saleDate || s.timestamp || Date.now())})));
  
  // UI State
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [variantModal, setVariantModal] = useState(null); // { key: 'Dabo', variants: [] }
  const [showHistory, setShowHistory] = useState(false);

  // Cart State
  const [cart, setCart] = useState([]);
  const [payment, setPayment] = useState('Cash');
  // Discount removed per request; always 0
  const discount = 0;
  const [showCompletion, setShowCompletion] = useState(false);
  const [lastReceipt, setLastReceipt] = useState(null);
  const [cashierName, setCashierName] = useState(() => {
    try{ return localStorage.getItem('bakery_app_auth') ? JSON.parse(localStorage.getItem('bakery_app_auth')).user.username : 'Cashier #1'; }catch(e){ return 'Cashier #1'; }
  });
  const [isNameLocked, setIsNameLocked] = useState(() => {
    try{ return localStorage.getItem('bakery_cashier_name_locked') === 'true'; }catch(e){ return false; }
  });
  const currentUserName = (()=>{ try{ return JSON.parse(sessionStorage.getItem('bakery_app_auth')||'{}').user?.username || ''; }catch(e){ return ''; }})();

  const broadcaster = useMemo(() => createBroadcaster('bakery_updates'), []);

  // also listen on the default broadcast channel to reply ACKs for product updates
  const defaultBroadcaster = useMemo(() => createBroadcaster(), []);

  // per-tab id so ACKs can identify origin (matches Sales implementation)
  const tabId = (()=>{
    try{
      let id = sessionStorage.getItem('bakery_tab_id');
      if(!id){ id = 'tab-' + Date.now().toString(36) + '-' + Math.floor(Math.random()*10000); sessionStorage.setItem('bakery_tab_id', id); }
      return id;
    }catch(e){ return 'tab-local'; }
  })();

  useEffect(()=>{
    const off = defaultBroadcaster.listen(msg => {
      try{
        if(!msg || !msg.type) return;
        // reply to product updates with an ACK so the editor sees confirmation
        if(msg.type === 'product:update'){
          const { id, from } = msg;
          // ignore our own posts
          if(from && from === tabId) return;
          try{ defaultBroadcaster.post({ type: 'product:update:ack', id, from: tabId }); }catch(e){}
        }
      }catch(e){}
    });
    return ()=>{ try{ off(); }catch(e){} };
  }, [defaultBroadcaster]);

  function logoutCashier(){
    try{
      sessionStorage.removeItem('bakery_app_auth');
      sessionStorage.removeItem('bakery_user_role');
      localStorage.removeItem('bakery_app_auth');
      localStorage.removeItem('bakery_app_auth_cashier');
      localStorage.removeItem('bakery_force_logout_cashier');
    }catch(e){}
    navigate('/login', { replace: true });
  }

  // Heartbeat presence for cashier role so admin can see online status
  useEffect(()=>{
    function beat(){
      try{
        const sessionUser = (()=>{ try{ return JSON.parse(sessionStorage.getItem('bakery_app_auth')||'{}').user?.username || ''; }catch(e){ return ''; }})();
        const localUser = (()=>{ try{ return JSON.parse(localStorage.getItem('bakery_app_auth_cashier')||'{}').user?.username || ''; }catch(e){ return ''; }})();
        const user = sessionUser || localUser || cashierName || 'cashier';
        localStorage.setItem('bakery_presence_cashier', JSON.stringify({ role:'cashier', user, timestamp: Date.now() }));
      }catch(e){}
    }
    beat();
    const id = setInterval(beat, 15000);
    return ()=> clearInterval(id);
  }, [cashierName]);

  // Persist cashier name
  useEffect(() => {
    try {
      const auth = JSON.parse(localStorage.getItem('bakery_app_auth') || '{}');
      if (!auth.user) auth.user = {};
      auth.user.username = cashierName;
      localStorage.setItem('bakery_app_auth', JSON.stringify(auth));
    } catch (e) {}
  }, [cashierName]);

  // Persist lock state
  useEffect(() => {
    try{
      localStorage.setItem('bakery_cashier_name_locked', String(isNameLocked));
      // track who locked it; used to allow other cashiers to edit
      if(isNameLocked){
        localStorage.setItem('bakery_cashier_name_locked_for', cashierName || currentUserName || '');
      }
    }catch(e){}
  }, [isNameLocked]);

  // If a different cashier logs in, unlock the field so they can set their name
  useEffect(()=>{
    try{
      const lockedFor = localStorage.getItem('bakery_cashier_name_locked_for') || '';
      const sessionUser = currentUserName;
      if(lockedFor && sessionUser && lockedFor !== sessionUser){
        setIsNameLocked(false);
      }
    }catch(e){}
  }, []);

  // Sync store
  useEffect(()=>{
    function onStorage(e){
      if(e && e.key){
        if(e.key === 'bakery_force_logout_cashier'){
          try{
            sessionStorage.removeItem('bakery_app_auth');
            sessionStorage.removeItem('bakery_user_role');
            localStorage.removeItem('bakery_app_auth_cashier');
          }catch(err){}
          navigate('/login?next=/cashier', { replace: true });
          return;
        }
        if(e.key !== 'bakery_app_v1') return;
      }
      try{
        const st = JSON.parse(localStorage.getItem('bakery_app_v1') || '{}');
        if(st){ setStore(st); }
      }catch(e){ }
    }
    window.addEventListener('storage', onStorage);
    // check flag on mount in case it was set earlier
    try{
      if(localStorage.getItem('bakery_force_logout_cashier')){
        sessionStorage.removeItem('bakery_app_auth');
        sessionStorage.removeItem('bakery_user_role');
        localStorage.removeItem('bakery_app_auth_cashier');
        navigate('/login?next=/cashier', { replace: true });
      }
    }catch(err){}
    return ()=>{ window.removeEventListener('storage', onStorage); };
  }, []);

  // Session controls removed; cashier operates without starting/ending sessions.

  // Cart Logic
  function addToCart(productKey, variant){
    // allow adding to cart without session gating
    const productLabel = `${productKey} - ${variant.label}`;
    const existingIdx = cart.findIndex(item => item.productLabel === productLabel && item.price === variant.value);
    
    if(existingIdx >= 0){
      setCart(prev => {
        const next = [...prev];
        const item = { ...next[existingIdx] };
        item.qty += 1;
        item.subtotal = item.qty * item.price;
        next[existingIdx] = item;
        return next;
      });
    } else {
      setCart(prev => [...prev, {
        productKey,
        productLabel,
        priceLabel: String(variant.value),
        price: Number(variant.value),
        qty: 0,
        subtotal: 0
      }]);
    }
    setVariantModal(null);
  }

  function updateQty(idx, delta){
    setCart(prev => {
      const next = [...prev];
      const item = { ...next[idx] };
      const newQty = item.qty + delta;
      if(newQty < 0) return prev;
      item.qty = newQty;
      item.subtotal = item.qty * item.price;
      next[idx] = item;
      return next;
    });
  }

  function handleManualQty(idx, val){
    let newQty = parseInt(val);
    if(isNaN(newQty)) newQty = 0;
    if(newQty < 0) return;
    setCart(prev => {
      const next = [...prev];
      const item = { ...next[idx] };
      item.qty = newQty;
      item.subtotal = item.qty * item.price;
      next[idx] = item;
      return next;
    });
  }

  function removeItem(idx){
    setCart(prev => prev.filter((_, i) => i !== idx));
  }

  function clearCart(){
    // Clear immediately without confirmation
    setCart([]);
  }

  function completePurchase(){
    // proceed without session gating
    if(cart.length === 0) return;
    // prevent completing if any selected item has no quantity
    if(cart.some(i => i.qty === 0)) return;

    const subtotal = cart.reduce((s,it) => s + it.subtotal, 0);
    const total = subtotal; // no discount applied
    
    const timestamp = new Date();
    const receipt = {
      saleId: `S-${timestamp.getTime()}`,
      cashier: cashierName,
      paymentMethod: payment,
      saleDate: timestamp.toISOString(),
      items: cart.map(it => ({ name: it.productLabel, quantity: it.qty, price: it.price, subtotal: it.subtotal })),
      total: total,
      totalAmount: total,
      discount: discount
    };

    const nextStore = {...store};
    nextStore.sales = nextStore.sales || [];
    nextStore.sales.push(receipt);
    setStore(nextStore);
    localStorage.setItem('bakery_app_v1', JSON.stringify(nextStore));
    try { window.dispatchEvent(new Event('sales-updated')); } catch (e) {}
    // Broadcast the sale
    broadcaster.post({ type: 'SALE_ADDED', sale: receipt });

    setCart([]);
    // discount removed
    setReceipts(r => ([...r, {...receipt, timestamp}]));
    try{ playBeep(); }catch(e){}

    // Show completion sign briefly
    setLastReceipt(receipt);
    setShowCompletion(true);
    // hide after 2.5 seconds
    setTimeout(()=>setShowCompletion(false), 2500);
  }

  function playBeep(){ try{ const ctx = new (window.AudioContext || window.webkitAudioContext)(); const o = ctx.createOscillator(); const g = ctx.createGain(); o.type='sine'; o.frequency.value=900; g.gain.value=0.1; o.connect(g); g.connect(ctx.destination); o.start(); setTimeout(()=>o.stop(), 100); }catch(e){} }

  // Product Grid Logic
  const productMap = (store && store.products) ? store.products : PRODUCTS;
  const categories = ['All', ...Object.keys(productMap)];
  
  const filteredProducts = Object.keys(productMap).filter(key => {
    if(activeCategory !== 'All' && key !== activeCategory) return false;
    if(searchQuery && !key.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const handleProductClick = (key) => {
    const variants = productMap[key];
    if(!variants || variants.length === 0) return;
    if(variants.length === 1){
      addToCart(key, variants[0]);
    } else {
      setVariantModal({ key, variants });
    }
  };

  const cartSubtotal = cart.reduce((s, i) => s + i.subtotal, 0);
  const cartTotal = cartSubtotal; // no discount applied
  const totalQty = cart.reduce((s,i)=>s+i.qty,0);
  const hasZeroQtyItem = cart.some(i => i.qty === 0);

  return (
    <div className="cashier-root">
      {/* Top Bar */}
      <div className="pos-topbar">
        <div className="pos-brand">
          <span>⚡</span> Bakery POS
        </div>
        <div className="pos-actions">
          <div className="cashier-name-group">
            <span className="cng-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-700">
                <circle cx="12" cy="8" r="4" />
                <path d="M6 20v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
              </svg>
            </span>
            <input 
              className="px-3 py-1.5 rounded-md border border-amber-200 bg-white/80 text-[14px] focus:outline-none focus:ring-2 focus:ring-orange-400/70 focus:border-orange-400 placeholder:text-amber-700/60 shadow-sm"
              value={cashierName}
              onChange={e => setCashierName(e.target.value)}
              placeholder="Cashier Name"
              disabled={isNameLocked}
            />
            <button
              type="button"
              onClick={()=>{ if(!cashierName.trim()) return; setIsNameLocked(true); }}
              className="ml-2 inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold text-white bg-gradient-to-r from-orange-500 to-amber-500 hover:brightness-105 focus:outline-none focus:ring-2 focus:ring-orange-400 disabled:opacity-60"
              disabled={isNameLocked}
              title={isNameLocked ? 'Name saved' : 'Save name'}
            >
              Save
            </button>
            {isNameLocked && (
              <button
                type="button"
                onClick={()=>{ setIsNameLocked(false); }}
                className="ml-2 inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold text-amber-800 border border-amber-300 bg-white/80 hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-orange-400"
                title="Edit name"
              >
                Edit
              </button>
            )}
          </div>
          {/* Session buttons removed: cashier works without starting/ending sessions */}
          <button className="btn secondary" onClick={()=>setShowHistory(!showHistory)}>History</button>
          <button
            onClick={logoutCashier}
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-red-500 to-red-600 text-white px-4 py-2 shadow hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-red-400 transition"
            title="Logout"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h2" />
              <path d="M16 17l5-5-5-5" />
              <path d="M21 12H9" />
            </svg>
            <span className="font-semibold">Logout</span>
          </button>
        </div>
      </div>

      <div className="pos-layout">
        {/* Left: Products */}
        <div className="pos-products-area">
          <div className="pos-search-bar">
            <svg className="search-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input 
              className="pos-search-input" 
              placeholder="Search products..." 
              value={searchQuery}
              onChange={e=>setSearchQuery(e.target.value)}
            />
          </div>

          <div className="pos-categories">
            {categories.map(cat => (
              <button 
                key={cat} 
                className={`cat-pill ${activeCategory === cat ? 'active' : ''}`}
                onClick={()=>setActiveCategory(cat)}
              >
                {CATEGORY_ICONS[cat]} {cat}
              </button>
            ))}
          </div>

          <div className="pos-grid">
            {filteredProducts.map(key => {
              const variants = productMap[key];
              const priceDisplay = variants.length > 1 
                ? `${variants[0].value} - ${variants[variants.length-1].value}`
                : variants[0]?.value;
              
              return (
                <div key={key} className="product-card" onClick={()=>handleProductClick(key)}>
                  <div className="pc-icon">{CATEGORY_ICONS[key] || '📦'}</div>
                  <div className="pc-name">{key}</div>
                  <div className="pc-price">{priceDisplay} Birr</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Cart */}
        <div className="pos-cart-area">
          <div className="cart-header">
            <div className="cart-title">
              Current Order
              <span className="cart-count">{cart.reduce((s,i)=>s+i.qty,0)}</span>
            </div>
            {cart.length > 0 && <button className="btn ghost" style={{color: 'var(--danger)', fontSize:13}} onClick={clearCart}>Clear</button>}
          </div>

          <div className="cart-items">
            {cart.length === 0 ? (
              <div style={{textAlign:'center', color:'var(--muted)', marginTop: 60}}>
                <div style={{fontSize:48, marginBottom:16, opacity:0.5}}>🛒</div>
                <div style={{fontWeight:500}}>Cart is empty</div>
                <div style={{fontSize:13, marginTop:4}}>Select products to start</div>
              </div>
            ) : (
              cart.map((item, idx) => (
                <div key={idx} className="cart-item">
                  <div className="ci-info">
                    <div className="ci-name">{item.productLabel}</div>
                    <div className="ci-price">{formatBirr(item.price)}</div>
                  </div>
                  <div className="ci-controls">
                    <button className="qty-btn" onClick={()=>updateQty(idx, -1)}>−</button>
                    <input 
                      className="qty-input" 
                      type="number" 
                      value={item.qty === 0 ? '' : item.qty}
                      placeholder="0"
                      onChange={(e)=>handleManualQty(idx, e.target.value)}
                      onFocus={(e)=>e.target.select()}
                    />
                    <button className="qty-btn" onClick={()=>updateQty(idx, 1)}>+</button>
                    <button className="del-btn" onClick={()=>removeItem(idx)}>🗑</button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="cart-footer">
            <div className="cf-row">
              <label>Payment</label>
              <select 
                className="cf-select"
                value={payment} 
                onChange={e=>setPayment(e.target.value)}
              >
                <option>Cash</option>
                <option>Telebirr</option>
                <option>Bank</option>
              </select>
            </div>
            <div className="cf-row">
              <span>Subtotal</span>
              <span style={{fontWeight:600, color:'var(--text)'}}>{formatBirr(cartSubtotal)}</span>
            </div>
            <div className="cf-total">
              <span>Total</span>
              <span>{formatBirr(cartTotal)}</span>
            </div>
            <button 
              className="pay-btn" 
              disabled={cart.length === 0 || totalQty === 0 || hasZeroQtyItem}
              onClick={completePurchase}
            >
              <span>Complete Sale</span>
              <span>→</span>
            </button>
          </div>
        </div>
      </div>

      {/* Variant Modal */}
      {variantModal && (
        <div className="variant-modal-overlay" onClick={()=>setVariantModal(null)}>
          <div className="variant-modal" onClick={e=>e.stopPropagation()}>
            <h3 style={{marginTop:0, marginBottom: 8}}>Select {variantModal.key} Variant</h3>
            <p style={{color:'var(--muted)', fontSize:14, marginBottom: 20}}>Choose a specific item to add to cart</p>
            <div className="vm-grid">
              {variantModal.variants.map((v, i) => (
                <button key={i} className="vm-btn" onClick={()=>addToCart(variantModal.key, v)}>
                  <span className="vm-label">{v.label}</span>
                  <span className="vm-price">{v.value} Birr</span>
                </button>
              ))}
            </div>
            <button className="btn secondary" style={{width:'100%', marginTop: 24, padding: 14}} onClick={()=>setVariantModal(null)}>Cancel</button>
          </div>
        </div>
      )}

      {/* History Modal (Simple View) */}
      {showHistory && (
        <div className="variant-modal-overlay" onClick={()=>setShowHistory(false)}>
          <div className="variant-modal" style={{width: 600}} onClick={e=>e.stopPropagation()}>
            <h3 style={{marginTop:0}}>Recent Sales</h3>
            <div style={{maxHeight: 400, overflowY: 'auto', marginTop: 16}}>
              {receipts.length === 0 && <div style={{padding:20, textAlign:'center', color:'var(--muted)'}}>No sales yet</div>}
              {receipts.slice().reverse().slice(0, 20).map((r, i) => (
                <div key={i} style={{padding: 12, borderBottom: '1px solid #eee', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                  <div>
                    <div style={{fontWeight:700, fontSize:15}}>{formatBirr(r.total || r.totalAmount)}</div>
                    <div style={{fontSize:12, color:'#666'}}>{new Date(r.timestamp).toLocaleString()}</div>
                  </div>
                  <div style={{textAlign:'right'}}>
                    <div style={{fontSize:13, fontWeight:600}}>{r.paymentMethod}</div>
                    <div style={{fontSize:12, color:'#999'}}>{r.items.length} items</div>
                  </div>
                </div>
              ))}
            </div>
            <button className="btn secondary" style={{width:'100%', marginTop: 24}} onClick={()=>setShowHistory(false)}>Close</button>
          </div>
        </div>
      )}

      {/* Completion overlay shown briefly after sale */}
      {showCompletion && (
        <div className="completion-overlay" onClick={()=>setShowCompletion(false)}>
          <div className="completion-card" onClick={e=>e.stopPropagation()}>
            <div className="completion-check">✓</div>
            <div className="completion-msg">Sale completed</div>
            {lastReceipt && <div className="completion-sub">{formatBirr(lastReceipt.total || lastReceipt.totalAmount)}</div>}
          </div>
        </div>
      )}
    </div>
  );
}

