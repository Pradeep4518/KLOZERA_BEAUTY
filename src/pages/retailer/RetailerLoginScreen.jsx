import React, { useState } from 'react';
import { ArrowLeft, Lock, AlertTriangle, ShieldCheck } from 'lucide-react';
import { supabase, isConfigured } from '../../lib/supabase';

export const RetailerLoginScreen = ({ onSuccess, onBack }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    if (isConfigured) {
      setLoading(true);
      try {
        const { error: authError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password.trim(),
        });
        if (authError) {
          setError(authError.message || 'Authentication failed. Check your retailer credentials.');
        } else {
          onSuccess();
        }
      } catch (err) {
        setError(err.message || 'Failed to connect to authentication service.');
      } finally {
        setLoading(false);
      }
    } else {
      // Local development / kiosk offline sandbox mode
      // Notice: In commercial production, VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are required
      if (email.trim().toLowerCase().includes('admin') || email.trim().toLowerCase().includes('retailer')) {
        onSuccess();
      } else {
        setError('Local demo mode: Enter any retailer email (e.g. store@klozeva.in) to access offline analytics.');
      }
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-14">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-2 text-sm font-medium text-[#6E6563] hover:text-[#221F1F] mb-6 cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Welcome
      </button>

      <div className="bg-white rounded-3xl border border-[#E8C5C1]/80 p-8 shadow-xl">
        <div className="w-12 h-12 rounded-2xl bg-[#221F1F] text-[#E8C5C1] flex items-center justify-center mb-5">
          <Lock className="w-5 h-5" />
        </div>
        <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#B8860B]">
          Retailer Intelligence Portal
        </span>
        <h2 className="text-3xl font-semibold text-[#221F1F] mt-1" style={{ fontFamily: "'Playfair Display', serif" }}>
          Store Manager Sign In
        </h2>
        <p className="text-xs text-[#6E6563] mt-1.5 mb-6">
          Access real-time kiosk analytics, live product inventory, and customer beauty CRM.
        </p>

        {!isConfigured ? (
          <div className="mb-5 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold">Local Offline Kiosk Mode</p>
              <p className="text-[11px] text-amber-800 mt-0.5">
                Supabase backend credentials are not set in environment. Running in zero-persistence local mode.
              </p>
            </div>
          </div>
        ) : (
          <div className="mb-5 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Secured via Production Supabase Auth</span>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#221F1F] mb-1.5">
              Retailer Email
            </label>
            <input
              type="email"
              value={email}
              placeholder="manager@store.com"
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-[#FAF7F2] border border-[#E8C5C1] text-sm"
              autoComplete="email"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#221F1F] mb-1.5">
              Password
            </label>
            <input
              type="password"
              value={password}
              placeholder="••••••••••••"
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-[#FAF7F2] border border-[#E8C5C1] text-sm"
              autoComplete="current-password"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-[#221F1F] text-[#FAF7F2] font-semibold text-sm hover:bg-[#383333] transition cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : 'Sign In as Store Manager'}
          </button>
        </form>
      </div>
    </div>
  );
};
