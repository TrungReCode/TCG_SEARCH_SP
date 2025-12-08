// routes/orders.js
const express = require("express");
const router = express.Router();
const { sql, connectDB } = require("../db");

// THÔNG TIN ADMIN (Cấu hình cứng hoặc lấy từ DB)
const ADMIN_CONTACT = {
    zalo: "0987.654.321",
    bankName: "Vietcombank",
    bankAccount: "1234567890 - NGUYEN VAN ADMIN"
};

// 1. TẠO YÊU CẦU MUA (User click nút Mua ở bài Rao Bán)
// routes/orders.js

router.post("/create-buy", async (req, res) => {
    const { MaNguoiDung, MaRaoBan, Gia } = req.body;

    if (!MaNguoiDung || !MaRaoBan) return res.status(400).json({ error: "Thiếu thông tin" });

    const pool = await connectDB();
    const transaction = new sql.Transaction(pool);

    try {
        // 1. Bắt đầu Transaction (Khóa phạm vi xử lý lại)
        await transaction.begin();
        const request = new sql.Request(transaction);

        // 2. KIỂM TRA: Liệu thẻ này đã có đơn hàng nào đang treo chưa?
        // Ta kiểm tra xem có đơn hàng nào cho MaRaoBan này mà KHÔNG PHẢI là 'Huy' hoặc 'TuChoi' không.
        const checkResult = await request
            .input("CheckMaRaoBan", sql.Int, MaRaoBan)
            .query(`
                SELECT TOP 1 MaDonHang 
                FROM DonHang 
                WHERE MaRaoBan = @CheckMaRaoBan 
                AND TrangThai IN ('ChoXuLy', 'DaThanhToan', 'DangGiao')
            `);

        if (checkResult.recordset.length > 0) {
            // Đã có người đặt trước!
            await transaction.rollback();
            return res.json({ 
                success: false, 
                error: "Rất tiếc, thẻ này vừa có người khác đặt mua trước bạn 1 giây!" 
            });
        }

        // 3. Nếu chưa ai mua -> Tiến hành tạo đơn
        const insertResult = await request
            .input("MaNguoiDung", sql.Int, MaNguoiDung)
            .input("Gia", sql.Decimal(10, 2), Gia)
            .query(`
                INSERT INTO DonHang (MaNguoiTao, MaRaoBan, LoaiGiaoDich, GiaGiaoDich, TrangThai)
                OUTPUT INSERTED.MaDonHang
                VALUES (@MaNguoiDung, @CheckMaRaoBan, 'MUA', @Gia, 'ChoXuLy')
            `);

        // 4. Lưu giao dịch
        await transaction.commit();

        const orderId = insertResult.recordset[0].MaDonHang;

        res.json({ 
            success: true, 
            message: "Tạo yêu cầu thành công",
            orderId: orderId,
            adminInfo: ADMIN_CONTACT
        });

    } catch (err) {
        // Nếu lỗi hệ thống -> Hoàn tác tất cả
        if (transaction._aborted === false) {
             await transaction.rollback();
        }
        console.error("Lỗi giao dịch mua:", err);
        res.status(500).json({ error: "Lỗi hệ thống khi xử lý đơn hàng." });
    }
});

// 2. TẠO YÊU CẦU LIÊN HỆ (User click nút Liên hệ ở bài Cần Mua)
// routes/orders.js -> API /create-contact

router.post("/create-contact", async (req, res) => {
    const { MaNguoiDung, MaCanMua } = req.body;

    if (!MaNguoiDung || !MaCanMua) return res.status(400).json({ error: "Thiếu thông tin" });

    try {
        const pool = await connectDB();
        
        // 1. KIỂM TRA TRƯỚC: Đã liên hệ chưa?
        // Chỉ chặn nếu trạng thái là ChoXuLy, DangGiao... 
        // Nếu trạng thái là 'Huy' hoặc 'TuChoi', user vẫn có thể gửi lại yêu cầu mới.
        const checkExist = await pool.request()
            .input("MaNguoiDung", sql.Int, MaNguoiDung)
            .input("MaCanMua", sql.Int, MaCanMua)
            .query(`
                SELECT TOP 1 MaDonHang 
                FROM DonHang 
                WHERE MaNguoiTao = @MaNguoiDung 
                  AND MaCanMua = @MaCanMua 
                  AND LoaiGiaoDich = 'BAN'
                  AND TrangThai IN ('ChoXuLy', 'DaThanhToan', 'DangGiao')
            `);

        // Nếu tìm thấy bản ghi -> Chặn lại
        if (checkExist.recordset.length > 0) {
            return res.json({ 
                success: false, 
                error: "Bạn đã gửi yêu cầu này rồi. Vui lòng chờ quản trị viên xử lý!" 
            });
        }

        // 2. NẾU CHƯA -> TIẾN HÀNH TẠO MỚI
        await pool.request()
            .input("MaNguoiDung", sql.Int, MaNguoiDung)
            .input("MaCanMua", sql.Int, MaCanMua)
            .query(`
                INSERT INTO DonHang (MaNguoiTao, MaCanMua, LoaiGiaoDich, TrangThai)
                VALUES (@MaNguoiDung, @MaCanMua, 'BAN', 'ChoXuLy')
            `);

        res.json({ 
            success: true, 
            message: "Đã gửi yêu cầu liên hệ",
            adminInfo: ADMIN_CONTACT 
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Lỗi hệ thống" });
    }
});

module.exports = router;