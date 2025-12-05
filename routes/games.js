const express = require('express');
const router = express.Router();
const { sql, connectDB } = require('../db');

// Lấy danh sách trò chơi
router.get('/', async (req, res) => {
    try {
        const pool = await connectDB();
        const result = await pool.request()
            .query('SELECT MaTroChoi, TenTroChoi, MaLoai FROM TroChoi');
        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Lỗi server" });
    }
});

// Thêm trò chơi
router.post('/', async (req, res) => {
    const { TenTroChoi, MaLoai } = req.body;
    try {
        const pool = await connectDB();
        await pool.request()
            .input('TenTroChoi', sql.NVarChar, TenTroChoi)
            .input('MaLoai', sql.Int, MaLoai)
            .query('INSERT INTO TroChoi (TenTroChoi, MaLoai) VALUES (@TenTroChoi, @MaLoai)');
        res.json({ message: "Đã thêm trò chơi" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Lỗi server" });
    }
});

// Sửa trò chơi
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { TenTroChoi, MaLoai } = req.body;
    try {
        const pool = await connectDB();
        await pool.request()
            .input('MaTroChoi', sql.Int, id)
            .input('TenTroChoi', sql.NVarChar, TenTroChoi)
            .input('MaLoai', sql.Int, MaLoai)
            .query('UPDATE TroChoi SET TenTroChoi = @TenTroChoi, MaLoai = @MaLoai WHERE MaTroChoi = @MaTroChoi');
        res.json({ message: "Đã cập nhật trò chơi" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Lỗi server" });
    }
});

// Xóa trò chơi (Đã sửa để xử lý Foreign Key)
router.delete('/:id', async (req, res) => {
    let id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: "ID không hợp lệ" });

    const pool = await connectDB();
    const transaction = new sql.Transaction(pool); // Sử dụng Transaction

    try {
        await transaction.begin();
        const request = new sql.Request(transaction);

        // 1. Xóa các bản rao bán liên quan
        await request
            .input('id', sql.Int, id)
            .query(`
                DELETE TheRaoBan 
                WHERE MaThe IN (SELECT MaThe FROM TheBai WHERE MaTroChoi = @id)
            `);

        // 2. Xóa các thẻ bài liên quan
        await request
            .query('DELETE FROM TheBai WHERE MaTroChoi = @id');

        // 3. Xóa trò chơi
        await request
            .query('DELETE FROM TroChoi WHERE MaTroChoi = @id');

        await transaction.commit();
        res.json({ success: true, message: `Đã xóa trò chơi ID ${id} và tất cả dữ liệu liên quan.` });
    } catch (err) {
        await transaction.rollback();
        console.error(err);
        res.status(500).json({ error: "Lỗi Server: Không thể xóa trò chơi. Vui lòng kiểm tra log chi tiết." });
    }
});

module.exports = router;