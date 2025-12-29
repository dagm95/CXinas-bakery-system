
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import ChartRevenue14Days from "../components/ChartRevenue14Days";
import SampleChart from "../components/SampleChart";

function startOfMonth(d){ const dt = new Date(d); dt.setDate(1); dt.setHours(0,0,0,0); return dt; }
function endOfMonth(d){ const dt = new Date(d); dt.setMonth(dt.getMonth()+1,0); dt.setHours(23,59,59,999); return dt; }

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
  for(const k of keys){ if(!k) continue; const v = String(k).toLowerCase(); if(v.includes('cash')) return 'cash'; if(v.includes('tel') || v.includes('birr') || v.includes('telebirr') || v.includes('telbirr')) return 'telbirr'; if(v.includes('bank') || v.includes('transfer')) return 'bank'; }
  if(Array.isArray(s.payments) && s.payments.length){ const p = s.payments[0]; if(p && p.method){ const v = String(p.method).toLowerCase(); if(v.includes('cash')) return 'cash'; if(v.includes('tel') || v.includes('birr')) return 'telbirr'; if(v.includes('bank') || v.includes('transfer')) return 'bank'; } }
  return 'other';
}

function formatBirr(n){ if (n == null) return '-'; return Number(n).toLocaleString(undefined, {maximumFractionDigits:2}) + ' Birr'; }

export default function SummaryMonthly(){
  const navigate = useNavigate();
  const [anchor, setAnchor] = useState(() => new Date().toISOString().slice(0,7)); // YYYY-MM

  const range = useMemo(()=>{
    const d = new Date(anchor + '-01');
    return { start: startOfMonth(d), end: endOfMonth(d) };
  }, [anchor]);

  const [totals, setTotals] = useState({telbirr:0, cash:0, bank:0, other:0});
  const [count, setCount] = useState(0);
  const [dailySeries, setDailySeries] = useState([]);
  const [topItems, setTopItems] = useState([]);
  const [monthlySummaries, setMonthlySummaries] = useState({});

  useEffect(()=>{
    try{
      const raw = localStorage.getItem('bakery_app_v1');
      const store = raw ? JSON.parse(raw) : {};
      const sales = Array.isArray(store.sales) ? store.sales : [];

      let tel = 0, cash = 0, bank = 0, other = 0, cnt = 0;
      const days = {};
      const itemsMap = {};

      sales.forEach(s => {
        try{
          const ts = s.saleDate || s.timestamp || s.ts;
          if(!ts) return;
          const tdate = new Date(ts);
          if(tdate < range.start || tdate > range.end) return;
          const rev = parseSaleTotal(s);
          const pm = detectPaymentMethod(s);
          if(pm === 'telbirr') tel += rev;
          else if(pm === 'cash') cash += rev;
          else if(pm === 'bank') bank += rev;
          else other += rev;
          cnt += 1;

          const dayKey = tdate.toISOString().slice(0,10);
          days[dayKey] = (days[dayKey] || 0) + rev;

          if(Array.isArray(s.items)){
            s.items.forEach(it=>{
              const name = it.name ?? it.title ?? it.product ?? 'Unknown';
              const q = Number(it.quantity ?? it.qty ?? 1) || 1;
              const revIt = Number(it.subtotal ?? (it.price * it.quantity) ?? it.price ?? 0) || 0;
              const key = name;
              if(!itemsMap[key]) itemsMap[key] = {name:key, qty:0, revenue:0};
              itemsMap[key].qty += q;
              itemsMap[key].revenue += revIt;
            });
          }
        }catch(e){}
      });

      // build daily series for chart
      const dayList = [];
      for(let d = new Date(range.start); d <= range.end; d.setDate(d.getDate()+1)){
        const key = d.toISOString().slice(0,10);
        dayList.push({ date: key, value: days[key] || 0 });
      }

      // top items
      const itemsArr = Object.values(itemsMap);
      itemsArr.sort((a,b)=> b.revenue - a.revenue);

      setTotals({telbirr: tel, cash: cash, bank: bank, other: other});
      setCount(cnt);
      setDailySeries(dayList);
      setTopItems(itemsArr.slice(0,10));
    }catch(e){ setTotals({telbirr:0,cash:0,bank:0,other:0}); setCount(0); setDailySeries([]); setTopItems([]); }
  }, [range]);

  // load monthly summaries map from bakery_app_v1
  useEffect(()=>{
    try{
      const raw = localStorage.getItem('bakery_app_v1');
      const store = raw ? JSON.parse(raw) : {};
      const ms = store.monthlySummaries || {};
      setMonthlySummaries(ms);
    }catch(e){ setMonthlySummaries({}); }
  }, []);

  // Persist monthlySummaries back to bakery_app_v1
  function saveMonthlySummaries(nextMap){
    try{
      const raw = localStorage.getItem('bakery_app_v1');
      const store = raw ? JSON.parse(raw) : {};
      store.monthlySummaries = nextMap;
      localStorage.setItem('bakery_app_v1', JSON.stringify(store));
      setMonthlySummaries(nextMap);
    }catch(e){ console.error('saveMonthlySummaries', e); }
  }

  function prevMonth(){ const d = new Date(anchor + '-01'); d.setMonth(d.getMonth()-1); setAnchor(d.toISOString().slice(0,7)); }
  function nextMonth(){ const d = new Date(anchor + '-01'); d.setMonth(d.getMonth()+1); setAnchor(d.toISOString().slice(0,7)); }

  // Generate and store a compressed monthly summary for `anchor` month
  function generateMonthlySummary(){
    try{
      const raw = localStorage.getItem('bakery_app_v1');
      const store = raw ? JSON.parse(raw) : {};
      const sales = Array.isArray(store.sales) ? store.sales : [];
      const start = range.start, end = range.end;

      let totalReceipts = 0;
      let totalAmount = 0;
      const byPayment = { telbirr:0, cash:0, bank:0, other:0 };
      const products = {}; // label -> { qty, revenue }

      sales.forEach(s => {
        try{
          const ts = s.saleDate || s.timestamp || s.ts;
          if(!ts) return;
          const tdate = new Date(ts);
          if(tdate < start || tdate > end) return;
          const rev = parseSaleTotal(s);
          totalReceipts += 1;
          totalAmount += rev;
          const pm = detectPaymentMethod(s);
          if(pm === 'telbirr') byPayment.telbirr += rev;
          else if(pm === 'cash') byPayment.cash += rev;
          else if(pm === 'bank') byPayment.bank += rev;
          else byPayment.other += rev;

          // products
          const last = s;
          const rawItems = Array.isArray(last.items) ? last.items : (Array.isArray(last.lines) ? last.lines : (Array.isArray(last.orderItems) ? last.orderItems : []));
          if(rawItems && rawItems.length){
            rawItems.forEach(it => {
              const label = it.productLabel ?? it.label ?? it.name ?? it.title ?? it.product ?? 'Item';
              const q = Number(it.quantity ?? it.qty ?? 1) || 1;
              const revIt = Number(it.subtotal ?? (it.price * q) ?? it.total ?? 0) || 0;
              if(!products[label]) products[label] = { qty:0, revenue:0 };
              products[label].qty += q;
              products[label].revenue += revIt;
            });
          } else if(last.productLabel || last.product || last.title || last.name){
            const label = last.productLabel ?? last.product ?? last.title ?? last.name ?? 'Item';
            const q = Number(last.quantity ?? last.qty ?? 1) || 1;
            const revIt = Number(last.total ?? last.totalAmount ?? 0) || 0;
            if(!products[label]) products[label] = { qty:0, revenue:0 };
            products[label].qty += q; products[label].revenue += revIt;
          }
        }catch(e){ }
      });

      const key = anchor; // YYYY-MM
      const summary = {
        month: key,
        generatedAt: new Date().toISOString(),
        totalReceipts,
        totalAmount,
        byPayment,
        products,
      };

      const next = Object.assign({}, monthlySummaries);
      next[key] = summary;
      saveMonthlySummaries(next);
      alert(`Saved monthly summary for ${key}`);
    }catch(e){ console.error('generateMonthlySummary', e); alert('Failed to generate summary'); }
  }

  const avgPerDay = useMemo(()=>{
    if(!dailySeries || dailySeries.length===0) return 0;
    const total = dailySeries.reduce((s,d)=> s + (d.value||0),0);
    return total / dailySeries.length;
  }, [dailySeries]);

  return (
    <div className="container">
      <div className="flex items-center gap-3 py-4">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 via-amber-500 to-rose-500 text-white shadow">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 4h18v4H3z"/>
            <path d="M3 12h18v8H3z"/>
          </svg>
        </div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">Monthly Report</h1>
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
            <h3 style={{margin:0}}>Month</h3>
            <div className="muted">{anchor}</div>
          </div>
          <div style={{display:'flex',gap:8,alignItems:'center'}}>
            <button className="btn ghost" onClick={prevMonth}>Prev</button>
            <input type="month" value={anchor} onChange={e=>setAnchor(e.target.value)} />
            <button className="btn ghost" onClick={nextMonth}>Next</button>
            <button className="btn orange" onClick={generateMonthlySummary} title="Compress and store this month's receipts">Generate Summary</button>
          </div>
        </div>

        <div style={{marginTop:12}}>
          <div className="summary-panel">
            <div className="summary-box summary-daily">
              {/* Icon removed */}
              <div className="sb-meta">
                <div className="sb-title">TelBirr</div>
                <div className="sb-value">{formatBirr(totals.telbirr)}</div>
                <div className="sb-desc">Receipts: {count}</div>
              </div>
            </div>

            <div className="summary-box summary-weekly">
              {/* Icon removed */}
              <div className="sb-meta">
                <div className="sb-title">Cash</div>
                <div className="sb-value">{formatBirr(totals.cash)}</div>
                <div className="sb-desc">Avg / day: {formatBirr(avgPerDay)}</div>
              </div>
            </div>

            <div className="summary-box summary-monthly">
              {/* Icon removed */}
              <div className="sb-meta">
                <div className="sb-title">Bank / Transfer</div>
                <div className="sb-value">{formatBirr(totals.bank)}</div>
                <div className="sb-desc">Top item: {topItems[0]?.name ?? '—'}</div>
              </div>
            </div>

            <div className="summary-box summary-total">
              <div className="sb-icon">Σ</div>
              <div className="sb-meta">
                <div className="sb-title">Total</div>
                <div className="sb-value">{formatBirr((totals.telbirr + totals.cash + totals.bank) || 0)}</div>
                <div className="sb-desc">Combined total for the month</div>
              </div>
            </div>
          </div>

          <div style={{marginTop:14,display:'flex',gap:24,alignItems:'flex-start', flexWrap:'wrap'}}>
            <div style={{flex:1, minWidth:320, background:'#fff', borderRadius:12, padding:20, boxShadow:'0 1px 3px rgba(0,0,0,0.04)'}}>
              <h4 style={{marginBottom:12, fontWeight:700}}>Revenue by Day (Line Chart)</h4>
              <div style={{height:260}}>
                <SampleChart
                  id="monthly-line-chart"
                  labels={dailySeries.map(d=>d.date)}
                  data={dailySeries.map(d=>d.value)}
                  label="Revenue"
                  type="line"
                />
              </div>
            </div>
            <div style={{flex:1, minWidth:320, background:'#fff', borderRadius:12, padding:20, boxShadow:'0 1px 3px rgba(0,0,0,0.04)'}}>
              <h4 style={{marginBottom:12, fontWeight:700}}>Revenue by Day (Bar Chart)</h4>
              <div style={{height:260}}>
                <SampleChart
                  id="monthly-bar-chart"
                  labels={dailySeries.map(d=>d.date)}
                  data={dailySeries.map(d=>d.value)}
                  label="Revenue"
                  type="bar"
                />
              </div>
            </div>
            <div style={{flex:1, minWidth:320, background:'#fff', borderRadius:12, padding:20, boxShadow:'0 1px 3px rgba(0,0,0,0.04)'}}>
              <h4 style={{marginBottom:12, fontWeight:700}}>Payment Method Breakdown</h4>
              <div style={{height:260}}>
                <SampleChart
                  id="payment-method-bar"
                  labels={["TelBirr", "Cash", "Bank", "Other"]}
                  data={[totals.telbirr, totals.cash, totals.bank, totals.other]}
                  label="Total"
                  type="bar"
                />
              </div>
            </div>
          </div>
          <div style={{marginTop:18}}>
            <h4>Monthly summaries</h4>
              {/* Monthly summaries grid/cards removed */}
          </div>
        </div>
      </div>
    </div>
  );
}
