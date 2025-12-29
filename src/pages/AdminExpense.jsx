import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function AdminExpense(){
  const navigate = useNavigate();
  const [view, setView] = useState('daily'); // daily, weekly, monthly
  const [currentDate, setCurrentDate] = useState(new Date());
  const [expenses, setExpenses] = useState([]);
  const [newExpense, setNewExpense] = useState({ desc: '', amount: '', category: 'General' });
  const [showAdd, setShowAdd] = useState(false);

  // Load expenses from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem('bakery_admin_expenses');
      if (raw) setExpenses(JSON.parse(raw));
    } catch (e) { console.error(e); }
  }, []);

  // Save expenses
  const saveExpenses = (newList) => {
    setExpenses(newList);
    localStorage.setItem('bakery_admin_expenses', JSON.stringify(newList));
  };

  const handleAdd = () => {
    if (!newExpense.desc || !newExpense.amount) return;
    const item = {
      id: Date.now(),
      ...newExpense,
      amount: Number(newExpense.amount),
      date: new Date().toISOString() // Use current time for entry, not currentDate view
    };
    saveExpenses([item, ...expenses]);
    setNewExpense({ desc: '', amount: '', category: 'General' });
    setShowAdd(false);
  };

  const navigateDate = (direction) => {
    const newDate = new Date(currentDate);
    if (view === 'daily') {
      newDate.setDate(newDate.getDate() + direction);
    } else if (view === 'weekly') {
      newDate.setDate(newDate.getDate() + (direction * 7));
    } else if (view === 'monthly') {
      newDate.setMonth(newDate.getMonth() + direction);
    }
    setCurrentDate(newDate);
  };

  const getDateLabel = () => {
    if (view === 'daily') return currentDate.toDateString();
    if (view === 'weekly') {
      const start = new Date(currentDate);
      start.setDate(currentDate.getDate() - currentDate.getDay()); // Sunday
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      return `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;
    }
    if (view === 'monthly') {
      return currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
    }
  };

  // Filter logic
  const getFilteredExpenses = () => {
    return expenses.filter(e => {
      const d = new Date(e.date);
      if (view === 'daily') {
        return d.toDateString() === currentDate.toDateString();
      } else if (view === 'weekly') {
        const start = new Date(currentDate);
        start.setDate(currentDate.getDate() - currentDate.getDay());
        start.setHours(0,0,0,0);
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        end.setHours(23,59,59,999);
        return d >= start && d <= end;
      } else if (view === 'monthly') {
        return d.getMonth() === currentDate.getMonth() && d.getFullYear() === currentDate.getFullYear();
      }
      return true;
    });
  };

  const filtered = getFilteredExpenses();
  const total = filtered.reduce((sum, item) => sum + (item.amount || 0), 0);

  return (
    <div className="container">
      <div className="header">
        <div className="logo">🏢</div>
        <h1>Admin Expenses</h1>
        <button className="btn" style={{marginLeft:12}} onClick={()=>navigate('/admin/expenses')}>Back to Expenses</button>
      </div>

      <div className="card">
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 20}}>
          <div className="tabs" style={{display:'flex', gap: 10}}>
            <button className={`btn ${view === 'daily' ? '' : 'secondary'}`} onClick={()=>{setView('daily'); setCurrentDate(new Date());}}>Daily</button>
            <button className={`btn ${view === 'weekly' ? '' : 'secondary'}`} onClick={()=>{setView('weekly'); setCurrentDate(new Date());}}>Weekly</button>
            <button className={`btn ${view === 'monthly' ? '' : 'secondary'}`} onClick={()=>{setView('monthly'); setCurrentDate(new Date());}}>Monthly</button>
          </div>
          <button className="btn" onClick={()=>setShowAdd(!showAdd)}>{showAdd ? 'Cancel' : '+ Add Expense'}</button>
        </div>

        <div style={{display:'flex', alignItems:'center', justifyContent:'center', gap: 16, marginBottom: 20}}>
          <button className="btn secondary" onClick={()=>navigateDate(-1)}>◀ Prev</button>
          <div style={{fontWeight: 'bold', fontSize: 16, minWidth: 200, textAlign: 'center'}}>{getDateLabel()}</div>
          <button className="btn secondary" onClick={()=>navigateDate(1)}>Next ▶</button>
        </div>

        {showAdd && (
          <div style={{background: '#f8fafc', padding: 16, borderRadius: 8, marginBottom: 20, border: '1px solid #e2e8f0'}}>
            <h4 style={{marginTop:0}}>New Expense</h4>
            <div className="form-row">
              <div className="field">
                <label>Description</label>
                <input value={newExpense.desc} onChange={e=>setNewExpense({...newExpense, desc: e.target.value})} placeholder="e.g. Office Supplies" />
              </div>
              <div className="field">
                <label>Amount (Birr)</label>
                <input type="number" value={newExpense.amount} onChange={e=>setNewExpense({...newExpense, amount: e.target.value})} placeholder="0.00" />
              </div>
              <div className="field">
                <label>Category</label>
                <select value={newExpense.category} onChange={e=>setNewExpense({...newExpense, category: e.target.value})}>
                  <option>General</option>
                  <option>Utilities</option>
                  <option>Maintenance</option>
                  <option>Salary</option>
                  <option>Rent</option>
                  <option>Other</option>
                </select>
              </div>
            </div>
            <button className="btn" style={{marginTop: 10}} onClick={handleAdd}>Save Expense</button>
          </div>
        )}

        <div className="summary-box" style={{background: '#f1f5f9', color: '#334155', marginBottom: 20, boxShadow: 'none', border: '1px solid #e2e8f0'}}>
          <div className="sb-meta">
            <div className="sb-title">Total {view.charAt(0).toUpperCase() + view.slice(1)} Expenses</div>
            <div className="sb-value" style={{color: '#0f172a'}}>{total.toLocaleString(undefined, {minimumFractionDigits: 2})} Birr</div>
          </div>
        </div>

        <div className="expense-list">
          {filtered.length === 0 ? (
            <p className="muted" style={{textAlign:'center', padding: 20}}>No expenses found for this period.</p>
          ) : (
            <table style={{width: '100%', borderCollapse: 'collapse'}}>
              <thead>
                <tr style={{borderBottom: '2px solid #f1f5f9', textAlign: 'left'}}>
                  <th style={{padding: 10}}>Date</th>
                  <th style={{padding: 10}}>Description</th>
                  <th style={{padding: 10}}>Category</th>
                  <th style={{padding: 10, textAlign: 'right'}}>Amount</th>
                  <th style={{padding: 10}}></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(item => (
                  <tr key={item.id} style={{borderBottom: '1px solid #f1f5f9'}}>
                    <td style={{padding: 10}}>{new Date(item.date).toLocaleDateString()}</td>
                    <td style={{padding: 10}}>{item.desc}</td>
                    <td style={{padding: 10}}><span style={{background: '#eef2ff', color: '#4f46e5', padding: '2px 8px', borderRadius: 4, fontSize: 12}}>{item.category}</span></td>
                    <td style={{padding: 10, textAlign: 'right', fontWeight: 'bold'}}>{Number(item.amount).toLocaleString()}</td>
                    <td style={{padding: 10, textAlign: 'right'}}>
                      <button className="btn ghost" style={{padding: '4px 8px', fontSize: 12, color: '#ef4444'}} onClick={()=>{
                        if(confirm('Delete this expense?')) saveExpenses(expenses.filter(e => e.id !== item.id));
                      }}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
