const express = require('express');
const router = express.Router();
const { sql, connectDB } = require('../db');

// Lấy danh sách
router.get('/', async (req, res) => {
  try {
    const pool = await connectDB();
    const result = await pool.request()
      .query('SELECT MaNguoiDung, TenNguoiDung, Email, VaiTro, SoDienThoai FROM NguoiDung');
    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Lỗi server" });
  }
});

// ================== XÓA NGƯỜI DÙNG (ĐÃ SỬA LỖI FOREIGN KEY VÀ THÊM TRANSACTION) ==================
router.delete('/:id', async (req, res) => {
    const maNguoiDung = Number.parseInt(req.params.id);
    
    // 1. Kiểm tra ID hợp lệ
    if (isNaN(maNguoiDung)) {
        return res.status(400).json({ success: false, error: "Mã Người Dùng không hợp lệ." });
    }

    const pool = await connectDB();
    const transaction = new sql.Transaction(pool);

    try {
        await transaction.begin();
        const request = new sql.Request(transaction);

        // Đặt tham số đầu vào
        request.input("MaNguoiDung", sql.Int, maNguoiDung);

        // a. Xóa các thẻ trong bộ sưu tập (con của BoSuuTap)
        await request.query(`
            DELETE FROM TheTrongBoSuuTap 
            WHERE MaBoSuuTap IN (SELECT MaBoSuuTap FROM BoSuuTap WHERE MaNguoiDung = @MaNguoiDung)
        `);

        // b. Xóa các bộ sưu tập của người dùng
        await request.query(`
            DELETE FROM BoSuuTap 
            WHERE MaNguoiDung = @MaNguoiDung
        `);

        // c. Xóa các bài rao bán của người dùng
        await request.query(`
            DELETE FROM TheRaoBan 
            WHERE MaNguoiDung = @MaNguoiDung
        `);
        
        // d. Xóa các tin tức/bài đăng do người dùng này tạo
        await request.query(`
            DELETE FROM TinTuc 
            WHERE MaTacGia = @MaNguoiDung
        `);

        // 3. Xóa bản ghi gốc trong bảng cha: NguoiDung
        const result = await request.query(`
            DELETE FROM NguoiDung 
            WHERE MaNguoiDung = @MaNguoiDung
        `);
        
        // Kiểm tra xem có người dùng nào bị xóa không
        if (result.rowsAffected[0] === 0) {
            await transaction.rollback();
            return res.status(404).json({ success: false, message: "Không tìm thấy người dùng này." });
        }

        await transaction.commit();
        res.json({ success: true, message: "Đã xóa người dùng và tất cả dữ liệu liên quan thành công!" });

    } catch (err) {
        await transaction.rollback(); // Hoàn tác nếu có lỗi SQL
        console.error("Lỗi xóa Người Dùng:", err);
        res.status(500).json({ success: false, error: "Lỗi server khi xóa Người Dùng. Vui lòng kiểm tra log chi tiết." });
    }
});

/*router.patch('/lock/:id', async (req, res) => {
  try {
    const pool = await connectDB();
    await pool.request()
      .input('id', req.params.id)
      .query('UPDATE NguoiDung SET TrangThai = 0 WHERE MaNguoiDung = @id');
    res.json({ message: 'Đã khóa người dùng' });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi server' });
  }
});*/
module.exports = router;
