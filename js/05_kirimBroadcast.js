// Menyimpan state draft yang sedang dibuka
var currentDraftId = null;
var currentDraftName = null;
var isEditMode = false;
var fileIdToSend = null;
var finalTargetEmails = [];

// Variabel Alumni
var alumniData = [];
var uniqueAngkatan = [];
var uniqueLokasi = [];

// Variabel Non-Alumni
var nonAlumniData = [];
var uniqueNaKategori = [];
var uniqueNaLingkup = [];
var uniqueNaLokasi = [];

// FITUR BARU: Variabel Penyimpan Data Master untuk Filter
var allDrafts = [];
var allLogs = [];

// Jalankan fungsi saat halaman dimuat
loadDrafts();
loadAllDataForFilter();
loadLogAktivitas();

// ==========================================
// FUNGSI FILTER WAKTU (BULAN & TAHUN)
// ==========================================
function filterTablesByMonth() {
    const filterVal = document.getElementById("monthFilter").value; // Format: "YYYY-MM"
    
    let filteredDrafts = allDrafts;
    let filteredLogs = allLogs;

    if (filterVal) {
        const [fYear, fMonth] = filterVal.split("-");

        // Filter Draft
        filteredDrafts = allDrafts.filter(d => {
            const date = parseSistemDate(d.lastUpdated);
            return date && date.getFullYear() == fYear && (date.getMonth() + 1) == fMonth;
        });

        // Filter Log Aktivitas
        filteredLogs = allLogs.filter(l => {
            const date = parseSistemDate(l.tanggal);
            return date && date.getFullYear() == fYear && (date.getMonth() + 1) == fMonth;
        });
    }

    // Render ulang tabel dengan data yang sudah difilter
    renderDraftTable(filteredDrafts);
    renderLogTable(filteredLogs);
}

// Helper: Parser Tanggal Kebal Banting (Bisa baca format Indonesia seperti 'Ags', 'Mei')
function parseSistemDate(dateStr) {
    if (!dateStr) return null;
    let d = new Date(dateStr);
    if (!isNaN(d.getTime())) return d; // Jika standar format JS, langsung kembalikan
    
    // Fallback jika format "18 Mar 2026" atau "12 Ags 2026"
    const str = String(dateStr).toLowerCase();
    const months = {
        'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'mei': 4, 'may': 4, 'jun': 5, 
        'jul': 6, 'ags': 7, 'aug': 7, 'sep': 8, 'okt': 9, 'oct': 9, 'nov': 10, 'des': 11, 'dec': 11
    };
    
    for (let m in months) {
        if (str.includes(m)) {
            const yearMatch = str.match(/\d{4}/);
            if (yearMatch) {
                let tempDate = new Date();
                tempDate.setFullYear(parseInt(yearMatch[0]), months[m], 1);
                return tempDate;
            }
        }
    }
    return new Date(); // Return current date jika gagal sama sekali
}

// ==========================================
// FUNGSI LOAD & RENDER DRAFT
// ==========================================
function loadDrafts() {
    const tbody = document.getElementById("draftTableBody");
    if (!tbody) return; 
    
    tbody.innerHTML = `<tr><td colspan="3" class="text-center py-4 text-muted"><div class="spinner-border spinner-border-sm me-2"></div>Memuat draf...</td></tr>`;

    fetch(`${API_NEWSLETTER_URL}?action=getDrafts`)
        .then(res => res.json())
        .then(res => {
            if (res.status === "ok") {
                allDrafts = res.data; // Simpan ke Master Data
                filterTablesByMonth(); // Panggil fungsi filter (Otomatis merender)
            } else {
                tbody.innerHTML = `<tr><td colspan="3" class="text-center py-4 text-danger">Gagal memuat: ${res.message}</td></tr>`;
            }
        })
        .catch(err => {
            console.error(err);
            tbody.innerHTML = `<tr><td colspan="3" class="text-center py-4 text-danger">Error koneksi ke server.</td></tr>`;
        });
}

function renderDraftTable(data) {
    const tbody = document.getElementById("draftTableBody");
    if (!tbody) return;
    tbody.innerHTML = "";

    if (data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" class="text-center py-4 text-muted">Belum ada draft tersimpan di bulan ini.</td></tr>`;
        return;
    }

    data.forEach(item => {
        let displayName = item.name.replace('.html', '').replace(/_/g, ' ');
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td class="px-4 fw-semibold text-primary">${displayName}</td>
            <td class="text-muted small">${item.lastUpdated}</td>
            <td class="text-center">
                <button class="btn btn-sm btn-light border shadow-sm me-1" onclick="openPreview('${item.id}', '${item.name}')" title="Lihat Draft">
                    <i class="bi bi-eye-fill text-info"></i>
                </button>
                <button class="btn btn-sm btn-success shadow-sm" onclick="openSendModal('${item.id}', '${item.name}')" title="Kirim Broadcast">
                    <i class="bi bi-send-fill"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// ==========================================
// FUNGSI LOAD & RENDER LOG AKTIVITAS
// ==========================================
function loadLogAktivitas() {
    const tbody = document.getElementById("logTableBody");
    if(!tbody) return; 
    
    tbody.innerHTML = `<tr><td colspan="3" class="text-center py-4 text-muted"><div class="spinner-border spinner-border-sm me-2"></div>Memuat Log Aktivitas...</td></tr>`;

    fetch(`${API_SENDER_URL}?action=getLogs`)
        .then(res => res.json())
        .then(res => {
            if (res.status === "ok") {
                allLogs = res.data; // Simpan ke Master Data
                filterTablesByMonth(); // Panggil fungsi filter (Otomatis merender)
            } else {
                tbody.innerHTML = `<tr><td colspan="3" class="text-center py-3 text-danger small">Gagal memuat log: ${res.message}</td></tr>`;
            }
        })
        .catch(err => {
            console.error("Error Fetch Log:", err);
            tbody.innerHTML = `<tr><td colspan="3" class="text-center py-3 text-danger small">Gagal terhubung ke server untuk memuat log.</td></tr>`;
        });
}

function renderLogTable(data) {
    const tbody = document.getElementById("logTableBody");
    if(!tbody) return;
    tbody.innerHTML = "";

    if (data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" class="text-center py-3 text-muted small">Belum ada riwayat pengiriman di bulan ini.</td></tr>`;
        return;
    }

    data.forEach(log => {
        tbody.innerHTML += `
            <tr>
                <td class="px-3 text-muted small">${log.tanggal}</td>
                <td class="px-3 fw-semibold">${log.aktivitas}</td>
                <td class="text-center"><span class="badge bg-success">${log.status}</span></td>
            </tr>
        `;
    });
}

// ==========================================
// FUNGSI PREVIEW MODAL
// ==========================================
function openPreview(fileId, fileName) {
    currentDraftId = fileId;
    currentDraftName = fileName;
    
    // Hanya ubah judul modal, karena elemen edit manual sudah kita hapus dari HTML
    document.getElementById("modalDraftTitle").innerHTML = `<i class="bi bi-file-earmark-text me-2"></i> Preview: ${fileName.replace('.html', '')}`;

    Loading.show();
    
    fetch(`${API_NEWSLETTER_URL}?action=getDraftContent&fileId=${fileId}`)
        .then(res => res.json())
        .then(res => {
            if (res.status === "ok") {
                const htmlContent = res.data.html_content;
                
                // Masukkan langsung ke Iframe
                const iframe = document.getElementById("previewFrame");
                const doc = iframe.contentWindow.document;
                doc.open();
                doc.write(htmlContent);
                doc.close();

                // Tampilkan Modal
                const previewModal = new bootstrap.Modal(document.getElementById('previewModal'));
                previewModal.show();
            } else {
                Swal.fire("Gagal", "Tidak dapat membaca file: " + res.message, "error");
            }
        })
        .catch(err => Swal.fire("Error", "Gagal menghubungi server.", "error"))
        .finally(() => Loading.hide());
}

// ==========================================
// FUNGSI EDIT VIA BUILDER (CMS MODE)
// ==========================================
function editDraftInBuilder() {
    // 1. Ambil HTML yang sedang di-preview di dalam Iframe
    const iframe = document.getElementById("previewFrame");
    const htmlContent = iframe.contentWindow.document.documentElement.innerHTML;

    // 2. Cari data JSON tersembunyi menggunakan Regex
    const match = htmlContent.match(/data-json="([^"]+)"/);
    
    if (match && match[1]) {
        try {
            // 3. Decode Base64 kembali ke format JSON
            const base64Data = match[1];
            const jsonString = decodeURIComponent(escape(atob(base64Data)));
            const formData = JSON.parse(jsonString);

            // 4. Simpan ke Session Storage untuk dibaca halaman 04
            sessionStorage.setItem("editDraftData", JSON.stringify({
                fileId: currentDraftId,
                formData: formData
            }));

            // 5. Tutup Modal secara manual & bersihkan backdrop (Penting untuk SPA)
            const modalEl = document.getElementById('previewModal');
            const modalInstance = bootstrap.Modal.getInstance(modalEl);
            if (modalInstance) {
                modalInstance.hide();
            }
            // Hapus paksa sisa layar abu-abu jika masih ada
            document.body.classList.remove('modal-open');
            document.body.style.paddingRight = '';
            const backdrop = document.querySelector('.modal-backdrop');
            if (backdrop) backdrop.remove();

            // 6. PERBAIKAN: Redirect ke halaman Buat Newsletter
            loadPage('04_buatNewsletter.html', 'buatNewsletter');

        } catch(e) {
            console.error(e);
            Swal.fire("Error", "Gagal membaca data form. Mungkin draft ini dibuat sebelum fitur Edit aktif.", "error");
        }
    } else {
        Swal.fire("Peringatan", "Draft ini adalah versi lama. Data form tidak ditemukan untuk diedit via form.", "warning");
    }
}

// ==========================================
// FUNGSI AKSI POST (Simpan Edit & Hapus)
// ==========================================
function deleteCurrentDraft() {
    Swal.fire({
        title: 'Hapus Draft Ini?',
        text: "Draft akan dipindahkan ke folder Sampah.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Ya, Hapus!'
    }).then((result) => {
        if (result.isConfirmed) {
            Loading.show();
            fetch(API_NEWSLETTER_URL, {
                method: "POST",
                headers: { "Content-Type": "text/plain;charset=utf-8" },
                redirect: "follow",
                body: JSON.stringify({
                    action: "deleteDraft",
                    data: { fileId: currentDraftId }
                })
            })
            .then(res => res.json())
            .then(res => {
                if (res.status === "ok") {
                    // Tutup modal
                    const modalEl = document.getElementById('previewModal');
                    bootstrap.Modal.getInstance(modalEl).hide();
                    
                    Swal.fire("Dihapus!", "Draft berhasil dihapus.", "success");
                    loadDrafts(); // Refresh list
                } else {
                    Swal.fire("Gagal", res.message, "error");
                }
            })
            .catch(err => Swal.fire("Error", "Gagal menghubungi server.", "error"))
            .finally(() => Loading.hide());
        }
    });
}

// ==========================================
// MENGAMBIL DATA ALUMNI & NON-ALUMNI
// ==========================================
function loadAllDataForFilter() {
    // 1. Fetch Data Alumni
    fetch(`${API_SENDER_URL}?action=getData`)
        .then(res => res.json())
        .then(res => {
            if (res.status === "ok") {
                alumniData = res.data;
                uniqueAngkatan = [...new Set(alumniData.map(item => item.angkatan).filter(a => a > 0))].sort((a,b) => a-b);
                uniqueLokasi = [...new Set(alumniData.map(item => item.lokasi).filter(l => l !== ""))].sort();
            }
        });

    // 2. Fetch Data Non-Alumni
    fetch(`${API_SENDER_URL}?action=getNonAlumniData`)
        .then(res => res.json())
        .then(res => {
            if (res.status === "ok") {
                nonAlumniData = res.data;
                uniqueNaKategori = [...new Set(nonAlumniData.map(d => d.kategori).filter(x => x))].sort();
                uniqueNaLingkup = [...new Set(nonAlumniData.map(d => d.lingkup).filter(x => x))].sort();
                uniqueNaLokasi = [...new Set(nonAlumniData.map(d => d.lokasi).filter(x => x))].sort();
            }
        });
}

function loadLogAktivitas() {
    const tbody = document.getElementById("logTableBody");
    if(!tbody) return; // Mencegah error jika user pindah halaman sebelum beres loading
    
    // Pastikan spinner muncul saat fungsi dipanggil (berguna saat user klik "Refresh Data")
    tbody.innerHTML = `<tr><td colspan="3" class="text-center py-4 text-muted"><div class="spinner-border spinner-border-sm me-2"></div>Memuat Log Aktivitas...</td></tr>`;

    fetch(`${API_SENDER_URL}?action=getLogs`)
        .then(res => res.json())
        .then(res => {
            tbody.innerHTML = ""; // Bersihkan spinner
            
            if (res.status === "ok") {
                if(res.data.length === 0) {
                    tbody.innerHTML = `<tr><td colspan="3" class="text-center py-3 text-muted small">Belum ada riwayat pengiriman broadcast.</td></tr>`;
                    return;
                }

                // Render data dari Spreadsheet
                res.data.forEach(log => {
                    tbody.innerHTML += `
                        <tr>
                            <td class="px-3 text-muted small">${log.tanggal}</td>
                            <td class="px-3 fw-semibold">${log.aktivitas}</td>
                            <td class="text-center"><span class="badge bg-success">${log.status}</span></td>
                        </tr>
                    `;
                });
            } else {
                tbody.innerHTML = `<tr><td colspan="3" class="text-center py-3 text-danger small">Gagal memuat log: ${res.message}</td></tr>`;
            }
        })
        .catch(err => {
            console.error("Error Fetch Log:", err);
            tbody.innerHTML = `<tr><td colspan="3" class="text-center py-3 text-danger small">Gagal terhubung ke server untuk memuat log.</td></tr>`;
        });
}

// ==========================================
// LOGIKA MODAL PENGIRIMAN & FILTERING
// ==========================================
function openSendModal(fileId, fileName) {
    fileIdToSend = fileId;
    document.getElementById("sendDraftNameDisplay").innerText = "Draft: " + fileName.replace('.html', '').replace(/_/g, ' ');
    
    // Reset Form ke Mode Default (Alumni)
    document.getElementById("filterLayer1").value = "alumni";
    toggleFilterView(); // Trigger perubahan tampilan
    
    const sendModal = new bootstrap.Modal(document.getElementById('sendModal'));
    sendModal.show();
}

// Fungsi Switch Antarmuka Alumni vs Non-Alumni
function toggleFilterView() {
    const layer1 = document.getElementById("filterLayer1").value;
    
    if (layer1 === "alumni") {
        document.getElementById("alumniFiltersContainer").style.display = "block";
        document.getElementById("nonAlumniFiltersContainer").style.display = "none";
        document.getElementById("filterLayer2").value = "all";
        updateLayer3();
    } else {
        document.getElementById("alumniFiltersContainer").style.display = "none";
        document.getElementById("nonAlumniFiltersContainer").style.display = "block";
        
        // Populate Dropdown Non-Alumni
        fillNaSelect("naFilterKategori", uniqueNaKategori, "Kategori");
        fillNaSelect("naFilterLingkup", uniqueNaLingkup, "Lingkup");
        fillNaSelect("naFilterLokasi", uniqueNaLokasi, "Lokasi");
        
        calculateRecipients();
    }
}

function fillNaSelect(id, optionsArr, label) {
    const sel = document.getElementById(id);
    if (!sel) return;
    sel.innerHTML = `<option value="ALL">Semua ${label}</option>`;
    optionsArr.forEach(opt => {
        sel.innerHTML += `<option value="${opt}">${opt}</option>`;
    });
}

function updateLayer3() {
    const layer2 = document.getElementById("filterLayer2").value;
    const container3 = document.getElementById("layer3Container");
    const select3 = document.getElementById("filterLayer3");
    
    select3.innerHTML = "";

    if (layer2 === "all") {
        container3.style.display = "none";
    } else {
        container3.style.display = "block";
        if (layer2 === "angkatan") {
            select3.innerHTML = `<option value="ALL">Pilih Semua Angkatan</option>`;
            uniqueAngkatan.forEach(angk => select3.innerHTML += `<option value="${angk}">Angkatan ${angk}</option>`);
        } else if (layer2 === "kategori") {
            select3.innerHTML = `
                <option value="ALL">Pilih Semua Kategori</option>
                <option value="senior">Alumni Senior (< 1990)</option>
                <option value="produktif">Alumni Produktif (1990 - 2010)</option>
                <option value="muda">Alumni Muda (> 2010)</option>
            `;
        } else if (layer2 === "lokasi") {
            select3.innerHTML = `<option value="ALL">Pilih Semua Lokasi</option>`;
            uniqueLokasi.forEach(lok => select3.innerHTML += `<option value="${lok}">${lok}</option>`);
        }
    }
    calculateRecipients();
}

function calculateRecipients() {
    const layer1 = document.getElementById("filterLayer1").value;
    let filtered = [];

    if (layer1 === "alumni") {
        const layer2 = document.getElementById("filterLayer2").value;
        const layer3 = document.getElementById("filterLayer3") ? document.getElementById("filterLayer3").value : "ALL";
        
        if (layer2 === "all" || layer3 === "ALL") {
            filtered = alumniData;
        } else if (layer2 === "angkatan") {
            filtered = alumniData.filter(d => String(d.angkatan) === String(layer3));
        } else if (layer2 === "kategori") {
            filtered = alumniData.filter(d => {
                if (layer3 === "senior") return d.angkatan < 1990;
                if (layer3 === "produktif") return d.angkatan >= 1990 && d.angkatan <= 2010;
                if (layer3 === "muda") return d.angkatan > 2010;
                return true;
            });
        } else if (layer2 === "lokasi") {
            filtered = alumniData.filter(d => d.lokasi === layer3);
        }
    } 
    else if (layer1 === "non_alumni") {
        // FILTER KOMBINASI NON-ALUMNI (Logika AND)
        const fKat = document.getElementById("naFilterKategori").value;
        const fLing = document.getElementById("naFilterLingkup").value;
        const fLok = document.getElementById("naFilterLokasi").value;

        filtered = nonAlumniData.filter(d => {
            const matchKat = (fKat === "ALL") || (String(d.kategori) === String(fKat));
            const matchLing = (fLing === "ALL") || (String(d.lingkup) === String(fLing));
            const matchLok = (fLok === "ALL") || (String(d.lokasi) === String(fLok));
            return matchKat && matchLing && matchLok; // Ketiganya harus terpenuhi
        });
    }

    // Ekstrak array email saja yang valid
    finalTargetEmails = filtered
        .filter(d => d.email && String(d.email).includes("@")) // Pastikan email valid
        .map(d => ({ 
            email: String(d.email).trim(), 
            nama: d.nama || "Bapak/Ibu" // Fallback jika kolom nama kosong
        }));
    
    document.getElementById("recipientCount").innerText = finalTargetEmails.length;
    document.getElementById("btnExecuteSend").disabled = finalTargetEmails.length === 0;
}

// ==========================================
// EKSEKUSI PENGIRIMAN
// ==========================================
function confirmSendBroadcast() {
    // Ambil data user yang sedang login dari session
    const userData = JSON.parse(sessionStorage.getItem("user") || "{}");
    const senderName = userData.nama || "Admin Geodesi";
    const senderEmail = userData.email || "Sistem";

    Swal.fire({
        title: 'Konfirmasi Pengiriman',
        html: `Anda akan mengirimkan broadcast ini kepada <strong>${finalTargetEmails.length} Email</strong>.<br><br>`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#198754',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Ya, Kirim Sekarang!',
        cancelButtonText: 'Batal'
    }).then((result) => {
        if (result.isConfirmed) {
            executeSending(senderName);
        }
    });
}

function executeSending(senderName) {
    // Tutup modal agar user tidak ngeklik dua kali
    const modalEl = document.getElementById('sendModal');
    bootstrap.Modal.getInstance(modalEl).hide();
    
    Loading.show();

    fetch(API_SENDER_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        redirect: "follow",
        body: JSON.stringify({
            action: "sendBroadcast",
            data: {
                fileId: fileIdToSend,
                draftName: document.getElementById("sendDraftNameDisplay").innerText,
                targetEmails: finalTargetEmails,
                senderName: senderName
            }
        })
    })
    .then(res => res.json())
    .then(res => {
        if (res.status === "ok") {
            Swal.fire("Berhasil Terkirim!", res.message, "success");
            loadLogAktivitas(); // Refresh tabel log di halaman
        } else {
            Swal.fire("Gagal", res.message, "error");
        }
    })
    .catch(err => {
        console.error(err);
        Swal.fire("Error", "Gagal menghubungi server pengirim.", "error");
    })
    .finally(() => Loading.hide());
}