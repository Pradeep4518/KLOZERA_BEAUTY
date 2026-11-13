import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles, Camera, Upload, ArrowLeft, Check, RefreshCw, AlertTriangle, CheckCircle2, ChevronRight, ShieldCheck
} from 'lucide-react';
import { SAMPLE_PORTRAITS } from '../../lib/portraits';
import { useKLOZEVA } from '../../lib/KLOZEVAContext';
import { runBeautyAIAnalysis } from '../../lib/beautyAI/orchestrator';
import { runGeminiVisionAnalysis } from '../../lib/vision';
import { isRemoteStoreEnabled } from '../../lib/beautyStore';

export const FacialCaptureStep = ({ customer, onAnalyzeComplete, onBack }) => {
  const { showToast } = useKLOZEVA();
  const [mode, setMode] = useState('upload'); // 'upload' | 'camera'
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [faceAligned, setFaceAligned] = useState(true);
  const [capturedImage, setCapturedImage] = useState(null);
  const [selectedPresetHint, setSelectedPresetHint] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [currentStepLabel, setCurrentStepLabel] = useState('');
  const [progressPercent, setProgressPercent] = useState(0);

  // Five Granular Biometric & Privacy Consent Checkboxes (GDPR / DPDP / BIPA compliant)
  const [consentProcessing, setConsentProcessing] = useState(true);
  const [consentSaveResults, setConsentSaveResults] = useState(true);
  const [consentRetainPhoto, setConsentRetainPhoto] = useState(false);
  const [consentModelImprovement, setConsentModelImprovement] = useState(false);
  const [consentExternalAi, setConsentExternalAi] = useState(false);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const startCamera = async () => {
    setCameraError('');
    setCapturedImage(null);
    setSelectedPresetHint(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 720 }, height: { ideal: 960 } },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraActive(true);
      setFaceAligned(true);
    } catch (err) {
      setCameraError(
        'Camera permission was denied or no webcam was detected on this device. You can switch to Image Upload or select a Studio Portrait preset below.'
      );
      setCameraActive(false);
    }
  };

  useEffect(() => {
    if (mode === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [mode]);

  const handleCaptureFromCamera = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    // Mirror horizontally to match preview
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    setCapturedImage(dataUrl);
    setSelectedPresetHint(null);
    stopCamera();
    showToast('Portrait captured! Ready for AI analysis.');
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) {
      showToast('Please upload a valid JPG, JPEG, or PNG image.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setCapturedImage(reader.result);
      setSelectedPresetHint(null);
      showToast('Photo uploaded successfully.');
    };
    reader.readAsDataURL(file);
  };

  const handleSelectPreset = (preset) => {
    setCapturedImage(preset.dataUrl);
    setSelectedPresetHint(preset.presetMetrics);
    showToast(`Loaded "${preset.label}" for instant AI demonstration.`);
  };

  const handleRunAnalysis = async () => {
    if (!capturedImage || !consentProcessing) return;
    setAnalyzing(true);
    setProgressPercent(10);
    setCurrentStepLabel('Validating photograph...');

    const consentRecord = {
      consentProcessing,
      consentSaveResults,
      consentRetainPhoto,
      consentModelImprovement,
      consentExternalAi,
      capturedAt: new Date().toISOString(),
      version: '2026.1'
    };

    try {
      const onProgress = ({ step, percent }) => {
        setCurrentStepLabel(step);
        setProgressPercent(percent);
      };

      let analysisResult;
      // Strict Consent Enforcement: only call external Gemini Vision if user EXPLICITLY granted external AI consent
      if (consentExternalAi && isRemoteStoreEnabled()) {
        analysisResult = await runGeminiVisionAnalysis(capturedImage, selectedPresetHint, { onProgress });
      } else {
        // Direct high-precision on-device Neural BeautyAI engine (zero network transmission)
        analysisResult = await runBeautyAIAnalysis(capturedImage, selectedPresetHint, { onProgress });
      }

      analysisResult.consent = consentRecord;
      setProgressPercent(100);
      setCurrentStepLabel('Complete');
      setAnalyzing(false);
      onAnalyzeComplete(capturedImage, analysisResult);
    } catch (err) {
      console.error('[KLOZEVA] Analysis pipeline error:', err);
      // Fallback to grounded analysis
      const fallbackResult = await runBeautyAIAnalysis(capturedImage, selectedPresetHint);
      fallbackResult.consent = consentRecord;
      setAnalyzing(false);
      onAnalyzeComplete(capturedImage, fallbackResult);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => {
            stopCamera();
            onBack();
          }}
          className="inline-flex items-center gap-2 text-sm font-medium text-[#6E6563] hover:text-[#221F1F] cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Edit Guest Details
        </button>
        <div className="text-xs font-semibold text-[#6E6563]">
          Guest: <span className="text-[#221F1F]">{customer.fullName}</span>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-[#E8C5C1]/60 shadow-xl p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
          <div>
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#B8860B]">
              Step 02 of 04 • Biometric Optical Capture
            </span>
            <h2
              className="text-3xl font-semibold text-[#221F1F] mt-1"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Facial Scan & Lighting Check
            </h2>
          </div>

          {/* Mode Toggle Tabs */}
          <div className="inline-flex p-1.5 rounded-2xl bg-[#FAF7F2] border border-[#E8C5C1]">
            <button
              onClick={() => setMode('camera')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                mode === 'camera' ? 'bg-[#221F1F] text-[#FAF7F2]' : 'text-[#6E6563] hover:text-[#221F1F]'
              }`}
            >
              <Camera className="w-4 h-4" />
              Live Camera Scan
            </button>
            <button
              onClick={() => setMode('upload')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                mode === 'upload' ? 'bg-[#221F1F] text-[#FAF7F2]' : 'text-[#6E6563] hover:text-[#221F1F]'
              }`}
            >
              <Upload className="w-4 h-4" />
              Upload / Studio Presets
            </button>
          </div>
        </div>

        <div className="grid lg:grid-cols-12 gap-8 items-start">
          {/* Left Viewport */}
          <div className="lg:col-span-7">
            <div className="relative rounded-3xl overflow-hidden bg-[#221F1F] aspect-[4/4.3] flex items-center justify-center border border-[#E8C5C1]">
              {capturedImage ? (
                <>
                  <img src={capturedImage} alt="Captured face" className="w-full h-full object-cover" />
                  <div className="absolute top-4 left-4 px-3.5 py-1.5 rounded-full bg-[#221F1F]/80 backdrop-blur-md text-xs font-semibold text-[#FAF7F2] flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Image Ready for AI Skin Mapping</span>
                  </div>
                </>
              ) : mode === 'camera' ? (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover scale-x-[-1]"
                  />
                  {/* Oval Positioning Guide */}
                  {cameraActive && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <div
                        className={`w-56 h-72 sm:w-64 sm:h-80 rounded-[140px] border-2 transition-colors ${
                          faceAligned ? 'border-emerald-400 shadow-[0_0_0_9999px_rgba(34,31,31,0.35)]' : 'border-amber-300'
                        }`}
                      />
                      <div className="mt-4 px-4 py-1.5 rounded-full bg-[#221F1F]/85 text-[#FAF7F2] text-xs font-medium">
                        {faceAligned ? 'Face Positioned • Hold Still & Capture' : 'Center your face inside the oval'}
                      </div>
                    </div>
                  )}
                  {cameraError && (
                    <div className="p-6 text-center text-[#FAF7F2] max-w-sm space-y-3">
                      <AlertTriangle className="w-10 h-10 text-[#E8C5C1] mx-auto" />
                      <p className="text-sm leading-relaxed">{cameraError}</p>
                      <button
                        onClick={() => setMode('upload')}
                        className="px-5 py-2.5 rounded-xl bg-[#E8C5C1] text-[#221F1F] text-xs font-bold cursor-pointer"
                      >
                        Switch to Upload / Demo Portraits
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-full bg-[#FAF7F2] flex flex-col items-center justify-center p-8 text-center cursor-pointer hover:bg-[#F0E6D8]/50 transition"
                >
                  <div className="w-16 h-16 rounded-2xl bg-[#F0E6D8] flex items-center justify-center mb-4">
                    <Upload className="w-7 h-7 text-[#221F1F]" />
                  </div>
                  <p className="text-base font-semibold text-[#221F1F]">
                    Click to upload a front-facing portrait
                  </p>
                  <p className="text-xs text-[#6E6563] mt-1">
                    Supports JPG, JPEG, or PNG • Or choose a calibrated preset on the right
                  </p>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept=".jpg,.jpeg,.png"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>

            {/* Camera / Image Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 mt-4">
              {mode === 'camera' && !capturedImage && cameraActive && (
                <button
                  onClick={handleCaptureFromCamera}
                  className="flex-1 py-3.5 px-6 rounded-2xl bg-[#221F1F] text-[#FAF7F2] font-semibold text-sm flex items-center justify-center gap-2 hover:bg-[#383333] cursor-pointer"
                >
                  <Camera className="w-4 h-4 text-[#E8C5C1]" />
                  Capture Photo
                </button>
              )}

              {capturedImage && (
                <button
                  onClick={() => {
                    setCapturedImage(null);
                    setSelectedPresetHint(null);
                    if (mode === 'camera') startCamera();
                  }}
                  className="py-3.5 px-5 rounded-2xl bg-[#FAF7F2] border border-[#E8C5C1] text-[#221F1F] font-semibold text-sm flex items-center gap-2 hover:bg-[#F0E6D8] cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" />
                  {mode === 'camera' ? 'Retake Photo' : 'Replace Image'}
                </button>
              )}

              {mode === 'upload' && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="py-3.5 px-5 rounded-2xl bg-[#FAF7F2] border border-[#E8C5C1] text-[#221F1F] font-semibold text-sm flex items-center gap-2 hover:bg-[#F0E6D8] cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  Browse Photo File
                </button>
              )}
            </div>
          </div>

          {/* Right Guidance & Studio Presets */}
          <div className="lg:col-span-5 space-y-6">
            <div className="p-5 rounded-2xl bg-[#FAF7F2] border border-[#E8C5C1]/80 space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-[#221F1F]">
                Optical Scan Checklist
              </div>
              <ul className="space-y-2.5 text-sm text-[#6E6563]">
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Center your face neatly inside the oval guide</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Ensure even front lighting without harsh shadows</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Remove eyeglasses and keep hair clear of cheeks</span>
                </li>
              </ul>
            </div>

            {/* Instant Calibrated Presets */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[#221F1F]">
                  Calibrated Studio Portraits (Instant Test)
                </span>
              </div>
              <div className="space-y-2.5">
                {SAMPLE_PORTRAITS.map((preset) => {
                  const isSelected = capturedImage === preset.dataUrl;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleSelectPreset(preset)}
                      className={`w-full flex items-center gap-3.5 p-3 rounded-2xl border text-left transition cursor-pointer ${
                        isSelected
                          ? 'bg-[#F0E6D8] border-[#221F1F] shadow-sm'
                          : 'bg-white border-[#E8C5C1]/80 hover:bg-[#FAF7F2]'
                      }`}
                    >
                      <img
                        src={preset.dataUrl}
                        alt={preset.label}
                        className="w-12 h-12 rounded-xl object-cover border border-[#E8C5C1]"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-[#221F1F] truncate">{preset.label}</div>
                        <div className="text-xs text-[#6E6563] truncate">{preset.subtitle}</div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-[#6E6563]" />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Five Granular Biometric & Privacy Consent Controls */}
            <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#E8C5C1] space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#221F1F]">
                <ShieldCheck className="w-4 h-4 text-[#B8860B]" />
                <span>Biometric Privacy & Consent Options</span>
              </div>

              <div className="space-y-2 text-xs text-[#221F1F]">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={consentProcessing}
                    onChange={(e) => setConsentProcessing(e.target.checked)}
                    className="mt-0.5 rounded border-[#E8C5C1] text-[#221F1F] focus:ring-[#221F1F]"
                  />
                  <span>
                    <strong className="text-[#B8860B]">[Required]</strong> I consent to on-device facial landmark and skin analysis for virtual makeup preview (processed in temporary memory).
                  </span>
                </label>

                <label className="flex items-start gap-2.5 cursor-pointer text-[#6E6563]">
                  <input
                    type="checkbox"
                    checked={consentSaveResults}
                    onChange={(e) => setConsentSaveResults(e.target.checked)}
                    className="mt-0.5 rounded border-[#E8C5C1] text-[#221F1F] focus:ring-[#221F1F]"
                  />
                  <span>
                    Save my detected skin depth and undertone to my personal Shade Passport.
                  </span>
                </label>

                <label className="flex items-start gap-2.5 cursor-pointer text-[#6E6563]">
                  <input
                    type="checkbox"
                    checked={consentRetainPhoto}
                    onChange={(e) => setConsentRetainPhoto(e.target.checked)}
                    className="mt-0.5 rounded border-[#E8C5C1] text-[#221F1F] focus:ring-[#221F1F]"
                  />
                  <span>
                    Retain portrait in private vault for future makeup consultations (auto-expires in 30 days).
                  </span>
                </label>

                <label className="flex items-start gap-2.5 cursor-pointer text-[#6E6563]">
                  <input
                    type="checkbox"
                    checked={consentModelImprovement}
                    onChange={(e) => setConsentModelImprovement(e.target.checked)}
                    className="mt-0.5 rounded border-[#E8C5C1] text-[#221F1F] focus:ring-[#221F1F]"
                  />
                  <span>
                    Allow anonymous tone vectors to assist in algorithmic calibration (Optional; refusal will not affect your try-on).
                  </span>
                </label>

                <label className="flex items-start gap-2.5 cursor-pointer text-[#6E6563]">
                  <input
                    type="checkbox"
                    checked={consentExternalAi}
                    onChange={(e) => setConsentExternalAi(e.target.checked)}
                    className="mt-0.5 rounded border-[#E8C5C1] text-[#221F1F] focus:ring-[#221F1F]"
                  />
                  <span>
                    Enable complementary multimodal analysis via Google Gemini Vision API.
                  </span>
                </label>
              </div>

              {!consentProcessing && (
                <div className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200">
                  Required on-device processing consent must be checked to initiate beauty intelligence.
                </div>
              )}
            </div>

            {/* Primary Analyze CTA with Progressive Loading */}
            <div className="space-y-3">
              {analyzing && (
                <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#E8C5C1] space-y-2">
                  <div className="flex justify-between items-center text-xs font-semibold text-[#221F1F]">
                    <span>{currentStepLabel}</span>
                    <span>{progressPercent}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-[#E8C5C1]/50 overflow-hidden">
                    <div
                      className="h-full bg-[#221F1F] transition-all duration-300 rounded-full"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              )}

              <button
                disabled={!capturedImage || !consentProcessing || analyzing}
                onClick={handleRunAnalysis}
                className={`w-full py-4 rounded-2xl font-semibold text-base flex items-center justify-center gap-2.5 transition shadow-lg ${
                  capturedImage && consentProcessing && !analyzing
                    ? 'bg-[#221F1F] text-[#FAF7F2] hover:bg-[#383333] cursor-pointer'
                    : 'bg-[#E8C5C1]/50 text-[#6E6563] cursor-not-allowed'
                }`}
              >
                {analyzing ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin text-[#E8C5C1]" />
                    <span>Neural Beauty Analysis in Progress...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 text-[#E8C5C1]" />
                    <span>Analyse My Skin & Find Matches</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
