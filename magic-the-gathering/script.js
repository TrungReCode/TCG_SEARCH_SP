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

    // ================== Hiển thị chi tiết thẻ ==================
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

            let attrs = {};
            try {
                if (card.ThuocTinh) {
                    attrs = typeof card.ThuocTinh === 'string' ? JSON.parse(card.ThuocTinh) : card.ThuocTinh;
                }
            } catch { attrs = {}; }

            const name = attrs.name || card.TenThe || 'Không có tên';
            const image = attrs.image_uris?.normal || card.HinhAnh || 'placeholder.jpg';
            const manaCost = attrs.mana_cost || card.ManaCost || 'N/A';
            const typeLine = attrs.type_line || card.LoaiThe || 'N/A';
            const power = attrs.power || '';
            const toughness = attrs.toughness || '';
            const keywords = attrs.keywords ? attrs.keywords.join(', ') : '';
            const description = attrs.oracle_text || card.MoTa || 'Không có mô tả';
            const price = typeof card.Gia === 'number' ? card.Gia.toFixed(2) : '0.00';
            const priceUpdated = card.CapNhatGia ? '<p><em>Giá đã được cập nhật!</em></p>' : '';

            // Versions nếu MaLoai = 1
            let versionsHTML = '';
            if (Array.isArray(card.Versions) && card.Versions.length > 0) {
                versionsHTML = `<h4>Các phiên bản:</h4><ul>` +
                    card.Versions.map(v => `<li>${v.name} - Set: ${v.set} - Giá: $${v.usd.toFixed(2)}</li>`).join('') +
                    `</ul>`;
            }

            modalDetail.innerHTML = `
                <div class="card-detail">
                    <div class="modal-header">
                        <button class="close-btn">×</button>
                        <h2>${name}</h2>
                    </div>
                    <div class="card-content">
                        <div class="card-image">
                            <img src="${image}" alt="${name}" onerror="this.src='placeholder.jpg'">
                        </div>
                        <div class="card-info">
                            <p><strong>Mana cost:</strong> ${manaCost}</p>
                            <p><strong>Type:</strong> ${typeLine}</p>
                            ${power && toughness ? `<p><strong>Power/Toughness:</strong> ${power}/${toughness}</p>` : ''}
                            ${keywords ? `<p><strong>Keywords:</strong> ${keywords}</p>` : ''}
                            <p><strong>Description:</strong> ${description}</p>
                            <p><strong>Price:</strong> $${price}</p>
                            ${priceUpdated}
                            ${versionsHTML}
                        </div>
                    </div>
                </div>
            `;
        } catch (err) {
            console.error('Lỗi tải chi tiết thẻ:', err);
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
