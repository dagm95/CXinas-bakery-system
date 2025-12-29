import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiBarChart2 } from "react-icons/fi";

export default function PaymentTracker(){
  const navigate = useNavigate();
  const [weeklyTotal, setWeeklyTotal] = useState(0);
  const [monthlyTotal, setMonthlyTotal] = useState(0);
  const [expenseTotal, setExpenseTotal] = useState(0);
  const [employees, setEmployees] = useState([]);
  const [paymentsLog, setPaymentsLog] = useState([]); // {employeeId, amount, date}
  const [filterOption, setFilterOption] = useState('all'); // period filtering
  const [confirmAllOpen, setConfirmAllOpen] = useState(false); // bulk pay confirmation
  const [paymentsFilter, setPaymentsFilter] = useState('all'); // all | weekly | monthly classification view
  const [cycleView, setCycleView] = useState('all'); // employee cycle view: all | weekly | monthly
  const [allowEarlyPayments, setAllowEarlyPayments] = useState(false); // setting toggle

  useEffect(()=>{
    try{
      const rawEmp = localStorage.getItem('bakery_employees');
      const parsedEmployees = rawEmp ? JSON.parse(rawEmp) : [];
      setEmployees(Array.isArray(parsedEmployees) ? parsedEmployees : []);
      const weekly = Array.isArray(parsedEmployees) ? parsedEmployees.filter(e => (e.paymentCycle || 'monthly') === 'weekly').reduce((s,e)=> s + Number(e.salary||0), 0) : 0;
      const monthly = Array.isArray(parsedEmployees) ? parsedEmployees.filter(e => (e.paymentCycle || 'monthly') === 'monthly').reduce((s,e)=> s + Number(e.salary||0), 0) : 0;
      setWeeklyTotal(weekly);
      setMonthlyTotal(monthly);
    }catch(e){ setWeeklyTotal(0); setMonthlyTotal(0); setEmployees([]); }
    try{
      const rawLog = localStorage.getItem('bakery_employee_payments');
      const parsedLog = rawLog ? JSON.parse(rawLog) : [];
      setPaymentsLog(Array.isArray(parsedLog) ? parsedLog : []);
    }catch(e){ setPaymentsLog([]); }
    try{
      const rawExp = localStorage.getItem('bakery_admin_expenses');
      const expenses = rawExp ? JSON.parse(rawExp) : [];
      const total = Array.isArray(expenses) ? expenses.reduce((s,x)=> s + Number(x.amount||0), 0) : 0;
      setExpenseTotal(total);
    }catch(e){ setExpenseTotal(0); }
  }, []);

  // Load persisted filter selection
  useEffect(()=>{
    try{
      const saved = localStorage.getItem('bakery_payment_filter');
      if(saved){ setFilterOption(saved); }
      const early = localStorage.getItem('bakery_allow_early');
      if(early){ setAllowEarlyPayments(early === 'true'); }
    }catch(e){}
  }, []);

  function saveEmployees(next){
    setEmployees(next);
    try{ localStorage.setItem('bakery_employees', JSON.stringify(next)); }catch(e){}
    // recompute totals
    const weekly = next.filter(e => (e.paymentCycle || 'monthly') === 'weekly').reduce((s,e)=> s + Number(e.salary||0), 0);
    const monthly = next.filter(e => (e.paymentCycle || 'monthly') === 'monthly').reduce((s,e)=> s + Number(e.salary||0), 0);
    setWeeklyTotal(weekly); setMonthlyTotal(monthly);
  }

  function savePaymentsLog(next){
    setPaymentsLog(next);
    try{ localStorage.setItem('bakery_employee_payments', JSON.stringify(next)); }catch(e){}
  }

  function markPaid(emp){
    const today = new Date();
    // append payment record
    const prevStart = getCycleStart(emp);
    const prevDue = getDueDate(emp);
    const isEarly = !!prevStart && !isDue(emp); // paying before due
    const record = {
      employeeId: emp.id,
      amount: Number(emp.salary||0),
      date: today.toISOString(),
      paymentType: isEarly ? 'early' : 'regular',
      prevCycleStart: prevStart ? prevStart.toISOString() : null,
      prevDueDate: prevDue ? prevDue.toISOString() : null
    };
    savePaymentsLog([record, ...paymentsLog]);
    // update employee lastPaid timestamp
    const nextEmployees = employees.map(e => e.id === emp.id ? { ...e, lastPaid: record.date, cycleStart: record.date } : e);
    saveEmployees(nextEmployees);
  }

  function formatDate(d){ try{ return new Date(d).toLocaleDateString(); }catch(e){ return '-'; } }

  function getCycleStart(emp){
    const startSource = emp.cycleStart || emp.lastPaid;
    return startSource ? new Date(startSource) : null;
  }

  function getDueDate(emp){
    const start = getCycleStart(emp);
    if(!start) return null; // no start, can pay immediately
    const cycle = emp.paymentCycle || 'monthly';
    if(cycle === 'weekly'){
      return new Date(start.getTime() + 7*24*60*60*1000);
    }
    // Monthly: next month same date; adjust overflow to last day of next month
    const year = start.getFullYear();
    const month = start.getMonth();
    const day = start.getDate();
    const tentative = new Date(year, month + 1, day);
    if(tentative.getMonth() !== ((month + 1) % 12)){
      return new Date(year, month + 2, 0); // last day of next month
    }
    return tentative;
  }

  function isDue(emp){
    const dueDate = getDueDate(emp);
    if(!dueDate) return true; // no prior payment, so due now
    const now = new Date();
    return now >= dueDate;
  }

  function getStatusInfo(emp){
    const start = getCycleStart(emp);
    const dueDate = getDueDate(emp);
    const now = new Date();
    const dayMs = 1000*60*60*24;
    // If no cycle started yet, show neutral status (not red)
    if(!start) return { label: 'Not started', color: '#475569' };
    if(!dueDate) return { label: 'Due', color: '#dc2626' };
    if(now >= dueDate){
      const overdueDays = Math.floor((now - dueDate)/dayMs);
      if(overdueDays === 0) return { label: 'Due today', color: '#dc2626' };
      return { label: `Due (${overdueDays}d overdue)`, color: '#dc2626' };
    }
    const remaining = Math.ceil((dueDate - now)/dayMs);
    return { label: `In ${remaining}d`, color: '#16a34a' };
  }

  function getProgress(emp){
    const start = getCycleStart(emp);
    const due = getDueDate(emp);
    if(!start || !due) return { pct: 0, text: '—' };
    const total = due - start;
    const spent = Math.max(0, Math.min(due - new Date(), total));
    const pct = Math.round(((total - spent) / total) * 100);
    return { pct, text: `${pct}%` };
  }

  // Compute filtered employees based on selected period filter
  const filteredEmployees = (() => {
    let list = employees || [];
    // First apply cycle view segmentation
    if(cycleView === 'weekly') list = list.filter(e => (e.paymentCycle || 'monthly') === 'weekly');
    if(cycleView === 'monthly') list = list.filter(e => (e.paymentCycle || 'monthly') === 'monthly');
    if(filterOption === 'all') return list;
    if(filterOption === 'due') return list.filter(e => isDue(e));
    if(filterOption === 'weeklyDue') return list.filter(e => (e.paymentCycle || 'monthly') === 'weekly' && isDue(e));
    if(filterOption === 'monthlyDue') return list.filter(e => (e.paymentCycle || 'monthly') === 'monthly' && isDue(e));
    const now = new Date();
    // Week bounds (Sunday start)
    const weekStart = new Date(now);
    weekStart.setHours(0,0,0,0);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);
    // Month bounds
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    if(filterOption === 'thisWeek'){
      return list.filter(e => (e.paymentCycle || 'monthly') === 'weekly' && (() => {
        const last = e.lastPaid ? new Date(e.lastPaid) : null;
        const nextDue = last ? new Date(last.getTime() + 7*24*60*60*1000) : now; // if never paid treat nextDue as now
        return isDue(e) && nextDue >= weekStart && nextDue < weekEnd;
      })());
    }
    if(filterOption === 'thisMonth'){
      return list.filter(e => (e.paymentCycle || 'monthly') === 'monthly' && (() => {
        const last = e.lastPaid ? new Date(e.lastPaid) : null;
        let nextDue;
        if(last){
          nextDue = new Date(last.getFullYear(), last.getMonth() + 1, last.getDate());
        }else{
          nextDue = now; // never paid, due now
        }
        return isDue(e) && nextDue >= monthStart && nextDue < monthEnd;
      })());
    }
    return list;
  })();

  const anyDue = employees.some(e => isDue(e));

  // Classify payments by employee cycle (uses current cycle; historical changes not tracked)
  const weeklyPayments = paymentsLog.filter(p => {
    const emp = employees.find(e=>e.id===p.employeeId);
    const cycle = (emp && emp.paymentCycle) ? emp.paymentCycle : 'monthly';
    return cycle === 'weekly';
  });
  const monthlyPayments = paymentsLog.filter(p => {
    const emp = employees.find(e=>e.id===p.employeeId);
    const cycle = (emp && emp.paymentCycle) ? emp.paymentCycle : 'monthly';
    return cycle === 'monthly';
  });
  const weeklyPaidTotal = weeklyPayments.reduce((s,p)=> s + Number(p.amount||0),0);
  const monthlyPaidTotal = monthlyPayments.reduce((s,p)=> s + Number(p.amount||0),0);

  function markAllDuePaid(){
    const dueEmployees = employees.filter(e => isDue(e));
    if(dueEmployees.length === 0){ setConfirmAllOpen(false); return; }
    const nowISO = new Date().toISOString();
    const newEntries = dueEmployees.map(emp => ({
      employeeId: emp.id,
      amount: Number(emp.salary||0),
      date: nowISO,
      paymentType: 'bulk',
      prevCycleStart: getCycleStart(emp) ? getCycleStart(emp).toISOString() : null,
      prevDueDate: getDueDate(emp) ? getDueDate(emp).toISOString() : null
    }));
    // prepend new entries
    savePaymentsLog([...newEntries, ...paymentsLog]);
    // update employees lastPaid
    const updated = employees.map(e => dueEmployees.find(d => d.id === e.id) ? { ...e, lastPaid: nowISO, cycleStart: nowISO } : e);
    saveEmployees(updated);
    setConfirmAllOpen(false);
  }

  function undoLastPayment(emp){
    const idx = paymentsLog.findIndex(r => r.employeeId === emp.id);
    if(idx === -1) return; // nothing to undo
    const newLog = paymentsLog.slice();
    newLog.splice(idx,1);
    // find previous payment (next in list after removal)
    const prevIdx = newLog.findIndex(r => r.employeeId === emp.id);
    const prevDate = prevIdx !== -1 ? newLog[prevIdx].date : null;
    const updatedEmployees = employees.map(e => e.id === emp.id ? { ...e, lastPaid: prevDate, cycleStart: prevDate } : e);
    savePaymentsLog(newLog);
    saveEmployees(updatedEmployees);
  }

  // Status categorization for summary
  function getStatusCategory(emp){
    const start = getCycleStart(emp);
    if(!start) return 'notStarted';
    const dueDate = getDueDate(emp);
    if(!dueDate) return 'due';
    const now = new Date();
    if(now >= dueDate){
      const overdueDays = Math.floor((now - dueDate)/(1000*60*60*24));
      return overdueDays === 0 ? 'dueToday' : 'overdue';
    }
    const remaining = Math.ceil((dueDate - now)/(1000*60*60*24));
    if(remaining <= 2) return 'dueSoon';
    return 'active';
  }

  const statusCounts = employees.reduce((acc,e)=>{ const c = getStatusCategory(e); acc[c] = (acc[c]||0)+1; return acc; },{});

  function exportCSV(){
    const headers = ['Employee','Cycle','Amount','Date','Type','PrevCycleStart','PrevDueDate'];
    const rows = paymentsLog.map(r=>{
      const emp = employees.find(e=>e.id===r.employeeId);
      return [
        emp?emp.name:'Employee',
        emp?(emp.paymentCycle||'monthly'):'',
        r.amount,
        r.date,
        r.paymentType||'regular',
        r.prevCycleStart||'',
        r.prevDueDate||''
      ].join(',');
    });
    const csv = [headers.join(','), ...rows].join('\n');
    try{
      const blob = new Blob([csv], {type:'text/csv'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'employee_payments.csv'; a.click();
      URL.revokeObjectURL(url);
    }catch(err){ console.error('CSV export failed', err); }
  }

  return (
    <div className="container">
      <div className="header" style={{display:'flex', alignItems:'center', gap:12}}>
        <div style={{width:44,height:36,display:'flex',alignItems:'center',justifyContent:'center',background:'linear-gradient(90deg,#0ea5e9,#2563eb)',borderRadius:10,color:'#fff'}}>
          <FiBarChart2 size={18} aria-hidden="true" />
        </div>
        <h1 style={{margin:0, flex:1}}>Payment Tracker</h1>
        <button className="btn orange back pill" onClick={()=>navigate('/admin')}>Back to Dashboard</button>
      </div>

      <div className="card">
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:14,marginBottom:16}}>
          <div className="summary-box" style={{background:'linear-gradient(135deg,#0ea5e9,#2563eb)',cursor:'pointer'}} onClick={()=>navigate('/admin/employeePayments')}>
            <div className="sb-icon" style={{display:'inline-flex',alignItems:'center',justifyContent:'center',width:40,height:40,borderRadius:8,background:'rgba(255,255,255,0.12)'}}>
              <FiBarChart2 size={20} style={{color:'#fff'}} aria-hidden="true" />
            </div>
            <div className="sb-meta">
              <div className="sb-title">Employee Payments</div>
              <div className="sb-value">{(weeklyTotal + monthlyTotal).toLocaleString()} Birr</div>
              <div className="sb-desc">Weekly: {weeklyTotal.toLocaleString()} • Monthly: {monthlyTotal.toLocaleString()}</div>
            </div>
          </div>
          <div className="summary-box" style={{background:'linear-gradient(135deg,#f59e0b,#ef4444)',cursor:'pointer'}} onClick={()=>navigate('/admin/expencePayments')}>
            <div className="sb-icon" style={{display:'inline-flex',alignItems:'center',justifyContent:'center',width:40,height:40,borderRadius:8,background:'rgba(255,255,255,0.12)'}}>
              <FiBarChart2 size={20} style={{color:'#fff'}} aria-hidden="true" />
            </div>
            <div className="sb-meta">
              <div className="sb-title">Expense Payments</div>
              <div className="sb-value">{expenseTotal.toLocaleString()} Birr</div>
              <div className="sb-desc">Inventory & operations costs</div>
            </div>
          </div>
        </div>
        {/* Simplified: only the two navigation cards above */}
      </div>
    </div>
  );
}
