/**
 * LANE4 Storefront Dynamic Catalog Hydration
 * Real-time synchronization of products & categories from the database.
 */

(function () {
  async function hydrateCatalog() {
    const isInSubfolder = /\/(product|category|blog|authors|utility-pages|category-blog)\//i.test(window.location.pathname);
    const catMatch = window.location.pathname.match(/\/category\/([a-zA-Z0-9_-]+)(?:\.html)?/i);
    const queryCatSlug = new URLSearchParams(window.location.search).get('slug');
    const docSlug = document.documentElement.getAttribute('data-wf-item-slug');
    const currentCatSlug = (catMatch && catMatch[1] !== 'detail') ? catMatch[1] : (
      queryCatSlug || (window.location.pathname.includes('/category/') ? docSlug : null)
    );

    if (currentCatSlug) {
      try {
        window.lane4ApiRequest(`/categories/${encodeURIComponent(currentCatSlug)}`).then(catRes => {
          if (catRes && catRes.data) {
            const cat = catRes.data;
            const h1 = document.querySelector('h1, .heading-h1, .title-h1, .category-title');
            if (h1 && cat.name) h1.textContent = cat.name;
            const catDesc = document.querySelector('.paragraph-18px, .category-description');
            if (catDesc && cat.description) catDesc.textContent = cat.description;
            if (cat.name) document.title = `${cat.name} | The Lane4 Performance Store`;
          }
        }).catch(() => {});
      } catch (_) {}
    }

    try {
      const res = await window.lane4ApiRequest('/products');
      const products = (res && res.data && res.data.products) || (Array.isArray(res && res.data) ? res.data : []);
      if (!products.length) return;

      const productMap = new Map();
      products.forEach(p => {
        if (p.slug) productMap.set(p.slug.toLowerCase(), p);
        if (p.name) productMap.set(p.name.toLowerCase().trim(), p);
      });

      // Find all product grids across storefront (Shop grid, Category grid, and "Discover other products" on product pages)
      const allGrids = document.querySelectorAll(
        '.collection-list-category.w-dyn-items, .collection-list.w-dyn-items, .collection-list-wrapper-category .w-dyn-items, .collection-list-product.w-dyn-items'
      );
      if (!allGrids.length) return;

      allGrids.forEach(productGrid => {
        const isDiscoverOtherGrid = productGrid.classList.contains('collection-list-product');
        const isCategoryGrid = Boolean(currentCatSlug) && (
          productGrid.classList.contains('collection-list-category') ||
          Boolean(productGrid.closest('.collection-list-wrapper-category'))
        );

        function matchesCat(p) {
          if (!currentCatSlug) return true;
          const pCat = (p.categorySlug || p.category || '').toLowerCase().trim();
          const target = currentCatSlug.toLowerCase().trim();
          if (pCat === target) return true;
          const cleanP = pCat.replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
          const cleanT = target.replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
          if (cleanP === cleanT) return true;
          if (cleanP + 's' === cleanT || cleanT + 's' === cleanP) return true;
          if (cleanP.replace(/s$/, '') === cleanT.replace(/s$/, '')) return true;
          return false;
        }

        // 1. Live update any existing cards in the grid (e.g. Discover Other Products or static catalog cards)
        const matchedProductSlugsInGrid = new Set();
        const existingItems = productGrid.querySelectorAll('.w-dyn-item, .collection-item');

        existingItems.forEach(item => {
          const link = item.querySelector('a[href*="product/"], a[href$=".html"]');
          if (!link) return;
          const href = link.getAttribute('href') || '';
          const match = href.match(/product\/([a-zA-Z0-9_-]+)(?:\.html)?/i) || href.match(/([a-zA-Z0-9_-]+)\.html/i);
          const slug = match ? match[1].toLowerCase() : null;
          const titleEl = item.querySelector('.paragraph-14px, .product-title, .sp-content .paragraph-14px');
          const name = titleEl ? titleEl.textContent.trim().toLowerCase() : '';

          const p = (slug && productMap.get(slug)) || (name && productMap.get(name));

          // If this is a category grid, check if the static product actually belongs to this category!
          if (isCategoryGrid && (!p || !matchesCat(p))) {
            item.remove(); // Remove hardcoded mismatched template products from newly created categories
            return;
          }

          if (p) {
            matchedProductSlugsInGrid.add(p.slug.toLowerCase());

            if (p.isPublished === false || p.isDeleted === true) {
              item.style.display = 'none';
              return;
            }

            item.style.display = '';
            item.style.opacity = '1';

            // Resolve Image
            let rawImg = (p.images && p.images[0] && p.images[0].url) || '6424266ea05809dff501d86e/lane4-6dbhNuWa5oI-640x640.jpg';
            let imgUrl = rawImg;
            if (window.LANE4 && window.LANE4.resolveAssetUrl) imgUrl = window.LANE4.resolveAssetUrl(rawImg);
            if (isInSubfolder && !imgUrl.startsWith('http') && !imgUrl.startsWith('/') && !imgUrl.startsWith('../')) {
              imgUrl = '../' + imgUrl;
            }

            // Update Image
            const imgEl = item.querySelector('img');
            if (imgEl && imgUrl) {
              imgEl.src = imgUrl;
              imgEl.alt = p.name;
              if (imgEl.hasAttribute('srcset')) imgEl.removeAttribute('srcset');
              imgEl.style.opacity = '1';
            }

            // Update Title
            if (titleEl && p.name) titleEl.textContent = p.name;

            // Update Short Description
            const shortDescEl = item.querySelector('.paragraph-13px.grey, .paragraph-13px');
            if (shortDescEl) shortDescEl.textContent = p.shortDescription || 'Multiple options available';

            // Update Pricing (Regular price default, sale price + strikethrough if on sale)
            const regularPrice = p.regularPricePaise || 0;
            const hasSale = p.salePricePaise && p.salePricePaise > 0 && p.salePricePaise < regularPrice;
            let priceHtml = '';
            if (hasSale) {
              const saleFormatted = window.LANE4 ? `${window.LANE4.formatINR(p.salePricePaise)} INR` : `₹ ${(p.salePricePaise / 100).toFixed(2)} INR`;
              const regFormatted = window.LANE4 ? `${window.LANE4.formatINR(regularPrice)} INR` : `₹ ${(regularPrice / 100).toFixed(2)} INR`;
              priceHtml = `${saleFormatted} <span style="font-size:12px;text-decoration:line-through;color:#94a3b8;font-weight:normal;margin-left:6px;">${regFormatted}</span>`;
            } else {
              const primaryVal = regularPrice > 0 ? regularPrice : (p.salePricePaise || 0);
              priceHtml = window.LANE4 ? `${window.LANE4.formatINR(primaryVal)} INR` : `₹ ${(primaryVal / 100).toFixed(2)} INR`;
            }

            const priceEl = item.querySelector('.paragraph-16px, [data-wf-sku-bindings*="f_price_"]');
            if (priceEl) priceEl.innerHTML = priceHtml;

            // Update Link
            const linkHref = isInSubfolder ? `../product/${p.slug}.html` : `product/${p.slug}.html`;
            if (link) link.setAttribute('href', linkHref);
          }
        });

        // 2. If this is not the recommended/discover grid, append newly created products that belong here
        if (!isDiscoverOtherGrid) {
          const eligibleProducts = isCategoryGrid
            ? products.filter(p => p.isPublished !== false && !p.isDeleted && matchesCat(p))
            : products.filter(p => p.isPublished !== false && !p.isDeleted);

          eligibleProducts.forEach(p => {
            if (matchedProductSlugsInGrid.has(p.slug.toLowerCase())) return;

            let rawImg = (p.images && p.images[0] && p.images[0].url) || '6424266ea05809dff501d86e/lane4-6dbhNuWa5oI-640x640.jpg';
            let imgUrl = rawImg;
            if (window.LANE4 && window.LANE4.resolveAssetUrl) imgUrl = window.LANE4.resolveAssetUrl(rawImg);
            if (isInSubfolder && !imgUrl.startsWith('http') && !imgUrl.startsWith('/') && !imgUrl.startsWith('../')) {
              imgUrl = '../' + imgUrl;
            }

            const regularPrice = p.regularPricePaise || 0;
            const hasSale = p.salePricePaise && p.salePricePaise > 0 && p.salePricePaise < regularPrice;
            let priceHtml = '';
            if (hasSale) {
              const saleFormatted = window.LANE4 ? `${window.LANE4.formatINR(p.salePricePaise)} INR` : `₹ ${(p.salePricePaise / 100).toFixed(2)} INR`;
              const regFormatted = window.LANE4 ? `${window.LANE4.formatINR(regularPrice)} INR` : `₹ ${(regularPrice / 100).toFixed(2)} INR`;
              priceHtml = `${saleFormatted} <span style="font-size:12px;text-decoration:line-through;color:#94a3b8;font-weight:normal;margin-left:6px;">${regFormatted}</span>`;
            } else {
              const primaryVal = regularPrice > 0 ? regularPrice : (p.salePricePaise || 0);
              priceHtml = window.LANE4 ? `${window.LANE4.formatINR(primaryVal)} INR` : `₹ ${(primaryVal / 100).toFixed(2)} INR`;
            }
            const linkHref = isInSubfolder ? `../product/${p.slug}.html` : `product/${p.slug}.html`;

            const itemEl = document.createElement('div');
            itemEl.setAttribute('role', 'listitem');
            itemEl.className = isCategoryGrid ? 'w-dyn-item' : 'collection-item w-dyn-item';
            itemEl.setAttribute('data-category', p.categorySlug || p.category || '');

            if (isCategoryGrid) {
              itemEl.innerHTML = `
                <div class="cr-grid">
                  <div class="product-card" style="opacity: 1;">
                    <a href="${linkHref}" class="sp-image-wrapper w-inline-block">
                      <img alt="${p.name}" src="${imgUrl}" class="image" style="width:100%;height:100%;object-fit:cover;" />
                    </a>
                    <div class="product-text-wrapper">
                      <div class="paragraph-14px">${p.name}</div>
                      <div class="paragraph-13px grey">${p.shortDescription || 'Pool-tested performance gear'}</div>
                      <div class="paragraph-16px">${priceHtml}</div>
                    </div>
                  </div>
                </div>
              `;
            } else {
              itemEl.innerHTML = `
                <div style="opacity: 1;" class="shop-product">
                  <a href="${linkHref}" class="sp-image-wrapper w-inline-block">
                    <img alt="${p.name}" src="${imgUrl}" class="image" style="width:100%;height:100%;object-fit:cover;" />
                  </a>
                  <div class="sp-content">
                    <p class="paragraph-14px">${p.name}</p>
                    <p class="paragraph-13px grey">${p.shortDescription || 'Pool-tested performance gear'}</p>
                    <p class="paragraph-16px">${priceHtml}</p>
                  </div>
                </div>
              `;
            }
            productGrid.appendChild(itemEl);
            matchedProductSlugsInGrid.add(p.slug.toLowerCase());
          });

          // Empty state on category pages
          if (isCategoryGrid && productGrid.children.length === 0) {
            const emptyEl = document.createElement('div');
            emptyEl.style.cssText = 'text-align:center;padding:48px 16px;grid-column:1/-1;color:#64748b;font-size:14px;width:100%;';
            emptyEl.innerHTML = `
              <p style="font-weight:700;font-size:16px;color:#0f172a;margin-bottom:6px;">No products found in this category</p>
              <p>New gear is on the way. Explore our complete collection in the <a href="${isInSubfolder ? '../shop.html' : 'shop.html'}" style="color:#0f172a;text-decoration:underline;">Shop</a>.</p>
            `;
            productGrid.appendChild(emptyEl);
          }
        }

        // Ensure all cards are visible
        productGrid.querySelectorAll('.shop-product, .product-card').forEach(el => {
          el.style.opacity = '1';
        });
      });

    } catch (err) {
      console.warn('Could not hydrate dynamic catalog:', err);
    }
  }

  // Real-time category dropdown update
  async function hydrateCategories() {
    const dropdownList = document.querySelector('.dropdown-list .collection-list-wrapper .w-dyn-items');
    if (!dropdownList) return;

    const isInSubfolder = /\/(product|category|blog|authors|utility-pages|category-blog)\//i.test(window.location.pathname);
    const catPrefix = isInSubfolder ? '' : 'category/';

    try {
      const res = await window.lane4ApiRequest('/categories');
      const categories = (res && res.data) || [];
      if (!categories.length) return;

      const existingCatSlugs = new Set();
      dropdownList.querySelectorAll('a[href*="category/"], a[href$=".html"]').forEach(link => {
        const match = link.getAttribute('href').match(/category\/([a-zA-Z0-9-]+)(?:\.html)?/);
        if (match) existingCatSlugs.add(match[1]);
      });

      categories.forEach(cat => {
        if (!existingCatSlugs.has(cat.slug)) {
          const itemEl = document.createElement('div');
          itemEl.setAttribute('role', 'listitem');
          itemEl.className = 'w-dyn-item';
          itemEl.innerHTML = `
            <a href="${catPrefix}${cat.slug}.html" class="shop-dropdown w-inline-block">
              <p class="paragraph-14px">${cat.name}</p>
            </a>
          `;
          dropdownList.appendChild(itemEl);
          existingCatSlugs.add(cat.slug);
        }
      });
    } catch (e) {
      console.warn('Could not hydrate categories:', e);
    }
  }

  // Real-time product detail page hydration (for dynamic & custom products)
  async function hydrateProductDetail() {
    const isProductPage = window.location.pathname.includes('/product/') || document.querySelector('.product-hero, .product-details');
    if (!isProductPage) return;

    const match = window.location.pathname.match(/\/product\/([a-zA-Z0-9_-]+)(?:\.html)?/i);
    const querySlug = new URLSearchParams(window.location.search).get('slug');
    const docSlug = document.documentElement.getAttribute('data-wf-item-slug');
    const slug = (match && match[1] !== 'detail' && match[1] !== 'index') ? match[1] : (querySlug || docSlug);
    if (!slug) return;

    try {
      const res = await window.lane4ApiRequest(`/products/${encodeURIComponent(slug)}`);
      const p = res && res.data;
      if (!p) return;

      // Update document title
      if (p.name) {
        document.title = `${p.name} | The Lane4 Performance Store`;
      }

      // Update product title
      const titleEl = document.querySelector('.pd-heading .title-h4, h4.title-h4, .product-details h4');
      if (titleEl && p.name) {
        titleEl.textContent = p.name;
      }

      // Update breadcrumbs
      const breadcrumbEl = document.querySelector('.product-breadcrumbs a:last-child div, .product-breadcrumbs .w--current div');
      if (breadcrumbEl && p.name) {
        breadcrumbEl.textContent = p.name;
      }

      // Update subtitle / tagline
      const taglineEl = document.querySelector('.pd-heading .paragraph-18px');
      if (taglineEl) {
        taglineEl.textContent = p.tagline || 'Pool-tested performance';
      }

      // Update price display
      const priceEl = document.querySelector('.pd-heading .title-h6, h6.title-h6');
      if (priceEl) {
        const salePaise = parseInt(p.salePricePaise, 10) || 0;
        const regPaise = parseInt(p.regularPricePaise, 10) || 0;
        const fmt = (cents) => `₹${(cents / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} INR`;

        if (salePaise > 0 && regPaise > salePaise) {
          priceEl.innerHTML = `<span>${fmt(salePaise)}</span> <span style="text-decoration:line-through;color:#94a3b8;font-size:14px;margin-left:8px;font-weight:400;">${fmt(regPaise)}</span>`;
        } else if (regPaise > 0 || salePaise > 0) {
          priceEl.textContent = fmt(salePaise || regPaise);
        }
      }

      // Update description
      const descHeading = Array.from(document.querySelectorAll('.paragraph-13px')).find(el => (el.textContent || '').includes('Product Description'));
      if (descHeading && descHeading.nextElementSibling && p.description) {
        descHeading.nextElementSibling.textContent = p.description;
      }

      // Update gallery if dynamic product
      const gallery = document.querySelector('.image-gallery');
      if (gallery && p.images && p.images.length && (window.location.pathname.includes('/detail') || document.querySelector('.detail-gallery-placeholder'))) {
        gallery.innerHTML = p.images.map(img => {
          const url = (img && (img.secureUrl || img.url)) || '';
          return `
            <div class="image-gallery-row single-image" style="margin-bottom:16px;">
              <img src="${url}" alt="${p.name}" style="width:100%;max-width:550px;border-radius:8px;object-fit:cover;display:block;" />
            </div>
          `;
        }).join('');
      }

      // Ensure product details container is visible
      const pdEl = document.querySelector('.product-details');
      if (pdEl) {
        pdEl.style.opacity = '1';
        pdEl.style.visibility = 'visible';
      }
    } catch (err) {
      console.warn('Could not hydrate product detail:', err);
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    hydrateCatalog();
    hydrateCategories();
    hydrateProductDetail();
  });
})();
