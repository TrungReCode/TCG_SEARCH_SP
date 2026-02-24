# 🔧 HƯỚNG DẪN DEBUG - Trang Thống Kê Không Load Dữ Liệu

## ✅ ĐÃ SỬA XONG

API backend đã được sửa và test thành công. Tất cả endpoints đều hoạt động:
- ✓ Database connection OK
- ✓ All 8 API endpoints returning data correctly
- ✓ Frontend code updated with enhanced logging

## 🧪 CÁCH KIỂM TRA

### Bước 1: Mở Test Page
Mở file này trong browser để test API trực tiếp (không có cache):
```
http://localhost:3000/QuanTriVien/QuanLyTheoDoiThongKe/test-api.html
```

File này sẽ test từng endpoint một và hiển thị JSON response.

### Bước 2: Xem Console Logs
1. Mở trang thống kê: `http://localhost:3000/QuanTriVien/QuanLyTheoDoiThongKe/statistics.html`
2. Nhấn **F12** để mở DevTools
3. Chuyển sang tab **Console**
4. Nhấn **Ctrl+R** để hard refresh (xóa cache)
5. Xem các log messages:

**Log messages bạn nên thấy:**
```
[TCG Stats] HTML page loaded - v2.0.0
[TCG Stats] v2.0.0 - Frontend loaded
[TCG Stats] API Base: http://localhost:3000/statistics
[TCG Stats] Debug mode: true
[TCG Stats] DOM Content Loaded - Initializing...
[TCG Stats] ===============================
[TCG Stats] refreshAll() started
[TCG Stats] ===============================
[TCG Stats] loadOverview() started
[TCG Stats] fetchData: /overview (cacheKey: overview)
[TCG Stats] ⚠ Cache MISS: overview, fetching from API...
[TCG Stats] → Fetch: http://localhost:3000/statistics/overview
[TCG Stats] ← Response: 200 OK
[TCG Stats] ✓ Data received for overview: {totalUsers: 6, totalOrders: 3, ...}
[TCG Stats] Overview data: {totalUsers: 6, totalOrders: 3, ...}
[TCG Stats] ✓ loadOverview() completed
... (tương tự cho các charts khác)
[TCG Stats] ✓✓✓ ALL DATA LOADED SUCCESSFULLY ✓✓✓
```

### Bước 3: Kiểm tra Network Tab
1. Trong DevTools, chuyển sang tab **Network**
2. Nhấn **Ctrl+R** để refresh
3. Filter by: XHR  
4. Kiểm tra các request:
   - `/statistics/overview` → Status 200
   - `/statistics/revenue` → Status 200
   - `/statistics/orders-status` → Status 200
   - (và các endpoints khác)

### Bước 4: Clear Browser Cache (Quan trọng!)
**Nếu vẫn thấy "Không có dữ liệu"**, cache cũ có thể còn tồn tại:

**Chrome/Edge:**
1. Nhấn **Ctrl + Shift + Delete**
2. Chọn "Cached images and files"
3. Time range: "All time"
4. Click "Clear data"
5. Đóng browser hoàn toàn (tất cả tabs)
6. Mở lại và test

**Hoặc Hard Refresh:**
1. Mở trang statistics.html
2. Nhấn **Ctrl + Shift + R** (Windows) hoặc **Cmd + Shift + R** (Mac)
3. Hoặc: Mở DevTools (F12) → Right-click nút Refresh → Chọn "Empty Cache and Hard Reload"

## 🐛 NẾU VẪN LỖI

### Lỗi 1: Console hiện "Failed to fetch" hoặc "Network error"
**Nguyên nhân:** Server không chạy hoặc port sai

**Giải pháp:**
```powershell
# Kiểm tra server đang chạy
Get-Process | Where-Object { $_.ProcessName -eq 'node' }

# Nếu không có → Start server:
cd C:\Users\nttru\OneDrive\Documents\TCG
node server.js
```

### Lỗi 2: Console hiện "HTTP 404"
**Nguyên nhân:** Router chưa được load

**Giải pháp:**
Kiểm tra file `server.js` có đoạn này:
```javascript
const statisticsRouter = require('./routes/statistics');
app.use('/statistics', statisticsRouter);
```

Nếu không có → Thêm vào và restart server.

### Lỗi 3: Console hiện "HTTP 500" hoặc SQL errors
**Nguyên nhân:** Database connection issue

**Giải pháp:**
1. Kiểm tra file `.env` có đúng thông tin database:
   ```
   DB_SERVER=your_server
   DB_NAME=your_database
   DB_USER=your_user
   DB_PASSWORD=your_password
   ```

2. Test database connection:
   ```
   http://localhost:3000/statistics/test-db
   ```

3. Xem console log của server để thấy SQL error cụ thể

### Lỗi 4: Dữ liệu hiện "0" hoặc "0 VND" cho tất cả
**Nguyên nhân:** Database trống hoặc queries trả về empty

**Giải pháp:**
1. Check database có data:
   ```sql
   SELECT COUNT(*) FROM NguoiDung
   SELECT COUNT(*) FROM DonHang
   SELECT COUNT(*) FROM TheBai
   ```

2. Nếu database trống → Chèn test data vào các bảng

### Lỗi 5: Chart.js không load
**Nguyên nhân:** CDN bị block hoặc không có internet

**Kiểm tra:** Console có error "Chart is not defined"?

**Giải pháp:**
- Kiểm tra internet connection
- Hoặc download Chart.js local và thay CDN link

## 📊 DATA SAMPLE (Expected Output)

Nếu mọi thứ hoạt động, bạn sẽ thấy:
```json
{
  "totalUsers": 6,
  "totalOrders": 3,
  "totalRevenue": 0.69,
  "totalCards": 449,
  "totalCollections": 1,
  "activeListings": 6,
  "activeWantToBuy": 1,
  "totalNews": 3
}
```

## 🔍 FILES ĐÃ CẬP NHẬT

1. **Backend:**
   - `/routes/statistics.js` - 8 endpoints + test-db endpoint
   - Enhanced logging với labels cho từng query

2. **Frontend:**
   - `/QuanTriVien/QuanLyTheoDoiThongKe/statistics.html` (v2.0.0)
   - `/QuanTriVien/QuanLyTheoDoiThongKe/statistics.js` (v2.0.0 + DEBUG mode)
   - Cache buster: `?v=2.0.0`

3. **Test Tools:**
   - `/QuanTriVien/QuanLyTheoDoiThongKe/test-api.html` - Manual API testing

## 💡 TIPS

1. **Luôn mở Console khi debug** - Tất cả thông tin quan trọng đều log ra đây
2. **Test API riêng lẻ trước** - Dùng test-api.html để đảm bảo backend OK
3. **Clear cache thường xuyên** - Browser cache code JS rất lâu
4. **Restart server sau mỗi thay đổi backend** - Node.js không auto-reload
5. **Check Network tab** - Xem request/response thực tế

## 📞 CONTACT

Nếu sau tất cả bước trên vẫn lỗi, gửi screenshot của:
1. Console tab (toàn bộ logs)
2. Network tab (showing failed requests)
3. Response tab of failed request (JSON error message)

Cần thêm trợ giúp? Reply với details và screenshots!
