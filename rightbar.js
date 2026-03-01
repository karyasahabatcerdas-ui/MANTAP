/*================================
* [FUNGSI: START MAINTENANCE MODE]
* variable global untuk menyimpan data aset yang sedang di-maintenance
* agar bisa diakses di berbagai fungsi tanpa harus terus menerus mengambil dari DOM
* ================================
*/
window.currentMaintData = null; // { maint_id, as_id, nama_aset, lokasi, jenis_jadwal }
tempPhotos = { PB: [], PO: [], PA: [], PC: [] }; // Menyimpan foto sementara sebelum submit



/**================================
 * [FUNGSI CLIENT: START MAINTENANCE MODE]
 * Membuka modal dan mengunci semua input sampai data aset tervalidasi
 * ================================
 */
function startMaintenanceMode() {
  const modal = document.getElementById('modalMaintenanceLog');
  if (!modal) return;
 
  // 1. Bersihkan sisa data sebelumnya
  resetLogModalTotal();

  // 2. --- LOCKDOWN SEMUA INPUT (SISTEM GEMBOK) ---
  const toLock = ['log_pekerjaan', 'btn_PB', 'btn_PO', 'btn_PA', 'btn_PC', 'btnLogPending', 'btnLogSelesai', 'jenis_id_jadwal'];
  toLock.forEach(id => {
    const el = document.getElementById(id);
    if(el) {
      el.style.pointerEvents = "none"; 
      el.style.opacity = "0.4"; // Indikator visual terkunci
    }
  });

  // 3. Buka Modal & Kunci Fullscreen
  modal.style.display = 'block';
  //activateFullscreen();
}

/**================================
 * [FUNGSI: RESET TOTAL INPUT MODAL LOG]
 * Membersihkan semua data sisa agar tidak menumpuk di sesi berikutnya
 * ================================
 */
function resetLogModalTotal() {

  if (update_man_status === false) {
    // --- MODE INPUT BARU: Reset Total Semua Elemen ---
    
    // 1. Bersihkan Hidden & Input Fields
    const ids = ['log_maint_id', 'log_as_id', 'log_time_mulai', 'log_pekerjaan', 'log_pending'];
    ids.forEach(id => {
      const el = document.getElementById(id);
      if(el) el.value = "";
    });

    // 2. Bersihkan Teks Display UI
    const texts = ['log_ui_type', 'log_ui_asid', 'log_ui_nama', 'log_ui_lokasi', 'log_as_id'];
    texts.forEach(id => {
      const el = document.getElementById(id);
      if(el) el.innerText = "-";
    });

    // 3. Bersihkan Metadata Async & Array Foto
    window.currentMaintData = null; // Hapus jejak ID Aset & DateTag Server
    resetTempPhotos(); // Memastikan PB, PO, PA, PC kembali kosong []

  } else {
    // --- MODE UPDATE (PENDING): Hanya Reset Input Kerja & Waktu ---
    const ids = ['log_time_mulai', 'log_pekerjaan'];
    ids.forEach(id => {
      const el = document.getElementById(id);
      if(el) el.value = "";
    });
    
    // Tetap bersihkan metadata agar fresh saat mulai dokumentasi ulang
    window.currentMaintData = null;
  }

  // Pastikan UI kembali terkunci (Gembok) jika modal ditutup
  console.log("🧹 UI Cleaned & Metadata Reset.");
}

/**=====================================
 * [FUNGSI PEMBANTU: RESET FOTO]
 * =====================================
 */
function resetTempPhotos() {
  tempPhotos = { PB: [], PO: [], PA: [], PC: [] };
  // Reset juga tampilan tombol ke Oranye Enterprise
  ['PB', 'PO', 'PA', 'PC'].forEach(cat => resetSingleCategoryUI(cat));
}

/**==============================
 * [FUNGSI: RESET UI TOMBOL FOTO]
 * Mengembalikan tampilan tombol ke kondisi awal (Oranye)
 * ==============================
 */
function resetSingleCategoryUI(cat) {
  const btn = document.getElementById(`btn_${cat}`);
  if (!btn) return;

  // Balikkan ke Skema Warna Enterprise (Oranye)
  btn.style.background = "#fffaf5";
  btn.style.borderColor = "#e67e22";
  btn.style.color = "#d35400";
  
  // Penentuan Icon & Judul berdasarkan Kategori
  let icon = 'camera';
  let title = '';
  
  switch(cat) {
    case 'PB': icon = 'camera'; title = 'PHOTO BEFORE (PB)'; break;
    case 'PO': icon = 'tools'; title = 'PHOTO ON WORK (PO)'; break;
    case 'PA': icon = 'check-double'; title = 'PHOTO AFTER (PA)'; break;
    case 'PC': icon = 'clipboard-list'; title = 'CHECKSHEET (PC)'; break;
  }
  
  const maks = (cat === 'PC') ? '1' : '3';
  
  btn.innerHTML = `
    <div id="prev_${cat}">
      <i class="fas fa-${icon}"></i><br>
      <b>${title}</b><br>
      <small>Maks ${maks} Foto</small>
    </div>`;
  
  // Hapus thumb area secara total
  const thumb = document.getElementById(`thumb_area_${cat}`);
  if (thumb) thumb.remove();
}
