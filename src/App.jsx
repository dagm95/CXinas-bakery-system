import React from "react";
import { Routes, Route, Navigate, Outlet, useLocation } from "react-router-dom";
import Topbar from "./components/Topbar";
import Sidebar from "./components/Sidebar";
import DashboardRoute from "./pages/DashboardRoute";
import Sales from "./pages/sales";
import SalesTables from "./pages/SalesTables";
import Inventory from "./pages/inventoryMangment";
import InventoryEntry from "./inventory/groudManager";
import AdminExpense from "./pages/AdminExpense";
import InventoryExpense from "./pages/InventoryExpense";
import GroundExpenece from "./inventory/groundExpenece";
import Employees from "./pages/Employees";
import EmployeePayments from "./pages/EmployeePayments";
import Profits from "./pages/profits";
import Production from "./pages/production";
import Expenses from "./pages/expense";
import ExpensePayments from "./pages/ExpensePayments";
import Reports from "./pages/paymentTracker";
import Summary from "./pages/summary";
import Notifications from "./pages/notifications";
import SummaryDaily from "./pages/summary-daily";
import SummaryWeekly from "./pages/summary-weekly";
import SummaryMonthly from "./pages/summary-monthly";
import Users from "./pages/Users";
// import Products from "./pages/Products";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import Cashier from "./components/Cashier/Cashier";
import CashierEntry from "./components/Cashier/CashierEntry";

function AdminLayout(){
  // Basic auth guard: prefer per-tab sessionStorage, fall back to localStorage copies
  let auth = null;
  try { auth = sessionStorage.getItem('bakery_app_auth') || localStorage.getItem('bakery_app_auth'); } catch(e) { auth = localStorage.getItem('bakery_app_auth'); }
  if (!auth) {
    return <Navigate to="/login" replace />;
  }

  // Optional role guard (if your auth writes a bakery_user_role, prefer sessionStorage value)
  const role = (sessionStorage.getItem('bakery_user_role') || localStorage.getItem('bakery_user_role') || 'admin');
  // Allow cashier role to access only the /admin/cashier route; otherwise require admin
  const location = useLocation();
  const pathname = location.pathname || window.location.pathname;
  if (role !== "admin") {
    const allowedForCashier = role === 'cashier' && pathname.startsWith('/admin/cashier');
    if (!allowedForCashier) {
      return (
        <div style={{ padding: 24 }}>
          <h2>Access denied</h2>
          <p>Please sign in as admin to continue.</p>
        </div>
      );
    }
  }

  return (
    <div>
      <Topbar />
      <div className="layout">
        <Sidebar />
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default function App(){
  return (
    <Routes>
      <Route path="/gorundexpence" element={<GroundExpenece />} />
      <Route path="/dev/inventory-manager" element={<InventoryEntry />} />
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Navigate to="/admin" replace />} />
      <Route path="/cashier" element={<CashierEntry />} />
      <Route path="/inventory-manager" element={<InventoryEntry />} />
      <Route path="/admin/cashier" element={<CashierEntry />} />
      <Route path="/admin/*" element={<AdminLayout />}>
        <Route index element={<DashboardRoute />} />
        <Route path="sales" element={<Sales />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="inventory" element={<Inventory />} />
        <Route path="employees" element={<Employees />} />
        <Route path="employeePayments" element={<EmployeePayments />} />
        <Route path="profits" element={<Profits />} />
        <Route path="production" element={<Production />} />
        <Route path="expenses" element={<Expenses />} />
        <Route path="expemce" element={<AdminExpense />} />
        <Route path="inventoryexpence" element={<InventoryExpense />} />
        <Route path="expencePayments" element={<ExpensePayments />} />
        <Route path="reports" element={<Reports />} />
        <Route path="daily-summary" element={<Summary />} />
        <Route path="summary/daily" element={<SummaryDaily />} />
        <Route path="summary/weekly" element={<SummaryWeekly />} />
        <Route path="summary/monthly" element={<SummaryMonthly />} />
        <Route path="users" element={<Users />} />
        {/* <Route path="products" element={<Products />} /> */}
        <Route path="settings" element={<Settings />} />
        <Route path="sales-tables" element={<SalesTables />} />
      </Route>
    </Routes>
  );
}
