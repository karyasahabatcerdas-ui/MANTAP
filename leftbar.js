// Script Toggle leftbar
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