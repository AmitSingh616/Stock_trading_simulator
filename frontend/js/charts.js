/* charts.js — Chart.js wrappers for price and portfolio charts */

const Charts = (() => {

  Chart.defaults.color = '#8b949e';
  Chart.defaults.font.family = "'JetBrains Mono', monospace";
  Chart.defaults.font.size = 11;

  // Shared grid / scale defaults
  const gridOpts = {
    color: 'rgba(48,54,61,0.6)',
    drawBorder: false,
  };

  const tickOpts = {
    color: '#484f58',
    maxTicksLimit: 6,
  };

  // ── Stock Price Chart ─────────────────────────────────────
  let priceChart = null;

  function buildPriceChart(canvasId, labels, prices, isUp = true) {
    const ctx = document.getElementById(canvasId).getContext('2d');

    const lineColor  = isUp ? '#3fb950' : '#f85149';
    const fillColor  = isUp ? 'rgba(63,185,80,0.08)' : 'rgba(248,81,73,0.08)';

    // Gradient fill
    const gradient = ctx.createLinearGradient(0, 0, 0, 340);
    gradient.addColorStop(0,   isUp ? 'rgba(63,185,80,0.18)' : 'rgba(248,81,73,0.18)');
    gradient.addColorStop(1,   'rgba(0,0,0,0)');

    if (priceChart) { priceChart.destroy(); priceChart = null; }

    priceChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          data: prices,
          borderColor: lineColor,
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 4,
          pointHoverBackgroundColor: lineColor,
          fill: true,
          backgroundColor: gradient,
          tension: 0.3,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#161b22',
            borderColor: '#30363d',
            borderWidth: 1,
            padding: 10,
            titleColor: '#8b949e',
            bodyColor: lineColor,
            bodyFont: { family: "'JetBrains Mono', monospace", weight: '600', size: 13 },
            callbacks: {
              label: (ctx) => ` $${parseFloat(ctx.raw).toFixed(2)}`,
              title: (items) => items[0].label,
            },
          },
        },
        scales: {
          x: {
            grid: gridOpts,
            ticks: { ...tickOpts, maxTicksLimit: 8,
              callback: function(val, idx) {
                const lbl = this.getLabelForValue(val);
                if (!lbl) return '';
                const d = new Date(lbl);
                return isNaN(d) ? lbl : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              }
            },
          },
          y: {
            position: 'right',
            grid: gridOpts,
            ticks: {
              ...tickOpts,
              callback: (v) => '$' + parseFloat(v).toFixed(2),
            },
          },
        },
      },
    });

    return priceChart;
  }

  function updatePriceChart(labels, prices, isUp = true) {
    if (!priceChart) return;
    const lineColor = isUp ? '#3fb950' : '#f85149';
    priceChart.data.labels = labels;
    priceChart.data.datasets[0].data = prices;
    priceChart.data.datasets[0].borderColor = lineColor;
    priceChart.data.datasets[0].pointHoverBackgroundColor = lineColor;
    priceChart.update('none');
  }

  // ── Portfolio History Chart ───────────────────────────────
  let portfolioChart = null;

  function buildPortfolioChart(canvasId, snapshots) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    if (portfolioChart) { portfolioChart.destroy(); portfolioChart = null; }

    const reversed = [...snapshots].reverse();
    const labels   = reversed.map(s => s.snapshot_date);
    const values   = reversed.map(s => parseFloat(s.total_value));

    const first = values[0] || 0;
    const last  = values[values.length - 1] || 0;
    const isUp  = last >= first;
    const lineColor = isUp ? '#3fb950' : '#f85149';

    const gradient = ctx.createLinearGradient(0, 0, 0, 260);
    gradient.addColorStop(0, isUp ? 'rgba(63,185,80,0.2)' : 'rgba(248,81,73,0.2)');
    gradient.addColorStop(1, 'rgba(0,0,0,0)');

    portfolioChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          data: values,
          borderColor: lineColor,
          borderWidth: 2,
          pointRadius: 0,
          fill: true,
          backgroundColor: gradient,
          tension: 0.3,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#161b22',
            borderColor: '#30363d',
            borderWidth: 1,
            padding: 10,
            bodyColor: lineColor,
            bodyFont: { family: "'JetBrains Mono', monospace", weight: '600', size: 13 },
            callbacks: {
              label: (ctx) => ` $${parseFloat(ctx.raw).toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
              title: (items) => {
                const d = new Date(items[0].label);
                return isNaN(d) ? items[0].label : d.toLocaleString();
              },
            },
          },
        },
        scales: {
          x: {
            grid: gridOpts,
            ticks: {
              ...tickOpts,
              maxTicksLimit: 8,
              callback: function(val) {
                const lbl = this.getLabelForValue(val);
                const d = new Date(lbl);
                return isNaN(d) ? lbl : d.toLocaleDateString([], { month: 'short', day: 'numeric' });
              },
            },
          },
          y: {
            position: 'right',
            grid: gridOpts,
            ticks: {
              ...tickOpts,
              callback: (v) => '$' + (v / 1000).toFixed(1) + 'k',
            },
          },
        },
      },
    });

    return portfolioChart;
  }

  return { buildPriceChart, updatePriceChart, buildPortfolioChart };
})();
