import React, { useEffect, useState } from "react";
import { DiAptana } from "react-icons/di";
import { FiSettings } from "react-icons/fi";
import { IoIosLogOut } from "react-icons/io";
import { TbUsers } from "react-icons/tb";

import { FaTableCells } from "react-icons/fa6";
import { NavLink, useNavigate } from "react-router-dom";

export default function Sidebar(){
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(()=>{
    try{
      const isSmall = window.matchMedia && window.matchMedia('(max-width:720px)').matches;
      setCollapsed(isSmall);
    }catch(e){}
  },[]);

  useEffect(()=>{
    function onToggle(){ setMobileOpen(o => !o); }
    window.addEventListener('toggleMobileSidebar', onToggle);
    return ()=> window.removeEventListener('toggleMobileSidebar', onToggle);
  },[]);

  return (
    <>
      <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`} role="navigation" aria-label="Main sidebar">
      <div className="sidebar-head">
        <div className="logo" aria-hidden="true"></div>
        <button
          className="sidebar-toggle"
          onClick={()=>setCollapsed(s=>!s)}
          aria-expanded={!collapsed}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? '›' : '‹'}
        </button>
      </div>

      <nav className="nav">
        <ul>
          <li>
            <NavLink
              to="/admin"
              end
              className={({isActive}) => `flex items-center gap-4 px-4 py-2.5 rounded-[18px] ${isActive ? 'text-white' : 'hover:bg-white/5'}`}
              aria-label="Dashboard"
              style={({isActive}) => isActive ? ({
                backgroundImage:'linear-gradient(to right, #FF9500, #FFB800)',
                boxShadow:'0 10px 24px rgba(255,149,0,0.28)'
              }) : ({color:'var(--sidebar-foreground)'})}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{color:'inherit'}}>
                <path d="M3 10.5L12 3l9 7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M5 9.5v10h14v-10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className="link-label">Dashboard</span>
            </NavLink>
          </li>

          <li className="divider" aria-hidden="true" />

          <li>
              <NavLink to="/admin/users" className={({isActive}) => `flex items-center gap-4 px-4 py-2.5 rounded-[18px] ${isActive ? 'text-white' : 'hover:bg-white/5'}`} aria-label="Users" style={({isActive}) => isActive ? ({
                  backgroundImage:'linear-gradient(to right, #FF9500, #FFB800)',
                  boxShadow:'0 10px 24px rgba(255,149,0,0.28)'
                }) : ({color:'var(--sidebar-foreground)'})}>
                <TbUsers size={20} style={{ color: 'inherit' }} aria-hidden="true" />
                <span className="link-label">Users</span>
            </NavLink>
          </li>

          <li className="divider" aria-hidden="true" />

          


          <li>
              <NavLink to="/admin/daily-summary" className={({isActive}) => `flex items-center gap-4 px-4 py-2.5 rounded-[18px] ${isActive ? 'text-white' : 'hover:bg-white/5'}`} aria-label="Report" style={({isActive}) => isActive ? ({
                  backgroundImage:'linear-gradient(to right, #FF9500, #FFB800)',
                  boxShadow:'0 10px 24px rgba(255,149,0,0.28)'
                }) : ({color:'var(--sidebar-foreground)'})}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{color:'inherit'}}>
                  <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="2"/>
                  <path d="M8 3v4M16 3v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M3 9h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                <span className="link-label">Report</span>
            </NavLink>
          </li>

          <li>
            <NavLink to="/admin/sales-tables" className={({isActive}) => `flex items-center gap-4 px-4 py-2.5 rounded-[18px] ${isActive ? 'text-white' : 'hover:bg-white/5'}`} aria-label="Tables" style={({isActive}) => isActive ? ({
                backgroundImage:'linear-gradient(to right, #FF9500, #FFB800)',
                boxShadow:'0 10px 24px rgba(255,149,0,0.28)'
              }) : ({color:'var(--sidebar-foreground)'})}>
              <FaTableCells size={20} style={{ color: 'inherit' }} aria-hidden="true" />
              <span className="link-label">Tables</span>
            </NavLink>
          </li>

          {/* Notifications link removed per request; Topbar bell shows popover */}

          <li>
              <NavLink to="/admin/settings" className={({isActive}) => `flex items-center gap-4 px-4 py-2.5 rounded-[18px] ${isActive ? 'text-white' : 'hover:bg-white/5'}`} aria-label="Settings" style={({isActive}) => isActive ? ({
                  backgroundImage:'linear-gradient(to right, #FF9500, #FFB800)',
                  boxShadow:'0 10px 24px rgba(255,149,0,0.28)'
                }) : ({color:'var(--sidebar-foreground)'})}>
                <FiSettings size={20} style={{ color: 'inherit' }} aria-hidden="true" />
                <span className="link-label">Settings</span>
            </NavLink>
          </li>
        </ul>
      </nav>

      <div className="sidebar-foot">
        <button
          className="group w-full inline-flex items-center justify-center gap-3 h-12 rounded-2xl text-white font-semibold bg-gradient-to-r from-red-600 to-rose-500 shadow-[0_10px_24px_rgba(244,63,94,0.25)] hover:brightness-105 hover:shadow-[0_14px_32px_rgba(244,63,94,0.35)] transition-all duration-150 ease-out active:translate-y-px focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400/60"
          onClick={() => {
            try {
              localStorage.removeItem("bakery_app_auth");
              localStorage.removeItem("bakery_user_role");
            } catch (e) {
              console.warn("failed clearing auth", e);
            }
            navigate("/login", { replace: true });
          }}
          aria-label="Logout"
        >
          <IoIosLogOut size={20} className="w-5 h-5 opacity-95" aria-hidden="true" />
          <span className="link-label">Logout</span>
        </button>
      </div>
      </aside>
      {mobileOpen && <div className="sidebar-backdrop" onClick={()=>setMobileOpen(false)} aria-hidden />}
    </>
  );
}
