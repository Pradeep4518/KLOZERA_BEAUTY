import { useContext, createContext } from 'react';

export const KLOZEVAContext = createContext(null);

export const useKLOZEVA = () => useContext(KLOZEVAContext);

/**
 * Creates an updated customer view with manual corrections stored separately
 * from raw model predictions. Never mutates the original model predictions.
 */
export const applyCustomerCorrection = (analysis, corrections = {}) => {
  if (!analysis) return null;

  return {
    ...analysis,
    originalPrediction: analysis.originalPrediction || {
      skinTone: analysis.skinTone,
      undertone: analysis.undertone,
      skinType: analysis.skinType,
      confidence: analysis.confidence
    },
    customerCorrections: {
      ...(analysis.customerCorrections || {}),
      ...corrections,
      updatedAt: new Date().toISOString()
    },
    // Effective values for UI presentation
    skinTone: corrections.skinTone || analysis.skinTone,
    undertone: corrections.undertone || analysis.undertone,
    skinType: corrections.skinType || analysis.skinType
  };
};

/**
 * Compute explainable, inventory-backed recommendations for any beauty analysis.
 * Incorporates customer preferences and manual overrides without confusing
 * recommendation scores with AI model confidence.
 * @param {any} analysis
 * @param {any} db
 * @param {any} [customerCorrections]
 * @param {any} [filterPreferences]
 */
export const computeInventoryRecommendations = (analysis, db, customerCorrections = null, filterPreferences = null) => {
  if (!analysis || !db) return [];

  // Effective attributes honoring customer corrections
  const effectiveTone = customerCorrections?.skinTone || analysis.skinTone;
  const effectiveUndertone = customerCorrections?.undertone || analysis.undertone;
  const effectiveSkinType = customerCorrections?.skinType || analysis.skinType;

  const results = [];

  db.products.forEach((product) => {
    const inv = db.inventory.find((i) => i.productId === product.id);
    const quantity = inv ? inv.quantity : 0;
    const shades = db.product_shades.filter((s) => s.productId === product.id);

    // Find best matching shade for customer's tone & undertone
    let bestShade = shades[0] || {
      id: 'default-shade',
      shadeNumber: 'STD',
      shadeName: 'Universal Match',
      hexColor: '#D4A58A',
      targetTone: ['Medium'],
      targetUndertone: ['Warm']
    };

    const toneScale = { Fair: 0, Light: 1, Medium: 2, Tan: 3, Deep: 4 };
    const custToneIdx = toneScale[effectiveTone] ?? 2;

    let bestShadeScore = -999;
    shades.forEach((sh) => {
      let sScore = 0;
      const exactTone = sh.targetTone?.includes(effectiveTone);
      if (exactTone) {
        sScore += 65;
      } else if (sh.targetTone?.length) {
        // Penalize shades far away in skin depth so Fair/Light never receives Deep Cocoa
        const minToneDiff = Math.min(
          ...sh.targetTone.map((t) => Math.abs((toneScale[t] ?? 2) - custToneIdx))
        );
        sScore -= minToneDiff * 35;
      }
      if (sh.targetUndertone?.includes(effectiveUndertone)) {
        sScore += 45;
      } else if (sh.targetUndertone?.includes('Neutral')) {
        sScore += 18;
      }
      if (sScore > bestShadeScore) {
        bestShadeScore = sScore;
        bestShade = sh;
      }
    });

    // Granular scoring breakdown (distinct from AI model confidence)
    let skinToneScore = 0;
    let undertoneScore = 0;
    let skinTypeScore = 0;
    let availabilityScore = quantity > 0 ? 10 : 0;
    let preferenceScore = 0;

    const undertoneMatch = product.undertoneCompatibility?.includes(effectiveUndertone);
    const skinTypeMatch = product.skinTypeCompatibility?.includes(effectiveSkinType);
    const toneMatch = bestShade.targetTone?.includes(effectiveTone);
    const shadeUndertoneMatch = bestShade.targetUndertone?.includes(effectiveUndertone);

    if (toneMatch) skinToneScore = 11;
    else skinToneScore = -18;

    if (undertoneMatch) undertoneScore += 10;
    if (shadeUndertoneMatch) undertoneScore += 7;

    if (skinTypeMatch) skinTypeScore = 9;

    // Check optional filter preferences (e.g. lipstick shade preference)
    if (filterPreferences?.preferredColorFamily) {
      if (product.category === 'Lipstick' && bestShade.shadeName.toLowerCase().includes(filterPreferences.preferredColorFamily.toLowerCase())) {
        preferenceScore = 5;
      }
    }

    let score = 62 + skinToneScore + undertoneScore + skinTypeScore + preferenceScore;
    // Slight deterministic variance based on product id length for natural distribution (68% - 99%)
    score = Math.min(99, Math.max(68, score - (product.id.length % 4)));

    const reasonParts = [];
    if (toneMatch && shadeUndertoneMatch) {
      reasonParts.push(`Shade ${bestShade.shadeNumber} (${bestShade.shadeName}) harmonizes with ${effectiveTone} skin & ${effectiveUndertone} undertones`);
    } else if (undertoneMatch) {
      reasonParts.push(`Formulated to complement ${effectiveUndertone} undertones`);
    }
    if (skinTypeMatch) {
      reasonParts.push(`balanced for ${effectiveSkinType} skin`);
    }
    const reason = reasonParts.length > 0
      ? `${reasonParts.join(' and ')}.`
      : `Recommended shade ${bestShade.shadeNumber} (${bestShade.shadeName}) selected from live store inventory.`;

    results.push({
      product,
      shade: bestShade,
      quantity,
      matchScore: score,
      scoreBreakdown: {
        skinToneScore,
        undertoneScore,
        skinTypeScore,
        availabilityScore,
        preferenceScore,
        baseScore: 62
      },
      reason,
      isCorrectedMatch: Boolean(customerCorrections)
    });
  });

  return results.sort((a, b) => b.matchScore - a.matchScore);
};

/**
 * Filter lipstick recommendations by color family (Warm, Cool, Neutral, Nude, Pink, Red, Berry, Brown)
 */
export const filterLipstickRecommendations = (recommendations, family = 'All') => {
  if (!family || family === 'All') {
    return recommendations.filter((r) => r.product.category === 'Lipstick');
  }

  const query = family.toLowerCase();
  return recommendations.filter((r) => {
    if (r.product.category !== 'Lipstick') return false;
    const sName = r.shade.shadeName.toLowerCase();
    const pName = r.product.name.toLowerCase();
    const targetUndertones = (r.shade.targetUndertone || []).map((u) => u.toLowerCase());

    if (query === 'warm' || query === 'cool' || query === 'neutral') {
      return targetUndertones.includes(query);
    }
    return sName.includes(query) || pName.includes(query);
  });
};

/**
 * Filter eyeshadow recommendations by look style (Natural, Smokey, Warm glam, Cool glam, Everyday, Party, Bridal)
 */
export const filterEyeshadowRecommendations = (recommendations, style = 'All') => {
  if (!style || style === 'All') {
    return recommendations.filter((r) => r.product.category === 'Eyeshadow');
  }

  const query = style.toLowerCase();
  return recommendations.filter((r) => {
    if (r.product.category !== 'Eyeshadow') return false;
    const sName = r.shade.shadeName.toLowerCase();
    const pDesc = (r.product.description || '').toLowerCase();
    return sName.includes(query) || pDesc.includes(query);
  });
};
