import React, { useState } from 'react';
import {
  Sparkles, ShieldCheck, ArrowRight, ArrowLeft, AlertTriangle
} from 'lucide-react';
import { useKLOZEVA } from '../../lib/KLOZEVAContext';

export const CustomerRegistrationStep = ({ onComplete, onBack }) => {
  const { addCustomer, showToast } = useKLOZEVA();
  const [form, setForm] = useState({
    fullName: '',
    mobile: '',
    age: '',
    gender: 'Female',
    email: '',
    consentCamera: false,
    consentProcessing: false,
    consentStorage: false,
    consentMarketing: true
  });
  const [error, setError] = useState('');

  const handleQuickFill = () => {
    setForm({
      fullName: 'Priya Sharma',
      mobile: '9876543210',
      age: '27',
      gender: 'Female',
      email: 'priya.sharma@example.in',
      consentCamera: true,
      consentProcessing: true,
      consentStorage: true,
      consentMarketing: true
    });
    setError('');
    showToast('Demo profile populated for Priya Sharma');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.fullName.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (!/^\d{10}$/.test(form.mobile.trim())) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }
    const ageNum = parseInt(form.age, 10);
    if (!ageNum || ageNum < 13 || ageNum > 100) {
      setError('Please enter a valid age between 13 and 100.');
      return;
    }
    if (!form.consentCamera || !form.consentProcessing || !form.consentStorage) {
      setError('Please accept the required camera, image processing, and analysis storage consents to continue.');
      return;
    }

    const savedCustomer = addCustomer({
      fullName: form.fullName.trim(),
      mobile: form.mobile.trim(),
      age: ageNum,
      gender: form.gender,
      email: form.email.trim(),
      consentCamera: form.consentCamera,
      consentProcessing: form.consentProcessing,
      consentStorage: form.consentStorage,
      consentMarketing: form.consentMarketing
    });

    showToast(`Welcome ${savedCustomer.fullName}! Saved to KLOZEVA CRM.`);
    onComplete(savedCustomer);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm font-medium text-[#6E6563] hover:text-[#221F1F] cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Welcome
        </button>
        <button
          type="button"
          onClick={handleQuickFill}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#F0E6D8] hover:bg-[#E8C5C1]/60 text-xs font-semibold text-[#221F1F] border border-[#D8A7A3]/50 transition cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5 text-[#B8860B]" />
          Quick Fill Demo Customer
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-[#E8C5C1]/60 shadow-xl p-6 sm:p-10">
        <div className="mb-8">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#B8860B]">
            Step 01 of 04 • Guest Check-In
          </span>
          <h2
            className="text-3xl sm:text-4xl font-semibold text-[#221F1F] mt-1"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Personalise Your Consultation
          </h2>
          <p className="text-sm text-[#6E6563] mt-1.5">
            Create your KLOZEVA Beauty Passport to unlock tailored shade matching and inventory availability.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-sm flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#221F1F] mb-2">
                Full Name *
              </label>
              <input
                type="text"
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                placeholder="e.g., Priya Sharma"
                className="w-full px-4 py-3.5 rounded-xl bg-[#FAF7F2] border border-[#E8C5C1] text-[#221F1F] focus:outline-none focus:border-[#221F1F]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#221F1F] mb-2">
                Mobile Number (10-digit) *
              </label>
              <input
                type="tel"
                maxLength={10}
                value={form.mobile}
                onChange={(e) => setForm({ ...form, mobile: e.target.value.replace(/\D/g, '') })}
                placeholder="e.g., 9876543210"
                className="w-full px-4 py-3.5 rounded-xl bg-[#FAF7F2] border border-[#E8C5C1] text-[#221F1F] focus:outline-none focus:border-[#221F1F]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#221F1F] mb-2">
                Age *
              </label>
              <input
                type="number"
                min="13"
                max="100"
                value={form.age}
                onChange={(e) => setForm({ ...form, age: e.target.value })}
                placeholder="e.g., 27"
                className="w-full px-4 py-3.5 rounded-xl bg-[#FAF7F2] border border-[#E8C5C1] text-[#221F1F] focus:outline-none focus:border-[#221F1F]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#221F1F] mb-2">
                Gender *
              </label>
              <div className="grid grid-cols-3 gap-2">
                {['Female', 'Male', 'Prefer not to say'].map((g) => (
                  <button
                    type="button"
                    key={g}
                    onClick={() => setForm({ ...form, gender: g })}
                    className={`py-3 px-2 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                      form.gender === g
                        ? 'bg-[#221F1F] text-[#FAF7F2] border-[#221F1F]'
                        : 'bg-[#FAF7F2] text-[#221F1F] border-[#E8C5C1] hover:bg-[#F0E6D8]'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#221F1F] mb-2">
              Email Address (Optional)
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="priya@example.com"
              className="w-full px-4 py-3.5 rounded-xl bg-[#FAF7F2] border border-[#E8C5C1] text-[#221F1F] focus:outline-none focus:border-[#221F1F]"
            />
          </div>

          {/* Privacy & Consent Checkboxes */}
          <div className="p-5 rounded-2xl bg-[#FAF7F2] border border-[#E8C5C1]/80 space-y-3.5">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#221F1F]">
              <ShieldCheck className="w-4 h-4 text-[#B8860B]" />
              <span>Privacy & Diagnostic Consents</span>
            </div>

            <label className="flex items-start gap-3 cursor-pointer text-sm text-[#221F1F]">
              <input
                type="checkbox"
                checked={form.consentCamera}
                onChange={(e) => setForm({ ...form, consentCamera: e.target.checked })}
                className="mt-1 w-4 h-4 accent-[#221F1F] rounded"
              />
              <span>
                <strong>Camera Access (Required):</strong> I consent to activating the kiosk camera or uploading my portrait for facial scanning.
              </span>
            </label>

            <label className="flex items-start gap-3 cursor-pointer text-sm text-[#221F1F]">
              <input
                type="checkbox"
                checked={form.consentProcessing}
                onChange={(e) => setForm({ ...form, consentProcessing: e.target.checked })}
                className="mt-1 w-4 h-4 accent-[#221F1F] rounded"
              />
              <span>
                <strong>AI Image Processing (Required):</strong> I consent to AI cosmetic analysis of my skin tone, undertone, and visible surface features.
              </span>
            </label>

            <label className="flex items-start gap-3 cursor-pointer text-sm text-[#221F1F]">
              <input
                type="checkbox"
                checked={form.consentStorage}
                onChange={(e) => setForm({ ...form, consentStorage: e.target.checked })}
                className="mt-1 w-4 h-4 accent-[#221F1F] rounded"
              />
              <span>
                <strong>Store Profile Storage (Required):</strong> Save my beauty profile and product matches in the KLOZEVA store database.
              </span>
            </label>

            <label className="flex items-start gap-3 cursor-pointer text-sm text-[#6E6563] pt-1 border-t border-[#E8C5C1]/50">
              <input
                type="checkbox"
                checked={form.consentMarketing}
                onChange={(e) => setForm({ ...form, consentMarketing: e.target.checked })}
                className="mt-1 w-4 h-4 accent-[#221F1F] rounded"
              />
              <span>
                <strong>SMS & WhatsApp Recommendations (Optional):</strong> Receive my personalised shade card and product links on mobile.
              </span>
            </label>
          </div>

          <button
            type="submit"
            className="w-full py-4 rounded-2xl bg-[#221F1F] text-[#FAF7F2] font-semibold text-base flex items-center justify-center gap-2.5 hover:bg-[#383333] transition shadow-lg cursor-pointer"
          >
            <span>Proceed to Facial Scan</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
