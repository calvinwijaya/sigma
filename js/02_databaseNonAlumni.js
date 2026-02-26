var allData = [];
var filteredData = [];
var currentSort = null;

// Panggil pertama kali
refreshData();

function refreshData() {
    const tbody = document.getElementById("tableBody");
    tbody.innerHTML = `<tr><td colspan="7" class="text-center py-5 text-muted"><div class="spinner-border spinner-border-sm me-2"></div>Memuat data dari database...</td></tr>`;

    fetch(`${DB_NonAlumniGAS_URL}?action=getData`)
        .then(res => res.json())
        .then(res => {
            if (res.status === "ok") {
                allData = res.data;
                populateFilters(); 
                applyFilters(); 
            } else {
                Swal.fire("Error", "Gagal memuat data", "error");
                tbody.innerHTML = `<tr><td colspan="7" class="text-center py-5 text-danger">Gagal memuat data.</td></tr>`;
            }
        })
        .catch(err => {
            console.error(err);
            tbody.innerHTML = `<tr><td colspan="7" class="text-center py-5 text-danger">Terjadi kesalahan koneksi.</td></tr>`;
        });
}

function renderTable(data) {
    const tbody = document.getElementById("tableBody");
    if (!tbody) return;
    tbody.innerHTML = "";

    if (data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4">Data tidak ditemukan.</td></tr>`;
        return;
    }

    data.forEach((row) => {
        // Tampilkan badge status unsubscribe jika ada (opsional sebagai info)
        let emailDisplay = row.email;
        if(row.status === "Unsubscribed") {
            emailDisplay += `<br><span class="badge bg-danger" style="font-size:0.6rem;">Unsubscribed</span>`;
        }

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td class="text-center">${row.no}</td>
            <td><span class="badge bg-secondary">${row.kategori}</span></td>
            <td class="fw-semibold">${row.nama}</td>
            <td>${emailDisplay}</td>
            <td>${row.lingkup}</td>
            <td>${row.lokasi}</td>
            <td class="text-center">
                <button class="btn btn-sm btn-outline-warning py-0 px-2" onclick="editData('${row.no}')" title="Edit Data"><i class="bi bi-pencil"></i></button>
                <button class="btn btn-sm btn-outline-danger py-0 px-2" onclick="deleteData('${row.no}')" title="Hapus Data"><i class="bi bi-trash"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// === FILTER & SORTING ===
function populateFilters() {
    const kategoriSet = new Set(), lingkupSet = new Set(), lokasiSet = new Set();
    allData.forEach(item => {
        if(item.kategori) kategoriSet.add(item.kategori);
        if(item.lingkup) lingkupSet.add(item.lingkup);
        if(item.lokasi) lokasiSet.add(item.lokasi);
    });

    fillSelect("filterKategori", Array.from(kategoriSet).sort(), "Kategori");
    fillSelect("filterLingkup", Array.from(lingkupSet).sort(), "Lingkup");
    fillSelect("filterLokasi", Array.from(lokasiSet).sort(), "Lokasi");
}

function fillSelect(id, optionsArr, label) {
    const sel = document.getElementById(id);
    if (!sel) return;
    sel.innerHTML = `<option value="ALL">Semua ${label}</option>`;
    optionsArr.forEach(opt => {
        sel.innerHTML += `<option value="${opt}">${opt}</option>`;
    });
}

function applyFilters() {
    const filterKategoriEl = document.getElementById("filterKategori");
    if (!filterKategoriEl) return;

    const fKategori = filterKategoriEl.value;
    const fLingkup = document.getElementById("filterLingkup").value;
    const fLokasi = document.getElementById("filterLokasi").value;
    const fSearch = document.getElementById("searchNama").value.toLowerCase(); 

    filteredData = allData.filter(item => {
        const matchKategori = (fKategori === "ALL") || (String(item.kategori) === String(fKategori));
        const matchLingkup = (fLingkup === "ALL") || (String(item.lingkup) === String(fLingkup));
        const matchLokasi = (fLokasi === "ALL") || (String(item.lokasi) === String(fLokasi));
        const matchSearch = (fSearch === "") || (String(item.nama).toLowerCase().includes(fSearch));
        return matchKategori && matchLingkup && matchLokasi && matchSearch;
    });

    if (currentSort) sortData(currentSort, true);
    else renderTable(filteredData);
}

function sortData(field, skipUIRender = false) {
    currentSort = field;
    if (!skipUIRender) {
        document.querySelectorAll('.btn-sort').forEach(btn => {
            btn.classList.remove('btn-success', 'text-white');
            btn.classList.add('btn-light', 'text-dark');
        });
        const activeBtn = document.getElementById('btnSortNama');
        if (activeBtn) {
            activeBtn.classList.remove('btn-light', 'text-dark');
            activeBtn.classList.add('btn-success', 'text-white');
        }
    }
    filteredData.sort((a, b) => String(a[field] || "").toLowerCase().localeCompare(String(b[field] || "").toLowerCase()));
    renderTable(filteredData);
}

function clearFilters() {
    document.getElementById("filterKategori").value = "ALL";
    document.getElementById("filterLingkup").value = "ALL";
    document.getElementById("filterLokasi").value = "ALL";
    document.getElementById("searchNama").value = "";
    currentSort = null;
    document.querySelectorAll('.btn-sort').forEach(btn => {
        btn.classList.remove('btn-success', 'text-white');
        btn.classList.add('btn-light', 'text-dark');
    });
    applyFilters();
}

// === CRUD ACTIONS ===

// Reusable Form HTML untuk Add dan Edit
function formHtmlTemplate(data = {}) {
    return `
        <div class="text-start mt-3">
            <div class="mb-3">
                <label class="form-label fw-semibold small">Kategori Instansi</label>
                <select id="swal-kategori" class="form-select">
                    ${['Sekolah', 'PTN/PTS', 'Instansi Riset', 'Swasta', 'Pemerintah/K/L', 'Agensi/Bimbel', 'Lembaga Beasiswa'].map(opt => `<option value="${opt}" ${data.kategori === opt ? 'selected' : ''}>${opt}</option>`).join('')}
                </select>
            </div>
            <div class="mb-3">
                <label class="form-label fw-semibold small">Nama Instansi</label>
                <input id="swal-nama" type="text" class="form-control" value="${data.nama || ''}" placeholder="Misal: SMA N 3 Yogyakarta">
            </div>
            <div class="mb-3">
                <label class="form-label fw-semibold small">Email Instansi / PIC</label>
                <input id="swal-email" type="email" class="form-control" value="${data.email || ''}" placeholder="email@instansi.com">
            </div>
            <div class="row">
                <div class="col-6 mb-3">
                    <label class="form-label fw-semibold small">Lingkup</label>
                    <select id="swal-lingkup" class="form-select">
                        ${['Dalam Negeri', 'Luar Negeri'].map(opt => `<option value="${opt}" ${data.lingkup === opt ? 'selected' : ''}>${opt}</option>`).join('')}
                    </select>
                </div>
                <div class="col-6 mb-3">
                    <label class="form-label fw-semibold small">Rekomendasi Program</label>
                    <select id="swal-rekomendasi" class="form-select">
                        ${['S1', 'S2/S3', 'Umum'].map(opt => `<option value="${opt}" ${data.rekomendasi === opt ? 'selected' : ''}>${opt}</option>`).join('')}
                    </select>
                </div>
            </div>
            <div class="mb-2">
                <label class="form-label fw-semibold small">Lokasi Spesifik (Provinsi/Negara)</label>
                <input id="swal-lokasi" type="text" class="form-control" value="${data.lokasi || ''}" placeholder="Misal: DI Yogyakarta">
            </div>
        </div>
    `;
}

async function addData() {
    const { value: formValues, isConfirmed } = await Swal.fire({
        title: '<h4 class="fw-bold text-success mb-0"><i class="bi bi-plus-circle me-2"></i>Tambah Non-Alumni</h4>',
        html: formHtmlTemplate(),
        showCancelButton: true,
        confirmButtonText: 'Simpan Data',
        cancelButtonText: 'Batal',
        customClass: { confirmButton: 'btn btn-success px-4', cancelButton: 'btn btn-outline-secondary px-4 ms-2' },
        buttonsStyling: false,
        preConfirm: () => {
            const nama = document.getElementById('swal-nama').value;
            const email = document.getElementById('swal-email').value;
            if (!nama || !email) { Swal.showValidationMessage('Nama Instansi dan Email wajib diisi!'); return false; }
            return {
                kategori: document.getElementById('swal-kategori').value,
                nama: nama, email: email,
                lingkup: document.getElementById('swal-lingkup').value,
                lokasi: document.getElementById('swal-lokasi').value,
                rekomendasi: document.getElementById('swal-rekomendasi').value
            }
        }
    });

    if (isConfirmed && formValues) {
        sendPostRequest("add", formValues, "Data berhasil ditambahkan!");
    }
}

async function editData(no) {
    const row = allData.find(d => String(d.no) === String(no));
    if (!row) return;

    const { value: formValues, isConfirmed } = await Swal.fire({
        title: '<h4 class="fw-bold text-warning mb-0"><i class="bi bi-pencil-square me-2"></i>Edit Data</h4>',
        html: formHtmlTemplate(row),
        showCancelButton: true,
        confirmButtonText: 'Simpan Perubahan',
        cancelButtonText: 'Batal',
        customClass: { confirmButton: 'btn btn-warning px-4', cancelButton: 'btn btn-outline-secondary px-4 ms-2' },
        buttonsStyling: false,
        preConfirm: () => {
            return {
                no: no,
                kategori: document.getElementById('swal-kategori').value,
                nama: document.getElementById('swal-nama').value,
                email: document.getElementById('swal-email').value,
                lingkup: document.getElementById('swal-lingkup').value,
                lokasi: document.getElementById('swal-lokasi').value,
                rekomendasi: document.getElementById('swal-rekomendasi').value
            }
        }
    });

    if (isConfirmed && formValues) {
        sendPostRequest("edit", formValues, "Perubahan berhasil disimpan.");
    }
}

function deleteData(no) {
    Swal.fire({
        title: 'Hapus data ini?',
        text: `Data dengan ID/No: ${no} akan dihapus permanen!`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        confirmButtonText: 'Ya, Hapus!'
    }).then((result) => {
        if (result.isConfirmed) {
            sendPostRequest("delete", { no: no }, "Data berhasil dihapus.");
        }
    });
}

function sendPostRequest(action, payload, successMsg) {
    Loading.show();
    // Gunakan text/plain untuk mengelabui CORS seperti di Broadcast sebelumnya
    fetch(DB_NonAlumniGAS_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        redirect: "follow",
        body: JSON.stringify({ action: action, data: payload })
    })
    .then(res => res.json())
    .then(res => {
        if(res.status === "ok") {
            Swal.fire("Berhasil!", successMsg, "success");
            refreshData(); 
        } else {
            Swal.fire("Gagal", res.message || "Terjadi kesalahan", "error");
        }
    })
    .catch(err => {
        console.error(err);
        Swal.fire("Error", "Gagal menghubungi server Google", "error");
    })
    .finally(() => Loading.hide());
}