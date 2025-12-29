// Storage keys
const BAKERY_KEY = 'bakery_app_v1';
const LEGACY_KEY = 'cashir_receipts_v1';
// role key used to track logged-in role (used by admin/login flow)
const ROLE_KEY = 'bakery_user_role';
let receipts = [];
let storeObj = null;
try{
  storeObj = JSON.parse(localStorage.getItem(BAKERY_KEY)) || {products:[],productPrices:[],sales:[]};
  // migrate legacy receipts if present
  const legacyRaw = localStorage.getItem(LEGACY_KEY);
  if(legacyRaw){
    try{
      const legacy = JSON.parse(legacyRaw);
      legacy.forEach(r => {
        const ts = r.timestamp ? new Date(r.timestamp).toISOString() : new Date().toISOString();
        const sale = {
          saleId: r.saleId || 'S-'+(new Date(ts)).getTime(),
          cashier: r.cashier || r.cashierName || 'Cashier',
          paymentMethod: r.payment || r.paymentMethod || 'Cash',
          saleDate: r.saleDate || ts,
          items: Array.isArray(r.items) ? r.items.map(it => ({ productId: it.productKey || it.productId, productName: it.productLabel || it.productName || '', price: it.price || it.priceValue || 0, quantity: it.qty || it.quantity || 1, subtotal: it.subtotal || it.total || 0 })) : [],
          total: Number(r.totalAmount || r.total || r.subtotal || 0)
        };
        storeObj.sales = storeObj.sales || [];
        if(!storeObj.sales.find(s=> (s.saleDate||s.timestamp) === sale.saleDate && s.total === sale.total)) storeObj.sales.push(sale);
      });
      // optionally remove legacy key to avoid re-migration
      // localStorage.removeItem(LEGACY_KEY);
      try{ localStorage.setItem(BAKERY_KEY, JSON.stringify(storeObj)); }catch(e){}
    }catch(e){}
  }
  receipts = (storeObj.sales || []).map(s => ({
    ...s,
    timestamp: new Date(s.saleDate || s.timestamp || Date.now()),
    payment: s.paymentMethod || s.payment || '',
    totalAmount: s.total || s.totalAmount || 0,
    items: Array.isArray(s.items) ? s.items.map(it => ({ productLabel: it.productName || it.productLabel || '', priceLabel: it.priceLabel || '', qty: it.quantity || it.qty || 1, price: it.price || 0, subtotal: it.subtotal || it.total || 0 })) : []
  }));
} catch(e){ receipts = []; storeObj = {products:[],productPrices:[],sales:[]}; }

const priceEl = document.getElementById('price');
const productEl = document.getElementById('productSelect');
const qtyEl = document.getElementById('qty');
const paymentEl = document.getElementById('payment');
const subtotalEl = document.getElementById('subtotal');
const completeBtn = document.getElementById('completeBtn');
const resetBtn = document.getElementById('resetBtn');
const overlay = document.getElementById('overlay');
const cashierNameInput = document.getElementById('cashierNameInput');
const historyList = document.getElementById('historyList');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');
const historyDateEl = document.getElementById('historyDate');
const prevDateBtn = document.getElementById('prevDateBtn');
const nextDateBtn = document.getElementById('nextDateBtn');
const todayHistoryBtn = document.getElementById('todayHistoryBtn');
const resetAfterPrint = document.getElementById('resetAfterPrint');
const modeMulti = document.getElementById('modeMulti');
const modeSingle = document.getElementById('modeSingle');
const singleSaleBtn = document.getElementById('singleSaleBtn');
const cartArea = document.getElementById('cartArea');

const rItems = document.getElementById('r-items');
const rPayment = document.getElementById('r-payment');
const rSubtotal = document.getElementById('r-subtotal');
const rDate = document.getElementById('r-date');
const rCashier = document.getElementById('r-cashier');

const printBtn = document.getElementById('printBtn');
const downloadBtn = document.getElementById('downloadBtn');
const addItemBtn = document.getElementById('addItemBtn');
const cartListEl = document.getElementById('cartList');
const cartTotalEl = document.getElementById('cartTotal');
const clearCartBtn = document.getElementById('clearCartBtn');
const logoutBtn = document.getElementById('logoutBtn');
const summaryBtn = document.getElementById('summaryBtn');
const summaryOverlay = document.getElementById('summaryOverlay');
const closeSummaryBtn = document.getElementById('closeSummaryBtn');
const downloadSummaryBtn = document.getElementById('downloadSummaryBtn');
const sumTeleCount = document.getElementById('sum-tele-count');
const sumTeleRev = document.getElementById('sum-tele-rev');
const sumCashCount = document.getElementById('sum-cash-count');
const sumCashRev = document.getElementById('sum-cash-rev');
const sumBankCount = document.getElementById('sum-bank-count');
const sumBankRev = document.getElementById('sum-bank-rev');
const sumItems = document.getElementById('sum-items');
const sumTotalRev = document.getElementById('sum-total-rev');
const startDayBtn = document.getElementById('startDayBtn');
const dayStatusEl = document.getElementById('dayStatus');
const startResetBtn = document.getElementById('startResetBtn');
const sessionNotice = document.getElementById('sessionNotice');
const forceEndBtn = document.getElementById('forceEndBtn');
const successPopup = document.getElementById('successPopup');
const successMsgEl = document.getElementById('successMsg');
const zoomInBtn = document.getElementById('zoomInBtn');
const zoomOutBtn = document.getElementById('zoomOutBtn');
const zoomResetBtn = document.getElementById('zoomResetBtn');

// Optional cashier name placeholder (default from input if present)
const cashierName = cashierNameInput && cashierNameInput.value ? cashierNameInput.value : 'Cashier #1';

// Format currency
function formatBirr(v){
  return Number(v).toFixed(2) + ' Birr';
}

// Toast helper with optional Undo
const toastEl = document.getElementById('toast');
const toastMsg = document.getElementById('toastMsg');
const toastUndoBtn = document.getElementById('toastUndo');
let _toastTimer = null;
function showToast(msg = 'Saved', ms = 1800, actionCallback = null, actionLabel = 'Undo'){
  if(!toastEl) return;
  // set message
  if(toastMsg) toastMsg.textContent = msg;
  // setup undo button
  if(actionCallback && toastUndoBtn){
    toastUndoBtn.style.display = 'inline-block';
    // set label
    toastUndoBtn.textContent = actionLabel || 'Undo';
    // remove previous handler
    toastUndoBtn.onclick = (e)=>{
      e.preventDefault();
      try{ actionCallback(); }catch(err){}
      hideToast();
    };
  } else if(toastUndoBtn){
    toastUndoBtn.style.display = 'none';
    toastUndoBtn.onclick = null;
  }

  toastEl.classList.remove('hide');
  toastEl.classList.add('show');
  toastEl.style.display = 'flex';
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(()=>{ hideToast(); }, ms);
}

// Success popup for end-of-day confirmation
let _successTimer = null;
function showSuccess(msg = 'Done', ms = 4000){
  try{
    if(!successPopup) return;
    if(successMsgEl) successMsgEl.textContent = msg;
    successPopup.style.display = 'block';
    // reset timer
    if(_successTimer) clearTimeout(_successTimer);
    _successTimer = setTimeout(()=>{ try{ successPopup.style.display = 'none'; }catch(e){}; _successTimer = null; }, ms);
  }catch(e){}
}

function hideToast(){
  if(!toastEl) return;
  toastEl.classList.remove('show');
  toastEl.classList.add('hide');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(()=>{ toastEl.style.display = 'none'; }, 220);
}

// Short beep using Web Audio API (no external file)
function playBeep(freq = 1000, duration = 80, volume = 0.02){
  try{
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if(!AudioCtx) return;
    const ctx = new AudioCtx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.value = freq;
    g.gain.value = volume;
    o.connect(g);
    g.connect(ctx.destination);
    o.start();
    setTimeout(()=>{
      o.stop();
      try{ ctx.close(); }catch(e){}
    }, duration);
  }catch(e){/* ignore audio errors */}
}

// PRODUCTS mapping: productKey -> array of {label, value}
const PRODUCTS = {
  Dabo: [
    {label:'Dabo - 8.00', value:8}, {label:'Dabo - 9.00', value:9}, {label:'Dabo - 10.00', value:10}, {label:'Dabo - 15.00', value:15},
    {label:'Dabo - 20.00', value:20}, {label:'Dabo - 25.00', value:25}, {label:'Dabo - 30.00', value:30}, {label:'Dabo - 40.00', value:40}, {label:'Dabo - 50.00', value:50}
  ],
  DFO: [
    {label:'DFO - 60.00', value:60}, {label:'DFO - 80.00', value:80}, {label:'DFO - 120.00', value:120}, {label:'DFO - 160.00', value:160},
    {label:'DFO - 200.00', value:200}, {label:'DFO - 350.00', value:350}, {label:'DFO - 500.00', value:500}
  ],
  Cake: [
    {label:'Slice - 50.00', value:50}, {label:'Venus - 50.00', value:50}, {label:'Chocolate - 50.00', value:50}, {label:'Kurebat - 50.00', value:50},
    {label:'Dry - 50.00', value:50}, {label:'Gato - 50.00', value:50}, {label:'Maffin - 50.00', value:50}, {label:'Coruscant - 50.00', value:50},
    {label:'Danish - 50.00', value:50}, {label:'Cream cake gateau - 100.00', value:100}, {label:'Candy - 70.00', value:70}, {label:'Chocolate (large) - 70.00', value:70},
    {label:'Black Forest - 70.00', value:70}, {label:'White Forest - 70.00', value:70}, {label:'Milliphone - 70.00', value:70}, {label:'Opera - 70.00', value:70}, {label:'Strawberry - 70.00', value:70}
  ],
  Torta: [
    {label:'Torta White - 1kg 800.00', value:800}, {label:'Torta White - 1.5kg 1100.00', value:1100}, {label:'Torta White - 2kg 1600.00', value:1600},
    {label:'Black Torta - 1kg 900.00', value:900}, {label:'Black Torta - 1.5kg 1200.00', value:1200}, {label:'Black Torta - 0.5kg 600.00', value:600}
  ],
  Donut: [ {label:'Mini Donut - 50.00', value:50}, {label:'Regular Donut - 50.00', value:50} ],
  Cookies: [ {label:'1kg - 500.00', value:500}, {label:'1/2 kg - 250.00', value:250}, {label:'1/4 kg - 125.00', value:125} ],
  BreadCorn: [ {label:'1kg - 400.00', value:400}, {label:'1/2 - 200.00', value:200}, {label:'1/4 - 100.00', value:100} ],
  Baklava: [ {label:'Wrapped - 85.00', value:85}, {label:'Unwrapped - 60.00', value:60} ],
  KeshKesh: [ {label:'1kg - 200.00', value:200}, {label:'1/2 kg - 100.00', value:100}, {label:'1/4 kg - 50.00', value:50}, {label:'1/8 kg - 25.00', value:25} ],
  Other: [ {label:'Kita - 40.00', value:40}, {label:'Biscuit - 25.00', value:25}, {label:'Horse Biscuit - 30.00', value:30}, {label:'Toast - 50.00', value:50},
           {label:'Sabusa - 25.00', value:25}, {label:'Spring - 30.00', value:30}, {label:'Fetira - 100.00', value:100} ],
  Erteb: [ {label:'Normal - 50.00', value:50}, {label:'Bekechap - 60.00', value:60}, {label:'Special - 100.00', value:100} ]
};

function populateProductSelect(){
  if(!productEl) return;
  productEl.innerHTML = '';
  Object.keys(PRODUCTS).forEach(k => {
    const opt = document.createElement('option');
    opt.value = k; opt.textContent = k.replace(/([A-Z])/g,' $1').trim();
    productEl.appendChild(opt);
  });
}

function populatePriceVariants(productKey){
  if(!priceEl) return;
  priceEl.innerHTML = '';
  const arr = PRODUCTS[productKey] || [];
  if(arr.length === 0){
    const o = document.createElement('option'); o.value = '0'; o.textContent = '0.00'; priceEl.appendChild(o); return;
  }
  arr.forEach(item => {
    const opt = document.createElement('option'); opt.value = String(item.value); opt.textContent = item.label; priceEl.appendChild(opt);
  });
}

// --- Cart support (multiple items per sale)
let cart = [];
let saleMode = 'multi'; // 'multi' or 'single'

function renderCart(){
  if(!cartListEl) return;
  cartListEl.innerHTML = '';
  if(cart.length === 0){ cartListEl.textContent = 'No items in cart'; cartTotalEl.textContent = formatBirr(0); return; }
  let total = 0;
  cart.forEach((it, i) => {
    const row = document.createElement('div');
    row.style.display = 'flex'; row.style.justifyContent='space-between'; row.style.alignItems='center'; row.style.padding='6px 0';
    const left = document.createElement('div'); left.innerHTML = `<div style="font-weight:600">${it.productLabel} — ${it.priceLabel}</div><div style="font-size:12px;color:var(--muted)">${it.qty} × ${formatBirr(it.price)}</div>`;
    const right = document.createElement('div');
    const rem = document.createElement('button'); rem.className='side-small-btn'; rem.textContent='Remove'; rem.addEventListener('click', ()=>{ cart.splice(i,1); renderCart(); });
    right.appendChild(rem);
    row.appendChild(left); row.appendChild(right);
    cartListEl.appendChild(row);
    total += Number(it.subtotal|| (it.price * it.qty) ) || 0;
  });
  cartTotalEl.textContent = formatBirr(total);
}

function addCurrentSelectionToCart(){
  const productKey = productEl ? productEl.value : 'Item';
  const productLabel = productEl ? productEl.options[productEl.selectedIndex].textContent : 'Item';
  const price = Number(priceEl.value || 0);
  const priceLabel = priceEl ? (priceEl.options[priceEl.selectedIndex] && priceEl.options[priceEl.selectedIndex].textContent) || String(price) : String(price);
  let qty = Number(qtyEl.value || 1);
  if(!isFinite(qty) || qty <= 0) qty = 1;
  const subtotal = price * qty;
  const item = { productKey, productLabel, priceLabel, price, qty, subtotal };
  cart.push(item);
  renderCart();
}

if(addItemBtn){ addItemBtn.addEventListener('click', ()=>{
  if(!isSessionActive()){
    alert('Please start the day before recording sales. Click "Start Today\'s Sale".');
    return;
  }
  addCurrentSelectionToCart(); qtyEl.value = '1'; updateSubtotal(); try{ qtyEl.focus(); qtyEl.select(); }catch(e){}
}); }
if(clearCartBtn){ clearCartBtn.addEventListener('click', ()=>{ if(!cart.length) return; if(!confirm('Clear cart?')) return; cart = []; renderCart(); }); }

// Sale mode toggle
function updateSaleMode(){
  saleMode = (modeSingle && modeSingle.checked) ? 'single' : 'multi';
  // hide cart area in single mode
  if(cartArea) cartArea.style.display = saleMode === 'single' ? 'none' : '';
  // show/hide single sale button
  if(singleSaleBtn) singleSaleBtn.style.display = saleMode === 'single' ? 'inline-block' : 'none';
  // disable add item when single
  if(addItemBtn) addItemBtn.disabled = (!isSessionActive()) || (saleMode === 'single');
  if(singleSaleBtn) singleSaleBtn.disabled = !isSessionActive();
}
if(modeMulti) modeMulti.addEventListener('change', updateSaleMode);
if(modeSingle) modeSingle.addEventListener('change', updateSaleMode);
// initialize
updateSaleMode();

if(productEl){
  productEl.addEventListener('change', ()=>{
    populatePriceVariants(productEl.value);
    if(priceEl.options && priceEl.options.length) priceEl.value = priceEl.options[0].value;
    updateSubtotal();
  });
}

function updateSubtotal(){
  const price = Number(priceEl.value || 0);
  // parse quantity robustly (allow blank but treat as 0)
  const qRaw = qtyEl.value;
  let qty = 0;
  if(qRaw !== null && qRaw !== undefined && String(qRaw).trim() !== ''){
    qty = Number(qRaw);
    if(!isFinite(qty) || qty < 0) qty = 0;
    qty = Math.floor(qty);
  }
  const sub = price * qty;
  subtotalEl.textContent = formatBirr(sub);
  return {sub, qty, price};
}

// Live updates
priceEl.addEventListener('change', updateSubtotal);
qtyEl.addEventListener('input', updateSubtotal);
// payment doesn't change subtotal but keep UI consistent
paymentEl.addEventListener('change', updateSubtotal);

completeBtn.addEventListener('click', ()=>{
  if(!isSessionActive()){
    alert('Please start the day before recording sales. Click "Start Today\'s Sale".');
    return;
  }
  // if in single mode, behave like single sale (use current selection only)
  if(saleMode === 'single'){
    doSingleSale();
    return;
  }

  // Multi-item sale flow (existing behavior)
  // If cart is empty, offer to add the current selection as a single-item sale
  if(cart.length === 0){
    const {sub: subtotal, qty, price} = updateSubtotal();
    if(qty <= 0){ alert('Please enter a valid quantity (1 or more).'); qtyEl.focus(); return; }
    if(!confirm('Cart is empty. Add current selection to cart and complete sale?')) return;
    addCurrentSelectionToCart();
  }

  const timestamp = new Date();
  const payment = paymentEl.value || '';
  const cashier = cashierNameInput.value || 'Cashier';

  // build receipt from cart
  const items = cart.map(it => ({ productKey: it.productKey, productLabel: it.productLabel, priceLabel: it.priceLabel, price: it.price, qty: it.qty, subtotal: it.subtotal }));
  const totalAmount = items.reduce((s,it)=> s + Number(it.subtotal|| (it.price*it.qty) ), 0);

  const receipt = { items, totalAmount, payment, timestamp, cashier };

  // persist receipt into canonical bakery store
  try{
    const sale = {
      saleId: `S-${timestamp.getTime()}`,
      cashier,
      paymentMethod: payment,
      saleDate: timestamp.toISOString(),
      items: items.map(it => ({ productId: it.productKey, productName: it.productLabel, price: it.price, quantity: it.qty, subtotal: it.subtotal })),
      total: Number(totalAmount)
    };
    storeObj.sales = storeObj.sales || [];
    storeObj.sales.push(sale);
    try{ localStorage.setItem(BAKERY_KEY, JSON.stringify(storeObj)); }catch(e){}
    // update in-memory receipts for UI (normalized with timestamp)
    receipts.push({...sale, timestamp: new Date(sale.saleDate)});
  }catch(e){ console.error(e); }

  renderHistory();
  try{ if(historyList){ historyList.scrollTop = 0; } }catch(e){}

  // remember id for undo
  const lastId = timestamp.getTime();
  showToast('Sale recorded', 6000, ()=>{
    // find by timestamp and remove from both in-memory receipts and persisted bakery store
    const idx = receipts.map(r=> (r.timestamp instanceof Date ? r.timestamp.getTime() : new Date(r.timestamp).getTime())).lastIndexOf(lastId);
    if(idx >= 0){
      const ts = receipts[idx].timestamp instanceof Date ? receipts[idx].timestamp.toISOString() : new Date(receipts[idx].timestamp).toISOString();
      receipts.splice(idx,1);
      try{
        storeObj.sales = (storeObj.sales || []).filter(s => (s.saleDate || s.timestamp) !== ts);
        localStorage.setItem(BAKERY_KEY, JSON.stringify(storeObj));
      }catch(e){ console.error(e); }
      renderHistory();
      showToast('Sale removed', 1600);
    } else {
      showToast('Unable to undo', 1600);
    }
  });

  // clear cart and update UI
  cart = [];
  renderCart();

  // play beep and focus quantity for next sale
  try{ playBeep(900, 80, 0.02); }catch(e){}
  try{ qtyEl.focus(); qtyEl.select(); }catch(e){}
  
});

// Single sale handler (create sale using current selection only)
function doSingleSale(){
  if(!isSessionActive()){
    alert('Please start the day before recording sales. Click "Start Today\'s Sale".');
    try{ qtyEl.focus(); }catch(e){}
    return;
  }
  const {sub: subtotal, qty, price} = updateSubtotal();
  if(qty <= 0){ alert('Please enter a valid quantity (1 or more).'); qtyEl.focus(); return; }
  const priceVal = Number(priceEl.value || 0);
  const productKey = productEl ? productEl.value : 'Item';
  const productLabel = productEl ? productEl.options[productEl.selectedIndex].textContent : 'Item';
  const priceLabel = priceEl ? (priceEl.options[priceEl.selectedIndex] && priceEl.options[priceEl.selectedIndex].textContent) || String(priceVal) : String(priceVal);
  const item = { productKey, productLabel, priceLabel, price: priceVal, qty, subtotal };

  const timestamp = new Date();
  const payment = paymentEl.value || '';
  const cashier = cashierNameInput.value || 'Cashier';

  // persist single sale to bakery store
  try{
    const sale = {
      saleId: `S-${timestamp.getTime()}`,
      cashier,
      paymentMethod: payment,
      saleDate: timestamp.toISOString(),
      items: [{ productId: item.productKey, productName: item.productLabel, price: item.price, quantity: item.qty, subtotal: item.subtotal }],
      total: Number(item.subtotal || 0)
    };
    storeObj.sales = storeObj.sales || [];
    storeObj.sales.push(sale);
    try{ localStorage.setItem(BAKERY_KEY, JSON.stringify(storeObj)); }catch(e){}
    receipts.push({...sale, timestamp: new Date(sale.saleDate)});
  }catch(e){ console.error(e); }

  renderHistory();
  try{ if(historyList){ historyList.scrollTop = 0; } }catch(e){}

  const lastId = timestamp.getTime();
  showToast('Single sale recorded', 6000, ()=>{
    const idx = receipts.map(r=> (r.timestamp instanceof Date ? r.timestamp.getTime() : new Date(r.timestamp).getTime())).lastIndexOf(lastId);
    if(idx >= 0){
      const ts = receipts[idx].timestamp instanceof Date ? receipts[idx].timestamp.toISOString() : new Date(receipts[idx].timestamp).toISOString();
      receipts.splice(idx,1);
      try{ storeObj.sales = (storeObj.sales || []).filter(s => (s.saleDate || s.timestamp) !== ts); localStorage.setItem(BAKERY_KEY, JSON.stringify(storeObj)); }catch(e){ console.error(e); }
      renderHistory();
      showToast('Sale removed', 1600);
    } else { showToast('Unable to undo', 1600); }
  });

  // Show receipt modal for this single sale
  rItems.innerHTML = `<div style="display:flex;justify-content:space-between;margin:6px 0"><span>${item.productLabel} ${item.priceLabel ? '('+item.priceLabel+')' : ''} × ${item.qty}</span><strong>${formatBirr(item.subtotal)}</strong></div>`;
  rSubtotal.textContent = formatBirr(item.subtotal);
  rPayment.textContent = payment;
  rDate.textContent = timestamp.toLocaleString();
  rCashier.textContent = cashier;
  overlay.classList.add('show'); overlay.setAttribute('aria-hidden','false');

  // reset quantity for next entry
  qtyEl.value = '1'; updateSubtotal(); qtyEl.focus(); qtyEl.select();
}

// Single sale button click
if(singleSaleBtn){ singleSaleBtn.addEventListener('click', ()=>{ doSingleSale(); }); }

// Close overlay when clicking outside receipt
overlay.addEventListener('click', (e)=>{
  if(e.target === overlay){
    overlay.classList.remove('show');
    overlay.setAttribute('aria-hidden','true');
      try{ releaseFocusTrap(); }catch(e){}
  }
});

// Print receipt by opening a new window with receipt content
printBtn.addEventListener('click', ()=>{
  const last = receipts[receipts.length-1];
  if(!last) return;
  const ts = last.timestamp instanceof Date ? last.timestamp : new Date(last.timestamp);
  // build items HTML
  let itemsHtml = '';
  if(Array.isArray(last.items) && last.items.length){
    itemsHtml = '<div>' + last.items.map(it => `<div style="display:flex;justify-content:space-between;margin:6px 0"><span>${it.productLabel} ${it.priceLabel ? '('+it.priceLabel+')' : ''} × ${it.qty}</span><strong>${formatBirr(it.subtotal|| (it.price*it.qty))}</strong></div>`).join('') + '</div>';
  } else {
    // fallback to legacy fields
    itemsHtml = `<div style="display:flex;justify-content:space-between;margin:6px 0"><span>Price</span><strong>${formatBirr(last.price||0)}</strong></div><div style="display:flex;justify-content:space-between;margin:6px 0"><span>Quantity</span><strong>${last.qty||0}</strong></div>`;
  }

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Receipt</title>
  <style>body{font-family:Arial,Helvetica,sans-serif;padding:20px}h2{margin-top:0} .line{display:flex;justify-content:space-between;margin:6px 0}</style>
  </head><body>
  <h2>Receipt</h2>
  ${itemsHtml}
  <div style="display:flex;justify-content:space-between;margin:6px 0"><span>Payment</span><strong>${last.payment||''}</strong></div>
  <div style="display:flex;justify-content:space-between;margin:6px 0"><span>Total</span><strong>${formatBirr(last.totalAmount||last.subtotal||0)}</strong></div>
  <div style="display:flex;justify-content:space-between;margin:6px 0"><span>Date</span><strong>${ts.toLocaleString()}</strong></div>
  <div style="display:flex;justify-content:space-between;margin:6px 0"><span>Cashier</span><strong>${last.cashier||''}</strong></div>
  <script>window.onload=function(){window.print();};</script>
  </body></html>`;

  const w = window.open('', '_blank');
  if(w){
    w.document.open();
    w.document.write(html);
    w.document.close();
    if(resetAfterPrint && resetAfterPrint.checked){
      setTimeout(()=>{
        overlay.classList.remove('show');
        if(priceEl.options && priceEl.options.length) priceEl.value = priceEl.options[0].value;
        qtyEl.value = '1'; paymentEl.value = paymentEl.options && paymentEl.options.length ? paymentEl.options[0].value : 'Telebirr'; updateSubtotal();
      },300);
    }
  } else {
    alert('Popup blocked. Please allow popups to print.');
  }
});

// Download receipt as simple text file
downloadBtn.addEventListener('click', ()=>{
  const last = receipts[receipts.length-1];
  if(!last) return;
  const ts = last.timestamp instanceof Date ? last.timestamp : new Date(last.timestamp);
  let lines = ['Receipt'];
  if(Array.isArray(last.items) && last.items.length){
    last.items.forEach(it => lines.push(`${it.productLabel} ${it.priceLabel ? '('+it.priceLabel+')' : ''} — ${it.qty} × ${formatBirr(it.price)} = ${formatBirr(it.subtotal|| (it.price*it.qty))}`));
    lines.push(`Total: ${formatBirr(last.totalAmount||0)}`);
  } else {
    lines.push(`Price: ${last.price} Birr`);
    lines.push(`Quantity: ${last.qty}`);
    lines.push(`Subtotal: ${last.subtotal} Birr`);
  }
  lines.push(`Payment: ${last.payment||''}`);
  lines.push(`Date: ${ts.toLocaleString()}`);
  lines.push(`Cashier: ${last.cashier||''}`);
  const text = lines.join('\n');
  const blob = new Blob([text], {type:'text/plain'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = `receipt-${ts.getTime()}.txt`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
});

resetBtn.addEventListener('click', ()=>{
  if(priceEl.options && priceEl.options.length) priceEl.value = priceEl.options[0].value;
  qtyEl.value = '1';
  paymentEl.value = paymentEl.options && paymentEl.options.length ? paymentEl.options[0].value : 'Telebirr';
  updateSubtotal();
});

// Render history list
function renderHistory(){
  if(!historyList) return;
  historyList.innerHTML = '';
  // If a day session is active, classify receipts by that session's start->end window.
  const sess = storeObj && storeObj.daySession;
  let filtered = [];
  if(sess && sess.start){
    // determine window
    const startMs = new Date(sess.start).getTime();
    const endMs = sess.end ? new Date(sess.end).getTime() : Date.now();
    // disable calendar navigation while viewing session
    try{ if(historyDateEl) historyDateEl.disabled = true; }catch(e){}
    try{ if(prevDateBtn) prevDateBtn.disabled = true; }catch(e){}
    try{ if(nextDateBtn) nextDateBtn.disabled = true; }catch(e){}
    try{ if(todayHistoryBtn) todayHistoryBtn.disabled = true; }catch(e){}
    // update the dayStatus to reflect session view (non-destructive)
    try{ if(dayStatusEl) dayStatusEl.textContent = 'Viewing session: ' + new Date(startMs).toLocaleString() + ' → ' + (sess.end ? new Date(endMs).toLocaleString() : 'Now'); }catch(e){}
    filtered = receipts.filter(r => {
      try{ const ts = r.timestamp instanceof Date ? r.timestamp.getTime() : new Date(r.timestamp).getTime(); return ts >= startMs && ts <= endMs; }catch(e){ return false; }
    });
  } else {
    // no active session: enable calendar navigation and filter by selected date
    try{ if(historyDateEl) historyDateEl.disabled = false; }catch(e){}
    try{ if(prevDateBtn) prevDateBtn.disabled = false; }catch(e){}
    try{ if(nextDateBtn) nextDateBtn.disabled = false; }catch(e){}
    try{ if(todayHistoryBtn) todayHistoryBtn.disabled = false; }catch(e){}
    const dateFilter = selectedHistoryDate || (new Date()).toISOString().slice(0,10);
    filtered = receipts.filter(r => {
      try{ const ts = r.timestamp instanceof Date ? r.timestamp : new Date(r.timestamp); return ts.toISOString().slice(0,10) === dateFilter; }catch(e){ return false; }
    });
  }
  if(filtered.length === 0){
    historyList.innerHTML = '<div style="color:var(--muted)">No receipts for this date</div>';
    return;
  }
  filtered.slice().reverse().forEach((r, idx)=>{
    const div = document.createElement('div');
    div.style.padding = '8px';
    div.style.border = '1px solid #f0f0f0';
    div.style.borderRadius = '8px';
    div.style.display = 'flex';
    div.style.justifyContent = 'space-between';
    const left = document.createElement('div');
    const ts = r.timestamp instanceof Date ? r.timestamp : new Date(r.timestamp);
    // summary: show total and item count when available
    if(Array.isArray(r.items) && r.items.length){
      left.innerHTML = `<div style="font-weight:600">${formatBirr(r.totalAmount||0)} — ${r.items.length} item(s)</div><div style="font-size:12px;color:var(--muted)">${ts.toLocaleString()} • ${r.payment}</div>`;
    } else {
      left.innerHTML = `<div style="font-weight:600">${formatBirr(r.price)} × ${r.qty} = ${formatBirr(r.subtotal)}</div><div style="font-size:12px;color:var(--muted)">${ts.toLocaleString()} • ${r.payment}</div>`;
    }
    const actions = document.createElement('div');
    const btn = document.createElement('button');
    btn.className = 'btn'; btn.style.padding = '6px 8px'; btn.style.fontSize='13px'; btn.textContent = 'View';
    btn.addEventListener('click', ()=>{
      // populate receipt modal items list
      if(r.items && Array.isArray(r.items) && r.items.length){
        rItems.innerHTML = r.items.map(it => `<div style="display:flex;justify-content:space-between;margin:6px 0"><span>${it.productLabel} ${it.priceLabel ? '('+it.priceLabel+')' : ''} × ${it.qty}</span><strong>${formatBirr(it.subtotal|| (it.price*it.qty))}</strong></div>`).join('');
        rSubtotal.textContent = formatBirr(r.totalAmount || 0);
      } else {
        rItems.innerHTML = `<div style="text-align:right">${formatBirr(r.price)} × ${r.qty} = ${formatBirr(r.subtotal)}</div>`;
        rSubtotal.textContent = formatBirr(r.subtotal || 0);
      }
      rPayment.textContent = r.payment || '';
      rDate.textContent = ts.toLocaleString();
      rCashier.textContent = r.cashier || 'Cashier';

      // populate the main form with the first item so subtotal responds to selected purchase
      try{
        if(r.items && r.items.length){
          const first = r.items[0];
          if(productEl){ productEl.value = first.productKey; populatePriceVariants(productEl.value); }
          if(priceEl && priceEl.options){
            // try to set variant by exact price match
            const match = Array.from(priceEl.options).find(o => Number(o.value) === Number(first.price));
            if(match) priceEl.value = match.value; else if(priceEl.options.length) priceEl.value = priceEl.options[0].value;
          }
          qtyEl.value = String(first.qty);
        } else {
          // legacy single-item
          if(priceEl) priceEl.value = String(r.price);
          qtyEl.value = String(r.qty || 1);
        }
        if(paymentEl) paymentEl.value = r.payment || (paymentEl.options && paymentEl.options[0] && paymentEl.options[0].value);
        updateSubtotal();
      }catch(e){}
      overlay.classList.add('show'); overlay.setAttribute('aria-hidden','false');
      try{ focusTrap(document.querySelector('.receipt')); }catch(e){}
    });
    actions.appendChild(btn);
    div.appendChild(left); div.appendChild(actions);
    historyList.appendChild(div);
  });
}

// Clear history
if(clearHistoryBtn){
  clearHistoryBtn.addEventListener('click', ()=>{
    if(!confirm('Clear all saved receipts?')) return;
    receipts = [];
    try{ storeObj.sales = []; localStorage.setItem(BAKERY_KEY, JSON.stringify(storeObj)); }catch(e){}
    renderHistory();
  });
}

// History date navigation: track selected date (ISO yyyy-mm-dd)
let selectedHistoryDate = (new Date()).toISOString().slice(0,10);
function setHistoryDate(iso){ selectedHistoryDate = iso; if(historyDateEl) historyDateEl.value = iso; renderHistory(); }

// wire date controls
if(historyDateEl){ historyDateEl.value = selectedHistoryDate; historyDateEl.addEventListener('change', ()=>{ if(historyDateEl.value) setHistoryDate(historyDateEl.value); }); }
if(prevDateBtn){ prevDateBtn.addEventListener('click', ()=>{ const d = new Date(selectedHistoryDate); d.setDate(d.getDate()-1); setHistoryDate(d.toISOString().slice(0,10)); }); }
if(nextDateBtn){ nextDateBtn.addEventListener('click', ()=>{ const d = new Date(selectedHistoryDate); d.setDate(d.getDate()+1); setHistoryDate(d.toISOString().slice(0,10)); }); }
if(todayHistoryBtn){ todayHistoryBtn.addEventListener('click', ()=>{ setHistoryDate((new Date()).toISOString().slice(0,10)); }); }

// initial render
renderHistory();

// Utility: checks if a date is today
function isToday(date){
  const d = date instanceof Date ? date : new Date(date);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

// --- Saved summaries storage (daily + weekly)
const DAILY_SUM_KEY = 'cashir_daily_summaries_v1';
const WEEKLY_SUM_KEY = 'cashir_weekly_summaries_v1';
let dailySummaries = [];
let weeklySummaries = {};
try{
  const s = localStorage.getItem(DAILY_SUM_KEY);
  if(s) dailySummaries = JSON.parse(s);
}catch(e){ dailySummaries = []; }
try{
  const w = localStorage.getItem(WEEKLY_SUM_KEY);
  if(w) weeklySummaries = JSON.parse(w);
}catch(e){ weeklySummaries = {}; }

function formatDateISO(d){ const dt = d instanceof Date ? d : new Date(d); return dt.toISOString().slice(0,10); }

function getWeekStartISO(d){
  const dt = d instanceof Date ? new Date(d) : new Date(d);
  // compute Monday as week start
  const day = dt.getDay(); // 0 Sun - 6 Sat
  const diff = (day + 6) % 7; // days since Monday
  dt.setDate(dt.getDate() - diff);
  dt.setHours(0,0,0,0);
  return dt.toISOString().slice(0,10);
}

function saveDailySummaryObject(summary){
  // summary must include date (Date), items, totalRev, byMethod {Telebirr, Cash, Bank}
  const entry = {
    date: (summary.date instanceof Date) ? summary.date.toISOString() : new Date(summary.date).toISOString(),
    items: summary.items || 0,
    totalRev: summary.totalRev || 0,
    byMethod: summary.byMethod || {Telebirr:{count:0,rev:0},Cash:{count:0,rev:0},Bank:{count:0,rev:0}}
  };
  // avoid duplicate for same day (replace)
  const dayKey = entry.date.slice(0,10);
  dailySummaries = dailySummaries.filter(d => d.date.slice(0,10) !== dayKey);
  dailySummaries.push(entry);
  try{ localStorage.setItem(DAILY_SUM_KEY, JSON.stringify(dailySummaries)); }catch(e){}

  // update weekly aggregate
  const weekKey = getWeekStartISO(new Date(entry.date));
  if(!weeklySummaries[weekKey]) weeklySummaries[weekKey] = {items:0,totalRev:0,byMethod:{Telebirr:{count:0,rev:0},Cash:{count:0,rev:0},Bank:{count:0,rev:0}}};
  // recompute weekly from all dailySummaries for that week (simple and safe)
  const weekEntries = dailySummaries.filter(d => getWeekStartISO(d.date) === weekKey);
  const agg = {items:0,totalRev:0,byMethod:{Telebirr:{count:0,rev:0},Cash:{count:0,rev:0},Bank:{count:0,rev:0}}};
  weekEntries.forEach(wd => {
    agg.items += Number(wd.items||0);
    agg.totalRev += Number(wd.totalRev||0);
    ['Telebirr','Cash','Bank'].forEach(m => { agg.byMethod[m].count += Number((wd.byMethod&&wd.byMethod[m]&&wd.byMethod[m].count)||0); agg.byMethod[m].rev += Number((wd.byMethod&&wd.byMethod[m]&&wd.byMethod[m].rev)||0); });
  });
  weeklySummaries[weekKey] = agg;
  try{ localStorage.setItem(WEEKLY_SUM_KEY, JSON.stringify(weeklySummaries)); }catch(e){}

  renderSavedSummaries();
}

const savedSummariesList = document.getElementById('savedSummariesList');
function renderSavedSummaries(){
  if(!savedSummariesList) return;
  savedSummariesList.innerHTML = '';
  const dTitle = document.createElement('div'); dTitle.textContent = 'Daily Summaries'; dTitle.style.fontWeight='600'; dTitle.style.marginBottom='6px'; savedSummariesList.appendChild(dTitle);
  if(dailySummaries.length === 0){ const n = document.createElement('div'); n.style.color='var(--muted)'; n.textContent='No saved daily summaries'; savedSummariesList.appendChild(n); }
  dailySummaries.slice().reverse().forEach(d => {
    const item = document.createElement('div'); item.style.marginBottom='6px'; item.style.fontSize='13px';
    const day = d.date.slice(0,10);
    item.innerHTML = `${day} — ${formatBirr(d.totalRev)} <button class="side-small-btn" data-day="${day}">View</button>`;
    const btn = item.querySelector('button'); btn.addEventListener('click', ()=>{ viewSavedDaily(day); });
    savedSummariesList.appendChild(item);
  });

  const wTitle = document.createElement('div'); wTitle.textContent = 'Weekly Summaries'; wTitle.style.fontWeight='600'; wTitle.style.margin='12px 0 6px 0'; savedSummariesList.appendChild(wTitle);
  const keys = Object.keys(weeklySummaries).sort().reverse();
  if(keys.length === 0){ const n = document.createElement('div'); n.style.color='var(--muted)'; n.textContent='No weekly summaries'; savedSummariesList.appendChild(n); }
  keys.forEach(k => {
    const w = weeklySummaries[k];
    const item = document.createElement('div'); item.style.marginBottom='6px'; item.style.fontSize='13px';
    item.innerHTML = `${k} — ${formatBirr(w.totalRev)} <button class="side-small-btn" data-week="${k}">View</button>`;
    const btn = item.querySelector('button'); btn.addEventListener('click', ()=>{ viewSavedWeekly(k); });
    savedSummariesList.appendChild(item);
  });
}

function viewSavedDaily(dayKey){
  const found = dailySummaries.find(d => d.date.slice(0,10) === dayKey);
  if(!found) return;
  // populate summary modal fields
  sumTeleCount.textContent = found.byMethod.Telebirr.count;
  sumTeleRev.textContent = formatBirr(found.byMethod.Telebirr.rev);
  sumCashCount.textContent = found.byMethod.Cash.count;
  sumCashRev.textContent = formatBirr(found.byMethod.Cash.rev);
  sumBankCount.textContent = found.byMethod.Bank.count;
  sumBankRev.textContent = formatBirr(found.byMethod.Bank.rev);
  sumItems.textContent = found.items;
  sumTotalRev.textContent = formatBirr(found.totalRev);
  if(summaryOverlay){ summaryOverlay.classList.add('show'); summaryOverlay.setAttribute('aria-hidden','false'); }
}

function viewSavedWeekly(weekKey){
  const w = weeklySummaries[weekKey];
  if(!w) return;
  sumTeleCount.textContent = w.byMethod.Telebirr.count;
  sumTeleRev.textContent = formatBirr(w.byMethod.Telebirr.rev);
  sumCashCount.textContent = w.byMethod.Cash.count;
  sumCashRev.textContent = formatBirr(w.byMethod.Cash.rev);
  sumBankCount.textContent = w.byMethod.Bank.count;
  sumBankRev.textContent = formatBirr(w.byMethod.Bank.rev);
  sumItems.textContent = w.items;
  sumTotalRev.textContent = formatBirr(w.totalRev);
  if(summaryOverlay){ summaryOverlay.classList.add('show'); summaryOverlay.setAttribute('aria-hidden','false'); }
}

// initial render of saved summaries
renderSavedSummaries();

// --- Day session control: allow cashier to start the day's sales and auto-end at 20:00
let _autoEndTimer = null;
let _countdownTimer = null;
function getNextTargetDate(from, hour=20){
  const d = from ? new Date(from) : new Date();
  const target = new Date(d);
  target.setHours(hour,0,0,0);
  if(d.getTime() >= target.getTime()) target.setDate(target.getDate() + 1);
  return target;
}

function clearAutoTimers(){
  try{ if(_autoEndTimer){ clearTimeout(_autoEndTimer); clearInterval(_autoEndTimer); _autoEndTimer = null; } }catch(e){}
  try{ if(_countdownTimer){ clearInterval(_countdownTimer); _countdownTimer = null; } }catch(e){}
  try{ if(dayStatusEl) { dayStatusEl.classList.remove('urgent'); } }catch(e){}
}

function startCountdown(target){
  try{
    clearInterval(_countdownTimer);
    _countdownTimer = setInterval(()=>{
      const now = new Date();
      const diff = target.getTime() - now.getTime();
        if(diff <= 0){
          dayStatusEl.textContent = 'Time left: 00:00:00';
          clearInterval(_countdownTimer); _countdownTimer = null;
          try{ endTodaysSale(); }catch(e){}
          return;
        }
      const hrs = String(Math.floor(diff / (1000*60*60))).padStart(2,'0');
      const mins = String(Math.floor((diff % (1000*60*60)) / (1000*60))).padStart(2,'0');
      const secs = String(Math.floor((diff % (1000*60)) / 1000)).padStart(2,'0');
      const sess = storeObj && storeObj.daySession;
      if(sess && sess.start && !sess.end){
        const st = new Date(sess.start);
        dayStatusEl.textContent = 'Started: ' + st.toLocaleString() + ' • Time left: ' + hrs + ':' + mins + ':' + secs;
      } else {
        dayStatusEl.textContent = 'Time left: ' + hrs + ':' + mins + ':' + secs;
      }
      // Add subtle urgent pulse when less than 10 minutes remaining
      try{
        if(dayStatusEl){
          if(diff <= (10 * 60 * 1000)){
            dayStatusEl.classList.add('urgent');
          } else {
            dayStatusEl.classList.remove('urgent');
          }
        }
      }catch(e){}
    }, 1000);
  }catch(e){}
}

function scheduleAutoEnd(){
  try{
    if(!storeObj || !storeObj.daySession || storeObj.daySession.end) return;
    const now = new Date();
    const target = getNextTargetDate(now, 20); // 20:00
    const ms = target.getTime() - now.getTime();
    // clear any previous timers
    clearAutoTimers();
    if(ms > 2147483647){
      // if timeout too large for setTimeout, use interval check every hour
      _autoEndTimer = setInterval(()=>{ if(new Date() >= target){ clearInterval(_autoEndTimer); _autoEndTimer = null; endTodaysSale(); } }, 60*60*1000);
    } else {
      _autoEndTimer = setTimeout(()=>{ endTodaysSale(); }, ms);
    }
    // start a visible countdown to the target
    try{ startCountdown(target); }catch(e){}
    updateDayUI();
  }catch(e){}
}

function updateDayUI(){
  if(!startDayBtn) return;
  const sess = storeObj && storeObj.daySession;
  if(sess && sess.start && !sess.end){
    // session active: lock the button so cashier cannot manually end/start until countdown completes
    startDayBtn.textContent = "End Today's Sale (locked)";
    startDayBtn.disabled = true;
    startDayBtn.title = 'Auto-ends at 20:00; manual end disabled until countdown finishes';
    // ensure countdown reflects the next 20:00 from now
    const target = getNextTargetDate(new Date(), 20);
    try{ startCountdown(target); }catch(e){}
    // enable sales controls while session is active
    try{ if(addItemBtn) addItemBtn.disabled = false; }catch(e){}
    try{ if(completeBtn) completeBtn.disabled = false; }catch(e){}
    try{ if(singleSaleBtn) singleSaleBtn.disabled = false; }catch(e){}
    try{ if(sessionNotice) sessionNotice.style.display = 'none'; }catch(e){}
    try{ if(forceEndBtn) forceEndBtn.disabled = false; }catch(e){}
  } else {
    // no active session
    startDayBtn.textContent = "Start Today's Sale";
    startDayBtn.disabled = false;
    startDayBtn.title = '';
    if(dayStatusEl) dayStatusEl.textContent = '';
    clearAutoTimers();
    // disable sales controls until day is started
    try{ if(addItemBtn) addItemBtn.disabled = true; }catch(e){}
    try{ if(completeBtn) completeBtn.disabled = true; }catch(e){}
    try{ if(singleSaleBtn) singleSaleBtn.disabled = true; }catch(e){}
    try{ if(sessionNotice) sessionNotice.style.display = 'inline-block'; }catch(e){}
    try{ if(forceEndBtn) forceEndBtn.disabled = false; }catch(e){}
  }
  // whenever day UI changes, refresh the history view so it reflects session-based filtering
  try{ renderHistory(); }catch(e){}
}

// Helper: true when a day session has been started and not yet ended
function isSessionActive(){
  try{ const s = storeObj && storeObj.daySession; return !!(s && s.start && !s.end); }catch(e){ return false; }
}

function startTodaysSale(){
  try{
    if(!storeObj) storeObj = {products:[],productPrices:[],sales:[]};
    storeObj.daySession = { start: new Date().toISOString(), end: null };
    try{ localStorage.setItem(BAKERY_KEY, JSON.stringify(storeObj)); }catch(e){}
    showToast('Day started', 2000);
    scheduleAutoEnd();
    updateDayUI();
  }catch(e){ console.error(e); }
}

function endTodaysSale(){
  try{
    if(!storeObj || !storeObj.daySession || storeObj.daySession.end) return;
    storeObj.daySession.end = new Date().toISOString();
    try{ localStorage.setItem(BAKERY_KEY, JSON.stringify(storeObj)); }catch(e){}
    // compute and save today's summary
    try{ calculateSummary(); }catch(err){}
  showToast('Day ended — summary saved', 7000, ()=>{ try{ window.location.href = 'daily-summary.html'; }catch(e){} }, 'View');
  // also show a clear success popup with a green checkmark
  try{ showSuccess('Daily summaries done', 5000); }catch(e){}
    clearAutoTimers();
    updateDayUI();
  }catch(e){ console.error(e); }
}

if(startDayBtn){ startDayBtn.addEventListener('click', ()=>{
  const sess = storeObj && storeObj.daySession;
  // if session is active and locked, ignore manual clicks
  if(sess && sess.start && !sess.end){
    // button should be disabled, but guard against direct clicks: inform user
    try{ alert('Cannot end the day manually. The session will auto-end at 20:00.'); }catch(e){}
    return;
  }
  // when not active, allow starting
  startTodaysSale();
}); }

// Manual force end handler: end the day now regardless of scheduled time, or run summary if no session
if(forceEndBtn){ forceEndBtn.addEventListener('click', ()=>{
  try{
    const sess = storeObj && storeObj.daySession;
    if(sess && sess.start && !sess.end){
      if(!confirm('End the day now? This will close the session and run the end-of-day summary.')) return;
      // call the existing end flow
      endTodaysSale();
      return;
    }
    // no active session: run a manual summary (does not create or end a session)
    if(!confirm('No active session detected. Run daily summary now?')) return;
    try{ calculateSummary(); }catch(e){}
    try{ showToast('Manual summary saved', 4000); }catch(e){}
    try{ showSuccess('Daily summaries done', 4000); }catch(e){}
  }catch(e){ console.error(e); }
}); }

// Cancel / reset the started session (useful when started by mistake)
if(startResetBtn){
  startResetBtn.addEventListener('click', ()=>{
    if(!confirm("Cancel today's start? This will clear the started session.")) return;
    try{
      if(storeObj && storeObj.daySession){
        delete storeObj.daySession;
        try{ localStorage.setItem(BAKERY_KEY, JSON.stringify(storeObj)); }catch(e){}
      }
      // clear timers and update UI
      try{ clearAutoTimers(); }catch(e){}
      if(dayStatusEl) dayStatusEl.textContent = '';
      if(startDayBtn){ startDayBtn.disabled = false; startDayBtn.textContent = "Start Today's Sale"; startDayBtn.title = ''; }
      showToast('Start cancelled', 2000);
    }catch(e){ console.error(e); }
  });
}

// If a session was already started (persisted), set UI and schedule auto-end
try{ if(storeObj && storeObj.daySession && storeObj.daySession.start && !storeObj.daySession.end){ scheduleAutoEnd(); } updateDayUI(); }catch(e){}

// Sidebar nav handlers (Sales / Summaries)
const navSales = document.getElementById('navSales');
const navSummaries = document.getElementById('navSummaries');
if(navSales && navSummaries){
  navSales.addEventListener('click', ()=>{
    navSales.classList.add('active'); navSummaries.classList.remove('active');
    // focus sales area: scroll main content to top
    document.getElementById('mainContent').scrollIntoView({behavior:'smooth'});
  });
  navSummaries.addEventListener('click', ()=>{
    // navigate to the daily summaries page for a fuller view
    try{ window.location.href = 'daily-summary.html'; }catch(e){
      // fallback: toggle view and scroll to saved summaries
      navSummaries.classList.add('active'); navSales.classList.remove('active');
      if(savedSummariesList) savedSummariesList.scrollIntoView({behavior:'smooth'});
    }
  });
}

// Calculate summary for today's receipts and populate modal
function calculateSummary(){
  const byMethod = {Telebirr:{count:0,rev:0}, Cash:{count:0,rev:0}, Bank:{count:0,rev:0}};
  let items = 0;
  let totalRev = 0;
  // collect today's receipts for detailed listing
  const receiptsToday = [];
  receipts.forEach(r => {
    try{
      if(!r.timestamp) return;
      const ts = r.timestamp instanceof Date ? r.timestamp : new Date(r.timestamp);
      if(!isToday(ts)) return; // only today's sales
      receiptsToday.push(r);
      const method = (r.payment || '').toLowerCase();
      // support multi-item receipts: compute revenue and items from r.items when present
      let rev = 0; let qtyForItems = 0;
      if(Array.isArray(r.items) && r.items.length){
        r.items.forEach(it => { rev += Number(it.subtotal || (it.price * it.qty)) || 0; qtyForItems += Number(it.qty || 0); });
      } else {
        rev = Number(r.subtotal || (r.price * r.qty) ) || 0;
        qtyForItems = Number(r.qty || 0);
      }
      items += qtyForItems;
      totalRev += rev;
      if(method.includes('tele')){
        byMethod.Telebirr.count += 1; byMethod.Telebirr.rev += rev;
      } else if(method.includes('bank')){
        byMethod.Bank.count += 1; byMethod.Bank.rev += rev;
      } else {
        // treat others as Cash
        byMethod.Cash.count += 1; byMethod.Cash.rev += rev;
      }
    }catch(e){/* ignore malformed entry */}
  });

  // populate the modal elements
  sumTeleCount.textContent = byMethod.Telebirr.count;
  sumTeleRev.textContent = formatBirr(byMethod.Telebirr.rev);
  sumCashCount.textContent = byMethod.Cash.count;
  sumCashRev.textContent = formatBirr(byMethod.Cash.rev);
  sumBankCount.textContent = byMethod.Bank.count;
  sumBankRev.textContent = formatBirr(byMethod.Bank.rev);
  sumItems.textContent = items;
  sumTotalRev.textContent = formatBirr(totalRev);

  // --- detailed per-receipt listing (today)
  try{
    const receiptsListEl = document.getElementById('sum-receipts-list');
    const prodBreakdownEl = document.getElementById('sum-product-breakdown');
    if(receiptsToday.length === 0){
      if(receiptsListEl) receiptsListEl.innerHTML = '<div style="color:var(--muted)">No receipts for today</div>';
      if(prodBreakdownEl) prodBreakdownEl.innerHTML = '<div style="color:var(--muted)">No items</div>';
    } else {
      // cashier grouping: by base name (support subname separators like '>', '/', ':' or '|')
      const cashierStats = {};
      const prodAgg = {}; // key: productLabel|priceLabel -> {productLabel, priceLabel, qty, rev}

      const rows = receiptsToday.slice().reverse().map(r => {
        const ts = r.timestamp instanceof Date ? r.timestamp : new Date(r.timestamp);
        const cashierFull = r.cashier || 'Cashier';
        // derive base name
        const base = (''+cashierFull).split(/>|\/|:|\|/)[0].trim();
        if(!cashierStats[base]) cashierStats[base] = {count:0, items:0, rev:0, children:{}};
        cashierStats[base].count += 1;

        // compute receipt totals and build item list
        let rev = 0, qtyCount = 0;
        let itemsHtml = '';
        if(Array.isArray(r.items) && r.items.length){
          r.items.forEach(it => {
            const itRev = Number(it.subtotal || (it.price * it.qty)) || 0;
            rev += itRev; qtyCount += Number(it.qty || 0);
            const key = (it.productLabel||'') + '|' + (it.priceLabel||'');
            if(!prodAgg[key]) prodAgg[key] = {productLabel: it.productLabel||'', priceLabel: it.priceLabel||'', qty:0, rev:0};
            prodAgg[key].qty += Number(it.qty||0);
            prodAgg[key].rev += itRev;
            itemsHtml += `<div style="display:flex;justify-content:space-between;margin:4px 0"><span>${it.productLabel} ${it.priceLabel ? '('+it.priceLabel+')' : ''} × ${it.qty}</span><strong>${formatBirr(itRev)}</strong></div>`;
          });
        } else {
          // legacy single-item
          const itRev = Number(r.subtotal || (r.price * r.qty)) || 0;
          rev += itRev; qtyCount += Number(r.qty || 0);
          const plabel = r.productLabel || 'Item';
          const pLabel = r.priceLabel || (r.price ? String(r.price) : '');
          const key = plabel + '|' + pLabel;
          if(!prodAgg[key]) prodAgg[key] = {productLabel: plabel, priceLabel: pLabel, qty:0, rev:0};
          prodAgg[key].qty += Number(r.qty||0);
          prodAgg[key].rev += itRev;
          itemsHtml = `<div style="display:flex;justify-content:space-between;margin:4px 0"><span>${plabel} ${pLabel ? '('+pLabel+')' : ''} × ${r.qty}</span><strong>${formatBirr(itRev)}</strong></div>`;
        }

        cashierStats[base].items += qtyCount;
        cashierStats[base].rev += rev;

        // attempt to capture child name if provided (e.g., "Parent > Child")
        const parts = (''+cashierFull).split(/>|\/|:|\|/).map(s=>s.trim()).filter(Boolean);
        if(parts.length > 1){
          const child = parts.slice(1).join(' - ');
          if(!cashierStats[base].children[child]) cashierStats[base].children[child] = {count:0, items:0, rev:0};
          cashierStats[base].children[child].count += 1;
          cashierStats[base].children[child].items += qtyCount;
          cashierStats[base].children[child].rev += rev;
        }

        const payment = r.payment || '';
        return `<div style="padding:8px;border:1px solid #f0f0f0;border-radius:8px;margin-bottom:8px">
            <div style="display:flex;justify-content:space-between;font-weight:600">${formatBirr(rev)} — ${qtyCount} item(s)</div>
            <div style="font-size:12px;color:var(--muted);margin-top:6px">${ts.toLocaleString()} • ${payment} • ${cashierFull}</div>
            <div style="margin-top:8px">${itemsHtml}</div>
          </div>`;
      });

      if(receiptsListEl) receiptsListEl.innerHTML = `<div style="font-size:13px;margin-bottom:8px">` +
          Object.keys(cashierStats).map(base => {
            const s = cashierStats[base];
            const childrenSummary = Object.keys(s.children).length ? (' — ' + Object.keys(s.children).map(c=>`${c}: ${s.children[c].count} sales`).join(', ')) : '';
            return `<div style="font-weight:700;margin-bottom:4px">${base}: ${s.count} receipt(s), ${s.items} items — ${formatBirr(s.rev)}${childrenSummary}</div>`;
          }).join('') + `</div>` + rows.join('');

      // product/variant breakdown
      const prodRows = Object.keys(prodAgg).sort((a,b)=> prodAgg[b].rev - prodAgg[a].rev).map(k => {
        const p = prodAgg[k];
        return `<div style="display:flex;justify-content:space-between;margin:6px 0"><span>${p.productLabel} ${p.priceLabel ? '('+p.priceLabel+')' : ''} — ${p.qty} sold</span><strong>${formatBirr(p.rev)}</strong></div>`;
      });
      if(prodBreakdownEl) prodBreakdownEl.innerHTML = prodRows.join('');
    }
  }catch(e){
    // ignore UI errors
  }

  // create a daily summary object and save it (store today's summary)
  const dailySummary = {
    date: new Date(),
    items,
    totalRev,
    byMethod: byMethod
  };
  saveDailySummaryObject(dailySummary);
}

// End-of-day summary: save and show a non-blocking toast that links to the summaries page
if(summaryBtn){
  summaryBtn.addEventListener('click', ()=>{
    calculateSummary();
    // show a toast with a 'View' action that navigates to the daily summary page
    showToast('End-of-day summary saved', 7000, ()=>{ try{ window.location.href = 'daily-summary.html'; }catch(e){} }, 'View');
    // do not open the modal overlay here (user requested no popup)
  });
}

if(closeSummaryBtn){
  closeSummaryBtn.addEventListener('click', ()=>{
    if(summaryOverlay){ summaryOverlay.classList.remove('show'); summaryOverlay.setAttribute('aria-hidden','true'); }
  });
}

// Download summary as text
if(downloadSummaryBtn){
  downloadSummaryBtn.addEventListener('click', ()=>{
    calculateSummary();
    const text = `End of Day Summary\nTelebirr: ${sumTeleCount.textContent} sales — ${sumTeleRev.textContent}\nCash: ${sumCashCount.textContent} sales — ${sumCashRev.textContent}\nBank: ${sumBankCount.textContent} sales — ${sumBankRev.textContent}\nTotal items: ${sumItems.textContent}\nTotal revenue: ${sumTotalRev.textContent}`;
    const blob = new Blob([text], {type:'text/plain'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `summary-${(new Date()).toISOString().slice(0,10)}.txt`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  });
}

logoutBtn.addEventListener('click', ()=>{
  try{
    localStorage.removeItem(ROLE_KEY);
  }catch(e){}
  try{ window.location.href = 'login.html'; }catch(e){ window.location.href = 'login.html'; }
});

// initialize product/price selects and subtotal
populateProductSelect();
if(productEl && productEl.options && productEl.options.length){
  productEl.value = productEl.options[0].value;
  populatePriceVariants(productEl.value);
  if(priceEl.options && priceEl.options.length) priceEl.value = priceEl.options[0].value;
}
// Accessibility helpers: focus trap and keyboard shortcuts
let _prevActive = null;
let _trapContainer = null;
function focusableElements(container){
  if(!container) return [];
  return Array.from(container.querySelectorAll('a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])')).filter(el => !el.hasAttribute('disabled'));
}
function focusTrap(container){
  _trapContainer = container;
  _prevActive = document.activeElement;
  const foc = focusableElements(container);
  if(foc.length) foc[0].focus();
  document.addEventListener('keydown', _handleTrapKey);
}
function releaseFocusTrap(){
  document.removeEventListener('keydown', _handleTrapKey);
  if(_prevActive && typeof _prevActive.focus === 'function') try{ _prevActive.focus(); }catch(e){}
  _prevActive = null; _trapContainer = null;
}
function _handleTrapKey(e){
  if(e.key === 'Escape'){
    if(overlay && overlay.classList.contains('show')){ overlay.classList.remove('show'); overlay.setAttribute('aria-hidden','true'); releaseFocusTrap(); e.preventDefault(); return; }
    if(summaryOverlay && summaryOverlay.classList.contains('show')){ summaryOverlay.classList.remove('show'); summaryOverlay.setAttribute('aria-hidden','true'); e.preventDefault(); return; }
  }
  if(!_trapContainer) return;
  if(e.key !== 'Tab') return;
  const foc = focusableElements(_trapContainer);
  if(foc.length === 0) { e.preventDefault(); return; }
  const idx = foc.indexOf(document.activeElement);
  if(e.shiftKey){
    const next = (idx <= 0) ? foc[foc.length-1] : foc[idx-1]; next.focus(); e.preventDefault();
  } else {
    const next = (idx === -1 || idx === foc.length-1) ? foc[0] : foc[idx+1]; next.focus(); e.preventDefault();
  }
}

function isModifierEnter(e){ return (e.ctrlKey || e.metaKey) && e.key === 'Enter'; }
// Global shortcut: Ctrl/Cmd+Enter triggers a single sale when in single mode
document.addEventListener('keydown', (e)=>{
  try{
    if(isModifierEnter(e) && saleMode === 'single'){
      e.preventDefault(); doSingleSale(); return;
    }
    if(e.key === 'Escape'){
      if(overlay && overlay.classList.contains('show')){ overlay.classList.remove('show'); overlay.setAttribute('aria-hidden','true'); releaseFocusTrap(); }
      if(summaryOverlay && summaryOverlay.classList.contains('show')){ summaryOverlay.classList.remove('show'); summaryOverlay.setAttribute('aria-hidden','true'); }
    }
  }catch(err){}
});
// --- Page zoom controls: persist and apply zoom level (fallback using CSS transform when needed)
const ZOOM_KEY = 'cashir_zoom_v1';
let _currentZoom = 1;

function applyZoom(level){
  try{
    _currentZoom = Number(level) || 1;
    // clamp
    if(_currentZoom < 0.5) _currentZoom = 0.5;
    if(_currentZoom > 2.0) _currentZoom = 2.0;
    // try native zoom where supported
    try{
      document.documentElement.style.zoom = String(_currentZoom);
      // clear transform fallback if previously set
      document.body.style.transform = '';
      document.body.style.transformOrigin = '';
      document.body.style.width = '';
    }catch(e){
      // fallback: use transform scale on body
      try{
        document.documentElement.style.zoom = '';
        document.body.style.transformOrigin = '0 0';
        document.body.style.transform = `scale(${_currentZoom})`;
        document.body.style.width = `${100 / _currentZoom}%`;
      }catch(e2){/* ignore */}
    }
    try{ localStorage.setItem(ZOOM_KEY, String(_currentZoom)); }catch(e){}
    // update title for reset button to show percent
    try{ if(zoomResetBtn) zoomResetBtn.title = `Reset zoom (current ${(Math.round(_currentZoom*100))}% )`; }catch(e){}
  }catch(e){}
}

function loadZoom(){
  try{
    const raw = localStorage.getItem(ZOOM_KEY);
    const v = raw ? Number(raw) : NaN;
    if(isFinite(v) && v > 0){ applyZoom(v); } else { applyZoom(1); }
  }catch(e){ applyZoom(1); }
}

function zoomIn(){ applyZoom(Math.round((_currentZoom + 0.1) * 100) / 100); }
function zoomOut(){ applyZoom(Math.round((_currentZoom - 0.1) * 100) / 100); }
function resetZoom(){ applyZoom(1); }

// bind buttons if present
try{
  if(zoomInBtn) zoomInBtn.addEventListener('click', (e)=>{ e.preventDefault(); zoomIn(); });
  if(zoomOutBtn) zoomOutBtn.addEventListener('click', (e)=>{ e.preventDefault(); zoomOut(); });
  if(zoomResetBtn) zoomResetBtn.addEventListener('click', (e)=>{ e.preventDefault(); resetZoom(); });
}catch(e){}

// keyboard shortcuts: Ctrl/Cmd + '+' / '-' / '0' for zoom in/out/reset
document.addEventListener('keydown', (e)=>{
  try{
    const mod = e.ctrlKey || e.metaKey;
    if(!mod) return;
    // some browsers report '+' as '=' with shift, so handle '=' also when shift is pressed
    if((e.key === '+' || e.key === '=')){
      e.preventDefault(); zoomIn();
    } else if(e.key === '-'){
      e.preventDefault(); zoomOut();
    } else if(e.key === '0'){
      e.preventDefault(); resetZoom();
    }
  }catch(err){}
});

// load payment methods then update subtotal
loadZoom();
loadPaymentMethods().then(()=>{ updateSubtotal(); renderCart(); }).catch(()=>{ updateSubtotal(); renderCart(); });
