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