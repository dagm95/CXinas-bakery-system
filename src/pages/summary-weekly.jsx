import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import ChartTopProducts from "../components/ChartTopProducts.jsx";
import Chart from "chart.js/auto";
// PDF libs were added earlier, but per request we'll render in-app instead of generating PDF.

function startOfWeek(d){
  const dt = new Date(d);
  const day = dt.getDay();
  const diff = (day + 6) % 7; // make Monday the first day
  dt.setDate(dt.getDate() - diff);
  dt.setHours(0,0,0,0);
  return dt;
}

function endOfWeek(d){
  const s = startOfWeek(d);
  const e = new Date(s);
  e.setDate(s.getDate() + 6);
  e.setHours(23,59,59,999);
  return e;
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

function formatBirr(n){
  if (n == null) return '-';
  return Number(n).toLocaleString(undefined, {maximumFractionDigits:2}) + ' Birr';
}

export default function SummaryWeekly(){
  const navigate = useNavigate();
  const [anchorDate, setAnchorDate] = useState(() => new Date().toISOString().slice(0,10));

  const range = useMemo(()=>{
    const d = new Date(anchorDate);
    const s = startOfWeek(d);
    const e = endOfWeek(d);
    return {start: s, end: e};
  }, [anchorDate]);

  const [totals, setTotals] = useState({telbirr:0, cash:0, bank:0});
  const [weekSales, setWeekSales] = useState([]);
  const [daySeries, setDaySeries] = useState({ labels: [], data: [] });
  const [topProducts, setTopProducts] = useState([]);
  const [methodSeries, setMethodSeries] = useState({ labels: [], telbirr: [], cash: [], bank: [] });
  const [metrics, setMetrics] = useState({ total: 0, avgDaily: 0, orders: 0 });
  const [showWeeklySummary, setShowWeeklySummary] = useState(false);

  const lineRef = useRef(null);
  const lineChartRef = useRef(null);
  const stackedRef = useRef(null);
  const stackedChartRef = useRef(null);

  useEffect(()=>{
    try{
      const raw = localStorage.getItem('bakery_app_v1');
      const store = raw ? JSON.parse(raw) : {};
      const sales = Array.isArray(store.sales) ? store.sales : [];

      let tel = 0, cash = 0, bank = 0;
      const inRange = [];
      sales.forEach(s => {
        try{
          const ts = s.saleDate || s.timestamp || s.ts;
          if(!ts) return;
          const tdate = new Date(ts);
          if(tdate >= range.start && tdate <= range.end){
            const rev = parseSaleTotal(s);
            const pm = detectPaymentMethod(s);
            if(pm === 'telbirr') tel += rev;
            else if(pm === 'cash') cash += rev;
            else if(pm === 'bank') bank += rev;
            else {
              // treat other as cash for summary, or ignore
            }
            inRange.push(s);
          }
        }catch(e){}
      });

      setTotals({telbirr: tel, cash: cash, bank: bank});
      setWeekSales(inRange);
    }catch(e){ setTotals({telbirr:0,cash:0,bank:0}); }
  }, [range]);

  // Build daily series, method breakdown, product aggregates, and header metrics
  useEffect(()=>{
    // labels: Mon..Sun with dates
    const labels = [];
    const dayKeys = [];
    for(let i=0;i<7;i++){
      const d = new Date(range.start);
      d.setDate(range.start.getDate()+i);
      labels.push(d.toLocaleDateString(undefined, { weekday:'short', month:'numeric', day:'numeric' }));
      dayKeys.push(d.toISOString().slice(0,10));
    }
    const dayMap = Object.fromEntries(dayKeys.map(k => [k, 0]));
    const methodMap = Object.fromEntries(dayKeys.map(k => [k, { telbirr:0, cash:0, bank:0 }]));
    const products = {};

    const nameOf = (it) => it?.name || it?.productName || it?.title || it?.item || it?.product || 'Unknown';
    let totalRev = 0;
    weekSales.forEach(s => {
      try{
        const key = (s.saleDate || s.timestamp || s.ts || '').toString().slice(0,10);
        let saleRev = 0;
        if(Array.isArray(s.items) && s.items.length){
          s.items.forEach(it => {
            const qty = Number(it.quantity ?? it.qty ?? 0) || 0;
            const price = Number(it.price ?? 0) || 0;
            const rev = Number(it.subtotal ?? (price * qty) ?? 0) || 0;
            saleRev += rev;
            const nm = nameOf(it);
            if(!products[nm]) products[nm] = { label: nm, rev: 0, qty: 0 };
            products[nm].rev += rev;
            products[nm].qty += qty;
          });
        } else {
          saleRev = Number(s.total ?? s.totalAmount ?? 0) || 0;
        }
        if(dayMap.hasOwnProperty(key)) dayMap[key] += saleRev;
        if(methodMap.hasOwnProperty(key)){
          const pm = detectPaymentMethod(s);
          if(pm === 'telbirr') methodMap[key].telbirr += saleRev;
          else if(pm === 'cash') methodMap[key].cash += saleRev;
          else if(pm === 'bank') methodMap[key].bank += saleRev;
        }
        totalRev += saleRev;
      }catch(e){}
    });

    const data = dayKeys.map(k => Number((dayMap[k]||0).toFixed(2)));
    setDaySeries({ labels, data });

    const telArr = dayKeys.map(k => Number((methodMap[k]?.telbirr || 0).toFixed(2)));
    const cashArr = dayKeys.map(k => Number((methodMap[k]?.cash || 0).toFixed(2)));
    const bankArr = dayKeys.map(k => Number((methodMap[k]?.bank || 0).toFixed(2)));
    setMethodSeries({ labels, telbirr: telArr, cash: cashArr, bank: bankArr });

    const sorted = Object.values(products).sort((a,b)=> b.rev - a.rev);
    setTopProducts(sorted.slice(0,8));

    const avg = totalRev / 7;
    setMetrics({ total: totalRev, avgDaily: avg, orders: weekSales.length });
  }, [weekSales, range]);
  function formatDate(d){ try{ return new Date(d).toLocaleDateString(); }catch(e){ return '-'; } }
  function numberStr(n){ return Number(n||0).toLocaleString(undefined,{maximumFractionDigits:2}); }
  function classifyMethod(m){ const v = String(m||'').toLowerCase(); if(v.includes('cash')) return 'Cash'; if(v.includes('tel')||v.includes('birr')) return 'Mobile Money'; if(v.includes('bank')||v.includes('transfer')) return 'Bank Transfer'; return 'Other'; }
  function buildWeeklyData(){
    const start = range.start; const end = range.end;
    const raw = localStorage.getItem('bakery_app_v1');
    const store = raw ? JSON.parse(raw) : {}; const sales = Array.isArray(store.sales) ? store.sales : [];
    const receipts = sales.filter(s=>{ const ts = s.saleDate||s.timestamp||s.ts; if(!ts) return false; const d=new Date(ts); return d>=start && d<=end; });
    const byCashier = {};
    receipts.forEach(s=>{
      const cashier = s.cashierName || s.cashier || s.user || 'Unknown Cashier';
      const items = Array.isArray(s.items)?s.items:[];
      const hours = s.hours || null; const rate = s.rate || null;
      const total = parseSaleTotal(s);
      const method = classifyMethod(s.paymentMethod || s.paidBy || s.method || s.payMethod || s.tender);
      const row = {
        employee: s.employeeName || s.employee || (items[0]?.employee || '-') || '-',
        date: s.saleDate || s.timestamp || s.ts,
        hours: hours,
        rate: rate,
        total: total,
        paymentMethod: method
      };
      if(!byCashier[cashier]) byCashier[cashier] = { receipts: [], totals: { Cash:0, 'Mobile Money':0, 'Bank Transfer':0, Other:0 }, subtotal:0 };
      byCashier[cashier].receipts.push(row);
      byCashier[cashier].totals[method] += total;
      byCashier[cashier].subtotal += total;
    });
    const overview = Object.keys(byCashier).map(name=>({
      cashier: name,
      cash: byCashier[name].totals['Cash'],
      mobile: byCashier[name].totals['Mobile Money'],
      bank: byCashier[name].totals['Bank Transfer'],
      subtotal: byCashier[name].subtotal
    }));
    const final = {
      totalCash: overview.reduce((s,r)=>s+r.cash,0),
      totalMobile: overview.reduce((s,r)=>s+r.mobile,0),
      totalBank: overview.reduce((s,r)=>s+r.bank,0),
      grand: overview.reduce((s,r)=>s+r.subtotal,0)
    };
    return { start, end, overview, byCashier, final };
  }
  function generateWeeklyCSV(){
    const data = buildWeeklyData();
    const rows = [['Cashier','Employee','Date','Hours','Rate','Total','Payment Method']];
    Object.keys(data.byCashier).forEach(name=>{
      const pack = data.byCashier[name];
      pack.receipts.forEach(r=>{
        rows.push([name, r.employee, formatDate(r.date), r.hours ?? '', r.rate ?? '', numberStr(r.total), r.paymentMethod]);
      });
    });
    const csv = rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `Weekly_Receipts_${range.start.toISOString().slice(0,10)}_${range.end.toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  }

  // Draw charts when series change
  useEffect(()=>{
    // Line chart for revenue by day
    const ctx = lineRef.current && lineRef.current.getContext ? lineRef.current.getContext('2d') : null;
    if(ctx){
      if(lineChartRef.current){ try{ lineChartRef.current.destroy(); }catch{} lineChartRef.current = null; }
      const pts = daySeries.data.map((_,i)=> i % 2 === 0 ? 3 : 0); // dot some points
      lineChartRef.current = new Chart(ctx, {
        type: 'line',
        data: { labels: daySeries.labels, datasets: [{
          label: 'Revenue', data: daySeries.data,
          borderColor: '#2563eb', backgroundColor: 'rgba(37,99,235,0.12)',
          tension: 0.3, fill: true, borderWidth: 2, borderDash: [5,3],
          pointRadius: pts, pointHoverRadius: 5, pointBackgroundColor: '#2563eb'
        }]},
        options: { responsive:true, maintainAspectRatio:false, plugins:{ legend:{ display:false } }, scales:{ y:{ beginAtZero:true } } }
      });
    }

    // Stacked chart by method
    const sctx = stackedRef.current && stackedRef.current.getContext ? stackedRef.current.getContext('2d') : null;
    if(sctx){
      if(stackedChartRef.current){ try{ stackedChartRef.current.destroy(); }catch{} stackedChartRef.current = null; }
      stackedChartRef.current = new Chart(sctx, {
        type: 'bar',
        data: { labels: methodSeries.labels, datasets: [
          { label:'TelBirr', data: methodSeries.telbirr, backgroundColor:'#3b82f6' },
          { label:'Cash', data: methodSeries.cash, backgroundColor:'#10b981' },
          { label:'Bank', data: methodSeries.bank, backgroundColor:'#f59e0b' }
        ]},
        options: {
          responsive:true, maintainAspectRatio:false,
          plugins:{ legend:{ position:'bottom' } },
          scales:{ x:{ stacked:true }, y:{ stacked:true, beginAtZero:true } }
        }
      });
    }

    return () => { try{ lineChartRef.current && lineChartRef.current.destroy(); }catch{}; try{ stackedChartRef.current && stackedChartRef.current.destroy(); }catch{} };
  }, [daySeries, methodSeries]);

  function shiftWeek(delta){
    const d = new Date(anchorDate);
    d.setDate(d.getDate() + delta*7);
    setAnchorDate(d.toISOString().slice(0,10));
  }

  return (
    <div className="container">
      <div className="flex items-center gap-3 py-4">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 via-green-500 to-teal-500 text-white shadow">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 3v18h18"/>
            <path d="M7 14l3-3 4 4 5-7"/>
          </svg>
        </div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">Weekly Report</h1>
        <button
          className="btn orange back pill"
          onClick={()=>navigate('/admin/daily-summary')}
        >
          Back to Report
        </button>
      </div>

      <div className="card">
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div>
            <h3 style={{margin:0}}>Week</h3>
            <div className="muted">{range.start.toISOString().slice(0,10)} → {range.end.toISOString().slice(0,10)}</div>
          </div>
          <div style={{display:'flex',gap:8,alignItems:'center'}}>
            <button className="btn ghost" onClick={()=>shiftWeek(-1)}>Prev</button>
            <input type="date" value={anchorDate} onChange={e=>setAnchorDate(e.target.value)} />
            <button className="btn ghost" onClick={()=>shiftWeek(1)}>Next</button>
            <button className="btn orange" onClick={generateWeeklyCSV} style={{marginLeft:8}}>Download CSV</button>
          </div>
        </div>

        <div style={{marginTop:12}}>
          <div className="summary-panel">
            <div className="summary-box summary-daily" style={{cursor:'default'}}>
              {/* Icon removed */}
              <div className="sb-meta">
                <div className="sb-title">TelBirr</div>
                <div className="sb-value">{formatBirr(totals.telbirr)}</div>
                <div className="sb-desc">Total for the week</div>
              </div>
            </div>

            <div className="summary-box summary-weekly" style={{cursor:'default'}}>
              {/* Icon removed */}
              <div className="sb-meta">
                <div className="sb-title">Cash</div>
                <div className="sb-value">{formatBirr(totals.cash)}</div>
                <div className="sb-desc">Total for the week</div>
              </div>
            </div>

            <div className="summary-box summary-monthly" style={{cursor:'default'}}>
              {/* Icon removed */}
              <div className="sb-meta">
                <div className="sb-title">Bank / Transfer</div>
                <div className="sb-value">{formatBirr(totals.bank)}</div>
                <div className="sb-desc">Total for the week</div>
              </div>
            </div>

            <div className="summary-box summary-total" style={{cursor:'default'}}>
              <div className="sb-icon">Σ</div>
              <div className="sb-meta">
                <div className="sb-title">Total</div>
                <div className="sb-value">{formatBirr((totals.telbirr + totals.cash + totals.bank) || 0)}</div>
                <div className="sb-desc">Combined total for the week</div>
              </div>
            </div>
          </div>
        </div>

        {/* Header metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
          <div className="rounded-lg bg-slate-100 p-3">
            <div className="text-slate-500 text-xs">Total Revenue</div>
            <div className="text-slate-900 font-extrabold text-lg">{formatBirr(metrics.total)}</div>
          </div>
          <div className="rounded-lg bg-slate-100 p-3">
            <div className="text-slate-500 text-xs">Average Daily</div>
            <div className="text-slate-900 font-extrabold text-lg">{formatBirr(metrics.avgDaily)}</div>
          </div>
          <div className="rounded-lg bg-slate-100 p-3">
            <div className="text-slate-500 text-xs">Orders</div>
            <div className="text-slate-900 font-extrabold text-lg">{Number(metrics.orders||0).toLocaleString()}</div>
          </div>
        </div>

        {/* Revenue by day chart (line) */}
        <div className="card" style={{marginTop:14}}>
          <h3 className="mb-2">Revenue by Day</h3>
          <div className="h-64">
            <canvas ref={lineRef} />
          </div>
        </div>

        {/* Payment method breakdown (stacked) */}
        <div className="card" style={{marginTop:14}}>
          <h3 className="mb-2">Payment Method Breakdown (Daily)</h3>
          <div className="h-64">
            <canvas ref={stackedRef} />
          </div>
        </div>

        {/* Top products chart and summary */}
        <div className="card" style={{marginTop:14}}>
          <h3 style={{marginTop:0, marginBottom:8}}>Top Products (By Revenue)</h3>
          <div style={{display:'grid', gridTemplateColumns:'minmax(240px,1.2fr) minmax(240px,1fr)', gap:12}}>
            <div style={{height:280}}>
              <ChartTopProducts products={topProducts} />
            </div>
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%', borderCollapse:'separate', borderSpacing:0}}>
                <thead>
                  <tr style={{textAlign:'left', background:'#f8fafc'}}>
                    <th style={{padding:'8px 10px', fontSize:12, color:'#475569'}}>Product</th>
                    <th style={{padding:'8px 10px', fontSize:12, color:'#475569'}}>Qty</th>
                    <th style={{padding:'8px 10px', fontSize:12, color:'#475569'}}>Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {topProducts.map((p, idx) => (
                    <tr key={p.label+idx} style={{borderTop:'1px solid #e2e8f0'}}>
                      <td style={{padding:'8px 10px', fontSize:12, color:'#0f172a'}}>{p.label}</td>
                      <td style={{padding:'8px 10px', fontSize:12, color:'#0f172a'}}>{Number(p.qty||0).toLocaleString()}</td>
                      <td style={{padding:'8px 10px', fontSize:12, color:'#0f172a', fontWeight:700}}>{Number(p.rev||0).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Weekly Receipts Summary (on-page) */}
        {showWeeklySummary && (() => {
          const data = buildWeeklyData();
          return (
            <div className="card" style={{marginTop:14}}>
              <h3 className="mb-2">Weekly Receipts Summary — {range.start.toISOString().slice(0,10)} → {range.end.toISOString().slice(0,10)}</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full" style={{borderCollapse:'separate', borderSpacing:0}}>
                  <thead>
                    <tr style={{textAlign:'left', background:'#f8fafc'}}>
                      <th className="px-3 py-2 text-sm text-slate-600">Cashier</th>
                      <th className="px-3 py-2 text-sm text-slate-600">Cash Total</th>
                      <th className="px-3 py-2 text-sm text-slate-600">Mobile Money Total</th>
                      <th className="px-3 py-2 text-sm text-slate-600">Bank Transfer Total</th>
                      <th className="px-3 py-2 text-sm text-slate-600">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.overview.map((r,i)=> (
                      <tr key={r.cashier+i} className="border-t border-slate-200">
                        <td className="px-3 py-2 text-sm text-slate-900">{r.cashier}</td>
                        <td className="px-3 py-2 text-sm text-slate-900">{numberStr(r.cash)}</td>
                        <td className="px-3 py-2 text-sm text-slate-900">{numberStr(r.mobile)}</td>
                        <td className="px-3 py-2 text-sm text-slate-900">{numberStr(r.bank)}</td>
                        <td className="px-3 py-2 text-sm font-bold text-slate-900">{numberStr(r.subtotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {Object.keys(data.byCashier).map((name, idx) => {
                const pack = data.byCashier[name];
                return (
                  <div key={name+idx} className="mt-4">
                    <h4 className="text-base font-bold">Cashier: {name}</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                      <div className="rounded bg-slate-100 p-2"><div className="text-xs text-slate-500">Cash</div><div className="text-sm font-semibold text-slate-900">{numberStr(pack.totals['Cash'])}</div></div>
                      <div className="rounded bg-slate-100 p-2"><div className="text-xs text-slate-500">Mobile Money</div><div className="text-sm font-semibold text-slate-900">{numberStr(pack.totals['Mobile Money'])}</div></div>
                      <div className="rounded bg-slate-100 p-2"><div className="text-xs text-slate-500">Bank Transfer</div><div className="text-sm font-semibold text-slate-900">{numberStr(pack.totals['Bank Transfer'])}</div></div>
                      <div className="rounded bg-slate-100 p-2"><div className="text-xs text-slate-500">Other</div><div className="text-sm font-semibold text-slate-900">{numberStr(pack.totals['Other'])}</div></div>
                    </div>
                    <div className="overflow-x-auto mt-3">
                      <table className="min-w-full" style={{borderCollapse:'separate', borderSpacing:0}}>
                        <thead>
                          <tr style={{textAlign:'left', background:'#f8fafc'}}>
                            <th className="px-3 py-2 text-sm text-slate-600">Employee</th>
                            <th className="px-3 py-2 text-sm text-slate-600">Date</th>
                            <th className="px-3 py-2 text-sm text-slate-600">Hours</th>
                            <th className="px-3 py-2 text-sm text-slate-600">Rate</th>
                            <th className="px-3 py-2 text-sm text-slate-600">Total</th>
                            <th className="px-3 py-2 text-sm text-slate-600">Payment Method</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pack.receipts.map((r, i)=> (
                            <tr key={i} className="border-t border-slate-200">
                              <td className="px-3 py-2 text-sm text-slate-900">{r.employee}</td>
                              <td className="px-3 py-2 text-sm text-slate-900">{formatDate(r.date)}</td>
                              <td className="px-3 py-2 text-sm text-slate-900">{r.hours ?? ''}</td>
                              <td className="px-3 py-2 text-sm text-slate-900">{r.rate ?? ''}</td>
                              <td className="px-3 py-2 text-sm font-bold text-slate-900">{numberStr(r.total)}</td>
                              <td className="px-3 py-2 text-sm text-slate-900">{r.paymentMethod}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="mt-2 text-sm font-bold">Subtotal: {numberStr(pack.subtotal)}</div>
                  </div>
                );
              })}

              <div className="mt-4">
                <h4 className="text-base font-bold">Final Summary</h4>
                <div className="overflow-x-auto mt-2">
                  <table className="min-w-full" style={{borderCollapse:'separate', borderSpacing:0}}>
                    <thead>
                      <tr style={{textAlign:'left', background:'#f8fafc'}}>
                        <th className="px-3 py-2 text-sm text-slate-600">Category</th>
                        <th className="px-3 py-2 text-sm text-slate-600">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-t border-slate-200"><td className="px-3 py-2 text-sm text-slate-900">Total Cash</td><td className="px-3 py-2 text-sm text-slate-900">{numberStr(data.final.totalCash)}</td></tr>
                      <tr className="border-t border-slate-200"><td className="px-3 py-2 text-sm text-slate-900">Total Mobile Money</td><td className="px-3 py-2 text-sm text-slate-900">{numberStr(data.final.totalMobile)}</td></tr>
                      <tr className="border-t border-slate-200"><td className="px-3 py-2 text-sm text-slate-900">Total Bank Transfer</td><td className="px-3 py-2 text-sm text-slate-900">{numberStr(data.final.totalBank)}</td></tr>
                      <tr className="border-t border-slate-200"><td className="px-3 py-2 text-sm font-bold text-slate-900">Grand Total</td><td className="px-3 py-2 text-sm font-bold text-slate-900">{numberStr(data.final.grand)}</td></tr>
                    </tbody>
                  </table>
                </div>
                <div className="mt-2 text-sm text-slate-700">Prepared By: ___________________ &nbsp; Approved By: ___________________ &nbsp; Date: _____________</div>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
