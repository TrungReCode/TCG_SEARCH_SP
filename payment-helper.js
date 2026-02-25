/**
 * Payment Helper - Hỗ trợ tích hợp thanh toán MoMo
 * Sử dụng: Thêm script này vào tất cả trang UI cần thanh toán
 */

class PaymentManager {
  constructor() {
    this.apiBase = 'http://localhost:3000';
    this.userId = this.getUserId();
  }

  /**
   * Lấy ID người dùng từ localStorage
   */
  getUserId() {
    return localStorage.getItem('maNguoiDung') || null;
  }

  /**
   * Mở trang thanh toán MoMo
   * @param {Object} options - Tùy chọn thanh toán
   *   - raoBanId (optional): ID bài rao bán
   *   - canMuaId (optional): ID bài cần mua
   *   - productName: Tên sản phẩm
   *   - amount: Số tiền (VND)
   *   - redirectUrl (optional): URL sau khi thanh toán
   */
  async initiatePayment(options) {
    if (!this.userId) {
      alert('Vui lòng đăng nhập để thanh toán');
      window.location.href = '/DangNhap_DangKy/login.html';
      return;
    }

    const {
      raoBanId = null,
      canMuaId = null,
      productName = 'Mua thẻ TCG',
      amount = 0,
      redirectUrl = null
    } = options;

    if (amount < 10000) {
      alert('Số tiền tối thiểu là 10,000 VND');
      return;
    }

    try {
      // Chuyển đến trang checkout
      const params = new URLSearchParams({
        userId: this.userId,
        productName: productName,
        amount: amount,
        ...(raoBanId && { raoBanId }),
        ...(canMuaId && { canMuaId })
      });

      window.location.href = `/Player/checkout.html?${params.toString()}`;

    } catch (error) {
      console.error('Lỗi khởi tạo thanh toán:', error);
      alert('Lỗi: ' + error.message);
    }
  }

  /**
   * Lấy lịch sử thanh toán của người dùng
   */
  async getPaymentHistory() {
    if (!this.userId) {
      return [];
    }

    try {
      const response = await fetch(`${this.apiBase}/payment/payment-history/${this.userId}`);
      const result = await response.json();

      if (result.success) {
        return result.data || [];
      }

      return [];
    } catch (error) {
      console.error('Lỗi lấy lịch sử thanh toán:', error);
      return [];
    }
  }

  /**
   * Lấy thông tin chi tiết giao dịch
   * @param {string} orderId - ID đơn hàng
   */
  async getTransactionInfo(orderId) {
    try {
      const response = await fetch(`${this.apiBase}/payment/transaction-info/${orderId}`);
      const result = await response.json();

      if (result.success) {
        return result.data;
      }

      return null;
    } catch (error) {
      console.error('Lỗi lấy thông tin giao dịch:', error);
      return null;
    }
  }

  /**
   * Kiểm tra kết quả thanh toán từ URL parameters
   */
  checkPaymentResult() {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('payment');
    const orderId = params.get('orderId');

    if (!status) return null;

    return {
      status: status, // 'success' | 'failed'
      orderId: orderId,
      message: params.get('message') || null
    };
  }

  /**
   * Định dạng tiền tệ VND
   */
  formatCurrency(value) {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(value || 0);
  }

  /**
   * Tạo button "Mua bằng MoMo"
   * @param {Object} options - Tùy chọn
   */
  createPaymentButton(options) {
    const button = document.createElement('button');
    button.className = 'btn-momo-payment';
    button.innerHTML = '<i class="fas fa-wallet"></i> Mua bằng MoMo';
    button.title = 'Thanh toán an toàn qua MoMo';

    button.addEventListener('click', (e) => {
      e.preventDefault();
      this.initiatePayment(options);
    });

    return button;
  }
}

// ==================== KHỞI TẠO TOÀN CỤC ====================
const paymentManager = new PaymentManager();

// ==================== HELPER FUNCTIONS ====================
/**
 * Hàm nhanh để thanh toán
 */
function buyWithMoMo(productName, amount, raoBanId = null, canMuaId = null) {
  paymentManager.initiatePayment({
    productName,
    amount,
    raoBanId,
    canMuaId
  });
}

/**
 * Kiểm tra thanh toán thành công
 */
function checkPaymentSuccess() {
  const result = paymentManager.checkPaymentResult();

  if (!result) return false;

  if (result.status === 'success') {
    console.log('✓ Thanh toán thành công:', result.orderId);
    return true;
  } else if (result.status === 'failed') {
    console.log('✗ Thanh toán thất bại:', result.message);
    return false;
  }

  return null;
}

/**
 * Hàm hiển thị UI lịch sử thanh toán
 */
async function displayPaymentHistory(containerId) {
  const history = await paymentManager.getPaymentHistory();
  const container = document.getElementById(containerId);

  if (!container) return;
  if (history.length === 0) {
    container.innerHTML = '<p style="text-align: center; color: #999;">Chưa có giao dịch thanh toán nào</p>';
    return;
  }

  let html = `
    <table class="payment-history-table">
      <thead>
        <tr>
          <th>Order ID</th>
          <th>Sản phẩm</th>
          <th>Số tiền</th>
          <th>Trạng thái</th>
          <th>Ngày</th>
        </tr>
      </thead>
      <tbody>
  `;

  history.forEach(tx => {
    const statusClass = tx.TrangThai === 'SUCCESS' ? 'status-success' : 'status-failed';
    const statusText = tx.TrangThai === 'SUCCESS' ? '✓ Thành công' : '✗ Thất bại';
    const date = new Date(tx.NgayTao).toLocaleDateString('vi-VN');

    html += `
      <tr>
        <td>${tx.OrderId}</td>
        <td>${tx.TenSanPham}</td>
        <td>${paymentManager.formatCurrency(tx.Amount)}</td>
        <td><span class="${statusClass}">${statusText}</span></td>
        <td>${date}</td>
      </tr>
    `;
  });

  html += `
      </tbody>
    </table>
  `;

  container.innerHTML = html;
}

// ==================== STYLES ====================
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  .btn-momo-payment {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 10px 20px;
    background: linear-gradient(135deg, #ff4444 0%, #ff6b6b 100%);
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
  }

  .btn-momo-payment:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(255, 68, 68, 0.3);
  }

  .btn-momo-payment:active {
    transform: translateY(0);
  }

  .payment-history-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 20px;
  }

  .payment-history-table thead {
    background: #f5f5f5;
  }

  .payment-history-table th,
  .payment-history-table td {
    padding: 12px;
    text-align: left;
    border-bottom: 1px solid #e0e0e0;
    font-size: 13px;
  }

  .payment-history-table th {
    font-weight: 600;
    color: #333;
  }

  .payment-history-table tbody tr:hover {
    background: #fafafa;
  }

  .status-success {
    color: #2ecc71;
    font-weight: 600;
  }

  .status-failed {
    color: #e74c3c;
    font-weight: 600;
  }
`;

document.head.appendChild(styleSheet);
