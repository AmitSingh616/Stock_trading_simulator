/* orders.js */

document.addEventListener('DOMContentLoaded', async () => {
  const user = await Auth.requireLogin();
  if (!user) return;

  const nameEl = document.getElementById('nav-username');
  if (nameEl) nameEl.textContent = user.username;
  await updateNavBalance();

  await loadOrders();
});

async function loadOrders() {
  const tbody = document.getElementById('orders-tbody');
  const countEl = document.getElementById('orders-count');
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4"><span class="spinner"></span></td></tr>`;

  try {
    const orders = await Api.orders.list();
    if (countEl) countEl.textContent = orders.length;

    if (!orders.length) {
      tbody.innerHTML = `
        <tr><td colspan="7">
          <div class="empty-state">
            <svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p>No pending orders.<br>Create one from the dashboard trade panel.</p>
          </div>
        </td></tr>`;
      return;
    }

    tbody.innerHTML = orders.map(o => {
      const typeColors = {
        LIMIT_BUY:   { cls: 'text-green',  bg: 'var(--green-dim)',  label: 'LIMIT BUY'  },
        STOP_LOSS:   { cls: 'text-red',    bg: 'var(--red-dim)',    label: 'STOP LOSS'  },
        TAKE_PROFIT: { cls: 'text-accent', bg: 'var(--accent-dim)', label: 'TAKE PROFIT'},
      };
      const tc = typeColors[o.order_type] || { cls: 'text-secondary', bg: '', label: o.order_type };
      const created = new Date(o.created_at).toLocaleString();
      const currentVsTrigger = (() => {
        const curr = parseFloat(o.current_price);
        const trig = parseFloat(o.trigger_price);
        const diff = ((curr - trig) / trig * 100).toFixed(2);
        return parseFloat(diff) >= 0
          ? `<span class="text-green" style="font-size:0.75rem">+${diff}%</span>`
          : `<span class="text-red"   style="font-size:0.75rem">${diff}%</span>`;
      })();

      return `
        <tr class="order-row-pending">
          <td><span class="mono" style="font-weight:600">${o.symbol}</span>
              <div class="text-muted" style="font-size:0.7rem">${o.company_name}</div></td>
          <td><span style="background:${tc.bg};color:${tc.cls.replace('text-','var(--')};};border-radius:4px;padding:2px 8px;font-size:0.72rem;font-weight:700">${tc.label}</span></td>
          <td class="mono">${fmtNum(o.quantity)}</td>
          <td class="mono">${fmtCurrency(o.trigger_price)}</td>
          <td class="mono">${fmtCurrency(o.current_price)} ${currentVsTrigger}</td>
          <td class="text-muted" style="font-size:0.78rem">${created}</td>
          <td>
            <button class="btn-danger-ghost" onclick="cancelOrder(${o.id}, this)">Cancel</button>
          </td>
        </tr>`;
    }).join('');

  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-red text-center">${err.message}</td></tr>`;
  }
}

async function cancelOrder(orderId, btn) {
  btn.disabled = true;
  btn.textContent = '...';
  try {
    await Api.orders.cancel(orderId);
    showToast('Order cancelled', 'success');
    await loadOrders();
  } catch (err) {
    showToast(err.message, 'error');
    btn.disabled = false;
    btn.textContent = 'Cancel';
  }
}
