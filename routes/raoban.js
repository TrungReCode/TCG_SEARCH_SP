const express = require("express");
const router = express.Router();
const { connectDB, sql } = require("../db");


// ====================================================
// 🔹 1. LẤY DANH SÁCH THẺ RAO BÁN THEO NGƯỜI DÙNG
// ====================================================
router.get("/list/:maNguoiDung", async (req, res) => {
    try {
        const maNguoiDung = parseInt(req.params.maNguoiDung);
        if (isNaN(maNguoiDung))
            return res.status(400).json({ success: false, error: "ID người dùng không hợp lệ!" });

        const pool = await connectDB();

        const result = await pool.request()
            .input("MaNguoiDung", sql.Int, maNguoiDung)
            .query(`
                SELECT RB.MaRaoBan, RB.MaThe, TB.TenThe, TB.HinhAnh, TB.Gia AS GiaGoc,
                       RB.Gia AS GiaBan, RB.TinhTrang, RB.MoTa, RB.NgayDang
                FROM TheRaoBan RB
                JOIN TheBai TB ON RB.MaThe = TB.MaThe
                WHERE RB.MaNguoiDung = @MaNguoiDung
                ORDER BY RB.NgayDang DESC
            `);

        res.json({ success: true, data: result.recordset });

    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});


// ====================================================
// 🔹 2. THÊM THẺ CÓ SẴN VÀO DANH SÁCH RAO BÁN
// ====================================================
router.post("/add", async (req, res) => {
    try {
        const { MaNguoiDung, MaThe, MoTa, Gia, TinhTrang } = req.body;

        if (!MaNguoiDung || !MaThe || !Gia)
            return res.status(400).json({ success: false, error: "Thiếu dữ liệu đầu vào!" });

        const pool = await connectDB();

        await pool.request()
            .input("MaNguoiDung", sql.Int, MaNguoiDung)
            .input("MaThe", sql.Int, MaThe)
            .input("MoTa", sql.NVarChar, MoTa || "")
            .input("Gia", sql.Decimal(10, 2), Gia)
            .input("TinhTrang", sql.NVarChar, TinhTrang || "Mới")
            .query(`
                INSERT INTO TheRaoBan (MaNguoiDung, MaThe, MoTa, Gia, TinhTrang)
                VALUES (@MaNguoiDung, @MaThe, @MoTa, @Gia, @TinhTrang)
            `);

        res.json({ success: true, message: "Đã thêm vào danh sách rao bán!" });

    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});


// ====================================================
// 🔹 3. THÊM THẺ THỦ CÔNG + RAO BÁN (TRANSACTION)
// ====================================================
router.post("/add", async (req, res) => {
    // 1. Nhận thêm tham số HinhAnh từ body
    const { MaNguoiDung, MaThe, Gia, TinhTrang, MoTa, HinhAnh } = req.body;

    if (!MaNguoiDung || !MaThe) {
        return res.status(400).json({ error: "Vui lòng chọn thẻ và đăng nhập." });
    }

    try {
        const pool = await connectDB();
        
        // 2. Thêm HinhAnh vào câu lệnh INSERT
        await pool.request()
            .input("MaNguoiDung", sql.Int, MaNguoiDung)
            .input("MaThe", sql.Int, MaThe)
            .input("Gia", sql.Decimal(10, 2), Gia)
            .input("TinhTrang", sql.NVarChar, TinhTrang)
            .input("MoTa", sql.NVarChar, MoTa || "")
            .input("HinhAnh", sql.NVarChar, HinhAnh || null) // Nếu rỗng thì lưu NULL
            .query(`
                INSERT INTO TheRaoBan (MaNguoiDung, MaThe, Gia, TinhTrang, MoTa, HinhAnh)
                VALUES (@MaNguoiDung, @MaThe, @Gia, @TinhTrang, @MoTa, @HinhAnh)
            `);

        res.json({ success: true, message: "Đăng bán thành công!" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Lỗi server" });
    }
});


// ====================================================
// 🔹 4. CẬP NHẬT THÔNG TIN RAO BÁN (Hỗ trợ cả User & Admin)
// ====================================================
router.put("/update/:maRaoBan", async (req, res) => {
    try {
        // MaNguoiDung là tùy chọn (Optional). 
        // - Nếu User tự sửa: Frontend sẽ gửi MaNguoiDung lên.
        // - Nếu Admin sửa: Frontend (admin.js) sẽ KHÔNG gửi MaNguoiDung lên.
        const { MaNguoiDung, Gia, MoTa, TinhTrang } = req.body;
        const MaRaoBan = req.params.maRaoBan;

        const pool = await connectDB();
        const request = pool.request()
            .input("MaRaoBan", sql.Int, MaRaoBan)
            .input("Gia", sql.Decimal(10, 2), Gia)
            .input("MoTa", sql.NVarChar, MoTa || "")
            .input("TinhTrang", sql.NVarChar, TinhTrang || "Mới");

        // Câu lệnh SQL cơ bản
        let sqlQuery = `
            UPDATE TheRaoBan
            SET Gia = @Gia, MoTa = @MoTa, TinhTrang = @TinhTrang
            WHERE MaRaoBan = @MaRaoBan
        `;

        // LOGIC PHÂN QUYỀN THÔNG MINH:
        // Nếu request có gửi kèm MaNguoiDung -> Đây là User thường -> Bắt buộc check quyền sở hữu
        if (MaNguoiDung) {
            request.input("MaNguoiDung", sql.Int, MaNguoiDung);
            sqlQuery += ` AND MaNguoiDung = @MaNguoiDung`;
        }
        // Nếu KHÔNG gửi MaNguoiDung -> Hiểu ngầm là Admin (hoặc logic Admin dashboard) -> Bỏ qua check sở hữu

        const result = await request.query(sqlQuery);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ 
                success: false, 
                message: "Không tìm thấy bài đăng hoặc bạn không có quyền sửa (sai chủ sở hữu)!" 
            });
        }

        res.json({ success: true, message: "Đã cập nhật thông tin thành công!" });

    } catch (err) {
        console.error("Lỗi update rao bán:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// routes/raoban.js

router.delete("/:id", async (req, res) => {
    const id = req.params.id;
    const pool = await connectDB();
    const transaction = new sql.Transaction(pool);

    try {
        await transaction.begin();
        const request = new sql.Request(transaction);

        // 1. KIỂM TRA: Có đơn hàng nào đang treo không?
        const checkOrder = await request
            .input("MaRaoBan", sql.Int, id)
            .query(`
                SELECT TOP 1 MaDonHang FROM DonHang 
                WHERE MaRaoBan = @MaRaoBan 
                AND TrangThai IN ('ChoXuLy', 'DangGiao')
            `);
            
        if (checkOrder.recordset.length > 0) {
            await transaction.rollback();
            return res.status(400).json({ error: "Không thể xóa! Thẻ này đang có người đặt mua hoặc đang giao dịch." });
        }

        // 2. DỌN DẸP: Xóa các đơn hàng cũ liên quan đến thẻ này trong bảng DonHang
        // (Bước này khắc phục lỗi 500 Foreign Key)
        await request.query("DELETE FROM DonHang WHERE MaRaoBan = @MaRaoBan");

        // 3. XÓA CHÍNH: Xóa tin rao bán
        const result = await request.query("DELETE FROM TheRaoBan WHERE MaRaoBan = @MaRaoBan");

        if (result.rowsAffected[0] === 0) {
            await transaction.rollback();
            return res.status(404).json({ error: "Tin không tồn tại." });
        }

        await transaction.commit();
        res.json({ success: true, message: "Đã xóa tin và lịch sử giao dịch liên quan!" });

    } catch (err) {
        if (transaction._aborted === false) await transaction.rollback();
        console.error("Lỗi xóa tin bán:", err);
        res.status(500).json({ error: "Lỗi server: " + err.message });
    }
});


// ====================================================
// 🔹 6. TÌM KIẾM THẺ CỦA NGƯỜI KHÁC (CÓ LOGIC ẢNH & ĐƠN HÀNG)
// ====================================================
router.get("/search-combined", async (req, res) => {
    try {
        const { keyword = "", maNguoiDung, maTroChoi } = req.query;

        // Bắt buộc phải có maNguoiDung để xác định IsOwner
        if (!maNguoiDung || isNaN(parseInt(maNguoiDung))) {
            return res.status(400).json({ success: false, error: "Thiếu ID người dùng hiện tại để xác định chủ sở hữu!" });
        }

        const pool = await connectDB();
        const maNguoiDungInt = parseInt(maNguoiDung);

        let query = `
            SELECT 
                RB.MaRaoBan, RB.Gia AS GiaBan, RB.TinhTrang, RB.MoTa AS MoTaRaoBan, RB.NgayDang,
                TB.MaThe, TB.TenThe, TB.Gia AS GiaGoc,
                ND.MaNguoiDung, ND.TenNguoiDung,
                TC.TenTroChoi,
                
                -- [QUAN TRỌNG] Logic lấy ảnh: Ưu tiên ảnh người bán up -> Ảnh gốc -> Placeholder
                COALESCE(RB.HinhAnh, TB.HinhAnh, 'https://via.placeholder.com/300?text=No+Img') AS HinhAnh,

                -- Kiểm tra xem người dùng hiện tại có phải chủ thẻ không
                CASE WHEN RB.MaNguoiDung = @MaNguoiDung THEN 1 ELSE 0 END AS IsOwner,

                -- Lấy trạng thái đơn hàng và ID người mua (nếu có đơn đang treo)
                DH.TrangThai AS TrangThaiDonHang,
                DH.MaNguoiTao AS NguoiMuaId

            FROM TheRaoBan RB
            JOIN TheBai TB ON RB.MaThe = TB.MaThe
            JOIN NguoiDung ND ON RB.MaNguoiDung = ND.MaNguoiDung
            JOIN TroChoi TC ON TB.MaTroChoi = TC.MaTroChoi
            
            -- JOIN với đơn hàng để lấy thông tin (Chỉ lấy đơn đang xử lý hoặc đã bán)
            LEFT JOIN DonHang DH ON RB.MaRaoBan = DH.MaRaoBan 
                                 AND DH.TrangThai IN ('ChoXuLy', 'DaThanhToan', 'DangGiao')

            WHERE 1 = 1
        `;
        
        const request = pool.request();
        request.input("MaNguoiDung", sql.Int, maNguoiDungInt);

        // Filter Keyword
        if (keyword) {
            query += ` AND TB.TenThe LIKE @keyword`;
            request.input("keyword", sql.NVarChar, `%${keyword}%`);
        }
        // Filter Game
        if (maTroChoi && !isNaN(parseInt(maTroChoi)) && parseInt(maTroChoi) > 0) {
            query += ` AND TB.MaTroChoi = @MaTroChoi`;
            request.input("MaTroChoi", sql.Int, parseInt(maTroChoi));
        }

        query += ` ORDER BY RB.NgayDang DESC`;

        const result = await request.query(query);
        res.json({ success: true, data: result.recordset });

    } catch (err) {
        console.error("Lỗi tìm kiếm:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// ====================================================
// 🔹 7. LẤY CHI TIẾT THẺ RAO BÁN (CÓ LOGIC ẢNH)
// ====================================================
router.get("/detail/:maRaoBan", async (req, res) => {
    try {
        const pool = await connectDB();

        const result = await pool.request()
            .input("MaRaoBan", sql.Int, req.params.maRaoBan)
            .query(`
                SELECT 
                    RB.MaRaoBan, RB.Gia AS GiaBan, RB.TinhTrang, RB.MoTa AS MoTaRaoBan, RB.NgayDang,
                    TB.MaThe, TB.TenThe, TB.MoTa AS MoTaThe, TB.Gia AS GiaGoc,
                    ND.MaNguoiDung, ND.TenNguoiDung,
                    TC.TenTroChoi,
                    
                    -- [QUAN TRỌNG] Logic lấy ảnh tương tự như search
                    COALESCE(RB.HinhAnh, TB.HinhAnh, 'https://via.placeholder.com/300?text=No+Img') AS HinhAnh

                FROM TheRaoBan RB
                JOIN TheBai TB ON RB.MaThe = TB.MaThe
                JOIN NguoiDung ND ON RB.MaNguoiDung = ND.MaNguoiDung
                JOIN TroChoi TC ON TB.MaTroChoi = TC.MaTroChoi
                WHERE RB.MaRaoBan = @MaRaoBan
            `);

        if (result.recordset.length === 0)
            return res.status(404).json({ success: false, message: "Không tìm thấy thẻ rao bán!" });

        res.json({ success: true, data: result.recordset[0] });

    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;