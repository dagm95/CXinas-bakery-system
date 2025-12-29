import React from "react";

export default function SummaryCard({ label, value }) {
  return (
    <div className="card summary-card">
      <h4 className="summary-label">{label}</h4>
      <div className="summary-value">{value}</div>
    </div>
  );
}
