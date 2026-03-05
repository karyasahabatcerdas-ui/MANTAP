
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
    login(); 
    
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
  const urlGAS = APPSCRIPT_URL;

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
  const urlGAS = APPSCRIPT_URL;
  
  // GUNAKAN NAMA KEY YANG BERBEDA
  const elements = {
    elTgl: document.getElementById('sortJadwal'), 
    elLog: document.getElementById('filterStatusLog'),   // Nama unik
    elJadwal: document.getElementById('filterStateJadwal'), // Nama unik
    elAsset: document.getElementById('as_status')
  };

  // 1. Set Loading Status (Ini akan bekerja karena semua key unik)
  Object.values(elements).forEach(el => {
    if (el) el.innerHTML = '<option value="">⏳ Loading...</option>';
  });

  try {
    const response = await fetch(`${urlGAS}?action=getAssetDropdowns`);
    const data = await response.json();

    const renderOptions = (el, list, defaultText) => {
      if (!el) return;
      let html = `<option value="">-- ${defaultText} --</option>`;
      if (list && list.length > 0) {
        html += list.map(item => `<option value="${item.id}">${item.nama}</option>`).join('');
      }
      
      el.innerHTML = html;
      console.log("Mengisi elemen ID: " + el.id, "dengan HTML: ", html);
    };

    // 4. Tebarkan data menggunakan KEY yang sudah unik tadi
    renderOptions(elements.elTgl, data.filterTgl, "Pilih Tanggal");
    renderOptions(elements.elLog, data.statusMaint, "Status Log");    // Mengisi filterStatusLog
    renderOptions(elements.elJadwal, data.statusMaint, "Status Jadwal"); // Mengisi filterStateJadwal
    renderOptions(elements.elAsset, data.statusAsset, "Status Aset");

    console.log("data dari fetch untuk dropdown filtertgl;"+ elements.filterTgl);
    console.table(data.filterTgl);

    console.log("data dari fetch untuk dropdown status log dan jadwal maint;"+elements.statusMaint );
    console.table(data.statusMaint);

     console.log("data dari fetch untuk dropdown status asset;" + elements.statusAsset);
    console.table(data.statusAsset);

    console.log("✅ Asset Dropdowns Synchronized via single fetch.");

  } catch (err) {
    console.error("❌ Gagal:", err);
  }
}
