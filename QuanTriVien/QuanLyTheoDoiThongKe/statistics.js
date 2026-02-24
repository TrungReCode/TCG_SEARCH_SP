// ==================== CONFIGURATION ====================
const API_BASE = 'http://localhost:3000/statistics';
const CACHE_PREFIX = 'tcg_stats_';
const CACHE_TTL = 5 * 60 * 1000; // 5 phút
const DEBUG = true; // Enable detailed logging

// Lưu trữ các Chart instance để hủy đúng cách khi refresh
const charts = {};

console.log('[TCG Stats] v2.0.0 - Frontend loaded');
console.log('[TCG Stats] API Base:', API_BASE);
console.log('[TCG Stats] Debug mode:', DEBUG);

// ==================== CACHE (LocalStorage) ====================
const Cache = {
  get(key) {
    try {
      const raw = localStorage.getItem(CACHE_PREFIX + key);
      if (!raw) return null;
      const { data, ts } = JSON.parse(raw);
      if (Date.now() - ts > CACHE_TTL) { localStorage.removeItem(CACHE_PREFIX + key); return null; }
      return data;
    } catch { return null; }
  },
  set(key, data) {
    try { localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ data, ts: Date.now() })); }
    catch { /* quota exceeded – bỏ qua */ }
  },
  clearAll() {
    Object.keys(localStorage).forEach(k => { if (k.startsWith(CACHE_PREFIX)) localStorage.removeItem(k); });
  },
};

// ==================== HELPERS ====================
function formatVND(value) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value || 0);
}

function num(v) { return (v ?? 0).toLocaleString('vi-VN'); }

function isChartDataEmpty(data) {
  if (!data || !data.labels || data.labels.length === 0) return true;
  if (!data.datasets || data.datasets.length === 0) return true;
  return data.datasets.every(ds => !ds.data || ds.data.length === 0);
}

function showError(msg) {
  const el = document.getElementById('errorMessage');
  document.getElementById('errorText').textContent = msg;
  el.style.display = 'flex';
  setTimeout(() => { el.style.display = 'none'; }, 6000);
}

function spinner(id, on) {
  const el = document.getElementById(id + 'Loading');
  if (el) el.style.display = on ? 'inline-block' : 'none';
}

function emptyState(id, show) {
  const el = document.getElementById(id + 'Empty');
  if (el) el.style.display = show ? 'flex' : 'none';
}

function destroyChart(id) {
  if (charts[id]) { charts[id].destroy(); delete charts[id]; }
}

// Fetch dữ liệu: cache → server → fallback
async function fetchData(endpoint, cacheKey) {
  if (DEBUG) console.log(`[TCG Stats] fetchData: ${endpoint} (cacheKey: ${cacheKey})`);
  
  const cached = Cache.get(cacheKey);
  if (cached) {
    if (DEBUG) console.log(`[TCG Stats] ✓ Cache HIT: ${cacheKey}`);
    return cached;
  }
  
  if (DEBUG) console.log(`[TCG Stats] ⚠ Cache MISS: ${cacheKey}, fetching from API...`);

  try {
    const url = `${API_BASE}${endpoint}`;
    if (DEBUG) console.log(`[TCG Stats] → Fetch: ${url}`);
    
    const res = await fetch(url);
    
    if (DEBUG) console.log(`[TCG Stats] ← Response: ${res.status} ${res.statusText}`);
    
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    
    const json = await res.json();
    
    if (json.error) { 
      console.warn(`[TCG Stats] API Warning [${endpoint}]:`, json.error); 
      return json; 
    }
    
    if (DEBUG) console.log(`[TCG Stats] ✓ Data received for ${cacheKey}:`, json);
    
    Cache.set(cacheKey, json);
    return json;
  } catch (err) {
    console.error(`[TCG Stats] ✗ Fetch ERROR ${endpoint}:`, err);
    return { error: err.message };
  }
}

// ==================== 1. OVERVIEW ====================
async function loadOverview() {
  if (DEBUG) console.log('[TCG Stats] loadOverview() started');
  const d = await fetchData('/overview', 'overview');
  if (d.error) { 
    console.warn('[TCG Stats] Overview error:', d.error); 
    showError('Không thể tải thống kê tổng quan: ' + d.error);
    return; 
  }

  if (DEBUG) console.log('[TCG Stats] Overview data:', d);

  document.getElementById('totalUsers').textContent       = num(d.totalUsers);
  document.getElementById('totalOrders').textContent      = num(d.totalOrders);
  document.getElementById('totalRevenue').textContent     = formatVND(d.totalRevenue);
  document.getElementById('totalCards').textContent       = num(d.totalCards);
  document.getElementById('totalCollections').textContent = num(d.totalCollections);
  document.getElementById('activeListings').textContent   = num(d.activeListings);
  document.getElementById('activeWantToBuy').textContent  = num(d.activeWantToBuy);
  document.getElementById('totalNews').textContent        = num(d.totalNews);
  
  if (DEBUG) console.log('[TCG Stats] ✓ loadOverview() completed');
}

// ==================== 2. DOANH THU 30 NGÀY ====================
async function loadRevenueChart() {
  const ID = 'revenueChart';
  spinner('revenue', true);
  try {
    const d = await fetchData('/revenue', 'revenue');
    if (d.error || isChartDataEmpty(d)) { emptyState('revenue', true); return; }
    emptyState('revenue', false);
    destroyChart(ID);

    charts[ID] = new Chart(document.getElementById(ID), {
      type: 'line',
      data: d,
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { labels: { usePointStyle: true, padding: 15, font: { size: 13 } } },
          tooltip: {
            backgroundColor: 'rgba(0,0,0,.8)', padding: 12,
            callbacks: {
              label(ctx) {
                const v = ctx.parsed.y;
                return ctx.dataset.label + ': ' +
                  (ctx.dataset.yAxisID === 'y1' ? num(v) : formatVND(v));
              },
            },
          },
        },
        scales: {
          y:  { position: 'left',  ticks: { callback: v => formatVND(v) } },
          y1: { position: 'right', grid: { drawOnChartArea: false }, ticks: { callback: v => num(v) } },
        },
      },
    });
  } catch (err) { showError('Lỗi tải biểu đồ doanh thu'); emptyState('revenue', true); }
  finally { spinner('revenue', false); }
}

// ==================== 3. TRẠNG THÁI ĐƠN HÀNG ====================
async function loadOrdersStatusChart() {
  const ID = 'ordersStatusChart';
  spinner('ordersStatus', true);
  try {
    const d = await fetchData('/orders-status', 'ordersStatus');
    if (d.error || isChartDataEmpty(d)) { emptyState('ordersStatus', true); return; }
    emptyState('ordersStatus', false);
    destroyChart(ID);

    charts[ID] = new Chart(document.getElementById(ID), {
      type: 'doughnut',
      data: d,
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { labels: { usePointStyle: true, padding: 15, font: { size: 12 } } },
          tooltip: {
            callbacks: {
              label(ctx) {
                const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                const pct = total ? ((ctx.parsed / total) * 100).toFixed(1) : 0;
                return `${ctx.label}: ${ctx.parsed} (${pct}%)`;
              },
            },
          },
        },
      },
    });
  } catch (err) { showError('Lỗi tải biểu đồ trạng thái đơn hàng'); emptyState('ordersStatus', true); }
  finally { spinner('ordersStatus', false); }
}

// ==================== 4. RAO BÁN MỚI 30 NGÀY ====================
async function loadListingsStatsChart() {
  const ID = 'listingsStatsChart';
  spinner('listingsStats', true);
  try {
    const d = await fetchData('/listings-stats', 'listingsStats');
    if (d.error || isChartDataEmpty(d)) { emptyState('listingsStats', true); return; }
    emptyState('listingsStats', false);
    destroyChart(ID);

    charts[ID] = new Chart(document.getElementById(ID), {
      type: 'bar',
      data: d,
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { labels: { usePointStyle: true, padding: 15, font: { size: 12 } } },
        },
        scales: { x: { ticks: { font: { size: 11 } } } },
      },
    });
  } catch (err) { showError('Lỗi tải biểu đồ rao bán'); emptyState('listingsStats', true); }
  finally { spinner('listingsStats', false); }
}

// ==================== 5. PHỔ BIẾN TRÒ CHƠI ====================
async function loadGamesPopularityChart() {
  const ID = 'gamesPopularityChart';
  spinner('gamesPopularity', true);
  try {
    const d = await fetchData('/games-popularity', 'gamesPopularity');
    if (d.error || isChartDataEmpty(d)) { emptyState('gamesPopularity', true); return; }
    emptyState('gamesPopularity', false);
    destroyChart(ID);

    charts[ID] = new Chart(document.getElementById(ID), {
      type: 'bar',
      data: d,
      options: {
        responsive: true, maintainAspectRatio: false, indexAxis: 'y',
        plugins: {
          legend: { labels: { usePointStyle: true, padding: 15, font: { size: 12 } } },
        },
        scales: { x: { stacked: false }, y: { stacked: false, ticks: { font: { size: 11 } } } },
      },
    });
  } catch (err) { showError('Lỗi tải biểu đồ trò chơi'); emptyState('gamesPopularity', true); }
  finally { spinner('gamesPopularity', false); }
}

// ==================== 6. GIÁ TRUNG BÌNH THEO TRÒ CHƠI ====================
async function loadAvgPriceChart() {
  const ID = 'avgPriceChart';
  spinner('avgPrice', true);
  try {
    const d = await fetchData('/avg-price-by-game', 'avgPrice');
    if (d.error || isChartDataEmpty(d)) { emptyState('avgPrice', true); return; }
    emptyState('avgPrice', false);
    destroyChart(ID);

    charts[ID] = new Chart(document.getElementById(ID), {
      type: 'bar',
      data: d,
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { labels: { usePointStyle: true, padding: 15, font: { size: 12 } } },
          tooltip: {
            callbacks: { label(ctx) { return ctx.dataset.label + ': ' + formatVND(ctx.parsed.y); } },
          },
        },
        scales: {
          y: { ticks: { callback: v => formatVND(v) } },
          x: { ticks: { font: { size: 11 } } },
        },
      },
    });
  } catch (err) { showError('Lỗi tải biểu đồ giá trung bình'); emptyState('avgPrice', true); }
  finally { spinner('avgPrice', false); }
}

// ==================== 7. TOP SELLERS TABLE ====================
async function loadTopSellers() {
  spinner('topSellers', true);
  try {
    const d = await fetchData('/top-sellers', 'topSellers');
    const wrapper = document.getElementById('topSellersWrapper');
    const empty   = document.getElementById('topSellersEmpty');

    if (d.error || !d.meta || d.meta.length === 0) {
      empty.style.display = 'flex'; wrapper.querySelector('.table-container').style.display = 'none';
      return;
    }
    empty.style.display = 'none';
    wrapper.querySelector('.table-container').style.display = 'block';

    const tbody = document.getElementById('topSellersBody');
    tbody.innerHTML = d.meta.map((r, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${r.name}</td>
        <td style="text-align:right">${num(r.totalSales)}</td>
        <td style="text-align:right">${formatVND(r.totalRevenue)}</td>
        <td style="text-align:right">${formatVND(r.avgPrice)}</td>
      </tr>
    `).join('');
  } catch (err) { showError('Lỗi tải Top người bán'); }
  finally { spinner('topSellers', false); }
}

// ==================== 8. TOP BUYERS TABLE ====================
async function loadTopBuyers() {
  spinner('topBuyers', true);
  try {
    const d = await fetchData('/top-buyers', 'topBuyers');
    const wrapper = document.getElementById('topBuyersWrapper');
    const empty   = document.getElementById('topBuyersEmpty');

    if (d.error || !d.meta || d.meta.length === 0) {
      empty.style.display = 'flex'; wrapper.querySelector('.table-container').style.display = 'none';
      return;
    }
    empty.style.display = 'none';
    wrapper.querySelector('.table-container').style.display = 'block';

    const tbody = document.getElementById('topBuyersBody');
    tbody.innerHTML = d.meta.map((r, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${r.name}</td>
        <td style="text-align:right">${num(r.totalOrders)}</td>
        <td style="text-align:right">${formatVND(r.totalSpent)}</td>
        <td style="text-align:right">${formatVND(r.avgPrice)}</td>
      </tr>
    `).join('');
  } catch (err) { showError('Lỗi tải Top người mua'); }
  finally { spinner('topBuyers', false); }
}

// ==================== REFRESH TẤT CẢ ====================
async function refreshAll() {
  console.log('[TCG Stats] ===============================');
  console.log('[TCG Stats] refreshAll() started');
  console.log('[TCG Stats] ===============================');
  
  Cache.clearAll();
  document.getElementById('errorMessage').style.display = 'none';

  try {
    await Promise.all([
      loadOverview(),
      loadRevenueChart(),
      loadOrdersStatusChart(),
      loadListingsStatsChart(),
      loadGamesPopularityChart(),
      loadAvgPriceChart(),
      loadTopSellers(),
      loadTopBuyers(),
    ]);
    
    console.log('[TCG Stats] ✓✓✓ ALL DATA LOADED SUCCESSFULLY ✓✓✓');
  } catch (err) {
    console.error('[TCG Stats] ✗✗✗ CRITICAL ERROR in refreshAll:', err);
    showError('Lỗi tải dữ liệu: ' + err.message);
  }
}

// ==================== KHỞI TẠO ====================
document.addEventListener('DOMContentLoaded', () => {
  console.log('[TCG Stats] DOM Content Loaded - Initializing...');
  
  refreshAll();

  // Nút làm mới
  const btn = document.getElementById('btnRefresh');
  if (btn) {
    btn.addEventListener('click', () => {
      console.log('[TCG Stats] Refresh button clicked');
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang tải...';
      refreshAll().finally(() => {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-sync-alt"></i> Làm mới';
      });
    });
  }

  // Tự động refresh 10 phút
  setInterval(() => {
    console.log('[TCG Stats] Auto-refresh triggered (10 min interval)');
    refreshAll();
  }, 10 * 60 * 1000);

  // Refresh khi tab trở nên active
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      console.log('[TCG Stats] Tab became visible - refreshing');
      refreshAll();
    }
  });
  
  console.log('[TCG Stats] ✓ Initialization complete');
});

// Cleanup khi rời trang
window.addEventListener('beforeunload', () => {
  Object.values(charts).forEach(c => c?.destroy());
});
