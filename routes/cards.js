const express = require("express");
const router = express.Router();
const { sql, connectDB } = require("../db");
const axios = require("axios");

// ================== SEARCH THẺ (Tối ưu Batch Insert) ==================
router.get("/search", async (req, res) => {
    const { q, MaTroChoi, limit = 50 } = req.query;
    if (!MaTroChoi) return res.status(400).json({ error: "Thiếu MaTroChoi" });

    const searchText = q?.trim() || "";
    const neededLimit = Number.parseInt(limit, 10) || 50;
    const pool = await connectDB();

    try {
        // 1. TÌM KIẾM BAN ĐẦU VÀ LẤY MaLoai
        const dbResult = await pool.request()
            .input("q", sql.NVarChar, `%${searchText}%`)
            .input("MaTroChoi", sql.Int, MaTroChoi)
            .query(`
                SELECT tb.*, tc.TenTroChoi, tc.MaLoai
                FROM TheBai tb
                INNER JOIN TroChoi tc ON tb.MaTroChoi = tc.MaTroChoi
                WHERE tb.MaTroChoi=@MaTroChoi AND tb.TenThe LIKE @q
                ORDER BY tb.TenThe
            `);

        let cards = dbResult.recordset.slice(0, neededLimit);
        let MaLoai;

        if (dbResult.recordset.length > 0) {
            MaLoai = dbResult.recordset[0].MaLoai;
        } else {
            // Nếu không tìm thấy thẻ, cần kiểm tra MaLoai của trò chơi
            const gameCheck = await pool.request()
                .input("MaTroChoi", sql.Int, MaTroChoi)
                .query(`SELECT MaLoai FROM TroChoi WHERE MaTroChoi=@MaTroChoi`);
            if (!gameCheck.recordset.length) {
                return res.status(404).json({ error: "Không tìm thấy trò chơi" });
            }
            MaLoai = gameCheck.recordset[0].MaLoai;
        }

        // 2. BỔ SUNG TỪ API (Chỉ khi là Magic và thiếu thẻ)
        if (MaLoai === 1 && cards.length < neededLimit && searchText) {
            const allApiCards = [];
            let url = `https://api.scryfall.com/cards/search?q=${encodeURIComponent(searchText)}`;
            
            while (url && allApiCards.length < neededLimit - cards.length) {
                const apiRes = await axios.get(url);
                if (!apiRes.data?.data) break;

                const newCards = apiRes.data.data.map(c => ({
                    MaTroChoi: Number(MaTroChoi),
                    TenThe: c.name,
                    HinhAnh: c.image_uris?.normal || null,
                    MoTa: c.oracle_text || "",
                    ThuocTinh: JSON.stringify(c),
                    Gia: c.prices?.usd ? Number.parseFloat(c.prices.usd) : 0,
                }));

                allApiCards.push(...newCards);
                url = apiRes.data.has_more ? apiRes.data.next_page : null;
            }
            
            const finalAddCards = allApiCards.slice(0, neededLimit - cards.length);
            
            // 3. THỰC HIỆN BATCH INSERT (Sequential trong Transaction, tránh xung đột tham số)
            if (finalAddCards.length > 0) {
                const transaction = new sql.Transaction(pool);
                await transaction.begin();

                try {
                    for (let i = 0; i < finalAddCards.length; i++) {
                        const card = finalAddCards[i];
                        const request = new sql.Request(transaction); // Tạo request mới cho mỗi lệnh trong transaction

                        await request
                            .input("MaTroChoi", sql.Int, card.MaTroChoi)
                            .input("TenThe", sql.NVarChar, card.TenThe)
                            .input("HinhAnh", sql.NVarChar, card.HinhAnh)
                            .input("MoTa", sql.NVarChar, card.MoTa)
                            .input("ThuocTinh", sql.NVarChar, card.ThuocTinh)
                            .input("Gia", sql.Decimal(10, 2), card.Gia)
                            .query(`
                                IF NOT EXISTS (SELECT 1 FROM TheBai WHERE TenThe=@TenThe AND MaTroChoi=@MaTroChoi)
                                INSERT INTO TheBai (MaTroChoi, TenThe, HinhAnh, MoTa, ThuocTinh, Gia)
                                VALUES (@MaTroChoi, @TenThe, @HinhAnh, @MoTa, @ThuocTinh, @Gia)
                            `);
                    }

                    await transaction.commit();
                } catch (e) {
                    await transaction.rollback();
                    console.error("Lỗi Batch Insert:", e);
                    // Rollback và tiếp tục, không ảnh hưởng đến kết quả tìm kiếm đã có
                }
            }
            
            // 4. LẤY LẠI TỪ DB sau khi insert
            const reload = await pool.request()
                .input("q", sql.NVarChar, `%${searchText}%`)
                .input("MaTroChoi", sql.Int, MaTroChoi)
                .query(`
                    SELECT tb.*, tc.TenTroChoi, tc.MaLoai
                    FROM TheBai tb
                    INNER JOIN TroChoi tc ON tb.MaTroChoi = tc.MaTroChoi
                    WHERE tb.MaTroChoi=@MaTroChoi AND tb.TenThe LIKE @q
                    ORDER BY tb.TenThe
                `);
            cards = reload.recordset.slice(0, neededLimit);
        }

        res.json(cards);

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Lỗi server khi tìm thẻ" });
    }
});

// ================== DANH SÁCH THẺ ==================
router.get("/", async (req, res) => {
    try {
        console.log("GET /cards - Fetching card list (paginated)...");
        const pool = await connectDB();

        // Pagination + optional filter by MaTroChoi
        const rawLimit = Number.parseInt(req.query.limit, 10);
        const rawOffset = Number.parseInt(req.query.offset, 10);
        const MaTroChoi = req.query.MaTroChoi ? Number.parseInt(req.query.MaTroChoi, 10) : null;

        const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 200) : 70; // default 70, cap 200
        const offset = Number.isFinite(rawOffset) && rawOffset >= 0 ? rawOffset : 0;

        const baseSelect = `
            SELECT tb.MaThe, tb.TenThe, tb.HinhAnh, tb.MoTa, tb.ThuocTinh, tb.Gia, tb.MaTroChoi, tb.NgayCapNhat,
                   tc.TenTroChoi, tc.MaLoai
            FROM TheBai tb
            INNER JOIN TroChoi tc ON tb.MaTroChoi = tc.MaTroChoi
        `;

        const whereClause = MaTroChoi ? "WHERE tb.MaTroChoi = @MaTroChoi" : "";

        // Count total for pagination
        const countQuery = `SELECT COUNT(1) AS Total FROM TheBai tb ${MaTroChoi ? "WHERE tb.MaTroChoi = @MaTroChoi" : ""}`;

        const request = pool.request();
        if (MaTroChoi) request.input("MaTroChoi", sql.Int, MaTroChoi);
        request.input("limit", sql.Int, limit).input("offset", sql.Int, offset);

        const countResult = await request.query(countQuery);
        const total = countResult.recordset?.[0]?.Total || 0;

        // Data page
        const dataQuery = `
            ${baseSelect}
            ${whereClause}
            ORDER BY tb.MaThe DESC
            OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
        `;
        const pageResult = await request.query(dataQuery);

        // Parse ThuocTinh JSON với error handling tốt hơn
        const cards = (pageResult.recordset || []).map(c => {
            let attrs = {};
            try {
                if (c.ThuocTinh && typeof c.ThuocTinh === 'string') {
                    attrs = JSON.parse(c.ThuocTinh);
                } else if (typeof c.ThuocTinh === 'object' && c.ThuocTinh !== null) {
                    attrs = c.ThuocTinh;
                }
            } catch (e) {
                try {
                    const preview = typeof c.ThuocTinh === 'string' ? c.ThuocTinh.substring(0, 100) : '';
                    console.error(`Lỗi parse JSON cho thẻ ${c.MaThe}:`, e.message, 'Data:', preview);
                } catch {}
            }
            return { ...c, ThuocTinh: attrs };
        });

        const hasMore = offset + cards.length < total;
        res.json({ success: true, data: cards, page: { total, limit, offset, hasMore } });
    } catch (err) {
        console.error("=== Lỗi GET /cards ===");
        console.error("Error name:", err.name);
        console.error("Error message:", err.message);
        console.error("Stack trace:", err.stack);
        res.status(500).json({ error: "Lỗi server khi lấy danh sách thẻ", details: err.message });
    }
});

// ================== CHI TIẾT THẺ ==================
router.get("/detail/:MaThe", async (req, res) => {
    const id = Number.parseInt(req.params.MaThe);
    if (isNaN(id)) return res.status(400).json({ error: "MaThe không hợp lệ" });

    try {
        const pool = await connectDB();
        const result = await pool
            .request()
            .input("MaThe", sql.Int, id)
            .query(`SELECT tb.*, tc.MaLoai, tc.TenTroChoi FROM TheBai tb
        INNER JOIN TroChoi tc ON tb.MaTroChoi=tc.MaTroChoi
        WHERE tb.MaThe=@MaThe`);
        
        if (!result.recordset.length) return res.status(404).json({ error: "Không tìm thấy thẻ" });

        const card = result.recordset[0];

        // Xử lý ThuocTinh
        let attrs = {};
        try {
            if (card.ThuocTinh) {
                const raw = JSON.parse(card.ThuocTinh);
                attrs = {
                    colors: raw.colors || [],
                    type: raw.type_line || "",
                    rarity: raw.rarity || "",
                    set: raw.set_name || "",
                    collectorNumber: raw.collector_number || "",
                };
            }
        } catch { attrs = {}; }


        let latestPrice = card.Gia || 0;
        let isPriceChanged = false;
        let versions = [];

        // Kiểm tra điều kiện cập nhật giá: MaLoai=1 VÀ thời gian đã cách nhau 6h
        const now = new Date();
        const lastUpdate = card.NgayCapNhat ? new Date(card.NgayCapNhat) : new Date(0);
        const timeDifference = now.getTime() - lastUpdate.getTime(); 
        const hours = 6 * 60 * 60 * 1000; 

        if (card.MaLoai === 1 && timeDifference >= hours) { // <--- ĐIỀU KIỆN 6H ĐƯỢC ÁP DỤNG Ở ĐÂY
            try {
                // Gọi API lấy giá mới nhất
                const apiRes = await axios.get(`https://api.scryfall.com/cards/search?q=${encodeURIComponent(card.TenThe)}`);
                const apiCards = apiRes.data?.data || [];
                
                versions = apiCards
                    .map(c => ({
                        name: c.name,
                        set: c.set_name,
                        collector_number: c.collector_number,
                        usd: c.prices?.usd ? Number.parseFloat(c.prices.usd) : null,
                        image: c.image_uris?.normal || null,
                    }))
                    .filter(v => v.usd !== null);

                if (versions.length > 0) {
                    // Lấy giá của phiên bản đầu tiên làm giá tham chiếu
                    const apiPrice = versions[0].usd;
                    if (!isNaN(apiPrice) && apiPrice !== card.Gia) {
                        latestPrice = apiPrice;
                        isPriceChanged = true;
                    }
                }
            } catch (e) {
                console.warn("Không lấy được giá API", e);
            }

            // Nếu giá thay đổi, cập nhật vào DB
            if (isPriceChanged) {
                await pool
                    .request()
                    .input("MaThe", sql.Int, id)
                    .input("Gia", sql.Decimal(10, 2), latestPrice)
                    .query(`UPDATE TheBai SET Gia=@Gia, NgayCapNhat=GETDATE() WHERE MaThe=@MaThe`);
            }
        }

        res.json({ ...card, Gia: latestPrice, CapNhatGia: isPriceChanged, ThuocTinh: attrs, Versions: versions });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Lỗi server chi tiết thẻ" });
    }
});

// ================== THÊM THẺ (Thêm OUTPUT để trả về ID) ==================
router.post("/", async (req, res) => {
    let { TenThe, MaTroChoi, HinhAnh, MoTa, ThuocTinh, Gia } = req.body;

    if (!TenThe || !MaTroChoi)
        return res.status(400).json({ error: "Thiếu thông tin" });

    // Validate JSON
    let ThuocTinhJson = {};
    if (ThuocTinh) {
        try {
            ThuocTinhJson = typeof ThuocTinh === "string" ? JSON.parse(ThuocTinh) : ThuocTinh;
        } catch (e) {
            return res.status(400).json({ error: "Thuộc tính phải là JSON hợp lệ!" });
        }
    }

    // Chuyển Gia sang number
    Gia = Number(Gia) || 0;

    try {
        const pool = await connectDB();

        // Kiểm tra TroChoi và lấy MaLoai
        const typeResult = await pool
            .request()
            .input("MaTroChoi", sql.Int, MaTroChoi)
            .query(`SELECT MaLoai FROM TroChoi WHERE MaTroChoi=@MaTroChoi`);

        if (!typeResult.recordset.length)
            return res.status(404).json({ error: "Không tìm thấy trò chơi" });

        const MaLoai = typeResult.recordset[0].MaLoai;

        const insertResult = await pool
            .request()
            .input("TenThe", sql.NVarChar, TenThe)
            .input("MaTroChoi", sql.Int, MaTroChoi)
            .input("HinhAnh", sql.NVarChar, HinhAnh || "")
            .input("MoTa", sql.NVarChar, MoTa || "")
            .input("ThuocTinh", sql.NVarChar, JSON.stringify(ThuocTinhJson))
            .input("Gia", sql.Decimal(10, 2), Gia)
            .input("MaLoai", sql.Int, MaLoai)
            .query(`
                INSERT INTO TheBai (MaTroChoi, TenThe, HinhAnh, MoTa, ThuocTinh, Gia)
                OUTPUT INSERTED.MaThe
                SELECT @MaTroChoi,@TenThe,@HinhAnh,@MoTa,@ThuocTinh,@Gia
                WHERE EXISTS (SELECT 1 FROM TroChoi WHERE MaTroChoi=@MaTroChoi AND MaLoai=@MaLoai)
            `);

        if (insertResult.recordset.length === 0) {
            return res.status(400).json({ error: "Không thể thêm thẻ (kiểm tra MaTroChoi và MaLoai)" });
        }

        res.json({ success: true, MaThe: insertResult.recordset[0].MaThe });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Lỗi server thêm thẻ" });
    }
});

// ================== XÓA THẺ (Đã sử dụng Transaction Tốt) ==================
router.delete("/:MaThe", async (req, res) => {
    const id = Number.parseInt(req.params.MaThe);
    if (isNaN(id)) return res.status(400).json({ success: false, error: "MaThe không hợp lệ" });

    const pool = await connectDB();
    const transaction = new sql.Transaction(pool);

    try {
        await transaction.begin();
        const request = new sql.Request(transaction);

        // 1. Xóa tất cả các bản ghi tham chiếu từ bảng con: TheRaoBan
        await request
            .input("MaThe", sql.Int, id)
            .query(`DELETE FROM TheRaoBan WHERE MaThe = @MaThe`);

        // 2. Xóa tất cả các bản ghi tham chiếu từ bảng con: TheTrongBoSuuTap
        // Lưu ý: SQL Parameter @MaThe đã được định nghĩa ở bước 1, có thể tái sử dụng.
        await request
            .query(`DELETE FROM TheTrongBoSuuTap WHERE MaThe = @MaThe`);
        
        // 3. Xóa bản ghi gốc trong bảng cha: TheBai
        const result = await request
            .query(`DELETE FROM TheBai WHERE MaThe = @MaThe`);

        if (result.rowsAffected[0] === 0) {
            await transaction.rollback();
            return res.status(404).json({ success: false, message: "Không tìm thấy thẻ bài này." });
        }

        await transaction.commit();
        res.json({ success: true, message: "Đã xóa thẻ bài và các dữ liệu liên quan thành công!" });

    } catch (err) {
        await transaction.rollback();
        console.error("Lỗi xóa thẻ bài:", err);
        res.status(500).json({ success: false, error: "Lỗi server xóa thẻ. Vui lòng kiểm tra log chi tiết." });
    }
});

module.exports = router;