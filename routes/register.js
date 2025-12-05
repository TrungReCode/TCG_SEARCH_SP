const express = require('express');
const router = express.Router();
const { sql, connectDB } = require('../db');
const bcrypt = require('bcryptjs');

router.post('/', async (req, res) => {
    const { username, email, password } = req.body;
    try {
        const pool = await connectDB();
        const hashed = await bcrypt.hash(password, 10);

        const check = await pool.request()
            .input('email', sql.NVarChar, email)
            .input('username', sql.NVarChar, username)
            .query('SELECT * FROM NguoiDung WHERE Email=@email OR TenNguoiDung=@username');

        if (check.recordset.length) return res.status(400).json({ error: "Tên đăng nhập hoặc email đã tồn tại" });

        await pool.request()
            .input('username', sql.NVarChar, username)
            .input('email', sql.NVarChar, email)
            .input('password', sql.NVarChar, hashed)
            .query('INSERT INTO NguoiDung (TenNguoiDung, Email, MatKhau, VaiTro) VALUES (@username,@email,@password,0)');

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Lỗi server" });
    }
});

module.exports = router;
