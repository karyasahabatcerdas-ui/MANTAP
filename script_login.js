
function login() {
    // Gunakan try-catch agar jika satu ID tidak ketemu, yang lain tidak mati
    try {
        // 1. UI Reset - Pastikan ID loginOverlay ada di HTML
        const overlay = document.getElementById('loginOverlay');
        if (overlay) overlay.style.display = 'none';

        // 2. Load Data dari Server (GitHub to GAS)
        initAllJadwalDropdowns();
        loadAssetTypes();
        initAssetDropdowns();

        // 3. Navigasi
        //showPage('history');

        // 4. Identity Management
        window.loggedInUser = "admin1"; 
        window.userRole = "admin"; 
        
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
        `<option value="${item.id}">${item.id} - ${item.nama}</option>` ).join('');
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


async function initAssetDropdowns() {
  const urlGAS = APPSCRIPT_URL;

  // --- FUNGSI HELPER: Menunggu elemen muncul di DOM ---
  const waitForElement = (id) => {
    return new Promise(resolve => {
      const el = document.getElementById(id);
      if (el) return resolve(el); // Jika sudah ada, langsung bungkus

      const observer = new MutationObserver(() => {
        const target = document.getElementById(id);
        if (target) {
          observer.disconnect();
          resolve(target);
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
    });
  };

  try {
    console.log("⏳ Menunggu elemen DOM tersedia...");
    
    // 1. Tunggu semua elemen ID muncul secara paralel
    const [elTgl, elMaint, elAsset,elStatusJad,elStateMaint] = await Promise.all([
      waitForElement('sortJadwal'),
      waitForElement('filterStatusLog'),
      waitForElement('as_status'),
      waitForElement('filterStateJadwal'),
      waitForElement('m_state') 
    ]);

    const elements = {
      filterTgl: elTgl,
      statusMaint: elMaint,
      statusAsset: elAsset,
      filterState : elStatusJad,
      mState : elStateMaint
    };

    // 2. Set Loading Status
    Object.values(elements).forEach(el => {
      el.innerHTML = '<option value="">⏳ Loading...</option>';
    });

    // 3. Satu kali Fetch untuk semua data
    console.log("📡 Mengambil data dari GAS...");
    const response = await fetch(`${urlGAS}?action=getAssetDropdowns`);
    const data = await response.json();

    // 4. Fungsi pembantu untuk merender opsi
    const renderOptions = (el, list, defaultText) => {
      // Karena kita pakai waitForElement, el di sini pasti ada
      console.log(`Populasi: ${el.id} (${list ? list.length : 0} data)`);

      let html = `<option value="">-- ${defaultText} --</option>`;
      if (list && list.length > 0) {
        html += list.map(item => `<option value="${item.id}">${item.nama}</option>`).join('');
      }
      el.innerHTML = html;
    };

    // 5. Tebarkan data ke masing-masing dropdown
    renderOptions(elements.filterTgl, data.filterTgl, "Pilih Tanggal");
    renderOptions(elements.statusMaint, data.statusMaint, "Status Maintenance");
    renderOptions(elements.statusAsset, data.statusAsset, "Status Aset");
    renderOptions(elements.filterState, data.statusMaint, "Status Jadwal");
    renderOptions(elements.mState,data.statusMaint, "Pilih Status");

    console.log("✅ Asset Dropdowns Synchronized!");

  } catch (err) {
    console.error("❌ Gagal Fetch Dropdown Asset:", err);
    // Jika terjadi error fetch, beri tanda di UI yang tersedia
    ['sortJadwal', 'filterStatusLog', 'as_status'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = '<option value="">⚠️ Error Load</option>';
    });
  }
}

window.Temp_Profile=[];
/**
 * [FUNGSI: UPLOAD FOTO PROFIL MANDIRI] =============================================================================================================================================
 * Memastikan opacity kembali ke 1 baik saat sukses maupun gagal.
 */
function uploadOwnPhoto(input) {
  const file =input.files[0];
  if (file) {
    // 1. Simpan file asli ke dalam array (untuk kebutuhan upload nanti)
    window.Temp_Profile[0] = file; 

    // 2. Buat URL sementara untuk pratinjau
    const pratinjauUrl = URL.createObjectURL(file);

    // 3. Tampilkan langsung di elemen <img> yang memicu fungsi ini
    // Catatan: Jika inputElemen adalah <input type="file">, 
    // kita perlu mencari elemen <img> yang terkait.
    document.getElementById("set_display_photo").src = pratinjauUrl;

    //console.log("File tersimpan sementara -name :", file.name);
    //console.log("File tersimpan sementara - temp profile :", Temp_Profile[0]);
  }

}



/**========================================================================
 * Mengambil data dari 3 sheet db_asset dan mengisi dropdown masing-masing
 * ========================================================================
 */
/**
 * Mengambil data dari 3 sheet db_asset dan mengisi dropdown masing-masing
 */
/*
async function initAssetDropdowns() {
  const urlGAS =APPSCRIPT_URL;
  
  // ID elemen dropdown di HTML Señor (sesuaikan jika namanya berbeda)
  const elements = {
    filterTgl: document.getElementById('sortJadwal'), 
    statusMaint: document.getElementById('filterStatusLog'),
    statusAsset: document.getElementById('as_status')
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
    if (!el) {
        console.log("ini mungkin tidak kelihatan -->",el.id);
        return;}

      console.log("panjang table :", list.length);
      console.log("tabel di bawah punyanya :", el.id);
      console.table(list);
      console.log("isi html terakhir :", el.innerHTML);

     let html = `<option value="">-- ${defaultText} --</option>`;
      if (list && list.length > 0) {
        html += list.map(item => `<option value="${item.id}">${item.nama}</option>`).join('');
      }
      el.innerHTML=html;
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
}*/
