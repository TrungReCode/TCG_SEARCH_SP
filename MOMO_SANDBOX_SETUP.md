# Hướng Dẫn Tích Hợp MoMo Test Environment (Sandbox)

> **💡 Dành cho nhà phát triển không có tài khoản MoMo Doanh Nghiệp**

## ✅ Lợi Ích Sử Dụng Sandbox

- ✓ **Miễn phí** - Không cần đăng ký tài khoản doanh nghiệp
- ✓ **Toàn chức năng** - Test tất cả tính năng thanh toán
- ✓ **An toàn** - Không có tiền thật, chỉ test
- ✓ **Nhanh chóng** - Bắt đầu ngay lập tức
- ✓ **Chuyển sang Production dễ** - Khi sẵn sàng

---

## 🔧 BƯỚC 1: Lấy Sandbox Credentials

### Cách 1: Sử dụng Credentials Test Mặc Định

MoMo cung cấp thông tin test mặc định cho nhà phát triển:

```env
# MoMo Sandbox Test Credentials
MOMO_PARTNER_CODE=MOMO123456789
MOMO_ACCESS_KEY=F8BF53D3964D3F100DCA
MOMO_SECRET_KEY=9fc6c94460e4302d1c5f9d8e7f5b6a4c3d2e1a0b
MOMO_ENVIRONMENT=test
MOMO_ENDPOINT=https://test-payment.momo.vn/v2/gateway/api/create
```

### Cách 2: Yêu Cầu Test Account (Tùy Chọn)

1. Vào: https://developers.momo.vn
2. Đăng ký tài khoản developer (free)
3. Tạo application test
4. Nhận Partner Code & Keys
5. Sử dụng endpoint test

---

## 📝 BƯỚC 2: Cấu Hình File .env

### Tạo file `.env` trong thư mục gốc (cùng cấp với `server.js`)

```env
# Database
DB_SERVER=localhost
DB_USER=sa
DB_PASSWORD=your_password
DB_NAME=TCGHub

# MoMo Sandbox Configuration (TEST)
MOMO_PARTNER_CODE=MOMO123456789
MOMO_ACCESS_KEY=F8BF53D3964D3F100DCA
MOMO_SECRET_KEY=9fc6c94460e4302d1c5f9d8e7f5b6a4c3d2e1a0b
MOMO_ENVIRONMENT=test
MOMO_ENDPOINT=https://test-payment.momo.vn/v2/gateway/api/create
MOMO_IPN_URL=http://localhost:3000/payment/notify
MOMO_REDIRECT_URL=http://localhost:3000/payment/callback

# Server
PORT=3000
NODE_ENV=development
```

✋ **QUAN TRỌNG**: 
- Đây là **TEST CREDENTIALS**, không có tiền thực
- Không cần keep bí mật vì đó là thông tin test công khai
- Khi production, bạn sẽ có credentials khác từ MoMo

---

## 🧪 BƯỚC 3: Kiểm Tra Kết Nối

### 1. Cài đặt Packages (nếu chưa)

```bash
npm install express axios crypto
```

### 2. Khởi động Server

```bash
node server.js
```

Nếu thấy message này là OK:
```
✓ Server đang chạy trên http://localhost:3000
✓ Database kết nối thành công
```

### 3. Test API Bằng Postman

Mở **Postman** và gửi request:

```http
POST http://localhost:3000/payment/initiate-momo
Content-Type: application/json

{
  "MaNguoiDung": 1,
  "Amount": 50000,
  "TenSanPham": "Test Purchase"
}
```

**Phản hồi thành công:**
```json
{
  "success": true,
  "orderId": "TCG1708957234123456",
  "requestId": "REQ1708957234123456",
  "payUrl": "https://test-payment.momo.vn/...",
  "qrCodeUrl": "https://..."
}
```

---

## 💳 BƯỚC 4: Test Thanh Toán

### Phương Pháp 1: Qua QR Code (Simulated)

1. Bạn sẽ nhận được `payUrl` từ response
2. Mở URL đó trong browser
3. Bạn sẽ thấy giao diện test MoMo
4. Nhấp "Confirm" để test thanh toán thành công

### Phương Pháp 2: Gửi IPN Thủ Công (Nâng Cao)

Nếu test không tự động callback, bạn có thể trigger IPN thủ công:

```bash
POST http://localhost:3000/payment/notify
Content-Type: application/json

{
  "orderId": "TCG1708957234",
  "transId": "TRANS123456789",
  "resultCode": 0,
  "message": "Success",
  "amount": 50000,
  "signature": "..."  // Được tính tự động
}
```

### Phương Pháp 3: UI Frontend Test

1. Vào trang TimMua hoặc DSRaoBan
2. Bấm nút "Mua bằng MoMo"
3. Đi tới trang checkout
4. Hoàn tất test thanh toán

---

## 🗄️ BƯỚC 5: Chạy SQL Script

Chạy script để tạo bảng `PaymentTransactions`:

```sql
-- File: payment_setup.sql
-- Mở trong SQL Server Management Studio
-- Chọn database: TCGHub
-- Nhấn F5 hoặc Execute
```

---

## 📊 Test Scenarios

### Scenario 1: Thanh Toán Thành Công

```
Input:  Amount = 50000 VND
Result: resultCode = 0 (SUCCESS)
DB:     TrangThai = 'SUCCESS'
```

### Scenario 2: Thanh Toán Thất Bại

```
Input:  Amount = 50000 VND (nhấn Cancel)
Result: resultCode = 1004 (FAILED)
DB:     TrangThai = 'FAILED'
```

### Scenario 3: Kiểm Tra Lịch Sử

```bash
GET http://localhost:3000/payment/payment-history/1
```

Response:
```json
{
  "success": true,
  "data": [
    {
      "OrderId": "TCG123...",
      "Amount": 50000,
      "TrangThai": "SUCCESS",
      "NgayTao": "2025-03-01T10:00:00"
    }
  ]
}
```

---

## 🚀 Chuyển Sang Production (Sau Này)

Khi bạn sẵn sàng:

1. **Đăng ký tài khoản MoMo Doanh Nghiệp** (thực tế)
   - Truy cập: https://business.momo.vn
   - Chờ xác minh (1-2 ngày)
   - Nhận Partner Code & Keys thực

2. **Cập nhật `.env`**:
   ```env
   MOMO_ENVIRONMENT=production
   MOMO_ENDPOINT=https://payment.momo.vn/v2/gateway/api/create
   MOMO_PARTNER_CODE=your_real_partner_code
   MOMO_ACCESS_KEY=your_real_access_key
   MOMO_SECRET_KEY=your_real_secret_key
   ```

3. **Code tự động sử dụng endpoint production** (không cần thay đổi gì)

---

## ⚠️ Troubleshooting

### Lỗi 1: "Invalid Signature"
- **Nguyên nhân**: Secret Key sai hoặc biến môi trường không được load
- **Giải pháp**: 
  ```bash
  # Kiểm tra .env được load
  console.log(process.env.MOMO_SECRET_KEY)  // Trong code
  ```

### Lỗi 2: "Connection Refused"
- **Nguyên nhân**: Server chưa khởi động
- **Giải pháp**: 
  ```bash
  node server.js
  ```

### Lỗi 3: "Database Error"
- **Nguyên nhân**: Bảng PaymentTransactions chưa được tạo
- **Giải pháp**: 
  - Chạy file `payment_setup.sql` trong SQL Server

### Lỗi 4: "CORS Error"
- **Nguyên nhân**: Frontend không thể gọi API từ origin khác
- **Giải pháp**: 
  ```javascript
  // Trong server.js, thêm CORS headers
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    next();
  });
  ```

---

## 📚 Resources Hữu Ích

| Resource | Link |
|----------|------|
| **MoMo Developers** | https://developers.momo.vn |
| **MoMo API Docs** | https://developers.momo.vn/v3/docs |
| **Test Payment** | https://test-payment.momo.vn |
| **Postman Collection** | (Xem file PaymentAPI.postman_collection.json) |

---

## ✨ Kế Tiếp

✅ Bây giờ bạn có thể:
- Phát triển chức năng thanh toán
- Test toàn bộ flow
- Deploy demo
- Khi sẵn sàng production → đăng ký tài khoản MoMo thật

**Có câu hỏi?** Hãy kiểm tra:
1. Console logs của server (`node server.js`)
2. Browser Developer Tools (F12 → Console)
3. Response từ API trong Network tab

---

**Chúc bạn phát triển thành công! 🎉**
