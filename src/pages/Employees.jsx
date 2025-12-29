import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaUsers } from "react-icons/fa";

export default function Employees(){
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null); // employee id awaiting confirmation
  const [newEmp, setNewEmp] = useState({
    name: '',
    salary: '',
    placement: 'Cashier',
    customPlacement: '', // free-text override for role
    phone: '',
    startDate: new Date().toISOString().slice(0,10),
    paymentCycle: 'weekly' // weekly | monthly
  });

  useEffect(() => {
    try {
      const raw = localStorage.getItem('bakery_employees');
      if (raw){
        const parsed = JSON.parse(raw);
        // migrate existing employees to include paymentCycle (default monthly)
        const migrated = Array.isArray(parsed) ? parsed.map(e => ({ paymentCycle: e.paymentCycle || 'monthly', ...e })) : [];
        setEmployees(migrated);
      }
    } catch (e) { console.error(e); }
  }, []);

  const saveEmployees = (list) => {
    setEmployees(list);
    localStorage.setItem('bakery_employees', JSON.stringify(list));
  };

  const handleAdd = () => {
    if (!newEmp.name || !newEmp.salary) return;
    const placementFinal = (newEmp.customPlacement || '').trim() ? newEmp.customPlacement.trim() : newEmp.placement;
    const { customPlacement, ...rest } = newEmp;
    const item = {
      id: Date.now(),
      ...rest,
      placement: placementFinal,
      salary: Number(newEmp.salary)
    };
    saveEmployees([item, ...employees]);
    setNewEmp({
      name: '',
      salary: '',
      placement: 'Cashier',
      customPlacement: '',
      phone: '',
      startDate: new Date().toISOString().slice(0,10),
      paymentCycle: 'weekly'
    });
    setShowAdd(false);
  };

  const handleDelete = (id) => {
    setDeleteTarget(id);
  };

  function confirmDelete(){
    if(deleteTarget){
      saveEmployees(employees.filter(e => e.id !== deleteTarget));
    }
    setDeleteTarget(null);
  }

  function cancelDelete(){ setDeleteTarget(null); }

  return (
    <div className="container">
      <div className="header">
        <div className="logo" aria-hidden style={{width:44,height:36,display:'flex',alignItems:'center',justifyContent:'center',background:'linear-gradient(90deg,#6F42C1,#895dd2)',borderRadius:10,color:'#fff'}}>
          <FaUsers size={18} aria-hidden="true" />
        </div>
        <h1>Employees Management</h1>
        <button className="btn orange back pill" onClick={()=>navigate('/admin')}>Back to Dashboard</button>
      </div>

      <div className="card">
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 20}}>
          <div className="section-title">Staff List</div>
          <button className="btn orange" onClick={()=>setShowAdd(!showAdd)}>{showAdd ? 'Cancel' : '+ Add Employee'}</button>
        </div>

        {showAdd && (
          <div style={{background: '#f8fafc', padding: 16, borderRadius: 8, marginBottom: 20, border: '1px solid #e2e8f0'}}>
            <h4 style={{marginTop:0}}>New Employee</h4>
            {/* Payment cycle selection bar */}
            <div style={{display:'flex', gap:8, marginBottom:12}}>
              <button type="button" onClick={()=>setNewEmp({...newEmp, paymentCycle:'weekly'})} style={{padding:'8px 14px',borderRadius:8,border:'1px solid '+(newEmp.paymentCycle==='weekly'?'#f59e0b':'#e2e8f0'),background:newEmp.paymentCycle==='weekly'?'linear-gradient(90deg,#FF9500,#FFB800)':'#fff',color:newEmp.paymentCycle==='weekly'?'#fff':'#334155',fontWeight:600,boxShadow:newEmp.paymentCycle==='weekly'?'0 6px 18px rgba(255,149,0,0.25)':'none'}}>Weekly Paid</button>
              <button type="button" onClick={()=>setNewEmp({...newEmp, paymentCycle:'monthly'})} style={{padding:'8px 14px',borderRadius:8,border:'1px solid '+(newEmp.paymentCycle==='monthly'?'#f59e0b':'#e2e8f0'),background:newEmp.paymentCycle==='monthly'?'linear-gradient(90deg,#FF9500,#FFB800)':'#fff',color:newEmp.paymentCycle==='monthly'?'#fff':'#334155',fontWeight:600,boxShadow:newEmp.paymentCycle==='monthly'?'0 6px 18px rgba(255,149,0,0.25)':'none'}}>Monthly Paid</button>
            </div>
            <div className="form-row">
              <div className="field">
                <label>Full Name</label>
                <input value={newEmp.name} onChange={e=>setNewEmp({...newEmp, name: e.target.value})} placeholder="e.g. Abebe Kebede" />
              </div>
              <div className="field" style={{display:'flex',flexDirection:'column'}}>
                <label>Placement / Role</label>
                <div style={{display:'flex',gap:8}}>
                  <select style={{flex:'0 0 160px'}} value={newEmp.placement} onChange={e=>setNewEmp({...newEmp, placement: e.target.value})}>
                    <option>Cashier</option>
                    <option>Baker</option>
                    <option>Manager</option>
                    <option>Cleaner</option>
                    <option>Security</option>
                    <option>Other</option>
                  </select>
                  <input
                    style={{flex:1}}
                    placeholder="Or type custom role"
                    value={newEmp.customPlacement}
                    onChange={e=>setNewEmp({...newEmp, customPlacement: e.target.value})}
                  />
                </div>
                <small style={{marginTop:4,color:'#64748b'}}>If you type a custom role it will override the selected one.</small>
              </div>
              <div className="field">
                <label>Salary (Birr)</label>
                <input type="number" value={newEmp.salary} onChange={e=>setNewEmp({...newEmp, salary: e.target.value})} placeholder="0.00" />
              </div>
            </div>
            <div className="form-row" style={{marginTop: 12}}>
               <div className="field">
                <label>Phone Number</label>
                <input value={newEmp.phone} onChange={e=>setNewEmp({...newEmp, phone: e.target.value})} placeholder="09..." />
              </div>
              <div className="field">
                <label>Start Date</label>
                <input type="date" value={newEmp.startDate} onChange={e=>setNewEmp({...newEmp, startDate: e.target.value})} />
              </div>
            </div>
            <button className="btn" style={{marginTop: 16}} onClick={handleAdd}>Save Employee</button>
          </div>
        )}

        <div className="employee-list">
          {employees.length === 0 && (
            <p className="muted" style={{textAlign:'center', padding: 20}}>No employees added yet.</p>
          )}
          {employees.length > 0 && (
            <>
              {/* Summary boxes */}
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:16,marginBottom:22}}>
                <div style={{background:'linear-gradient(135deg,#0ea5e9,#2563eb)',padding:16,borderRadius:14,color:'#fff',boxShadow:'0 10px 24px rgba(14,165,233,0.25)'}}>
                  <div style={{fontSize:13,opacity:.85,fontWeight:600}}>Weekly Paid</div>
                  <div style={{fontSize:26,fontWeight:800,marginTop:6}}>{employees.filter(e=>e.paymentCycle==='weekly').length}</div>
                  <div style={{fontSize:12,marginTop:4,opacity:.9}}>Total Salary: {employees.filter(e=>e.paymentCycle==='weekly').reduce((s,e)=>s+Number(e.salary||0),0).toLocaleString()} Birr</div>
                </div>
                <div style={{background:'linear-gradient(135deg,#f59e0b,#ef4444)',padding:16,borderRadius:14,color:'#fff',boxShadow:'0 10px 24px rgba(245,158,11,0.25)'}}>
                  <div style={{fontSize:13,opacity:.85,fontWeight:600}}>Monthly Paid</div>
                  <div style={{fontSize:26,fontWeight:800,marginTop:6}}>{employees.filter(e=>e.paymentCycle==='monthly').length}</div>
                  <div style={{fontSize:12,marginTop:4,opacity:.9}}>Total Salary: {employees.filter(e=>e.paymentCycle==='monthly').reduce((s,e)=>s+Number(e.salary||0),0).toLocaleString()} Birr</div>
                </div>
              </div>
              {/* Weekly Group */}
              <div style={{marginBottom:30}}>
                <h4 style={{margin:'0 0 10px',fontSize:16,fontWeight:700}}>Weekly Paid Employees</h4>
                {employees.filter(e=>e.paymentCycle==='weekly').length === 0 ? <div className="muted" style={{fontSize:13}}>None</div> : (
                  <table style={{width:'100%',borderCollapse:'collapse'}}>
                    <thead>
                      <tr style={{borderBottom:'2px solid #f1f5f9',textAlign:'left'}}>
                        <th style={{padding:10}}>Name</th>
                        <th style={{padding:10}}>Role</th>
                        <th style={{padding:10}}>Phone</th>
                        <th style={{padding:10}}>Start Date</th>
                        <th style={{padding:10,textAlign:'right'}}>Salary</th>
                        <th style={{padding:10}}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {employees.filter(e=>e.paymentCycle==='weekly').map(emp => (
                        <tr key={emp.id} style={{borderBottom:'1px solid #f1f5f9'}}>
                          <td style={{padding:10,fontWeight:600}}>{emp.name}</td>
                          <td style={{padding:10}}><span style={{background:'#eef2ff',color:'#4f46e5',padding:'2px 8px',borderRadius:4,fontSize:12}}>{emp.placement}</span></td>
                          <td style={{padding:10}}>{emp.phone || '-'}</td>
                          <td style={{padding:10}}>{emp.startDate}</td>
                          <td style={{padding:10,textAlign:'right'}}>{Number(emp.salary).toLocaleString()} Birr</td>
                          <td style={{padding:10,textAlign:'right'}}>
                            <button className="btn ghost" style={{padding:'4px 8px',fontSize:12,color:'#ef4444'}} onClick={()=>handleDelete(emp.id)}>Remove</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
              {/* Monthly Group */}
              <div style={{marginBottom:10}}>
                <h4 style={{margin:'0 0 10px',fontSize:16,fontWeight:700}}>Monthly Paid Employees</h4>
                {employees.filter(e=>e.paymentCycle==='monthly').length === 0 ? <div className="muted" style={{fontSize:13}}>None</div> : (
                  <table style={{width:'100%',borderCollapse:'collapse'}}>
                    <thead>
                      <tr style={{borderBottom:'2px solid #f1f5f9',textAlign:'left'}}>
                        <th style={{padding:10}}>Name</th>
                        <th style={{padding:10}}>Role</th>
                        <th style={{padding:10}}>Phone</th>
                        <th style={{padding:10}}>Start Date</th>
                        <th style={{padding:10,textAlign:'right'}}>Salary</th>
                        <th style={{padding:10}}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {employees.filter(e=>e.paymentCycle==='monthly').map(emp => (
                        <tr key={emp.id} style={{borderBottom:'1px solid #f1f5f9'}}>
                          <td style={{padding:10,fontWeight:600}}>{emp.name}</td>
                          <td style={{padding:10}}><span style={{background:'#eef2ff',color:'#4f46e5',padding:'2px 8px',borderRadius:4,fontSize:12}}>{emp.placement}</span></td>
                          <td style={{padding:10}}>{emp.phone || '-'}</td>
                          <td style={{padding:10}}>{emp.startDate}</td>
                          <td style={{padding:10,textAlign:'right'}}>{Number(emp.salary).toLocaleString()} Birr</td>
                          <td style={{padding:10,textAlign:'right'}}>
                            <button className="btn ghost" style={{padding:'4px 8px',fontSize:12,color:'#ef4444'}} onClick={()=>handleDelete(emp.id)}>Remove</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}
        </div>
        {deleteTarget !== null && (
          <div style={{position:'fixed',inset:0,display:'flex',alignItems:'center',justifyContent:'center',zIndex:1500}}>
            <div onClick={cancelDelete} style={{position:'absolute',inset:0,background:'rgba(15,23,42,0.45)'}} />
            <div style={{position:'relative',background:'#fff',borderRadius:16,padding:24,width:'92%',maxWidth:420,boxShadow:'0 30px 60px rgba(2,6,23,0.35)'}}>
              <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:12}}>
                <div style={{width:52,height:52,display:'flex',alignItems:'center',justifyContent:'center',background:'#fef3c7',borderRadius:14,fontWeight:800,fontSize:22,color:'#b45309'}}>!</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:18,fontWeight:800,marginBottom:4}}>Confirm Removal</div>
                  <div style={{fontSize:13,color:'#64748b'}}>Are you sure you want to remove this employee? This action cannot be undone.</div>
                </div>
              </div>
              <div style={{display:'flex',justifyContent:'flex-end',gap:10,marginTop:4}}>
                <button className="btn secondary" onClick={cancelDelete} style={{padding:'8px 14px'}}>Cancel</button>
                <button className="btn" onClick={confirmDelete} style={{background:'linear-gradient(90deg,#ef4444,#f97316)',border:'none',padding:'8px 14px'}}>Delete</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
