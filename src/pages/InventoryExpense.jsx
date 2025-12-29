import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

// Example: Read ground manager expenses from localStorage
function useGroundManagerExpenses() {
  return useMemo(() => {
    try {
      const key = 'inventory_sent_payloads';
      const all = JSON.parse(localStorage.getItem(key) || '[]');
      // Filter for expense type if needed, or just show all
      return all.filter(e => e.payload && e.payload.type === 'expense');
    } catch {
      return [];
    }
  }, []);
}

export default function InventoryExpense() {
  const navigate = useNavigate();
  const expenses = useGroundManagerExpenses();


  // Calendar state: YYYY-MM and YYYY-MM-DD
  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState(() => `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`);
  const [selectedDate, setSelectedDate] = useState("");

  // Filter expenses by selected date if set, otherwise by month
  const filtered = expenses.filter(exp => {
    if (!exp.payload?.date) return false;
    if (selectedDate) {
      return exp.payload.date.slice(0, 10) === selectedDate;
    }
    return exp.payload.date.slice(0, 7) === selectedMonth;
  });

  // Calculate totals for the month
  const totalAmount = filtered.reduce((sum, exp) => sum + (typeof exp.payload.amount === 'number' ? exp.payload.amount : 0), 0);
  const totalPieces = filtered.reduce((sum, exp) => sum + (typeof exp.payload.pieces === 'number' ? exp.payload.pieces : 0), 0);

  return (
    <>
      <div className="w-full flex items-center justify-between px-8 py-5 bg-slate-50" style={{boxShadow:'0 2px 8px #0001'}}>
        <div className="flex items-center gap-3">
          <img src="https://cdn-icons-png.flaticon.com/512/104/104882.png" alt="box" className="h-10 w-10" style={{filter:'drop-shadow(0 1px 2px #0001)'}} />
          <span className="text-2xl font-extrabold text-slate-900">Inventory <span className="font-bold text-slate-800"> Expence</span></span>
        </div>
        <button
          type="button"
          onClick={() => navigate('/admin/expenses')}
          className="rounded-full px-8 py-3 font-semibold text-lg text-white shadow"
          style={{
            background: 'linear-gradient(90deg, #ff9800 0%, #ff7300 100%)',
            boxShadow: '0 2px 8px #ff980033',
            transition: 'background 0.2s',
          }}
        >
          Back to Expenses
        </button>
      </div>
      <div className="max-w-3xl mx-auto my-8 bg-white rounded-2xl shadow-lg border border-slate-200">
        <div className="p-6">
          <div className="flex flex-wrap gap-4 mb-6 items-end">
            <div>
              <label htmlFor="month-picker" className="block text-sm font-medium text-slate-700 mb-1">Select Month</label>
              <input
                id="month-picker"
                type="month"
                className="block rounded-md border border-slate-300 py-2 px-3 text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-400"
                value={selectedMonth}
                onChange={e => {
                  setSelectedMonth(e.target.value);
                  setSelectedDate(""); // Clear date filter if month changes
                }}
                max={`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`}
              />
            </div>
            <div>
              <label htmlFor="date-picker" className="block text-sm font-medium text-slate-700 mb-1">Or Select Date</label>
              <input
                id="date-picker"
                type="date"
                className="block rounded-md border border-slate-300 py-2 px-3 text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-400"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                max={`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`}
              />
            </div>
            <div className="flex flex-col gap-2">
              <div className="bg-orange-100 text-orange-800 rounded-lg px-4 py-2 font-semibold text-lg">Total Amount: <span className="text-orange-600">${totalAmount.toFixed(2)}</span></div>
            </div>
          </div>
          <h3 className="text-lg font-semibold mb-2 text-slate-700">Inventory Expense Analysis</h3>
          {filtered.length === 0 ? (
            <p className="text-slate-400">No ground manager expenses found for this month.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 mt-4">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Date</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Description</th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Amount</th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Pieces</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100">
                  {filtered.map((exp, idx) => (
                    <tr key={idx}>
                      <td className="px-4 py-2 whitespace-nowrap text-slate-700">{exp.sentAt ? new Date(exp.sentAt).toLocaleString() : '-'}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-slate-700">{exp.payload.description || '-'}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-right text-slate-700">{typeof exp.payload.amount === 'number' ? `$${exp.payload.amount.toFixed(2)}` : '-'}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-right text-slate-700">{typeof exp.payload.pieces === 'number' ? exp.payload.pieces : '-'}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-slate-700">{exp.status === 'sent' ? <span className="text-green-600">Sent</span> : <span className="text-yellow-600">Queued</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
