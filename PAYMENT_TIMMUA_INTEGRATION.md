# Hướng Dẫn Thanh Toán MoMo - Trang Tìm Mua (Tích hợp)

## 📝 Tóm Tắt Cập Nhật

Chức năng thanh toán MoMo đã được **tích hợp trực tiếp** vào trang TimMua (`/Player/TimMua/timmua.html`) thay vì mở một trang riêng.

### ✨ Tính Năng Mới:
- ✅ Modal thanh toán 2 tab: **MoMo** & **Zalo**
- ✅ Chọn amount nhanh (50K, 100K, 200K, 500K, 1M, 2M)
- ✅ Custom amount input
- ✅ Tab switching mượt mà
- ✅ Thanh toán MoMo trực tiếp từ modal
- ✅ Fallback sang Zalo truyền thống

---

## 🔧 SETUP

### Bước 1: Cấu hình .env
```env
MOMO_PARTNER_CODE=your_partner_code
MOMO_ACCESS_KEY=your_access_key
MOMO_SECRET_KEY=your_secret_key
```

### Bước 2: Chạy SQL Script
```bash
# Chạy payment_setup.sql trên SQL Server
```

### Bước 3: Dependencies (nếu chưa cài)
```bash
npm install axios
```

---

## 📱 GIAO DIỆN

### Modal Thanh Toán (Mới)

```
┌─── Modal Thanh Toán ────────────────────────────┐
│                                                 │
│ [💳 Thanh Toán MoMo] [💰 Zalo]                │
│                                                 │
│ MoMo Payment Tab:                              │
│ ┌─────────────────────────────────────────────┐│
│ │ 💳 Thanh toán qua MoMo                       ││
│ │ An toàn, nhanh chóng và tiện lợi             ││
│ └─────────────────────────────────────────────┘│
│                                                 │
│ Chọn hoặc nhập số tiền (VND):                  │
│ [50K] [100K] [200K] [500K] [1M] [2M]         │
│ [________________ Nhập khác ________________]  │
│                                                 │
│ Số tiền: 100,000 VND                          │
│ Tổng cộng: 100,000 VND                        │
│                                                 │
│ [Thanh Toán MoMo]  [Hủy]                      │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## 📋 FLOW MUA HÀNG

```
1. User bấm "Mua" ở card thẻ
   ↓
2. Yêu cầu xác nhận (confirm)
   ↓
3. Gửi request tạo đơn hàng
   ↓
4. Modal thanh toán mở lên (mặc định tab MoMo)
   ↓
5. User chọn/nhập số tiền
   ↓
6. User click "Thanh Toán MoMo"
   ↓
7. Chuyển hướng sang MoMo để xác nhận
   ↓
8. Quay lại trang (tự động reload đơn hàng)
```

---

## 🎯 Sử Dụng trong Code

### HTML (trong timmua.html - đã sẵn)
```html
<button onclick="handlePurchase(maRaoBan, giaBan)" class="btn-buy">
  Mua
</button>
```

### JavaScript (trong script.js - đã sẵn)
```javascript
// Transaction.handlePurchase tự động mở modal thanh toán
// Payment module xử lý tab switching & MoMo payment
```

---

## 🔄 QUY TRÌNH THANH TOÁN

### 1️⃣ User chọn MoMo Tab
- Modal mở ở tab **MoMo** mặc định
- Hiển thị preset amounts

### 2️⃣ User nhập/chọn số tiền
```javascript
// Click preset button: setMoMoAmount(100000)
// Hoặc gõ trực tiếp vào input
// Tự động cập nhật summary
```

### 3️⃣ User click "Thanh Toán MoMo"
```
- Validate amount (>= 10,000 VND)
- Gửi request tới /payment/initiate-momo
- Nhận payUrl từ MoMo
- Chuyển hướng: window.location.href = payUrl
```

### 4️⃣ User xác nhận trên MoMo
```
- Ứng dụng MoMo mở
- User xác nhận thanh toán
- MoMo gọi IPN callback tới server
- Server update database
```

### 5️⃣ Callback tới trang
```
- MoMo redirect về: /payment/callback?orderId=...&resultCode=0
- Trang timmua.html check URL params
- Hiển thị alert success/failed
- Tự động reload orders list
```

---

## 💻 API ENDPOINTS (Từ Backend)

Vẫn sử dụng các endpoint cũ:

```
GET  /payment/payment-history/:userId
GET  /payment/transaction-info/:orderId
POST /payment/initiate-momo
POST /payment/notify (IPN từ MoMo)
GET  /payment/callback (Redirect từ MoMo)
```

---

## ⚙️ CẤU HÌNH JAVASCRIPT

### Payment Module (trong script.js)
```javascript
const Payment = {
    currentOrder: null,          // Lưu info đơn hàng
    init: () => { ... },         // Setup tab listeners
    switchTab: (e) => { ... },   // Tab switching logic
    setAmount: (amount) => {},   // Set amount & highlight
    updateSummary: () => {},     // Update display
    handleMoMoPayment: async () {}, // Gửi request MoMo
    showModal: () => {}          // Hiển thị modal
};
```

### Global Functions (HTML onclick)
```javascript
window.setMoMoAmount = Payment.setAmount
window.updateMomoSummary = Payment.updateSummary
window.handleMoMoPayment = Payment.handleMoMoPayment
```

---

## 🎨 CSS Changes

Thêm vào `styles.css`:
```css
.payment-tab { /* Tab button styling */ }
.payment-tab.active { /* Active tab */ }
.payment-content { /* Tab content */ }
.payment-content.visible { /* Show animation */ }
.preset-btn { /* Amount preset buttons */ }
.preset-btn.active { /* Active preset */ }
```

---

## 📊 SỰ THAY ĐỔI SO VỚI CŨ

| Cũ | Mới |
|----|-----|
| Trang checkout riêng | Integrated trong modal |
| Mở tab mới | Modal popup |
| 1 phương thức | 2 tabs: MoMo & Zalo |
| Form phức tạp | Preset + custom amount |
| Checkout page | Timmua page |

---

## 🧪 TESTING

### Test Case 1: Thanh toán MoMo thành công
```
1. Bấm "Mua" ở card
2. Modal mở
3. Chọn "100K" preset
4. Click "Thanh Toán MoMo"
5. Chuyển hướng MoMo
6. Xác nhận trên app
7. Quay lại page
8. Alert: ✓ Thanh toán thành công
```

### Test Case 2: Chuyển sang Zalo
```
1. Bấm "Mua"
2. Click tab "💰 Zalo"
3. Hiển thị button Zalo
4. Click để chat admin
```

---

## ⚠️ LƯU Ý

1. **Không cần trang checkout riêng**
   - Tất cả xử lý trong modal timmua

2. **Payment-helper.js vẫn cần**
   - Dùng cho các trang khác nếu cần

3. **URL Params tự động clean**
   - Không thấy payment=success ở URL

4. **Amount validation**
   - Min 10,000 VND
   - Server cũng validate

---

## 📱 Mobile Responsive

Modal thanh toán **fully responsive**:
- ✅ Preset buttons stack trên mobile
- ✅ Tab navigation hoạt động tốt
- ✅ Input amount dễ sử dụng
- ✅ Button size thích hợp

---

## 🔒 LIÊN HỆ QUẢN TRỊ

Xem tài liệu chi tiết:
- `MOMO_PAYMENT_SETUP.md` - Setup & API
- `PAYMENT_QUICK_START.md` - Examples
- `PAYMENT_IMPLEMENTATION_SUMMARY.md` - Overview

---

## ✅ CHECKLIST

- [x] Tích hợp payment modal vào timmua.html
- [x] Thêm tab switching logic
- [x] Thêm MoMo payment handler
- [x] CSS styling cho tabs & forms
- [x] Global functions untuk HTML onclick
- [x] Payment result tracking từ URL params
- [x] Zalo fallback option
- [x] Amount validation & formatting
- [x] Orders auto-refresh sau payment

---

**Status**: ✅ Ready to Use  
**Version**: 2.0 (Integrated)  
**Updated**: 25/02/2024

🚀 **Thanh toán MoMo trực tiếp trong trang Tìm Mua!**
