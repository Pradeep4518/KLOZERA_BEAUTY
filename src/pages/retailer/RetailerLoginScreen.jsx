import React, { useState } from 'react';
import { ArrowLeft, Lock, AlertTriangle, ShieldCheck, KeyRound, Mail } from 'lucide-react';
import { supabase, isConfigured } from '../../lib/supabase';

export const RetailerLoginScreen = ({ onSuccess, onBack }) => {
  const [view, setView] = useState('login'); // 'login' | 'mfa' | 'reset'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [factorId, setFactorId] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const isProductionCloud = (
    typeof import.meta !== 'undefined' &&
    (import.meta.env?.VITE_APP_MODE === 'production' || import.meta.env?.VITE_BEAUTY_BACKEND === 'supabase')
  );

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    // Fail-Closed Gate: Cloud production forbids unauthenticated bypass
    if (isProductionCloud && !isConfigured) {
      setError('Production Security Violation: Supabase Authentication service is unconfigured. Offline bypass is disabled in cloud production mode.');
      return;
    }

    if (isConfigured) {
      setLoading(true);
      try {
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password.trim(),
        });

        if (authError) {
          setError(authError.message || 'Authentication failed. Invalid email or password.');
          return;
        }

        const user = authData?.user;
        if (!user) {
          setError('Authentication failed. No user identity returned.');
          return;
        }

        // Check Multi-Factor Authentication (MFA / TOTP) Assurance Level
        if (supabase.auth?.mfa) {
          const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
          if (aalData?.currentLevel === 'aal1' && aalData?.nextLevel === 'aal2') {
            const { data: factors } = await supabase.auth.mfa.listFactors();
            const totpFactor = factors?.totp?.[0];
            if (totpFactor) {
              setFactorId(totpFactor.id);
              setView('mfa');
              return;
            }
          }
        }

        // Backend Role Verification: Ensure account is an authorized retailer or admin
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, is_suspended')
          .eq('id', user.id)
          .single();

        if (profile?.is_suspended) {
          await supabase.auth.signOut();
          setError('Account Suspended: Your retailer access has been deactivated by the platform administrator.');
          return;
        }

        const { data: members } = await supabase
          .from('business_members')
          .select('business_id, member_role')
          .eq('user_id', user.id);

        const hasRetailerPrivilege = (
          profile?.role === 'admin' ||
          profile?.role === 'retailer' ||
          (Array.isArray(members) && members.length > 0)
        );

        if (!hasRetailerPrivilege) {
          await supabase.auth.signOut();
          setError('Access Denied: This account is not registered as an authorized store manager or staff member.');
          return;
        }

        onSuccess();
      } catch (err) {
        setError(err.message || 'Failed to connect to authentication service.');
      } finally {
        setLoading(false);
      }
    } else {
      // Local Kiosk Offline Development Mode
      // STRICTLY gated: Only allowed when NOT in production cloud mode
      if (email.trim().toLowerCase().includes('admin') || email.trim().toLowerCase().includes('retailer')) {
        onSuccess();
      } else {
        setError('Local Kiosk Mode: Enter an authorized store email (e.g. store@klozeva.in) to access local analytics.');
      }
    }
  };

  const handleVerifyMfa = async (e) => {
    e.preventDefault();
    setError('');

    if (!totpCode || totpCode.trim().length < 6) {
      setError('Please enter your 6-digit authenticator code.');
      return;
    }

    setLoading(true);
    try {
      const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
        factorId,
        code: totpCode.trim()
      });

      if (verifyError) {
        setError(verifyError.message || 'Invalid authenticator code. Please check your app.');
      } else {
        onSuccess();
      }
    } catch (err) {
      setError(err.message || 'MFA verification failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!email) {
      setError('Please enter your registered email address.');
      return;
    }

    if (!isConfigured) {
      setError('Password reset requires active Supabase backend service.');
      return;
    }

    setLoading(true);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/retailer/reset-password`
      });

      if (resetError) {
        setError(resetError.message || 'Unable to send password reset email.');
      } else {
        setSuccessMessage('Password recovery link dispatched. Check your retailer inbox.');
      }
    } catch (err) {
      setError(err.message || 'Failed to initiate password reset.');
    } finally {
      setLoading(false);
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
          {view === 'mfa' ? <KeyRound className="w-5 h-5" /> : view === 'reset' ? <Mail className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
        </div>
        <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#B8860B]">
          Retailer Intelligence Portal
        </span>
        <h2 className="text-3xl font-semibold text-[#221F1F] mt-1" style={{ fontFamily: "'Playfair Display', serif" }}>
          {view === 'mfa' ? 'Two-Factor Authentication' : view === 'reset' ? 'Reset Password' : 'Store Manager Sign In'}
        </h2>
        <p className="text-xs text-[#6E6563] mt-1.5 mb-6">
          {view === 'mfa'
            ? 'Enter the 6-digit TOTP code from your authenticator app to verify your identity.'
            : view === 'reset'
            ? 'We will send a secure password recovery link to your registered email.'
            : 'Access real-time kiosk analytics, live product inventory, and customer beauty CRM.'}
        </p>

        {/* Security Environment Banner */}
        {!isConfigured ? (
          <div className="mb-5 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold">Local Offline Kiosk Mode</p>
              <p className="text-[11px] text-amber-800 mt-0.5">
                Supabase credentials unconfigured. Local offline kiosk session active. Fail-closed in cloud production.
              </p>
            </div>
          </div>
        ) : (
          <div className="mb-5 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Secured via Production Supabase Auth (AAL2 MFA Ready)</span>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
            {successMessage}
          </div>
        )}

        {/* Primary Login Form */}
        {view === 'login' && (
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
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-[#221F1F]">
                  Password
                </label>
                {isConfigured && (
                  <button
                    type="button"
                    onClick={() => { setError(''); setSuccessMessage(''); setView('reset'); }}
                    className="text-xs text-[#B8860B] hover:underline cursor-pointer"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
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
        )}

        {/* MFA TOTP Challenge Form */}
        {view === 'mfa' && (
          <form onSubmit={handleVerifyMfa} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#221F1F] mb-1.5">
                6-Digit Security Code
              </label>
              <input
                type="text"
                pattern="[0-9]*"
                maxLength={6}
                value={totpCode}
                placeholder="123456"
                onChange={(e) => setTotpCode(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-[#FAF7F2] border border-[#E8C5C1] text-center tracking-[0.3em] font-mono text-lg font-bold"
                autoFocus
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-[#221F1F] text-[#FAF7F2] font-semibold text-sm hover:bg-[#383333] transition cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Verifying Code...' : 'Verify & Enter Portal'}
            </button>
            <button
              type="button"
              onClick={() => { setView('login'); setError(''); }}
              className="w-full text-center text-xs text-[#6E6563] hover:text-[#221F1F] cursor-pointer"
            >
              Back to Email & Password
            </button>
          </form>
        )}

        {/* Password Reset Form */}
        {view === 'reset' && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#221F1F] mb-1.5">
                Registered Retailer Email
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
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-[#221F1F] text-[#FAF7F2] font-semibold text-sm hover:bg-[#383333] transition cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Dispatching...' : 'Send Password Recovery Link'}
            </button>
            <button
              type="button"
              onClick={() => { setView('login'); setError(''); setSuccessMessage(''); }}
              className="w-full text-center text-xs text-[#6E6563] hover:text-[#221F1F] cursor-pointer"
            >
              Return to Sign In
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
