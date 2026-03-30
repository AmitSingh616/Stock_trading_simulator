/* portfolio.js */

document.addEventListener('DOMContentLoaded', async () => {
  const user = await Auth.requireLogin();
  if (!user) return;

  const nameEl = document.getElementById('nav-username');
  if (nameEl) nameEl.textContent = user.username;
  await updateNavBalance();

  await Promise.all([
    loadNetworth(),
    loadHoldings(),
    loadPortfolioChart(),
    loadTransactions(),
  ]);

  // Transaction filter controls
  document.getElementById('txn-type-filter')?.addEventListener('change', loadTransactions);
  document.getElementById('txn-limit-filter')?.addEventListener('change', loadTransactions);
});

// ── Net Worth Hero ────────────────────────────────────────
async function loadNetworth() {
  try {
    const [nw, perf] = await Promise.all([
      Api.analytics.networth(),
      Api.analytics.performance(),
    ]);

    document.getElementById('networth-amount').textContent   = fmtCurrency(nw.net_worth);
    document.getElementById('networth-cash').textContent     = fmtCurrency(nw.cash);
    document.getElementById('networth-stocks').textContent   = fmtCurrency(nw.stocks);
    document.getElementById('perf-pnl').textContent         = fmtCurrency(perf.pnl);
    document.getElementById('perf-pnl').className           = `price ${pnlClass(perf.pnl)}`;
    document.getElementById('perf-pct').innerHTML           = pnlBadge(perf.pnl_percent);
    document.getElementById('perf-start').textContent       = fmtCurrency(perf.starting_balance);

  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ── Portfolio History Chart ───────────────────────────────
async function loadPortfolioChart() {
  const canvas = document.getElementById('portfolio-history-chart');
  if (!canvas) return;
  try {
    const history = await Api.portfolio.history();
    if (!history.length) {
      canvas.closest('.card-dark').querySelector('.card-body-dark').innerHTML =
        `<div class="empty-state"><p>No snapshot history yet.<br>History builds every 20 seconds.</p></div>`;
      return;
    }
    Charts.buildPortfolioChart('portfolio-history-chart', history);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ── Holdings Table ────────────────────────────────────────
async function loadHoldings() {
  const tbody = document.getElementById('holdings-tbody');
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="6" class="text-center py-3"><span class="spinner"></span></td></tr>`;
  try {
    const port = await Api.portfolio.get();

    if (!port.holdings || !port.holdings.length) {
      tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><p>No holdings yet. Buy your first stock from the dashboard.</p></div></td></tr>`;
      return;
    }

    tbody.innerHTML = port.holdings.map(h => {
      const pnlVal = parseFloat(h.current_value) - parseFloat(h.cost_basis);
      return `
        <tr>
          <td>
            <div class="mono" style="font-weight:600">${h.symbol}</div>
            <div class="text-muted" style="font-size:0.72rem">${h.company_name}</div>
          </td>
          <td class="mono">${fmtNum(h.quantity_held)}</td>
          <td class="mono">${fmtCurrency(h.avg_purchase_price)}</td>
          <td class="mono">${fmtCurrency(h.current_price)}</td>
          <td class="mono ${pnlClass(pnlVal)}">${fmtCurrency(pnlVal)}</td>
          <td>${pnlBadge(h.pnl_percent)}</td>
        </tr>`;
    }).join('');

    // Summary footer row
    const totalVal  = parseFloat(port.total_stock_value);
    const totalCost = parseFloat(port.total_cost_basis);
    const totalPnl  = totalVal - totalCost;
    tbody.innerHTML += `
      <tr style="border-top:1px solid var(--border);background:var(--bg-elevated)">
        <td colspan="4" style="font-size:0.78rem;color:var(--text-muted);padding:10px 14px">Total Holdings</td>
        <td class="mono ${pnlClass(totalPnl)}" style="font-weight:600">${fmtCurrency(totalPnl)}</td>
        <td></td>
      </tr>`;

  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-red text-center">${err.message}</td></tr>`;
  }
}

// ── Transaction History ───────────────────────────────────
async function loadTransactions() {
  const tbody = document.getElementById('txn-tbody');
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="5" class="text-center py-3"><span class="spinner"></span></td></tr>`;

  const type  = document.getElementById('txn-type-filter')?.value || '';
  const limit = document.getElementById('txn-limit-filter')?.value || '50';

  try {
    const txns = await Api.portfolio.transactions({ type: type || undefined, limit });

    if (!txns.length) {
      tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><p>No transactions yet.</p></div></td></tr>`;
      return;
    }

    tbody.innerHTML = txns.map(t => {
      const isBuy = t.type === 'BUY';
      const typeBadge = isBuy
        ? `<span class="badge-up">BUY</span>`
        : `<span class="badge-down">SELL</span>`;
      return `
        <tr>
          <td><span class="mono" style="font-weight:600">${t.symbol}</span></td>
          <td>${typeBadge}</td>
          <td class="mono">${fmtNum(t.quantity)}</td>
          <td class="mono">${fmtCurrency(t.price_at_transaction)}</td>
          <td class="mono ${isBuy ? 'text-red' : 'text-green'}">${isBuy ? '-' : '+'}${fmtCurrency(t.total_amount)}</td>
        </tr>`;
    }).join('');

  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-red text-center">${err.message}</td></tr>`;
  }
}
