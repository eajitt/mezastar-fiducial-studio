# ⚡ MezaTag Studio: ArUco & AprilTag Fiducial Arcade Suite

Aplikasi lengkap untuk **menulis (generate/desain)** dan **membaca (detect/track)** Fiducial Marker seperti **ArUco** dan **AprilTag** untuk mereplikasi game arcade **Pokémon Mezastar**.

---

## 🚀 Fitur Utama

1. **🖨️ Desain & Tulis Tag Mezastar (Generator):**
   * Mendukung berbagai kamus marker:
     * **ArUco 4x4 (1000 IDs)** — *Rekomendasi untuk akurasi & kecepatan tinggi*
     * **ArUco 5x5 (1000 IDs)** & **ArUco 6x6**
     * **ArUco Original (1024 IDs)**
     * **ArUco MIP 36h12 (250 IDs)** — *Sangat tahan terhadap distorsi/noise*
     * **AprilTag 36h11** — *Standar robotika internasional*
     * **AprilTag 25h9 & 16h5**
   * Format desain kapsul rounded Mezastar asli (64 mm x 38 mm):
     * **Sisi Depan:** Artwork Pokémon, nama, elemen, bintang kelangkaan (1★ Normal hingga 6★ Legend), stats (HP/ATK/DEF/SPD), dan Signature Move.
     * **Sisi Belakang:** Fiducial Marker dengan orientasi panah arah sensor (`▲ TOP`).
   * Ekspor:
     * **High-Res PNG** (Siap cetak)
     * **Vector SVG** (Tajam pada skala apa pun)
     * **Lembar Cetak A4 Batch:** Menyusun 6 tag sekaligus dalam 1 lembar A4 dengan garis potong gunting dan lipatan bolak-balik.

2. **📷 Pembaca Kamera Sensor Real-Time (Scanner):**
   * Deteksi langsung via webcam laptop, kamera USB eksternal, atau kamera bawah meja.
   * Visualisasi Augmented Reality:
     * Garis tepi marker glowing neon
     * Pin 4 sudut berwarna untuk mendeteksi arah putaran
     * Titik tengah $(X, Y)$ dan garis orientasi hadap kartu
     * Sudut derajat rotasi ($0^\circ - 360^\circ$)
     * Floating HUD berisi nama monster dan stats di atas kartu
   * Mode Unggah File Foto (PNG/JPG) untuk pengujian instan tanpa menyalakan webcam.

3. **🎮 Simulator Pertarungan Mezastar (Battle Arena):**
   * Mensimulasikan papan meja permainan arcade Mezastar:
     * Area **Standby** (bawah) & Area **Attack** (atas)
     * **Mekanik Geser (Slide-to-Attack):** Dorong kartu fisik Anda maju dari area Standby melintasi garis merah untuk memicu serangan jurus!
     * Animasi jurus, goncangan layar (*screen shake*), dan efek suara arcade retro.
     * Mengurangi HP Boss Monster (Mewtwo 6★) hingga menang (*Victory Catch Chance*).
     * Tombol simulasi uji coba gerak geser bagi yang belum memiliki kamera/tag fisik.

4. **📂 Database Pokédex:**
   * Memetakan ID Marker (0, 1, 2, ...) dengan profil Pokémon.
   * Preset 12 Pokémon populer (Pikachu, Charizard, Lucario, Rayquaza, Mewtwo, Greninja, dll.).
   * Kemampuan menambah/mengedit Pokémon kustom.
   * Fitur Simpan ke `localStorage`, Ekspor JSON, dan Impor JSON.

---

## 🔨 Panduan Membuat Meja Sensor DIY Mezastar Fisik

Jika Anda ingin merakit meja arcade fisik seperti aslinya:
1. **Permukaan Meja:** Gunakan akrilik transparan (tebal 3–5 mm) berukuran sekitar 40 cm x 30 cm.
2. **Kamera:** Letakkan webcam USB sudut lebar (*wide-angle*) di dalam kotak meja, menghadap ke atas ke arah akrilik.
3. **Pencahayaan:** Berikan strip LED di sekeliling bagian dalam kotak untuk memastikan pencahayaan merata pada dasar tag.
4. **Tag Fisik:**
   * Buka tab **"Buat / Tulis Tag"** pada aplikasi.
   * Klik **"📄 Lembar Cetak A4 (Batch)"** dan cetak di atas kertas stiker atau kertas foto tebal.
   * Potong dan lipat dua, lalu tempelkan pada potongan akrilik/karton tebal berukuran 64 x 38 mm.
   * Letakkan di atas meja sensor, dan game Anda siap dimainkan!
