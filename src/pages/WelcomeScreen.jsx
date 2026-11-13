import React from 'react';
import {
  Sparkles, ArrowRight, Lock
} from 'lucide-react';
import { SAMPLE_PORTRAITS } from '../lib/portraits';

export const WelcomeScreen = ({ onStartCustomer, onStartRetailer, onOpenSchema }) => {
  return (
    <div className="min-h-[calc(100vh-94px)] w-full relative overflow-hidden flex flex-col justify-center bg-[#FAF7F2] text-[#221F1F]">
      {/* Subtle Warm Luxury Ambient Glow */}
      <div className="pointer-events-none absolute -top-32 -left-32 w-[520px] h-[520px] rounded-full bg-gradient-to-br from-[#E8C5C1]/30 via-[#F0E6D8]/20 to-transparent blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-24 w-[600px] h-[600px] rounded-full bg-gradient-to-tl from-[#D8A7A3]/25 via-[#F0E6D8]/30 to-transparent blur-3xl" />

      {/* Hero Container — Fluid Full-Width 2-Column Grid */}
      <div className="hero-container w-full max-w-none px-4 sm:px-6 lg:px-[3.4%] py-8 lg:py-12 grid grid-cols-1 lg:grid-cols-[1fr_1.1fr] items-center gap-8 lg:gap-[5%] my-auto relative z-10">
        {/* Left Column — Editorial Hero Content */}
        <div className="space-y-6 sm:space-y-7 lg:space-y-8">
          {/* Badge Pill */}
          <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-[#EFE4D6] border border-[#DFCFC2] text-xs font-semibold tracking-[0.18em] uppercase text-[#221F1F]">
            <Sparkles className="w-3.5 h-3.5 text-[#B8860B]" />
            <span>KLOZEVA • BEAUTY INTELLIGENCE</span>
          </div>

          {/* Large Hero Headline */}
          <h1
            className="text-5xl sm:text-6xl md:text-7xl lg:text-[76px] xl:text-[84px] font-normal tracking-[-0.02em] leading-[1.08] text-[#141212]"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Beauty That <br />
            <span className="italic text-[#9B6862]">Understands</span> You.
          </h1>

          {/* Description Paragraph */}
          <p className="text-base sm:text-lg lg:text-[19px] xl:text-[20px] text-[#6E6563] leading-[1.6] max-w-xl font-normal pt-1">
            Discover your skin. Find your perfect match. AI-powered facial undertone analysis seamlessly connected to live in-store beauty inventory and virtual shade try-on.
          </p>

          {/* Two Primary CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 pt-2">
            <button
              onClick={onStartCustomer}
              className="group flex items-center justify-center gap-3 px-8 py-4 rounded-full bg-[#141212] text-[#FAF7F2] font-semibold text-base shadow-lg shadow-[#141212]/10 hover:bg-[#2C2727] transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-[#FAF7F2]" />
              <span>Start Beauty Analysis</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              onClick={onStartRetailer}
              className="flex items-center justify-center gap-2.5 px-8 py-4 rounded-full bg-white text-[#141212] border border-[#E0D5CC] font-semibold text-base hover:bg-[#FAF7F2] transition-all cursor-pointer"
            >
              <Lock className="w-4 h-4 text-[#B8860B]" />
              <span>Retailer Login</span>
            </button>
          </div>

          {/* Performance Metrics — 3 Columns with Vertical Dividers */}
          <div className="grid grid-cols-3 pt-6 max-w-xl">
            <div className="border-r border-[#E0D5CC] pr-4 sm:pr-6 lg:pr-8">
              <div className="text-3xl lg:text-[36px] font-bold text-[#141212] leading-none" style={{ fontFamily: "'Playfair Display', serif" }}>
                96.4%
              </div>
              <div className="text-xs lg:text-[13px] text-[#7A706E] font-medium mt-2 leading-tight">
                Shade Match Precision
              </div>
            </div>

            <div className="border-r border-[#E0D5CC] px-4 sm:px-6 lg:px-8">
              <div className="text-3xl lg:text-[36px] font-bold text-[#141212] leading-none" style={{ fontFamily: "'Playfair Display', serif" }}>
                &lt; 8 Sec
              </div>
              <div className="text-xs lg:text-[13px] text-[#7A706E] font-medium mt-2 leading-tight">
                Live Kiosk Skin Scan
              </div>
            </div>

            <div className="pl-4 sm:pl-6 lg:pl-8">
              <div className="text-3xl lg:text-[36px] font-bold text-[#141212] leading-none" style={{ fontFamily: "'Playfair Display', serif" }}>
                Real-Time
              </div>
              <div className="text-xs lg:text-[13px] text-[#7A706E] font-medium mt-2 leading-tight">
                ERP &amp; Inventory Sync
              </div>
            </div>
          </div>
        </div>

        {/* Right Column — Large Live Kiosk Preview Card */}
        <div className="w-full">
          <div className="relative rounded-[28px] lg:rounded-[36px] bg-white p-6 sm:p-7 lg:p-9 shadow-[0_20px_50px_rgba(0,0,0,0.06)] border border-[#EFE8E0]/70 w-full">
            {/* Card Header */}
            <div className="flex items-center justify-between mb-4 lg:mb-5">
              <span className="text-xs lg:text-[13px] font-bold tracking-[0.16em] uppercase text-[#6E6563]">
                Live Kiosk Preview
              </span>
              <span className="px-4 py-1.5 rounded-full text-xs font-semibold bg-[#F2E5D6] text-[#221F1F]">
                Store #01 • Hyderabad
              </span>
            </div>

            {/* Inner Image Container — Wide Warm Canvas */}
            <div className="relative rounded-2xl lg:rounded-[22px] overflow-hidden bg-[#CBB39C] aspect-[1.32/1] mb-5 border border-[#E5DCD4]/40 flex items-center justify-center">
              <img
                src={SAMPLE_PORTRAITS[0].dataUrl}
                alt="Kiosk Face Scan Preview"
                className="w-full h-full object-contain"
              />

              {/* Scanning Oval Reticle Overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-[46%] h-[70%] rounded-[50%] border-2 border-dashed border-white/85" />
              </div>

              {/* Floating Detected Profile Bar */}
              <div className="absolute bottom-3 left-3 right-3 lg:bottom-4 lg:left-4 lg:right-4 bg-[#231F1F]/92 backdrop-blur-md text-white px-5 py-3.5 lg:py-4 rounded-xl lg:rounded-2xl flex items-center justify-between shadow-lg">
                <div>
                  <div className="text-[10px] lg:text-[11px] font-bold tracking-[0.18em] uppercase text-[#D2C5B8]">
                    Detected Profile
                  </div>
                  <div className="text-sm lg:text-[15px] font-semibold text-white mt-0.5">
                    Medium • Warm Undertone • Combination
                  </div>
                </div>
                <div className="px-3.5 py-1.5 lg:py-2 rounded-xl bg-[#C68618] text-white text-center min-w-[70px]">
                  <div className="text-xs lg:text-[13px] font-bold leading-tight">96%</div>
                  <div className="text-[10px] lg:text-[11px] font-semibold leading-tight mt-0.5">Match</div>
                </div>
              </div>
            </div>

            {/* Connected Brands Footer */}
            <div className="flex items-center justify-between text-xs lg:text-[13px] text-[#6E6563] pt-1">
              <span>Connected Brands: Maybelline, Lakmé, L’Oréal, MARS</span>
              <button
                onClick={onOpenSchema}
                className="underline hover:text-[#141212] text-[#3E3836] font-medium cursor-pointer transition"
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
