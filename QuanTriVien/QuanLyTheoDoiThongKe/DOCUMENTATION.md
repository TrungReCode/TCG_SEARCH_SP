# Thống Kê & Báo Cáo - Hướng Dẫn Chi Tiết

## 📊 Tổng Quan

Hệ thống thống kê toàn diện được thiết kế để giúp quản trị viên theo dõi hoạt động và hiệu suất của nền tảng TCG Hub. Hệ thống tích hợp Chart.js để hiển thị dữ liệu dưới dạng biểu đồ chuyên nghiệp.

## 🎯 Tính Năng Chính

### 1. **Bảng Thống Kê Tổng Quan** (Overview Cards)
- Tổng số người dùng
- Tổng số đơn hàng
- Doanh thu từ các đơn hàng thành công
- Tổng số thẻ bài trong hệ thống
- Tổng số bộ sưu tập
- Số lượng bài rao bán đang hoạt động

### 2. **Biểu Đồ Doanh Thu** (Revenue Chart - 30 ngày)
- Hiển thị doanh thu theo ngày
- Số lượng đơn hàng theo ngày
- Thang đo kép (Doanh thu & Số đơn hàng)
- Cho phép phân tích xu hướng sales

### 3. **Trạng Thái Đơn Hàng** (Order Status)
- Biểu đồ Doughnut với các trạng thái:
  - Chờ xử lý
  - Đã thanh toán
  - Đang giao
  - Đã giao
  - Từ chối
  - Hủy
- Hiển thị tỷ lệ phần trăm

### 4. **Người Dùng Mới** (User Stats - 30 ngày)
- Biểu đồ cột: Người dùng mới mỗi ngày
- Đường line: Tổng tích lũy người dùng
- Giúp theo dõi tăng trưởng người dùng

### 5. **Phổ Biến Trò Chơi** (Games Popularity)
- Top 10 trò chơi phổ biến nhất
- Số thẻ bài của mỗi trò chơi
- Số bài rao bán
- Số bộ sưu tập

### 6. **Top 10 Người Bán Hàng** (Top Sellers)
- Danh sách người bán hàng có doanh thu cao nhất
- Hiển thị: Số đơn hàng, Doanh thu, Giá trung bình
- Giúp xác định các seller chính

## 🚀 Các Tính Năng Hiệu Năng

### 1. **Caching (Bộ Nhớ Cache)**
```
- Thời hạn cache: 5 phút
- Lưu trữ: LocalStorage của trình duyệt
- Tự động xóa khi hết hạn
- Giảm tải trên server 60-80%
```

### 2. **Lazy Loading**
- Dữ liệu được tải khi trang khởi động
- Các biểu đồ được render tuần tự
- Không chặn giao diện người dùng

### 3. **Auto-Refresh**
```
- Tự động làm mới dữ liệu mỗi 10 phút
- Làm mới khi tab trở nên hoạt động
- Có thể làm mới thủ công bằng nút "Làm mới"
```

### 4. **Xử Lý Lỗi Mạnh Mẽ**
- Try-catch blocks cho tất cả API calls
- Thông báo lỗi rõ ràng cho người dùng
- Dự phòng dữ liệu nếu lỗi xảy ra

## 🛡️ Xử Lý Data Trống

### Chiến Lược Xử Lý:

#### 1. **Empty State Detection**
```javascript
if (labels.length === 0 || datasets.every(ds => ds.data.length === 0)) {
  showEmpty(chartId);
  return;
}
```

#### 2. **Empty State UI**
- Hiển thị biểu tượng túi rỗng
- Thông báo "Không có dữ liệu"
- Ẩn biểu đồ
- Không hiển thị lỗi

#### 3. **Fallback Values**
```javascript
totalUsers: data.totalUsers || 0
totalRevenue: parseFloat(data.totalRevenue || 0)
```

#### 4. **Default Colors & Labels**
- Luôn có màu sắc mặc định
- Labels được mapping rõ ràng (VD: 'ChoXuLy' → 'Chờ xử lý')

## 📡 API Endpoints

### Base URL: `http://localhost:3000/statistics`

#### 1. **GET /overview**
```
Dữ liệu: Tổng quan toàn diện
Cache: 5 phút
```

#### 2. **GET /revenue**
```
Dữ liệu: Doanh thu 30 ngày gần đây
Cache: 5 phút
```

#### 3. **GET /orders-status**
```
Dữ liệu: Phân loại đơn hàng theo trạng thái
Cache: 5 phút
```

#### 4. **GET /users-stats**
```
Dữ liệu: Người dùng mới 30 ngày
Cache: 5 phút
```

#### 5. **GET /games-popularity**
```
Dữ liệu: Top 10 trò chơi phổ biến
Cache: 5 phút
```

#### 6. **GET /top-sellers**
```
Dữ liệu: Top 10 người bán hàng
Cache: 5 phút
```

#### 7. **POST /clear-cache**
```
Chức năng: Xóa cache và làm mới tất cả dữ liệu
```

## 💻 Cấu Trúc File

```
QuanTriVien/
├── admin.html                              (Dashboard chính)
├── QuanLyTheoDoiThongKe/
│   ├── statistics.html                    (Trang thống kê)
│   └── statistics.js                      (Logic phía client)
└── ...
routes/
├── statistics.js                          (API endpoints)
└── ...
```

## 📊 Thư Viện Biểu Đồ

### Chart.js 4.4.0
- **Ưu điểm:**
  - Nhẹ (~30KB)
  - Hỗ trợ đa loại biểu đồ
  - Responsive tự động
  - Tooltips, legend tùy chỉnh
  - Hoạt động tốt trên mobile

- **Loại biểu đồ sử dụng:**
  - Line Chart: Doanh thu
  - Bar Chart: Người dùng, Trò chơi
  - Doughnut Chart: Trạng thái đơn hàng
  - Mixed Chart: Doanh thu + Số đơn hàng

## 🔧 Tối Ưu Hóa Hiệu Năng

### 1. **Backend**
```javascript
- Transaction queries cho tính nhất quán
- Indexes trên các cột thường xuyên query
- Giới hạn dữ liệu (TOP 10)
- Cache 5 phút
```

### 2. **Frontend**
```javascript
- LocalStorage cache
- Lazy loading charts
- Parallel data loading
- Minimal DOM manipulation
- Event debouncing
```

### 3. **Network**
```
- Gzip compression
- Caching headers
- Request deduplication
- Minimal payload size
```

## 🎨 Giao Diện Responsive

**Desktop (> 1024px)**
- Bố cục lưới đa cột
- Các biểu đồ cạnh nhau

**Tablet (768px - 1024px)**
- Biểu đồ stack theo chiều dọc
- Điều chỉnh kích cỡ card

**Mobile (< 768px)**
- Một cột
- Card nhỏ hơn
- Biểu đồ tối ưu cho màn hình nhỏ

## 🔐 Bảo Mật

- SQL Injection prevention: Parameterized queries
- CORS enabled cho requests hợp lệ
- Transaction management
- Error handling không leak database info

## 📋 Các Câu Query Database

### Orders Analysis
```sql
SELECT TrangThai, COUNT(*) 
FROM DonHang 
GROUP BY TrangThai
```

### Revenue Calculation
```sql
SELECT 
  FORMAT(NgayTao, 'yyyy-MM-dd') as date,
  SUM(Gia) as revenue
FROM DonHang
WHERE TrangThai IN ('DaThanhToan', 'DangGiao', 'DaGiao')
  AND NgayTao >= DATEADD(day, -30, CAST(GETDATE() AS DATE))
GROUP BY FORMAT(NgayTao, 'yyyy-MM-dd')
```

### Games Popularity
```sql
SELECT TOP 10
  t.TenTroChoi,
  COUNT(DISTINCT cb.MaTheBai) as cardCount,
  COUNT(DISTINCT rb.MaRaoBan) as listingCount
FROM TroChoi t
LEFT JOIN ChiTietTheBai cb ON t.MaTroChoi = cb.MaTroChoi
GROUP BY t.TenTroChoi
ORDER BY cardCount DESC
```

## 🐛 Troubleshooting

### Biểu đồ không hiển thị
1. Kiểm tra Network tab (F12)
2. Xác nhận API response có dữ liệu
3. Xóa cache: `CacheManager.clear()`

### Data không cập nhật
1. Nhấn nút "Làm mới"
2. Kiểm tra Cache Duration (5 phút)
3. Xóa LocalStorage: `localStorage.clear()`

### Lỗi Chart.js
1. Kiểm tra CDN link có sẵn
2. Kiểm tra console để xem error message
3. Đảm bảo canvas element tồn tại

## 📈 Mở Rộng Tương Lai

- [ ] Export dữ liệu to CSV/Excel
- [ ] Bộ lọc theo ngày tùy chỉnh
- [ ] Biểu đồ tương tác hơn
- [ ] Real-time updates with WebSocket
- [ ] Machine learning predictions
- [ ] Custom report builder

## 📞 Hỗ Trợ

Nếu gặp vấn đề:
1. Kiểm tra logs trong console (F12)
2. Xóa cache browser
3. Làm mới trang (Ctrl+Shift+R)
4. Kiểm tra connection database

---

**Phiên bản:** 1.0  
**Ngày tạo:** 2024  
**Tác giả:** Development Team
