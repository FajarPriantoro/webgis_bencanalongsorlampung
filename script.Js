// 1. Inisialisasi Peta (Default view Provinsi Lampung)
var map = L.map('map').setView([-5.0, 105.2], 8);

// 2. Tambahkan Basemap OpenStreetMap (Peta Dasar)
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

// Nama file GeoJSON disesuaikan 100% dengan yang ada di repositori GitHub kamu
var namaFileGeoJSON = "Kerawanan_Longsor.geojson"; 
var geojsonData = null; 
var layerGeoJSON = null; 

// 3. Fungsi Pewarnaan Berdasarkan Kelas Kerawanan (Sesuai Atribut GeoJSON)
function gantiWarna(status) {
    switch (status) {
        case 'Berpotensi Tinggi': return '#d9534f'; // Merah
        case 'Berpotensi Sedang': return '#f0ad4e'; // Oranye
        case 'Tidak Berpotensi':  return '#5cb85c'; // Hijau
        default:                  return '#777777'; // Abu-abu jika tidak cocok/kosong
    }
}

// 4. Fungsi Utama untuk Merender Peta dan List Daftar Wilayah
function renderWebGIS(filterKerawanan = 'Semua', kataKunci = '') {
    // Hapus layer lama agar tidak menumpuk saat difilter atau dicari
    if (layerGeoJSON) {
        map.removeLayer(layerGeoJSON);
    }

    var listContainer = document.querySelector('.school-list');
    listContainer.innerHTML = ''; // Kosongkan daftar wilayah sebelum diisi baru

    // Buat layer GeoJSON interaktif
    layerGeoJSON = L.geoJSON(geojsonData, {
        filter: function(feature) {
            // Menggunakan properti 'WADMKK' dan 'KERAWANAN' sesuai isi file GeoJSON asli kamu
            let wilayah = feature.properties['WADMKK'] || "";
            let tingkat = feature.properties['KERAWANAN'] || "";

            // Logika Pencarian Kata Kunci Kabupaten/Kota
            let cocokPencarian = wilayah.toLowerCase().includes(kataKunci.toLowerCase());

            // Logika Filter Tombol (Mencocokkan teks tombol dengan isi atribut GeoJSON)
            let cocokFilter = (filterKerawanan === 'Semua' || tingkat.toLowerCase() === filterKerawanan.toLowerCase());

            return cocokFilter && cocokPencarian;
        },
        style: function(feature) {
            let tingkat = feature.properties['KERAWANAN'] || "";
            return {
                color: "#ffffff", // Warna garis tepi poligon (Putih)
                weight: 1.5,
                fillColor: gantiWarna(tingkat),
                fillOpacity: 0.7
            };
        },
        onEachFeature: function(feature, layer) {
            let wilayah = feature.properties['WADMKK'] || "Tidak Diketahui";
            let tingkat = feature.properties['KERAWANAN'] || "Tidak Diketahui";

            // A. Membuat Popup Informasi Saat Poligon Diklik
            let popupContent = `<div style='min-width: 160px; font-family: sans-serif;'>
                <h4 style='margin:0 0 5px 0; color:#333;'>📍 ${wilayah}</h4>
                <hr style='margin:5px 0; border:0; border-top:1px solid #eee;'>
                <b>Status Kerawanan:</b> <br>
                <span style='color:${gantiWarna(tingkat)}; font-weight:bold; font-size:14px;'>${tingkat}</span><br>`;
            
            // Tampilkan properti tambahan secara otomatis jika ada
            for (let key in feature.properties) {
                if (key !== 'WADMKK' && key !== 'KERAWANAN' && key !== 'OBJECTID') {
                    popupContent += `<br><b>${key}</b>: ${feature.properties[key]}`;
                }
            }
            popupContent += `</div>`;
            layer.bindPopup(popupContent);

            // B. Menyisipkan Nama Kabupaten/Kota ke Menu Samping (Daftar Wilayah)
            let itemWilayah = document.createElement('div');
            itemWilayah.className = 'school-item'; 
            itemWilayah.style.cssText = "padding: 12px; border-bottom: 1px solid #eee; cursor: pointer; transition: 0.2s;";
            itemWilayah.innerHTML = `
                <div style="font-weight: bold; color: #333;">📍 ${wilayah}</div>
                <div style="font-size: 12px; color: #666; margin-top: 4px;">
                    Status: <span style="color:${gantiWarna(tingkat)}; font-weight:bold;">${tingkat}</span>
                </div>
            `;

            // Efek interaksi hover pada daftar samping
            itemWilayah.addEventListener('mouseover', function() {
                itemWilayah.style.backgroundColor = "#f1f5f9";
                layer.setStyle({ fillOpacity: 0.9, weight: 3 });
            });
            itemWilayah.addEventListener('mouseout', function() {
                itemWilayah.style.backgroundColor = "transparent";
                layer.setStyle({ fillOpacity: 0.7, weight: 1.5 });
            });

            // Klik daftar samping langsung mengarahkan peta ke lokasi daerah tersebut
            itemWilayah.addEventListener('click', function() {
                map.fitBounds(layer.getBounds());
                layer.openPopup();
            });

            listContainer.appendChild(itemWilayah);
        }
    }).addTo(map);
}

// 5. Mengambil data GeoJSON menggunakan Fetch API
fetch(namaFileGeoJSON)
    .then(response => {
        if (!response.ok) throw new Error("File GeoJSON tidak ditemukan.");
        return response.json();
    })
    .then(data => {
        geojsonData = data;
        
        // Panggil fungsi utama untuk menampilkan seluruh data pertama kali
        renderWebGIS('Semua', '');

        // Otomatis arahkan fokus kamera peta ke batas spasial poligon Lampung
        if (layerGeoJSON) {
            var bounds = layerGeoJSON.getBounds();
            if (bounds.isValid()) {
                map.fitBounds(bounds);
            }
        }
    })
    .catch(error => {
        console.error("Error:", error);
        document.querySelector('.school-list').innerHTML = `<div style="color:red; padding:10px;">Gagal memuat data. Periksa kembali file GeoJSON kamu.</div>`;
    });

// 6. Logika Tombol Filter (Semua, Tidak Berpotensi, Berpotensi Sedang, Berpotensi Tinggi)
var tombolFilter = document.querySelectorAll('.filter-btn');
tombolFilter.forEach(button => {
    button.addEventListener('click', function() {
        tombolFilter.forEach(btn => btn.classList.remove('active'));
        this.classList.add('active');

        let statusDipilih = this.innerText.trim(); 
        let kataKunciSekarang = document.querySelector('.search-bar input').value;

        renderWebGIS(statusDipilih, kataKunciSekarang);
    });
});

// 7. Logika Kolom Pencarian Wilayah Kabupaten/Kota
var inputCari = document.querySelector('.search-bar input');
inputCari.addEventListener('input', function() {
    let kataKunci = this.value;
    let tombolAktif = document.querySelector('.filter-btn.active').innerText.trim();

    renderWebGIS(tombolAktif, kataKunci);
});