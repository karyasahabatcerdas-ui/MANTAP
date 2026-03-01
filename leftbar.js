// Script Toggle leftbar
function toggleleftbar() {
  // Mengambil elemen berdasarkan class
  const side = document.querySelector(".leftbar-container");
  const btn = document.getElementById("btn-toggle");
  
  side.classList.toggle("collapsed");

  const isCollapsed = side.classList.contains("collapsed");
  btn.innerText = isCollapsed ? ">>>" : "<<<";
}

/**
 * FUNGSI UTAMA NAVIGASI: Industrial Stealth Edition
 * Sinkron dengan ID 'leftbar' & Sistem Page
 */
function showPage(id) {
  console.log("🛠️ Membuka halaman: " + id);

  // --- 1. EFEK VISUAL: LED FLASH & HENTAKAN (Hanya jika ID Leftbar benar) ---
  const side = document.getElementById('leftbar'); // Update ke ID baru
  if (side) {
    side.classList.add('side-glow-flash');
    side.style.transform = "translateX(4px)"; // Hentakan tipis ke kanan
    
    setTimeout(() => {
      side.classList.remove('side-glow-flash');
      side.style.transform = "translateX(0px)";
    }, 200);
  }

  // --- 2. SECURITY CHECK (ADMIN ONLY) ---
  // Menambahkan 'log_book', 'aset', dan 'db_manager' ke daftar terproteksi
  const adminPages = ['kelola', 'm_user', 'aset', 'log_book', 'db_manager'];
  if (adminPages.includes(id) && typeof userRole !== 'undefined' && userRole !== 'admin') {
    if (typeof speakSenor === 'function') speakSenor("Akses ditolak, Señor!");
    alert("⛔ Akses Terbatas: Menu ini hanya untuk Administrator.");
    return;
  }

  // --- 3. UPDATE ACTIVE STATE PADA MENU ITEM ---
  document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('active'));
  
  // Mencari menu item berdasarkan id yang dipassing di onclick
  const activeBtn = document.querySelector(`.menu-item[onclick*="'${id}'"]`) || 
                    document.querySelector(`.menu-item[onclick*='"${id}"']`);
  if (activeBtn) activeBtn.classList.add('active');

  // --- 4. TRANSISI HALAMAN (HIDE & SHOW) ---
  const allPages = document.querySelectorAll('.page');
  allPages.forEach(p => {
    p.classList.add('hidden');
    p.style.display = 'none'; 
  });

  const targetPage = document.getElementById('page_' + id);
  if (targetPage) {
    targetPage.classList.remove('hidden');
    targetPage.style.display = 'block';
    
    // Scroll otomatis ke atas saat pindah halaman
    const rightContent = document.querySelector('.inner-content');
    if(rightContent) rightContent.scrollTop = 0;
  } else {
    console.error(`❌ Page ID "page_${id}" tidak ditemukan di DOM!`);
    return;
  }

  // --- 5. LOGIKA PEMANGGILAN DATA (ANTI-CRASH) ---
  try {
    const actions = {
      'history': () => typeof loadHist === 'function' && loadHist(),
      'jadwal': () => {
         if (typeof loadJad === 'function') loadJad();
         handleJadwalDropdown(); // Fungsi pembantu untuk dropdown
      },
      'kelola': () => typeof loadKel === 'function' && loadKel(),
      'm_user': () => typeof loadUserList === 'function' && loadUserList(),
      'setting': () => typeof loadProf === 'function' && loadProf(),
      'log_book': () => typeof loadAuditLogs === 'function' && loadAuditLogs(),
      'aset': () => typeof loadAssetTypes === 'function' && loadAssetTypes(),
      'lihat_aset': () => typeof loadAssetTypesView === 'function' && loadAssetTypesView(),
      'maintenance': () => typeof showMaintenancePage === 'function' && showMaintenancePage()
    };

    if (actions[id]) actions[id]();

  } catch (err) {
    console.error(`⚠️ Terjadi kesalahan saat memuat data [${id}]:`, err);
  }
}

/**
 * FUNGSI PEMBANTU: Mengisi Dropdown Jadwal
 */
function handleJadwalDropdown() {
  const selT = document.getElementById('filterType');
  if (selT && typeof cachedAssetTypes !== 'undefined' && selT.options.length <= 1) {
    cachedAssetTypes.forEach(t => {
      let opt = new Option(t, t);
      selT.add(opt);
    });
  }
}


/**
function toggleleftbar() {
  const side = document.getElementById("leftbar");
  const btn = document.getElementById("btn-toggle");
  // Memicu class collapsed (Visual mengecil)
  side.classList.toggle("collapsed");
  // Memicu class expanded pada main-content (Layout melebar)
  const main = document.getElementById("rightbar");
  if (main) main.classList.toggle("expanded");
  // Ubah arah panah
  if (side.classList.contains("collapsed")) {
    btn.innerText = ">>>";
  } else {
    btn.innerText = "<<<";
  }
}
*/