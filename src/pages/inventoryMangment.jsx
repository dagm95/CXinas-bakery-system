import React, { useEffect, useState } from "react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { MdOutlineInventory2 } from "react-icons/md";
import { PRODUCTS } from "../data/products";
import normalizeInventoryData from "../utils/normalizeInventoryData";

// Helper to flatten PRODUCTS into a baked products list
function flattenProducts(productsObj) {
  let id = 1;
  return Object.entries(productsObj).flatMap(([category, items]) =>
    items.map((item) => ({
      productId: id++,
      productName: item.label, // Use full label, e.g., 'Dabo - 8.00'
      category,
      bakedQty: 0, // will be set by user or another source
      unitPrice: item.value,
    }))
  );
}

export default function Inventory() {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  // Baked products list from PRODUCTS
  const [bakedProducts, setBakedProducts] = useState([]);
  const [sales, setSales] = useState([]);
  const [comparison, setComparison] = useState([]);

  // Load baked products from PRODUCTS
  useEffect(() => {
    setBakedProducts(flattenProducts(PRODUCTS));
  }, []);

  // Load sales from localStorage for the selected date
  useEffect(() => {
    try {
      const raw = localStorage.getItem('bakery_app_v1');
      const store = raw ? JSON.parse(raw) : {};
      setSales(Array.isArray(store.sales) ? store.sales : []);
    } catch (e) {
      setSales([]);
    }
  }, [selectedDate]);

  // Aggregate sales by product for the selected date
  useEffect(() => {
    // Filter sales for the selected date
    const todayKey = selectedDate;
    const salesForDate = sales.filter(s => {
      const saleDate = (s.saleDate || s.timestamp || s.ts);
      if (!saleDate) return false;
      const key = new Date(saleDate).toISOString().slice(0,10);
      return key === todayKey;
    });

    // Build salesMap: key = category||productName||unitPrice
    const salesMap = {};
    bakedProducts.forEach(prod => {
      const key = prod.category + '||' + prod.productName + '||' + prod.unitPrice;
      salesMap[key] = 0;
    });
    salesForDate.forEach(s => {
      if (Array.isArray(s.items)) {
        s.items.forEach(it => {
          const unitPrice = it.price || it.value || 0;
          // Try to match by name and price (ignore category for matching)
          const matchedProduct = bakedProducts.find(p => {
            return (
              (p.productName === it.name || p.productName === it.label || (it.name && p.productName && it.name.includes(p.productName))) &&
              Number(p.unitPrice) === Number(unitPrice)
            );
          });
          let category = '';
          let name = '';
          if (matchedProduct) {
            category = matchedProduct.category;
            name = matchedProduct.productName;
          } else {
            name = it.name || it.label || '';
            category = it.category || '';
          }
          const key = category + '||' + name + '||' + unitPrice;
          if (salesMap[key] === undefined) salesMap[key] = 0;
          salesMap[key] += it.quantity || 1;
        });
      }
    });

    // Prepare comparison array for next step
    setComparison(bakedProducts.map(prod => {
      const key = prod.category + '||' + prod.productName + '||' + prod.unitPrice;
      return {
        ...prod,
        bakedQty: prod.bakedQty, // will be set in next step
        soldQty: salesMap[key] || 0,
        remainingQty: 0, // will be set in next step
        status: '', // will be set in next step
      };
    }));
  }, [sales, bakedProducts, selectedDate]);

  // Get bakedQty from production batches (inventory_sent_payloads)
  const [bakedQtyMap, setBakedQtyMap] = useState({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem('inventory_sent_payloads');
      const batches = raw ? JSON.parse(raw) : [];
      // Only consider batches for the selected date
      const summary = {};
      batches.forEach(batch => {
        const sentTime = batch?.timestamp || batch?.sentAt || batch?.time || null;
        if (!sentTime) return;
        const d = new Date(sentTime);
        const batchDate = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
        if (batchDate !== selectedDate) return;
        const products = batch.payload ? normalizeInventoryData([batch.payload]) : [];
        products.forEach(item => {
          const key = item.name + '||' + (item.price || item.value || 0);
          if (!summary[key]) summary[key] = 0;
          summary[key] += Number(item.amount) || 0;
        });
      });
      setBakedQtyMap(summary);
    } catch (e) {
      setBakedQtyMap({});
    }
  }, [selectedDate]);

  // Merge bakedQty, soldQty, compute remaining and status
  const mergedComparison = comparison.map(item => {
    const key = item.productName + '||' + item.unitPrice;
    const bakedQty = Number(bakedQtyMap[key] || 0);
    const soldQty = item.soldQty;
    const remainingQty = bakedQty - soldQty;
    let status = 'perfect';
    if (remainingQty > 0) status = 'remaining';
    if (remainingQty < 0) status = 'oversold';
    return {
      ...item,
      bakedQty,
      soldQty,
      remainingQty,
      status,
    };
  });

  const totalBaked = mergedComparison.reduce((sum, item) => sum + item.bakedQty, 0);
  const totalSold = mergedComparison.reduce((sum, item) => sum + item.soldQty, 0);
  const totalRemaining = mergedComparison.reduce((sum, item) => sum + item.remainingQty, 0);

  return (
    <>
      <div className="container mx-auto max-w-3xl py-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-6 mb-6">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br from-orange-400 to-amber-500 shadow-md flex items-center justify-center text-white text-3xl shrink-0">
              <MdOutlineInventory2 size={36} />
            </div>
            <h1 className="text-slate-900 text-2xl sm:text-3xl font-extrabold leading-tight truncate">Inventory/ report</h1>
          </div>
          <button
            className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-5 py-2 rounded-lg shadow transition-colors focus:outline-none focus:ring-2 focus:ring-orange-400"
            onClick={() => navigate('/admin')}
          >
            Back to Dashboard
          </button>
        </div>

        {/* Date Picker */}
        <div className="mb-6 flex items-center gap-4">
          <label htmlFor="date" className="font-medium text-slate-700">Select Date:</label>
          <input
            id="date"
            type="date"
            className="border border-slate-300 rounded px-3 py-1 focus:ring-2 focus:ring-orange-400"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
          />
        </div>

         {/* ...removed summary cards... */}

         {/* Comparison Table - Grouped by Category */}
         <div className="card">
           <h3 className="text-lg font-bold mb-4">Product Comparison</h3>
           <div className="overflow-x-auto">
             <table className="min-w-full border border-slate-200 text-sm">
               <thead className="bg-slate-100">
                 <tr>
                   <th className="px-3 py-2 border-b border-slate-200 text-left">Product Name</th>
                   <th className="px-3 py-2 border-b border-slate-200 text-center">Baked Qty</th>
                   <th className="px-3 py-2 border-b border-slate-200 text-center">Sold Qty</th>
                   <th className="px-3 py-2 border-b border-slate-200 text-center">Remaining</th>
                   <th className="px-3 py-2 border-b border-slate-200 text-center">Status</th>
                 </tr>
               </thead>
               <tbody>
                {mergedComparison.length === 0 && (
                  <tr><td colSpan={5} className="text-center text-slate-400 py-4">No data found for this date.</td></tr>
                )}
                {/* Group by category */}
                {Object.entries(
                  mergedComparison.reduce((acc, item) => {
                    if (!acc[item.category]) acc[item.category] = [];
                    acc[item.category].push(item);
                    return acc;
                  }, {})
                ).map(([category, items]) => [
                  <tr key={category} className="bg-zinc-200 sticky top-0 z-10">
                    <td colSpan={5} className="font-bold text-zinc-700 text-base py-2 pl-2 border-b border-slate-300">{category}</td>
                  </tr>,
                  ...items.map((item, idx) => {
                    const key = item.productName + '||' + item.unitPrice;
                    return (
                      <tr key={key} className={idx % 2 === 0 ? "bg-white" : "bg-zinc-50"}>
                        <td className="px-3 py-2 border-b border-slate-100">{item.productName}</td>
                        <td className="px-3 py-2 border-b border-slate-100 text-center">{item.bakedQty}</td>
                        <td className="px-3 py-2 border-b border-slate-100 text-center">{item.soldQty}</td>
                        <td className="px-3 py-2 border-b border-slate-100 text-center">{item.remainingQty}</td>
                        <td className="px-3 py-2 border-b border-slate-100 text-center">
                          <span className={
                            item.status === "perfect"
                              ? "inline-block px-2 py-1 rounded bg-green-100 text-green-700 text-xs font-semibold"
                              : item.status === "remaining"
                              ? "inline-block px-2 py-1 rounded bg-blue-100 text-blue-700 text-xs font-semibold"
                              : "inline-block px-2 py-1 rounded bg-red-100 text-red-700 text-xs font-semibold"
                          }>
                            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ])}
               </tbody>
             </table>
           </div>
         </div>
      </div>
    </>
  );
}
