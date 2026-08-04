# 🍽️ Dapur Kita

Aplikasi pencatat **pendapatan dan pengeluaran** untuk usaha makanan — warung, katering,
jualan online, atau dapur rumahan. Dibuat supaya gampang dipakai pemula, tapi tetap cepat
untuk yang sudah terbiasa.

Tanpa instalasi, tanpa akun, tanpa internet. Cukup buka `index.html` di browser.

---

## Cara Memakai

**Di laptop / komputer:** klik dua kali berkas `index.html`.

**Di HP:** taruh seluruh folder di layanan hosting statis apa pun (GitHub Pages, Netlify,
Vercel), lalu buka alamatnya di browser HP. Setelah terbuka, pilih menu browser →
**"Tambahkan ke Layar Utama"** supaya bisa dibuka seperti aplikasi biasa.

Saat pertama kali dibuka, aplikasi akan menuntun lewat panduan singkat: isi nama usaha,
target harian, dan pilih apakah mau memakai contoh menu atau mengisi sendiri.

---

## Isi Aplikasi

### 🏠 Beranda
Ringkasan hari ini dalam sekali lihat: pemasukan, pengeluaran, laba, dan saldo kas —
lengkap dengan perbandingan terhadap kemarin. Ada cincin progres target harian, grafik
uang masuk vs keluar (7/14/30 hari), menu terlaris, rincian pengeluaran terbesar, dan
aktivitas terakhir.

### 🛒 Kasir
Layar utama untuk mencatat penjualan. Ketuk menu yang dibeli — jumlahnya bertambah
otomatis. Ada pencarian, pengelompokan menu, diskon, empat metode pembayaran
(tunai / QRIS / transfer / ojol), pencatatan mundur untuk transaksi kemarin, item di luar
daftar menu, serta struk yang bisa dicetak.

### 🧾 Transaksi
Semua catatan uang masuk dan keluar, dikelompokkan per tanggal beserta subtotal harian.
Bisa disaring berdasarkan jenis, periode, kategori, dan kata kunci. Ketuk salah satu
catatan untuk mengubah atau menghapusnya — penghapusan bisa dibatalkan lewat
tombol **Batalkan** pada notifikasi. Hasil saringan bisa diekspor ke CSV.

### 📊 Laporan
Ringkasan periode (hari ini / 7 hari / bulan ini / bulan lalu / rentang bebas) dengan
pembanding periode sebelumnya, grafik harian, tren laba, rincian pengeluaran per kategori,
cara pembayaran, dan tabel performa tiap menu lengkap dengan margin. Di bagian atas ada
**insight otomatis**: hari paling ramai, pengeluaran yang paling menyerap uang, menu paling
menguntungkan, dan menu bermargin tipis. Bisa diekspor ke CSV atau dicetak.

### 📖 Menu & Kategori
Kelola daftar jualan: nama, ikon, kelompok, harga jual, dan HPP (modal bahan per porsi).
Margin per menu dihitung otomatis dan diberi warna — hijau kalau sehat, merah kalau rugi.
Menu bisa disembunyikan tanpa dihapus. Kategori pengeluaran juga bisa ditambah, diubah
warnanya, atau dihapus.

### ⚙️ Pengaturan
Profil usaha, target harian, modal awal, tema terang/gelap/otomatis, cadangan &
pemulihan data, ekspor CSV, data contoh, panduan singkat, dan pintasan keyboard.

---

## Catatan Penting Soal Data

Seluruh data disimpan di **browser perangkat itu sendiri** (`localStorage`) — tidak dikirim
ke server mana pun. Konsekuensinya:

- Data **tidak otomatis pindah** antar HP/laptop atau antar browser.
- Membersihkan data browser / *clear site data* akan **menghapus** catatan.

Karena itu, biasakan menekan **Pengaturan → Simpan Cadangan** secara berkala. Berkas
`.json` yang terunduh bisa dipulihkan kapan saja lewat **Pulihkan Cadangan** — termasuk
di perangkat lain.

## Cara Menghitung Angkanya

| Istilah | Rumus |
| --- | --- |
| Laba Bersih | seluruh pemasukan − seluruh pengeluaran yang tercatat |
| Saldo Kas | modal awal + seluruh pemasukan − seluruh pengeluaran |
| Margin | laba bersih ÷ pemasukan × 100% |
| Untung per menu | (harga jual − HPP) × jumlah terjual |

**Untung per menu** dipisahkan dari Laba Bersih dan sengaja tidak dijumlahkan ke dalamnya —
supaya belanja bahan tidak terhitung dua kali (sekali sebagai pengeluaran nyata, sekali lagi
lewat HPP). Kolom itu dipakai untuk membandingkan menu mana yang paling menguntungkan,
bukan untuk laporan untung-rugi.

---

## Pintasan Keyboard

| Tombol | Fungsi |
| --- | --- |
| `1`–`5` | pindah halaman |
| `B` | buka Kasir |
| `P` | catat pengeluaran |
| `/` | fokus ke kotak pencarian |
| `Esc` | tutup jendela yang terbuka |

---

## Untuk yang Ingin Mengubah Kodenya

HTML, CSS, dan JavaScript biasa — tanpa framework, tanpa proses build, tanpa dependensi
eksternal. Semua berkas dimuat langsung oleh `index.html`.

```
index.html
assets/
  css/style.css          gaya tampilan + tema gelap + gaya cetak
  js/
    utils.js             format rupiah, tanggal, CSV, unduhan
    icons.js             kumpulan ikon SVG + daftar emoji
    store.js             data, penyimpanan lokal, dan seluruh perhitungan
    ui.js                toast, modal, konfirmasi, tema, router hash
    charts.js            grafik batang, garis, donat, cincin progres (SVG murni)
    forms.js             modal isian yang dipakai bersama antar halaman
    app.js               kerangka aplikasi, navigasi, pintasan keyboard
    views/               satu berkas untuk tiap halaman
```

Menambah halaman: buat berkas di `views/`, daftarkan sebagai `Views.namahalaman`, lalu
tambahkan entri pada `NAV` di `app.js`.
