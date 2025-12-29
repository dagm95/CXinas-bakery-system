import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GiExpense, GiProfit } from "react-icons/gi";
import { FaHome } from "react-icons/fa";

function formatNumber(n){
  if (n === null || n === undefined) return '-';
  return Number(n).toLocaleString(undefined, {maximumFractionDigits:2});
}

export default function DashboardRoute(){
  const navigate = useNavigate();
  const [allTimeSales, setAllTimeSales] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [todaysRevenue, setTodaysRevenue] = useState(0);
  const [todaysReceipts, setTodaysReceipts] = useState(0);
  const now = new Date();
  const dayName = now.toLocaleDateString(undefined, { weekday: 'long' });
  const dateText = now.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

  useEffect(()=>{
    try{
      const raw = localStorage.getItem('bakery_app_v1');
      const store = raw ? JSON.parse(raw) : {};
      const sales = Array.isArray(store.sales) ? store.sales : [];

      let total = 0;
      let todayTotal = 0;
      let todayCount = 0;
      const todayKey = new Date().toISOString().slice(0,10);

      sales.forEach(s => {
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
          total += rev;
          const dateKey = (s.saleDate || s.timestamp || s.ts) ? new Date(s.saleDate || s.timestamp || s.ts).toISOString().slice(0,10) : todayKey;
          if (dateKey === todayKey){ todayTotal += rev; todayCount += 1; }
        }catch(e){}
      });

      setAllTimeSales(sales.length);
      setTotalRevenue(total);
      setTodaysRevenue(todayTotal);
      setTodaysReceipts(todayCount);
    }catch(e){
      setAllTimeSales(0);
      setTotalRevenue(0);
      setTodaysRevenue(0);
      setTodaysReceipts(0);
    }
  }, []);

  return (
    <div className="container">
      {/* Hero banner */}
      <div className="rounded-3xl p-6 sm:p-7 bg-gradient-to-br from-[#0f172a] via-[#111c2b] to-[#0f172a] shadow-[0_20px_60px_rgba(2,6,23,0.35)] ring-1 ring-white/5 flex items-center justify-between gap-6" style={{marginTop:8, marginBottom:12}}>
        <div className="flex items-center gap-5 min-w-0">
          <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-gradient-to-br from-orange-400 to-amber-500 shadow-[0_12px_28px_rgba(255,149,0,0.35)] flex items-center justify-center text-white shrink-0">
            <FaHome size={34} />
          </div>
          <div className="min-w-0">
            <h1 className="text-white text-3xl sm:text-4xl font-extrabold leading-tight truncate">Dashboard</h1>
            <p className="text-slate-300 text-base sm:text-lg mt-1 truncate">Here's what's happening at your bakery today</p>
          </div>
        </div>
        <div className="hidden sm:flex flex-col items-end ml-4">
          <div className="text-slate-400 text-sm">{dayName}</div>
          <div className="text-white text-lg font-semibold">{dateText}</div>
        </div>
      </div>

      <div className="summary-grid">
        <div className="card summary-card">
          <h4 className="summary-label">All-time sales</h4>
          <div className="summary-value">{formatNumber(allTimeSales)}</div>
        </div>
        <div className="card summary-card">
          <h4 className="summary-label">Total revenue</h4>
          <div className="summary-value">{formatNumber(totalRevenue)} Birr</div>
        </div>
        <div className="card summary-card">
          <h4 className="summary-label">Today's revenue</h4>
          <div className="summary-value">{formatNumber(todaysRevenue)} Birr</div>
        </div>
        <div className="card summary-card">
          <h4 className="summary-label">Today's receipts</h4>
          <div className="summary-value">{formatNumber(todaysReceipts)}</div>
        </div>
      </div>

      <div className="card" style={{marginTop:16}}>
        <h3>Available pages</h3>
        <div className="nav-grid">
          <div role="link" tabIndex={0} className="nav-card blue" onClick={()=>navigate('/admin/sales')} onKeyDown={(e)=>{ if(e.key==='Enter') navigate('/admin/sales'); }}>
            <div className="nav-icon inline-flex items-center justify-center w-10 h-10 rounded-lg bg-white/10 text-white">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M7 3h10v18l-2-1-2 1-2-1-2 1-2-1-2 1V3z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
                <path d="M8.5 7H15.5M8.5 10H15.5M8.5 13H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
              <div className="nav-title">Sales Management</div>
            <div className="nav-sub">POS Insights</div>
          </div>

          <div role="link" tabIndex={0} className="nav-card green" onClick={()=>navigate('/admin/inventory')} onKeyDown={(e)=>{ if(e.key==='Enter') navigate('/admin/inventory'); }}>
            <div className="nav-icon inline-flex items-center justify-center w-10 h-10 rounded-lg bg-white/10 text-white">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="4" y="7" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="2"/>
                <path d="M4 11h16M10 7v4M14 7v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <div className="nav-title">Inventory</div>
            <div className="nav-sub">Stock Status</div>
          </div>

          <div role="link" tabIndex={0} className="nav-card purple" onClick={()=>navigate('/admin/employees')} onKeyDown={(e)=>{ if(e.key==='Enter') navigate('/admin/employees'); }}>
            <div className="nav-icon inline-flex items-center justify-center w-10 h-10 rounded-lg bg-white/10 text-white">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" stroke="currentColor" strokeWidth="2"/>
                <path d="M16 12.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" stroke="currentColor" strokeWidth="2"/>
                <path d="M3 20c0-3.314 3.134-6 7-6s7 2.686 7 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <div className="nav-title">Employees</div>
            <div className="nav-sub">Performance</div>
          </div>

          <div role="link" tabIndex={0} className="nav-card orange" onClick={()=>navigate('/admin/profits')} onKeyDown={(e)=>{ if(e.key==='Enter') navigate('/admin/profits'); }}>
            <div className="nav-icon inline-flex items-center justify-center w-10 h-10 rounded-lg bg-white/10 text-white">
              <GiProfit size={22} className="w-5 h-5" aria-hidden="true" />
            </div>
            <div className="nav-title">Profits</div>
            <div className="nav-sub">Financial Analytics</div>
          </div>

          <div role="link" tabIndex={0} className="nav-card brown" onClick={()=>navigate('/admin/production')} onKeyDown={(e)=>{ if(e.key==='Enter') navigate('/admin/production'); }}>
            <div className="nav-icon inline-flex items-center justify-center w-10 h-10 rounded-lg bg-white/10 text-white">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 7h8a5 5 0 0 1 5 5v5H3V7z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
                <path d="M16 12a5 5 0 0 1 5 5v0H16v-5z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="nav-title">Production</div>
            <div className="nav-sub">Bakery Overview</div>
          </div>

          <div role="link" tabIndex={0} className="nav-card teal" onClick={()=>navigate('/admin/expenses')} onKeyDown={(e)=>{ if(e.key==='Enter') navigate('/admin/expenses'); }}>
            <div className="nav-icon inline-flex items-center justify-center w-10 h-10 rounded-lg bg-white/10 text-white">
              <GiExpense size={22} className="w-5 h-5" aria-hidden="true" />
            </div>
            <div className="nav-title">Expenses</div>
            <div className="nav-sub">Cost Tracking</div>
          </div>

          <div role="link" tabIndex={0} className="nav-card blue-muted" onClick={()=>navigate('/admin/reports')} onKeyDown={(e)=>{ if(e.key==='Enter') navigate('/admin/reports'); }}>
            <div className="nav-icon inline-flex items-center justify-center w-10 h-10 rounded-lg bg-white/10 text-white">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 20h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <rect x="6" y="10" width="3" height="6" rx="1" stroke="currentColor" strokeWidth="2"/>
                <rect x="11" y="7" width="3" height="9" rx="1" stroke="currentColor" strokeWidth="2"/>
                <rect x="16" y="12" width="3" height="4" rx="1" stroke="currentColor" strokeWidth="2"/>
              </svg>
            </div>
              <div className="nav-title">Payment Tracker</div>
              <div className="nav-sub">Method Totals</div>
          </div>

          
        </div>
    
      </div>
    </div>
  );
}
