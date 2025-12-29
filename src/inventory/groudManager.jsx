
import React, { useState, useMemo } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import InventoryShell from './InventoryShell';
import PRODUCTS from '../data/products';

import { MdInventory } from 'react-icons/md';
import { GiExpense } from 'react-icons/gi';
import { CiLogout } from 'react-icons/ci';


function ProductItem({ item, quantity, onQuantityChange, source, onSourceChange, onSendIndividual, onAddToCart }) {
	const subtotal = (quantity * item.price).toFixed(2);
	return (
		<div className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm border">
			<div className="flex flex-col">
				<div className="font-semibold text-sm">{item.name}</div>
				<div className="text-xs text-gray-500">{item.price.toFixed(2)} Birr</div>
			</div>
			<div className="flex items-center gap-3">
				<input
					className="w-14 px-1 py-0.5 border rounded text-xs"
					type="number"
					min="0"
					value={quantity}
					onChange={(e) => onQuantityChange(parseInt(e.target.value, 10) || 0)}
				/>
				<div className="font-medium text-xs">{subtotal} Birr</div>
				<select className="px-1 py-0.5 border rounded text-xs" value={source} onChange={(e) => onSourceChange(e.target.value)}>
					<option value="baked">Baked</option>
					<option value="buyed">Buyed</option>
				</select>
				   {/* Send button removed as requested */}
				<button className="bg-yellow-500 text-white px-2 py-0.5 rounded text-xs" onClick={() => onAddToCart && onAddToCart()}>
					Add
				</button>
			</div>
		</div>
	);
}

function InventoryManager() {
	const navigate = useNavigate();

	const handleLogout = () => {
		try {
			sessionStorage.removeItem('bakery_app_auth');
			sessionStorage.removeItem('bakery_user_role');
		} catch (e) {}
		try {
			localStorage.removeItem('bakery_app_auth_manager');
			localStorage.removeItem('bakery_presence_manager');
			localStorage.removeItem('bakery_app_auth_cashier');
			localStorage.removeItem('bakery_app_auth');
		} catch (e) {}
		navigate('/login', { replace: true });
	};

	// UI is provided by shared InventoryShell
	// Convert PRODUCTS (object) into array of categories { category, items: [{name, price}] }
	function loadProductsFromStorage() {
		try {
			const raw = localStorage.getItem('bakery_app_v1');
			const store = raw ? JSON.parse(raw) : {};
			const prods = store.products || PRODUCTS;
			return Object.keys(prods).map((cat) => ({
				category: cat,
				items: prods[cat].map((p) => ({ name: p.label || p.name, price: p.value || p.price }))
			}));
		} catch {
			return Object.keys(PRODUCTS).map((cat) => ({
				category: cat,
				items: PRODUCTS[cat].map((p) => ({ name: p.label || p.name, price: p.value || p.price }))
			}));
		}
	}

	const [categories, setCategories] = useState(() => loadProductsFromStorage());
		// Listen for sales-updated event to sync products from Sales page
		React.useEffect(() => {
			function handleSalesUpdated() {
				setCategories(loadProductsFromStorage());
			}
			window.addEventListener('sales-updated', handleSalesUpdated);
			return () => window.removeEventListener('sales-updated', handleSalesUpdated);
		}, []);
	const [quantities, setQuantities] = useState({});
	const [itemSources, setItemSources] = useState({});
	const [cart, setCart] = useState({});
	const [globalSource, setGlobalSource] = useState('baked');
	const [isSending, setIsSending] = useState(false);
	const [activeTab, setActiveTab] = useState(0);
	const [query, setQuery] = useState('');
	const [newProductName, setNewProductName] = useState('');
	const [newProductPrice, setNewProductPrice] = useState('');

	const handleQuantityChange = (catIdx, itemIdx, qty) => {
		setQuantities((prev) => ({ ...prev, [`${catIdx}-${itemIdx}`]: qty }));
	};

	const handleAddProduct = (categoryName, newProduct) => {
		setCategories((prev) => prev.map((c) => {
			if (c.category === categoryName) {
				return { ...c, items: [...c.items, { name: newProduct.name, price: newProduct.price }] };
			}
			return c;
		}));
	};

	const setItemSource = (catIdx, itemIdx, src) => {
		setItemSources((prev) => ({ ...prev, [`${catIdx}-${itemIdx}`]: src }));
	};

	async function sendToServer(payload) {
		setIsSending(true);
		let ok = false;
		try {
			const res = await fetch('http://localhost:3000/api/inventory/send', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			});
			if (res && res.ok) ok = true;
		} catch (e) {
			// If fetch fails, treat as failed
			ok = false;
		}
		// Always record payloads locally so admin (production) can review them.
		try {
			const key = 'inventory_sent_payloads';
			const existing = JSON.parse(localStorage.getItem(key) || '[]');
			existing.push({
				payload,
				timestamp: Date.now(),
				sentAt: new Date().toISOString(),
				status: ok ? 'sent' : 'queued'
			});
			localStorage.setItem(key, JSON.stringify(existing));
		} catch (e) {}
		setIsSending(false);
		return { ok };
	}

	const sendIndividual = async (catIdx, itemIdx, src) => {
		const qty = quantities[`${catIdx}-${itemIdx}`] || 0;
		if (!qty || qty <= 0) {
			alert('Quantity must be > 0 to send individual item');
			return;
		}
		const item = categories[catIdx] && categories[catIdx].items[itemIdx];
		if (!item) return;
		const payload = {
			type: 'individual',
			category: categories[catIdx].category,
			item: { name: item.name, price: item.price },
			quantity: qty,
			source: src || itemSources[`${catIdx}-${itemIdx}`] || globalSource,
			total: (qty * item.price),
		};
		await sendToServer(payload);
		// optionally clear this quantity after sending
		setQuantities((prev) => ({ ...prev, [`${catIdx}-${itemIdx}`]: 0 }));
	};

	const sendGrouped = async () => {
		// build groups
		const groups = categories.map((c, ci) => {
			const items = c.items.map((it, ii) => {
				const key = `${ci}-${ii}`;
				const qty = quantities[key] || 0;
				if (!qty) return null;
				return { name: it.name, price: it.price, quantity: qty, source: itemSources[key] || globalSource };
			}).filter(Boolean);
			return items.length ? { category: c.category, items } : null;
		}).filter(Boolean);
		if (!groups.length) {
			alert('No quantities to send');
			return;
		}
		const total = groups.reduce((s, g) => s + g.items.reduce((ss, it) => ss + it.price * it.quantity, 0), 0);
		const payload = { type: 'grouped', groups, total };
		await sendToServer(payload);
		// clear quantities after grouped send
		setQuantities({});
		// Force batch history refresh
		try {
			const raw = localStorage.getItem('inventory_sent_payloads');
			const arr = raw ? JSON.parse(raw) : [];
			const batches = arr.filter(h => h.payload?.type === 'grouped');
			setBatchHistory(batches.slice(-20).reverse());
		} catch {
			setBatchHistory([]);
		}
	};

	   const [pendingSends, setPendingSends] = useState([]);

	   // Clear pending sends after showing them for 2 seconds
	   React.useEffect(() => {
		   if (pendingSends.length > 0) {
			   const timer = setTimeout(() => setPendingSends([]), 2000);
			   return () => clearTimeout(timer);
		   }
	   }, [pendingSends]);

	const getCartItems = () => Object.entries(cart).map(([key, it]) => ({
		...it,
		key,
		type: it.type || (it.source === 'baked' ? 'baked' : (it.source === 'buyed' || it.source === 'purchased' ? 'purchased' : it.source))
	}));

	const addToCart = (key) => {
		const qty = quantities[key] || 0;
		if (!qty || qty <= 0) {
			alert('Set a quantity > 0 before adding to cart');
			return;
		}
		const [catIdx, itemIdx] = key.split('-').map((v) => parseInt(v, 10));
		const item = categories[catIdx] && categories[catIdx].items[itemIdx];
		if (!item) return;
		const src = itemSources[key] || globalSource;
		const entry = { category: categories[catIdx].category, name: item.name, price: item.price, quantity: qty, source: src, type: src === 'baked' ? 'baked' : (src === 'buyed' || src === 'purchased' ? 'purchased' : src) };
		setCart((prev) => ({ ...prev, [key]: entry }));
	};

	const [sendCartStatus, setSendCartStatus] = useState(null); // null | 'success' | 'failed'
	const sendCart = async () => {
		const items = getCartItems();
		if (!items.length) {
			alert('Cart is empty');
			return;
		}
		// Confirmation popup
		const confirmed = window.confirm('Are you sure you want to send the cart? This action cannot be undone.');
		if (!confirmed) return;
		const totalCart = items.reduce((s, it) => s + it.price * it.quantity, 0);
		const payload = { type: 'cart', items, total: totalCart };
		const id = Date.now();
		setPendingSends((p) => [...p, { id, status: 'sending', payload }] );
		await sendToServer(payload);
		// Check localStorage for the latest cart send
		let found = false;
		try {
			const raw = localStorage.getItem('inventory_sent_payloads');
			if (raw) {
				const arr = JSON.parse(raw);
				found = arr.some(h => h.payload && h.payload.type === 'cart' && JSON.stringify(h.payload.items) === JSON.stringify(items));
			}
		} catch {}
		setPendingSends((p) => p.map(ps => ps.id === id ? { ...ps, status: found ? 'sent' : 'failed' } : ps));
		if (found) {
			setCart({});
			setSendCartStatus('success');
		} else {
			setSendCartStatus('failed');
		}
		setTimeout(() => setSendCartStatus(null), 7000);
	};

	// --- History Box State (all send types) ---
	const [sendHistory, setSendHistory] = useState([]);
	React.useEffect(() => {
		try {
			const raw = localStorage.getItem('inventory_sent_payloads');
			const arr = raw ? JSON.parse(raw) : [];
			setSendHistory(arr.slice(-20).reverse()); // last 20, newest first
		} catch {
			setSendHistory([]);
		}
	}, [isSending, sendCartStatus, pendingSends]);

	const total = Object.entries(quantities).reduce((sum, [key, qty]) => {
		const [catIdx, itemIdx] = key.split('-').map((v) => parseInt(v, 10));
		const item = categories[catIdx] && categories[catIdx].items[itemIdx];
		if (!item) return sum;
		return sum + qty * item.price;
	}, 0).toFixed(2);

	return (
		<InventoryShell>
			<div className="space-y-3">
				<div className="mt-2">
					<input
						className="w-full px-3 py-2 border rounded"
						placeholder="Search products..."
						value={query}
						onChange={(e) => setQuery(e.target.value)}
					/>
				</div>

				<div className="flex gap-2 overflow-x-auto pb-2">
					{categories.map((c, i) => (
						<button
							key={c.category}
							className={`px-3 py-1 rounded whitespace-nowrap ${activeTab === i ? 'bg-orange-500 text-white' : 'bg-gray-100'}`}
							onClick={() => setActiveTab(i)}
						>
							{c.category}
						</button>
					))}
				</div>

				<div className="flex">
					<div className="w-1/2 pr-4">
						<div className="mt-3 space-y-2">
							{(() => {
								const qStr = (query || '').trim().toLowerCase();
								if (qStr) {
									const matches = [];
									categories.forEach((c, ci) => {
										c.items.forEach((it, ii) => {
											if (it.name.toLowerCase().includes(qStr)) matches.push({ it, ci, ii });
										});
									});
									return matches.map(({ it, ci, ii }) => (
										<ProductItem
											key={`${ci}-${ii}`}
											item={it}
											quantity={quantities[`${ci}-${ii}`] || 0}
											onQuantityChange={(q) => handleQuantityChange(ci, ii, q)}
											source={itemSources[`${ci}-${ii}`] || 'baked'}
											onSourceChange={(src) => setItemSource(ci, ii, src)}
											onSendIndividual={(src) => sendIndividual(ci, ii, src)}
											onAddToCart={() => addToCart(`${ci}-${ii}`)}
										/>
									));
								}
								const cat = categories[activeTab];
								return cat.items.map((item, originalIdx) => (
									<ProductItem
										key={`${activeTab}-${originalIdx}`}
										item={item}
										quantity={quantities[`${activeTab}-${originalIdx}`] || 0}
										onQuantityChange={(q) => handleQuantityChange(activeTab, originalIdx, q)}
										source={itemSources[`${activeTab}-${originalIdx}`] || 'baked'}
										onSourceChange={(src) => setItemSource(activeTab, originalIdx, src)}
										onSendIndividual={(src) => sendIndividual(activeTab, originalIdx, src)}
										onAddToCart={() => addToCart(`${activeTab}-${originalIdx}`)}
									/>
								));
							})()}
						</div>
					</div>

					<div className="w-1/2">
						<div className="bg-white border rounded-lg p-3">
							<div className="flex items-center justify-between mb-3 gap-2">
								<div className="font-semibold">Cart</div>
								<div className="flex gap-2">
									<button className="bg-orange-500 text-white px-3 py-1 rounded" onClick={sendCart} disabled={isSending}>Send Cart</button>
									<button className="bg-slate-300 text-slate-700 px-3 py-1 rounded hover:bg-slate-400" onClick={() => setCart({})} disabled={isSending || !getCartItems().length}>Clear Cart</button>
								</div>
							</div>
							{sendCartStatus === 'success' && (
								<div className="mb-2 text-green-600 font-semibold text-sm">Cart sent successfully!</div>
							)}
							{sendCartStatus === 'failed' && (
								<div className="mb-2 text-red-600 font-semibold text-sm">Failed to send cart.</div>
							)}

							<div className="space-y-2 max-h-96 overflow-y-auto">
								{getCartItems().map((it) => (
									<div key={it.key} className="flex items-center justify-between p-2 border rounded">
										<div>
											<div className="font-medium">{it.name} <span className="text-xs text-gray-500">x{it.quantity}</span></div>
											<div className="text-xs text-gray-500">{it.category} • {it.source}</div>
										</div>
										<div className="text-right">
											<div className="font-semibold">{(it.price * it.quantity).toFixed(2)} Birr</div>
											<button className="text-xs text-red-600" onClick={() => { const nc = { ...cart }; delete nc[it.key]; setCart(nc); }}>Remove</button>
										</div>
									</div>
								))}
								{!getCartItems().length && <div className="text-sm text-gray-500">Cart empty</div>}
							</div>

							<div className="mt-3">
								<div className="text-sm">Pending Sends:</div>
								<div className="space-y-1">
									{pendingSends.map(ps => (
										<div key={ps.id} className="text-xs text-gray-600">{ps.status} • {ps.payload.type} • {new Date(ps.id).toLocaleTimeString()}</div>
									))}
								</div>
							</div>

							{/* --- Send History Box --- */}
							<div className="mt-6">
								<div className="font-semibold mb-2 text-orange-700">Send History</div>
								<div className="max-h-60 overflow-y-auto text-xs divide-y divide-gray-300 border rounded bg-orange-50">
									{sendHistory.length === 0 && <div className="text-gray-400 p-2">No send data yet.</div>}
									{sendHistory.map((h, idx) => (
										<div key={h.timestamp || idx} className="p-2">
											<div className="flex justify-between items-center mb-1">
												<span className="font-bold capitalize">{h.payload?.type || 'unknown'}</span>
												<span className="text-gray-500">{h.sentAt ? new Date(h.sentAt).toLocaleString() : ''}</span>
												<span className={
													h.status === 'sent' ? 'text-green-600' :
													h.status === 'queued' ? 'text-orange-500' :
													h.status === 'failed' ? 'text-red-600' : 'text-gray-500'
												}>{h.status}</span>
											</div>
											{/* Show details for grouped, cart, or individual */}
											{h.payload?.type === 'grouped' && Array.isArray(h.payload.groups) && h.payload.groups.map((group, gidx) => (
												<div key={gidx} className="mb-2 ml-2">
													<div className="font-semibold text-gray-700">{group.category}</div>
													<ul className="ml-2 list-disc">
														{Array.isArray(group.items) && group.items.map((item, iidx) => (
															<li key={iidx} className="text-gray-700">
																{item.name} - {item.price} x {item.quantity} ({item.source})
															</li>
														))}
													</ul>
												</div>
											))}
											{h.payload?.type === 'cart' && Array.isArray(h.payload.items) && (
												<div className="mb-2 ml-2">
													<ul className="ml-2 list-disc">
														{h.payload.items.map((item, iidx) => (
															<li key={iidx} className="text-gray-700">
																{item.name} - {item.price} x {item.quantity} ({item.source})
															</li>
														))}
													</ul>
												</div>
											)}
											{h.payload?.type === 'individual' && h.payload.item && (
												<div className="mb-2 ml-2">
													<span className="text-gray-700">{h.payload.item.name} - {h.payload.item.price} x {h.payload.quantity} ({h.payload.source})</span>
												</div>
											)}
											{h.payload?.total !== undefined && (
												<div className="text-right text-xs text-gray-600 mt-1">Total: {h.payload.total}</div>
											)}
										</div>
									))}
								</div>
							</div>
							{/* --- End Send History Box --- */}
						</div>
					</div>
				</div>
			</div>
		</InventoryShell>
	);
}

export default function InventoryEntry() {
	try {
		const raw = sessionStorage.getItem('bakery_app_auth') || localStorage.getItem('bakery_app_auth');
		const role = sessionStorage.getItem('bakery_user_role') || localStorage.getItem('bakery_user_role');
		if (!raw) return <Navigate to={'/login?next=/inventory-manager'} replace />;
		// allow both admin and manager roles to access the standalone manager page
		if (role === 'admin' || role === 'manager') {
			return <InventoryManager />;
		}
		return <Navigate to={'/login?next=/inventory-manager'} replace />;
	} catch(e) {
		return <Navigate to={'/login?next=/inventory-manager'} replace />;
	}
}
