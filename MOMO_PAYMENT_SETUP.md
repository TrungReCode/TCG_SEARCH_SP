# Hướng dẫn Tích hợp Thanh toán MoMo

## 1. CHUẨN BỊ

### Bước 1: Đăng ký tài khoản MoMo cho Merchant
1. Truy cập: https://business.momo.vn
2. Đăng ký tài khoản Business/Merchant
3. Đợi xác minh (thường 1-2 ngày làm việc)
4. Nhận thông tin:
   - **Partner Code**: Mã định danh của merchant
   - **Access Key**: Khóa truy cập API
   - **Secret Key**: Khóa bí mật (giữ kín!)

### Bước 2: Cấu hình .env
Thêm các biến môi trường vào file `.env`:

```env
# MoMo Payment Configuration
MOMO_PARTNER_CODE=your_partner_code_here
MOMO_ACCESS_KEY=your_access_key_here
MOMO_SECRET_KEY=your_secret_key_here
MOMO_IPN_URL=https://yourdomain.com/payment/notify
MOMO_REDIRECT_URL=https://yourdomain.com/payment/callback
```

## 2. CẤU TRÚC CƠ SỞ DỮ LIỆU

### Chạy SQL Script
Chạy file `payment_setup.sql` trên SQL Server để tạo tabel:

```sql
-- Trang thiết bị: SQL Server Management Studio
-- 1. Mở file payment_setup.sql
-- 2. Chọn database TCGHub
-- 3. Bấm Execute hoặc F5
```

### Bảng được tạo:
- **PaymentTransactions**: Lưu thông tin tất cả giao dịch thanh toán
  - OrderId: ID khách hàng
  - TransactionId: ID giao dịch từ MoMo
  - TrangThai: Trạng thái (PENDING, SUCCESS, FAILED)
  - Amount: Số tiền
  - NgayTao: Ngày tạo giao dịch

## 3. CÁC ENDPOINT API

### 1. Khởi tạo thanh toán
```
POST /payment/initiate-momo
Content-Type: application/json

{
  "MaNguoiDung": 1,
  "MaRaoBan": 5,        // Optional - ID bài rao bán
  "MaCanMua": null,     // Optional - ID bài cần mua
  "Amount": 100000,     // Số tiền (VND)
  "TenSanPham": "Mua thẻ Pokemon"
}

Response:
{
  "success": true,
  "orderId": "TCG1708957234123456",
  "requestId": "REQ1708957234123456",
  "payUrl": "https://payment.momo.vn/..."
}
```

### 2. Callback từ MoMo (Redirect)
```
GET /payment/callback?orderId=TCG1708957234&resultCode=0&message=Success

- resultCode=0: Thanh toán thành công
- Khác 0: Thanh toán thất bại
```

### 3. IPN Notification từ MoMo
```
POST /payment/notify
(MoMo gửi thông tin xác minh thanh toán)
```

### 4. Lấy thông tin giao dịch
```
GET /payment/transaction-info/:orderId

Response:
{
  "success": true,
  "data": {
    "OrderId": "TCG1708957234",
    "Amount": 100000,
    "TrangThai": "SUCCESS",
    "NgayTao": "2024-02-25T10:00:00",
    "NgayHoanTat": "2024-02-25T10:05:00"
  }
}
```

### 5. Lịch sử thanh toán người dùng
```
GET /payment/payment-history/:userId

Response:
{
  "success": true,
  "data": [
    {
      "OrderId": "TCG1708957234",
      "Amount": 100000,
      "TrangThai": "SUCCESS",
      "TenSanPham": "Mua thẻ Pokemon",
      "NgayTao": "2024-02-25T10:00:00"
    }
  ],
  "total": 5
}
```

## 4. FRONTEND INTEGRATION

### Gọi trang thanh toán từ trang player:
```javascript
// Khi người dùng bấm "Mua bằng MoMo"
function buyWithMoMo(raoBanId, productName, price) {
  const userId = localStorage.getItem('maNguoiDung');
  
  window.location.href = `/Player/checkout.html?userId=${userId}&raoBanId=${raoBanId}&productName=${productName}&amount=${price}`;
}

// Kiểm tra kết quả thanh toán
const params = new URLSearchParams(window.location.search);
if (params.get('payment') === 'success') {
  console.log('Thanh toán thành công:', params.get('orderId'));
} else if (params.get('payment') === 'failed') {
  console.log('Thanh toán thất bại');
}
```

### HTML Button
```html
<button onclick="buyWithMoMo(5, 'Thẻ Pikachu', 100000)" class="btn btn-pay">
  <i class="fas fa-wallet"></i> Mua bằng MoMo
</button>
```

## 5. TRẠNG THÁI GIAO DỊCH

| Trạng thái | Ý nghĩa |
|-----------|---------|
| PENDING | Chờ xác nhận từ MoMo |
| SUCCESS | Thanh toán thành công |
| FAILED | Thanh toán thất bại |
| CANCELLED | Người dùng hủy |

## 6. KIỂM THỬ (Testing)

### Chế độ Test
MoMo cung cấp sandbox API để kiểm thử:
- Endpoint Test: `https://test-payment.momo.vn/v2/gateway/api/create`
- Dùng tài khoản test MoMo

### Tài khoản Test
1. Cài đặt ứng dụng MoMo trên điện thoại
2. Tạo tài khoản test
3. Thêm số dư test (mỗi lần khởi động lại app, số dư reset)

### Kiểm thử
```bash
# 1. Khởi tạo thanh toán
curl -X POST http://localhost:3000/payment/initiate-momo \
  -H "Content-Type: application/json" \
  -d '{
    "MaNguoiDung": 1,
    "Amount": 50000,
    "TenSanPham": "Test MoMo"
  }'

# 2. Kiểm tra lịch sử thanh toán
curl http://localhost:3000/payment/payment-history/1
```

## 7. TÍNH NĂNG BỔNG

### Đã triển khai:
✅ Tích hợp API MoMo  
✅ Xác minh chữ ký (Signature verification)  
✅ Lưu trữ giao dịch trong database  
✅ IPN Notification handling  
✅ Lịch sử thanh toán người dùng  
✅ Giao diện thanh toán  

### Có thể thêm:
- [ ] Hoàn lại tiền (Refund)
- [ ] Báo cáo thanh toán thống kê
- [ ] Thông báo email/SMS sau thanh toán
- [ ] Tích hợp nhiều phương thức thanh toán khác
- [ ] Thanh toán định kỳ (Subscription)

## 8. BẢO MẬT

⚠️ **QUAN TRỌNG:**
1. **Không commit Secret Key vào Git** - Dùng .env
2. **Kiểm tra chữ ký** - Xác minh tất cả request từ MoMo
3. **HTTPS only** - Luôn dùng HTTPS trên production
4. **Rate limiting** - Hạn chế số request
5. **Log giao dịch** - Theo dõi tất cả giao dịch

## 9. TROUBLESHOOTING

### Lỗi: "Invalid signature"
- Kiểm tra Secret Key có khớp không
- Kiểm tra thứ tự key trong signature

### Lỗi: "Partner not found"
- Kiểm tra Partner Code có chính xác không
- Kiểm tra tài khoản đã được MoMo verify chưa

### IPN không được gọi
- Kiểm tra URL IPN có public không
- Kiểm tra firewall/server có cho phép không
- Kiểm tra logs xem có error không

## 10. LIÊN HỆ HỖ TRỢ

- MoMo Business: https://business.momo.vn
- Tài liệu API: https://developers.momo.vn
- Support: support@momo.vn

---

**Phiên bản:** 1.0  
**Cập nhật:** 25/02/2024  
**Tác giả:** TCG Hub Admin
