const express = require('express');
const router = express.Router();
const { sql, connectDB } = require('../db');
const bcrypt = require('bcryptjs');

// routes/auth.js

router.post("/", async (req, res) => {
    // 1. Nhận thêm SoDienThoai từ body
    const { TenNguoiDung, Email, MatKhau, SoDienThoai } = req.body; 

    if (!TenNguoiDung || !Email || !MatKhau || !SoDienThoai) {
        return res.status(400).json({ error: "Vui lòng nhập đầy đủ thông tin (bao gồm SĐT)" });
    }

    try {
        const pool = await connectDB();
        const hashedPassword = await bcrypt.hash(MatKhau, 10);

        // 2. Thêm vào câu lệnh INSERT
        await pool.request()
            .input("TenNguoiDung", sql.NVarChar, TenNguoiDung)
            .input("Email", sql.NVarChar, Email)
            .input("MatKhau", sql.NVarChar, hashedPassword)
            .input("SoDienThoai", sql.NVarChar, SoDienThoai) // <--- Input mới
            .query(`
                INSERT INTO NguoiDung (TenNguoiDung, Email, MatKhau, SoDienThoai)
                VALUES (@TenNguoiDung, @Email, @MatKhau, @SoDienThoai)
            `);

        res.json({ success: true, message: "Đăng ký thành công!" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
module.exports = router;
