const express = require('express');
const router = express.Router();
const { sql, connectDB } = require('../db');
const bcrypt = require('bcryptjs');

router.post('/', async (req, res) => {
    const { username, password } = req.body;
    try {
        const pool = await connectDB();
        const result = await pool.request()
            .input('username', sql.NVarChar, username)
            .query('SELECT MatKhau, VaiTro, MaNguoiDung FROM NguoiDung WHERE TenNguoiDung=@username');

        if (!result.recordset.length) return res.status(401).json({ error: "Sai tên đăng nhập hoặc mật khẩu" });

        const user = result.recordset[0];
        const match = await bcrypt.compare(password, user.MatKhau);
        if (!match) return res.status(401).json({ error: "Sai tên đăng nhập hoặc mật khẩu" });

        res.json({
            success: true,
            username,
            vaitro: user.VaiTro ? 1 : 0,
            maNguoiDung: user.MaNguoiDung
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Lỗi server" });
    }
});

module.exports = router;
