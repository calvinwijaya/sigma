var quillEditor;
var rawTemplate1 = ""; 
var rawTemplate2 = ""; 
var rawTemplate3 = ""; 
var rawTemplate4 = ""; 
var rawTemplate5 = ""; 
var rawTemplate6 = ""; 
var editDraftId = null;

async function initNewsletterPage() {
    try {
        rawTemplate1 = await fetch("template/template_pengumuman.html").then(res => res.text());
        rawTemplate2 = await fetch("template/template_informasi.html").then(res => res.text());
        rawTemplate3 = await fetch("template/template_survei.html").then(res => res.text());
        rawTemplate4 = await fetch("template/template_undangan.html").then(res => res.text());
        rawTemplate5 = await fetch("template/template_profil.html").then(res => res.text());
        rawTemplate6 = await fetch("template/template_promosi.html").then(res => res.text());

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
            quillEditor.on('text-change', updateLivePreview);
        }

        document.querySelectorAll('input, select, textarea').forEach(el => {
            el.addEventListener('input', updateLivePreview);
        });

        document.getElementById("templateSelector").addEventListener('change', () => {
            toggleTemplateFields();
            updateLivePreview();
        });

        toggleTemplateFields();
        togglePersonalisasi(); // Set status awal personalisasi
        updateLivePreview();

        // CEK MODE EDIT
        const editDataRaw = sessionStorage.getItem("editDraftData");
        if (editDataRaw) {
            const editData = JSON.parse(editDataRaw);
            editDraftId = editData.fileId;
            const form = editData.formData;

            document.getElementById("templateSelector").value = form.templateType || "pengumuman";
            toggleTemplateFields(); 

            document.getElementById("inputJudul").value = form.judul || "";
            document.getElementById("inputSubjudul").value = form.subjudul || "";
            if (quillEditor) quillEditor.root.innerHTML = form.paragraf || "";

            // Personalisasi
            if (form.usePersonalisasi) {
                document.getElementById("usePersonalisasi").checked = true;
                document.getElementById("inputSapaan").value = form.sapaan || "Yth.";
                togglePersonalisasi();
            }

            if (form.templateType !== "informasi") {
                if (document.getElementById("btnTeks")) document.getElementById("btnTeks").value = form.btnTeks || "";
                if (document.getElementById("btnLink")) document.getElementById("btnLink").value = form.btnLink || "";
            }

            if (form.templateType === "informasi") {
                if (document.getElementById("k1_gambar")) document.getElementById("k1_gambar").value = form.k1_gambar || "";
                if (document.getElementById("k1_judul")) document.getElementById("k1_judul").value = form.k1_judul || "";
                if (document.getElementById("k1_teks")) document.getElementById("k1_teks").value = form.k1_teks || "";
                if (document.getElementById("k1_link")) document.getElementById("k1_link").value = form.k1_link || "";
                if (document.getElementById("k2_gambar")) document.getElementById("k2_gambar").value = form.k2_gambar || "";
                if (document.getElementById("k2_judul")) document.getElementById("k2_judul").value = form.k2_judul || "";
                if (document.getElementById("k2_teks")) document.getElementById("k2_teks").value = form.k2_teks || "";
                if (document.getElementById("k2_link")) document.getElementById("k2_link").value = form.k2_link || "";
            } else if (form.templateType === "undangan") {
                if (document.getElementById("inputWaktu")) document.getElementById("inputWaktu").value = form.waktu || "";
                if (document.getElementById("inputLokasi")) document.getElementById("inputLokasi").value = form.lokasi || "";
            } else if (form.templateType === "profil") {
                if (document.getElementById("inputFotoProfil")) document.getElementById("inputFotoProfil").value = form.fotoProfil || "";
            } else if (form.templateType === "promosi") {
                if (document.getElementById("inputGambarPromo")) document.getElementById("inputGambarPromo").value = form.gambarPromo || "";
            }

            const saveBtn = document.querySelector('button[onclick="saveToDraft()"]');
            if (saveBtn) {
                saveBtn.innerHTML = '<i class="bi bi-pencil-square me-2"></i> Update Draft';
                saveBtn.classList.replace('btn-primary', 'btn-warning');
            }

            updateLivePreview();
            sessionStorage.removeItem("editDraftData");
        } else {
            editDraftId = null; 
        }

    } catch (err) {
        console.error("Gagal inisialisasi newsletter:", err);
    }
}

function toggleTemplateFields() {
    const templateType = document.getElementById("templateSelector").value;
    const sections = ["sectionDuaKolom", "sectionButtonUtama", "sectionUndangan", "sectionProfil", "sectionPromosi"];
    sections.forEach(sec => {
        const el = document.getElementById(sec);
        if(el) el.style.display = "none";
    });

    if (templateType === "informasi") {
        const el = document.getElementById("sectionDuaKolom");
        if(el) el.style.display = "block";
    } else {
        const btnSec = document.getElementById("sectionButtonUtama");
        if(btnSec) btnSec.style.display = "flex";
        if (templateType === "undangan") {
            const el = document.getElementById("sectionUndangan");
            if(el) el.style.display = "flex";
        } else if (templateType === "profil") {
            const el = document.getElementById("sectionProfil");
            if(el) el.style.display = "block";
        } else if (templateType === "promosi") {
            const el = document.getElementById("sectionPromosi");
            if(el) el.style.display = "block";
        }
    }
}

function togglePersonalisasi() {
    const isChecked = document.getElementById("usePersonalisasi").checked;
    document.getElementById("sectionSapaan").style.display = isChecked ? "block" : "none";
}

function getFinalHTML(isPreview = false) {
    const templateType = document.getElementById("templateSelector").value;
    let htmlContent = "";

    if (templateType === "pengumuman") htmlContent = rawTemplate1;
    else if (templateType === "informasi") htmlContent = rawTemplate2;
    else if (templateType === "survei") htmlContent = rawTemplate3;
    else if (templateType === "undangan") htmlContent = rawTemplate4;
    else if (templateType === "profil") htmlContent = rawTemplate5;
    else if (templateType === "promosi") htmlContent = rawTemplate6;

    if (!htmlContent) return "";

    const coverPath = "https://i.postimg.cc/QtCQDQk4/cover-newsletter.png";
    const akreditasiPath = "https://i.postimg.cc/4dMs2Gxq/akreditasi.png";
    const iconWeb = "https://i.postimg.cc/rzXx5vXM/website.png";
    const iconIg  = "https://i.postimg.cc/DfWNdLk6/instagram.png";
    const iconYt  = "https://i.postimg.cc/RC3YQK5H/youtube.png";
    const iconMail = "https://i.postimg.cc/dQ7fmrP1/email.png";

    const judul = document.getElementById("inputJudul").value || "Judul Newsletter";
    const subjudul = document.getElementById("inputSubjudul").value || "Sub-judul newsletter...";
    let paragraf = quillEditor.getText().trim() === "" ? "Isi paragraf utama..." : quillEditor.root.innerHTML; 

    // LOGIKA PERSONALISASI
    const usePersonalisasi = document.getElementById("usePersonalisasi").checked;
    const sapaan = document.getElementById("inputSapaan").value.trim() || "Yth.";
    
    if (usePersonalisasi) {
        // Jika mode preview, tampilkan nama dummy agar user tau posisinya
        const namaPlaceholder = isPreview ? "<span style='color:#0d6efd; background:#e9ecef; padding:0 4px;'>Budi Santoso (Contoh)</span>" : "{{NAMA_PENERIMA}}";
        const blokSapaan = `<div style="font-size: 15px; color: #333; margin-bottom: 12px; font-weight: bold;">${sapaan} ${namaPlaceholder},</div>`;
        paragraf = blokSapaan + paragraf;
    }

    htmlContent = htmlContent.replace(/{{COVER_IMAGE}}/g, coverPath);
    htmlContent = htmlContent.replace(/{{GAMBAR_AKREDITASI}}/g, akreditasiPath);
    htmlContent = htmlContent.replace(/{{JUDUL}}/g, judul);
    htmlContent = htmlContent.replace(/{{SUBJUDUL}}/g, subjudul);
    htmlContent = htmlContent.replace(/{{PARAGRAF_UTAMA}}/g, paragraf);
    htmlContent = htmlContent.replace(/{{ICON_WEB}}/g, iconWeb);
    htmlContent = htmlContent.replace(/{{ICON_IG}}/g, iconIg);
    htmlContent = htmlContent.replace(/{{ICON_YT}}/g, iconYt);
    htmlContent = htmlContent.replace(/{{ICON_MAIL}}/g, iconMail);

    if (templateType !== "informasi") {
        const btnTeks = document.getElementById("btnTeks") ? document.getElementById("btnTeks").value : "";
        const btnLink = document.getElementById("btnLink") ? document.getElementById("btnLink").value : "#";
        if (!btnTeks) {
            htmlContent = htmlContent.replace(/{{TOMBOL_AKSI}}/g, "");
        } else {
            const buttonHTML = `
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 30px;">
                <tr><td align="center"><a href="${btnLink}" style="background-color: #0d6efd; color: #ffffff; text-decoration: none; padding: 12px 25px; border-radius: 5px; font-weight: bold; display: inline-block;">${btnTeks}</a></td></tr>
            </table>`;
            htmlContent = htmlContent.replace(/{{TOMBOL_AKSI}}/g, buttonHTML);
        }
    }

    if (templateType === "informasi") {
        htmlContent = htmlContent.replace(/{{GAMBAR_KOLOM_1}}/g, document.getElementById("k1_gambar")?.value || "https://placehold.co/300x140?text=Gambar+1");
        htmlContent = htmlContent.replace(/{{JUDUL_KOLOM_1}}/g, document.getElementById("k1_judul")?.value || "Judul Artikel 1");
        htmlContent = htmlContent.replace(/{{TEKS_KOLOM_1}}/g, document.getElementById("k1_teks")?.value || "Deskripsi singkat...");
        htmlContent = htmlContent.replace(/{{LINK_KOLOM_1}}/g, document.getElementById("k1_link")?.value || "#");
        htmlContent = htmlContent.replace(/{{GAMBAR_KOLOM_2}}/g, document.getElementById("k2_gambar")?.value || "https://placehold.co/300x140?text=Gambar+2");
        htmlContent = htmlContent.replace(/{{JUDUL_KOLOM_2}}/g, document.getElementById("k2_judul")?.value || "Judul Artikel 2");
        htmlContent = htmlContent.replace(/{{TEKS_KOLOM_2}}/g, document.getElementById("k2_teks")?.value || "Deskripsi singkat...");
        htmlContent = htmlContent.replace(/{{LINK_KOLOM_2}}/g, document.getElementById("k2_link")?.value || "#");
    } else if (templateType === "undangan") {
        htmlContent = htmlContent.replace(/{{WAKTU_ACARA}}/g, document.getElementById("inputWaktu")?.value || "TBA");
        htmlContent = htmlContent.replace(/{{LOKASI_ACARA}}/g, document.getElementById("inputLokasi")?.value || "TBA");
    } else if (templateType === "profil") {
        htmlContent = htmlContent.replace(/{{FOTO_PROFIL}}/g, document.getElementById("inputFotoProfil")?.value || "https://placehold.co/150x150?text=Profil");
    } else if (templateType === "promosi") {
        htmlContent = htmlContent.replace(/{{GAMBAR_PROMO}}/g, document.getElementById("inputGambarPromo")?.value || "https://placehold.co/300x300?text=Promo");
    }

    const formState = {
        templateType: templateType,
        judul: judul,
        subjudul: subjudul,
        paragraf: paragraf.replace(/<div style="font-size: 15px; color: #333; margin-bottom: 12px; font-weight: bold;">.*?<\/div>/, ""), // Bersihkan sapaan dari raw text quill
        usePersonalisasi: usePersonalisasi,
        sapaan: sapaan,
        btnTeks: document.getElementById("btnTeks")?.value || "",
        btnLink: document.getElementById("btnLink")?.value || "",
        k1_gambar: document.getElementById("k1_gambar")?.value || "",
        k1_judul: document.getElementById("k1_judul")?.value || "",
        k1_teks: document.getElementById("k1_teks")?.value || "",
        k1_link: document.getElementById("k1_link")?.value || "",
        k2_gambar: document.getElementById("k2_gambar")?.value || "",
        k2_judul: document.getElementById("k2_judul")?.value || "",
        k2_teks: document.getElementById("k2_teks")?.value || "",
        k2_link: document.getElementById("k2_link")?.value || "",
        waktu: document.getElementById("inputWaktu")?.value || "",
        lokasi: document.getElementById("inputLokasi")?.value || "",
        fotoProfil: document.getElementById("inputFotoProfil")?.value || "",
        gambarPromo: document.getElementById("inputGambarPromo")?.value || ""
    };

    const jsonString = JSON.stringify(formState);
    const base64Data = btoa(unescape(encodeURIComponent(jsonString)));
    htmlContent += `\n<div id="sigma-metadata" style="display:none;" data-json="${base64Data}"></div>`;

    return htmlContent;
}

function updateLivePreview() {
    const finalHTML = getFinalHTML(true); // Param true = Tampilkan nama dummy Budi Santoso
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
    if (!judul) { Swal.fire("Peringatan", "Judul Newsletter wajib diisi!", "warning"); return; }
    
    Loading.show();
    const finalHTML = await getFinalHTML(false); // Param false = Tulis {{NAMA_PENERIMA}} asli ke HTML
    if (!finalHTML) { Loading.hide(); return; }

    const actionType = editDraftId ? "editDraft" : "saveDraft";
    const payloadData = { judul: judul, html_content: finalHTML, timestamp: new Date().toISOString() };
    if (editDraftId) payloadData.fileId = editDraftId;

    fetch(API_NEWSLETTER_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        redirect: "follow",
        body: JSON.stringify({ action: actionType, data: payloadData })
    })
    .then(res => res.json())
    .then(res => {
        if(res.status === "ok") {
            Swal.fire("Berhasil!", editDraftId ? "Draft berhasil di-update." : "Newsletter disimpan.", "success");
            if (!editDraftId) {
                document.getElementById("inputJudul").value = "";
                if (quillEditor) quillEditor.root.innerHTML = "";
            } else {
                editDraftId = null;
                const saveBtn = document.querySelector('button[onclick="saveToDraft()"]');
                if (saveBtn) {
                    saveBtn.innerHTML = '<i class="bi bi-floppy me-2"></i> Simpan Draft';
                    saveBtn.classList.replace('btn-warning', 'btn-primary');
                }
            }
        } else { Swal.fire("Gagal", res.message || "Gagal memproses draft", "error"); }
    })
    .catch(err => Swal.fire("Error", "Gagal menghubungi server Google.", "error"))
    .finally(() => Loading.hide());
}

initNewsletterPage();