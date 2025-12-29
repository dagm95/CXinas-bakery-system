import React, { useEffect, useRef } from "react";
import Chart from "chart.js/auto";

export default function ChartTopProducts({ products = [] }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    const labels = products.map(p => p.label);
    const data = products.map(p => Number((p.rev || 0).toFixed(2)));
    const ctx = canvasRef.current && canvasRef.current.getContext ? canvasRef.current.getContext("2d") : null;
    if (!ctx) return;

    if (chartRef.current) {
      try { chartRef.current.destroy(); } catch {}
      chartRef.current = null;
    }

    const colors = ['#3b82f6','#ef4444','#f59e0b','#10b981','#8b5cf6','#ec4899','#06b6d4','#f97316'];

    chartRef.current = new Chart(ctx, {
      type: "bar",
      data: {
        labels,
        datasets: [{
          label: "Revenue",
          data,
          backgroundColor: labels.map((_, i) => colors[i % colors.length])
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true } }
      }
    });

    return () => {
      try { chartRef.current && chartRef.current.destroy(); } catch {}
      chartRef.current = null;
    };
  }, [products]);

  return <canvas id="prodChart" ref={canvasRef} className="chart-canvas"></canvas>;
}
