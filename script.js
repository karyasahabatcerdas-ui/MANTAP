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
    loadComponent('leftbar-placeholder', 'leftbar.html');
    loadComponent('rightbar-placeholder', 'rightbar.html');
    loadComponent('modalMaintenanceLog-placeholder', 'modalMaintenanceLog.html');
    loadComponent('modalGlobalSearch-placeholder', 'modalGlobalSearch.html');
    loadComponent('modalMaint-placeholder', 'modalMaint.html');
    loadComponent('modalDetailHist-placeholder', 'modalDetailHist.html');

});

// Simpan URL Iframe GAS untuk referensi di fungsi lain (opsional, tergantung kebutuhan navigasi)
const urlGAS = document.getElementById('iframeGAS').src;

/**
 * [FUNGSI AI: UNIVERSAL VOICE NOTIFICATION]
 * Bisa dipanggil dari mana saja. Contoh: speakSeñor("Data berhasil disimpan");
 */
function speakSenor(pesan) {
  if ('speechSynthesis' in window) {
    // Batalkan suara yang sedang berjalan agar tidak tumpang tindih
    window.speechSynthesis.cancel();

    const msg = new SpeechSynthesisUtterance();
    msg.text = pesan;
    msg.lang = 'id-ID'; // Bahasa Indonesia
    msg.rate = 0.9;     // default 1.1 Sedikit lebih cepat agar terdengar profesional
    msg.pitch = 0.9;  // defaul 1.0
    
    window.speechSynthesis.speak(msg);
  }
}


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
            text: "Gunakan fitur Upload Galeri.",
            icon: "warning",
            width: '80%'
        }).then(() => {
          openGalleryForQR(); // Langsung trigger klik input file
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


/**================================================================================================================================
 *  FUNGSI CAPTURE PHOTO DENGAN KAMERA & GALERI (DOKUMENTASI MAINTENANCE)
 * ================================================================================================================================
 */ 
 let stream; //variabel global untuk menyimpan stream kamera agar bisa dimatikan saat modal ditutup

// --- 1. BUKA KAMERA DOKUMENTASI ---
async function capturePhoto(category) {
    window.currentCategory = category;
    document.getElementById('camLabel').innerText = category;
    const modal = document.getElementById('camModal');
    const video = document.getElementById('videoFeed');

    try {
        // Minta akses kamera belakang secara paksa
        stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { exact: "environment" } }
        });
    } catch (err) {
        // Jika kamera belakang tidak ditemukan (misal di laptop), coba kamera apapun
        try {
            stream = await navigator.mediaDevices.getUserMedia({ video: true });
        } catch (e) {
            console.error("Kamera Error:", e);
            speakSenor("Kamera ghoib Señor, silakan pakai galeri.");
            openGalleryFromCam(); // Auto-switch ke galeri jika kamera gagal
            return;
        }
    }

    video.srcObject = stream;
    modal.style.display = 'flex';
}

/**================================================================================================================================
 * FUNGSI TOMBOL JEPRET FOTO & LOGIKA PENYIMPANAN SEMENTARA
 * ================================================================================================================================
 */

// --- 2. AMBIL FOTO (CAPTURE) ---
async function takeSnapshot() {
    const video = document.getElementById('videoFeed');
    const canvas = document.getElementById('photoCanvas');
    const context = canvas.getContext('2d');
    const cat = window.currentCategory;

    // Set ukuran canvas sesuai video feed
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Ambil data Base64
    const base64Data = canvas.toDataURL('image/jpeg', 0.8); // Kualitas 80% biar hemat memori
    const asId = document.getElementById('log_ui_asid').innerText.trim();
    const dateTag = await getMMDDYY();

    // Masukkan ke laci memori tempPhotos
    tempPhotos[cat].push({
        name: `${asId}_${dateTag}_${cat}_${tempPhotos[cat].length + 1}.jpg`,
        mimeType: 'image/jpeg',
        data: base64Data.split(',')[1] // Base64 murni tanpa header
    });

    if (typeof renderPhotoPreview === "function") renderPhotoPreview(cat);
    speakSenor(`Foto ${cat} siap Señor!`);
    closeCamModal();
}

/**================================================================================================================================
 * FUNGSI GALERI UNTUK SCAN QR & FOTO DOKUMENTASI
 * ================================================================================================================================
 */

// --- 3. LOGIKA GALERI & TUTUP ---
function openGalleryFromCam() {
    closeCamModal();
    document.getElementById('logPhotoInput').click();
}

function closeCamModal() {
    if (stream) {
        stream.getTracks().forEach(track => track.stop()); // Matikan lampu kamera
    }
    document.getElementById('camModal').style.display = 'none';
}

/**================================================================================================================================
 * FUNGSI HANDLE FILE INPUT UNTUK SCAN QR & FOTO DOKUMENTASI
 * =================================================================================================================================
 */

async function handleLogPhotoSelect(input) {
    if (!input.files || !input.files[0]) return;
    const imageFile = input.files[0];

    // JALUR 1: SCAN QR DARI GALERI
    if (window.currentCategory === 'SCAN') {        
        speakSenor("Lagi baca QR dari galeri Señor.");

        const scannerFile = new Html5Qrcode("reader"); 
        try {
            const decodedText = await scannerFile.scanFile(imageFile, true);
            if (decodedText.includes("-")) {
                const unitID = decodedText.split("-")[1].trim();
                if (navigator.vibrate) navigator.vibrate(150);
                fetchAssetDetailForLog(unitID);
                speakSenor("QR sukses Señor!");
            } else {
                throw new Error("Format salah");
            }
        } catch (err) {
            console.error("QR Error:", err);
            speakSenor("Gagal baca QR Señor.");
            Swal.fire({ title: "Gagal!", text: "QR tidak terdeteksi di foto ini.", icon: "error" });
        }
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
  const prevLabel = document.getElementById(`prev_${cat}`);
  if (!btn || !prevLabel) return;

  // Sembunyikan thumb_area bawaan HTML (karena kita pindah ke dalam tombol)
  const externalThumb = document.getElementById(`thumb_area_${cat}`);
  if(externalThumb) externalThumb.style.display = 'none';

  const count = tempPhotos[cat].length;

  // 1. KONDISI KOSONG
  if (count === 0) {
    btn.classList.remove('btn-has-content');
    resetSingleCategoryUI(cat);
    return;
  }

  // 2. KONDISI ISI
  btn.classList.add('btn-has-content');
  btn.style.borderColor = "var(--neon-blue)";
  btn.style.background = "rgba(56, 189, 248, 0.05)";

  // Cari atau buat area thumb di dalam tombol
  let innerThumb = btn.querySelector('.inner-thumb-float');
  if (!innerThumb) {
    innerThumb = document.createElement('div');
    innerThumb.className = 'inner-thumb-float';
    btn.appendChild(innerThumb);
  }
  innerThumb.innerHTML = ""; // Bersihkan

  // 3. RENDER FOTO MELAYANG
  tempPhotos[cat].forEach((img, index) => {
    const wrapper = document.createElement('div');
    wrapper.className = "thumb-wrapper";

    const image = document.createElement('img');
    image.src = (typeof img === 'string' && img.startsWith('http')) 
                ? driveLinkToDirect(img) 
                : "data:" + img.mimeType + ";base64," + img.data;
    
    image.onclick = (e) => {
      e.stopPropagation();
      Swal.fire({ imageUrl: image.src, background: '#0f172a', showConfirmButton: false });
    };

    const delBtn = document.createElement('div');
    delBtn.className = "btn-delete-float";
    delBtn.innerHTML = "&times;";
    delBtn.onclick = (e) => {
      e.stopPropagation(); // Biar kamera gak kebuka pas mau hapus
      removeSinglePhoto(cat, index);
    };

    wrapper.appendChild(image);
    wrapper.appendChild(delBtn);
    innerThumb.appendChild(wrapper);
  });

  // Update Teks Label (Tetap terlihat di sebelah kanan)
  const title = (cat === 'PB') ? 'BEFORE' : (cat === 'PO') ? 'ON WORK' : (cat === 'PA') ? 'AFTER' : 'CHECKSHEET';
  prevLabel.innerHTML = `<b>${title}</b><br><small>${count}/3 FOTO</small>`;
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
let allHistoryData = []; //variabel global untuk menyimpan data log history mentah dari server


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
      allHistoryData = [];
      if(tbody) tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;">📭 Data Log Kosong.</td></tr>';
      return;
    }

    // Simpan ke variabel global dan render tabel
    allHistoryData = res;
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

/**=================================================================================
 * [FUNGSI UI: LIHAT JADWAL - VERSI FINAL DENGAN FILTER 2 MINGGU & STANDARISASI DATE]
 * [MENGGUNAKAN TI FORMATER KEEPER getServerTime]
 * =================================================================================
 */
let timerPencarian; 

async function loadJad() {
  clearTimeout(timerPencarian);
  
  // Debounce 400ms agar tidak spam request saat user mengetik
  timerPencarian = setTimeout(async function() {
    const iframe = document.getElementById('iframeGAS');
    const urlGAS = iframe.src;
    
    // 1. Ambil Nilai Filter dari UI GitHub
    const fType = document.getElementById('filterType')?.value || "";   
    const fState = document.getElementById('filterState')?.value || ""; 
    const sortBy = document.getElementById('sortJadwal')?.value || "";   
    const keyword = document.getElementById('cari_jadwal')?.value.toUpperCase() || "";

    try {
      // 2. Panggil Server (GET)
      const response = await fetch(`${urlGAS}?action=getJadwalData`);
      const data = await response.json();

      if (!data || data.length < 2) return;
      
      // Ambil data tanpa header (asumsi data[0] adalah header)
      let rawData = data.slice(1); 

      // 3. FILTERING (Logika tetap sama di Client)
      if (fType) rawData = rawData.filter(d => String(d[1]) === fType);
      if (fState) rawData = rawData.filter(d => String(d[9]) === fState);
      if (keyword) rawData = rawData.filter(d => d.join(" ").toUpperCase().includes(keyword));

      const now = new Date();
      
      // HELPER KONVERSI TANGGAL
      const toDate = (val) => {
        if (!val) return new Date(0);
        const p = String(val).split(/[\/\s:]/); 
        if (p.length < 3) return new Date(0);
        // Format: dd/mm/yyyy
        return new Date(p[2], p[1] - 1, p[0], p[3] || 0, p[4] || 0, p[5] || 0);
      };

      // 4. SORTING & RENTANG WAKTU
      if (sortBy === 'newest') {
        rawData.sort((a, b) => toDate(b[7]) - toDate(a[7]));
      } 
      else if (sortBy === 'oldest') {
        rawData.sort((a, b) => toDate(a[7]) - toDate(b[7]));
      } 
      else if (sortBy === 'two_weeks_ahead') {
        const limitAhead = new Date();
        limitAhead.setDate(now.getDate() + 14);
        rawData = rawData.filter(d => {
          const dDate = toDate(d[7]);
          return dDate >= now && dDate <= limitAhead;
        });
      } 
      else if (sortBy === 'two_weeks_back') {
        const limitBack = new Date();
        limitBack.setDate(now.getDate() - 14);
        rawData = rawData.filter(d => {
          const dDate = toDate(d[7]);
          return dDate <= now && dDate >= limitBack;
        });
      }

      // 5. RENDER KE TABEL/VIEW
      renderJadwalViewIncremental(rawData);

    } catch (err) {
      console.error("Gagal load jadwal:", err);
    }
  }, 400); 
}


/**======================================================================================================
 * [FUNGSI CLIENT GITHUB: LOAD TABEL KELOLA JADWAL]
 * Mengambil data jadwal dari server dan memanggil fungsi render khusus untuk panel kelola
 * =======================================================================================================
 */
async function loadKel() {
  const tbody = document.getElementById('kelolaBody');
  if (!tbody) return;

  const iframe = document.getElementById('iframeGAS');
  const urlGAS = iframe.src;

  // Berikan loading indicator sederhana
  tbody.innerHTML = "<tr><td colspan='5' style='text-align:center;'><i class='fas fa-spinner fa-spin'></i> Memuat panel kelola...</td></tr>";

  try {
    // Panggil server (Action sudah kita buat sebelumnya di doGet)
    const response = await fetch(`${urlGAS}?action=getJadwalData`);
    const data = await response.json();

    if (!data || data.length < 2) {
      tbody.innerHTML = "<tr><td colspan='5' style='text-align:center;'>Belum ada jadwal maintenance.</td></tr>";
      return;
    }
    
    // Panggil mesin render khusus kelola jadwal Anda
    // window.renderKelolaIncremental(data);
    renderKelolaIncremental(data);

  } catch (err) {
    console.error("Gagal load kelola jadwal:", err);
    tbody.innerHTML = "<tr><td colspan='5' style='text-align:center; color:red;'>⚠️ Error koneksi database.</td></tr>";
  }
}


/**=========================================================================================
 * [FUNGSI: MESIN RENDER KELOLA - TRACING: renderKelolaIncremental]
 * Update baris tabel secara cerdas dengan tombol Edit & Hapus di sisi kanan.
 * Fokus pada kolom penting: MaintID, Unit Aset, Plan, Status, dan Aksi (Edit/Hapus).
 * Data diambil langsung dari index yang sesuai (sesuai struktur data jadwal)
 * ==========================================================================================
 */
function renderKelolaIncremental(data) {
  const tbody = document.getElementById('kelolaBody');
  const existingRows = tbody.rows;
  const newDataLength = data.length - 1;

  for (let i = 1; i < data.length; i++) {
    const d = data[i];
    const rowIdx = i - 1;
    
    // Cukup ambil langsung nilainya dari index 7 (Kolom H)
    let planDate = d[7] || "-"; 
    
    // Warna Badge Status (J)
    let state = d[9] || "Open";
    let badgeColor = (state === "Close") ? "#27ae60" : (state === "Pending") ? "#f39c12" : "#2980b9";

    // Susun isi baris: MaintID, Unit Aset, Plan, State, Aksi
    const rowHtml = `
      <td style="padding:5px;">${d[0]}</td>
      <td style="padding:5px;"><b>${d[1]}</b> - ${d[2]}<br><small>${d[3]}</small></td>
      <td style="padding:5px;">${planDate}<br><small>${d[10]}</small></td>
      <td style="padding: 10px 5px; text-align: center; vertical-align: middle;">
        <div style="margin-bottom: 8px;">
          <span style="background:${badgeColor}; color:white; padding:3px 8px; border-radius:12px; font-size:12px; font-weight:bold; display: inline-block; min-width: 50px; text-align: center;">
            ${state}
          </span>
        </div>

        <div style="display: flex; gap: 5px; justify-content: center;">
          <button onclick="openMaintModal(${i+1})" style="background:#3498db; color:white; border:none; padding:8px 12px; border-radius:6px; cursor:pointer; flex: 1; max-width: 60px;">
            <i class="fas fa-edit"></i> EDIT
          </button>
          
          <button onclick="delJad(${i+1})" style="background:#e74c3c; color:white; border:none; padding:8px 12px; border-radius:6px; cursor:pointer; flex: 1; max-width: 45px;">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </td>
      `;

    // Update baris jika ada atau tambah baru (Incremental)
    if (existingRows[rowIdx]) {
      if (existingRows[rowIdx].innerHTML !== rowHtml) {
        existingRows[rowIdx].innerHTML = rowHtml;
      }
    } else {
      const newRow = tbody.insertRow();
      newRow.innerHTML = rowHtml;
    }
  }

  // Hapus sisa baris jika data di sheet berkurang
  while (tbody.rows.length > newDataLength) {
    tbody.deleteRow(newDataLength);
  }
}
/**=========================================================================================
 * [FUNGSI: MESIN RENDER JADWAL - TRACING: renderJadwalViewIncremental]
 * Update baris tabel secara cerdas dengan tombol aksi di sisi kanan.
 * Fokus pada kolom penting: MaintID, Unit Aset, Plan, Status, dan Aksi (Lihat Detail & Go To Maintenance).
 * Data diambil langsung dari index yang sesuai (sesuai struktur data jadwal)
 * ==========================================================================================
 */

function renderJadwalViewIncremental(data) {
  const tbody = document.getElementById('jadwalBody');
  tbody.innerHTML = ""; // Bersihkan dulu kalau urutan berubah
   data.forEach((d, i) => {
     
    //let planDate = d[7] ? new Date(d[7]).toLocaleString('id-ID', {dateStyle:'short', timeStyle:'short'}) : "-";

    let state = d[9] || "Open";
    let color = (state === "Close") ? "#27ae60" : (state === "Pending") ? "#f39c12" : "#2980b9";
    
    // Di dalam loop render jadwal user (Lihat Jadwal)
    //      <tr style="border-bottom: 1px solid #eee;">
    //      </tr>
    const rowHtml = `

        <td style="padding:5px;">${d[0]}</td> <!-- Maint ID -->
        <td style="padding:5px;"><b>${d[1]}</b> - ${d[2]}<br><small>${d[3]}</small></td> <!-- Unit Aset -->
        <td style="padding:5px;">${d[7]}<br><small>${d[10]}</small></td> <!-- Plan Date -->
        <td style="padding:5px; text-align:center;">
          <!-- TOMBOL AKSI: Mengarah ke Mode Read-Only -->
          <button onclick="openMaintDetailView(${i+2})"style="background:#7f8c8d; color:white; border:none; padding:6px; border-radius:4px; cursor:pointer;">
            <i class="fas fa-search"></i>
          </button>
          <button onclick="goMaint(${i+2})" style="background:${color}; color:white; border:none; padding:6px; border-radius:4px; cursor:pointer;">
            <i class="fa-solid fa-toolbox"></i> <span style="padding:2px 6px; border-radius:4px; font-size:10px;">${state}</span>
          </button>
        </td>
      `;

    tbody.innerHTML += rowHtml;
  });
}

/**=================================================================
 * [FUNGSI CLIENT GITHUB: EKSEKUSI MAINTENANCE UPDATE]
 * Mengambil data baris Pending dan memuatnya ke form via Fetch
 * ===================================================================
 */
async function goMaint(rowIdx) {
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
      document.getElementById('log_maint_id').value = data[0]; //pengisian Maint_ID ke form maintenance log
      
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

      // --- LOGIKA DARI lIHAT JADWAL ADALAH SEMUA JADWAL OPEN ADALAH BARU TIDAK ADA PENDING, HANYA ADA OPEN DAN CLOSE) ---
      // Jadi kita asumsikan jika statusnya "Open" maka kita anggap sebagai "Pending" untuk keperluan update log
      // Jika statusnya "Close" maka kita anggap sebagai "Selesai" dan tidak bisa diupdate lagi (tombol update akan dinonaktifkan)
      // Kita masukkan URL (String) ke dalam array tempPhotos
      // Fungsi renderPhotoPreview Anda harus bisa menangani string URL
      //tempPhotos.PB = data[8]  ? [{ data: data[8], isOld: true }]  : []; 
      //tempPhotos.PO = data[9]  ? [{ data: data[9], isOld: true }]  : [];
      //tempPhotos.PA = data[10] ? [{ data: data[10], isOld: true }] : [];
      //tempPhotos.PC = data[11] ? [{ data: data[11], isOld: true }] : [];

      //['PB', 'PO', 'PA', 'PC'].forEach(cat => renderPhotoPreview(cat));
      resetTempPhotos(); // mengosongkan karena goMaint adalah jadwal baru, bukan update, jadi kita reset dulu tempPhotos agar tidak tercampur dengan data lama

      // --- TRANSISI UI ---
      const modalDetail = document.getElementById('modalDetailHist');
      if (modalDetail) modalDetail.style.display = 'none';

      // Buka modal maintenance log dengan data yang sudah terisi
      update_man_status = true; // tandai supaya tidak direset saat buka modal maintenancelog
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

/**
 * [FUNGSI UI: LIHAT JADWAL - MODE LOCK]
 */
function openMaintDetailView(row) {
  // 1. Sembunyikan Tombol Aksi
  const btnCreate = document.getElementById('btnCreateMaint');
  const btnSearch = document.getElementById('btnMaintSearch'); 
  
  if (btnCreate) btnCreate.style.display = "none";
  if (btnSearch) btnSearch.style.display = "none";

  // 2. Gembok Semua Input (Disabled)
  const inputs = ['m_plan', 'm_shift_note', 'm_other_note', 'm_state'];
  inputs.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.disabled = true;
  });

  // 3. Ubah Tombol Batal Jadi Tombol Keluar Lebar  
  const btnCancel = document.getElementById('btnCancelMaint');
  if (btnCancel) {
    btnCancel.parentElement.style.display = "block"; // Full width
    btnCancel.style.width = "100%";
    btnCancel.innerHTML = '<i class="fas fa-times"></i> KELUAR PRATINJAU';
  }

  loadMaintDetail(row); // Panggil load data
}


/**=========================================================================
 * [FUNGSI CLIENT GITHUB: LOAD DETAIL JADWAL]
 * Menarik detail satu baris jadwal berdasarkan index baris
 * Menggunakan Fetch GET dengan parameter row untuk mengambil data spesifik dari server
 * ==========================================================================
 */
async function loadMaintDetail(row) {
  const iframe = document.getElementById('iframeGAS');
  const urlGAS = iframe.src;

  if (typeof speakSenor === "function") speakSenor("Mencari data, Señor...");

  try {
    // 1. PANGGIL SERVER (GET) dengan parameter action dan row
    const response = await fetch(`${urlGAS}?action=getSingleMaint&row=${row}`);
    const data = await response.json();

    if (!data || data.length === 0) {
      if (typeof speakSenor === "function") speakSenor("Data ghoib Señor!");
      return;
    }

    // Helper Fungsi untuk mengisi value elemen UI GitHub
    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.value = val || "";
    };

    // 2. INJEKSI DATA DASAR
    setVal('maintRowIdx', row);
    setVal('m_id', data[0]);
    setVal('m_type', data[1]);
    setVal('m_as_id', data[2]);
    setVal('m_as_nama', data[3]);

    // 3. LOGIKA TANGGAL (Plan) 
    // Format dari GAS: "dd/mm/yyyy hh:mm" -> Ubah ke: "yyyy-mm-ddThh:mm"
    const s = data[7]; 
    if (s && s.length >= 16) {
      try {
        const formattedDate = `${s.substring(6,10)}-${s.substring(3,5)}-${s.substring(0,2)}T${s.substring(11,16)}`;
        setVal('m_plan', formattedDate);
      } catch (e) {
        console.error("Format tanggal error:", s);
      }
    }

    // 4. UPDATE DROPDOWN & CATATAN
    setVal('m_state', data[9]);
    setVal('maint_id_jadwal', data[10]); 
    setVal('m_shift_note', data[11]);
    setVal('m_other_note', data[12]);

    // 5. TAMPILKAN MODAL
    const modal = document.getElementById('modalMaint');
    if (modal) {
      modal.style.display = 'flex';
      if (typeof speakSenor === "function") speakSenor("Data dimuat.");
    }

  } catch (err) {
    console.error("Gagal load detail jadwal:", err);
    if (typeof speakSenor === "function") speakSenor("Koneksi bermasalah Señor.");
  }
}

/**=========================================================================
 * [FUNGSI CLIENT GITHUB: LOAD TIPE ASET]
 * Sekali ambil dari server (fetch), semua dropdown tipe aset langsung sinkron via Cache.
 * ==========================================================================
 */
async function loadAssetTypes() {
  const iframe = document.getElementById('iframeGAS');
  const urlGAS = iframe.src;

  // 1. Jika cache sudah ada di memori browser GitHub, langsung pakai
  if (window.cachedAssetTypes) {
    renderAllTypeDropdowns(window.cachedAssetTypes);
    return;
  }

  // 2. Jika belum ada, ambil dari server (GAS)
  try {
    const response = await fetch(`${urlGAS}?action=getAssetTypes`);
    const types = await response.json(); // Mengambil array tipe aset

    if (types && types.length > 0) {
      window.cachedAssetTypes = types; // Simpan ke cache global GitHub
      renderAllTypeDropdowns(types); // Sebar ke semua dropdown (filter, modal, dll)
      console.log("📥 Data Tipe Aset Baru Diterima & Disinkronkan.");
    }
  } catch (err) {
    console.error("Gagal memuat tipe aset:", err);
  }
}


/**=========================================================================
 * [FUNGSI PEMBANTU: SEBAR DATA KE SEMUA DROPDOWN]
 * Menghindari penulisan berulang untuk setiap ID dropdown.
 * Menerima array tipe aset dan mengisi semua dropdown yang relevan dengan opsi baru.
 * ==========================================================================
 */
function renderAllTypeDropdowns(types) {
  // Daftar ID dropdown yang harus diisi
  const dropdownIds = ['assetTypeSelect', 'viewAssetTypeSelect', 'filterType', 'm_type'];
  
  dropdownIds.forEach(id => {
    const sel = document.getElementById(id);
    if (!sel) return; // Lewati jika elemen tidak ada di halaman saat ini

    // Simpan nilai lama (biar kalau lagi milih gak keriset ke kosong)
    const currentVal = sel.value;
    
    let h = (id === 'filterType') ? '<option value=""> Semua Tipe</option>' : '<option value="">-- Pilih Tipe Aset --</option>';
    
    if (types && types.length > 0) {
      types.forEach(t => {
        h += `<option value="${t}">${t}</option>`;
      });
    }
    sel.innerHTML = h;
    
    // Balikin nilai lama kalau ada
    if (currentVal) sel.value = currentVal;
  });
}

/**==================================================================================================================
 * [FUNGSI CLIENT GITHUB: LOAD DATA ASET SPESIFIK]
 * Menarik data dari sheet tertentu sesuai type_asset yg juga nama sheet nya, lalu memanggil mesin render untuk menampilkan di tabel aset.
 * ====================================================================================================================
 */
async function loadAssetData(sheetName) {
  if (!sheetName) return;
  
  const iframe = document.getElementById('iframeGAS');
  const urlGAS = iframe.src;
  const masterCheck = document.getElementById('checkAllAsset');

  try {
    // 1. PANGGIL SERVER (GET) dengan parameter action dan sheetName
    // EncodeURIComponent penting jika nama sheet ada spasi (misal: 'Pompa Air')
    const response = await fetch(`${urlGAS}?action=getSpecificAsset&sheetName=${encodeURIComponent(sheetName)}`);
    const data = await response.json();

    if (!data || data.length < 2) {
      document.getElementById('assetBody').innerHTML = "<tr><td colspan='5' style='text-align:center;'>📭 Data Kosong</td></tr>";
      return;
    }    

    // Reset checkbox master jika ada
    if (masterCheck) masterCheck.checked = false; 

    // 2. PANGGIL MESIN RENDER INCREMENTAL ANDA
    renderAssetTableIncremental(sheetName, data);

  } catch (err) {
    console.error("Gagal load data aset:", err);
    document.getElementById('assetBody').innerHTML = "<tr><td colspan='5' style='text-align:center; color:red;'>⚠️ Gagal terhubung ke database aset.</td></tr>";
  }
}


/**=========================================================================
 * [FUNGSI: RENDER TABEL INCREMENTAL + INTEGRASI CHECK ALL]
 * Mesin render khusus untuk halaman Lihat Aset dengan checkbox, terintegrasi dengan fungsi toggleAllAssets untuk fitur Check All.
 * Fokus pada efisiensi update baris dan sinkronisasi checkbox dengan data yang diambil dari server.
 * Data diambil langsung dari index yang sesuai (sesuai struktur data aset) dan disesuaikan dengan logika status warna yang sudah kita buat sebelumnya.
 * Logika warna status (Baik, Rusak, Perlu Perbaikan) diambil dari kolom 4 (Index 3) dan ditampilkan sebagai badge di bawah nama aset.
 * Setiap checkbox memiliki class 'asetCheck' untuk memudahkan fungsi toggleAllAssets dalam mengontrol semua checkbox sekaligus.
 * Penting: Pastikan struktur data yang dikirim dari server sesuai dengan yang diharapkan (misal: nama di index 0, kondisi di index 4, dll) agar render berjalan dengan benar.
 *==========================================================================
 */
function renderAssetTableIncremental(sheetName, data) {
  const tbody = document.getElementById('assetBody');
  const masterCheck = document.getElementById('checkAllAsset');
  
  // A. RESET CHECKBOX HEADER (Penting agar tidak nyangkut saat ganti Tipe Aset)
  if (masterCheck) masterCheck.checked = false;

  const newDataLength = data.length - 1; 

  for (let i = 1; i < data.length; i++) {
    const rowData = data[i];
    const rowIdx = i - 1;
    let badgeColor = (rowData[4] === "Baik") ? "#27ae60" : (rowData[4] === "Rusak") ?  "#2980b9" : "#f39c12";
    // B. PASTIKAN CLASS SAMA (Gunakan 'assetCheck' sesuai fungsi toggle kita)
    const rowHtml = `
      <td style="padding:5px; text-align:center;"><input type="checkbox" class="asetCheck" value="${i+1}"></td>
      <td style="padding:5px; font-weight:bold;"> ${rowData[0]} <br>${rowData[2]}<br><span style="background:${badgeColor}; color:white;">${rowData[4]}</span></td>
      <td style="padding:5px;"> ${rowData[3]} </td>      
      <td style="padding:5px;">
        <button onclick="openAssetDetail('${sheetName}', ${i+1})" style="background:#2980b9; color:white; border:none; padding:5px 10px; border-radius:3px; cursor:pointer;">
          <i class="fas fa-eye"></i> Detil
        </button>
      </td>`;

    if (tbody.rows[rowIdx]) {
      if (tbody.rows[rowIdx].innerHTML !== rowHtml) {
        tbody.rows[rowIdx].innerHTML = rowHtml;
      }
    } else {
      const newRow = tbody.insertRow();
      newRow.innerHTML = rowHtml;
    }
  }

  while (tbody.rows.length > newDataLength) {
    tbody.deleteRow(newDataLength);
  }
}

/**=========================================================================
 * [FUNGSI: TOGGLE CHECK ALL ASSET]
 * Mengontrol semua checkbox aset dengan satu klik pada checkbox master.
 * Setiap checkbox aset memiliki class 'asetCheck' untuk memudahkan seleksi.
 * Saat master dicentang, semua checkbox aset akan dicentang dan barisnya diberi efek warna (misal: #fff9e6 untuk highlight). Saat master tidak dicentang, semua checkbox aset akan dilepas centangnya dan efek warna dihapus.
 * Pastikan fungsi ini dipanggil setiap kali data aset di-render ulang agar tetap sinkron dengan checkbox yang ada.
 *==========================================================================
 */
function toggleAllAssets() {
  const master = document.getElementById('checkAllAsset');
  const items = document.querySelectorAll('.asetCheck');
  
  items.forEach(cb => {
    cb.checked = master.checked;
    // Beri efek warna pada baris yang dicentang
    const row = cb.closest('tr');
    if (row) {
      row.style.backgroundColor = master.checked ? "#fff9e6" : "";
    }
  });
}


/**=========================================================================
 * [FUNGSI: RENDER TABEL VIEW INCREMENTAL]
 * Mesin khusus untuk halaman Lihat Aset (Tanpa Checkbox).
 * Fokus pada efisiensi update baris dan penyajian data yang bersih untuk mode tampilan saja (Read-Only).
 * Setiap baris memiliki tombol "Lihat Detail" yang memanggil fungsi openAssetDetailView dengan parameter sheetName dan row index untuk menampilkan detail aset di modal.
 * Data diambil langsung dari index yang sesuai (sesuai struktur data aset) dan disesuaikan dengan logika status warna yang sudah kita buat sebelumnya.
 * Logika warna status (Baik, Rusak, Perlu Perbaikan) diambil dari kolom 4 (Index 3) dan ditampilkan sebagai badge di bawah nama aset.
 * Penting: Pastikan struktur data yang dikirim dari server sesuai dengan yang diharapkan agar render berjalan dengan benar.
 *==========================================================================
 */
function renderAssetTableIncrementalView(sheetName, data) {
  const tbody = document.getElementById('viewAssetBody');
  const existingRows = tbody.rows;
  const newDataLength = data.length - 1;

  for (let i = 1; i < data.length; i++) {
    const rowData = data[i];
    const rowIdx = i - 1;
    // Template baris tanpa checkbox, tombol manggil openAssetDetailView
    const rowHtml = `
      <td>${rowData[0]}</td><td>${rowData[2]}</td><td>${rowData[3]}</td>
      <td>
        <button onclick="openAssetDetailView('${sheetName}', ${i+1})" style="background:#7f8c8d; color:white; border:none; padding:5px; border-radius:3px; cursor:pointer;">
          <i class="fas fa-search"></i> Lihat
        </button>
      </td>`;

    if (existingRows[rowIdx]) {
      if (existingRows[rowIdx].innerHTML !== rowHtml) {
        existingRows[rowIdx].innerHTML = rowHtml;
      }
    } else {
      const newRow = tbody.insertRow();
      newRow.innerHTML = rowHtml;
    }
  }

  while (tbody.rows.length > newDataLength) {
    tbody.deleteRow(newDataLength);
  }
}


/**=========================================================================
 * [FUNGSI CLIENT GITHUB: LOAD TABEL LIHAT ASET - READ ONLY]
 * Menarik data aset spesifik via Fetch GET untuk mode tampilan saja.
 * Menggunakan action getSpecificAsset dengan parameter sheetName untuk mengambil data dari server, lalu memanggil mesin render khusus untuk mode view aset yang sudah kita buat sebelumnya.
 * Fokus pada penyajian data yang bersih dan efisien untuk mode tampilan saja (Read-Only), tanpa checkbox atau fitur edit.
 * Setiap baris memiliki tombol "Lihat Detail" yang memanggil fungsi openAssetDetailView dengan parameter sheetName dan row index untuk menampilkan detail aset di modal.
 * ==========================================================================
 */
async function loadAssetDataView(sheetName) {
  if (!sheetName) return;
  
  const iframe = document.getElementById('iframeGAS');
  const urlGAS = iframe.src;

  try {
    // 1. PANGGIL SERVER (GET) - Menggunakan action yang sama dengan Kelola Aset
    const response = await fetch(`${urlGAS}?action=getSpecificAsset&sheetName=${encodeURIComponent(sheetName)}`);
    const data = await response.json();

    if (!data || data.length < 2) {
      const tbody = document.getElementById('viewAssetBody');
      if (tbody) tbody.innerHTML = "<tr><td colspan='4' style='text-align:center;'>📭 Data Kosong</td></tr>";
      return;
    }

    // 2. PANGGIL MESIN RENDER KHUSUS VIEW (READ-ONLY)
    renderAssetTableIncrementalView(sheetName, data);

  } catch (err) {
    console.error("Gagal load data aset view:", err);
    const tbody = document.getElementById('viewAssetBody');
    if (tbody) tbody.innerHTML = "<tr><td colspan='4' style='text-align:center; color:red;'>⚠️ Gagal memuat data aset.</td></tr>";
  }
}


/**=========================================================================
 * [FUNGSI CLIENT GITHUB: ISI DROPDOWN LIHAT ASET]
 * Memanfaatkan cache global agar perpindahan tab terasa instan.
 * Jika cache belum ada (misal: refresh halaman), baru ambil dari server. Setelah itu, render dropdown dengan opsi tipe aset yang sudah kita buat sebelumnya.
 * ==========================================================================
 */
async function loadAssetTypesView() {
  const sel = document.getElementById('viewAssetTypeSelect');
  const iframe = document.getElementById('iframeGAS');
  const urlGAS = iframe.src;
  
  // 1. Jika cache sudah ada di memori GitHub, langsung pakai (Instan!)
  if (window.cachedAssetTypes) {
    console.log("🚀 Menggunakan Cache untuk Dropdown View Asset.");
    renderViewDropdown(window.cachedAssetTypes);
    return;
  }

  // 2. Jika belum ada (misal: refresh halaman di tab ini), ambil dari server
  try {
    const response = await fetch(`${urlGAS}?action=getAssetTypes`);
    const types = await response.json();

    if (types && types.length > 0) {
      window.cachedAssetTypes = types; // Simpan ke cache global
      renderViewDropdown(types);
    }
  } catch (err) {
    console.error("Gagal memuat tipe aset untuk view:", err);
    if (sel) sel.innerHTML = '<option value="">⚠️ Gagal memuat data</option>';
  }
}
/**=========================================================================
 * [FUNGSI PEMBANTU: RENDER DROPDOWN LIHAT ASET]
 * Menerima array tipe aset dan mengisi dropdown filter di tab Lihat Aset.
 * Setiap opsi dropdown akan memiliki value yang sesuai dengan tipe aset untuk memudahkan filtering saat user memilih.
 * Pastikan fungsi ini dipanggil dengan data yang benar (array tipe aset) agar dropdown terisi dengan benar.
 * ==========================================================================
 */

function renderViewDropdown(types) {
  const sel = document.getElementById('viewAssetTypeSelect');
  let h = '<option value="">-- Pilih  --</option>';
  types.forEach(t => h += `<option value="${t}">${t}</option>`);
  sel.innerHTML = h;
}

/**=========================================================================
 * [FUNGSI: LIHAT ASET DETIL - MODE VIEW ONLY]
 * Kita balik logikanya: Panggil detil dulu, baru timpa dengan mode Read-Only.
 * Tujuannya agar fungsi openAssetDetail tetap berjalan normal (mengisi data, render foto, dll), baru setelah itu kita "Sikat" semua input dan tombol untuk memastikan benar-benar tidak bisa diedit.
 * Dengan cara ini, kita meminimalisir risiko bug atau data yang tidak terisi dengan benar karena mode view hanya merubah state tampilan setelah data sudah dimuat.
 * Pastikan fungsi openAssetDetail sudah benar-benar berjalan dan mengisi semua data sebelum kita kunci inputnya, jadi kita beri sedikit jeda (setTimeout) untuk memastikan urutan eksekusi yang benar.
 *==========================================================================
 */
function openAssetDetailView(sheetName, row) {
  // 1. Jalankan fungsi load data utama dulu
  openAssetDetail(sheetName, row);

  // 2. Gunakan sedikit jeda (100ms) agar fungsi utama selesai merender, 
  // baru kemudian kita "Sikat" tombol-tombolnya untuk mode View
  setTimeout(function() {
    console.log("🔒 Mengaktifkan Mode Read-Only...");

    // Kunci Input
    document.getElementById('as_nama').readOnly = true;
    document.getElementById('as_lokasi').readOnly = true;
    document.getElementById('as_status').disabled = true;
    
    const btnSave = document.getElementById('btnSaveAsset');
    const btnBatal = document.getElementById('btnCancelAsset');
    const actionArea = document.getElementById('assetActionArea');
    const btnTake = document.querySelector("button[onclick='takeAssetPhoto()']");

    // Sembunyikan Simpan & Baris Foto
    if (btnSave) btnSave.style.display = "none"; 
    if (btnTake && btnTake.parentElement) {
      btnTake.parentElement.style.display = "none"; 
    }

    // Buat Batal jadi Full Width
    if (actionArea) actionArea.style.gridTemplateColumns = "1fr";
    if (btnBatal) {
      btnBatal.style.width = "100%";
      btnBatal.innerHTML = '<i class="fas fa-times"></i> KELUAR';
    }

    // Visual Galeri Read-Only
    const gallery = document.getElementById('as_gallery_box');
    if (gallery) {
      gallery.style.opacity = "1"; 
      gallery.style.pointerEvents = "auto";
      const label = gallery.querySelector('label');
      if (label) label.innerText = "DOKUMENTASI FOTO (VIEW ONLY)";
    }
  }, 200); // 200ms cukup untuk memastikan openAssetDetail sudah jalan
}


/**=========================================================================
 * [variableglobal asset]
 * Menyimpan URL pratinjau foto yang sudah dipilih untuk ditampilkan di slider, serta file asli yang disimpan sementara di laci sebelum disimpan permanen ke Drive.
 * assetImages digunakan untuk slider, sementara temp_Asset_Files digunakan untuk menyimpan file asli yang akan diupload ke Drive saat simpan.
 * Saat user memilih foto baru, kita simpan URL pratinjau di assetImages agar langsung muncul di slider, dan file aslinya kita simpan di temp_Asset_Files untuk nanti diupload ke Drive.
 * Saat user menghapus foto, kita cek apakah itu foto baru (blob URL) atau foto lama (URL Drive). Jika foto baru, kita hapus dari kedua array. Jika foto lama, kita panggil server untuk hapus permanen di Drive dan update assetImages sesuai respon server.
 * Logika ini memastikan bahwa user bisa langsung melihat perubahan di slider saat memilih atau menghapus foto, sekaligus menjaga data file asli yang akan diupload tetap terorganisir di laci sementara.
 * Penting: Pastikan fungsi updateImageSlider sudah benar-benar menggunakan assetImages untuk menampilkan foto di slider agar perubahan langsung terlihat saat user memilih atau menghapus foto.
 *==========================================================================
 */
let assetImages = [];
let currentImgIdx = 0;
let temp_Asset_Files = []; 
const mAX_IMG = 5;

/**=========================================================================
 * [FUNGSI: AMBIL FOTO ASET]
 * Membuka dialog file untuk memilih foto, menyimpan file asli di laci sementara, dan menampilkan pratinjau instan di slider.
 * Logika kuota foto: Cek jumlah foto yang sudah ada di assetImages (yang tampil di slider) sebelum membuka dialog. Jika sudah mencapai mAX_IMG, tampilkan alert dan hentikan proses.
 * Saat user memilih foto, kita simpan file aslinya di temp_Asset_Files untuk nanti diupload ke Drive saat simpan, dan kita buat URL pratinjau untuk langsung ditampilkan di slider dengan menambahkannya ke assetImages. Setelah itu, kita update slider agar user bisa langsung melihat foto yang baru saja dipilih.
 * Pastikan fungsi updateImageSlider sudah benar-benar menggunakan assetImages untuk menampilkan foto di slider agar perubahan langsung terlihat saat user memilih foto baru.
 *==========================================================================
 */
function takeAssetPhoto() {
  // Cek kuota laci
  if (temp_Asset_Files.length >= mAX_IMG) { Swal.fire({title: "Maksimal!",text: "Maksimal " + mAX_IMG + " foto saja!",icon: "warning", confirmButtonText: "OK", width: '80%' });
        return; // Berhenti di sini, tidak lanjut ke proses simpan
     }
  // Buka dialog file dan kedepan menggunakan kamera jika memungkinkan (fitur ini lebih optimal di mobile)
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  
  input.onchange = function() {
    const file = this.files[0];
    if (!file) return;

    // 1. Simpan file asli ke Laci
    temp_Asset_Files.push(file);

    // 2. Buat pratinjau instan untuk Slider
    const pratinjauUrl = URL.createObjectURL(file);
    
    // Kita masukkan ke array assetImages (yang dipakai slider)
    // agar user bisa langsung melihat foto yang baru saja dipilih
    assetImages.push(pratinjauUrl);
    currentImgIdx = assetImages.length - 1; // Geser ke foto terbaru
    
    updateImageSlider();
    console.log("Foto ditambahkan ke laci. Total: " + temp_Asset_Files.length);
  };

  input.click();
}
/**=========================================================================
 * [FUNGSI: HAPUS FOTO ASET]
 * Menghapus foto dari slider dan laci sementara, dengan konfirmasi sebelum menghapus.
 * Logika penghapusan: Cek apakah assetImages kosong sebelum memulai proses. Jika kosong, tampilkan alert dan hentikan proses. Jika tidak, tampilkan konfirmasi. Jika user setuju, cek apakah foto yang akan dihapus adalah foto baru (blob URL) atau foto lama (URL Drive). Jika foto baru, hapus dari kedua array (assetImages dan temp_Asset_Files) dan update slider. Jika foto lama, panggil server untuk hapus permanen di Drive dan update assetImages sesuai respon server.
 * Pastikan fungsi updateImageSlider sudah benar-benar menggunakan assetImages untuk menampilkan foto di slider agar perubahan langsung terlihat saat user menghapus foto.
 *==========================================================================
 */
/**=========================================================================
 * [FUNGSI CLIENT GITHUB: HAPUS FOTO ASET]
 * Menghapus foto sementara di memori browser atau permanen di Google Drive via Fetch POST
 * ==========================================================================
 */
async function deleteAssetPhoto() {
  const iframe = document.getElementById('iframeGAS');
  const urlGAS = iframe.src;

  // 1. VALIDASI AWAL
  if (window.assetImages.length === 0) {
    Swal.fire({ title: "Kosong!", text: "Tidak ada foto untuk dihapus!", icon: "warning", width: '80%' });
    return;
  }

  // 2. KONFIRMASI GAHAR
  const confirmHapus = await Swal.fire({
    title: "Hapus Foto",
    text: "Foto ini akan dihapus dari daftar?",
    icon: "question",
    showCancelButton: true,
    confirmButtonColor: "#d33",
    confirmButtonText: "Ya, Hapus",
    cancelButtonText: "Batal",
    width: '80%'
  });

  if (!confirmHapus.isConfirmed) return;

  const currentUrl = window.assetImages[window.currentImgIdx];

  // --- JALUR A: FOTO BARU (BLOB / LOKAL GITHUB) ---
  if (currentUrl.startsWith("blob:") || currentUrl.startsWith("data:")) {
    // Hapus dari laci temp_Asset_Files
    const offset = window.assetImages.length - window.temp_Asset_Files.length;
    window.temp_Asset_Files.splice(window.currentImgIdx - offset, 1);
    window.assetImages.splice(window.currentImgIdx, 1);
    
    window.currentImgIdx = 0;
    updateImageSlider();
    
    Swal.fire({ title: "Sukses", text: "Pratinjau foto lokal dihapus", icon: "success", width: '80%' });
  } 
  
  // --- JALUR B: FOTO LAMA (PERMANEN DI DRIVE) ---
  else {
    const row = document.getElementById('assetRowIdx').value;
    const type = document.getElementById('as_type').value;

    Swal.fire({ title: 'Menghapus...', text: 'Sik, lagi dibusek di Drive...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });

    try {
      const bodyPayload = {
        action: "removeSpecificAssetPhoto",
        payload: {
          type: type,
          row: row,
          photoUrl: currentUrl
        }
      };

      // Gunakan mode 'no-cors' untuk POST besar, atau CORS standar untuk membaca 'res.all'
      const response = await fetch(urlGAS, {
        method: 'POST',
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify(bodyPayload)
      });
      
      const res = await response.json(); // Mengharapkan {success: true, all: [...]}

      if (res.success) {
        window.assetImages = res.all;
        window.currentImgIdx = 0;
        updateImageSlider();
        Swal.fire({ title: "Sukses", text: "Foto permanen berhasil dihapus dari Drive", icon: "success", width: '80%' });
      }
    } catch (err) {
      console.error("Gagal hapus foto Drive:", err);
      Swal.fire({ title: "Gagal!", text: "Error server saat menghapus foto.", icon: "error", width: '80%' });
    }
  }
}

/**=========================================================================
 * [FUNGSI PEMBANTU: AMBIL QR CODE SEBAGAI BASE64]
 * Mengambil gambar QR dari elemen img, menggambar ulang di canvas untuk mengatasi CORS, lalu mengembalikan data base64 yang siap diupload ke Drive.
 * Logika CORS: Karena gambar QR biasanya berasal dari URL eksternal (misal: API QR), kita tidak bisa langsung mengambil data base64 karena pembatasan CORS. Solusinya adalah dengan membuat elemen Image baru, mengatur crossOrigin ke "Anonymous", lalu menggambar ulang gambar tersebut di canvas. Setelah itu, kita bisa mengambil data base64 dari canvas tanpa terkena CORS.
 * Pastikan fungsi ini dipanggil saat menyimpan aset, dan hasil base64-nya dimasukkan ke payload yang akan dikirim ke server untuk diupload ke Drive.
 *==========================================================================
 */

function getQRCodeBase64() {
  return new Promise((resolve) => {
    const img = document.getElementById('assetQRCode');
    if (!img || !img.src.includes("http")) return resolve(null);

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const newImg = new Image();
    
    newImg.crossOrigin = "Anonymous"; // Hindari CORS error
    newImg.onload = function() {
      canvas.width = newImg.width;
      canvas.height = newImg.height;
      ctx.drawImage(newImg, 0, 0);
      resolve({
        base64: canvas.toDataURL("image/png").split(',')[1],
        mimeType: "image/png"
      });
    };
    newImg.src = img.src;
  });
}

/**=========================================================================
 * [FUNGSI: SIMPAN EDITAN ASET]
 * Mengumpulkan data dari form edit aset, menangani foto baru dan QR code, lalu mengirim semuanya ke server untuk disimpan.
 * Logika simpan: Pertama, kita validasi input ID Aset. Jika kosong, tampilkan alert dan hentikan proses. Kemudian, kita ambil QR code sebagai base64 menggunakan fungsi getQRCodeBase64. Selanjutnya, kita susun payload yang akan dikirim ke server, termasuk data dasar aset, QR code dalam format base64, dan file foto baru yang disimpan di laci sementara. Terakhir, kita kirim payload ini ke server menggunakan google.script.run dengan success dan failure handler untuk menangani respon dari server.
 * Pastikan fungsi ini dipanggil saat user menekan tombol "Simpan Perubahan" di modal edit aset, dan semua data yang diperlukan sudah terisi dengan benar sebelum proses simpan dimulai.
 *==========================================================================
 */

/**=========================================================================
 * [FUNGSI CLIENT GITHUB: SAVE ASSET EDIT & QR]
 * Mengirim data aset, QR Code, dan foto massal via Fetch POST
 * =========================================================================
 */
async function saveAssetEdit() {
  const asId = document.getElementById('as_id').value;
  const type = document.getElementById('as_type').value;
  const row = document.getElementById('assetRowIdx').value;
  const btn = document.getElementById('btnSaveAsset');
  const iframe = document.getElementById('iframeGAS');
  const urlGAS = iframe.src;

  // 1. VALIDASI INPUT
  if (!asId) { 
    await Swal.fire({title: "Input Kosong!", text: "ID Aset tidak boleh kosong!", icon: "warning", width: '80%' });
    return; 
  }

  // 2. PERSIAPAN UI & QR
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = "<i class='fas fa-spinner fa-spin'></i> Menyiapkan QR...";
  }
  
  const qrBlob = await getQRCodeBase64(); // Pastikan fungsi ini sudah ada di GitHub

  // 3. SUSUN DATA UNTUK SPREADSHEET (Kolom A-E)
  const userData = [
    asId, 
    "", // Akan diisi link QR oleh server
    document.getElementById('as_nama').value,
    document.getElementById('as_lokasi').value,
    document.getElementById('as_status').value
  ];

  // 4. SUSUN PAYLOAD LOGIKA SERVER
  let payload = {
    asId: asId,
    type: type,
    row: row,
    qrBase64: qrBlob ? qrBlob.base64 : null,
    adminAktif: window.loggedInUser || "Admin",
    allFiles: [] 
  };

  // 5. PROSES FOTO DARI LACI (temp_Asset_Files)
  if (window.temp_Asset_Files && window.temp_Asset_Files.length > 0) {
    if (btn) btn.innerHTML = "<i class='fas fa-spinner fa-spin'></i> Memproses Foto...";
    try {
      const filePromises = window.temp_Asset_Files.map(file => getBase64(file));
      payload.allFiles = await Promise.all(filePromises);
    } catch (e) {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = "SIMPAN PERUBAHAN";
      }
      await Swal.fire({ title: "Gagal Memproses Foto", text: e.toString(), icon: "error", width: '80%' });
      return;
    }
  }

  // 6. TRANSMISI KE SERVER (POST)
  if (btn) btn.innerHTML = "<i class='fas fa-spinner fa-spin'></i> Mengunggah ke Drive...";

  try {
    const bodyPayload = {
      action: "saveAssetEnterpriseWithQR",
      payload: payload,
      userData: userData
    };

    // Gunakan fetch POST (mode 'no-cors' disarankan untuk payload foto yang sangat besar)
    await fetch(urlGAS, {
      method: 'POST',
      mode: 'no-cors',
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify(bodyPayload)
    });

    // Karena no-cors, kita asumsikan sukses jika tidak ada error network
    await Swal.fire({
      title: "Sukses",
      text: "Data Aset & QR berhasil dikirim ke server Google.",
      icon: "success",
      width: '80%'
    });

    window.temp_Asset_Files = []; 
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = "SIMPAN PERUBAHAN";
    }
    closeAssetModal();
    loadAssetData(type); // Refresh tabel aset

  } catch (err) {
    await Swal.fire({
      title: "Gagal",
      text: "Gagal Mengirim ke Server: " + err.message,
      icon: "error",
      width: '80%'
    });
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = "SIMPAN PERUBAHAN";
    }
  }
}


/**=========================================================================
 * [FUNGSI: DO BULK DELETE USER]
 * Menghapus beberapa aset sekaligus berdasarkan checkbox yang dipilih, dengan konfirmasi sebelum menghapus.
 * Logika penghapusan: Pertama, kita kumpulkan semua checkbox yang dicentang dan ambil nilai row index-nya. Jika tidak ada yang dipilih, tampilkan alert dan hentikan proses. Jika ada yang dipilih, tampilkan konfirmasi dengan jumlah aset yang akan dihapus. Jika user setuju, kita tampilkan modal loading sambil memproses penghapusan di server menggunakan google.script.run. Setelah server merespon, kita tampilkan hasilnya menggunakan Swal dan refresh tabel aset.
 * Pastikan fungsi ini dipanggil saat user menekan tombol "Hapus Terpilih" di halaman Kelola Aset, dan semua checkbox memiliki class 'asetCheck' agar bisa terdeteksi dengan benar.
 *==========================================================================
 */
/**
 * [FUNGSI CLIENT GITHUB: HAPUS ASET MASSAL]
 * Menghapus banyak aset sekaligus dari Spreadsheet & Drive via Fetch POST
 */
async function doBulkDeleteAsset() {
  const type = document.getElementById('assetTypeSelect').value; 
  const iframe = document.getElementById('iframeGAS');
  const urlGAS = iframe.src;
  
  let selected = [];
  document.querySelectorAll('.asetCheck:checked').forEach(cb => selected.push(parseInt(cb.value)));

  // 1. VALIDASI PILIHAN
  if (selected.length === 0) { 
    Swal.fire({ title: "Pilih Dulu!", text: "Pilih aset yang ingin dihapus!", icon: "warning", width: '80%' });
    return; 
  }
 
  // 2. KONFIRMASI GAHAR
  const konfirmasi = await Swal.fire({
    title: "Hapus Asset!",
    text: `⚠️ HAPUS ${selected.length} ASET? \n\nFolder foto dan QR di Drive juga akan dihapus.`,
    icon: "warning", 
    showCancelButton: true,
    confirmButtonColor: "#d33",
    confirmButtonText: "Ya, Hapus!",
    cancelButtonText: "Batal",
    width: '80%'
  });

  if (konfirmasi.isConfirmed) { 
      // 3. TAMPILKAN LOADING
      Swal.fire({
        title: 'Memproses Penghapusan...',
        text: 'Sedang membersihkan database dan Drive, mohon tunggu...',
        allowOutsideClick: false,
        showConfirmButton: false,
        didOpen: () => { Swal.showLoading(); }
      });

      // 4. TRANSMISI KE SERVER (POST)
      try {
        const bodyPayload = {
          action: "deleteSelectedAssets",
          payload: {
            type: type,
            selected: selected,
            admin: window.loggedInUser || "Admin"
          }
        };

        // Menggunakan fetch POST (tanpa no-cors agar bisa menerima balasan teks sukses)
        const response = await fetch(urlGAS, {
          method: 'POST',
          headers: { "Content-Type": "text/plain" },
          body: JSON.stringify(bodyPayload)
        });
        
        const res = await response.text();

        // 5. TAMPILKAN HASIL
        await Swal.fire({
          title: "Terhapus!",
          text: res,
          icon: "success",
          width: '80%'
        });
        
        loadAssetData(type); // Refresh tabel di GitHub

      } catch (err) {
        console.error("Gagal hapus massal:", err);
        Swal.fire("Gagal!", "Server Error: " + err.toString(), "error");
      }
  }
}


/**==========================================================================
 * [FUNGSI CLIENT GITHUB: UPDATE QR MASSAL]
 * Konversi QR ke Base64 secara lokal, lalu kirim borongan ke Server via Fetch POST
 * Logika update massal: Pertama, kita kumpulkan semua checkbox yang dicentang dan ambil nilai row index serta ID Aset-nya. Jika tidak ada yang dipilih, tampilkan alert dan hentikan proses. Jika ada yang dipilih, tampilkan konfirmasi dengan jumlah aset yang akan diproses. Jika user setuju, kita tampilkan modal loading sambil memproses konversi QR ke Base64 secara lokal untuk setiap aset yang dipilih. Setelah semua QR berhasil dikonversi, kita kirim data borongan ke server menggunakan Fetch POST. Setelah server merespon, kita tampilkan hasilnya menggunakan Swal dan refresh tabel aset.
 * Pastikan fungsi ini dipanggil saat user menekan tombol "Update QR Massal" di halaman Kelola Aset, dan semua checkbox memiliki class 'asetCheck' agar bisa terdeteksi dengan benar. Juga pastikan fungsi generateVirtualQR sudah benar-benar berjalan untuk mengkonversi QR ke Base64 secara lokal.
 *==========================================================================
 */
async function bulkUpdateQR() {
  const type = document.getElementById('assetTypeSelect').value;
  const iframe = document.getElementById('iframeGAS');
  const urlGAS = iframe.src;
  let selected = [];
  
  // 1. AMBIL ASET YANG DICENTANG
  document.querySelectorAll('.asetCheck:checked').forEach(cb => {
    const row = cb.closest('tr');
    selected.push({
      rowIdx: cb.value,
      asId: row.cells[1].innerText.trim() 
    });
  });

  if (selected.length === 0) {
    return Swal.fire({ title: "Pilih aset dulu!", icon: "info", width: '80%' });
  }

  // 2. KONFIRMASI GAHAR
  const konfirmasi = await Swal.fire({
    title: "Update QR Massal",
    text: `Proses ${selected.length} aset sekaligus?`,
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Ya, Proses",
    width: '80%'
  });

  if (konfirmasi.isConfirmed) {
    Swal.fire({
      title: 'Menyiapkan Data...',
      html: '<b id="progress-text">Konversi QR: 0%</b>',
      allowOutsideClick: false,
      didOpen: () => { Swal.showLoading(); }
    });

    try {
      const bulkData = [];
      for (let i = 0; i < selected.length; i++) {
        // Update teks progres di modal (Real-time)
        const progressVal = Math.round(((i + 1) / selected.length) * 100);
        document.getElementById('progress-text').innerText = `Konversi QR: ${progressVal}% (${i+1}/${selected.length})`;
        
        const item = selected[i];
        const code = type + "-" + item.asId;
        const qrApiUrl = `https://api.qrserver.com{encodeURIComponent(code)}&size=150x150`;
        
        // Konversi ke Base64 (Fungsi virtual QR Anda)
        const qrBase64 = await generateVirtualQR(qrApiUrl);
        
        bulkData.push({
          asId: item.asId,
          row: item.rowIdx,
          qrBase64: qrBase64
        });
      }

      // 3. KIRIM BORONGAN KE SERVER (POST)
      document.getElementById('progress-text').innerText = "Mengirim ke Database...";
      
      const bodyPayload = {
        action: "saveBulkQR_Optimized",
        payload: {
          bulkData: bulkData,
          admin: window.loggedInUser || "Admin",
          type: type
        }
      };

      const response = await fetch(urlGAS, {
        method: 'POST',
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify(bodyPayload)
      });
      
      const res = await response.text();

      await Swal.fire({ title: "Sukses", text: res, icon: "success", width: '80%' });
      loadAssetData(type); 

    } catch (err) {
      console.error("Gagal Bulk Update QR:", err);
      Swal.fire({ title: "Error", text: "Gagal memproses QR: " + err.toString(), icon: "error" });
    }
  }
}


/**=========================================================================
 * HELPER: GENERATE QR BASE64 (Safe for CORS)
 * ==========================================================================
 */
function generateVirtualQR(url) {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    // Penting untuk menghindari security error saat toDataURL
    img.crossOrigin = "Anonymous"; 
    
    img.onload = function() {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      // Ambil data murni base64 (setelah tanda koma)
      resolve(canvas.toDataURL("image/png").split(',')[1]); 
    };
    
    img.onerror = () => reject("Gagal memuat gambar QR dari API");
    img.src = url;
  });
}


/**=========================================================================
 * [FUNGSI: UPDATE SLIDER - ANTI ERROR URL & RAMAH BLOB]
 * Memperbarui gambar di slider dengan logika khusus untuk menangani URL foto yang berasal dari Drive (http/lh3) dan foto baru yang masih berupa blob URL.
 * Logika URL: Jika URL foto berasal dari Drive (http/lh3), kita tambahkan timestamp sebagai query parameter untuk memastikan gambar selalu refresh dan tidak cache. Jika URL foto adalah blob URL (foto baru yang belum disimpan ke Drive), kita tampilkan langsung tanpa menambahkan timestamp agar tidak terjadi error karena blob URL tidak bisa diproses dengan query parameter.
 * Pastikan fungsi ini dipanggil setiap kali assetImages diperbarui, agar perubahan foto langsung terlihat di slider dengan logika yang benar untuk setiap jenis URL.
 *==========================================================================
 */
function updateImageSlider() {
  const imgEl = document.getElementById('currAssetImg');
  if (!imgEl) return;

  // 1. Jika ada foto di array assetImages
  if (assetImages.length > 0 && assetImages[currentImgIdx]) {
    let rawUrl = assetImages[currentImgIdx].trim();

    // LOGIKA PERBAIKAN:
    if (rawUrl.startsWith("blob:")) {
      // JIKA BLOB: Langsung tampilkan tanpa timestamp agar tidak ERROR
      imgEl.src = rawUrl;
    } else {
      // JIKA DARI DRIVE (http/lh3): Tambahkan timestamp agar gambar selalu refresh
      // Pastikan membersihkan tanda tanya lama jika ada
      imgEl.src = rawUrl.split('?')[0] + "?t=" + Date.now();
    }
    
    imgEl.style.opacity = "1";
  } 
  // 2. Jika Kosong, gunakan URL Placeholder
  else {
    imgEl.src = "https://lh3.googleusercontent.com/d/13Q4RtDMmEMVvErifoZOa_yKiAACUpg7a=s1000";
    imgEl.style.opacity = "1";
  }
}

/**=========================================================================
 * [FUNGSI: NAVIGASI FOTO ASET]
 * Memungkinkan user untuk melihat foto aset lainnya jika ada lebih dari satu, dengan logika navigasi yang melingkar (circular).
 * Logika navigasi: Saat user menekan tombol "Next", kita cek apakah assetImages memiliki foto. Jika ya, kita geser indeks ke kanan (currentImgIdx + 1) dan gunakan modulus untuk membuatnya mel
 * ingkar ke awal jika sudah mencapai akhir. Saat user menekan tombol "Previous", kita geser indeks ke kiri (currentImgIdx - 1) dan tambahkan panjang array sebelum modulus untuk memastikan hasilnya tetap positif dan melingkar ke akhir jika sudah melewati awal. Setelah mengubah indeks, kita panggil updateImageSlider untuk memperbarui gambar yang ditampilkan sesuai dengan indeks baru.
 * Pastikan fungsi updateImageSlider sudah benar-benar menggunakan currentImgIdx untuk menampilkan foto yang sesuai di slider agar navigasi berjalan dengan lancar.
 *==========================================================================
 */
function nextAssetImg() {
  if (assetImages.length > 0) {
    currentImgIdx = (currentImgIdx + 1) % assetImages.length;
    updateImageSlider();
  }
}

/**=========================================================================
 * [FUNGSI: NAVIGASI FOTO ASET - PREVIOUS]
 * Memungkinkan user untuk melihat foto aset sebelumnya dengan logika navigasi yang melingkar (circular).
 * Logika navigasi: Saat user menekan tombol "Previous", kita cek apakah assetImages memiliki foto. Jika ya, kita geser indeks ke kiri (currentImgIdx - 1) dan tambahkan panjang array sebelum modulus untuk memastikan hasilnya tetap positif dan melingkar ke akhir jika sudah melewati awal. Setelah mengubah indeks, kita panggil updateImageSlider untuk memperbarui gambar yang ditampilkan sesuai dengan indeks baru.
 * Pastikan fungsi updateImageSlider sudah benar-benar menggunakan currentImgIdx untuk menampilkan foto yang sesuai di slider agar navigasi berjalan dengan lancar.
 *==========================================================================
 */
function prevAssetImg() {
  if (assetImages.length > 0) {
    currentImgIdx = (currentImgIdx - 1 + assetImages.length) % assetImages.length;
    updateImageSlider();
  }
}


/**=========================================================================
 * [FUNGSI: TUTUP MODAL ASET]
 * Menutup modal detail aset dan mereset tampilan serta input ke mode default (Edit Mode) untuk memastikan siap digunakan kembali saat membuka aset lain.
 * Logika reset: Saat menutup modal, kita pastikan untuk mengembalikan semua input ke mode edit (readOnly = false, disabled = false), menampilkan kembali tombol simpan, dan mengatur ulang tata letak grid jika sebelumnya diubah untuk mode view. Dengan cara ini, setiap kali modal dibuka, user akan selalu memulai dengan tampilan yang konsisten dan siap untuk diedit tanpa harus khawatir tentang sisa state dari aset sebelumnya.
 * Pastikan fungsi ini dipanggil saat user menekan tombol "Batal/Keluar" di modal detail aset, agar modal benar-benar tertutup dan siap untuk digunakan kembali dengan tampilan default.
 *==========================================================================
 */
function closeAssetModal() {
  document.getElementById('assetDetailModal').style.display = 'none';

  const btnSave = document.getElementById('btnSaveAsset');
  const btnBatal = document.getElementById('btnCancelAsset');
  const actionArea = document.getElementById('assetActionArea');

  // Balikkan Grid ke 2 kolom (Admin Mode)
  if (actionArea) actionArea.style.gridTemplateColumns = "1fr 1fr";
  if (btnSave) btnSave.style.display = "block";
  if (btnBatal) {
    btnBatal.style.width = "";
    btnBatal.innerHTML = '<i class="fas fa-times"></i> BATAL/KELUAR';
  }

  // Balikkan input ke mode Edit
  document.getElementById('as_nama').readOnly = false;
  document.getElementById('as_lokasi').readOnly = false;
  document.getElementById('as_status').disabled = false;

  // --- BUKA/RESET KUNCI DI SINI ---
  const gallery = document.getElementById('as_gallery_box');
  if (gallery) {
    gallery.style.opacity = "1";
    gallery.style.pointerEvents = "auto";
    const label = gallery.querySelector('label');
    if (label) label.innerText = "KELOLA FOTO ASET";
  }
}

