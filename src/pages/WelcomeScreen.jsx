import React from 'react';
import {
  Sparkles, ArrowRight, Lock
} from 'lucide-react';
import { SAMPLE_PORTRAITS } from '../lib/portraits';

export const WelcomeScreen = ({ onStartCustomer, onStartRetailer, onOpenSchema }) => {
  return (
    <div className="min-h-[calc(100vh-64px)] relative overflow-hidden flex flex-col justify-between bg-[#FAF7F2] text-[#221F1F]">
      {/* Ambient Luxury Gradients */}
      <div className="pointer-events-none absolute -top-32 -left-32 w-[520px] h-[520px] rounded-full bg-gradient-to-br from-[#E8C5C1]/55 via-[#F0E6D8]/40 to-transparent blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-24 w-[600px] h-[600px] rounded-full bg-gradient-to-tl from-[#D8A7A3]/45 via-[#F0E6D8]/60 to-transparent blur-3xl" />

      <div className="relative z-10 max-w-7xl mx-auto w-full px-6 py-12 lg:py-20 grid lg:grid-cols-12 gap-12 items-center my-auto">
        {/* Left Editorial Hero */}
        <div className="lg:col-span-7 space-y-8">
          <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-[#F0E6D8] border border-[#D8A7A3]/40 text-xs font-semibold tracking-[0.2em] uppercase text-[#221F1F]">
            <Sparkles className="w-3.5 h-3.5 text-[#B8860B]" />
            <span>KLOZEVA • BEAUTY INTELLIGENCE</span>
          </div>

          <h1
            className="text-5xl sm:text-6xl lg:text-7xl font-semibold tracking-tight leading-[1.06] text-[#221F1F]"
            style={{ fontFamily: "'Playfair Display', 'Cormorant Garamond', serif" }}
          >
            Beauty That <br />
            <span className="italic font-normal text-[#8E5B56]">Understands</span> You.
          </h1>

          <p className="text-lg sm:text-xl text-[#6E6563] max-w-xl leading-relaxed font-normal">
            Discover your skin. Find your perfect match. AI-powered facial undertone analysis seamlessly connected to live in-store beauty inventory and virtual shade try-on.
          </p>

          {/* Two Primary CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 pt-2">
            <button
              onClick={onStartCustomer}
              className="group flex items-center justify-center gap-3 px-8 py-4.5 rounded-2xl bg-[#221F1F] text-[#FAF7F2] font-semibold text-base shadow-xl shadow-[#221F1F]/15 hover:bg-[#363131] transition-all cursor-pointer"
            >
              <Sparkles className="w-5 h-5 text-[#E8C5C1]" />
              <span>Start Beauty Analysis</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              onClick={onStartRetailer}
              className="flex items-center justify-center gap-3 px-8 py-4.5 rounded-2xl bg-white/85 backdrop-blur-sm text-[#221F1F] border border-[#D8A7A3]/70 font-semibold text-base hover:bg-[#F0E6D8]/70 transition-all cursor-pointer"
            >
              <Lock className="w-4 h-4 text-[#B8860B]" />
              <span>Retailer Login</span>
            </button>
          </div>

          {/* Investor & Store Value Pillars */}
          <div className="grid grid-cols-3 gap-4 pt-6 border-t border-[#E8C5C1]/50 max-w-xl">
            <div>
              <div className="text-2xl font-bold text-[#221F1F]" style={{ fontFamily: "'Playfair Display', serif" }}>
                96.4%
              </div>
              <div className="text-xs text-[#6E6563] mt-0.5">Shade Match Precision</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-[#221F1F]" style={{ fontFamily: "'Playfair Display', serif" }}>
                &lt; 8 Sec
              </div>
              <div className="text-xs text-[#6E6563] mt-0.5">Live Kiosk Skin Scan</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-[#221F1F]" style={{ fontFamily: "'Playfair Display', serif" }}>
                Real-Time
              </div>
              <div className="text-xs text-[#6E6563] mt-0.5">ERP & Inventory Sync</div>
            </div>
          </div>
        </div>

        {/* Right Interactive Preview Card */}
        <div className="lg:col-span-5">
          <div className="relative rounded-3xl bg-white/80 backdrop-blur-md border border-[#E8C5C1]/60 p-6 sm:p-8 shadow-2xl shadow-[#221F1F]/5">
            <div className="flex items-center justify-between mb-5">
              <span className="text-xs font-semibold uppercase tracking-widest text-[#6E6563]">
                Live Kiosk Preview
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-[#F0E6D8] text-[#221F1F]">
                Store #01 • Hyderabad
              </span>
            </div>

            <div className="relative rounded-2xl overflow-hidden bg-[#F0E6D8] aspect-[4/4.3] mb-6 border border-[#E8C5C1]/50">
              <img
                src={SAMPLE_PORTRAITS[0].dataUrl}
                alt="Kiosk Face Scan Preview"
                className="w-full h-full object-cover"
              />
              {/* Scanning Reticle Overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-48 h-64 rounded-[100px] border-2 border-dashed border-[#FAF7F2] shadow-[0_0_0_9999px_rgba(34,31,31,0.16)]" />
              </div>
              <div className="absolute bottom-3 left-3 right-3 bg-[#221F1F]/85 backdrop-blur-md text-[#FAF7F2] p-3.5 rounded-xl flex items-center justify-between">
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-[#E8C5C1]">Detected Profile</div>
                  <div className="text-sm font-semibold">Medium • Warm Undertone • Combination</div>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-[#B8860B] text-white text-xs font-bold">
                  96% Match
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-[#6E6563]">
              <span>Connected Brands: Maybelline, Lakmé, L’Oréal, MARS</span>
              <button
                onClick={onOpenSchema}
                className="underline hover:text-[#221F1F] font-medium cursor-pointer"
              >
                Inspect 9-Table DB
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
