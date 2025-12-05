const express = require("express")
const router = express.Router()
const { sql, connectDB } = require("../db")

// ================== LẤY DANH SÁCH BỘ SƯU TẬP CỦA NGƯỜI DÙNG ==================
router.get("/:MaNguoiDung", async (req, res) => {
    await connectDB()
    const { MaNguoiDung } = req.params

    const result = await sql.query(`
        SELECT B.*, T.TenTroChoi
        FROM BoSuuTap B
        JOIN TroChoi T ON B.MaTroChoi = T.MaTroChoi
        WHERE B.MaNguoiDung = ${MaNguoiDung}
    `)

    res.json(result.recordset)
})

// ================== TẠO BỘ SƯU TẬP ==================
router.post("/", async (req, res) => {
    const { MaNguoiDung, TenBoSuuTap, MaTroChoi } = req.body
    try {
        await connectDB()
        const result = await sql.query(`
            INSERT INTO BoSuuTap (MaNguoiDung, TenBoSuuTap, MaTroChoi)
            OUTPUT INSERTED.MaBoSuuTap
            VALUES (${MaNguoiDung}, N'${TenBoSuuTap.replace(/'/g, "''")}', ${MaTroChoi})
        `)

        const newId = result.recordset[0].MaBoSuuTap

        res.json({ message: "Tạo bộ sưu tập thành công", MaBoSuuTap: newId })
    } catch (err) {
        console.error("Lỗi tạo bộ sưu tập:", err)
        res.status(500).json({ message: "Không tạo được bộ sưu tập", error: err.message })
    }
})

// ================== ĐỔI TÊN BỘ SƯU TẬP ==================
router.put("/:MaBoSuuTap", async (req, res) => {
    await connectDB()
    const { MaBoSuuTap } = req.params
    const { TenBoSuuTap } = req.body

    await sql.query(`
        UPDATE BoSuuTap SET TenBoSuuTap = N'${TenBoSuuTap}'
        WHERE MaBoSuuTap = ${MaBoSuuTap}
    `)

    res.json({ message: "Cập nhật tên bộ sưu tập thành công" })
})

// ================== XÓA BỘ SƯU TẬP (ĐÃ SỬA LỖI VÀ THÊM TRANSACTION) ==================
router.delete("/:MaBoSuuTap", async (req, res) => {
    const maBoSuuTap = Number.parseInt(req.params.MaBoSuuTap);
    
    // 1. Kiểm tra ID hợp lệ
    if (isNaN(maBoSuuTap)) {
        return res.status(400).json({ success: false, error: "Mã Bộ Sưu Tập không hợp lệ." });
    }

    const pool = await connectDB();
    const transaction = new sql.Transaction(pool);

    try {
        await transaction.begin();
        const request = new sql.Request(transaction);

        // Đặt tham số đầu vào
        request.input("MaBoSuuTap", sql.Int, maBoSuuTap);

        // 2. Xóa các bản ghi tham chiếu từ bảng con: TheTrongBoSuuTap (Luôn xóa con trước)
        await request.query(`
            DELETE FROM TheTrongBoSuuTap 
            WHERE MaBoSuuTap = @MaBoSuuTap
        `);

        // 3. Xóa bản ghi gốc trong bảng cha: BoSuuTap
        const result = await request.query(`
            DELETE FROM BoSuuTap 
            WHERE MaBoSuuTap = @MaBoSuuTap
        `);
        
        // Kiểm tra xem có bản ghi nào bị xóa không
        if (result.rowsAffected[0] === 0) {
            await transaction.rollback();
            return res.status(404).json({ success: false, message: "Không tìm thấy Bộ Sưu Tập này để xóa." });
        }

        await transaction.commit();
        res.json({ success: true, message: "Đã xóa Bộ Sưu Tập và các thẻ liên quan thành công!" });

    } catch (err) {
        await transaction.rollback(); // Hoàn tác nếu có lỗi SQL
        console.error("Lỗi xóa Bộ Sưu Tập:", err);
        res.status(500).json({ success: false, error: "Lỗi server khi xóa Bộ Sưu Tập. Vui lòng kiểm tra log chi tiết." });
    }
});

// ============================================================================
//                       THẺ TRONG BỘ SƯU TẬP
// ============================================================================

// ================== LẤY THẺ TRONG MỘT BỘ SƯU TẬP ==================
router.get("/:MaBoSuuTap/cards", async (req, res) => {
    await connectDB()
    const { MaBoSuuTap } = req.params

    const result = await sql.query(`
        SELECT S.*, T.TenThe, T.HinhAnh, T.Gia, TC.TenTroChoi
        FROM TheTrongBoSuuTap S
        JOIN TheBai T ON S.MaThe = T.MaThe
        JOIN TroChoi TC ON T.MaTroChoi = TC.MaTroChoi
        WHERE S.MaBoSuuTap = ${MaBoSuuTap}
    `)

    res.json(result.recordset)
})

// ================== THÊM THẺ VÀO BỘ SƯU TẬP ==================
router.post("/:MaBoSuuTap/cards", async (req, res) => {
    await connectDB()
    const { MaBoSuuTap } = req.params
    const { MaThe, SoLuongBanSao = 1 } = req.body

    // Nếu thẻ đã tồn tại → tăng số lượng
    const check = await sql.query(`
        SELECT * FROM TheTrongBoSuuTap
        WHERE MaBoSuuTap = ${MaBoSuuTap} AND MaThe = ${MaThe}
    `)

    if (check.recordset.length > 0) {
        await sql.query(`
            UPDATE TheTrongBoSuuTap
            SET SoLuongBanSao = SoLuongBanSao + ${SoLuongBanSao}
            WHERE MaBoSuuTap = ${MaBoSuuTap} AND MaThe = ${MaThe}
        `)

        return res.json({ message: "Đã cập nhật số lượng thẻ" })
    }

    // Nếu chưa tồn tại → thêm mới
    await sql.query(`
        INSERT INTO TheTrongBoSuuTap (MaBoSuuTap, MaThe, SoLuongBanSao)
        VALUES (${MaBoSuuTap}, ${MaThe}, ${SoLuongBanSao})
    `)

    res.json({ message: "Đã thêm thẻ vào bộ sưu tập" })
})

// ================== CHỈNH SỬA SỐ LƯỢNG ==================
router.put("/items/:MaTheSuuTap", async (req, res) => {
    await connectDB()
    const { MaTheSuuTap } = req.params
    const { SoLuongBanSao } = req.body

    await sql.query(`
        UPDATE TheTrongBoSuuTap
        SET SoLuongBanSao = ${SoLuongBanSao}
        WHERE MaTheSuuTap = ${MaTheSuuTap}
    `)

    res.json({ message: "Đã cập nhật số lượng" })
})

// ================== XÓA THẺ KHỎI BỘ SƯU TẬP ==================
router.delete("/cards/:MaTheSuuTap", async (req, res) => {
    await connectDB()
    const { MaTheSuuTap } = req.params

    await sql.query(`
        DELETE FROM TheTrongBoSuuTap WHERE MaTheSuuTap = ${MaTheSuuTap}
    `)

    res.json({ message: "Đã xóa thẻ khỏi bộ sưu tập" })
})

module.exports = router
