const express = require('express');
const router = express.Router();
const { sql, connectDB } = require('../db');

// Lấy danh sách tin tức
router.get('/', async (req, res) => {
    try {
        const pool = await connectDB();
        const result = await pool.request()
            .query('SELECT MaTinTuc, TieuDe, NoiDung, NgayTao FROM TinTuc ORDER BY NgayTao DESC');
        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Lỗi server" });
    }
});

// Thêm tin tức
router.post('/', async (req, res) => {
    const { TieuDe, NoiDung, MaTacGia } = req.body;
    try {
        const pool = await connectDB();
        await pool.request()
            .input('TieuDe', sql.NVarChar, TieuDe)
            .input('NoiDung', sql.NVarChar, NoiDung)
            .input('MaTacGia', sql.Int, MaTacGia)
            .query('INSERT INTO TinTuc (TieuDe, NoiDung, MaTacGia) VALUES (@TieuDe,@NoiDung,@MaTacGia)');
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Lỗi server" });
    }
});

// Cập nhật tin tức
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { TieuDe, NoiDung } = req.body;
    try {
        const pool = await connectDB();
        await pool.request()
            .input('MaTinTuc', sql.Int, id)
            .input('TieuDe', sql.NVarChar, TieuDe)
            .input('NoiDung', sql.NVarChar, NoiDung)
            .query('UPDATE TinTuc SET TieuDe=@TieuDe, NoiDung=@NoiDung WHERE MaTinTuc=@MaTinTuc');
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Lỗi server" });
    }
});

// Xóa tin tức
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const pool = await connectDB();
        await pool.request()
            .input('MaTinTuc', sql.Int, id)
            .query('DELETE FROM TinTuc WHERE MaTinTuc=@MaTinTuc');
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Lỗi server" });
    }
});

module.exports = router;
