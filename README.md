# Secure Medical Document Scanner

Aplikasi web **100% client-side** untuk memindai, memotong (crop), dan mengekspor dokumen medis pasien menjadi PDF — tanpa upload, tanpa database, tanpa tracking. Semua pemrosesan gambar terjadi di dalam browser (RAM), sehingga data pasien tidak pernah meninggalkan perangkat yang dipakai.

Dibangun dengan gaya **Neo-Brutalism**: warna pastel kontras, border tebal hitam, hard shadow, dan tombol yang "push down" saat ditekan.

---

## ✨ Fitur Utama

- **Form Data Pasien** — Nama / No. RM wajib diisi (validasi otomatis).
- **Multi-Select Document Type Tags** — KTP, BPJS, Rekam Medis, CTG, USG, EKG, dll. Bisa ditambah/dihapus lewat menu Config.
- **Capture Source**:
  - 📷 Kamera langsung (rear camera / `facingMode: environment`).
  - 🖼 Upload dari galeri / file.
  - 📋 **Paste Screenshot** — tempel hasil Print Screen / Snipping Tool langsung dengan `Ctrl+V`.
- **Image Cropper** — crop bebas menggunakan `react-cropper` sebelum masuk ke gallery.
- **Scanned Pages Gallery** — thumbnail semua halaman, hapus per halaman, atau clear all.
- **Kontrol Orientasi per Halaman** — tiap halaman punya tombol siklus **AUTO → PORTRAIT → LANDSCAPE**. AUTO menyesuaikan rasio gambar.
- **PDF Generation** dengan `jsPDF`:
  - Nama file dinamis: `{NAMA_PASIEN}_{TAG1}_{TAG2}.pdf`
  - Untuk Paste Screenshot: `{NAMA_PASIEN}_{NAMA_SCREENSHOT}.pdf` (nama screenshot bisa dikonfigurasi admin).
- **Admin Config (LocalStorage)**:
  - Tambah / hapus tag jenis dokumen.
  - Ubah nama default file screenshot (default: `SCREENSHOOT BED`).
  - Reset tag ke bawaan.

---

## 🔐 Privasi & Keamanan

- **Tidak ada backend, tidak ada API call.** Semua image di-load sebagai `dataURL` dan diproses di memori browser.
- **Tidak ada upload ke cloud manapun.** PDF di-generate lokal dan langsung ter-download ke perangkat pengguna.
- **LocalStorage** hanya dipakai untuk menyimpan konfigurasi non-sensitif (daftar tag & nama file screenshot).
- Cocok untuk penggunaan di lingkungan yang menuntut kerahasiaan data pasien.

---

## 👤 Kredensial Admin (Config)

Untuk membuka menu ⚙ Config di header:

- **Username:** `ayasora`
- **Password:** `ayasora`

> Kredensial ini di-hardcode di client (bukan sistem auth server). Ubah di `src/routes/index.tsx` pada fungsi `login` bila ingin diganti.

---

## 🖥️ Panduan Instalasi di Server RS

Aplikasi ini adalah **static web app** — output build-nya cuma HTML/CSS/JS statis, jadi bisa di-hosting di web server apapun (Nginx, Apache, IIS) tanpa Node.js runtime di server produksi.

### 1. Persyaratan Server

- **Untuk build (bisa di komputer terpisah):** Node.js 20+ atau [Bun](https://bun.sh).
- **Untuk hosting:** web server statis apapun (Nginx / Apache / IIS / bahkan `python -m http.server` untuk testing).
- **HTTPS wajib** jika ingin fitur Kamera berjalan (browser hanya mengizinkan `getUserMedia` di `https://` atau `http://localhost`).

### 2. Clone & Build

```bash
git clone https://github.com/<username>/<repo>.git
cd <repo>

# pakai bun (disarankan)
bun install
bun run build

# atau pakai npm
npm install
npm run build
```

Hasil build berada di folder **`dist/`** (atau `.output/public/` tergantung config). Folder itulah yang di-deploy ke web server.

### 3. Deploy ke Nginx (contoh Linux)

```bash
# copy hasil build ke web root
sudo cp -r dist/* /var/www/scanner/

# contoh /etc/nginx/sites-available/scanner
server {
    listen 443 ssl http2;
    server_name scanner.rs-internal.local;

    ssl_certificate     /etc/ssl/certs/scanner.crt;
    ssl_certificate_key /etc/ssl/private/scanner.key;

    root /var/www/scanner;
    index index.html;

    # SPA fallback — semua route diarahkan ke index.html
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/scanner /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### 4. Deploy ke IIS (Windows Server)

1. Copy isi folder `dist/` ke direktori site, misal `C:\inetpub\wwwroot\scanner`.
2. Tambahkan `web.config` berikut di root site (untuk SPA fallback):

```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <rule name="SPA" stopProcessing="true">
          <match url=".*" />
          <conditions logicalGrouping="MatchAll">
            <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
            <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
          </conditions>
          <action type="Rewrite" url="/index.html" />
        </rule>
      </rules>
    </rewrite>
  </system.webServer>
</configuration>
```

3. Pastikan binding HTTPS aktif dengan sertifikat internal RS.

### 5. Testing Cepat Tanpa Web Server

Untuk uji lokal:

```bash
bun run preview
# atau
npx serve dist
```

Buka `http://localhost:xxxx` di Chrome / Edge terbaru.

### 6. Update Aplikasi

Untuk update di kemudian hari cukup:

```bash
git pull
bun install
bun run build
sudo cp -r dist/* /var/www/scanner/
```

---

## 🧑‍💻 Development Lokal

```bash
bun install
bun run dev
```

Buka `http://localhost:8080`.

---

## 🌐 Kompatibilitas Browser

- Chrome / Edge / Brave versi terbaru — **direkomendasikan**.
- Firefox versi terbaru.
- Safari 15+ (fitur paste-image bisa terbatas di beberapa versi).
- Fitur **Kamera** membutuhkan HTTPS (kecuali `localhost`).

---

## 📄 Lisensi

Internal use. Silakan disesuaikan dengan kebijakan institusi.

---

<sub>id.ayasora</sub>
