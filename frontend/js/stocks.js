/* stocks.js */

let stocksData = [];

document.addEventListener('DOMContentLoaded', async () => {
  const user = await Auth.requireLogin();
  if (!user) return;

  const nameEl = document.getElementById('nav-username');
  if (nameEl) nameEl.textContent = user.username;
  await updateNavBalance();

  await loadAllStocks();

  // Filter / sort controls
  document.getElementById('vol-filter')?.addEventListener('change', renderStocksGrid);
  document.getElementById('sort-select')?.addEventListener('change', renderStocksGrid);
  document.getElementById('search-input')?.addEventListener('input', renderStocksGrid);

  // Refresh every 20s
  setInterval(async () => {
    try {
      stocksData = await Api.stocks.list();
      renderStocksGrid();
      await updateNavBalance();
    } catch {}
  }, 20000);
});

async function loadAllStocks() {
  const grid = document.getElementById('stocks-grid');
  if (!grid) return;
  grid.innerHTML = `<div class="text-center py-5"><span class="spinner"></span></div>`;
  try {
    stocksData = await Api.stocks.list();
    renderStocksGrid();
  } catch (err) {
    grid.innerHTML = `<div class="empty-state"><p class="text-red">${err.message}</p></div>`;
  }
}

function renderStocksGrid() {
  const grid = document.getElementById('stocks-grid');
  if (!grid || !stocksData.length) return;

  const volFilter = document.getElementById('vol-filter')?.value || '';
  const sortBy    = document.getElementById('sort-select')?.value || 'symbol';
  const search    = (document.getElementById('search-input')?.value || '').toUpperCase().trim();

  let filtered = [...stocksData];
  if (volFilter) filtered = filtered.filter(s => s.volatility_tier === volFilter);
  if (search)    filtered = filtered.filter(s => s.symbol.includes(search) || s.company_name.toUpperCase().includes(search));

  if (sortBy === 'price_asc')  filtered.sort((a, b) => a.current_price - b.current_price);
  if (sortBy === 'price_desc') filtered.sort((a, b) => b.current_price - a.current_price);
  if (sortBy === 'symbol')     filtered.sort((a, b) => a.symbol.localeCompare(b.symbol));

  if (!filtered.length) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><p>No stocks match your filters.</p></div>`;
    return;
  }

  grid.innerHTML = filtered.map(s => `
    <div class="stock-card" onclick="openStockDetail('${s.symbol}')">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px">
        <div>
          <div class="mono" style="font-size:1.1rem;font-weight:700">${s.symbol}</div>
          <div class="text-muted" style="font-size:0.72rem;margin-top:2px">${s.company_name}</div>
        </div>
        ${volPill(s.volatility_tier)}
      </div>
      <div class="price" style="font-size:1.5rem;margin-bottom:4px">${fmtCurrency(s.current_price)}</div>
      <div style="display:flex;gap:8px;align-items:center;margin-top:10px">
        <button class="btn-outline-accent" onclick="event.stopPropagation();addToWatchlist('${s.symbol}')" style="padding:4px 10px;font-size:0.75rem">+ Watch</button>
        <a href="index.html" class="btn-ghost" onclick="sessionStorage.setItem('selectStock','${s.symbol}')" style="font-size:0.75rem;text-decoration:none">Trade →</a>
      </div>
    </div>`).join('');
}

async function openStockDetail(symbol) {
  // Load history and show a modal-like overlay
  const modal = document.getElementById('stock-modal');
  const overlay = document.getElementById('modal-overlay');
  if (!modal || !overlay) return;

  overlay.style.display = 'block';
  modal.style.display = 'flex';
  document.getElementById('modal-symbol').textContent  = symbol;
  document.getElementById('modal-company').textContent = '...';
  document.getElementById('modal-price').textContent   = '...';

  try {
    const [stock, histData] = await Promise.all([
      Api.stocks.get(symbol),
      Api.stocks.history(symbol, 100),
    ]);

    document.getElementById('modal-symbol').textContent  = stock.symbol;
    document.getElementById('modal-company').textContent = stock.company_name;
    document.getElementById('modal-price').textContent   = fmtCurrency(stock.current_price);
    document.getElementById('modal-vol').innerHTML       = volPill(stock.volatility_tier);

    const history = (histData.history || []).reverse();
    const prices  = history.map(h => parseFloat(h.price));
    const labels  = history.map(h => h.recorded_at);
    const first   = prices[0] || parseFloat(stock.current_price);
    const isUp    = parseFloat(stock.current_price) >= first;

    if (prices.length) Charts.buildPriceChart('modal-chart', labels, prices, isUp);

  } catch (err) {
    showToast(err.message, 'error');
    closeModal();
  }
}

function closeModal() {
  document.getElementById('stock-modal').style.display    = 'none';
  document.getElementById('modal-overlay').style.display  = 'none';
}

async function addToWatchlist(symbol) {
  try {
    await Api.watchlist.add(symbol);
    showToast(`${symbol} added to watchlist`, 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Close modal on overlay click
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('modal-overlay')?.addEventListener('click', closeModal);
  document.getElementById('modal-close')?.addEventListener('click', closeModal);
});
