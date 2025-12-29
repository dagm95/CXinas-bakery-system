import React, { useState } from "react";
function getProductSummaryTable(batches, selectedDate) {
  // Map: key = name + price, value = { name, price, totalAmount }
  const summary = {};
  batches.forEach(batch => {
    const sentTime = batch?.timestamp || batch?.sentAt || batch?.time || null;
    if (!sentTime) return;
    const d = new Date(sentTime);
    const batchDate = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    if (batchDate !== selectedDate) return;
    const products = batch.payload ? normalizeInventoryData([batch.payload]) : [];
    products.forEach(item => {
      const key = `${item.name}||${item.price}`;
      if (!summary[key]) {
        summary[key] = {
          name: item.name,
          price: item.price,
          totalAmount: 0
        };
      }
      summary[key].totalAmount += Number(item.amount) || 0;
    });
  });
  return Object.values(summary);
}


import useInventoryData from "../hooks/useInventoryData";
import normalizeInventoryData from "../utils/normalizeInventoryData";

export default function GroundManagerInventoryPage() {
    const [showSummary, setShowSummary] = useState(false);
  const { data, loading, error } = useInventoryData();
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedDate, setSelectedDate] = useState(() => {
    // Default to today
    const d = new Date();
    return d.toISOString().slice(0, 10);
  });

  // Each entry in data is a batch (cart sent at a time)
  // Filter out any entries that are not valid cart batches (should have payload with items or type 'cart')
  const batches = Array.isArray(data)
    ? data.filter(batch => {
        // Accept if payload is an array of items, or payload.type is 'cart' or 'grouped'
        if (!batch || typeof batch !== 'object') return false;
        if (batch.payload && (Array.isArray(batch.payload) || batch.payload.items || batch.payload.type === 'cart' || batch.payload.type === 'grouped')) return true;
        return false;
      })
    : [];

  if (loading) return <div className="flex justify-center items-center mt-16"><span className="animate-spin rounded-full h-8 w-8 border-4 border-orange-400 border-t-transparent"></span></div>;
  if (error) return <div className="bg-red-100 text-red-700 px-4 py-2 rounded mb-4 text-center">{error}</div>;

  return (
    <div className="max-w-3xl mx-auto my-8 bg-white rounded-2xl shadow-lg border border-slate-200">
      <div className="p-6">
        <h2 className="text-2xl font-bold mb-4 text-slate-800">Ground Manager Inventory</h2>
        <div className="flex flex-wrap gap-4 mb-6 items-end">
          <div>
            <label htmlFor="type-filter" className="block text-sm font-medium text-slate-700 mb-1">Type</label>
            <select
              id="type-filter"
              className="block w-32 rounded-md border border-slate-300 py-2 px-3 text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-400"
              value={filter}
              onChange={e => setFilter(e.target.value)}
            >
              <option value="all">All</option>
              <option value="baked">Baked</option>
              <option value="purchased">Purchased</option>
            </select>
          </div>
          <div>
            <label htmlFor="search" className="block text-sm font-medium text-slate-700 mb-1">Search</label>
            <input
              id="search"
              type="text"
              className="block w-48 rounded-md border border-slate-300 py-2 px-3 text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-400"
              placeholder="Search..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-end gap-2">
            <div>
              <label htmlFor="date-filter" className="block text-sm font-medium text-slate-700 mb-1">Select Date</label>
              <input
                id="date-filter"
                type="date"
                className="block rounded-md border border-slate-300 py-2 px-3 text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-400"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
              />
            </div>
            <button
              type="button"
              className="ml-2 px-4 py-2 rounded bg-orange-500 text-white font-semibold shadow hover:bg-orange-600 transition"
              onClick={() => setShowSummary(s => !s)}
            >
              {showSummary ? 'Hide Totals' : 'Show Totals'}
            </button>
          </div>
        </div>
        {showSummary && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-2 text-slate-700">Total Products for {selectedDate}</h3>
            <div className="overflow-x-auto rounded-lg border border-slate-200 bg-slate-50">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Product Name</th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Unit Price</th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Total Amount</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100">
                  {getProductSummaryTable(batches, selectedDate).map((row, idx) => (
                    <tr key={row.name + row.price}>
                      <td className="px-4 py-2 whitespace-nowrap text-slate-700">{row.name}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-right text-slate-700">{typeof row.price === 'number' ? `$${row.price.toFixed(2)}` : row.price}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-right text-slate-700">{row.totalAmount}</td>
                    </tr>
                  ))}
                  {getProductSummaryTable(batches, selectedDate).length === 0 && (
                    <tr><td colSpan={3} className="text-center text-slate-400 py-4">No products found for this date.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {!showSummary && batches.length === 0 && (
          <div className="text-center text-slate-400 my-12">No inventory batches found.</div>
        )}
        {!showSummary && batches.map((batch, batchIdx) => {
          // Try to get a timestamp or use index
          const sentTime = batch?.timestamp || batch?.sentAt || batch?.time || null;
          // Only show batches matching the selected date
          if (!sentTime) return null; // If no timestamp, don't show for any date
          const d = new Date(sentTime);
          const batchDate = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
          if (batchDate !== selectedDate) return null;
          // Normalize this batch's products (use payload)
          const products = batch.payload ? normalizeInventoryData([batch.payload]) : [];
          // Apply filter/search
          const filtered = products.filter(item => {
            const name = typeof item.name === 'string' ? item.name : '';
            return (filter === "all" || item.type === filter) &&
              name.toLowerCase().includes(search.toLowerCase());
          });
          if (filtered.length === 0) return null;
          return (
            <div key={batchIdx} className="mb-10">
              <div className="font-semibold text-lg text-slate-700 mb-2 flex items-center">
                Batch {batchIdx + 1}
                {sentTime && (
                  <span className="ml-3 text-sm font-normal text-slate-400">({new Date(sentTime).toLocaleString()})</span>
                )}
              </div>
              <div className="overflow-x-auto rounded-lg border border-slate-200 bg-slate-50">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">ID</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Name</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Type</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-100">
                    {filtered.map((item, idx) => (
                      <tr key={idx}>
                        <td className="px-4 py-2 whitespace-nowrap text-slate-700">{item.id ?? '-'}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-slate-700">{item.name}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-slate-700">{
                          item.type === 'baked' ? 'Baked'
                          : item.type === 'purchased' || item.type === 'buyed' ? 'Buyed'
                          : item.source === 'baked' ? 'Baked'
                          : item.source === 'purchased' || item.source === 'buyed' ? 'Buyed'
                          : '-'
                        }</td>
                        <td className="px-4 py-2 whitespace-nowrap text-right text-slate-700">{item.amount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
