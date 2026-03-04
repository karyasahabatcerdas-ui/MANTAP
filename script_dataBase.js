function checkDBStatus() {
  const statusEl = document.getElementById('db_connection_status');
  if (statusEl) statusEl.innerHTML = "Memeriksa koneksi...";

  google.script.run
    .withSuccessHandler(function(res) {
      if (res.success) {
        statusEl.innerHTML = `<span style="color:green;">✅ Terhubung ke: ${res.name} (${res.totalSheets} tab)</span>`;
      } else {
        statusEl.innerHTML = `<span style="color:red;">❌ ${res.message}</span>`;
      }
    })
    .checkMainDatabaseConnection();
}


function inspectDatabase() {
  console.log("Memulai inspeksi database...");
  
  google.script.run.withSuccessHandler(function(res) {
    if (res.success) {
      let msg = "Database Terdeteksi: " + res.fileName + "\n\n";
      res.sheets.forEach(s => {
        msg += `- Tab: ${s.name} (${s.rows} baris) [${s.isHidden ? 'Hidden' : 'Visible'}]\n`;
      });
      alert(msg);
    } else {
      alert("❌ Gagal akses DB: " + res.message);
    }
  }).getPhysicalDatabaseInfo();
}

function loadDBComparison() {
  const container = document.getElementById('dbTableBody');
  if (container) container.innerHTML = "<tr><td colspan='4'>Memeriksa integritas...</td></tr>";

  google.script.run
    .withSuccessHandler(function(res) {
      if (!res.success) return alert(res.message);
      
      let html = "";
      res.data.forEach(item => {
        // Tentukan warna label status
        let badgeColor = item.exists ? "#27ae60" : "#e74c3c";
        let rowStyle = item.remark.includes("Mati") ? "background:#fdf2f2;" : "";

        html += `
          <tr style="${rowStyle}">
            <td style="font-weight:bold;">${item.name}</td>
            <td style="text-align:center;">${item.status}</td>
            <td style="text-align:center;">
              <span style="background:${badgeColor}; color:white; padding:2px 8px; border-radius:10px; font-size:10px;">
                ${item.exists ? "FISIK ADA" : "TIDAK ADA"}
              </span>
            </td>
            <td>
              ${!item.exists && item.status === "Y" ? 
                `<button onclick="repairSheet('${item.name}')" style="background:#f39c12; color:white; border:none; padding:4px 8px; border-radius:4px; cursor:pointer; font-size:11px;">
                  <i class="fas fa-tools"></i> Repair (Buat Tab)
                </button>` : 
                `<span style="color:#7f8c8d; font-size:11px;">${item.remark}</span>`
              }
            </td>
          </tr>`;
      });
      container.innerHTML = html;
    })
    .getDatabaseComparison();
}

function repairSheet(typeName) {
  if (confirm("Buat ulang tab '" + typeName + "'? Data lama mungkin hilang jika tab benar-benar dihapus.")) {
    google.script.run.withSuccessHandler(function(res) {
      alert(res);
      loadDBComparison(); // Refresh tabel
    }).syncDatabaseSchema(); // Memanggil fungsi sync yang sudah kita buat
  }
}

function runSyncJadwal() {
  const btn = event.target;
  const originalText = btn.innerHTML;
  
  btn.disabled = true;
  btn.innerHTML = "<i class='fas fa-spinner fa-spin'></i> Sinkronisasi...";

  google.script.run
    .withSuccessHandler(function(res) {
      alert(res);
      btn.disabled = false;
      btn.innerHTML = originalText;
      if (typeof loadJad === 'function') loadJad(); // Refresh tabel jadwal
    })
    .syncAssetToJadwal(loggedInUser);
}


/**
 * [FUNGSI: TAMBAH TIPE ASET DARI UI]
 */
function addNewTypeAsset() {
  const idType = document.getElementById('new_type_id').value.trim();
  const typeName = document.getElementById('new_type_name').value.trim();

  if (!idType || !typeName) return alert("ID dan Nama Tipe harus diisi!");
  if (idType.length > 2) return alert("ID Type disarankan maksimal 2 karakter (Misal: L, AC, M)");

  const btn = event.target;
  const originalText = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = "<i class='fas fa-spinner fa-spin'></i> Memproses...";

  const payload = {
    idType: idType,
    typeName: typeName,
    adminAktif: loggedInUser
  };

  google.script.run
    .withSuccessHandler(function(res) {
      alert(res);
      btn.disabled = false;
      btn.innerHTML = originalText;
      
      // Kosongkan form
      document.getElementById('new_type_id').value = "";
      document.getElementById('new_type_name').value = "";
      
      // Muat ulang tabel komparasi dan dropdown tipe
      if (typeof loadDBComparison === 'function') loadDBComparison();
      if (typeof loadAssetTypes === 'function') loadAssetTypes(); 
    })
    .withFailureHandler(function(err) {
      alert("Error: " + err.message);
      btn.disabled = false;
      btn.innerHTML = originalText;
    })
    .addNewTypeRegistry(payload);
}

/**
 * [FUNGSI: EKSEKUSI TAMBAH TIPE DARI UI]
 */
function execAddType() {
  const idType = document.getElementById('new_type_id').value.trim();
  const typeName = document.getElementById('new_type_name').value.trim();
  
  if (!idType || !typeName) return alert("Isi ID dan Nama Tipe!");

  const btn = event.target;
  btn.disabled = true;
  btn.innerHTML = "<i class='fas fa-spinner fa-spin'></i> Memproses Database...";

  const payload = {
    idType: idType,
    typeName: typeName,
    adminAktif: loggedInUser
  };

  google.script.run
    .withSuccessHandler(function(res) {
      alert(res);
      btn.disabled = false;
      btn.innerHTML = "<i class='fas fa-plus'></i> Tambah";
      
      // Reset Input
      document.getElementById('new_type_id').value = "";
      document.getElementById('new_type_name').value = "";
      
      // Muat ulang tabel komparasi agar terlihat perubahannya
      if (typeof loadDBComparison === 'function') loadDBComparison();
    })
    .addNewTypeRegistry(payload);
}