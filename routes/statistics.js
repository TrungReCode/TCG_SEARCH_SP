const express = require('express');
const router = express.Router();
const { sql, connectDB } = require('../db');

// ==================== CACHE (In-Memory, TTL 5 phút) ====================
const CACHE_TTL = 5 * 60 * 1000;
let cache = {};

function cacheGet(key) {
  const entry = cache[key];
  if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.data;
  delete cache[key];
  return null;
}

function cacheSet(key, data) {
  cache[key] = { data, ts: Date.now() };
}

// Helper: chạy 1 query an toàn, trả [] nếu lỗi (cột không tồn tại, v.v.)
async function safeQuery(pool, queryText, label = 'Query') {
  try {
    console.log(`[Statistics] Executing ${label}:`, queryText.substring(0, 100) + '...');
    const result = await pool.request().query(queryText);
    console.log(`[Statistics] ${label} success: ${result.recordset.length} rows`);
    return result.recordset;
  } catch (err) {
    console.error(`[Statistics] ${label} ERROR:`, err.message);
    console.error('Query was:', queryText.substring(0, 200));
    return [];
  }
}

/*
  ====================================================================
  CÁC BẢNG THỰC TẾ TRONG DATABASE:
  --------------------------------------------------------------------
  NguoiDung      : MaNguoiDung, TenNguoiDung, Email, MatKhau, VaiTro, SoDienThoai
  TroChoi        : MaTroChoi, TenTroChoi, MaLoai
  TheBai         : MaThe, MaTroChoi(FK), TenThe, HinhAnh, MoTa, ThuocTinh, Gia, NgayCapNhat
  BoSuuTap       : MaBoSuuTap, MaNguoiDung(FK), TenBoSuuTap, MaTroChoi(FK)
  TheTrongBoSuuTap: MaTheSuuTap, MaBoSuuTap(FK), MaThe(FK), SoLuongBanSao
  TheRaoBan      : MaRaoBan, MaNguoiDung(FK), MaThe(FK), Gia, TinhTrang, MoTa, NgayDang, HinhAnh
  TheCanMua      : MaCanMua, MaNguoiDung(FK), MaThe(FK), TieuDe, MoTa, HinhAnh, GiaMongMuon, NgayDang, DaKetThuc
  DonHang        : MaDonHang, MaNguoiTao(FK), MaRaoBan(FK), MaCanMua(FK),
                   LoaiGiaoDich('MUA'|'BAN'), GiaGiaoDich, TrangThai, NgayTao
  TinTuc         : MaTinTuc, TieuDe, NoiDung, MaTacGia(FK), NgayTao

  TrangThai đơn hàng: 'ChoXuLy', 'DaThanhToan', 'DangGiao', 'HoanTat', 'Huy', 'TuChoi'
  TinhTrang rao bán : 'Mới', 'DaBan', ...
  ====================================================================
*/

// ==================== 1. THỐNG KÊ TỔNG QUAN ====================
router.get('/overview', async (req, res) => {
  try {
    console.log('[Statistics] GET /overview called');
    const cached = cacheGet('overview');
    if (cached) {
      console.log('[Statistics] /overview: cache hit');
      return res.json(cached);
    }

    const pool = await connectDB();
    console.log('[Statistics] Database connected for /overview');

    // Chạy tất cả các COUNT song song để tối ưu hiệu năng
    const [users, orders, revenue, cards, collections, listings, wantToBuy, news] =
      await Promise.all([
        safeQuery(pool, `SELECT COUNT(*) AS cnt FROM NguoiDung`, 'COUNT NguoiDung'),
        safeQuery(pool, `SELECT COUNT(*) AS cnt FROM DonHang`, 'COUNT DonHang'),
        safeQuery(pool, `
          SELECT ISNULL(SUM(GiaGiaoDich), 0) AS total
          FROM DonHang
          WHERE TrangThai IN ('DaThanhToan','DangGiao','HoanTat')
        `, 'SUM DonHang revenue'),
        safeQuery(pool, `SELECT COUNT(*) AS cnt FROM TheBai`, 'COUNT TheBai'),
        safeQuery(pool, `SELECT COUNT(*) AS cnt FROM BoSuuTap`, 'COUNT BoSuuTap'),
        safeQuery(pool, `
          SELECT COUNT(*) AS cnt FROM TheRaoBan
          WHERE TinhTrang <> N'DaBan'
        `, 'COUNT active TheRaoBan'),
        safeQuery(pool, `
          SELECT COUNT(*) AS cnt FROM TheCanMua
          WHERE DaKetThuc = 0
        `, 'COUNT active TheCanMua'),
        safeQuery(pool, `SELECT COUNT(*) AS cnt FROM TinTuc`, 'COUNT TinTuc'),
      ]);

    console.log('[Statistics] All queries returned:', { users: users.length, orders: orders.length, revenue: revenue.length, cards: cards.length, collections: collections.length, listings: listings.length, wantToBuy: wantToBuy.length, news: news.length });

    const result = {
      totalUsers:       users[0]?.cnt       ?? 0,
      totalOrders:      orders[0]?.cnt      ?? 0,
      totalRevenue:     parseFloat(revenue[0]?.total ?? 0),
      totalCards:       cards[0]?.cnt       ?? 0,
      totalCollections: collections[0]?.cnt ?? 0,
      activeListings:   listings[0]?.cnt    ?? 0,
      activeWantToBuy:  wantToBuy[0]?.cnt   ?? 0,
      totalNews:        news[0]?.cnt        ?? 0,
      timestamp: new Date().toISOString(),
    };

    console.log('[Statistics] /overview result:', result);
    cacheSet('overview', result);
    res.json(result);
  } catch (err) {
    console.error('[Statistics] /overview ERROR:', err);
    res.status(500).json({
      error: 'Lỗi server: ' + err.message,
      totalUsers: 0, totalOrders: 0, totalRevenue: 0,
      totalCards: 0, totalCollections: 0, activeListings: 0,
      activeWantToBuy: 0, totalNews: 0,
    });
  }
});

// ==================== 2. DOANH THU 30 NGÀY ====================
router.get('/revenue', async (req, res) => {
  try {
    const cached = cacheGet('revenue');
    if (cached) return res.json(cached);

    const pool = await connectDB();

    const rows = await safeQuery(pool, `
      SELECT
        FORMAT(NgayTao, 'yyyy-MM-dd') AS ngay,
        COUNT(*)                       AS soDon,
        ISNULL(SUM(GiaGiaoDich), 0)    AS doanhThu
      FROM DonHang
      WHERE TrangThai IN ('DaThanhToan','DangGiao','HoanTat')
        AND NgayTao >= DATEADD(DAY, -30, CAST(GETDATE() AS DATE))
      GROUP BY FORMAT(NgayTao, 'yyyy-MM-dd')
      ORDER BY ngay ASC
    `);

    const data = {
      labels: rows.map(r => r.ngay),
      datasets: [
        {
          label: 'Doanh thu (VND)',
          data: rows.map(r => parseFloat(r.doanhThu)),
          borderColor: '#2ecc71',
          backgroundColor: 'rgba(46,204,113,0.1)',
          borderWidth: 2, tension: 0.3, fill: true,
        },
        {
          label: 'Số đơn hàng',
          data: rows.map(r => r.soDon),
          borderColor: '#3498db',
          backgroundColor: 'rgba(52,152,219,0.1)',
          borderWidth: 2, tension: 0.3, fill: true,
          yAxisID: 'y1',
        },
      ],
    };

    cacheSet('revenue', data);
    res.json(data);
  } catch (err) {
    console.error('GET /revenue error:', err);
    res.status(500).json({ error: 'Lỗi server', labels: [], datasets: [] });
  }
});

// ==================== 3. TRẠNG THÁI ĐƠN HÀNG ====================
router.get('/orders-status', async (req, res) => {
  try {
    const cached = cacheGet('orders-status');
    if (cached) return res.json(cached);

    const pool = await connectDB();

    const rows = await safeQuery(pool, `
      SELECT TrangThai, COUNT(*) AS cnt
      FROM DonHang
      GROUP BY TrangThai
    `);

    // Map mã trạng thái → nhãn tiếng Việt
    const labelMap = {
      ChoXuLy:     'Chờ xử lý',
      DaThanhToan: 'Đã thanh toán',
      DangGiao:    'Đang giao',
      HoanTat:     'Hoàn tất',
      Huy:         'Hủy',
      TuChoi:      'Từ chối',
    };

    // Màu tương ứng theo thứ tự cố định
    const colorMap = {
      ChoXuLy:     '#f39c12',
      DaThanhToan: '#2ecc71',
      DangGiao:    '#3498db',
      HoanTat:     '#9b59b6',
      TuChoi:      '#e74c3c',
      Huy:         '#95a5a6',
    };

    const labels = [];
    const counts = [];
    const bgColors = [];

    rows.forEach(r => {
      const key = r.TrangThai;
      labels.push(labelMap[key] || key);
      counts.push(r.cnt);
      bgColors.push(colorMap[key] || '#bdc3c7');
    });

    const chartData = {
      labels,
      datasets: [{
        data: counts,
        backgroundColor: bgColors,
        borderColor: '#fff',
        borderWidth: 2,
      }],
    };

    cacheSet('orders-status', chartData);
    res.json(chartData);
  } catch (err) {
    console.error('GET /orders-status error:', err);
    res.status(500).json({ error: 'Lỗi server', labels: [], datasets: [] });
  }
});

// ==================== 4. RAO BÁN THEO THỜI GIAN (30 ngày) ====================
router.get('/listings-stats', async (req, res) => {
  try {
    const cached = cacheGet('listings-stats');
    if (cached) return res.json(cached);

    const pool = await connectDB();

    const rows = await safeQuery(pool, `
      SELECT
        FORMAT(NgayDang, 'yyyy-MM-dd') AS ngay,
        COUNT(*)                        AS slRaoBan
      FROM TheRaoBan
      WHERE NgayDang >= DATEADD(DAY, -30, CAST(GETDATE() AS DATE))
      GROUP BY FORMAT(NgayDang, 'yyyy-MM-dd')
      ORDER BY ngay ASC
    `);

    let cumulative = 0;
    const data = {
      labels: rows.map(r => r.ngay),
      datasets: [
        {
          label: 'Bài rao bán mới',
          data: rows.map(r => r.slRaoBan),
          backgroundColor: 'rgba(230,126,34,0.6)',
          borderColor: '#e67e22',
          borderWidth: 1,
        },
        {
          label: 'Tổng tích lũy',
          data: rows.map(r => { cumulative += r.slRaoBan; return cumulative; }),
          borderColor: '#2ecc71',
          backgroundColor: 'transparent',
          borderWidth: 2, type: 'line', tension: 0.3, fill: false,
        },
      ],
    };

    cacheSet('listings-stats', data);
    res.json(data);
  } catch (err) {
    console.error('GET /listings-stats error:', err);
    res.status(500).json({ error: 'Lỗi server', labels: [], datasets: [] });
  }
});

// ==================== 5. PHỔ BIẾN TRÒ CHƠI ====================
router.get('/games-popularity', async (req, res) => {
  try {
    const cached = cacheGet('games-popularity');
    if (cached) return res.json(cached);

    const pool = await connectDB();

    const rows = await safeQuery(pool, `
      SELECT TOP 10
        tc.TenTroChoi,
        COUNT(DISTINCT tb.MaThe)     AS soTheBai,
        COUNT(DISTINCT rb.MaRaoBan)  AS soRaoBan,
        COUNT(DISTINCT bs.MaBoSuuTap) AS soBoSuuTap
      FROM TroChoi tc
        LEFT JOIN TheBai          tb ON tc.MaTroChoi = tb.MaTroChoi
        LEFT JOIN TheRaoBan       rb ON tb.MaThe     = rb.MaThe
        LEFT JOIN BoSuuTap        bs ON tc.MaTroChoi = bs.MaTroChoi
      GROUP BY tc.TenTroChoi
      ORDER BY soTheBai DESC
    `);

    const data = {
      labels: rows.map(r => r.TenTroChoi),
      datasets: [
        {
          label: 'Số thẻ bài',
          data: rows.map(r => r.soTheBai),
          backgroundColor: '#3498db',
          borderColor: '#2980b9', borderWidth: 1,
        },
        {
          label: 'Bài rao bán',
          data: rows.map(r => r.soRaoBan),
          backgroundColor: '#2ecc71',
          borderColor: '#27ae60', borderWidth: 1,
        },
        {
          label: 'Bộ sưu tập',
          data: rows.map(r => r.soBoSuuTap),
          backgroundColor: '#e74c3c',
          borderColor: '#c0392b', borderWidth: 1,
        },
      ],
    };

    cacheSet('games-popularity', data);
    res.json(data);
  } catch (err) {
    console.error('GET /games-popularity error:', err);
    res.status(500).json({ error: 'Lỗi server', labels: [], datasets: [] });
  }
});

// ==================== 6. TOP 10 NGƯỜI BÁN (dựa trên TheRaoBan đã bán) ====================
router.get('/top-sellers', async (req, res) => {
  try {
    const cached = cacheGet('top-sellers');
    if (cached) return res.json(cached);

    const pool = await connectDB();

    // Người bán = chủ sở hữu TheRaoBan có đơn hàng MUA hoàn tất
    const rows = await safeQuery(pool, `
      SELECT TOP 10
        nd.TenNguoiDung,
        COUNT(dh.MaDonHang)                    AS soDonBan,
        ISNULL(SUM(dh.GiaGiaoDich), 0)         AS doanhThu,
        ISNULL(AVG(CAST(dh.GiaGiaoDich AS FLOAT)), 0) AS giaTB
      FROM TheRaoBan rb
        INNER JOIN NguoiDung nd ON rb.MaNguoiDung = nd.MaNguoiDung
        INNER JOIN DonHang   dh ON rb.MaRaoBan    = dh.MaRaoBan
      WHERE dh.TrangThai IN ('DaThanhToan','DangGiao','HoanTat')
      GROUP BY nd.MaNguoiDung, nd.TenNguoiDung
      ORDER BY doanhThu DESC
    `);

    const data = {
      labels: rows.map(r => r.TenNguoiDung),
      datasets: [
        {
          label: 'Doanh thu',
          data: rows.map(r => parseFloat(r.doanhThu)),
          backgroundColor: '#2ecc71',
          borderColor: '#27ae60', borderWidth: 1,
        },
        {
          label: 'Số đơn đã bán',
          data: rows.map(r => r.soDonBan),
          backgroundColor: '#3498db',
          borderColor: '#2980b9', borderWidth: 1,
        },
      ],
      // Gửi thêm giá trung bình để hiển thị trong bảng
      meta: rows.map(r => ({
        name: r.TenNguoiDung,
        totalSales: r.soDonBan,
        totalRevenue: parseFloat(r.doanhThu),
        avgPrice: parseFloat(r.giaTB),
      })),
    };

    cacheSet('top-sellers', data);
    res.json(data);
  } catch (err) {
    console.error('GET /top-sellers error:', err);
    res.status(500).json({ error: 'Lỗi server', labels: [], datasets: [], meta: [] });
  }
});

// ==================== 7. TOP 10 NGƯỜI MUA ====================
router.get('/top-buyers', async (req, res) => {
  try {
    const cached = cacheGet('top-buyers');
    if (cached) return res.json(cached);

    const pool = await connectDB();

    const rows = await safeQuery(pool, `
      SELECT TOP 10
        nd.TenNguoiDung,
        COUNT(dh.MaDonHang)                    AS soDonMua,
        ISNULL(SUM(dh.GiaGiaoDich), 0)         AS tongChi,
        ISNULL(AVG(CAST(dh.GiaGiaoDich AS FLOAT)), 0) AS giaTB
      FROM DonHang dh
        INNER JOIN NguoiDung nd ON dh.MaNguoiTao = nd.MaNguoiDung
      WHERE dh.LoaiGiaoDich = 'MUA'
        AND dh.TrangThai IN ('DaThanhToan','DangGiao','HoanTat')
      GROUP BY nd.MaNguoiDung, nd.TenNguoiDung
      ORDER BY tongChi DESC
    `);

    const data = {
      labels: rows.map(r => r.TenNguoiDung),
      datasets: [
        {
          label: 'Tổng chi',
          data: rows.map(r => parseFloat(r.tongChi)),
          backgroundColor: '#e74c3c',
          borderColor: '#c0392b', borderWidth: 1,
        },
        {
          label: 'Số đơn mua',
          data: rows.map(r => r.soDonMua),
          backgroundColor: '#f39c12',
          borderColor: '#d35400', borderWidth: 1,
        },
      ],
      meta: rows.map(r => ({
        name: r.TenNguoiDung,
        totalOrders: r.soDonMua,
        totalSpent: parseFloat(r.tongChi),
        avgPrice: parseFloat(r.giaTB),
      })),
    };

    cacheSet('top-buyers', data);
    res.json(data);
  } catch (err) {
    console.error('GET /top-buyers error:', err);
    res.status(500).json({ error: 'Lỗi server', labels: [], datasets: [], meta: [] });
  }
});

// ==================== 8. THỐNG KÊ GIÁ TRUNG BÌNH THEO TRÒ CHƠI ====================
router.get('/avg-price-by-game', async (req, res) => {
  try {
    const cached = cacheGet('avg-price-by-game');
    if (cached) return res.json(cached);

    const pool = await connectDB();

    const rows = await safeQuery(pool, `
      SELECT
        tc.TenTroChoi,
        ISNULL(AVG(CAST(rb.Gia AS FLOAT)), 0) AS giaTBRaoBan,
        ISNULL(AVG(CAST(tb.Gia AS FLOAT)), 0) AS giaTBTheBai,
        COUNT(DISTINCT rb.MaRaoBan) AS soRaoBan
      FROM TroChoi tc
        LEFT JOIN TheBai    tb ON tc.MaTroChoi = tb.MaTroChoi
        LEFT JOIN TheRaoBan rb ON tb.MaThe     = rb.MaThe
      GROUP BY tc.TenTroChoi
      HAVING COUNT(DISTINCT tb.MaThe) > 0
      ORDER BY giaTBRaoBan DESC
    `);

    const data = {
      labels: rows.map(r => r.TenTroChoi),
      datasets: [
        {
          label: 'Giá TB rao bán (VND)',
          data: rows.map(r => parseFloat(r.giaTBRaoBan)),
          backgroundColor: 'rgba(231,76,60,0.6)',
          borderColor: '#e74c3c', borderWidth: 1,
        },
        {
          label: 'Giá TB thẻ bài (VND)',
          data: rows.map(r => parseFloat(r.giaTBTheBai)),
          backgroundColor: 'rgba(52,152,219,0.6)',
          borderColor: '#3498db', borderWidth: 1,
        },
      ],
    };

    cacheSet('avg-price-by-game', data);
    res.json(data);
  } catch (err) {
    console.error('GET /avg-price-by-game error:', err);
    res.status(500).json({ error: 'Lỗi server', labels: [], datasets: [] });
  }
});

// ==================== XÓA CACHE ====================
router.post('/clear-cache', (req, res) => {
  cache = {};
  res.json({ success: true, message: 'Cache đã được xóa' });
});

// ==================== TEST DATABASE ====================
router.get('/test-db', async (req, res) => {
  try {
    console.log('[Statistics] Testing database connection...');
    const pool = await connectDB();
    console.log('[Statistics] Pool connected:',pool ? 'YES' : 'NO');
    
    // Test từng bảng
    const tests = {
      NguoiDung: await safeQuery(pool, 'SELECT TOP 1 MaNguoiDung FROM NguoiDung', 'Test NguoiDung'),
      TroChoi: await safeQuery(pool, 'SELECT TOP 1 MaTroChoi FROM TroChoi', 'Test TroChoi'),
      TheBai: await safeQuery(pool, 'SELECT TOP 1 MaThe FROM TheBai', 'Test TheBai'),
      BoSuuTap: await safeQuery(pool, 'SELECT TOP 1 MaBoSuuTap FROM BoSuuTap', 'Test BoSuuTap'),
      TheRaoBan: await safeQuery(pool, 'SELECT TOP 1 MaRaoBan, TinhTrang FROM TheRaoBan', 'Test TheRaoBan'),
      TheCanMua: await safeQuery(pool, 'SELECT TOP 1 MaCanMua, DaKetThuc FROM TheCanMua', 'Test TheCanMua'),
      DonHang: await safeQuery(pool, 'SELECT TOP 1 MaDonHang, GiaGiaoDich, TrangThai FROM DonHang', 'Test DonHang'),
      TinTuc: await safeQuery(pool, 'SELECT TOP 1 MaTinTuc FROM TinTuc', 'Test TinTuc'),
    };

    const result = {
      connected: true,
      tables: {}
    };

    for (const [table, data] of Object.entries(tests)) {
      result.tables[table] = {
        accessible: data.length > 0,
        rowCount: data.length,
        sample: data[0] || null
      };
    }

    console.log('[Statistics] Test DB result:', JSON.stringify(result, null, 2));
    res.json(result);
  } catch (err) {
    console.error('[Statistics] Test DB ERROR:', err);
    res.status(500).json({ connected: false, error: err.message });
  }
});

module.exports = router;
