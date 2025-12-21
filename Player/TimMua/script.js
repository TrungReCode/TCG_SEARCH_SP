const CONFIG = {
    API_BASE: "http://localhost:3000",
    USER_ID: Number(localStorage.getItem("maNguoiDung")) || 0,
    PLACEHOLDER_IMG: "https://via.placeholder.com/400x300?text=No+Img",
    // Cache formatter để tối ưu hiệu năng render danh sách dài
    CURRENCY_FORMATTER: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
};

const API = {
    RAO_BAN: `${CONFIG.API_BASE}/raoban`,
    GAMES: `${CONFIG.API_BASE}/games`,
    BUYING: `${CONFIG.API_BASE}/timmua`,
    CARDS: `${CONFIG.API_BASE}/cards`,
    ORDERS: `${CONFIG.API_BASE}/orders`
};

const DOM = {
    // Lists & Containers
    cardList: document.getElementById('cardList'),
    buyingList: document.getElementById('buyingList'),
    matchSection: document.getElementById("matchSection"),
    matchList: document.getElementById("matchList"),
    matchCount: document.getElementById("matchCount"),
    
    // Filters
    searchInput: document.getElementById('searchInput'),
    gameFilter: document.getElementById('gameFilter'),
    wantGameFilter: document.getElementById('wantGameFilter'),
    
    // Modals
    modalDetail: document.getElementById('cardDetailModal'),
    modalAddWant: document.getElementById('modalAddWant'),
    modalTrans: document.getElementById('modalTransaction'),
    modalMyOrders: document.getElementById('modalMyOrders'),
    
    // Modal Contents
    cardDetails: document.getElementById('cardDetails'),
    myOrdersBody: document.getElementById('myOrdersBody'),
    myOrdersEmpty: document.getElementById('myOrdersEmpty'),
    transContent: document.getElementById('transContent'),
    btnZaloContact: document.getElementById('btnZaloContact'),
    txtZaloPhone: document.getElementById('txtZaloPhone'),
    
    // Forms
    formAddWant: document.getElementById('formAddWant'),
    wantSearchInput: document.getElementById('wantSearchInput'),
    wantSearchResults: document.getElementById('wantSearchResults'),
    
    // Inputs
    inputWantMaThe: document.getElementById("wantMaThe"),
    inputWantTieuDe: document.getElementById("wantTieuDe"),
    inputWantHinhAnh: document.getElementById("wantHinhAnh"),
    inputWantImageLink: document.getElementById("wantImageLink"),
    divSelectedWantCard: document.getElementById("selectedWantCard"),
    imgWantCard: document.getElementById("wantCardImg"),
    lblWantCardName: document.getElementById("wantCardName"),
    inputWantGia: document.getElementById("wantGia"),
    inputWantMoTa: document.getElementById("wantMoTa")
};

/**
 * ====================================================================
 * 2. UTILS (TIỆN ÍCH)
 * ====================================================================
 */
const Utils = {
    formatCurrency: (amount) => CONFIG.CURRENCY_FORMATTER.format(amount),
    
    normalizeText: (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(),

    fetchData: async (url, options = {}) => {
        try {
            const res = await fetch(url, options);
            if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
            return await res.json();
        } catch (err) {
            console.error(`API Error (${url}):`, err);
            throw err;
        }
    },

    modal: {
        show: (el) => {
            if (!el) return;
            el.classList.remove('hidden');
            el.classList.add('flex');
            document.body.style.overflow = 'hidden';
        },
        hide: (el) => {
            if (!el) return;
            el.classList.remove('flex');
            el.classList.add('hidden');
            document.body.style.overflow = '';
        },
        closeAll: () => {
            [DOM.modalDetail, DOM.modalAddWant, DOM.modalTrans, DOM.modalMyOrders].forEach(Utils.modal.hide);
            if (DOM.cardDetails) DOM.cardDetails.innerHTML = '';
        }
    }
};

/**
 * ====================================================================
 * 3. MODULE: MARKETPLACE (DANH SÁCH BÁN & CHI TIẾT)
 * ====================================================================
 */
const Marketplace = {
    fetchList: async (keyword = "", gameId = "") => {
        if (!DOM.cardList) return;
        DOM.cardList.innerHTML = `<div class="col-span-full text-center py-10 text-gray-400 italic">Đang tải danh sách thẻ...</div>`;

        try {
            const params = new URLSearchParams({
                maNguoiDung: CONFIG.USER_ID,
                keyword: keyword.trim(),
                maTroChoi: gameId
            });
            
            const res = await Utils.fetchData(`${API.RAO_BAN}/search-combined?${params}`);
            const cards = res?.data || res || [];

            DOM.cardList.innerHTML = cards.length === 0 
                ? `<p class="col-span-full text-center py-10 text-gray-400">Không tìm thấy thẻ nào.</p>`
                : Marketplace.renderList(cards);
        } catch (error) {
            DOM.cardList.innerHTML = `<p class="col-span-full text-center text-red-500">Lỗi tải dữ liệu.</p>`;
        }
    },

    renderList: (cards) => {
        return cards.map(card => {
            const { MaRaoBan, MaNguoiDung, TrangThaiDonHang, NguoiMuaId, TinhTrang, GiaBan, HinhAnh, TenTroChoi, TenThe, TenNguoiDung, NgayDang } = card;
            
            if (!MaRaoBan) return '';
            
            const isOwner = Number(MaNguoiDung) === CONFIG.USER_ID;
            const hasActiveOrder = TrangThaiDonHang && ['ChoXuLy', 'DaThanhToan', 'DangGiao'].includes(TrangThaiDonHang);
            const isMyOrder = hasActiveOrder && (Number(NguoiMuaId) === CONFIG.USER_ID);
            const normStatus = Utils.normalizeText(TinhTrang);

            if (normStatus === 'daban' && !isOwner) return '';

            let btnAction, statusBadge = '', borderClass = 'border border-gray-100', opacityClass = '';

            if (isOwner) {
                if (normStatus === 'daban') {
                    borderClass = 'border-2 border-gray-300';
                    btnAction = `<span class="text-xs font-bold text-gray-700 bg-gray-100 px-3 py-1.5 rounded-full">Đã được bán</span>`;
                    statusBadge = `<div class="absolute top-2 left-2 bg-green-600 text-white px-2 py-1 rounded text-xs font-bold shadow">Đã được bán</div>`;
                } else {
                    borderClass = 'border-2 border-yellow-400 ring-2 ring-yellow-50';
                    btnAction = `<span class="text-xs font-bold text-yellow-700 bg-yellow-100 px-3 py-1.5 rounded-full">Thẻ của bạn</span>`;
                    if (hasActiveOrder) statusBadge = `<div class="absolute top-2 left-2 bg-purple-600 text-white px-2 py-1 rounded text-xs font-bold shadow animate-pulse">Khách đã đặt</div>`;
                }
            } else if (isMyOrder) {
                borderClass = 'border-2 border-green-500 ring-2 ring-green-50';
                btnAction = `<button disabled class="text-sm bg-green-600 text-white px-4 py-1.5 rounded font-bold cursor-default shadow-sm"><i class="fas fa-check-circle"></i> Bạn đã đặt mua</button>`;
                statusBadge = `<div class="absolute top-2 left-2 bg-green-600 text-white px-2 py-1 rounded text-xs font-bold shadow">Đơn của bạn</div>`;
            } else if (hasActiveOrder) {
                opacityClass = 'opacity-70 grayscale-[50%]';
                btnAction = `<button disabled class="text-sm bg-gray-300 text-gray-500 px-4 py-1.5 rounded cursor-not-allowed font-medium">Đã có người đặt</button>`;
                statusBadge = `<div class="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 rounded text-xs font-bold shadow">Đã bán</div>`;
            } else {
                btnAction = `<button onclick="handlePurchase(${MaRaoBan}, ${GiaBan})" class="text-sm bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded font-bold transition shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"><i class="fas fa-shopping-cart mr-1"></i> Mua ngay</button>`;
            }

            return `
                <div class="bg-white rounded-xl shadow-sm overflow-hidden flex flex-col h-full card-hover-effect ${borderClass} ${opacityClass} relative">
                    ${statusBadge}
                    <div class="relative cursor-pointer h-52 bg-gray-50 flex items-center justify-center p-2" onclick="fetchCardDetail(${MaRaoBan})">
                        <img src="${HinhAnh || CONFIG.PLACEHOLDER_IMG}" class="max-w-full max-h-full object-contain drop-shadow-sm transition-transform duration-300 hover:scale-105" loading="lazy">
                        <div class="absolute bottom-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] font-bold shadow text-gray-600 border border-gray-200 uppercase tracking-wider">${TinhTrang || 'Mới'}</div>
                    </div>
                    <div class="p-4 flex flex-col flex-grow">
                        <p class="text-[10px] text-blue-500 font-bold uppercase tracking-widest mb-1">${TenTroChoi || 'Trading Card'}</p>
                        <h3 class="text-base font-bold text-gray-800 leading-snug mb-3 line-clamp-2 cursor-pointer hover:text-blue-600 transition" onclick="fetchCardDetail(${MaRaoBan})">${TenThe}</h3>
                        <div class="mt-auto pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                            <div class="flex flex-col">
                                <span class="text-xs text-gray-400 font-medium">Giá bán</span>
                                <span class="text-lg font-extrabold text-red-600 leading-none">${Utils.formatCurrency(GiaBan)}</span>
                            </div>
                            <div>${btnAction}</div>
                        </div>
                        <div class="mt-2 flex justify-between items-center text-xs text-gray-400">
                            <span><i class="fas fa-user-circle mr-1"></i> ${TenNguoiDung}</span>
                            <span>${new Date(NgayDang).toLocaleDateString('vi-VN')}</span>
                        </div>
                    </div>
                </div>`;
        }).join('');
    },

    fetchDetail: async (maRaoBan) => {
        if (!DOM.cardDetails) return;
        Utils.modal.show(DOM.modalDetail);
        DOM.cardDetails.innerHTML = '<p class="text-center text-blue-500 py-10"><i class="fas fa-spinner fa-spin"></i> Đang tải...</p>';

        try {
            const res = await Utils.fetchData(`${API.RAO_BAN}/detail/${maRaoBan}`);
            const card = res?.data || res;
            if (!card) throw new Error("No data");
            Marketplace.renderDetail(card);
        } catch (error) {
            DOM.cardDetails.innerHTML = `<p class="text-red-500 text-center">Lỗi tải chi tiết: ${error.message}</p>`;
        }
    },

    renderDetail: (card) => {
        const { MaNguoiDung, MaRaoBan, GiaBan, TinhTrang, HinhAnh, TenThe, TenTroChoi, TenNguoiDung, MoTaRaoBan } = card;
        const isOwner = Number(MaNguoiDung) === CONFIG.USER_ID;
        
        const btnHtml = isOwner
            ? `<button disabled class="w-full bg-gray-300 text-gray-600 font-bold py-3 rounded cursor-not-allowed">Đây là thẻ của bạn</button>`
            : `<button onclick="handlePurchase(${MaRaoBan}, ${GiaBan})" class="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-3 rounded shadow-lg transform transition hover:-translate-y-1">MUA NGAY VỚI GIÁ ${Utils.formatCurrency(GiaBan)}</button>`;

        const displayTinhTrang = (Utils.normalizeText(TinhTrang) === 'daban') ? 'Thẻ của bạn đã được bán' : (TinhTrang || 'Mới');

        DOM.cardDetails.innerHTML = `
            <div class="flex flex-col md:flex-row gap-6">
                <div class="w-full md:w-1/3">
                    <img src="${HinhAnh || CONFIG.PLACEHOLDER_IMG}" class="w-full rounded-lg shadow-md object-contain bg-gray-50 border">
                </div>
                <div class="w-full md:w-2/3 flex flex-col">
                    <h2 class="text-3xl font-extrabold text-gray-900 mb-2">${TenThe}</h2>
                    <p class="text-blue-600 font-medium mb-4">${TenTroChoi || 'N/A'}</p>
                    <div class="bg-gray-50 p-4 rounded-lg border border-gray-100 mb-6 space-y-2">
                        <div class="flex justify-between border-b border-gray-200 pb-2">
                            <span class="text-gray-500">Giá bán:</span>
                            <span class="text-2xl font-bold text-red-600">${Utils.formatCurrency(GiaBan)}</span>
                        </div>
                        <div class="flex justify-between pt-2">
                            <span class="text-gray-500">Tình trạng:</span>
                            <span class="font-bold text-green-600">${displayTinhTrang}</span>
                        </div>
                        <div class="flex justify-between pt-2">
                            <span class="text-gray-500">Người bán:</span>
                            <span class="font-bold">${TenNguoiDung}</span>
                        </div>
                    </div>
                    <div class="prose text-gray-600 mb-6">
                        <h4 class="font-bold text-gray-800">Mô tả người bán:</h4>
                        <p>${MoTaRaoBan || 'Không có mô tả chi tiết.'}</p>
                    </div>
                    <div class="mt-auto">${btnHtml}</div>
                </div>
            </div>`;
    },

    fetchGames: async () => {
        try {
            const data = await Utils.fetchData(API.GAMES);
            const list = Array.isArray(data) ? data : (data?.data || []);
            
            const createOptions = (games) => 
                `<option value="">-- Tất cả Trò chơi --</option>` + 
                games.map(g => `<option value="${g.MaTroChoi}">${g.TenTroChoi}</option>`).join('');

            const html = createOptions(list);
            if(DOM.gameFilter) DOM.gameFilter.innerHTML = html;
            if(DOM.wantGameFilter) DOM.wantGameFilter.innerHTML = html;
        } catch (e) { console.error(e); }
    }
};

/**
 * ====================================================================
 * 4. MODULE: BUYING REQUESTS (CẦN MUA & KHỚP LỆNH)
 * ====================================================================
 */
const Buying = {
    fetchList: async () => {
        if (!DOM.buyingList) return;
        try {
            const data = await Utils.fetchData(`${API.BUYING}/list?maNguoiDung=${CONFIG.USER_ID}`);
            DOM.buyingList.innerHTML = (!data || data.length === 0) 
                ? '<p class="col-span-full text-center text-gray-400 italic">Chưa có tin cần mua nào.</p>' 
                : Buying.renderList(data);
        } catch (err) {
            DOM.buyingList.innerHTML = '<p class="text-red-500 col-span-full text-center">Lỗi tải danh sách mua.</p>';
        }
    },

    renderList: (items) => {
        return items.map(item => {
            const { MaNguoiDung, GiaMongMuon, MaCanMua, DaLienHe, HinhAnhHienThi, TieuDe, TenNguoiDung, MoTa } = item;
            const isOwner = Number(MaNguoiDung) === CONFIG.USER_ID;
            const priceDisplay = GiaMongMuon > 0 ? Utils.formatCurrency(GiaMongMuon) : "Thỏa thuận";
            let contactBtn, actionArea = '';

            if (isOwner) {
                contactBtn = `<span class="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-1 rounded">Tin của bạn</span>`;
                actionArea = `<button onclick="closeMyWant(${MaCanMua})" class="text-xs bg-gray-200 hover:bg-red-100 hover:text-red-600 text-gray-600 px-2 py-1 rounded ml-2" title="Đóng tin"><i class="fas fa-times-circle"></i> Đóng</button>`;
            } else if (DaLienHe === 1) {
                contactBtn = `<button disabled class="text-xs border border-orange-300 text-orange-600 bg-orange-50 px-2 py-1 rounded cursor-not-allowed font-medium"><i class="fas fa-clock"></i> Đang chờ xử lý</button>`;
            } else {
                contactBtn = `<button onclick="handleContactRequest(${MaCanMua})" class="text-xs border border-cyan-500 text-cyan-600 px-2 py-1 rounded hover:bg-cyan-50 font-medium transition"><i class="fas fa-handshake"></i> Liên hệ bán</button>`;
            }

            return `
                <div class="bg-white rounded-xl shadow-sm border border-cyan-100 overflow-hidden card-hover-effect flex flex-col h-full">
                    <div class="relative w-full h-48 bg-gray-50">
                        <img src="${HinhAnhHienThi || CONFIG.PLACEHOLDER_IMG}" class="w-full h-full object-cover sm:object-contain p-1" loading="lazy">
                        <span class="absolute top-0 left-0 bg-cyan-600 text-white text-xs px-2 py-1 rounded-br font-bold shadow-sm">CẦN MUA</span>
                        <div class="absolute top-0 right-0 p-1">${actionArea}</div>
                    </div>
                    <div class="p-3 flex flex-col flex-grow">
                        <h5 class="text-md font-bold text-gray-800 line-clamp-2 mb-1">${TieuDe}</h5>
                        <p class="text-xs text-gray-500 mb-2"><i class="fas fa-user-circle"></i> ${TenNguoiDung}</p>
                        <div class="bg-gray-50 p-2 rounded mb-3 flex-grow border border-gray-100">
                            <p class="text-xs text-gray-700 line-clamp-3">${MoTa || 'Không có mô tả chi tiết.'}</p>
                        </div>
                        <div class="flex justify-between items-center mt-auto pt-3 border-t border-gray-100">
                            <span class="text-lg font-bold text-cyan-700">${priceDisplay}</span>
                            ${contactBtn}
                        </div>
                    </div>
                </div>`;
        }).join('');
    },

    checkMatches: async () => {
        if (!CONFIG.USER_ID) return;
        try {
            const data = await Utils.fetchData(`${API.BUYING}/match/${CONFIG.USER_ID}`);
            const matches = data?.matches || [];
            
            if (data.success && matches.length > 0) {
                DOM.matchSection?.classList.remove("hidden");
                if (DOM.matchCount) DOM.matchCount.textContent = matches.length;
                if (DOM.matchList) {
                    DOM.matchList.innerHTML = matches.map(m => `
                        <div class="bg-white p-3 rounded border-l-4 border-green-500 shadow-sm flex justify-between items-center">
                            <div>
                                <p class="text-sm text-gray-600">Bạn cần: <strong class="text-gray-800">${m.TenThe}</strong> (${Utils.formatCurrency(m.GiaMongMuon)})</p>
                                <p class="text-sm mt-1"><i class="fas fa-arrow-right text-green-500 mr-1"></i> Có người bán: <span class="text-green-600 font-bold text-lg">${Utils.formatCurrency(m.GiaNguoiBan)}</span></p>
                            </div>
                            <button onclick="fetchCardDetail(${m.MaRaoBan})" class="bg-green-100 text-green-700 px-3 py-1 rounded hover:bg-green-200 text-sm font-bold">Xem Ngay</button>
                        </div>
                    `).join('');
                }
            } else {
                DOM.matchSection?.classList.add("hidden");
            }
        } catch (err) { console.warn("Matching check failed:", err); }
    },

    openModal: () => {
        if (!CONFIG.USER_ID) return alert("Vui lòng đăng nhập để đăng tin!");
        Utils.modal.show(DOM.modalAddWant);
        DOM.formAddWant.reset();
        Buying.clearSelected();
    },

    searchCards: async () => {
        const keyword = DOM.wantSearchInput.value;
        DOM.wantSearchResults.innerHTML = '<p class="text-gray-500 text-center p-2">Đang tìm...</p>';
        try {
            const selectedGame = DOM.wantGameFilter?.value || DOM.gameFilter?.value || '';
            const params = new URLSearchParams({ q: keyword });
            if (selectedGame) params.append('MaTroChoi', selectedGame);
            
            const data = await Utils.fetchData(`${API.CARDS}/search?${params}`);
            
            if (!data || data.length === 0) {
                DOM.wantSearchResults.innerHTML = '<p class="text-red-500 text-center p-2">Không tìm thấy thẻ.</p>';
                return;
            }

            DOM.wantSearchResults.innerHTML = data.map(c => `
                <div class="flex items-center gap-3 p-2 hover:bg-cyan-50 cursor-pointer transition" 
                     onclick="selectCardForWant('${c.MaThe}', '${c.TenThe.replace(/'/g, "\\'")}', '${c.HinhAnh}')">
                    <img src="${c.HinhAnh}" class="w-8 h-10 object-cover rounded">
                    <div>
                        <p class="font-bold text-gray-800 text-sm">${c.TenThe}</p>
                        <p class="text-xs text-gray-500">ID: ${c.MaThe}</p>
                    </div>
                </div>
            `).join('');
        } catch (e) { console.error(e); }
    },

    selectCard: (id, name, img) => {
        DOM.inputWantMaThe.value = id;
        DOM.inputWantTieuDe.value = `Cần mua thẻ: ${name}`;
        DOM.divSelectedWantCard.classList.remove("hidden");
        DOM.lblWantCardName.textContent = name;
        DOM.imgWantCard.src = img;
        DOM.wantSearchResults.innerHTML = "";
        DOM.inputWantImageLink.value = img;
    },

    clearSelected: () => {
        DOM.inputWantMaThe.value = "";
        DOM.divSelectedWantCard.classList.add("hidden");
    },

    submitForm: async (e) => {
        e.preventDefault();
        const payload = {
            MaNguoiDung: CONFIG.USER_ID,
            MaThe: DOM.inputWantMaThe.value || null,
            TieuDe: DOM.inputWantTieuDe.value,
            GiaMongMuon: DOM.inputWantGia.value,
            HinhAnh: DOM.inputWantImageLink.value,
            MoTa: DOM.inputWantMoTa.value
        };

        try {
            const result = await Utils.fetchData(`${API.BUYING}/add`, {
                method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload)
            });
            if (result.success) {
                alert("Đăng tin thành công!");
                Utils.modal.hide(DOM.modalAddWant);
                Buying.fetchList();
            } else {
                alert("Lỗi: " + result.error);
            }
        } catch (err) { alert("Lỗi hệ thống"); }
    },

    closeWant: async (id) => {
        if (!confirm("Bạn xác nhận đã mua được thẻ này (hoặc không tìm nữa)? Tin sẽ bị ẩn.")) return;
        try {
            const res = await Utils.fetchData(`${API.BUYING}/update/${id}`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ MaNguoiDung: CONFIG.USER_ID, DaKetThuc: 1 })
            });
            if (res.success) {
                alert("Đã đóng tin tìm kiếm.");
                Buying.fetchList();
            } else { alert("Lỗi: " + res.error); }
        } catch (err) { alert("Lỗi kết nối"); }
    }
};

/**
 * ====================================================================
 * 5. MODULE: ORDERS (ĐƠN HÀNG CỦA TÔI)
 * ====================================================================
 */
const Orders = {
    cacheData: null,
    lastFetchTime: 0,
    CACHE_DURATION: 60000, 

    openModal: () => {
        if (!CONFIG.USER_ID) return alert("Vui lòng đăng nhập để xem đơn hàng!");
        Utils.modal.show(DOM.modalMyOrders);
        
        const now = Date.now();
        if (Orders.cacheData && (now - Orders.lastFetchTime < Orders.CACHE_DURATION)) {
            Orders.renderTable(Orders.cacheData);
        } else {
            Orders.fetchList();
        }
    },

    fetchList: async (forceReload = false) => {
        DOM.myOrdersBody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-blue-500"><i class="fas fa-spinner fa-spin"></i> Đang cập nhật dữ liệu...</td></tr>';
        DOM.myOrdersEmpty.classList.add('hidden');

        try {
            const res = await Utils.fetchData(`${API.ORDERS}/my-orders?maNguoiDung=${CONFIG.USER_ID}`);
            const orders = res.data || [];
            
            Orders.cacheData = orders;
            Orders.lastFetchTime = Date.now();

            if (orders.length === 0) {
                DOM.myOrdersBody.innerHTML = '';
                DOM.myOrdersEmpty.classList.remove('hidden');
            } else {
                Orders.renderTable(orders);
                // Refresh related lists silently
                Buying.checkMatches().catch(() => {});
                Marketplace.fetchList(DOM.searchInput.value, DOM.gameFilter.value).catch(() => {});
            }
        } catch (err) {
            DOM.myOrdersBody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-red-500">Lỗi tải dữ liệu. <button onclick="Orders.fetchList(true)" class="underline">Thử lại</button></td></tr>';
        }
    },

    renderTable: (orders) => {
        DOM.myOrdersBody.innerHTML = orders.map(order => {
            const isBuy = order.LoaiGiaoDich === 'MUA';
            const typeBadge = isBuy 
                ? `<span class="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-bold">Mua thẻ</span>`
                : `<span class="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs font-bold">Bán thẻ</span>`;
            
            const imgSrc = order.HinhAnhHienThi || CONFIG.PLACEHOLDER_IMG;
            const price = order.GiaHienThi ? Utils.formatCurrency(order.GiaHienThi) : 'Thỏa thuận';
            
            let statusBadge = '', cancelBtn = '';
            
            switch (order.TrangThai) {
                case 'ChoXuLy':
                    statusBadge = `<span class="text-yellow-600 bg-yellow-50 px-2 py-1 rounded border border-yellow-200 text-xs font-bold"><i class="fas fa-clock"></i> Chờ xử lý</span>`;
                    cancelBtn = `<button onclick="cancelMyOrder(${order.MaDonHang})" class="text-red-500 hover:text-white hover:bg-red-500 border border-red-500 px-3 py-1 rounded text-xs transition">Hủy đơn</button>`;
                    break;
                case 'DangGiao':
                    statusBadge = `<span class="text-blue-600 bg-blue-50 px-2 py-1 rounded border border-blue-200 text-xs font-bold"><i class="fas fa-shipping-fast"></i> Đang giao</span>`;
                    cancelBtn = `<span class="text-gray-400 text-xs italic">Không thể hủy</span>`;
                    break;
                case 'HoanTat':
                    statusBadge = `<span class="text-green-600 bg-green-50 px-2 py-1 rounded border border-green-200 text-xs font-bold"><i class="fas fa-check"></i> Hoàn tất</span>`;
                    break;
                case 'Huy':
                    statusBadge = `<span class="text-gray-500 bg-gray-100 px-2 py-1 rounded text-xs font-bold">Đã hủy</span>`;
                    break;
            }

            return `
                <tr class="hover:bg-gray-50 border-b transition">
                    <td class="px-5 py-4 text-sm text-gray-500">#${order.MaDonHang}</td>
                    <td class="px-5 py-4">${typeBadge}</td>
                    <td class="px-5 py-4">
                        <div class="flex items-center gap-3">
                            <img src="${imgSrc}" class="w-10 h-14 object-cover rounded border bg-white" loading="lazy"> 
                            <div>
                                <div class="font-bold text-gray-800 text-sm line-clamp-1 w-48" title="${order.TenTheHienThi}">${order.TenTheHienThi || 'N/A'}</div>
                                <div class="text-xs text-gray-500">${price}</div>
                            </div>
                        </div>
                    </td>
                    <td class="px-5 py-4">${statusBadge}</td>
                    <td class="px-5 py-4 text-center">${cancelBtn}</td>
                </tr>`;
        }).join('');
    },

    cancel: async (id) => {
        if (!confirm("Bạn có chắc chắn muốn HỦY đơn hàng này không?")) return;
        try {
            const res = await Utils.fetchData(`${API.ORDERS}/cancel-my-order/${id}`, {
                method: "PUT", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ maNguoiDung: CONFIG.USER_ID })
            });
            if (res.success) {
                alert("Đã hủy đơn hàng thành công!");
                Orders.fetchList(true);
            } else { alert("Lỗi: " + res.error); }
        } catch (err) { alert("Lỗi hệ thống khi hủy đơn."); }
    }
};

/**
 * ====================================================================
 * 6. MODULE: TRANSACTIONS (XỬ LÝ MUA/BÁN)
 * ====================================================================
 */
const Transaction = {
    handlePurchase: async (maRaoBan, giaBan) => {
        if (event) event.stopPropagation();
        if (!CONFIG.USER_ID) return alert("Vui lòng đăng nhập!");
        if (!confirm("Bạn muốn mua thẻ này? Admin sẽ là trung gian giao dịch.")) return;

        const btn = event.target;
        const originalText = btn.innerText;
        btn.disabled = true; btn.innerText = "Đang xử lý...";

        try {
            const data = await Utils.fetchData(`${API.ORDERS}/create-buy`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ MaNguoiDung: CONFIG.USER_ID, MaRaoBan: maRaoBan, Gia: giaBan })
            });

            if (data.success) {
                Utils.modal.closeAll();
                Transaction.showModal(data.adminInfo, `MUA DH${data.orderId}`);
                
                // Refresh data
                Marketplace.fetchList(DOM.searchInput.value, DOM.gameFilter.value).catch(() => {});
                Buying.checkMatches().catch(() => {});
                Orders.fetchList(true).catch(() => {});
            } else {
                alert("THÔNG BÁO: " + data.error);
                Marketplace.fetchList(DOM.searchInput.value, DOM.gameFilter.value);
            }
        } catch (err) { alert("Lỗi kết nối server"); } 
        finally { if (btn) { btn.disabled = false; btn.innerText = originalText; } }
    },

    handleContactRequest: async (maCanMua) => {
        if (event) event.stopPropagation();
        const btn = event.currentTarget;
        const originalContent = btn.innerHTML;
        btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Xử lý...';

        try {
            const data = await Utils.fetchData(`${API.ORDERS}/create-contact`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ MaNguoiDung: CONFIG.USER_ID, MaCanMua: maCanMua })
            });

            if (data.success) {
                Transaction.showModal(data.adminInfo, `BAN THE YEU CAU #${maCanMua}`);
                btn.className = "text-xs border border-orange-300 text-orange-600 bg-orange-50 px-2 py-1 rounded cursor-not-allowed";
                btn.innerHTML = '<i class="fas fa-clock"></i> Đang chờ xử lý';
            } else { 
                alert("THÔNG BÁO: " + data.error);
                btn.disabled = false; btn.innerHTML = originalContent;
            }
        } catch (err) { 
            alert("Lỗi kết nối hệ thống");
            btn.disabled = false; btn.innerHTML = originalContent;
        }
    },

    showModal: (adminInfo, contentMsg) => {
        const zaloNumber = adminInfo?.zalo ?? "0327734880"; 
        
        if (DOM.btnZaloContact && DOM.txtZaloPhone) {
            DOM.btnZaloContact.href = `https://zalo.me/${zaloNumber}`;
            DOM.txtZaloPhone.textContent = zaloNumber;
            DOM.btnZaloContact.classList.remove('hidden');
        }
        if (DOM.transContent) DOM.transContent.textContent = contentMsg;
        Utils.modal.show(DOM.modalTrans);
    }
};

/**
 * ====================================================================
 * 7. GLOBAL EXPORTS & EVENT LISTENERS
 * ====================================================================
 */
// Export functions for HTML onclick
window.fetchCardDetail = Marketplace.fetchDetail;
window.handlePurchase = Transaction.handlePurchase;
window.handleContactRequest = Transaction.handleContactRequest;
window.closeModal = Utils.modal.closeAll;
window.closeWantModal = () => Utils.modal.hide(DOM.modalAddWant);
window.openWantModal = Buying.openModal;
window.searchForWant = Buying.searchCards;
window.selectCardForWant = Buying.selectCard;
window.clearSelectedWant = Buying.clearSelected;
window.closeMyWant = Buying.closeWant;
window.openMyOrdersModal = Orders.openModal;
window.cancelMyOrder = Orders.cancel;

document.addEventListener('DOMContentLoaded', () => {
    Marketplace.fetchGames();
    Marketplace.fetchList();
    Buying.fetchList();
    Buying.checkMatches();

    let searchTimeout;
    const handleFilterChange = () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            Marketplace.fetchList(DOM.searchInput.value, DOM.gameFilter.value);
        }, 500);
    };

    DOM.searchInput?.addEventListener('input', handleFilterChange);
    DOM.gameFilter?.addEventListener('change', handleFilterChange);
    DOM.formAddWant?.addEventListener("submit", Buying.submitForm);
});