import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import InventoryShell from './InventoryShell';

// Simple Ground Expense page for manager
// - List existing expenses (localStorage-backed)
// - Add new expense (description, amount, date)
// - Mark expenses as sent to admin (moves to "sent" state)
// - Tailwind CSS used with orange palette

export default function GroundExpenece() {
  try {
    const raw = sessionStorage.getItem('bakery_app_auth') || localStorage.getItem('bakery_app_auth');
    const role = sessionStorage.getItem('bakery_user_role') || localStorage.getItem('bakery_user_role');
    if (!raw) return <Navigate to={'/login?next=/gorundexpence'} replace />;
    if (!(role === 'admin' || role === 'manager')) return <Navigate to={'/login?next=/gorundexpence'} replace />;
  } catch (e) {
    return <Navigate to={'/login?next=/gorundexpence'} replace />;
  }

  const STORAGE_KEY = 'ground_expenses_v1';

  const [expenses, setExpenses] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch (e) {
      return [];
    }
  });

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [pieces, setPieces] = useState('');
  const [onePieceAmount, setOnePieceAmount] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
    } catch (e) {}
  }, [expenses]);

  const addExpense = () => {
    const a = parseFloat(amount);
    const p = parseInt(pieces, 10) || 0;
    const op = parseFloat(onePieceAmount);
    if (!description.trim() || Number.isNaN(a) || a <= 0) {
      alert('Please enter a valid description and amount > 0');
      return;
    }
    const e = {
      id: Date.now(),
      description: description.trim(),
      amount: +a.toFixed(2),
      pieces: p,
      onePieceAmount: (!Number.isNaN(op) && op > 0) ? +op.toFixed(2) : undefined,
      date: date || new Date().toISOString().slice(0, 10),
      status: 'pending',
    };
    setExpenses((p) => [e, ...p]);
    setDescription('');
    setAmount('');
    setPieces('');
    setOnePieceAmount('');
    setDate(new Date().toISOString().slice(0, 10));
  };


  // Send a single expense to InventoryExpense page (localStorage)
  const sendExpenseToInventory = async (exp) => {
    try {
      const key = 'inventory_sent_payloads';
      const existing = JSON.parse(localStorage.getItem(key) || '[]');
      existing.push({
        payload: {
          type: 'expense',
          description: exp.description,
          amount: exp.amount,
          pieces: exp.pieces,
          onePieceAmount: exp.onePieceAmount,
          date: exp.date,
        },
        timestamp: Date.now(),
        sentAt: new Date().toISOString(),
        status: 'sent'
      });
      localStorage.setItem(key, JSON.stringify(existing));
      setExpenses((p) => p.map(x => x.id === exp.id ? { ...x, status: 'sent' } : x));
      alert('Expense sent to Inventory Expense page');
    } catch (e) {
      alert('Failed to send expense');
    }
  };

  const removeExpense = (id) => {
    if (!confirm('Delete this expense?')) return;
    setExpenses((p) => p.filter(x => x.id !== id));
  };

  const sendAllPending = async () => {
    const pending = expenses.filter(e => e.status === 'pending');
    if (!pending.length) {
      alert('No pending expenses to send');
      return;
    }
    const payload = { type: 'expenses', items: pending };
    // try to send to backend; fallback to localStorage queue
    try {
      const res = await fetch('/api/expenses/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setExpenses((p) => p.map(x => x.status === 'pending' ? { ...x, status: 'sent' } : x));
        alert('Expenses sent to admin');
        return;
      }
    } catch (e) {
      // ignore
    }
    // fallback store to local queue
    try {
      const qk = 'expenses_send_queue';
      const q = JSON.parse(localStorage.getItem(qk) || '[]');
      q.push({ payload, timestamp: Date.now() });
      localStorage.setItem(qk, JSON.stringify(q));
      setExpenses((p) => p.map(x => x.status === 'pending' ? { ...x, status: 'queued' } : x));
      alert('Network failed — expenses queued locally');
    } catch (e) {
      alert('Failed to queue expenses');
    }
  };

  const visible = expenses.filter(e => filter === 'all' ? true : e.status === filter);

  return (
    <InventoryShell>
      <div className="p-0">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Ground <span className="text-orange-500">Expense</span></h2>
          <div className="flex items-center gap-2">
            <button onClick={sendAllPending} className="bg-orange-500 text-white px-3 py-1 rounded">Send Pending</button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-1 bg-white border rounded p-4">
            <h3 className="font-semibold mb-2">Expense</h3>
            <label className="block text-sm mb-1">Description</label>
            <input className="w-full px-2 py-1 border rounded mb-2" value={description} onChange={e => setDescription(e.target.value)} />
            <label className="block text-sm mb-1">Amount (Birr)</label>
            <input className="w-full px-2 py-1 border rounded mb-2" value={amount} onChange={e => setAmount(e.target.value)} type="number" min="0" step="0.01" />
            <label className="block text-sm mb-1">Pieces</label>
            <input className="w-full px-2 py-1 border rounded mb-2" value={pieces} onChange={e => setPieces(e.target.value)} type="number" min="0" step="1" />
            <label className="block text-sm mb-1">1-piece amount (optional)</label>
            <input className="w-full px-2 py-1 border rounded mb-2" value={onePieceAmount} onChange={e => setOnePieceAmount(e.target.value)} type="number" min="0" step="0.01" />
            <label className="block text-sm mb-1">Date</label>
            <input className="w-full px-2 py-1 border rounded mb-4" value={date} onChange={e => setDate(e.target.value)} type="date" />
            <button className="w-full bg-orange-500 text-white px-3 py-2 rounded" onClick={addExpense}>Add Expense</button>
          </div>

          <div className="md:col-span-2 bg-white border rounded p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <label className="text-sm">Filter:</label>
                <select value={filter} onChange={e => setFilter(e.target.value)} className="px-2 py-1 border rounded">
                  <option value="all">All</option>
                  <option value="pending">Pending</option>
                  <option value="sent">Sent</option>
                  <option value="queued">Queued</option>
                </select>
              </div>
              <div className="text-sm text-gray-600">Total: <span className="font-semibold">{visible.reduce((s, x) => s + x.amount, 0).toFixed(2)} Birr</span> • Pieces: <span className="font-semibold">{visible.reduce((s, x) => s + (x.pieces || 0), 0)}</span></div>
            </div>

            <div className="space-y-2 max-h-[58vh] overflow-y-auto">
              {visible.length === 0 && <div className="text-sm text-gray-500">No expenses</div>}
              {visible.map(exp => (
                <div key={exp.id} className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <div className="font-medium">{exp.description}</div>
                    <div className="text-xs text-gray-500">
                      {exp.date} • {exp.status} • {exp.pieces || 0} pcs
                      {exp.onePieceAmount ? <><span> • 1-pc: </span><span className="font-medium">{exp.onePieceAmount.toFixed(2)} Birr</span></> : null}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-orange-600">{exp.amount.toFixed(2)} Birr</div>
                    <div className="flex items-center gap-2 mt-2">
                      {exp.status !== 'sent' && <>
                        <button className="text-xs bg-green-600 text-white px-2 py-1 rounded" onClick={() => markSent(exp.id)}>Mark Sent</button>
                        <button className="text-xs bg-orange-500 text-white px-2 py-1 rounded" onClick={() => sendExpenseToInventory(exp)}>Send Expense</button>
                      </>}
                      <button className="text-xs text-red-600" onClick={() => removeExpense(exp.id)}>Delete</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </InventoryShell>
  );
}
