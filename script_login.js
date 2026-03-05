
function login() {
    // Gunakan try-catch agar jika satu ID tidak ketemu, yang lain tidak mati
    try {
        // 1. UI Reset - Pastikan ID loginOverlay ada di HTML
        const overlay = document.getElementById('loginOverlay');
        if (overlay) overlay.style.display = 'none';

        // 2. Load Data dari Server (GitHub to GAS)
        initAllJadwalDropdowns();
        initAssetDropdowns();
        loadAssetTypes();

        // 3. Navigasi
        showPage('history');

        // 4. Identity Management
        let loggedInUser = "ujicoba"; 
        let userRole = "admin"; 
        
        const leftbar = document.getElementById('leftbar');
        if (leftbar) leftbar.classList.remove('collapsed');

        const headerUser = document.getElementById('headerUser');
        if (headerUser) {
            // Pastikan variabel 'u' (username) sudah didefinisikan sebelumnya
            headerUser.innerText = loggedInUser + " (" + userRole + ")";
        }

        console.log("✅ Login Success & UI Initialized.");

    } catch (error) {
        console.error("❌ Error saat login initialization:", error);
    }
}

// EKSEKUSI SAAT SEMUA SIAP
window.onload = function() {
    // Jika ingin langsung login otomatis saat refresh (untuk dev):
    // login(); 
    
    // Atau pasang listener ke form login asli
    console.log("🖥️ System Ready.");
};
/**=========================================================
 * Mengisi SEMUA Dropdown ID Jadwal via Fetch (GitHub Mode)
 * ============================================================
 */
async function initAllJadwalDropdowns() {
  const ids = ["filterJadwalLog", "jenis_id_jadwal", "maint_id_jadwal"];
  
  // Ambil URL GAS dari elemen atau variabel global
  const urlGAS = document.getElementById('iframeGAS') ? document.getElementById('iframeGAS').src : "URL_WEBAPP_KAMU_DISINI";

  // 1. Loading State
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = '<option value="" disabled selected>⏳ Syncing...</option>';
  });

  try {
    // 2. Eksekusi Fetch ke doGET
    const response = await fetch(`${urlGAS}?action=getJadwalList`);
    const list = await response.json();

    // 3. Mapping Teks Default
    const defaults = {
      "filterJadwalLog": "Semua Jadwal",
      "jenis_id_jadwal": "Pilih Jenis",
      "maint_id_jadwal": "Pilih Jadwal"
    };

    let optionsHtml = "";
    if (list && list.length > 0) {
      optionsHtml = list.map(item => 
        `<option value="${item.id}">${item.id} - ${item.nama}</option>`
      ).join('');
    }

    // 4. Update Dropdowns
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        const defaultText = defaults[id] || "Pilih Opsi";
        el.innerHTML = `<option value="">-- ${defaultText} --</option>` + optionsHtml;
      }
    });

    console.log("🚀 Jadwal Synchronized via GitHub Fetch!");

  } catch (err) {
    console.error("❌ Gagal Fetch Jadwal:", err);
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = '<option value="">⚠️ Server Error</option>';
    });
  }
}

/**========================================================================
 * Mengambil data dari 3 sheet db_asset dan mengisi dropdown masing-masing
 * ========================================================================
 */
async function initAssetDropdowns() {
  const urlGAS = document.getElementById('iframeGAS').src;
  
  // ID elemen dropdown di HTML Señor (sesuaikan jika namanya berbeda)
  const elements = {
    filterTgl: document.getElementById('filter_tanggal'), 
    statusMaint: document.getElementById('filterStatusLog'),
    statusMaint: document.getElementById('filterStateJadwal'),
    statusAsset: document.getElementById('filter_status_asset')
  };

  // 1. Set Loading Status
  Object.values(elements).forEach(el => {
    if (el) el.innerHTML = '<option value="">⏳ Loading...</option>';
  });

  try {
    // 2. Satu kali Fetch untuk semua data (Efisien!)
    const response = await fetch(`${urlGAS}?action=getAssetDropdowns`);
    const data = await response.json();

    // 3. Fungsi pembantu untuk merender opsi
    const renderOptions = (el, list, defaultText) => {
      if (!el) return;
      let html = `<option value="">-- ${defaultText} --</option>`;
      if (list && list.length > 0) {
        html += list.map(item => `<option value="${item.id}">${item.nama}</option>`).join('');
      }
      el.innerHTML = html;
    };

    // 4. Tebarkan data ke masing-masing dropdown
    renderOptions(elements.filterTgl, data.filterTgl, "Pilih Tanggal");
    renderOptions(elements.statusMaint, data.statusMaint, "Status Maintenance");
    renderOptions(elements.statusAsset, data.statusAsset, "Status Aset");

    console.log("✅ Asset Dropdowns Synchronized via single fetch.");

  } catch (err) {
    console.error("❌ Gagal Fetch Dropdown Asset:", err);
    Object.values(elements).forEach(el => {
      if (el) el.innerHTML = '<option value="">⚠️ Error Load</option>';
    });
  }
}