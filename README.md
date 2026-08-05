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
Satu catatan = **satu pelanggan**, bukan satu menu. Isi nama pelanggan (boleh
dikosongkan), ketuk menu yang dibeli — boleh campur beberapa varian sekaligus dan
totalnya dijumlahkan di akhir. Tiap item bisa diberi catatan sendiri ("tidak pedas",
"bungkus terpisah").

Untuk pembayaran tunai, isi **uang yang diberikan** dan aplikasi langsung menghitung
**kembaliannya**; kalau uangnya kurang, layar memberi peringatan dan penjualan tidak
tersimpan. Ada juga pencarian, pengelompokan menu, diskon, empat metode pembayaran
(tunai / QRIS / transfer / ojol), pencatatan mundur untuk transaksi kemarin, item di luar
daftar menu, serta struk yang bisa dicetak.

### 🧾 Transaksi
Semua catatan uang masuk dan keluar, dikelompokkan per tanggal — tiap hari menampilkan
**berapa pelanggan yang membeli, berapa porsi terjual**, dan apa saja pesanan mereka.
Bisa disaring berdasarkan jenis, periode, kategori, dan kata kunci. Ketuk salah satu
catatan untuk mengubah atau menghapusnya — penghapusan bisa dibatalkan lewat
tombol **Batalkan** pada notifikasi. Hasil saringan bisa diekspor ke Excel.

### 📊 Laporan
Ringkasan periode (hari ini / 7 hari / bulan ini / bulan lalu / rentang bebas) dengan
pembanding periode sebelumnya, grafik harian, tren laba, rincian pengeluaran per kategori,
cara pembayaran, dan tabel performa tiap menu lengkap dengan margin. Di bagian atas ada
**insight otomatis**: hari paling ramai, pengeluaran yang paling menyerap uang, menu paling
menguntungkan, dan menu bermargin tipis. Bisa diekspor ke Excel atau dicetak.

### 📖 Menu & Kategori
Kelola daftar jualan: nama, ikon, kelompok, harga jual, dan HPP (modal bahan per porsi).
Margin per menu dihitung otomatis dan diberi warna — hijau kalau sehat, merah kalau rugi.
Menu bisa disembunyikan tanpa dihapus. Kategori pengeluaran juga bisa ditambah, diubah
warnanya, atau dihapus.

### ⚙️ Pengaturan
Profil usaha, target harian, modal awal, tema terang/gelap/otomatis, cadangan &
pemulihan data, pindah ke HP lain, ekspor Excel, data contoh, panduan singkat, dan pintasan keyboard.

---

## 📊 Ekspor ke Excel

Tombol **Ekspor Excel** menghasilkan berkas `.xlsx` asli dengan kolom yang sudah
terpisah rapi — bukan CSV yang sering menumpuk jadi satu kolom di Excel HP. Isinya
enam sheet:

| Sheet | Isi |
| --- | --- |
| Ringkasan | Total pemasukan, pengeluaran, laba, jumlah pelanggan |
| Rekap Harian | Per tanggal: jumlah pelanggan, porsi terjual, pemasukan, pengeluaran |
| Transaksi | Satu baris tiap pelanggan, lengkap dengan uang diberikan & kembalian |
| **Rincian Item** | **Satu baris tiap item** — nama pelanggan, item, jumlah, harga satuan, subtotal, catatan |
| Pengeluaran | Belanja dan biaya, per kategori |
| Peringkat Menu | Menu terlaris beserta omzet dan untungnya |

## Catatan Penting Soal Data

Seluruh data disimpan di **browser HP itu sendiri** (`localStorage`) — tidak dikirim ke
server mana pun. Konsekuensinya:

- Aplikasi ini **tidak punya sistem login**, karena tidak ada server yang menyimpan akun.
- Data **tidak otomatis pindah** antar HP/laptop atau antar browser. Membuka tautan yang
  sama di HP lain akan tampil seperti aplikasi baru.
- Membersihkan data browser / *clear site data* akan **menghapus** catatan.

Untuk pindah HP, buka **Pengaturan → Pindah ke HP Lain**: seluruh data disalin jadi teks
yang bisa dikirim ke diri sendiri lewat WhatsApp, lalu ditempel di HP tujuan. Untuk
cadangan rutin, pakai **Simpan Cadangan** (berkas `.json`) dan **Pulihkan Cadangan**.

> Kalau suatu saat butuh login sungguhan dengan data yang otomatis sama di semua HP,
> aplikasi ini perlu ditambah server dan basis data (misalnya Firebase atau Supabase).
> Itu di luar cakupan versi statis ini, yang sengaja dibuat tanpa biaya bulanan dan
> tanpa ketergantungan pada layanan pihak ketiga.

## Cara Menghitung Angkanya

| Istilah | Rumus |
| --- | --- |
| Laba Bersih | seluruh pemasukan − seluruh pengeluaran yang tercatat |
| Saldo Kas | modal awal + seluruh pemasukan − seluruh pengeluaran |
| Margin | laba bersih ÷ pemasukan × 100% |
| Untung per menu | (harga jual − HPP) × jumlah terjual |
| Kembalian | uang yang diberikan − total bayar |
| Jumlah pelanggan | banyaknya pesanan yang tercatat pada hari itu |

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
    export.js            penulis berkas .xlsx (ZIP + XML) tanpa library
    forms.js             modal isian yang dipakai bersama antar halaman
    app.js               kerangka aplikasi, navigasi, pintasan keyboard
    views/               satu berkas untuk tiap halaman
```

Menambah halaman: buat berkas di `views/`, daftarkan sebagai `Views.namahalaman`, lalu
tambahkan entri pada `NAV` di `app.js`.
