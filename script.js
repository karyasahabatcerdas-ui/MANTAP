  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
      navigator.serviceWorker.register('sw.js') // Memanggil file fisik
        .then(function(reg) {
          console.log('MANTAP: ServiceWorker Aktif!', reg.scope);
        })
        .catch(function(err) {
          console.log('MANTAP: ServiceWorker Gagal:', err);
        });
    });
  }

  // Fungsi untuk memuat komponen HTML
async function loadComponent(elementId, filePath) {
    try {
        const response = await fetch(filePath);
        const html = await response.text();
        document.getElementById(elementId).innerHTML = html;
    } catch (error) {
        console.error('Gagal memuat komponen:', filePath, error);
    }
}

// Jalankan fungsi saat halaman dibuka
document.addEventListener("DOMContentLoaded", () => {
    loadComponent('modalMaintenanceLog-placeholder', 'modalMaintenanceLog.html');
    loadComponent('leftbar-placeholder', 'leftbar.html');
    loadComponent('rightbar-placeholder', 'rightbar.html');
    loadComponent('globalSearchModal-placeholder', 'globalSearchModal.html');

});

// Simpan URL Iframe GAS untuk referensi di fungsi lain (opsional, tergantung kebutuhan navigasi)
const urlGAS = document.getElementById('iframeGAS').src;


/**=============================================================================
 * [FUNGSI: OPEN GLOBAL SEARCH]
 * Memembuka Global search
 * ==============================================================================
 */

async function openGlobalSearch() {
  const tbody = document.getElementById('globalResultBody');
  const input = document.getElementById('masterSearchInput');
  const iframe = document.getElementById('iframeGAS');
  const urlGAS = iframe.src;
  
  tbody.innerHTML = "<tr><td colspan='5' style='text-align:center; padding:20px;'><i class='fas fa-spinner fa-spin'></i> Menyisir seluruh database...</td></tr>";
  input.value = "";
  document.getElementById('globalSearchModal').style.display = 'flex';
  document.getElementById('masterSearchInput').focus();

  // Memanggil server menggunakan GET dengan parameter action dan keyword
  try {
    const response = await fetch(`${urlGAS}?action=searchAllAssets&keyword=`);
    const res = await response.json();
    fillGlobalTable(res);
  } catch (err) {
    console.error("Gagal melakukan pencarian:", err);
    tbody.innerHTML = "<tr><td colspan='5' style='text-align:center; color:red;'>⚠️ Gagal terhubung ke server.</td></tr>";
  }
}


/**=============================================================================
 * [FUNGSI: ISI TABEL HASIL GLOBAL SEARCH - SEÑOR ENTERPRISE VERSION]
 * Menambahkan data-asid agar sinkron dengan Modal Maintenance.
 * ==============================================================================
 */
function fillGlobalTable(results) {
  const tbody = document.getElementById('globalResultBody');
  if (!results || results.length === 0) {
    tbody.innerHTML = "<tr><td colspan='5' style='text-align:center; padding:20px;'>Data tidak ditemukan...</td></tr>";
    return;
  }

  let html = "";
  results.forEach((item, index) => {
    html += `
      <tr style="border-bottom:1px solid #eee;">
        <td style="padding:5px; text-align:center;">
          <!-- TAMBAHKAN data-asid="${item.id}" DI SINI -->
          <input type="radio" name="selAset" value="${item.type}|${item.row}" data-asid="${item.id}" style="cursor:pointer;">
        </td>
        <td style="padding:5px;"><b>${item.type}</b></td>
        <td style="padding:5px;">${item.id}</td>
        <td style="padding:5px;">${item.nama}<br>${item.lokasi}</td>
      </tr>`;
  });
  tbody.innerHTML = html;
}

/**=============================================================================
 * [FUNGSI: LIVE FILTER DALAM MODAL]
 * Menyaring hasil yang sudah tampil di modal agar makin spesifik.
 * =============================================================================
 */
function filterGlobalResult() {
  const input = document.getElementById('masterSearchInput').value.toLowerCase();
  const rows = document.getElementById('globalResultBody').getElementsByTagName('tr');
  
  for (let i = 0; i < rows.length; i++) {
    const text = rows[i].textContent.toLowerCase();
    rows[i].style.display = text.includes(input) ? "" : "none";
  }
}
/**============================================================================
 * [FUNGSI: NAVIGASI SAKTI - MODE MULTI-PAGE]
 * Mengarahkan hasil Search ke modal yang tepat sesuai halaman aktif.
 * ============================================================================
 */
function navigateAsset() {
  const selected = document.querySelector('input[name="selAset"]:checked');
  if (!selected) return alert("Pilih aset dulu bos!");
  const [type, row] = selected.value.split('|');
  // Ambil ID Aset dari atribut data-asid yang kita buat tadi
  const unitID = selected.getAttribute('data-asid');   
  // LOGIKA: JIKA MODAL MAINTENANCE LAGI KEBUKA (MODE PILIH MANUAL)


  //KETIKA TERPILIH 'ModalMaintenanceLog'
  const modalMaint = document.getElementById('modalMaintenanceLog');
  
  if (modalMaint && modalMaint.style.display === 'block') {
    console.log("masuk globalsearch di :"+ modalMaint);
    console.log("📥 Mapping Unit ID: " + unitID);    
    // Panggil fungsi penarik data
    fetchAssetDetailForLog(unitID);    
    closeGlobalSearch(); // Tutup searchnya saja
    return; 
  }

  // LOGIKA: JIKA MULAI DARI HALAMAN HISTORY (START MODE)
  if (window.isMaintMode) {
    const [type, row] = selected.value.split('|');
    closeGlobalSearch();
    window.isMaintMode = false;
    //openMaintenanceLog(parseInt(row) + 1); 
    return;
  }

  // NAVIGASI NORMAL LAINNYA
  // --- LOGIKA BARU: CEK JIKA SEDANG INPUT JADWAL ---
  // Jika modalMaint sedang terbuka, maka isi datanya ke modal tersebut
  if (document.getElementById('modalMaint').style.display === 'flex') {
    google.script.run.withSuccessHandler(function(data) {
      if (!data) return alert("Data aset gagal diambil!");
      console.log("masuk globalsearch di : modalMaint input jadwal");
      // Isi data ke input modal jadwal sesuai mapping kolom (A=0, C=2)
      document.getElementById('m_as_id').value = data[0];   // ID ASSET
      document.getElementById('m_type').value = type;      // TIPE
      document.getElementById('m_as_nama').value = data[2]; // NAMA
      
      closeGlobalSearch(); // Tutup modal search
      console.log("✅ Data Aset berhasil di-import ke Form Jadwal");
    }).getSingleAssetData(type, row);
    return; // STOP! Jangan lanjut ke pindah halaman
  }
  // --- LOGIKA LAMA: NAVIGASI HALAMAN (TETAP AMAN) ---
  closeGlobalSearch();
  // (Navigasi lama yang tidak butuh Jendela Modal...)
    const currentPage = document.querySelector('.page:not(.hidden)').id;

  if (currentPage === 'page_lihat_aset') {
    document.getElementById('viewAssetTypeSelect').value = type;
    console.log("masuk globalsearch di : "+ currentPage);
    google.script.run.withSuccessHandler(function(data) {
      renderAssetTableIncrementalView(type, data); 
      executeHighlight(row, 'viewAssetBody', true);
    }).getSpecificAssetData(type);
  } else {
    document.getElementById('assetTypeSelect').value = type;
    console.log("masuk globalsearch di : "+ currentPage);
    google.script.run.withSuccessHandler(function(data) {
      renderAssetTableIncremental(type, data);
      executeHighlight(row, 'assetBody', false);
    }).getSpecificAssetData(type);
  }
}

function closeGlobalSearch() {
  document.getElementById('globalSearchModal').style.display = 'none';
}


/**============================================================================
 * [FUNGSI: FETCH DETAIL ASET UNTUK LOG MAINTENANCE]
 * Menarik detail aset dari server berdasarkan ID untuk diisi ke Modal Maintenance Log.
 * Juga menangani logika auto-linking jadwal open jika ada.
 * ============================================================================
 */

async function fetchAssetDetailForLog(unitID) {
  if (!unitID) return;    
  const uiNama = document.getElementById('log_as_id');    
  const iframe = document.getElementById('iframeGAS');
  const urlGAS = iframe.src;
  
  if(uiNama) uiNama.innerHTML = `<span class="text-gradient">Baca Database...</span>`;

  try {
    // Memanggil server dengan parameter action dan unitID
    const response = await fetch(`${urlGAS}?action=getAssetDetailForLog&unitID=${unitID}`);
    const res = await response.json();

    if (res && res.nama !== "TIDAK DITEMUKAN") {
      
      // 1. TAMPILKAN KONFIRMASI UNIT
      await Swal.fire({
        title: "Unit Ditemukan!",
        text: `${res.nama} (${res.type})`,
        icon: "success",
        confirmButtonText: "Mulai Kerja",
        width: '80%'
      });

      // 2. INJEKSI IDENTITAS KE UI
      document.getElementById('log_as_id').innerText = res.type + "-" + res.asId;
      document.getElementById('log_ui_asid').innerText = res.asId;
      document.getElementById('log_ui_type').innerText = res.type;
      document.getElementById('log_ui_nama').innerText = res.nama;
      document.getElementById('log_ui_lokasi').innerText = res.lokasi || "N/A";
      
      // 3. SET WAKTU MULAI DARI SERVER
      document.getElementById('log_time_mulai').value = res.serverTime;

      // 4. LOGIKA B.1.1 (AUTO-LINKING JADWAL OPEN)
      const logMaintId = document.getElementById('log_maint_id');
      const dropdownJadwal = document.getElementById('jenis_id_jadwal');

      if (res.openJadwal && res.openJadwal.length > 0) {
        const hit = res.openJadwal[0]; 
        dropdownJadwal.value = hit.idJadwal; 
        logMaintId.value = hit.maintId; 
        if(typeof speakSenor === "function") speakSenor("Jadwal terencana ditemukan Señor, silakan lanjut.");
      } else {
        logMaintId.value = ""; 
        dropdownJadwal.value = ""; 
        if(typeof speakSenor === "function") speakSenor("Tidak ada jadwal, silakan input manual.");
      }

      unlockMaintenanceForm(); 

    } else {
      await Swal.fire({ 
        title: "Unit Ghoib!", 
        text: "ID Unit [" + unitID + "] tidak ada!", 
        icon: "error", 
        width: '80%' 
      });
    }
  } catch (err) {
    console.error("Fetch Error:", err);
    if(uiNama) uiNama.innerText = "Error Koneksi!";
  }
}

// Variabel Global
currentCategory = '';  // deteksi kamera QR atau QR
html5QrCode = null; // Instance Html5Qrcode untuk scan file QR
window.currentMaintData = null; // { maint_id, as_id, nama_aset, lokasi, jenis_jadwal }
tempPhotos = { PB: [], PO: [], PA: [], PC: [] }; // Menyimpan foto sementara sebelum submit
update_man_status = false; // Menandakan apakah sedang dalam mode UPDATE (Pending) atau INPUT Baru


/**================================================================================================================================
 * [FUNGSI: OPEN CUSTOM SCANNER]
 * Memanggil input file untuk scan QR, dengan penanda kategori 'SCAN' untuk logika khusus.
 * ============================================================================================================================
 * Catatan: Fungsi ini dipisah agar lebih fleksibel jika nanti ingin menambahkan jenis scan lain (misal: Barcode, NFC, dll) dengan logika berbeda.
 * Logika di handleLogPhotoSelect akan cek kategori 'SCAN' untuk memutuskan apakah akan proses sebagai QR atau sebagai dokumentasi foto biasa.
 */

 //let html5QrCode;

// --- A. LOGIKA SCANNER QR RESPONSIF ---
async function openCustomScanner() {
    window.currentCategory = 'SCAN';
    const modal = document.getElementById('qrModal');
    modal.style.display = 'flex';

    if (!html5QrCode) html5QrCode = new Html5Qrcode("reader");

    const config = { fps: 10, qrbox: { width: 250, height: 250 } };

    // Coba buka Kamera Belakang (environment)
    html5QrCode.start(
      { facingMode: "environment" }, 
      config, 
        (decodedText) => { 
          // Jika Berhasil Scan
            if (navigator.vibrate) navigator.vibrate(150);
            stopScannerAndProcess(decodedText);
        }, 
        (errorMessage) => { /* scanning... */ }
    ).catch(err => {
        // Jika Kamera Gagal/Tidak Ada
        console.error("Kamera Error:", err);
        Swal.fire({
            title: "Kamera Tidak Ditemukan",
            text: "Gunakan fitur Upload Galeri sebagai cadangan.",
            icon: "warning",
            width: '80%'
        });
    });
}

// --- B. STOP & PROSES ---
function stopScannerAndProcess(decodedText) {
    if (html5QrCode) {
        html5QrCode.stop().then(() => {
            const modal = document.getElementById('qrModal');
            //modal.classList.remove('active'); // Sembunyikan modal
              modal.style.display = 'none'; // Sembunyikan modal
            
            // Eksekusi Logika Unit ID Anda
            if (decodedText.includes("-")) {
                const unitID = decodedText.split("-")[1].trim(); 
                fetchAssetDetailForLog(unitID); // Panggil fungsi Fetch yang sudah kita buat
                if(typeof speakSenor === "function") speakSenor("Unit ID ketemu Señor!");
            }
        });
    }
}

// --- C. TUTUP MANUAL ---
function closeQrModal() {
    if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode.stop().then(() => {
            //document.getElementById('qrModal').classList.remove('active');
            document.getElementById('qrModal').style.display = 'none';
        });
    } else {
        //document.getElementById('qrModal').classList.remove('active');
         document.getElementById('qrModal').style.display = 'none';
    }
}

// --- D. QR DARI GALERI ---
function openGalleryForQR() {
    // Tutup kamera dulu jika sedang aktif
    if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode.stop().then(() => {
            window.currentCategory = 'SCAN';
            document.getElementById('logPhotoInput').click();
        });
    } else {
        window.currentCategory = 'SCAN';
        document.getElementById('logPhotoInput').click();
    }
}

// --- B. LOGIKA KAMERA / GALERI UNTUK FOTO DOKUMENTASI ---
function capturePhoto(category) {
    window.currentCategory = category;
    // Di Mobile, 'click' pada input file akan otomatis membuka opsi:
    // "Ambil Foto" (Kamera Langsung) atau "Pilih File" (Galeri)
    document.getElementById('logPhotoInput').click();
}

async function handleLogPhotoSelect(input) {
    if (!input.files || !input.files[0]) return;
    const imageFile = input.files[0];

    // JALUR 1: SCAN QR DARI GALERI
    if (window.currentCategory === 'SCAN') {
        const scannerDummy = new Html5Qrcode("reader"); 
        speakSenor("Lagi baca QR dari galeri Señor.");
        
        scannerDummy.scanFile(imageFile, true)
            .then(decodedText => {
                if (decodedText.includes("-")) {
                    const unitID = decodedText.split("-")[1].trim();
                    fetchAssetDetailForLog(unitID);
                }
            })
            .catch(err => {
                Swal.fire({ title: "Gagal!", text: "QR galeri tidak terbaca.", icon: "error" });
            });
        input.value = "";
        return;
    }

    // JALUR 2: FOTO DOKUMENTASI (PB, PO, PA, PC)
    const cat = window.currentCategory;
    const asId = document.getElementById('log_ui_asid').innerText.trim();
    const dateTag = await getMMDDYY(); // Fungsi yang baru kita konversi

    const reader = new FileReader();
    reader.onload = (e) => {
        tempPhotos[cat].push({
            name: `${asId}_${dateTag}_${cat}_${tempPhotos[cat].length + 1}.jpg`,
            mimeType: imageFile.type,
            data: e.target.result.split(',')[1]
        });
        renderPhotoPreview(cat);
        input.value = "";
    };
    reader.readAsDataURL(imageFile);
}

/** ==========================================================================================================
 * [FUNGSI: RENDER PREVIEW FOTO PADA UI MODAL MAINTENANCE]
 * Menampilkan thumbnail foto yang sudah dipilih dengan opsi klik untuk perbesar dan tombol hapus satuan.
 * Juga mengupdate label tombol utama dengan jumlah foto yang sudah dipilih.
 * Fitur ini sangat penting untuk memberikan feedback visual kepada user tentang foto yang sudah mereka pilih, serta memberikan kontrol penuh untuk mengelola foto tersebut sebelum disimpan.
 * Implementasi ini juga mempertimbangkan berbagai sumber gambar (URL langsung dari Drive atau file lokal yang diubah ke Base64) untuk memastikan kompatibilitas maksimal.
 * Mendukung Preview Klik, Hapus Satuan, dan Integrasi Fullscreen
 * ============================================================================================================
 */
function renderPhotoPreview(cat) {
  const btn = document.getElementById(`btn_${cat}`);
  if (!btn) return;

  let thumbArea = document.getElementById(`thumb_area_${cat}`);  
  if (!thumbArea) {
    thumbArea = document.createElement('div');
    thumbArea.id = `thumb_area_${cat}`;
    thumbArea.style = "display:flex; gap:8px; margin-top:10px; overflow-x:auto; padding:5px; border-top:1px solid #eee; scroll-behavior: smooth;";
    btn.appendChild(thumbArea);
  }  
  
  thumbArea.innerHTML = "";  
  
  tempPhotos[cat].forEach((img, index) => {
    const container = document.createElement('div');
    container.style = "position:relative; flex:0 0 60px; height:60px;";    
    
    const image = document.createElement('img');
    
    // Penentuan Sumber Gambar
    if (typeof img === 'string' && img.startsWith('http')) {
      image.src = driveLinkToDirect(img); 
    } else {
      image.src = "data:" + img.mimeType + ";base64," + img.data;
    }
    
    image.style = "height:60px; width:60px; object-fit:cover; border-radius:8px; border:2px solid #fff; box-shadow:0 2px 4px rgba(0,0,0,0.2); cursor:pointer;";    

    // --- FITUR BARU: KLIK UNTUK PERBESAR (PREVIEW) ---
    image.onclick = (e) => {
      e.stopPropagation();
      Swal.fire({
        imageUrl: image.src,
        imageAlt: 'Preview Foto',
        showConfirmButton: false,
        showCloseButton: true,
        background: 'rgba(0,0,0,0.9)',
        width: '100%',
        padding: '0'
      });
      //.then(() => activateFullscreen()); // Balik ke Fullscreen setelah lihat foto
    };
    
    // Tombol Hapus (X)
    const delX = document.createElement('div');
    delX.innerHTML = "×";
    delX.style = "position:absolute; top:-5px; right:-5px; background:#e74c3c; color:white; width:22px; height:22px; border-radius:50%; font-size:16px; display:flex; align-items:center; justify-content:center; cursor:pointer; border:2px solid white; z-index: 10;";
    
    delX.onclick = (e) => {
      e.stopPropagation();
      removeSinglePhoto(cat, index); // Memanggil fungsi hapus dengan konfirmasi
    };    
    
    container.appendChild(image);
    container.appendChild(delX);
    thumbArea.appendChild(container);
  });  

  // Update Label & Warna Tombol Utama
  const count = tempPhotos[cat].length;
  const label = btn.querySelector('b') || btn.querySelector('span');
  if(label) {
    label.innerText = `${cat} (${count} FOTO)`;
    // Berikan indikasi warna hijau jika sudah ada foto
    btn.style.background = count > 0 ? "#f0fff4" : "#fffaf5";
    btn.style.borderColor = count > 0 ? "#27ae60" : "#e67e22";
  }
  
  if(count === 0) resetSingleCategoryUI(cat);
}

/**=========================================================================
 * [FUNGSI: REMOVE FOTO DENGAN KONFIRMASI SWAL]
 * ==========================================================================
 */
async function removeSinglePhoto(cat, index) {
  const result = await Swal.fire({
    title: "HAPUS FOTO?",
    text: "Foto ini akan dihapus dari antrean upload.",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#ef4444", // Merah Terang (Destructive)
    cancelButtonColor: "#334155",  // Slate Dark (Neutral)
    confirmButtonText: "YA, HAPUS",
    cancelButtonText: "BATAL",
    background: "#1e293b",         // Dark Background
    color: "#f8fafc",              // White Text
    iconColor: "#f59e0b",          // Amber/Gold Icon
    width: '85%',
    padding: '1.5rem',
    customClass: {
      popup: 'border-neon-red'     // Opsi: Jika ingin tambah border merah via CSS
    }
  });

  if (result.isConfirmed) {
    // 1. Hapus data dari memori (array sementara)
    tempPhotos[cat].splice(index, 1);
    
    // 2. Render ulang area thumbnail
    renderPhotoPreview(cat);
    
    // 3. Jika foto habis, kembalikan tampilan tombol ke default (Gahar Theme)
    if (tempPhotos[cat].length === 0) {
      resetSingleCategoryUI(cat);
    }

    // Feedback kecil (Opsional - Toast lebih smooth)
    const Toast = Swal.mixin({
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 1500,
      background: '#1e293b',
      color: '#fff'
    });
    Toast.fire({
      icon: 'success',
      title: 'Terhapus'
    });
  }
}


/**=====================================================================
 * [FUNGSI: RESET UI TOMBOL FOTO]
 * Mengembalikan tampilan tombol ke kondisi awal (Industrial Neon)
 * ==============================================================
 */
function resetSingleCategoryUI(cat) {
  const btn = document.getElementById(`btn_${cat}`);
  if (!btn) return;

  // BALIKKAN KE SKEMA WARNA INDUSTRIAL (Slate & Dark Border)
  // Kita hapus style inline manual dan gunakan standar CSS kita
  btn.style.background = "var(--bg-input, #1a202c)";
  btn.style.borderColor = "var(--border-dim, #2d3748)";
  btn.style.color = "var(--text-dim, #a0aec0)";
  btn.style.borderStyle = "dashed"; // Memberi kesan "tempat upload"
  
  // Penentuan Icon & Judul berdasarkan Kategori
  let icon = 'camera';
  let title = '';
  
  switch(cat) {
    case 'PB': icon = 'camera'; title = 'BEFORE (PB)'; break;
    case 'PO': icon = 'tools'; title = 'ON WORK (PO)'; break;
    case 'PA': icon = 'check-double'; title = 'AFTER (PA)'; break;
    case 'PC': icon = 'clipboard-list'; title = 'CHECKSHEET'; break;
  }
  
  const maks = (cat === 'PC') ? '1' : '3';
  
  // Update isi tombol (Icon + Teks)
  btn.innerHTML = `
    <div id="prev_${cat}" class="photo-placeholder-content">
      <i class="fas fa-${icon} fa-2x"></i><br>
      <b style="color:var(--text-bright)">${title}</b><br>
      <small>Maks ${maks} Foto</small>
    </div>`;
  
  // PENGHAPUSAN THUMBNAIL AREA
  // Jika Señor nanti membuat area khusus untuk hasil foto (thumbnail), 
  // pastikan ID-nya sesuai agar bisa dibersihkan saat reset.
  const thumb = document.getElementById(`thumb_area_${cat}`);
  if (thumb) thumb.innerHTML = ""; // Bersihkan isinya daripada menghapus elemennya
}

/**=====================================
 * [FUNGSI PEMBANTU: RESET FOTO]
 * Membersihkan array penyimpanan foto dan mereset UI
 * =====================================
 */
function resetTempPhotos() {
  // Reset array penyimpanan global
  tempPhotos = { PB: [], PO: [], PA: [], PC: [] };
  
  // Reset tampilan setiap tombol kategori
  ['PB', 'PO', 'PA', 'PC'].forEach(cat => resetSingleCategoryUI(cat));
  
  console.log("📸 Photo buffers cleared.");
}

/**
 * [FUNGSI CLIENT GITHUB: AMBIL TANGGAL SERVER]
 * Mengambil string waktu dari doGet(?action=getServerTime)
 */
async function getMMDDYY() {
  const iframe = document.getElementById('iframeGAS');
  const urlGAS = iframe.src;

  try {
    // 1. Fetch ke server
    const response = await fetch(`${urlGAS}?action=getServerTime`);
    const fullTime = await response.json(); // Hasilnya: "19/02/2024 14:30:05"

    // 2. Bedah string menjadi "190224"
    const parts = fullTime.split(' ')[0].split('/'); 
    const dd = parts[0];
    const mm = parts[1];
    const yy = parts[2].slice(-2); 

    return dd + mm + yy; 

  } catch (err) {
    console.error("Gagal ambil waktu server, menggunakan waktu lokal:", err);
    // Fallback: Waktu Lokal jika internet gangguan
    const d = new Date();
    const dd = d.getDate().toString().padStart(2, '0');
    const mm = (d.getMonth() + 1).toString().padStart(2, '0');
    const yy = d.getFullYear().toString().slice(-2);
    return dd + mm + yy;
  }
}


/**==============================
 * [FUNGSI CLIENT: START MAINTENANCE MODE]
 * Membuka modal dan mengunci semua input sampai data aset tervalidasi
 * ==============================
 */
function startMaintenanceMode() {
    const modal = document.getElementById('modalMaintenanceLog');
    const computedStyle = window.getComputedStyle(modal);
    if (!modal) {
        console.error("❌ Modal Maintenance tidak ditemukan!");
        return;
    }
    
    // 1. Bersihkan sisa data & reset state
    if (typeof resetLogModalTotal === 'function') {
        resetLogModalTotal();
    }

    // 2. --- SISTEM GEMBOK (LOCKDOWN) ---
    // Daftar ID yang harus dikunci di awal
    const elementsToLock = [
        'log_pekerjaan', 'btn_PB', 'btn_PO', 'btn_PA', 'btn_PC', 
        'btnLogPending', 'btnLogSelesai', 'jenis_id_jadwal'
    ];

    elementsToLock.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            // Gunakan atribut 'disabled' untuk elemen input/button
            if (el.tagName === 'INPUT' || el.tagName === 'BUTTON' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') {
                el.disabled = true;
            }
            // Gunakan class untuk elemen div/wrapper agar lebih rapi di CSS
            el.classList.add('maint-locked');
            el.style.pointerEvents = "none";
            el.style.opacity = "0.3"; // Indikator visual gembok
        }
    });

    // 3. Tampilkan Modal
    modal.style.display = 'block';
    // Optional: Auto-scroll ke atas jika modal sangat panjang
    modal.scrollTop = 0;
}

/**=================================================================
 * [FUNGSI CLIENT GITHUB: EKSEKUSI MAINTENANCE UPDATE]
 * Mengambil data baris Pending dan memuatnya ke form via Fetch
 * ===================================================================
 */
async function startMaintenanceModeUpdate() {
  const urlGAS = document.getElementById('iframeGAS').src;

  // 1. VALIDASI DATA AWAL
  if (!window.activeRowData || window.activeRowData.length === 0) {
    await Swal.fire({
      title: "Data Tidak Ditemukan!",
      text: "Silakan pilih baris terlebih dahulu, Señor.",
      icon: "error",
      width: '80%'
    });
    return; 
  }

  const data = window.activeRowData; 

  // 2. TAMPILKAN LOADING
  Swal.fire({
    title: 'Mencari Detail Aset...',
    text: 'Sik Tak Wocone Dilit...',
    allowOutsideClick: false,
    didOpen: () => { Swal.showLoading(); }
  });

  try {
    // 3. PANGGIL SERVER (GET) - Menggunakan action searchAllAssets
    // data[5] adalah Asset_ID dari kolom tabel Anda
    const response = await fetch(`${urlGAS}?action=searchAllAssets&keyword=${encodeURIComponent(data[5])}`);
    const results = await response.json();

    if (results && results.length > 0) {
      const res = results[0]; 
      Swal.close();

      // --- PENGISIAN DATA KE UI MODAL ---
      document.getElementById('log_maint_id').value = data[0]; 
      
      let pend_sebelum = `Pending [tgl: ${data[2]}] [by: ${data[4]}] [Note: ${data[7]}] - Updated[next]`;
      document.getElementById('log_as_id_label').value = pend_sebelum; // Sesuaikan ID elemen catatan Anda

      // Injeksi Detail Aset dari hasil fetch
      document.getElementById('log_as_id').innerText = res.type + "-" + res.id;
      document.getElementById('log_ui_type').innerText = res.type;
      document.getElementById('log_ui_asid').innerText = res.id;
      document.getElementById('log_ui_nama').innerText = res.nama;
      document.getElementById('log_ui_lokasi').innerText = res.lokasi;

      // Set dropdown jadwal (data[6] adalah ID_Jadwal dari tabel)
      const sEl = document.getElementById('jenis_id_jadwal');
      if (sEl) sEl.value = data[6];

      // --- LOGIKA SINKRONISASI FOTO (MENGGUNAKAN URL LAMA) ---
      // Kita masukkan URL (String) ke dalam array tempPhotos
      // Fungsi renderPhotoPreview Anda harus bisa menangani string URL
      tempPhotos.PB = data[8]  ? [{ data: data[8], isOld: true }]  : []; 
      tempPhotos.PO = data[9]  ? [{ data: data[9], isOld: true }]  : [];
      tempPhotos.PA = data[10] ? [{ data: data[10], isOld: true }] : [];
      tempPhotos.PC = data[11] ? [{ data: data[11], isOld: true }] : [];

      ['PB', 'PO', 'PA', 'PC'].forEach(cat => renderPhotoPreview(cat));

      // --- TRANSISI UI ---
      const modalDetail = document.getElementById('modalDetailHist');
      if (modalDetail) modalDetail.style.display = 'none';

      // Buka modal maintenance log dengan data yang sudah terisi
      update_man_status = true; // Tandai bahwa kita sedang dalam mode UPDATE (Pending)
      startMaintenanceMode(); 
      unlockMaintenanceForm(); 

    } else {
      await Swal.fire({
        title: "Unit Tidak Ada!",
        text: `ID Aset [${data[5]}] tidak ditemukan, Señor!`,
        icon: "error",
        width: '80%'
      });
    }
  } catch (err) {
    await Swal.fire({
      title: "Server Error",
      text: "Gagal memuat detail aset: " + err.toString(),
      icon: "error",
      width: '80%'
    });
  }
}


/**=====================================================================================================================================
 * [FUNGSI: RESET TOTAL INPUT MODAL LOG]
 * Membersihkan semua data sisa agar tidak menumpuk di sesi berikutnya
 * ======================================================================================================================================
 */
function resetLogModalTotal() {
  // Gunakan pengecekan aman untuk update_man_status
  const isUpdateMode = (typeof update_man_status !== 'undefined' && update_man_status === true);

  if (!isUpdateMode) {
    // --- MODE INPUT BARU: Reset Total Semua Elemen ---
    console.log("🧹 Reset Total: Memulai sesi maintenance baru.");

    // 1. Bersihkan Hidden & Input Fields (Value)
    const ids = ['log_maint_id', 'log_as_id', 'log_time_mulai', 'log_pekerjaan', 'log_pending', 'log_maint_row'];
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = "";
    });

    // 2. Bersihkan Teks Display UI (InnerText)
    const texts = ['log_ui_type', 'log_ui_asid', 'log_ui_nama', 'log_ui_lokasi', 'log_as_id'];
    texts.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.innerText = "-";
    });

    // 3. Reset Dropdown Select (Jadwal)
    const selJadwal = document.getElementById('jenis_id_jadwal');
    if (selJadwal) {
      selJadwal.innerHTML = '<option value="">Memuat...</option>';
    }

    // 4. Bersihkan Metadata & Foto
    window.currentMaintData = null; 
    if (typeof resetTempPhotos === 'function') resetTempPhotos();

    // 5. Reset Preview Foto secara Visual (Kembali ke icon)
    const photoWrappers = ['PB', 'PO', 'PA', 'PC'];
    photoWrappers.forEach(p => {
      const prev = document.getElementById(`prev_${p}`);
      if (prev) {
        // Kembalikan ke desain awal (Icon + Teks)
        const icons = { 'PB': 'fa-camera', 'PO': 'fa-tools', 'PA': 'fa-check-double', 'PC': 'fa-clipboard-list' };
        const labels = { 'PB': 'BEFORE (PB)', 'PO': 'ON WORK (PO)', 'PA': 'AFTER (PA)', 'PC': 'CHECKSHEET' };
        prev.innerHTML = `<i class="fas ${icons[p]}"></i><br><b>${labels[p]}</b>`;
      }
    });

  } else {
    // --- MODE UPDATE (PENDING): Hanya Reset Input Kerja & Waktu ---
    console.log("♻️ Reset Parsial: Melanjutkan data Pending.");
    
    const partialIds = ['log_time_mulai', 'log_pekerjaan'];
    partialIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = "";
    });
    
    window.currentMaintData = null;
  }

  // Tambahan: Pastikan tombol-tombol kembali ke warna standar (bukan mode loading)
  const btnSelesai = document.getElementById('btnLogSelesai');
  if(btnSelesai) btnSelesai.innerHTML = '<i class="fas fa-check-circle"></i> SELESAI';
  
  console.log("✅ UI Cleaned & Metadata Reset.");
}

/**
 * [FUNGSI CLIENT GITHUB: BUKA GEMBOK MODAL]
 * Mengaktifkan input & sinkronisasi waktu/petugas via Fetch
 */
async function unlockMaintenanceForm() {
  const iframe = document.getElementById('iframeGAS');
  const urlGAS = iframe.src;
  
  const toUnlock = [
    'log_pekerjaan', 'btn_PB', 'btn_PO', 'btn_PA', 'btn_PC', 
    'btnLogPending', 'btnLogSelesai', 'jenis_id_jadwal'
  ];
  
  // 1. BUKA GEMBOK UI
  toUnlock.forEach(id => {
    const el = document.getElementById(id);
    if(el) {
      el.disabled = false;
      el.classList.remove('maint-locked');
      el.style.pointerEvents = "auto"; 
      el.style.opacity = "1";
    }
  });

  try {
    // 2. AMBIL WAKTU SERVER (GET)
    const response = await fetch(`${urlGAS}?action=getServerTime`);
    const fullTimestamp = await response.json(); // Hasil: "dd/MM/yyyy HH:mm:ss"

    const timeInput = document.getElementById('log_time_mulai');
    const picInput = document.getElementById('log_petugas');
    
    if(timeInput) timeInput.value = fullTimestamp;
    
    // Gunakan variabel global 'loggedInUser' yang ada di GitHub
    if(picInput) {
      picInput.value = (typeof window.loggedInUser !== 'undefined') ? window.loggedInUser : "Admin"; 

      // 3. EFEK VISUAL (Industrial Feel)
      picInput.style.transition = "0.5s";
      picInput.style.boxShadow = "0 0 10px rgba(5, 150, 105, 0.4)";
      setTimeout(() => picInput.style.boxShadow = "none", 1000);
    }
    
    console.log("🔓 Form Maintenance dibuka. Waktu Server:", fullTimestamp);

  } catch (err) {
    console.error("Gagal sinkronisasi waktu server:", err);
    // Fallback: Gunakan waktu lokal jika fetch gagal
    const timeInput = document.getElementById('log_time_mulai');
    if(timeInput) timeInput.value = new Date().toLocaleString('id-ID');
  }
}

/**====================================================================
 * [FUNGSI: TUTUP MAINTENANCE]
 * Membersihkan UI dan Reset Data Sementara
 * variable global  update_man_status="" ; 
 * =====================================================================
 */ 
function closeMaintenanceMode() {
  const modal = document.getElementById('modalMaintenanceLog');
  const btnSelesai = document.getElementById('btnLogSelesai');
  const btnPending = document.getElementById('btnLogPending');
  
  // Reset Global State
  update_man_status = false; 

  // Fungsi internal untuk eksekusi penutupan
  const actionClose = () => {
    modal.style.display = 'none';
    
    // --- RESET STATUS TOMBOL KE DEFAULT ---
    if(btnSelesai) {
      btnSelesai.disabled = false;
      btnSelesai.innerHTML = '<i class="fas fa-check-circle"></i> SELESAI';
      btnSelesai.style.opacity = "1";
    }
    if(btnPending) {
      btnPending.disabled = false;
      btnPending.innerHTML = '<i class="fas fa-pause"></i> PENDING';
      btnPending.style.opacity = "1";
    }
    
    // --- RESET UI & DATA ---
    modal.style.pointerEvents = "auto";
    modal.style.opacity = "1"; 
    
    window.isSuccessSave = false;
    
    // Membersihkan semua input, dropdown, dan tempPhotos
    if (typeof resetLogModalTotal === 'function') {
      resetLogModalTotal(); 
    }
    
    console.log("🚪 Maintenance Mode Closed & Cleaned.");
  };

  // 1. Jika penutupan karena BERHASIL SIMPAN (Langsung tutup tanpa tanya)
  if (window.isSuccessSave) {
    actionClose();
  } 
  // 2. Jika klik tombol BATAL/CLOSE manual (Tampilkan Peringatan)
  else {
    Swal.fire({
      title: "Batalkan Input?",
      text: "Data dan foto yang belum dikirim akan hilang.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444", // Merah Industrial
      cancelButtonColor: "#64748b",  // Slate Gray
      confirmButtonText: "Ya, Batalkan",
      cancelButtonText: "Kembali",
      background: "#1e293b",         // Dark theme Swal
      color: "#f8fafc",
      width: '85%'
    }).then((result) => {                
      if (result.isConfirmed) {               
        actionClose();
      }
    });
  }
}


/**=================================================================
 * [FUNGSI CLIENT GITHUB: SAVE LOG ENTERPRISE]
 * Mengirim data teks & bundle foto Base64 via Fetch POST
 * ==================================================================
 */
async function saveLog(status) {
    const note = document.getElementById('log_pekerjaan').value.trim();
    const btnSelesai = document.getElementById('btnLogSelesai');
    const btnPending = document.getElementById('btnLogPending');
    const modal = document.getElementById('modalMaintenanceLog');
    const piljadwal = document.getElementById('jenis_id_jadwal');
    const urlGAS = document.getElementById('iframeGAS').src;

    // --- VALIDASI (Tetap Sama Seperti Kodemu) ---
    let pil_err = (piljadwal.value === '');
    let pesanError = "";
    if (!note) pesanError += "<li>Catatan Kerja wajib diisi!</li>";
    if (pil_err) pesanError += "<li>Pilihan Jadwal wajib dipilih!</li>";
    if (tempPhotos.PB.length === 0) pesanError += "<li>Foto BEFORE (PB) Kosong!</li>";
    if (tempPhotos.PO.length === 0) pesanError += "<li>Foto ON WORK (PO) Kosong!</li>";
    if (tempPhotos.PA.length === 0) pesanError += "<li>Foto AFTER (PA) Kosong!</li>";
    if (tempPhotos.PC.length === 0) pesanError += "<li>Foto CHECKSHEET (PC) Kosong!</li>";
    
    if (pesanError !== "") {
        await Swal.fire({
            title: "STOP, SEÑOR!",
            html: `<ul style="text-align:left; color:#d33;">${pesanError}</ul>`,
            icon: "error",
            width: '80%'
        });
        return; 
    }

    const konfirmasi = await Swal.fire({
        title: `Set status ${status}?`,
        text: "Kirim data dan foto ke server?",
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "Ya, Kirim!",
        width: '80%'
    });

    if (konfirmasi.isConfirmed) {
        // Kunci UI
        modal.style.pointerEvents = "none"; 
        btnSelesai.disabled = true;
        btnPending.disabled = true;

        const activeBtn = (status === 'Selesai') ? btnSelesai : btnPending;
        const originalHTML = activeBtn.innerHTML;
        activeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> SENDING...';

        Swal.fire({
            title: 'Transmitting...',
            text: 'Mohon tunggu, sedang upload foto...',
            allowOutsideClick: false,
            didOpen: () => { Swal.showLoading(); }
        });

        // --- PREPARE PAYLOAD ---
        let stack_pending = document.getElementById('log_pending').value || ""; 
        
        const bodyPayload = {
            action: "processMaintLogEnterprise", // Label untuk router doPost
            payload: {
                maintId  : document.getElementById('log_maint_id').value,
                mulai    : document.getElementById('log_time_mulai').value,
                status   : status,
                asId     : document.getElementById('log_ui_asid').innerText,
                asJadwal : document.getElementById('jenis_id_jadwal').value, 
                petugas  : document.getElementById('log_petugas').value,
                note     : stack_pending + " " + note    
            },
            photoData: tempPhotos // Bundle foto base64
        };

        // --- EKSEKUSI FETCH POST ---
        try {
            // Kita pakai mode 'no-cors' karena pengiriman foto base64 sangat besar
            await fetch(urlGAS, {
                method: 'POST',
                mode: 'no-cors', 
                headers: { "Content-Type": "text/plain" },
                body: JSON.stringify(bodyPayload)
            });

            // Karena 'no-cors', kita tidak bisa baca balasan teks dari server.
            // Kita asumsikan sukses jika tidak masuk ke catch (Network Error).
            await Swal.fire({
                title: "Berhasil!",
                text: "Data & Foto telah dikirim ke server Google.",
                icon: "success",
                width: '80%'
            });

            window.isSuccessSave = true;
            closeMaintenanceMode(); 
            modal.style.pointerEvents = "auto";
            
            // Jeda 2 detik sebelum refresh history agar server selesai menulis
            setTimeout(loadHist, 2000);

        } catch (err) {
            await Swal.fire({
                title: "Gagal!",
                text: "Network Error: " + err.toString(),
                icon: "error",
                width: '80%'
            });
            modal.style.pointerEvents = "auto";
            btnSelesai.disabled = false;
            btnPending.disabled = false;
            btnSelesai.innerHTML = '<i class="fas fa-check-circle"></i> SELESAI';
            btnPending.innerHTML = '<i class="fas fa-pause"></i> PENDING';
        }
    }
}


// 1. Inisialisasi awal (Wajib di luar fungsi)
let allHistoryData = []; 


/**=================================================================
 * [FUNGSI CLIENT GITHUB: LOAD HISTORY LOG]
 * Mengambil data log history dari server dan menyimpannya di memori untuk filtering/rendering
 * Menarik data log mentah dari Spreadsheet via Fetch GET
 * ==================================================================
 */
async function loadHist() {
  const tbody = document.getElementById("historyBody");
  const iframe = document.getElementById('iframeGAS');
  const urlGAS = iframe.src;
  
  // 1. AKTIFKAN ANIMASI THINKING
  if(tbody) {
    tbody.innerHTML = `
      <tr>
        <td colspan="3" style="text-align:center; padding:30px;"> 
          <div class="ai-thinking-glow"></div> 
          <span class="text-gradient" style="font-size:12px;"> 
            Sakeudap nya"k, nuju maos seueur soalna.......
          </span>   
        </td>
      </tr>`;
  }

  try {
    // 2. FETCH DATA DARI SERVER (GET)
    const response = await fetch(`${urlGAS}?action=getHistoryLogDataRaw`);
    const res = await response.json(); // Mengambil Array of Objects dari server

    // 3. HANDLING DATA
    if (!res || res.length === 0) {
      window.allHistoryData = [];
      if(tbody) tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;">📭 Data Log Kosong.</td></tr>';
      return;
    }

    // Simpan ke variabel global dan render tabel
    window.allHistoryData = res;
    applyHistoryFilter(); 

  } catch (err) {
    console.error("❌ Gagal menarik riwayat: ", err);
    if(tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="3" style="text-align:center; color:red;">
            Gagal Terhubung: ${err.message}
          </td>
        </tr>`;
    }
  }
}
/**=================================================================
 * [FUNGSI: FILTER HISTORY LOG]
 * Menerapkan filter berdasarkan status dan jadwal, lalu render tabel
 * ==================================================================
 */

function applyHistoryFilter() {
  if (!allHistoryData || allHistoryData.length === 0) return;

  var statusVal = document.getElementById("filterStatusLog").value; // 'selesai' atau 'pending'
  var jadwalVal = document.getElementById("filterJadwalLog").value; // ID Jadwal

  var filtered = allHistoryData.filter(function(row) {
    
    // --- KOREKSI INDEKS SULTAN ---
    // Index 4 = E (Selesai)
    // Index 3 = D (Pending)
    // Index 7 = H (ID_Jadwal)

    var hasSelesai = (row[4] && row[4] !== "" && row[4] !== "-"); 
    var hasPending = (row[3] && row[3] !== "" && row[3] !== "-" && !hasSelesai);
    
    // A. Logika Status
    var matchStatus = true;
    if (statusVal === "selesai") matchStatus = hasSelesai;
    if (statusVal === "pending") matchStatus = hasPending;

    // B. Logika Jadwal (Dropdown filterJadwalLog)
    // Cek ID_Jadwal di Kolom H (Index 7)
    var matchJadwal = (jadwalVal === "" || jadwalVal.toUpperCase() === "ALL") || 
                      (row[7] && row[7].toString() === jadwalVal);

    return matchStatus && matchJadwal;
  });

  renderHistoryTable(filtered);
}
/**=================================================================
 * [FUNGSI: RENDER TABEL HISTORY LOG]
 * Menerima array data log yang sudah difilter dan menampilkannya di tabel
 * ==================================================================
 */

function renderHistoryTable(data) {
  const tbody = document.getElementById("historyBody");
  if (!tbody) return;
  tbody.innerHTML = ""; 

  data.forEach((row) => {
    // --- KOREKSI INDEKS SESUAI DATABASE 13 KOLOM ---
    // row[0]=ID_Log, row[2]=mulai, row[3]=pending, row[4]=selesai
    // row[5]=Petugas, row[6]=Asset_ID, row[7]=ID_Jadwal
    
    const tr = document.createElement("tr");
    tr.style.borderBottom = "1px solid #eee";

    // --- LOGIKA STATUS WARNA SULTAN ---
    let statusLabel = "🚀 START";
    let statusColor = "#e67e22"; // Orange

    // Cek Kolom E (Index 4) buat SELESAI
    if (row[4] && row[4] !== "" && row[4] !== "-") { 
      statusLabel = "✅ SELESAI"; 
      statusColor = "#27ae60"; // Hijau
    } 
    // Cek Kolom D (Index 3) buat PENDING
    else if (row[3] && row[3] !== "" && row[3] !== "-") { 
      statusLabel = "⏳ PENDING"; 
      statusColor = "#f39c12"; // Kuning
    }

    tr.innerHTML = `
      <td style="padding:12px; vertical-align:top;">
        <div style="font-weight:bold; color:#2c3e50; font-size:13px;">${row[0]}</div>
        <div style="font-size:10px; color:#95a5a6; margin-top:4px;">
          <i class="far fa-clock"></i> ${row[2] || "-"}
        </div>
        <div style="margin-top:5px;">
          <span style="background:${statusColor}; color:white; padding:2px 6px; border-radius:4px; font-size:9px; font-weight:bold;">
            ${statusLabel}
          </span>
        </div>
      </td>
      <td style="padding:12px; vertical-align:top;">
        <div style="font-size:11px; margin-bottom:4px;">
          <i class="fas fa-user-circle" style="color:#3498db;"></i> ${row[5] || "Unknown"}
        </div>
        <div style="font-size:11px; margin-bottom:4px;">
          <i class="fas fa-tag" style="color:#9b59b6;"></i> ${row[6] || "-"}
        </div>
        <div style="font-size:10px; color:#7f8c8d;">
          <i class="fas fa-calendar-alt"></i> JDW: ${row[7] || "-"}
        </div>
      </td>
      <td style="padding:12px; text-align:center; vertical-align:middle;">
        <button onclick="openDetailLog('${row[0]}')" 
                style="width:40px; height:40px; background:#34495e; color:white; border:none; border-radius:8px; cursor:pointer; box-shadow: 0 2px 5px rgba(0,0,0,0.2);">
          <i class="fas fa-eye"></i>
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

//global variable untuk menyimpan data baris yang sedang aktif (dipilih)
let activeRowData = []; // Global variable


/**=================================================================
 * [FUNGSI: BUKA DETAIL LOG]
 * Menerima ID Log, mencari data lengkapnya dari allHistoryData, dan menampilkan di modal detail
 * ==================================================================
 */
function openDetailLog(logId) {
  // Pastikan allHistoryData sudah terisi dari server
  var data = allHistoryData.find(function(row) { return row[0] === logId; });
  if (!data) return Swal.fire("Data Ghoib!", "ID Log tidak ditemukan, Señor!", "error");

  window.activeRowData = data; 

  var setEl = function(id, val) {
    var el = document.getElementById(id);
    if (el) el.innerText = val || "-";
  };

  // --- INDEKS SESUAI HEADER 13 KOLOM ---
  setEl('det_log_id',    data[0]); // A: ID_Log
  setEl('det_maint_id',  data[1]); // B: Maint_ID (Tambahkan di UI jika perlu)
  setEl('det_start',     data[2]); // C: mulai
  setEl('det_pending',   data[3]); // D: pending
  setEl('det_selesai',   data[4]); // E: selesai
  setEl('det_petugas',   data[5]); // F: Petugas
  setEl('det_asset_id',  data[6]); // G: Asset_ID
  setEl('det_id_jadwal', data[7]); // H: ID_Jadwal
  setEl('det_note',      data[8]); // I: Note

  // ISI THUMBNAIL FOTO (J, K, L, M)
  updateThumbnail('gal_before', data[9]);  // J: P_Before
  updateThumbnail('gal_on',     data[10]); // K: P_On
  updateThumbnail('gal_after',  data[11]); // L: P_After
  updateThumbnail('gal_check',  data[12]); // M: P_Check

  // --- LOGIKA TOMBOL UPDATE (PENDING CHECK) ---
  const btn = document.getElementById('btnupdateMaintenance');
  if (btn) {
    // Tombol aktif HANYA jika kolom 'pending' (data[3]) TIDAK KOSONG
    const isPending = (data[3] !== "" && data[3] !== "-"); 
    
    btn.disabled = !isPending; 
    if (!isPending) {
      btn.style.backgroundColor = "#cccccc"; 
      btn.style.color = "#666666";
      btn.style.cursor = "not-allowed";
    } else {
      btn.style.backgroundColor = "#e67e22"; 
      btn.style.color = "#ffffff";
      btn.style.cursor = "pointer";
    }
  }

  var modal = document.getElementById('modalDetailHist');
  if (modal) modal.style.display = 'flex';
  //activateFullscreen();
}
