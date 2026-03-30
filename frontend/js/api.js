/* api.js — All backend communication goes through here */

const BASE_URL = 'http://localhost:5000';

const Api = (() => {

  async function request(method, path, body = null) {
    const opts = {
      method,
      credentials: 'include', // send Flask session cookie
      headers: { 'Content-Type': 'application/json' },
    };
    if (body !== null) opts.body = JSON.stringify(body);

    let res;
    try {
      res = await fetch(`${BASE_URL}${path}`, opts);
    } catch (err) {
      throw new Error('Cannot reach the server. Is the backend running?');
    }

    // Session expired / not logged in
    if (res.status === 401) {
      const on401 = window.__on401;
      if (typeof on401 === 'function') on401();
      throw new Error('Session expired. Please log in again.');
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
    return data;
  }

  // ── Auth ────────────────────────────────────────────────
  const auth = {
    register: (username, email, password) =>
      request('POST', '/api/auth/register', { username, email, password }),
    login: (email, password) =>
      request('POST', '/api/auth/login', { email, password }),
    logout: () =>
      request('POST', '/api/auth/logout'),
    me: () =>
      request('GET', '/api/auth/me'),
  };

  // ── Stocks ──────────────────────────────────────────────
  const stocks = {
    list: () =>
      request('GET', '/api/stocks'),
    get: (symbol) =>
      request('GET', `/api/stocks/${symbol}`),
    history: (symbol, limit = 100) =>
      request('GET', `/api/stocks/${symbol}/history?limit=${limit}`),
  };

  // ── Trading ─────────────────────────────────────────────
  const trading = {
    buy: (symbol, quantity) =>
      request('POST', '/api/trading/buy', { symbol, quantity }),
    sell: (symbol, quantity) =>
      request('POST', '/api/trading/sell', { symbol, quantity }),
  };

  // ── Orders ──────────────────────────────────────────────
  const orders = {
    create: (symbol, order_type, trigger_price, quantity) =>
      request('POST', '/api/orders/create', { symbol, order_type, trigger_price, quantity }),
    list: () =>
      request('GET', '/api/orders'),
    cancel: (id) =>
      request('DELETE', `/api/orders/${id}`),
  };

  // ── Portfolio ────────────────────────────────────────────
  const portfolio = {
    get: () =>
      request('GET', '/api/portfolio'),
    transactions: (params = {}) => {
      const qs = new URLSearchParams();
      if (params.symbol) qs.set('symbol', params.symbol);
      if (params.type)   qs.set('type',   params.type);
      if (params.limit)  qs.set('limit',  params.limit);
      return request('GET', `/api/transactions?${qs}`);
    },
    history: () =>
      request('GET', '/api/portfolio/history'),
  };

  // ── Watchlist ────────────────────────────────────────────
  const watchlist = {
    list: () =>
      request('GET', '/api/watchlist'),
    add: (symbol) =>
      request('POST', '/api/watchlist/add', { symbol }),
    remove: (symbol) =>
      request('DELETE', '/api/watchlist/remove', { symbol }),
  };

  // ── Analytics ────────────────────────────────────────────
  const analytics = {
    networth: () =>
      request('GET', '/api/analytics/networth'),
    performance: () =>
      request('GET', '/api/analytics/performance'),
  };

  return { auth, stocks, trading, orders, portfolio, watchlist, analytics };
})();
