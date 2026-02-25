# Hướng dẫn Triển khai Thanh toán MoMo - Quick Start

## 📋 Checklist Triển khai

- [ ] Cập nhật `.env` với thông tin MoMo
- [ ] Chạy SQL script `payment_setup.sql`
- [ ] Cài đặt package `axios` nếu chưa có
- [ ] Test API endpoints
- [ ] Thêm button thanh toán vào UI
- [ ] Test thanh toán end-to-end
- [ ] Triển khai lên production

---

## 1️⃣ CẤU HÌNH BACKEND

### Cài đặt Dependencies
```bash
npm install axios
```

### Cập nhật .env
```env
# Sao chép từ .env.example
MOMO_PARTNER_CODE=MOMO12345
MOMO_ACCESS_KEY=key123456
MOMO_SECRET_KEY=secret123456
MOMO_IPN_URL=https://yourdomain.com/payment/notify
MOMO_REDIRECT_URL=https://yourdomain.com/payment/callback
```

### Chạy SQL Script
```bash
# Mở SQL Server Management Studio
# 1. Chọn database TCGHub
# 2. Mở file: payment_setup.sql
# 3. Bấm Execute
```

---

## 2️⃣ THÊM UI - TRANG MUA THẺ (TimMua)

### File: Player/TimMua/timmua.html

Thêm vào phần `<head>`:
```html
<script src="../../payment-helper.js"></script>
```

Tìm button "Mua" trong card thẻ và thay thế:
```javascript
// Trước:
function buyCard(card) {
  alert('Bạn muốn mua: ' + card.TenThe);
}

// Sau:
function buyCard(card) {
  const { MaRaoBan, TenThe, Gia } = card;
  
  buyWithMoMo(
    `Mua: ${TenThe}`,  // Tên sản phẩm
    Gia,               // Giá (VND)
    MaRaoBan           // ID rao bán
  );
}
```

Hoặc thêm button mới:
```html
<button onclick="buyCard(card)" class="btn btn-primary">
  <i class="fas fa-wallet"></i> Mua bằng MoMo
</button>
```

---

## 3️⃣ THÊM UI - TRANG RAO BÁN (DSRaoBan)

### File: Player/DSRaoBan/raoban.html

Thêm script:
```html
<script src="../../payment-helper.js"></script>
```

Trong hàm hiển thị card:
```javascript
function displayCard(card) {
  const { MaRaoBan, TenThe, Gia } = card;
  
  return `
    <div class="card">
      <h3>${TenThe}</h3>
      <p>Giá: ${Gia.toLocaleString()} VND</p>
      <button onclick="buyWithMoMo('${TenThe}', ${Gia}, ${MaRaoBan})" 
              class="btn-momo-payment">
        <i class="fas fa-wallet"></i> Mua bằng MoMo
      </button>
    </div>
  `;
}
```

---

## 4️⃣ KIỂM TRA KẾT QUẢ THANH TOÁN

Thêm vào trang player.html (trong `<script>`):

```javascript
// Khi trang load, kiểm tra kết quả thanh toán
document.addEventListener('DOMContentLoaded', () => {
  const result = paymentManager.checkPaymentResult();

  if (result) {
    if (result.status === 'success') {
      // Thanh toán thành công
      showNotification('✓ Thanh toán thành công! Order ID: ' + result.orderId, 'success');
      
      // Cập nhật UI - ví dụ load lại danh sách
      loadCards();
    } else if (result.status === 'failed') {
      // Thanh toán thất bại
      showNotification('✗ Thanh toán thất bại: ' + result.message, 'error');
    }
  }
});

// Hàm hiển thị thông báo
function showNotification(message, type) {
  const div = document.createElement('div');
  div.className = `notification notification-${type}`;
  div.textContent = message;
  document.body.appendChild(div);
  
  setTimeout(() => div.remove(), 5000);
}
```

---

## 5️⃣ HIỂN THỊ LỊCH SỬ THANH TOÁN

Thêm vào trang player profile:

```html
<!-- HTML -->
<div id="paymentHistory"></div>

<!-- JavaScript -->
<script src="../../payment-helper.js"></script>
<script>
  displayPaymentHistory('paymentHistory');
</script>
```

---

## 6️⃣ API TEST

### Test khởi tạo thanh toán
```bash
curl -X POST http://localhost:3000/payment/initiate-momo \
  -H "Content-Type: application/json" \
  -d '{
    "MaNguoiDung": 1,
    "Amount": 50000,
    "TenSanPham": "Test Card"
  }'
```

### Test lịch sử
```bash
curl http://localhost:3000/payment/payment-history/1
```

### Test thông tin giao dịch
```bash
curl http://localhost:3000/payment/transaction-info/TCG1234567890
```

---

## 7️⃣ SAI LẦM THƯỜNG GẶP

### ❌ Lỗi: Cannot find module 'axios'
```bash
# Giải pháp:
npm install axios
```

### ❌ Lỗi: "Invalid signature"
```
Kiểm tra:
1. MOMO_SECRET_KEY trong .env có đúng không?
2. Thứ tự key trong signature có chính xác không?
```

### ❌ Lỗi: "Partner Code not found"
```
Kiểm tra:
1. MOMO_PARTNER_CODE có đúng không?
2. Tài khoản MoMo đã được verify chưa?
3. Đang dùng sandbox hay production?
```

### ❌ Lỗi: IPN không được gọi
```
Kiểm tra:
1. MOMO_IPN_URL có public được không?
   - Dùng ngrok: ngrok http 3000
   - Cập nhật URL: http://xxx.ngrok.io/payment/notify
2. Firewall có cho phép không?
3. Server có đang chạy không?
```

---

## 8️⃣ CODE EXAMPLES

### Ví dụ 1: Button đơn giản
```html
<button onclick="buyWithMoMo('Thẻ Pokemon Pikachu', 100000, 5)">
  Mua bằng MoMo
</button>
```

### Ví dụ 2: Form thanh toán
```javascript
async function processPayment() {
  const userId = localStorage.getItem('maNguoiDung');
  const amount = document.getElementById('amount').value;
  
  const response = await fetch('http://localhost:3000/payment/initiate-momo', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      MaNguoiDung: parseInt(userId),
      Amount: parseInt(amount),
      TenSanPham: 'Mua thẻ'
    })
  });
  
  const result = await response.json();
  if (result.success) {
    window.location.href = result.payUrl;
  }
}
```

### Ví dụ 3: Dynamic table
```javascript
async function showTransactions() {
  const history = await paymentManager.getPaymentHistory();
  
  history.forEach(tx => {
    console.table({
      'Order ID': tx.OrderId,
      'Công': paymentManager.formatCurrency(tx.Amount),
      'Trạng thái': tx.TrangThai,
      'Ngày': new Date(tx.NgayTao).toLocaleDateString('vi-VN')
    });
  });
}
```

---

## 9️⃣ PRODUCTION DEPLOYMENT

### Chuẩn bị
1. Mua domain + SSL certificate
2. Đăng ký tài khoản MoMo Production (không phải test)
3. Cập nhật `.env` với production credentials
4. Cập nhật MOMO_IPN_URL, MOMO_REDIRECT_URL với domain thực

### Triển khai
```bash
# 1. Build
npm install
npm run build

# 2. Test tất cả
npm test

# 3. Deploy lên server
# (dùng PM2, Docker, hoặc hosting service)

# 4. Monitor logs
pm2 logs payment
```

---

## 🔟 SUPPORT

- 📖 Documentasi: ./MOMO_PAYMENT_SETUP.md
- 💻 Code: ./routes/payment.js
- 🎨 Frontend: ./Player/checkout.html
- 📝 Helper: ./payment-helper.js

---

**Bắt đầu:** Copy & paste từ examples, customize theo nhu cầu! 🚀
