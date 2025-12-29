import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function ExpensePayments(){
  const navigate = useNavigate();
  const [view, setView] = useState('monthly'); // default to monthly overview
  const [currentDate, setCurrentDate] = useState(new Date());
  const [expenses, setExpenses] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all'); // all | paid | unpaid
  const [categoryFilter, setCategoryFilter] = useState('all');

  useEffect(()=>{
    try {
      const raw = localStorage.getItem('bakery_admin_expenses');
      const list = raw ? JSON.parse(raw) : [];
      setExpenses(Array.isArray(list) ? list : []);
    } catch(e) { setExpenses([]); }
  }, []);

  const saveExpenses = (list) => {
    setExpenses(list);
    try{ localStorage.setItem('bakery_admin_expenses', JSON.stringify(list)); }catch(e){}
  };

  const navigateDate = (direction) => {
    const newDate = new Date(currentDate);
    if (view === 'daily') newDate.setDate(newDate.getDate() + direction);
    else if (view === 'weekly') newDate.setDate(newDate.getDate() + (direction * 7));
    else if (view === 'monthly') newDate.setMonth(newDate.getMonth() + direction);
    setCurrentDate(newDate);
  };

  const dateMatches = (d) => {
    const date = new Date(d);
    if (view === 'daily') return date.toDateString() === currentDate.toDateString();
    if (view === 'weekly') {
      const start = new Date(currentDate); start.setDate(currentDate.getDate() - currentDate.getDay()); start.setHours(0,0,0,0);
      const end = new Date(start); end.setDate(start.getDate() + 6); end.setHours(23,59,59,999);
      return date >= start && date <= end;
    }
    if (view === 'monthly') return date.getMonth() === currentDate.getMonth() && date.getFullYear() === currentDate.getFullYear();
    return true;
  };

  const categories = ['all', 'General', 'Utilities', 'Maintenance', 'Salary', 'Rent', 'Other'];

  const filtered = (expenses||[]).filter(e => dateMatches(e.date))
    .filter(e => statusFilter==='all' ? true : (statusFilter==='paid' ? !!e.paid : !e.paid))
    .filter(e => categoryFilter==='all' ? true : (e.category === categoryFilter));

  const totalsAll = (expenses||[]).filter(e => dateMatches(e.date)).reduce((s,e)=> s + Number(e.amount||0), 0);
  const totalsPaid = (expenses||[]).filter(e => dateMatches(e.date) && e.paid).reduce((s,e)=> s + Number(e.amount||0), 0);
  const totalsUnpaid = totalsAll - totalsPaid;

  const markPaidToggle = (id) => {
    const next = expenses.map(e => {
      if (e.id !== id) return e;
      const nowPaid = !e.paid;
      return { ...e, paid: nowPaid, paidDate: nowPaid ? new Date().toISOString() : null };
    });
    saveExpenses(next);
  };

  const getDateLabel = () => {
    if (view === 'daily') return currentDate.toDateString();
    if (view === 'weekly') {
      const start = new Date(currentDate);
      start.setDate(currentDate.getDate() - currentDate.getDay());
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      return `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;
    }
    if (view === 'monthly') return currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
    return '';
  };

  return (
    <div className="container">
      <div className="header">
        <div className="logo">🧾</div>
        <h1>Expense Payments Tracker</h1>
        <button className="btn" style={{marginLeft:12}} onClick={()=>navigate('/admin/reports')}>Back to Payment Tracker</button>
      </div>

      <div className="card">
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 16}}>
          <div style={{display:'flex', gap: 8}}>
            {['daily','weekly','monthly'].map(v => (
              <button
                key={v}
                className={`btn ${view===v ? '' : 'secondary'}`}
                onClick={()=>{ setView(v); setCurrentDate(new Date()); }}
                style={view===v
                  ? { background:'#1d4ed8', color:'#ffffff', border:'1px solid #1e40af' }
                  : { background:'#f1f5f9', color:'#0f172a', border:'1px solid #cbd5e1' }
                }
              >
                {v[0].toUpperCase()+v.slice(1)}
              </button>
            ))}
          </div>
          <div style={{display:'flex', alignItems:'center', gap: 8}}>
            <button className="btn secondary" onClick={()=>navigateDate(-1)} style={{background:'#e2e8f0', color:'#0f172a', border:'1px solid #cbd5e1'}}>◀ Prev</button>
            <div style={{fontWeight:'bold',fontSize:16,minWidth:200,textAlign:'center'}}>{getDateLabel()}</div>
            <button className="btn secondary" onClick={()=>navigateDate(1)} style={{background:'#e2e8f0', color:'#0f172a', border:'1px solid #cbd5e1'}}>Next ▶</button>
          </div>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:12,marginBottom:16}}>
          <div className="summary-box" style={{background:'linear-gradient(135deg,#dbeafe,#93c5fd)'}}>
            <div className="sb-meta">
              <div className="sb-title" style={{color:'#0f172a', fontWeight:700}}>Total</div>
              <div className="sb-value" style={{color:'#0f172a', fontWeight:800, fontSize:22}}>{totalsAll.toLocaleString(undefined,{minimumFractionDigits:2})} Birr</div>
            </div>
          </div>
          <div className="summary-box" style={{background:'linear-gradient(135deg,#bbf7d0,#86efac)'}}>
            <div className="sb-meta">
              <div className="sb-title" style={{color:'#0f172a', fontWeight:700}}>Paid</div>
              <div className="sb-value" style={{color:'#0f172a', fontWeight:800, fontSize:22}}>{totalsPaid.toLocaleString(undefined,{minimumFractionDigits:2})} Birr</div>
            </div>
          </div>
          <div className="summary-box" style={{background:'linear-gradient(135deg,#fecaca,#fca5a5)'}}>
            <div className="sb-meta">
              <div className="sb-title" style={{color:'#0f172a', fontWeight:700}}>Unpaid</div>
              <div className="sb-value" style={{color:'#0f172a', fontWeight:800, fontSize:22}}>{totalsUnpaid.toLocaleString(undefined,{minimumFractionDigits:2})} Birr</div>
            </div>
          </div>
        </div>

        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12,flexWrap:'wrap'}}>
          <span style={{fontSize:12,color:'#64748b',fontWeight:600}}>Status:</span>
          {['all','paid','unpaid'].map(s => (
            <button
              key={s}
              className="btn"
              onClick={()=>setStatusFilter(s)}
              style={{ padding:'6px 10px', fontSize:12, borderRadius:6, border:'1px solid #cbd5e1', background: statusFilter===s ? '#1d4ed8' : '#ffffff', color: statusFilter===s ? '#ffffff' : '#334155' }}
            >{s==='all'?'All':(s==='paid'?'Paid':'Unpaid')}</button>
          ))}
          <span style={{fontSize:12,color:'#64748b',fontWeight:600}}>Category:</span>
          <select value={categoryFilter} onChange={e=>setCategoryFilter(e.target.value)} style={{padding:'6px 10px',border:'1px solid #cbd5e1',borderRadius:6,fontSize:12,background:'#fff'}}>
            {categories.map(c => (<option key={c} value={c}>{c}</option>))}
          </select>
          <span style={{fontSize:12,color:'#475569'}}>Showing {filtered.length}</span>
        </div>

        {filtered.length === 0 ? (
          <p className="muted" style={{textAlign:'center',padding:20}}>No expenses found for this period.</p>
        ) : (
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead>
              <tr style={{borderBottom:'2px solid #f1f5f9',textAlign:'left'}}>
                <th style={{padding:10}}>Date</th>
                <th style={{padding:10}}>Description</th>
                <th style={{padding:10}}>Category</th>
                <th style={{padding:10,textAlign:'right'}}>Amount</th>
                <th style={{padding:10}}>Status</th>
                <th style={{padding:10,textAlign:'right'}}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(item => (
                <tr key={item.id} style={{borderBottom:'1px solid #f1f5f9'}}>
                  <td style={{padding:10}}>{new Date(item.date).toLocaleDateString()}</td>
                  <td style={{padding:10}}>{item.desc}</td>
                  <td style={{padding:10}}><span style={{background:'#eef2ff',color:'#4f46e5',padding:'2px 8px',borderRadius:4,fontSize:12}}>{item.category}</span></td>
                  <td style={{padding:10,textAlign:'right',fontWeight:'bold'}}>{Number(item.amount).toLocaleString()}</td>
                  <td style={{padding:10}}>{item.paid ? <span style={{background:'#dcfce7',color:'#166534',padding:'2px 8px',borderRadius:4,fontSize:12}}>Paid</span> : <span style={{background:'#fee2e2',color:'#b91c1c',padding:'2px 8px',borderRadius:4,fontSize:12}}>Unpaid</span>}</td>
                  <td style={{padding:10,textAlign:'right'}}>
                    <button
                      className="btn"
                      style={{
                        padding:'6px 10px',
                        fontSize:12,
                        marginRight:8,
                        background: item.paid ? '#dc2626' : '#16a34a',
                        color:'#ffffff',
                        border:'1px solid '+(item.paid ? '#b91c1c' : '#15803d')
                      }}
                      onClick={()=>markPaidToggle(item.id)}
                    >
                      {item.paid ? 'Mark Unpaid' : 'Mark Paid'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
