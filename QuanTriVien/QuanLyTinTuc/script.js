const vaitro = localStorage.getItem('vaitro');
const maNguoiDung = localStorage.getItem('maNguoiDung');

if (Number(vaitro) !== 1 || !maNguoiDung) {
    alert("Bạn không có quyền truy cập trang này hoặc chưa đăng nhập.");
    window.location.href = "../../index.html";
}

const newsListDiv = document.getElementById("newsList");
const editModal = document.getElementById("editModal");
let currentEditId = null;

// Quill
const quillNew = new Quill('#quillNew', { theme: 'snow' });
const quillEdit = new Quill('#quillEdit', { theme: 'snow' });

function showToast(message, type = "success") {
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.innerText = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
}

function loadNews() {
    newsListDiv.innerHTML = "<div>Đang tải tin tức...</div>";

    fetch("http://localhost:3000/tintuc")
        .then(res => res.json())
        .then(data => {
            newsListDiv.innerHTML = "";
            if (!data || data.length === 0) {
                newsListDiv.innerHTML = "<div>Chưa có tin tức nào.</div>";
                return;
            }

            data.forEach(item => {
                const div = document.createElement("div");
                div.className = "news-item";

                const contentDiv = document.createElement("div");
                const titleEl = document.createElement("strong");
                titleEl.textContent = item.TieuDe;

                const dateEl = document.createElement("small");
                dateEl.textContent = new Date(item.NgayTao).toLocaleString();

                const bodyEl = document.createElement("div");
                bodyEl.innerHTML = DOMPurify.sanitize(item.NoiDung || "");

                contentDiv.appendChild(titleEl);
                contentDiv.appendChild(document.createElement("br"));
                contentDiv.appendChild(dateEl);
                contentDiv.appendChild(document.createElement("br"));
                contentDiv.appendChild(bodyEl);

                const actionDiv = document.createElement("div");
                const btnEdit = document.createElement("button");
                btnEdit.className = "btn btn-edit";
                btnEdit.textContent = "Sửa";
                btnEdit.addEventListener("click", () => editNews(item.MaTinTuc, item.TieuDe, item.NoiDung));

                const btnDelete = document.createElement("button");
                btnDelete.className = "btn btn-danger";
                btnDelete.textContent = "Xoá";
                btnDelete.addEventListener("click", () => deleteNews(item.MaTinTuc));

                actionDiv.appendChild(btnEdit);
                actionDiv.appendChild(btnDelete);

                div.appendChild(contentDiv);
                div.appendChild(actionDiv);

                newsListDiv.appendChild(div);
            });
        })
        .catch(err => {
            console.error(err);
            newsListDiv.innerHTML = "Không thể tải tin tức.";
        });
}
loadNews();

// Đăng tin mới
document.getElementById('btnDangTin').addEventListener('click', async () => {
    const btn = document.getElementById('btnDangTin');
    btn.disabled = true;

    const TieuDe = document.getElementById('txtTieuDe').value.trim();
    const NoiDung = quillNew.root.innerHTML.trim();

    if (!TieuDe || !NoiDung || NoiDung === "<p><br></p>") {
        showToast("Vui lòng nhập tiêu đề và nội dung.", "error");
        btn.disabled = false;
        return;
    }

    try {
        const res = await fetch("http://localhost:3000/tintuc", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ TieuDe, NoiDung, MaTacGia: maNguoiDung })
        });
        const data = await res.json();
        if (data.success) {
            showToast("Đăng tin thành công!");
            document.getElementById('txtTieuDe').value = "";
            quillNew.root.innerHTML = "";
            loadNews();
        } else {
            showToast(data.message || "Đăng tin thất bại", "error");
        }
    } catch (err) {
        console.error(err);
        showToast("Lỗi khi gửi tin tức.", "error");
    } finally {
        btn.disabled = false;
    }
});

//Xoá
async function deleteNews(maTin) {
    if (!confirm("Bạn có chắc muốn xoá tin này?")) return;

    try {
        const res = await fetch(`http://localhost:3000/tintuc/${maTin}`, {
            method: "DELETE",
            headers: { "x-vaitro": vaitro }
        });
        const data = await res.json();
        showToast(data.message || "Xoá thành công!");
        loadNews();
    } catch (err) {
        console.error(err);
        showToast("Lỗi xoá tin.", "error");
    }
}

//Sửa tin tức 
function editNews(maTin, tieuDe, noiDungHTML) {
    currentEditId = maTin;
    document.getElementById("editTieuDe").value = tieuDe;
    const safeHTML = DOMPurify.sanitize(noiDungHTML || "<p></p>");
    quillEdit.clipboard.dangerouslyPasteHTML(safeHTML);
    editModal.style.display = "flex";
}

function closeEditModal() {
    editModal.classList.add("fade-out");
    setTimeout(() => {
        editModal.style.display = "none";
        editModal.classList.remove("fade-out");
    }, 300);
}

// Cập nhật
document.getElementById("btnCapNhat").addEventListener("click", async () => {
    const btn = document.getElementById("btnCapNhat");
    btn.disabled = true;

    const newTitle = document.getElementById("editTieuDe").value.trim();
    const newContent = quillEdit.root.innerHTML.trim();

    if (!newTitle || !newContent || newContent === "<p><br></p>") {
        showToast("Vui lòng nhập đầy đủ tiêu đề và nội dung.", "error");
        btn.disabled = false;
        return;
    }

    if (!confirm("Bạn có chắc muốn cập nhật tin này?")) {
        btn.disabled = false;
        return;
    }

    try {
        const res = await fetch(`http://localhost:3000/tintuc/${currentEditId}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "x-vaitro": vaitro
            },
            body: JSON.stringify({ TieuDe: newTitle, NoiDung: newContent })
        });
        const data = await res.json();
        showToast(data.message || "Cập nhật thành công!");
        closeEditModal();
        loadNews();
    } catch (err) {
        console.error(err);
        showToast("Đã xảy ra lỗi khi cập nhật tin.", "error");
    } finally {
        btn.disabled = false;
    }
});

document.getElementById("btnHuy").addEventListener("click", closeEditModal);
const btnCloseModal = document.getElementById("btnCloseModal");
if (btnCloseModal) btnCloseModal.addEventListener("click", closeEditModal);
