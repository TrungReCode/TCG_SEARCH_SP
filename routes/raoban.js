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
router.post("/add-custom", async (req, res) => {
    const pool = await connectDB();
    const transaction = new sql.Transaction(pool);

    try {
        const { MaNguoiDung, MaTroChoi, TenThe, MoTaThe, GiaGoc, GiaBan, TinhTrang } = req.body;

        if (!MaNguoiDung || !TenThe || !GiaBan)
            return res.status(400).json({ success: false, error: "Thiếu dữ liệu đầu vào!" });

        await transaction.begin();
        const request = new sql.Request(transaction);

        // 1️⃣ Thêm vào TheBai
        const insertCard = await request
            .input("MaTroChoi", sql.Int, MaTroChoi)
            .input("TenThe", sql.NVarChar, TenThe)
            .input("MoTaThe", sql.NVarChar, MoTaThe || "")
            .input("GiaGoc", sql.Decimal(10, 2), GiaGoc || 0)
            .query(`
                INSERT INTO TheBai (MaTroChoi, TenThe, MoTa, Gia)
                OUTPUT INSERTED.MaThe
                VALUES (@MaTroChoi, @TenThe, @MoTaThe, @GiaGoc)
            `);

        const MaTheMoi = insertCard.recordset[0].MaThe;

        // 2️⃣ Thêm vào TheRaoBan
        await request
            .input("MaNguoiDung", sql.Int, MaNguoiDung)
            .input("MaThe", sql.Int, MaTheMoi)
            .input("GiaBan", sql.Decimal(10, 2), GiaBan)
            .input("TinhTrang", sql.NVarChar, TinhTrang || "Mới")
            .query(`
                INSERT INTO TheRaoBan (MaNguoiDung, MaThe, Gia, TinhTrang)
                VALUES (@MaNguoiDung, @MaThe, @GiaBan, @TinhTrang)
            `);

        await transaction.commit();
        res.json({ success: true, message: "Đã thêm thẻ mới và rao bán!" });

    } catch (err) {
        await transaction.rollback();
        res.status(500).json({ success: false, error: err.message });
    }
});


// ====================================================
// 🔹 4. CẬP NHẬT THÔNG TIN RAO BÁN
// ====================================================
router.put("/update/:maRaoBan", async (req, res) => {
    try {
        const { MaNguoiDung, Gia, MoTa, TinhTrang } = req.body;
        const MaRaoBan = req.params.maRaoBan;

        if (!MaNguoiDung)
            return res.status(401).json({ success: false, error: "Chưa xác thực người dùng!" });

        const pool = await connectDB();

        const result = await pool.request()
            .input("MaRaoBan", sql.Int, MaRaoBan)
            .input("MaNguoiDung", sql.Int, MaNguoiDung)
            .input("Gia", sql.Decimal(10, 2), Gia)
            .input("MoTa", sql.NVarChar, MoTa || "")
            .input("TinhTrang", sql.NVarChar, TinhTrang || "Mới")
            .query(`
                UPDATE TheRaoBan
                SET Gia = @Gia, MoTa = @MoTa, TinhTrang = @TinhTrang
                WHERE MaRaoBan = @MaRaoBan AND MaNguoiDung = @MaNguoiDung
            `);

        if (result.rowsAffected[0] === 0)
            return res.status(404).json({ success: false, message: "Không tìm thấy bài đăng hoặc bạn không có quyền sửa!" });

        res.json({ success: true, message: "Đã cập nhật thông tin rao bán!" });

    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});


// ====================================================
// 🔹 5. XÓA THẺ RAO BÁN
// ====================================================
router.delete("/delete/:maRaoBan", async (req, res) => {
    try {
        const { maNguoiDung } = req.body;

        if (!maNguoiDung)
            return res.status(400).json({ success: false, error: "Thiếu ID người dùng để xác thực!" });

        const pool = await connectDB();

        const result = await pool.request()
            .input("MaRaoBan", sql.Int, req.params.maRaoBan)
            .input("MaNguoiDung", sql.Int, maNguoiDung)
            .query(`
                DELETE FROM TheRaoBan
                WHERE MaRaoBan = @MaRaoBan AND MaNguoiDung = @MaNguoiDung
            `);

        if (result.rowsAffected[0] === 0)
            return res.status(404).json({ success: false, message: "Không tìm thấy hoặc bạn không có quyền xóa!" });

        res.json({ success: true, message: "Đã xóa khỏi danh sách rao bán!" });

    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});


// ====================================================
// 🔹 6. TÌM KIẾM THẺ CỦA NGƯỜI KHÁC (ĐÃ CHỈNH SỬA)
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
                TB.MaThe, TB.TenThe, TB.HinhAnh, TB.Gia AS GiaGoc,
                ND.MaNguoiDung, ND.TenNguoiDung, ND.Email,
                TC.TenTroChoi,
                -- THÊM TRƯỜNG IsOwner VÀO KẾT QUẢ
                CASE WHEN RB.MaNguoiDung = @MaNguoiDung THEN 1 ELSE 0 END AS IsOwner 
            FROM TheRaoBan RB
            JOIN TheBai TB ON RB.MaThe = TB.MaThe
            JOIN NguoiDung ND ON RB.MaNguoiDung = ND.MaNguoiDung
            JOIN TroChoi TC ON TB.MaTroChoi = TC.MaTroChoi
            WHERE 1 = 1
        `;
        
        const request = pool.request();
        
        // 1. Gán MaNguoiDung để sử dụng trong biểu thức CASE (không loại trừ)
        request.input("MaNguoiDung", sql.Int, maNguoiDungInt);

        // 2. Tìm kiếm theo Từ khóa (Tên Thẻ) - Nếu có
        if (keyword) {
            query += ` AND TB.TenThe LIKE @keyword`;
            request.input("keyword", sql.NVarChar, `%${keyword}%`);
        }

        // 3. Lọc theo Trò chơi - Nếu có (maTroChoi > 0)
        const maTroChoiInt = parseInt(maTroChoi);
        if (maTroChoi && !isNaN(maTroChoiInt) && maTroChoiInt > 0) {
            query += ` AND TB.MaTroChoi = @MaTroChoi`;
            request.input("MaTroChoi", sql.Int, maTroChoiInt);
        }

        // 4. Sắp xếp kết quả
        query += ` ORDER BY RB.NgayDang DESC`;

        const result = await request.query(query);

        res.json({ success: true, data: result.recordset });

    } catch (err) {
        console.error("Lỗi tìm kiếm kết hợp:", err);
        res.status(500).json({ success: false, error: "Lỗi server: " + err.message });
    }
});

// ====================================================
// 🔹 7. LẤY CHI TIẾT THẺ RAO BÁN (ĐÃ BỔ SUNG TÊN TRÒ CHƠI)
// ====================================================
router.get("/detail/:maRaoBan", async (req, res) => {
    try {
        const pool = await connectDB();

        const result = await pool.request()
            .input("MaRaoBan", sql.Int, req.params.maRaoBan)
            .query(`
                SELECT RB.MaRaoBan, RB.Gia AS GiaBan, RB.TinhTrang, RB.MoTa, RB.NgayDang,
                       TB.MaThe, TB.TenThe, TB.HinhAnh, TB.MoTa AS MoTaThe, TB.Gia AS GiaGoc,
                       ND.MaNguoiDung, ND.TenNguoiDung,
                       TC.TenTroChoi
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