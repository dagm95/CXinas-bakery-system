import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaFileCsv } from "react-icons/fa6";
import { FaTableCellsLarge } from "react-icons/fa6";
import { format } from "date-fns";
// import PRODUCTS from "../data/products";

// Helper to generate a thumbnail (placeholder)
const getThumbnail = (category) => {
  // You can map category to a real image if available
  return `/image/${category.toLowerCase()}.jpg`;
};


function flattenProducts(products) {
  return Object.entries(products).flatMap(([category, items]) =>
    items.map((item, idx) => ({
      id: `TXN-${category.slice(0,2).toUpperCase()}-${idx+1}`,
      productName: item.label.split(" - ")[0],
      thumbnail: getThumbnail(category),
      category,
      quantity: 0, // will be set by sales aggregation
      unitPrice: item.value,
      total: function() { return this.quantity * this.unitPrice; },
      time: '', // will be set by sales aggregation if needed
      status: 'No Sale',
    }))
  );
}

function exportToCSV(data) {
  const headers = [
    "Transaction ID",
    "Product Name",
    "Category",
    "Quantity Sold",
    "Unit Price",
    "Total Revenue",
    "Time of Sale",
    "Status",
  ];
  const rows = data.map(row => [
    row.id,
    row.productName,
    row.category,
    row.quantity,
    row.unitPrice,
    row.total,
    row.time,
    row.status,
  ]);
  let csvContent = "data:text/csv;charset=utf-8," +
    [headers, ...rows].map(e => e.join(",")).join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `sales-table-${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}



function SalesTables() {
  const navigate = useNavigate();
  const [date, setDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [sales, setSales] = useState([]);
  const [products, setProducts] = useState({});
  const [, forceUpdate] = useState(0); // dummy state to force re-render


  // Load sales and products from localStorage
  const loadData = () => {
    try {
      const raw = localStorage.getItem('bakery_app_v1');
      const store = raw ? JSON.parse(raw) : {};
      setSales(Array.isArray(store.sales) ? store.sales : []);
      setProducts(store.products || {});
      forceUpdate(n => n + 1); // force re-render even if sales/products array is the same reference
    } catch (e) {
      setSales([]);
      setProducts({});
      forceUpdate(n => n + 1);
    }
  };

  useEffect(() => {
    loadData();
    // Listen for 'sales-updated' event for real-time updates
    const handler = () => loadData();
    window.addEventListener('sales-updated', handler);
    // Also listen for storage events (multi-tab)
    window.addEventListener('storage', handler);
    return () => {
      window.removeEventListener('sales-updated', handler);
      window.removeEventListener('storage', handler);
    };
    // eslint-disable-next-line
  }, []);

  // Filter sales for the selected date
  const todayKey = date;
  const salesForDate = sales.filter(s => {
    const saleDate = (s.saleDate || s.timestamp || s.ts);
    if (!saleDate) return false;
    const key = new Date(saleDate).toISOString().slice(0,10);
    return key === todayKey;
  });
  console.log('[SalesTables] sales:', sales);
  console.log('[SalesTables] salesForDate:', salesForDate);

  // Aggregate sales by product for the selected date
  // Key: category + productName + unitPrice
  const allProducts = flattenProducts(products);
  const salesMap = {};
  salesForDate.forEach((s, saleIdx) => {
    if (Array.isArray(s.items)) {
      s.items.forEach((it, itemIdx) => {
        // Try to find the matching product from allProducts by name and price
        const unitPrice = it.price || it.value || 0;
        // Try to match by name and price (ignore category for matching)
        const matchedProduct = allProducts.find(p => {
          // Allow for possible name differences (e.g., sales item name may include extra info)
          // Try exact match first, fallback to includes
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
          // fallback to sales item data
          name = it.name || it.label || '';
          category = it.category || '';
        }
        const key = category + '||' + name + '||' + unitPrice;
        if (!salesMap[key]) {
          salesMap[key] = {
            productName: name,
            category,
            unitPrice,
            quantity: 0,
            total: 0,
            status: 'Completed',
          };
        }
        salesMap[key].quantity += it.quantity || 1;
        salesMap[key].total += (it.quantity || 1) * unitPrice;
      });
    }
  });

  // Build a list of all products, merging with salesMap
  const mergedRows = allProducts.map(row => {
    const key = row.category + '||' + row.productName + '||' + row.unitPrice;
    const sales = salesMap[key];
    if (!sales) {
      console.log('[SalesTables] No match for product:', { key, row });
    }
    return {
      ...row,
      quantity: sales ? sales.quantity : 0,
      total: sales ? sales.total : 0,
      status: sales ? sales.status : 'No Sale',
    };
  });
  console.log('[SalesTables] mergedRows:', mergedRows);

  // Group by category
  const grouped = mergedRows.reduce((acc, row) => {
    if (!acc[row.category]) acc[row.category] = [];
    acc[row.category].push(row);
    return acc;
  }, {});
  const categories = Object.keys(grouped);

  return (
    <div className="p-4 md:p-8 bg-zinc-50 min-h-screen">
      <div className="flex items-center gap-3 mb-6">
          <FaTableCellsLarge className="text-black" size={28} style={{ filter: 'grayscale(1) contrast(2)' }} />
        <h1 className="text-2xl font-bold text-zinc-800">Tables</h1>
      </div>
      <div className="flex flex-row flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <label htmlFor="date" className="font-medium text-zinc-700">Select Date:</label>
          <input
            id="date"
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="border border-zinc-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-green-500"
          />
        </div>
        <div className="flex items-center gap-3 ml-auto">
          <button
            onClick={() => exportToCSV(mergedRows)}
            className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white font-semibold px-4 py-2 rounded shadow transition-all"
          >
            <FaFileCsv /> Export to CSV
          </button>
          <button
            onClick={() => navigate('/admin')}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-4 py-2 rounded shadow transition-all"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
      <div className="overflow-x-auto rounded-lg shadow bg-white">
        <table className="min-w-full text-xs md:text-sm table-auto border-separate border-spacing-0">
          <thead className="sticky top-0 bg-zinc-100 z-10">
            <tr>
              <th className="px-3 py-2 font-bold text-zinc-700 text-left border-b border-r border-zinc-300">ID</th>
              <th className="px-3 py-2 font-bold text-zinc-700 text-left border-b border-r border-zinc-300">Product Name</th>
              <th className="px-3 py-2 font-bold text-zinc-700 text-left border-b border-r border-zinc-300">Category</th>
              <th className="px-3 py-2 font-bold text-zinc-700 text-right border-b border-r border-zinc-300">Quantity Sold</th>
              <th className="px-3 py-2 font-bold text-zinc-700 text-right border-b border-r border-zinc-300">Unit Price</th>
              <th className="px-3 py-2 font-bold text-green-600 text-right border-b border-r border-zinc-300">Total Revenue</th>
              <th className="px-3 py-2 font-bold text-zinc-700 text-left border-b border-r border-zinc-300">Time of Sale</th>
              <th className="px-3 py-2 font-bold text-zinc-700 text-left border-b border-zinc-300">Status</th>
            </tr>
          </thead>
          <tbody>
            {categories.map(category => (
              <React.Fragment key={category}>
                <tr className="sticky top-0 z-20 bg-zinc-200">
                  <td colSpan={8} className="font-bold text-zinc-700 text-base py-2 pl-2 border-b border-zinc-300">
                    {category}
                  </td>
                </tr>
                {grouped[category].map((row, idx) => {
                  // Short product ID: first 2 letters of name + last 2 digits of price
                  const productId = (row.productName?.slice(0,2).toUpperCase() + (row.unitPrice ? '-' + String(row.unitPrice).replace(/\D/g,'').slice(-2) : ''));
                  return (
                    <tr
                      key={productId + '-' + idx}
                      className={`transition-colors ${idx % 2 === 0 ? "bg-white" : "bg-zinc-50"} hover:bg-green-50 border-b border-zinc-200`}
                    >
                      <td className="px-3 py-2 whitespace-nowrap border-r border-zinc-200">{productId}</td>
                      <td className="px-3 py-2 border-r border-zinc-200">{row.productName}</td>
                      <td className="px-3 py-2 border-r border-zinc-200">{row.category}</td>
                      <td className="px-3 py-2 text-right border-r border-zinc-200">{row.quantity}</td>
                      <td className="px-3 py-2 text-right border-r border-zinc-200">${row.unitPrice.toFixed(2)}</td>
                      <td className="px-3 py-2 text-right font-bold text-green-600 border-r border-zinc-200">${row.total.toFixed(2)}</td>
                      <td className="px-3 py-2 border-r border-zinc-200">{row.time}</td>
                      <td className="px-3 py-2"> 
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${row.status === "Completed" ? "bg-green-100 text-green-700" : "bg-zinc-200 text-zinc-700"}`}>
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </React.Fragment>
            ))}
            {categories.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center text-zinc-400 py-8">No products found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default SalesTables;
