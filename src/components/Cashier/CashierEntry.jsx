import React from 'react';
import { Navigate } from 'react-router-dom';
import Cashier from './Cashier';

export default function CashierEntry(){
  try{
    // Prefer per-tab sessionStorage (set by Login) and fall back to localStorage snapshots
    const raw = sessionStorage.getItem('bakery_app_auth') || localStorage.getItem('bakery_app_auth') || localStorage.getItem('bakery_app_auth_cashier');
    const role = sessionStorage.getItem('bakery_user_role') || localStorage.getItem('bakery_user_role');
    // If a force-logout flag remains set, clear it now to allow re-entry after admin action
    try { localStorage.removeItem('bakery_force_logout_cashier'); } catch(e) {}
    if (!raw) return <Navigate to={'/login?next=/cashier'} replace />;
    // allow either explicit cashier role or a token saved for cashier
    if (role === 'cashier') return <Cashier />;
    try{ const parsed = JSON.parse(raw); if(parsed && parsed.token === 'cashier-token') return <Cashier />; }catch(e){}
    // otherwise redirect to login and request the cashier credential flow
    return <Navigate to={'/login?next=/cashier'} replace />;
  }catch(e){
    return <Navigate to={'/login?next=/admin/cashier'} replace />;
  }
}
