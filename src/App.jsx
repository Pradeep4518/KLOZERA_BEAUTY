import React, { useState, useEffect, useRef } from 'react';
import {
  RefreshCw
} from 'lucide-react';
import { useLuxuryFonts } from './lib/useLuxuryFonts';
import { STORAGE_KEY, createInitialDatabase } from './lib/seed';
import { KLOZEVAContext, computeInventoryRecommendations } from './lib/KLOZEVAContext';
import { ToastBanner } from './components/ToastBanner';
import { WelcomeScreen } from './pages/WelcomeScreen';
import { CustomerRegistrationStep } from './pages/customer/CustomerRegistrationStep';
import { FacialCaptureStep } from './pages/customer/FacialCaptureStep';
import { CustomerResultsHub } from './pages/customer/CustomerResultsHub';
import { RetailerLoginScreen } from './pages/retailer/RetailerLoginScreen';
import { RetailerDashboard } from './pages/retailer/RetailerDashboard';
import { fetchDb, saveDb } from './lib/beautyStore';

export default function App() {
  useLuxuryFonts();

  const [db, setDb] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      // Fallback to initial seed
    }
    return createInitialDatabase();
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    } catch (e) {
      // Ignore storage quota warnings
    }
  }, [db]);

  // Optional Supabase persistence (enabled with VITE_BEAUTY_BACKEND=supabase); localStorage stays the cache
  const backendReady = useRef(false);
  useEffect(() => {
    let cancelled = false;
    fetchDb()
      .then((remote) => {
        if (cancelled) return;
        backendReady.current = true;
        if (remote) setDb(remote);
        else saveDb(db).catch(() => {}); // first run: store the current/seed database
      })
      .catch(() => {
        // Backend disabled or unreachable: keep working from the local cache
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!backendReady.current) return undefined;
    const t = setTimeout(() => {
      saveDb(db).catch(() => {});
    }, 300);
    return () => clearTimeout(t);
  }, [db]);

  const [toast, setToast] = useState('');
  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  // Navigation State: 'welcome' | 'kiosk-register' | 'kiosk-scan' | 'kiosk-results' | 'retailer-login' | 'retailer-dashboard'
  const [view, setView] = useState('welcome');
  const [retailerAuthenticated, setRetailerAuthenticated] = useState(false);
  const [retailerInitialTab, setRetailerInitialTab] = useState('overview');

  // Active Kiosk Session
  const [activeCustomer, setActiveCustomer] = useState(null);
  const [activeScanImage, setActiveScanImage] = useState(null);
  const [activeAnalysis, setActiveAnalysis] = useState(null);

  // Database Mutations
  const addCustomer = (customerPayload) => {
    const today = new Date().toISOString().slice(0, 10);
    const newCust = {
      id: `cust-${Date.now()}`,
      ...customerPayload,
      registeredAt: today,
      lastVisit: today,
      purchases: []
    };
    setDb((prev) => ({
      ...prev,
      customers: [newCust, ...prev.customers]
    }));
    return newCust;
  };

  const saveAnalysisAndRecommendations = (customerId, analysisResult) => {
    const analysisRecord = {
      id: `ana-${Date.now()}`,
      customerId,
      createdAt: new Date().toISOString(),
      ...analysisResult
    };

    const recs = computeInventoryRecommendations(analysisRecord, db)
      .slice(0, 4)
      .map((r, idx) => ({
        id: `rec-${Date.now()}-${idx}`,
        customerId,
        productId: r.product.id,
        shadeId: r.shade.id,
        matchScore: r.matchScore,
        createdAt: new Date().toISOString()
      }));

    setDb((prev) => ({
      ...prev,
      beauty_analyses: [analysisRecord, ...prev.beauty_analyses],
      recommendations: [...recs, ...prev.recommendations]
    }));

    return analysisRecord;
  };

  const logCustomerMessage = (msgPayload) => {
    const newMsg = {
      id: `msg-${Date.now()}`,
      sentAt: new Date().toISOString(),
      ...msgPayload
    };
    setDb((prev) => ({
      ...prev,
      customer_messages: [newMsg, ...prev.customer_messages]
    }));
  };

  const updateStock = (productId, newQuantity) => {
    setDb((prev) => ({
      ...prev,
      inventory: prev.inventory.map((inv) =>
        inv.productId === productId
          ? { ...inv, quantity: newQuantity, lastUpdated: new Date().toISOString() }
          : inv
      )
    }));
  };

  const addProduct = (form) => {
    const prodId = `prod-${Date.now()}`;
    const brandObj = db.brands.find((b) => b.name === form.brandName) || db.brands[0];
    const newProd = {
      id: prodId,
      brandId: brandObj.id,
      brandName: form.brandName,
      name: form.name,
      category: form.category,
      priceInr: Number(form.priceInr) || 499,
      undertoneCompatibility: form.undertoneCompatibility,
      skinTypeCompatibility: form.skinTypeCompatibility,
      description: form.description || 'Curated KLOZEVA store addition.',
      aisleLocation: form.aisleLocation || 'Aisle A1'
    };
    const newShade = {
      id: `sh-${Date.now()}`,
      productId: prodId,
      shadeNumber: form.shadeNumber || '01',
      shadeName: form.shadeName || 'Natural',
      hexColor: form.hexColor || '#C9936B',
      targetTone: ['Fair', 'Light', 'Medium', 'Tan', 'Deep'],
      targetUndertone: form.undertoneCompatibility
    };
    const newInv = {
      id: `inv-${Date.now()}`,
      productId: prodId,
      quantity: Number(form.quantity) || 10,
      lastUpdated: new Date().toISOString()
    };

    setDb((prev) => ({
      ...prev,
      products: [newProd, ...prev.products],
      product_shades: [newShade, ...prev.product_shades],
      inventory: [newInv, ...prev.inventory]
    }));
  };

  const updateProduct = (productId, form) => {
    setDb((prev) => ({
      ...prev,
      products: prev.products.map((p) =>
        p.id === productId
          ? {
              ...p,
              brandName: form.brandName,
              name: form.name,
              category: form.category,
              priceInr: Number(form.priceInr),
              undertoneCompatibility: form.undertoneCompatibility,
              skinTypeCompatibility: form.skinTypeCompatibility,
              aisleLocation: form.aisleLocation,
              description: form.description
            }
          : p
      ),
      product_shades: prev.product_shades.map((s, idx) =>
        s.productId === productId && idx === prev.product_shades.findIndex((x) => x.productId === productId)
          ? { ...s, shadeName: form.shadeName, shadeNumber: form.shadeNumber, hexColor: form.hexColor }
          : s
      ),
      inventory: prev.inventory.map((inv) =>
        inv.productId === productId
          ? { ...inv, quantity: Number(form.quantity), lastUpdated: new Date().toISOString() }
          : inv
      )
    }));
  };

  const deleteProduct = (productId) => {
    setDb((prev) => ({
      ...prev,
      products: prev.products.filter((p) => p.id !== productId),
      product_shades: prev.product_shades.filter((s) => s.productId !== productId),
      inventory: prev.inventory.filter((i) => i.productId !== productId)
    }));
  };

  const setLowStockThreshold = (val) => {
    setDb((prev) => ({ ...prev, lowStockThreshold: val }));
  };

  const recordPurchase = (customerId, productName, priceInr) => {
    const today = new Date().toISOString().slice(0, 10);
    setDb((prev) => ({
      ...prev,
      customers: prev.customers.map((c) =>
        c.id === customerId
          ? {
              ...c,
              lastVisit: today,
              purchases: [...(c.purchases || []), { id: `pur-${Date.now()}`, productName, priceInr, date: today }]
            }
          : c
      )
    }));
  };

  const handleResetDemoData = () => {
    const fresh = createInitialDatabase();
    setDb(fresh);
    setActiveCustomer(null);
    setActiveScanImage(null);
    setActiveAnalysis(null);
    setView('welcome');
    showToast('Reset KLOZEVA demo database to pristine state');
  };

  const contextValue = {
    db,
    addCustomer,
    saveAnalysisAndRecommendations,
    logCustomerMessage,
    updateStock,
    addProduct,
    updateProduct,
    deleteProduct,
    setLowStockThreshold,
    recordPurchase,
    showToast
  };

  return (
    <KLOZEVAContext.Provider value={contextValue}>
      <div
        className="min-h-screen bg-[#FAF7F2] text-[#221F1F] flex flex-col"
        style={{ fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif" }}
      >
        {/* Top Executive & Kiosk Navigation Header */}
        <header className="sticky top-0 z-40 h-16 bg-[#FAF7F2]/90 backdrop-blur-md border-b border-[#E8C5C1]/60 px-4 sm:px-8 flex items-center justify-between">
          <button
            onClick={() => setView('welcome')}
            className="flex items-center gap-3 text-left cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-[#221F1F] text-[#E8C5C1] flex items-center justify-center font-bold text-lg" style={{ fontFamily: "'Playfair Display', serif" }}>
              K
            </div>
            <div>
              <div className="text-base font-bold tracking-[0.18em] text-[#221F1F] leading-none">
                KLOZEVA
              </div>
              <div className="text-[10px] font-semibold tracking-[0.22em] text-[#6E6563] mt-0.5">
                BEAUTY INTELLIGENCE
              </div>
            </div>
          </button>

          {/* Mode Switcher Pills for Seamless Investor Demo */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setView('kiosk-register')}
              className={`px-3.5 py-2 rounded-full text-xs font-semibold transition cursor-pointer ${
                view.startsWith('kiosk')
                  ? 'bg-[#221F1F] text-[#FAF7F2]'
                  : 'bg-[#F0E6D8] text-[#221F1F] hover:bg-[#E8C5C1]/60'
              }`}
            >
              Customer Kiosk
            </button>

            <button
              onClick={() => {
                setRetailerInitialTab('overview');
                setView(retailerAuthenticated ? 'retailer-dashboard' : 'retailer-login');
              }}
              className={`px-3.5 py-2 rounded-full text-xs font-semibold transition cursor-pointer ${
                view.startsWith('retailer')
                  ? 'bg-[#221F1F] text-[#FAF7F2]'
                  : 'bg-white border border-[#E8C5C1] text-[#221F1F] hover:bg-[#F0E6D8]'
              }`}
            >
              Retailer Portal
            </button>

            <button
              onClick={handleResetDemoData}
              title="Reset Demo Database"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-white border border-[#E8C5C1] text-[11px] font-medium text-[#6E6563] hover:text-[#221F1F] cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              Reset Demo
            </button>
          </div>
        </header>

        {/* Main Viewport Router */}
        <main className="flex-1">
          {view === 'welcome' && (
            <WelcomeScreen
              onStartCustomer={() => setView('kiosk-register')}
              onStartRetailer={() => {
                setRetailerInitialTab('overview');
                setView(retailerAuthenticated ? 'retailer-dashboard' : 'retailer-login');
              }}
              onOpenSchema={() => {
                setRetailerAuthenticated(true);
                setRetailerInitialTab('schema');
                setView('retailer-dashboard');
              }}
            />
          )}

          {view === 'kiosk-register' && (
            <CustomerRegistrationStep
              onBack={() => setView('welcome')}
              onComplete={(savedCustomer) => {
                setActiveCustomer(savedCustomer);
                setView('kiosk-scan');
              }}
            />
          )}

          {view === 'kiosk-scan' && activeCustomer && (
            <FacialCaptureStep
              customer={activeCustomer}
              onBack={() => setView('kiosk-register')}
              onAnalyzeComplete={(capturedImg, analysisResult) => {
                const persistedAnalysis = saveAnalysisAndRecommendations(activeCustomer.id, analysisResult);
                setActiveScanImage(capturedImg);
                setActiveAnalysis(persistedAnalysis);
                setView('kiosk-results');
              }}
            />
          )}

          {view === 'kiosk-results' && activeCustomer && activeAnalysis && (
            <CustomerResultsHub
              customer={activeCustomer}
              imageDataUrl={activeScanImage}
              analysis={activeAnalysis}
              onRestart={() => {
                setActiveCustomer(null);
                setActiveScanImage(null);
                setActiveAnalysis(null);
                setView('kiosk-register');
              }}
            />
          )}

          {view === 'retailer-login' && (
            <RetailerLoginScreen
              onBack={() => setView('welcome')}
              onSuccess={() => {
                setRetailerAuthenticated(true);
                setRetailerInitialTab('overview');
                setView('retailer-dashboard');
                showToast('Authenticated as Store Manager');
              }}
            />
          )}

          {view === 'retailer-dashboard' && (
            <RetailerDashboard
              initialTab={retailerInitialTab}
              onLogout={() => {
                setRetailerAuthenticated(false);
                setView('welcome');
              }}
            />
          )}
        </main>

        <ToastBanner toast={toast} onClose={() => setToast('')} />
      </div>
    </KLOZEVAContext.Provider>
  );
}
