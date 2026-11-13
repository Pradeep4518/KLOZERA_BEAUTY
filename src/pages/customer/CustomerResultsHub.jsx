import React, { useState, useMemo } from 'react';
import {
  Sparkles, User, RefreshCw, Download, Copy, Send, MapPin, Heart, Eye, X, ShoppingBag, Palette, Droplets, SlidersHorizontal
} from 'lucide-react';
import { getProductIllustration } from '../../lib/portraits';
import { useKLOZEVA, computeInventoryRecommendations, applyCustomerCorrection } from '../../lib/KLOZEVAContext';
import { VirtualMakeupTryOnStudio } from './VirtualMakeupTryOnStudio';

export const CustomerResultsHub = ({ customer, imageDataUrl, analysis, onRestart }) => {
  const { db, logCustomerMessage, showToast } = useKLOZEVA();
  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'recommendations' | 'tryon'
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [wishlist, setWishlist] = useState([]);
  const [selectedProductModal, setSelectedProductModal] = useState(null);
  const [storeLocatorProduct, setStoreLocatorProduct] = useState(null);
  const [messageFormat, setMessageFormat] = useState('WhatsApp');
  const [messageSentStatus, setMessageSentStatus] = useState(null);
  const [corrections, setCorrections] = useState({});
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);

  const effectiveAnalysis = useMemo(() => {
    return Object.keys(corrections).length > 0
      ? applyCustomerCorrection(analysis, corrections)
      : analysis;
  }, [analysis, corrections]);

  const recommendations = useMemo(
    () => computeInventoryRecommendations(effectiveAnalysis, db, corrections),
    [effectiveAnalysis, db, corrections]
  );

  const filteredRecommendations = useMemo(() => {
    if (categoryFilter === 'All') return recommendations;
    return recommendations.filter((r) => r.product.category === categoryFilter);
  }, [recommendations, categoryFilter]);

  const generatedMessage = useMemo(() => {
    const topMatch = recommendations[0];
    if (messageFormat === 'WhatsApp') {
      return `Hi ${customer.fullName}! Welcome to KLOZEVA Beauty.\n\nYour beauty analysis is complete!\n\nYour Skin Tone: ${analysis.skinTone}\nYour Undertone: ${analysis.undertone}\nYour Skin Type: ${analysis.skinType}\n\nTop Shade Match: ${topMatch ? `${topMatch.product.brandName} ${topMatch.product.name} (${topMatch.shade.shadeNumber} ${topMatch.shade.shadeName})` : 'Curated In-Store Selection'}\n\nYour personalised makeup and skincare recommendations are ready.\n\nVisit the store to explore your perfect matches!`;
    }
    return `KLOZEVA Beauty: Hi ${customer.fullName}, your scan is complete! Tone: ${analysis.skinTone} | Undertone: ${analysis.undertone} | Type: ${analysis.skinType}. Top match: ${topMatch?.product.brandName || 'Maybelline'} Shade ${topMatch?.shade.shadeNumber || '230'}. Ask our beauty advisor in-store!`;
  }, [customer, analysis, recommendations, messageFormat]);

  const handleCopyMessage = () => {
    navigator.clipboard?.writeText(generatedMessage);
    showToast(`${messageFormat} message copied to clipboard!`);
  };

  const handleSimulateSend = () => {
    if (!customer.consentMarketing) {
      setMessageSentStatus('Delivery paused: Customer did not opt in to SMS/WhatsApp marketing during check-in.');
      showToast('Respecting customer privacy: Marketing consent was not opted in.');
      return;
    }
    logCustomerMessage({
      customerId: customer.id,
      customerName: customer.fullName,
      channel: messageFormat,
      status: 'Queued via Sandbox Gateway',
      content: generatedMessage
    });
    setMessageSentStatus(`Logged & queued in KLOZEVA Messaging Gateway (${messageFormat} Sandbox Mode).`);
    showToast(`${messageFormat} message logged to CRM history!`);
  };

  const handleDownloadPassport = () => {
    const htmlContent = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>KLOZEVA Beauty Passport - ${customer.fullName}</title>
<style>
  body { font-family: Georgia, serif; background: #FAF7F2; color: #221F1F; padding: 40px; max-width: 800px; margin: auto; }
  .header { border-bottom: 2px solid #221F1F; padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; }
  .badge { background: #F0E6D8; padding: 6px 14px; border-radius: 20px; font-family: sans-serif; font-size: 12px; font-weight: bold; }
  .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin: 20px 0; }
  .card { background: #FFF; border: 1px solid #E8C5C1; border-radius: 14px; padding: 16px; }
  .swatches { display: flex; gap: 12px; margin: 16px 0; }
  .swatch { width: 60px; height: 60px; border-radius: 12px; border: 1px solid #ccc; }
  .prod { border-bottom: 1px solid #E8C5C1; padding: 12px 0; font-family: sans-serif; }
</style>
</head>
<body>
  <div class="header">
    <div><h1 style="margin:0;">KLOZEVA BEAUTY</h1><p style="margin:4px 0 0;color:#6E6563;">Personal Beauty & Shade Passport</p></div>
    <div class="badge">CUSTOMER: ${customer.fullName.toUpperCase()}</div>
  </div>
  <p><strong>Summary:</strong> ${analysis.summary}</p>
  <div class="grid">
    <div class="card"><small>SKIN TONE</small><h2 style="margin:6px 0 0;">${analysis.skinTone}</h2></div>
    <div class="card"><small>UNDERTONE</small><h2 style="margin:6px 0 0;">${analysis.undertone}</h2></div>
    <div class="card"><small>SKIN TYPE</small><h2 style="margin:6px 0 0;">${analysis.skinType}</h2></div>
  </div>
  <h3>Your Recommended Colour Palette</h3>
  <div class="swatches">
    ${analysis.colorPalette.map((c) => `<div><div class="swatch" style="background:${c.hex}"></div><small>${c.name}</small></div>`).join('')}
  </div>
  <h3>Top Matched Store Inventory</h3>
  ${recommendations
    .slice(0, 6)
    .map(
      (r) =>
        `<div class="prod"><strong>${r.product.brandName} — ${r.product.name}</strong><br/>Shade: ${r.shade.shadeNumber} ${r.shade.shadeName} | Match: ${r.matchScore}% | Price: ₹${r.product.priceInr} | Location: ${r.product.aisleLocation}</div>`
    )
    .join('')}
  <p style="margin-top:32px;font-size:11px;color:#6E6563;">Cosmetic & aesthetic guidance only — not a medical dermatological diagnosis.</p>
</body>
</html>`;
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `KLOZEVA_Beauty_Passport_${customer.fullName.replace(/\s+/g, '_')}.html`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Downloaded KLOZEVA Beauty Passport!');
  };

  const toggleWishlist = (productId) => {
    setWishlist((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
    );
    showToast('Updated your KLOZEVA Store Wishlist');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Top Editorial Customer Banner */}
      <div className="bg-white rounded-3xl border border-[#E8C5C1]/70 p-6 sm:p-8 shadow-lg mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <img
              src={imageDataUrl}
              alt={customer.fullName}
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border-2 border-[#D8A7A3]"
            />
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#B8860B]">
                  CUSTOMER: {customer.fullName.toUpperCase()}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#F0E6D8] text-[#221F1F]">
                  {analysis.mode}
                </span>
              </div>
              <h1
                className="text-3xl sm:text-4xl font-semibold text-[#221F1F]"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                Your Beauty Profile
              </h1>
              <p className="text-sm text-[#6E6563] mt-1 max-w-2xl">{analysis.summary}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleDownloadPassport}
              className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-[#FAF7F2] border border-[#E8C5C1] text-xs font-semibold text-[#221F1F] hover:bg-[#F0E6D8] transition cursor-pointer"
            >
              <Download className="w-4 h-4 text-[#B8860B]" />
              Download Beauty Profile
            </button>
            <button
              onClick={onRestart}
              className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-white border border-[#E8C5C1] text-xs font-semibold text-[#6E6563] hover:text-[#221F1F] transition cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              New Guest Scan
            </button>
          </div>
        </div>

        {/* Navigation Sub-Tabs */}
        <div className="flex flex-wrap gap-2 mt-8 pt-6 border-t border-[#E8C5C1]/50">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition cursor-pointer ${
              activeTab === 'profile'
                ? 'bg-[#221F1F] text-[#FAF7F2] shadow-md'
                : 'bg-[#FAF7F2] text-[#6E6563] hover:text-[#221F1F]'
            }`}
          >
            <User className="w-4 h-4" />
            1. Skin & Colour Profile
          </button>

          <button
            onClick={() => setActiveTab('recommendations')}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition cursor-pointer ${
              activeTab === 'recommendations'
                ? 'bg-[#221F1F] text-[#FAF7F2] shadow-md'
                : 'bg-[#FAF7F2] text-[#6E6563] hover:text-[#221F1F]'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            2. Store Product Matches ({recommendations.length})
          </button>

          <button
            onClick={() => setActiveTab('tryon')}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition cursor-pointer ${
              activeTab === 'tryon'
                ? 'bg-[#221F1F] text-[#FAF7F2] shadow-md'
                : 'bg-[#FAF7F2] text-[#6E6563] hover:text-[#221F1F]'
            }`}
          >
            <Palette className="w-4 h-4" />
            3. Virtual Makeup Try-On Studio
          </button>
        </div>
      </div>

      {/* TAB 1: SKIN PROFILE, PALETTE & AUTOMATED MESSAGE */}
      {activeTab === 'profile' && (
        <div className="space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-3xl border border-[#E8C5C1]/70">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-[#B8860B]">
                AI Biometric Analysis & Calibrated Profiles
              </div>
              <p className="text-xs text-[#6E6563] mt-0.5">
                {Object.keys(corrections).length > 0
                  ? `Customized preferences active (Original AI Detection: ${analysis.skinTone} • ${analysis.undertone})`
                  : 'Grounded CIELAB & ITA measurements derived from non-occluded facial skin.'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {Object.keys(corrections).length > 0 && (
                <button
                  onClick={() => {
                    setCorrections({});
                    showToast('Restored original AI model predictions');
                  }}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-[#6E6563] bg-[#FAF7F2] border border-[#E8C5C1] hover:text-[#221F1F] cursor-pointer"
                >
                  Reset to AI
                </button>
              )}
              <button
                onClick={() => setShowCorrectionModal(!showCorrectionModal)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-[#221F1F] text-[#FAF7F2] hover:bg-[#383333] transition cursor-pointer"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-[#E8C5C1]" />
                {showCorrectionModal ? 'Close Adjustments' : 'Adjust Tone / Undertone'}
              </button>
            </div>
          </div>

          {/* Interactive Customer Correction Drawer */}
          {showCorrectionModal && (
            <div className="bg-[#FAF7F2] border border-[#E8C5C1] rounded-3xl p-6 space-y-6 shadow-inner">
              <div className="text-sm font-semibold text-[#221F1F]">
                Manual Calibration & Customer Tone Overrides
              </div>
              <p className="text-xs text-[#6E6563]">
                Adjusting your skin depth or undertone updates all inventory recommendations and foundation matching in real time while preserving the original raw AI scan.
              </p>

              <div className="grid sm:grid-cols-3 gap-6">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-[#6E6563] block mb-2">
                    Skin Depth
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {['Fair', 'Light', 'Medium', 'Tan', 'Deep'].map((t) => (
                      <button
                        key={t}
                        onClick={() => {
                          setCorrections((prev) => ({ ...prev, skinTone: t }));
                          showToast(`Updated skin depth to ${t}`);
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-medium cursor-pointer transition ${
                          effectiveAnalysis.skinTone === t
                            ? 'bg-[#221F1F] text-[#FAF7F2]'
                            : 'bg-white border border-[#E8C5C1] text-[#221F1F] hover:bg-[#F0E6D8]'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-[#6E6563] block mb-2">
                    Undertone Harmony
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {['Warm', 'Cool', 'Neutral', 'Olive'].map((u) => (
                      <button
                        key={u}
                        onClick={() => {
                          setCorrections((prev) => ({ ...prev, undertone: u }));
                          showToast(`Updated undertone to ${u}`);
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-medium cursor-pointer transition ${
                          effectiveAnalysis.undertone === u
                            ? 'bg-[#221F1F] text-[#FAF7F2]'
                            : 'bg-white border border-[#E8C5C1] text-[#221F1F] hover:bg-[#F0E6D8]'
                        }`}
                      >
                        {u}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-[#6E6563] block mb-2">
                    Skin Finish Profile
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {['Normal', 'Dry', 'Combination', 'Oily'].map((st) => (
                      <button
                        key={st}
                        onClick={() => {
                          setCorrections((prev) => ({ ...prev, skinType: st }));
                          showToast(`Updated finish profile to ${st}`);
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-medium cursor-pointer transition ${
                          effectiveAnalysis.skinType === st
                            ? 'bg-[#221F1F] text-[#FAF7F2]'
                            : 'bg-white border border-[#E8C5C1] text-[#221F1F] hover:bg-[#F0E6D8]'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Core 3 Skin Metrics */}
          <div className="grid sm:grid-cols-3 gap-5">
            <div className="bg-white rounded-3xl border border-[#E8C5C1]/70 p-6 shadow-sm">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold uppercase tracking-widest text-[#6E6563]">Skin Tone</span>
                {corrections.skinTone && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#E8C5C1]/50 text-[#221F1F] font-semibold">
                    Customized
                  </span>
                )}
              </div>
              <div
                className="text-3xl font-semibold text-[#221F1F] mt-2"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                {effectiveAnalysis.skinTone}
              </div>
              <div className="text-xs text-[#6E6563] mt-1">
                {effectiveAnalysis.itaDegrees ? `ITA: ${effectiveAnalysis.itaDegrees}°` : 'Optical Luminance Classification'}
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-[#E8C5C1]/70 p-6 shadow-sm">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold uppercase tracking-widest text-[#6E6563]">Undertone</span>
                {corrections.undertone && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#E8C5C1]/50 text-[#221F1F] font-semibold">
                    Customized
                  </span>
                )}
              </div>
              <div
                className="text-3xl font-semibold text-[#221F1F] mt-2"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                {effectiveAnalysis.undertone}
              </div>
              <div className="text-xs text-[#6E6563] mt-1">Sub-surface Pigment Harmony</div>
            </div>

            <div className="bg-white rounded-3xl border border-[#E8C5C1]/70 p-6 shadow-sm">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold uppercase tracking-widest text-[#6E6563]">Skin Type</span>
                {corrections.skinType && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#E8C5C1]/50 text-[#221F1F] font-semibold">
                    Customized
                  </span>
                )}
              </div>
              <div
                className="text-3xl font-semibold text-[#221F1F] mt-2"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                {effectiveAnalysis.skinType}
              </div>
              <div className="text-xs text-[#6E6563] mt-1">Sebum & Hydration Balance</div>
            </div>
          </div>

          {/* Your Colour Palette */}
          <div className="bg-white rounded-3xl border border-[#E8C5C1]/70 p-6 sm:p-8 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
              <div>
                <h3
                  className="text-2xl font-semibold text-[#221F1F]"
                  style={{ fontFamily: "'Playfair Display', serif" }}
                >
                  Your Personal Colour Palette
                </h3>
                <p className="text-sm text-[#6E6563]">
                  Curated shades engineered to flatter your {analysis.skinTone} skin & {analysis.undertone} undertone
                </p>
              </div>
              <button
                onClick={() => setActiveTab('tryon')}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#F0E6D8] text-xs font-semibold text-[#221F1F] hover:bg-[#E8C5C1]/60 cursor-pointer"
              >
                <Palette className="w-4 h-4 text-[#B8860B]" />
                Try These Shades Virtually
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
              {analysis.colorPalette?.map((swatch, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl border border-[#E8C5C1]/70 overflow-hidden bg-[#FAF7F2] flex flex-col"
                >
                  <div className="h-24 w-full" style={{ backgroundColor: swatch.hex }} />
                  <div className="p-3.5 flex-1">
                    <div className="font-semibold text-sm text-[#221F1F]">{swatch.name}</div>
                    <div className="text-[11px] font-mono text-[#6E6563] mt-0.5">{swatch.hex}</div>
                    <p className="text-xs text-[#6E6563] mt-1.5 leading-snug">{swatch.tip}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Makeup & Skincare Blueprints */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Makeup Recommendations */}
            <div className="bg-white rounded-3xl border border-[#E8C5C1]/70 p-6 sm:p-8 shadow-sm space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#F0E6D8] flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-[#B8860B]" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-[#221F1F]" style={{ fontFamily: "'Playfair Display', serif" }}>
                    Makeup Shade Blueprint
                  </h3>
                  <p className="text-xs text-[#6E6563]">{analysis.makeupAnalysis?.colorFamily}</p>
                </div>
              </div>

              <div className="space-y-3 text-sm">
                <div className="p-3.5 rounded-xl bg-[#FAF7F2]">
                  <span className="text-xs font-bold uppercase text-[#6E6563] block">Foundation Direction</span>
                  <span className="font-medium text-[#221F1F]">{analysis.makeupAnalysis?.foundationFamily}</span>
                </div>
                <div className="p-3.5 rounded-xl bg-[#FAF7F2]">
                  <span className="text-xs font-bold uppercase text-[#6E6563] block">Concealer Match</span>
                  <span className="font-medium text-[#221F1F]">{analysis.makeupAnalysis?.concealerDirection}</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-xl bg-[#FAF7F2]">
                    <span className="text-xs font-bold uppercase text-[#6E6563] block">Lipstick Colours</span>
                    <span className="font-medium text-[#221F1F]">{analysis.makeupAnalysis?.lipstickColors?.join(', ')}</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-[#FAF7F2]">
                    <span className="text-xs font-bold uppercase text-[#6E6563] block">Blush & Eyes</span>
                    <span className="font-medium text-[#221F1F]">{analysis.makeupAnalysis?.blushColors?.join(', ')}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Skincare Recommendations */}
            <div className="bg-white rounded-3xl border border-[#E8C5C1]/70 p-6 sm:p-8 shadow-sm space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#F0E6D8] flex items-center justify-center">
                  <Droplets className="w-5 h-5 text-[#3E6B65]" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-[#221F1F]" style={{ fontFamily: "'Playfair Display', serif" }}>
                    Skincare Regimen Blueprint
                  </h3>
                  <p className="text-xs text-[#6E6563]">Observations: {analysis.textureObservations}</p>
                </div>
              </div>

              <div className="space-y-3 text-sm">
                <div className="p-3.5 rounded-xl bg-[#FAF7F2]">
                  <span className="text-xs font-bold uppercase text-[#6E6563] block">1. Cleanser</span>
                  <span className="font-medium text-[#221F1F]">{analysis.skincareAnalysis?.cleanser}</span>
                </div>
                <div className="p-3.5 rounded-xl bg-[#FAF7F2]">
                  <span className="text-xs font-bold uppercase text-[#6E6563] block">2. Targeted Serum</span>
                  <span className="font-medium text-[#221F1F]">{analysis.skincareAnalysis?.serum}</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-xl bg-[#FAF7F2]">
                    <span className="text-xs font-bold uppercase text-[#6E6563] block">3. Moisturiser</span>
                    <span className="font-medium text-[#221F1F]">{analysis.skincareAnalysis?.moisturiser}</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-[#FAF7F2]">
                    <span className="text-xs font-bold uppercase text-[#6E6563] block">4. Sunscreen</span>
                    <span className="font-medium text-[#221F1F]">{analysis.skincareAnalysis?.sunscreen}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Automated Customer Message Generator */}
          <div className="bg-white rounded-3xl border border-[#E8C5C1]/70 p-6 sm:p-8 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-[#B8860B]">
                  Automated Omnichannel Follow-Up
                </span>
                <h3 className="text-xl font-semibold text-[#221F1F] mt-0.5" style={{ fontFamily: "'Playfair Display', serif" }}>
                  Personalised Customer Message
                </h3>
              </div>

              <div className="inline-flex p-1 rounded-xl bg-[#FAF7F2] border border-[#E8C5C1]">
                {['WhatsApp', 'SMS'].map((fmt) => (
                  <button
                    key={fmt}
                    onClick={() => setMessageFormat(fmt)}
                    className={`px-4 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      messageFormat === fmt ? 'bg-[#221F1F] text-[#FAF7F2]' : 'text-[#6E6563]'
                    }`}
                  >
                    {fmt} Format
                  </button>
                ))}
              </div>
            </div>

            <pre className="whitespace-pre-wrap font-sans text-sm bg-[#FAF7F2] border border-[#E8C5C1] rounded-2xl p-5 text-[#221F1F] leading-relaxed">
              {generatedMessage}
            </pre>

            <div className="flex flex-wrap items-center justify-between gap-4 mt-4">
              <div className="text-xs text-[#6E6563]">
                Consent Status:{' '}
                <strong className={customer.consentMarketing ? 'text-emerald-700' : 'text-amber-700'}>
                  {customer.consentMarketing ? 'Opted-In for SMS/WhatsApp' : 'Not Opted-In (Copy Only)'}
                </strong>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleCopyMessage}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E8C5C1] text-xs font-semibold text-[#221F1F] hover:bg-[#F0E6D8] cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Copy Message
                </button>
                <button
                  onClick={handleSimulateSend}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#221F1F] text-[#FAF7F2] text-xs font-semibold hover:bg-[#383333] cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5 text-[#E8C5C1]" />
                  Queue {messageFormat} Dispatch
                </button>
              </div>
            </div>

            {messageSentStatus && (
              <div className="mt-3 p-3 rounded-xl bg-[#F0E6D8] text-xs font-medium text-[#221F1F]">
                {messageSentStatus}
              </div>
            )}
          </div>

          {/* Non-medical Disclaimer */}
          <div className="text-xs text-[#6E6563] text-center py-2">
            Disclaimer: KLOZEVA Beauty Intelligence provides cosmetic shade matching and aesthetic wellness suggestions only. It does not constitute a medical dermatological diagnosis.
          </div>
        </div>
      )}

      {/* TAB 2: INVENTORY-CONNECTED PRODUCT RECOMMENDATION ENGINE */}
      {activeTab === 'recommendations' && (
        <div className="space-y-6">
          {/* Category Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-[#E8C5C1]/70">
            <div className="flex flex-wrap gap-2">
              {['All', 'Foundation', 'Concealer', 'Lipstick', 'Skincare'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    categoryFilter === cat
                      ? 'bg-[#221F1F] text-[#FAF7F2]'
                      : 'bg-[#FAF7F2] text-[#6E6563] hover:text-[#221F1F]'
                  }`}
                >
                  {cat === 'All' ? 'All Store Matches' : cat.toUpperCase()}
                </button>
              ))}
            </div>
            <div className="text-xs text-[#6E6563]">
              Synced with live store inventory • Ranked by <strong>{analysis.skinTone} / {analysis.undertone}</strong> affinity
            </div>
          </div>

          {/* Product Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRecommendations.map(({ product, shade, quantity, matchScore, reason }) => {
              const isWishlisted = wishlist.includes(product.id);
              const isLowStock = quantity > 0 && quantity <= db.lowStockThreshold;
              const isOutOfStock = quantity === 0;

              return (
                <div
                  key={product.id}
                  className="bg-white rounded-3xl border border-[#E8C5C1]/70 p-6 shadow-sm hover:shadow-xl transition flex flex-col justify-between"
                >
                  <div>
                    {/* Top Row: Brand + Match Score */}
                    <div className="flex items-center justify-between gap-2 mb-4">
                      <span className="px-3 py-1 rounded-full bg-[#F0E6D8] text-[11px] font-bold tracking-wider text-[#221F1F]">
                        {product.brandName}
                      </span>
                      <span className="px-3 py-1 rounded-full bg-[#221F1F] text-[#E8C5C1] text-xs font-bold">
                        {matchScore}% Match
                      </span>
                    </div>

                    {/* Product Visual + Shade Swatch */}
                    <div className="flex items-center gap-4 mb-4">
                      <img
                        src={getProductIllustration(product.category, product.brandName, shade.hexColor)}
                        alt={product.name}
                        className="w-24 h-24 rounded-2xl object-cover border border-[#E8C5C1]/60 shrink-0"
                      />
                      <div>
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6E6563]">
                          {product.category}
                        </span>
                        <h4 className="text-base font-bold text-[#221F1F] leading-snug mt-0.5">
                          {product.name}
                        </h4>
                        <div className="flex items-center gap-2 mt-2">
                          <span
                            className="w-4 h-4 rounded-full border border-black/20 shrink-0"
                            style={{ backgroundColor: shade.hexColor }}
                          />
                          <span className="text-xs font-semibold text-[#221F1F]">
                            {shade.shadeNumber} {shade.shadeName}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Price & Live Stock Badge */}
                    <div className="flex items-center justify-between py-3 px-4 rounded-2xl bg-[#FAF7F2] mb-3">
                      <div>
                        <span className="text-[11px] text-[#6E6563] block">Store Price</span>
                        <span className="text-lg font-bold text-[#221F1F]">₹{product.priceInr}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[11px] text-[#6E6563] block">Availability</span>
                        {isOutOfStock ? (
                          <span className="text-xs font-bold text-red-600">Out of Stock</span>
                        ) : isLowStock ? (
                          <span className="text-xs font-bold text-amber-700">Low Stock ({quantity} left)</span>
                        ) : (
                          <span className="text-xs font-bold text-emerald-700">In Stock ({quantity} units)</span>
                        )}
                      </div>
                    </div>

                    {/* AI Recommendation Reason */}
                    <p className="text-xs text-[#6E6563] leading-relaxed mb-5">
                      <strong className="text-[#221F1F]">Why it matches:</strong> {reason}
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="grid grid-cols-3 gap-2 pt-3 border-t border-[#E8C5C1]/50">
                    <button
                      onClick={() => setSelectedProductModal({ product, shade, quantity, matchScore, reason })}
                      className="py-2.5 px-2 rounded-xl bg-[#FAF7F2] hover:bg-[#F0E6D8] text-[11px] font-semibold text-[#221F1F] flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      View
                    </button>

                    <button
                      onClick={() => toggleWishlist(product.id)}
                      className={`py-2.5 px-2 rounded-xl text-[11px] font-semibold flex items-center justify-center gap-1 cursor-pointer border ${
                        isWishlisted
                          ? 'bg-[#E8C5C1]/50 border-[#D8A7A3] text-[#221F1F]'
                          : 'bg-[#FAF7F2] border-transparent text-[#221F1F] hover:bg-[#F0E6D8]'
                      }`}
                    >
                      <Heart className={`w-3.5 h-3.5 ${isWishlisted ? 'fill-rose-600 text-rose-600' : ''}`} />
                      {isWishlisted ? 'Saved' : 'Wishlist'}
                    </button>

                    <button
                      onClick={() => setStoreLocatorProduct({ product, shade, quantity })}
                      className="py-2.5 px-2 rounded-xl bg-[#221F1F] text-[#FAF7F2] text-[11px] font-semibold flex items-center justify-center gap-1 hover:bg-[#383333] cursor-pointer"
                    >
                      <MapPin className="w-3.5 h-3.5 text-[#E8C5C1]" />
                      In Store
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: VIRTUAL MAKEUP TRY-ON STUDIO */}
      {activeTab === 'tryon' && (
        <VirtualMakeupTryOnStudio
          initialPhoto={imageDataUrl}
          analysis={effectiveAnalysis}
          recommendations={recommendations}
        />
      )}

      {/* MODAL: VIEW PRODUCT DETAILS */}
      {selectedProductModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-[#E8C5C1]">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-[#B8860B]">
                  {selectedProductModal.product.brandName} • {selectedProductModal.product.category}
                </span>
                <h3 className="text-2xl font-semibold text-[#221F1F] mt-1" style={{ fontFamily: "'Playfair Display', serif" }}>
                  {selectedProductModal.product.name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedProductModal(null)}
                className="p-2 rounded-full bg-[#FAF7F2] text-[#6E6563] hover:text-[#221F1F] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-4 p-4 rounded-2xl bg-[#FAF7F2] mb-4">
              <img
                src={getProductIllustration(
                  selectedProductModal.product.category,
                  selectedProductModal.product.brandName,
                  selectedProductModal.shade.hexColor
                )}
                alt={selectedProductModal.product.name}
                className="w-20 h-20 rounded-xl"
              />
              <div>
                <div className="text-sm font-bold text-[#221F1F]">
                  Recommended Shade: {selectedProductModal.shade.shadeNumber} — {selectedProductModal.shade.shadeName}
                </div>
                <div className="text-lg font-bold text-[#B8860B] mt-1">
                  ₹{selectedProductModal.product.priceInr}
                </div>
                <div className="text-xs text-[#6E6563] mt-0.5">
                  AI Match Score: <strong>{selectedProductModal.matchScore}%</strong> • Stock: {selectedProductModal.quantity} units
                </div>
              </div>
            </div>

            <p className="text-sm text-[#6E6563] leading-relaxed mb-4">
              {selectedProductModal.product.description}
            </p>

            <div className="grid grid-cols-2 gap-3 text-xs mb-6">
              <div className="p-3 rounded-xl bg-[#FAF7F2]">
                <span className="font-bold text-[#221F1F] block">Undertone Fit</span>
                <span className="text-[#6E6563]">{selectedProductModal.product.undertoneCompatibility?.join(', ')}</span>
              </div>
              <div className="p-3 rounded-xl bg-[#FAF7F2]">
                <span className="font-bold text-[#221F1F] block">Skin Type Fit</span>
                <span className="text-[#6E6563]">{selectedProductModal.product.skinTypeCompatibility?.join(', ')}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  const item = selectedProductModal;
                  setSelectedProductModal(null);
                  setStoreLocatorProduct(item);
                }}
                className="flex-1 py-3.5 rounded-xl bg-[#221F1F] text-[#FAF7F2] text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer"
              >
                <MapPin className="w-4 h-4 text-[#E8C5C1]" />
                Locate Aisle in Store
              </button>
              <button
                onClick={() => setSelectedProductModal(null)}
                className="px-5 py-3.5 rounded-xl bg-[#FAF7F2] border border-[#E8C5C1] text-xs font-semibold text-[#221F1F] cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: FIND IN STORE BAY LOCATOR */}
      {storeLocatorProduct && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-[#E8C5C1]">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-widest text-[#B8860B]">
                In-Store Shelf Navigation
              </span>
              <button
                onClick={() => setStoreLocatorProduct(null)}
                className="p-2 rounded-full bg-[#FAF7F2] text-[#6E6563] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <h3 className="text-xl font-semibold text-[#221F1F]" style={{ fontFamily: "'Playfair Display', serif" }}>
              {storeLocatorProduct.product.brandName} — {storeLocatorProduct.product.name}
            </h3>
            <p className="text-xs text-[#6E6563] mt-1">
              Shade: <strong>{storeLocatorProduct.shade.shadeNumber} {storeLocatorProduct.shade.shadeName}</strong>
            </p>

            {/* Visual Store Floorplan Diagram */}
            <div className="my-5 p-4 rounded-2xl bg-[#FAF7F2] border border-[#E8C5C1]">
              <div className="grid grid-cols-3 gap-2 text-center text-[11px] font-semibold mb-3">
                <div className={`p-3 rounded-xl border ${storeLocatorProduct.product.aisleLocation.includes('A1') ? 'bg-[#221F1F] text-[#FAF7F2] border-[#221F1F]' : 'bg-white text-[#6E6563] border-[#E8C5C1]'}`}>
                  Aisle A1<br />Lakmé Studio
                </div>
                <div className={`p-3 rounded-xl border ${storeLocatorProduct.product.aisleLocation.includes('B2') ? 'bg-[#221F1F] text-[#FAF7F2] border-[#221F1F]' : 'bg-white text-[#6E6563] border-[#E8C5C1]'}`}>
                  Aisle B2<br />Maybelline
                </div>
                <div className={`p-3 rounded-xl border ${storeLocatorProduct.product.aisleLocation.includes('C1') ? 'bg-[#221F1F] text-[#FAF7F2] border-[#221F1F]' : 'bg-white text-[#6E6563] border-[#E8C5C1]'}`}>
                  Aisle C1<br />L’Oréal Paris
                </div>
                <div className={`p-3 rounded-xl border ${storeLocatorProduct.product.aisleLocation.includes('D3') ? 'bg-[#221F1F] text-[#FAF7F2] border-[#221F1F]' : 'bg-white text-[#6E6563] border-[#E8C5C1]'}`}>
                  Aisle D3<br />MARS Indie
                </div>
                <div className="p-3 rounded-xl bg-[#F0E6D8] text-[#221F1F] border border-[#D8A7A3]">
                  YOU ARE HERE<br />Kiosk #01
                </div>
                <div className={`p-3 rounded-xl border ${storeLocatorProduct.product.aisleLocation.includes('E') ? 'bg-[#221F1F] text-[#FAF7F2] border-[#221F1F]' : 'bg-white text-[#6E6563] border-[#E8C5C1]'}`}>
                  Aisle E1–E2<br />Skincare Lab
                </div>
              </div>
              <div className="p-3 rounded-xl bg-white border border-[#E8C5C1] flex items-center gap-2.5 text-xs font-semibold text-[#221F1F]">
                <MapPin className="w-4 h-4 text-[#B8860B] shrink-0" />
                <span>{storeLocatorProduct.product.aisleLocation}</span>
              </div>
            </div>

            <button
              onClick={() => setStoreLocatorProduct(null)}
              className="w-full py-3 rounded-xl bg-[#221F1F] text-[#FAF7F2] text-xs font-semibold cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
