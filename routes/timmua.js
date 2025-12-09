const express = require('express');
const router = express.Router();
const { sql, connectDB } = require('../db');

// =========================================================================
// 1. ĐĂNG TIN CẦN MUA (POST /add)
// =========================================================================
router.post("/add", async (req, res) => {
    const { MaNguoiDung, MaThe, TieuDe, MoTa, HinhAnh, GiaMongMuon } = req.body;

    if (!MaNguoiDung || !TieuDe) {
        return res.status(400).json({ error: "Thiếu thông tin bắt buộc (Người dùng, Tiêu đề)" });
    }

    try {
        const pool = await connectDB();
        
        // Xử lý MaThe: Nếu gửi lên là 0 hoặc null thì lưu vào DB là NULL
        const finalMaThe = (MaThe && MaThe > 0) ? MaThe : null;
        
        // Xử lý HinhAnh: Nếu không có ảnh user up, để NULL (SQL khi SELECT sẽ tự lấy ảnh thẻ gốc)
        const finalHinhAnh = HinhAnh && HinhAnh.trim() !== "" ? HinhAnh : null;

        const result = await pool.request()
            .input("MaNguoiDung", sql.Int, MaNguoiDung)
            .input("MaThe", sql.Int, finalMaThe)
            .input("TieuDe", sql.NVarChar, TieuDe)
            .input("MoTa", sql.NVarChar, MoTa || "")
            .input("HinhAnh", sql.NVarChar, finalHinhAnh)
            .input("GiaMongMuon", sql.Decimal(10, 2), GiaMongMuon || 0)
            .query(`
                INSERT INTO TheCanMua (MaNguoiDung, MaThe, TieuDe, MoTa, HinhAnh, GiaMongMuon)
                VALUES (@MaNguoiDung, @MaThe, @TieuDe, @MoTa, @HinhAnh, @GiaMongMuon)
            `);

        res.json({ success: true, message: "Đăng tin tìm mua thành công!" });

    } catch (err) {
        console.error("Lỗi đăng tin mua:", err);
        res.status(500).json({ error: "Lỗi server khi đăng tin." });
    }
});

// =========================================================================
// 2. LẤY DANH SÁCH TIN CẦN MUA (GET /list) - CHO TRANG NEWS FEED
// =========================================================================
router.get("/list", async (req, res) => {
    try {
        const { maNguoiDung } = req.query; // Nhận tham số từ Frontend
        const pool = await connectDB();
        
        // Sử dụng CASE WHEN EXISTS để kiểm tra xem User hiện tại đã có đơn hàng 'BAN' cho tin này chưa
        let sqlQuery = `
            SELECT 
                cm.MaCanMua, cm.TieuDe, cm.MoTa, cm.GiaMongMuon, cm.NgayDang, cm.MaThe,
                nd.TenNguoiDung, nd.MaNguoiDung,
                COALESCE(cm.HinhAnh, tb.HinhAnh) AS HinhAnhHienThi,
                
                -- [FIX] Cột DaLienHe: 1 nếu đã có đơn hàng (chưa hủy), 0 nếu chưa
                CASE WHEN EXISTS (
                    SELECT 1 FROM DonHang dh 
                    WHERE dh.MaCanMua = cm.MaCanMua 
                    AND dh.MaNguoiTao = @CurrentUser 
                    AND dh.LoaiGiaoDich = 'BAN'
                    AND dh.TrangThai IN ('ChoXuLy', 'DaThanhToan', 'DangGiao')
                ) THEN 1 ELSE 0 END AS DaLienHe

            FROM TheCanMua cm
            JOIN NguoiDung nd ON cm.MaNguoiDung = nd.MaNguoiDung
            LEFT JOIN TheBai tb ON cm.MaThe = tb.MaThe
            WHERE cm.DaKetThuc = 0 
            ORDER BY cm.NgayDang DESC
        `;
        
        const request = pool.request();
        // Nếu client không gửi maNguoiDung (chưa login), dùng -1 để không khớp với ai
        request.input("CurrentUser", sql.Int, maNguoiDung ? parseInt(maNguoiDung) : -1);

        const result = await request.query(sqlQuery);
        res.json(result.recordset);

    } catch (err) {
        console.error("Lỗi lấy danh sách cần mua:", err);
        res.status(500).json({ error: "Lỗi server" });
    }
});

// =========================================================================
// 3. SỬA TIN (PUT /update/:id) - Hỗ trợ cả User và Admin
// =========================================================================
router.put("/update/:id", async (req, res) => {
    const id = req.params.id;
    // Lấy MaNguoiDung từ body (Nếu là Admin thì frontend sẽ không gửi kèm field này)
    const { MaNguoiDung, TieuDe, MoTa, GiaMongMuon, HinhAnh, DaKetThuc } = req.body;

    try {
        const pool = await connectDB();
        const request = pool.request()
            .input("MaCanMua", sql.Int, id)
            .input("TieuDe", sql.NVarChar, TieuDe)
            .input("MoTa", sql.NVarChar, MoTa)
            .input("GiaMongMuon", sql.Decimal(10, 2), GiaMongMuon)
            .input("HinhAnh", sql.NVarChar, HinhAnh || null)
            // Nếu DaKetThuc không gửi lên (undefined), mặc định là 0 (đang tìm)
            .input("DaKetThuc", sql.Bit, DaKetThuc !== undefined ? DaKetThuc : 0);

        // Câu lệnh SQL cơ bản
        let sqlQuery = `
            UPDATE TheCanMua 
            SET TieuDe=@TieuDe, MoTa=@MoTa, GiaMongMuon=@GiaMongMuon, 
                HinhAnh=@HinhAnh, DaKetThuc=@DaKetThuc
            WHERE MaCanMua=@MaCanMua
        `;

        // --- LOGIC PHÂN QUYỀN ---
        // 1. Nếu Request có MaNguoiDung -> User thường đang sửa -> Check quyền sở hữu
        if (MaNguoiDung) {
            request.input("MaNguoiDung", sql.Int, MaNguoiDung);
            sqlQuery += ` AND MaNguoiDung = @MaNguoiDung`;
        }
        // 2. Nếu KHÔNG có MaNguoiDung -> Admin dashboard đang sửa -> Bỏ qua check quyền

        const result = await request.query(sqlQuery);

        // Kiểm tra xem có dòng nào được update không
        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ 
                success: false, 
                error: "Không tìm thấy tin hoặc bạn không có quyền sửa (sai chủ sở hữu)!" 
            });
        }

        res.json({ success: true, message: "Cập nhật thành công" });

    } catch (err) {
        console.error("Lỗi cập nhật tin mua:", err);
        res.status(500).json({ error: "Lỗi server khi cập nhật tin" });
    }
});

// =========================================================================
// 4. XÓA TIN (DELETE /:id)
// =========================================================================
// routes/timmua.js

router.delete("/:id", async (req, res) => {
    const id = req.params.id;
    const pool = await connectDB();
    const transaction = new sql.Transaction(pool);

    try {
        await transaction.begin();
        const request = new sql.Request(transaction);

        // 1. KIỂM TRA
        const checkOrder = await request
            .input("MaCanMua", sql.Int, id)
            .query(`
                SELECT TOP 1 MaDonHang FROM DonHang 
                WHERE MaCanMua = @MaCanMua 
                AND TrangThai IN ('ChoXuLy', 'DangGiao')
            `);
            
        if (checkOrder.recordset.length > 0) {
            await transaction.rollback();
            return res.status(400).json({ error: "Không thể xóa! Tin này đang có người liên hệ bán." });
        }

        // 2. DỌN DẸP LỊCH SỬ (Khắc phục lỗi 500)
        await request.query("DELETE FROM DonHang WHERE MaCanMua = @MaCanMua");

        // 3. XÓA TIN
        const result = await request.query("DELETE FROM TheCanMua WHERE MaCanMua = @MaCanMua");

        if (result.rowsAffected[0] === 0) {
            await transaction.rollback();
            return res.status(404).json({ error: "Tin không tồn tại." });
        }

        await transaction.commit();
        res.json({ success: true, message: "Đã xóa tin tìm mua thành công!" });

    } catch (err) {
        if (transaction._aborted === false) await transaction.rollback();
        console.error("Lỗi xóa tin mua:", err);
        res.status(500).json({ error: "Lỗi server: " + err.message });
    }
});

// =========================================================================
// 5. CHỨC NĂNG MATCHING (KHỚP LỆNH)
// Tìm những người đang BÁN thẻ mà User này đang CẦN MUA
// =========================================================================

router.get("/match/:MaNguoiDung", async (req, res) => {
    const currentUserId = req.params.MaNguoiDung;

    try {
        const pool = await connectDB();
        
        //Match cả ID lẫn Tên
        const query = `
            SELECT 
                cm.MaCanMua,
                cm.TieuDe AS TieuDeCanMua,
                cm.GiaMongMuon,
                rb.MaRaoBan,
                rb.Gia AS GiaNguoiBan,
                rb.TinhTrang,
                rb.MaNguoiDung AS IdNguoiBan,
                nd_ban.TenNguoiDung AS TenNguoiBan,
                tb.TenThe,
                tb.HinhAnh AS AnhTheGoc,
                tb.MaThe

            FROM TheCanMua cm
            -- JOIN VỚI BẢNG THẺ ĐANG BÁN
            INNER JOIN TheRaoBan rb ON 1=1 -- Dùng 1=1 để xử lý logic trong ON hoặc WHERE
            INNER JOIN TheBai tb ON rb.MaThe = tb.MaThe
            INNER JOIN NguoiDung nd_ban ON rb.MaNguoiDung = nd_ban.MaNguoiDung
            
            WHERE 
                cm.MaNguoiDung = @CurrentUserId  
                AND cm.DaKetThuc = 0
                AND rb.MaNguoiDung != @CurrentUserId
                
                -- [FIX LỖI 2] LOGIC MATCHING THÔNG MINH
                AND (
                    -- Ưu tiên 1: Khớp chính xác ID thẻ (nếu tin mua có chọn thẻ)
                    (cm.MaThe IS NOT NULL AND cm.MaThe = rb.MaThe)
                    OR
                    -- Ưu tiên 2: Khớp tên (nếu tin mua ko chọn thẻ mà nhập tay)
                    -- Tìm xem Tiêu đề tin mua có CHỨA tên thẻ đang bán không
                    (cm.MaThe IS NULL AND cm.TieuDe LIKE N'%' + tb.TenThe + N'%')
                )
            
            ORDER BY rb.NgayDang DESC
        `;

        const result = await pool.request()
            .input("CurrentUserId", sql.Int, currentUserId)
            .query(query);

        res.json({
            success: true,
            matches: result.recordset,
            count: result.recordset.length
        });

    } catch (err) {
        console.error("Lỗi Matching:", err);
        res.status(500).json({ error: "Lỗi server" });
    }
});

module.exports = router;