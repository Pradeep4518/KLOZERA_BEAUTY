

export const createPortraitSvgDataUrl = (skinBase, skinShadow, blushColor, lipColor, hairColor, bgStart, bgEnd, label = '', shirtColor = '#FAF7F2') => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="520" height="620" viewBox="0 0 520 620">
    <title>${label}</title>
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${bgStart}"/>
        <stop offset="100%" stop-color="${bgEnd}"/>
      </linearGradient>
      <radialGradient id="skinGrad" cx="46%" cy="42%" r="55%">
        <stop offset="0%" stop-color="${skinBase}"/>
        <stop offset="85%" stop-color="${skinShadow}"/>
        <stop offset="100%" stop-color="${skinShadow}"/>
      </radialGradient>
      <radialGradient id="cheek" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="${blushColor}" stop-opacity="0.32"/>
        <stop offset="100%" stop-color="${blushColor}" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="520" height="620" fill="url(#bg)"/>
    <!-- Back Hair -->
    <path d="M110,270 C95,120 175,65 260,65 C345,65 425,120 410,270 C402,380 420,490 390,560 L130,560 C100,490 118,380 110,270 Z" fill="${hairColor}"/>
    <!-- Shoulders & Neck -->
    <path d="M215,380 L305,380 L305,560 L215,560 Z" fill="${skinShadow}"/>
    <path d="M95,620 C110,515 175,470 260,470 C345,470 410,515 425,620 Z" fill="${shirtColor}"/>
    <path d="M195,472 Q260,525 325,472 L305,465 Q260,502 215,465 Z" fill="${skinBase}"/>
    <!-- Face Contour -->
    <path d="M158,235 C158,142 204,102 260,102 C316,102 362,142 362,235 C362,326 318,398 260,398 C202,398 158,326 158,235 Z" fill="url(#skinGrad)"/>
    <!-- Natural Cheek Flush -->
    <ellipse cx="198" cy="285" rx="34" ry="24" fill="url(#cheek)"/>
    <ellipse cx="322" cy="285" rx="34" ry="24" fill="url(#cheek)"/>
    <!-- Eyebrows -->
    <path d="M180,212 Q208,198 236,208" fill="none" stroke="${hairColor}" stroke-width="5.5" stroke-linecap="round"/>
    <path d="M284,208 Q312,198 340,212" fill="none" stroke="${hairColor}" stroke-width="5.5" stroke-linecap="round"/>
    <!-- Eyes -->
    <ellipse cx="208" cy="232" rx="20" ry="10.5" fill="#FFFFFF"/>
    <circle cx="208" cy="232" r="8.5" fill="#2D201B"/>
    <circle cx="205" cy="229" r="2.5" fill="#FFFFFF"/>
    <path d="M187,231 Q208,217 229,231" fill="none" stroke="#1E1715" stroke-width="3" stroke-linecap="round"/>
    <ellipse cx="312" cy="232" rx="20" ry="10.5" fill="#FFFFFF"/>
    <circle cx="312" cy="232" r="8.5" fill="#2D201B"/>
    <circle cx="309" cy="229" r="2.5" fill="#FFFFFF"/>
    <path d="M291,231 Q312,217 333,231" fill="none" stroke="#1E1715" stroke-width="3" stroke-linecap="round"/>
    <!-- Nose -->
    <path d="M256,236 L251,286 Q260,293 269,286" fill="none" stroke="${skinShadow}" stroke-width="3" stroke-linecap="round"/>
    <!-- Lips -->
    <path d="M226,334 Q244,324 260,330 Q276,324 294,334 Q276,341 260,339 Q244,341 226,334 Z" fill="${lipColor}"/>
    <path d="M227,335 Q260,356 293,335 Q276,341 260,339 Q244,341 227,335 Z" fill="${lipColor}" opacity="0.9"/>
    <!-- Front Hair Framing -->
    <path d="M155,230 C152,135 205,88 265,92 C230,122 185,155 162,245 Z" fill="${hairColor}"/>
    <path d="M365,230 C368,135 315,88 255,92 C290,122 335,155 358,245 Z" fill="${hairColor}"/>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

export const SAMPLE_PORTRAITS = [
  {
    id: 'preset-medium-warm',
    label: 'Studio Portrait – Warm Medium',
    subtitle: 'Golden undertone • Combination skin',
    dataUrl: createPortraitSvgDataUrl('#D69E76', '#BD825B', '#D97B66', '#B85D54', '#1F1816', '#CBB39C', '#CBB39C', 'Warm Medium', '#CBB39C'),
    presetMetrics: { skinTone: 'Medium', undertone: 'Warm', skinType: 'Combination' }
  },
  {
    id: 'preset-fair-cool',
    label: 'Natural Light – Cool Fair',
    subtitle: 'Rosy undertone • Dry/Sensitive skin',
    dataUrl: createPortraitSvgDataUrl('#F2D2C4', '#DFB6A5', '#E58F9E', '#C96A7D', '#3A2821', '#F7EFF0', '#EAD7DA', 'Cool Fair'),
    presetMetrics: { skinTone: 'Fair', undertone: 'Cool', skinType: 'Dry' }
  },
  {
    id: 'preset-deep-olive',
    label: 'Daylight – Deep Olive',
    subtitle: 'Rich olive-neutral undertone • Oily skin',
    dataUrl: createPortraitSvgDataUrl('#8D5B3E', '#71452C', '#B85A4B', '#7E3538', '#151110', '#EFE6DA', '#DFCBB7', 'Deep Olive'),
    presetMetrics: { skinTone: 'Deep', undertone: 'Olive', skinType: 'Oily' }
  }
];

// Stylized product bottle/compact SVG generator for crisp retail cards
export const getProductIllustration = (category, brand, swatchHex = '#D49A75') => {
  const accent = brand === 'MAYBELLINE' ? '#221F1F' : brand === 'LAKME' ? '#8E3B46' : brand === 'LOREAL PARIS' ? '#B8860B' : brand === 'MARS' ? '#9B2C3E' : '#3E6B65';
  let shape = '';
  if (category === 'Foundation' || category === 'Skincare') {
    shape = `
      <rect x="42" y="14" width="36" height="22" rx="4" fill="${accent}"/>
      <rect x="47" y="36" width="26" height="8" fill="#D4AF37"/>
      <rect x="34" y="44" width="52" height="72" rx="10" fill="${swatchHex}" stroke="#221F1F" stroke-opacity="0.12" stroke-width="1.5"/>
      <rect x="42" y="58" width="36" height="38" rx="4" fill="#FAF7F2" fill-opacity="0.9"/>
      <line x1="48" y1="70" x2="72" y2="70" stroke="${accent}" stroke-width="2.5" stroke-linecap="round"/>
      <line x1="51" y1="78" x2="69" y2="78" stroke="#6E6563" stroke-width="2" stroke-linecap="round"/>
    `;
  } else if (category === 'Concealer') {
    shape = `
      <rect x="48" y="12" width="24" height="34" rx="4" fill="${accent}"/>
      <rect x="46" y="46" width="28" height="70" rx="8" fill="${swatchHex}" stroke="#221F1F" stroke-opacity="0.12" stroke-width="1.5"/>
      <rect x="50" y="64" width="20" height="30" rx="3" fill="#FAF7F2" fill-opacity="0.88"/>
    `;
  } else {
    shape = `
      <path d="M48,22 L72,14 L72,44 L48,44 Z" fill="${swatchHex}"/>
      <rect x="45" y="44" width="30" height="16" rx="2" fill="#D4AF37"/>
      <rect x="43" y="60" width="34" height="56" rx="6" fill="${accent}"/>
      <rect x="49" y="75" width="22" height="24" rx="2" fill="#FAF7F2" fill-opacity="0.15"/>
    `;
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="130" viewBox="0 0 120 130">
    <rect width="120" height="130" rx="16" fill="#F5EFE6"/>
    <circle cx="60" cy="70" r="42" fill="#E8C5C1" fill-opacity="0.28"/>
    ${shape}
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};
