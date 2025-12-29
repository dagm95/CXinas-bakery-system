import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function EmployeePayments(){
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [paymentsLog, setPaymentsLog] = useState([]);
  const [cyclesByEmployee, setCyclesByEmployee] = useState({}); // { [employeeId]: { current: Cycle, history: Cycle[] } }
  const [weeklyTotal, setWeeklyTotal] = useState(0);
  const [monthlyTotal, setMonthlyTotal] = useState(0);
  const [historyCollapsed, setHistoryCollapsed] = useState(false);
  // Simplified view: no filters or detailed table

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
      const rawCycles = localStorage.getItem('bakery_employee_cycles');
      const parsedCycles = rawCycles ? JSON.parse(rawCycles) : {};
      setCyclesByEmployee(parsedCycles && typeof parsedCycles==='object' ? parsedCycles : {});
    }catch(e){ setCyclesByEmployee({}); }
  }, []);

  const saveCycles = (next) => {
    setCyclesByEmployee(next);
    try{ localStorage.setItem('bakery_employee_cycles', JSON.stringify(next)); }catch(e){}
  };
  const savePaymentsLog = (next) => {
    setPaymentsLog(next);
    try{ localStorage.setItem('bakery_employee_payments', JSON.stringify(next)); }catch(e){}
  };

  function formatDate(d){ try{ return new Date(d).toLocaleDateString(); }catch(e){ return '-'; } }
  function shortId(id){
    if(!id || typeof id !== 'string') return id || '—';
    if(id.length <= 12) return id;
    return `${id.slice(0,6)}…${id.slice(-4)}`;
  }
  function daysUntil(date){
    try{
      const now = new Date();
      const due = new Date(date);
      const ms = due - now;
      return Math.ceil(ms / (24*60*60*1000));
    }catch(e){ return 0; }
  }
  function originalPeriodEnd(cycle){
    const start = new Date(cycle.period_start);
    return (cycle.payment_type||'monthly') === 'weekly' ? addDays(start, 6) : endOfMonth(start);
  }
  function originalDueDate(cycle){
    const start = new Date(cycle.period_start);
    return (cycle.payment_type||'monthly') === 'weekly' ? addDays(start, 7) : nextMonthlyDue(start);
  }
  function clamp(n, min, max){ return Math.max(min, Math.min(max, n)); }
  function daysBetweenInclusive(startIso, endIso){
    try{
      const s = new Date(startIso);
      const e = new Date(endIso);
      const diff = Math.floor((e.setHours(0,0,0,0) - s.setHours(0,0,0,0)) / (24*60*60*1000));
      return diff + 1; // inclusive of both start and end
    }catch(e){ return 0; }
  }
  function elapsedDaysTo(asOf, startIso, endIso){
    try{
      const s = new Date(startIso);
      const e = new Date(endIso);
      const a = new Date(asOf);
      const total = daysBetweenInclusive(startIso, endIso);
      if(total <= 0) return 0;
      // clamp a into [s, e]
      const clamped = new Date(clamp(a.setHours(0,0,0,0), s.setHours(0,0,0,0), e.setHours(0,0,0,0)));
      const elapsed = daysBetweenInclusive(s.toISOString(), clamped.toISOString());
      return clamp(elapsed, 0, total);
    }catch(e){ return 0; }
  }
  function computeProratedNet(cycle, salary, asOfDate){
    const totalDays = daysBetweenInclusive(cycle.period_start, cycle.period_end);
    if(totalDays <= 0) return 0;
    const elapsed = elapsedDaysTo(asOfDate, cycle.period_start, cycle.period_end);
    const ratio = elapsed / totalDays;
    const base = Number(salary||0) * ratio;
    const proratedBonus = Number(cycle.bonuses||0) * ratio;
    const proratedDeduct = Number(cycle.deductions||0) * ratio;
    return Math.max(0, base + proratedBonus - proratedDeduct);
  }
  function generatePayslipId(empId){
    const ts = Date.now().toString(36).toUpperCase(); // compact timestamp
    const empSuffix = (empId ?? '').toString().slice(-2).padStart(2,'0');
    return `PS-${ts}${empSuffix}`; // e.g., PS-L3KJ9A2Z01
  }
  // Payment Cycle helpers
  function addDays(date, days){ const d = new Date(date); d.setDate(d.getDate()+days); return d; }
  function endOfMonth(start){ const d = new Date(start.getFullYear(), start.getMonth()+1, 0); return d; }
  function nextMonthlyDue(start){
    const year = start.getFullYear(); const month = start.getMonth(); const day = start.getDate();
    const tentative = new Date(year, month + 1, day);
    if(tentative.getMonth() !== ((month + 1) % 12)) return new Date(year, month + 2, 0);
    return tentative;
  }
  function createInitialCycleForEmployee(emp){
    const type = emp.paymentCycle || 'monthly';
    const period_start = new Date();
    const period_end = type==='weekly' ? addDays(period_start, 6) : endOfMonth(period_start);
    const payment_due_date = type==='weekly' ? addDays(period_start, 7) : nextMonthlyDue(period_start);
    return {
      employeeId: emp.id,
      payment_type: type,
      period_start: period_start.toISOString(),
      period_end: period_end.toISOString(),
      payment_due_date: payment_due_date.toISOString(),
      hours: 0,
      rate: Number(emp.salary || 0),
      deductions: 0,
      bonuses: 0,
      status: 'Pending',
      payslipId: null,
      audit: []
    };
  }
  function computeNetWithSalary(cycle, salary){ const base = Number(salary||0); return Math.max(0, base + Number(cycle.bonuses||0) - Number(cycle.deductions||0)); }
  function statusForCycle(cycle){
    const now = new Date(); const due = new Date(cycle.payment_due_date);
    if(cycle.status==='Paid' || cycle.status==='Early Paid' || cycle.status==='Reversed') return cycle.status;
    if(now < due) return 'Pending';
    if(now.toDateString() === due.toDateString()) return 'Due';
    return 'Overdue';
  }
  // Compute status based on dates only (ignores existing status field)
  function statusByDateOnly(cycle){
    const now = new Date(); const due = new Date(cycle.payment_due_date);
    if(now < due) return 'Pending';
    if(now.toDateString() === due.toDateString()) return 'Due';
    return 'Overdue';
  }
  function nextCycleFrom(cycle){
    const type = cycle.payment_type||'monthly';
    const startPrevEnd = new Date(cycle.period_end);
    const nextStart = addDays(startPrevEnd, 1);
    const nextEnd = type==='weekly' ? addDays(nextStart, 6) : endOfMonth(nextStart);
    const nextDue = type==='weekly' ? addDays(nextStart, 7) : nextMonthlyDue(nextStart);
    return {
      employeeId: cycle.employeeId,
      payment_type: type,
      period_start: nextStart.toISOString(),
      period_end: nextEnd.toISOString(),
      payment_due_date: nextDue.toISOString(),
      hours: 0,
      rate: cycle.rate,
      deductions: 0,
      bonuses: 0,
      status: 'Pending',
      payslipId: null,
      audit: []
    };
  }

  // Ensure each employee has a current cycle on load
  useEffect(()=>{
    if(!employees.length) return;
    const next = { ...cyclesByEmployee };
    let changed = false;
    employees.forEach(emp => {
      if(!next[emp.id]){ next[emp.id] = { current: createInitialCycleForEmployee(emp), history: [] }; changed = true; }
    });
    if(changed) saveCycles(next);
  }, [employees]);

  // Refresh statuses at render based on date
  const normalizedCycles = useMemo(()=>{
    const next = { ...cyclesByEmployee };
    Object.keys(next).forEach(id => {
      const pack = next[id];
      if(!pack || !pack.current) return;
      let c = pack.current;
      // If current is Paid/Early Paid, auto-advance and archive it
      if(c.status === 'Paid' || c.status === 'Early Paid'){
        const alreadyTop = (pack.history && pack.history[0] && pack.history[0].payslipId === c.payslipId);
        const archived = alreadyTop ? pack.history : [c, ...(pack.history||[])];
        const advanced = nextCycleFrom(c);
        next[id] = { current: advanced, history: archived };
        c = advanced;
      }
      // Recompute current status from dates unless explicitly Pending (e.g., after Undo)
      if(c.status !== 'Pending'){
        const newStatus = statusByDateOnly(c);
        if(c.status !== newStatus){ next[id] = { ...next[id], current: { ...c, status: newStatus } }; }
      }
    });
    if(JSON.stringify(next) !== JSON.stringify(cyclesByEmployee)) saveCycles(next);
    return next;
  }, [cyclesByEmployee]);

  // Dashboard stats
  const stats = useMemo(()=>{
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth()+1, 1);
    let totalPaidThisMonth = 0;
    let overdueCount = 0;
    let upcomingCount = 0;
    employees.forEach(emp => {
      const pack = normalizedCycles[emp.id]; if(!pack) return;
      // history sum for current month
      (pack.history||[]).forEach(h => {
        const payAudit = h.audit?.find(a=>a.action==='pay');
        const paidDate = payAudit?.date;
        const netAudit = Number(payAudit?.net||0);
        if(paidDate){
          const d = new Date(paidDate);
          if(d >= monthStart && d < monthEnd){ totalPaidThisMonth += netAudit; }
        }
      });
      const cur = pack.current;
      if(cur){
        if(cur.status==='Overdue') overdueCount += 1;
        // upcoming: Due within next 7 days or Pending
        const due = new Date(cur.payment_due_date);
        const in7days = (due - now) <= (7*24*60*60*1000) && due >= now;
        if(cur.status==='Pending' || (cur.status==='Due') || in7days) upcomingCount += 1;
      }
    });
    return { totalPaidThisMonth, overdueCount, upcomingCount };
  }, [normalizedCycles, employees]);

  // Admin actions
  function payNow(empId){
    const cy = normalizedCycles[empId]?.current; if(!cy) return;
    const emp = employees.find(e=>e.id===empId);
    const due = new Date(cy.payment_due_date); const now = new Date();
    const net = computeNetWithSalary(cy, emp ? emp.salary : 0);
    // Mark Early Paid when paying before due date
    const type = now < due ? 'Early Paid' : 'Paid';
    const payslipId = generatePayslipId(empId);
    const updated = { ...cy, status: type, payslipId, audit: [...(cy.audit||[]), { action:'pay', net, date: now.toISOString() }] };
    const nextCycle = nextCycleFrom(updated);
    const store = { ...normalizedCycles, [empId]: { current: nextCycle, history: [updated, ...(normalizedCycles[empId]?.history||[])] } };
    saveCycles(store);
    // Append to global payments log for history view
    const logEntry = {
      id: `LOG-${empId}-${Date.now()}`,
      payslipId,
      employeeId: empId,
      employeeName: emp?.name || 'Unknown',
      amount: net,
      payment_type: cy.payment_type || (emp?.paymentCycle || 'monthly'),
      period_start: cy.period_start,
      period_end: cy.period_end,
      paid_at: now.toISOString()
    };
    savePaymentsLog([logEntry, ...paymentsLog]);
  }
  function undoPayment(empId){
    const pack = normalizedCycles[empId]; if(!pack) return;
    const [lastPaid, ...rest] = pack.history || [];
    if(!lastPaid) return;
    const now = new Date();
    // Reopen the original cycle exactly as before payment (restore dates and adjustments)
    const filteredAudit = (lastPaid.audit||[]).filter(a => a.action !== 'pay');
    const wasPartial = (lastPaid.audit||[]).some(a => a.action === 'pay-partial');
    let reopened = {
      ...lastPaid,
      status: 'Pending',
      payslipId: null,
      audit: [...filteredAudit, { action:'undo', date: now.toISOString() }]
    };
    if(wasPartial){
      const origEnd = originalPeriodEnd(lastPaid).toISOString();
      const origDue = originalDueDate(lastPaid).toISOString();
      reopened = { ...reopened, period_end: origEnd, payment_due_date: origDue };
    }
    const store = { ...normalizedCycles, [empId]: { current: reopened, history: rest } };
    saveCycles(store);
    // Remove the corresponding log entry by payslipId, if present
    if(lastPaid.payslipId){
      const filtered = paymentsLog.filter(l => l.payslipId !== lastPaid.payslipId);
      savePaymentsLog(filtered);
    }
  }
  function payToDate(empId){
    const pack = normalizedCycles[empId]; if(!pack) return;
    const cy = pack.current; if(!cy) return;
    if(['Paid','Early Paid'].includes(cy.status)) return;
    const emp = employees.find(e=>e.id===empId);
    const now = new Date();
    const net = computeProratedNet(cy, emp ? emp.salary : 0, now);
    const payslipId = generatePayslipId(empId);
    // Close the current cycle early at today
    const closedCycle = {
      ...cy,
      period_end: now.toISOString(),
      payment_due_date: now.toISOString(),
      status: 'Early Paid',
      payslipId,
      audit: [...(cy.audit||[]), { action:'pay-partial', net, date: now.toISOString() }]
    };
    const nextCycle = nextCycleFrom(closedCycle);
    const store = { ...normalizedCycles, [empId]: { current: nextCycle, history: [closedCycle, ...(pack.history||[])] } };
    saveCycles(store);
    const logEntry = {
      id: `LOG-${empId}-${Date.now()}`,
      payslipId,
      employeeId: empId,
      employeeName: emp?.name || 'Unknown',
      amount: net,
      payment_type: cy.payment_type || (emp?.paymentCycle || 'monthly'),
      period_start: cy.period_start,
      period_end: closedCycle.period_end,
      paid_at: now.toISOString(),
      prorated: true
    };
    savePaymentsLog([logEntry, ...paymentsLog]);
  }
  function undoAllPayments(){
    const nextCycles = { ...normalizedCycles };
    const undoneIds = [];
    const nowIso = new Date().toISOString();
    employees.forEach(emp => {
      const pack = nextCycles[emp.id];
      if(!pack || !pack.history || pack.history.length === 0) return;
      const [lastPaid, ...rest] = pack.history;
      // Reopen
      const filteredAudit = (lastPaid.audit||[]).filter(a => a.action !== 'pay');
      const wasPartial = (lastPaid.audit||[]).some(a => a.action === 'pay-partial');
      let reopened = { ...lastPaid, status:'Pending', payslipId:null, audit:[...filteredAudit, { action:'undo', date: nowIso }] };
      if(wasPartial){
        const origEnd = originalPeriodEnd(lastPaid).toISOString();
        const origDue = originalDueDate(lastPaid).toISOString();
        reopened = { ...reopened, period_end: origEnd, payment_due_date: origDue };
      }
      nextCycles[emp.id] = { current: reopened, history: rest };
      if(lastPaid.payslipId) undoneIds.push(lastPaid.payslipId);
    });
    saveCycles(nextCycles);
    if(undoneIds.length){
      const filtered = (paymentsLog||[]).filter(l => !undoneIds.includes(l.payslipId));
      savePaymentsLog(filtered);
    }
  }
  function payAll(type){
    const t = (type === 'weekly' ? 'weekly' : 'monthly');
    const confirmMsg = `Are you sure you want to pay all ${t} employees now?`;
    if(!window.confirm(confirmMsg)) return;
    const now = new Date();
    const next = { ...normalizedCycles };
    const newLogs = [];
    let count = 0; let total = 0;
    employees.forEach(emp => {
      const pack = next[emp.id];
      if(!pack || !pack.current) return;
      const cy = pack.current;
      if(cy.payment_type !== t) return;
      if(['Paid','Early Paid'].includes(cy.status)) return;
      const net = computeNetWithSalary(cy, emp ? emp.salary : 0);
      const due = new Date(cy.payment_due_date);
      const status = now < due ? 'Early Paid' : 'Paid';
      const payslipId = generatePayslipId(emp.id);
      const updated = { ...cy, status, payslipId, audit: [...(cy.audit||[]), { action:'pay', net, date: now.toISOString() }] };
      const advanced = nextCycleFrom(updated);
      next[emp.id] = { current: advanced, history: [updated, ...(pack.history||[])] };
      newLogs.push({
        id: `LOG-${emp.id}-${Date.now()}-${count}`,
        payslipId,
        employeeId: emp.id,
        employeeName: emp?.name || 'Unknown',
        amount: net,
        payment_type: cy.payment_type || (emp?.paymentCycle || t),
        period_start: cy.period_start,
        period_end: cy.period_end,
        paid_at: now.toISOString()
      });
      count += 1; total += net;
    });
    saveCycles(next);
    if(newLogs.length){ savePaymentsLog([...newLogs, ...paymentsLog]); }
    window.alert(`Paid ${count} ${t} employee(s) totaling ${total.toLocaleString()} Birr.`);
  }
  function updateField(empId, field, value){
    const pack = normalizedCycles[empId]; if(!pack) return;
    const cur = pack.current; if(['Paid','Early Paid'].includes(cur.status)) return; // locked
    const store = { ...normalizedCycles, [empId]: { ...pack, current: { ...cur, [field]: value } } };
    saveCycles(store);
  }

  // No employee list rendering on this simplified tracker page

  const weeklyPayments = paymentsLog.filter(p => { const emp = employees.find(e=>e.id===p.employeeId); const cycle=(emp&&emp.paymentCycle)?emp.paymentCycle:'monthly'; return cycle==='weekly'; });
  const monthlyPayments = paymentsLog.filter(p => { const emp = employees.find(e=>e.id===p.employeeId); const cycle=(emp&&emp.paymentCycle)?emp.paymentCycle:'monthly'; return cycle==='monthly'; });
  const weeklyPaidTotal = weeklyPayments.reduce((s,p)=> s + Number(p.amount||0),0);
  const monthlyPaidTotal = monthlyPayments.reduce((s,p)=> s + Number(p.amount||0),0);
  const enrichedLog = useMemo(()=>
    (paymentsLog||[]).map(l => ({
      ...l,
      employee: employees.find(e=>e.id===l.employeeId) || null
    })),
  [paymentsLog, employees]);

  return (
    <div className="container">
      <div className="header">
        <img src="/image/sina logo2.png" alt="Brand" style={{height:36}} />
        <h1>Employee Payments Tracker</h1>
        <button className="btn" style={{marginLeft:12}} onClick={()=>navigate('/admin/reports')}>Back to Payment Tracker</button>
      </div>

      <div className="card">
        <div style={{display:'flex', justifyContent:'flex-end', gap:8, marginBottom:10}}>
          <button className="btn" onClick={()=>payAll('weekly')} style={{background:'#0ea5e9', color:'#fff'}}>Pay All Weekly</button>
          <button className="btn" onClick={()=>payAll('monthly')} style={{background:'#16a34a', color:'#fff'}}>Pay All Monthly</button>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:14}}>
          <div className="summary-box" style={{background:'linear-gradient(135deg,#0ea5e9,#2563eb)', color:'#ffffff'}}>
            <div className="sb-icon">👥</div>
            <div className="sb-meta">
              <div className="sb-title" style={{color:'#ffffff'}}>Totals</div>
              <div className="sb-value" style={{color:'#ffffff', fontWeight:800}}>{(weeklyTotal + monthlyTotal).toLocaleString()} Birr</div>
              <div className="sb-desc" style={{color:'#e2e8f0'}}>Weekly: {weeklyTotal.toLocaleString()} • Monthly: {monthlyTotal.toLocaleString()}</div>
            </div>
          </div>
          <div className="summary-box" style={{background:'#ffffff', border:'1px solid #e2e8f0', color:'#0f172a'}}>
              <div className="sb-meta">
                <div className="sb-title" style={{color:'#0f172a', fontSize:14}}>Paid So Far</div>
                <div className="sb-value" style={{color:'#0f172a', fontWeight:800, fontSize:16}}>{(weeklyPaidTotal + monthlyPaidTotal).toLocaleString()} Birr</div>
                <div className="sb-desc" style={{color:'#334155', fontSize:13}}>Weekly: {weeklyPayments.length} • Monthly: {monthlyPayments.length}</div>
              </div>
          </div>
          <div className="summary-box" style={{background:'#16a34a', color:'#ffffff'}}>
            <div className="sb-meta">
              <div className="sb-title" style={{color:'#ffffff'}}>Total Paid This Month</div>
              <div className="sb-value" style={{color:'#ffffff', fontWeight:800}}>{stats.totalPaidThisMonth.toLocaleString()} Birr</div>
              <div className="sb-desc" style={{color:'#dcfce7'}}>Archival cycles paid in current month</div>
            </div>
          </div>
          <div className="summary-box" style={{background:'#dc2626', color:'#ffffff'}}>
            <div className="sb-meta">
              <div className="sb-title" style={{color:'#ffffff'}}>Overdue Payments</div>
              <div className="sb-value" style={{color:'#ffffff', fontWeight:800}}>{stats.overdueCount}</div>
              <div className="sb-desc" style={{color:'#fee2e2'}}>Current cycles marked overdue</div>
            </div>
          </div>
          <div className="summary-box" style={{background:'#f59e0b', color:'#ffffff'}}>
            <div className="sb-meta">
              <div className="sb-title" style={{color:'#ffffff'}}>Upcoming Payments</div>
              <div className="sb-value" style={{color:'#ffffff', fontWeight:800}}>{stats.upcomingCount}</div>
              <div className="sb-desc" style={{color:'#ffedd5'}}>Due soon or pending within 7 days</div>
            </div>
          </div>
        </div>

        {/* Minimal per-employee current cycle tiles */
        }
        <div style={{marginTop:16, display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))', gap:12}}>
          {employees.map(emp => {
            const pack = normalizedCycles[emp.id];
            if(!pack) return null;
            const c = pack.current;
            const isLocked = ['Paid','Early Paid'].includes(c.status);
            const daysLeft = daysUntil(c.payment_due_date);
            const statusColor = c.status==='Pending' ? '#64748b' : c.status==='Due' ? '#b45309' : c.status==='Overdue' ? '#b91c1c' : c.status==='Early Paid' ? '#f59e0b' : '#16a34a';
            return (
              <div key={emp.id} className="card" style={{padding:12}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div style={{display:'flex',flexDirection:'column',gap:6}}>
                    <div style={{fontWeight:700}}>{emp.name}</div>
                    <div style={{display:'inline-flex',alignItems:'center',gap:8,background:'#ffffff',border:'1px solid #e2e8f0',borderRadius:8,padding:'6px 10px',boxShadow:'0 1px 2px rgba(0,0,0,0.04)'}}>
                      <span style={{fontSize:12,color:'#64748b'}}>Salary</span>
                      <span style={{fontSize:13,color:'#2563eb',fontWeight:800}}>{Number(emp.salary||0).toLocaleString()} Birr</span>
                    </div>
                  </div>
                  <span style={{fontSize:12, background:'#f1f5f9', color: statusColor, padding:'2px 8px', borderRadius:6}}>{c.status}</span>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:8,marginTop:8,fontSize:12,color:'#475569'}}>
                  <div>Start: <strong>{new Date(c.period_start).toLocaleDateString()}</strong></div>
                  <div>End: <strong>{new Date(c.period_end).toLocaleDateString()}</strong></div>
                  <div>
                    Due: <strong>{new Date(c.payment_due_date).toLocaleDateString()}</strong>
                    <span style={{marginLeft:6, color:'#dc2626', fontWeight:800}}>{isNaN(daysLeft) ? '' : `${daysLeft}d`}</span>
                  </div>
                  <div>Type: <span style={{background:'#eef2ff',color:'#4f46e5',padding:'2px 6px',borderRadius:4}}>{c.payment_type}</span></div>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:8,marginTop:10}}>
                  <div className="field">
                    <label style={{fontSize:12}}>Bonuses</label>
                    <input type="number" disabled={isLocked} value={c.bonuses} onChange={e=>updateField(emp.id,'bonuses', Number(e.target.value))} />
                  </div>
                  <div className="field">
                    <label style={{fontSize:12}}>Deductions</label>
                    <input type="number" disabled={isLocked} value={c.deductions} onChange={e=>updateField(emp.id,'deductions', Number(e.target.value))} />
                  </div>
                </div>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:10}}>
                  <div style={{fontSize:13,color:'#0f172a'}}>Net: <strong>{computeNetWithSalary(c, emp.salary).toLocaleString()} Birr</strong></div>
                  <div style={{display:'flex',gap:8}}>
                    <button className="btn" disabled={isLocked} onClick={()=>payNow(emp.id)} style={{background:'#1d4ed8',color:'#fff'}}>Pay Now</button>
                    <button className="btn" disabled={isLocked} onClick={()=>payToDate(emp.id)} style={{background:'#0ea5e9',color:'#fff'}}>Pay To Date</button>
                    <button className="btn secondary" disabled={!pack.history || pack.history.length===0} onClick={()=>undoPayment(emp.id)}>Undo</button>
                  </div>
                </div>
                <div style={{marginTop:6, fontSize:12, color:'#334155'}}>
                  Accrued today: <strong style={{color:'#0f172a'}}>{computeProratedNet(c, emp.salary, new Date()).toLocaleString()} Birr</strong>
                </div>
                {pack.history && pack.history.length>0 && (
                  <div style={{marginTop:8}}>
                    <small style={{color:'#64748b', fontSize:12}}>Previous Periods: {pack.history.length} • Last payslip: {shortId(pack.history[0].payslipId) || '—'}</small>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Payments History */}
        <div className="card" style={{marginTop:18}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
            <h2 style={{margin:0,fontSize:18}}>Payments History</h2>
            <div style={{display:'flex', alignItems:'center', gap:10}}>
              <small style={{color:'#64748b', fontSize:13}}>Entries: {enrichedLog.length}</small>
              <button className="btn secondary" onClick={()=>setHistoryCollapsed(v=>!v)}>
                {historyCollapsed ? 'Expand' : 'Collapse'}
              </button>
            </div>
          </div>
          {historyCollapsed ? (
            <div style={{padding:12, color:'#64748b', fontSize:13}}>History collapsed.</div>
          ) : enrichedLog.length === 0 ? (
            <div style={{padding:12, color:'#64748b', fontSize:13}}>No payments recorded yet. Use Pay Now to record payments.</div>
          ) : (
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%', borderCollapse:'separate', borderSpacing:0}}>
                <thead>
                  <tr style={{textAlign:'left', background:'#f8fafc'}}>
                    <th style={{padding:'8px 10px', fontSize:13, color:'#475569'}}>Date</th>
                    <th style={{padding:'8px 10px', fontSize:13, color:'#475569'}}>Employee</th>
                    <th style={{padding:'8px 10px', fontSize:13, color:'#475569'}}>Type</th>
                    <th style={{padding:'8px 10px', fontSize:13, color:'#475569'}}>Period</th>
                    <th style={{padding:'8px 10px', fontSize:13, color:'#475569'}}>Amount</th>
                    <th style={{padding:'8px 10px', fontSize:13, color:'#475569'}}>Payslip</th>
                  </tr>
                </thead>
                <tbody>
                  {enrichedLog.slice(0, 50).map((row)=>{
                    const dateStr = row.paid_at ? new Date(row.paid_at).toLocaleString() : '-';
                    const empName = row.employeeName || row.employee?.name || '—';
                    const period = row.period_start && row.period_end ? `${new Date(row.period_start).toLocaleDateString()} → ${new Date(row.period_end).toLocaleDateString()}` : '—';
                    return (
                      <tr key={row.id} style={{borderTop:'1px solid #e2e8f0'}}>
                        <td style={{padding:'8px 10px', fontSize:13, color:'#0f172a'}}>{dateStr}</td>
                        <td style={{padding:'8px 10px', fontSize:13, color:'#0f172a'}}>{empName}</td>
                        <td style={{padding:'8px 10px'}}>
                          <span style={{background:'#eef2ff', color:'#4f46e5', padding:'2px 6px', borderRadius:4, fontSize:12}}>{row.payment_type}</span>
                        </td>
                        <td style={{padding:'8px 10px', fontSize:13, color:'#334155'}}>{period}</td>
                        <td style={{padding:'8px 10px', fontWeight:700, color:'#0f172a', fontSize:14}}>{Number(row.amount||0).toLocaleString()} Birr</td>
                        <td style={{padding:'8px 10px', fontSize:13, color:'#64748b'}}>{shortId(row.payslipId)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
