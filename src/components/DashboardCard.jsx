import React from "react";

export default function DashboardCard({ title, desc, icon, color }) {
  return (
    <div className="dash-card" style={{ background: color }}>
      <div className="dash-icon">{icon}</div>
      <div className="dash-body">
        <div className="dash-title">{title}</div>
        <div className="dash-desc">{desc}</div>
      </div>
    </div>
  );
}
