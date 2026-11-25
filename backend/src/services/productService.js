const fs = require('fs');
const path = require('path');
const { getDb } = require('../config/firebaseAdmin');
const { rupeesToPaise, formatINR } = require('../utils/currency');
const { logger } = require('../utils/logger');

function generateProductHtmlPage(product) {
  try {
    const templatePath = path.resolve(__dirname, '../../../product/swim-training-fins.html');
    if (!fs.existsSync(templatePath)) return;
    let html = fs.readFileSync(templatePath, 'utf8');

    const rawImages = (product.images && Array.isArray(product.images) && product.images.length > 0)
      ? product.images
      : (product.imageUrl ? [{ url: product.imageUrl, alt: product.name, order: 0, isPrimary: true }] : []);

    const resolvedImages = rawImages.map((img, idx) => {
      let u = typeof img === 'string' ? img : (img.url || '');
      if (u && !u.startsWith('http') && !u.startsWith('/') && !u.startsWith('../')) {
        u = `../${u}`;
      }
      return {
        url: u,
        alt: (typeof img === 'object' && img.alt) || product.name || 'Product Image',
        order: typeof img.order === 'number' ? img.order : idx
      };
    }).sort((a, b) => (a.order || 0) - (b.order || 0));

    const primaryImg = resolvedImages[0]?.url || '../6424266ea05809dff501d86e/lane4-6dbhNuWa5oI-640x640.jpg';

    const hasDiscount = product.salePricePaise && product.salePricePaise > 0 && product.salePricePaise < product.regularPricePaise;
    const priceFormatted = hasDiscount
      ? `<span style="text-decoration:line-through;color:#94a3b8;font-size:0.85em;margin-right:6px;">${formatINR(product.regularPricePaise)}</span> <span style="color:#16a34a;">${formatINR(product.salePricePaise)}</span>`
      : formatINR(product.regularPricePaise || product.salePricePaise || 0);

    // Replace Slug attribute
    html = html.replace(/data-wf-item-slug="[^"]*"/, `data-wf-item-slug="${product.slug}"`);
    // Replace Title
    html = html.replace(/<title>.*?<\/title>/, `<title>${product.name} | The Lane4 Performance Store</title>`);
    // Replace Breadcrumb
    html = html.replace(/<a href="swim-training-fins\.html"[^>]*><div class="paragraph-14px">Swim Training Fins<\/div><\/a>/, `<a href="${product.slug}.html" aria-current="page" class="w-inline-block w--current"><div class="paragraph-14px">${product.name}</div></a>`);
    // Replace pd-heading
    html = html.replace(
      /<div class="pd-heading"><h4 class="title-h4">.*?<\/h4><div class="paragraph-18px">.*?<\/div><h6[^>]*class="title-h6">.*?<\/h6><\/div>/,
      `<div class="pd-heading"><h4 class="title-h4">${product.name}</h4><div class="paragraph-18px">${product.shortDescription || 'Pool-tested performance'}</div><h6 class="title-h6">${priceFormatted}</h6></div>`
    );

    // Build structured gallery HTML based on actual product images in exact order
    let galleryInnerHtml = '';
    if (resolvedImages.length <= 1) {
      const singleUrl = resolvedImages[0]?.url || primaryImg;
      const singleAlt = resolvedImages[0]?.alt || product.name || 'Product Image';
      galleryInnerHtml = `
        <div class="image-gallery-row single-image">
          <a href="${singleUrl}" class="lightbox-link w-inline-block w-lightbox" style="width:100%;">
            <img class="product-img" src="${singleUrl}" alt="${singleAlt}" style="width:100%;height:auto;max-height:640px;object-fit:cover;border-radius:6px;display:block;">
            <script type="application/json" class="w-json">{"items":[{"url":"${singleUrl}","type":"image"}],"group":"product-gallery"}</script>
          </a>
        </div>`;
    } else {
      for (let i = 0; i < resolvedImages.length; i += 2) {
        const img1 = resolvedImages[i];
        const img2 = resolvedImages[i + 1];
        galleryInnerHtml += `
          <div class="image-gallery-row">
            <a href="${img1.url}" class="lightbox-link w-inline-block w-lightbox">
              <img class="product-img" src="${img1.url}" alt="${img1.alt}">
              <script type="application/json" class="w-json">{"items":[{"url":"${img1.url}","type":"image"}],"group":"product-gallery"}</script>
            </a>
            ${img2 ? `
            <a href="${img2.url}" class="lightbox-link w-inline-block w-lightbox">
              <img class="product-img" src="${img2.url}" alt="${img2.alt}">
              <script type="application/json" class="w-json">{"items":[{"url":"${img2.url}","type":"image"}],"group":"product-gallery"}</script>
            </a>` : ''}
          </div>`;
      }
    }

    // Replace the entire gallery element with the cleanly structured gallery
    html = html.replace(/<div class="image-gallery">[\s\S]*?<\/div>(?=\s*<div[^>]*class="product-details")/i, `<div class="image-gallery">${galleryInnerHtml}</div>`);

    // Replace product description if present
    if (product.description) {
      html = html.replace(/Short-blade silicone training fins that build leg strength and improve kick technique without changing your natural stroke\./, product.description);
    }

    const outputPath = path.resolve(__dirname, `../../../product/${product.slug}.html`);
    fs.writeFileSync(outputPath, html, 'utf8');
    logger.info(`Generated product storefront page: product/${product.slug}.html`);
  } catch (err) {
    logger.warn('Could not generate static product HTML file:', err);
  }
}

// Initial seed data for the 6 core LANE4 products matching static HTML
const INITIAL_PRODUCTS = [
  {
    name: 'Mirror Racing Goggles',
    slug: 'mirror-racing-goggles',
    sku: 'L4-GOG-MRG-001',
    description: 'Race-ready mirrored goggles with a low-profile hydrodynamic design, anti-fog coated lenses and UV protection. The adjustable split silicone strap keeps them secure through starts, turns and finishes.',
    shortDescription: 'Pool-tested performance mirrored racing goggles with UV protection.',
    categorySlug: 'goggles',
    regularPricePaise: 179900,
    salePricePaise: 139900,
    hasVariants: true,
    variants: [
      { variantId: 'mrg-smk', sku: 'L4-GOG-MRG-SMK', size: 'One Size', color: 'Smoke Mirror', stockQuantity: 25, lowStockThreshold: 5, isActive: true },
      { variantId: 'mrg-blu', sku: 'L4-GOG-MRG-BLU', size: 'One Size', color: 'Blue Mirror', stockQuantity: 18, lowStockThreshold: 5, isActive: true }
    ],
    specifications: {
      'Lens': 'Polycarbonate Mirrored Coating',
      'Gasket': 'Ultra-soft Hypoallergenic Silicone',
      'Strap': 'Double Split Silicone with Rear Buckle',
      'Anti-Fog': 'Hydrophobic Internal Coating'
    },
    images: [
      { publicId: 'lane4-goggles-product', url: '6424266ea05809dff501d86e/lane4-goggles-product.svg', alt: 'Lane4 Mirror Racing Goggles', order: 0 },
      { publicId: 'lane4-surge-goggles-poolside-fit-800', url: '6424266ea05809dff501d86e/lane4-surge-goggles-poolside-fit-800.jpg', alt: 'Surge Mirror Racing Goggles Poolside', order: 1 }
    ],
    isFeatured: true,
    isBestseller: true,
    isNewArrival: false,
    isPublished: true,
    isDeleted: false,
    seo: {
      metaTitle: 'Mirror Racing Goggles | Buy Online India | The Lane4 Performance Store',
      metaDescription: 'Race-ready mirrored goggles with low-profile design and anti-fog coated lenses.',
      keywords: ['mirror racing goggles', 'swimming goggles India', 'Lane4']
    }
  },
  {
    name: 'Open Water Goggles',
    slug: 'open-water-goggles',
    sku: 'L4-GOG-OPW-002',
    description: 'Curved panoramic lenses offering 180-degree visibility in open water, lakes, and open-air lap pools. Polarized protection reduces harsh glare on bright mornings.',
    shortDescription: '180-degree panoramic vision polarized open water goggles.',
    categorySlug: 'goggles',
    regularPricePaise: 219900,
    salePricePaise: 179900,
    hasVariants: true,
    variants: [
      { variantId: 'opw-clr', sku: 'L4-GOG-OPW-CLR', size: 'One Size', color: 'Clear Polarized', stockQuantity: 15, lowStockThreshold: 3, isActive: true },
      { variantId: 'opw-drk', sku: 'L4-GOG-OPW-DRK', size: 'One Size', color: 'Dark Amber', stockQuantity: 12, lowStockThreshold: 3, isActive: true }
    ],
    specifications: {
      'Lens': 'Curved Polarized Polycarbonate',
      'Field of View': '180 Degrees Wide Angle',
      'UV Filter': '100% UVA/UVB Protection'
    },
    images: [
      { publicId: 'lane4-UidC8VtVl94-1080x1620', url: '6424266ea05809dff501d86e/lane4-UidC8VtVl94-1080x1620.jpg', alt: 'Open Water Goggles Front', order: 0 }
    ],
    isFeatured: true,
    isBestseller: false,
    isNewArrival: true,
    isPublished: true,
    isDeleted: false,
    seo: {
      metaTitle: 'Open Water Goggles | Buy Online India | The Lane4 Performance Store',
      metaDescription: 'Wide-vision polarized open water goggles from The Lane4 Performance Store.',
      keywords: ['open water goggles', 'triathlon goggles', 'swimming gear Nagpur']
    }
  },
  {
    name: 'Performance Racing Jammer',
    slug: 'performance-racing-jammer',
    sku: 'L4-SWM-JMR-003',
    description: 'FINA-compliant athletic racing jammers constructed with targeted muscle compression and water-repellent micro-weave fabric for optimal hydrodynamic efficiency.',
    shortDescription: 'FINA approved compression racing suit for competitive swimmers.',
    categorySlug: 'swimwear',
    regularPricePaise: 299900,
    salePricePaise: 249900,
    hasVariants: true,
    variants: [
      { variantId: 'jmr-28', sku: 'L4-SWM-JMR-28', size: '28', color: 'Jet Black', stockQuantity: 10, lowStockThreshold: 2, isActive: true },
      { variantId: 'jmr-30', sku: 'L4-SWM-JMR-30', size: '30', color: 'Jet Black', stockQuantity: 14, lowStockThreshold: 3, isActive: true },
      { variantId: 'jmr-32', sku: 'L4-SWM-JMR-32', size: '32', color: 'Jet Black', stockQuantity: 20, lowStockThreshold: 4, isActive: true },
      { variantId: 'jmr-34', sku: 'L4-SWM-JMR-34', size: '34', color: 'Jet Black', stockQuantity: 8, lowStockThreshold: 2, isActive: true }
    ],
    specifications: {
      'Material': '71% Polyamide, 29% Elastane',
      'Compliance': 'World Aquatics / FINA Approved',
      'Stitching': 'Flatlock Reinforced Anti-Chafe Seams'
    },
    images: [
      { publicId: 'lane4-hawN8XnaJuY-500x750', url: '6424266ea05809dff501d86e/lane4-hawN8XnaJuY-500x750.jpg', alt: 'Performance Racing Jammer', order: 0 }
    ],
    isFeatured: true,
    isBestseller: true,
    isNewArrival: false,
    isPublished: true,
    isDeleted: false,
    seo: {
      metaTitle: 'Performance Racing Jammer | Buy Online India | The Lane4 Performance Store',
      metaDescription: 'Competitive swimming jammers with targeted compression and water repellency.',
      keywords: ['racing jammer India', 'swimwear Nagpur', 'FINA jammers']
    }
  },
  {
    name: 'Surge Racing Cap',
    slug: 'surge-racing-cap',
    sku: 'L4-CAP-SRG-004',
    description: '100% medical-grade dome silicone racing cap designed to eliminate wrinkles and lower resistance through the water. Official cap of Surge Swim.',
    shortDescription: 'Molded wrinkle-free dome silicone competition swim cap.',
    categorySlug: 'racing-caps',
    regularPricePaise: 79900,
    salePricePaise: 59900,
    hasVariants: true,
    variants: [
      { variantId: 'srg-blk', sku: 'L4-CAP-SRG-BLK', size: 'Standard', color: 'Matte Black', stockQuantity: 40, lowStockThreshold: 10, isActive: true },
      { variantId: 'srg-wht', sku: 'L4-CAP-SRG-WHT', size: 'Standard', color: 'Classic White', stockQuantity: 30, lowStockThreshold: 10, isActive: true },
      { variantId: 'srg-slv', sku: 'L4-CAP-SRG-SLV', size: 'Standard', color: 'Racing Silver', stockQuantity: 22, lowStockThreshold: 5, isActive: true }
    ],
    specifications: {
      'Composition': '100% High-Grade Silicone',
      'Molding': '3D Seamless Ergonomic Dome',
      'Fit': 'Snug Competition Contour'
    },
    images: [
      { publicId: 'lane4-racing-cap-800', url: '6424266ea05809dff501d86e/lane4-racing-cap-800.jpg', alt: 'Surge Racing Cap', order: 0 }
    ],
    isFeatured: true,
    isBestseller: true,
    isNewArrival: false,
    isPublished: true,
    isDeleted: false,
    seo: {
      metaTitle: 'Surge Racing Cap | Buy Online India | The Lane4 Performance Store',
      metaDescription: 'Wrinkle-free dome silicone racing cap from Surge Swim and Lane4.',
      keywords: ['silicone racing cap', 'Surge Swim', 'swim cap Nagpur']
    }
  },
  {
    name: 'Lycra Training Cap',
    slug: 'lycra-training-cap',
    sku: 'L4-CAP-LYC-005',
    description: 'Soft, breathable Lycra swim cap that does not pull or snag hair. Ideal for daily training sessions, learn-to-swim programs, and fitness swimmers.',
    shortDescription: 'Gentle, snag-free Lycra fabric cap for daily practice and drills.',
    categorySlug: 'racing-caps',
    regularPricePaise: 49900,
    salePricePaise: 39900,
    hasVariants: true,
    variants: [
      { variantId: 'lyc-nvy', sku: 'L4-CAP-LYC-NVY', size: 'Universal Fit', color: 'Navy Blue', stockQuantity: 35, lowStockThreshold: 8, isActive: true },
      { variantId: 'lyc-blk', sku: 'L4-CAP-LYC-BLK', size: 'Universal Fit', color: 'Solid Black', stockQuantity: 28, lowStockThreshold: 8, isActive: true }
    ],
    specifications: {
      'Fabric': '82% Nylon, 18% Spandex Lycra',
      'Breathability': 'High Chlorine-Resistant Weave',
      'Hair Protection': 'Zero Pulling or Snagging'
    },
    images: [
      { publicId: 'lane4-TVOAbbLL050-500x750', url: '6424266ea05809dff501d86e/lane4-TVOAbbLL050-500x750.jpg', alt: 'Lycra Training Cap', order: 0 }
    ],
    isFeatured: false,
    isBestseller: false,
    isNewArrival: false,
    isPublished: true,
    isDeleted: false,
    seo: {
      metaTitle: 'Lycra Training Cap | Buy Online India | The Lane4 Performance Store',
      metaDescription: 'Comfortable Lycra swim cap for daily training and practice.',
      keywords: ['lycra swim cap', 'training cap', 'soft swim cap']
    }
  },
  {
    name: 'Swim Training Fins',
    slug: 'swim-training-fins',
    sku: 'L4-TRN-FIN-006',
    description: 'Short-blade 100% natural rubber training fins designed to build leg strength, correct kicking tempo, and improve ankle flexibility without straining the lower back.',
    shortDescription: 'Short-blade natural rubber fins for tempo kick training.',
    categorySlug: 'training-gear',
    regularPricePaise: 249900,
    salePricePaise: 199900,
    hasVariants: true,
    variants: [
      { variantId: 'fin-s', sku: 'L4-TRN-FIN-S', size: 'Small (EU 36-38)', color: 'Black/Cyan', stockQuantity: 12, lowStockThreshold: 3, isActive: true },
      { variantId: 'fin-m', sku: 'L4-TRN-FIN-M', size: 'Medium (EU 39-41)', color: 'Black/Cyan', stockQuantity: 16, lowStockThreshold: 4, isActive: true },
      { variantId: 'fin-l', sku: 'L4-TRN-FIN-L', size: 'Large (EU 42-44)', color: 'Black/Cyan', stockQuantity: 14, lowStockThreshold: 4, isActive: true }
    ],
    specifications: {
      'Blade Style': 'Short Blade High Cadence',
      'Material': '100% Natural Buoyant Rubber',
      'Foot Pocket': 'Closed Ankle Ergonomic Cushion'
    },
    images: [
      { publicId: 'lane4-fCM6ZvTgD9A-1080x1080', url: '6424266ea05809dff501d86e/lane4-fCM6ZvTgD9A-1080x1080.jpg', alt: 'Swim Training Fins', order: 0 }
    ],
    isFeatured: true,
    isBestseller: true,
    isNewArrival: true,
    isPublished: true,
    isDeleted: false,
    seo: {
      metaTitle: 'Swim Training Fins | Buy Online India | The Lane4 Performance Store',
      metaDescription: 'Short-blade swim training fins for kick mechanics and speed.',
      keywords: ['swimming fins India', 'training fins', 'swim gear Nagpur']
    }
  },
  {
    name: 'Pro Kickboard Hydro Flow',
    slug: 'pro-kickboard-hydro-flow',
    sku: 'L4-TRN-KB-001',
    description: 'High-density closed-cell EVA foam kickboard engineered to reduce shoulder strain and maximize leg power generation.',
    shortDescription: 'High-density closed-cell EVA foam kickboard for kicking technique.',
    categorySlug: 'training-gear',
    regularPricePaise: 249900,
    salePricePaise: 199900,
    hasVariants: false,
    variants: [],
    specifications: {
      'Material': 'High-density closed-cell EVA foam',
      'Grip': 'Dual contoured hand grip cutouts'
    },
    images: [
      { publicId: 'lane4-X8RgOcqugtQ-640x960', url: '6424266ea05809dff501d86e/lane4-X8RgOcqugtQ-640x960.jpg', alt: 'Pro Kickboard Hydro Flow', isPrimary: true, order: 0 }
    ],
    isFeatured: true,
    isBestseller: false,
    isNewArrival: false,
    isPublished: true,
    isDeleted: false,
    seo: {
      metaTitle: 'Pro Kickboard Hydro Flow | Buy Online India | The Lane4 Performance Store',
      metaDescription: 'High-density closed-cell EVA foam kickboard engineered to reduce shoulder strain.',
      keywords: ['kickboard India', 'swimming kickboard', 'training gear Nagpur']
    }
  }
];

function toTimestampMillis(val) {
  if (!val) return 0;
  if (typeof val === 'number') return val < 1e11 ? val * 1000 : val;
  if (typeof val === 'object') {
    if (typeof val._seconds === 'number') return val._seconds * 1000 + (val._nanoseconds || 0) / 1e6;
    if (typeof val.seconds === 'number') return val.seconds * 1000 + (val.nanoseconds || 0) / 1e6;
    if (typeof val.toMillis === 'function') return val.toMillis();
    if (typeof val.getTime === 'function') return val.getTime();
    if (val instanceof Date) return val.getTime();
  }
  const d = new Date(val);
  return isNaN(d.getTime()) ? 0 : d.getTime();
}

class ProductService {
  /**
   * Seed catalog products if empty
   */
  async seedInitialProducts() {
    const db = getDb();
    if (!db) return;

    try {
      const snap = await db.collection('products').limit(1).get();
      if (snap.empty) {
        logger.info('Products collection empty. Seeding initial catalog...');
        for (const prod of INITIAL_PRODUCTS) {
          const docRef = db.collection('products').doc();
          const productData = {
            id: docRef.id,
            ...prod,
            createdAt: new Date(),
            updatedAt: new Date()
          };
          await docRef.set(productData);

          // Seed corresponding inventory entries
          for (const v of prod.variants) {
            await db.collection('inventory').doc(v.sku).set({
              sku: v.sku,
              productId: docRef.id,
              variantId: v.variantId,
              productName: prod.name,
              variantLabel: `${v.size || ''} ${v.color || ''}`.trim(),
              availableQuantity: v.stockQuantity,
              reservedQuantity: 0,
              lowStockThreshold: v.lowStockThreshold || 5,
              isOutOfStock: v.stockQuantity <= 0,
              updatedAt: new Date()
            });
          }
        }
        logger.info('Successfully seeded 6 catalog products and variant inventory.');
      }
    } catch (err) {
      logger.error('Error seeding initial products', err);
    }
  }

  async listProducts(filters = {}) {
    const db = getDb();
    if (!db) return { products: [], total: 0 };

    let query = db.collection('products');

    if (filters.onlyPublished !== false) {
      query = query.where('isPublished', '==', true);
    }
    query = query.where('isDeleted', '==', false);

    if (filters.categorySlug) {
      query = query.where('categorySlug', '==', filters.categorySlug);
    }

    if (filters.featured === true || filters.featured === 'true') {
      query = query.where('isFeatured', '==', true);
    }

    const snapshot = await query.get();
    let products = snapshot.docs.map(doc => doc.data());

    if (filters.onlyPublished !== false) {
      products = products.filter(p =>
        p.isPublished === true &&
        p.description && p.description.trim().length >= 10
      );
    }

    // Sanitize any broken image paths
    products = products.map(p => {
      if (p.images && Array.isArray(p.images)) {
        p.images = p.images.map(img => {
          if (img.url && img.url.includes('test-kickboard.jpg')) {
            return { ...img, url: '6424266ea05809dff501d86e/lane4-X8RgOcqugtQ-640x960.jpg' };
          }
          return img;
        });
      }
      return p;
    });

    // Search filter in-memory if requested
    if (filters.search) {
      const s = filters.search.toLowerCase().trim();
      products = products.filter(p =>
        (p.name && p.name.toLowerCase().includes(s)) ||
        (p.description && p.description.toLowerCase().includes(s)) ||
        (p.sku && p.sku.toLowerCase().includes(s))
      );
    }

    // Sorting
    if (filters.sort === 'price_asc') {
      products.sort((a, b) => (a.salePricePaise || a.regularPricePaise) - (b.salePricePaise || b.regularPricePaise));
    } else if (filters.sort === 'price_desc') {
      products.sort((a, b) => (b.salePricePaise || b.regularPricePaise) - (a.salePricePaise || a.regularPricePaise));
    } else {
      // Default newest first (latest created product strictly at the top)
      products.sort((a, b) => {
        const timeB = toTimestampMillis(b.createdAt);
        const timeA = toTimestampMillis(a.createdAt);
        if (timeB !== timeA) return timeB - timeA;
        return toTimestampMillis(b.updatedAt) - toTimestampMillis(a.updatedAt);
      });
    }

    const total = products.length;
    const page = parseInt(filters.page, 10) || 1;
    const limit = parseInt(filters.limit, 10) || 20;
    const startIndex = (page - 1) * limit;
    const paginated = products.slice(startIndex, startIndex + limit);

    return {
      products: paginated,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  async getProductBySlug(slug, allowUnpublished = false) {
    const db = getDb();
    if (!db) return null;

    let query = db.collection('products')
      .where('slug', '==', slug)
      .where('isDeleted', '==', false);

    if (!allowUnpublished) {
      query = query.where('isPublished', '==', true);
    }

    const snap = await query.limit(1).get();

    if (snap.empty) {
      return null;
    }

    const data = snap.docs[0].data();
    if (!allowUnpublished && data.isPublished === false) {
      return null;
    }

    return data;
  }

  async getProductById(id) {
    const db = getDb();
    if (!db) return null;

    const doc = await db.collection('products').doc(id).get();
    if (!doc.exists) return null;
    const data = doc.data();
    if (data.isDeleted) return null;
    return data;
  }

  async createProduct(data, adminUser) {
    const db = getDb();
    const docRef = db.collection('products').doc();
    const productId = docRef.id;

    const regularPricePaise = data.regularPricePaise || rupeesToPaise(data.regularPrice || 0);
    const parsedSalePaise = data.salePricePaise || (data.salePrice ? rupeesToPaise(data.salePrice) : null);
    const salePricePaise = (parsedSalePaise && parsedSalePaise > 0 && parsedSalePaise <= regularPricePaise) ? parsedSalePaise : null;
    const effectivePricePaise = regularPricePaise;

    // Basic sanity validation
    if (!data.name || data.name.trim().length < 3) {
      const err = new Error('Product name (at least 3 characters) is required.');
      err.statusCode = 400;
      throw err;
    }
    if (parsedSalePaise && regularPricePaise && parsedSalePaise > regularPricePaise) {
      const err = new Error('Sale price cannot exceed the regular catalog price.');
      err.statusCode = 400;
      throw err;
    }

    const variants = (data.variants && data.variants.length > 0)
      ? data.variants.map((v, i) => ({
          variantId: v.variantId || `var_${i + 1}`,
          sku: v.sku || `${data.sku || productId}-${i + 1}`,
          size: v.size || '',
          color: v.color || '',
          colorHex: v.colorHex || '',
          pricePaise: regularPricePaise,
          salePricePaise: (v.salePricePaise && v.salePricePaise <= regularPricePaise) ? v.salePricePaise : (salePricePaise || null),
          stockQuantity: parseInt(v.stockQuantity, 10) || 0,
          lowStockThreshold: parseInt(v.lowStockThreshold, 10) || 5,
          isActive: v.isActive !== false
        }))
      : [{
          variantId: 'default',
          sku: data.sku || `${productId}-STD`,
          size: 'Standard',
          color: 'Default',
          colorHex: '',
          pricePaise: regularPricePaise,
          salePricePaise: salePricePaise || null,
          stockQuantity: parseInt(data.stockQuantity, 10) || 50,
          lowStockThreshold: 5,
          isActive: true
        }];

    const rawImages = (data.images && Array.isArray(data.images) && data.images.length > 0)
      ? data.images
      : (data.imageUrl ? [{ url: data.imageUrl, alt: data.name, order: 0, isPrimary: true }] : []);

    const isExplicitlyPublished = data.isPublished === true;
    const canBePublished = Boolean(
      (data.name && data.name.trim().length >= 3) &&
      (data.description && data.description.trim().length >= 10) &&
      (regularPricePaise > 0) &&
      (salePricePaise && salePricePaise > 0 && salePricePaise <= regularPricePaise) &&
      (rawImages.length > 0)
    );

    if (isExplicitlyPublished && !canBePublished) {
      if (!data.name || data.name.trim().length < 3) {
        const err = new Error('Product name (at least 3 characters) is required to publish.');
        err.statusCode = 400;
        throw err;
      }
      if (!data.description || data.description.trim().length < 10) {
        const err = new Error('A detailed product description (at least 10 characters) is required to publish.');
        err.statusCode = 400;
        throw err;
      }
      if (regularPricePaise <= 0) {
        const err = new Error('A valid regular price greater than zero is required to publish.');
        err.statusCode = 400;
        throw err;
      }
      if (!salePricePaise || salePricePaise <= 0) {
        const err = new Error('A valid discounted sale price greater than zero is required to publish.');
        err.statusCode = 400;
        throw err;
      }
      if (rawImages.length === 0) {
        const err = new Error('At least one product image is required to publish.');
        err.statusCode = 400;
        throw err;
      }
    }

    const isPublished = isExplicitlyPublished || (data.isPublished !== false && canBePublished);
    const status = isPublished ? 'published' : (data.status || 'draft');

    const formattedImages = rawImages.map((img, idx) => ({
      url: typeof img === 'string' ? img : img.url,
      alt: (typeof img === 'object' && img.alt) || data.name || 'Product Image',
      order: typeof (img.order) === 'number' ? img.order : idx,
      isPrimary: (typeof (img.order) === 'number' ? img.order : idx) === 0
    })).sort((a, b) => (a.order || 0) - (b.order || 0))
      .map((img, idx) => ({ ...img, order: idx, isPrimary: idx === 0 }));

    const newProduct = {
      id: productId,
      name: data.name,
      slug: data.slug || data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
      sku: data.sku || `L4-PROD-${Date.now().toString().slice(-4)}`,
      status,
      description: data.description || '',
      shortDescription: data.shortDescription || '',
      category: data.category || data.categorySlug || 'swimming',
      categoryId: data.categoryId || '',
      categorySlug: data.categorySlug || data.category || 'swimming',
      pricePaise: regularPricePaise,
      regularPricePaise,
      salePricePaise,
      hasVariants: Boolean(data.hasVariants && data.variants && data.variants.length),
      variants,
      specifications: data.specifications || {},
      images: formattedImages,
      isFeatured: Boolean(data.isFeatured),
      isBestseller: Boolean(data.isBestseller),
      isNewArrival: Boolean(data.isNewArrival),
      isPublished,
      isDeleted: false,
      seo: {
        metaTitle: data.metaTitle || `${data.name} | The Lane4 Performance Store`,
        metaDescription: data.metaDescription || data.shortDescription || '',
        keywords: data.keywords || []
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await docRef.set(newProduct);

    // Register initial inventory entries
    for (const v of newProduct.variants) {
      await db.collection('inventory').doc(v.sku).set({
        sku: v.sku,
        productId,
        variantId: v.variantId,
        productName: newProduct.name,
        variantLabel: `${v.size || ''} ${v.color || ''}`.trim(),
        availableQuantity: v.stockQuantity,
        reservedQuantity: 0,
        lowStockThreshold: v.lowStockThreshold,
        isOutOfStock: v.stockQuantity <= 0,
        updatedAt: new Date()
      });
    }

    // Generate static product HTML page so storefront displays it immediately
    generateProductHtmlPage(newProduct);

    return newProduct;
  }

  async updateProduct(id, data, adminUser) {
    const db = getDb();
    const docRef = db.collection('products').doc(id);
    const doc = await docRef.get();
    if (!doc.exists) {
      throw new Error('Product not found');
    }

    const existingData = doc.data();
    const updates = {
      ...data,
      updatedAt: new Date()
    };

    if (data.images && Array.isArray(data.images)) {
      updates.images = data.images.map((img, idx) => ({
        url: typeof img === 'string' ? img : img.url,
        alt: (typeof img === 'object' && img.alt) || updates.name || existingData.name || 'Product Image',
        order: typeof img.order === 'number' ? img.order : idx,
        isPrimary: (typeof img.order === 'number' ? img.order : idx) === 0
      })).sort((a, b) => (a.order || 0) - (b.order || 0))
        .map((img, idx) => ({ ...img, order: idx, isPrimary: idx === 0 }));
      delete updates.imageUrl;
    } else if (data.imageUrl) {
      updates.images = [{
        url: data.imageUrl,
        alt: updates.name || existingData.name || 'Product Image',
        order: 0,
        isPrimary: true
      }];
      delete updates.imageUrl;
    }

    if (data.regularPrice !== undefined) {
      updates.regularPricePaise = rupeesToPaise(data.regularPrice);
      delete updates.regularPrice;
    }
    if (data.salePrice !== undefined) {
      updates.salePricePaise = data.salePrice ? rupeesToPaise(data.salePrice) : null;
      delete updates.salePrice;
    }

    // Determine the regular and sale prices after updates
    const resolvedSale = updates.salePricePaise !== undefined ? updates.salePricePaise : existingData.salePricePaise;
    const resolvedRegular = updates.regularPricePaise !== undefined ? updates.regularPricePaise : (existingData.regularPricePaise || existingData.pricePaise);
    updates.pricePaise = resolvedRegular;

    if (data.category || data.categorySlug) {
      updates.category = data.category || data.categorySlug;
      updates.categorySlug = data.categorySlug || data.category;
    }

    // Keep variants pricing synchronized with updated product prices
    if (!updates.variants && existingData.variants && existingData.variants.length > 0) {
      updates.variants = existingData.variants.map(v => ({
        ...v,
        pricePaise: resolvedRegular,
        salePricePaise: resolvedSale || null
      }));
    } else if (updates.variants && updates.variants.length > 0) {
      updates.variants = updates.variants.map(v => ({
        ...v,
        pricePaise: resolvedRegular,
        salePricePaise: v.salePricePaise !== undefined ? v.salePricePaise : (resolvedSale || null)
      }));
    }

    if (updates.description !== undefined && updates.description.trim().length < 10) {
      const err = new Error('A detailed product description (at least 10 characters) is required.');
      err.statusCode = 400;
      throw err;
    }
    if (updates.salePricePaise !== undefined && updates.salePricePaise !== null && updates.salePricePaise <= 0) {
      const err = new Error('A valid discounted sale price greater than zero is required.');
      err.statusCode = 400;
      throw err;
    }
    if (resolvedSale && resolvedRegular && resolvedSale > resolvedRegular) {
      const err = new Error('Sale price cannot exceed the regular catalog price.');
      err.statusCode = 400;
      throw err;
    }

    const willBePublished = updates.isPublished !== undefined ? updates.isPublished : existingData.isPublished;
    if (willBePublished) {
      const name = (updates.name !== undefined ? updates.name : existingData.name) || '';
      const desc = (updates.description !== undefined ? updates.description : existingData.description) || '';
      const reg = updates.regularPricePaise !== undefined ? updates.regularPricePaise : existingData.regularPricePaise;
      const sale = updates.salePricePaise !== undefined ? updates.salePricePaise : existingData.salePricePaise;

      if (!name || name.trim().length < 3) {
        const err = new Error('Product name (at least 3 characters) is required to publish.');
        err.statusCode = 400;
        throw err;
      }
      if (!desc || desc.trim().length < 10) {
        const err = new Error('A detailed product description (at least 10 characters) is required to publish.');
        err.statusCode = 400;
        throw err;
      }
      if (!reg || reg <= 0) {
        const err = new Error('A valid regular price greater than zero is required to publish.');
        err.statusCode = 400;
        throw err;
      }
      if (!sale || sale <= 0) {
        const err = new Error('A valid discounted sale price greater than zero is required to publish.');
        err.statusCode = 400;
        throw err;
      }
      if (sale > reg) {
        const err = new Error('Sale price cannot exceed the regular catalog price.');
        err.statusCode = 400;
        throw err;
      }
      const finalImages = (updates.images && updates.images.length > 0) ? updates.images : (existingData.images || []);
      if (!finalImages || finalImages.length === 0) {
        const err = new Error('At least one product image is required to publish.');
        err.statusCode = 400;
        throw err;
      }
    }

    await docRef.update(updates);
    const updated = await docRef.get();
    const updatedData = updated.data();
    generateProductHtmlPage(updatedData);
    return updatedData;
  }

  async deleteProduct(id, adminUser) {
    const db = getDb();
    const docRef = db.collection('products').doc(id);
    const doc = await docRef.get();
    if (!doc.exists) {
      throw new Error('Product not found');
    }

    // Soft delete to protect historical order relationships
    await docRef.update({
      isDeleted: true,
      isPublished: false,
      deletedAt: new Date(),
      updatedAt: new Date()
    });

    return { id, isDeleted: true };
  }
}

module.exports = new ProductService();

