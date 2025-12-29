import React, { useEffect, useRef } from "react";
import Chart from "chart.js/auto";

export default function SampleChart({ id, labels = [], data = [], label = "Value" }) {
  const ref = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    const ctx = ref.current && ref.current.getContext ? ref.current.getContext("2d") : null;
    if (!ctx) return;
    if (chartRef.current) { try { chartRef.current.destroy(); } catch {} chartRef.current = null; }

    const colors = ['rgba(59,130,246,0.9)','rgba(16,185,129,0.9)','rgba(245,158,11,0.9)','rgba(239,68,68,0.9)'];
    const bg = labels.map((_,i)=> colors[i % colors.length]);

    chartRef.current = new Chart(ctx, {
      type: 'bar',
      data: { labels, datasets: [{ label, data, backgroundColor: bg, borderRadius: 6 }] },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: ctx => `${label ? label + ': ' : ''}${Number(ctx.raw).toFixed(2)} Birr` } }
        },
        scales: { y: { beginAtZero: true } }
      }
    });

    return () => { try { chartRef.current && chartRef.current.destroy(); } catch {} chartRef.current = null; };
  }, [labels, data, label]);

  return <canvas id={id} ref={ref} className="sample-chart" style={{width:"100%",height:"100%"}} />;
}
