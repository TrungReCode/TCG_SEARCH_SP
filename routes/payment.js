// routes/payment.js - Xử lý thanh toán MoMo
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const axios = require('axios');
const { sql, connectDB } = require('../db');

// ==================== CẤU HÌNH MOMO ====================
const MOMO_CONFIG = {
  partnerCode: process.env.MOMO_PARTNER_CODE || 'MOMO_PARTNER_CODE',
  accessKey: process.env.MOMO_ACCESS_KEY || 'MOMO_ACCESS_KEY',
  secretKey: process.env.MOMO_SECRET_KEY || 'MOMO_SECRET_KEY',
  endpoint: 'https://test-payment.momo.vn/v2/gateway/api/create',
  ipnUrl: process.env.MOMO_IPN_URL || 'http://localhost:3000/payment/notify',
  redirectUrl: process.env.MOMO_REDIRECT_URL || 'http://localhost:3000/payment/callback'
};

// ==================== HỖ TRỢ HÀM ====================
function generateSignature(data, secretKey) {
  const message = Object.keys(data)
    .sort()
    .map(key => `${key}=${data[key]}`)
    .join('&');
  
  return crypto
    .createHmac('sha256', secretKey)
    .update(message)
    .digest('hex');
}

function generateOrderId() {
  return 'TCG' + Date.now() + Math.random().toString(36).substr(2, 9);
}

// ==================== 1. KHỞI TẠO THANH TOÁN MOMO ====================
router.post('/initiate-momo', async (req, res) => {
  const { MaNguoiDung, MaRaoBan, MaCanMua, Amount, TenSanPham } = req.body;

  if (!MaNguoiDung || !Amount || Amount <= 0) {
    return res.status(400).json({ success: false, error: 'Thông tin không hợp lệ' });
  }

  try {
    const pool = await connectDB();
    
    const orderId = generateOrderId();
    const requestId = generateOrderId();
    
    // Lưu thông tin yêu cầu thanh toán vào database
    await pool.request()
      .input('OrderId', sql.NVarChar, orderId)
      .input('RequestId', sql.NVarChar, requestId)
      .input('MaNguoiDung', sql.Int, MaNguoiDung)
      .input('MaRaoBan', sql.Int, MaRaoBan || null)
      .input('MaCanMua', sql.Int, MaCanMua || null)
      .input('Amount', sql.Decimal(15, 2), Amount)
      .input('TenSanPham', sql.NVarChar, TenSanPham || 'Mua thẻ TCG')
      .query(`
        IF NOT EXISTS (SELECT 1 FROM PaymentTransactions WHERE OrderId = @OrderId)
        BEGIN
          INSERT INTO PaymentTransactions (OrderId, RequestId, MaNguoiDung, MaRaoBan, MaCanMua, Amount, TenSanPham, TrangThai, NgayTao)
          VALUES (@OrderId, @RequestId, @MaNguoiDung, @MaRaoBan, @MaCanMua, @Amount, @TenSanPham, 'PENDING', GETDATE())
        END
      `)
    
    // Tạo payload MoMo
    const momoPayload = {
      partnerCode: MOMO_CONFIG.partnerCode,
      partnerName: 'TCG Hub',
      partnerUserid: `user_${MaNguoiDung}`,
      requestId: requestId,
      orderId: orderId,
      orderGroupId: '',
      amount: Amount,
      orderInfo: TenSanPham || 'Mua thẻ TCG',
      redirectUrl: MOMO_CONFIG.redirectUrl,
      ipnUrl: MOMO_CONFIG.ipnUrl,
      lang: 'vi',
      autoCapture: true,
      requestType: 'captureWallet'
    };

    // Ký request
    const signature = generateSignature(momoPayload, MOMO_CONFIG.secretKey);
    momoPayload.signature = signature;

    console.log('[PAYMENT] Gửi request tới MoMo:', { orderId, amount: Amount });

    // Gửi request tới MoMo
    const momoResponse = await axios.post(MOMO_CONFIG.endpoint, momoPayload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000
    });

    if (momoResponse.data.resultCode === 0) {
      // Thành công, trả về payment URL
      res.json({
        success: true,
        orderId: orderId,
        requestId: requestId,
        payUrl: momoResponse.data.payUrl,
        qrCodeUrl: momoResponse.data.qrCodeUrl || null,
        message: 'Chuyển hướng sang MoMo để thanh toán...'
      });
    } else {
      // MoMo trả về lỗi
      throw new Error(`MoMo Error: ${momoResponse.data.message}`);
    }

  } catch (err) {
    console.error('[PAYMENT] Lỗi khởi tạo thanh toán:', err.message);
    res.status(500).json({ 
      success: false, 
      error: 'Lỗi khởi tạo thanh toán MoMo: ' + err.message 
    });
  }
});

// ==================== 2. CALLBACK TỪ MOMO (IPN - Instant Payment Notification) ====================
router.post('/notify', async (req, res) => {
  console.log('[PAYMENT IPN] Received:', req.body);

  try {
    const { orderId, transId, resultCode, message, amount, signature } = req.body;

    // Kiểm tra chữ ký
    const payloadToVerify = {
      orderId,
      transId,
      resultCode,
      message,
      amount
    };

    const expectedSignature = generateSignature(payloadToVerify, MOMO_CONFIG.secretKey);

    if (signature !== expectedSignature) {
      console.error('[PAYMENT IPN] Chữ ký không hợp lệ');
      return res.status(401).json({ success: false, error: 'Invalid signature' });
    }

    const pool = await connectDB();
    const transaction = new sql.Transaction(pool);

    await transaction.begin();
    const request = new sql.Request(transaction);

    try {
      // Lấy thông tin giao dịch từ DB
      const paymentResult = await request
        .input('OrderId', sql.NVarChar, orderId)
        .query('SELECT * FROM PaymentTransactions WHERE OrderId = @OrderId');

      if (!paymentResult.recordset || paymentResult.recordset.length === 0) {
        await transaction.rollback();
        return res.status(404).json({ success: false, error: 'Order not found' });
      }

      const payment = paymentResult.recordset[0];

      if (resultCode === 0) {
        // Thanh toán thành công
        await request
          .input('OrderId', sql.NVarChar, orderId)
          .input('TransId', sql.NVarChar, transId)
          .query(`
            UPDATE PaymentTransactions 
            SET TrangThai = 'SUCCESS', TransactionId = @TransId, NgayHoanTat = GETDATE()
            WHERE OrderId = @OrderId
          `);

        // Cập nhật trạng thái đơn hàng nếu có liên quan
        if (payment.MaRaoBan) {
          await request
            .input('MaRaoBan', sql.Int, payment.MaRaoBan)
            .query(`UPDATE TheRaoBan SET TrahThanhToan = 1 WHERE MaRaoBan = @MaRaoBan`);
        }

        console.log('[PAYMENT IPN] ✓ Thanh toán thành công:', orderId);
      } else {
        // Thanh toán thất bại
        await request
          .input('OrderId', sql.NVarChar, orderId)
          .input('TransId', sql.NVarChar, transId || null)
          .query(`
            UPDATE PaymentTransactions 
            SET TrangThai = 'FAILED', TransactionId = @TransId, NgayHoanTat = GETDATE()
            WHERE OrderId = @OrderId
          `);

        console.log('[PAYMENT IPN] ✗ Thanh toán thất bại:', orderId, 'Code:', resultCode);
      }

      await transaction.commit();

      // Trả về kết quả cho MoMo
      res.json({ success: true, message: 'IPN received' });

    } catch (err) {
      await transaction.rollback();
      throw err;
    }

  } catch (err) {
    console.error('[PAYMENT IPN] Lỗi xử lý IPN:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==================== 3. CALLBACK TỪ NGƯỜI DÙNG (Redirect từ MoMo) ====================
router.get('/callback', async (req, res) => {
  const { orderId, resultCode, message } = req.query;

  console.log('[PAYMENT CALLBACK] Result:', { orderId, resultCode, message });

  try {
    const pool = await connectDB();

    const result = await pool.request()
      .input('OrderId', sql.NVarChar, orderId)
      .query('SELECT * FROM PaymentTransactions WHERE OrderId = @OrderId');

    if (!result.recordset || result.recordset.length === 0) {
      return res.status(404).send('Không tìm thấy giao dịch');
    }

    const payment = result.recordset[0];

    if (resultCode === '0') {
      // Thanh toán thành công - chuyển hướng về trang thành công
      res.redirect(`/Player/player.html?payment=success&orderId=${orderId}`);
    } else {
      // Thanh toán thất bại
      res.redirect(`/Player/player.html?payment=failed&orderId=${orderId}&message=${encodeURIComponent(message)}`);
    }

  } catch (err) {
    console.error('[PAYMENT CALLBACK] Lỗi:', err.message);
    res.status(500).send('Lỗi xử lý callback: ' + err.message);
  }
});

// ==================== 4. LẤY THÔNG TIN GIAO DỊCH ====================
router.get('/transaction-info/:orderId', async (req, res) => {
  const { orderId } = req.params;

  try {
    const pool = await connectDB();

    const result = await pool.request()
      .input('OrderId', sql.NVarChar, orderId)
      .query(`
        SELECT 
          OrderId, 
          RequestId, 
          MaNguoiDung, 
          Amount, 
          TrangThai, 
          NgayTao, 
          NgayHoanTat,
          TransactionId
        FROM PaymentTransactions 
        WHERE OrderId = @OrderId
      `);

    if (!result.recordset || result.recordset.length === 0) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy giao dịch' });
    }

    res.json({ success: true, data: result.recordset[0] });

  } catch (err) {
    console.error('[PAYMENT] Lỗi lấy thông tin giao dịch:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==================== 5. LỊCH SỬ THANH TOÁN CỦA NGƯỜI DÙNG ====================
router.get('/payment-history/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    const pool = await connectDB();

    const result = await pool.request()
      .input('MaNguoiDung', sql.Int, userId)
      .query(`
        SELECT 
          OrderId, 
          Amount, 
          TrangThai, 
          TenSanPham,
          NgayTao, 
          NgayHoanTat
        FROM PaymentTransactions 
        WHERE MaNguoiDung = @MaNguoiDung
        ORDER BY NgayTao DESC
      `);

    res.json({ 
      success: true, 
      data: result.recordset || [],
      total: (result.recordset || []).length 
    });

  } catch (err) {
    console.error('[PAYMENT] Lỗi lấy lịch sử thanh toán:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
