import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

function formatBirr(n){
  if (n == null) return '-';
  return Number(n).toLocaleString(undefined, {maximumFractionDigits:2}) + ' Birr';
}

function parseSaleTotal(s){
  try{
    let rev = 0;
    if (Array.isArray(s.items) && s.items.length){
      s.items.forEach(it => {
        const itemRev = Number(it.subtotal ?? (it.price * it.quantity) ?? 0) || 0;
        rev += itemRev;
      });
    } else {
      rev = Number(s.total ?? s.totalAmount ?? 0) || 0;
    }
    return rev;
  }catch(e){ return 0; }
}

function detectPaymentMethod(s){
  const keys = [s.paymentMethod, s.paidBy, s.payment, s.method, s.payMethod, s.tender];
  for(const k of keys){
    if(!k) continue;
    const v = String(k).toLowerCase();
    if(v.includes('cash')) return 'cash';
    if(v.includes('tel') || v.includes('birr') || v.includes('telebirr') || v.includes('telbirr')) return 'telbirr';
    if(v.includes('bank') || v.includes('transfer')) return 'bank';
    if(v.includes('card') || v.includes('visa') || v.includes('master')) return 'card';
  }
  if(Array.isArray(s.payments) && s.payments.length){
    const p = s.payments[0];
    if(p && p.method){
      const v = String(p.method).toLowerCase();
      if(v.includes('cash')) return 'cash';
      if(v.includes('tel') || v.includes('birr')) return 'telbirr';
      if(v.includes('bank') || v.includes('transfer')) return 'bank';
    }
  }
  return 'other';
}

import { useLocation } from "react-router-dom";

export default function SummaryDaily(){
  const navigate = useNavigate();
  const location = useLocation();
  const qp = new URLSearchParams(location.search);
  const initialDate = qp.get('date') || new Date().toISOString().slice(0,10);
  const [date, setDate] = useState(() => initialDate);
  const [receipts, setReceipts] = useState([]);
  const [grouped, setGrouped] = useState({cash:[], telbirr:[], bank:[], card:[], other:[]});

  useEffect(()=>{
    try{
      const raw = localStorage.getItem('bakery_app_v1');
      const store = raw ? JSON.parse(raw) : {};
      const sales = Array.isArray(store.sales) ? store.sales : [];

      const todays = [];
      const target = date;
      sales.forEach(s => {
        try{
          const rev = parseSaleTotal(s);
          const dateKey = (s.saleDate || s.timestamp || s.ts) ? new Date(s.saleDate || s.timestamp || s.ts).toISOString().slice(0,10) : null;
          if(dateKey === target){
            const pm = detectPaymentMethod(s);
            todays.push({
              id: s.id ?? s.saleId ?? s.txnId ?? s.ref ?? Math.random().toString(36).slice(2,9),
              time: (s.saleDate || s.timestamp || s.ts) ? new Date(s.saleDate || s.timestamp || s.ts).toLocaleTimeString() : '',
              total: rev,
              cashier: s.cashier ?? s.user ?? s.staff ?? '',
              method: pm,
              raw: s,
            });
          }
        }catch(e){}
      });

      const g = {cash:[], telbirr:[], bank:[], card:[], other:[]};
      todays.forEach(r => { g[r.method] ? g[r.method].push(r) : g.other.push(r); });

      setReceipts(todays);
      setGrouped(g);
    }catch(e){ setReceipts([]); setGrouped({cash:[], telbirr:[], bank:[], card:[], other:[]}); }
  }, [date]);

  const totalFor = (arr)=> arr.reduce((s,r)=> s + (Number(r.total)||0), 0);
  const [selectedCashier, setSelectedCashier] = useState('');
  const [receiptModal, setReceiptModal] = useState(null);
  const [showHistory, setShowHistory] = useState(() => {
    try { const v = localStorage.getItem('daily_receipts_history_collapsed'); return v ? (v !== 'true') : true; } catch(e){ return true; }
  });

  // Build a printable daily collector (grouped by cashier and payment method)
  function collectDay(){
    try{
      const todayReceipts = receipts.slice();

      const groupedByCashier = {};
      todayReceipts.forEach(r => {
        const cashier = (r.cashier || 'Unknown').trim() || 'Unknown';
        if(!groupedByCashier[cashier]) groupedByCashier[cashier] = {};
        const method = r.method || 'other';
        if(!groupedByCashier[cashier][method]) groupedByCashier[cashier][method] = [];
        groupedByCashier[cashier][method].push(r);
      });

      const now = new Date();
      const headerHtml = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px"><div><h1 style=\"margin:0;\">Daily Receipt Collector</h1><div style=\"color:#666\">Date: ${date}</div></div><div style=\"text-align:right\"><div style=\"font-weight:700\">Generated: ${now.toLocaleString()}</div></div></div>`;

      const cashierSections = Object.keys(groupedByCashier).sort().map(cashier => {
        const methods = groupedByCashier[cashier];
        const methodHtml = Object.keys(methods).map(method => {
          const rows = methods[method].map(r => {
            const last = r.raw || r;
            const rawItems = Array.isArray(last.items) ? last.items : (Array.isArray(last.lines) ? last.lines : (Array.isArray(last.orderItems) ? last.orderItems : []));
            let items = (rawItems || []).map(it => {
              const name = it.productLabel ?? it.label ?? it.name ?? it.title ?? it.product ?? it.description ?? 'Item';
              const qty = Number(it.quantity ?? it.qty ?? it.q ?? 1) || 1;
              const price = Number(it.price ?? it.unitPrice ?? it.value ?? it.amount ?? 0) || 0;
              const subtotal = Number(it.subtotal ?? it.total ?? (price * qty) ?? 0) || 0;
              return { name, qty, price, subtotal };
            });
            if(items.length === 0 && (last.total || last.totalAmount) && (last.productLabel || last.product || last.title || last.name)){
              const name = last.productLabel ?? last.product ?? last.title ?? last.name ?? 'Item';
              const qty = Number(last.quantity ?? last.qty ?? 1) || 1;
              const price = Number(last.price ?? last.amount ?? (last.total || last.totalAmount) / qty) || 0;
              const subtotal = Number(last.total || last.totalAmount || price * qty) || 0;
              items.push({ name, qty, price, subtotal });
            }

            const itemsText = items.map(it => `${it.name} × ${it.qty} @ ${it.price.toFixed(2)} = ${it.subtotal.toFixed(2)} Birr`).join('<br/>');
            const total = Number(r.total || last.total || last.totalAmount || items.reduce((s,i)=>s+i.subtotal,0) || 0).toFixed(2);
            return `<tr><td style="padding:6px;border-bottom:1px solid #eee">${r.id}</td><td style="padding:6px;border-bottom:1px solid #eee">${r.time}</td><td style="padding:6px;border-bottom:1px solid #eee">${method}</td><td style="padding:6px;border-bottom:1px solid #eee">${itemsText}</td><td style="padding:6px;border-bottom:1px solid #eee;text-align:right">${total} Birr</td></tr>`;
          }).join('');

          const subtotal = methods[method].reduce((s, rr) => s + (Number(rr.total)||0), 0).toFixed(2);
          return `<h4 style=\"margin:8px 0 6px 0\">${method.toUpperCase()} — Subtotal: ${subtotal} Birr</h4><table style=\"width:100%;border-collapse:collapse;margin-bottom:12px\"><thead><tr><th style=\"text-align:left;padding:6px;border-bottom:2px solid #ddd\">Receipt</th><th style=\"padding:6px;border-bottom:2px solid #ddd\">Time</th><th style=\"padding:6px;border-bottom:2px solid #ddd\">Method</th><th style=\"padding:6px;border-bottom:2px solid #ddd\">Items</th><th style=\"padding:6px;border-bottom:2px solid #ddd;text-align:right\">Total</th></tr></thead><tbody>${rows}</tbody></table>`;
        }).join('');

        const cashierTotal = Object.keys(methods).reduce((s,m)=> s + methods[m].reduce((ss, rr)=> ss + (Number(rr.total)||0),0), 0).toFixed(2);
        return `<section style=\"margin-bottom:18px\"><h3 style=\"margin:6px 0\">Cashier: ${cashier} — Total: ${cashierTotal} Birr</h3>${methodHtml}</section>`;
      }).join('');

      const overallTotal = todayReceipts.reduce((s,r)=> s + (Number(r.total)||0),0).toFixed(2);

      const css = `body{font-family:Arial,Helvetica,sans-serif;color:#111;padding:20px}h1,h2,h3,h4{margin:0}table td,table th{vertical-align:top}`;
      const html = `<!doctype html><html><head><meta charset="utf-8"><title>Daily Receipts ${date}</title><style>${css}</style></head><body>${headerHtml}${cashierSections}<div style=\"margin-top:18px;font-weight:800\">Overall Total: ${overallTotal} Birr</div><script>window.onload=function(){setTimeout(()=>{try{window.print();}catch(e){}},300);};</script></body></html>`;

      const w = window.open('', '_blank');
      if(w){ w.document.open(); w.document.write(html); w.document.close(); }
    }catch(e){ console.error('collectDay', e); alert('Failed to generate report'); }
  }

  const cashierMap = React.useMemo(()=>{
    const map = {};
    receipts.forEach(r => {
      const name = (r.cashier || 'Unknown').trim() || 'Unknown';
      if(!map[name]) map[name] = { entries: [], total: 0 };
      map[name].entries.push(r);
      map[name].total += Number(r.total) || 0;
    });
    return map;
  }, [receipts]);

  function viewReceipt(r){
    try{
      const last = r.raw || r;
      const ts = last.saleDate || last.timestamp || last.ts || new Date().toISOString();

      // Normalize items from several possible keys
      const rawItems = Array.isArray(last.items) ? last.items : (Array.isArray(last.lines) ? last.lines : (Array.isArray(last.orderItems) ? last.orderItems : []));
      const items = (rawItems || []).map(it => {
        const name = it.productLabel ?? it.label ?? it.name ?? it.title ?? it.product ?? it.description ?? 'Item';
        const qty = Number(it.quantity ?? it.qty ?? it.q ?? 1) || 1;
        const price = Number(it.price ?? it.unitPrice ?? it.value ?? it.amount ?? 0) || 0;
        const subtotal = Number(it.subtotal ?? it.total ?? (price * qty) ?? 0) || 0;
        return { name, qty, price, subtotal };
      });

      // fallback: reconstruct single-line if no items array
        if(items.length === 0 && (last.total || last.totalAmount) && (last.productLabel || last.product || last.title || last.name)){
        const name = last.productLabel ?? last.product ?? last.title ?? last.name ?? 'Item';
        const qty = Number(last.quantity ?? last.qty ?? 1) || 1;
        const price = Number(last.price ?? last.amount ?? (last.total || last.totalAmount) / qty) || 0;
        const subtotal = Number(last.total || last.totalAmount || price * qty) || 0;
        items.push({ name, qty, price, subtotal });
      }

      const itemsRows = items.map(it => `<tr><td style="padding:6px 8px">${it.name}</td><td style="padding:6px 8px;text-align:center">${it.qty}</td><td style="padding:6px 8px;text-align:right">${it.price.toFixed(2)} Birr</td><td style="padding:6px 8px;text-align:right">${it.subtotal.toFixed(2)} Birr</td></tr>`).join('');
      const itemsTable = items.length ? `<table style="width:100%;border-collapse:collapse;margin:8px 0"><thead><tr style="text-align:left;border-bottom:1px solid #ddd"><th>Item</th><th style="text-align:center">Qty</th><th style="text-align:right">Price</th><th style="text-align:right">Subtotal</th></tr></thead><tbody>${itemsRows}</tbody></table>` : '<div style="color:#666">No item details available</div>';

      const total = Number(r.total || last.total || last.totalAmount || items.reduce((s,i)=>s+i.subtotal,0) || 0).toFixed(2);
      const html = `<!doctype html><html><head><meta charset="utf-8"><title>Receipt</title><style>body{font-family:Arial,Helvetica,sans-serif;padding:20px;color:#111}h2{margin-top:0}table td,table th{border-bottom:1px solid #f0f0f0}</style></head><body><h2>Receipt</h2>${itemsTable}<div style="display:flex;justify-content:space-between;margin:12px 0;font-weight:700"><div>Total</div><div>${total} Birr</div></div><div style="display:flex;justify-content:space-between;margin:6px 0"><div>Date</div><div>${new Date(ts).toLocaleString()}</div></div><div style="display:flex;justify-content:space-between;margin:6px 0"><div>Cashier</div><div>${r.cashier||''}</div></div><script>window.onload=function(){try{window.print();}catch(e){};};</script></body></html>`;
      const w = window.open('', '_blank'); if(w){ w.document.open(); w.document.write(html); w.document.close(); }
    }catch(e){ console.error('viewReceipt', e); }
  }

  return (
    <div className="container">
      <div className="flex items-center gap-3 py-4">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 via-blue-500 to-indigo-500 text-white shadow">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2"/>
                        <path d="M16 2v4M8 2v4M3 10h18"/>
          </svg>
        </div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">Daily Report</h1>
        <button className="btn orange back pill" onClick={()=>navigate('/admin/daily-summary')}>Back to Report</button>
      </div>

      <div className="card">
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12}}>
          <div>
            <h3 style={{margin:0}}>Daily Report</h3>
            <div className="muted">{date}</div>
          </div>
          <div style={{display:'flex',gap:8,alignItems:'center'}}>
            <input type="date" value={date} onChange={e=>setDate(e.target.value)} />
            <button className="btn" onClick={()=>{ setDate(new Date().toISOString().slice(0,10)); }}>Today</button>
            <button className="btn ghost" onClick={collectDay}>Collect Day</button>
          </div>
        </div>

        <div style={{marginTop:12}}>
          <div className="summary-panel">
            <div className="summary-box summary-daily">
              <div className="sb-icon">📲</div>
              <div className="sb-meta">
                <div className="sb-title">TelBirr</div>
                <div className="sb-value">{formatBirr(totalFor(grouped.telbirr))}</div>
                <div className="sb-desc">Total for the day</div>
              </div>
            </div>

            <div className="summary-box summary-weekly">
              <div className="sb-icon">💵</div>
              <div className="sb-meta">
                <div className="sb-title">Cash</div>
                <div className="sb-value">{formatBirr(totalFor(grouped.cash))}</div>
                <div className="sb-desc">Total for the day</div>
              </div>
            </div>

            <div className="summary-box summary-monthly">
              <div className="sb-icon">🏦</div>
              <div className="sb-meta">
                <div className="sb-title">Bank / Transfer</div>
                <div className="sb-value">{formatBirr(totalFor(grouped.bank))}</div>
                <div className="sb-desc">Total for the day</div>
              </div>
            </div>
            <div className="summary-box summary-total">
              <div className="sb-icon">Σ</div>
              <div className="sb-meta">
                <div className="sb-title">Total</div>
                <div className="sb-value">{formatBirr((totalFor(grouped.cash) + totalFor(grouped.telbirr) + totalFor(grouped.bank)) || 0)}</div>
                <div className="sb-desc">Combined total for the day</div>
              </div>
            </div>
          </div>
          <div style={{marginTop:14, display:'grid', gridTemplateColumns:'260px 1fr', gap:12}}>
            <aside>
              <div style={{display:'flex',flexDirection:'column',gap:10}}>
                <div style={{fontWeight:700,marginBottom:6}}>Cashiers</div>
                <div
                  onClick={()=>setSelectedCashier('')}
                  style={{cursor:'pointer'}}
                >
                  <div className="card" style={{padding:12,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <div>
                      <div style={{fontWeight:700}}>All Cashiers</div>
                      <div className="muted" style={{fontSize:12}}>{receipts.length} receipts</div>
                    </div>
                    <div style={{fontWeight:800}}>{formatBirr(totalFor(receipts))}</div>
                  </div>
                </div>

                {Object.keys(cashierMap).sort((a,b)=> cashierMap[b].total - cashierMap[a].total).map(name => (
                  <div key={name} onClick={()=>setSelectedCashier(name)} style={{cursor:'pointer'}}>
                    <div className="card" style={{padding:12,display:'flex',justifyContent:'space-between',alignItems:'center',border: selectedCashier===name ? '2px solid #3b82f6' : undefined}}>
                      <div>
                        <div style={{fontWeight:700}}>{name}</div>
                        <div className="muted" style={{fontSize:12}}>{cashierMap[name].entries.length} receipts</div>
                      </div>
                      <div style={{fontWeight:800}}>{formatBirr(cashierMap[name].total)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </aside>

            <section>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                <h3 style={{margin:0}}>Receipt History</h3>
                <button className="btn" onClick={()=>{ setShowHistory(s=>{ const next = !s; try{ localStorage.setItem('daily_receipts_history_collapsed', (!next).toString()); }catch(e){} return next; }); }}>
                  {showHistory ? 'Collapse' : 'Expand'}
                </button>
              </div>
              {!showHistory ? (
                <div className="muted" style={{padding:'8px 12px'}}>History is collapsed</div>
              ) : null}
              { showHistory && ((selectedCashier ? (cashierMap[selectedCashier] ? cashierMap[selectedCashier].entries : []) : receipts).length === 0 ? (
                <div className="muted">No receipts</div>
              ) : (
                (selectedCashier ? (cashierMap[selectedCashier] ? cashierMap[selectedCashier].entries : []) : receipts).map(r => (
                  <div key={r.id} style={{display:'flex',justifyContent:'space-between',padding:'8px 12px',borderBottom:'1px solid #eee'}}>
                    <div style={{minWidth:260}}>
                      <div style={{fontWeight:700}}>{r.id}</div>
                      <div className="muted" style={{fontSize:13}}>{r.cashier} • {r.time} • {r.method}</div>
                    </div>
                    <div style={{textAlign:'right',display:'flex',flexDirection:'column',alignItems:'flex-end',gap:8}}>
                      <div style={{fontWeight:700}}>{formatBirr(r.total)}</div>
                      <div><button className="btn" onClick={()=>setReceiptModal(r)}>View</button></div>
                    </div>
                  </div>
                ))
              ))}
            </section>
          </div>
        </div>
      </div>
      {receiptModal && <SummaryDailyReceiptModal receipt={receiptModal} onClose={() => setReceiptModal(null)} />}
    </div>
  );
  
  // render modal when set
  // (this code won't be reached because we return above; keeping JSX insertion instead)
}

// Receipt modal rendering at file bottom so we can reuse logic in this page
export function SummaryDailyReceiptModal({ receipt, onClose }){
  if(!receipt) return null;
  const last = receipt.raw || receipt;
  const ts = last.saleDate || last.timestamp || last.ts || new Date().toISOString();
  const rawItems = Array.isArray(last.items) ? last.items : (Array.isArray(last.lines) ? last.lines : (Array.isArray(last.orderItems) ? last.orderItems : []));
  const items = (rawItems || []).map(it => {
    const name = it.productLabel ?? it.label ?? it.name ?? it.title ?? it.product ?? 'Item';
    const qty = Number(it.quantity ?? it.qty ?? it.q ?? 1) || 1;
    const price = Number(it.price ?? it.unitPrice ?? it.value ?? it.amount ?? 0) || 0;
    const subtotal = Number(it.subtotal ?? it.total ?? (price * qty) ?? 0) || 0;
    return { name, qty, price, subtotal };
  });

  const total = Number(receipt.total || last.total || last.totalAmount || items.reduce((s,i)=>s+i.subtotal,0) || 0);

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(2,6,23,0.45)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:500}} onClick={onClose}>
      <div role="dialog" aria-modal style={{width:520,maxWidth:'96%',background:'#fff',borderRadius:12,padding:22,boxShadow:'0 30px 60px rgba(2,6,23,0.2)'}} onClick={e=>e.stopPropagation()}>
        <h2 style={{marginTop:0,marginBottom:8}}>Receipt</h2>
        <div style={{display:'grid',gridTemplateColumns:'1fr auto',gap:8,alignItems:'center',marginBottom:12}}>
          <div style={{fontWeight:700}}>Items</div>
          <div style={{textAlign:'right',fontWeight:700}}>{formatBirr(total)}</div>
        </div>

        <div style={{borderTop:'1px solid #f1f5f9',borderBottom:'1px solid #f1f5f9',padding:'12px 0',marginBottom:12}}>
          {(items && items.length) ? (
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {items.map((it, i) => (
                <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:700}}>{it.name}</div>
                    <div className="muted" style={{fontSize:13}}>{it.qty} × {formatBirr(it.price)}</div>
                  </div>
                  <div style={{minWidth:110,textAlign:'right',fontWeight:700}}>{formatBirr(it.subtotal)}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="muted">No item details available</div>
          )}
        </div>

        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:8}}>
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            <div style={{fontSize:13,color:'#6b7280'}}>Payment</div>
            <div style={{fontWeight:700}}>{receipt.paymentMethod || receipt.payment || last.paymentMethod || '—'}</div>
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:8,alignItems:'flex-end'}}>
            <div style={{fontSize:13,color:'#6b7280'}}>Subtotal</div>
            <div style={{fontWeight:700}}>{formatBirr(total)}</div>
          </div>
        </div>

        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:6}}>
          <div style={{fontSize:13,color:'#6b7280'}}>Date</div>
          <div style={{fontWeight:700}}>{(receipt.timestamp instanceof Date ? receipt.timestamp : new Date(receipt.timestamp || ts)).toLocaleString()}</div>
        </div>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:6}}>
          <div style={{fontSize:13,color:'#6b7280'}}>Cashier</div>
          <div style={{fontWeight:700}}>{receipt.cashier || last.cashier || ''}</div>
        </div>

        <div style={{display:'flex',justifyContent:'flex-end',gap:12,marginTop:18}}>
          <button className="btn ghost" onClick={()=>{
            try{
              const data = `Receipt\n\n${(items||[]).map(it=> `${it.name}\t${it.qty} x ${it.price.toFixed(2)} = ${it.subtotal.toFixed(2)}`).join('\n')}\n\nTotal: ${total.toFixed(2)}`;
              const blob = new Blob([data], { type: 'text/plain' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a'); a.href = url; a.download = `receipt-${receipt.saleId||Date.now()}.txt`; a.click(); URL.revokeObjectURL(url);
            }catch(e){ console.error(e); }
          }}>Download</button>
          <button className="btn" onClick={()=>{
            try{
              const lastLocal = receipt.raw || receipt; const tsLocal = lastLocal.timestamp instanceof Date ? lastLocal.timestamp : new Date(lastLocal.timestamp || lastLocal.saleDate || lastLocal.ts);
              const itemsHtml = (items||[]).map(it => `<div style="display:flex;justify-content:space-between;margin:6px 0"><span>${it.name} × ${it.qty}</span><strong>${formatBirr(it.subtotal)}</strong></div>`).join('');
              const html = `<!doctype html><html><head><meta charset="utf-8"><title>Receipt</title><style>body{font-family:Arial,Helvetica,sans-serif;padding:20px}h2{margin-top:0}</style></head><body><h2>Receipt</h2>${itemsHtml}<div style="display:flex;justify-content:space-between;margin:6px 0"><span>Total</span><strong>${formatBirr(total)}</strong></div><div style="display:flex;justify-content:space-between;margin:6px 0"><span>Date</span><strong>${tsLocal.toLocaleString()}</strong></div><div style="display:flex;justify-content:space-between;margin:6px 0"><span>Cashier</span><strong>${receipt.cashier||lastLocal.cashier||''}</strong></div><script>window.onload=function(){window.print();};</script></body></html>`;
              const w = window.open('', '_blank'); if(w){ w.document.open(); w.document.write(html); w.document.close(); }
            }catch(e){ console.error(e); }
          }}>Print Receipt</button>
        </div>
      </div>
    </div>
  );
}
