import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Sparkles, Download
} from 'lucide-react';
import { useKLOZEVA } from '../../lib/KLOZEVAContext';
import {
  renderFoundation,
  renderEyeshadow,
  renderBlush,
  renderLipstick,
  createCoordMapper
} from '../../lib/beautyAI';

export const VirtualMakeupTryOnStudio = ({ initialPhoto, analysis, recommendations = [] }) => {
  const { showToast } = useKLOZEVA();
  const [sourceMode, setSourceMode] = useState('photo'); // 'photo' | 'live'
  const [liveReady, setLiveReady] = useState(false);
  const [mirrorCamera, setMirrorCamera] = useState(true);
  const [splitPercent, setSplitPercent] = useState(100);
  const [holdOriginal, setHoldOriginal] = useState(false);

  // MediaPipe FaceLandmarker Status & Multi-Layer Offscreen Mask Buffers
  const [detectorStatus, setDetectorStatus] = useState('initializing'); // 'initializing' | 'mediapipe-ready' | 'smart-geometry'
  const [faceDetected, setFaceDetected] = useState(false);
  const landmarkerRef = useRef(null);
  const detectedLandmarksRef = useRef(null);
  const smoothedLandmarksRef = useRef(null);
  const offscreenMaskCanvasRef = useRef(null);
  const offscreenLayerCanvasRef = useRef(null);

  // Cosmetic Layer States (0% to 100% intensity — independent layers, initialized to customer's AI match)
  const initialFndRec = recommendations.find((r) => r.product.category === 'Foundation');
  const [foundation, setFoundation] = useState(() =>
    initialFndRec
      ? {
          name: `${initialFndRec.shade.shadeName} ${initialFndRec.shade.shadeNumber}`,
          hex: initialFndRec.shade.hexColor,
          intensity: 42
        }
      : { name: 'Natural Buff 230', hex: '#C9936B', intensity: 40 }
  );
  const [lipstick, setLipstick] = useState({ name: 'Terracotta Kiss', hex: '#B45643', intensity: 68, finish: 'satin' });
  const [blush, setBlush] = useState({ name: 'Sunlit Coral', hex: '#E56B5B', intensity: 46 });
  const [eyeshadow, setEyeshadow] = useState({ name: 'Bronze Shimmer', hex: '#8D583A', intensity: 58, shimmer: true });

  // Internal fallback anatomical coordinates (never rendered as visible dots or mesh)
  const fallbackAnatomyRef = useRef({
    faceTop: { x: 0.5, y: 0.165 },
    faceChin: { x: 0.5, y: 0.642 },
    leftEye: { x: 0.4, y: 0.374 },
    rightEye: { x: 0.6, y: 0.374 },
    leftCheek: { x: 0.355, y: 0.432 },
    rightCheek: { x: 0.645, y: 0.432 },
    lipCenter: { x: 0.5, y: 0.543 },
    lipWidth: 0.132
  });

  const canvasRef = useRef(null);
  const videoRef = useRef(null);
  const photoImgRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);

  // Initialize offscreen compositing canvases once
  useEffect(() => {
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = 640;
    maskCanvas.height = 720;
    offscreenMaskCanvasRef.current = maskCanvas;

    const layerCanvas = document.createElement('canvas');
    layerCanvas.width = 640;
    layerCanvas.height = 720;
    offscreenLayerCanvasRef.current = layerCanvas;
  }, []);

  // Load MediaPipe Tasks Vision FaceLandmarker (478-point 3D facial mesh)
  useEffect(() => {
    let cancelled = false;
    const initFaceLandmarker = async () => {
      const originalConsoleError = console.error;
      console.error = (...args) => {
        const firstArg = typeof args[0] === 'string' ? args[0] : '';
        if (firstArg.includes('INFO:') || firstArg.includes('TensorFlow Lite XNNPACK delegate')) {
          return;
        }
        originalConsoleError.apply(console, args);
      };

      try {
        const vision = await import(/* @vite-ignore */ 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/+esm');
        const fileset = await vision.FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
        );
        const landmarker = await vision.FaceLandmarker.createFromOptions(fileset, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
            delegate: 'GPU'
          },
          runningMode: 'IMAGE',
          numFaces: 1,
          minFaceDetectionConfidence: 0.5,
          minFacePresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
          outputFaceBlendshapes: false,
          outputFacialTransformationMatrixes: false
        });
        if (!cancelled) {
          landmarkerRef.current = landmarker;
          setDetectorStatus('mediapipe-ready');
        }
      } catch (err) {
        // Fallback to CPU delegate if GPU delegate is unavailable in current browser
        try {
          const vision = await import(/* @vite-ignore */ 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/+esm');
          const fileset = await vision.FilesetResolver.forVisionTasks(
            'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
          );
          const cpuLandmarker = await vision.FaceLandmarker.createFromOptions(fileset, {
            baseOptions: {
              modelAssetPath:
                'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
              delegate: 'CPU'
            },
            runningMode: 'IMAGE',
            numFaces: 1
          });
          if (!cancelled) {
            landmarkerRef.current = cpuLandmarker;
            setDetectorStatus('mediapipe-ready');
          }
        } catch (cpuErr) {
          if (!cancelled) {
            setDetectorStatus('smart-geometry');
          }
        }
      } finally {
        console.error = originalConsoleError;
      }
    };
    initFaceLandmarker();
    return () => {
      cancelled = true;
    };
  }, []);

  // Exponential temporal smoothing on landmarks to prevent jitter during live webcam tracking
  const smoothLandmarks = (rawLm) => {
    if (!rawLm || rawLm.length < 468) return null;
    const prev = smoothedLandmarksRef.current;
    if (!prev || prev.length !== rawLm.length) {
      smoothedLandmarksRef.current = rawLm.map((p) => ({ x: p.x, y: p.y, z: p.z || 0 }));
      return smoothedLandmarksRef.current;
    }
    const alpha = 0.72; // Responsive yet jitter-free tracking
    for (let i = 0; i < rawLm.length; i++) {
      prev[i].x = prev[i].x * (1 - alpha) + rawLm[i].x * alpha;
      prev[i].y = prev[i].y * (1 - alpha) + rawLm[i].y * alpha;
      prev[i].z = (prev[i].z || 0) * (1 - alpha) + (rawLm[i].z || 0) * alpha;
    }
    return prev;
  };

  // Load uploaded/captured photo and run MediaPipe FaceLandmarker detection
  useEffect(() => {
    if (!initialPhoto) return;
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = async () => {
      photoImgRef.current = img;
      detectedLandmarksRef.current = null;
      smoothedLandmarksRef.current = null;

      if (initialPhoto.startsWith('data:image/svg+xml')) {
        fallbackAnatomyRef.current = {
          faceTop: { x: 0.5, y: 0.165 },
          faceChin: { x: 0.5, y: 0.642 },
          leftEye: { x: 0.4, y: 0.374 },
          rightEye: { x: 0.6, y: 0.374 },
          leftCheek: { x: 0.375, y: 0.462 },
          rightCheek: { x: 0.625, y: 0.462 },
          lipCenter: { x: 0.5, y: 0.543 },
          lipWidth: 0.132
        };
        setFaceDetected(true);
        renderTryOnFrame();
        return;
      }

      if (landmarkerRef.current) {
        try {
          await landmarkerRef.current.setOptions({ runningMode: 'IMAGE' });
          const res = landmarkerRef.current.detect(img);
          if (res?.faceLandmarks?.[0]) {
            detectedLandmarksRef.current = res.faceLandmarks[0];
            smoothedLandmarksRef.current = res.faceLandmarks[0];
            setFaceDetected(true);
          } else {
            setFaceDetected(false);
          }
        } catch (e) {
          setFaceDetected(false);
        }
      }
      renderTryOnFrame();
    };
    img.src = initialPhoto;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPhoto, detectorStatus]);

  // Handle Live Camera Stream Activation
  useEffect(() => {
    let active = true;
    if (sourceMode === 'live') {
      detectedLandmarksRef.current = null;
      smoothedLandmarksRef.current = null;
      navigator.mediaDevices
        ?.getUserMedia({ video: { facingMode: 'user', width: { ideal: 720 }, height: { ideal: 900 } }, audio: false })
        .then(async (stream) => {
          if (!active) {
            stream.getTracks().forEach((t) => t.stop());
            return;
          }
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            await videoRef.current.play().catch(() => {});
          }
          if (landmarkerRef.current) {
            await landmarkerRef.current.setOptions({ runningMode: 'VIDEO' }).catch(() => {});
          }
          setLiveReady(true);
        })
        .catch(() => {
          setLiveReady(false);
          showToast('Camera unavailable—using captured portrait mode.');
        });
    } else {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      setLiveReady(false);
    }

    return () => {
      active = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceMode]);

  // ==========================================================================
  // CORE REALISTIC MAKEUP RENDERING ENGINE (TEXTURE-PRESERVING & MASKED)
  // ==========================================================================
  const renderTryOnFrame = () => {
    const canvas = canvasRef.current;
    const maskCanvas = offscreenMaskCanvasRef.current;
    const layerCanvas = offscreenLayerCanvasRef.current;
    if (!canvas || !maskCanvas || !layerCanvas) return;

    const ctx = canvas.getContext('2d');
    const mCtx = maskCanvas.getContext('2d');
    const lCtx = layerCanvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    const isLive = sourceMode === 'live' && liveReady && videoRef.current && videoRef.current.readyState >= 2;
    const mirrorX = isLive && mirrorCamera;
    let srcW = 520;
    let srcH = 620;

    // 1. Draw Unmodified Base Camera / Portrait Feed
    if (isLive) {
      const vid = videoRef.current;
      srcW = vid.videoWidth || 640;
      srcH = vid.videoHeight || 480;
      const scale = Math.max(w / srcW, h / srcH);
      const dw = srcW * scale;
      const dh = srcH * scale;
      const dx = (w - dw) / 2;
      const dy = (h - dh) / 2;

      ctx.save();
      if (mirrorX) {
        ctx.translate(w, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(vid, dx, dy, dw, dh);
      ctx.restore();

      // Real-time MediaPipe Video Tracking
      if (landmarkerRef.current) {
        try {
          const result = landmarkerRef.current.detectForVideo(vid, performance.now());
          if (result?.faceLandmarks?.[0]) {
            const smoothed = smoothLandmarks(result.faceLandmarks[0]);
            detectedLandmarksRef.current = smoothed;
            if (!faceDetected) setFaceDetected(true);
          } else if (faceDetected) {
            setFaceDetected(false);
          }
        } catch (e) {
          // Retain last stable landmark frame
        }
      }
    } else if (photoImgRef.current && photoImgRef.current.complete) {
      const img = photoImgRef.current;
      srcW = img.naturalWidth || 520;
      srcH = img.naturalHeight || 620;
      const scale = Math.max(w / srcW, h / srcH);
      const dw = srcW * scale;
      const dh = srcH * scale;
      const dx = (w - dw) / 2;
      const dy = (h - dh) / 2;
      ctx.drawImage(img, dx, dy, dw, dh);
    } else {
      return;
    }

    const effectiveSplit = holdOriginal ? 0 : splitPercent;
    if (effectiveSplit <= 0) return;

    const mapCoord = createCoordMapper(srcW, srcH, w, h, mirrorX);
    const lm = detectedLandmarksRef.current;
    const fb = fallbackAnatomyRef.current;

    // Clip cosmetic layers to active Before/After comparison region
    const splitX = w * (1 - effectiveSplit / 100);
    ctx.save();
    ctx.beginPath();
    ctx.rect(splitX, 0, w - splitX, h);
    ctx.clip();

    // ------------------------------------------------------------------------
    // MODULAR REALISTIC COSMETIC LAYERS (TEXTURE-PRESERVING & MASKED)
    // ------------------------------------------------------------------------
    if (foundation.intensity > 0) {
      renderFoundation({
        ctx,
        maskCtx: mCtx,
        layerCtx: lCtx,
        width: w,
        height: h,
        foundationState: foundation,
        landmarks: lm,
        fallbackAnatomy: fb,
        mapCoord
      });
    }

    if (eyeshadow.intensity > 0) {
      renderEyeshadow({
        ctx,
        maskCtx: mCtx,
        layerCtx: lCtx,
        width: w,
        height: h,
        eyeshadowState: eyeshadow,
        landmarks: lm,
        fallbackAnatomy: fb,
        mapCoord
      });
    }

    if (blush.intensity > 0) {
      renderBlush({
        ctx,
        layerCtx: lCtx,
        width: w,
        height: h,
        blushState: blush,
        landmarks: lm,
        fallbackAnatomy: fb,
        mapCoord,
        mirrorX
      });
    }

    if (lipstick.intensity > 0) {
      renderLipstick({
        ctx,
        maskCtx: mCtx,
        layerCtx: lCtx,
        width: w,
        height: h,
        lipstickState: lipstick,
        landmarks: lm,
        fallbackAnatomy: fb,
        mapCoord
      });
    }

    ctx.restore();

    // 3. Draw Clean Before/After Split Divider Line
    if (!holdOriginal && effectiveSplit > 0 && effectiveSplit < 100) {
      const lineX = w * (1 - effectiveSplit / 100);
      ctx.save();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = 'rgba(0,0,0,0.4)';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.moveTo(lineX, 0);
      ctx.lineTo(lineX, h);
      ctx.stroke();
      ctx.restore();
    }
  };

  // Smooth 60fps requestAnimationFrame loop for Live Camera + Instant Re-render on Photo Changes
  useEffect(() => {
    let running = true;
    const loop = () => {
      if (!running) return;
      renderTryOnFrame();
      if (sourceMode === 'live' && liveReady) {
        rafRef.current = requestAnimationFrame(loop);
      }
    };
    loop();
    return () => {
      running = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  });

  // One-Click Apply Customer's AI-Matched Shades
  const handleApplyRecommendedLook = () => {
    const fndRec = recommendations.find((r) => r.product.category === 'Foundation');
    const lipRec = recommendations.find((r) => r.product.category === 'Lipstick');
    const palette = analysis?.colorPalette || [];

    if (fndRec) {
      setFoundation({ name: `${fndRec.shade.shadeName} ${fndRec.shade.shadeNumber}`, hex: fndRec.shade.hexColor, intensity: 45 });
    }
    if (lipRec) {
      setLipstick({ name: `${lipRec.shade.shadeName} ${lipRec.shade.shadeNumber}`, hex: lipRec.shade.hexColor, intensity: 72, finish: 'satin' });
    }
    if (palette[0]) {
      setBlush({ name: palette[0].name, hex: palette[0].hex, intensity: 54 });
    }
    if (palette[4]) {
      setEyeshadow({ name: palette[4].name, hex: palette[4].hex, intensity: 58, shimmer: true });
    }
    setSplitPercent(100);
    showToast('Applied your AI-matched store shades!');
  };

  const handleCaptureSnapshot = () => {
    if (!canvasRef.current) return;
    const dataUrl = canvasRef.current.toDataURL('image/png');
    const img = new Image();
    img.onload = () => {
      photoImgRef.current = img;
      setSourceMode('photo');
      showToast('Live camera look captured to photo studio!');
    };
    img.src = dataUrl;
  };

  const handleDownloadLook = () => {
    if (!canvasRef.current) return;
    const url = canvasRef.current.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `KLOZEVA_Virtual_TryOn_${Date.now()}.png`;
    a.click();
    showToast('Downloaded Virtual Try-On portrait!');
  };

  const handleReset = () => {
    setFoundation((prev) => ({ ...prev, intensity: 0 }));
    setLipstick((prev) => ({ ...prev, intensity: 0 }));
    setBlush((prev) => ({ ...prev, intensity: 0 }));
    setEyeshadow((prev) => ({ ...prev, intensity: 0 }));
    setSplitPercent(100);
    showToast('Cleared all makeup layers');
  };

  const foundationSwatches = useMemo(() => {
    const base = [
      { name: 'Ivory Fair 01', hex: '#EBD0BE', intensity: 40 },
      { name: 'Warm Nude 128', hex: '#DFB18B', intensity: 42 },
      { name: 'Natural Beige 220', hex: '#CFA07E', intensity: 42 },
      { name: 'Natural Buff 230', hex: '#C9936B', intensity: 45 },
      { name: 'Golden Honey 04', hex: '#C2865B', intensity: 48 },
      { name: 'Toffee 330', hex: '#945D3C', intensity: 48 },
      { name: 'Rich Cocoa 06', hex: '#7B492E', intensity: 50 }
    ];
    const aiFnd = recommendations.find((r) => r.product.category === 'Foundation');
    if (aiFnd) {
      const recLabel = `${aiFnd.shade.shadeName} ${aiFnd.shade.shadeNumber} (AI Match)`;
      const filtered = base.filter((b) => b.hex.toLowerCase() !== aiFnd.shade.hexColor.toLowerCase());
      return [{ name: recLabel, hex: aiFnd.shade.hexColor, intensity: 44 }, ...filtered];
    }
    return base;
  }, [recommendations]);

  const lipstickSwatches = [
    { name: 'Terracotta Kiss', hex: '#B45643', intensity: 72, finish: 'satin' },
    { name: 'Coral Rush', hex: '#D66454', intensity: 68, finish: 'satin' },
    { name: 'Dusty Rose', hex: '#C26D7A', intensity: 68, finish: 'satin' },
    { name: 'Deep Berry', hex: '#7A2838', intensity: 76, finish: 'matte' },
    { name: 'Classic Red', hex: '#B3242E', intensity: 74, finish: 'satin' }
  ];

  const blushSwatches = [
    { name: 'Sunlit Peach', hex: '#F4A488', intensity: 52 },
    { name: 'Warm Coral', hex: '#E56B5B', intensity: 52 },
    { name: 'Petal Pink', hex: '#E598A8', intensity: 54 },
    { name: 'Spiced Berry', hex: '#A84A5C', intensity: 50 }
  ];

  const eyeshadowSwatches = [
    { name: 'Bronze Shimmer', hex: '#8D583A', intensity: 60, shimmer: true },
    { name: 'Rose Brown', hex: '#9E615C', intensity: 58, shimmer: true },
    { name: 'Cool Taupe', hex: '#7A6B70', intensity: 58, shimmer: false },
    { name: 'Amber Gold', hex: '#C58B36', intensity: 56, shimmer: true }
  ];

  return (
    <div className="bg-white rounded-3xl border border-[#E8C5C1]/70 p-6 sm:p-8 shadow-sm">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 mb-6 border-b border-[#E8C5C1]/60">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-[#B8860B]">
              <Sparkles className="w-3.5 h-3.5" />
              Real-Time AI Face-Tracked Cosmetic Studio
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#F0E6D8] text-[#221F1F]">
              {detectorStatus === 'mediapipe-ready'
                ? faceDetected
                  ? 'MediaPipe 478-Point Face Tracking Active'
                  : 'MediaPipe Face Tracker Ready'
                : 'Anatomical Skin-Mask Rendering Active'}
            </span>
          </div>
          <h3 className="text-2xl font-semibold text-[#221F1F] mt-1" style={{ fontFamily: "'Playfair Display', serif" }}>
            Virtual Makeup Try-On Studio
          </h3>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleApplyRecommendedLook}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#221F1F] text-[#E8C5C1] text-xs font-semibold hover:bg-[#383333] cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Apply My AI Recommended Look
          </button>

          <button
            onClick={() => setSourceMode('photo')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer ${
              sourceMode === 'photo' ? 'bg-[#F0E6D8] text-[#221F1F] border border-[#221F1F]' : 'bg-[#FAF7F2] text-[#6E6563]'
            }`}
          >
            Portrait Photo
          </button>

          <button
            onClick={() => setSourceMode('live')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer ${
              sourceMode === 'live' ? 'bg-[#F0E6D8] text-[#221F1F] border border-[#221F1F]' : 'bg-[#FAF7F2] text-[#6E6563]'
            }`}
          >
            Live Camera
          </button>

          <button
            onClick={handleReset}
            className="px-3.5 py-2 rounded-xl bg-[#FAF7F2] border border-[#E8C5C1] text-xs font-semibold text-[#221F1F] hover:bg-[#F0E6D8] cursor-pointer"
          >
            Reset
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-8 items-start">
        {/* Left High-DPI Canvas Viewport (Clean, Zero Visible Mesh or Dots) */}
        <div className="lg:col-span-6">
          <div className="relative rounded-3xl overflow-hidden bg-[#221F1F] aspect-[4/4.5] border border-[#E8C5C1] select-none shadow-inner">
            <video ref={videoRef} playsInline muted className="hidden" />
            <canvas ref={canvasRef} width={640} height={720} className="w-full h-full object-cover block" />

            {/* Top Overlay Pills */}
            <div className="absolute top-3 left-3 flex items-center gap-2">
              <button
                onPointerDown={() => setHoldOriginal(true)}
                onPointerUp={() => setHoldOriginal(false)}
                onPointerLeave={() => setHoldOriginal(false)}
                className="px-3 py-1.5 rounded-full bg-[#221F1F]/80 backdrop-blur-md text-white text-[11px] font-semibold cursor-pointer hover:bg-[#221F1F]"
              >
                {holdOriginal ? 'Showing Original' : 'Hold for Original'}
              </button>
            </div>

            <div className="absolute top-3 right-3 flex items-center gap-2">
              {sourceMode === 'live' && liveReady && (
                <>
                  <button
                    onClick={() => setMirrorCamera((m) => !m)}
                    className="px-3 py-1.5 rounded-full bg-[#221F1F]/80 text-white text-[11px] font-semibold cursor-pointer"
                  >
                    Mirror: {mirrorCamera ? 'On' : 'Off'}
                  </button>
                  <button
                    onClick={handleCaptureSnapshot}
                    className="px-3 py-1.5 rounded-full bg-[#B8860B] text-white text-[11px] font-semibold cursor-pointer"
                  >
                    Snapshot
                  </button>
                </>
              )}
              <button
                onClick={handleDownloadLook}
                className="p-2 rounded-full bg-white/90 text-[#221F1F] hover:bg-white shadow cursor-pointer"
                title="Download Try-On Look PNG"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Before/After Comparison Slider */}
          <div className="mt-4 p-4 rounded-2xl bg-[#FAF7F2] border border-[#E8C5C1] space-y-2.5">
            <div className="flex items-center justify-between text-xs font-semibold text-[#221F1F]">
              <span>Before / After Makeup Split Wipe</span>
              <span>{splitPercent === 100 ? 'Full Makeup View' : `${splitPercent}% After / ${100 - splitPercent}% Before`}</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={splitPercent}
              onChange={(e) => setSplitPercent(Number(e.target.value))}
              className="w-full accent-[#221F1F] cursor-pointer"
            />
          </div>
        </div>

        {/* Right Cosmetic Palette Selectors with 0–100% Coverage Sliders */}
        <div className="lg:col-span-6 space-y-4">
          {/* 1. Foundation */}
          <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#E8C5C1]/80">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-[#221F1F]">
                1. Foundation: <span className="text-[#B8860B]">{foundation.intensity === 0 ? 'Off' : foundation.name}</span>
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-[#6E6563]">{foundation.intensity}%</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={foundation.intensity}
                  onChange={(e) => setFoundation({ ...foundation, intensity: Number(e.target.value) })}
                  className="w-24 accent-[#221F1F] cursor-pointer"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {foundationSwatches.map((s) => (
                <button
                  key={s.name}
                  onClick={() => setFoundation({ name: s.name, hex: s.hex, intensity: foundation.intensity === 0 ? s.intensity : foundation.intensity })}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium cursor-pointer ${
                    foundation.name === s.name && foundation.intensity > 0
                      ? 'bg-white border-[#221F1F] shadow-sm'
                      : 'bg-white/60 border-[#E8C5C1]'
                  }`}
                >
                  <span className="w-4 h-4 rounded-full border border-black/20" style={{ backgroundColor: s.hex }} />
                  <span>{s.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 2. Lipstick */}
          <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#E8C5C1]/80">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-[#221F1F]">
                2. Lipstick: <span className="text-[#B8860B]">{lipstick.intensity === 0 ? 'Off' : lipstick.name}</span>
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-[#6E6563]">{lipstick.intensity}%</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={lipstick.intensity}
                  onChange={(e) => setLipstick({ ...lipstick, intensity: Number(e.target.value) })}
                  className="w-24 accent-[#221F1F] cursor-pointer"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {lipstickSwatches.map((s) => (
                <button
                  key={s.name}
                  onClick={() =>
                    setLipstick({
                      name: s.name,
                      hex: s.hex,
                      intensity: lipstick.intensity === 0 ? s.intensity : lipstick.intensity,
                      finish: s.finish
                    })
                  }
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium cursor-pointer ${
                    lipstick.name === s.name && lipstick.intensity > 0
                      ? 'bg-white border-[#221F1F] shadow-sm'
                      : 'bg-white/60 border-[#E8C5C1]'
                  }`}
                >
                  <span className="w-4 h-4 rounded-full border border-black/20" style={{ backgroundColor: s.hex }} />
                  <span>{s.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 3. Cheek Blush */}
          <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#E8C5C1]/80">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-[#221F1F]">
                3. Cheek Blush: <span className="text-[#B8860B]">{blush.intensity === 0 ? 'Off' : blush.name}</span>
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-[#6E6563]">{blush.intensity}%</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={blush.intensity}
                  onChange={(e) => setBlush({ ...blush, intensity: Number(e.target.value) })}
                  className="w-24 accent-[#221F1F] cursor-pointer"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {blushSwatches.map((s) => (
                <button
                  key={s.name}
                  onClick={() => setBlush({ name: s.name, hex: s.hex, intensity: blush.intensity === 0 ? s.intensity : blush.intensity })}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium cursor-pointer ${
                    blush.name === s.name && blush.intensity > 0
                      ? 'bg-white border-[#221F1F] shadow-sm'
                      : 'bg-white/60 border-[#E8C5C1]'
                  }`}
                >
                  <span className="w-4 h-4 rounded-full border border-black/20" style={{ backgroundColor: s.hex }} />
                  <span>{s.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 4. Eyeshadow */}
          <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#E8C5C1]/80">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-[#221F1F]">
                4. Eyeshadow: <span className="text-[#B8860B]">{eyeshadow.intensity === 0 ? 'Off' : eyeshadow.name}</span>
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-[#6E6563]">{eyeshadow.intensity}%</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={eyeshadow.intensity}
                  onChange={(e) => setEyeshadow({ ...eyeshadow, intensity: Number(e.target.value) })}
                  className="w-24 accent-[#221F1F] cursor-pointer"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {eyeshadowSwatches.map((s) => (
                <button
                  key={s.name}
                  onClick={() =>
                    setEyeshadow({
                      name: s.name,
                      hex: s.hex,
                      intensity: eyeshadow.intensity === 0 ? s.intensity : eyeshadow.intensity,
                      shimmer: s.shimmer
                    })
                  }
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium cursor-pointer ${
                    eyeshadow.name === s.name && eyeshadow.intensity > 0
                      ? 'bg-white border-[#221F1F] shadow-sm'
                      : 'bg-white/60 border-[#E8C5C1]'
                  }`}
                >
                  <span className="w-4 h-4 rounded-full border border-black/20" style={{ backgroundColor: s.hex }} />
                  <span>{s.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
