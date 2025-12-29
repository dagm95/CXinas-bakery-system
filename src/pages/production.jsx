
import React from "react";
import GroundManagerInventoryPage from "./GroundManagerInventoryPage";
import { useNavigate } from "react-router-dom";
import { FiPackage } from "react-icons/fi";

export default function Production() {
	const navigate = useNavigate();
	return (
		<div className="px-4 sm:px-6 lg:px-8">
			<header className="flex items-center gap-3 py-4">
				<div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700 shadow">
					<FiPackage size={20} />
				</div>
				<h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 flex-1">Production Inventory</h1>
				<button
					type="button"
					onClick={() => navigate('/admin')}
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
					<GroundManagerInventoryPage />
				</div>
			</div>
		</div>
	);
}
