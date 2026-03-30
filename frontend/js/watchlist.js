/* watchlist.js */

let allStocksForSearch = [];

document.addEventListener('DOMContentLoaded', async () => {
  const user = await Auth.requireLogin();
  if (!user) return;

  const nameEl = document.getElementById('nav-username');
  if (nameEl) nameEl.textContent = user.username;
  await updateNavBalance();

  await loadWatchlistPage();
  await loadAllStocksForSearch();

  document.getElementById('add-search')?.addEventListener('input', handleSearch);
  document.getElementById('add-btn')?.addEventListener('click', handleAdd);

  // Refresh prices every 20s
  setInterval(async () => {
    await loadWatchlistPage(true);
    await updateNavBalance();
  }, 20000);
});

async function loadAllStocksForSearch() {
  try { allStocksForSearch = await Api.stocks.list(); } catch {}
}

async function loadWatchlistPage(silent = false) {
  const container = document.getElementById('watchlist-cards');
  const countEl   = document.getElementById('wl-count');
  if (!container) return;

  if (!silent) container.innerHTML = `<div class="text-center py-5"><span class="spinner"></span></div>`;

  try {
    const items = await Api.watchlist.list();
    if (countEl) countEl.textContent = items.length;

    if (!items.length) {
      container.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1">
          <svg width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
          <p>Your watchlist is empty.<br>Search for stocks below to add them.</p>
        </div>`;
      return;
    }

    container.innerHTML = items.map(s => `
      <div class="stock-card" style="cursor:default">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px">
          <div>
            <div class="mono" style="font-size:1.05rem;font-weight:700">${s.symbol}</div>
            <div class="text-muted" style="font-size:0.72rem">${s.company_name}</div>
          </div>
          ${volPill(s.volatility_tier)}
        </div>
        <div class="price" style="font-size:1.4rem;margin-bottom:12px">${fmtCurrency(s.current_price)}</div>
        <div style="display:flex;gap:8px">
          <a href="index.html" class="btn-outline-accent" style="font-size:0.75rem;text-decoration:none;padding:5px 12px"
             onclick="sessionStorage.setItem('selectStock','${s.symbol}')">Trade</a>
          <button class="btn-danger-ghost" onclick="removeFromWatchlist('${s.symbol}', this)" style="font-size:0.75rem">Remove</button>
        </div>
      </div>`).join('');

  } catch (err) {
    if (!silent) container.innerHTML = `<div class="empty-state"><p class="text-red">${err.message}</p></div>`;
  }
}

async function removeFromWatchlist(symbol, btn) {
  btn.disabled = true;
  try {
    await Api.watchlist.remove(symbol);
    showToast(`${symbol} removed from watchlist`, 'success');
    await loadWatchlistPage();
  } catch (err) {
    showToast(err.message, 'error');
    btn.disabled = false;
  }
}

function handleSearch(e) {
  const q  = e.target.value.toUpperCase().trim();
  const el = document.getElementById('search-dropdown');
  if (!el) return;

  if (!q) { el.style.display = 'none'; return; }

  const matches = allStocksForSearch.filter(s =>
    s.symbol.includes(q) || s.company_name.toUpperCase().includes(q)
  ).slice(0, 6);

  if (!matches.length) { el.innerHTML = `<div class="p-2" style="font-size:0.8rem;color:var(--text-muted)">No results</div>`; el.style.display = 'block'; return; }

  el.style.display = 'block';
  el.innerHTML = matches.map(s => `
    <div onclick="selectSearchResult('${s.symbol}')"
         style="padding:9px 14px;cursor:pointer;font-size:0.83rem;border-bottom:1px solid var(--border-subtle);transition:background 0.12s"
         onmouseover="this.style.background='var(--bg-elevated)'"
         onmouseout="this.style.background=''">
      <span class="mono" style="font-weight:600">${s.symbol}</span>
      <span class="text-secondary" style="margin-left:8px">${s.company_name}</span>
      <span style="float:right">${volPill(s.volatility_tier)}</span>
    </div>`).join('');
}

function selectSearchResult(symbol) {
  document.getElementById('add-search').value = symbol;
  document.getElementById('search-dropdown').style.display = 'none';
}

async function handleAdd() {
  const symbol = document.getElementById('add-search')?.value.toUpperCase().trim();
  if (!symbol) return showToast('Enter a symbol', 'error');
  try {
    await Api.watchlist.add(symbol);
    showToast(`${symbol} added to watchlist`, 'success');
    document.getElementById('add-search').value = '';
    document.getElementById('search-dropdown').style.display = 'none';
    await loadWatchlistPage();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
  if (!e.target.closest('#add-search') && !e.target.closest('#search-dropdown')) {
    const el = document.getElementById('search-dropdown');
    if (el) el.style.display = 'none';
  }
});
