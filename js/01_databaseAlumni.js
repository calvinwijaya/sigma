var allData = [];
var filteredData = [];
var currentSort = null;

refreshData();

function refreshData() {
    const tbody = document.getElementById("tableBody");
    tbody.innerHTML = `<tr><td colspan="8" class="text-center py-5 text-muted"><div class="spinner-border spinner-border-sm me-2" role="status"></div>Memuat data dari database...</td></tr>`;

    fetch(`${DB_GAS_URL}?action=getData`)
        .then(res => res.json())
        .then(res => {
            if (res.status === "ok") {
                allData = res.data;
                populateFilters(); 
                applyFilters(); 
            } else {
                Swal.fire("Error", "Gagal memuat data", "error");
                tbody.innerHTML = `<tr><td colspan="8" class="text-center py-5 text-danger">Gagal memuat data.</td></tr>`;
            }
        })
        .catch(err => {
            console.error(err);
            tbody.innerHTML = `<tr><td colspan="8" class="text-center py-5 text-danger">Terjadi kesalahan koneksi.</td></tr>`;
        });
}

function renderTable(data) {
    const tbody = document.getElementById("tableBody");
    if (!tbody) return;
    tbody.innerHTML = "";

    if (data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4">Data tidak ditemukan.</td></tr>`;
        return;
    }

    data.forEach((row, index) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td class="text-center">${index + 1}</td>
            <td>${row.niu}</td>
            <td class="fw-semibold">${row.nama}</td>
            <td class="text-center">${row.angkatan}</td>
            <td class="text-center">${row.tahun_lulus}</td>
            <td>${row.email}</td>
            <td>${row.lokasi}</td>
            <td class="text-center">
                <button class="btn btn-sm btn-outline-warning py-0 px-2" onclick="editData('${row.niu}')"><i class="bi bi-pencil"></i></button>
                <button class="btn btn-sm btn-outline-danger py-0 px-2" onclick="deleteData('${row.niu}')"><i class="bi bi-trash"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// === FILTER & SORTING ===
function populateFilters() {
    const angkatanSet = new Set(), tahunSet = new Set(), lokasiSet = new Set();
    allData.forEach(item => {
        if(item.angkatan) angkatanSet.add(item.angkatan);
        if(item.tahun_lulus) tahunSet.add(item.tahun_lulus);
        if(item.lokasi) lokasiSet.add(item.lokasi);
    });

    fillSelect("filterAngkatan", Array.from(angkatanSet).sort(), "Angkatan");
    fillSelect("filterTahunLulus", Array.from(tahunSet).sort(), "Tahun Lulus");
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
    const fAngkatan = document.getElementById("filterAngkatan").value;
    const fTahun = document.getElementById("filterTahunLulus").value;
    const fLokasi = document.getElementById("filterLokasi").value;
    const fSearch = document.getElementById("searchNama").value.toLowerCase(); 

    filteredData = allData.filter(item => {
        const matchAngkatan = (fAngkatan === "ALL") || (String(item.angkatan) === String(fAngkatan));
        const matchTahun = (fTahun === "ALL") || (String(item.tahun_lulus) === String(fTahun));
        const matchLokasi = (fLokasi === "ALL") || (String(item.lokasi) === String(fLokasi));
        const matchSearch = (fSearch === "") || (String(item.nama).toLowerCase().includes(fSearch));
        
        return matchAngkatan && matchTahun && matchLokasi && matchSearch;
    });

    if (currentSort) {
        sortData(currentSort, true);
    } else {
        renderTable(filteredData);
    }
}

function sortData(field, skipUIRender = false) {
    currentSort = field;

    if (!skipUIRender) {
        document.querySelectorAll('.btn-sort').forEach(btn => {
            btn.classList.remove('btn-primary', 'text-white');
            btn.classList.add('btn-light', 'text-dark');
        });
        const activeBtn = document.getElementById(field === 'nama' ? 'btnSortNama' : 'btnSortNiu');
        if (activeBtn) {
            activeBtn.classList.remove('btn-light', 'text-dark');
            activeBtn.classList.add('btn-primary', 'text-white');
        }
    }

    filteredData.sort((a, b) => {
        if (field === 'niu') {
            return (parseInt(a.niu) || 0) - (parseInt(b.niu) || 0);
        } else {
            return String(a[field] || "").toLowerCase().localeCompare(String(b[field] || "").toLowerCase());
        }
    });

    renderTable(filteredData);
}

// === CRUD ACTIONS ===
function handleUploadCSV(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const text = e.target.result;
        // Simple CSV parser (asumsikan koma pemisah, tiap baris = 1 record)
        const lines = text.split('\n').filter(line => line.trim() !== '');
        
        let newRecords = [];
        // Mulai dari i=1 jika CSV punya header, mulai i=0 jika tidak.
        // Asumsi CSV Anda TANPA header atau kita skip baris pertama jika itu kata "NIU"
        let startIndex = lines[0].toUpperCase().includes("NIU") ? 1 : 0;

        for (let i = startIndex; i < lines.length; i++) {
            const cols = lines[i].split(',').map(c => c.trim());
            if(cols.length >= 6) {
                newRecords.push({
                    niu: cols[0], nama: cols[1], angkatan: cols[2],
                    tahun_lulus: cols[3], email: cols[4], lokasi: cols[5]
                });
            }
        }

        if(newRecords.length > 0) {
            sendPostRequest("addCSV", { records: newRecords });
        } else {
            Swal.fire("Info", "Format CSV tidak valid atau kosong", "info");
        }
    };
    reader.readAsText(file);
    event.target.value = ''; // reset input
}

async function editData(niu) {
    const row = allData.find(d => d.niu == niu);
    if (!row) return;

    const { value: formValues, isConfirmed } = await Swal.fire({
        title: '<h4 class="fw-bold text-primary mb-0"><i class="bi bi-pencil-square me-2"></i>Edit Data Alumni</h4>',
        html: `
            <div class="text-start mt-3">
                <div class="mb-3">
                    <label class="form-label fw-semibold small text-muted">NIU (Identifier Utama - Tidak dapat diubah)</label>
                    <input class="form-control bg-light" value="${row.niu}" readonly>
                </div>
                <div class="mb-3">
                    <label class="form-label fw-semibold small">Nama Lengkap</label>
                    <input id="swal-nama" type="text" class="form-control" value="${row.nama}">
                </div>
                <div class="row">
                    <div class="col-6 mb-3">
                        <label class="form-label fw-semibold small">Angkatan</label>
                        <input id="swal-angkatan" type="number" class="form-control" value="${row.angkatan}">
                    </div>
                    <div class="col-6 mb-3">
                        <label class="form-label fw-semibold small">Tahun Lulus</label>
                        <input id="swal-tahun" type="number" class="form-control" value="${row.tahun_lulus}">
                    </div>
                </div>
                <div class="mb-3">
                    <label class="form-label fw-semibold small">Email</label>
                    <input id="swal-email" type="email" class="form-control" value="${row.email}">
                </div>
                <div class="mb-2">
                    <label class="form-label fw-semibold small">Lokasi / Domisili</label>
                    <input id="swal-lokasi" type="text" class="form-control" value="${row.lokasi}">
                </div>
            </div>
        `,
        showCancelButton: true,
        confirmButtonText: 'Simpan Perubahan',
        cancelButtonText: 'Batal',
        customClass: {
            confirmButton: 'btn btn-primary px-4',
            cancelButton: 'btn btn-outline-secondary px-4 ms-2'
        },
        buttonsStyling: false,
        preConfirm: () => {
            return {
                niu: niu,
                nama: document.getElementById('swal-nama').value,
                angkatan: document.getElementById('swal-angkatan').value,
                tahun_lulus: document.getElementById('swal-tahun').value,
                email: document.getElementById('swal-email').value,
                lokasi: document.getElementById('swal-lokasi').value
            }
        }
    });

    if (isConfirmed && formValues) {
        Swal.fire({
            title: 'Yakin melakukan perubahan?',
            text: "Data sebelumnya pada sistem akan ditimpa dengan entri baru ini.",
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#0d6efd',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Ya, Proses Edit!',
            cancelButtonText: 'Cek Kembali'
        }).then((result) => {
            if (result.isConfirmed) {
                sendPostRequest("edit", formValues);
            }
        });
    }
}

function deleteData(niu) {
    Swal.fire({
        title: 'Hapus data ini?',
        text: `NIU: ${niu} akan dihapus permanen!`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        confirmButtonText: 'Ya, Hapus!'
    }).then((result) => {
        if (result.isConfirmed) {
            sendPostRequest("delete", { niu: niu });
        }
    });
}

function sendPostRequest(action, payload) {
    Loading.show();
    fetch(DB_GAS_URL, {
        method: "POST",
        body: JSON.stringify({ action: action, data: payload })
    })
    .then(res => res.json())
    .then(res => {
        if(res.status === "ok") {
            Swal.fire("Berhasil!", "Data telah diperbarui.", "success");
            refreshData(); // Reload table
        } else {
            Swal.fire("Gagal", res.message || "Terjadi kesalahan", "error");
        }
    })
    .catch(err => {
        console.error(err);
        Swal.fire("Error", "Gagal menghubungi server", "error");
    })
    .finally(() => Loading.hide());
}

function clearFilters() {
    document.getElementById("filterAngkatan").value = "ALL";
    document.getElementById("filterTahunLulus").value = "ALL";
    document.getElementById("filterLokasi").value = "ALL";
    document.getElementById("searchNama").value = "";

    currentSort = null;
    document.querySelectorAll('.btn-sort').forEach(btn => {
        btn.classList.remove('btn-primary', 'text-white');
        btn.classList.add('btn-light', 'text-dark');
    });

    applyFilters();
}

function downloadTemplateCSV() {
    const csvContent = "NIU,Nama,Angkatan,Tahun Lulus,Email,Lokasi\n111222,Fulan bin Fulan,2020,2024,fulan@mail.ugm.ac.id,Yogyakarta\n";
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "Template_Alumni_SIGMA.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}