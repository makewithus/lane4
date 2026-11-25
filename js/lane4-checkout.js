/**
 * LANE4 E-Commerce Checkout & Manual QR Payment Controller
 * High-performance, production-ready checkout controller with state/city dropdowns,
 * real-time quote recalculation, UPI QR verification, and full-fidelity order receipt.
 */

(function () {
  const INDIAN_STATES_AND_CITIES = {
    "Maharashtra": ["Nagpur", "Mumbai", "Pune", "Thane", "Nashik", "Navi Mumbai", "Aurangabad (Chhatrapati Sambhajinagar)", "Solapur", "Kolhapur", "Amravati", "Nanded", "Jalgaon", "Akola", "Other"],
    "Delhi": ["New Delhi", "Central Delhi", "South Delhi", "North Delhi", "East Delhi", "West Delhi", "Dwarka", "Rohini", "Other"],
    "Karnataka": ["Bengaluru", "Mysuru", "Mangaluru", "Hubballi-Dharwad", "Belagavi", "Davanagere", "Kalaburagi", "Ballari", "Other"],
    "Kerala": ["Thiruvananthapuram (Trivandrum)", "Kochi", "Kozhikode", "Thrissur", "Kollam", "Kannur", "Alappuzha", "Palakkad", "Kottayam", "Malappuram", "Other"],
    "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai", "Tiruchirappalli", "Salem", "Tiruppur", "Erode", "Vellore", "Thoothukudi", "Dindigul", "Other"],
    "Gujarat": ["Ahmedabad", "Surat", "Vadodara", "Rajkot", "Bhavnagar", "Jamnagar", "Gandhinagar", "Junagadh", "Anand", "Other"],
    "Telangana": ["Hyderabad", "Warangal", "Nizamabad", "Karimnagar", "Khammam", "Ramagundam", "Secunderabad", "Other"],
    "Andhra Pradesh": ["Visakhapatnam", "Vijayawada", "Guntur", "Nellore", "Kurnool", "Tirupati", "Kakinada", "Rajahmundry", "Kadapa", "Other"],
    "Uttar Pradesh": ["Lucknow", "Noida", "Greater Noida", "Ghaziabad", "Kanpur", "Agra", "Varanasi", "Prayagraj", "Meerut", "Bareilly", "Aligarh", "Other"],
    "West Bengal": ["Kolkata", "Howrah", "Durgapur", "Asansol", "Siliguri", "Bardhaman", "Malda", "Kharagpur", "Other"],
    "Rajasthan": ["Jaipur", "Jodhpur", "Kota", "Bikaner", "Ajmer", "Udaipur", "Bhilwara", "Alwar", "Other"],
    "Madhya Pradesh": ["Bhopal", "Indore", "Jabalpur", "Gwalior", "Ujjain", "Sagar", "Dewas", "Satna", "Other"],
    "Punjab": ["Ludhiana", "Amritsar", "Jalandhar", "Patiala", "Bathinda", "Mohali", "Pathankot", "Other"],
    "Haryana": ["Gurugram", "Faridabad", "Panipat", "Ambala", "Yamunanagar", "Rohtak", "Hisar", "Karnal", "Sonipat", "Panchkula", "Other"],
    "Bihar": ["Patna", "Gaya", "Bhagalpur", "Muzaffarpur", "Purnia", "Darbhanga", "Bihar Sharif", "Other"],
    "Odisha": ["Bhubaneswar", "Cuttack", "Rourkela", "Berhampur", "Sambalpur", "Puri", "Balasore", "Other"],
    "Assam": ["Guwahati", "Silchar", "Dibrugarh", "Jorhat", "Nagaon", "Tinsukia", "Tezpur", "Other"],
    "Chhattisgarh": ["Raipur", "Bhilai", "Bilaspur", "Korba", "Rajnandgaon", "Durg", "Other"],
    "Jharkhand": ["Ranchi", "Jamshedpur", "Dhanbad", "Bokaro", "Deoghar", "Hazaribagh", "Other"],
    "Uttarakhand": ["Dehradun", "Haridwar", "Roorkee", "Haldwani", "Rudrapur", "Rishikesh", "Nainital", "Other"],
    "Himachal Pradesh": ["Shimla", "Dharamshala", "Solan", "Mandi", "Kullu", "Manali", "Baddi", "Other"],
    "Goa": ["Panaji", "Margao", "Vasco da Gama", "Mapusa", "Ponda", "Other"],
    "Chandigarh": ["Chandigarh", "Other"],
    "Jammu and Kashmir": ["Srinagar", "Jammu", "Anantnag", "Baramulla", "Other"],
    "Ladakh": ["Leh", "Kargil", "Other"],
    "Puducherry": ["Puducherry", "Karaikal", "Mahe", "Yanam", "Other"],
    "Andaman and Nicobar Islands": ["Port Blair", "Other"],
    "Dadra and Nagar Haveli and Daman and Diu": ["Daman", "Diu", "Silvassa", "Other"],
    "Lakshadweep": ["Kavaratti", "Other"],
    "Arunachal Pradesh": ["Itanagar", "Naharlagun", "Pasighat", "Tawang", "Other"],
    "Manipur": ["Imphal", "Churachandpur", "Thoubal", "Other"],
    "Meghalaya": ["Shillong", "Tura", "Jowai", "Other"],
    "Mizoram": ["Aizawl", "Lunglei", "Champhai", "Other"],
    "Nagaland": ["Kohima", "Dimapur", "Mokokchung", "Other"],
    "Sikkim": ["Gangtok", "Namchi", "Geyzing", "Other"],
    "Tripura": ["Agartala", "Dharmanagar", "Udaipur", "Other"]
  };

  let checkoutQuote = null;
  let paymentSettings = null;
  let activeCoupon = null;

  async function initCheckout() {
    if (!window.location.pathname.includes('checkout')) return;

    // 1. Fetch Cart
    const guestId = window.LANE4.getGuestId();
    let cartRes;
    try {
      cartRes = await window.lane4ApiRequest(`/cart?guestId=${encodeURIComponent(guestId)}`);
    } catch (e) {
      console.warn('Unable to load cart:', e);
      window.location.replace('index.htm');
      return;
    }

    const cart = cartRes.data || { items: [] };
    if (!cart.items || cart.items.length === 0) {
      // Cart is empty (or on refresh after placing order) -> redirect smoothly to home page
      window.location.replace('index.htm');
      return;
    }

    // 2. Fetch Store Payment Settings
    try {
      const payRes = await window.lane4ApiRequest('/store/payment-settings');
      paymentSettings = payRes.data;
    } catch (e) {
      paymentSettings = {
        upiId: 'lane4swim@upi',
        upiAccountName: 'THE LANE4 PERFORMANCE STORE',
        paymentInstructions: '1. Scan the store QR code using any UPI app.\n2. Pay the exact order amount.\n3. Enter the 12-digit UPI Reference Number.\n4. Upload your payment screenshot and click Place Order.',
        qrCodeUrl: '6424266ea05809dff501d86e/lane4-share.png'
      };
    }

    // 3. Pre-fill customer information if signed in or prompt login
    function autofillCustomerInfo(u) {
      const activeUser = u || (window.LANE4 && window.LANE4.getUser ? window.LANE4.getUser() : null);
      if (!activeUser) return;
      const emailInput = document.querySelector('input[name="email"], #wf-ecom-email');
      if (emailInput && (!emailInput.value || emailInput.value === '')) emailInput.value = activeUser.email || '';
      const nameInput = document.getElementById('lane4-checkout-fullname') || document.querySelector('input[name="name"], .w-commerce-commercecheckoutshippingfullname');
      const candidateName = activeUser.displayName || activeUser.name || activeUser.fullName || (activeUser.email ? activeUser.email.split('@')[0].charAt(0).toUpperCase() + activeUser.email.split('@')[0].slice(1) : '');
      if (nameInput && (!nameInput.value || nameInput.value === '') && candidateName) {
        nameInput.value = candidateName;
      }
      const phoneInput = document.getElementById('lane4-checkout-phone') || document.querySelector('input[type="tel"]');
      if (phoneInput && (!phoneInput.value || phoneInput.value === '') && activeUser.phoneNumber) {
        phoneInput.value = activeUser.phoneNumber;
      }
      const banner = document.getElementById('lane4-checkout-auth-banner');
      if (banner) banner.remove();
    }

    const user = window.LANE4.getUser();
    if (user) {
      autofillCustomerInfo(user);
    } else {
      setTimeout(() => {
        if (window.LANE4_AUTH && window.LANE4_AUTH.open) {
          window.LANE4_AUTH.open('login');
          if (window.LANE4_AUTH.showAlert) {
            window.LANE4_AUTH.showAlert('Please sign in or create an account to complete checkout and place your order.', 'info');
          }
        }
      }, 300);

      const mainContainer = document.querySelector('.w-commerce-commercelayoutmain') || document.querySelector('form');
      if (mainContainer && !document.getElementById('lane4-checkout-auth-banner')) {
        const banner = document.createElement('div');
        banner.id = 'lane4-checkout-auth-banner';
        banner.style.cssText = 'margin-bottom:24px;background:#fef2f2;border:2px solid #ef4444;border-radius:10px;padding:16px 20px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;font-family:inherit;';
        banner.innerHTML = `
          <div style="display:flex;align-items:center;gap:12px;">
            <div style="width:40px;height:40px;border-radius:50%;background:#fee2e2;color:#b91c1c;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
            </div>
            <div>
              <div style="font-size:14.5px;font-weight:800;color:#991b1b;">Login Required to Complete Checkout</div>
              <div style="font-size:12.5px;color:#7f1d1d;line-height:1.4;">Please sign in or create a swimmer account to complete your order and submit payment.</div>
            </div>
          </div>
          <button type="button" id="lane4-checkout-login-trigger" style="background:#0f172a;color:#ffffff;border:none;padding:10px 18px;border-radius:6px;font-size:12px;font-weight:800;letter-spacing:1px;text-transform:uppercase;cursor:pointer;">
            SIGN IN / REGISTER &rarr;
          </button>
        `;
        mainContainer.insertBefore(banner, mainContainer.firstChild);
        const trig = banner.querySelector('#lane4-checkout-login-trigger');
        if (trig) {
          trig.onclick = () => {
            if (window.LANE4_AUTH && window.LANE4_AUTH.open) {
              window.LANE4_AUTH.open('login');
            }
          };
        }
      }
    }

    window.addEventListener('lane4:auth-changed', (e) => {
      autofillCustomerInfo(e.detail);
    });

    // 4. Setup State & City Dropdowns, Saved Addresses and strict input restrictions
    setupStateAndCityDropdowns();
    await setupSavedAddressesDropdown();
    setupInputRestrictions();

    // 5. Calculate initial quote & render items and summary
    await recalculateQuote();

    // 6. Inject QR Payment Box
    injectQRPaymentSection();

    // 7. Wire Coupon Actions
    setupCouponSection();

    // 8. Wire Place Order Action
    setupPlaceOrderButton();
  }

  function setupStateAndCityDropdowns() {
    const stateSelect = document.getElementById('lane4-checkout-state');
    const citySelect = document.getElementById('lane4-checkout-city-select');
    const customCityInput = document.getElementById('lane4-checkout-city-custom');

    if (!stateSelect || !citySelect) return;

    // Populate states without pre-selecting any default
    const states = Object.keys(INDIAN_STATES_AND_CITIES).sort();
    stateSelect.innerHTML = '<option value="" disabled selected>Select State / UT</option>' +
      states.map(st => `<option value="${st}">${st}</option>`).join('');

    // City starts disabled with placeholder until state is chosen
    citySelect.innerHTML = '<option value="" disabled selected>Select State first</option>';
    citySelect.disabled = true;

    function updateCities(selectedState, preserveCity = null) {
      if (!selectedState) {
        citySelect.innerHTML = '<option value="" disabled selected>Select State first</option>';
        citySelect.disabled = true;
        if (customCityInput) customCityInput.style.display = 'none';
        return;
      }
      citySelect.disabled = false;
      const cities = INDIAN_STATES_AND_CITIES[selectedState] || ["Other"];
      citySelect.innerHTML = '<option value="" disabled selected>Select City</option>' +
        cities.map(ct => `<option value="${ct}">${ct}</option>`).join('');

      if (preserveCity && cities.includes(preserveCity)) {
        citySelect.value = preserveCity;
        if (customCityInput) customCityInput.style.display = 'none';
      } else {
        citySelect.value = '';
        if (customCityInput) customCityInput.style.display = 'none';
      }
    }

    stateSelect.addEventListener('change', () => {
      const st = stateSelect.value;
      if (st) {
        updateCities(st);
        recalculateQuote();
      } else {
        citySelect.innerHTML = '<option value="" disabled selected>Select State first</option>';
        citySelect.disabled = true;
        if (customCityInput) customCityInput.style.display = 'none';
      }
    });

    citySelect.addEventListener('change', () => {
      if (citySelect.value === 'Other') {
        if (customCityInput) {
          customCityInput.style.display = 'block';
          customCityInput.focus();
        }
      } else {
        if (customCityInput) customCityInput.style.display = 'none';
      }
    });
  }

  async function setupSavedAddressesDropdown() {
    const user = window.LANE4.getUser();
    if (!user) return;

    // Look for shipping info container
    const shippingSection = document.querySelector('.w-commerce-commercecheckoutshippingaddresswrapper') || document.querySelector('.w-commerce-commercecheckoutcustomerinfosummarywrapper') || document.querySelector('form');
    if (!shippingSection) return;

    // Check if phone field exists in shipping section, otherwise inject it
    let phoneInput = document.getElementById('lane4-checkout-phone');
    if (!phoneInput) {
      const phoneWrapper = document.createElement('div');
      phoneWrapper.id = 'lane4-checkout-phone-wrapper';
      phoneWrapper.style.cssText = 'margin-bottom:14px;';
      phoneWrapper.innerHTML = `
        <label class="w-commerce-commercecheckoutlabel" style="font-size:12px;font-weight:600;color:#334155;margin-bottom:6px;display:block;">
          Mobile Phone Number (for shipment updates) *
        </label>
        <input type="tel" id="lane4-checkout-phone" class="w-input lane4-checkout-phone-input" placeholder="+91 98765 43210" style="width:100%;font-size:14px;" value="${user.phoneNumber || ''}" />
      `;
      const nameInput = document.getElementById('lane4-checkout-fullname') || document.querySelector('input.w-commerce-commercecheckoutshippingfullname, input[name="name"]');
      if (nameInput && nameInput.parentElement) {
        nameInput.parentElement.parentElement.insertBefore(phoneWrapper, nameInput.parentElement.nextSibling);
      } else {
        shippingSection.insertBefore(phoneWrapper, shippingSection.firstChild);
      }
    } else if (user.phoneNumber && !phoneInput.value) {
      phoneInput.value = user.phoneNumber;
    }

    try {
      const res = await window.lane4ApiRequest('/customers/addresses');
      const addresses = (res && res.data) || [];
      if (addresses.length === 0) return;

      let savedAddrWrapper = document.getElementById('lane4-saved-addresses-selector-wrapper');
      if (!savedAddrWrapper) {
        savedAddrWrapper = document.createElement('div');
        savedAddrWrapper.id = 'lane4-saved-addresses-selector-wrapper';
        savedAddrWrapper.style.cssText = 'margin-bottom:18px;background:#f8fafc;border:1.5px solid #cbd5e1;border-radius:8px;padding:12px 14px;';
        savedAddrWrapper.innerHTML = `
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0f172a" stroke-width="2.2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
            <span style="font-size:12px;font-weight:600;color:#0f172a;text-transform:uppercase;letter-spacing:0.5px;">Deliver to Saved Address</span>
          </div>
          <select id="lane4-saved-addr-select" class="lane4-checkout-select" style="margin-top:6px;">
            <option value="">Choose a Saved Delivery Address (or fill below)</option>
            ${addresses.map((a, i) => `<option value="${i}">${a.addressee} — ${a.addressLine1}, ${a.city} (${a.postalCode})</option>`).join('')}
          </select>
        `;

        const nameInput = document.getElementById('lane4-checkout-fullname') || document.querySelector('input.w-commerce-commercecheckoutshippingfullname, input[name="name"]');
        if (nameInput && nameInput.closest('.w-commerce-commercecheckoutblockheader, .w-commerce-commercecheckoutshippingaddresswrapper')) {
          const block = nameInput.closest('.w-commerce-commercecheckoutshippingaddresswrapper') || shippingSection;
          block.insertBefore(savedAddrWrapper, block.firstChild);
        } else {
          shippingSection.insertBefore(savedAddrWrapper, shippingSection.firstChild);
        }

        const selectEl = document.getElementById('lane4-saved-addr-select');
        selectEl.onchange = () => {
          const idx = selectEl.value;
          if (idx === '' || !addresses[idx]) return;
          const a = addresses[idx];

          const nameEl = document.getElementById('lane4-checkout-fullname') || document.querySelector('input.w-commerce-commercecheckoutshippingfullname, input[name="name"]');
          if (nameEl) nameEl.value = a.addressee || '';

          const phoneEl = document.getElementById('lane4-checkout-phone');
          if (phoneEl) phoneEl.value = a.phone || '';

          const line1El = document.getElementById('lane4-checkout-street-address') || document.querySelector('input.w-commerce-commercecheckoutshippingstreetaddress, input[name="address_line1"]');
          if (line1El) line1El.value = a.addressLine1 || '';

          const line2El = document.getElementById('lane4-checkout-street-address2') || document.querySelector('input.w-commerce-commercecheckoutshippingstreetaddressoptional, input[name="address_line2"]');
          if (line2El) line2El.value = a.addressLine2 || '';

          const stateSelect = document.getElementById('lane4-checkout-state');
          if (stateSelect && a.state) {
            stateSelect.value = a.state;
            stateSelect.dispatchEvent(new Event('change'));
          }

          setTimeout(() => {
            const citySelect = document.getElementById('lane4-checkout-city-select');
            if (citySelect && a.city) {
              const hasCity = Array.from(citySelect.options).some(o => o.value.toLowerCase() === a.city.toLowerCase());
              if (hasCity) {
                citySelect.value = a.city;
              } else {
                citySelect.value = 'Other';
                const customCityInput = document.getElementById('lane4-checkout-city-custom');
                if (customCityInput) {
                  customCityInput.style.display = 'block';
                  customCityInput.value = a.city;
                }
              }
              citySelect.dispatchEvent(new Event('change'));
            }
          }, 50);

          const pinEl = document.getElementById('lane4-checkout-zip') || document.querySelector('input.w-commerce-commercecheckoutshippingzippostalcode, input[name="address_zip"]');
          if (pinEl) pinEl.value = a.postalCode || '';
        };
      }
    } catch (_) {}
  }

  async function recalculateQuote(couponCode = null) {
    const guestId = window.LANE4.getGuestId();
    let cartRes;
    try {
      cartRes = await window.lane4ApiRequest(`/cart?guestId=${encodeURIComponent(guestId)}`);
    } catch (e) {
      return;
    }
    const cart = cartRes.data || { items: [] };

    try {
      const quoteRes = await window.lane4ApiRequest('/checkout/quote', {
        method: 'POST',
        body: JSON.stringify({
          items: cart.items,
          couponCode: couponCode || activeCoupon,
          guestId
        })
      });

      checkoutQuote = quoteRes.data;
      if (checkoutQuote.coupon && checkoutQuote.coupon.isValid) {
        activeCoupon = checkoutQuote.coupon.code;
      }
      renderOrderItems();
      renderOrderSummary();
    } catch (err) {
      console.error('Quote calculation error:', err);
    }
  }

  function renderOrderItems() {
    const container = document.getElementById('lane4-checkout-items-list') || document.querySelector('.w-commerce-commercecheckoutorderitemslist');
    if (!container || !checkoutQuote || !checkoutQuote.items) return;

    if (checkoutQuote.items.length === 0) {
      container.innerHTML = '<div style="padding:16px;text-align:center;color:#64748b;">No items in cart.</div>';
      return;
    }

    container.innerHTML = checkoutQuote.items.map(it => {
      const imgUrl = window.LANE4.resolveAssetUrl ? window.LANE4.resolveAssetUrl(it.imageUrl) : it.imageUrl;
      const variantText = [it.size ? `Size: ${it.size}` : '', it.color ? `Color: ${it.color}` : ''].filter(Boolean).join(' · ');

      return `
        <div style="display:flex;align-items:center;padding:14px 0;border-bottom:1px solid #f1f5f9;gap:14px;">
          <img src="${imgUrl}" alt="${it.name}" style="width:58px;height:58px;object-fit:cover;border-radius:6px;background:#f8fafc;border:1px solid #e2e8f0;flex-shrink:0;" />
          <div style="flex:1;min-width:0;">
            <div style="font-weight:800;font-size:13.5px;color:#0f172a;line-height:1.3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${it.name}</div>
            ${variantText ? `<div style="font-size:12px;color:#64748b;margin-top:2px;">${variantText}</div>` : ''}
            <div style="font-size:12px;color:#475569;margin-top:4px;">
              <span>Qty: <strong>${it.quantity}</strong></span>
              <span style="color:#94a3b8;margin:0 4px;">•</span>
              <span>${it.unitPriceFormatted} each</span>
            </div>
          </div>
          <div style="font-weight:900;font-size:14.5px;color:#0f172a;text-align:right;">
            ${it.totalPriceFormatted}
          </div>
        </div>
      `;
    }).join('');
  }

  function renderOrderSummary() {
    if (!checkoutQuote) return;

    // Subtotal
    const subtotalEl = document.getElementById('lane4-summary-subtotal');
    if (subtotalEl) {
      subtotalEl.textContent = checkoutQuote.pricing.subtotalFormatted;
    }

    // Shipping Badge & Summary
    const shippingBadge = document.getElementById('lane4-shipping-price-badge');
    const shippingSummary = document.getElementById('lane4-summary-shipping');
    const isFree = checkoutQuote.pricing.isFreeShipping;
    const shippingText = isFree ? 'FREE' : checkoutQuote.pricing.shippingFormatted;

    if (shippingBadge) {
      shippingBadge.textContent = shippingText;
      shippingBadge.style.color = isFree ? '#16a34a' : '#0f172a';
    }
    if (shippingSummary) {
      shippingSummary.textContent = shippingText;
      shippingSummary.style.color = isFree ? '#16a34a' : '#0f172a';
    }

    // Coupon Discount Row
    const discountRow = document.getElementById('lane4-summary-discount-row');
    const discountCodeSpan = document.getElementById('lane4-summary-discount-code');
    const discountVal = document.getElementById('lane4-summary-discount');

    if (discountRow) {
      if (checkoutQuote.pricing.couponDiscountPaise > 0) {
        discountRow.style.display = 'flex';
        if (discountCodeSpan) discountCodeSpan.textContent = checkoutQuote.pricing.couponCode;
        if (discountVal) discountVal.textContent = `-${checkoutQuote.pricing.couponDiscountFormatted}`;
      } else {
        discountRow.style.display = 'none';
      }
    }

    // Total
    const totalEl = document.getElementById('lane4-summary-total');
    if (totalEl) {
      totalEl.textContent = checkoutQuote.pricing.finalPayableFormatted;
    }

    // QR Amount Display
    const qrAmountDisplay = document.getElementById('lane4-qr-amount-display');
    if (qrAmountDisplay) {
      qrAmountDisplay.textContent = checkoutQuote.pricing.finalPayableFormatted;
    }
  }

  function setupCouponSection() {
    const applyBtn = document.getElementById('lane4-apply-coupon-btn');
    const input = document.getElementById('lane4-coupon-input');
    const msg = document.getElementById('lane4-coupon-msg');

    if (!applyBtn || !input) return;

    applyBtn.onclick = async () => {
      const code = input.value.trim();
      if (!code) {
        if (msg) {
          msg.style.display = 'block';
          msg.style.color = '#ef4444';
          msg.textContent = 'Please enter a coupon code.';
        }
        return;
      }

      applyBtn.disabled = true;
      applyBtn.textContent = '...';

      try {
        await recalculateQuote(code);
        if (checkoutQuote && checkoutQuote.coupon && checkoutQuote.coupon.isValid) {
          if (msg) {
            msg.style.display = 'block';
            msg.style.color = '#16a34a';
            msg.textContent = `Applied! Saved ${checkoutQuote.pricing.couponDiscountFormatted}`;
          }
        } else {
          if (msg) {
            msg.style.display = 'block';
            msg.style.color = '#ef4444';
            msg.textContent = (checkoutQuote && checkoutQuote.coupon && checkoutQuote.coupon.error) || 'Invalid coupon code';
          }
        }
      } catch (e) {
        if (msg) {
          msg.style.display = 'block';
          msg.style.color = '#ef4444';
          msg.textContent = e.message || 'Error applying coupon';
        }
      } finally {
        applyBtn.disabled = false;
        applyBtn.textContent = 'APPLY';
      }
    };
  }

  function injectQRPaymentSection() {
    const paymentContainer = document.querySelector('.w-commerce-commercecheckoutpaymentinfowrapper') || document.querySelector('[data-node-type="commerce-checkout-payment-info-wrapper"]');
    if (!paymentContainer) return;

    // Suppress default Stripe elements
    const defaultFields = paymentContainer.querySelectorAll('fieldset, input, .w-commerce-commercecheckoutrow');
    defaultFields.forEach(f => f.style.display = 'none');

    let qrWrapper = document.getElementById('lane4-qr-checkout-container');
    if (qrWrapper) qrWrapper.remove();

    qrWrapper = document.createElement('div');
    qrWrapper.id = 'lane4-qr-checkout-container';
    qrWrapper.style.padding = '22px';
    qrWrapper.style.border = '2px solid #0f172a';
    qrWrapper.style.borderRadius = '10px';
    qrWrapper.style.background = '#ffffff';
    qrWrapper.style.marginTop = '16px';
    qrWrapper.style.marginBottom = '24px';
    qrWrapper.style.boxShadow = '0 6px 20px rgba(0,0,0,0.04)';

    const upiId = paymentSettings.upiId || 'lane4swim@upi';
    const upiName = paymentSettings.upiAccountName || 'THE LANE4 PERFORMANCE STORE';
    const qrUrl = paymentSettings.qrCodeUrl || '6424266ea05809dff501d86e/lane4-share.png';
    const instructions = (paymentSettings.paymentInstructions || '').replace(/\n/g, '<br/>');

    qrWrapper.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">
        <span style="display:inline-block;background:#0f172a;color:#fff;font-weight:900;font-size:11px;padding:3px 8px;border-radius:4px;letter-spacing:1px;">STEP 3</span>
        <h4 style="margin:0;font-size:18px;font-weight:900;color:#0f172a;">Scan &amp; Pay via UPI</h4>
      </div>

      <div style="background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:8px;padding:14px;margin-bottom:20px;text-align:center;">
        <div style="font-size:11px;color:#64748b;font-weight:800;letter-spacing:0.8px;text-transform:uppercase;margin-bottom:4px;">PAYABLE ORDER AMOUNT:</div>
        <div id="lane4-qr-amount-display" style="font-size:28px;font-weight:900;color:#0f172a;letter-spacing:0.5px;">
          ${checkoutQuote ? checkoutQuote.pricing.finalPayableFormatted : 'Calculating...'}
        </div>
      </div>

      <div style="display:flex;flex-wrap:wrap;gap:20px;align-items:center;margin-bottom:20px;">
        <!-- QR Code Card with Tap to Enlarge -->
        <div id="lane4-checkout-qr-card" style="text-align:center;flex:0 0 170px;margin:0 auto;cursor:pointer;position:relative;background:#ffffff;border:1.5px solid #cbd5e1;border-radius:10px;padding:10px;box-shadow:0 4px 12px rgba(15,23,42,0.06);transition:all 0.2s cubic-bezier(0.16, 1, 0.3, 1);" title="Click to enlarge QR code for easy scanning">
          <div style="position:relative;width:150px;height:150px;margin:0 auto;background:#ffffff;display:flex;align-items:center;justify-content:center;">
            <img id="lane4-qr-img-display" src="${qrUrl}" alt="LANE4 Store UPI QR Code" style="width:150px;height:150px;object-fit:contain;border-radius:6px;display:block;" />
            <div style="position:absolute;bottom:4px;background:rgba(15,23,42,0.92);color:#ffffff;font-size:9.5px;font-weight:800;letter-spacing:0.5px;padding:3px 8px;border-radius:20px;display:flex;align-items:center;gap:4px;box-shadow:0 2px 6px rgba(0,0,0,0.25);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
              <span>TAP TO ENLARGE</span>
            </div>
          </div>
          <div style="font-size:11.5px;font-weight:800;color:#0f172a;margin-top:8px;line-height:1.2;">Official Store UPI QR</div>
          <div style="font-size:10px;color:#64748b;margin-top:2px;">Click to scan in full size</div>
        </div>

        <!-- Instructions & UPI VPA -->
        <div style="flex:1;min-width:240px;">
          <div style="margin-bottom:12px;">
            <label style="display:block;font-size:11px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:0.8px;">Store UPI ID (VPA)</label>
            <div style="display:flex;align-items:center;gap:8px;margin-top:4px;">
              <code style="background:#f1f5f9;padding:8px 12px;border-radius:6px;font-size:14px;font-weight:800;color:#0f172a;flex:1;">${upiId}</code>
              <button type="button" id="lane4-copy-upi-btn" style="background:#0f172a;color:#fff;border:none;padding:8px 14px;border-radius:6px;font-size:12px;font-weight:800;cursor:pointer;">COPY</button>
            </div>
            <div style="font-size:12px;color:#475569;margin-top:4px;">Account Name: <strong>${upiName}</strong></div>
          </div>
          <div style="font-size:12.5px;color:#334155;line-height:1.5;background:#f8fafc;padding:12px;border-radius:6px;border-left:3px solid #0f172a;">
            ${instructions}
          </div>
        </div>
      </div>

      <hr style="border:none;border-top:1px solid #f1f5f9;margin:20px 0;" />

      <!-- Payment Proof Form Inputs -->
      <div style="margin-bottom:16px;">
        <label style="display:block;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:6px;color:#0f172a;">
          12-Digit UPI Transaction / UTR Reference ID <span style="color:#ef4444;">*</span>
        </label>
        <input type="text" id="lane4-utr-input" placeholder="e.g. 432109876543" maxlength="12" pattern="[0-9]{12}" inputmode="numeric" required style="width:100%;padding:12px 14px;border:1.5px solid #0f172a;border-radius:6px;font-size:15px;font-weight:800;letter-spacing:1px;box-sizing:border-box;" />
        <div style="font-size:12px;color:#64748b;margin-top:4px;">Found in your GPay / PhonePe / Paytm payment receipt as UTR or UPI Ref No.</div>
      </div>

      <div>
        <label style="display:block;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:6px;color:#0f172a;">
          Upload Payment Screenshot Proof <span style="color:#ef4444;">*</span>
        </label>
        <input type="file" id="lane4-screenshot-file" accept="image/jpeg,image/png,image/webp" required style="display:block;width:100%;padding:12px;border:1.5px dashed #94a3b8;border-radius:6px;background:#f8fafc;cursor:pointer;font-size:13px;box-sizing:border-box;" />
        <div id="lane4-screenshot-preview" style="display:none;margin-top:10px;text-align:center;">
          <img id="lane4-preview-img" src="" alt="Payment Proof Preview" style="max-height:160px;border:1px solid #cbd5e1;border-radius:6px;box-shadow:0 4px 8px rgba(0,0,0,0.08);" />
        </div>
      </div>
    `;

    paymentContainer.appendChild(qrWrapper);

    // Click & Hover interactions for enlarged QR Modal
    const qrCard = document.getElementById('lane4-checkout-qr-card');
    if (qrCard) {
      qrCard.onmouseenter = () => {
        qrCard.style.transform = 'translateY(-2px) scale(1.02)';
        qrCard.style.boxShadow = '0 10px 24px -4px rgba(15,23,42,0.15)';
        qrCard.style.borderColor = '#0f172a';
      };
      qrCard.onmouseleave = () => {
        qrCard.style.transform = 'translateY(0) scale(1)';
        qrCard.style.boxShadow = '0 4px 12px rgba(15,23,42,0.06)';
        qrCard.style.borderColor = '#cbd5e1';
      };
      qrCard.onclick = () => openEnlargedQrModal();
    }

    // Copy UPI ID button
    const copyBtn = document.getElementById('lane4-copy-upi-btn');
    if (copyBtn) {
      copyBtn.onclick = () => {
        navigator.clipboard.writeText(upiId);
        copyBtn.textContent = 'COPIED!';
        copyBtn.style.background = '#16a34a';
        setTimeout(() => {
          copyBtn.textContent = 'COPY';
          copyBtn.style.background = '#0f172a';
        }, 1500);
      };
    }

    // Screenshot file preview
    const fileInput = document.getElementById('lane4-screenshot-file');
    if (fileInput) {
      fileInput.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
          const preview = document.getElementById('lane4-screenshot-preview');
          const img = document.getElementById('lane4-preview-img');
          const reader = new FileReader();
          reader.onload = (evt) => {
            img.src = evt.target.result;
            preview.style.display = 'block';
          };
          reader.readAsDataURL(file);
        }
      };
    }

    function openEnlargedQrModal() {
      const existing = document.getElementById('lane4-enlarged-qr-modal');
      if (existing) existing.remove();

      const currentAmount = (document.getElementById('lane4-qr-amount-display')?.textContent || (checkoutQuote && checkoutQuote.pricing && checkoutQuote.pricing.finalPayableFormatted) || '').trim();
      const currentQrSrc = document.getElementById('lane4-qr-img-display')?.src || qrUrl;

      const modal = document.createElement('div');
      modal.id = 'lane4-enlarged-qr-modal';
      modal.style.cssText = `
        position: fixed;
        inset: 0;
        background: rgba(15, 23, 42, 0.78);
        backdrop-filter: blur(6px);
        -webkit-backdrop-filter: blur(6px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 99999999;
        padding: 16px;
        box-sizing: border-box;
      `;

      modal.innerHTML = `
        <div style="background:#ffffff;border-radius:14px;max-width:440px;width:100%;box-shadow:0 25px 50px -12px rgba(15,23,42,0.35);overflow:hidden;position:relative;box-sizing:border-box;">
          <div style="padding:16px 20px 12px;border-bottom:1px solid #f1f5f9;display:flex;align-items:center;justify-content:space-between;background:#ffffff;">
            <div>
              <div style="font-size:10px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:#64748b;line-height:1;">LANE4 INSTANT SETTLEMENT</div>
              <div style="font-size:17px;font-weight:900;color:#0f172a;margin-top:3px;">Scan &amp; Pay via UPI</div>
            </div>
            <button type="button" id="lane4-close-qr-modal" style="background:#f1f5f9;border:none;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#475569;font-size:20px;cursor:pointer;" title="Close">&times;</button>
          </div>
          <div style="padding:20px;text-align:center;">
            ${currentAmount ? `
              <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:8px 16px;display:inline-block;margin-bottom:14px;">
                <span style="font-size:10.5px;font-weight:700;color:#64748b;text-transform:uppercase;margin-right:6px;">PAYABLE:</span>
                <span style="font-size:20px;font-weight:900;color:#0f172a;letter-spacing:0.5px;">${currentAmount}</span>
              </div>
            ` : ''}
            <div style="background:#ffffff;border:2px solid #0f172a;border-radius:12px;padding:16px;display:inline-block;box-shadow:0 8px 24px -4px rgba(15,23,42,0.12);margin-bottom:14px;">
              <img src="${currentQrSrc}" alt="Enlarged UPI QR Code" style="width:280px;height:280px;max-width:68vw;max-height:68vw;object-fit:contain;display:block;margin:0 auto;" />
            </div>
            <div style="display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:14px;font-size:10.5px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">
              <span>Google Pay</span> • <span>PhonePe</span> • <span>Paytm</span> • <span>BHIM</span> • <span>Cred</span>
            </div>
            <div style="background:#f1f5f9;border-radius:8px;padding:9px 12px;display:flex;align-items:center;justify-content:space-between;gap:10px;text-align:left;">
              <div style="min-width:0;">
                <div style="font-size:9.5px;font-weight:800;color:#64748b;text-transform:uppercase;">Store UPI ID (VPA)</div>
                <div style="font-size:13px;font-weight:800;color:#0f172a;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${upiId}</div>
              </div>
              <button type="button" id="lane4-modal-copy-btn" style="background:#0f172a;color:#ffffff;border:none;padding:6px 12px;border-radius:5px;font-size:11px;font-weight:800;cursor:pointer;white-space:nowrap;flex-shrink:0;">COPY</button>
            </div>
          </div>
          <div style="padding:12px 20px;background:#f8fafc;border-top:1px solid #e2e8f0;display:flex;align-items:center;justify-content:space-between;">
            <span style="font-size:11px;color:#64748b;">Hold camera close to scan code</span>
            <button type="button" id="lane4-done-qr-modal" style="background:#0f172a;color:#ffffff;border:none;padding:7px 18px;border-radius:6px;font-size:12px;font-weight:800;cursor:pointer;">Done</button>
          </div>
        </div>
      `;

      document.body.appendChild(modal);

      const closeModal = () => modal.remove();
      modal.onclick = (e) => { if (e.target === modal) closeModal(); };
      document.getElementById('lane4-close-qr-modal').onclick = closeModal;
      document.getElementById('lane4-done-qr-modal').onclick = closeModal;

      const mCopy = document.getElementById('lane4-modal-copy-btn');
      if (mCopy) {
        mCopy.onclick = () => {
          navigator.clipboard.writeText(upiId);
          mCopy.textContent = 'COPIED!';
          mCopy.style.background = '#16a34a';
          setTimeout(() => {
            mCopy.textContent = 'COPY';
            mCopy.style.background = '#0f172a';
          }, 1500);
        };
      }
    }
  }

  function clearFieldError(inputEl) {
    if (!inputEl) return;
    inputEl.classList.remove('lane4-input-has-error');
    inputEl.style.borderColor = '#cbd5e1';
    inputEl.style.backgroundColor = '';
    const parent = inputEl.parentElement;
    if (parent) {
      const errEl = parent.querySelector('.lane4-field-inline-error');
      if (errEl) errEl.remove();
    }
  }

  function clearAllFieldErrors() {
    document.querySelectorAll('.lane4-field-inline-error').forEach(e => e.remove());
    document.querySelectorAll('#lane4-checkout-form-alert').forEach(e => e.remove());
    document.querySelectorAll('.lane4-input-has-error').forEach(el => {
      el.classList.remove('lane4-input-has-error');
      el.style.borderColor = '#cbd5e1';
      el.style.backgroundColor = '';
    });
  }

  function setFieldError(inputEl, message) {
    if (!inputEl) return;
    inputEl.classList.add('lane4-input-has-error');
    inputEl.style.borderColor = '#ef4444';
    inputEl.style.backgroundColor = '#fff5f5';

    const parent = inputEl.parentElement;
    if (parent) {
      let errEl = parent.querySelector('.lane4-field-inline-error');
      if (!errEl) {
        errEl = document.createElement('div');
        errEl.className = 'lane4-field-inline-error';
        errEl.style.cssText = 'color:#dc2626;font-size:12px;font-weight:600;margin-top:4px;line-height:1.4;';
        parent.appendChild(errEl);
      }
      errEl.innerHTML = `<span>${message}</span>`;
    }

    inputEl.addEventListener('input', () => clearFieldError(inputEl), { once: true });
    inputEl.addEventListener('change', () => clearFieldError(inputEl), { once: true });
  }

  function showCheckoutErrorBanner(title, messages, focusEl = null) {
    // User requested: No message box above 'Place Order & Submit Payment' button.
    // Inline field validation errors within the form are sufficient.
    const alertBox = document.getElementById('lane4-checkout-form-alert');
    if (alertBox) alertBox.remove();

    if (focusEl) {
      try {
        focusEl.focus();
        focusEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } catch (_) {}
    }
  }

  function setupInputRestrictions() {
    // Disable native HTML5 browser validation tooltips across all checkout forms
    document.querySelectorAll('form').forEach(f => {
      f.setAttribute('novalidate', '');
    });

    const pinInputs = document.querySelectorAll('input.w-commerce-commercecheckoutshippingzippostalcode, #lane4-checkout-zip, input[name="address_zip"]');
    pinInputs.forEach(pinEl => {
      pinEl.setAttribute('maxlength', '6');
      pinEl.setAttribute('minlength', '6');
      pinEl.setAttribute('inputmode', 'numeric');
      pinEl.removeAttribute('pattern');
      pinEl.removeAttribute('title');
      pinEl.setAttribute('autocomplete', 'postal-code');

      pinEl.addEventListener('input', (e) => {
        const cleaned = e.target.value.replace(/\D/g, '').slice(0, 6);
        if (e.target.value !== cleaned) e.target.value = cleaned;
        clearFieldError(pinEl);
      });
      pinEl.addEventListener('keydown', (e) => {
        if (['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Enter', 'Home', 'End'].includes(e.key) ||
            e.ctrlKey || e.metaKey) return;
        if (!/^[0-9]$/.test(e.key)) {
          e.preventDefault();
        }
      });
      pinEl.addEventListener('paste', (e) => {
        e.preventDefault();
        const text = (e.clipboardData || window.clipboardData).getData('text');
        pinEl.value = text.replace(/\D/g, '').slice(0, 6);
        clearFieldError(pinEl);
      });
    });

    const utrEl = document.getElementById('lane4-utr-input');
    if (utrEl) {
      utrEl.setAttribute('maxlength', '12');
      utrEl.setAttribute('inputmode', 'numeric');
      utrEl.addEventListener('input', (e) => {
        const cleaned = e.target.value.replace(/\D/g, '').slice(0, 12);
        if (e.target.value !== cleaned) e.target.value = cleaned;
        clearFieldError(utrEl);
      });
      utrEl.addEventListener('keydown', (e) => {
        if (['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Enter'].includes(e.key) || e.ctrlKey || e.metaKey) return;
        if (!/^[0-9]$/.test(e.key)) e.preventDefault();
      });
      utrEl.addEventListener('paste', (e) => {
        e.preventDefault();
        const text = (e.clipboardData || window.clipboardData).getData('text');
        utrEl.value = text.replace(/\D/g, '').slice(0, 12);
        clearFieldError(utrEl);
      });
    }

    const phoneEl = document.getElementById('lane4-checkout-phone') || document.querySelector('input.lane4-checkout-phone-input');
    if (phoneEl) {
      phoneEl.setAttribute('maxlength', '10');
      phoneEl.setAttribute('inputmode', 'numeric');
      phoneEl.addEventListener('input', (e) => {
        const cleaned = e.target.value.replace(/\D/g, '').slice(0, 10);
        if (e.target.value !== cleaned) e.target.value = cleaned;
        clearFieldError(phoneEl);
      });
      phoneEl.addEventListener('keydown', (e) => {
        if (['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Enter'].includes(e.key) || e.ctrlKey || e.metaKey) return;
        if (!/^[0-9]$/.test(e.key)) e.preventDefault();
      });
      phoneEl.addEventListener('paste', (e) => {
        e.preventDefault();
        const text = (e.clipboardData || window.clipboardData).getData('text');
        phoneEl.value = text.replace(/\D/g, '').slice(0, 10);
        clearFieldError(phoneEl);
      });
    }
  }

  function setupPlaceOrderButton() {
    const placeOrderBtn = document.getElementById('lane4-place-order-btn') || document.querySelector('.w-commerce-commercecheckoutplaceorderbutton, .submit-order');
    if (!placeOrderBtn) return;

    placeOrderBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      clearAllFieldErrors();

      // Enforce customer authentication before placing order
      const user = window.LANE4.getUser();
      if (!user || !user.uid) {
        if (window.LANE4_AUTH && window.LANE4_AUTH.open) {
          window.LANE4_AUTH.open('login');
          if (window.LANE4_AUTH.showAlert) {
            window.LANE4_AUTH.showAlert('Please sign in or create an account to complete checkout and place your order.', 'error');
          }
        }
        return;
      }

      // Gather form inputs & elements
      const emailEl = document.querySelector('input[name="email"], #wf-ecom-email');
      const nameEl = document.getElementById('lane4-checkout-fullname') || document.querySelector('input.w-commerce-commercecheckoutshippingfullname, input[name="name"]');
      const phoneEl = document.getElementById('lane4-checkout-phone') || document.querySelector('input.lane4-checkout-phone-input');
      const line1El = document.getElementById('lane4-checkout-street-address') || document.querySelector('input.w-commerce-commercecheckoutshippingstreetaddress, input[name="address_line1"]');
      const line2El = document.getElementById('lane4-checkout-street-address2') || document.querySelector('input.w-commerce-commercecheckoutshippingstreetaddressoptional, input[name="address_line2"]');
      const stateSelect = document.getElementById('lane4-checkout-state');
      const citySelect = document.getElementById('lane4-checkout-city-select');
      const customCityInput = document.getElementById('lane4-checkout-city-custom');
      const pinEl = document.getElementById('lane4-checkout-zip') || document.querySelector('input.w-commerce-commercecheckoutshippingzippostalcode, input[name="address_zip"]');
      const utrEl = document.getElementById('lane4-utr-input');
      const fileInput = document.getElementById('lane4-screenshot-file');

      const email = emailEl?.value.trim() || '';
      const name = nameEl?.value.trim() || '';
      const line1 = line1El?.value.trim() || '';
      const line2 = line2El?.value.trim() || '';
      const state = stateSelect ? stateSelect.value.trim() : (document.querySelector('input[name="address_state"]')?.value.trim() || '');
      let city = '';
      if (citySelect && citySelect.value === 'Other' && customCityInput) {
        city = customCityInput.value.trim();
      } else if (citySelect) {
        city = citySelect.value.trim();
      } else {
        city = document.querySelector('input[name="address_city"]')?.value.trim() || '';
      }
      const postalCode = pinEl?.value.trim() || '';
      const phone = phoneEl?.value.trim() || '';
      const utr = utrEl?.value.trim() || '';
      const screenshot = fileInput?.files ? fileInput.files[0] : null;

      // In-form Client Validations - NO toast, NO general alert box, ONLY inline errors
      clearAllFieldErrors();
      const errors = [];
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!email || !emailRegex.test(email)) {
        errors.push({ el: emailEl, name: 'Email Address', msg: 'Please enter a valid customer email address.' });
      }
      if (!name || name.length < 2) {
        errors.push({ el: nameEl, name: 'Full Name', msg: 'Please enter your full delivery name.' });
      }
      const phoneDigits = (phone || '').replace(/\D/g, '');
      if (!phone || (window.LANE4_VALIDATION ? !window.LANE4_VALIDATION.isValidIndianPhone(phone) : phoneDigits.length !== 10)) {
        errors.push({ el: phoneEl, name: 'Mobile Phone', msg: 'Please enter a valid 10-digit Indian mobile number.' });
      }
      if (!line1 || line1.length < 5) {
        errors.push({ el: line1El, name: 'Street Address', msg: 'Please enter your complete street address (flat/house no., street name).' });
      }
      if (!state) {
        errors.push({ el: stateSelect, name: 'State / UT', msg: 'Please select your delivery state.' });
      }
      if (!city) {
        errors.push({ el: citySelect?.value === 'Other' ? customCityInput : citySelect, name: 'City', msg: 'Please select or enter your delivery city.' });
      }
      if (!postalCode || !/^[1-9][0-9]{5}$/.test(postalCode) || /^(.)\1{5}$/.test(postalCode) || postalCode === '123456') {
        errors.push({ el: pinEl, name: 'PIN / Postal Code', msg: 'Please provide a correct 6-digit postal code.' });
      }
      const utrClean = (utr || '').replace(/\s+/g, '');
      if (!utrClean || !/^\d{12}$/.test(utrClean)) {
        errors.push({ el: utrEl, name: '12-Digit UTR Number', msg: 'Please enter a valid 12-digit numeric UPI Reference / UTR Number.' });
      }
      if (!screenshot) {
        errors.push({ el: fileInput, name: 'Payment Screenshot', msg: 'Please upload your payment confirmation screenshot before placing order.' });
      }

      if (errors.length > 0) {
        errors.forEach(err => {
          if (err.el) setFieldError(err.el, err.msg);
        });
        if (errors[0] && errors[0].el) {
          try {
            errors[0].el.focus();
            errors[0].el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          } catch (_) {}
        }
        return;
      }

      placeOrderBtn.disabled = true;
      placeOrderBtn.innerHTML = `
        <svg class="lane4-btn-spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="animation:lane4Spin 0.8s linear infinite;">
          <circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle>
          <path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round"></path>
        </svg>
        <span>SUBMITTING ORDER &amp; PAYMENT...</span>
      `;
      placeOrderBtn.style.pointerEvents = 'none';

      try {
        const guestId = window.LANE4.getGuestId();
        const cartRes = await window.lane4ApiRequest(`/cart?guestId=${encodeURIComponent(guestId)}`);
        const cart = cartRes.data || { items: [] };

        // 1. Create order on backend
        const orderPayload = {
          customerEmail: email,
          customerPhone: phone,
          shippingAddress: {
            addressee: name,
            phone: phone,
            addressLine1: line1,
            addressLine2: line2,
            city,
            state,
            postalCode
          },
          items: cart.items,
          couponCode: activeCoupon,
          guestId
        };

        const orderRes = await window.lane4ApiRequest('/orders', {
          method: 'POST',
          body: JSON.stringify(orderPayload)
        });

        const createdOrder = orderRes.data;

        // Immediately clear cart upon order placement
        try {
          if (window.LANE4_CART && typeof window.LANE4_CART.clear === 'function') {
            await window.LANE4_CART.clear();
          } else {
            await window.lane4ApiRequest(`/cart?guestId=${encodeURIComponent(guestId)}`, {
              method: 'DELETE'
            });
          }
          window.dispatchEvent(new CustomEvent('lane4:cart-cleared'));
        } catch (_) {}

        // 2. Upload Payment Proof
        const formData = new FormData();
        formData.append('orderId', createdOrder.orderId);
        formData.append('upiReferenceNumber', utr);
        formData.append('screenshot', screenshot);

        await window.lane4ApiRequest('/payments/proof', {
          method: 'POST',
          body: formData
        });

        // Broadcast real-time payment notification across tabs & admin console
        try {
          const ch = new BroadcastChannel('lane4_orders_channel');
          ch.postMessage({
            type: 'NEW_PAYMENT_SUBMITTED',
            orderId: createdOrder.orderId || createdOrder.id,
            orderNumber: createdOrder.orderNumber || createdOrder.orderId,
            amountPaise: createdOrder.pricing ? createdOrder.pricing.finalPayablePaise : 0,
            amountFormatted: createdOrder.pricing ? createdOrder.pricing.finalPayableFormatted : '',
            utr: utrClean
          });
          ch.close();
        } catch (_) {}

        // 3. Clear cart cache and render order success receipt
        if (window.LANE4_CART && typeof window.LANE4_CART.clear === 'function') {
          await window.LANE4_CART.clear();
        } else if (window.LANE4_CART && window.LANE4_CART.refresh) {
          window.LANE4_CART.refresh();
        }
        window.dispatchEvent(new CustomEvent('lane4:cart-cleared'));
        const badges = document.querySelectorAll('.cart-quantity, .w-commerce-commercecartopenlinkcount, #lane4-cart-badge');
        badges.forEach(b => { b.textContent = '0'; });

        renderOrderSuccess(createdOrder, utr);
      } catch (err) {
        placeOrderBtn.disabled = false;
        placeOrderBtn.style.pointerEvents = 'auto';
        placeOrderBtn.innerHTML = `
          <span>PLACE ORDER &amp; SUBMIT PAYMENT</span>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
        `;

        clearAllFieldErrors();

        // Check for duplicate UTR error specifically
        const errMsg = err.message || '';
        if (errMsg.toLowerCase().includes('already been submitted') || errMsg.toLowerCase().includes('duplicate') || errMsg.toLowerCase().includes('utr')) {
          setFieldError(utrEl, 'This UTR Number has already been submitted or verified for another order.');
          if (utrEl) {
            try {
              utrEl.focus();
              utrEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } catch (_) {}
          }
          return;
        }

        // Check for specific backend validation details - show inline under the exact failing field only
        if (err.details && Array.isArray(err.details) && err.details.length > 0) {
          const fieldMap = {
            'shippingAddress.postalCode': { el: pinEl, label: 'PIN / Postal Code' },
            'shippingAddress.phone': { el: phoneEl, label: 'Mobile Phone' },
            'customerPhone': { el: phoneEl, label: 'Mobile Phone' },
            'shippingAddress.addressee': { el: nameEl, label: 'Full Name' },
            'shippingAddress.addressLine1': { el: line1El, label: 'Street Address' },
            'shippingAddress.city': { el: citySelect, label: 'City' },
            'shippingAddress.state': { el: stateSelect, label: 'State' },
            'customerEmail': { el: emailEl, label: 'Email Address' },
            'upiReferenceNumber': { el: utrEl, label: 'UPI Reference / UTR' },
            'screenshot': { el: fileInput, label: 'Payment Screenshot' }
          };

          let firstFocus = null;

          err.details.forEach(d => {
            const mapping = fieldMap[d.field];
            if (mapping && mapping.el) {
              setFieldError(mapping.el, d.message);
              if (!firstFocus) firstFocus = mapping.el;
            }
          });

          if (firstFocus) {
            try {
              firstFocus.focus();
              firstFocus.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } catch (_) {}
          }
          return;
        }

        // Map generic error messages directly to the missing/problem field inline - NO toast and NO alert box
        if (errMsg) {
          const lower = errMsg.toLowerCase();
          let targetEl = null;
          if (lower.includes('address') || lower.includes('street')) {
            targetEl = line1El;
          } else if (lower.includes('postal') || lower.includes('pin') || lower.includes('zip')) {
            targetEl = pinEl;
          } else if (lower.includes('city')) {
            targetEl = citySelect;
          } else if (lower.includes('phone') || lower.includes('mobile')) {
            targetEl = phoneEl;
          } else if (lower.includes('email')) {
            targetEl = emailEl;
          } else if (lower.includes('utr') || lower.includes('reference')) {
            targetEl = utrEl;
          } else if (lower.includes('screenshot') || lower.includes('proof')) {
            targetEl = fileInput;
          }

          if (targetEl) {
            setFieldError(targetEl, errMsg);
            try {
              targetEl.focus();
              targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } catch (_) {}
          }
        }
      }
    }, true);
  }

  function renderOrderSuccess(order, utrNumber = '') {
    // 1. Completely remove or hide the Order Summary sidebar box
    const sidebar = document.getElementById('lane4-checkout-sidebar') || document.querySelector('.w-commerce-commercelayoutsidebar');
    if (sidebar) {
      sidebar.style.display = 'none';
      sidebar.remove();
    }

    // 2. Hide quick checkout actions
    const quickActions = document.querySelector('[data-node-type="commerce-cart-quick-checkout-actions"]');
    if (quickActions) quickActions.style.display = 'none';

    // 3. Expand layout container to full width centered
    const layoutContainer = document.querySelector('.w-commerce-commercelayoutcontainer');
    if (layoutContainer) {
      layoutContainer.style.display = 'block';
      layoutContainer.style.maxWidth = '780px';
      layoutContainer.style.margin = '0 auto';
    }

    const mainContainer = document.querySelector('.w-commerce-commercelayoutmain') || document.body;

    const itemsPurchasedHtml = (order.items || []).map(it => `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:13.5px;">
        <div>
          <span style="font-weight:700;color:#0f172a;">${it.name}</span>
          ${it.size || it.color ? `<span style="color:#64748b;font-size:12px;"> (${[it.size, it.color].filter(Boolean).join(', ')})</span>` : ''}
          <span style="color:#64748b;"> &times; ${it.quantity}</span>
        </div>
        <div style="font-weight:800;color:#0f172a;">${it.totalPriceFormatted || window.LANE4.formatINR(it.pricePaise * it.quantity)}</div>
      </div>
    `).join('');

    mainContainer.innerHTML = `
      <div style="margin:20px auto 40px;padding:36px 30px;background:#ffffff;border:2px solid #0f172a;border-radius:12px;box-shadow:0 25px 50px -12px rgba(15,23,42,0.15);text-align:center;font-family:'Generalsans','General Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
        <!-- Checkmark Icon -->
        <div style="width:68px;height:68px;background:#16a34a;color:#ffffff;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 18px auto;box-shadow:0 8px 20px rgba(22,163,74,0.3);">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>
        
        <h2 style="font-size:24px;font-weight:900;color:#0f172a;margin:0 0 8px 0;letter-spacing:0.5px;">ORDER PLACED &amp; PAYMENT SUBMITTED!</h2>
        
        <div style="display:inline-block;background:#fef3c7;color:#92400e;padding:5px 14px;border-radius:20px;font-weight:800;font-size:11.5px;letter-spacing:1px;text-transform:uppercase;margin-bottom:20px;border:1px solid #fde68a;">
          Status: Verification Pending
        </div>

        <p style="font-size:15px;color:#475569;line-height:1.6;margin:0 0 22px 0;">
          Thank you for ordering with <strong>The Lane4 Performance Store</strong>! Your order <strong>#${order.orderNumber || order.orderId}</strong> has been logged.
        </p>

        <!-- Order Details Card -->
        <div style="background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:10px;padding:20px;text-align:left;margin-bottom:22px;font-size:13.5px;line-height:1.7;">
          <div style="display:flex;justify-content:space-between;border-bottom:1px solid #e2e8f0;padding-bottom:10px;margin-bottom:12px;">
            <div><span style="color:#64748b;">Order Number:</span> <strong>#${order.orderNumber || order.orderId}</strong></div>
            <div><span style="color:#64748b;">Total Paid:</span> <strong style="font-size:16px;color:#0f172a;">${order.pricing ? order.pricing.finalPayableFormatted : ''}</strong></div>
          </div>
          
          <div style="margin-bottom:12px;">
            <div style="font-size:11.5px;font-weight:800;text-transform:uppercase;color:#64748b;letter-spacing:0.5px;margin-bottom:4px;">Items in this Order</div>
            ${itemsPurchasedHtml}
          </div>

          <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(240px, 1fr));gap:12px;margin-top:14px;padding-top:12px;border-top:1px solid #e2e8f0;">
            <div>
              <span style="color:#64748b;font-size:12px;display:block;font-weight:700;text-transform:uppercase;">Shipping To</span>
              <strong>${order.shippingAddress ? `${order.shippingAddress.addressee}, ${order.shippingAddress.addressLine1}${order.shippingAddress.addressLine2 ? ', ' + order.shippingAddress.addressLine2 : ''}, ${order.shippingAddress.city}, ${order.shippingAddress.state} - ${order.shippingAddress.postalCode}` : ''}</strong>
            </div>
            <div>
              <span style="color:#64748b;font-size:12px;display:block;font-weight:700;text-transform:uppercase;">Payment Info</span>
              <span>Method: <strong>Manual UPI Instant Transfer</strong></span><br/>
              ${utrNumber ? `<span>12-Digit Ref (UTR): <code style="background:#e2e8f0;padding:2px 6px;border-radius:4px;font-weight:700;">${utrNumber}</code></span>` : ''}
            </div>
          </div>
        </div>

        <!-- Verification Notice -->
        <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:16px;font-size:13px;color:#1e40af;line-height:1.6;margin-bottom:28px;text-align:left;">
          <strong>Order Reference:</strong> #${order.orderNumber || order.orderId}<br />
          Our team verifies payment transfers promptly during business hours. Once verified, order status updates in your Swimmer Account and delivery dispatch details will be sent directly to your email.
        </div>

        <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">
          <a href="shop.html" style="background:#0f172a;color:#ffffff;padding:14px 28px;text-decoration:none;border-radius:8px;font-weight:800;letter-spacing:1px;font-size:13.5px;text-transform:uppercase;">CONTINUE SHOPPING</a>
          <a href="index.htm" style="background:#f1f5f9;color:#0f172a;padding:14px 28px;text-decoration:none;border-radius:8px;font-weight:800;letter-spacing:1px;font-size:13.5px;border:1px solid #cbd5e1;text-transform:uppercase;">RETURN HOME</a>
        </div>
      </div>
    `;

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Inject spinner animation style
  try {
    const s = document.createElement('style');
    s.textContent = `@keyframes lane4Spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`;
    document.head.appendChild(s);
  } catch(e) {}

  document.addEventListener('DOMContentLoaded', initCheckout);
})();
