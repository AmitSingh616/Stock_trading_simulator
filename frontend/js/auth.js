/* auth.js — Session management, toast notifications, shared utils */

// ── Session guard ─────────────────────────────────────────
// Pages that require login call Auth.requireLogin() at top.
// On 401 anywhere, redirect to login.
window.__on401 = () => {
  window.location.href = '/frontend/login.html';
};

const Auth = (() => {

  async function requireLogin() {
    try {
      const user = await Api.auth.me();
      return user;
    } catch {
      window.location.href = '/frontend/login.html';
      return null;
    }
  }

  async function logout() {
    try { await Api.auth.logout(); } catch {}
    window.location.href = '/frontend/login.html';
  }

  return { requireLogin, logout };
})();


// ── Toast ─────────────────────────────────────────────────
function showToast(msg, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const icons = { success: '✓', error: '✕', info: 'ℹ' };
  const toast = document.createElement('div');
  toast.className = `toast-msg ${type}`;
  toast.innerHTML = `<span>${icons[type] || 'ℹ'}</span><span>${msg}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(8px)';
    toast.style.transition = '0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}


// ── Formatters ────────────────────────────────────────────
function fmtCurrency(val, decimals = 2) {
  const n = parseFloat(val) || 0;
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function fmtPct(val) {
  const n = parseFloat(val) || 0;
  const sign = n >= 0 ? '+' : '';
  return sign + n.toFixed(2) + '%';
}

function fmtNum(val) {
  return (parseFloat(val) || 0).toLocaleString('en-US');
}

// ── Color helpers ─────────────────────────────────────────
function pnlClass(val) {
  const n = parseFloat(val);
  if (n > 0) return 'text-green';
  if (n < 0) return 'text-red';
  return 'text-secondary';
}

function pnlBadge(val) {
  const n = parseFloat(val);
  const txt = (n >= 0 ? '+' : '') + n.toFixed(2) + '%';
  if (n > 0) return `<span class="badge-up">▲ ${txt}</span>`;
  if (n < 0) return `<span class="badge-down">▼ ${txt}</span>`;
  return `<span class="badge-neutral">${txt}</span>`;
}

function volPill(tier) {
  const cls = { STABLE: 'vol-stable', NORMAL: 'vol-normal', VOLATILE: 'vol-volatile' };
  return `<span class="${cls[tier] || 'vol-normal'}">${tier}</span>`;
}

// ── Nav balance update ─────────────────────────────────────
async function updateNavBalance() {
  const el = document.getElementById('nav-balance-amount');
  if (!el) return;
  try {
    const d = await Api.analytics.networth();
    el.textContent = fmtCurrency(d.net_worth);
  } catch {}
}

// ── Attach logout button ──────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('logout-btn');
  if (btn) btn.addEventListener('click', Auth.logout);
});
