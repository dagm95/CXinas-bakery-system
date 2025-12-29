import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MdInventory } from 'react-icons/md';
import { GiExpense } from 'react-icons/gi';
import { CiLogout } from 'react-icons/ci';

export default function InventoryShell({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const path = location.pathname || '';

  const handleLogout = () => {
    try { sessionStorage.removeItem('bakery_app_auth'); sessionStorage.removeItem('bakery_user_role'); } catch (e) {}
    try {
      localStorage.removeItem('bakery_app_auth_manager');
      localStorage.removeItem('bakery_presence_manager');
      localStorage.removeItem('bakery_app_auth_cashier');
      localStorage.removeItem('bakery_app_auth');
    } catch (e) {}
    navigate('/login', { replace: true });
  };

  return (
    <div className="p-4">
      <div className="flex items-center justify-between bg-white p-4 rounded shadow-sm mb-4">
        <div className="text-lg font-bold">Ground <span className="text-orange-500">Manager</span></div>
        <button className="bg-orange-500 text-white px-3 py-1 rounded flex items-center gap-2" onClick={handleLogout}>
          <CiLogout className="text-lg" />
          Logout
        </button>
      </div>

      <div className="flex gap-4">
        <aside className="w-48 bg-gradient-to-b from-[#071026] to-[#0f1724] text-white rounded-lg overflow-hidden">
          <div className="p-4 border-b border-white/10">
            <div className="text-sm font-semibold">BAR</div>
          </div>
          <nav className="flex flex-col p-3">
            {(() => {
              const isManager = path.includes('/inventory-manager') || path.includes('/froundmanager');
              const isExpense = path.includes('/gorundexpence') || path.includes('/groundexpence');
              return (
                <>
                  <button
                    className={`flex items-center gap-3 px-4 py-3 rounded-r-full shadow-md ${isManager ? 'bg-orange-600 text-white' : 'text-white hover:bg-white/5'}`}
                    onClick={() => navigate('/inventory-manager')}
                  >
                    <MdInventory className="text-xl" />
                    <span className="font-medium">Ground Management</span>
                  </button>
                  <button
                    className={`flex items-center gap-3 px-4 py-3 mt-2 rounded-r-full ${isExpense ? 'bg-orange-600 text-white' : 'text-white hover:bg-white/5'}`}
                    onClick={() => navigate('/gorundexpence')}
                  >
                    <GiExpense className="text-xl" />
                    <span className="font-medium">Ground Expense</span>
                  </button>
                </>
              );
            })()}
          </nav>
        </aside>

        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
