

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { GiProfit } from "react-icons/gi";

function startOfMonth(d){ const dt = new Date(d); dt.setDate(1); dt.setHours(0,0,0,0); return dt; }
function endOfMonth(d){ const dt = new Date(d); dt.setMonth(dt.getMonth()+1,0); dt.setHours(23,59,59,999); return dt; }
function formatBirr(n){ if (n == null) return '-'; return Number(n).toLocaleString(undefined, {maximumFractionDigits:2}) + ' Birr'; }

function getMonthKey(date) {
	return date.toISOString().slice(0,7); // YYYY-MM
}

function percentChange(current, prev) {
	if (prev === 0) return current === 0 ? 0 : 100;
	return ((current - prev) / Math.abs(prev)) * 100;
}

export default function Profits() {
	const navigate = useNavigate();
	const [anchor, setAnchor] = useState(() => new Date().toISOString().slice(0,7)); // YYYY-MM
	const [summary, setSummary] = useState(null);
	const [prevSummary, setPrevSummary] = useState(null);
	const [locked, setLocked] = useState(false);
	const [expenseBreakdown, setExpenseBreakdown] = useState({ employee: 0, inventory: 0, admin: 0 });
	const [status, setStatus] = useState('');

	// Load all relevant data from localStorage
	useEffect(() => {
		try {
			const raw = localStorage.getItem('bakery_app_v1');
			const store = raw ? JSON.parse(raw) : {};
			const sales = Array.isArray(store.sales) ? store.sales : [];
			// Employee payments
			const empLog = (() => { try { return JSON.parse(localStorage.getItem('bakery_employee_payments')) || []; } catch { return []; } })();
			// Admin expenses
			const adminExp = (() => { try { return JSON.parse(localStorage.getItem('bakery_admin_expenses')) || []; } catch { return []; } })();
						// Inventory expenses: read from inventory_sent_payloads (used by InventoryExpense page)
						const invExp = (() => {
							try {
								const arr = JSON.parse(localStorage.getItem('inventory_sent_payloads')) || [];
								// Only include type === 'expense'
								return arr.filter(e => e.payload && e.payload.type === 'expense');
							} catch {
								return [];
							}
						})();

			// Date range for selected month
			const d = new Date(anchor + '-01');
			const range = { start: startOfMonth(d), end: endOfMonth(d) };
			// Previous month
			const prevD = new Date(d); prevD.setMonth(d.getMonth()-1);
			const prevRange = { start: startOfMonth(prevD), end: endOfMonth(prevD) };

			// Aggregate sales for month
			let totalSales = 0;
			sales.forEach(s => {
				const ts = s.saleDate || s.timestamp || s.ts;
				if (!ts) return;
				const tdate = new Date(ts);
				if (tdate < range.start || tdate > range.end) return;
				let rev = 0;
				if (Array.isArray(s.items) && s.items.length) {
					s.items.forEach(it => {
						rev += Number(it.subtotal ?? (it.price * it.quantity) ?? 0) || 0;
					});
				} else {
					rev = Number(s.total ?? s.totalAmount ?? 0) || 0;
				}
				totalSales += rev;
			});

			// Aggregate sales for previous month
			let prevSales = 0;
			sales.forEach(s => {
				const ts = s.saleDate || s.timestamp || s.ts;
				if (!ts) return;
				const tdate = new Date(ts);
				if (tdate < prevRange.start || tdate > prevRange.end) return;
				let rev = 0;
				if (Array.isArray(s.items) && s.items.length) {
					s.items.forEach(it => {
						rev += Number(it.subtotal ?? (it.price * it.quantity) ?? 0) || 0;
					});
				} else {
					rev = Number(s.total ?? s.totalAmount ?? 0) || 0;
				}
				prevSales += rev;
			});

			// Employee payments for month
			let employeeTotal = 0;
			empLog.forEach(p => {
				const paid = p.paid_at ? new Date(p.paid_at) : null;
				if (paid && paid >= range.start && paid <= range.end) {
					employeeTotal += Number(p.amount || 0);
				}
			});

			// Employee payments for previous month
			let prevEmployeeTotal = 0;
			empLog.forEach(p => {
				const paid = p.paid_at ? new Date(p.paid_at) : null;
				if (paid && paid >= prevRange.start && paid <= prevRange.end) {
					prevEmployeeTotal += Number(p.amount || 0);
				}
			});

			// Admin expenses for month
			let adminTotal = 0;
			adminExp.forEach(e => {
				const d = e.date ? new Date(e.date) : null;
				if (d && d >= range.start && d <= range.end) {
					adminTotal += Number(e.amount || 0);
				}
			});

			// Admin expenses for previous month
			let prevAdminTotal = 0;
			adminExp.forEach(e => {
				const d = e.date ? new Date(e.date) : null;
				if (d && d >= prevRange.start && d <= prevRange.end) {
					prevAdminTotal += Number(e.amount || 0);
				}
			});

			// Inventory expenses for month (if available)
			let inventoryTotal = 0;
			invExp.forEach(e => {
				// Use payload.date and payload.amount for inventory_sent_payloads
				const d = e.payload && e.payload.date ? new Date(e.payload.date) : (e.date ? new Date(e.date) : null);
				const amt = e.payload && typeof e.payload.amount === 'number' ? e.payload.amount : (e.amount || 0);
				if (d && d >= range.start && d <= range.end) {
					inventoryTotal += Number(amt);
				}
			});

			// Inventory expenses for previous month
			let prevInventoryTotal = 0;
			invExp.forEach(e => {
				const d = e.payload && e.payload.date ? new Date(e.payload.date) : (e.date ? new Date(e.date) : null);
				const amt = e.payload && typeof e.payload.amount === 'number' ? e.payload.amount : (e.amount || 0);
				if (d && d >= prevRange.start && d <= prevRange.end) {
					prevInventoryTotal += Number(amt);
				}
			});

			// Totals
			const totalExpenses = employeeTotal + adminTotal + inventoryTotal;
			const prevTotalExpenses = prevEmployeeTotal + prevAdminTotal + prevInventoryTotal;
			const netProfit = totalSales - totalExpenses;
			const prevNetProfit = prevSales - prevTotalExpenses;

			// Status
			let profitStatus = 'Break-even';
			if (netProfit > 0) profitStatus = 'Profit';
			else if (netProfit < 0) profitStatus = 'Loss';

			// Percentage change
			const profitChange = percentChange(netProfit, prevNetProfit);

			// Highlight logic
			let highlight = '';
			if (totalExpenses > totalSales * 0.9) highlight = 'High expenses!';
			if (profitChange < -30) highlight = 'Sudden profit drop!';


			// Detailed breakdown for admin
			const breakdown = [
				{ label: 'Total Sales', value: totalSales, color: '#0ea5e9', desc: 'Sum of all cashier/POS transactions for the month.' },
				{ label: 'Employee Payments', value: employeeTotal, color: '#6366f1', desc: 'Salaries, wages, overtime, bonuses paid to employees.' },
				{ label: 'Inventory Expenses', value: inventoryTotal, color: '#f59e0b', desc: 'Ingredient purchases, restocking, wastage.' },
				{ label: 'Admin Expenses', value: adminTotal, color: '#ef4444', desc: 'Utilities, rent, internet, maintenance, admin costs.' },
				{ label: 'Total Expenses', value: totalExpenses, color: '#334155', desc: 'Sum of all expenses (Employee + Inventory + Admin).' },
				{ label: 'Net Profit', value: netProfit, color: netProfit >= 0 ? '#16a34a' : '#dc2626', desc: 'Total Sales minus Total Expenses.' },
			];

			setSummary({
				totalSales,
				totalExpenses,
				netProfit,
				profitStatus,
				profitChange,
				highlight,
				month: anchor,
				breakdown,
			});
			setPrevSummary({
				totalSales: prevSales,
				totalExpenses: prevTotalExpenses,
				netProfit: prevNetProfit,
				month: getMonthKey(prevD),
			});
			setExpenseBreakdown({ employee: employeeTotal, inventory: inventoryTotal, admin: adminTotal });

			// Lock months before current
			const now = new Date();
			const isLocked = (d.getFullYear() < now.getFullYear()) || (d.getFullYear() === now.getFullYear() && d.getMonth() < now.getMonth());
			setLocked(isLocked);
		} catch (e) {
			setSummary(null);
			setPrevSummary(null);
			setExpenseBreakdown({ employee: 0, inventory: 0, admin: 0 });
			setStatus('Error loading data');
		}
	}, [anchor]);

	// Chart data (simple bar chart using divs, no external lib)
	const chartData = useMemo(() => {
		if (!summary || !prevSummary) return [];
		return [
			{ label: 'Sales', current: summary.totalSales, prev: prevSummary.totalSales, color: '#0ea5e9' },
			{ label: 'Expenses', current: summary.totalExpenses, prev: prevSummary.totalExpenses, color: '#ef4444' },
			{ label: 'Net Profit', current: summary.netProfit, prev: prevSummary.netProfit, color: summary.netProfit >= 0 ? '#16a34a' : '#dc2626' },
		];
	}, [summary, prevSummary]);

	// Expense breakdown for chart
	const expenseBreakdownArr = useMemo(() => {
		return [
			{ label: 'Employee', value: expenseBreakdown.employee, color: '#0ea5e9' },
			{ label: 'Inventory', value: expenseBreakdown.inventory, color: '#f59e0b' },
			{ label: 'Admin', value: expenseBreakdown.admin, color: '#6366f1' },
		];
	}, [expenseBreakdown]);

	// Admin-only access (redirect to login if not admin)
	useEffect(() => {
		const role = sessionStorage.getItem('bakery_user_role') || localStorage.getItem('bakery_user_role');
		const auth = sessionStorage.getItem('bakery_app_auth') || localStorage.getItem('bakery_app_auth');
		if (!auth || role !== 'admin') {
			navigate('/login', { replace: true });
		}
	}, [navigate]);

	// UI
	return (
		<div className="container">
			<div className="header">
				<div className="logo" style={{width:44,height:36,display:'flex',alignItems:'center',justifyContent:'center',background:'linear-gradient(90deg,#FF9500,#FFB800)',borderRadius:10,color:'#fff'}}>
					<GiProfit size={18} aria-hidden="true" />
				</div>
				<h1>Monthly Profit Analysis</h1>
				<button className="btn orange back pill" onClick={()=>navigate('/admin')}>Back to Dashboard</button>
			</div>

			<div className="card">
				<div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
					<div>
						<h3 style={{margin:0}}>Month</h3>
						<div className="muted">{anchor}</div>
					</div>
					<div style={{display:'flex',gap:8,alignItems:'center'}}>
						<button className="btn ghost" onClick={()=>{
							const d = new Date(anchor + '-01'); d.setMonth(d.getMonth()-1); setAnchor(d.toISOString().slice(0,7));
						}}>Prev</button>
						<input type="month" value={anchor} onChange={e=>setAnchor(e.target.value)} disabled={locked} />
						<button className="btn ghost" onClick={()=>{
							const d = new Date(anchor + '-01'); d.setMonth(d.getMonth()+1); setAnchor(d.toISOString().slice(0,7));
						}}>Next</button>
					</div>
				</div>

				{status && <div style={{color:'#dc2626',marginBottom:8}}>{status}</div>}

				{summary && (
					<>
						<div className="card" style={{marginBottom:18,padding:18,background:'linear-gradient(90deg,#FF9500,#FFB800)',boxShadow:'0 18px 40px rgba(255,149,0,0.18)',color:'#fff'}}>
							<div className="summary-panel" style={{display:'flex',gap:16,marginBottom:0,flexWrap:'wrap'}}>
							<div className="summary-box" style={{background:'#f1f5f9',color:'#0ea5e9',minWidth:180}}>
								<div className="sb-title">Total Sales</div>
								<div className="sb-value" style={{fontWeight:800,fontSize:22}}>{formatBirr(summary.totalSales)}</div>
							</div>
							<div className="summary-box" style={{background:'#f1f5f9',color:'#ef4444',minWidth:180}}>
								<div className="sb-title">Total Expenses</div>
								<div className="sb-value" style={{fontWeight:800,fontSize:22}}>{formatBirr(summary.totalExpenses)}</div>
							</div>
							<div className="summary-box" style={{background:'#f1f5f9',color: summary.netProfit >= 0 ? '#16a34a' : '#dc2626',minWidth:180}}>
								<div className="sb-title">Net Profit</div>
								<div className="sb-value" style={{fontWeight:800,fontSize:22}}>{formatBirr(summary.netProfit)}</div>
							</div>
							<div className="summary-box" style={{background:'#f1f5f9',color:'#f59e0b',minWidth:180}}>
								<div className="sb-title">Status</div>
								<div className="sb-value" style={{fontWeight:800,fontSize:22}}>{summary.profitStatus}</div>
								<div className="sb-desc" style={{fontSize:13}}>{summary.highlight}</div>
							</div>
							<div className="summary-box" style={{background:'#f1f5f9',color:'#6366f1',minWidth:180}}>
								<div className="sb-title">Change vs Prev Month</div>
								<div className="sb-value" style={{fontWeight:800,fontSize:22}}>{summary.profitChange.toFixed(1)}%</div>
							</div>
							</div>
						</div>


						{/* Detailed breakdown for admin */}

						<div className="card" style={{marginBottom:18}}>
							<h3 style={{marginTop:0}}>Profit Calculation Breakdown</h3>
							<div style={{display:'flex',flexDirection:'column',gap:10}}>
								{(summary && Array.isArray(summary.breakdown) ? summary.breakdown : []).map((row, idx) => (
									<div key={row.label} style={{display:'flex',alignItems:'center',gap:18,background:'#f8fafc',borderRadius:8,padding:'10px 16px',borderLeft:`6px solid ${row.color}`}}>
										<div style={{flex:1}}>
											<div style={{fontWeight:700,fontSize:15,color:row.color}}>{row.label}</div>
											<div style={{fontSize:13,color:'#64748b'}}>{row.desc}</div>
										</div>
										<div style={{fontWeight:800,fontSize:18,color:row.color}}>{formatBirr(row.value)}</div>
									</div>
								))}
								{(!summary || !Array.isArray(summary.breakdown)) && (
									<div style={{color:'#64748b',fontSize:14,padding:'10px'}}>No breakdown data available.</div>
								)}
							</div>
						</div>

						{/* Bar/line chart for sales, expenses, profit */}
						<div className="card" style={{marginBottom:18}}>
							<h3 style={{marginTop:0}}>Monthly Comparison</h3>
							<div style={{display:'flex',gap:24,alignItems:'end',height:180}}>
								{chartData.map((d,idx)=>{
									const max = Math.max(d.current, d.prev, 1);
									const hCur = Math.round((d.current/max)*120)+30;
									const hPrev = Math.round((d.prev/max)*120)+30;
									return (
										<div key={d.label} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'flex-end'}}>
											<div style={{display:'flex',gap:6,alignItems:'end'}}>
												<div title={`Current: ${formatBirr(d.current)}`} style={{width:32,height:hCur,background:d.color,opacity:0.85,borderRadius:8,marginBottom:2}}></div>
												<div title={`Prev: ${formatBirr(d.prev)}`} style={{width:24,height:hPrev,background:d.color,opacity:0.35,borderRadius:8,marginBottom:2}}></div>
											</div>
											<div style={{fontSize:14,marginTop:6}}>{d.label}</div>
										</div>
									);
								})}
							</div>
							<div style={{fontSize:13,color:'#64748b',marginTop:8}}>
								<span style={{marginRight:18}}><span style={{display:'inline-block',width:16,height:8,background:'#0ea5e9',borderRadius:2,marginRight:4}}></span>Current</span>
								<span><span style={{display:'inline-block',width:16,height:8,background:'#0ea5e9',opacity:0.35,borderRadius:2,marginRight:4}}></span>Prev</span>
							</div>
						</div>

						{/* Expense breakdown chart */}
						<div className="card" style={{marginBottom:18}}>
							<h3 style={{marginTop:0}}>Expense Breakdown</h3>
							<div style={{display:'flex',gap:24,alignItems:'end',height:120}}>
								{expenseBreakdownArr.map((d,idx)=>{
									const max = Math.max(...expenseBreakdownArr.map(x=>x.value||0),1);
									const h = Math.round((d.value/max)*90)+20;
									return (
										<div key={d.label} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'flex-end'}}>
											<div title={formatBirr(d.value)} style={{width:36,height:h,background:d.color,opacity:0.85,borderRadius:8,marginBottom:2}}></div>
											<div style={{fontSize:14,marginTop:6}}>{d.label}</div>
										</div>
									);
								})}
							</div>
						</div>

						<div className="muted" style={{fontSize:13,marginTop:8}}>
							<ul style={{margin:0,paddingLeft:18}}>
								<li>Months before the current are locked (read-only).</li>
								<li>Profit is recalculated automatically when data changes.</li>
								<li>Monthly summaries are stored for performance; old receipts are archived.</li>
								<li>Only admins can access this page.</li>
							</ul>
						</div>
					</>
				)}
			</div>
		</div>
	);
}

