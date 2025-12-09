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

// routes/orders.js

// =========================================================================
// 3. ADMIN: LẤY DANH SÁCH GIAO DỊCH (GET /admin/list)
// =========================================================================
// routes/orders.js -> API /admin/list

router.get("/admin/list", async (req, res) => {
    try {
        const pool = await connectDB();
        
        const query = `
            SELECT 
                dh.MaDonHang,
                dh.TrangThai,
                dh.NgayTao,
                dh.LoaiGiaoDich, 
                
                -- Người thực hiện lệnh
                NguoiLienHe.TenNguoiDung AS TenNguoiLienHe,

                -- === 1. TÊN THẺ / TIÊU ĐỀ ===
                CASE 
                    WHEN dh.LoaiGiaoDich = 'BAN' THEN cm.TieuDe 
                    ELSE tb_rb.TenThe 
                END AS TenTheHienThi,

                -- === 2. HÌNH ẢNH (SỬA LỖI TẠI ĐÂY) ===
                CASE 
                    -- Nếu là 'BAN' (Tin Cần Mua): Lấy ảnh tin mua hoặc ảnh gốc
                    WHEN dh.LoaiGiaoDich = 'BAN' THEN COALESCE(cm.HinhAnh, tb_cm.HinhAnh)
                    
                    -- Nếu là 'MUA' (Tin Rao Bán): Bảng TheRaoBan không có HinhAnh, nên lấy trực tiếp từ TheBai
                    ELSE tb_rb.HinhAnh 
                END AS HinhAnhHienThi,

                -- === 3. GIÁ ===
                CASE 
                    WHEN dh.LoaiGiaoDich = 'BAN' THEN cm.GiaMongMuon 
                    ELSE rb.Gia 
                END AS GiaHienThi,

                -- === 4. TÊN ĐỐI TÁC ===
                CASE 
                    WHEN dh.LoaiGiaoDich = 'BAN' THEN NguoiCanMua.TenNguoiDung
                    ELSE NguoiBan.TenNguoiDung
                END AS TenDoiTac

            FROM DonHang dh
            
            -- JOIN User thực hiện lệnh
            LEFT JOIN NguoiDung NguoiLienHe ON dh.MaNguoiTao = NguoiLienHe.MaNguoiDung
            
            -- JOIN cho trường hợp 'BAN' (Liên hệ bán vào tin cần mua)
            LEFT JOIN TheCanMua cm ON dh.MaCanMua = cm.MaCanMua
            LEFT JOIN NguoiDung NguoiCanMua ON cm.MaNguoiDung = NguoiCanMua.MaNguoiDung
            LEFT JOIN TheBai tb_cm ON cm.MaThe = tb_cm.MaThe 
            
            -- JOIN cho trường hợp 'MUA' (Đặt mua thẻ đang bán)
            LEFT JOIN TheRaoBan rb ON dh.MaRaoBan = rb.MaRaoBan
            LEFT JOIN NguoiDung NguoiBan ON rb.MaNguoiDung = NguoiBan.MaNguoiDung
            LEFT JOIN TheBai tb_rb ON rb.MaThe = tb_rb.MaThe 

            ORDER BY dh.NgayTao DESC
        `;

        const result = await pool.request().query(query);
        res.json({ success: true, data: result.recordset });

    } catch (err) {
        console.error("Lỗi SQL Admin List:", err);
        res.status(500).json({ error: "Lỗi lấy danh sách đơn hàng: " + err.message });
    }
});

// =========================================================================
// 4. ADMIN: CẬP NHẬT TRẠNG THÁI (PUT /update-status/:id)
// =========================================================================
// 4. ADMIN: CẬP NHẬT TRẠNG THÁI (PUT /update-status/:id)
router.put("/update-status/:id", async (req, res) => {
    const { TrangThai } = req.body; 
    const id = req.params.id; // MaDonHang

    try {
        const pool = await connectDB();
        const transaction = new sql.Transaction(pool);
        
        await transaction.begin();
        const request = new sql.Request(transaction);

        try {
            // 1. Cập nhật trạng thái đơn hàng trong bảng DonHang
            await request
                .input("MaDonHang", sql.Int, id)
                .input("TrangThai", sql.NVarChar, TrangThai)
                .query("UPDATE DonHang SET TrangThai = @TrangThai WHERE MaDonHang = @MaDonHang");

            // 2. [LOGIC MỚI] Nếu trạng thái là 'HoanTat', kiểm tra xem có cần đóng tin không
            if (TrangThai === 'HoanTat') {
                
                // TH1: Nếu đây là giao dịch 'BAN' (Đáp ứng tin cần mua)
                // -> Cập nhật DaKetThuc = 1 cho tin cần mua đó
                await request.query(`
                    UPDATE TheCanMua 
                    SET DaKetThuc = 1 
                    WHERE MaCanMua IN (
                        SELECT MaCanMua FROM DonHang 
                        WHERE MaDonHang = @MaDonHang AND LoaiGiaoDich = 'BAN'
                    )
                `);

                // TH2: Nếu đây là giao dịch 'MUA' (Mua thẻ rao bán)
                // -> Cập nhật tin rao bán thành 'Đã bán' hoặc xóa (Tùy logic shop)
                // Ở đây ta update TinhTrang thành 'DaBan' để nó không hiện lên nữa (nhờ logic filter NOT EXISTS ở bài trước)
                // (Phần này tùy chọn, nhưng nên làm để đồng bộ)
            }

            // 3. Nếu trạng thái là 'Huy', ta có thể mở lại tin (nếu muốn logic chặt chẽ)
            if (TrangThai === 'Huy') {
                 await request.query(`
                    UPDATE TheCanMua 
                    SET DaKetThuc = 0 
                    WHERE MaCanMua IN (
                        SELECT MaCanMua FROM DonHang 
                        WHERE MaDonHang = @MaDonHang AND LoaiGiaoDich = 'BAN'
                    )
                `);
            }

            await transaction.commit();
            res.json({ success: true, message: "Đã cập nhật trạng thái & đồng bộ dữ liệu" });

        } catch (err) {
            await transaction.rollback();
            throw err;
        }

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Lỗi cập nhật" });
    }
});

module.exports = router;