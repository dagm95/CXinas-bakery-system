import React from "react";
import { useNavigate } from "react-router-dom";
import { FiCalendar } from "react-icons/fi";

export default function Summary(){
  const navigate = useNavigate();
  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <header className="flex items-center gap-3 py-4">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700 shadow">
          <FiCalendar size={20} />
        </div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 flex-1">Report</h1>
        <button
          type="button"
          onClick={()=>navigate('/admin')}
          className="inline-flex items-center rounded-full text-white shadow"
          style={{
            background: 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)',
            padding: '10px 16px',
            fontWeight: 600,
            boxShadow: '0 10px 24px rgba(249,115,22,0.35)'
          }}
        >
          Back to Dashboard
        </button>
      </header>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="p-4 sm:p-6">
          <p className="text-sm text-slate-600">Quick access to your daily, weekly and monthly reports.</p>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Daily */}
            <button
              type="button"
              onClick={()=>navigate('/admin/summary/daily')}
              className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-sky-500 via-blue-500 to-indigo-500 text-left shadow hover:brightness-105 focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <div className="p-4 sm:p-5 text-white">
                <div className="flex items-center gap-3">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-white/20">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="18" rx="2"/>
                      <path d="M16 2v4M8 2v4M3 10h18"/>
                    </svg>
                  </div>
                  <div className="text-lg font-bold">Daily Report</div>
                </div>
                <div className="mt-4 text-2xl font-extrabold">—</div>
                <div className="mt-1 text-sm opacity-90">Today's revenue (sample)</div>
              </div>
            </button>

            {/* Weekly */}
            <button
              type="button"
              onClick={()=>navigate('/admin/summary/weekly')}
              className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 via-green-500 to-teal-500 text-left shadow hover:brightness-105 focus:outline-none focus:ring-2 focus:ring-emerald-400"
            >
              <div className="p-4 sm:p-5 text-white">
                <div className="flex items-center gap-3">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-white/20">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 3v18h18"/>
                      <path d="M7 14l3-3 4 4 5-7"/>
                    </svg>
                  </div>
                  <div className="text-lg font-bold">Weekly Report</div>
                </div>
                <div className="mt-4 text-2xl font-extrabold">—</div>
                <div className="mt-1 text-sm opacity-90">Last 7 days total (sample)</div>
              </div>
            </button>

            {/* Monthly */}
            <button
              type="button"
              onClick={()=>navigate('/admin/summary/monthly')}
              className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-500 via-amber-500 to-rose-500 text-left shadow hover:brightness-105 focus:outline-none focus:ring-2 focus:ring-orange-400"
            >
              <div className="p-4 sm:p-5 text-white">
                <div className="flex items-center gap-3">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-white/20">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 4h18v4H3z"/>
                      <path d="M3 12h18v8H3z"/>
                    </svg>
                  </div>
                  <div className="text-lg font-bold">Monthly Report</div>
                </div>
                <div className="mt-4 text-2xl font-extrabold">—</div>
                <div className="mt-1 text-sm opacity-90">Last 30 days total (sample)</div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
