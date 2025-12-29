import React, { useEffect, useRef } from "react";
import Chart from "chart.js/auto";

/**
 * ChartRevenue14Days
 * props:
 *  - sales: array of sale objects
 *  - days: number of days (default 14)
 */
export default function ChartRevenue14Days({ sales = [], days = 14 }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    // compute labels and day map
    const labels = [];
    const dayMap = {};
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      labels.push(new Date(key).toLocaleDateString());
      dayMap[key] = 0;
    }

    sales.forEach(s => {
      try {
        const key = (s.saleDate || s.timestamp || s.ts || "").toString().slice(0, 10);
        let rev = 0;
        if (Array.isArray(s.items) && s.items.length) {
          s.items.forEach(it => { rev += Number(it.subtotal || (it.price * it.quantity)) || 0; });
        } else {
          rev = Number(s.total || s.totalAmount || 0) || 0;
        }
        if (dayMap.hasOwnProperty(key)) dayMap[key] += rev;
      } catch (e) {}
    });

    const data = labels.map((_, idx) => {
      const d = new Date();
      d.setDate(d.getDate() - (labels.length - 1 - idx));
      const k = d.toISOString().slice(0, 10);
      return Number((dayMap[k] || 0).toFixed(2));
    });

    const ctx = canvasRef.current && canvasRef.current.getContext ? canvasRef.current.getContext("2d") : null;
    if (!ctx) return;
    if (chartRef.current) {
      try { chartRef.current.destroy(); } catch {}
      chartRef.current = null;
    }

    chartRef.current = new Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets: [{
          label: "Revenue",
          data,
          backgroundColor: "rgba(54,162,235,0.15)",
          borderColor: "rgba(54,162,235,1)",
          fill: true,
          tension: 0.25,
          pointBackgroundColor: "rgba(54,162,235,1)"
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { x: { ticks: { maxRotation: 0, autoSkip: true } }, y: { beginAtZero: true } }
      }
    });

    return () => {
      try { chartRef.current && chartRef.current.destroy(); } catch {}
      chartRef.current = null;
    };
  }, [sales, days]);

  return <canvas id="revChart" ref={canvasRef} className="chart-canvas"></canvas>;
}
