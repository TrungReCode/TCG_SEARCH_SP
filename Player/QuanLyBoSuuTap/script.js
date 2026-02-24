const API = "http://localhost:3000";
let currentUser = localStorage.getItem("maNguoiDung");
let games = [];
let collections = [];
let currentCollectionId = null;
let currentCollection = null;

// DOM refs
const el = {
    userLabel: () => document.getElementById("userLabel"),
    collectionsList: () => document.getElementById("collectionsList"),
    gameSelect: () => document.getElementById("gameSelect"),
    gameFilterForCreate: () => document.getElementById("gameFilterForCreate"),
    collectionsTitle: () => document.getElementById("collectionTitle"),
    collectionMeta: () => document.getElementById("collectionMeta"),
    collectionCards: () => document.getElementById("collectionCards"),
    searchCardsInput: () => document.getElementById("searchCardsInput"),
    btnSearchCards: () => document.getElementById("btnSearchCards"),
    searchResults: () => document.getElementById("searchResults"),
    btnNewCollection: () => document.getElementById("btnNewCollection"),
    btnRename: () => document.getElementById("btnRename"),
    btnDelete: () => document.getElementById("btnDelete"),
    btnConvertToRaoBan: () => document.getElementById("btnConvertToRaoBan"),
    modal: () => document.getElementById("modal"),
    modalTitle: () => document.getElementById("modalTitle"),
    modalBody: () => document.getElementById("modalBody"),
    modalOk: () => document.getElementById("modalOk"),
    modalCancel: () => document.getElementById("modalCancel"),
    searchInCollection: () => document.getElementById("searchInCollection")
};

// ----------------- Init -----------------
document.addEventListener("DOMContentLoaded", init);
function init() {
    let userName = localStorage.getItem("username");
    el.userLabel().textContent = `Người chơi ${userName}`;
    document.getElementById("btnLogout").addEventListener("click", () => {
        localStorage.clear();
        window.location.href = "/index.html";
    });
    bindEvents();
    loadGames().then(() => loadCollections());
}

// ----------------- Events -----------------
function bindEvents() {
    el.btnSearchCards().addEventListener("click", onSearchCards);
    el.btnNewCollection().addEventListener("click", onCreateCollection);
    el.btnRename().addEventListener("click", onRenameCollection);
    el.btnDelete().addEventListener("click", onDeleteCollection);
    el.btnConvertToRaoBan().addEventListener("click", onConvertToRaoBan);
    el.modalCancel().addEventListener("click", hideModal);
    el.modalOk().addEventListener("click", onModalOk);
    el.searchInCollection().addEventListener("input", filterCollectionCards);
    el.searchCardsInput().addEventListener("keydown", (e) => { if (e.key === 'Enter') onSearchCards(); });
}

// ----------------- Helpers: modal -----------------
let modalResolve = null;
function showModal(title, contentHtml, okText = "Xác nhận") {
    el.modalTitle().textContent = title;
    el.modalBody().innerHTML = contentHtml;
    el.modalOk().textContent = okText;
    el.modal().classList.remove("hidden");
    return new Promise((resolve) => { modalResolve = resolve; });
}
function hideModal() {
    if (modalResolve) modalResolve(false);
    el.modal().classList.add("hidden");
    modalResolve = null;
}
async function onModalOk() {
    if (modalResolve) modalResolve(true);
    hideModal();
}

// ----------------- API: Games -----------------
async function loadGames() {
    try {
        const res = await fetch(`${API}/games`);
        games = await res.json();

        // populate selects
        const sel = el.gameSelect();
        const sel2 = el.gameFilterForCreate();
        sel.innerHTML = "";
        sel2.innerHTML = "";
        games.forEach(g => {
            const o = new Option(g.TenTroChoi, g.MaTroChoi);
            sel.appendChild(o);
            sel2.appendChild(o.cloneNode(true));
        });
    } catch (err) {
        console.error("Lỗi loadGames", err);
    }
}

// ----------------- API: Collections -----------------
async function loadCollections() {
    try {
        console.log("Loading collections for user:", currentUser)
        const res = await fetch(`${API}/collections/${currentUser}`)
        console.log("Response status:", res.status, "Content-Type:", res.headers.get("content-type"))
        const text = await res.text()
        console.log("Response body:", text.substring(0, 200))
        if (!res.ok) {
            alert(`Lỗi ${res.status}: ${text}`)
            return
        }
        const data = JSON.parse(text)
        collections = data || []
        renderCollectionList()
    } catch (err) {
        console.error("Lỗi loadCollections:", err)
        alert("Không tải được bộ sưu tập: " + err.message)
    }
}

function renderCollectionList() {
    const ul = el.collectionsList();
    ul.innerHTML = "";
    collections.forEach(c => {
        const li = document.createElement("li");
        li.textContent = c.TenBoSuuTap + " — " + (c.TenTroChoi || "");
        li.dataset.id = c.MaBoSuuTap;
        li.onclick = () => selectCollection(c.MaBoSuuTap);
        if (c.MaBoSuuTap === currentCollectionId) li.classList.add("active");
        ul.appendChild(li);
    });
}

// ----------------- Select / view collection -----------------
async function selectCollection(id) {
    currentCollectionId = Number(id);
    document.querySelectorAll("#collectionsList li").forEach(li => li.classList.toggle("active", Number(li.dataset.id) === currentCollectionId));
    await loadCollectionItems(currentCollectionId);
}

async function loadCollectionItems(maBoSuuTap) {
    try {
        const res = await fetch(`${API}/collections/${maBoSuuTap}/cards`);
        const items = await res.json();
        currentCollection = { MaBoSuuTap: maBoSuuTap, items };
        renderCollectionHeader();
        renderCollectionCards(items);
    } catch (err) {
        console.error("Lỗi loadCollectionItems", err);
    }
}

function renderCollectionHeader() {
    const col = collections.find(c => c.MaBoSuuTap === currentCollectionId);
    if (!col) {
        el.collectionsTitle().textContent = "Chọn bộ sưu tập";
        el.collectionMeta().textContent = "";
        return;
    }
    el.collectionsTitle().textContent = col.TenBoSuuTap;
    el.collectionMeta().textContent = `Trò chơi: ${col.TenTroChoi} • ID: ${col.MaBoSuuTap}`;
}

function renderCollectionCards(items) {
    const tbody = el.collectionCards();
    tbody.innerHTML = "";
    items.forEach(it => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${it.MaTheSuuTap}</td>
            <td><img class="thumb" src="${it.HinhAnh || ''}" /></td>
            <td>${it.TenThe || ''}</td>
            <td><input type="number" min="1" value="${it.SoLuongBanSao}" data-id="${it.MaTheSuuTap}" class="qty-input" /></td>
            <td>
                <div class="card-actions">
                    <button class="btn small" data-remove="${it.MaTheSuuTap}">Xóa</button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });

    tbody.querySelectorAll(".qty-input").forEach(inp => {
        inp.addEventListener("change", (e) => {
            const id = e.target.dataset.id;
            const val = Number(e.target.value) || 1;
            updateQuantity(id, val);
        });
    });
    tbody.querySelectorAll("[data-remove]").forEach(b => {
        b.addEventListener("click", async (e) => {
            const id = e.target.dataset.remove;
            const ok = await showModal("Xác nhận", `<p>Bạn muốn xóa thẻ khỏi bộ sưu tập?</p>`, "Xóa");
            if (!ok) return;
            await removeCardFromCollection(id);
        });
    });
}

// ----------------- Collection actions -----------------
async function onCreateCollection() {
    if (!currentUser) {
        alert("Bạn chưa đăng nhập")
        return
    }
    const name = prompt("Tên bộ sưu tập mới:")
    if (!name) return
    const maTroChoi = Number(el.gameFilterForCreate().value) || null
    if (!maTroChoi) {
        alert("Vui lòng chọn trò chơi cho bộ sưu tập")
        return
    }
    try {
        const res = await fetch(`${API}/collections`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ MaNguoiDung: currentUser, TenBoSuuTap: name, MaTroChoi: maTroChoi }),
        })
        const text = await res.text()
        if (!res.ok) {
            alert(`Lỗi ${res.status}: ${text}`)
            return
        }
        const created = JSON.parse(text)
        await loadCollections()
        if (created.MaBoSuuTap) selectCollection(created.MaBoSuuTap)
    } catch (err) {
        console.error("Error:", err)
        alert("Không tạo được bộ sưu tập: " + err.message)
    }
}

async function onRenameCollection() {
    if (!currentCollectionId) return alert("Chưa chọn bộ sưu tập");
    const newName = prompt("Tên mới:", el.collectionsTitle().textContent);
    if (!newName) return;
    try {
        await fetch(`${API}/collections/${currentCollectionId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ TenBoSuuTap: newName })
        });
        await loadCollections();
    } catch (err) { console.error(err); alert("Không đổi tên được"); }
}

async function onDeleteCollection() {
    if (!currentCollectionId) return alert("Chưa chọn bộ sưu tập");
    const ok = await showModal("Xác nhận xóa", `<p>Bạn chắc chắn muốn xóa bộ sưu tập này?</p>`, "Xóa");
    if (!ok) return;
    try {
        await fetch(`${API}/collections/${currentCollectionId}`, { method: "DELETE" });
        currentCollectionId = null;
        await loadCollections();
    } catch (err) { console.error(err); alert("Không xóa được"); }
}

// ================== CHUYỂN SAG RAO BÁN ==================
async function onConvertToRaoBan() {
    if (!currentCollectionId) return alert("Chưa chọn bộ sưu tập");
    if (!currentCollection || currentCollection.items.length === 0) {
        return alert("Bộ sưu tập không có thẻ nào");
    }

    // Modal để nhập giá bán
    const html = `
        <div style="display:flex; flex-direction:column; gap:12px;">
            <label>
                <strong>Giá bán (VNĐ):</strong>
                <input type="number" id="priceInput" placeholder="50000" value="50000" min="1000" style="width:100%; padding:8px; margin-top:4px; border-radius:6px; border:1px solid rgba(255,255,255,0.1); background:rgba(255,255,255,0.05); color:inherit;" />
            </label>
            <label>
                <strong>Tình trạng:</strong>
                <select id="conditionSelect" style="width:100%; padding:8px; margin-top:4px; border-radius:6px; border:1px solid rgba(255,255,255,0.1); background:rgba(255,255,255,0.05); color:inherit;">
                    <option value="Mới">Mới</option>
                    <option value="Như mới">Như mới</option>
                    <option value="Tốt">Tốt</option>
                    <option value="Bình thường">Bình thường</option>
                </select>
            </label>
            <label>
                <strong>Mô tả (tùy chọn):</strong>
                <textarea id="descInput" placeholder="Nhập mô tả thẻ..." style="width:100%; padding:8px; margin-top:4px; border-radius:6px; border:1px solid rgba(255,255,255,0.1); background:rgba(255,255,255,0.05); color:inherit; min-height:60px;"></textarea>
            </label>
            <div style="font-size:12px; color:rgba(255,255,255,0.6);">
                Sẽ chuyển <strong>${currentCollection.items.length}</strong> thẻ sang danh sách rao bán
            </div>
        </div>
    `;

    const result = await showModal("Chuyển sang rao bán", html, "Chuyển");
    if (!result) return;

    const giaBan = Number(document.getElementById("priceInput").value);
    const tinhTrang = document.getElementById("conditionSelect").value;
    const moTa = document.getElementById("descInput").value;

    if (!giaBan || giaBan < 1000) {
        return alert("Giá bán phải lớn hơn 1000 VNĐ");
    }

    try {
        const res = await fetch(`${API}/collections/${currentCollectionId}/convert-to-raoban`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                MaNguoiDung: currentUser,
                GiaBan: giaBan,
                TinhTrang: tinhTrang,
                MoTa: moTa
            })
        });

        const data = await res.json();
        if (!res.ok) {
            return alert("Lỗi: " + (data.error || "Không thể chuyển"));
        }

        alert(data.message || "Chuyển thành công!");
        await loadCollectionItems(currentCollectionId);
    } catch (err) {
        console.error("Lỗi chuyển sang rao bán:", err);
        alert("Lỗi: " + err.message);
    }
}

// ----------------- Search cards -----------------
async function onSearchCards() {
    const q = el.searchCardsInput().value.trim();
    if (!q) return;

    const col = collections.find(c => c.MaBoSuuTap === currentCollectionId);
    if (!col) return alert("Hãy chọn một bộ sưu tập trước.");
    const maTroChoi = col.MaTroChoi;

    try {
        const res = await fetch(`${API}/cards/search?q=${encodeURIComponent(q)}&MaTroChoi=${maTroChoi}&limit=30`);
        const list = await res.json();
        renderSearchResults(list);
    } catch (err) {
        console.error(err);
        alert("Lỗi tìm thẻ");
    }
}

function renderSearchResults(list) {
    const wrap = el.searchResults();
    wrap.innerHTML = "";
    if (!Array.isArray(list) || list.length === 0) {
        wrap.innerHTML = `<div class="small-muted">Không tìm thấy thẻ</div>`;
        return;
    }
    list.forEach(c => {
        const row = document.createElement("div");
        row.className = "card-row";
        row.innerHTML = `
            <img src="${c.HinhAnh || ''}" alt="" />
            <div class="card-info">
                <div><b>${escapeHtml(c.TenThe)}</b></div>
                <div class="small-muted">${(c.MoTa || '').slice(0, 80)}</div>
            </div>
            <div class="card-actions">
                <input type="number" class="add-qty" value="1" min="1" style="width:64px;padding:6px;border-radius:6px;background:transparent;border:1px solid rgba(255,255,255,0.04)" />
                <button class="btn" data-add="${c.MaThe}">Thêm</button>
            </div>
        `;
        wrap.appendChild(row);

        row.querySelector("[data-add]").addEventListener("click", async (e) => {
            if (!currentCollectionId) return alert("Chọn bộ sưu tập trước khi thêm thẻ");
            const qty = Number(row.querySelector(".add-qty").value) || 1;
            await addCardToCollection(currentCollectionId, c.MaThe, qty);
        });
    });
}

// ----------------- Add / remove / update quantity -----------------
async function addCardToCollection(maBoSuuTap, maThe, soLuong = 1) {
    try {
        const res = await fetch(`${API}/collections/${maBoSuuTap}/cards`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ MaThe: maThe, SoLuongBanSao: soLuong })
        });
        const data = await res.json();
        await loadCollectionItems(maBoSuuTap);
        alert(data.message || "Đã thêm thẻ");
    } catch (err) { console.error(err); alert("Không thêm được thẻ"); }
}

async function removeCardFromCollection(maTheSuuTap) {
    try {
        const res = await fetch(`${API}/collections/cards/${maTheSuuTap}`, { method: "DELETE" });
        const data = await res.json();
        await loadCollectionItems(currentCollectionId);
        alert(data.message || "Đã xóa");
    } catch (err) { console.error(err); alert("Không xóa được"); }
}

async function updateQuantity(maTheSuuTap, qty) {
    try {
        await fetch(`${API}/collections/items/${maTheSuuTap}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ SoLuongBanSao: qty })
        });
        await loadCollectionItems(currentCollectionId);
    } catch (err) { console.error(err); alert("Không cập nhật được"); }
}

// ----------------- Misc helpers -----------------
function clearCollectionView() {
    el.collectionsTitle().textContent = "Chưa có bộ sưu tập";
    el.collectionMeta().textContent = "";
    el.collectionCards().innerHTML = "";
}

function filterCollectionCards(e) {
    const q = e.target.value.trim().toLowerCase();
    const rows = Array.from(el.collectionCards().children);
    rows.forEach(r => {
        const txt = r.textContent.toLowerCase();
        r.style.display = txt.includes(q) ? "" : "none";
    });
}

function escapeHtml(s) {
    return (s || "").replace(/[&<>"']/g, c => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "\"": "&quot;",
        "'": "&#39;"
    }[c]));
}
