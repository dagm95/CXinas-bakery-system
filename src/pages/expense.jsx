import React from "react";
import { useNavigate } from "react-router-dom";
import { GiExpense } from "react-icons/gi";
import { FaBuilding } from "react-icons/fa";
import { FiPackage } from "react-icons/fi";
// SampleChart removed per user request

export default function Expenses(){
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const sampleData = months.map(()=> Math.round(Math.random()*900)+100);

  const navigate = useNavigate();

  return (
    <div className="container">
      <div className="header">
        <div className="logo" style={{ color: 'var(--teal)' }}>
          <GiExpense size={28} color="var(--teal)" aria-hidden="true" />
        </div>
        <h1>Expenses / Cost Tracking</h1>
        <button className="btn orange back" onClick={()=>navigate('/admin')}>Back to Dashboard</button>
      </div>

      <div className="nav-grid" style={{marginTop: 24}}>
        <div role="link" tabIndex={0} className="nav-card blue" onClick={()=>navigate('/admin/expemce')} onKeyDown={(e)=>{ if(e.key==='Enter') navigate('/admin/expemce'); }}>
          <div className="nav-icon"><FaBuilding size={20} color="white" aria-hidden="true" /></div>
          <div className="nav-title">Admin Expense</div>
          <div className="nav-sub">Administrative Costs</div>
        </div>

        <div role="link" tabIndex={0} className="nav-card green" onClick={()=>navigate('/admin/inventoryexpence')} onKeyDown={(e)=>{ if(e.key==='Enter') navigate('/admin/inventoryexpence'); }}>
          <div className="nav-icon"><FiPackage size={20} color="white" aria-hidden="true" /></div>
          <div className="nav-title">Inventory Expense Analysis</div>
          <div className="nav-sub">Stock & Supply Costs</div>
        </div>
      </div>
    </div>
  );
}
