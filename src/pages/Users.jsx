import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { TbUsers } from "react-icons/tb";

/* readPresence defined above; removing duplicate */

function readLogin(role){
	try{
		// Prefer per-role localStorage mirror set on login
		const roleAuth = localStorage.getItem(`bakery_app_auth_${role}`);
		if(roleAuth) return true;
		// Presence that includes a user implies a logged-in session somewhere
		const pres = readPresence(role);
		if(pres.user) return true;
		// Fallback to this tab's session
		const sessionRole = sessionStorage.getItem('bakery_user_role');
		const sessionAuth = sessionStorage.getItem('bakery_app_auth');
		return (sessionRole === role && !!sessionAuth);
	}catch(e){ return false; }
}

function readPresence(role){
	try{
		const raw = localStorage.getItem(`bakery_presence_${role}`);
		if(!raw) return { online:false, lastSeen:null, user:null };
		const p = JSON.parse(raw);
		const last = p.timestamp || p.updatedAt || 0;
		const online = Date.now() - Number(last) < 45000; // 45s window
		return { online, lastSeen:last, user:p.user || p.username || null };
	}catch(e){ return { online:false, lastSeen:null, user:null }; }
}

export default function Users(){
	const navigate = useNavigate();
	const [cashier, setCashier] = useState({ logged:false, online:false, lastSeen:null, user:null });
	const [inventory, setInventory] = useState({ logged:false, online:false, lastSeen:null, user:null });
	const [groundManager, setGroundManager] = useState({ logged:false, online:false, lastSeen:null, user:null });

	useEffect(()=>{
		function load(){
			const c = readPresence('cashier');
			const i = readPresence('inventory');
			const g = readPresence('manager');
			setCashier({ logged: readLogin('cashier'), ...c });
			setInventory({ logged: readLogin('inventory'), ...i });
			setGroundManager({ logged: readLogin('manager'), ...g });
		}
		load();
		const onStorage = () => load();
		window.addEventListener('storage', onStorage);
		const timer = setInterval(load, 5000);
		return ()=>{ window.removeEventListener('storage', onStorage); clearInterval(timer); };
	},[]);

	const StatusPill = ({online}) => (
		<span style={{
			display:'inline-flex', alignItems:'center', gap:6,
			padding:'4px 8px', borderRadius:999,
			background: online ? 'rgba(16,185,129,0.12)' : 'rgba(244,63,94,0.12)',
			color: online ? '#047857' : '#b91c1c', fontWeight:600,
		}}>
			<span style={{width:8,height:8,borderRadius:999,background: online ? '#10b981' : '#ef4444'}} />
			{online ? 'Online' : 'Offline'}
		</span>
	);

	const LoggedBadge = ({logged}) => (
		<span style={{ marginLeft:8, fontWeight:600, color: logged ? '#1e40af' : '#6b7280' }}>
			{logged ? 'Logged in' : 'Not logged in'}
		</span>
	);

	const fmt = (ts) => ts ? new Date(ts).toLocaleString() : '—';

	return (
		<div className="container">
			<div className="header" style={{display:'flex', alignItems:'center', gap:12}}>
				<div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700 shadow">
					<TbUsers size={20} />
				</div>
				<h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 flex-1">Users</h1>
				<button
					className="btn"
					style={{
						marginLeft:12,
						background: 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)',
						color: '#fff',
						border: 'none',
						borderRadius: 9999,
						padding: '10px 16px',
						fontWeight: 600,
						boxShadow: '0 10px 24px rgba(249,115,22,0.35)'
					}}
					onClick={()=>navigate('/admin')}
				>
					Back to Dashboard
				</button>
			</div>

			{/* Cashier and Ground Manager cards side by side */}
			<div className="grid" style={{gridTemplateColumns:'repeat(auto-fit, minmax(260px, 1fr))'}}>
				<div className="card">
					<h3>Cashier</h3>
					<p className="muted">Real-time status of cashier workstation.</p>
					<div style={{display:'flex', alignItems:'center', gap:12, marginTop:8}}>
						<StatusPill online={cashier.online} />
						<LoggedBadge logged={cashier.logged} />
					</div>
					<div className="muted" style={{marginTop:8, display:'flex', alignItems:'center', gap:8}}>
						<TbUsers size={16} style={{opacity:0.9}} />
						<span>User: {cashier.user || '—'}</span>
					</div>
					<div className="muted">Last active: {fmt(cashier.lastSeen)}</div>
				</div>

				<div className="card">
					<h3>Ground Manager</h3>
					<p className="muted">Status of ground manager login.</p>
					<div style={{display:'flex', alignItems:'center', gap:12, marginTop:8}}>
						<StatusPill online={groundManager.online} />
						<LoggedBadge logged={groundManager.logged} />
					</div>
					<div className="muted" style={{marginTop:8, display:'flex', alignItems:'center', gap:8}}>
						<TbUsers size={16} style={{opacity:0.9}} />
						<span>User: {groundManager.user || '—'}</span>
					</div>
					<div className="muted">Last active: {fmt(groundManager.lastSeen)}</div>
				</div>
			</div>
		</div>
	);
}