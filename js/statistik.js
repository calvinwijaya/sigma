document.addEventListener("DOMContentLoaded", () => {
    // Hanya muat statistik jika kita berada di halaman Home / Dashboard awal
    if(document.getElementById('dashboardStats')) {
        loadStatistikData();
    }
});

let map;
let choroplethLayer;

async function loadStatistikData() {
    try {
        // API_STATISTIK_URL diambil dari config.js
        const response = await fetch(`${API_STATISTIK_URL}?action=getData`);
        const res = await response.json();
        
        if (res.status === "ok") {
            // 1. Update Total
            document.getElementById('statTotalAlumni').innerText = res.data.total.toLocaleString('id-ID');
            
            // 2. Buat Chart
            renderChart(res.data.sebaran);
            
            // 3. Buat Peta
            initMap(res.data.sebaran);
        }
    } catch (err) {
        console.error("Gagal memuat statistik", err);
        document.getElementById('statTotalAlumni').innerText = "Error";
    }
}

function renderChart(sebaranData) {
    // Urutkan data dari jumlah terbanyak dan ambil Top 5
    const sorted = [...sebaranData].sort((a,b) => b.jumlah - a.jumlah).slice(0, 5);
    
    const ctx = document.getElementById('alumniChart').getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sorted.map(d => d.provinsi),
            datasets: [{
                label: 'Jumlah Alumni',
                data: sorted.map(d => d.jumlah),
                backgroundColor: 'rgba(13, 110, 253, 0.8)',
                borderColor: 'rgba(13, 110, 253, 1)',
                borderWidth: 1,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { 
                y: { beginAtZero: true, ticks: { stepSize: 1, precision: 0 } },
                x: { grid: { display: false } }
            }
        }
    });
}

async function initMap(sebaranData) {
    // 1. Inisialisasi Peta (Center: Indonesia)
    map = L.map('alumniMap').setView([-1.5, 117.5], 5); // Tampilan pas untuk Indonesia

    // 2. Pilihan Basemap
    const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { 
        maxZoom: 18, attribution: '© OpenStreetMap' 
    });
    const satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { 
        maxZoom: 18, attribution: '© Esri' 
    });
    const darkMap = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19, attribution: '© CARTO'
    });

    // Default aktif: OSM
    osm.addTo(map);

    // Kontrol Layer di pojok kanan atas
    L.control.layers({ 
        "Peta Standar (OSM)": osm, 
        "Peta Gelap (Dark)": darkMap,
        "Satelit": satellite 
    }).addTo(map);

    // 3. Persiapkan Data & Cari Nilai Max untuk Skala Warna
    const dataDict = {};
    let maxJumlah = 0;
    
    // Fungsi untuk menyamakan nama provinsi
    const normalize = (name) => name.toUpperCase().replace("DAERAH ISTIMEWA ", "DI ").replace("DKI ", "").trim();

    sebaranData.forEach(d => {
        dataDict[normalize(d.provinsi)] = d.jumlah;
        if(d.jumlah > maxJumlah) maxJumlah = d.jumlah;
    });

    // Fungsi Gradasi Warna (Semakin banyak = Semakin Biru Gelap)
    function getColor(d) {
        return d > maxJumlah * 0.8 ? '#08306b' :
               d > maxJumlah * 0.6 ? '#08519c' :
               d > maxJumlah * 0.4 ? '#2171b5' :
               d > maxJumlah * 0.2 ? '#4292c6' :
               d > 0               ? '#9ecae1' :
                                     '#f7fbff'; // Sangat terang jika 0
    }

    try {
        // 4. Ambil batas poligon (GeoJSON) Provinsi Indonesia dari URL Publik
        const geoResponse = await fetch('https://raw.githubusercontent.com/superpikar/indonesia-geojson/master/indonesia-province-simple.json');
        const geoJsonData = await geoResponse.json();

        function style(feature) {
            const pName = feature.properties.Propinsi || "";
            const jumlah = dataDict[normalize(pName)] || 0;
            return {
                fillColor: getColor(jumlah),
                weight: 1,
                opacity: 1,
                color: '#666',
                dashArray: '2',
                fillOpacity: 0.8
            };
        }

        function onEachFeature(feature, layer) {
            const pName = feature.properties.Propinsi || "Tidak Diketahui";
            const jumlah = dataDict[normalize(pName)] || 0;
            
            // Interaksi saat hover
            layer.on({
                mouseover: (e) => {
                    const l = e.target;
                    l.setStyle({ weight: 3, color: '#ffb703', dashArray: '', fillOpacity: 1 });
                    l.bringToFront();
                },
                mouseout: (e) => {
                    choroplethLayer.resetStyle(e.target);
                    // Sesuaikan ulang transparansi dengan slider saat ini
                    e.target.setStyle({ fillOpacity: document.getElementById('mapOpacity').value });
                }
            });

            // Popup saat diklik
            layer.bindPopup(`<div class="text-center"><h6 class="fw-bold mb-1">${pName}</h6><span class="badge bg-primary fs-6">${jumlah} Alumni</span></div>`);
        }

        choroplethLayer = L.geoJson(geoJsonData, { style: style, onEachFeature: onEachFeature }).addTo(map);

        // Fitur Slider Transparansi
        document.getElementById('mapOpacity').addEventListener('input', function(e) {
            choroplethLayer.setStyle({ fillOpacity: e.target.value });
        });

    } catch(e) {
        console.warn("Gagal memuat GeoJSON poligon, menggunakan Marker Koordinat Spreadsheet sebagai Fallback.");
        
        // FALLBACK: Jika GitHub GeoJSON mati, sistem akan menggunakan koordinat centroid (Sheet2) Anda!
        sebaranData.forEach(d => {
            if(d.lintang && d.bujur && d.jumlah > 0) {
                L.circleMarker([d.lintang, d.bujur], {
                    radius: 8 + (d.jumlah / maxJumlah) * 20, // Radius dinamis
                    fillColor: getColor(d.jumlah),
                    color: "#fff",
                    weight: 2,
                    opacity: 1,
                    fillOpacity: 0.8
                }).bindPopup(`<div class="text-center"><h6 class="fw-bold mb-1">${d.provinsi}</h6><span class="badge bg-primary fs-6">${d.jumlah} Alumni</span></div>`).addTo(map);
            }
        });
    }

    // 5. Buat Legenda Peta
    const legend = L.control({position: 'bottomright'});
    legend.onAdd = function (map) {
        const div = L.DomUtil.create('div', 'info legend shadow-sm');
        div.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
        div.style.padding = '10px 15px';
        div.style.borderRadius = '8px';
        div.innerHTML += '<strong class="d-block mb-2 small text-muted">Sebaran Alumni</strong>';
        
        const grades = [0, Math.ceil(maxJumlah*0.2), Math.ceil(maxJumlah*0.4), Math.ceil(maxJumlah*0.6), Math.ceil(maxJumlah*0.8)];
        for (let i = 0; i < grades.length; i++) {
            div.innerHTML +=
                '<i style="background:' + getColor(grades[i] + 1) + '; width: 15px; height: 15px; float: left; margin-right: 8px; border-radius: 3px; border: 1px solid #ccc;"></i> ' +
                '<span class="small">' + grades[i] + (grades[i + 1] ? ' &ndash; ' + grades[i + 1] + '</span><br>' : '+</span>');
        }
        return div;
    };
    legend.addTo(map);
}