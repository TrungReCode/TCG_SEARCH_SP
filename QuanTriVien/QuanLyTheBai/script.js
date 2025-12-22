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
    
    // State management
    let currentSelectedGameId = null;
    let displayedCards = []; // Danh sách thẻ đang hiển thị (theo trang)
    let pag = { limit: 70, offset: 0, total: 0, hasMore: false }; // Trạng thái phân trang
    let isSearchMode = false; // Đang ở chế độ tìm kiếm hay không
    let searchDebounceTimer = null;

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
            
            // Duy trì trạng thái chọn game nếu đã có game được chọn trước đó
            if (currentSelectedGameId) {
                gameSelector.value = currentSelectedGameId;
                updateSelectedGame(currentSelectedGameId);
                loadCards();
            }

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
        
        // 1. Cập nhật khối chọn game chính (ẩn trong HTML mới hoặc có thể không tồn tại)
        if (selectedGameId) selectedGameId.textContent = gameId || "N/A";

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
        loadCards();
    });

    // =========================================================
    // III. DANH SÁCH & HÀNH ĐỘNG CƠ BẢN (XÓA, HIỂN THỊ)
    // =========================================================

    async function loadCards() {
        if (!currentSelectedGameId) {
            displayMessage(listMessage, "Vui lòng chọn trò chơi để xem danh sách thẻ.", false);
            renderCardList([]);
            return;
        }
        
        isSearchMode = false;
        // Reset phân trang
        pag = { limit: 70, offset: 0, total: 0, hasMore: false };
        displayedCards = [];
        updateLoadMoreButton(false);
        displayMessage(listMessage, "Đang tải danh sách thẻ...", false);
        cardTableBody.innerHTML = '<tr><td colspan="6" style="text-align: center;">Đang tải...</td></tr>';
        
        try {
            const params = new URLSearchParams({ MaTroChoi: currentSelectedGameId, limit: pag.limit, offset: pag.offset });
            const response = await fetch(`${BASE_URL}?${params.toString()}`);
            const data = await response.json();

            if (!response.ok) {
                displayMessage(listMessage, data.error || 'Không thể tải thẻ', true);
                renderCardList([]);
                return;
            }

            const page = data.page || { total: 0, limit: pag.limit, offset: pag.offset, hasMore: false };
            pag = page;
            displayedCards = data.data || [];
            renderCardList(displayedCards);
            updateLoadMoreButton(pag.hasMore);
            displayMessage(listMessage, `Hiển thị ${displayedCards.length}/${pag.total} thẻ cho trò chơi này.`, false);

        } catch (error) {
            console.error("Lỗi tải thẻ:", error);
            displayMessage(listMessage, "Lỗi kết nối server khi tải thẻ.", true);
            cardTableBody.innerHTML = '';
        }
    }

    function renderCardList(cards) {
        cardTableBody.innerHTML = "";
        
        if (cards.length === 0) {
            const row = cardTableBody.insertRow();
            row.innerHTML = `<td colspan="6" style="text-align: center; padding: 20px;">
                ${isSearchMode ? 'Không tìm thấy thẻ bài phù hợp.' : 'Không có thẻ bài nào.'}
            </td>`;
            return;
        }

        // Sử dụng DocumentFragment để tối ưu performance
        const fragment = document.createDocumentFragment();
        
        cards.forEach(card => {
            const row = document.createElement('tr');
            const displayPrice = (typeof card.Gia === 'number' ? card.Gia : 0).toFixed(2);
            
            row.innerHTML = `
                <td>${card.MaThe}</td>
                <td>${card.TenTroChoi || 'N/A'}</td>
                <td>${card.TenThe}</td>
                <td>$${displayPrice}</td>
                <td>${card.HinhAnh ? `<img src="${card.HinhAnh}" alt="${card.TenThe}" loading="lazy" style="max-width:50px; height: auto; border-radius: 4px;">` : '<span style="color: #999;">N/A</span>'}</td>
                <td>
                    <button class="detail-btn" data-id="${card.MaThe}" title="Xem chi tiết">Xem</button>
                    <button class="delete-btn" data-id="${card.MaThe}" title="Xóa thẻ">Xóa</button>
                </td>
            `;
            fragment.appendChild(row);
        });
        
        cardTableBody.appendChild(fragment);
    }

    function appendCardRows(cards) {
        if (!cards || cards.length === 0) return;
        const fragment = document.createDocumentFragment();
        cards.forEach(card => {
            const row = document.createElement('tr');
            const displayPrice = (typeof card.Gia === 'number' ? card.Gia : 0).toFixed(2);
            row.innerHTML = `
                <td>${card.MaThe}</td>
                <td>${card.TenTroChoi || 'N/A'}</td>
                <td>${card.TenThe}</td>
                <td>$${displayPrice}</td>
                <td>${card.HinhAnh ? `<img src="${card.HinhAnh}" alt="${card.TenThe}" loading="lazy" style="max-width:50px; height: auto; border-radius: 4px;">` : '<span style="color: #999;">N/A</span>'}</td>
                <td>
                    <button class="detail-btn" data-id="${card.MaThe}" title="Xem chi tiết">Xem</button>
                    <button class="delete-btn" data-id="${card.MaThe}" title="Xóa thẻ">Xóa</button>
                </td>
            `;
            fragment.appendChild(row);
        });
        cardTableBody.appendChild(fragment);
    }

    function updateLoadMoreButton(show) {
        let container = document.getElementById('load-more-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'load-more-container';
            container.style.textAlign = 'center';
            container.style.margin = '10px 0 0';
            const table = document.getElementById('card-table');
            if (table && table.parentElement) table.parentElement.appendChild(container);
        }
        container.innerHTML = '';

        // Show Load More only outside search mode
        if (show && !isSearchMode) {
            const loadMoreBtn = document.createElement('button');
            loadMoreBtn.textContent = 'Tải thêm';
            loadMoreBtn.style.padding = '8px 12px';
            loadMoreBtn.style.marginTop = '8px';
            loadMoreBtn.onclick = loadMoreCards;
            container.appendChild(loadMoreBtn);
        }

        // Show Collapse when in search mode OR when more than first page is displayed
        const limitVal = (pag?.limit || 70);
        if (isSearchMode || (displayedCards && displayedCards.length > limitVal)) {
            const collapseBtn = document.createElement('button');
            collapseBtn.textContent = 'Thu gọn danh sách';
            collapseBtn.style.padding = '8px 12px';
            collapseBtn.style.marginTop = '8px';
            if (show && !isSearchMode) collapseBtn.style.marginLeft = '8px';
            collapseBtn.onclick = () => { loadCards(); };
            container.appendChild(collapseBtn);
        }
    }

    async function loadMoreCards() {
        if (isSearchMode) return; // Không phân trang trong chế độ tìm kiếm
        const nextOffset = (pag?.offset || 0) + (pag?.limit || 70);
        const params = new URLSearchParams({ MaTroChoi: currentSelectedGameId, limit: pag.limit, offset: nextOffset });
        updateLoadMoreButton(false);
        displayMessage(listMessage, 'Đang tải thêm...', false);
        try {
            const response = await fetch(`${BASE_URL}?${params.toString()}`);
            const data = await response.json();
            if (!response.ok) {
                displayMessage(listMessage, data.error || 'Không thể tải thêm', true);
                updateLoadMoreButton(pag.hasMore);
                return;
            }
            const page = data.page || { total: pag.total, limit: pag.limit, offset: nextOffset, hasMore: false };
            pag = page;
            const newItems = data.data || [];
            if (newItems.length > 0) {
                displayedCards = displayedCards.concat(newItems);
                appendCardRows(newItems);
            }
            updateLoadMoreButton(pag.hasMore);
            displayMessage(listMessage, `Hiển thị ${displayedCards.length}/${pag.total} thẻ cho trò chơi này.`, false);
        } catch (err) {
            console.error(err);
            displayMessage(listMessage, 'Lỗi tải thêm dữ liệu.', true);
            updateLoadMoreButton(pag.hasMore);
        }
    }

    // Xóa Thẻ Bài & Xem Chi Tiết
    cardTableBody.addEventListener("click", async (e) => {
        const cardId = e.target.getAttribute("data-id");
        if (!cardId) return;

        if (e.target.classList.contains("delete-btn")) {
            const row = e.target.closest('tr');
            const cardName = row.children[2].textContent;

            if (confirm(`Bạn có chắc chắn muốn xóa thẻ "${cardName}" (ID: ${cardId}) không?`)) {
                e.target.disabled = true;
                e.target.textContent = 'Đang xóa...';
                
                try {
                    const response = await fetch(`${BASE_URL}/${cardId}`, { method: "DELETE" });
                    const data = await response.json();
                    
                    if (response.ok) {
                        // Cập nhật danh sách đang hiển thị và DOM
                        displayedCards = displayedCards.filter(c => c.MaThe != cardId);
                        row.remove();
                        // Cập nhật tổng nếu có
                        if (pag && typeof pag.total === 'number' && pag.total > 0) pag.total -= 1;
                        displayMessage(listMessage, `Đã xóa thẻ "${cardName}".`, false);
                    } else {
                        alert(`Lỗi xóa thẻ: ${data.error || 'Lỗi không xác định'}`);
                        e.target.disabled = false;
                        e.target.textContent = 'Xóa';
                    }
                } catch (error) {
                    console.error("Lỗi xóa thẻ:", error);
                    alert("Lỗi kết nối server khi xóa thẻ.");
                    e.target.disabled = false;
                    e.target.textContent = 'Xóa';
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
        performSearch();
    });

    async function performSearch() {
        const searchSubmitButton = searchCardForm.querySelector('button[type="submit"]');
        searchSubmitButton.disabled = true;
        
        const q = document.getElementById("search-q").value.trim();
        const MaTroChoi = document.getElementById("search-MaTroChoi").value;

        if (!MaTroChoi) {
            displayMessage(listMessage, "Vui lòng chọn Trò Chơi để tìm kiếm.", true);
            searchSubmitButton.disabled = false;
            return;
        }

        isSearchMode = true;
        updateLoadMoreButton(false);
        displayMessage(listMessage, `Đang tìm kiếm thẻ...`, false);
        cardTableBody.innerHTML = '<tr><td colspan="6" style="text-align: center;">Đang tìm kiếm...</td></tr>';

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
            // Show collapse control to exit search mode
            updateLoadMoreButton(false);

        } catch (error) {
            console.error("Lỗi tìm kiếm:", error);
            displayMessage(listMessage, "Lỗi kết nối server khi tìm kiếm thẻ.", true);
            cardTableBody.innerHTML = '';
        } finally {
            searchSubmitButton.disabled = false;
        }
    }


    // =========================================================
    // V. CHỨC NĂNG MODAL THÊM THẺ
    // =========================================================

    // Mở modal
    openAddModalBtn.onclick = () => { 
        if (!currentSelectedGameId) {
            alert('Vui lòng chọn trò chơi trước khi thêm thẻ.');
            return;
        }
        addModal.style.display = "block";
        addCardForm.reset();
        addMessage.textContent = '';
        updateSelectedGame(currentSelectedGameId); 
    };

    // Đóng modal bằng nút X
    closeAddBtn.onclick = () => { addModal.style.display = "none"; };

    // Xử lý submit form Thêm Thẻ
    addCardForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        addSubmitButton.disabled = true;
        const originalText = addSubmitButton.textContent;
        addSubmitButton.textContent = 'Đang thêm...';
        displayMessage(addMessage, "Đang thêm thẻ...", false);

        const MaTroChoiValue = parseInt(document.getElementById("MaTroChoi").value, 10);

        if (isNaN(MaTroChoiValue)) {
            displayMessage(addMessage, "Vui lòng chọn Trò Chơi hợp lệ trước.", true);
            addSubmitButton.disabled = false;
            addSubmitButton.textContent = originalText;
            return;
        }

        const newCard = {
            TenThe: document.getElementById("TenThe").value.trim(),
            MaTroChoi: MaTroChoiValue,
            Gia: parseFloat(document.getElementById("Gia").value) || 0,
            HinhAnh: document.getElementById("HinhAnh").value.trim(),
            MoTa: document.getElementById("MoTa").value.trim(),
            ThuocTinh: document.getElementById("ThuocTinh").value.trim(),
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
                
                setTimeout(() => {
                    addModal.style.display = "none";
                    loadCards(); // Reload để lấy thẻ mới
                }, 1000);
            } else {
                displayMessage(addMessage, `Lỗi thêm thẻ: ${data.error || 'Lỗi không xác định'}`, true);
            }
        } catch (error) {
            console.error("Lỗi thêm thẻ:", error);
            displayMessage(addMessage, "Lỗi kết nối server khi thêm thẻ.", true);
        } finally {
            addSubmitButton.disabled = false;
            addSubmitButton.textContent = originalText;
        }
    });

    // =========================================================
    // VI. CHỨC NĂNG MODAL CHI TIẾT THẺ
    // =========================================================

    async function showCardDetail(cardId) {
        detailModal.style.display = "block";
        displayMessage(detailMessage, "Đang tải chi tiết thẻ...", false);
        cardDetailContent.innerHTML = '<p style="text-align: center; padding: 20px;">Đang tải...</p>';

        try {
            const response = await fetch(`${BASE_URL}/detail/${cardId}`);
            const card = await response.json();

            if (!response.ok) {
                displayMessage(detailMessage, `${card.error || 'Không tìm thấy chi tiết'}`, true);
                cardDetailContent.innerHTML = '';
                return;
            }

            const price = typeof card.Gia === 'number' ? card.Gia : 0;
            let priceHtml = `<strong>Giá:</strong> $${price.toFixed(2)}`;
            if (card.CapNhatGia) {
                priceHtml += ` <span class="new-price" style="color: blue;">(Giá mới cập nhật từ Scryfall)</span>`;
            }

            const props = card.ThuocTinh || {}; 

            let detailHtml = `
                <div style="display: flex; gap: 20px; flex-wrap: wrap;">
                    <div style="flex-shrink: 0;">
                        ${card.HinhAnh ? 
                            `<img src="${card.HinhAnh}" alt="${card.TenThe}" loading="lazy" style="max-width: 200px; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">` : 
                            '<div style="width: 200px; height: 280px; border: 2px dashed #ccc; display: flex; align-items: center; justify-content: center; border-radius: 8px; color: #999;">Không có Hình Ảnh</div>'
                        }
                    </div>
                    <div style="flex-grow: 1; min-width: 300px;">
                        <h3 style="margin-top: 0;">${card.TenThe}</h3>
                        <p class="detail-prop"><strong>Mã Thẻ:</strong> #${card.MaThe}</p>
                        <p class="detail-prop"><strong>Trò Chơi:</strong> ${card.TenTroChoi}</p>
                        <p class="detail-prop">${priceHtml}</p>
                        <p class="detail-prop"><strong>Mô Tả:</strong> ${card.MoTa || '<span style="color: #999;">Không có mô tả</span>'}</p>
                    </div>
                </div>
                <hr style="margin: 15px 0; border: none; border-top: 1px solid #eee;">
                <h4>Thông Số Kỹ Thuật:</h4>
                <ul style="list-style-type: disc; padding-left: 20px; line-height: 1.8;">
                    <li><strong>Màu:</strong> ${props.colors?.join(', ') || '<span style="color: #999;">N/A</span>'}</li>
                    <li><strong>Loại:</strong> ${props.type || '<span style="color: #999;">N/A</span>'}</li>
                    <li><strong>Độ Hiếm:</strong> ${props.rarity || '<span style="color: #999;">N/A</span>'}</li>
                    <li><strong>Set:</strong> ${props.set || '<span style="color: #999;">N/A</span>'} ${props.collectorNumber ? `(${props.collectorNumber})` : ''}</li>
                </ul>
            `;

            if (card.Versions?.length > 0) {
                const versionsHtml = card.Versions.map(v => `
                    <li><strong>${v.set}</strong> (${v.collector_number}) - $${v.usd ? parseFloat(v.usd).toFixed(2) : 'N/A'}</li>
                `).join('');
                detailHtml += `
                    <hr style="margin: 15px 0; border: none; border-top: 1px solid #eee;">
                    <h4>Các Phiên Bản Khác:</h4>
                    <ul style="list-style-type: circle; padding-left: 20px; line-height: 1.8;">${versionsHtml}</ul>
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