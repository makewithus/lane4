/**
 * LANE4 Operations Portal Client Script
 * Complete management of Products Catalog, Categories, Coupons, Orders, Payments & Inventory.
 */

// Globally export date formatters immediately before IIFE
var formatDateTime = window.formatDateTime || function(val) { return val ? new Date(val).toLocaleString('en-IN') : '—'; };
var formatDateString = window.formatDateString || formatDateTime;

(function () {
  let activeAdmin = null;
  let currentView = 'dashboard';
  window.currentView = currentView;

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function toMillis(val) {
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

  function resolveAdminAsset(url) {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) return url;
    const clean = url.replace(/^(\.\.\/|\.\/|\/)+/, '');
    if (typeof window !== 'undefined' && window.location && window.location.protocol === 'file:') {
      return `../${clean}`;
    }
    return `/${clean}`;
  }

  // Universal timestamp formatting helper handling Firestore Timestamps, ISO strings & ms
  function formatDateTime(val, dateOnly) {
    if (!val) return '—';
    const ms = toMillis(val);
    if (!ms) return '—';
    const d = new Date(ms);
    if (isNaN(d.getTime())) return '—';
    if (dateOnly) {
      return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    }
    return d.toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  }

  function formatDateString(val, dateOnly) {
    return formatDateTime(val, dateOnly);
  }
  window.formatDateTime = formatDateTime;
  window.formatDateString = formatDateString;

  function formatLogDate(val) {
    if (!val) return '—';
    const ms = toMillis(val);
    if (!ms) return '—';
    const d = new Date(ms);
    if (isNaN(d.getTime())) return '—';
    const dateStr = d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
    const timeStr = d.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }) + ' IST';

    return `
      <div style="display:flex;flex-direction:column;gap:3px;">
        <div style="font-weight:700;font-size:13px;color:#0f172a;display:inline-flex;align-items:center;gap:6px;">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          <span>${escapeHtml(dateStr)}</span>
        </div>
        <div style="font-size:11.5px;color:#64748b;display:inline-flex;align-items:center;gap:6px;padding-left:1px;">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          <span>${escapeHtml(timeStr)}</span>
        </div>
      </div>
    `;
  }

  function formatActionBadge(action) {
    if (!action) return '<span class="badge">ACTION</span>';
    const cleanAction = action.replace(/_/g, ' ').toUpperCase();
    let badgeStyle = 'background:#f1f5f9;color:#334155;border:1px solid #cbd5e1;';
    let icon = '';

    if (/approved|verified|confirmed|success|created/i.test(action)) {
      badgeStyle = 'background:#f0fdf4;color:#15803d;border:1px solid #bbf7d0;';
      icon = '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" style="margin-right:4px;"><polyline points="20 6 9 17 4 12"/></svg>';
    } else if (/rejected|deleted|cancelled|failed/i.test(action)) {
      badgeStyle = 'background:#fef2f2;color:#b91c1c;border:1px solid #fecaca;';
      icon = '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" style="margin-right:4px;"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
    } else if (/tracking|shipped|dispatched|fulfillment/i.test(action)) {
      badgeStyle = 'background:#f0f9ff;color:#0369a1;border:1px solid #bae6fd;';
      icon = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:4px;"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>';
    } else if (/status|updated|adjusted|modified/i.test(action)) {
      badgeStyle = 'background:#faf5ff;color:#7e22ce;border:1px solid #e9d5ff;';
      icon = '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-right:4px;"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>';
    } else if (/login|auth/i.test(action)) {
      badgeStyle = 'background:#f0fdf4;color:#166534;border:1px solid #bbf7d0;';
      icon = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-right:4px;"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>';
    }

    return `<span class="badge" style="${badgeStyle}font-size:10.5px;padding:4px 9px;letter-spacing:0.5px;display:inline-flex;align-items:center;">${icon}${escapeHtml(cleanAction)}</span>`;
  }

  function formatResource(resType, resId) {
    if (!resType && !resId) return '<span style="color:#94a3b8;">—</span>';
    const type = (resType || '').toLowerCase();
    const id = (resId || '').trim();
    const shortId = id.length > 12 ? `${id.slice(0, 10)}…` : id;

    let icon = '';
    if (type.includes('order')) {
      icon = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:middle;margin-right:4px;"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>';
    } else if (type.includes('payment')) {
      icon = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:middle;margin-right:4px;"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>';
    } else if (type.includes('product')) {
      icon = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:middle;margin-right:4px;"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>';
    }

    return `<span style="display:inline-flex;align-items:center;background:#f8fafc;border:1px solid #e2e8f0;padding:3px 8px;border-radius:4px;font-family:monospace;font-size:11px;font-weight:600;color:#334155;" title="${escapeHtml(`${resType}/${resId}`)}">${icon}${escapeHtml(`${resType}/${shortId}`)}</span>`;
  }

  function formatLogDetails(action, details, resourceType, resourceId) {
    if (!details || typeof details !== 'object' || Object.keys(details).length === 0) {
      return '<span style="color:#94a3b8;font-style:italic;font-size:12px;">No additional parameters</span>';
    }

    const d = details;

    // 1. Shipment / Tracking Added
    if (action === 'tracking_added' || d.courierName || d.trackingNumber) {
      return `
        <div style="display:flex;flex-direction:column;gap:5px;max-width:520px;">
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
            <span style="font-weight:700;color:#0f172a;font-size:13px;display:inline-flex;align-items:center;gap:4px;">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
              ${escapeHtml(d.courierName || 'Courier')}
            </span>
            <span style="background:#f1f5f9;color:#0f172a;padding:2px 8px;border-radius:4px;font-family:monospace;font-size:12px;font-weight:700;border:1px solid #e2e8f0;">
              AWB: ${escapeHtml(d.trackingNumber || '—')}
            </span>
          </div>
        </div>
      `;
    }

    // 1b. Admin Login Event
    if (action === 'admin_login') {
      return `
        <div style="display:inline-flex;align-items:center;gap:8px;font-size:12px;">
          <span style="display:inline-flex;align-items:center;gap:4px;color:#15803d;background:#f0fdf4;border:1px solid #bbf7d0;padding:2px 8px;border-radius:4px;font-weight:700;">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            Authenticated Session
          </span>
          <span style="font-family:monospace;font-size:11px;color:#64748b;background:#f8fafc;border:1px solid #e2e8f0;padding:2px 6px;border-radius:4px;">
            IP: ${escapeHtml(d.ip || '127.0.0.1')}
          </span>
        </div>
      `;
    }

    // 2. Order Status Update
    if (action === 'order_status_updated' || (d.previousStatus !== undefined && d.newStatus !== undefined)) {
      const prev = (d.previousStatus || '—').replace(/_/g, ' ').toUpperCase();
      const next = (d.newStatus || '—').replace(/_/g, ' ').toUpperCase();
      return `
        <div style="display:inline-flex;align-items:center;gap:8px;font-size:12px;">
          <span style="color:#64748b;background:#f1f5f9;padding:2px 8px;border-radius:4px;font-weight:600;text-decoration:line-through;">${escapeHtml(prev)}</span>
          <span style="color:#94a3b8;font-weight:800;">&rarr;</span>
          <span class="badge badge-${escapeHtml(d.newStatus || 'active')}" style="padding:3px 9px;">${escapeHtml(next)}</span>
        </div>
      `;
    }

    // 3. Payment Verified / Approved
    if (action === 'payment_approved' || action === 'payment_verified') {
      const amount = d.amountPaise ? (window.LANE4 && window.LANE4.formatINR ? window.LANE4.formatINR(d.amountPaise) : `₹${(d.amountPaise / 100).toFixed(2)}`) : '';
      return `
        <div style="display:flex;flex-direction:column;gap:4px;max-width:520px;">
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
            <span style="color:#16a34a;font-weight:700;font-size:12px;">Payment Approved</span>
            ${amount ? `<span style="font-weight:800;color:#0f172a;font-size:12px;">${amount}</span>` : ''}
            ${d.upiReferenceNumber ? `<span style="background:#f1f5f9;padding:2px 6px;border-radius:4px;font-family:monospace;font-size:11px;color:#334155;border:1px solid #e2e8f0;">UTR: ${escapeHtml(d.upiReferenceNumber)}</span>` : ''}
          </div>
          ${d.internalNote ? `<div style="font-size:11px;color:#64748b;font-style:italic;">Note: "${escapeHtml(d.internalNote)}"</div>` : ''}
        </div>
      `;
    }

    // 4. Payment Rejected
    if (action === 'payment_rejected') {
      return `
        <div style="display:flex;flex-direction:column;gap:4px;max-width:520px;">
          <span style="color:#dc2626;font-weight:700;font-size:12px;">Payment Rejected</span>
          ${d.reason ? `<div style="font-size:11px;color:#b91c1c;background:#fef2f2;border:1px solid #fecaca;padding:4px 8px;border-radius:4px;">Reason: ${escapeHtml(d.reason)}</div>` : ''}
        </div>
      `;
    }

    // 5. Inventory Stock Adjustment
    if (action === 'stock_adjusted' || (d.sku && d.newAvailable !== undefined)) {
      const diff = d.difference !== undefined ? d.difference : (d.newAvailable - d.previousAvailable);
      return `
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:12px;">
          <code style="background:#f1f5f9;border:1px solid #e2e8f0;padding:2px 6px;border-radius:4px;font-weight:700;">${escapeHtml(d.sku || '')}</code>
          <span>Stock: ${d.previousAvailable ?? '—'} &rarr; <strong style="color:#0f172a;">${d.newAvailable ?? '—'}</strong></span>
          ${diff !== undefined && !isNaN(diff) ? `<span style="color:${diff >= 0 ? '#16a34a' : '#dc2626'};font-weight:700;">(${diff > 0 ? '+' : ''}${diff})</span>` : ''}
          ${d.reason ? `<span style="font-size:11px;color:#64748b;font-style:italic;">"${escapeHtml(d.reason)}"</span>` : ''}
        </div>
      `;
    }

    // 6. Generic/Fallback: Clean, formatted Key-Value Chips (filtering out internal Firestore objects)
    const items = Object.entries(d).filter(([k, v]) => {
      if (k === 'createdAt' || k === 'updatedAt' || k === 'timestamp') return false;
      if (v === null || v === undefined || v === '') return false;
      return true;
    });

    if (items.length === 0) {
      return '<span style="color:#94a3b8;font-size:12px;">Updated successfully</span>';
    }

    return `
      <div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;max-width:540px;">
        ${items.map(([k, v]) => {
          const label = k.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase());
          let displayVal = typeof v === 'object' ? JSON.stringify(v) : String(v);
          if (displayVal.length > 50) displayVal = displayVal.slice(0, 47) + '...';
          return `
            <span style="display:inline-flex;align-items:center;gap:4px;background:#f8fafc;border:1px solid #e2e8f0;padding:3px 8px;border-radius:4px;font-size:11px;">
              <span style="color:#64748b;font-weight:500;">${escapeHtml(label)}:</span>
              <strong style="color:#0f172a;font-weight:700;">${escapeHtml(displayVal)}</strong>
            </span>
          `;
        }).join('')}
      </div>
    `;
  }

  // --- ACTIVE VIEW PERSISTENCE ---
  function getInitialView() {
    const hash = (window.location.hash || '').replace('#', '').trim();
    const validViews = ['dashboard', 'payments', 'orders', 'inventory', 'products', 'categories', 'coupons', 'customers', 'enquiries', 'settings', 'logs'];
    if (validViews.includes(hash)) return hash;
    const saved = localStorage.getItem('lane4_admin_active_view');
    if (validViews.includes(saved)) return saved;
    return 'dashboard';
  }

  // --- AUTHENTICATION & SESSION PERSISTENCE ---
  function parseJwt(token) {
    try {
      if (!token || typeof token !== 'string') return null;
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const base64Url = parts[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (e) {
      return null;
    }
  }

  const ADMIN_INACTIVITY_LIMIT_MS = 15 * 60 * 1000; // 15 minutes idle timeout
  const ADMIN_MAX_SESSION_MS = 2 * 60 * 60 * 1000;   // 2 hours maximum session length
  let sessionTimeoutInterval = null;
  let activityThrottleTimer = null;

  function lockAdminSession(reason = 'Administrator session expired. Please sign in with your credentials.', isSuccess = false) {
    stopPaymentPolling();
    if (sessionTimeoutInterval) {
      clearInterval(sessionTimeoutInterval);
      sessionTimeoutInterval = null;
    }
    isAdminPanelInitialized = false;

    // Clear all admin session credentials & activity state
    localStorage.removeItem('lane4_admin_token');
    localStorage.removeItem('lane4_admin_user');
    localStorage.removeItem('lane4_admin_login_time');
    localStorage.removeItem('lane4_admin_last_activity');
    localStorage.removeItem('lane4_admin_token_expiry');
    localStorage.removeItem('lane4_admin_active_view');
    window.location.hash = '';

    document.documentElement.classList.remove('admin-authed');
    document.documentElement.classList.add('admin-unauthed');

    const loginScreen = document.getElementById('admin-login-screen');
    if (loginScreen) loginScreen.style.display = 'flex';

    const alertEl = document.getElementById('admin-login-alert');
    if (alertEl) {
      alertEl.style.display = 'block';
      alertEl.style.background = isSuccess ? '#f0fdf4' : '#fef2f2';
      alertEl.style.color = isSuccess ? '#15803d' : '#b91c1c';
      alertEl.textContent = reason;
    }

    const passInput = document.getElementById('admin-pass');
    if (passInput) {
      passInput.value = '';
      try { passInput.focus(); } catch (_) {}
    }
    setupLoginForm();
  }

  function recordAdminActivity() {
    if (activityThrottleTimer) return;
    activityThrottleTimer = setTimeout(() => {
      activityThrottleTimer = null;
      if (localStorage.getItem('lane4_admin_token')) {
        localStorage.setItem('lane4_admin_last_activity', Date.now().toString());
      }
    }, 5000);
  }

  function startInactivityWatchers() {
    ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'].forEach(evt => {
      window.addEventListener(evt, recordAdminActivity, { passive: true });
    });

    if (sessionTimeoutInterval) clearInterval(sessionTimeoutInterval);
    sessionTimeoutInterval = setInterval(evaluateSessionValidity, 15000);
  }

  function evaluateSessionValidity() {
    const adminToken = localStorage.getItem('lane4_admin_token');
    if (!adminToken) return;

    const now = Date.now();
    const lastActive = parseInt(localStorage.getItem('lane4_admin_last_activity') || '0', 10);
    const loginTime = parseInt(localStorage.getItem('lane4_admin_login_time') || '0', 10);
    const tokenExpiry = parseInt(localStorage.getItem('lane4_admin_token_expiry') || '0', 10);

    // 1. Idle Inactivity Check (15 minutes)
    if (lastActive && (now - lastActive > ADMIN_INACTIVITY_LIMIT_MS)) {
      lockAdminSession('Administrator session timed out due to 15 minutes of inactivity. Please re-enter your credentials to continue.');
      return;
    }

    // 2. Max Session Duration (2 hours)
    if (loginTime && (now - loginTime > ADMIN_MAX_SESSION_MS)) {
      lockAdminSession('Administrator session reached its 2-hour maximum security duration. Please re-enter your credentials to continue.');
      return;
    }

    // 3. Absolute token expiry from server
    if (tokenExpiry && now >= tokenExpiry) {
      lockAdminSession('Administrator access token has expired. Please re-enter your credentials.');
      return;
    }

    // 4. JWT client-side expiry check
    try {
      const parts = adminToken.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
        if (payload && payload.exp && (payload.exp * 1000 <= now)) {
          lockAdminSession('Administrator access token has expired. Please sign in again.');
          return;
        }
      }
    } catch (_) {}
  }

  function updateAdminUserDisplay(admin) {
    const userDisplay = document.getElementById('admin-user-display');
    if (!userDisplay) return;
    const email = (admin && admin.email) || 'admin@lane4swim.in';
    userDisplay.innerHTML = `
      <div style="font-weight:700;color:#f8fafc;font-size:12px;line-height:1.2;">Staff: Chief Admin</div>
      <div style="font-size:11px;color:#94a3b8;line-height:1.2;margin-top:2px;">${escapeHtml(email)}</div>
      <div style="font-size:10px;color:#64748b;margin-top:4px;display:flex;align-items:center;gap:4px;">
        <span style="display:inline-block;width:5px;height:5px;border-radius:50%;background:#22c55e;"></span>
        <span>Secure Session (15m auto-lock)</span>
      </div>
    `;
  }

  async function checkAdminAuth() {
    const adminToken = localStorage.getItem('lane4_admin_token');
    const loginScreen = document.getElementById('admin-login-screen');
    const alertEl = document.getElementById('admin-login-alert');

    // Bind form submission & toggle password handlers
    setupLoginForm();

    if (!adminToken) {
      document.documentElement.classList.remove('admin-authed');
      document.documentElement.classList.add('admin-unauthed');
      if (loginScreen) loginScreen.style.display = 'flex';
      return;
    }

    const now = Date.now();
    const lastActive = parseInt(localStorage.getItem('lane4_admin_last_activity') || '0', 10);
    const loginTime = parseInt(localStorage.getItem('lane4_admin_login_time') || '0', 10);
    const tokenExpiry = parseInt(localStorage.getItem('lane4_admin_token_expiry') || '0', 10);

    // Prompt for credentials if inactive for > 15 minutes or session expired
    if (lastActive && (now - lastActive > ADMIN_INACTIVITY_LIMIT_MS)) {
      lockAdminSession('Administrator session timed out due to inactivity. Please re-enter your credentials to access the console.');
      return;
    }
    if (loginTime && (now - loginTime > ADMIN_MAX_SESSION_MS)) {
      lockAdminSession('Administrator session reached its 2-hour maximum duration. Please re-enter your credentials.');
      return;
    }
    if (tokenExpiry && now >= tokenExpiry) {
      lockAdminSession('Administrator access token has expired. Please sign in again.');
      return;
    }

    // Check token payload exp directly
    try {
      const parts = adminToken.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
        if (payload && payload.exp && (payload.exp * 1000 <= now)) {
          lockAdminSession('Administrator session token has expired. Please sign in again.');
          return;
        }
      }
    } catch (_) {}

    // Token exists and is locally fresh: render console smoothly without any login screen glitch
    document.documentElement.classList.remove('admin-unauthed');
    document.documentElement.classList.add('admin-authed');
    if (loginScreen) loginScreen.style.display = 'none';
    if (alertEl) {
      alertEl.style.display = 'none';
      alertEl.textContent = '';
    }

    try {
      const cachedAdmin = localStorage.getItem('lane4_admin_user');
      if (cachedAdmin) {
        activeAdmin = JSON.parse(cachedAdmin);
        updateAdminUserDisplay(activeAdmin);
      }
    } catch (e) {}

    initAdminPanel();
    startInactivityWatchers();

    // Verify session asynchronously in background with backend
    try {
      const res = await window.lane4ApiRequest('/auth/admin/verify', {
        headers: { Authorization: `Bearer ${adminToken}` }
      });

      if (res && res.data && res.data.valid && res.data.admin) {
        activeAdmin = res.data.admin;
        localStorage.setItem('lane4_admin_user', JSON.stringify(res.data.admin));
        localStorage.setItem('lane4_admin_last_activity', Date.now().toString());
        updateAdminUserDisplay(activeAdmin);
      } else {
        throw new Error('Administrator session verification failed.');
      }
    } catch (err) {
      console.warn('Session verification rejected by server:', err);
      if (err.status === 401 || err.status === 403) {
        lockAdminSession('Administrator session expired or invalid. Please sign in with your credentials.');
      }
    }
  }

  async function verifyAdminSessionWithServer(token) {
    try {
      const res = await window.lane4ApiRequest('/auth/admin/verify', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res && res.data && res.data.admin) {
        activeAdmin = res.data.admin;
        localStorage.setItem('lane4_admin_user', JSON.stringify(res.data.admin));
        updateAdminUserDisplay(activeAdmin);
      }
    } catch (err) {
      if (err.status === 401 || err.status === 403) {
        console.warn('Session verification rejected by server:', err);
        lockAdminSession('Session invalid. Please sign in to continue.');
      }
    }
  }

  function setupLoginForm() {
    const form = document.getElementById('admin-login-form');
    const alertEl = document.getElementById('admin-login-alert');
    const submitBtn = document.getElementById('admin-login-btn') || (form && form.querySelector('button[type="submit"]'));
    const togglePassBtn = document.getElementById('toggle-admin-pass');
    const passInput = document.getElementById('admin-pass');
    if (!form) return;

    if (togglePassBtn && passInput) {
      togglePassBtn.onclick = () => {
        const isPass = passInput.type === 'password';
        passInput.type = isPass ? 'text' : 'password';
        const showIcon = togglePassBtn.querySelector('.admin-eye-show');
        const hideIcon = togglePassBtn.querySelector('.admin-eye-hide');
        if (showIcon && hideIcon) {
          showIcon.style.display = isPass ? 'none' : 'block';
          hideIcon.style.display = isPass ? 'block' : 'none';
        } else {
          togglePassBtn.textContent = isPass ? 'Hide' : 'Show';
        }
        const label = isPass ? 'Hide password' : 'Show password';
        togglePassBtn.setAttribute('aria-label', label);
        togglePassBtn.setAttribute('title', label);
      };
    }

    form.onsubmit = async (e) => {
      e.preventDefault();
      const emailInput = document.getElementById('admin-email');
      const passInput = document.getElementById('admin-pass');
      const email = emailInput ? emailInput.value.trim() : '';
      const password = passInput ? passInput.value : '';

      if (!email || !password) {
        if (alertEl) {
          alertEl.style.display = 'block';
          alertEl.style.background = '#fef2f2';
          alertEl.style.color = '#b91c1c';
          alertEl.textContent = 'Please enter both administrator email and password.';
        }
        return;
      }

      if (alertEl) {
        alertEl.style.display = 'block';
        alertEl.style.background = '#eff6ff';
        alertEl.style.color = '#1d4ed8';
        alertEl.innerHTML = `
          <span style="display:inline-flex;align-items:center;gap:8px;">
            <span style="display:inline-block;width:12px;height:12px;border:2px solid #1d4ed8;border-top-color:transparent;border-radius:50%;animation:spin 0.6s linear infinite;"></span>
            <span>Authenticating staff credentials...</span>
          </span>
        `;
      }
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `
          <span style="display:inline-block;width:13px;height:13px;border:2px solid #ffffff;border-top-color:transparent;border-radius:50%;animation:spin 0.6s linear infinite;margin-right:8px;vertical-align:middle;"></span>
          <span>AUTHENTICATING...</span>
        `;
      }

      try {
        const res = await window.lane4ApiRequest('/auth/admin/login', {
          method: 'POST',
          body: JSON.stringify({ email, password })
        });

        if (!res || !res.data || !res.data.token) {
          throw new Error((res && res.message) || 'Failed to obtain administrator access token.');
        }

        const token = res.data.token;
        const now = Date.now();
        localStorage.setItem('lane4_admin_token', token);
        localStorage.setItem('lane4_admin_login_time', now.toString());
        localStorage.setItem('lane4_admin_last_activity', now.toString());
        if (res.data.expiresIn) {
          localStorage.setItem('lane4_admin_token_expiry', (now + res.data.expiresIn * 1000).toString());
        }
        if (res.data.admin) {
          localStorage.setItem('lane4_admin_user', JSON.stringify(res.data.admin));
          activeAdmin = res.data.admin;
        }

        if (alertEl) {
          alertEl.style.background = '#f0fdf4';
          alertEl.style.color = '#15803d';
          alertEl.textContent = 'Authenticated. Loading Operations Console...';
        }

        setTimeout(() => {
          document.documentElement.classList.remove('admin-unauthed');
          document.documentElement.classList.add('admin-authed');
          const loginScreen = document.getElementById('admin-login-screen');
          if (loginScreen) loginScreen.style.display = 'none';
          updateAdminUserDisplay(activeAdmin);
          initAdminPanel();
          startInactivityWatchers();
        }, 150);
      } catch (err) {
        if (alertEl) {
          alertEl.style.display = 'block';
          alertEl.style.background = '#fef2f2';
          alertEl.style.color = '#b91c1c';
          if (err.status === 401 || err.status === 403) {
            alertEl.textContent = 'Access denied. Invalid administrator email or password.';
          } else {
            let msg = err.message || '';
            if (!msg || msg.toLowerCase().includes('standby') || msg.toLowerCase().includes('waking') || msg.toLowerCase().includes('cold start') || msg.toLowerCase().includes('network') || err.status === 502 || err.status === 503 || err.status === 504) {
              msg = 'Unable to establish a secure connection with the operations server. Please check your network connection and try again.';
            }
            alertEl.textContent = msg;
          }
        }
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = `
            <span>SIGN IN TO CONSOLE</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
          `;
        }
      }
    };
  }

  function setupLogout() {
    const logoutBtn = document.getElementById('admin-logout-btn');
    if (logoutBtn) {
      logoutBtn.onclick = () => {
        lockAdminSession('You have logged out securely from the Operations Console.', true);
      };
    }
  }

  let isAdminPanelInitialized = false;
  function initAdminPanel() {
    if (isAdminPanelInitialized) return;
    isAdminPanelInitialized = true;

    setupMobileDrawer();
    setupNavigation();
    setupLogout();
    setupModalEvents();

    // Listen to browser hash changes (back/forward history)
    window.onhashchange = () => {
      const h = (window.location.hash || '').replace('#', '').trim();
      if (h) switchView(h, true);
    };

    // Open directly to the active view from URL hash or previous tab
    const initialView = getInitialView();
    switchView(initialView, true);

    // Initial background sync and real-time polling for pending payments
    startPaymentPolling();
  }

  // --- MOBILE DRAWER NAVIGATION ---
  function setupMobileDrawer() {
    const mobileToggle = document.getElementById('mobile-menu-toggle');
    const sidebar = document.getElementById('admin-sidebar');
    const backdrop = document.getElementById('admin-sidebar-backdrop');
    const closeBtn = document.getElementById('admin-sidebar-close');

    function openDrawer() {
      if (sidebar) sidebar.classList.add('open');
      if (backdrop) backdrop.classList.add('active');
    }

    function closeDrawer() {
      if (sidebar) sidebar.classList.remove('open');
      if (backdrop) backdrop.classList.remove('active');
    }

    if (mobileToggle) mobileToggle.onclick = openDrawer;
    if (closeBtn) closeBtn.onclick = closeDrawer;
    if (backdrop) backdrop.onclick = closeDrawer;
  }

  window.addEventListener('lane4:server-waking-up', () => {
    const alertEl = document.getElementById('admin-login-alert');
    const loginScreen = document.getElementById('admin-login-screen');
    // Only display status message on the login screen if it is currently visible
    if (alertEl && loginScreen && window.getComputedStyle(loginScreen).display !== 'none') {
      alertEl.style.display = 'block';
      alertEl.style.background = '#eff6ff';
      alertEl.style.color = '#1d4ed8';
      alertEl.innerHTML = `
        <span style="display:inline-flex;align-items:center;gap:8px;">
          <span style="display:inline-block;width:12px;height:12px;border:2px solid #1d4ed8;border-top-color:transparent;border-radius:50%;animation:spin 0.6s linear infinite;"></span>
          <span>Connecting securely to operations console...</span>
        </span>
      `;
    }
  });

  window.addEventListener('lane4:admin-auth-expired', () => {
    lockAdminSession('Administrator session expired or revoked by server. Please sign in with your credentials.');
  });

  function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const sidebar = document.getElementById('admin-sidebar');
    const backdrop = document.getElementById('admin-sidebar-backdrop');

    navItems.forEach(item => {
      item.onclick = () => {
        const view = item.getAttribute('data-view');
        switchView(view);

        // Auto close mobile drawer on navigation
        if (window.innerWidth <= 992) {
          if (sidebar) sidebar.classList.remove('open');
          if (backdrop) backdrop.classList.remove('active');
        }
      };
    });
  }

  function switchView(viewName, skipHash) {
    if (!viewName) viewName = 'dashboard';
    currentView = viewName;
    window.currentView = viewName;
    if (!skipHash) {
      window.location.hash = viewName;
      localStorage.setItem('lane4_admin_active_view', viewName);
    }

    document.querySelectorAll('.admin-view').forEach(v => v.style.display = 'none');
    const target = document.getElementById(`view-${viewName}`);
    if (target) {
      target.style.display = 'block';
    }

    const mainContainer = document.getElementById('admin-main');
    if (mainContainer) mainContainer.scrollTop = 0;

    document.querySelectorAll('.nav-item').forEach(i => {
      if (i.getAttribute('data-view') === viewName) {
        i.classList.add('active');
      } else {
        i.classList.remove('active');
      }
    });

    const headings = {
      dashboard: 'Dashboard Overview',
      payments: 'Manual UPI Payment Verification',
      orders: 'Order Processing & Fulfillment',
      inventory: 'Variant Stock & Inventory Control',
      products: 'Products Catalog Management',
      categories: 'Categories & Navigation',
      coupons: 'Promotional Coupons & Rules',
      customers: 'Customer Accounts & Profiles',
      enquiries: 'Customer Support & Contact Submissions',
      reviews: 'Customer Reviews Moderation',
      returns: 'Customer Returns & Exchanges',
      settings: 'Store Profile & UPI Payment Settings',
      logs: 'Administrative Activity Audit Logs'
    };

    const headingEl = document.getElementById('page-heading');
    if (headingEl) {
      headingEl.textContent = headings[viewName] || 'Admin Console';
    }

    if (viewName === 'dashboard') loadDashboard();
    else if (viewName === 'payments') loadPayments();
    else if (viewName === 'orders') loadOrders();
    else if (viewName === 'inventory') loadInventory();
    else if (viewName === 'products') loadProducts();
    else if (viewName === 'categories') loadCategories();
    else if (viewName === 'coupons') loadCoupons();
    else if (viewName === 'customers') loadCustomers();
    else if (viewName === 'enquiries') loadEnquiries();
    else if (viewName === 'reviews') loadReviews();
    else if (viewName === 'returns') loadReturns();
    else if (viewName === 'settings') loadSettings();
    else if (viewName === 'logs') loadLogs();
  }
  window.switchView = switchView;
  window.showView = switchView;

  // --- SEAMLESS TRANSITIONS & SKELETON LOADERS ---
  let topLoaderTimer = null;
  function showTopLoader() {
    const el = document.getElementById('admin-top-progress');
    if (!el) return;
    const bar = el.querySelector('.bar');
    if (!bar) return;
    if (topLoaderTimer) clearInterval(topLoaderTimer);
    el.classList.add('active');
    bar.style.transition = 'width 0.2s ease';
    bar.style.width = '25%';
    let p = 25;
    topLoaderTimer = setInterval(() => {
      if (p < 88) {
        p += (88 - p) * 0.15;
        bar.style.width = `${Math.round(p)}%`;
      }
    }, 120);
  }

  function hideTopLoader() {
    const el = document.getElementById('admin-top-progress');
    if (!el) return;
    const bar = el.querySelector('.bar');
    if (topLoaderTimer) {
      clearInterval(topLoaderTimer);
      topLoaderTimer = null;
    }
    if (bar) {
      bar.style.transition = 'width 0.15s ease';
      bar.style.width = '100%';
    }
    setTimeout(() => {
      if (el) el.classList.remove('active');
      if (bar) bar.style.width = '0%';
    }, 220);
  }

  function getSkeletonHtml(type) {
    if (type === 'dashboard') {
      return `
        <div style="animation:adminPulse 1.2s ease-in-out infinite;">
          <div class="metrics-grid">
            <div class="stat-card" style="height:115px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;"></div>
            <div class="stat-card" style="height:115px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;"></div>
            <div class="stat-card" style="height:115px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;"></div>
            <div class="stat-card" style="height:115px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;"></div>
          </div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(320px, 1fr));gap:24px;margin-top:24px;">
            <div class="card" style="height:320px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;"></div>
            <div class="card" style="height:320px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;"></div>
          </div>
        </div>
      `;
    }
    if (type === 'settings') {
      return `
        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(360px, 1fr));gap:24px;animation:adminPulse 1.2s ease-in-out infinite;">
          <div class="card" style="height:380px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;"></div>
          <div class="card" style="height:380px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;"></div>
        </div>
      `;
    }
    // Table view skeleton (orders, payments, products, inventory, coupons, etc.)
    return `
      <div class="card" style="border:1px solid #e2e8f0;border-radius:12px;background:#ffffff;animation:adminPulse 1.2s ease-in-out infinite;">
        <div class="card-header" style="height:60px;background:#f8fafc;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;padding:0 24px;">
          <div style="height:18px;width:190px;background:#e2e8f0;border-radius:4px;"></div>
        </div>
        <div style="padding:24px;">
          <div style="height:38px;background:#f1f5f9;border-radius:6px;margin-bottom:14px;"></div>
          <div style="height:34px;background:#f8fafc;border-radius:6px;margin-bottom:10px;"></div>
          <div style="height:34px;background:#f8fafc;border-radius:6px;margin-bottom:10px;"></div>
          <div style="height:34px;background:#f8fafc;border-radius:6px;margin-bottom:10px;"></div>
          <div style="height:34px;background:#f8fafc;border-radius:6px;margin-bottom:10px;"></div>
        </div>
      </div>
    `;
  }

  // --- MODAL & TOAST HELPERS ---
  let activeModalResolver = null;

  function showModal(title, bodyHtml) {
    const modal = document.getElementById('admin-modal');
    const modalBody = document.getElementById('admin-modal-body');
    if (!modal || !modalBody) return;

    if (activeModalResolver) {
      const resolver = activeModalResolver;
      activeModalResolver = null;
      resolver(null);
    }

    modalBody.innerHTML = `
      <div style="font-size:18px;font-weight:900;margin-bottom:18px;padding-bottom:12px;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;justify-content:space-between;letter-spacing:-0.2px;color:#0f172a;">
        <span>${title}</span>
      </div>
      <div>${bodyHtml}</div>
    `;
    modal.style.display = 'flex';
    document.body.classList.add('modal-open');
    document.documentElement.classList.add('modal-open');
  }

  function hideModal(result = null) {
    const modal = document.getElementById('admin-modal');
    if (modal) modal.style.display = 'none';
    document.body.classList.remove('modal-open');
    document.documentElement.classList.remove('modal-open');
    if (activeModalResolver) {
      const resolver = activeModalResolver;
      activeModalResolver = null;
      resolver(result);
    }
  }
  window.hideModal = hideModal;
  window.showModal = showModal;

  function setupModalEvents() {
    const closeBtn = document.getElementById('admin-modal-close-btn');
    if (closeBtn) closeBtn.onclick = () => hideModal(null);

    const modal = document.getElementById('admin-modal');
    if (modal) {
      modal.onclick = (e) => {
        if (e.target === modal) hideModal(null);
      };

      // Prevent background scrolling while modal is open
      modal.addEventListener('wheel', (e) => {
        const content = document.getElementById('admin-modal-content');
        if (content && !content.contains(e.target)) {
          e.preventDefault();
        }
      }, { passive: false });

      modal.addEventListener('touchmove', (e) => {
        const content = document.getElementById('admin-modal-content');
        if (content && !content.contains(e.target)) {
          e.preventDefault();
        }
      }, { passive: false });
    }

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') hideModal(null);
    });
  }

  function showThemedConfirm({ title, message, confirmText = 'Confirm', cancelText = 'Cancel', isDanger = true }) {
    return new Promise((resolve) => {
      const modal = document.getElementById('admin-modal');
      const modalBody = document.getElementById('admin-modal-body');
      if (!modal || !modalBody) return resolve(false);

      if (activeModalResolver) {
        const prev = activeModalResolver;
        activeModalResolver = null;
        prev(false);
      }
      activeModalResolver = (val) => resolve(!!val);

      modalBody.innerHTML = `
        <div style="display:flex;flex-direction:column;gap:18px;">
          <div style="background:${isDanger ? '#fef2f2' : '#f8fafc'};border:1px solid ${isDanger ? '#fee2e2' : '#e2e8f0'};border-radius:10px;padding:16px;display:flex;align-items:flex-start;gap:14px;">
            <div style="width:38px;height:38px;border-radius:50%;background:${isDanger ? '#fee2e2' : '#e0f2fe'};display:flex;align-items:center;justify-content:center;flex-shrink:0;">
              ${isDanger ? `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
              ` : `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0284c7" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="16" x2="12" y2="12"/>
                  <line x1="12" y1="8" x2="12.01" y2="8"/>
                </svg>
              `}
            </div>
            <div>
              <div style="font-size:16px;font-weight:800;color:${isDanger ? '#991b1b' : '#0f172a'};margin-bottom:4px;">${title}</div>
              <div style="font-size:13.5px;color:${isDanger ? '#7f1d1d' : '#475569'};line-height:1.5;">${message}</div>
            </div>
          </div>

          <div style="display:flex;justify-content:flex-end;gap:10px;padding-top:12px;border-top:1px solid #e2e8f0;">
            <button type="button" class="btn btn-outline" id="themed-confirm-cancel">${cancelText}</button>
            <button type="button" class="btn ${isDanger ? 'btn-danger' : 'btn-primary'}" id="themed-confirm-ok" style="padding:9px 20px;font-size:13px;font-weight:700;display:inline-flex;align-items:center;gap:6px;">
              ${isDanger ? `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                </svg>
              ` : `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              `}
              <span>${confirmText}</span>
            </button>
          </div>
        </div>
      `;

      const cancelBtn = document.getElementById('themed-confirm-cancel');
      const okBtn = document.getElementById('themed-confirm-ok');
      if (cancelBtn) cancelBtn.onclick = () => hideModal(false);
      if (okBtn) okBtn.onclick = () => hideModal(true);

      modal.style.display = 'flex';
      document.body.classList.add('modal-open');
      document.documentElement.classList.add('modal-open');
    });
  }

  function hideToast() {
    const toast = document.getElementById('lane4-admin-toast');
    if (!toast) return;
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-10px)';
    if (window._lane4ToastTimeout) {
      clearTimeout(window._lane4ToastTimeout);
      window._lane4ToastTimeout = null;
    }
  }

  function showToast(message, type = 'success', customTitle = null) {
    let toast = document.getElementById('lane4-admin-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'lane4-admin-toast';
      document.body.appendChild(toast);
    }

    if (window._lane4ToastTimeout) clearTimeout(window._lane4ToastTimeout);

    const isError = type === 'error';
    const isWarning = type === 'warning' || type === 'warn';
    const isInfo = type === 'info';
    const isSuccess = !isError && !isWarning && !isInfo;

    // Refined White Theme with tasteful athletic status accents
    let statusConfig = {
      accentBorder: '#16a34a',
      iconBg: '#f0fdf4',
      iconBorder: '#bbf7d0',
      iconColor: '#16a34a',
      statusText: customTitle || 'SUCCESS',
      statusColor: '#16a34a',
      svg: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`
    };

    if (isError) {
      statusConfig = {
        accentBorder: '#dc2626',
        iconBg: '#fef2f2',
        iconBorder: '#fecaca',
        iconColor: '#dc2626',
        statusText: customTitle || 'ERROR',
        statusColor: '#dc2626',
        svg: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`
      };
    } else if (isWarning) {
      statusConfig = {
        accentBorder: '#d97706',
        iconBg: '#fffbeb',
        iconBorder: '#fde68a',
        iconColor: '#d97706',
        statusText: customTitle || 'NOTICE',
        statusColor: '#d97706',
        svg: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`
      };
    } else if (isInfo) {
      statusConfig = {
        accentBorder: '#0284c7',
        iconBg: '#f0f9ff',
        iconBorder: '#bae6fd',
        iconColor: '#0284c7',
        statusText: customTitle || 'UPDATE',
        statusColor: '#0284c7',
        svg: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`
      };
    }

    toast.style.cssText = `
      position: fixed;
      top: 24px;
      right: 24px;
      z-index: 9999999;
      width: 380px;
      max-width: calc(100vw - 32px);
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-left: 4px solid ${statusConfig.accentBorder};
      border-radius: 8px;
      box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.08), 0 8px 10px -6px rgba(15, 23, 42, 0.04);
      padding: 13px 16px;
      display: flex;
      align-items: flex-start;
      gap: 12px;
      opacity: 0;
      transform: translateY(-12px);
      transition: opacity 0.2s ease, transform 0.24s cubic-bezier(0.16, 1, 0.3, 1);
      font-family: inherit;
      pointer-events: auto;
      box-sizing: border-box;
    `;

    toast.innerHTML = `
      <div style="width:28px;height:28px;border-radius:50%;background:${statusConfig.iconBg};border:1px solid ${statusConfig.iconBorder};color:${statusConfig.iconColor};display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px;">
        ${statusConfig.svg}
      </div>
      <div style="flex:1;min-width:0;">
        <div style="font-size:10.5px;font-weight:800;letter-spacing:0.07em;text-transform:uppercase;color:${statusConfig.statusColor};line-height:1.2;">
          ${escapeHtml(statusConfig.statusText)}
        </div>
        <div style="font-size:13px;font-weight:600;color:#0f172a;line-height:1.4;margin-top:2px;word-break:break-word;">
          ${escapeHtml(message)}
        </div>
      </div>
      <button type="button" onclick="hideToast()" style="background:none;border:none;color:#94a3b8;cursor:pointer;padding:4px;margin-left:4px;border-radius:4px;display:flex;align-items:center;justify-content:center;transition:color 0.15s;" onmouseover="this.style.color='#0f172a'" onmouseout="this.style.color='#94a3b8'" aria-label="Close notification" title="Close">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    `;

    // Pause on hover
    toast.onmouseenter = () => {
      if (window._lane4ToastTimeout) clearTimeout(window._lane4ToastTimeout);
    };
    toast.onmouseleave = () => {
      window._lane4ToastTimeout = setTimeout(hideToast, 2200);
    };

    // Clicking toast opens relevant management view
    toast.style.cursor = 'pointer';
    toast.onclick = (e) => {
      if (e.target.closest('button')) return;
      if (typeof switchView === 'function') {
        switchView('payments', true);
      }
    };

    void toast.offsetWidth;
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';

    window._lane4ToastTimeout = setTimeout(hideToast, 4500);
  }
  window.showToast = showToast;
  window.hideToast = hideToast;
  window.showThemedConfirm = showThemedConfirm;

  // --- REAL-TIME PAYMENT VERIFICATION POLLING & BADGE COUNT ---
  let lastPendingPaymentCount = -1;
  let paymentPollingTimer = null;
  let isCheckingPayments = false;

  function updatePendingPaymentsBadge(count) {
    const badge = document.getElementById('badge-pending-payments');
    if (!badge) return;
    const num = Math.max(0, parseInt(count, 10) || 0);
    if (num > 0) {
      badge.style.display = 'inline-block';
      badge.textContent = num;
    } else {
      badge.style.display = 'none';
      badge.textContent = '0';
    }
  }

  async function checkPendingPaymentsRealtime(allowToast = true) {
    const adminToken = localStorage.getItem('lane4_admin_token');
    if (!adminToken) return;
    if (isCheckingPayments) return;
    isCheckingPayments = true;

    try {
      const res = await window.lane4ApiRequest('/admin/payments');
      const payments = (res && res.data) || [];
      const pendingList = payments.filter(p => {
        const s = (p.status || '').toLowerCase();
        return s === 'verification_pending' || s === 'submitted' || s === 'pending';
      });
      const pendingCount = pendingList.length;

      updatePendingPaymentsBadge(pendingCount);

      if (allowToast) {
        if (lastPendingPaymentCount !== -1 && pendingCount > lastPendingPaymentCount) {
          const diff = pendingCount - lastPendingPaymentCount;
          const latest = pendingList[0];
          const latestOrder = (latest && (latest.orderNumber || latest.orderId)) ? ` (#${latest.orderNumber || latest.orderId})` : '';
          showToast(
            `${diff} customer payment proof ${diff === 1 ? 'is' : 'are'} awaiting verification${latestOrder}. Click here to inspect.`,
            'info',
            'PAYMENT TO BE VERIFIED'
          );
        } else if (lastPendingPaymentCount === -1 && pendingCount > 0) {
          const latest = pendingList[0];
          const latestOrder = (latest && (latest.orderNumber || latest.orderId)) ? ` (#${latest.orderNumber || latest.orderId})` : '';
          showToast(
            `A payment${latestOrder} is awaiting verification. Click to inspect.`,
            'info',
            'PAYMENT TO BE VERIFIED'
          );
        }
      }

      lastPendingPaymentCount = pendingCount;
    } catch (_) {
      // Background check failure is non-blocking
    } finally {
      isCheckingPayments = false;
    }
  }

  const adminOrderSyncChannel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('lane4_orders_channel') : null;

  function notifyOrderUpdated(orderId) {
    try {
      if (adminOrderSyncChannel) {
        adminOrderSyncChannel.postMessage({ type: 'order_updated', orderId: orderId || null, timestamp: Date.now() });
      }
      localStorage.setItem('lane4_order_updated', JSON.stringify({ orderId: orderId || null, timestamp: Date.now() }));
    } catch (_) {}
  }
  window.notifyOrderUpdated = notifyOrderUpdated;

  async function quietRefreshOrders() {
    try {
      const res = await window.lane4ApiRequest('/admin/orders');
      const allOrders = res.data || [];
      allOrders.sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));
      const prevDigest = (window.currentOrders || []).map(o => `${o.orderId || o.id}_${o.status}_${o.paymentStatus}_${o.refundStatus}_${o.fulfillment && o.fulfillment.trackingNumber}`).join('|');
      const newDigest = allOrders.map(o => `${o.orderId || o.id}_${o.status}_${o.paymentStatus}_${o.refundStatus}_${o.fulfillment && o.fulfillment.trackingNumber}`).join('|');
      if (prevDigest !== newDigest) {
        window.currentOrders = allOrders;
        loadOrders(true);
      }
    } catch (_) {}
  }

  async function quietRefreshReturns() {
    try {
      const res = await window.lane4ApiRequest('/admin/returns');
      const allReturns = res.data || [];
      const prevDigest = (window.currentReturns || []).map(r => `${r.docId || r.id}_${r.status}_${r.adminNotes}`).join('|');
      const newDigest = allReturns.map(r => `${r.docId || r.id}_${r.status}_${r.adminNotes}`).join('|');
      if (prevDigest !== newDigest) {
        window.currentReturns = allReturns;
        if (typeof loadReturns === 'function') {
          loadReturns(true);
        }
      }
    } catch (_) {}
  }
  window.quietRefreshReturns = quietRefreshReturns;

  function startPaymentPolling() {
    if (paymentPollingTimer) clearInterval(paymentPollingTimer);
    checkPendingPaymentsRealtime(true);
    paymentPollingTimer = setInterval(() => {
      // Pause polling when tab is hidden to save client bandwidth & server resources
      if (typeof document !== 'undefined' && document.hidden) return;
      checkPendingPaymentsRealtime(true);
      const active = currentView || window.currentView;
      if (active === 'orders') {
        quietRefreshOrders();
      } else if (active === 'returns') {
        quietRefreshReturns();
      }
    }, 4000);
  }

  // Immediately refresh on tab focus when returning from another tab
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        checkPendingPaymentsRealtime(true);
        const active = currentView || window.currentView;
        if (active === 'orders') {
          quietRefreshOrders();
        } else if (active === 'returns') {
          quietRefreshReturns();
        }
      }
    });
  }

  if (adminOrderSyncChannel) {
    adminOrderSyncChannel.onmessage = function (event) {
      if (event && event.data) {
        if (event.data.type === 'order_updated') {
          quietRefreshOrders();
          quietRefreshReturns();
        } else if (event.data.type === 'return_submitted' || event.data.type === 'return_updated') {
          quietRefreshReturns();
          quietRefreshOrders();
          showToast('A return or refund request was updated.', 'info', 'RETURNS & REFUNDS');
        }
      }
    };
  }
  window.addEventListener('storage', function (e) {
    if (e.key === 'lane4_order_updated' || e.key === 'lane4_return_updated') {
      quietRefreshOrders();
      quietRefreshReturns();
    }
  });

  function stopPaymentPolling() {
    if (paymentPollingTimer) {
      clearInterval(paymentPollingTimer);
      paymentPollingTimer = null;
    }
    lastPendingPaymentCount = -1;
  }
  window.updatePendingPaymentsBadge = updatePendingPaymentsBadge;
  window.checkPendingPaymentsRealtime = checkPendingPaymentsRealtime;

  function previewQrModal(imgSrc) {
    let existing = document.getElementById('lane4-admin-qr-modal');
    if (existing) {
      existing.remove();
      document.body.classList.remove('modal-open');
      document.documentElement.classList.remove('modal-open');
    }

    const currentImg = imgSrc || (document.getElementById('admin-qr-preview-img') ? document.getElementById('admin-qr-preview-img').src : '6424266ea05809dff501d86e/lane4-share.png');

    const modal = document.createElement('div');
    modal.id = 'lane4-admin-qr-modal';
    modal.style.cssText = `
      position:fixed;inset:0;background:rgba(15,23,42,0.78);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);
      display:flex;align-items:center;justify-content:center;z-index:9999999;padding:16px;box-sizing:border-box;
    `;
    modal.innerHTML = `
      <div style="background:#ffffff;border-radius:12px;max-width:420px;width:100%;box-shadow:0 20px 30px -10px rgba(15,23,42,0.3);overflow:hidden;position:relative;">
        <div style="padding:16px 20px;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;justify-content:space-between;background:#ffffff;">
          <div>
            <div style="font-size:10px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:0.8px;">Storefront Payment QR</div>
            <div style="font-size:16px;font-weight:900;color:#0f172a;margin-top:2px;">UPI Payment QR Preview</div>
          </div>
          <button type="button" id="lane4-qr-modal-close-icon" style="background:#f1f5f9;border:none;width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#475569;font-size:18px;cursor:pointer;" title="Close">&times;</button>
        </div>
        <div style="padding:24px;text-align:center;background:#ffffff;">
          <div style="background:#ffffff;border:2px solid #0f172a;border-radius:12px;padding:16px;display:inline-block;box-shadow:0 8px 24px -4px rgba(15,23,42,0.12);">
            <img src="${currentImg}" alt="Enlarged Store UPI QR" style="width:260px;height:260px;max-width:65vw;max-height:65vw;object-fit:contain;display:block;margin:0 auto;" />
          </div>
          <div style="margin-top:14px;font-size:12px;color:#475569;font-weight:600;line-height:1.4;">
            This high-resolution QR is rendered directly inside Step 3 of checkout for customers.
          </div>
        </div>
        <div style="padding:12px 20px;background:#f8fafc;border-top:1px solid #e2e8f0;display:flex;align-items:center;justify-content:space-between;">
          <span style="font-size:11px;color:#64748b;">Scan with any UPI app camera</span>
          <button type="button" id="lane4-qr-modal-close-btn" class="btn" style="background:#0f172a;color:#ffffff;padding:8px 18px;font-size:12px;font-weight:800;border-radius:6px;cursor:pointer;">Close</button>
        </div>
      </div>
    `;

    function closeQr() {
      modal.remove();
      document.body.classList.remove('modal-open');
      document.documentElement.classList.remove('modal-open');
    }

    modal.onclick = (e) => {
      if (e.target === modal) closeQr();
    };

    const closeIcon = modal.querySelector('#lane4-qr-modal-close-icon');
    const closeBtn = modal.querySelector('#lane4-qr-modal-close-btn');
    if (closeIcon) closeIcon.onclick = closeQr;
    if (closeBtn) closeBtn.onclick = closeQr;

    document.body.appendChild(modal);
    document.body.classList.add('modal-open');
    document.documentElement.classList.add('modal-open');
  }
  window.previewQrModal = previewQrModal;

  async function refreshPendingPaymentsBadge() {
    await checkPendingPaymentsRealtime(false);
  }
  window.refreshPendingPaymentsBadge = refreshPendingPaymentsBadge;

  // --- DASHBOARD ---
  async function loadDashboard() {
    const container = document.getElementById('view-dashboard');
    if (!container) return;
    if (!container.children.length) {
      container.innerHTML = getSkeletonHtml('dashboard');
    }
    showTopLoader();

    try {
      const res = await window.lane4ApiRequest('/admin/dashboard');
      const m = res.data;

      updatePendingPaymentsBadge(m.pendingPaymentsCount);

      container.innerHTML = `
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-label">Verified Revenue</div>
            <div class="stat-val" style="color:#16a34a;">${m.totalRevenueFormatted}</div>
            <div class="stat-sub">From approved payments</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Pending Payments</div>
            <div class="stat-val" style="color:${m.pendingPaymentsCount > 0 ? '#ea580c' : '#0f172a'};">${m.pendingPaymentsCount}</div>
            <div class="stat-sub">Requires staff verification</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Total Orders</div>
            <div class="stat-val">${m.totalOrders}</div>
            <div class="stat-sub">${m.processingOrdersCount} in fulfillment</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Active Products</div>
            <div class="stat-val">${m.totalProducts}</div>
            <div class="stat-sub">${m.lowStockCount} items low in stock</div>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(320px, 1fr));gap:24px;">
          <!-- Recent Pending Payments -->
          <div class="card">
            <div class="card-header">
              <div class="card-title">Pending Payment Verifications</div>
              <button class="btn btn-outline" style="padding:4px 10px;font-size:12px;" onclick="document.querySelector('[data-view=payments]').click()">View All &rarr;</button>
            </div>
            <div class="card-body" style="padding:0;">
              <div class="table-responsive">
                <table>
                  <thead>
                    <tr>
                      <th>Order #</th>
                      <th>Amount</th>
                      <th>UTR Reference</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${m.recentPayments.length === 0 ? '<tr><td colspan="4" style="text-align:center;padding:24px;color:#888;">No pending payments!</td></tr>' : 
                      m.recentPayments.map(p => `
                        <tr>
                          <td><strong>#${p.orderNumber}</strong></td>
                          <td>${window.LANE4.formatINR(p.amountPaise)}</td>
                          <td><code>${p.upiReferenceNumber}</code></td>
                          <td><button class="btn btn-outline" style="padding:4px 8px;font-size:11px;" onclick="viewPaymentDetail('${p.paymentId || p.orderId}')">Review Proof</button></td>
                        </tr>
                      `).join('')}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- Recent Orders -->
          <div class="card">
            <div class="card-header">
              <div class="card-title">Recent Store Orders</div>
              <button class="btn btn-outline" style="padding:4px 10px;font-size:12px;" onclick="document.querySelector('[data-view=orders]').click()">View All &rarr;</button>
            </div>
            <div class="card-body" style="padding:0;">
              <div class="table-responsive">
                <table>
                  <thead>
                    <tr>
                      <th>Order #</th>
                      <th>Customer</th>
                      <th>Status</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${m.recentOrders.length === 0 ? '<tr><td colspan="4" style="text-align:center;padding:24px;color:#888;">No orders placed yet.</td></tr>' :
                      m.recentOrders.map(o => `
                        <tr>
                          <td><strong>#${o.orderNumber || o.orderId}</strong></td>
                          <td>${o.customerEmail}</td>
                          <td><span class="badge badge-${o.status}">${o.status.replace(/_/g, ' ')}</span></td>
                          <td>${o.pricing ? o.pricing.finalPayableFormatted : ''}</td>
                        </tr>
                      `).join('')}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      `;
    } catch (err) {
      container.innerHTML = `<p style="color:#ef4444;padding:20px;">Error loading dashboard: ${err.message}</p>`;
    } finally {
      hideTopLoader();
    }
  }

  // --- PAYMENTS VERIFICATION ---
  function resolveProofUrl(url) {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
      return url;
    }
    const clean = url.replace(/^\/+/, '');
    const apiBase = (window.LANE4_CONFIG && window.LANE4_CONFIG.API_BASE_URL) || '/api';
    const backendOrigin = apiBase.startsWith('http') 
      ? apiBase.replace(/\/api\/?$/, '') 
      : (window.location.port === '5000' ? '' : 'http://localhost:5000');
    return backendOrigin ? `${backendOrigin}/${clean}` : `/${clean}`;
  }

  window.currentPayments = [];

  async function loadPayments() {
    const container = document.getElementById('view-payments');
    if (!container) return;
    if (!container.children.length) {
      container.innerHTML = getSkeletonHtml('table');
    }
    showTopLoader();

    try {
      const res = await window.lane4ApiRequest('/admin/payments');
      const payments = res.data || [];
      window.currentPayments = payments;
      const pendingCount = payments.filter(p => {
        const s = (p.status || '').toLowerCase();
        return s === 'verification_pending' || s === 'submitted' || s === 'pending';
      }).length;
      updatePendingPaymentsBadge(pendingCount);
      lastPendingPaymentCount = pendingCount;

      container.innerHTML = `
        <div class="card">
          <div class="card-header" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">
            <div>
              <div class="card-title">UPI Payment Submissions (${payments.length})</div>
              <p style="font-size:12px;color:#64748b;margin:4px 0 0 0;">Inspect actual user smartphone payment screenshots, match 12-digit UTR against bank records, and verify or reject orders.</p>
            </div>
            <button class="btn btn-outline" style="font-size:12px;padding:6px 12px;display:inline-flex;align-items:center;gap:6px;" onclick="loadPayments()">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
              <span>Refresh Submissions</span>
            </button>
          </div>
          <div class="card-body" style="padding:0;">
            <div class="table-responsive">
              <table>
                <thead>
                  <tr>
                    <th>Order #</th>
                    <th>Payable</th>
                    <th>12-Digit UTR Ref</th>
                    <th>Customer Screenshot Proof</th>
                    <th>Status</th>
                    <th>Submitted At</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  ${payments.length === 0 ? '<tr><td colspan="7" style="text-align:center;padding:24px;color:#888;">No payment proofs submitted yet.</td></tr>' :
                    payments.map(p => {
                      const proofUrl = p.proofScreenshot && p.proofScreenshot.secureUrl ? resolveProofUrl(p.proofScreenshot.secureUrl) : '';
                      return `
                        <tr>
                          <td><strong>#${p.orderNumber || p.orderId}</strong></td>
                          <td><strong>${window.LANE4.formatINR(p.amountPaise)}</strong></td>
                          <td><code style="background:#f1f5f9;padding:4px 8px;border-radius:4px;font-weight:700;letter-spacing:0.5px;">${p.upiReferenceNumber}</code></td>
                          <td style="vertical-align:middle;">
                            ${proofUrl ? `
                              <div style="display:inline-flex;align-items:center;gap:10px;">
                                <div style="position:relative;cursor:pointer;flex-shrink:0;" onclick="viewPaymentDetail('${p.paymentId}')" title="Click to inspect uploaded customer screenshot">
                                  <img src="${proofUrl}" 
                                       alt="Payment Screenshot" 
                                       style="width:48px;height:48px;object-fit:cover;border-radius:6px;border:1px solid #cbd5e1;background:#0f172a;box-shadow:0 1px 3px rgba(0,0,0,0.1);display:block;"
                                       onerror="this.onerror=null;this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'48\\' height=\\'48\\' fill=\\'%2394a3b8\\' viewBox=\\'0 0 24 24\\'><path d=\\'M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z\\'/></svg>';" />
                                  <span style="position:absolute;bottom:-4px;right:-4px;background:#0f172a;color:#fff;border-radius:50%;width:18px;height:18px;display:flex;align-items:center;justify-content:center;box-shadow:0 1px 3px rgba(0,0,0,0.4);border:1px solid #fff;">
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                                  </span>
                                </div>
                                <div>
                                  <button type="button" class="btn btn-outline" style="padding:4px 9px;font-size:11.5px;font-weight:700;display:inline-flex;align-items:center;gap:5px;" onclick="viewPaymentDetail('${p.paymentId}')">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                                    <span>Inspect Proof</span>
                                  </button>
                                  <div style="margin-top:2px;">
                                    <a href="${proofUrl}" target="_blank" rel="noopener noreferrer" style="font-size:11px;color:#0284c7;text-decoration:none;font-weight:600;display:inline-flex;align-items:center;gap:3px;" onclick="event.stopPropagation();">
                                      <span>Open Original</span>
                                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                                    </a>
                                  </div>
                                </div>
                              </div>
                            ` : `
                              <div style="display:inline-flex;align-items:center;gap:8px;">
                                <span style="display:inline-flex;align-items:center;gap:5px;background:#fef3c7;color:#92400e;padding:4px 8px;border-radius:12px;font-size:11px;font-weight:700;">
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                                  Awaiting Upload
                                </span>
                                <button type="button" class="btn btn-outline" style="padding:3px 8px;font-size:11px;font-weight:700;display:inline-flex;align-items:center;gap:4px;" onclick="viewPaymentDetail('${p.paymentId}')">
                                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                                  <span>Upload</span>
                                </button>
                              </div>
                            `}
                          </td>
                          <td><span class="badge badge-${p.status}">${p.status.replace(/_/g, ' ')}</span></td>
                          <td style="font-size:12px;color:#64748b;white-space:nowrap;">${formatDateTime(p.createdAt)}</td>
                          <td>
                            ${p.status === 'verification_pending' ? `
                              <div style="display:flex;gap:6px;">
                                <button class="btn btn-success" style="padding:6px 10px;font-size:12px;display:inline-flex;align-items:center;gap:5px;" onclick="approvePayment('${p.paymentId}')">
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                                  <span>Approve</span>
                                </button>
                                <button class="btn btn-danger" style="padding:6px 10px;font-size:12px;display:inline-flex;align-items:center;gap:5px;" onclick="rejectPayment('${p.paymentId}')">
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                                  <span>Reject</span>
                                </button>
                              </div>
                            ` : (p.status === 'rejected' ? `
                              <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                                <span style="font-size:12px;color:#dc2626;font-weight:700;">Rejected</span>
                                <button type="button" class="btn btn-outline" style="padding:4px 9px;font-size:11.5px;font-weight:600;" onclick="viewPaymentDetail('${p.paymentId}')">
                                  <span>View Audit</span>
                                </button>
                              </div>
                            ` : `
                              <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                                <span style="font-size:12px;color:#16a34a;font-weight:600;">Verified</span>
                                <button type="button" class="btn btn-outline" style="padding:4px 9px;font-size:11.5px;font-weight:600;display:inline-flex;align-items:center;gap:4px;" onclick="goToOrderFulfillment('${p.orderId || p.paymentId}')" title="Dispatch and attach courier tracking">
                                  <span>Fulfill Order &rarr;</span>
                                </button>
                              </div>
                            `)}
                          </td>
                        </tr>
                      `;
                    }).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;
    } catch (err) {
      container.innerHTML = `<p style="color:#ef4444;padding:20px;">Error loading payments: ${err.message}</p>`;
    } finally {
      hideTopLoader();
    }
  }

  window.viewPaymentDetail = async function (paymentId) {
    let p = (window.currentPayments || []).find(item => item.paymentId === paymentId || item.orderId === paymentId);
    if (!p) {
      try {
        const res = await window.lane4ApiRequest(`/admin/payments/${paymentId}`);
        p = res.data;
      } catch (e) {
        showToast('Payment record not found', 'error');
        return;
      }
    }
    if (!p) return;

    const proofUrl = p.proofScreenshot && p.proofScreenshot.secureUrl ? resolveProofUrl(p.proofScreenshot.secureUrl) : '';

    showModal(`Payment Proof & Verification — #${p.orderNumber || p.orderId}`, `
      <div style="display:flex;flex-direction:column;gap:18px;">
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px 16px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
          <div>
            <div style="font-size:11px;color:#64748b;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Order Information</div>
            <div style="font-size:18px;font-weight:900;color:#0f172a;">Order #${p.orderNumber || p.orderId}</div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:11px;color:#64748b;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Payable Amount</div>
            <div style="font-size:20px;font-weight:900;color:#0f172a;">${window.LANE4.formatINR(p.amountPaise)}</div>
          </div>
        </div>

        <div>
          <div style="font-size:12px;font-weight:700;color:#334155;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
            <span>Customer-Uploaded Payment Screenshot:</span>
            ${proofUrl ? `
              <a href="${proofUrl}" target="_blank" rel="noopener noreferrer" style="color:#0284c7;font-weight:700;text-decoration:none;font-size:12px;display:inline-flex;align-items:center;gap:4px;">
                <span>Open Full Size in New Tab</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              </a>
            ` : ''}
          </div>
          <div style="background:#090d16;border-radius:10px;padding:16px;display:flex;justify-content:center;align-items:center;min-height:360px;max-height:540px;overflow:auto;border:1px solid #1e293b;">
            ${proofUrl ? `
              <img id="detail-proof-img" src="${proofUrl}" 
                   alt="Customer Payment Screenshot for Order #${p.orderNumber || p.orderId}" 
                   style="max-width:100%;max-height:500px;object-fit:contain;border-radius:8px;box-shadow:0 8px 30px rgba(0,0,0,0.5);display:block;margin:auto;" />
            ` : `
              <div style="padding:40px 20px;text-align:center;">
                <div style="width:50px;height:50px;border-radius:50%;background:#1e293b;display:flex;align-items:center;justify-content:center;margin:0 auto 12px auto;color:#94a3b8;">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                </div>
                <div style="color:#ffffff;font-size:15px;font-weight:800;margin-bottom:6px;">No Customer Screenshot Uploaded Yet</div>
                <p style="color:#94a3b8;font-size:12.5px;max-width:380px;line-height:1.5;margin:0 auto;">This order was placed with 12-digit UTR <strong style="color:#f8fafc;">${p.upiReferenceNumber}</strong>, but the customer has not uploaded their screenshot proof yet.</p>
              </div>
            `}
          </div>
        </div>

        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:14px;background:#f8fafc;padding:14px;border-radius:8px;border:1px solid #e2e8f0;">
          <div>
            <div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;">12-Digit UPI / UTR Ref</div>
            <div style="margin-top:4px;display:flex;align-items:center;gap:8px;">
              <code style="font-size:15px;font-weight:800;background:#ffffff;border:1px solid #cbd5e1;padding:4px 8px;border-radius:4px;color:#0f172a;letter-spacing:1px;">${p.upiReferenceNumber || 'N/A'}</code>
              <button type="button" class="btn btn-outline" style="padding:3px 7px;font-size:11px;" onclick="navigator.clipboard.writeText('${p.upiReferenceNumber}');showToast('UTR copied to clipboard!');">Copy</button>
            </div>
          </div>
          <div>
            <div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;">Verification Status</div>
            <div style="margin-top:4px;"><span class="badge badge-${p.status}">${(p.status || '').replace(/_/g, ' ')}</span></div>
          </div>
          <div>
            <div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;">Submitted At</div>
            <div style="margin-top:4px;font-size:13px;font-weight:600;color:#1e293b;">${formatDateTime(p.createdAt)}</div>
          </div>
          ${(p.status === 'rejected' || p.rejection) ? `
            <div>
              <div style="font-size:11px;font-weight:700;color:#ef4444;text-transform:uppercase;">Rejected By</div>
              <div style="margin-top:4px;font-size:13px;font-weight:600;color:#991b1b;">${(p.rejection && p.rejection.rejectedByName) || 'Admin Staff'} (${formatDateTime(p.rejection ? p.rejection.rejectedAt : p.updatedAt)})</div>
              <div style="font-size:11px;color:#b91c1c;font-style:italic;">Reason: "${(p.rejection && p.rejection.reason) || p.rejectionReason || 'Payment verification failed'}"</div>
            </div>
          ` : (p.verification && p.verification.verifiedByName ? `
            <div>
              <div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;">Verified By</div>
              <div style="margin-top:4px;font-size:13px;font-weight:600;color:#1e293b;">${p.verification.verifiedByName} (${formatDateTime(p.verification.verifiedAt)})</div>
              <div style="font-size:11px;color:#64748b;font-style:italic;">"${p.verification.internalNotes || ''}"</div>
            </div>
          ` : '')}
        </div>

        ${p.status === 'verification_pending' ? `
          <div style="display:flex;gap:12px;justify-content:flex-end;padding-top:10px;border-top:1px solid #e2e8f0;flex-wrap:wrap;">
            <button type="button" class="btn btn-danger" style="padding:9px 18px;font-size:13px;font-weight:700;display:inline-flex;align-items:center;gap:6px;" onclick="rejectPayment('${p.paymentId}')">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              <span>Reject Proof</span>
            </button>
            <button type="button" class="btn btn-success" style="padding:9px 20px;font-size:13px;font-weight:700;display:inline-flex;align-items:center;gap:6px;" onclick="approvePayment('${p.paymentId}')">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              <span>Approve Payment & Confirm Order</span>
            </button>
          </div>
        ` : `
          <div style="padding-top:10px;border-top:1px solid #e2e8f0;display:flex;justify-content:flex-end;">
            <button type="button" class="btn btn-outline" onclick="hideModal()">Close</button>
          </div>
        `}

        <div style="margin-top:6px;padding:14px;background:#f1f5f9;border-radius:8px;border:1px dashed #cbd5e1;">
          <div style="font-size:12px;font-weight:800;color:#334155;margin-bottom:4px;">Upload Alternate / Updated Customer Screenshot:</div>
          <p style="font-size:11px;color:#64748b;margin:0 0 10px 0;">If customer provided a clearer payment screenshot via WhatsApp or support email, upload it here to attach directly to this payment record.</p>
          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
            <input type="file" id="staff-proof-file-${p.paymentId}" accept="image/jpeg,image/png,image/webp" style="font-size:12px;flex:1;min-width:200px;" />
            <button type="button" id="staff-proof-upload-btn-${p.paymentId}" class="btn btn-primary" style="padding:6px 14px;font-size:12px;font-weight:700;" onclick="uploadStaffProof('${p.paymentId}')">
              Upload Screenshot
            </button>
          </div>
        </div>
      </div>
    `);
  };

  window.uploadStaffProof = async function (paymentId) {
    const fileInput = document.getElementById(`staff-proof-file-${paymentId}`);
    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
      showToast('Please select a screenshot image file to upload.', 'error');
      return;
    }
    const file = fileInput.files[0];
    const formData = new FormData();
    formData.append('screenshot', file);

    const btn = document.getElementById(`staff-proof-upload-btn-${paymentId}`);
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Uploading...';
    }

    try {
      await window.lane4ApiRequest(`/admin/payments/${paymentId}/upload-proof`, {
        method: 'POST',
        body: formData
      });
      showToast('Payment screenshot updated successfully!');
      await loadPayments();
      if (typeof window.viewPaymentDetail === 'function') {
        window.viewPaymentDetail(paymentId);
      }
    } catch (err) {
      showToast(err.message || 'Failed to upload screenshot', 'error');
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Upload Screenshot';
      }
    }
  };

  window.approvePayment = function (paymentId) {
    const p = (window.currentPayments || []).find(item => item.paymentId === paymentId || item.orderId === paymentId);
    const orderNum = p ? (p.orderNumber || p.orderId) : paymentId;
    const amountStr = p ? window.LANE4.formatINR(p.amountPaise) : '';
    const utrStr = p ? (p.upiReferenceNumber || 'N/A') : '';

    showModal('Verify & Approve Payment', `
      <div style="display:flex;flex-direction:column;gap:18px;">
        <div style="background:#f0fdf4;border:1px solid #dcfce7;border-radius:10px;padding:14px 16px;display:flex;align-items:flex-start;gap:12px;">
          <div style="width:34px;height:34px;border-radius:50%;background:#dcfce7;display:flex;align-items:center;justify-content:center;color:#16a34a;flex-shrink:0;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <div>
            <div style="font-size:14px;font-weight:800;color:#166534;margin-bottom:2px;">Approve Payment for Order #${orderNum} ${amountStr ? `(${amountStr})` : ''}</div>
            <div style="font-size:12.5px;color:#15803d;line-height:1.4;">Approving will mark this payment as VERIFIED, confirm the order, transition status to CONFIRMED, and send an email confirmation to the customer.</div>
          </div>
        </div>

        <div style="display:flex;gap:12px;background:#f8fafc;padding:10px 14px;border-radius:8px;border:1px solid #e2e8f0;font-size:12px;color:#475569;">
          <div><strong style="color:#0f172a;">12-digit UTR:</strong> <code>${utrStr}</code></div>
        </div>

        <div>
          <label for="approve-note-input" class="form-label" style="display:block;font-size:12px;font-weight:700;text-transform:uppercase;color:#334155;margin-bottom:6px;">
            Internal Staff Verification Note (Required)
          </label>
          <input type="text" id="approve-note-input" class="form-input" style="width:100%;font-size:13.5px;padding:10px 12px;border:1.5px solid #cbd5e1;border-radius:6px;" value="" placeholder="Enter verification note (e.g. Verified in ICICI / UPI merchant dashboard)" />
          <div style="font-size:11.5px;color:#64748b;margin-top:4px;">Saved in the administrative audit trail for reconciliation.</div>
        </div>

        <div style="display:flex;justify-content:flex-end;gap:10px;padding-top:14px;border-top:1px solid #e2e8f0;">
          <button type="button" class="btn btn-outline" onclick="hideModal()">Cancel</button>
          <button type="button" id="submit-approve-btn" class="btn btn-success" style="padding:9px 20px;font-size:13px;font-weight:700;display:inline-flex;align-items:center;gap:6px;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            <span>Verify & Approve Payment</span>
          </button>
        </div>
      </div>
    `);

    setTimeout(() => {
      const input = document.getElementById('approve-note-input');
      if (input) input.focus();
    }, 50);

    const submitBtn = document.getElementById('submit-approve-btn');
    if (submitBtn) {
      submitBtn.onclick = async () => {
        const noteInput = document.getElementById('approve-note-input');
        const note = (noteInput?.value || '').trim();
        if (!note || note.length < 3) {
          if (noteInput) {
            noteInput.style.borderColor = '#dc2626';
            noteInput.focus();
          }
          showToast('A mandatory verification note (at least 3 characters) is required to approve payments.', 'error');
          return;
        }
        if (note.length > 500) {
          if (noteInput) {
            noteInput.style.borderColor = '#dc2626';
            noteInput.focus();
          }
          showToast('Approval note cannot exceed 500 characters.', 'error');
          return;
        }

        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span>Approving...</span>';

        try {
          const res = await window.lane4ApiRequest(`/admin/payments/${paymentId}/approve`, {
            method: 'POST',
            body: JSON.stringify({ internalNote: note })
          });
          const verifiedOrderId = (res && res.data && res.data.orderId) || (p && p.orderId) || paymentId;
          const verifiedOrderNum = (res && res.data && res.data.orderNumber) || orderNum;

          hideModal();
          showToast(`Payment verified for #${verifiedOrderNum}! Order is now CONFIRMED.`, 'success', 'PAYMENT RECEIVED');
          notifyOrderUpdated(verifiedOrderId);
          loadPayments();
          checkPendingPaymentsRealtime(false);

          // Surface Next Operational Step Modal immediately
          showNextStepModal(verifiedOrderId, verifiedOrderNum);
        } catch (err) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg><span>Verify & Approve Payment</span>';
          showToast(err.message || 'Failed to approve payment', 'error');
        }
      };
    }
  };

  function showNextStepModal(orderId, orderNumber) {
    showModal('Payment Verified — Next Step', `
      <div style="display:flex;flex-direction:column;gap:18px;">
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:16px;display:flex;gap:14px;align-items:flex-start;">
          <div style="width:38px;height:38px;border-radius:50%;background:#dcfce7;display:flex;align-items:center;justify-content:center;color:#16a34a;flex-shrink:0;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <div>
            <div style="font-size:15px;font-weight:800;color:#166534;margin-bottom:3px;">Payment Approved for Order #${orderNumber}</div>
            <div style="font-size:13px;color:#15803d;line-height:1.4;">Customer payment is verified in full. Order status is now updated to <strong>CONFIRMED</strong>.</div>
          </div>
        </div>

        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px 16px;">
          <div style="font-size:11.5px;font-weight:800;text-transform:uppercase;letter-spacing:0.8px;color:#475569;margin-bottom:8px;">Warehouse & Fulfillment Next Steps:</div>
          <ol style="margin:0;padding-left:18px;font-size:13px;color:#334155;line-height:1.7;">
            <li>Package the competition gear at the store.</li>
            <li>Book courier partner (<strong>DTDC</strong>, <strong>India Post Speed Post</strong>, or <strong>BlueDart</strong>).</li>
            <li>Add the Courier Name and Tracking / AWB Number to notify the customer and mark as <strong>SHIPPED</strong>.</li>
          </ol>
        </div>

        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;padding-top:14px;border-top:1px solid #e2e8f0;">
          <button type="button" class="btn btn-outline" onclick="hideModal()">Stay on Payments</button>
          <button type="button" class="btn btn-primary" style="background:#000;color:#fff;padding:10px 18px;font-weight:800;font-size:13px;display:inline-flex;align-items:center;gap:8px;" onclick="goToOrderFulfillment('${orderId}')">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
              <line x1="12" y1="22.08" x2="12" y2="12"/>
            </svg>
            <span>Go to Order &amp; Dispatch Tracking &rarr;</span>
          </button>
        </div>
      </div>
    `);
  }

  window.goToOrderFulfillment = function(orderId) {
    hideModal();
    switchView('orders');

    // Wait for the orders list to mount/load, then open the tracking modal for this order
    const checkAndOpen = (attempts = 0) => {
      const o = (window.currentOrders || []).find(it => it.orderId === orderId || it.id === orderId || it.orderNumber === orderId);
      if (o || attempts >= 8) {
        if (typeof window.openTrackingModal === 'function') {
          window.openTrackingModal(orderId);
        }
      } else {
        setTimeout(() => checkAndOpen(attempts + 1), 120);
      }
    };
    setTimeout(() => checkAndOpen(0), 180);
  };

  window.rejectPayment = function (paymentId) {
    const p = (window.currentPayments || []).find(item => item.paymentId === paymentId || item.orderId === paymentId);
    const orderNum = p ? (p.orderNumber || p.orderId) : paymentId;
    const amountStr = p ? window.LANE4.formatINR(p.amountPaise) : '';
    const utrStr = p ? (p.upiReferenceNumber || 'N/A') : '';

    showModal('Reject Payment Submission', `
      <div style="display:flex;flex-direction:column;gap:18px;">
        <div style="background:#fef2f2;border:1px solid #fee2e2;border-radius:10px;padding:14px 16px;display:flex;align-items:flex-start;gap:12px;">
          <div style="width:34px;height:34px;border-radius:50%;background:#fee2e2;display:flex;align-items:center;justify-content:center;color:#dc2626;flex-shrink:0;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </div>
          <div>
            <div style="font-size:14px;font-weight:800;color:#991b1b;margin-bottom:2px;">Reject Proof for Order #${orderNum} ${amountStr ? `(${amountStr})` : ''}</div>
            <div style="font-size:12.5px;color:#7f1d1d;line-height:1.4;">Customer will receive an automated notification with this rejection reason and instructions to resubmit their valid payment proof.</div>
          </div>
        </div>

        <div style="display:flex;gap:12px;background:#f8fafc;padding:10px 14px;border-radius:8px;border:1px solid #e2e8f0;font-size:12px;color:#475569;">
          <div><strong style="color:#0f172a;">12-digit UTR:</strong> <code>${utrStr}</code></div>
        </div>

        <div>
          <label style="display:block;font-size:11.5px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#64748b;margin-bottom:6px;">Quick Presets</label>
          <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px;">
            <button type="button" class="btn btn-outline" style="padding:4px 10px;font-size:11px;border-radius:20px;cursor:pointer;" onclick="document.getElementById('reject-reason-input').value='Transaction reference could not be matched with bank records.'">Bank Reference Missing</button>
            <button type="button" class="btn btn-outline" style="padding:4px 10px;font-size:11px;border-radius:20px;cursor:pointer;" onclick="document.getElementById('reject-reason-input').value='Amount received does not match order payable amount.'">Amount Mismatch</button>
            <button type="button" class="btn btn-outline" style="padding:4px 10px;font-size:11px;border-radius:20px;cursor:pointer;" onclick="document.getElementById('reject-reason-input').value='Payment screenshot is illegible, cropped, or missing transaction details.'">Illegible Screenshot</button>
            <button type="button" class="btn btn-outline" style="padding:4px 10px;font-size:11px;border-radius:20px;cursor:pointer;" onclick="document.getElementById('reject-reason-input').value='Transaction was cancelled or reversed by sending bank.'">Transaction Reversed</button>
          </div>

          <label for="reject-reason-input" class="form-label" style="display:block;font-size:12px;font-weight:700;text-transform:uppercase;color:#334155;margin-bottom:6px;">
            Reason for Rejection <span style="color:#dc2626;">*</span>
          </label>
          <textarea id="reject-reason-input" class="form-textarea" rows="3" style="width:100%;font-size:13.5px;font-family:inherit;padding:10px 12px;border:1.5px solid #cbd5e1;border-radius:6px;resize:vertical;" placeholder="Enter specific reason why this payment cannot be approved...">Transaction reference could not be matched with bank records.</textarea>
          <div id="reject-error-msg" style="display:none;color:#dc2626;font-size:12px;font-weight:600;margin-top:4px;">Please enter a reason for rejection.</div>
        </div>

        <div style="display:flex;justify-content:flex-end;gap:10px;padding-top:14px;border-top:1px solid #e2e8f0;">
          <button type="button" class="btn btn-outline" onclick="hideModal()">Cancel</button>
          <button type="button" id="submit-reject-btn" class="btn btn-danger" style="padding:9px 20px;font-size:13px;font-weight:700;display:inline-flex;align-items:center;gap:6px;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            <span>Confirm Rejection</span>
          </button>
        </div>
      </div>
    `);

    setTimeout(() => {
      const textarea = document.getElementById('reject-reason-input');
      if (textarea) textarea.focus();
    }, 50);

    const submitBtn = document.getElementById('submit-reject-btn');
    if (submitBtn) {
      submitBtn.onclick = async () => {
        const reason = (document.getElementById('reject-reason-input')?.value || '').trim();
        const errEl = document.getElementById('reject-error-msg');
        if (!reason) {
          if (errEl) errEl.style.display = 'block';
          return;
        }
        if (errEl) errEl.style.display = 'none';

        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span>Rejecting...</span>';

        try {
          await window.lane4ApiRequest(`/admin/payments/${paymentId}/reject`, {
            method: 'POST',
            body: JSON.stringify({ reason })
          });
          hideModal();
          showToast('Payment submission marked as rejected. Customer notified to resubmit.', 'info', 'PAYMENT REJECTED');
          notifyOrderUpdated((p && p.orderId) || paymentId);
          loadPayments();
          checkPendingPaymentsRealtime(false);
        } catch (err) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg><span>Confirm Rejection</span>';
          showToast(err.message || 'Failed to reject payment', 'error');
        }
      };
    }
  };

  // --- ORDERS ---
  window.orderFilter = window.orderFilter || 'all';

  async function loadOrders(isQuiet = false) {
    const container = document.getElementById('view-orders');
    if (!container) return;
    if (!isQuiet) {
      if (!container.children.length) {
        container.innerHTML = getSkeletonHtml('table');
      }
      showTopLoader();
    }

    try {
      const res = await window.lane4ApiRequest('/admin/orders');
      const allOrders = res.data || [];

      // Sort newest created orders strictly to the top
      allOrders.sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));
      window.currentOrders = allOrders;

      const confirmedCount = allOrders.filter(o => o.status === 'confirmed').length;
      const processingCount = allOrders.filter(o => o.status === 'processing').length;
      const shippedCount = allOrders.filter(o => o.status === 'shipped' || o.status === 'out_for_delivery').length;
      const deliveredCount = allOrders.filter(o => o.status === 'delivered').length;
      const pendingCount = allOrders.filter(o => o.status === 'pending_payment' || o.status === 'payment_verification').length;
      const returnedCount = allOrders.filter(o => o.status === 'returned' || o.status === 'refunded').length;
      const cancelledCount = allOrders.filter(o => o.status === 'cancelled').length;
      const rejectedCount = allOrders.filter(o => o.status === 'payment_rejected').length;

      // Real-time search filter
      const q = (window.orderSearchQuery || '').toLowerCase().trim();
      const searchedOrders = allOrders.filter(o => {
        if (!q) return true;
        const num = (o.orderNumber || o.orderId || o.id || '').toLowerCase();
        const custName = (o.customer && (o.customer.displayName || o.customer.name || o.customer.fullName) || '').toLowerCase();
        const shipName = (o.shippingAddress && (o.shippingAddress.fullName || o.shippingAddress.name || o.shippingAddress.addressee) || '').toLowerCase();
        const email = (o.customer && o.customer.email || o.shippingAddress && o.shippingAddress.email || o.customerEmail || '').toLowerCase();
        const phone = (o.shippingAddress && o.shippingAddress.phone || o.customer && o.customer.phone || '').toLowerCase();
        const city = (o.shippingAddress && o.shippingAddress.city || '').toLowerCase();
        const utr = (o.payment && (o.payment.upiUtr || o.payment.utr) || '').toLowerCase();
        return num.includes(q) || custName.includes(q) || shipName.includes(q) || email.includes(q) || phone.includes(q) || city.includes(q) || utr.includes(q);
      });

      // Filter based on active tab
      const orders = searchedOrders.filter(o => {
        if (window.orderFilter === 'confirmed') return o.status === 'confirmed';
        if (window.orderFilter === 'processing') return o.status === 'processing';
        if (window.orderFilter === 'shipped') return o.status === 'shipped' || o.status === 'out_for_delivery';
        if (window.orderFilter === 'delivered') return o.status === 'delivered';
        if (window.orderFilter === 'pending') return o.status === 'pending_payment' || o.status === 'payment_verification';
        if (window.orderFilter === 'returned') return o.status === 'returned' || o.status === 'refunded';
        if (window.orderFilter === 'cancelled') return o.status === 'cancelled';
        if (window.orderFilter === 'rejected') return o.status === 'payment_rejected';
        return true;
      });

      container.innerHTML = `
        <div class="card">
          <div class="card-header" style="flex-wrap:wrap;gap:12px;align-items:center;justify-content:space-between;">
            <div>
              <div class="card-title">Customer Orders & Fulfillment (${allOrders.length})</div>
              <div style="font-size:12px;color:#64748b;margin-top:2px;">Orders sorted with the newest transactions first. Update fulfillment and attach shipment tracking.</div>
            </div>
            <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
              <input type="text" id="lane4-admin-order-search" placeholder="Search order #, customer, phone, city..." value="${window.orderSearchQuery || ''}" style="width:260px;height:36px;padding:6px 12px;border:1.5px solid #cbd5e1;border-radius:6px;font-size:12.5px;box-sizing:border-box;">
              ${confirmedCount > 0 ? `
                <div style="background:#f0fdf4;border:1px solid #bbf7d0;padding:6px 12px;border-radius:20px;font-size:12px;font-weight:800;color:#166534;display:inline-flex;align-items:center;gap:6px;">
                  <span style="width:8px;height:8px;border-radius:50%;background:#16a34a;display:inline-block;"></span>
                  <span>${confirmedCount} Order${confirmedCount > 1 ? 's' : ''} Ready to Dispatch</span>
                </div>
              ` : ''}
            </div>
          </div>

          <!-- Order Status Filter Tabs -->
          <div style="display:flex;flex-wrap:wrap;gap:6px;padding:12px 18px;background:#f8fafc;border-bottom:1px solid #e2e8f0;">
            <button type="button" class="btn ${window.orderFilter === 'all' ? 'btn-primary' : 'btn-outline'}" style="padding:5px 12px;font-size:12px;border-radius:20px;cursor:pointer;${window.orderFilter === 'all' ? 'background:#000;color:#fff;' : ''}" onclick="window.setOrderFilter('all')">
              All Orders (${allOrders.length})
            </button>
            <button type="button" class="btn ${window.orderFilter === 'confirmed' ? 'btn-primary' : 'btn-outline'}" style="padding:5px 12px;font-size:12px;border-radius:20px;cursor:pointer;${window.orderFilter === 'confirmed' ? 'background:#16a34a;color:#fff;' : 'border-color:#bbf7d0;color:#166534;'}" onclick="window.setOrderFilter('confirmed')">
              Ready to Dispatch (${confirmedCount})
            </button>
            <button type="button" class="btn ${window.orderFilter === 'processing' ? 'btn-primary' : 'btn-outline'}" style="padding:5px 12px;font-size:12px;border-radius:20px;cursor:pointer;${window.orderFilter === 'processing' ? 'background:#000;color:#fff;' : ''}" onclick="window.setOrderFilter('processing')">
              Processing (${processingCount})
            </button>
            <button type="button" class="btn ${window.orderFilter === 'shipped' ? 'btn-primary' : 'btn-outline'}" style="padding:5px 12px;font-size:12px;border-radius:20px;cursor:pointer;${window.orderFilter === 'shipped' ? 'background:#000;color:#fff;' : ''}" onclick="window.setOrderFilter('shipped')">
              Shipped (${shippedCount})
            </button>
            <button type="button" class="btn ${window.orderFilter === 'delivered' ? 'btn-primary' : 'btn-outline'}" style="padding:5px 12px;font-size:12px;border-radius:20px;cursor:pointer;${window.orderFilter === 'delivered' ? 'background:#000;color:#fff;' : ''}" onclick="window.setOrderFilter('delivered')">
              Delivered (${deliveredCount})
            </button>
            <button type="button" class="btn ${window.orderFilter === 'pending' ? 'btn-primary' : 'btn-outline'}" style="padding:5px 12px;font-size:12px;border-radius:20px;cursor:pointer;${window.orderFilter === 'pending' ? 'background:#000;color:#fff;' : ''}" onclick="window.setOrderFilter('pending')">
              Pending Payment (${pendingCount})
            </button>
            <button type="button" class="btn ${window.orderFilter === 'returned' ? 'btn-primary' : 'btn-outline'}" style="padding:5px 12px;font-size:12px;border-radius:20px;cursor:pointer;${window.orderFilter === 'returned' ? 'background:#0f172a;color:#fff;' : ''}" onclick="window.setOrderFilter('returned')">
              Returned / Refunded (${returnedCount})
            </button>
            <button type="button" class="btn ${window.orderFilter === 'cancelled' ? 'btn-primary' : 'btn-outline'}" style="padding:5px 12px;font-size:12px;border-radius:20px;cursor:pointer;${window.orderFilter === 'cancelled' ? 'background:#ef4444;color:#fff;' : 'border-color:#fca5a5;color:#b91c1c;'}" onclick="window.setOrderFilter('cancelled')">
              Cancelled (${cancelledCount})
            </button>
            <button type="button" class="btn ${window.orderFilter === 'rejected' ? 'btn-primary' : 'btn-outline'}" style="padding:5px 12px;font-size:12px;border-radius:20px;cursor:pointer;${window.orderFilter === 'rejected' ? 'background:#991b1b;color:#fff;' : 'border-color:#fca5a5;color:#991b1b;'}" onclick="window.setOrderFilter('rejected')">
              Payment Rejected (${rejectedCount})
            </button>
          </div>

          <div class="card-body" style="padding:0;">
            <div class="table-responsive">
              <table>
                <thead>
                  <tr>
                    <th>Order #</th>
                    <th>Customer & Address</th>
                    <th>Ordered Items</th>
                    <th>Payable Total</th>
                    <th>Order Status</th>
                    <th>Payment Status</th>
                    <th style="min-width:210px;">Fulfillment &amp; Courier</th>
                  </tr>
                </thead>
                <tbody>
                  ${orders.length === 0 ? '<tr><td colspan="7" style="text-align:center;padding:32px 20px;color:#64748b;font-size:13px;">No orders found in this view.</td></tr>' :
                    orders.map(o => {
                      const orderRefId = o.orderId || o.id;
                      const orderNum = o.orderNumber || orderRefId;
                      const isConfirmed = o.status === 'confirmed';
                      const isShipped = o.status === 'shipped' || o.status === 'out_for_delivery' || o.status === 'delivered';

                      return `
                        <tr style="${isConfirmed ? 'background:#f0fdf4;' : ''}">
                          <td>
                            <strong style="font-size:13.5px;color:#0f172a;display:block;">#${orderNum}</strong>
                            <span style="font-size:11px;color:#64748b;">${formatDateTime(o.createdAt)}</span>
                          </td>
                          <td>
                            <div style="font-weight:800;color:#0f172a;">${escapeHtml((o.shippingAddress && o.shippingAddress.addressee) || 'Customer')}</div>
                            <div style="font-size:12px;color:#475569;">${escapeHtml(o.customerEmail || '—')}</div>
                            <div style="font-size:11px;color:#64748b;">${o.shippingAddress ? `${escapeHtml(o.shippingAddress.city || '')}, PIN ${escapeHtml(o.shippingAddress.postalCode || '')}` : ''}</div>
                          </td>
                          <td>
                            <div style="font-size:12.5px;color:#334155;">
                              ${(o.items || []).map(it => `<div><strong>${it.quantity}&times;</strong> ${escapeHtml(it.name)} ${it.size ? `<span style="font-size:11px;color:#64748b;">(${it.size})</span>` : ''}</div>`).join('')}
                            </div>
                          </td>
                          <td>
                            <strong style="font-size:14px;color:#0f172a;">${o.pricing ? o.pricing.finalPayableFormatted : ''}</strong>
                            ${(o.pricing && o.pricing.couponCode) ? `
                              <div style="margin-top:3px;">
                                <span style="font-size:10.5px;font-weight:800;background:#dcfce7;color:#15803d;padding:2px 7px;border-radius:4px;display:inline-flex;align-items:center;gap:4px;" title="Coupon applied">
                                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                                  <span>${escapeHtml(o.pricing.couponCode)} (-${o.pricing.couponDiscountFormatted || ('₹' + ((o.pricing.couponDiscountPaise || 0)/100).toFixed(2))})</span>
                                </span>
                              </div>
                            ` : ''}
                          </td>
                          <td>
                            <select onchange="updateOrderStatus('${orderRefId}', this.value)" style="padding:6px 9px;border-radius:6px;border:1.5px solid ${isConfirmed ? '#16a34a' : '#cbd5e1'};background:#fff;font-weight:700;font-size:12px;color:#0f172a;">
                              <option value="pending_payment" ${o.status === 'pending_payment' ? 'selected' : ''}>Pending Payment</option>
                              <option value="payment_verification" ${o.status === 'payment_verification' ? 'selected' : ''}>Payment Verification</option>
                              <option value="confirmed" ${o.status === 'confirmed' ? 'selected' : ''}>Confirmed (Ready to Pack)</option>
                              <option value="processing" ${o.status === 'processing' ? 'selected' : ''}>Processing</option>
                              <option value="shipped" ${o.status === 'shipped' ? 'selected' : ''}>Shipped</option>
                              <option value="out_for_delivery" ${o.status === 'out_for_delivery' ? 'selected' : ''}>Out For Delivery</option>
                              <option value="delivered" ${o.status === 'delivered' ? 'selected' : ''}>Delivered</option>
                              <option value="returned" ${o.status === 'returned' ? 'selected' : ''}>Returned</option>
                              <option value="cancelled" ${o.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                              <option value="payment_rejected" ${o.status === 'payment_rejected' ? 'selected' : ''}>Payment Rejected</option>
                            </select>
                            ${o.refundStatus === 'pending_refund' ? `
                              <div style="margin-top:4px;">
                                <button type="button" class="btn" style="background:#ef4444;color:#fff;font-size:10px;padding:3px 7px;border-radius:4px;font-weight:800;border:none;cursor:pointer;" onclick="openRefundModal('${orderRefId}')">
                                  Process Refund
                                </button>
                              </div>
                            ` : (o.refundStatus === 'refunded' ? `
                              <div style="margin-top:4px;font-size:10.5px;color:#16a34a;font-weight:800;">
                                Refunded ✓
                              </div>
                            ` : '')}
                          </td>
                          <td>
                            <span class="badge ${o.paymentStatus === 'verified' ? 'badge-verified' : (o.paymentStatus === 'rejected' ? 'badge-rejected' : 'badge-pending')}" style="font-size:11px;">
                              ${(o.paymentStatus || 'awaiting_payment').replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td style="white-space:nowrap;">
                            ${o.fulfillment && o.fulfillment.trackingNumber ? `
                              <div style="font-size:12px;line-height:1.4;">
                                <strong style="color:#0f172a;">${escapeHtml(o.fulfillment.courierName || 'Courier')}</strong><br />
                                <code style="font-size:11.5px;background:#e2e8f0;padding:2px 6px;border-radius:4px;">${escapeHtml(o.fulfillment.trackingNumber)}</code>
                              </div>
                            ` : `
                              ${isConfirmed ? `
                                <button type="button" class="btn-dispatch" onclick="openTrackingModal('${orderRefId}')" title="Dispatch order and provide courier tracking">
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 21 16z"/>
                                    <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                                    <line x1="12" y1="22.08" x2="12" y2="12"/>
                                  </svg>
                                  <span>Dispatch &amp; Add Tracking</span>
                                </button>
                              ` : `
                                <button type="button" class="btn-add-tracking" onclick="openTrackingModal('${orderRefId}')" title="Add tracking details">
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                    <line x1="12" y1="5" x2="12" y2="19"/>
                                    <line x1="5" y1="12" x2="19" y2="12"/>
                                  </svg>
                                  <span>Add Tracking</span>
                                </button>
                              `}
                            `}
                          </td>
                        </tr>
                      `;
                    }).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;

      const searchInput = document.getElementById('lane4-admin-order-search');
      if (searchInput) {
        searchInput.oninput = (e) => {
          window.orderSearchQuery = e.target.value;
          loadOrders(true);
        };
        if (isQuiet) {
          searchInput.focus();
          const val = searchInput.value;
          searchInput.setSelectionRange(val.length, val.length);
        }
      }
    } catch (err) {
      container.innerHTML = `<p style="color:#ef4444;padding:20px;">Error loading orders: ${err.message}</p>`;
    } finally {
      hideTopLoader();
    }
  }

  window.setOrderFilter = function (filter) {
    window.orderFilter = filter;
    loadOrders();
  };

  function formatStatusLabel(status) {
    const map = {
      pending_payment: 'Pending Payment',
      payment_verification: 'Payment Verification',
      confirmed: 'Confirmed (Ready to Pack)',
      processing: 'Processing',
      shipped: 'Shipped',
      out_for_delivery: 'Out for Delivery',
      delivered: 'Delivered',
      returned: 'Returned',
      cancelled: 'Cancelled',
      payment_rejected: 'Payment Rejected',
      refunded: 'Refunded'
    };
    return map[status] || (status ? status.replace(/_/g, ' ') : status);
  }
  window.formatStatusLabel = formatStatusLabel;
  window.formatOrderStatus = formatStatusLabel;

  window.openRefundModal = function (orderId) {
    const o = (window.currentOrders || []).find(it => it.orderId === orderId || it.id === orderId || it.orderNumber === orderId);
    const orderNum = o ? (o.orderNumber || o.orderId || orderId) : orderId;
    const amountStr = (o && o.pricing) ? o.pricing.finalPayableFormatted : '';

    showModal('Record & Process Customer Refund', `
      <div style="display:flex;flex-direction:column;gap:16px;">
        <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:14px;color:#991b1b;font-size:13px;line-height:1.4;">
          <strong>Process Refund for Cancelled Order #${orderNum}</strong><br />
          Original Amount: <strong>${amountStr}</strong>. Confirm you have initiated the refund via your UPI/bank dashboard and record the reference transaction ID below.
        </div>
        <div>
          <label class="form-label" style="display:block;font-size:12px;font-weight:700;margin-bottom:6px;">Bank / UPI Refund Reference ID *</label>
          <input type="text" id="refund-ref-input" class="form-input" style="width:100%;font-size:13px;padding:9px 12px;border:1.5px solid #cbd5e1;border-radius:6px;" placeholder="e.g. REF123456789012 or Bank UTR" required />
        </div>
        <div>
          <label class="form-label" style="display:block;font-size:12px;font-weight:700;margin-bottom:6px;">Admin Refund Notes</label>
          <input type="text" id="refund-notes-input" class="form-input" style="width:100%;font-size:13px;padding:9px 12px;border:1.5px solid #cbd5e1;border-radius:6px;" placeholder="e.g. Refunded to customer original UPI handle" />
        </div>
        <div style="display:flex;justify-content:flex-end;gap:10px;padding-top:12px;border-top:1px solid #e2e8f0;">
          <button type="button" class="btn btn-outline" onclick="hideModal()">Cancel</button>
          <button type="button" id="submit-refund-btn" class="btn btn-danger" style="padding:9px 18px;font-size:13px;font-weight:800;background:#dc2626;color:#fff;">
            Confirm & Save Refund
          </button>
        </div>
      </div>
    `);

    const submitBtn = document.getElementById('submit-refund-btn');
    if (submitBtn) {
      submitBtn.onclick = async () => {
        const refInput = document.getElementById('refund-ref-input');
        const refVal = (refInput?.value || '').trim();
        const notes = (document.getElementById('refund-notes-input')?.value || '').trim();
        if (!refVal || refVal.length < 3) {
          if (refInput) { refInput.style.borderColor = '#dc2626'; refInput.focus(); }
          showToast('Please enter a valid refund transaction reference.', 'error');
          return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'Saving...';
        try {
          await window.lane4ApiRequest(`/admin/orders/${orderId}/refund`, {
            method: 'POST',
            body: JSON.stringify({ refundReference: refVal, notes })
          });
          hideModal();
          showToast(`Refund recorded for #${orderNum}!`, 'success');
          notifyOrderUpdated(orderId);
          loadOrders();
        } catch (err) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Confirm & Save Refund';
          showToast(err.message || 'Failed to record refund', 'error');
        }
      };
    }
  };

  window.updateOrderStatus = async function (orderId, newStatus) {
    if (newStatus === 'cancelled') {
      const o = (window.currentOrders || []).find(it => it.orderId === orderId || it.id === orderId || it.orderNumber === orderId);
      const orderNum = o ? (o.orderNumber || o.orderId || orderId) : orderId;
      const confirmed = window.confirm(`Are you sure you want to cancel Order #${orderNum}?\n\nThis will mark the order as Cancelled, release reserved inventory, and record refund tracking.`);
      if (!confirmed) {
        loadOrders();
        return;
      }
    }

    try {
      await window.lane4ApiRequest(`/admin/orders/${orderId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus })
      });
      showToast(`Order status updated to ${formatStatusLabel(newStatus)}.`);
      notifyOrderUpdated(orderId);
      loadOrders();
    } catch (err) {
      showToast(err.message || 'Error updating order status', 'error');
      loadOrders();
    }
  };

  window.openTrackingModal = function (orderId) {
    const o = (window.currentOrders || []).find(it => it.orderId === orderId || it.id === orderId || it.orderNumber === orderId);
    const orderNum = o ? (o.orderNumber || o.orderId || orderId) : orderId;
    const targetId = o ? (o.orderId || o.id) : orderId;
    const customerEmail = (o && o.customerEmail) || 'Customer Email';
    const customerName = (o && o.shippingAddress && o.shippingAddress.addressee) || 'Customer';

    showModal('Dispatch Order & Attach Tracking', `
      <div style="display:flex;flex-direction:column;gap:16px;">
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px 16px;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;">
            <div>
              <div style="font-size:11px;color:#64748b;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Order Fulfillment & Dispatch</div>
              <div style="font-size:16px;font-weight:900;color:#0f172a;margin-top:2px;">Order #${orderNum}</div>
            </div>
            <div style="text-align:right;">
              <div style="font-size:11px;color:#64748b;font-weight:700;text-transform:uppercase;">Recipient</div>
              <div style="font-size:13px;font-weight:800;color:#0f172a;">${escapeHtml(customerName)}</div>
            </div>
          </div>
        </div>

        <!-- Notification Mechanism Explainer Card -->
        <div style="background:#f0fdf4;border:1.5px solid #bbf7d0;border-radius:8px;padding:12px 14px;font-size:12.5px;color:#166534;line-height:1.5;">
          <div style="font-weight:800;display:flex;align-items:center;gap:6px;margin-bottom:3px;">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
            <span>Customer Notification: Automated Email</span>
          </div>
          <div>An automated shipment confirmation email with the courier details, AWB/tracking code, and direct tracking button will be dispatched directly to <strong>${escapeHtml(customerEmail)}</strong>.</div>
        </div>

        <div>
          <label style="display:block;font-size:11.5px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#64748b;margin-bottom:6px;">Common Courier Partners</label>
          <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px;">
            <button type="button" class="btn btn-outline" style="padding:4px 10px;font-size:11px;border-radius:20px;cursor:pointer;" onclick="document.getElementById('tracking-courier-input').value='DTDC';document.getElementById('tracking-url-input').value='https://www.dtdc.in/tracking.asp';">DTDC</button>
            <button type="button" class="btn btn-outline" style="padding:4px 10px;font-size:11px;border-radius:20px;cursor:pointer;" onclick="document.getElementById('tracking-courier-input').value='Blue Dart';document.getElementById('tracking-url-input').value='https://www.bluedart.com/tracking';">Blue Dart</button>
            <button type="button" class="btn btn-outline" style="padding:4px 10px;font-size:11px;border-radius:20px;cursor:pointer;" onclick="document.getElementById('tracking-courier-input').value='Delhivery';document.getElementById('tracking-url-input').value='https://www.delhivery.com/tracking';">Delhivery</button>
            <button type="button" class="btn btn-outline" style="padding:4px 10px;font-size:11px;border-radius:20px;cursor:pointer;" onclick="document.getElementById('tracking-courier-input').value='India Post';document.getElementById('tracking-url-input').value='https://www.indiapost.gov.in';">India Post</button>
            <button type="button" class="btn btn-outline" style="padding:4px 10px;font-size:11px;border-radius:20px;cursor:pointer;" onclick="document.getElementById('tracking-courier-input').value='Shiprocket';document.getElementById('tracking-url-input').value='https://shiprocket.co/tracking';">Shiprocket</button>
          </div>

          <div class="form-group" style="margin-bottom:12px;">
            <label for="tracking-courier-input" class="form-label">Courier Name <span style="color:#dc2626;">*</span></label>
            <input type="text" id="tracking-courier-input" class="form-input" value="DTDC" placeholder="e.g. DTDC, Blue Dart, India Post" required />
          </div>

          <div class="form-group" style="margin-bottom:12px;">
            <label for="tracking-num-input" class="form-label">Tracking / AWB Number <span style="color:#dc2626;">*</span></label>
            <input type="text" id="tracking-num-input" class="form-input" placeholder="e.g. D68492041, BLUD8921102" required />
            <div id="tracking-err-msg" style="display:none;color:#dc2626;font-size:12px;font-weight:600;margin-top:4px;">Please enter the tracking / AWB number.</div>
          </div>

          <div class="form-group" style="margin-bottom:0;">
            <label for="tracking-url-input" class="form-label">Tracking Web URL (Optional)</label>
            <input type="url" id="tracking-url-input" class="form-input" value="https://www.dtdc.in/tracking.asp" placeholder="https://..." />
            <div style="font-size:11.5px;color:#64748b;margin-top:4px;">Direct link customer can click in their email to track transit.</div>
          </div>
        </div>

        <div style="display:flex;justify-content:flex-end;gap:10px;padding-top:14px;border-top:1px solid #e2e8f0;">
          <button type="button" class="btn btn-outline" onclick="hideModal()">Cancel</button>
          <button type="button" id="save-tracking-submit-btn" class="btn btn-primary" style="padding:9px 20px;font-size:13px;font-weight:700;">
            Dispatch Order & Send Email
          </button>
        </div>
      </div>
    `);

    setTimeout(() => {
      const numInput = document.getElementById('tracking-num-input');
      if (numInput) numInput.focus();
    }, 50);

    const submitBtn = document.getElementById('save-tracking-submit-btn');
    if (submitBtn) {
      submitBtn.onclick = async () => {
        const courier = (document.getElementById('tracking-courier-input')?.value || '').trim();
        const tracking = (document.getElementById('tracking-num-input')?.value || '').trim();
        const trackingUrl = (document.getElementById('tracking-url-input')?.value || '').trim();
        const errEl = document.getElementById('tracking-err-msg');

        if (!tracking) {
          if (errEl) errEl.style.display = 'block';
          return;
        }
        if (errEl) errEl.style.display = 'none';

        submitBtn.disabled = true;
        submitBtn.textContent = 'Dispatching...';

        try {
          await window.lane4ApiRequest(`/admin/orders/${targetId}/tracking`, {
            method: 'POST',
            body: JSON.stringify({ courierName: courier || 'DTDC', trackingNumber: tracking, trackingUrl })
          });
          hideModal();
          showToast(`Order #${orderNum} dispatched! Tracking email sent to ${customerEmail}.`);
          notifyOrderUpdated(targetId);
          loadOrders();
        } catch (err) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Dispatch Order & Send Email';
          showToast(err.message || 'Failed to add tracking', 'error');
        }
      };
    }
  };

  // --- INVENTORY ---
  async function loadInventory() {
    const container = document.getElementById('view-inventory');
    if (!container) return;
    if (!container.children.length) {
      container.innerHTML = getSkeletonHtml('table');
    }
    showTopLoader();

    try {
      const res = await window.lane4ApiRequest('/admin/inventory');
      const items = res.data || [];

      container.innerHTML = `
        <div class="card">
          <div class="card-header">
            <div class="card-title">Variant Stock Levels (${items.length} SKUs)</div>
          </div>
          <div class="card-body" style="padding:0;">
            <div class="table-responsive">
              <table>
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>Product</th>
                    <th>Variant / Option</th>
                    <th>Available Stock</th>
                    <th>Reserved</th>
                    <th>Status</th>
                    <th>Quick Adjust</th>
                  </tr>
                </thead>
                <tbody>
                  ${items.map(it => `
                    <tr>
                      <td><code>${it.sku}</code></td>
                      <td style="font-weight:700;">${it.productName}</td>
                      <td>${it.variantLabel || 'Standard'}</td>
                      <td style="font-size:15px;font-weight:900;color:${it.availableQuantity <= (it.lowStockThreshold || 5) ? '#dc2626' : '#16a34a'};">${it.availableQuantity} units</td>
                      <td>${it.reservedQuantity || 0}</td>
                      <td>
                        ${it.availableQuantity <= 0 ? '<span class="badge badge-rejected">OUT OF STOCK</span>' : 
                          it.availableQuantity <= (it.lowStockThreshold || 5) ? '<span class="badge badge-pending">LOW STOCK</span>' : 
                          '<span class="badge badge-active">IN STOCK</span>'}
                      </td>
                      <td>
                        <div style="display:flex;gap:4px;">
                          <button class="btn btn-outline" style="padding:4px 8px;font-size:11px;" onclick="adjustStock('${it.sku}', 5)">+5</button>
                          <button class="btn btn-outline" style="padding:4px 8px;font-size:11px;" onclick="adjustStock('${it.sku}', 10)">+10</button>
                          <button class="btn btn-outline" style="padding:4px 8px;font-size:11px;" onclick="adjustStockPrompt('${it.sku}', ${it.availableQuantity || 0})">Custom...</button>
                        </div>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;
    } catch (err) {
      container.innerHTML = `<p style="color:#ef4444;padding:20px;">Error loading inventory: ${err.message}</p>`;
    } finally {
      hideTopLoader();
    }
  }

  window.adjustStock = async function (sku, qty) {
    try {
      await window.lane4ApiRequest(`/admin/inventory/${sku}`, {
        method: 'PATCH',
        body: JSON.stringify({ adjustmentQuantity: qty, type: 'restock', reason: 'Direct admin restock' })
      });
      showToast(`Stock updated (+${qty} units)`);
      loadInventory();
    } catch (err) {
      showToast(err.message || 'Error updating stock', 'error');
    }
  };

  window.adjustStockPrompt = function (sku, curStock = 0) {
    showModal(`Adjust Stock — ${sku}`, `
      <div style="display:flex;flex-direction:column;gap:16px;">
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:12px 16px;display:flex;justify-content:space-between;align-items:center;">
          <div>
            <div style="font-size:11px;color:#64748b;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Inventory Balance</div>
            <div style="font-size:16px;font-weight:900;color:#0f172a;margin-top:2px;">SKU: <code>${sku}</code></div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:11px;color:#64748b;font-weight:700;text-transform:uppercase;">Current Stock</div>
            <div style="font-size:18px;font-weight:900;color:#0f172a;">${curStock} units</div>
          </div>
        </div>

        <div class="form-group" style="margin-bottom:12px;">
          <label class="form-label">Adjustment Direction</label>
          <div style="display:flex;gap:16px;margin-top:6px;">
            <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13.5px;font-weight:700;">
              <input type="radio" name="adjust-type" value="add" checked />
              <span style="color:#16a34a;">+ Add Stock (Restock)</span>
            </label>
            <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13.5px;font-weight:700;">
              <input type="radio" name="adjust-type" value="reduce" />
              <span style="color:#dc2626;">− Deduct Stock (Correction)</span>
            </label>
          </div>
        </div>

        <div class="form-group" style="margin-bottom:12px;">
          <label for="adjust-qty-num" class="form-label">Quantity Units <span style="color:#dc2626;">*</span></label>
          <input type="number" id="adjust-qty-num" class="form-input" min="1" step="1" value="10" required />
          <div id="adjust-err-msg" style="display:none;color:#dc2626;font-size:12px;font-weight:600;margin-top:4px;">Please enter a valid positive number of units.</div>
        </div>

        <div class="form-group" style="margin-bottom:0;">
          <label for="adjust-reason-text" class="form-label">Reason for Adjustment</label>
          <input type="text" id="adjust-reason-text" class="form-input" value="Routine stock reconciliation" placeholder="e.g. Audit reconciliation, damaged goods write-off" />
        </div>

        <div style="display:flex;justify-content:flex-end;gap:10px;padding-top:14px;border-top:1px solid #e2e8f0;">
          <button type="button" class="btn btn-outline" onclick="hideModal()">Cancel</button>
          <button type="button" id="save-adjust-stock-btn" class="btn btn-primary" style="padding:9px 20px;font-size:13px;font-weight:700;">
            Apply Stock Adjustment
          </button>
        </div>
      </div>
    `);

    setTimeout(() => {
      const qtyInput = document.getElementById('adjust-qty-num');
      if (qtyInput) qtyInput.focus();
    }, 50);

    const submitBtn = document.getElementById('save-adjust-stock-btn');
    if (submitBtn) {
      submitBtn.onclick = async () => {
        const isAdd = document.querySelector('input[name="adjust-type"]:checked')?.value === 'add';
        const rawQty = parseInt(document.getElementById('adjust-qty-num')?.value, 10);
        const reason = (document.getElementById('adjust-reason-text')?.value || '').trim() || 'Routine stock reconciliation';
        const errEl = document.getElementById('adjust-err-msg');

        if (isNaN(rawQty) || rawQty <= 0) {
          if (errEl) errEl.style.display = 'block';
          return;
        }
        if (errEl) errEl.style.display = 'none';

        const qty = isAdd ? rawQty : -rawQty;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Updating...';

        try {
          await window.lane4ApiRequest(`/admin/inventory/${sku}`, {
            method: 'PATCH',
            body: JSON.stringify({ adjustmentQuantity: qty, type: 'manual_adjustment', reason })
          });
          hideModal();
          showToast(`Stock updated (${qty > 0 ? '+' : ''}${qty} units).`);
          loadInventory();
        } catch (err) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Apply Stock Adjustment';
          showToast(err.message || 'Error adjusting stock', 'error');
        }
      };
    }
  };

  // --- PRODUCTS CATALOG MANAGEMENT ---
  async function loadProducts() {
    const container = document.getElementById('view-products');
    if (!container) return;
    if (!container.children.length) {
      container.innerHTML = getSkeletonHtml('table');
    }
    showTopLoader();

    try {
      const res = await window.lane4ApiRequest('/admin/products');
      const prods = (res && res.data && res.data.products) || (Array.isArray(res && res.data) ? res.data : []);

      // Sort newest created products strictly to the top
      prods.sort((a, b) => {
        const tB = toMillis(b.createdAt);
        const tA = toMillis(a.createdAt);
        if (tB !== tA) return tB - tA;
        return (toMillis(b.updatedAt) || 0) - (toMillis(a.updatedAt) || 0);
      });
      window.currentProducts = prods;

      container.innerHTML = `
        <div class="card">
          <div class="card-header" style="flex-wrap:wrap;gap:12px;">
            <div>
              <div class="card-title">Catalog Products (${prods.length})</div>
              <div style="font-size:12px;color:#64748b;margin-top:2px;">Manage inventory items, regular retail prices, sale discounts, and visibility.</div>
            </div>
            <button class="btn" id="btn-add-product" style="background:#000;color:#fff;display:inline-flex;align-items:center;gap:6px;">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              <span>Add New Product</span>
            </button>
          </div>
          <div class="card-body" style="padding:0;">
            <div class="table-responsive">
              <table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Category</th>
                    <th>SKU</th>
                    <th>Regular Price</th>
                    <th>Sale Price</th>
                    <th>Stock</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  ${prods.length === 0 ? '<tr><td colspan="8" style="text-align:center;padding:24px;color:#888;">No products found in catalog.</td></tr>' :
                    prods.map(p => {
                      const img = (p.images && p.images[0] && p.images[0].url) || '6424266ea05809dff501d86e/lane4-6dbhNuWa5oI-640x640.jpg';
                      const resolvedImg = resolveAdminAsset(img);
                      const fallbackImg = resolveAdminAsset('6424266ea05809dff501d86e/lane4-6dbhNuWa5oI-640x640.jpg');
                      const totalStock = (p.variants && p.variants.length > 0)
                        ? p.variants.reduce((acc, v) => acc + (v.stockQuantity || 0), 0)
                        : (p.stockQuantity || 50);

                      return `
                        <tr>
                          <td>
                            <div style="display:flex;align-items:center;gap:12px;">
                              <img src="${resolvedImg}" alt="${escapeHtml(p.name)}" style="width:42px;height:42px;object-fit:cover;border-radius:6px;border:1px solid #e2e8f0;background:#f8fafc;" onerror="this.onerror=null;this.src='${fallbackImg}';" />
                              <div>
                                <strong style="display:block;font-size:14px;color:#0f172a;">${escapeHtml(p.name)}</strong>
                                <div style="display:flex;align-items:center;gap:6px;margin-top:2px;">
                                  <span style="font-size:11px;color:#64748b;">${escapeHtml(p.slug || '')}</span>
                                  <span style="font-size:10px;font-weight:600;background:#f1f5f9;color:#475569;padding:1px 5px;border-radius:3px;border:1px solid #e2e8f0;">
                                    ${p.images && p.images.length > 0 ? `${p.images.length} photo${p.images.length === 1 ? '' : 's'}` : '1 photo'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </td>
                          <td><span class="badge" style="background:#f1f5f9;color:#334155;">${escapeHtml(p.category || p.categorySlug || 'gear')}</span></td>
                          <td><code>${escapeHtml(p.sku || '—')}</code></td>
                          <td>
                            <div style="cursor:pointer;display:inline-flex;align-items:center;gap:4px;" title="Click to edit prices" onclick="openEditProductModal('${p.id}')">
                              <span style="font-weight:700;color:#0f172a;">${window.LANE4.formatINR(p.regularPricePaise || p.pricePaise)}</span>
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                            </div>
                          </td>
                          <td>
                            <div style="cursor:pointer;display:inline-flex;align-items:center;gap:4px;" title="Click to edit prices" onclick="openEditProductModal('${p.id}')">
                              <span style="color:${p.salePricePaise ? '#16a34a' : '#64748b'};font-weight:${p.salePricePaise ? '700' : '400'};">
                                ${p.salePricePaise ? window.LANE4.formatINR(p.salePricePaise) : '—'}
                              </span>
                              ${p.salePricePaise ? '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>' : ''}
                            </div>
                          </td>
                          <td>
                            <span style="font-weight:700;color:${totalStock <= 5 ? '#dc2626' : '#0f172a'};">${totalStock} units</span>
                          </td>
                          <td>
                            <span class="badge ${p.isPublished ? 'badge-active' : 'badge-pending'}">${p.isPublished ? 'Published' : 'Draft'}</span>
                          </td>
                          <td>
                            <div style="display:flex;gap:6px;">
                              <a href="../product/${p.slug}.html" target="_blank" class="btn btn-outline" style="padding:5px 9px;font-size:11px;text-decoration:none;display:inline-flex;align-items:center;gap:4px;" title="Preview storefront page">
                                <span>View</span>
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                              </a>
                              <button class="btn btn-outline btn-edit-prod" onclick="openEditProductModal('${p.id}')" style="padding:5px 9px;font-size:11px;display:inline-flex;align-items:center;gap:4px;border-color:#cbd5e1;color:#0f172a;cursor:pointer;" title="Edit product and prices">
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                                <span>Edit</span>
                              </button>
                              <button class="btn btn-danger btn-del-prod" data-id="${p.id}" data-name="${p.name.replace(/"/g, '&quot;')}" style="padding:5px 9px;font-size:11px;display:inline-flex;align-items:center;gap:4px;" title="Archive product">
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                                <span>Delete</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      `;
                    }).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;

      // Hook Add Product Button
      const addBtn = document.getElementById('btn-add-product');
      if (addBtn) addBtn.onclick = openAddProductModal;

      // Hook Delete buttons
      container.querySelectorAll('.btn-del-prod').forEach(btn => {
        btn.onclick = () => {
          const id = btn.getAttribute('data-id');
          const name = btn.getAttribute('data-name');
          deleteProduct(id, name);
        };
      });

    } catch (err) {
      container.innerHTML = `<p style="color:#ef4444;padding:20px;">Error loading products: ${err.message}</p>`;
    } finally {
      hideTopLoader();
    }
  }

  window.openEditProductModal = async function (productId) {
    const p = (window.currentProducts || []).find(it => it.id === productId || it._id === productId);
    if (!p) {
      showToast('Product record not found', 'error');
      return;
    }

    let catOptions = '<option value="training-gear">Training Gear</option><option value="goggles">Goggles</option><option value="racing-caps">Racing Caps</option><option value="swimwear">Swimwear</option><option value="accessories">Accessories</option>';
    try {
      const res = await window.lane4ApiRequest('/admin/categories');
      if (res && res.data && res.data.length > 0) {
        catOptions = res.data.map(c => `<option value="${c.slug}" ${(c.slug === p.category || c.slug === p.categorySlug) ? 'selected' : ''}>${c.name}</option>`).join('');
      }
    } catch (e) {}

    const regularRupees = (p.regularPricePaise || p.pricePaise || 0) / 100;
    const saleRupees = p.salePricePaise ? (p.salePricePaise / 100) : '';
    const stockQty = (p.variants && p.variants.length > 0)
      ? p.variants.reduce((acc, v) => acc + (v.stockQuantity || 0), 0)
      : (p.stockQuantity || 50);

    // Initialize in-memory array of product images with their order
    let productImages = [];
    if (p.images && Array.isArray(p.images) && p.images.length > 0) {
      productImages = p.images.map((img, i) => ({
        url: typeof img === 'string' ? img : (img.url || ''),
        alt: (typeof img === 'object' && img.alt) || p.name || 'Product Image',
        order: typeof img.order === 'number' ? img.order : i,
        isPrimary: i === 0
      })).sort((a, b) => (a.order || 0) - (b.order || 0))
         .map((img, i) => ({ ...img, order: i, isPrimary: i === 0 }));
    } else if (p.imageUrl) {
      productImages = [{ url: p.imageUrl, alt: p.name || 'Product Image', order: 0, isPrimary: true }];
    } else {
      productImages = [];
    }

    const firstImg = productImages[0]?.url || '';

    showModal('Edit Product & Gallery', `
      <form id="form-edit-product">
        <div style="background:#f8fafc;padding:12px 14px;border-radius:8px;border:1px solid #e2e8f0;margin-bottom:16px;display:flex;align-items:center;gap:12px;">
          ${firstImg ? `<img id="edit-prod-header-thumb" src="${resolveAdminAsset(firstImg)}" style="width:48px;height:48px;border-radius:6px;object-fit:cover;border:1px solid #cbd5e1;" onerror="this.onerror=null;this.style.display='none';" />` : `<div style="width:48px;height:48px;border-radius:6px;background:#e2e8f0;display:flex;align-items:center;justify-content:center;font-size:20px;">📦</div>`}
          <div>
            <div style="font-weight:800;font-size:14px;color:#0f172a;">${escapeHtml(p.name)}</div>
            <div style="font-size:12px;color:#64748b;">SKU: <code>${escapeHtml(p.sku || '—')}</code> &bull; Slug: <code>${escapeHtml(p.slug || '')}</code></div>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group" style="flex:2;">
            <label class="form-label">Product Title *</label>
            <input type="text" id="edit-prod-name" class="form-input" value="${escapeHtml(p.name)}" required />
          </div>
          <div class="form-group" style="flex:1;">
            <label class="form-label">Category *</label>
            <select id="edit-prod-cat" class="form-select">
              ${catOptions}
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group" style="flex:1;">
            <label class="form-label">Regular Price (₹ INR) *</label>
            <input type="number" step="0.01" min="1" id="edit-prod-regular" class="form-input" value="${regularRupees}" required />
            <div style="font-size:11px;color:#64748b;margin-top:3px;">Catalog base retail price</div>
          </div>
          <div class="form-group">
            <label class="form-label">Sale / Offer Price (₹ INR) *</label>
            <input type="number" step="0.01" min="1" id="edit-prod-sale" class="form-input" value="${saleRupees}" placeholder="e.g. 1399" required />
            <div style="font-size:11px;color:#16a34a;margin-top:3px;">Discounted checkout price (must be less than regular price) *</div>
          </div>
          <div class="form-group" style="flex:1;">
            <label class="form-label">Available Stock (Units) *</label>
            <input type="number" min="0" id="edit-prod-stock" class="form-input" value="${stockQty}" required />
          </div>
        </div>

        <div class="form-row">
          <div class="form-group" style="flex:1;">
            <label class="form-label">Storefront Status</label>
            <select id="edit-prod-status" class="form-select">
              <option value="published" ${p.isPublished !== false ? 'selected' : ''}>Published (Active in Storefront)</option>
              <option value="draft" ${p.isPublished === false ? 'selected' : ''}>Draft (Hidden from Storefront)</option>
            </select>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Product Tagline / Short Description</label>
          <input type="text" id="edit-prod-short-desc" class="form-input" value="${escapeHtml(p.shortDescription || '')}" placeholder="e.g. Pool-tested performance" />
          <div style="font-size:11px;color:#64748b;margin-top:3px;">Displayed directly below the product title on product detail and catalog pages</div>
        </div>

        <!-- Product Image Gallery & Order Management Section -->
        <div class="form-group" style="background:#f8fafc;padding:16px;border-radius:8px;border:1.5px solid #cbd5e1;margin-bottom:18px;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
            <label class="form-label" style="display:flex;align-items:center;gap:6px;margin:0;font-size:14px;font-weight:800;color:#0f172a;">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
              <span>Product Images &amp; Display Order <span style="color:#dc2626;">*</span></span>
            </label>
            <span id="edit-prod-gallery-count" class="badge" style="background:#0f172a;color:#fff;font-weight:700;">${productImages.length} Photos</span>
          </div>
          <div style="font-size:12px;color:#dc2626;font-weight:700;margin-bottom:12px;background:#fef2f2;border:1px solid #fecaca;padding:8px 12px;border-radius:6px;line-height:1.4;">
            <span style="font-size:14px;margin-right:4px;">⚠️</span> <strong>Mandatory:</strong> At least one product photo is required. Photo <strong>#1 PRIMARY</strong> serves as the main catalog cover and the primary hero image.
          </div>

          <!-- Interactive Ordered Image List -->
          <div id="edit-prod-gallery-list" style="display:flex;flex-direction:column;gap:8px;margin-bottom:14px;"></div>

          <!-- Add Image Tools -->
          <div style="background:#ffffff;border:1.5px dashed #cbd5e1;border-radius:8px;padding:12px 14px;">
            <div style="font-size:12px;font-weight:700;color:#0f172a;margin-bottom:8px;display:flex;align-items:center;gap:6px;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              <span>Upload New Photos</span>
            </div>
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">
              <input type="file" id="edit-prod-add-files" multiple accept="image/png,image/jpeg,image/webp" style="font-size:12px;flex:1;" />
            </div>
            <div id="edit-prod-upload-status" style="font-size:11px;color:#64748b;">Select JPG, PNG, or WebP to add to the gallery. Multiple files supported.</div>
          </div>
        </div>

        <div class="form-group" id="group-edit-prod-desc">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
            <label class="form-label" for="edit-prod-desc" style="margin:0;font-weight:700;">Product Description *</label>
            <span id="edit-prod-desc-count" style="font-size:11px;font-weight:700;color:#64748b;">${(p.description || '').trim().length} / 10 chars min</span>
          </div>
          <div style="position:relative;">
            <textarea id="edit-prod-desc" class="form-textarea" rows="3" required minlength="10" placeholder="Detailed product specifications, materials, fit and technical benefits..." style="transition:border-color 0.2s, box-shadow 0.2s, background-color 0.2s;">${escapeHtml(p.description || '')}</textarea>
          </div>
          <div id="edit-prod-desc-hint" style="font-size:11px;color:#64748b;margin-top:4px;">Detailed product specifications, materials, and benefits (minimum 10 characters) *</div>
          <div id="edit-prod-desc-error" style="display:none;margin-top:6px;padding:8px 12px;background:#fef2f2;border:1.5px solid #fecaca;border-radius:6px;color:#dc2626;font-size:12px;font-weight:700;align-items:center;gap:8px;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2.5" style="flex-shrink:0;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <span id="edit-prod-desc-error-text">A detailed product description (at least 10 characters) is required.</span>
          </div>
        </div>

        <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:18px;padding-top:14px;border-top:1px solid #e2e8f0;">
          <button type="button" class="btn btn-outline" onclick="hideModal()">Cancel</button>
          <button type="submit" id="btn-save-prod" class="btn btn-primary" style="background:#000;color:#fff;display:inline-flex;align-items:center;gap:6px;padding:9px 18px;font-weight:600;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            <span>Save Product &amp; Gallery Order</span>
          </button>
        </div>
      </form>
    `);

    function reindexImages() {
      productImages.forEach((img, i) => {
        img.order = i;
        img.isPrimary = (i === 0);
      });
      const headerThumb = document.getElementById('edit-prod-header-thumb');
      if (headerThumb && productImages[0]) {
        headerThumb.src = resolveAdminAsset(productImages[0].url);
      }
    }

    function renderGalleryList() {
      const container = document.getElementById('edit-prod-gallery-list');
      const countBadge = document.getElementById('edit-prod-gallery-count');
      if (!container) return;

      if (countBadge) {
        countBadge.textContent = `${productImages.length} Photo${productImages.length === 1 ? '' : 's'}`;
      }

      if (productImages.length === 0) {
        container.innerHTML = `
          <div style="text-align:center;padding:16px;background:#fff;border:1px dashed #cbd5e1;border-radius:6px;color:#94a3b8;font-size:12px;">
            No photos in gallery. Add photos below to showcase this product.
          </div>
        `;
        return;
      }

      container.innerHTML = productImages.map((img, idx) => {
        const isFirst = (idx === 0);
        const isLast = (idx === productImages.length - 1);
        const resolvedSrc = resolveAdminAsset(img.url);

        return `
          <div style="display:flex;align-items:center;gap:12px;background:#ffffff;border:1px solid ${isFirst ? '#86efac' : '#e2e8f0'};border-radius:8px;padding:8px 12px;box-shadow:0 1px 2px rgba(0,0,0,0.02);">
            <div style="display:flex;align-items:center;justify-content:center;min-width:32px;">
              ${isFirst
                ? `<span style="font-size:10px;font-weight:800;background:#16a34a;color:#fff;padding:3px 7px;border-radius:4px;white-space:nowrap;">★ #1 PRIMARY</span>`
                : `<span style="font-size:11px;font-weight:700;background:#f1f5f9;color:#475569;padding:3px 7px;border-radius:4px;border:1px solid #cbd5e1;">#${idx + 1}</span>`
              }
            </div>
            <img src="${resolvedSrc}" alt="Gallery ${idx + 1}" style="width:50px;height:50px;object-fit:cover;border-radius:6px;border:1px solid #cbd5e1;background:#f8fafc;" onerror="this.onerror=null;this.src='${resolveAdminAsset('6424266ea05809dff501d86e/lane4-6dbhNuWa5oI-640x640.jpg')}';" />
            <div style="flex:1;min-width:0;">
              <input type="text" class="form-input edit-gallery-alt" data-idx="${idx}" value="${escapeHtml(img.alt || '')}" placeholder="Alt text / description" style="font-size:11px;padding:4px 8px;margin-bottom:3px;height:26px;" />
              <div style="font-size:11px;color:#94a3b8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:280px;" title="${escapeHtml(img.url)}">
                ${escapeHtml(img.url)}
              </div>
            </div>
            <div style="display:flex;align-items:center;gap:4px;">
              <button type="button" class="btn btn-outline btn-gallery-up" data-idx="${idx}" ${isFirst ? 'disabled style="opacity:0.3;cursor:not-allowed;padding:5px 8px;font-size:11px;"' : 'style="padding:5px 8px;font-size:11px;cursor:pointer;"'} title="Move Earlier (Up in order)">
                ▲
              </button>
              <button type="button" class="btn btn-outline btn-gallery-down" data-idx="${idx}" ${isLast ? 'disabled style="opacity:0.3;cursor:not-allowed;padding:5px 8px;font-size:11px;"' : 'style="padding:5px 8px;font-size:11px;cursor:pointer;"'} title="Move Later (Down in order)">
                ▼
              </button>
              ${!isFirst ? `
                <button type="button" class="btn btn-outline btn-gallery-primary" data-idx="${idx}" style="padding:5px 8px;font-size:11px;color:#16a34a;border-color:#bbf7d0;background:#f0fdf4;cursor:pointer;" title="Make Primary Cover photo">
                  ★ Cover
                </button>
              ` : ''}
              <button type="button" class="btn btn-danger btn-gallery-remove" data-idx="${idx}" style="padding:5px 8px;font-size:11px;cursor:pointer;" title="Remove this photo">
                ✕
              </button>
            </div>
          </div>
        `;
      }).join('');

      // Wire buttons
      container.querySelectorAll('.btn-gallery-up').forEach(btn => {
        btn.onclick = () => {
          const idx = parseInt(btn.getAttribute('data-idx'), 10);
          if (idx > 0) {
            const temp = productImages[idx];
            productImages[idx] = productImages[idx - 1];
            productImages[idx - 1] = temp;
            reindexImages();
            renderGalleryList();
          }
        };
      });

      container.querySelectorAll('.btn-gallery-down').forEach(btn => {
        btn.onclick = () => {
          const idx = parseInt(btn.getAttribute('data-idx'), 10);
          if (idx < productImages.length - 1) {
            const temp = productImages[idx];
            productImages[idx] = productImages[idx + 1];
            productImages[idx + 1] = temp;
            reindexImages();
            renderGalleryList();
          }
        };
      });

      container.querySelectorAll('.btn-gallery-primary').forEach(btn => {
        btn.onclick = () => {
          const idx = parseInt(btn.getAttribute('data-idx'), 10);
          if (idx > 0) {
            const item = productImages.splice(idx, 1)[0];
            productImages.unshift(item);
            reindexImages();
            renderGalleryList();
            showToast('Set as primary cover photo', 'info');
          }
        };
      });

      container.querySelectorAll('.btn-gallery-remove').forEach(btn => {
        btn.onclick = () => {
          const idx = parseInt(btn.getAttribute('data-idx'), 10);
          productImages.splice(idx, 1);
          reindexImages();
          renderGalleryList();
        };
      });

      container.querySelectorAll('.edit-gallery-alt').forEach(input => {
        input.onchange = () => {
          const idx = parseInt(input.getAttribute('data-idx'), 10);
          if (productImages[idx]) {
            productImages[idx].alt = input.value.trim();
          }
        };
      });
    }

    renderGalleryList();

    // File input multi-upload
    const fileAddInput = document.getElementById('edit-prod-add-files');
    const uploadStatus = document.getElementById('edit-prod-upload-status');

    if (fileAddInput) {
      fileAddInput.onchange = async () => {
        if (!fileAddInput.files || fileAddInput.files.length === 0) return;
        const files = Array.from(fileAddInput.files);
        if (uploadStatus) uploadStatus.textContent = `Uploading ${files.length} photo(s)...`;

        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          try {
            if (uploadStatus) uploadStatus.textContent = `Uploading ${i + 1}/${files.length}: ${file.name}...`;
            const formData = new FormData();
            formData.append('image', file);
            const uploadRes = await window.lane4ApiRequest('/admin/uploads/image', {
              method: 'POST',
              body: formData
            });
            const url = uploadRes.data && (uploadRes.data.secureUrl || uploadRes.data.url);
            if (url) {
              productImages.push({
                url,
                alt: file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '),
                order: productImages.length,
                isPrimary: productImages.length === 0
              });
            }
          } catch (err) {
            showToast(`Failed to upload ${file.name}: ${err.message}`, 'error');
          }
        }
        reindexImages();
        renderGalleryList();
        if (uploadStatus) uploadStatus.textContent = `Upload complete. Total: ${productImages.length} images.`;
        fileAddInput.value = '';
        showToast(`Added ${files.length} photo(s) to gallery`, 'success');
      };
    }


    const editForm = document.getElementById('form-edit-product');
    const editDescInput = document.getElementById('edit-prod-desc');
    const editDescCount = document.getElementById('edit-prod-desc-count');
    const editDescError = document.getElementById('edit-prod-desc-error');
    const editDescErrorText = document.getElementById('edit-prod-desc-error-text');

    function updateEditDescStatus() {
      if (!editDescInput) return;
      const len = editDescInput.value.trim().length;
      if (editDescCount) {
        if (len >= 10) {
          editDescCount.innerHTML = `<span style="color:#16a34a;font-weight:700;">✓ ${len} characters</span>`;
        } else {
          editDescCount.innerHTML = `<span style="color:#64748b;">${len} / 10 chars min</span>`;
        }
      }
      if (len >= 10) {
        if (editDescError) editDescError.style.display = 'none';
        editDescInput.style.borderColor = '#cbd5e1';
        editDescInput.style.boxShadow = '';
        editDescInput.style.backgroundColor = '#ffffff';
      }
    }
    if (editDescInput) {
      editDescInput.addEventListener('input', updateEditDescStatus);
      updateEditDescStatus();
    }

    function pointToEditDesc(message) {
      if (!editDescInput) return;
      editDescInput.style.borderColor = '#dc2626';
      editDescInput.style.boxShadow = '0 0 0 4px rgba(220, 38, 38, 0.18)';
      editDescInput.style.backgroundColor = '#fff5f5';

      if (editDescError && editDescErrorText) {
        editDescErrorText.textContent = message || 'A detailed product description (at least 10 characters) is required.';
        editDescError.style.display = 'flex';
      }

      editDescInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => {
        try { editDescInput.focus(); } catch (e) {}
      }, 100);
    }

    if (editForm) {
      editForm.onsubmit = async (e) => {
        e.preventDefault();
        const saveBtn = document.getElementById('btn-save-prod');
        if (saveBtn) {
          saveBtn.disabled = true;
          saveBtn.textContent = 'Saving...';
        }

        const regularPrice = parseFloat(document.getElementById('edit-prod-regular').value);
        const saleVal = document.getElementById('edit-prod-sale').value.trim();
        const salePrice = saleVal ? parseFloat(saleVal) : null;
        const stockQuantity = parseInt(document.getElementById('edit-prod-stock').value, 10);
        const name = document.getElementById('edit-prod-name').value.trim();
        const category = document.getElementById('edit-prod-cat').value;
        const isPublished = document.getElementById('edit-prod-status').value === 'published';
        const shortDescription = document.getElementById('edit-prod-short-desc').value.trim();
        const description = editDescInput ? editDescInput.value.trim() : '';

        if (!name || name.length < 3) {
          if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Save Product & Gallery Order'; }
          const nameEl = document.getElementById('edit-prod-name');
          if (nameEl) {
            nameEl.style.borderColor = '#dc2626';
            nameEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            nameEl.focus();
          }
          showToast('Product name is required (at least 3 characters).', 'error');
          return;
        }
        if (!regularPrice || isNaN(regularPrice) || regularPrice <= 0) {
          if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Save Product & Gallery Order'; }
          const regEl = document.getElementById('edit-prod-regular');
          if (regEl) {
            regEl.style.borderColor = '#dc2626';
            regEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            regEl.focus();
          }
          showToast('A valid regular price greater than ₹0 is required.', 'error');
          return;
        }
        if (!saleVal || isNaN(salePrice) || salePrice <= 0) {
          if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Save Product & Gallery Order'; }
          const saleEl = document.getElementById('edit-prod-sale');
          if (saleEl) {
            saleEl.style.borderColor = '#dc2626';
            saleEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            saleEl.focus();
          }
          showToast('A valid discounted sale price greater than ₹0 is required.', 'error');
          return;
        }
        if (salePrice > regularPrice) {
          if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Save Product & Gallery Order'; }
          const saleEl = document.getElementById('edit-prod-sale');
          if (saleEl) {
            saleEl.style.borderColor = '#dc2626';
            saleEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            saleEl.focus();
          }
          showToast(`Sale price (₹${salePrice}) cannot exceed regular price (₹${regularPrice}).`, 'error');
          return;
        }
        if (!description || description.length < 10) {
          if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Save Product & Gallery Order'; }
          pointToEditDesc('A detailed product description (at least 10 characters) is required.');
          return;
        }
        if (!productImages || productImages.length === 0) {
          if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Save Product & Gallery Order'; }
          showToast('At least one product photo is required. Please upload an image before saving.', 'error');
          return;
        }

        try {
          const formattedImages = productImages.map((img, i) => ({
            url: img.url,
            alt: img.alt || name,
            order: i,
            isPrimary: i === 0
          }));

          const patchPayload = {
            name,
            category,
            regularPrice,
            salePrice,
            stockQuantity,
            isPublished,
            shortDescription,
            description,
            images: formattedImages
          };
          if (formattedImages.length > 0) {
            patchPayload.imageUrl = formattedImages[0].url;
          }

          await window.lane4ApiRequest(`/admin/products/${productId}`, {
            method: 'PATCH',
            body: JSON.stringify(patchPayload)
          });
          hideModal();
          showToast(`Prices, details, and gallery for "${name}" updated successfully!`, 'success');
          await loadProducts();
        } catch (err) {
          if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = 'Save Product & Gallery Order';
          }
          const errMsg = err.message || 'Failed to update product';
          if (/description/i.test(errMsg)) {
            pointToEditDesc(errMsg);
            return;
          }
          showToast(errMsg, 'error');
        }
      };
    }
  };

  async function openAddProductModal() {
    let catOptions = '<option value="training-gear">Training Gear</option><option value="goggles">Goggles</option><option value="racing-caps">Racing Caps</option><option value="swimwear">Swimwear</option><option value="accessories">Accessories</option>';
    try {
      const res = await window.lane4ApiRequest('/admin/categories');
      if (res && res.data && res.data.length > 0) {
        catOptions = res.data.map(c => `<option value="${c.slug}">${c.name}</option>`).join('');
      }
    } catch (e) {}

    let newProductImages = [];

    const formHtml = `
      <form id="form-create-product">
        <div class="form-row">
          <div class="form-group" style="flex:2;">
            <label class="form-label">Product Name *</label>
            <input type="text" id="new-prod-name" class="form-input" placeholder="e.g. Hydro-Dynamic Hand Paddles" required />
          </div>
          <div class="form-group" style="flex:1;">
            <label class="form-label">SKU</label>
            <input type="text" id="new-prod-sku" class="form-input" placeholder="e.g. L4-PAD-001" />
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Category *</label>
            <select id="new-prod-category" class="form-select" required>
              ${catOptions}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Regular Price (₹ INR) *</label>
            <input type="number" id="new-prod-price" class="form-input" placeholder="1999" min="1" step="1" required />
          </div>
          <div class="form-group">
            <label class="form-label" style="font-weight:700;">Sale Price (₹ INR) <span style="color:#dc2626;">*</span></label>
            <input type="number" id="new-prod-sale-price" class="form-input" placeholder="e.g. 1799" min="1" step="1" required />
            <div style="font-size:11px;color:#16a34a;margin-top:3px;font-weight:600;">Discounted checkout price (must be less than regular price) *</div>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" style="font-weight:700;">Short Tagline / Subtitle <span style="color:#dc2626;">*</span></label>
          <input type="text" id="new-prod-short-desc" class="form-input" placeholder="e.g. Pool-tested resistance paddles for upper-body stroke strength" required minlength="3" />
        </div>

        <div class="form-group" id="group-new-prod-desc">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
            <label class="form-label" for="new-prod-desc" style="margin:0;font-weight:700;">Full Product Description <span style="color:#dc2626;">*</span></label>
            <span id="new-prod-desc-count" style="font-size:11px;font-weight:700;color:#64748b;">0 / 10 chars min</span>
          </div>
          <div style="position:relative;">
            <textarea id="new-prod-desc" class="form-textarea" rows="3" placeholder="Detailed product specifications, materials, fit and technical benefits..." required minlength="10" style="transition:border-color 0.2s, box-shadow 0.2s, background-color 0.2s;"></textarea>
          </div>
          <div id="new-prod-desc-hint" style="font-size:11px;color:#64748b;margin-top:4px;">Detailed specifications, materials, and benefits (minimum 10 characters) *</div>
          <div id="new-prod-desc-error" style="display:none;margin-top:6px;padding:8px 12px;background:#fef2f2;border:1.5px solid #fecaca;border-radius:6px;color:#dc2626;font-size:12px;font-weight:700;align-items:center;gap:8px;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2.5" style="flex-shrink:0;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <span id="new-prod-desc-error-text">A detailed product description (at least 10 characters) is required to publish.</span>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Key Features (One feature per line)</label>
          <textarea id="new-prod-features" class="form-textarea" rows="3" placeholder="Ergonomic contoured profile&#10;Chlorine-resistant durable silicone straps&#10;Hydrodynamic flow holes to maintain water feel"></textarea>
        </div>

        <!-- Product Image Gallery & Order Section -->
        <div class="form-group" style="background:#f8fafc;padding:16px;border-radius:8px;border:1.5px solid #cbd5e1;margin-bottom:18px;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
            <label class="form-label" style="display:flex;align-items:center;gap:6px;margin:0;font-size:14px;font-weight:800;color:#0f172a;">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
              <span>Product Image Gallery &amp; Display Order <span style="color:#dc2626;">*</span></span>
            </label>
            <span id="new-prod-gallery-count" class="badge" style="background:#0f172a;color:#fff;font-weight:700;">0 Photos</span>
          </div>
          <div style="font-size:12px;color:#dc2626;font-weight:700;margin-bottom:12px;background:#fef2f2;border:1px solid #fecaca;padding:8px 12px;border-radius:6px;line-height:1.4;">
            <span style="font-size:14px;margin-right:4px;">⚠️</span> <strong>Mandatory:</strong> At least one product photo must be uploaded. Products cannot be added without an image. Photo <strong>#1 PRIMARY</strong> will be the main storefront cover image.
          </div>

          <div id="new-prod-gallery-list" style="display:flex;flex-direction:column;gap:8px;margin-bottom:14px;"></div>

          <div style="background:#ffffff;border:1.5px dashed #cbd5e1;border-radius:8px;padding:12px 14px;">
            <div style="font-size:12px;font-weight:700;color:#0f172a;margin-bottom:8px;display:flex;align-items:center;gap:6px;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              <span>Upload Product Photos</span>
            </div>
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">
              <input type="file" id="new-prod-image-file" multiple accept="image/png,image/jpeg,image/webp" style="font-size:12px;flex:1;" />
            </div>
            <div id="new-prod-upload-status" style="font-size:11px;color:#64748b;">Select JPG, PNG, or WebP files to add to gallery. Multiple files supported.</div>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Initial Stock Quantity *</label>
            <input type="number" id="new-prod-stock" class="form-input" value="50" min="0" required />
          </div>
          <div class="form-group" style="display:flex;align-items:center;gap:16px;padding-top:24px;">
            <label style="display:inline-flex;align-items:center;gap:8px;font-size:13px;font-weight:700;cursor:pointer;">
              <input type="checkbox" id="new-prod-published" checked style="width:18px;height:18px;" />
              <span>Publish to Store Immediately</span>
            </label>
          </div>
        </div>

        <div id="modal-submit-alert" style="display:none;padding:10px 14px;border-radius:6px;font-size:13px;margin-bottom:14px;"></div>

        <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:20px;">
          <button type="button" class="btn btn-outline" onclick="document.getElementById('admin-modal-close-btn').click()">Cancel</button>
          <button type="submit" id="btn-save-product-submit" class="btn" style="background:#000;color:#fff;min-width:140px;justify-content:center;">Save &amp; Publish</button>
        </div>
      </form>
    `;

    showModal('Add New Product to Catalog', formHtml);

    function reindexNewImages() {
      newProductImages.forEach((img, i) => {
        img.order = i;
        img.isPrimary = (i === 0);
      });
    }

    function renderNewGalleryList() {
      const container = document.getElementById('new-prod-gallery-list');
      const countBadge = document.getElementById('new-prod-gallery-count');
      if (!container) return;

      if (countBadge) {
        countBadge.textContent = `${newProductImages.length} Photo${newProductImages.length === 1 ? '' : 's'}`;
      }

      if (newProductImages.length === 0) {
        container.innerHTML = `
          <div style="text-align:center;padding:16px;background:#fff;border:1px dashed #cbd5e1;border-radius:6px;color:#94a3b8;font-size:12px;">
            No photos added yet. Select photos below to build this product's gallery.
          </div>
        `;
        return;
      }

      container.innerHTML = newProductImages.map((img, idx) => {
        const isFirst = (idx === 0);
        const isLast = (idx === newProductImages.length - 1);
        const resolvedSrc = resolveAdminAsset(img.url);

        return `
          <div style="display:flex;align-items:center;gap:12px;background:#ffffff;border:1px solid ${isFirst ? '#86efac' : '#e2e8f0'};border-radius:8px;padding:8px 12px;box-shadow:0 1px 2px rgba(0,0,0,0.02);">
            <div style="display:flex;align-items:center;justify-content:center;min-width:32px;">
              ${isFirst
                ? `<span style="font-size:10px;font-weight:800;background:#16a34a;color:#fff;padding:3px 7px;border-radius:4px;white-space:nowrap;">★ #1 PRIMARY</span>`
                : `<span style="font-size:11px;font-weight:700;background:#f1f5f9;color:#475569;padding:3px 7px;border-radius:4px;border:1px solid #cbd5e1;">#${idx + 1}</span>`
              }
            </div>
            <img src="${resolvedSrc}" alt="Gallery ${idx + 1}" style="width:50px;height:50px;object-fit:cover;border-radius:6px;border:1px solid #cbd5e1;background:#f8fafc;" onerror="this.onerror=null;this.src='${resolveAdminAsset('6424266ea05809dff501d86e/lane4-6dbhNuWa5oI-640x640.jpg')}';" />
            <div style="flex:1;min-width:0;">
              <input type="text" class="form-input new-gallery-alt" data-idx="${idx}" value="${escapeHtml(img.alt || '')}" placeholder="Alt text / description" style="font-size:11px;padding:4px 8px;margin-bottom:3px;height:26px;" />
              <div style="font-size:11px;color:#94a3b8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:280px;" title="${escapeHtml(img.url)}">
                ${escapeHtml(img.url)}
              </div>
            </div>
            <div style="display:flex;align-items:center;gap:4px;">
              <button type="button" class="btn btn-outline btn-new-gallery-up" data-idx="${idx}" ${isFirst ? 'disabled style="opacity:0.3;cursor:not-allowed;padding:5px 8px;font-size:11px;"' : 'style="padding:5px 8px;font-size:11px;cursor:pointer;"'} title="Move Earlier (Up)">
                ▲
              </button>
              <button type="button" class="btn btn-outline btn-new-gallery-down" data-idx="${idx}" ${isLast ? 'disabled style="opacity:0.3;cursor:not-allowed;padding:5px 8px;font-size:11px;"' : 'style="padding:5px 8px;font-size:11px;cursor:pointer;"'} title="Move Later (Down)">
                ▼
              </button>
              ${!isFirst ? `
                <button type="button" class="btn btn-outline btn-new-gallery-primary" data-idx="${idx}" style="padding:5px 8px;font-size:11px;color:#16a34a;border-color:#bbf7d0;background:#f0fdf4;cursor:pointer;" title="Set as primary cover image">
                  ★ Cover
                </button>
              ` : ''}
              <button type="button" class="btn btn-danger btn-new-gallery-remove" data-idx="${idx}" style="padding:5px 8px;font-size:11px;cursor:pointer;" title="Remove this photo">
                ✕
              </button>
            </div>
          </div>
        `;
      }).join('');

      container.querySelectorAll('.btn-new-gallery-up').forEach(btn => {
        btn.onclick = () => {
          const idx = parseInt(btn.getAttribute('data-idx'), 10);
          if (idx > 0) {
            const temp = newProductImages[idx];
            newProductImages[idx] = newProductImages[idx - 1];
            newProductImages[idx - 1] = temp;
            reindexNewImages();
            renderNewGalleryList();
          }
        };
      });

      container.querySelectorAll('.btn-new-gallery-down').forEach(btn => {
        btn.onclick = () => {
          const idx = parseInt(btn.getAttribute('data-idx'), 10);
          if (idx < newProductImages.length - 1) {
            const temp = newProductImages[idx];
            newProductImages[idx] = newProductImages[idx + 1];
            newProductImages[idx + 1] = temp;
            reindexNewImages();
            renderNewGalleryList();
          }
        };
      });

      container.querySelectorAll('.btn-new-gallery-primary').forEach(btn => {
        btn.onclick = () => {
          const idx = parseInt(btn.getAttribute('data-idx'), 10);
          if (idx > 0) {
            const item = newProductImages.splice(idx, 1)[0];
            newProductImages.unshift(item);
            reindexNewImages();
            renderNewGalleryList();
            showToast('Set as primary cover image', 'info');
          }
        };
      });

      container.querySelectorAll('.btn-new-gallery-remove').forEach(btn => {
        btn.onclick = () => {
          const idx = parseInt(btn.getAttribute('data-idx'), 10);
          newProductImages.splice(idx, 1);
          reindexNewImages();
          renderNewGalleryList();
        };
      });

      container.querySelectorAll('.new-gallery-alt').forEach(input => {
        input.onchange = () => {
          const idx = parseInt(input.getAttribute('data-idx'), 10);
          if (newProductImages[idx]) {
            newProductImages[idx].alt = input.value.trim();
          }
        };
      });
    }

    renderNewGalleryList();

    // Multi file upload handler
    const fileInput = document.getElementById('new-prod-image-file');
    const uploadStatus = document.getElementById('new-prod-upload-status');

    if (fileInput) {
      fileInput.onchange = async () => {
        if (!fileInput.files || fileInput.files.length === 0) return;
        const files = Array.from(fileInput.files);
        if (uploadStatus) uploadStatus.textContent = `Uploading ${files.length} photo(s)...`;

        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          try {
            if (uploadStatus) uploadStatus.textContent = `Uploading ${i + 1}/${files.length}: ${file.name}...`;
            const formData = new FormData();
            formData.append('image', file);
            const uploadRes = await window.lane4ApiRequest('/admin/uploads/image', {
              method: 'POST',
              body: formData
            });
            const url = uploadRes.data && (uploadRes.data.secureUrl || uploadRes.data.url);
            if (url) {
              newProductImages.push({
                url,
                alt: file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '),
                order: newProductImages.length,
                isPrimary: newProductImages.length === 0
              });
            }
          } catch (err) {
            showToast(`Failed to upload ${file.name}: ${err.message}`, 'error');
          }
        }
        reindexNewImages();
        renderNewGalleryList();
        if (uploadStatus) uploadStatus.textContent = `Upload complete. Total: ${newProductImages.length} images.`;
        fileInput.value = '';
        showToast(`Added ${files.length} photo(s) to gallery`, 'success');
      };
    }


    // Live validation & pointing for Full Product Description
    const newDescInput = document.getElementById('new-prod-desc');
    const newDescCount = document.getElementById('new-prod-desc-count');
    const newDescError = document.getElementById('new-prod-desc-error');
    const newDescErrorText = document.getElementById('new-prod-desc-error-text');

    function updateNewDescStatus() {
      if (!newDescInput) return;
      const len = newDescInput.value.trim().length;
      if (newDescCount) {
        if (len >= 10) {
          newDescCount.innerHTML = `<span style="color:#16a34a;font-weight:700;">✓ ${len} characters</span>`;
        } else {
          newDescCount.innerHTML = `<span style="color:#64748b;">${len} / 10 chars min</span>`;
        }
      }
      if (len >= 10) {
        if (newDescError) newDescError.style.display = 'none';
        newDescInput.style.borderColor = '#cbd5e1';
        newDescInput.style.boxShadow = '';
        newDescInput.style.backgroundColor = '#ffffff';
      }
    }

    if (newDescInput) {
      newDescInput.addEventListener('input', updateNewDescStatus);
      updateNewDescStatus();
    }

    function pointToNewDesc(message) {
      if (!newDescInput) return;
      newDescInput.style.borderColor = '#dc2626';
      newDescInput.style.boxShadow = '0 0 0 4px rgba(220, 38, 38, 0.18)';
      newDescInput.style.backgroundColor = '#fff5f5';

      if (newDescError && newDescErrorText) {
        newDescErrorText.textContent = message || 'A detailed product description (at least 10 characters) is required to publish.';
        newDescError.style.display = 'flex';
      }

      // Hide the detached bottom alert box
      const alertBox = document.getElementById('modal-submit-alert');
      if (alertBox) {
        alertBox.style.display = 'none';
        alertBox.textContent = '';
      }

      // Scroll modal smoothly to the description field and focus it
      newDescInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => {
        try { newDescInput.focus(); } catch (e) {}
      }, 100);
    }

    // Submit handler
    const form = document.getElementById('form-create-product');
    form.onsubmit = async (e) => {
      e.preventDefault();
      const submitBtn = document.getElementById('btn-save-product-submit');
      const alertBox = document.getElementById('modal-submit-alert');

      submitBtn.disabled = true;
      submitBtn.textContent = 'Saving Product...';
      if (alertBox) alertBox.style.display = 'none';

      try {
        const name = document.getElementById('new-prod-name').value.trim();
        const sku = document.getElementById('new-prod-sku').value.trim();
        const category = document.getElementById('new-prod-category').value;
        const regPrice = parseFloat(document.getElementById('new-prod-price').value);
        const salePriceVal = document.getElementById('new-prod-sale-price').value.trim();
        const salePrice = salePriceVal ? parseFloat(salePriceVal) : null;
        const shortDescription = document.getElementById('new-prod-short-desc').value.trim();
        const description = newDescInput ? newDescInput.value.trim() : '';
        const featuresText = document.getElementById('new-prod-features').value;
        const stockQty = parseInt(document.getElementById('new-prod-stock').value, 10) || 50;
        const isPublished = document.getElementById('new-prod-published').checked;

        if (!name || name.length < 3) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Save & Publish';
          const nameEl = document.getElementById('new-prod-name');
          if (nameEl) {
            nameEl.style.borderColor = '#dc2626';
            nameEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            nameEl.focus();
          }
          showToast('Product name is required (at least 3 characters).', 'error');
          return;
        }
        if (!regPrice || isNaN(regPrice) || regPrice <= 0) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Save & Publish';
          const regEl = document.getElementById('new-prod-price');
          if (regEl) {
            regEl.style.borderColor = '#dc2626';
            regEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            regEl.focus();
          }
          showToast('A valid regular price greater than ₹0 is required.', 'error');
          return;
        }
        if (!salePriceVal || isNaN(salePrice) || salePrice <= 0) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Save & Publish';
          const saleEl = document.getElementById('new-prod-sale-price');
          if (saleEl) {
            saleEl.style.borderColor = '#dc2626';
            saleEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            saleEl.focus();
          }
          showToast('A valid discounted sale price greater than ₹0 is required.', 'error');
          return;
        }
        if (salePrice > regPrice) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Save & Publish';
          const saleEl = document.getElementById('new-prod-sale-price');
          if (saleEl) {
            saleEl.style.borderColor = '#dc2626';
            saleEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            saleEl.focus();
          }
          showToast(`Sale price (₹${salePrice}) cannot exceed regular price (₹${regPrice}).`, 'error');
          return;
        }
        if (!shortDescription || shortDescription.length < 3) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Save & Publish';
          const shortEl = document.getElementById('new-prod-short-desc');
          if (shortEl) {
            shortEl.style.borderColor = '#dc2626';
            shortEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            shortEl.focus();
          }
          showToast('Short tagline / subtitle is required (at least 3 characters).', 'error');
          return;
        }
        if (!description || description.length < 10) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Save & Publish';
          pointToNewDesc('A detailed product description (at least 10 characters) is required to publish.');
          return;
        }

        if (!newProductImages || newProductImages.length === 0) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Save & Publish';
          const fileInput = document.getElementById('new-prod-image-file');
          if (fileInput) {
            fileInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
            fileInput.focus();
          }
          showToast('Please upload at least one product photo before saving.', 'error');
          return;
        }

        const formattedImages = newProductImages.map((img, i) => ({
          url: img.url,
          alt: img.alt || name,
          order: i,
          isPrimary: i === 0
        }));

        const features = featuresText.split('\n').map(f => f.trim()).filter(Boolean);

        submitBtn.textContent = 'Saving to Database...';
        const productPayload = {
          name,
          sku: sku || undefined,
          category,
          categorySlug: category,
          regularPrice: regPrice,
          salePrice: salePrice,
          shortDescription,
          description,
          features,
          images: formattedImages,
          imageUrl: formattedImages[0].url,
          stockQuantity: stockQty,
          isPublished
        };

        const createRes = await window.lane4ApiRequest('/admin/products', {
          method: 'POST',
          body: JSON.stringify(productPayload)
        });

        hideModal();
        showToast('Product created successfully & published to store!');
        loadProducts();

      } catch (err) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Save & Publish';
        const errMsg = err.message || 'Failed to create product.';

        // If error relates to product description, point directly to description field and hide the bottom alert
        if (/description/i.test(errMsg)) {
          pointToNewDesc(errMsg);
          return;
        }

        if (/name/i.test(errMsg)) {
          const nameEl = document.getElementById('new-prod-name');
          if (nameEl) {
            nameEl.style.borderColor = '#dc2626';
            nameEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            nameEl.focus();
          }
          showToast(errMsg, 'error');
          return;
        }

        if (/price/i.test(errMsg)) {
          const priceEl = document.getElementById('new-prod-sale-price') || document.getElementById('new-prod-price');
          if (priceEl) {
            priceEl.style.borderColor = '#dc2626';
            priceEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            priceEl.focus();
          }
          showToast(errMsg, 'error');
          return;
        }

        if (alertBox) {
          alertBox.style.display = 'block';
          alertBox.style.background = '#fef2f2';
          alertBox.style.color = '#dc2626';
          alertBox.textContent = errMsg;
        } else {
          showToast(errMsg, 'error');
        }
      }
    };
  }

  async function deleteProduct(id, name) {
    const confirmed = await showThemedConfirm({
      title: 'Archive Product',
      message: `Are you sure you want to archive product <strong>"${name}"</strong>? It will be removed from the public storefront catalog immediately.`,
      confirmText: 'Archive Product',
      isDanger: true
    });
    if (!confirmed) return;

    try {
      await window.lane4ApiRequest(`/admin/products/${id}`, {
        method: 'DELETE'
      });
      showToast('Product archived successfully.');
      loadProducts();
    } catch (err) {
      showToast(err.message || 'Error deleting product', 'error');
    }
  }

  // --- CATEGORIES MANAGEMENT ---
  async function loadCategories() {
    const container = document.getElementById('view-categories');
    if (!container) return;
    if (!container.children.length) {
      container.innerHTML = getSkeletonHtml('table');
    }
    showTopLoader();

    try {
      const res = await window.lane4ApiRequest('/admin/categories');
      const cats = res.data || [];

      // Sort categories by displayOrder ascending, breaking ties cleanly by name
      cats.sort((a, b) => {
        const orderDiff = (parseInt(a.displayOrder, 10) || 99) - (parseInt(b.displayOrder, 10) || 99);
        if (orderDiff !== 0) return orderDiff;
        return (a.name || '').localeCompare(b.name || '');
      });
      window.currentCategories = cats;

      container.innerHTML = `
        <div class="card">
          <div class="card-header" style="flex-wrap:wrap;gap:12px;">
            <div class="card-title">Categories &amp; Navigation (${cats.length})</div>
            <button class="btn" id="btn-add-category" style="background:#000;color:#fff;display:inline-flex;align-items:center;gap:6px;">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              <span>Add New Category</span>
            </button>
          </div>
          <div class="card-body" style="padding:0;">
            <div class="table-responsive">
              <table>
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Category Name</th>
                    <th>Slug</th>
                    <th>Description</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  ${cats.length === 0 ? '<tr><td colspan="6" style="text-align:center;padding:24px;color:#888;">No categories found.</td></tr>' :
                    cats.map((c, idx) => `
                      <tr>
                        <td><strong>#${idx + 1}</strong></td>
                        <td><strong style="color:#0f172a;">${c.name}</strong></td>
                        <td><code>${c.slug}</code></td>
                        <td style="color:#64748b;font-size:13px;max-width:300px;">${c.description || '—'}</td>
                        <td><span class="badge ${c.isPublished ? 'badge-active' : 'badge-pending'}">${c.isPublished ? 'Published' : 'Draft'}</span></td>
                        <td>
                          <div style="display:flex;gap:6px;">
                            <a href="../category/${c.slug}.html" target="_blank" class="btn btn-outline" style="padding:5px 9px;font-size:11px;text-decoration:none;display:inline-flex;align-items:center;gap:4px;">
                              <span>View</span>
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                            </a>
                            <button class="btn btn-danger btn-del-cat" data-id="${c.id}" data-name="${c.name.replace(/"/g, '&quot;')}" style="padding:5px 9px;font-size:11px;display:inline-flex;align-items:center;gap:4px;">
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                              <span>Delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;

      // Hook Add Category Button
      const addBtn = document.getElementById('btn-add-category');
      if (addBtn) addBtn.onclick = openAddCategoryModal;

      // Hook Delete buttons
      container.querySelectorAll('.btn-del-cat').forEach(btn => {
        btn.onclick = () => {
          const id = btn.getAttribute('data-id');
          const name = btn.getAttribute('data-name');
          deleteCategory(id, name);
        };
      });

    } catch (err) {
      container.innerHTML = `<p style="color:#ef4444;padding:20px;">Error loading categories: ${err.message}</p>`;
    } finally {
      hideTopLoader();
    }
  }

  function openAddCategoryModal() {
    const maxOrder = (window.currentCategories || []).reduce((max, c) => Math.max(max, parseInt(c.computedOrder || c.displayOrder, 10) || 0), 0);
    const nextOrder = maxOrder + 1;

    const formHtml = `
      <form id="form-create-category">
        <div class="form-row">
          <div class="form-group" style="flex:2;">
            <label class="form-label">Category Name *</label>
            <input type="text" id="new-cat-name" class="form-input" placeholder="e.g. Training Fins &amp; Paddles" required />
          </div>
          <div class="form-group" style="flex:1;">
            <label class="form-label">Display Order</label>
            <input type="number" id="new-cat-order" class="form-input" value="${nextOrder}" min="1" />
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">URL Slug (Auto-generated)</label>
          <input type="text" id="new-cat-slug" class="form-input" placeholder="training-fins-paddles" />
        </div>

        <div class="form-group">
          <label class="form-label">Description</label>
          <textarea id="new-cat-desc" class="form-textarea" rows="3" placeholder="Category overview shown in search and SEO meta tags..."></textarea>
        </div>

        <div class="form-group" style="margin-top:14px;">
          <label style="display:inline-flex;align-items:center;gap:8px;font-size:13px;font-weight:700;cursor:pointer;">
            <input type="checkbox" id="new-cat-published" checked style="width:18px;height:18px;" />
            <span>Publish Category on Storefront</span>
          </label>
        </div>

        <div id="modal-cat-alert" style="display:none;padding:10px 14px;border-radius:6px;font-size:13px;margin-bottom:14px;"></div>

        <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:20px;">
          <button type="button" class="btn btn-outline" onclick="document.getElementById('admin-modal-close-btn').click()">Cancel</button>
          <button type="submit" id="btn-save-cat-submit" class="btn" style="background:#000;color:#fff;min-width:140px;justify-content:center;">Create Category</button>
        </div>
      </form>
    `;

    showModal('Add New Category', formHtml);

    // Auto slug generation
    const nameInput = document.getElementById('new-cat-name');
    const slugInput = document.getElementById('new-cat-slug');
    if (nameInput && slugInput) {
      nameInput.oninput = () => {
        slugInput.value = nameInput.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      };
    }

    // Submit handler
    const form = document.getElementById('form-create-category');
    form.onsubmit = async (e) => {
      e.preventDefault();
      const submitBtn = document.getElementById('btn-save-cat-submit');
      const alertBox = document.getElementById('modal-cat-alert');

      submitBtn.disabled = true;
      submitBtn.textContent = 'Creating...';
      alertBox.style.display = 'none';

      try {
        const name = nameInput.value.trim();
        const slug = slugInput.value.trim();
        const defaultOrder = (window.currentCategories || []).length + 1;
        const displayOrder = parseInt(document.getElementById('new-cat-order').value, 10) || defaultOrder;
        const description = document.getElementById('new-cat-desc').value.trim();
        const isPublished = document.getElementById('new-cat-published').checked;

        await window.lane4ApiRequest('/admin/categories', {
          method: 'POST',
          body: JSON.stringify({ name, slug, displayOrder, description, isPublished })
        });

        hideModal();
        showToast('Category created & storefront page generated!');
        loadCategories();

      } catch (err) {
        alertBox.style.display = 'block';
        alertBox.style.background = '#fef2f2';
        alertBox.style.color = '#dc2626';
        alertBox.textContent = err.message || 'Failed to create category.';
        submitBtn.disabled = false;
        submitBtn.textContent = 'Create Category';
      }
    };
  }

  async function deleteCategory(id, name) {
    const confirmed = await showThemedConfirm({
      title: 'Delete Category',
      message: `Are you sure you want to delete category <strong>"${name}"</strong>? Products in this category may need reassigning.`,
      confirmText: 'Delete Category',
      isDanger: true
    });
    if (!confirmed) return;

    try {
      await window.lane4ApiRequest(`/admin/categories/${id}`, {
        method: 'DELETE'
      });
      showToast('Category deleted successfully.');
      loadCategories();
    } catch (err) {
      showToast(err.message || 'Error deleting category', 'error');
    }
  }

  // --- COUPONS MANAGEMENT ---
  async function loadCoupons() {
    const container = document.getElementById('view-coupons');
    if (!container) return;
    if (!container.children.length) {
      container.innerHTML = getSkeletonHtml('table');
    }
    showTopLoader();

    try {
      const res = await window.lane4ApiRequest('/admin/coupons');
      const coupons = res.data || [];

      container.innerHTML = `
        <div class="card">
          <div class="card-header" style="flex-wrap:wrap;gap:12px;">
            <div class="card-title">Promotional Coupons (${coupons.length})</div>
            <button class="btn" id="btn-add-coupon" style="background:#000;color:#fff;display:inline-flex;align-items:center;gap:6px;">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              <span>Add New Coupon</span>
            </button>
          </div>
          <div class="card-body" style="padding:0;">
            <div class="table-responsive">
              <table>
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Discount</th>
                    <th>Min Order</th>
                    <th>Usage / Limit</th>
                    <th>Expiry Date</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  ${coupons.length === 0 ? '<tr><td colspan="7" style="text-align:center;padding:24px;color:#888;">No coupons created yet.</td></tr>' :
                    coupons.map(cp => {
                      const discountStr = cp.discountType === 'percentage' 
                        ? `${cp.discountValue}% OFF` 
                        : `${window.LANE4.formatINR(cp.discountValue)} OFF`;

                      const expiryStr = cp.expiryDate ? formatDateTime(cp.expiryDate, true) : 'No expiry';

                      const isExhausted = Boolean(cp.isExhausted || (cp.totalUsageLimit && (cp.usedCount || 0) >= cp.totalUsageLimit));
                      const isEffectiveActive = Boolean(cp.isActive && !isExhausted);

                      return `
                        <tr>
                          <td><code style="background:#f1f5f9;padding:4px 8px;border-radius:4px;font-weight:900;letter-spacing:1px;color:#0f172a;">${cp.code}</code></td>
                          <td style="font-weight:700;color:#16a34a;">${discountStr}</td>
                          <td>${cp.minOrderFormatted || '₹ 0.00'}</td>
                          <td>${cp.usedCount || 0} / ${cp.totalUsageLimit || '∞'} redemptions</td>
                          <td style="font-size:12px;color:#64748b;">${expiryStr}</td>
                          <td><span class="badge ${isEffectiveActive ? 'badge-active' : 'badge-rejected'}">${isEffectiveActive ? 'Active' : (isExhausted ? 'Inactive (Exhausted)' : 'Inactive')}</span></td>
                          <td>
                            <button class="btn btn-danger btn-del-coupon" data-code="${cp.code}" style="padding:5px 9px;font-size:11px;display:inline-flex;align-items:center;gap:4px;">
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                              <span>Delete</span>
                            </button>
                          </td>
                        </tr>
                      `;
                    }).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;

      // Hook Add Coupon Button
      const addBtn = document.getElementById('btn-add-coupon');
      if (addBtn) addBtn.onclick = openAddCouponModal;

      // Hook Delete buttons
      container.querySelectorAll('.btn-del-coupon').forEach(btn => {
        btn.onclick = () => {
          const code = btn.getAttribute('data-code');
          deleteCoupon(code);
        };
      });

    } catch (err) {
      container.innerHTML = `<p style="color:#ef4444;padding:20px;">Error loading coupons: ${err.message}</p>`;
    } finally {
      hideTopLoader();
    }
  }

  function openAddCouponModal() {
    const formHtml = `
      <form id="form-create-coupon">
        <div class="form-row">
          <div class="form-group" style="flex:1;">
            <label class="form-label">Coupon Promo Code *</label>
            <input type="text" id="new-cp-code" class="form-input" placeholder="e.g. SWIMCHAMP20" style="text-transform:uppercase;font-weight:700;letter-spacing:1px;" required />
          </div>
          <div class="form-group" style="flex:1;">
            <label class="form-label">Discount Type *</label>
            <select id="new-cp-type" class="form-select" required>
              <option value="percentage">Percentage Discount (%)</option>
              <option value="fixed_amount">Fixed Amount Discount (₹ INR)</option>
            </select>
          </div>
          <div class="form-group" style="flex:1;">
            <label class="form-label">Discount Value *</label>
            <input type="number" id="new-cp-value" class="form-input" placeholder="20" min="1" step="1" required />
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Description / Offer Details</label>
          <input type="text" id="new-cp-desc" class="form-input" placeholder="e.g. 20% off for all state swim meet competitors" />
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Minimum Order Value (₹ INR)</label>
            <input type="number" id="new-cp-min-order" class="form-input" value="999" min="0" step="1" />
          </div>
          <div class="form-group">
            <label class="form-label">Max Discount Cap (₹ INR, optional)</label>
            <input type="number" id="new-cp-max-discount" class="form-input" placeholder="500" min="0" step="1" />
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Expiration Date</label>
            <input type="date" id="new-cp-expiry" class="form-input" value="2030-12-31" />
          </div>
          <div class="form-group">
            <label class="form-label">Total Usage Limit</label>
            <input type="number" id="new-cp-limit" class="form-input" value="1000" min="1" />
          </div>
        </div>

        <div class="form-group" style="margin-top:14px;">
          <label style="display:inline-flex;align-items:center;gap:8px;font-size:13px;font-weight:700;cursor:pointer;">
            <input type="checkbox" id="new-cp-active" checked style="width:18px;height:18px;" />
            <span>Enable Coupon Code Immediately</span>
          </label>
        </div>

        <div id="modal-cp-alert" style="display:none;padding:10px 14px;border-radius:6px;font-size:13px;margin-bottom:14px;"></div>

        <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:20px;">
          <button type="button" class="btn btn-outline" onclick="document.getElementById('admin-modal-close-btn').click()">Cancel</button>
          <button type="submit" id="btn-save-cp-submit" class="btn" style="background:#000;color:#fff;min-width:140px;justify-content:center;">Create Coupon</button>
        </div>
      </form>
    `;

    showModal('Add Promotional Coupon', formHtml);

    const form = document.getElementById('form-create-coupon');
    form.onsubmit = async (e) => {
      e.preventDefault();
      const submitBtn = document.getElementById('btn-save-cp-submit');
      const alertBox = document.getElementById('modal-cp-alert');

      submitBtn.disabled = true;
      submitBtn.textContent = 'Saving...';
      alertBox.style.display = 'none';

      try {
        const code = document.getElementById('new-cp-code').value.trim().toUpperCase();
        const discountType = document.getElementById('new-cp-type').value;
        const discountValue = parseFloat(document.getElementById('new-cp-value').value);
        const description = document.getElementById('new-cp-desc').value.trim();
        const minOrder = parseFloat(document.getElementById('new-cp-min-order').value) || 0;
        const maxDiscountVal = document.getElementById('new-cp-max-discount').value;
        const maxDiscount = maxDiscountVal ? parseFloat(maxDiscountVal) : null;
        const expiryDate = document.getElementById('new-cp-expiry').value;
        const totalUsageLimit = parseInt(document.getElementById('new-cp-limit').value, 10) || 1000;
        const isActive = document.getElementById('new-cp-active').checked;

        await window.lane4ApiRequest('/admin/coupons', {
          method: 'POST',
          body: JSON.stringify({
            code,
            description,
            discountType,
            discountValue,
            minOrderValue: minOrder,
            maxDiscount,
            expiryDate,
            totalUsageLimit,
            isActive
          })
        });

        hideModal();
        showToast(`Coupon ${code} created successfully!`);
        loadCoupons();

      } catch (err) {
        alertBox.style.display = 'block';
        alertBox.style.background = '#fef2f2';
        alertBox.style.color = '#dc2626';
        alertBox.textContent = err.message || 'Failed to create coupon.';
        submitBtn.disabled = false;
        submitBtn.textContent = 'Create Coupon';
      }
    };
  }

  async function deleteCoupon(code) {
    const confirmed = await showThemedConfirm({
      title: 'Delete Coupon',
      message: `Are you sure you want to delete promotional coupon code <strong>"${code}"</strong>? Customers will no longer be able to use this discount.`,
      confirmText: 'Delete Coupon',
      isDanger: true
    });
    if (!confirmed) return;

    try {
      await window.lane4ApiRequest(`/admin/coupons/${encodeURIComponent(code)}`, {
        method: 'DELETE'
      });
      showToast(`Coupon ${code} removed.`);
      loadCoupons();
    } catch (err) {
      showToast(err.message || 'Error deleting coupon', 'error');
    }
  }

  // --- CUSTOMERS ---
  async function loadCustomers() {
    const c = document.getElementById('view-customers');
    if (!c) return;
    if (!c.children.length) {
      c.innerHTML = getSkeletonHtml('table');
    }
    showTopLoader();

    try {
      const res = await window.lane4ApiRequest('/admin/customers');
      const custs = res.data || [];
      c.innerHTML = `
        <div class="card">
          <div class="card-header" style="display:flex;justify-content:space-between;align-items:center;">
            <div class="card-title">Registered Swimmers (${custs.length})</div>
            <button type="button" class="btn btn-secondary btn-sm" onclick="window.loadCustomers ? window.loadCustomers() : loadCustomers()" style="display:inline-flex;align-items:center;gap:6px;padding:6px 14px;border-radius:6px;font-size:12px;cursor:pointer;">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
              <span>Refresh</span>
            </button>
          </div>
          <div class="card-body" style="padding:0;">
            <div class="table-responsive">
              <table>
                <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Status</th><th>Joined</th></tr></thead>
                <tbody>
                  ${custs.length === 0 ? '<tr><td colspan="5" style="text-align:center;padding:24px;color:#888;">No customers registered yet.</td></tr>' :
                    custs.map(cu => `
                      <tr>
                        <td><strong>${escapeHtml(cu.displayName || 'Swimmer')}</strong></td>
                        <td>${escapeHtml(cu.email || '—')}</td>
                        <td>${escapeHtml(cu.phoneNumber || '—')}</td>
                        <td><span class="badge badge-active">${escapeHtml(cu.status || 'Active')}</span></td>
                        <td style="color:#64748b;font-size:12px;">${formatDateTime(cu.createdAt, true)}</td>
                      </tr>
                    `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;
    } catch (err) {
      c.innerHTML = `<p style="color:#ef4444;padding:20px;">Error: ${err.message}</p>`;
    } finally {
      hideTopLoader();
    }
  }
  window.loadCustomers = loadCustomers;

  // --- ENQUIRIES ---
  async function loadEnquiries() {
    const c = document.getElementById('view-enquiries');
    if (!c) return;
    if (!c.children.length) {
      c.innerHTML = getSkeletonHtml('table');
    }
    showTopLoader();

    try {
      const res = await window.lane4ApiRequest('/admin/enquiries');
      const enqs = res.data || [];
      c.innerHTML = `
        <div class="card">
          <div class="card-header"><div class="card-title">Support &amp; Contact Enquiries (${enqs.length})</div></div>
          <div class="card-body" style="padding:0;">
            <div class="table-responsive">
              <table style="width:100%;border-collapse:collapse;">
                <thead>
                  <tr>
                    <th style="width:110px;">Type</th>
                    <th style="width:150px;">Name</th>
                    <th style="width:200px;">Email</th>
                    <th style="min-width:300px;">Message</th>
                    <th style="width:120px;text-align:right;">Date</th>
                  </tr>
                </thead>
                <tbody>
                  ${enqs.length === 0 ? '<tr><td colspan="5" style="text-align:center;padding:24px;color:#888;">No support enquiries submitted.</td></tr>' :
                    enqs.map(eq => {
                      const rawType = (eq.type || 'General').toUpperCase();
                      let typeBadgeBg = '#f1f5f9';
                      let typeBadgeColor = '#475569';
                      if (rawType.includes('IDEA')) {
                        typeBadgeBg = '#fef9c3';
                        typeBadgeColor = '#854d0e';
                      } else if (rawType.includes('PRESS')) {
                        typeBadgeBg = '#dbeafe';
                        typeBadgeColor = '#1e40af';
                      } else if (rawType.includes('COMPLAINT')) {
                        typeBadgeBg = '#fee2e2';
                        typeBadgeColor = '#991b1b';
                      }

                      return `
                        <tr>
                          <td style="vertical-align:top;">
                            <span style="font-size:10px;font-weight:800;letter-spacing:0.5px;padding:3px 7px;border-radius:4px;background:${typeBadgeBg};color:${typeBadgeColor};text-transform:uppercase;display:inline-block;">
                              ${escapeHtml(rawType)}
                            </span>
                          </td>
                          <td style="vertical-align:top;font-size:13px;"><strong style="color:#0f172a;">${escapeHtml(eq.name || 'Anonymous')}</strong></td>
                          <td style="vertical-align:top;font-size:12.5px;color:#475569;">
                            ${eq.email ? `<a href="mailto:${escapeHtml(eq.email)}" style="color:#2563eb;text-decoration:none;">${escapeHtml(eq.email)}</a>` : '—'}
                          </td>
                          <td style="vertical-align:top;max-width:440px;min-width:240px;">
                            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:9px 12px;font-size:12.5px;color:#334155;line-height:1.55;max-height:130px;overflow-y:auto;overflow-x:hidden;word-break:break-word;overflow-wrap:anywhere;white-space:pre-wrap;">${escapeHtml(eq.message || '—')}</div>
                          </td>
                          <td style="vertical-align:top;font-size:11.5px;color:#64748b;white-space:nowrap;text-align:right;">
                            ${formatDateTime(eq.createdAt, true)}
                          </td>
                        </tr>
                      `;
                    }).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;
    } catch (err) {
      c.innerHTML = `<p style="color:#ef4444;padding:20px;">Error: ${err.message}</p>`;
    } finally {
      hideTopLoader();
    }
  }

  // --- CUSTOMER REVIEWS MODERATION ---
  async function loadReviews() {
    const container = document.getElementById('view-reviews');
    if (!container) return;
    if (!container.children.length) {
      container.innerHTML = getSkeletonHtml('table');
    }
    showTopLoader();

    try {
      const res = await window.lane4ApiRequest('/admin/reviews');
      const reviews = res.data || [];
      window.currentReviews = reviews;

      container.innerHTML = `
        <div class="card">
          <div class="card-header" style="flex-wrap:wrap;gap:12px;">
            <div>
              <div class="card-title">Customer Reviews Moderation (${reviews.length})</div>
              <div style="font-size:12px;color:#64748b;margin-top:2px;">Approve authentic customer ratings and feedback before displaying on product pages.</div>
            </div>
            <button class="btn btn-outline" style="font-size:12px;padding:6px 12px;" onclick="loadReviews()">Refresh</button>
          </div>
          <div class="card-body" style="padding:0;">
            <div class="table-responsive">
              <table>
                <thead>
                  <tr>
                    <th>Review ID</th>
                    <th>Product / Item</th>
                    <th>Customer</th>
                    <th>Rating</th>
                    <th>Review Content</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  ${reviews.length === 0 ? '<tr><td colspan="8" style="text-align:center;padding:24px;color:#888;">No reviews submitted yet.</td></tr>' :
                    reviews.map(r => {
                      const stars = '★'.repeat(r.rating || 5) + '☆'.repeat(Math.max(0, 5 - (r.rating || 5)));
                      return `
                        <tr>
                          <td><code>${escapeHtml(r.reviewId ? r.reviewId.slice(0, 8) : '—')}</code></td>
                          <td><strong>${escapeHtml(r.productName || r.productId || 'Swimming Gear')}</strong></td>
                          <td>
                            <div style="font-weight:600;color:#0f172a;">${escapeHtml(r.authorName || 'Verified Swimmer')}</div>
                            ${r.isVerifiedPurchase ? '<span style="font-size:10px;color:#16a34a;font-weight:600;">✓ Verified Buyer</span>' : ''}
                          </td>
                          <td><span style="color:#eab308;font-size:14px;letter-spacing:1px;" title="${r.rating} stars">${stars}</span></td>
                          <td style="max-width:320px;">
                            ${r.title ? `<div style="font-weight:600;font-size:13px;color:#0f172a;margin-bottom:2px;">${escapeHtml(r.title)}</div>` : ''}
                            <div style="font-size:12px;color:#475569;line-height:1.4;">${escapeHtml(r.comment || '—')}</div>
                          </td>
                          <td style="font-size:12px;color:#64748b;white-space:nowrap;">${formatDateTime(r.createdAt, true)}</td>
                          <td><span class="badge ${r.status === 'approved' ? 'badge-active' : (r.status === 'rejected' ? 'badge-cancelled' : 'badge-pending')}">${escapeHtml(r.status || 'pending')}</span></td>
                          <td>
                            <div style="display:flex;gap:6px;flex-wrap:wrap;">
                              ${r.status !== 'approved' ? `
                                <button class="btn btn-success" style="padding:4px 8px;font-size:11px;" onclick="moderateReview('${r.reviewId || r.id}', 'approved')">Approve</button>
                              ` : ''}
                              ${r.status !== 'rejected' ? `
                                <button class="btn btn-outline" style="padding:4px 8px;font-size:11px;color:#dc2626;" onclick="moderateReview('${r.reviewId || r.id}', 'rejected')">Reject</button>
                              ` : ''}
                              <button class="btn btn-danger" style="padding:4px 8px;font-size:11px;" onclick="deleteReview('${r.reviewId || r.id}')">Delete</button>
                            </div>
                          </td>
                        </tr>
                      `;
                    }).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;
    } catch (err) {
      container.innerHTML = `<p style="color:#ef4444;padding:20px;">Error loading reviews: ${err.message}</p>`;
    } finally {
      hideTopLoader();
    }
  }
  window.loadReviews = loadReviews;

  window.moderateReview = async function (reviewId, status) {
    try {
      await window.lane4ApiRequest(`/admin/reviews/${reviewId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
      });
      showToast(`Review marked as ${status}.`, 'success');
      loadReviews();
    } catch (err) {
      showToast(err.message || 'Failed to moderate review', 'error');
    }
  };

  window.deleteReview = async function (reviewId) {
    if (!confirm('Are you sure you want to permanently delete this review?')) return;
    try {
      await window.lane4ApiRequest(`/admin/reviews/${reviewId}`, {
        method: 'DELETE'
      });
      showToast('Review deleted successfully.', 'success');
      loadReviews();
    } catch (err) {
      showToast(err.message || 'Failed to delete review', 'error');
    }
  };

  // --- RETURNS & REFUNDS MANAGEMENT ---
  async function loadReturns(isQuiet = false) {
    const container = document.getElementById('view-returns');
    if (!container) return;
    if (!isQuiet) {
      if (!container.children.length) {
        container.innerHTML = getSkeletonHtml('table');
      }
      showTopLoader();
    }

    try {
      const res = await window.lane4ApiRequest('/admin/returns');
      const returns = res.data || [];
      window.currentReturns = returns;

      container.innerHTML = `
        <div class="card">
          <div class="card-header" style="flex-wrap:wrap;gap:12px;">
            <div>
              <div class="card-title">Returns &amp; Exchange Requests (${returns.length})</div>
              <div style="font-size:12px;color:#64748b;margin-top:2px;">Moderate customer return requests, inspect return reasons, and issue UPI refunds in real time.</div>
            </div>
            <button class="btn btn-outline" style="font-size:12px;padding:6px 12px;display:inline-flex;align-items:center;gap:6px;" onclick="loadReturns()">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
              <span>Refresh</span>
            </button>
          </div>
          <div class="card-body" style="padding:0;">
            <div class="table-responsive">
              <table>
                <thead>
                  <tr>
                    <th>Return ID</th>
                    <th>Order #</th>
                    <th>Customer Email</th>
                    <th>Reason</th>
                    <th>Refund UPI ID</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  ${returns.length === 0 ? '<tr><td colspan="8" style="text-align:center;padding:28px 14px;color:#64748b;font-size:13px;">No return requests received yet.</td></tr>' :
                    returns.map(ret => {
                      const returnDocId = ret.docId || ret.id;
                      return `
                        <tr>
                          <td><strong>${escapeHtml(ret.returnId || 'RET-001')}</strong></td>
                          <td><code>#${escapeHtml(ret.orderNumber || ret.orderId)}</code></td>
                          <td>${escapeHtml(ret.customerEmail || '—')}</td>
                          <td style="max-width:280px;font-size:12.5px;color:#334155;word-break:break-word;">${escapeHtml(ret.reason || '—')}</td>
                          <td><code style="background:#f1f5f9;padding:3px 6px;border-radius:4px;font-weight:600;">${escapeHtml(ret.customerUpiId || '—')}</code></td>
                          <td style="font-size:12px;color:#64748b;white-space:nowrap;">${formatDateTime(ret.createdAt, true)}</td>
                          <td><span class="badge ${ret.status === 'approved' ? 'badge-active' : (ret.status === 'refunded' ? 'badge-delivered' : (ret.status === 'rejected' ? 'badge-cancelled' : 'badge-pending'))}">${escapeHtml(ret.status || 'requested')}</span></td>
                          <td>
                            <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;">
                              ${ret.status === 'requested' ? `
                                <button type="button" class="btn btn-success" style="padding:4px 8px;font-size:11px;" onclick="updateReturnStatus('${returnDocId}', 'approved')">Approve</button>
                                <button type="button" class="btn btn-outline" style="padding:4px 8px;font-size:11px;color:#dc2626;" onclick="updateReturnStatus('${returnDocId}', 'rejected')">Reject</button>
                              ` : ''}
                              ${ret.status === 'approved' ? `
                                <button type="button" class="btn btn-primary" style="background:#dc2626;color:#fff;padding:5px 10px;font-size:11px;font-weight:700;border:none;border-radius:4px;cursor:pointer;" onclick="updateReturnStatus('${returnDocId}', 'refunded')">Issue Refund</button>
                              ` : ''}
                              ${ret.status === 'refunded' ? '<span style="font-size:11.5px;color:#16a34a;font-weight:700;display:inline-flex;align-items:center;gap:3px;">✓ Refund Issued</span>' : ''}
                            </div>
                          </td>
                        </tr>
                      `;
                    }).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;
    } catch (err) {
      container.innerHTML = `<p style="color:#ef4444;padding:20px;">Error loading returns: ${err.message}</p>`;
    } finally {
      if (!isQuiet) hideTopLoader();
    }
  }
  window.loadReturns = loadReturns;

  window.updateReturnStatus = async function (returnDocId, status) {
    let refundReference = '';
    if (status === 'refunded') {
      const ret = (window.currentReturns || []).find(r => (r.docId === returnDocId || r.id === returnDocId));
      const orderRef = ret ? (ret.orderNumber || ret.orderId) : '';
      const promptVal = window.prompt(
        `Confirm UPI Refund for Order #${orderRef}\nCustomer UPI Handle: ${(ret && ret.customerUpiId) || '—'}\n\nPlease enter the bank/UPI transaction reference ID:`,
        'UPI-REF-' + Date.now().toString().slice(-6)
      );
      if (promptVal === null) return;
      refundReference = promptVal.trim() || ('UPI-REF-' + Date.now());
    }

    try {
      const res = await window.lane4ApiRequest(`/admin/returns/${returnDocId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status, refundReference })
      });
      showToast(`Return status updated to ${status}.`, 'success');
      const orderId = (res && res.data && res.data.orderId) || null;
      notifyOrderUpdated(orderId);
      if (adminOrderSyncChannel) {
        adminOrderSyncChannel.postMessage({ type: 'return_updated', docId: returnDocId, status, timestamp: Date.now() });
      }
      try {
        localStorage.setItem('lane4_return_updated', JSON.stringify({ docId: returnDocId, status, timestamp: Date.now() }));
      } catch (_) {}
      loadReturns(true);
      quietRefreshOrders();
    } catch (err) {
      showToast(err.message || 'Failed to update return', 'error');
    }
  };

  // --- AUDIT LOGS ---
  async function loadLogs() {
    const c = document.getElementById('view-logs');
    if (!c) return;
    if (!c.children.length) {
      c.innerHTML = getSkeletonHtml('table');
    }
    showTopLoader();

    try {
      const res = await window.lane4ApiRequest('/admin/logs');
      const rawLogs = res.data || [];
      // Sort newest at the top
      rawLogs.sort((a, b) => (toMillis(b.timestamp) || 0) - (toMillis(a.timestamp) || 0));

      function renderLogRows(logsToRender) {
        if (!logsToRender || logsToRender.length === 0) {
          return '<tr><td colspan="5" style="text-align:center;padding:36px 20px;color:#64748b;font-size:13px;">No administrative events match your criteria.</td></tr>';
        }
        return logsToRender.map(l => `
          <tr>
            <td style="white-space:nowrap;width:170px;">
              ${formatLogDate(l.timestamp)}
            </td>
            <td style="white-space:nowrap;width:240px;">
              <div style="display:flex;align-items:center;gap:10px;">
                <div style="width:34px;height:34px;border-radius:50%;background:#0f172a;color:#ffffff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:11px;flex-shrink:0;box-shadow:0 1px 2px rgba(0,0,0,0.1);">
                  ${((l.adminEmail || 'AD').replace(/[^a-zA-Z]/g, '')).slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div style="font-weight:700;font-size:13px;color:#0f172a;line-height:1.2;">LANE4 Operations Staff</div>
                  <div style="font-size:11.5px;color:#64748b;line-height:1.2;margin-top:2px;">${escapeHtml(l.adminEmail || 'admin@lane4swim.in')}</div>
                </div>
              </div>
            </td>
            <td style="white-space:nowrap;width:170px;">
              ${formatActionBadge(l.action)}
            </td>
            <td style="white-space:nowrap;width:170px;">
              ${formatResource(l.resourceType, l.resourceId)}
            </td>
            <td style="vertical-align:middle;">
              ${formatLogDetails(l.action, l.details, l.resourceType, l.resourceId)}
            </td>
          </tr>
        `).join('');
      }

      c.innerHTML = `
        <div class="card">
          <div class="card-header" style="flex-wrap:wrap;gap:12px;padding:16px 20px;">
            <div style="display:flex;align-items:center;gap:10px;">
              <div class="card-title" style="margin:0;">Staff Activity Audit Trail</div>
              <span id="log-count-badge" style="background:#f1f5f9;color:#334155;font-weight:700;font-size:11px;padding:3px 9px;border-radius:12px;border:1px solid #e2e8f0;">
                ${rawLogs.length} logged ${rawLogs.length === 1 ? 'event' : 'events'}
              </span>
            </div>
            <div style="display:flex;align-items:center;gap:10px;">
              <input type="text" id="log-search-filter" placeholder="Filter by staff, action or ID..." style="padding:7px 12px;font-size:12.5px;border:1.5px solid var(--border);border-radius:6px;width:240px;outline:none;" />
              <button class="btn btn-outline" id="btn-refresh-log-trail" style="padding:7px 12px;font-size:12px;display:inline-flex;align-items:center;gap:5px;">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
                <span>Refresh</span>
              </button>
            </div>
          </div>
          <div class="card-body" style="padding:0;">
            <div class="table-responsive">
              <table style="width:100%;min-width:860px;">
                <thead>
                  <tr>
                    <th style="width:170px;">Timestamp</th>
                    <th style="width:240px;">Staff Member</th>
                    <th style="width:170px;">Action</th>
                    <th style="width:170px;">Target Resource</th>
                    <th>Activity Details</th>
                  </tr>
                </thead>
                <tbody id="log-table-body">
                  ${renderLogRows(rawLogs)}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;

      // Live search filter
      const searchInput = document.getElementById('log-search-filter');
      const tableBody = document.getElementById('log-table-body');
      const countBadge = document.getElementById('log-count-badge');
      if (searchInput && tableBody) {
        searchInput.oninput = () => {
          const q = searchInput.value.toLowerCase().trim();
          const filtered = rawLogs.filter(l =>
            (l.adminEmail && l.adminEmail.toLowerCase().includes(q)) ||
            (l.action && l.action.toLowerCase().includes(q)) ||
            (l.resourceType && l.resourceType.toLowerCase().includes(q)) ||
            (l.resourceId && l.resourceId.toLowerCase().includes(q)) ||
            (l.details && JSON.stringify(l.details).toLowerCase().includes(q))
          );
          tableBody.innerHTML = renderLogRows(filtered);
          if (countBadge) countBadge.textContent = `${filtered.length} of ${rawLogs.length} events`;
        };
      }

      const refreshBtn = document.getElementById('btn-refresh-log-trail');
      if (refreshBtn) refreshBtn.onclick = () => loadLogs();
    } catch (err) {
      c.innerHTML = `<p style="color:#ef4444;padding:20px;">Error: ${err.message}</p>`;
    } finally {
      hideTopLoader();
    }
  }

  // --- SETTINGS ---
  async function loadSettings() {
    const container = document.getElementById('view-settings');
    if (!container) return;
    if (!container.children.length) {
      container.innerHTML = getSkeletonHtml('settings');
    }
    showTopLoader();

    try {
      const payRes = await window.lane4ApiRequest('/store/payment-settings').catch(() => window.lane4ApiRequest('/admin/store/payment-settings'));
      const shipRes = await window.lane4ApiRequest('/shipping/settings');
      const p = (payRes && payRes.data) || {};
      const s = (shipRes && shipRes.data) || {};

      const freeThresh = Math.round((s.freeShippingThresholdPaise || 99900) / 100);
      const stdRate = Math.round((s.standardRatePaise || 9900) / 100);

      container.innerHTML = `
        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(360px, 1fr));gap:24px;">
          <!-- Payment QR Settings Card -->
          <div class="card" style="border:1px solid #cbd5e1;border-radius:12px;box-shadow:0 4px 16px -2px rgba(15,23,42,0.06);background:#ffffff;">
            <div class="card-header" style="background:#ffffff;padding:18px 22px;border-bottom:1.5px solid #e2e8f0;display:flex;align-items:center;justify-content:space-between;">
              <div style="display:flex;align-items:center;gap:10px;">
                <div style="width:36px;height:36px;border-radius:8px;background:#f1f5f9;display:flex;align-items:center;justify-content:center;color:#0f172a;">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/><line x1="6" y1="16" x2="6.01" y2="16"/><line x1="10" y1="16" x2="14" y2="16"/></svg>
                </div>
                <div>
                  <div class="card-title" style="font-size:16px;font-weight:900;color:#0f172a;">UPI &amp; QR Payment Settings</div>
                  <div style="font-size:12px;color:#64748b;">Instant settlement configuration</div>
                </div>
              </div>
              <span class="badge badge-verified" style="font-size:10px;font-weight:800;letter-spacing:0.5px;">LIVE IN CHECKOUT</span>
            </div>

            <div class="card-body" style="padding:22px;">
              <!-- Live Configuration Summary Table -->
              <div style="margin-bottom:20px;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;background:#ffffff;">
                <table style="width:100%;border-collapse:collapse;font-size:12.5px;">
                  <thead>
                    <tr style="background:#f8fafc;border-bottom:1.5px solid #e2e8f0;">
                      <th style="padding:10px 14px;font-size:10.5px;color:#475569;font-weight:800;text-transform:uppercase;letter-spacing:0.5px;border-right:1px solid #e2e8f0;">Parameter</th>
                      <th style="padding:10px 14px;font-size:10.5px;color:#475569;font-weight:800;text-transform:uppercase;letter-spacing:0.5px;border-right:1px solid #e2e8f0;">Storefront Value</th>
                      <th style="padding:10px 14px;font-size:10.5px;color:#475569;font-weight:800;text-transform:uppercase;letter-spacing:0.5px;">System State</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style="border-bottom:1px solid #f1f5f9;">
                      <td style="padding:10px 14px;font-weight:700;color:#334155;border-right:1px solid #f1f5f9;">Store UPI ID</td>
                      <td style="padding:10px 14px;border-right:1px solid #f1f5f9;"><code id="tbl-upi-id" style="background:#f1f5f9;color:#0f172a;padding:3px 7px;border-radius:4px;font-weight:800;">${p.upiId || 'lane4swim@upi'}</code></td>
                      <td style="padding:10px 14px;"><span class="badge badge-verified" style="font-size:10px;">Active &amp; Ready</span></td>
                    </tr>
                    <tr style="border-bottom:1px solid #f1f5f9;">
                      <td style="padding:10px 14px;font-weight:700;color:#334155;border-right:1px solid #f1f5f9;">Merchant Name</td>
                      <td style="padding:10px 14px;font-weight:600;color:#0f172a;border-right:1px solid #f1f5f9;" id="tbl-merchant-name">${p.merchantName || 'The LANE4 Performance Store'}</td>
                      <td style="padding:10px 14px;"><span class="badge badge-verified" style="font-size:10px;">Verified Display</span></td>
                    </tr>
                    <tr style="border-bottom:1px solid #f1f5f9;">
                      <td style="padding:10px 14px;font-weight:700;color:#334155;border-right:1px solid #f1f5f9;">Expiry Window</td>
                      <td style="padding:10px 14px;font-weight:600;color:#0f172a;border-right:1px solid #f1f5f9;"><span id="tbl-window-mins">${p.verificationWindowMinutes || 30}</span> Minutes</td>
                      <td style="padding:10px 14px;"><span class="badge badge-processing" style="font-size:10px;">Timer Enforced</span></td>
                    </tr>
                    <tr>
                      <td style="padding:10px 14px;font-weight:700;color:#334155;border-right:1px solid #f1f5f9;">Store UPI QR</td>
                      <td style="padding:10px 14px;border-right:1px solid #f1f5f9;">
                        <div style="display:flex;align-items:center;gap:8px;">
                          <img id="tbl-qr-thumb" src="${p.qrCodeUrl || '6424266ea05809dff501d86e/lane4-share.png'}" alt="QR" style="width:32px;height:32px;object-fit:contain;border:1px solid #cbd5e1;border-radius:4px;padding:2px;background:#ffffff;cursor:pointer;" onclick="window.previewQrModal(this.src)" title="Click to view full size" />
                          <button type="button" class="btn btn-outline" style="padding:3px 8px;font-size:11px;" onclick="window.previewQrModal(document.getElementById('tbl-qr-thumb').src)">View Full QR</button>
                        </div>
                      </td>
                      <td style="padding:10px 14px;"><span class="badge badge-verified" style="font-size:10px;">Live in Checkout</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <!-- Form -->
              <form id="lane4-settings-payment-form">
                <!-- QR Code Upload & Preview Section -->
                <div style="margin-bottom:18px;border:1.5px solid #e2e8f0;border-radius:10px;padding:16px;background:#f8fafc;">
                  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
                    <div>
                      <label style="display:block;font-size:11.5px;font-weight:800;color:#334155;text-transform:uppercase;letter-spacing:0.5px;">Store UPI QR Code Image</label>
                      <span style="font-size:11px;color:#64748b;">Customers scan this QR code during checkout Step 3.</span>
                    </div>
                    <span id="admin-qr-badge" class="badge badge-verified" style="font-size:10px;font-weight:800;">LIVE IN CHECKOUT</span>
                  </div>

                  <div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap;">
                    <!-- QR Preview Box -->
                    <div id="btn-admin-preview-qr" style="position:relative;width:110px;height:110px;border:1.5px solid #cbd5e1;border-radius:8px;background:#ffffff;padding:6px;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 2px 6px rgba(15,23,42,0.06);transition:all 0.15s ease;" title="Click to view full size">
                      <img id="admin-qr-preview-img" src="${p.qrCodeUrl || '6424266ea05809dff501d86e/lane4-share.png'}" alt="UPI QR Preview" style="width:100%;height:100%;object-fit:contain;border-radius:4px;" />
                      <div style="position:absolute;bottom:4px;right:4px;background:rgba(15,23,42,0.85);color:#fff;border-radius:4px;padding:2px 5px;font-size:9px;font-weight:700;display:flex;align-items:center;gap:3px;">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
                        <span>ZOOM</span>
                      </div>
                    </div>

                    <!-- Upload Controls -->
                    <div style="flex:1;min-width:200px;">
                      <div style="font-size:12px;font-weight:700;color:#0f172a;margin-bottom:4px;">Upload / Replace Official QR</div>
                      <div style="font-size:11px;color:#64748b;line-height:1.45;margin-bottom:10px;">
                        Recommended: Clear square QR image (PNG, JPEG, WEBP) from GPay Business, PhonePe, Paytm, or BHIM.
                      </div>

                      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
                        <label for="admin-qr-file-input" class="btn btn-outline" style="cursor:pointer;padding:7px 12px;font-size:11.5px;font-weight:700;border:1.5px solid #0f172a;border-radius:6px;background:#ffffff;color:#0f172a;display:inline-flex;align-items:center;gap:6px;margin:0;">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                          <span>Select QR Image</span>
                        </label>
                        <input type="file" id="admin-qr-file-input" accept="image/png,image/jpeg,image/webp" style="display:none;" />

                        <button type="button" id="btn-upload-qr-now" class="btn" style="display:none;background:#16a34a;color:#ffffff;padding:7px 14px;font-size:11.5px;font-weight:700;border:none;border-radius:6px;cursor:pointer;align-items:center;gap:6px;">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                          <span>Upload Now</span>
                        </button>

                        <span id="admin-qr-file-name" style="font-size:11px;color:#475569;font-weight:600;"></span>
                      </div>

                      <div id="admin-qr-upload-progress" style="display:none;margin-top:8px;font-size:11px;color:#0284c7;font-weight:700;">
                        Uploading to secure storage &amp; syncing checkout...
                      </div>
                    </div>
                  </div>
                </div>

                <div style="margin-bottom:16px;">
                  <label style="display:block;font-size:11.5px;font-weight:800;color:#334155;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">Store UPI ID (VPA)</label>
                  <input type="text" id="set-upi-id" value="${p.upiId || 'lane4swim@upi'}" style="width:100%;padding:11px 14px;border:1.5px solid #cbd5e1;border-radius:8px;background:#f8fafc;font-family:inherit;font-size:14px;color:#0f172a;box-sizing:border-box;" required />
                  <span style="font-size:11px;color:#64748b;display:block;margin-top:4px;">Swimmers scan or transfer directly to this address.</span>
                </div>

                <div style="margin-bottom:16px;">
                  <label style="display:block;font-size:11.5px;font-weight:800;color:#334155;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">Merchant Account Name</label>
                  <input type="text" id="set-merchant-name" value="${p.merchantName || 'The LANE4 Performance Store'}" style="width:100%;padding:11px 14px;border:1.5px solid #cbd5e1;border-radius:8px;background:#f8fafc;font-family:inherit;font-size:14px;color:#0f172a;box-sizing:border-box;" required />
                  <span style="font-size:11px;color:#64748b;display:block;margin-top:4px;">Official beneficiary name shown inside Google Pay, PhonePe, and Paytm.</span>
                </div>

                <div style="margin-bottom:16px;">
                  <label style="display:block;font-size:11.5px;font-weight:800;color:#334155;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">Verification Time Window (Minutes)</label>
                  <input type="number" id="set-window-mins" value="${p.verificationWindowMinutes || 30}" style="width:100%;padding:11px 14px;border:1.5px solid #cbd5e1;border-radius:8px;background:#f8fafc;font-family:inherit;font-size:14px;color:#0f172a;box-sizing:border-box;" required />
                  <span style="font-size:11px;color:#64748b;display:block;margin-top:4px;">Pending payments expire after this duration if proof is not submitted.</span>
                </div>

                <div style="margin-bottom:20px;">
                  <label style="display:block;font-size:11.5px;font-weight:800;color:#334155;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">Instructions for Swimmers</label>
                  <textarea id="set-instructions" rows="3" style="width:100%;padding:11px 14px;border:1.5px solid #cbd5e1;border-radius:8px;background:#f8fafc;font-family:inherit;font-size:13.5px;color:#0f172a;line-height:1.5;box-sizing:border-box;">${p.instructions || 'Pay via any UPI app (GPay, PhonePe, Paytm). Enter the 12-digit UTR and upload a payment receipt screenshot.'}</textarea>
                </div>

                <button type="submit" id="btn-save-upi" class="btn" style="background:#0f172a;color:#ffffff;width:100%;justify-content:center;padding:12px;font-size:13.5px;font-weight:800;border-radius:8px;letter-spacing:0.3px;box-shadow:0 4px 12px rgba(15,23,42,0.15);cursor:pointer;transition:all 0.2s;">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                  <span>Update UPI Settings</span>
                </button>
              </form>
            </div>
          </div>

          <!-- Shipping Settings Card -->
          <div class="card" style="border:1px solid #cbd5e1;border-radius:12px;box-shadow:0 4px 16px -2px rgba(15,23,42,0.06);background:#ffffff;">
            <div class="card-header" style="background:#ffffff;padding:18px 22px;border-bottom:1.5px solid #e2e8f0;display:flex;align-items:center;justify-content:space-between;">
              <div style="display:flex;align-items:center;gap:10px;">
                <div style="width:36px;height:36px;border-radius:8px;background:#f1f5f9;display:flex;align-items:center;justify-content:center;color:#0f172a;">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>
                </div>
                <div>
                  <div class="card-title" style="font-size:16px;font-weight:900;color:#0f172a;">PAN India Delivery &amp; Shipping</div>
                  <div style="font-size:12px;color:#64748b;">Shipping rules &amp; threshold rates</div>
                </div>
              </div>
              <span class="badge badge-verified" style="font-size:10px;font-weight:800;letter-spacing:0.5px;">LIVE IN CHECKOUT</span>
            </div>

            <div class="card-body" style="padding:22px;">
              <!-- Live Shipping Tier Summary Table -->
              <div style="margin-bottom:20px;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;background:#ffffff;">
                <table style="width:100%;border-collapse:collapse;font-size:12.5px;">
                  <thead>
                    <tr style="background:#f8fafc;border-bottom:1.5px solid #e2e8f0;">
                      <th style="padding:10px 14px;font-size:10.5px;color:#475569;font-weight:800;text-transform:uppercase;letter-spacing:0.5px;border-right:1px solid #e2e8f0;">Order Tier</th>
                      <th style="padding:10px 14px;font-size:10.5px;color:#475569;font-weight:800;text-transform:uppercase;letter-spacing:0.5px;border-right:1px solid #e2e8f0;">Shipping Charge</th>
                      <th style="padding:10px 14px;font-size:10.5px;color:#475569;font-weight:800;text-transform:uppercase;letter-spacing:0.5px;">Transit Guarantee</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style="border-bottom:1px solid #f1f5f9;">
                      <td style="padding:10px 14px;font-weight:700;color:#334155;border-right:1px solid #f1f5f9;">Under ₹<span id="tbl-thresh-under">${freeThresh}</span></td>
                      <td style="padding:10px 14px;font-weight:800;color:#dc2626;border-right:1px solid #f1f5f9;" id="tbl-shipping-rate">₹${stdRate}.00</td>
                      <td style="padding:10px 14px;color:#475569;" id="tbl-transit-1">${s.estimatedTransitDays || '3–6 business days'}</td>
                    </tr>
                    <tr>
                      <td style="padding:10px 14px;font-weight:700;color:#334155;border-right:1px solid #f1f5f9;">₹<span id="tbl-thresh-over">${freeThresh}</span> and Above</td>
                      <td style="padding:10px 14px;border-right:1px solid #f1f5f9;"><span class="badge badge-verified" style="font-size:10px;font-weight:800;">FREE SHIPPING</span></td>
                      <td style="padding:10px 14px;color:#475569;" id="tbl-transit-2">${s.estimatedTransitDays || '3–6 business days'} (Priority)</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <!-- Form -->
              <form id="lane4-settings-shipping-form">
                <div style="margin-bottom:16px;">
                  <label style="display:block;font-size:11.5px;font-weight:800;color:#334155;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">Free Shipping Threshold (₹ INR)</label>
                  <input type="number" id="set-free-threshold" value="${freeThresh}" style="width:100%;padding:11px 14px;border:1.5px solid #cbd5e1;border-radius:8px;background:#f8fafc;font-family:inherit;font-size:14px;color:#0f172a;box-sizing:border-box;" required />
                  <span style="font-size:11px;color:#64748b;display:block;margin-top:4px;">Cart subtotals equal or higher than this value receive free delivery automatically.</span>
                </div>

                <div style="margin-bottom:16px;">
                  <label style="display:block;font-size:11.5px;font-weight:800;color:#334155;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">Standard Delivery Fee (₹ INR)</label>
                  <input type="number" id="set-shipping-rate" value="${stdRate}" style="width:100%;padding:11px 14px;border:1.5px solid #cbd5e1;border-radius:8px;background:#f8fafc;font-family:inherit;font-size:14px;color:#0f172a;box-sizing:border-box;" required />
                  <span style="font-size:11px;color:#64748b;display:block;margin-top:4px;">Flat standard shipping rate applied to orders below the free threshold.</span>
                </div>

                <div style="margin-bottom:20px;">
                  <label style="display:block;font-size:11.5px;font-weight:800;color:#334155;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">Estimated Transit Window</label>
                  <input type="text" id="set-transit-days" value="${s.estimatedTransitDays || '3–6 business days'}" style="width:100%;padding:11px 14px;border:1.5px solid #cbd5e1;border-radius:8px;background:#f8fafc;font-family:inherit;font-size:14px;color:#0f172a;box-sizing:border-box;" required />
                  <span style="font-size:11px;color:#64748b;display:block;margin-top:4px;">Estimated delivery duration displayed to customers during checkout.</span>
                </div>

                <button type="submit" id="btn-save-shipping" class="btn" style="background:#0f172a;color:#ffffff;width:100%;justify-content:center;padding:12px;font-size:13.5px;font-weight:800;border-radius:8px;letter-spacing:0.3px;box-shadow:0 4px 12px rgba(15,23,42,0.15);cursor:pointer;transition:all 0.2s;">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                  <span>Update Shipping Rates</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      `;

      // --- QR Preview and Upload Handlers ---
      const btnPreviewQr = document.getElementById('btn-admin-preview-qr');
      if (btnPreviewQr) {
        btnPreviewQr.onclick = () => {
          const previewImg = document.getElementById('admin-qr-preview-img');
          window.previewQrModal(previewImg ? previewImg.src : (p.qrCodeUrl || ''));
        };
      }

      const qrFileInput = document.getElementById('admin-qr-file-input');
      const qrFileName = document.getElementById('admin-qr-file-name');
      const btnUploadQrNow = document.getElementById('btn-upload-qr-now');
      const qrUploadProgress = document.getElementById('admin-qr-upload-progress');

      let selectedQrFile = null;

      if (qrFileInput) {
        qrFileInput.onchange = (e) => {
          const file = e.target.files && e.target.files[0];
          if (!file) return;
          selectedQrFile = file;
          if (qrFileName) qrFileName.textContent = file.name;
          if (btnUploadQrNow) {
            btnUploadQrNow.style.display = 'inline-flex';
          }

          // Show immediate local preview
          const reader = new FileReader();
          reader.onload = (evt) => {
            const previewImg = document.getElementById('admin-qr-preview-img');
            if (previewImg) previewImg.src = evt.target.result;
          };
          reader.readAsDataURL(file);
        };
      }

      const executeQrUpload = async () => {
        if (!selectedQrFile) return null;
        if (qrUploadProgress) qrUploadProgress.style.display = 'block';
        if (btnUploadQrNow) {
          btnUploadQrNow.disabled = true;
          btnUploadQrNow.textContent = 'Uploading...';
        }

        try {
          const formData = new FormData();
          formData.append('qrImage', selectedQrFile);

          const res = await window.lane4ApiRequest('/admin/store/payment-settings/qr-image', {
            method: 'POST',
            body: formData
          });

          const newUrl = res && res.data && res.data.qrCodeUrl;
          if (newUrl) {
            const previewImg = document.getElementById('admin-qr-preview-img');
            if (previewImg) previewImg.src = newUrl;
            const tblThumb = document.getElementById('tbl-qr-thumb');
            if (tblThumb) tblThumb.src = newUrl;
          }

          showToast('UPI QR code uploaded and active in checkout!', 'success', 'QR UPDATED');
          selectedQrFile = null;
          if (qrFileInput) qrFileInput.value = '';
          if (qrFileName) qrFileName.textContent = '';
          if (btnUploadQrNow) btnUploadQrNow.style.display = 'none';
          return newUrl;
        } catch (err) {
          showToast(err.message || 'Failed to upload QR image', 'error');
          throw err;
        } finally {
          if (qrUploadProgress) qrUploadProgress.style.display = 'none';
          if (btnUploadQrNow) {
            btnUploadQrNow.disabled = false;
            btnUploadQrNow.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg><span>Upload Now</span>`;
          }
        }
      };

      if (btnUploadQrNow) {
        btnUploadQrNow.onclick = () => executeQrUpload();
      }

      // Payment settings submit
      document.getElementById('lane4-settings-payment-form').onsubmit = async (e) => {
        e.preventDefault();
        const upiId = document.getElementById('set-upi-id').value.trim();
        const merchantName = document.getElementById('set-merchant-name').value.trim();
        const windowMins = parseInt(document.getElementById('set-window-mins').value, 10);
        const instructions = document.getElementById('set-instructions').value.trim();

        const btn = document.getElementById('btn-save-upi');
        if (btn) { btn.disabled = true; btn.innerText = 'Saving...'; }

        try {
          // If a new QR file was selected but not uploaded yet, upload it first
          if (selectedQrFile) {
            await executeQrUpload();
          }

          await window.lane4ApiRequest('/admin/store/payment-settings', {
            method: 'PATCH',
            body: JSON.stringify({
              upiId,
              merchantName,
              verificationWindowMinutes: windowMins,
              instructions
            })
          });

          // Instantly update live table
          const tblUpi = document.getElementById('tbl-upi-id');
          if (tblUpi) tblUpi.textContent = upiId;
          const tblMerch = document.getElementById('tbl-merchant-name');
          if (tblMerch) tblMerch.textContent = merchantName;
          const tblWin = document.getElementById('tbl-window-mins');
          if (tblWin) tblWin.textContent = windowMins;

          showToast('UPI Payment settings saved and live in storefront!');
        } catch (err) {
          showToast(err.message || 'Failed to update payment settings', 'error');
        } finally {
          if (btn) {
            btn.disabled = false;
            btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg><span>Update UPI Settings</span>`;
          }
        }
      };

      // Shipping settings submit
      document.getElementById('lane4-settings-shipping-form').onsubmit = async (e) => {
        e.preventDefault();
        const freeVal = parseInt(document.getElementById('set-free-threshold').value, 10);
        const rateVal = parseInt(document.getElementById('set-shipping-rate').value, 10);
        const transitVal = document.getElementById('set-transit-days').value.trim();

        const btn = document.getElementById('btn-save-shipping');
        if (btn) { btn.disabled = true; btn.innerText = 'Saving...'; }

        try {
          await window.lane4ApiRequest('/admin/store/shipping-settings', {
            method: 'PATCH',
            body: JSON.stringify({
              freeShippingThresholdPaise: freeVal * 100,
              standardRatePaise: rateVal * 100,
              estimatedTransitDays: transitVal
            })
          });

          // Instantly update live table
          const tblUnder = document.getElementById('tbl-thresh-under');
          if (tblUnder) tblUnder.textContent = freeVal;
          const tblOver = document.getElementById('tbl-thresh-over');
          if (tblOver) tblOver.textContent = freeVal;
          const tblRate = document.getElementById('tbl-shipping-rate');
          if (tblRate) tblRate.textContent = `₹${rateVal}.00`;
          const tblTr1 = document.getElementById('tbl-transit-1');
          if (tblTr1) tblTr1.textContent = transitVal;
          const tblTr2 = document.getElementById('tbl-transit-2');
          if (tblTr2) tblTr2.textContent = `${transitVal} (Priority)`;

          showToast('Shipping rates saved and active across India!');
        } catch (err) {
          showToast(err.message || 'Failed to update shipping rates', 'error');
        } finally {
          if (btn) {
            btn.disabled = false;
            btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg><span>Update Shipping Rates</span>`;
          }
        }
      };

    } catch (err) {
      container.innerHTML = `<p style="color:#ef4444;padding:20px;">Error loading settings: ${err.message}</p>`;
    } finally {
      hideTopLoader();
    }
  }

  document.addEventListener('DOMContentLoaded', checkAdminAuth);
})();
