

export const STORAGE_KEY = 'KLOZEVA_BEAUTY_DB_V1';

export const createInitialDatabase = () => {
  const brands = [
    { id: 'brand-maybelline', name: 'MAYBELLINE', origin: 'New York', tier: 'Mass Prestige', description: 'High-performance everyday complexion & longwear lip icons.' },
    { id: 'brand-lakme', name: 'LAKME', origin: 'Mumbai, India', tier: 'Indian Heritage', description: 'Tailored for Indian skin undertones & humid tropical climates.' },
    { id: 'brand-loreal', name: 'LOREAL PARIS', origin: 'Paris', tier: 'Accessible Luxury', description: 'Micro-matched pigments and dermatologist-validated formulas.' },
    { id: 'brand-mars', name: 'MARS', origin: 'India', tier: 'High-Value Indie', description: 'Inclusive, high-pigment essentials crafted for Indian complexions.' },
    { id: 'brand-skincare', name: 'SKINCARE', origin: 'Derma Lab Curated', tier: 'Clinical Botanicals', description: 'Barrier-first actives from Minimalist, Cetaphil, Dot & Key & Plum.' },
  ];

  const products = [
    // MAYBELLINE
    {
      id: 'prod-may-fitme-fnd',
      brandId: 'brand-maybelline',
      brandName: 'MAYBELLINE',
      name: 'Fit Me Matte + Poreless Foundation',
      category: 'Foundation',
      priceInr: 549,
      undertoneCompatibility: ['Warm', 'Neutral', 'Olive'],
      skinTypeCompatibility: ['Oily', 'Combination', 'Normal'],
      description: 'Micro-powder formula that absorbs oil and blurs pores for a natural, seamless matte finish tailored for Indian humidity.',
      aisleLocation: 'Aisle B2 • Maybelline Display • Shelf 2'
    },
    {
      id: 'prod-may-fitme-con',
      brandId: 'brand-maybelline',
      brandName: 'MAYBELLINE',
      name: 'Fit Me Concealer',
      category: 'Concealer',
      priceInr: 529,
      undertoneCompatibility: ['Warm', 'Cool', 'Neutral'],
      skinTypeCompatibility: ['Dry', 'Oily', 'Combination', 'Normal'],
      description: 'Oil-free, non-comedogenic liquid concealer that erases dark circles and redness without creasing.',
      aisleLocation: 'Aisle B2 • Maybelline Display • Shelf 3'
    },
    {
      id: 'prod-may-superstay',
      brandId: 'brand-maybelline',
      brandName: 'MAYBELLINE',
      name: 'SuperStay Matte Ink Liquid Lipstick',
      category: 'Lipstick',
      priceInr: 699,
      undertoneCompatibility: ['Warm', 'Cool', 'Neutral', 'Olive'],
      skinTypeCompatibility: ['Dry', 'Oily', 'Combination', 'Normal'],
      description: '16-hour saturated matte lip colour with precision arrow applicator for smudge-proof all-day wear.',
      aisleLocation: 'Aisle B2 • Maybelline Lip Bar • Bay 1'
    },
    // LAKME
    {
      id: 'prod-lak-9to5-fnd',
      brandId: 'brand-lakme',
      brandName: 'LAKME',
      name: '9to5 Primer + Matte Perfect Cover Foundation',
      category: 'Foundation',
      priceInr: 575,
      undertoneCompatibility: ['Warm', 'Cool', 'Neutral'],
      skinTypeCompatibility: ['Oily', 'Combination', 'Normal'],
      description: 'Built-in primer smooths skin texture while delivering medium-to-high buildable matte coverage.',
      aisleLocation: 'Aisle A1 • Lakmé Signature Counter • Shelf 1'
    },
    {
      id: 'prod-lak-mousse',
      brandId: 'brand-lakme',
      brandName: 'LAKME',
      name: 'Absolute Skin Natural Mousse',
      category: 'Foundation',
      priceInr: 850,
      undertoneCompatibility: ['Warm', 'Neutral', 'Olive'],
      skinTypeCompatibility: ['Dry', 'Combination', 'Normal'],
      description: 'Feather-light whipped mousse with SPF 8 that melts effortlessly into skin for a soft-focus velvet glow.',
      aisleLocation: 'Aisle A1 • Lakmé Absolute Studio • Shelf 2'
    },
    {
      id: 'prod-lak-forever-lip',
      brandId: 'brand-lakme',
      brandName: 'LAKME',
      name: 'Forever Matte Liquid Lipstick',
      category: 'Lipstick',
      priceInr: 399,
      undertoneCompatibility: ['Warm', 'Cool', 'Neutral'],
      skinTypeCompatibility: ['Dry', 'Oily', 'Combination', 'Normal'],
      description: 'Weightless, intense matte payoff enriched with Vitamin E for comfortable, crack-free lips.',
      aisleLocation: 'Aisle A1 • Lakmé Lip Wall • Bay 2'
    },
    // LOREAL PARIS
    {
      id: 'prod-lor-truematch',
      brandId: 'brand-loreal',
      brandName: 'LOREAL PARIS',
      name: 'True Match Super-Blendable Foundation',
      category: 'Foundation',
      priceInr: 1099,
      undertoneCompatibility: ['Warm', 'Cool', 'Neutral', 'Olive'],
      skinTypeCompatibility: ['Dry', 'Combination', 'Normal'],
      description: 'Infused with Hyaluronic Acid and micro-fine pigments calibrated precisely to skin undertone.',
      aisleLocation: 'Aisle C1 • L’Oréal Paris Atelier • Shelf 1'
    },
    {
      id: 'prod-lor-infallible-con',
      brandId: 'brand-loreal',
      brandName: 'LOREAL PARIS',
      name: 'Infallible More Than Concealer',
      category: 'Concealer',
      priceInr: 849,
      undertoneCompatibility: ['Warm', 'Cool', 'Neutral', 'Olive'],
      skinTypeCompatibility: ['Oily', 'Combination', 'Normal'],
      description: 'Full-coverage elastic formula with XXL doe-foot wand for spot concealing or full-face brightening.',
      aisleLocation: 'Aisle C1 • L’Oréal Paris Atelier • Shelf 2'
    },
    {
      id: 'prod-lor-colorriche',
      brandId: 'brand-loreal',
      brandName: 'LOREAL PARIS',
      name: 'Color Riche Satin & Matte Lipstick',
      category: 'Lipstick',
      priceInr: 799,
      undertoneCompatibility: ['Warm', 'Cool', 'Neutral', 'Olive'],
      skinTypeCompatibility: ['Dry', 'Oily', 'Combination', 'Normal'],
      description: 'Argan oil and Omega-3 enriched luxury pigment that nourishes while imparting rich Parisian colour.',
      aisleLocation: 'Aisle C1 • L’Oréal Lip Boutique • Bay 1'
    },
    // MARS
    {
      id: 'prod-mars-fnd',
      brandId: 'brand-mars',
      brandName: 'MARS',
      name: 'High Coverage Liquid Foundation',
      category: 'Foundation',
      priceInr: 349,
      undertoneCompatibility: ['Warm', 'Neutral', 'Olive'],
      skinTypeCompatibility: ['Oily', 'Combination', 'Normal'],
      description: 'Sweat-resistant, high-definition liquid foundation engineered for rich Indian golden & olive tones.',
      aisleLocation: 'Aisle D3 • MARS Indie Zone • Shelf 1'
    },
    {
      id: 'prod-mars-con',
      brandId: 'brand-mars',
      brandName: 'MARS',
      name: 'Seal The Deal Liquid Concealer',
      category: 'Concealer',
      priceInr: 249,
      undertoneCompatibility: ['Warm', 'Neutral', 'Olive'],
      skinTypeCompatibility: ['Dry', 'Oily', 'Combination', 'Normal'],
      description: 'Creamy, crease-proof coverage that neutralizes hyperpigmentation and under-eye shadows.',
      aisleLocation: 'Aisle D3 • MARS Indie Zone • Shelf 2'
    },
    {
      id: 'prod-mars-lip',
      brandId: 'brand-mars',
      brandName: 'MARS',
      name: 'Creamy Matte Lipstick',
      category: 'Lipstick',
      priceInr: 199,
      undertoneCompatibility: ['Warm', 'Cool', 'Neutral', 'Olive'],
      skinTypeCompatibility: ['Dry', 'Oily', 'Combination', 'Normal'],
      description: 'One-swipe velvety pigment with moisturizing shea butter for soft matte comfort.',
      aisleLocation: 'Aisle D3 • MARS Indie Zone • Bay 3'
    },
    // SKINCARE
    {
      id: 'prod-skin-niacinamide',
      brandId: 'brand-skincare',
      brandName: 'SKINCARE',
      name: 'Minimalist 10% Niacinamide + Zinc Serum',
      category: 'Skincare',
      priceInr: 599,
      undertoneCompatibility: ['Warm', 'Cool', 'Neutral', 'Olive'],
      skinTypeCompatibility: ['Oily', 'Combination', 'Normal'],
      description: 'Balances excess sebum, refines enlarged pores, and fades post-acne marks within 4 weeks.',
      aisleLocation: 'Aisle E1 • Clinical Skincare Wall • Shelf 1'
    },
    {
      id: 'prod-skin-cleanser',
      brandId: 'brand-skincare',
      brandName: 'SKINCARE',
      name: 'Cetaphil Gentle Hydrating Skin Cleanser',
      category: 'Skincare',
      priceInr: 349,
      undertoneCompatibility: ['Warm', 'Cool', 'Neutral', 'Olive'],
      skinTypeCompatibility: ['Dry', 'Combination', 'Normal'],
      description: 'Soap-free, pH-balanced micellar cleanser that removes impurities while preserving natural lipid barrier.',
      aisleLocation: 'Aisle E1 • Clinical Skincare Wall • Shelf 2'
    },
    {
      id: 'prod-skin-moisturiser',
      brandId: 'brand-skincare',
      brandName: 'SKINCARE',
      name: 'Dot & Key Ceramide + Hyaluronic Barrier Cream',
      category: 'Skincare',
      priceInr: 495,
      undertoneCompatibility: ['Warm', 'Cool', 'Neutral', 'Olive'],
      skinTypeCompatibility: ['Dry', 'Combination', 'Normal'],
      description: '5 essential ceramides plus multi-molecular hyaluronic acid to deeply plump and repair dry patches.',
      aisleLocation: 'Aisle E1 • Clinical Skincare Wall • Shelf 3'
    },
    {
      id: 'prod-skin-sunscreen',
      brandId: 'brand-skincare',
      brandName: 'SKINCARE',
      name: 'Plum Green Tea & Rice Water SPF 50 PA++++ Sunscreen',
      category: 'Skincare',
      priceInr: 449,
      undertoneCompatibility: ['Warm', 'Cool', 'Neutral', 'Olive'],
      skinTypeCompatibility: ['Oily', 'Combination', 'Normal', 'Dry'],
      description: 'Zero-white-cast broad spectrum UV protection with antioxidant green tea to prevent tanning & dark spots.',
      aisleLocation: 'Aisle E2 • Sun Protection Bay • Shelf 1'
    }
  ];

  const product_shades = [
    // Maybelline Fit Me Foundation shades
    { id: 'sh-may-f1', productId: 'prod-may-fitme-fnd', shadeNumber: '230', shadeName: 'Natural Buff', hexColor: '#C9936B', targetTone: ['Medium', 'Tan'], targetUndertone: ['Warm', 'Neutral'] },
    { id: 'sh-may-f2', productId: 'prod-may-fitme-fnd', shadeNumber: '128', shadeName: 'Warm Nude', hexColor: '#DFB18B', targetTone: ['Fair', 'Light'], targetUndertone: ['Warm', 'Neutral'] },
    { id: 'sh-may-f4', productId: 'prod-may-fitme-fnd', shadeNumber: '220', shadeName: 'Natural Beige', hexColor: '#CFA07E', targetTone: ['Light', 'Medium'], targetUndertone: ['Cool', 'Neutral', 'Olive'] },
    { id: 'sh-may-f3', productId: 'prod-may-fitme-fnd', shadeNumber: '330', shadeName: 'Toffee', hexColor: '#945D3C', targetTone: ['Tan', 'Deep'], targetUndertone: ['Warm', 'Olive'] },
    // Maybelline Concealer shades
    { id: 'sh-may-c1', productId: 'prod-may-fitme-con', shadeNumber: '25', shadeName: 'Medium', hexColor: '#CE9872', targetTone: ['Medium', 'Tan'], targetUndertone: ['Warm', 'Neutral'] },
    { id: 'sh-may-c2', productId: 'prod-may-fitme-con', shadeNumber: '10', shadeName: 'Light', hexColor: '#EBC7B2', targetTone: ['Fair', 'Light'], targetUndertone: ['Cool', 'Neutral'] },
    { id: 'sh-may-c3', productId: 'prod-may-fitme-con', shadeNumber: '35', shadeName: 'Deep', hexColor: '#8B5538', targetTone: ['Deep'], targetUndertone: ['Warm', 'Olive'] },
    // Maybelline Lipstick shades
    { id: 'sh-may-l1', productId: 'prod-may-superstay', shadeNumber: '70', shadeName: 'Amazonian (Terracotta Nude)', hexColor: '#A95C4A', targetTone: ['Light', 'Medium', 'Tan', 'Deep'], targetUndertone: ['Warm', 'Olive'] },
    { id: 'sh-may-l2', productId: 'prod-may-superstay', shadeNumber: '15', shadeName: 'Lover (Dusty Rose)', hexColor: '#C26D7A', targetTone: ['Fair', 'Light', 'Medium'], targetUndertone: ['Cool', 'Neutral'] },
    { id: 'sh-may-l3', productId: 'prod-may-superstay', shadeNumber: '50', shadeName: 'Voyager (Deep Berry)', hexColor: '#7A2838', targetTone: ['Medium', 'Tan', 'Deep'], targetUndertone: ['Cool', 'Olive', 'Neutral'] },
    // Lakme 9to5 Foundation
    { id: 'sh-lak-f1', productId: 'prod-lak-9to5-fnd', shadeNumber: 'W240', shadeName: 'Warm Beige', hexColor: '#C88E64', targetTone: ['Medium', 'Tan'], targetUndertone: ['Warm'] },
    { id: 'sh-lak-f2', productId: 'prod-lak-9to5-fnd', shadeNumber: 'C140', shadeName: 'Cool Ivory', hexColor: '#E8C3B3', targetTone: ['Fair', 'Light'], targetUndertone: ['Cool'] },
    { id: 'sh-lak-f3', productId: 'prod-lak-9to5-fnd', shadeNumber: 'N220', shadeName: 'Neutral Honey', hexColor: '#C5916D', targetTone: ['Light', 'Medium'], targetUndertone: ['Neutral', 'Olive'] },
    { id: 'sh-lak-f4', productId: 'prod-lak-9to5-fnd', shadeNumber: 'W320', shadeName: 'Rich Espresso', hexColor: '#8B563A', targetTone: ['Deep'], targetUndertone: ['Warm', 'Olive'] },
    // Lakme Mousse
    { id: 'sh-lak-m1', productId: 'prod-lak-mousse', shadeNumber: '03', shadeName: 'Golden Medium', hexColor: '#C78D63', targetTone: ['Medium', 'Tan'], targetUndertone: ['Warm', 'Olive'] },
    { id: 'sh-lak-m2', productId: 'prod-lak-mousse', shadeNumber: '01', shadeName: 'Ivory Fair', hexColor: '#EBD0BE', targetTone: ['Fair', 'Light'], targetUndertone: ['Neutral', 'Cool'] },
    { id: 'sh-lak-m3', productId: 'prod-lak-mousse', shadeNumber: '05', shadeName: 'Deep Bronze', hexColor: '#8E583B', targetTone: ['Deep'], targetUndertone: ['Warm', 'Olive'] },
    // Lakme Lipstick
    { id: 'sh-lak-l1', productId: 'prod-lak-forever-lip', shadeNumber: '14', shadeName: 'Coral Rush', hexColor: '#D66454', targetTone: ['Fair', 'Light', 'Medium'], targetUndertone: ['Warm'] },
    { id: 'sh-lak-l2', productId: 'prod-lak-forever-lip', shadeNumber: '08', shadeName: 'Nude Twist', hexColor: '#B57468', targetTone: ['Light', 'Medium', 'Tan'], targetUndertone: ['Neutral', 'Warm'] },
    // L'Oreal True Match
    { id: 'sh-lor-f1', productId: 'prod-lor-truematch', shadeNumber: '4.D/4.W', shadeName: 'Golden Natural', hexColor: '#C48B61', targetTone: ['Medium'], targetUndertone: ['Warm', 'Olive'] },
    { id: 'sh-lor-f2', productId: 'prod-lor-truematch', shadeNumber: '2.N', shadeName: 'Vanilla', hexColor: '#E7C5B0', targetTone: ['Fair', 'Light'], targetUndertone: ['Neutral', 'Cool'] },
    { id: 'sh-lor-f4', productId: 'prod-lor-truematch', shadeNumber: '3.5C', shadeName: 'Rose Beige', hexColor: '#D3A387', targetTone: ['Light', 'Medium'], targetUndertone: ['Cool', 'Neutral'] },
    { id: 'sh-lor-f3', productId: 'prod-lor-truematch', shadeNumber: '6.W', shadeName: 'Sun Beige', hexColor: '#9C6542', targetTone: ['Tan', 'Deep'], targetUndertone: ['Warm', 'Olive'] },
    // L'Oreal Infallible Concealer
    { id: 'sh-lor-c1', productId: 'prod-lor-infallible-con', shadeNumber: '312', shadeName: 'Amber', hexColor: '#C68C64', targetTone: ['Medium', 'Tan'], targetUndertone: ['Warm', 'Olive'] },
    { id: 'sh-lor-c2', productId: 'prod-lor-infallible-con', shadeNumber: '308', shadeName: 'Vanilla', hexColor: '#EAC9B6', targetTone: ['Fair', 'Light'], targetUndertone: ['Cool', 'Neutral'] },
    // L'Oreal Color Riche
    { id: 'sh-lor-l1', productId: 'prod-lor-colorriche', shadeNumber: '173', shadeName: 'Impertinente (Warm Peach)', hexColor: '#CC7462', targetTone: ['Fair', 'Light', 'Medium'], targetUndertone: ['Warm', 'Neutral'] },
    { id: 'sh-lor-l2', productId: 'prod-lor-colorriche', shadeNumber: '377', shadeName: 'Perfect Red', hexColor: '#B3242E', targetTone: ['Fair', 'Light', 'Medium', 'Tan', 'Deep'], targetUndertone: ['Cool', 'Neutral', 'Olive'] },
    // MARS Foundation
    { id: 'sh-mars-f1', productId: 'prod-mars-fnd', shadeNumber: '04', shadeName: 'Warm Honey', hexColor: '#C2865B', targetTone: ['Medium', 'Tan'], targetUndertone: ['Warm', 'Olive'] },
    { id: 'sh-mars-f3', productId: 'prod-mars-fnd', shadeNumber: '02', shadeName: 'Beige Glow', hexColor: '#DCBA9E', targetTone: ['Fair', 'Light'], targetUndertone: ['Cool', 'Neutral', 'Warm'] },
    { id: 'sh-mars-f2', productId: 'prod-mars-fnd', shadeNumber: '06', shadeName: 'Rich Cocoa', hexColor: '#7B492E', targetTone: ['Deep'], targetUndertone: ['Olive', 'Warm'] },
    // MARS Concealer
    { id: 'sh-mars-c1', productId: 'prod-mars-con', shadeNumber: '03', shadeName: 'Medium Tan', hexColor: '#BF845B', targetTone: ['Medium', 'Tan'], targetUndertone: ['Warm', 'Olive'] },
    // MARS Lipstick
    { id: 'sh-mars-l1', productId: 'prod-mars-lip', shadeNumber: '07', shadeName: 'Terracotta Kiss', hexColor: '#B45643', targetTone: ['Light', 'Medium', 'Tan', 'Deep'], targetUndertone: ['Warm', 'Olive'] },
    { id: 'sh-mars-l2', productId: 'prod-mars-lip', shadeNumber: '12', shadeName: 'Rose Velvet', hexColor: '#C46877', targetTone: ['Fair', 'Light', 'Medium'], targetUndertone: ['Cool', 'Neutral'] },
    // Skincare universal variants
    { id: 'sh-sk-1', productId: 'prod-skin-niacinamide', shadeNumber: '30ml', shadeName: 'Oil & Pore Balance Formula', hexColor: '#A3C6BE', targetTone: ['Fair', 'Light', 'Medium', 'Tan', 'Deep'], targetUndertone: ['Warm', 'Cool', 'Neutral', 'Olive'] },
    { id: 'sh-sk-2', productId: 'prod-skin-cleanser', shadeNumber: '125ml', shadeName: 'pH 5.5 Barrier Soothing Wash', hexColor: '#B7D4E5', targetTone: ['Fair', 'Light', 'Medium', 'Tan', 'Deep'], targetUndertone: ['Warm', 'Cool', 'Neutral', 'Olive'] },
    { id: 'sh-sk-3', productId: 'prod-skin-moisturiser', shadeNumber: '60g', shadeName: '5-Ceramide Deep Hydration', hexColor: '#E7C8D0', targetTone: ['Fair', 'Light', 'Medium', 'Tan', 'Deep'], targetUndertone: ['Warm', 'Cool', 'Neutral', 'Olive'] },
    { id: 'sh-sk-4', productId: 'prod-skin-sunscreen', shadeNumber: '50g', shadeName: 'Invisible Gel SPF 50 PA++++', hexColor: '#F3D6A4', targetTone: ['Fair', 'Light', 'Medium', 'Tan', 'Deep'], targetUndertone: ['Warm', 'Cool', 'Neutral', 'Olive'] },
  ];

  const inventory = [
    { id: 'inv-1', productId: 'prod-may-fitme-fnd', quantity: 18, lastUpdated: '2026-11-12T10:15:00Z' },
    { id: 'inv-2', productId: 'prod-may-fitme-con', quantity: 14, lastUpdated: '2026-11-12T10:15:00Z' },
    { id: 'inv-3', productId: 'prod-may-superstay', quantity: 22, lastUpdated: '2026-11-12T10:15:00Z' },
    { id: 'inv-4', productId: 'prod-lak-9to5-fnd', quantity: 4, lastUpdated: '2026-11-12T09:30:00Z' }, // Low stock demo
    { id: 'inv-5', productId: 'prod-lak-mousse', quantity: 11, lastUpdated: '2026-11-12T10:15:00Z' },
    { id: 'inv-6', productId: 'prod-lak-forever-lip', quantity: 16, lastUpdated: '2026-11-12T10:15:00Z' },
    { id: 'inv-7', productId: 'prod-lor-truematch', quantity: 9, lastUpdated: '2026-11-12T10:15:00Z' },
    { id: 'inv-8', productId: 'prod-lor-infallible-con', quantity: 3, lastUpdated: '2026-11-12T08:45:00Z' }, // Low stock demo
    { id: 'inv-9', productId: 'prod-lor-colorriche', quantity: 15, lastUpdated: '2026-11-12T10:15:00Z' },
    { id: 'inv-10', productId: 'prod-mars-fnd', quantity: 25, lastUpdated: '2026-11-12T10:15:00Z' },
    { id: 'inv-11', productId: 'prod-mars-con', quantity: 19, lastUpdated: '2026-11-12T10:15:00Z' },
    { id: 'inv-12', productId: 'prod-mars-lip', quantity: 28, lastUpdated: '2026-11-12T10:15:00Z' },
    { id: 'inv-13', productId: 'prod-skin-niacinamide', quantity: 12, lastUpdated: '2026-11-12T10:15:00Z' },
    { id: 'inv-14', productId: 'prod-skin-cleanser', quantity: 20, lastUpdated: '2026-11-12T10:15:00Z' },
    { id: 'inv-15', productId: 'prod-skin-moisturiser', quantity: 4, lastUpdated: '2026-11-12T11:00:00Z' }, // Low stock demo
    { id: 'inv-16', productId: 'prod-skin-sunscreen', quantity: 17, lastUpdated: '2026-11-12T10:15:00Z' },
  ];

  const customers = [
    {
      id: 'cust-priya',
      fullName: 'Priya Sharma',
      mobile: '9876543210',
      age: 27,
      gender: 'Female',
      email: 'priya.sharma@example.in',
      consentCamera: true,
      consentProcessing: true,
      consentStorage: true,
      consentMarketing: true,
      registeredAt: '2026-11-12',
      lastVisit: '2026-11-12',
      purchases: [
        { id: 'pur-1', productName: 'Maybelline Fit Me Matte + Poreless Foundation (230 Natural Buff)', priceInr: 549, date: '2026-11-12' },
        { id: 'pur-2', productName: 'Minimalist 10% Niacinamide + Zinc Serum', priceInr: 599, date: '2026-11-12' }
      ]
    },
    {
      id: 'cust-ananya',
      fullName: 'Ananya Verma',
      mobile: '9811223344',
      age: 24,
      gender: 'Female',
      email: 'ananya.v@example.in',
      consentCamera: true,
      consentProcessing: true,
      consentStorage: true,
      consentMarketing: true,
      registeredAt: '2026-11-10',
      lastVisit: '2026-11-12',
      purchases: [
        { id: 'pur-3', productName: 'L’Oréal Paris True Match Foundation (2.N Vanilla)', priceInr: 1099, date: '2026-11-10' }
      ]
    },
    {
      id: 'cust-meera',
      fullName: 'Meera Nair',
      mobile: '9900112233',
      age: 32,
      gender: 'Female',
      email: 'meera.nair@example.in',
      consentCamera: true,
      consentProcessing: true,
      consentStorage: true,
      consentMarketing: false,
      registeredAt: '2026-11-08',
      lastVisit: '2026-11-11',
      purchases: [
        { id: 'pur-4', productName: 'MARS High Coverage Liquid Foundation (06 Rich Cocoa)', priceInr: 349, date: '2026-11-08' },
        { id: 'pur-5', productName: 'Plum Green Tea & Rice Water SPF 50 Sunscreen', priceInr: 449, date: '2026-11-11' }
      ]
    },
    {
      id: 'cust-rohan',
      fullName: 'Rohan Kapoor',
      mobile: '9820445566',
      age: 29,
      gender: 'Male',
      email: 'rohan.kapoor@example.in',
      consentCamera: true,
      consentProcessing: true,
      consentStorage: true,
      consentMarketing: true,
      registeredAt: '2026-11-09',
      lastVisit: '2026-11-09',
      purchases: [
        { id: 'pur-6', productName: 'Cetaphil Gentle Hydrating Skin Cleanser', priceInr: 349, date: '2026-11-09' }
      ]
    }
  ];

  const beauty_analyses = [
    {
      id: 'ana-priya',
      customerId: 'cust-priya',
      createdAt: '2026-11-12T11:20:00Z',
      mode: 'AI Vision Verified',
      confidence: 96,
      skinTone: 'Medium',
      undertone: 'Warm',
      skinType: 'Combination',
      concerns: ['Mild T-zone shine', 'Subtle uneven tone around mouth', 'Light under-eye shadows'],
      textureObservations: 'Smooth cheek barrier with slightly visible pores across the nasal bridge and forehead T-zone.',
      summary: 'Balanced Medium complexion with golden-peach warm undertones and classic Combination skin characteristics.',
      colorPalette: [
        { name: 'Peach', hex: '#F4A488', tip: 'Ideal for cream & powder cheek flush' },
        { name: 'Coral', hex: '#E56B5B', tip: 'Brightens daytime lip & cheek looks' },
        { name: 'Warm Nude', hex: '#C78E75', tip: 'Effortless everyday lip contour' },
        { name: 'Terracotta', hex: '#B45643', tip: 'Statement evening matte lip' },
        { name: 'Rose Brown', hex: '#9E615C', tip: 'Soft sculptural crease eyeshadow' }
      ],
      makeupAnalysis: {
        foundationFamily: 'Golden-Beige & Warm Buff Medium Shades',
        concealerDirection: 'Peach-neutralized medium concealer for under-eye brightening',
        blushColors: ['Warm Apricot', 'Soft Coral', 'Sunlit Peach'],
        lipstickColors: ['Terracotta Nude', 'Spiced Coral', 'Warm Rose Brown'],
        eyeshadowPalette: ['Champagne Gold', 'Bronze Shimmer', 'Warm Espresso'],
        colorFamily: 'Warm Autumnal & Sunlit Earth Tones'
      },
      skincareAnalysis: {
        categories: ['Oil-Balancing Serum', 'pH-Neutral Gel Cleanser', 'Lightweight Ceramide Gel-Cream', 'Matte Broad-Spectrum SPF 50'],
        cleanser: 'Gentle non-stripping hydrating cleanser to prevent rebound T-zone oiliness',
        moisturiser: 'Ceramide & Hyaluronic barrier moisturiser applied lightly on T-zone',
        sunscreen: 'Zero-white-cast SPF 50 PA++++ matte fluid for daily UV defense',
        serum: '10% Niacinamide + Zinc serum to refine pores and even out skin tone'
      }
    },
    {
      id: 'ana-ananya',
      customerId: 'cust-ananya',
      createdAt: '2026-11-10T15:10:00Z',
      mode: 'AI Vision Verified',
      confidence: 94,
      skinTone: 'Fair',
      undertone: 'Cool',
      skinType: 'Dry',
      concerns: ['Mild cheek dryness', 'Slight surface redness'],
      textureObservations: 'Fine pore structure with dehydrated lipid film on lower cheeks.',
      summary: 'Luminous Fair skin with delicate rosy-pink cool undertones and moisture-seeking Dry skin.',
      colorPalette: [
        { name: 'Dusty Rose', hex: '#C26D7A', tip: 'Harmonizes with cool pink undertones' },
        { name: 'Petal Pink', hex: '#E598A8', tip: 'Fresh luminous blush tint' },
        { name: 'Mauve Nude', hex: '#B27A84', tip: 'Chic everyday satin lip' },
        { name: 'Berry Sorbet', hex: '#963852', tip: 'High-contrast festive lip' },
        { name: 'Cool Taupe', hex: '#8E7D82', tip: 'Soft smoky eye definition' }
      ],
      makeupAnalysis: {
        foundationFamily: 'Cool Ivory & Rosy Vanilla Hydrating Foundations',
        concealerDirection: 'Light neutral-pink brightening concealer',
        blushColors: ['Petal Pink', 'Cool Berry Flush', 'Soft Mauve'],
        lipstickColors: ['Dusty Rose', 'Mauve Nude', 'Classic Blue-Red'],
        eyeshadowPalette: ['Silver Champagne', 'Soft Mauve', 'Plum Charcoal'],
        colorFamily: 'Cool Berry, Rose & Soft Mauve Palette'
      },
      skincareAnalysis: {
        categories: ['Creamy Barrier Cleanser', 'Ceramide Rich Cream', 'Hydrating SPF 50'],
        cleanser: 'Soap-free lipid-preserving gentle cleanser',
        moisturiser: '5-Ceramide & Hyaluronic acid barrier repair cream',
        sunscreen: 'Dewy hydrating SPF 50 PA++++ sunscreen',
        serum: 'Hyaluronic + Niacinamide barrier strengthening drops'
      }
    },
    {
      id: 'ana-meera',
      customerId: 'cust-meera',
      createdAt: '2026-11-11T17:40:00Z',
      mode: 'AI Vision Verified',
      confidence: 95,
      skinTone: 'Deep',
      undertone: 'Olive',
      skinType: 'Oily',
      concerns: ['Excess sebum sheen', 'Mild hyperpigmentation around jawline'],
      textureObservations: 'Resilient skin texture with active sebaceous zones across forehead and nose.',
      summary: 'Rich Deep complexion with balanced olive-neutral undertones and oily-resilient skin.',
      colorPalette: [
        { name: 'Spiced Terracotta', hex: '#9E4638', tip: 'Rich warm-olive lip harmony' },
        { name: 'Deep Berry', hex: '#7A2838', tip: 'Vibrant jewel-toned statement' },
        { name: 'Burnished Bronze', hex: '#8D583A', tip: 'Luminous cheek & lid warmth' },
        { name: 'Plum Wine', hex: '#63263A', tip: 'Velvet evening lip' },
        { name: 'Amber Gold', hex: '#C58B36', tip: 'High-impact lid highlight' }
      ],
      makeupAnalysis: {
        foundationFamily: 'Rich Cocoa & Deep Olive-Golden Foundations',
        concealerDirection: 'Warm amber-caramel high-coverage concealer',
        blushColors: ['Rich Berry', 'Burnt Terracotta', 'Deep Apricot'],
        lipstickColors: ['Deep Berry', 'Plum Wine', 'Chocolate Nude'],
        eyeshadowPalette: ['Amber Gold', 'Copper Bronze', 'Deep Espresso'],
        colorFamily: 'Rich Jewel, Bronze & Spiced Earth Tones'
      },
      skincareAnalysis: {
        categories: ['Oil-Control Niacinamide Serum', 'Matte Gel Sunscreen', 'Gentle Foaming Wash'],
        cleanser: 'pH-balanced gentle cleanser to clear excess sebum without tightness',
        moisturiser: 'Oil-free lightweight hydration gel',
        sunscreen: 'Zero-white-cast matte SPF 50 PA++++',
        serum: '10% Niacinamide + Zinc for sebum regulation and dark spot clarity'
      }
    },
    {
      id: 'ana-rohan',
      customerId: 'cust-rohan',
      createdAt: '2026-11-09T13:05:00Z',
      mode: 'AI Vision Verified',
      confidence: 93,
      skinTone: 'Tan',
      undertone: 'Warm',
      skinType: 'Combination',
      concerns: ['Sun tan unevenness', 'Mild nose congestion'],
      textureObservations: 'Healthy elasticity with mild UV-induced uneven tone across cheekbones.',
      summary: 'Sunlit Tan complexion with warm golden undertones and Combination skin.',
      colorPalette: [
        { name: 'Warm Sand', hex: '#C69168', tip: 'Natural invisible skin-tint match' },
        { name: 'Golden Bronze', hex: '#A46D46', tip: 'Healthy sunlit warmth' },
        { name: 'Muted Terracotta', hex: '#AE5B49', tip: 'Subtle natural lip tint' },
        { name: 'Soft Espresso', hex: '#5C3D31', tip: 'Groomed brow & lash definition' },
        { name: 'Clear Amber', hex: '#D99E5B', tip: 'Antioxidant daytime radiance' }
      ],
      makeupAnalysis: {
        foundationFamily: 'Sheer Warm Toffee & Sun Beige Skin Tints',
        concealerDirection: 'Natural tan spot-concealer for blemishes',
        blushColors: ['Sunlit Bronze'],
        lipstickColors: ['Clear Moisturising Lip Balm / Muted Nude'],
        eyeshadowPalette: ['Neutral Matte Taupe'],
        colorFamily: 'Natural Invisible Warm Earth Tones'
      },
      skincareAnalysis: {
        categories: ['Broad-Spectrum Matte Sunscreen', 'Niacinamide Tone-Evening Serum', 'Daily Gentle Cleanser'],
        cleanser: 'Cetaphil Gentle Hydrating Skin Cleanser',
        moisturiser: 'Lightweight Ceramide & Hyaluronic barrier gel',
        sunscreen: 'Plum SPF 50 PA++++ matte invisible sunscreen',
        serum: 'Minimalist 10% Niacinamide + Zinc serum'
      }
    }
  ];

  const recommendations = [
    { id: 'rec-1', customerId: 'cust-priya', productId: 'prod-may-fitme-fnd', shadeId: 'sh-may-f1', matchScore: 97, createdAt: '2026-11-12T11:20:05Z' },
    { id: 'rec-2', customerId: 'cust-priya', productId: 'prod-may-fitme-con', shadeId: 'sh-may-c1', matchScore: 95, createdAt: '2026-11-12T11:20:05Z' },
    { id: 'rec-3', customerId: 'cust-priya', productId: 'prod-may-superstay', shadeId: 'sh-may-l1', matchScore: 94, createdAt: '2026-11-12T11:20:05Z' },
    { id: 'rec-4', customerId: 'cust-priya', productId: 'prod-skin-niacinamide', shadeId: 'sh-sk-1', matchScore: 96, createdAt: '2026-11-12T11:20:05Z' },
    { id: 'rec-5', customerId: 'cust-ananya', productId: 'prod-lor-truematch', shadeId: 'sh-lor-f2', matchScore: 98, createdAt: '2026-11-10T15:10:05Z' },
    { id: 'rec-6', customerId: 'cust-meera', productId: 'prod-mars-fnd', shadeId: 'sh-mars-f2', matchScore: 96, createdAt: '2026-11-11T17:40:05Z' },
  ];

  const customer_messages = [
    {
      id: 'msg-1',
      customerId: 'cust-priya',
      customerName: 'Priya Sharma',
      channel: 'WhatsApp',
      status: 'Logged (Sandbox Ready)',
      sentAt: '2026-11-12T11:21:00Z',
      content: `Hi Priya Sharma! Welcome to KLOZEVA Beauty.\n\nYour beauty analysis is complete!\n\nYour Skin Tone: Medium\nYour Undertone: Warm\nYour Skin Type: Combination\n\nYour personalised makeup and skincare recommendations are ready.\n\nVisit the store to explore your perfect matches!`
    }
  ];

  const retailer_accounts = [
    {
      id: 'ret-1',
      email: 'admin@klozeva.in',
      storeName: 'KLOZEVA Flagship Beauty Studio — Jubilee Hills, Hyderabad',
      managerName: 'Aarav Mehta',
      role: 'Senior Retail Director',
      lastLogin: '2026-11-12T09:00:00Z'
    }
  ];

  return {
    brands,
    products,
    product_shades,
    inventory,
    customers,
    beauty_analyses,
    recommendations,
    customer_messages,
    retailer_accounts,
    lowStockThreshold: 5
  };
};
