/**
 * [FUNGSI CLIENT: LOAD AUDIT LOGS]
 * Memuat riwayat aktivitas terbaru ke dalam tabel UI
 */
function loadAuditLogs() {
  const logContainer = document.getElementById('logTableBody'); 
  if (!logContainer) return;

  // Tampilkan loading spinner yang lebih manis
  logContainer.innerHTML = `<tr><td colspan="3" class="text-center">
    <i class="fas fa-spinner fa-spin"></i> Memuat log terbaru...</td></tr>`;

  google.script.run
    .withSuccessHandler(function(logs) {
      if (logs.length === 0) {
        logContainer.innerHTML = "<tr><td colspan='3' class='text-center text-muted'>Belum ada aktivitas tercatat.</td></tr>";
        return;
      }

      let html = "";
      logs.forEach(log => {
        html += `
          <tr>
            <td style="font-size: 11px; color: #888; white-space: nowrap;">${log.timestamp}</td>
            <td style="font-weight: bold; font-size: 13px;">${log.pic}</td>
            <td style="font-size: 12px; color: #444;">${log.action}</td>
          </tr>
        `;
      });
      logContainer.innerHTML = html;
    })
    .withFailureHandler(async function(err) {
      console.error("Gagal memuat log:", err);
      logContainer.innerHTML = "<tr><td colspan='3' class='text-danger text-center'>Gagal memuat data.</td></tr>";
      
      // Berikan notifikasi jika error berlanjut
      await Swal.fire({
        title: "Gagal Memuat Log",
        text: "Terjadi gangguan koneksi saat mengambil riwayat aksi.",
        icon: "error",
        width: '80%'
      });
      //activateFullscreen();
    })
    .getLatestLogs();
}


/**
 * [FUNGSI CLIENT: BACKUP & ARCHIVE LOGS]
 * Mengarsipkan riwayat aksi ke file baru dan mengosongkan database utama
 */
function backupLogSekarang() {
  Swal.fire({
    title: "Backup Logs!",
    text: "Arsip dan kosongkan LOG sekarang? Tindakan ini akan membuat file spreadsheet baru dan tidak dapat dibatalkan.",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#28a745", // Hijau lebih cocok untuk proses Backup
    confirmButtonText: "Ya, Arsipkan",
    cancelButtonText: "Batal",
    width: '80%'
  }).then((result) => {               
    //activateFullscreen();  

    if (result.isConfirmed) {
      // Modal Loading (Muncul tepat setelah konfirmasi "Ya")
      Swal.fire({
        title: 'Memproses Backup...',
        text: 'Membuat file arsip di Drive, mohon tunggu...',
        allowOutsideClick: false,
        showConfirmButton: false,
        didOpen: () => { Swal.showLoading(); }
      });

      google.script.run
        .withSuccessHandler(async (msg) => {
          // Ganti alert(msg) dengan modal sukses
          await Swal.fire({
            title: "Arsip Berhasil",
            text: msg,
            icon: "success",
            width: '80%'
          });
          //activateFullscreen();
        })
        .withFailureHandler(async (err) => {
          await Swal.fire({
            title: "Gagal Backup",
            text: "Terjadi gangguan: " + err,
            icon: "error",
            width: '80%'
          });
          //();
        })
        .archiveLogs();
    }
  });
}

/**
 * [FUNGSI CLIENT: HAPUS LOGS]
 * Mengosongkan riwayat aktivitas di database
 */
function hapusLog() {
  Swal.fire({
    title: "Kosongkan Logs?",
    text: "PERINGATAN: Semua riwayat aksi akan dihapus permanen dari database. Lanjutkan?",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#d33",
    confirmButtonText: "Ya, Hapus Semua",
    cancelButtonText: "Batal",
    width: '80%'
  }).then((result) => {  
    
    // Pastikan Fullscreen aktif setelah modal konfirmasi tutup
    //activateFullscreen();    

    if (result.isConfirmed) {
      // Tampilkan loading saat proses penghapusan di server
      Swal.fire({
        title: 'Membersihkan...',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); }
      });

      google.script.run
        .withSuccessHandler(async (res) => {
          // Ganti alert(res) dengan modal sukses
          await Swal.fire({
            title: "Selesai",
            text: res,
            icon: "success",
            width: '80%'
          });
          activateFullscreen();
        })
        .withFailureHandler(async (err) => {
          await Swal.fire({
            title: "Gagal",
            text: "Terjadi kesalahan: " + err,
            icon: "error",
            width: '80%'
          });
          //activateFullscreen();
        })
        .clearLogsOnly();
    }
  });
}