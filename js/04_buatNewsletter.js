var quillEditor;
var rawTemplate1 = "";
var rawTemplate2 = "";
var editDraftId = null;

// Fungsi inisialisasi utama (Dipanggil otomatis saat script di-load)
async function initNewsletterPage() {
    try {
        // 1. Ambil template mentah dan simpan di memori
        rawTemplate1 = await fetch("template/template_pengumuman.html").then(res => res.text());
        rawTemplate2 = await fetch("template/template_informasi.html").then(res => res.text());

        // 2. Inisialisasi Quill Editor
        if (document.getElementById('editor')) {
            const oldToolbar = document.querySelector('.ql-toolbar');
            if (oldToolbar) oldToolbar.remove();
            quillEditor = new Quill('#editor', {
                theme: 'snow',
                placeholder: 'Ketik isi paragraf utama di sini...',
                modules: {
                    toolbar: [
                        ['bold', 'italic', 'underline'],
                        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                        ['link', 'image']
                    ]
                }
            });

            // 3. Pasang Event Listener untuk Live Preview
            quillEditor.on('text-change', updateLivePreview);
        }

        // Pasang listener ke semua input form
        document.querySelectorAll('input, select, textarea').forEach(el => {
            el.addEventListener('input', updateLivePreview);
        });

        // Event khusus saat ganti template
        document.getElementById("templateSelector").addEventListener('change', () => {
            toggleTemplateFields();
            updateLivePreview();
        });

        // Set awal UI
        toggleTemplateFields();
        updateLivePreview();

        // =========================================
        // CEK APAKAH SEDANG DALAM MODE EDIT (DARI HALAMAN 05)
        // =========================================
        const editDataRaw = sessionStorage.getItem("editDraftData");
        if (editDataRaw) {
            const editData = JSON.parse(editDataRaw);
            editDraftId = editData.fileId;
            const form = editData.formData;

            // 1. Isi form utama
            document.getElementById("templateSelector").value = form.templateType || "pengumuman";
            toggleTemplateFields(); // Trigger UI agar menyesuaikan

            document.getElementById("inputJudul").value = form.judul || "";
            document.getElementById("inputSubjudul").value = form.subjudul || "";
            if (quillEditor) quillEditor.root.innerHTML = form.paragraf || "";

            // 2. Isi form layout spesifik
            if (form.templateType === "pengumuman") {
                if (document.getElementById("btnTeks")) document.getElementById("btnTeks").value = form.btnTeks || "";
                if (document.getElementById("btnLink")) document.getElementById("btnLink").value = form.btnLink || "";
            } else {
                if (document.getElementById("k1_gambar")) document.getElementById("k1_gambar").value = form.k1_gambar || "";
                if (document.getElementById("k1_judul")) document.getElementById("k1_judul").value = form.k1_judul || "";
                if (document.getElementById("k1_teks")) document.getElementById("k1_teks").value = form.k1_teks || "";
                if (document.getElementById("k1_link")) document.getElementById("k1_link").value = form.k1_link || "";
                if (document.getElementById("k2_gambar")) document.getElementById("k2_gambar").value = form.k2_gambar || "";
                if (document.getElementById("k2_judul")) document.getElementById("k2_judul").value = form.k2_judul || "";
                if (document.getElementById("k2_teks")) document.getElementById("k2_teks").value = form.k2_teks || "";
                if (document.getElementById("k2_link")) document.getElementById("k2_link").value = form.k2_link || "";
            }

            // 3. Ubah Teks Tombol Simpan menjadi Update
            const saveBtn = document.querySelector('button[onclick="saveToDraft()"]');
            if (saveBtn) {
                saveBtn.innerHTML = '<i class="bi bi-pencil-square me-2"></i> Update Draft';
                saveBtn.classList.replace('btn-primary', 'btn-warning');
            }

            // 4. Update preview & Hapus session agar tidak terus-terusan mode edit
            updateLivePreview();
            sessionStorage.removeItem("editDraftData");
        } else {
            editDraftId = null; // Pastikan null jika mode buat baru
        }

    } catch (err) {
        console.error("Gagal inisialisasi newsletter:", err);
    }
}

function toggleTemplateFields() {
    const templateType = document.getElementById("templateSelector").value;
    const secDuaKolom = document.getElementById("sectionDuaKolom");
    const secButtonUtama = document.getElementById("sectionButtonUtama");

    if (templateType === "informasi") {
        secDuaKolom.style.display = "block";
        secButtonUtama.style.display = "none";
    } else {
        secDuaKolom.style.display = "none";
        secButtonUtama.style.display = "flex";
    }
}

// Menghasilkan HTML Final berdasarkan isian form
function getFinalHTML() {
    const templateType = document.getElementById("templateSelector").value;
    let htmlContent = templateType === "pengumuman" ? rawTemplate1 : rawTemplate2;

    if (!htmlContent) return ""; // Cegah error jika template belum ter-load

    // Data Statis
    const coverPath = "https://calvinwijaya.github.io/sigma/template/cover_newsletter.png";
    const akreditasiPath = "https://calvinwijaya.github.io/sigma/template/akreditasi.png";

    // Data Dinamis Utama
    const judul = document.getElementById("inputJudul").value || "Judul Newsletter";
    const subjudul = document.getElementById("inputSubjudul").value || "Sub-judul newsletter...";
    // Ambil isi HTML dari Quill (Jika kosong, tampilkan teks default)
    const paragraf = quillEditor.getText().trim() === "" ? "Isi paragraf utama..." : quillEditor.root.innerHTML; 

    htmlContent = htmlContent.replace(/{{COVER_IMAGE}}/g, coverPath);
    htmlContent = htmlContent.replace(/{{GAMBAR_AKREDITASI}}/g, akreditasiPath);
    htmlContent = htmlContent.replace(/{{JUDUL}}/g, judul);
    htmlContent = htmlContent.replace(/{{SUBJUDUL}}/g, subjudul);
    htmlContent = htmlContent.replace(/{{PARAGRAF_UTAMA}}/g, paragraf);

    // Replace spesifik per layout
    if (templateType === "pengumuman") {
        const btnTeks = document.getElementById("btnTeks").value;
        const btnLink = document.getElementById("btnLink").value || "#";
        
        if (!btnTeks) {
            htmlContent = htmlContent.replace(/{{TOMBOL_AKSI}}/g, "");
        } else {
            const buttonHTML = `
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 30px;">
                <tr>
                    <td align="center">
                        <a href="${btnLink}" style="background-color: #0d6efd; color: #ffffff; text-decoration: none; padding: 12px 25px; border-radius: 5px; font-weight: bold; display: inline-block;">${btnTeks}</a>
                    </td>
                </tr>
            </table>`;
            htmlContent = htmlContent.replace(/{{TOMBOL_AKSI}}/g, buttonHTML);
        }
    } else {
        htmlContent = htmlContent.replace(/{{GAMBAR_KOLOM_1}}/g, document.getElementById("k1_gambar").value || "https://placehold.co/300x140?text=Gambar+1");
        htmlContent = htmlContent.replace(/{{JUDUL_KOLOM_1}}/g, document.getElementById("k1_judul").value || "Judul Artikel 1");
        htmlContent = htmlContent.replace(/{{TEKS_KOLOM_1}}/g, document.getElementById("k1_teks").value || "Deskripsi singkat artikel 1...");
        htmlContent = htmlContent.replace(/{{LINK_KOLOM_1}}/g, document.getElementById("k1_link").value || "#");

        htmlContent = htmlContent.replace(/{{GAMBAR_KOLOM_2}}/g, document.getElementById("k2_gambar").value || "https://placehold.co/300x140?text=Gambar+2");
        htmlContent = htmlContent.replace(/{{JUDUL_KOLOM_2}}/g, document.getElementById("k2_judul").value || "Judul Artikel 2");
        htmlContent = htmlContent.replace(/{{TEKS_KOLOM_2}}/g, document.getElementById("k2_teks").value || "Deskripsi singkat artikel 2...");
        htmlContent = htmlContent.replace(/{{LINK_KOLOM_2}}/g, document.getElementById("k2_link").value || "#");
    }

    // =========================================
    // FITUR BARU: INJEKSI DATA JSON KE DALAM HTML
    // =========================================
    // 1. Kumpulkan semua nilai form ke dalam satu objek
    const formState = {
        templateType: templateType,
        judul: judul,
        subjudul: subjudul,
        paragraf: paragraf,
        // Ambil data spesifik layout
        btnTeks: document.getElementById("btnTeks") ? document.getElementById("btnTeks").value : "",
        btnLink: document.getElementById("btnLink") ? document.getElementById("btnLink").value : "",
        k1_gambar: document.getElementById("k1_gambar") ? document.getElementById("k1_gambar").value : "",
        k1_judul: document.getElementById("k1_judul") ? document.getElementById("k1_judul").value : "",
        k1_teks: document.getElementById("k1_teks") ? document.getElementById("k1_teks").value : "",
        k1_link: document.getElementById("k1_link") ? document.getElementById("k1_link").value : "",
        k2_gambar: document.getElementById("k2_gambar") ? document.getElementById("k2_gambar").value : "",
        k2_judul: document.getElementById("k2_judul") ? document.getElementById("k2_judul").value : "",
        k2_teks: document.getElementById("k2_teks") ? document.getElementById("k2_teks").value : "",
        k2_link: document.getElementById("k2_link") ? document.getElementById("k2_link").value : ""
    };

    // 2. Ubah jadi String JSON, lalu encode ke Base64 (agar karakter HTML/kutip tidak merusak kode)
    const jsonString = JSON.stringify(formState);
    const base64Data = btoa(unescape(encodeURIComponent(jsonString)));

    // 3. Sisipkan di bagian paling bawah HTML sebagai "Hidden Data"
    htmlContent += `\n<div id="sigma-metadata" style="display:none;" data-json="${base64Data}"></div>`;

    return htmlContent;
}

// Render ke dalam Iframe Live Preview
function updateLivePreview() {
    const finalHTML = getFinalHTML();
    if (finalHTML) {
        const iframe = document.getElementById("livePreviewFrame");
        const doc = iframe.contentWindow.document;
        doc.open();
        doc.write(finalHTML);
        doc.close();
    }
}

async function saveToDraft() {
    const judul = document.getElementById("inputJudul").value;
    if (!judul) {
        Swal.fire("Peringatan", "Judul Newsletter wajib diisi!", "warning");
        return;
    }
    
    Loading.show();
    const finalHTML = await getFinalHTML();
    if (!finalHTML) { Loading.hide(); return; }

    // Tentukan apakah ini SIMPAN BARU atau UPDATE
    const actionType = editDraftId ? "editDraft" : "saveDraft";
    const payloadData = {
        judul: judul,
        html_content: finalHTML,
        timestamp: new Date().toISOString()
    };
    
    // Jika update, wajib sertakan ID File-nya
    if (editDraftId) {
        payloadData.fileId = editDraftId;
    }

    fetch(API_NEWSLETTER_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        redirect: "follow",
        body: JSON.stringify({
            action: actionType,
            data: payloadData
        })
    })
    .then(res => res.json())
    .then(res => {
        if(res.status === "ok") {
            Swal.fire("Berhasil!", editDraftId ? "Draft berhasil di-update." : "Newsletter berhasil disimpan ke Draft.", "success");
            
            // Bersihkan form JIKA ini simpan baru
            if (!editDraftId) {
                document.getElementById("inputJudul").value = "";
                if (quillEditor) quillEditor.root.innerHTML = "";
            } else {
                // Kembalikan ke mode normal (bukan edit) setelah berhasil update
                editDraftId = null;
                const saveBtn = document.querySelector('button[onclick="saveToDraft()"]');
                if (saveBtn) {
                    saveBtn.innerHTML = '<i class="bi bi-floppy me-2"></i> Simpan Draft';
                    saveBtn.classList.replace('btn-warning', 'btn-primary');
                }
            }
        } else {
            Swal.fire("Gagal", res.message || "Gagal memproses draft", "error");
        }
    })
    .catch(err => {
        console.error("Error Fetch:", err);
        Swal.fire("Error", "Gagal menghubungi server Google.", "error");
    })
    .finally(() => Loading.hide());
}

// JALANKAN INISIALISASI
initNewsletterPage();