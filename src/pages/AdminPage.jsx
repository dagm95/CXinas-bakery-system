import React, { useEffect, useState } from "react";
import Dashboard from "./Dashboard";
import Reports from "./paymentTracker";
import DailySummary from "./DailySummary";
import Settings from "./Settings";
import Users from "./Users";
import Products from "./Products";

/**
 * AdminPage: top-level admin container
 * - controls which sub-page is visible (dashboard, reports, settings, etc.)
 * - preserves classNames so CSS stays identical
 */
export default function AdminPage() {
  const [current, setCurrent] = useState("dashboard");

  useEffect(() => {
    // Wire sidebar links (keeps appearance identical to previous UI where links exist in DOM)
    function handleClick(e) {
      const a = e.target.closest && e.target.closest("a[data-target]");
      if (!a) return;
      e.preventDefault();
      const tgt = a.dataset.target;
      if (tgt) setCurrent(tgt);
    }

    const nav = document.querySelector(".nav");
    if (nav) nav.addEventListener("click", handleClick);

    // allow opening/closing subnav
    function handleParentToggle(e) {
      const parent = e.target.closest && e.target.closest("a.parent");
      if (!parent) return;
      e.preventDefault();
      const li = parent.closest("li.has-children");
      if (li) li.classList.toggle("open");
    }
    if (nav) nav.addEventListener("click", handleParentToggle);

    return () => {
      if (nav) nav.removeEventListener("click", handleClick);
      if (nav) nav.removeEventListener("click", handleParentToggle);
    };
  }, []);

  return (
    <section className="content">
      <div id="contentArea">
        {current === "dashboard" && <Dashboard />}
        {current === "reports" && <Reports />}
        {current === "summary-daily" && <DailySummary />}
        {current === "settings" && <Settings />}
        {current === "users" && <Users />}
        {current === "products" && <Products />}
        {current === "summary-weekly" && <div className="card"><h3>Weekly Summary</h3><p className="muted">Weekly view — work in progress</p></div>}
        {current === "summary-monthly" && <div className="card"><h3>Monthly Summary</h3><p className="muted">Monthly view — work in progress</p></div>}
      </div>
    </section>
  );
}
