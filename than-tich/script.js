document.addEventListener('DOMContentLoaded', () => {
    const cardsContainer = document.getElementById('cardsContainer');
    const cardModal = document.getElementById('cardModal');
    const modalDetail = document.getElementById('modalCardDetail');
    const searchForm = document.getElementById('searchForm');
    const searchInput = document.getElementById('searchInput');

    const MaTroChoi = parseInt(localStorage.getItem('MaTroChoi'), 10) || 0;
    const API_BASE = "http://localhost:3000";

    // ================== Hiển thị danh sách thẻ ==================
    function displayCards(cards) {
        cardsContainer.innerHTML = '';
        if (!cards || cards.length === 0) {
            cardsContainer.innerHTML = '<p>Không tìm thấy thẻ nào.</p>';
            return;
        }

        cards.forEach(card => {
            const cardDiv = document.createElement('div');
            cardDiv.className = 'card';
            cardDiv.dataset.mathe = card.MaThe;

            const price = typeof card.Gia === 'number' ? card.Gia.toFixed(2) : '0.00';

            cardDiv.innerHTML = `
                <div class="card-image">
                    <img src="${card.HinhAnh || 'placeholder.jpg'}" alt="${card.TenThe || 'Card'}"
                         onerror="this.src='placeholder.jpg'">
                </div>
                <div class="card-info">
                    <h3 class="card-name">${card.TenThe || 'Không có tên'}</h3>
                    <p class="card-price">Giá: $${price}</p>
                </div>
            `;
            cardsContainer.appendChild(cardDiv);
        });
    }

    // ================== Load danh sách thẻ ==================
    async function loadCards(query = "") {
        if (!MaTroChoi || MaTroChoi <= 0) {
            cardsContainer.innerHTML = `<p>Vui lòng chọn trò chơi trước khi xem danh sách thẻ.</p>`;
            return;
        }

        cardsContainer.innerHTML = `<p>Đang tải danh sách thẻ...</p>`;
        try {
            const url = new URL("/cards/search", API_BASE);
            url.searchParams.append("MaTroChoi", MaTroChoi);
            if (query.trim()) url.searchParams.append("q", query);

            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP ${res.status} - ${res.statusText}`);

            const cards = await res.json();
            displayCards(cards);
        } catch (err) {
            console.error("Lỗi tải thẻ:", err);
            cardsContainer.innerHTML = `<p>Lỗi tải thẻ: ${err.message}</p>`;
        }
    }

    // ================== Hiển thị chi tiết thẻ (Chuẩn Thần Tích) ==================
    async function showCardDetail(MaThe) {
        if (!MaThe) {
            modalDetail.innerHTML = `<p>Lỗi: MaThe không hợp lệ.</p>`;
            cardModal.style.display = 'block';
            return;
        }

        modalDetail.innerHTML = `<p>Đang tải chi tiết thẻ...</p>`;
        cardModal.style.display = 'block';

        try {
            const res = await fetch(`${API_BASE}/cards/detail/${MaThe}`);
            if (!res.ok) throw new Error(`HTTP ${res.status} - ${res.statusText}`);
            const card = await res.json();

            // Nếu backend lưu JSON ThuocTinh => parse
            let attrs = {};
            try {
                if (card.ThuocTinh) {
                    attrs = typeof card.ThuocTinh === "string"
                        ? JSON.parse(card.ThuocTinh)
                        : card.ThuocTinh;
                }
            } catch { attrs = {}; }

            // ================== GHÉP GIÁ TRỊ TỪ DB + ThuocTinh ==================
            const name = card.TenThe || attrs.name || "Không có tên";
            const image = card.HinhAnh || attrs.image || "placeholder.jpg";
            const danhhieu = card.DanhHieu || attrs.title || "—";
            const loaibai = card.LoaiBai || attrs.type || "—";
            const nangluong = card.NangLuong ?? attrs.energy ?? "0";
            const phat = card.Phat ?? attrs.penalty ?? "0";
            const cong = card.Cong ?? attrs.atk ?? "0";
            const mau = card.Mau ?? attrs.hp ?? "0";
            const dohiem = card.DoHiem ?? attrs.rarity ?? "—";
            const idcard = card.MaSoThe ?? attrs.id ?? "—";
            const mota = card.MoTa || attrs.description || "Không có mô tả";

            // ================== TẠO GIAO DIỆN CHI TIẾT ==================
            modalDetail.innerHTML = `
            <div class="card-detail">
                <div class="modal-header">
                    <button class="close-btn">×</button>
                    <h2>${name}</h2>
                    <p class="detail-sub">${danhhieu}</p>
                </div>

                <div class="card-content">
                    <div class="card-image">
                        <img src="${image}" alt="${name}" 
                             onerror="this.src='placeholder.jpg'">
                    </div>

                    <div class="card-info">
                        <p><strong>Loại bài:</strong> ${loaibai}</p>
                        <p><strong>Năng lượng yêu cầu:</strong> ${nangluong}</p>
                        <p><strong>Phạt:</strong> ${phat}</p>
                        <p><strong>Công:</strong> ${cong}</p>
                        <p><strong>Máu:</strong> ${mau}</p>
                        <p><strong>Độ hiếm:</strong> ${dohiem}</p>
                        <p><strong>ID thẻ:</strong> ${idcard}</p>

                        <div class="detail-desc">
                            <strong>Mô tả:</strong>
                            <p>${mota}</p>
                        </div>
                    </div>
                </div>
            </div>
        `;

            // Nút đóng modal
            document.querySelector(".close-btn").onclick = () => {
                cardModal.style.display = "none";
            };

        } catch (err) {
            console.error("Lỗi tải chi tiết thẻ:", err);
            modalDetail.innerHTML = `<p>Lỗi tải chi tiết thẻ: ${err.message}</p>`;
        }
    }


    // ================== Event listener duy nhất ==================
    // Click vào thẻ
    cardsContainer.addEventListener('click', e => {
        const cardDiv = e.target.closest('.card');
        if (!cardDiv) return;
        const MaThe = parseInt(cardDiv.dataset.mathe, 10);
        if (isNaN(MaThe)) return;
        showCardDetail(MaThe);
    });

    // Đóng modal khi click ra ngoài hoặc click nút ×
    cardModal.addEventListener('click', e => {
        if (e.target === cardModal || e.target.classList.contains('close-btn')) {
            cardModal.style.display = 'none';
        }
    });

    // ================== Form tìm kiếm ==================
    searchForm.addEventListener('submit', e => {
        e.preventDefault();
        loadCards(searchInput.value.trim());
    });
});
