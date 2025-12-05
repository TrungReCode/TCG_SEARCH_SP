document.addEventListener("DOMContentLoaded", () => {
    const BASE_URL = "http://localhost:3000/cards";
    const GAME_API_URL = "http://localhost:3000/games";

    // Các phần tử chính
    const cardTableBody = document.querySelector("#card-table tbody");
    const listMessage = document.getElementById("list-message");
    const searchCardForm = document.getElementById("search-card-form");

    // Modal Thêm Thẻ
    const addModal = document.getElementById("add-modal");
    const openAddModalBtn = document.getElementById("open-add-modal-btn");
    const closeAddBtn = addModal.querySelector(".close-btn");
    const addCardForm = document.getElementById("add-card-form");
    const addMessage = document.getElementById("add-message");
    const addSubmitButton = addCardForm.querySelector('button[type="submit"]'); // Nút submit form Thêm

    // Modal Chi Tiết Thẻ
    const detailModal = document.getElementById("detail-modal");
    const closeDetailBtn = detailModal.querySelector(".close-btn-detail");
    const cardDetailContent = document.getElementById("card-detail-content");
    const detailMessage = document.getElementById("detail-message");

    /// Game Selector
    const gameSelector = document.getElementById("game-selector");
    const selectedGameId = document.getElementById("selected-game-id");
    const MaTroChoiInput = document.getElementById("MaTroChoi");
    const searchMaTroChoiInput = document.getElementById("search-MaTroChoi");

    // BIẾN MỚI ĐỂ HIỂN THỊ TÊN VÀ ID
    const addSelectedGameName = document.getElementById("add-selected-game-name");
    const searchSelectedGameName = document.getElementById("search-selected-game-name");
    const addSelectedGameId = document.getElementById("add-selected-game-id");
    const searchSelectedGameId = document.getElementById("search-selected-game-id");
    
    // Lưu trữ ID game hiện tại để duy trì trạng thái tìm kiếm sau khi tải lại
    let currentSelectedGameId = null;

    // =========================================================
    // I. HÀM TIỆN ÍCH
    // =========================================================
    function displayMessage(element, message, isError = false) {
        element.textContent = message;
        element.style.color = isError ? 'red' : 'green';
        if (!isError) {
             element.textContent = `${message}`;
        } else if (isError && message) {
             element.textContent = `${message}`;
        }
    }

    // =========================================================
    // II. GAME SELECTOR & ĐỒNG BỘ
    // =========================================================

    async function loadGames() {
        try {
            const response = await fetch(GAME_API_URL);
            const games = await response.json();

            if (!response.ok) {
                gameSelector.innerHTML = `<option value="">-- Lỗi tải trò chơi --</option>`;
                return;
            }

            // Gợi ý: Có thể thêm một option "Tất cả" nếu API hỗ trợ lọc tất cả
            gameSelector.innerHTML = '<option value="">-- Chọn Trò Chơi --</option>';

            games.forEach(game => {
                const option = document.createElement("option");
                option.value = game.MaTroChoi;
                option.textContent = `${game.TenTroChoi} (ID: ${game.MaTroChoi})`;
                gameSelector.appendChild(option);
            });

            // Nếu có game và chưa có game nào được chọn, chọn game đầu tiên
            if (games.length > 0 && !currentSelectedGameId) {
                currentSelectedGameId = games[0].MaTroChoi;
            }
            
            // Duy trì trạng thái chọn game
            if (currentSelectedGameId) {
                gameSelector.value = currentSelectedGameId;
                updateSelectedGame(currentSelectedGameId);
            }
            
            // Sau khi tải games xong, gọi loadCards lần đầu

        } catch (error) {
            console.error("Lỗi tải danh sách trò chơi:", error);
            gameSelector.innerHTML = '<option value="">-- Lỗi kết nối server --</option>';
        }
    }

    function updateSelectedGame(gameId) {
        const selectedOption = gameSelector.querySelector(`option[value="${gameId}"]`);
        
        // Cập nhật biến trạng thái
        currentSelectedGameId = gameId;

        // Lấy tên trò chơi
        const gameNameWithId = selectedOption ? selectedOption.textContent : "N/A";
        const gameName = gameNameWithId.split('(')[0].trim() || 'N/A';
        
        // 1. Cập nhật khối chọn game chính
        selectedGameId.textContent = gameId || "N/A";

        // 2. Đồng bộ ID vào các ô input ẩn
        if (MaTroChoiInput) MaTroChoiInput.value = gameId;
        if (searchMaTroChoiInput) searchMaTroChoiInput.value = gameId;
        
        // 3. Hiển thị Tên và ID trong form Thêm
        if (addSelectedGameName) addSelectedGameName.textContent = gameName;
        if (addSelectedGameId) addSelectedGameId.textContent = gameId;

        // 4. Hiển thị Tên và ID trong form Tìm kiếm
        if (searchSelectedGameName) searchSelectedGameName.textContent = gameName;
        if (searchSelectedGameId) searchSelectedGameId.textContent = gameId;
    } 

    gameSelector.addEventListener('change', (e) => {
        updateSelectedGame(e.target.value);
    });

    // =========================================================
    // III. DANH SÁCH & HÀNH ĐỘNG CƠ BẢN (XÓA, HIỂN THỊ)
    // =========================================================

    async function loadCards() {
        displayMessage(listMessage, "Đang tải danh sách thẻ...", false);
        try {
            const response = await fetch(BASE_URL);
            const data = await response.json();

            if (!response.ok) {
                displayMessage(listMessage, data.error || 'Không thể tải thẻ', true);
                renderCardList([]);
                return;
            }

            renderCardList(data.data || []);
            displayMessage(listMessage, `Tìm thấy ${data.data.length} thẻ.`, false);

        } catch (error) {
            console.error("Lỗi tải thẻ:", error);
            displayMessage(listMessage, "Lỗi kết nối server khi tải thẻ.", true);
        }
    }

    function renderCardList(cards) {
        cardTableBody.innerHTML = "";
        if (cards.length === 0) {
            const row = cardTableBody.insertRow();
            row.innerHTML = `<td colspan="6" style="text-align: center;">Không tìm thấy thẻ bài nào.</td>`;
            return;
        }

        cards.forEach(card => {
            const row = cardTableBody.insertRow();
            // Đảm bảo card.Gia là số để dùng toFixed
            const displayPrice = (typeof card.Gia === 'number' ? card.Gia : 0).toFixed(2);
            row.innerHTML = `
                <td>${card.MaThe}</td>
                <td>${card.TenTroChoi}</td>
                <td>${card.TenThe}</td>
                <td>$${displayPrice}</td>
                <td>${card.HinhAnh ? `<img src="${card.HinhAnh}" alt="${card.TenThe}" loading="lazy" style="max-width:50px;">` : 'N/A'}</td>
                <td>
                    <button class="detail-btn" data-id="${card.MaThe}">Xem</button>
                    <button class="delete-btn" data-id="${card.MaThe}">Xóa</button>
                </td>
            `;
        });
    }

    // Xóa Thẻ Bài & Xem Chi Tiết
    cardTableBody.addEventListener("click", async (e) => {
        const cardId = e.target.getAttribute("data-id");

        if (e.target.classList.contains("delete-btn")) {
            const cardName = e.target.closest('tr').children[2].textContent;

            if (confirm(`Bạn có chắc chắn muốn xóa thẻ "${cardName}" (ID: ${cardId}) không?`)) {
                // Vô hiệu hóa nút xóa để tránh click đúp
                e.target.disabled = true; 
                try {
                    const response = await fetch(`${BASE_URL}/${cardId}`, { method: "DELETE" });
                    const data = await response.json();
                    if (response.ok) {
                        alert(`Đã xóa thẻ (ID: ${cardId}).`);
                        loadCards();
                    } else {
                        alert(`Lỗi xóa thẻ: ${data.error || 'Lỗi không xác định'}`);
                    }
                } catch (error) {
                    alert("Lỗi kết nối server khi xóa thẻ.");
                } finally {
                    e.target.disabled = false;
                }
            }
        } else if (e.target.classList.contains("detail-btn")) {
            showCardDetail(cardId);
        }
    });

    // =========================================================
    // IV. CHỨC NĂNG TÌM KIẾM
    // =========================================================

    searchCardForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const searchSubmitButton = searchCardForm.querySelector('button[type="submit"]');
        searchSubmitButton.disabled = true; // Vô hiệu hóa nút tìm kiếm
        
        const q = document.getElementById("search-q").value.trim();
        const MaTroChoi = document.getElementById("search-MaTroChoi").value;

        if (!MaTroChoi) {
            displayMessage(listMessage, "Vui lòng chọn Mã Trò Chơi để tìm kiếm.", true);
            searchSubmitButton.disabled = false;
            return;
        }

        displayMessage(listMessage, `Đang tìm kiếm thẻ...`, false);

        const queryParams = new URLSearchParams({ q: q, MaTroChoi: MaTroChoi });

        try {
            const response = await fetch(`${BASE_URL}/search?${queryParams.toString()}`);
            const data = await response.json();

            if (!response.ok) {
                displayMessage(listMessage, `Lỗi tìm kiếm: ${data.error || 'Không thể tìm kiếm thẻ'}`, true);
                renderCardList([]);
                return;
            }

            renderCardList(data || []);
            displayMessage(listMessage, `Tìm kiếm thành công. Tìm thấy ${data.length} thẻ.`, false);

        } catch (error) {
            displayMessage(listMessage, "Lỗi kết nối server khi tìm kiếm thẻ.", true);
        } finally {
            searchSubmitButton.disabled = false;
        }
    });

    // =========================================================
    // V. CHỨC NĂNG MODAL THÊM THẺ
    // =========================================================

    // Mở modal
    openAddModalBtn.onclick = () => { 
        addModal.style.display = "block"; 
        // Đảm bảo thông tin game đã chọn được hiển thị khi mở modal
        updateSelectedGame(currentSelectedGameId); 
    };

    // Đóng modal bằng nút X
    closeAddBtn.onclick = () => { addModal.style.display = "none"; };

    // Xử lý submit form Thêm Thẻ
    addCardForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        addSubmitButton.disabled = true; // Vô hiệu hóa nút submit
        displayMessage(addMessage, "Đang thêm thẻ...", false);

        // Đảm bảo MaTroChoi là số nguyên
        const MaTroChoiValue = parseInt(document.getElementById("MaTroChoi").value, 10);

        if (isNaN(MaTroChoiValue)) {
            displayMessage(addMessage, "Vui lòng chọn Trò Chơi hợp lệ trước.", true);
            addSubmitButton.disabled = false;
            return;
        }

        const newCard = {
            TenThe: document.getElementById("TenThe").value,
            MaTroChoi: MaTroChoiValue,
            Gia: parseFloat(document.getElementById("Gia").value) || 0,
            HinhAnh: document.getElementById("HinhAnh").value,
            MoTa: document.getElementById("MoTa").value,
            ThuocTinh: document.getElementById("ThuocTinh").value, // Vẫn giữ là text/JSON string
        };

        try {
            const response = await fetch(BASE_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newCard),
            });
            const data = await response.json();

            if (response.ok) {
                displayMessage(addMessage, `Thẻ "${newCard.TenThe}" đã được thêm thành công!`, false);
                addCardForm.reset();
                addModal.style.display = "none";
                loadCards();
            } else {
                displayMessage(addMessage, `Lỗi thêm thẻ: ${data.error || 'Lỗi không xác định'}`, true);
            }
        } catch (error) {
            displayMessage(addMessage, "Lỗi kết nối server khi thêm thẻ.", true);
        } finally {
            addSubmitButton.disabled = false; // Luôn mở lại nút
        }
    });

    // =========================================================
    // VI. CHỨC NĂNG MODAL CHI TIẾT THẺ
    // =========================================================

    async function showCardDetail(cardId) {
        detailModal.style.display = "block";
        displayMessage(detailMessage, "Đang tải chi tiết thẻ...", false);
        cardDetailContent.innerHTML = '<p>Đang tải...</p>';

        try {
            const response = await fetch(`${BASE_URL}/detail/${cardId}`);
            const card = await response.json();

            if (!response.ok) {
                displayMessage(detailMessage, card.error || 'Không tìm thấy chi tiết', true);
                cardDetailContent.innerHTML = '';
                return;
            }

            // Đảm bảo card.Gia là số
            const price = typeof card.Gia === 'number' ? card.Gia : 0;
            let priceHtml = `<strong>Giá:</strong> $${price.toFixed(2)}`;
            if (card.CapNhatGia) {
                priceHtml += ` <span class="new-price" style="color: blue;">(Giá mới cập nhật từ Scryfall)</span>`;
            }

            // Xử lý Thuộc Tính (Giả định ThuocTinh là object)
            const props = card.ThuocTinh || {}; 

            let detailHtml = `
                <div style="display: flex; gap: 20px;">
                    <div style="flex-shrink: 0;">
                        ${card.HinhAnh ? `<img src="${card.HinhAnh}" alt="${card.TenThe}" loading="lazy" style="max-width: 200px; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">` : '<div style="width: 200px; height: 280px; border: 1px dashed gray; display: flex; align-items: center; justify-content: center;">Không có Hình Ảnh</div>'}
                    </div>
                    <div style="flex-grow: 1;">
                        <h3>${card.TenThe}</h3>
                        <p class="detail-prop"><strong>Mã Thẻ:</strong> ${card.MaThe}</p>
                        <p class="detail-prop"><strong>Trò Chơi:</strong> ${card.TenTroChoi} (ID: ${card.MaTroChoi})</p>
                        <p class="detail-prop">${priceHtml}</p>
                        <p class="detail-prop"><strong>Mô Tả:</strong> ${card.MoTa || 'Không có'}</p>
                    </div>
                </div>
                <hr style="margin: 15px 0;">
                <h4>Thông Số Kỹ Thuật:</h4>
                <ul style="list-style-type: disc; padding-left: 20px;">
                    <li>Màu: ${props.colors?.join(', ') || 'N/A'}</li>
                    <li>Loại: ${props.type || 'N/A'}</li>
                    <li>Độ Hiếm: ${props.rarity || 'N/A'}</li>
                    <li>Set: ${props.set || 'N/A'} (${props.collectorNumber || 'N/A'})</li>
                </ul>
                <div style="clear: both;"></div>
            `;

            // Nếu có nhiều phiên bản (áp dụng cho Magic)
            if (card.Versions?.length > 0) {
                const versionsHtml = card.Versions.map(v => `
                    <li>${v.set} (${v.collector_number}) - $${v.usd ? parseFloat(v.usd).toFixed(2) : 'N/A'}</li>
                `).join('');
                detailHtml += `
                    <h4>Các Phiên Bản Khác:</h4>
                    <ul style="list-style-type: circle; padding-left: 20px;">${versionsHtml}</ul>
                `;
            }

            cardDetailContent.innerHTML = detailHtml;
            detailMessage.textContent = "";

        } catch (error) {
            console.error("Lỗi chi tiết thẻ:", error);
            displayMessage(detailMessage, "Lỗi kết nối server khi tải chi tiết thẻ.", true);
            cardDetailContent.innerHTML = '';
        }
    }

    // Đóng modal chi tiết bằng nút X
    closeDetailBtn.onclick = () => { detailModal.style.display = "none"; };

    // Đóng modal khi click ra ngoài (đã hợp nhất)
    window.onclick = (event) => {
        if (event.target == detailModal) {
            detailModal.style.display = "none";
        } else if (event.target == addModal) {
            addModal.style.display = "none";
        }
    };


    // =========================================================
    // VII. KHỞI CHẠY
    // =========================================================
    loadGames();
});