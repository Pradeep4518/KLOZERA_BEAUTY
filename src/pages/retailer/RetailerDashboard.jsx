import React, { useState, useMemo } from 'react';
import {
  Download, Search, Plus, Edit3, Trash2, AlertTriangle, Package, Users, BarChart3, Database, LogOut, X
} from 'lucide-react';
import { getProductIllustration } from '../../lib/portraits';
import { useKLOZEVA, computeInventoryRecommendations } from '../../lib/KLOZEVAContext';

export const RetailerDashboard = ({ onLogout, initialTab = 'overview' }) => {
  const {
    db,
    updateStock,
    addProduct,
    updateProduct,
    deleteProduct,
    setLowStockThreshold,
    recordPurchase,
    showToast
  } = useKLOZEVA();

  const [tab, setTab] = useState(initialTab); // 'overview' | 'inventory' | 'crm' | 'schema'
  const [invSearch, setInvSearch] = useState('');
  const [invBrandFilter, setInvBrandFilter] = useState('All');
  const [invCategoryFilter, setInvCategoryFilter] = useState('All');
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  const [crmSearch, setCrmSearch] = useState('');
  const [selectedCustomer360, setSelectedCustomer360] = useState(null);
  const [purchaseProductInput, setPurchaseProductInput] = useState('');
  const [purchasePriceInput, setPurchasePriceInput] = useState('');

  const [schemaTable, setSchemaTable] = useState('products');

  // Product Add/Edit Form State
  const [prodForm, setProdForm] = useState({
    brandName: 'MAYBELLINE',
    name: '',
    category: 'Foundation',
    shadeName: '',
    shadeNumber: '',
    hexColor: '#C9936B',
    undertoneCompatibility: ['Warm', 'Neutral'],
    skinTypeCompatibility: ['Combination', 'Oily'],
    priceInr: 599,
    quantity: 12,
    aisleLocation: 'Aisle B2 • Shelf 1',
    description: ''
  });

  // Executive KPIs
  const kpis = useMemo(() => {
    const totalCustomers = db.customers.length;
    const totalProducts = db.products.length;
    const productsInStock = db.inventory.filter((i) => i.quantity > 0).length;
    const lowStockItems = db.products.filter((p) => {
      const inv = db.inventory.find((i) => i.productId === p.id);
      return (inv?.quantity ?? 0) <= db.lowStockThreshold;
    });
    const todayScans = db.beauty_analyses.filter((a) => a.createdAt.startsWith('2026-11-12')).length;
    return { totalCustomers, totalProducts, productsInStock, lowStockItems, todayScans };
  }, [db]);

  // Analytics Distributions
  const analyticsData = useMemo(() => {
    const toneCounts = {};
    const undertoneCounts = {};
    db.beauty_analyses.forEach((a) => {
      toneCounts[a.skinTone] = (toneCounts[a.skinTone] || 0) + 1;
      undertoneCounts[a.undertone] = (undertoneCounts[a.undertone] || 0) + 1;
    });

    const brandStats = db.brands.map((b) => {
      const brandProds = db.products.filter((p) => p.brandName === b.name);
      const recCount = db.recommendations.filter((r) =>
        brandProds.some((bp) => bp.id === r.productId)
      ).length;
      const totalUnits = brandProds.reduce((acc, p) => {
        const inv = db.inventory.find((i) => i.productId === p.id);
        return acc + (inv?.quantity || 0);
      }, 0);
      return { brand: b.name, productsCount: brandProds.length, recCount, totalUnits };
    });

    const topProducts = db.products
      .map((p) => {
        const count = db.recommendations.filter((r) => r.productId === p.id).length;
        return { ...p, recCount: count };
      })
      .sort((a, b) => b.recCount - a.recCount)
      .slice(0, 5);

    return { toneCounts, undertoneCounts, brandStats, topProducts };
  }, [db]);

  // Filtered Inventory
  const filteredInventory = useMemo(() => {
    return db.products.filter((p) => {
      const matchesBrand = invBrandFilter === 'All' || p.brandName === invBrandFilter;
      const matchesCategory = invCategoryFilter === 'All' || p.category === invCategoryFilter;
      const q = invSearch.toLowerCase();
      const shades = db.product_shades.filter((s) => s.productId === p.id);
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.brandName.toLowerCase().includes(q) ||
        shades.some((s) => s.shadeName.toLowerCase().includes(q) || s.shadeNumber.toLowerCase().includes(q));
      return matchesBrand && matchesCategory && matchesSearch;
    });
  }, [db, invBrandFilter, invCategoryFilter, invSearch]);

  // Filtered CRM Customers
  const filteredCustomers = useMemo(() => {
    const q = crmSearch.toLowerCase();
    return db.customers.filter((c) => {
      const latestAnalysis = db.beauty_analyses.find((a) => a.customerId === c.id);
      return (
        !q ||
        c.fullName.toLowerCase().includes(q) ||
        c.mobile.includes(q) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        (latestAnalysis && latestAnalysis.skinTone.toLowerCase().includes(q))
      );
    });
  }, [db, crmSearch]);

  const openAddProductModal = () => {
    setEditingProduct(null);
    setProdForm({
      brandName: 'MAYBELLINE',
      name: '',
      category: 'Foundation',
      shadeName: 'Warm Honey',
      shadeNumber: '220',
      hexColor: '#C9936B',
      undertoneCompatibility: ['Warm', 'Neutral'],
      skinTypeCompatibility: ['Combination', 'Oily'],
      priceInr: 599,
      quantity: 15,
      aisleLocation: 'Aisle B2 • Shelf 1',
      description: 'Long-wear breathable formula tailored for Indian skin tones.'
    });
    setProductModalOpen(true);
  };

  const openEditProductModal = (product) => {
    const inv = db.inventory.find((i) => i.productId === product.id);
    const shade = db.product_shades.find((s) => s.productId === product.id);
    setEditingProduct(product);
    setProdForm({
      brandName: product.brandName,
      name: product.name,
      category: product.category,
      shadeName: shade?.shadeName || 'Natural Buff',
      shadeNumber: shade?.shadeNumber || '01',
      hexColor: shade?.hexColor || '#C9936B',
      undertoneCompatibility: product.undertoneCompatibility || ['Warm'],
      skinTypeCompatibility: product.skinTypeCompatibility || ['Combination'],
      priceInr: product.priceInr,
      quantity: inv?.quantity ?? 10,
      aisleLocation: product.aisleLocation || 'Aisle A1',
      description: product.description
    });
    setProductModalOpen(true);
  };

  const handleSaveProduct = (e) => {
    e.preventDefault();
    if (!prodForm.name.trim()) return;
    if (editingProduct) {
      updateProduct(editingProduct.id, prodForm);
      showToast(`Updated ${prodForm.name}`);
    } else {
      addProduct(prodForm);
      showToast(`Added ${prodForm.name} to live store inventory`);
    }
    setProductModalOpen(false);
  };

  const toggleMultiSelect = (field, value) => {
    setProdForm((prev) => {
      const exists = prev[field].includes(value);
      const updated = exists ? prev[field].filter((v) => v !== value) : [...prev[field], value];
      return { ...prev, [field]: updated.length ? updated : [value] };
    });
  };

  const handleExportCsv = () => {
    const headers = ['Customer ID', 'Full Name', 'Mobile', 'Email', 'Age', 'Gender', 'Registered Date', 'Last Visit', 'Skin Tone', 'Undertone', 'Skin Type', 'Purchases Count'];
    const rows = db.customers.map((c) => {
      const ana = db.beauty_analyses.find((a) => a.customerId === c.id);
      return [
        c.id,
        `"${c.fullName}"`,
        c.mobile,
        c.email || '',
        c.age,
        c.gender,
        c.registeredAt,
        c.lastVisit,
        ana?.skinTone || 'N/A',
        ana?.undertone || 'N/A',
        ana?.skinType || 'N/A',
        c.purchases?.length || 0
      ].join(',');
    });
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `KLOZEVA_CRM_Export_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Exported CRM customer database as CSV');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Retailer Header */}
      <div className="bg-white rounded-3xl border border-[#E8C5C1]/70 p-6 sm:p-8 shadow-sm mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-[#B8860B]">
              <span>KLOZEVA RETAIL INTELLIGENCE</span>
              <span>•</span>
              <span>STORE #01 JUBILEE HILLS</span>
            </div>
            <h1 className="text-3xl font-semibold text-[#221F1F] mt-1" style={{ fontFamily: "'Playfair Display', serif" }}>
              Store Operations & CRM Command
            </h1>
          </div>

          <button
            onClick={onLogout}
            className="self-start lg:self-auto inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E8C5C1] text-xs font-semibold text-[#221F1F] hover:bg-[#F0E6D8] cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>

        {/* Portal Navigation Tabs */}
        <div className="flex flex-wrap gap-2 mt-6 pt-6 border-t border-[#E8C5C1]/60">
          {[
            { id: 'overview', label: 'Executive Analytics', icon: BarChart3 },
            { id: 'inventory', label: `Inventory & Stock (${db.products.length})`, icon: Package },
            { id: 'crm', label: `Customer CRM (${db.customers.length})`, icon: Users },
            { id: 'schema', label: '9-Table DB Inspector', icon: Database }
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setTab(item.id)}
                className={`inline-flex items-center gap-2 px-5 py-3 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer ${
                  tab === item.id
                    ? 'bg-[#221F1F] text-[#FAF7F2] shadow-md'
                    : 'bg-[#FAF7F2] text-[#6E6563] hover:text-[#221F1F]'
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB 1: EXECUTIVE OVERVIEW & ANALYTICS */}
      {tab === 'overview' && (
        <div className="space-y-8">
          {/* 5 KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white rounded-3xl border border-[#E8C5C1]/70 p-5">
              <div className="text-xs font-semibold text-[#6E6563]">Total Customers</div>
              <div className="text-3xl font-bold text-[#221F1F] mt-2" style={{ fontFamily: "'Playfair Display', serif" }}>
                {kpis.totalCustomers}
              </div>
              <div className="text-[11px] text-emerald-700 font-medium mt-1">+24% vs last week</div>
            </div>

            <div className="bg-white rounded-3xl border border-[#E8C5C1]/70 p-5">
              <div className="text-xs font-semibold text-[#6E6563]">Total Catalog SKUs</div>
              <div className="text-3xl font-bold text-[#221F1F] mt-2" style={{ fontFamily: "'Playfair Display', serif" }}>
                {kpis.totalProducts}
              </div>
              <div className="text-[11px] text-[#6E6563] mt-1">Across 5 beauty brands</div>
            </div>

            <div className="bg-white rounded-3xl border border-[#E8C5C1]/70 p-5">
              <div className="text-xs font-semibold text-[#6E6563]">Products in Stock</div>
              <div className="text-3xl font-bold text-[#221F1F] mt-2" style={{ fontFamily: "'Playfair Display', serif" }}>
                {kpis.productsInStock}
              </div>
              <div className="text-[11px] text-emerald-700 font-medium mt-1">100% kiosk sync active</div>
            </div>

            <div className="bg-white rounded-3xl border border-[#E8C5C1]/70 p-5">
              <div className="text-xs font-semibold text-[#6E6563]">Low Stock Alerts</div>
              <div className="text-3xl font-bold text-amber-700 mt-2" style={{ fontFamily: "'Playfair Display', serif" }}>
                {kpis.lowStockItems.length}
              </div>
              <div className="text-[11px] text-[#6E6563] mt-1">Threshold: ≤ {db.lowStockThreshold} units</div>
            </div>

            <div className="bg-white rounded-3xl border border-[#E8C5C1]/70 p-5 col-span-2 lg:col-span-1">
              <div className="text-xs font-semibold text-[#6E6563]">Today’s Kiosk Scans</div>
              <div className="text-3xl font-bold text-[#221F1F] mt-2" style={{ fontFamily: "'Playfair Display', serif" }}>
                {kpis.todayScans}
              </div>
              <div className="text-[11px] text-[#B8860B] font-medium mt-1">Avg match score: 95.2%</div>
            </div>
          </div>

          {/* Analytics Visual Charts Row */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Skin Tone & Undertone Distribution */}
            <div className="bg-white rounded-3xl border border-[#E8C5C1]/70 p-6 sm:p-8">
              <h3 className="text-xl font-semibold text-[#221F1F] mb-1" style={{ fontFamily: "'Playfair Display', serif" }}>
                Customer Skin Tone & Undertone Insights
              </h3>
              <p className="text-xs text-[#6E6563] mb-6">
                Aggregated biometric breakdown guiding store inventory procurement
              </p>

              <div className="space-y-4">
                {Object.entries(analyticsData.toneCounts).map(([tone, count]) => {
                  const pct = Math.round((count / Math.max(1, db.beauty_analyses.length)) * 100);
                  return (
                    <div key={tone}>
                      <div className="flex justify-between text-xs font-semibold mb-1">
                        <span>{tone} Complexion</span>
                        <span>{count} guests ({pct}%)</span>
                      </div>
                      <div className="w-full h-3 rounded-full bg-[#FAF7F2] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#D8A7A3] to-[#221F1F]"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 pt-5 border-t border-[#E8C5C1]/60 flex flex-wrap gap-2">
                {Object.entries(analyticsData.undertoneCounts).map(([ut, cnt]) => (
                  <span key={ut} className="px-3 py-1.5 rounded-xl bg-[#FAF7F2] border border-[#E8C5C1] text-xs font-semibold">
                    {ut} Undertone: <strong>{cnt}</strong>
                  </span>
                ))}
              </div>
            </div>

            {/* Best Performing Brands */}
            <div className="bg-white rounded-3xl border border-[#E8C5C1]/70 p-6 sm:p-8">
              <h3 className="text-xl font-semibold text-[#221F1F] mb-1" style={{ fontFamily: "'Playfair Display', serif" }}>
                Brand Stock & AI Recommendation Velocity
              </h3>
              <p className="text-xs text-[#6E6563] mb-6">
                Active stock depth and kiosk recommendation volume per brand
              </p>

              <div className="space-y-4">
                {analyticsData.brandStats.map((b) => {
                  const barWidth = Math.min(100, Math.max(18, b.totalUnits * 1.4));
                  return (
                    <div key={b.brand} className="p-3.5 rounded-2xl bg-[#FAF7F2] border border-[#E8C5C1]/60">
                      <div className="flex items-center justify-between text-xs font-bold text-[#221F1F] mb-2">
                        <span>{b.brand}</span>
                        <span>{b.totalUnits} units in store • {b.productsCount} SKUs</span>
                      </div>
                      <div className="w-full h-2.5 rounded-full bg-white overflow-hidden">
                        <div className="h-full rounded-full bg-[#B8860B]" style={{ width: `${barWidth}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Most Recommended Products Leaderboard */}
          <div className="bg-white rounded-3xl border border-[#E8C5C1]/70 p-6 sm:p-8">
            <h3 className="text-xl font-semibold text-[#221F1F] mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
              Most Recommended Store Products
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[#E8C5C1] text-xs uppercase text-[#6E6563]">
                    <th className="py-3 pr-4">Product</th>
                    <th className="py-3 px-4">Brand</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Price</th>
                    <th className="py-3 pl-4 text-right">Stock Level</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8C5C1]/40">
                  {analyticsData.topProducts.map((p) => {
                    const inv = db.inventory.find((i) => i.productId === p.id);
                    return (
                      <tr key={p.id}>
                        <td className="py-3.5 pr-4 font-semibold text-[#221F1F]">{p.name}</td>
                        <td className="py-3.5 px-4 text-xs font-bold">{p.brandName}</td>
                        <td className="py-3.5 px-4 text-xs text-[#6E6563]">{p.category}</td>
                        <td className="py-3.5 px-4 font-semibold">₹{p.priceInr}</td>
                        <td className="py-3.5 pl-4 text-right font-semibold">{inv?.quantity ?? 0} units</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: INVENTORY MANAGEMENT */}
      {tab === 'inventory' && (
        <div className="space-y-6">
          {/* Low Stock Alert Banner */}
          {kpis.lowStockItems.length > 0 && (
            <div className="p-5 rounded-2xl bg-amber-50 border border-amber-300 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-bold text-amber-900">
                    Low Stock Alert: {kpis.lowStockItems.length} product(s) at or below {db.lowStockThreshold} units
                  </div>
                  <div className="text-xs text-amber-800 mt-0.5">
                    {kpis.lowStockItems.map((p) => p.name).join(' • ')}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="font-semibold text-amber-900">Alert Threshold:</span>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={db.lowStockThreshold}
                  onChange={(e) => setLowStockThreshold(Math.max(1, Number(e.target.value)))}
                  className="w-16 px-2.5 py-1.5 rounded-lg bg-white border border-amber-300 font-bold text-center"
                />
              </div>
            </div>
          )}

          {/* Search, Filters & Add Button */}
          <div className="bg-white rounded-3xl border border-[#E8C5C1]/70 p-6">
            <div className="flex flex-col lg:flex-row gap-4 justify-between mb-6">
              <div className="flex flex-wrap gap-3 flex-1">
                <div className="relative flex-1 min-w-[220px]">
                  <Search className="w-4 h-4 text-[#6E6563] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={invSearch}
                    onChange={(e) => setInvSearch(e.target.value)}
                    placeholder="Search product, brand, or shade..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E8C5C1] text-sm"
                  />
                </div>

                <select
                  value={invBrandFilter}
                  onChange={(e) => setInvBrandFilter(e.target.value)}
                  className="px-4 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E8C5C1] text-xs font-semibold"
                >
                  <option value="All">All Brands</option>
                  {db.brands.map((b) => (
                    <option key={b.id} value={b.name}>{b.name}</option>
                  ))}
                </select>

                <select
                  value={invCategoryFilter}
                  onChange={(e) => setInvCategoryFilter(e.target.value)}
                  className="px-4 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E8C5C1] text-xs font-semibold"
                >
                  <option value="All">All Categories</option>
                  <option value="Foundation">Foundation</option>
                  <option value="Concealer">Concealer</option>
                  <option value="Lipstick">Lipstick</option>
                  <option value="Skincare">Skincare</option>
                </select>
              </div>

              <button
                onClick={openAddProductModal}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#221F1F] text-[#FAF7F2] text-xs font-semibold hover:bg-[#383333] cursor-pointer"
              >
                <Plus className="w-4 h-4 text-[#E8C5C1]" />
                Add New Product
              </button>
            </div>

            {/* Inventory Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[#E8C5C1] text-xs uppercase text-[#6E6563]">
                    <th className="py-3 pr-4">Product & Primary Shade</th>
                    <th className="py-3 px-3">Brand</th>
                    <th className="py-3 px-3">Category</th>
                    <th className="py-3 px-3">Compatibility</th>
                    <th className="py-3 px-3">Price</th>
                    <th className="py-3 px-3">Stock Control</th>
                    <th className="py-3 pl-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8C5C1]/50">
                  {filteredInventory.map((product) => {
                    const inv = db.inventory.find((i) => i.productId === product.id);
                    const qty = inv?.quantity ?? 0;
                    const primaryShade = db.product_shades.find((s) => s.productId === product.id);
                    const isLow = qty <= db.lowStockThreshold;

                    return (
                      <tr key={product.id} className="hover:bg-[#FAF7F2]/60">
                        <td className="py-4 pr-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={getProductIllustration(product.category, product.brandName, primaryShade?.hexColor)}
                              alt={product.name}
                              className="w-11 h-11 rounded-xl shrink-0"
                            />
                            <div>
                              <div className="font-semibold text-[#221F1F]">{product.name}</div>
                              {primaryShade && (
                                <div className="text-xs text-[#6E6563] flex items-center gap-1.5 mt-0.5">
                                  <span
                                    className="w-2.5 h-2.5 rounded-full inline-block"
                                    style={{ backgroundColor: primaryShade.hexColor }}
                                  />
                                  <span>{primaryShade.shadeNumber} {primaryShade.shadeName}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-3 text-xs font-bold">{product.brandName}</td>
                        <td className="py-4 px-3 text-xs text-[#6E6563]">{product.category}</td>
                        <td className="py-4 px-3 text-xs text-[#6E6563]">
                          <div>{product.undertoneCompatibility?.join(', ')}</div>
                          <div className="text-[11px] opacity-80">{product.skinTypeCompatibility?.join(', ')}</div>
                        </td>
                        <td className="py-4 px-3 font-bold text-[#221F1F]">₹{product.priceInr}</td>
                        <td className="py-4 px-3">
                          <div className="inline-flex items-center gap-2 bg-[#FAF7F2] border border-[#E8C5C1] rounded-xl px-2 py-1">
                            <button
                              onClick={() => updateStock(product.id, Math.max(0, qty - 1))}
                              className="w-6 h-6 rounded-lg bg-white text-[#221F1F] font-bold hover:bg-[#F0E6D8] cursor-pointer"
                            >
                              -
                            </button>
                            <span className={`text-xs font-bold min-w-[28px] text-center ${isLow ? 'text-amber-700' : 'text-[#221F1F]'}`}>
                              {qty}
                            </span>
                            <button
                              onClick={() => updateStock(product.id, qty + 1)}
                              className="w-6 h-6 rounded-lg bg-white text-[#221F1F] font-bold hover:bg-[#F0E6D8] cursor-pointer"
                            >
                              +
                            </button>
                          </div>
                        </td>
                        <td className="py-4 pl-3 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              onClick={() => openEditProductModal(product)}
                              className="p-2 rounded-lg bg-[#FAF7F2] hover:bg-[#F0E6D8] text-[#221F1F] cursor-pointer"
                              title="Edit Product"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                deleteProduct(product.id);
                                showToast(`Removed ${product.name} from inventory`);
                              }}
                              className="p-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 cursor-pointer"
                              title="Delete Product"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: CUSTOMER RELATIONSHIP MANAGEMENT (CRM) */}
      {tab === 'crm' && (
        <div className="bg-white rounded-3xl border border-[#E8C5C1]/70 p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-[#6E6563] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={crmSearch}
                onChange={(e) => setCrmSearch(e.target.value)}
                placeholder="Search customer by name, mobile, email, or skin tone..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E8C5C1] text-sm"
              />
            </div>

            <button
              onClick={handleExportCsv}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#221F1F] text-[#FAF7F2] text-xs font-semibold hover:bg-[#383333] cursor-pointer"
            >
              <Download className="w-4 h-4 text-[#E8C5C1]" />
              Export Customer Data (CSV)
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[#E8C5C1] text-xs uppercase text-[#6E6563]">
                  <th className="py-3 pr-4">Customer</th>
                  <th className="py-3 px-3">Contact</th>
                  <th className="py-3 px-3">AI Skin Profile</th>
                  <th className="py-3 px-3">Registered</th>
                  <th className="py-3 px-3">Purchases</th>
                  <th className="py-3 pl-3 text-right">360° Profile</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8C5C1]/50">
                {filteredCustomers.map((cust) => {
                  const latestAna = db.beauty_analyses.find((a) => a.customerId === cust.id);
                  return (
                    <tr key={cust.id} className="hover:bg-[#FAF7F2]/60">
                      <td className="py-4 pr-4">
                        <div className="font-semibold text-[#221F1F]">{cust.fullName}</div>
                        <div className="text-xs text-[#6E6563]">{cust.gender}, {cust.age} yrs</div>
                      </td>
                      <td className="py-4 px-3 text-xs">
                        <div className="font-medium text-[#221F1F]">{cust.mobile}</div>
                        <div className="text-[#6E6563]">{cust.email || '—'}</div>
                      </td>
                      <td className="py-4 px-3">
                        {latestAna ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F0E6D8] text-xs font-semibold text-[#221F1F]">
                            {latestAna.skinTone} • {latestAna.undertone} • {latestAna.skinType}
                          </span>
                        ) : (
                          <span className="text-xs text-[#6E6563]">Pending Scan</span>
                        )}
                      </td>
                      <td className="py-4 px-3 text-xs text-[#6E6563]">{cust.registeredAt}</td>
                      <td className="py-4 px-3 text-xs font-semibold">{cust.purchases?.length || 0} recorded</td>
                      <td className="py-4 pl-3 text-right">
                        <button
                          onClick={() => setSelectedCustomer360(cust)}
                          className="px-3.5 py-2 rounded-xl bg-[#FAF7F2] border border-[#E8C5C1] text-xs font-semibold text-[#221F1F] hover:bg-[#F0E6D8] cursor-pointer"
                        >
                          View Profile
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: 9-TABLE DATABASE SCHEMA & LIVE INSPECTOR */}
      {tab === 'schema' && (
        <div className="bg-white rounded-3xl border border-[#E8C5C1]/70 p-6 sm:p-8">
          <div className="mb-6">
            <span className="text-xs font-bold uppercase tracking-widest text-[#B8860B]">
              Technical Investor Due Diligence
            </span>
            <h3 className="text-2xl font-semibold text-[#221F1F] mt-1" style={{ fontFamily: "'Playfair Display', serif" }}>
              Relational Beauty Intelligence Schema (9 Entities)
            </h3>
            <p className="text-xs text-[#6E6563] mt-1">
              Click any entity table below to inspect live persisted records powering KLOZEVA.
            </p>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-2.5 mb-6">
            {[
              { key: 'customers', label: 'Customers' },
              { key: 'beauty_analyses', label: 'Beauty Analysis' },
              { key: 'products', label: 'Products' },
              { key: 'brands', label: 'Brands' },
              { key: 'product_shades', label: 'Product Shades' },
              { key: 'inventory', label: 'Inventory' },
              { key: 'recommendations', label: 'Recommendations' },
              { key: 'customer_messages', label: 'Messages' },
              { key: 'retailer_accounts', label: 'Retailers' }
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => setSchemaTable(t.key)}
                className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                  schemaTable === t.key
                    ? 'bg-[#221F1F] text-[#FAF7F2] border-[#221F1F]'
                    : 'bg-[#FAF7F2] text-[#221F1F] border-[#E8C5C1] hover:bg-[#F0E6D8]'
                }`}
              >
                <div className="text-[11px] font-bold truncate">{t.label}</div>
                <div className={`text-lg font-bold mt-1 ${schemaTable === t.key ? 'text-[#E8C5C1]' : 'text-[#B8860B]'}`}>
                  {db[t.key]?.length || 0}
                </div>
              </button>
            ))}
          </div>

          <pre className="bg-[#221F1F] text-[#FAF7F2] p-5 rounded-2xl text-xs overflow-x-auto max-h-[420px] leading-relaxed">
            {JSON.stringify(db[schemaTable], null, 2)}
          </pre>
        </div>
      )}

      {/* MODAL: ADD / EDIT PRODUCT */}
      {productModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-[#E8C5C1] my-8">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-2xl font-semibold text-[#221F1F]" style={{ fontFamily: "'Playfair Display', serif" }}>
                {editingProduct ? 'Edit Store Product' : 'Add Product to Store Inventory'}
              </h3>
              <button onClick={() => setProductModalOpen(false)} className="p-2 rounded-full bg-[#FAF7F2] cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4 text-sm">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-[#6E6563] mb-1">Brand</label>
                  <select
                    value={prodForm.brandName}
                    onChange={(e) => setProdForm({ ...prodForm, brandName: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E8C5C1]"
                  >
                    {db.brands.map((b) => (
                      <option key={b.id} value={b.name}>{b.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-[#6E6563] mb-1">Category</label>
                  <select
                    value={prodForm.category}
                    onChange={(e) => setProdForm({ ...prodForm, category: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E8C5C1]"
                  >
                    <option value="Foundation">Foundation</option>
                    <option value="Concealer">Concealer</option>
                    <option value="Lipstick">Lipstick</option>
                    <option value="Skincare">Skincare</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-[#6E6563] mb-1">Product Name *</label>
                <input
                  type="text"
                  required
                  value={prodForm.name}
                  onChange={(e) => setProdForm({ ...prodForm, name: e.target.value })}
                  placeholder="e.g., Fit Me Matte + Poreless Foundation"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E8C5C1]"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-[#6E6563] mb-1">Shade #</label>
                  <input
                    type="text"
                    value={prodForm.shadeNumber}
                    onChange={(e) => setProdForm({ ...prodForm, shadeNumber: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E8C5C1]"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold uppercase text-[#6E6563] mb-1">Shade Name</label>
                  <input
                    type="text"
                    value={prodForm.shadeName}
                    onChange={(e) => setProdForm({ ...prodForm, shadeName: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E8C5C1]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-[#6E6563] mb-1">Price (₹)</label>
                  <input
                    type="number"
                    min="50"
                    value={prodForm.priceInr}
                    onChange={(e) => setProdForm({ ...prodForm, priceInr: Number(e.target.value) })}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E8C5C1]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-[#6E6563] mb-1">Quantity</label>
                  <input
                    type="number"
                    min="0"
                    value={prodForm.quantity}
                    onChange={(e) => setProdForm({ ...prodForm, quantity: Number(e.target.value) })}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E8C5C1]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-[#6E6563] mb-1">Swatch Color</label>
                  <input
                    type="color"
                    value={prodForm.hexColor}
                    onChange={(e) => setProdForm({ ...prodForm, hexColor: e.target.value })}
                    className="w-full h-10 rounded-xl bg-[#FAF7F2] border border-[#E8C5C1] cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-[#6E6563] mb-1.5">Undertone Compatibility</label>
                <div className="flex flex-wrap gap-2">
                  {['Warm', 'Cool', 'Neutral', 'Olive'].map((u) => (
                    <button
                      type="button"
                      key={u}
                      onClick={() => toggleMultiSelect('undertoneCompatibility', u)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer ${
                        prodForm.undertoneCompatibility.includes(u)
                          ? 'bg-[#221F1F] text-white border-[#221F1F]'
                          : 'bg-[#FAF7F2] text-[#6E6563] border-[#E8C5C1]'
                      }`}
                    >
                      {u}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-[#6E6563] mb-1.5">Skin Type Compatibility</label>
                <div className="flex flex-wrap gap-2">
                  {['Dry', 'Oily', 'Combination', 'Normal'].map((st) => (
                    <button
                      type="button"
                      key={st}
                      onClick={() => toggleMultiSelect('skinTypeCompatibility', st)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer ${
                        prodForm.skinTypeCompatibility.includes(st)
                          ? 'bg-[#221F1F] text-white border-[#221F1F]'
                          : 'bg-[#FAF7F2] text-[#6E6563] border-[#E8C5C1]'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-[#6E6563] mb-1">Aisle Location & Description</label>
                <input
                  type="text"
                  value={prodForm.aisleLocation}
                  onChange={(e) => setProdForm({ ...prodForm, aisleLocation: e.target.value })}
                  placeholder="Aisle B2 • Shelf 1"
                  className="w-full px-3.5 py-2 rounded-xl bg-[#FAF7F2] border border-[#E8C5C1] mb-2"
                />
                <textarea
                  rows="2"
                  value={prodForm.description}
                  onChange={(e) => setProdForm({ ...prodForm, description: e.target.value })}
                  placeholder="Product formulation & benefits..."
                  className="w-full px-3.5 py-2 rounded-xl bg-[#FAF7F2] border border-[#E8C5C1]"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-3.5 rounded-xl bg-[#221F1F] text-[#FAF7F2] font-semibold text-xs cursor-pointer"
                >
                  {editingProduct ? 'Save Changes' : 'Add to Inventory'}
                </button>
                <button
                  type="button"
                  onClick={() => setProductModalOpen(false)}
                  className="px-5 py-3.5 rounded-xl bg-[#FAF7F2] border border-[#E8C5C1] text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CUSTOMER 360 CRM PROFILE */}
      {selectedCustomer360 && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-[#E8C5C1] my-8">
            {(() => {
              const liveCust = db.customers.find((c) => c.id === selectedCustomer360.id) || selectedCustomer360;
              const analyses = db.beauty_analyses.filter((a) => a.customerId === liveCust.id);
              const messages = db.customer_messages.filter((m) => m.customerId === liveCust.id);
              const latestAna = analyses[0];
              const matchedProds = latestAna ? computeInventoryRecommendations(latestAna, db).slice(0, 3) : [];

              return (
                <>
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-widest text-[#B8860B]">
                        Customer 360° Beauty Profile
                      </span>
                      <h3 className="text-2xl font-semibold text-[#221F1F] mt-1" style={{ fontFamily: "'Playfair Display', serif" }}>
                        {liveCust.fullName}
                      </h3>
                      <p className="text-xs text-[#6E6563] mt-0.5">
                        {liveCust.mobile} • {liveCust.email || 'No email'} • {liveCust.gender}, {liveCust.age} yrs
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedCustomer360(null)}
                      className="p-2 rounded-full bg-[#FAF7F2] cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Beauty Analysis History */}
                  <div className="mb-5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#221F1F] mb-2">
                      Beauty Analysis History ({analyses.length})
                    </h4>
                    {analyses.length > 0 ? (
                      <div className="space-y-2">
                        {analyses.map((a) => (
                          <div key={a.id} className="p-3.5 rounded-2xl bg-[#FAF7F2] border border-[#E8C5C1]">
                            <div className="flex justify-between text-xs font-bold text-[#221F1F]">
                              <span>{a.skinTone} • {a.undertone} Undertone • {a.skinType}</span>
                              <span className="text-[#B8860B]">{a.mode}</span>
                            </div>
                            <p className="text-xs text-[#6E6563] mt-1">{a.summary}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-[#6E6563]">No scans recorded yet.</p>
                    )}
                  </div>

                  {/* Top Recommended Products */}
                  {matchedProds.length > 0 && (
                    <div className="mb-5">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#221F1F] mb-2">
                        Recommended Products
                      </h4>
                      <div className="grid sm:grid-cols-3 gap-2.5">
                        {matchedProds.map((m) => (
                          <div key={m.product.id} className="p-3 rounded-xl bg-[#FAF7F2] border border-[#E8C5C1] text-xs">
                            <div className="font-bold text-[#221F1F] truncate">{m.product.brandName}</div>
                            <div className="text-[#6E6563] truncate">{m.product.name}</div>
                            <div className="font-semibold text-[#B8860B] mt-1">
                              {m.shade.shadeNumber} • ₹{m.product.priceInr}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Purchase History + Record New Purchase */}
                  <div className="mb-5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#221F1F] mb-2">
                      Recorded In-Store Purchases ({liveCust.purchases?.length || 0})
                    </h4>
                    <div className="space-y-1.5 mb-3">
                      {(liveCust.purchases || []).map((pur) => (
                        <div key={pur.id} className="flex justify-between text-xs p-2.5 rounded-xl bg-[#FAF7F2]">
                          <span className="font-medium text-[#221F1F]">{pur.productName}</span>
                          <span className="font-bold">₹{pur.priceInr} ({pur.date})</span>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={purchaseProductInput}
                        onChange={(e) => setPurchaseProductInput(e.target.value)}
                        placeholder="Record POS item (e.g. Lakme 9to5 Foundation)"
                        className="flex-1 px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E8C5C1] text-xs"
                      />
                      <input
                        type="number"
                        value={purchasePriceInput}
                        onChange={(e) => setPurchasePriceInput(e.target.value)}
                        placeholder="₹ Price"
                        className="w-24 px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E8C5C1] text-xs"
                      />
                      <button
                        onClick={() => {
                          if (!purchaseProductInput.trim()) return;
                          recordPurchase(liveCust.id, purchaseProductInput.trim(), Number(purchasePriceInput) || 499);
                          setPurchaseProductInput('');
                          setPurchasePriceInput('');
                          showToast('Recorded in-store purchase to CRM');
                        }}
                        className="px-4 py-2 rounded-xl bg-[#221F1F] text-white text-xs font-semibold cursor-pointer"
                      >
                        + Log Sale
                      </button>
                    </div>
                  </div>

                  {/* Automated Messages Sent */}
                  {messages.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#221F1F] mb-2">
                        Automated Message Logs ({messages.length})
                      </h4>
                      <div className="p-3 rounded-xl bg-[#FAF7F2] border border-[#E8C5C1] text-xs text-[#6E6563]">
                        Last {messages[0].channel} dispatch: <strong>{messages[0].status}</strong>
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};
