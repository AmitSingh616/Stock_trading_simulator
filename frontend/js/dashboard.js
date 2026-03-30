/* dashboard.js — Main dashboard logic */

let activeSymbol    = null;
let activeStockData = null;
let previousPrices  = {};      // symbol → last known price (for change indicator)
let refreshTimer    = null;
let allStocks       = [];

// ── Boot ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  const user = await Auth.requireLogin();
  if (!user) return;

  // Show username
  const nameEl = document.getElementById('nav-username');
  if (nameEl) nameEl.textContent = user.username;
  await updateNavBalance();

  await loadWatchlist();
  await loadAllStocksForSearch();

  // Start 20-second refresh cycle (matches backend price engine)
  startAutoRefresh();

  // Tab switching
  document.querySelectorAll('.trade-tab').forEach(tab => {
    tab.addEventListener('click', () => activateTradeTab(tab.dataset.tab));
  });

  // Forms
  document.getElementById('buy-form')?.addEventListener('submit', handleBuy);
  document.getElementById('sell-form')?.addEventListener('submit', handleSell);
  document.getElementById('order-form')?.addEventListener('submit', handleCreateOrder);

  // Watchlist search
  document.getElementById('wl-search')?.addEventListener('input', handleWatchlistSearch);
  document.getElementById('wl-add-btn')?.addEventListener('click', handleAddToWatchlist);
});

// ── Auto-refresh every 20s ────────────────────────────────
function startAutoRefresh() {
  if (refreshTimer) clearInterval(refreshTimer);
  refreshTimer = setInterval(async () => {
    await refreshWatchlistPrices();
    if (activeSymbol) await refreshChart();
    await updateNavBalance();
  }, 20000);
}

// ── Load watchlist sidebar ────────────────────────────────
async function loadWatchlist() {
  const container = document.getElementById('watchlist-items');
  if (!container) return;
  container.innerHTML = `<div class="text-center py-3"><span class="spinner"></span></div>`;

  try {
    const items = await Api.watchlist.list();

    if (items.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="padding:24px 16px">
          <p style="font-size:0.78rem">No stocks in watchlist.<br>Search below to add one.</p>
        </div>`;
      return;
    }

    container.innerHTML = '';
    items.forEach(stock => {
      const prev = previousPrices[stock.symbol];
      const price = parseFloat(stock.current_price);
      const changeBadge = prev
        ? priceDeltaBadge(price, prev)
        : `<span class="price text-secondary" style="font-size:0.82rem">${fmtCurrency(price)}</span>`;

      previousPrices[stock.symbol] = price;

      const div = document.createElement('div');
      div.className = `watchlist-item ${stock.symbol === activeSymbol ? 'active' : ''}`;
      div.dataset.symbol = stock.symbol;
      div.innerHTML = `
        <div>
          <div class="watchlist-symbol">${stock.symbol}</div>
          <div class="watchlist-name">${stock.company_name}</div>
        </div>
        <div class="text-right">
          <div class="watchlist-price">${fmtCurrency(price)}</div>
          <div style="margin-top:3px">${changeBadge}</div>
        </div>`;
      div.addEventListener('click', () => selectStock(stock.symbol));
      container.appendChild(div);
    });

    // Auto-select first stock if nothing active
    if (!activeSymbol && items.length > 0) selectStock(items[0].symbol);

  } catch (err) {
    container.innerHTML = `<div class="empty-state"><p class="text-red">${err.message}</p></div>`;
  }
}

async function refreshWatchlistPrices() {
  const items = document.querySelectorAll('.watchlist-item');
  if (!items.length) return;
  try {
    const fresh = await Api.watchlist.list();
    fresh.forEach(stock => {
      const price = parseFloat(stock.current_price);
      const prev  = previousPrices[stock.symbol];
      const el    = document.querySelector(`.watchlist-item[data-symbol="${stock.symbol}"]`);
      if (!el) return;

      const priceDiv = el.querySelector('.watchlist-price');
      const badgeDiv = el.querySelectorAll('div')[3]; // second inner div's second child
      if (priceDiv) {
        priceDiv.textContent = fmtCurrency(price);
        priceDiv.style.color = prev ? (price > prev ? 'var(--green)' : price < prev ? 'var(--red)' : '') : '';
        setTimeout(() => { if (priceDiv) priceDiv.style.color = ''; }, 1800);
      }
      previousPrices[stock.symbol] = price;
    });
  } catch {}
}

// ── Select & load a stock ─────────────────────────────────
async function selectStock(symbol) {
  activeSymbol = symbol;

  // Update sidebar highlight
  document.querySelectorAll('.watchlist-item').forEach(el => {
    el.classList.toggle('active', el.dataset.symbol === symbol);
  });

  // Update trade panel header
  document.getElementById('trade-stock-symbol')?.textContent && (
    document.getElementById('trade-stock-symbol').textContent = symbol
  );

  await loadStockChart(symbol);
}

async function loadStockChart(symbol) {
  const chartSection = document.getElementById('chart-section');
  if (!chartSection) return;

  // Show loading state
  document.getElementById('chart-ticker').textContent = symbol;
  document.getElementById('chart-company').textContent = '...';
  document.getElementById('chart-price-big').textContent = '—';

  try {
    const [stock, histData] = await Promise.all([
      Api.stocks.get(symbol),
      Api.stocks.history(symbol, 120),
    ]);

    activeStockData = stock;
    const price  = parseFloat(stock.current_price);
    const history = (histData.history || []).reverse(); // oldest first
    const prices  = history.map(h => parseFloat(h.price));
    const labels  = history.map(h => h.recorded_at);

    // Determine direction: compare first vs last price point
    const first = prices[0] || price;
    const isUp  = price >= first;

    // Header
    document.getElementById('chart-ticker').textContent  = stock.symbol;
    document.getElementById('chart-company').textContent = stock.company_name;
    const priceBig = document.getElementById('chart-price-big');
    priceBig.textContent  = fmtCurrency(price);
    priceBig.className    = `chart-price-big ${isUp ? 'text-green' : 'text-red'}`;

    // Vol pill
    const volEl = document.getElementById('chart-vol-tier');
    if (volEl) volEl.innerHTML = volPill(stock.volatility_tier);

    // Build chart (or update if already built)
    if (prices.length > 0) {
      Charts.buildPriceChart('price-chart', labels, prices, isUp);
    }

    // Stats row
    renderChartStats(prices, stock);

    // Sync trade panel
    syncTradePanel(stock);

  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function refreshChart() {
  if (!activeSymbol) return;
  try {
    const [stock, histData] = await Promise.all([
      Api.stocks.get(activeSymbol),
      Api.stocks.history(activeSymbol, 120),
    ]);
    activeStockData = stock;
    const price   = parseFloat(stock.current_price);
    const history = (histData.history || []).reverse();
    const prices  = history.map(h => parseFloat(h.price));
    const labels  = history.map(h => h.recorded_at);
    const first   = prices[0] || price;
    const isUp    = price >= first;

    document.getElementById('chart-price-big').textContent = fmtCurrency(price);
    document.getElementById('chart-price-big').className   = `chart-price-big ${isUp ? 'text-green' : 'text-red'}`;

    if (prices.length > 0) Charts.updatePriceChart(labels, prices, isUp);
    renderChartStats(prices, stock);
    syncTradePanel(stock);
  } catch {}
}

function renderChartStats(prices, stock) {
  const high = prices.length ? Math.max(...prices) : 0;
  const low  = prices.length ? Math.min(...prices) : 0;
  document.getElementById('stat-high').textContent  = fmtCurrency(high);
  document.getElementById('stat-low').textContent   = fmtCurrency(low);
  document.getElementById('stat-open').textContent  = prices.length ? fmtCurrency(prices[0]) : '—';
  document.getElementById('stat-price').textContent = fmtCurrency(stock.current_price);
}

function syncTradePanel(stock) {
  document.getElementById('trade-stock-symbol').textContent = stock.symbol;
  document.getElementById('trade-current-price').textContent = fmtCurrency(stock.current_price);
}

// ── Trade tab switching ────────────────────────────────────
function activateTradeTab(tab) {
  document.querySelectorAll('.trade-tab').forEach(t => t.classList.remove('active-buy', 'active-sell', 'active-order'));
  document.getElementById('panel-buy')?.classList.add('d-none');
  document.getElementById('panel-sell')?.classList.add('d-none');
  document.getElementById('panel-order')?.classList.add('d-none');

  const activeEl = document.querySelector(`.trade-tab[data-tab="${tab}"]`);
  const panelEl  = document.getElementById(`panel-${tab}`);

  if (activeEl) {
    if (tab === 'buy')   activeEl.classList.add('active-buy');
    if (tab === 'sell')  activeEl.classList.add('active-sell');
    if (tab === 'order') activeEl.classList.add('active-order');
  }
  panelEl?.classList.remove('d-none');
}

// ── Buy ───────────────────────────────────────────────────
async function handleBuy(e) {
  e.preventDefault();
  if (!activeSymbol) return showToast('Select a stock first', 'error');
  const qty = parseInt(document.getElementById('buy-qty').value);
  if (!qty || qty < 1) return showToast('Enter a valid quantity', 'error');

  const btn = e.target.querySelector('button[type=submit]');
  btn.disabled = true; btn.textContent = 'Executing...';
  try {
    const res = await Api.trading.buy(activeSymbol, qty);
    showToast(`Bought ${qty} × ${activeSymbol} @ ${fmtCurrency(res.price)}`, 'success');
    document.getElementById('buy-qty').value = '';
    await updateNavBalance();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false; btn.textContent = 'Buy';
  }
}

// ── Sell ──────────────────────────────────────────────────
async function handleSell(e) {
  e.preventDefault();
  if (!activeSymbol) return showToast('Select a stock first', 'error');
  const qty = parseInt(document.getElementById('sell-qty').value);
  if (!qty || qty < 1) return showToast('Enter a valid quantity', 'error');

  const btn = e.target.querySelector('button[type=submit]');
  btn.disabled = true; btn.textContent = 'Executing...';
  try {
    const res = await Api.trading.sell(activeSymbol, qty);
    showToast(`Sold ${qty} × ${activeSymbol} @ ${fmtCurrency(res.price)}`, 'success');
    document.getElementById('sell-qty').value = '';
    await updateNavBalance();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false; btn.textContent = 'Sell';
  }
}

// ── Create pending order ──────────────────────────────────
async function handleCreateOrder(e) {
  e.preventDefault();
  if (!activeSymbol) return showToast('Select a stock first', 'error');

  const order_type    = document.getElementById('order-type').value;
  const trigger_price = parseFloat(document.getElementById('order-trigger').value);
  const quantity      = parseInt(document.getElementById('order-qty').value);

  if (!trigger_price || trigger_price <= 0) return showToast('Enter a valid trigger price', 'error');
  if (!quantity || quantity < 1)            return showToast('Enter a valid quantity', 'error');

  const btn = e.target.querySelector('button[type=submit]');
  btn.disabled = true; btn.textContent = 'Placing...';
  try {
    await Api.orders.create(activeSymbol, order_type, trigger_price, quantity);
    showToast(`${order_type} order placed for ${activeSymbol}`, 'success');
    e.target.reset();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false; btn.textContent = 'Place Order';
  }
}

// ── Watchlist search / add ────────────────────────────────
async function loadAllStocksForSearch() {
  try {
    allStocks = await Api.stocks.list();
  } catch {}
}

function handleWatchlistSearch(e) {
  const q = e.target.value.toUpperCase().trim();
  const resultsEl = document.getElementById('search-results');
  if (!resultsEl) return;

  if (!q) { resultsEl.innerHTML = ''; return; }

  const matches = allStocks.filter(s =>
    s.symbol.includes(q) || s.company_name.toUpperCase().includes(q)
  ).slice(0, 5);

  if (!matches.length) { resultsEl.innerHTML = `<div class="p-2 text-muted" style="font-size:0.78rem">No results</div>`; return; }

  resultsEl.innerHTML = matches.map(s => `
    <div class="search-result-item" data-symbol="${s.symbol}"
         style="padding:8px 12px;cursor:pointer;border-bottom:1px solid var(--border-subtle);font-size:0.82rem;transition:background 0.15s"
         onmouseover="this.style.background='var(--bg-elevated)'"
         onmouseout="this.style.background=''">
      <span class="mono" style="font-weight:600">${s.symbol}</span>
      <span class="text-secondary" style="margin-left:8px">${s.company_name}</span>
    </div>`).join('');

  resultsEl.querySelectorAll('.search-result-item').forEach(el => {
    el.addEventListener('click', () => {
      document.getElementById('wl-search').value = el.dataset.symbol;
      resultsEl.innerHTML = '';
    });
  });
}

async function handleAddToWatchlist() {
  const symbol = document.getElementById('wl-search')?.value.toUpperCase().trim();
  if (!symbol) return showToast('Enter a symbol', 'error');
  try {
    await Api.watchlist.add(symbol);
    showToast(`${symbol} added to watchlist`, 'success');
    document.getElementById('wl-search').value = '';
    await loadWatchlist();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ── Helpers ───────────────────────────────────────────────
function priceDeltaBadge(current, previous) {
  const diff = current - previous;
  const pct  = previous ? (diff / previous) * 100 : 0;
  if (Math.abs(diff) < 0.001) return `<span class="badge-neutral">—</span>`;
  const arrow = diff > 0 ? '▲' : '▼';
  const cls   = diff > 0 ? 'badge-up' : 'badge-down';
  return `<span class="${cls}">${arrow} ${Math.abs(pct).toFixed(2)}%</span>`;
}
