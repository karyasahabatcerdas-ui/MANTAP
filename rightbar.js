/*================================
* [FUNGSI: START MAINTENANCE MODE]
* variable global untuk menyimpan data aset yang sedang di-maintenance
* agar bisa diakses di berbagai fungsi tanpa harus terus menerus mengambil dari DOM
* ================================
*/
window.currentMaintData = null; // { maint_id, as_id, nama_aset, lokasi, jenis_jadwal }
tempPhotos = { PB: [], PO: [], PA: [], PC: [] }; // Menyimpan foto sementara sebelum submit
update_man_status = false; // Menandakan apakah sedang dalam mode UPDATE (Pending) atau INPUT Baru



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
        'log_pekerjaan', 
        'btn_PB', 'btn_PO', 'btn_PA', 'btn_PC', 
        'btnLogPending', 'btnLogSelesai', 
        'jenis_id_jadwal'
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
    modal.style.pointerEvents = "auto"; // Pastikan modal bisa diinteraksi (untuk tombol close)
    modal.style.opacity = "1"; // Pastikan modal terlihat jelas 
    modal.style.display = 'flex'; // Tampilkan modal dengan flex untuk responsif
    modal.style.display = 'block';
    
    // 4. Logika Otomatis: Langsung arahkan ke Scanner atau Pencarian Manual
    console.log("🛠️ Maintenance Mode: Aktif. Menunggu validasi Unit ID...");
    console.log("Z-Index Terdeteksi:", computedStyle.zIndex);
    console.log("Display Terdeteksi:", computedStyle.display);

    // Optional: Auto-scroll ke atas jika modal sangat panjang
    modal.scrollTop = 0;
}

/**==============================
 * MEMBUKA GEMBOK FORM
 * Dipanggil setelah Unit ID tervalidasi
 * ===============================
 */
function unlockMaintenanceForm() {
    const toUnlock = [
        'log_pekerjaan', 'btn_PB', 'btn_PO', 'btn_PA', 'btn_PC', 
        'btnLogPending', 'btnLogSelesai', 'jenis_id_jadwal'
    ];

    toUnlock.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            if (el.disabled) el.disabled = false;
            el.classList.remove('maint-locked');
            el.style.pointerEvents = "auto";
            el.style.opacity = "1";
            
            // Berikan efek flash hijau sedikit saat terbuka (Industrial Feel)
            el.style.transition = "0.5s";
            el.style.boxShadow = "0 0 10px rgba(5, 150, 105, 0.4)";
            setTimeout(() => el.style.boxShadow = "none", 1000);
        }
    });
    
    console.log("🔓 Form Maintenance dibuka. Silakan lanjutkan pengisian.");
}

/**================================
 * [FUNGSI: RESET TOTAL INPUT MODAL LOG]
 * Membersihkan semua data sisa agar tidak menumpuk di sesi berikutnya
 * ================================
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

/**=====================================
 * [FUNGSI PEMBANTU: RESET FOTO]
 * Membersihkan array penyimpanan foto dan mereset UI
 * =====================================
 */
function resetTempPhotos() {
  // Reset array penyimpanan global
  window.tempPhotos = { PB: [], PO: [], PA: [], PC: [] };
  
  // Reset tampilan setiap tombol kategori
  ['PB', 'PO', 'PA', 'PC'].forEach(cat => resetSingleCategoryUI(cat));
  
  console.log("📸 Photo buffers cleared.");
}

/**==============================
 * [FUNGSI: RESET UI TOMBOL FOTO]
 * Mengembalikan tampilan tombol ke kondisi awal (Industrial Neon)
 * ==============================
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
/**================================
* [FUNGSI: CLOSE MAINTENANCE MODE]
* Membersihkan UI dan Reset Data Sementara
* ================================  
*/
function closeMaintenanceMode() {
  const modal = document.getElementById('modalMaintenanceLog');
  const btnSelesai = document.getElementById('btnLogSelesai');
  const btnPending = document.getElementById('btnLogPending');
  
  // Reset Global State
  window.update_man_status = false; 

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