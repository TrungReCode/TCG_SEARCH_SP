const express = require('express');
const router = express.Router();
const { sql, connectDB } = require('../db');
const bcrypt = require('bcryptjs');

// [SỬA 1]: Đổi đường dẫn thành '/login' để khớp với Frontend
router.post('/', async (req, res) => {
    
    // [SỬA 2]: Nhận đúng tên biến mà Frontend gửi lên (TenNguoiDung, MatKhau)
    const { TenNguoiDung, MatKhau } = req.body;

    // Validate cơ bản
    if (!TenNguoiDung || !MatKhau) {
        return res.status(400).json({ error: "Vui lòng nhập đầy đủ thông tin" });
    }

    try {
        const pool = await connectDB();
        
        // [SỬA 3]: Query SQL dùng tham số @TenNguoiDung cho đồng bộ
        // Nên lấy thêm cột TenNguoiDung để trả về cho Frontend hiển thị "Xin chào..."
        const result = await pool.request()
            .input('TenNguoiDung', sql.NVarChar, TenNguoiDung)
            .query('SELECT TenNguoiDung, MatKhau, VaiTro, MaNguoiDung FROM NguoiDung WHERE TenNguoiDung = @TenNguoiDung');

        // Kiểm tra user có tồn tại không
        if (!result.recordset.length) {
            return res.status(401).json({ error: "Sai tên đăng nhập hoặc mật khẩu" });
        }

        const user = result.recordset[0];

        // [SỬA 4]: So sánh MatKhau nhận được với user.MatKhau trong DB
        const match = await bcrypt.compare(MatKhau, user.MatKhau);
        
        if (!match) {
            return res.status(401).json({ error: "Sai tên đăng nhập hoặc mật khẩu" });
        }

        // Trả về kết quả thành công
        // Cấu trúc trả về khớp với những gì login.html đang chờ (data.user)
        res.json({
            success: true,
            user: {
                TenNguoiDung: user.TenNguoiDung,
                VaiTro: user.VaiTro, // SQL Server bit (0/1)
                MaNguoiDung: user.MaNguoiDung
            }
        });

    } catch (err) {
        console.error("Lỗi đăng nhập:", err);
        res.status(500).json({ error: "Lỗi server" });
    }
});

module.exports = router;