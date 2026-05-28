<div align="center">

# 📄 Sistem Laporan PKL

**Generator Laporan Praktik Kerja Lapangan Otomatis — DOCX & PDF**

<img src="static/img/Logo_Laporan_PKL.png" alt="Sistem Laporan PKL" width="200"/>

[![Flask](https://img.shields.io/badge/Flask-3.0%2B-000000?style=for-the-badge&logo=flask&logoColor=white)](https://flask.palletsprojects.com/)
[![Python](https://img.shields.io/badge/Python-3.9%2B-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org/)
[![Bootstrap](https://img.shields.io/badge/Bootstrap-5.3-7952B3?style=for-the-badge&logo=bootstrap&logoColor=white)](https://getbootstrap.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](#lisensi)
[![Version](https://img.shields.io/badge/Version-v3.1-blue?style=for-the-badge)]()
[![GitHub Repo](https://img.shields.io/badge/GitHub-AkluxDev%2Fsistem--laporan--pkl--v3-181717?style=for-the-badge&logo=github)](https://github.com/AkluxDev/sistem-laporan-pkl-v3)
[![GitHub Repo](https://img.shields.io/badge/GitHub-MHFADev%2Fsistem--laporan--pkl--v3-181717?style=for-the-badge&logo=github)](https://github.com/AkluxDev/sistem-laporan-pkl-v3)

<br/>

**Sistem Laporan PKL** adalah aplikasi web berbasis Flask yang memungkinkan siswa SMK/MA atau mahasiswa membuat laporan Praktik Kerja Lapangan (PKL) secara otomatis dalam format **DOCX** (Microsoft Word) dan **PDF** — lengkap dengan format akademik profesional, daftar isi otomatis, penomoran halaman, halaman pengesahan dengan tanda tangan digital, dan masih banyak lagi.

</div>

---

## 📋 Daftar Isi

- [✨ Fitur Utama](#-fitur-utama)
- [🛠️ Tech Stack](#️-tech-stack)
- [📁 Struktur Proyek](#-struktur-proyek)
- [⚡ Cara Instalasi](#-cara-instalasi)
- [🚀 Penggunaan](#-penggunaan)
- [🧩 Arsitektur Aplikasi](#-arsitektur-aplikasi)
- [📦 Fitur Dokumentasi Detail](#-fitur-dokumentasi-detail)
- [🔌 API Endpoints](#-api-endpoints)
- [🗺️ Roadmap](#️-roadmap)
- [🤝 Kontribusi](#-kontribusi)
- [📄 Lisensi](#-lisensi)

---

## ✨ Fitur Utama

### 🧙 Wizard Multi-Langkah (6 Steps)

Aplikasi ini menggunakan form wizard interaktif yang memandu pengguna mengisi data secara bertahap:

| Step | Nama | Deskripsi |
|:----:|------|-----------|
| **1** | **Identitas Diri** | Nama, NIS/NIM, kelas/jurusan, asal sekolah, nama perusahaan/institusi, pembimbing lapangan, pembimbing sekolah, tanggal mulai & selesai |
| **2** | **Lembar Pengesahan** | Halaman pengesahan dinamis dengan beberapa penandatangan (nama, jabatan, gambar tanda tangan digital) — bisa ditambah beberapa halaman |
| **3** | **Kata Pengantar** | Kata pengantar dengan judul, paragraf pembuka, daftar ucapan terima kasih (nama + jabatan), paragraf penutup, kota/tanggal, dan nama penulis |
| **4** | **Isi Laporan** | **Visual Builder** — editor konten laporan yang powerful dengan drag-and-drop, tree view sidebar, dan berbagai tipe konten |
| **5** | **Daftar Rujukan** | Daftar referensi/pustaka (buku, jurnal, website) dengan format hanging indent otomatis |
| **6** | **Opsi & Generate** | Toggle halaman cover, daftar isi, halaman pengesahan; upload gambar cover; ringkasan data; dan tombol generate |

### 📝 Visual Builder Konten (Step 4)

<img src="static/img/Logo_Laporan_PKL.png" align="right" width="120"/>

- **Tambah & hapus BAB** (bab) dan Sub-BAB (sub-bab)
- **Drag-and-drop reordering** dengan [SortableJS](https://sortablejs.github.io/Sortable/)
- **Sidebar tree view** untuk navigasi konten
- **Jenis konten yang didukung:**
  - ✅ **Paragraf** — teks biasa rata kanan-kiri (justify)
  - ✅ **Heading/Subheading** — format heading bertingkat
  - ✅ **Gambar** — upload via drag-and-drop, disimpan di IndexedDB, dengan caption
  - ✅ **List** — numbered (1., a., A., i., I.), bullet (bullet, circle, square, dash, arrow), nested list
  - ✅ **Tabel** — tabel dengan header dan grid style

### 📄 Generator Dokumen (DOCX)

Menggunakan engine `ProfessionalPKLGenerator` di `core/doc_generator.py` untuk menghasilkan dokumen Word dengan format akademik standar:

| Aspek | Spesifikasi |
|-------|-------------|
| **Ukuran Kertas** | A4 (210 × 297 mm) |
| **Margin** | 4 cm (kiri) — 4 cm (atas) — 3 cm (kanan) — 3 cm (bawah) |
| **Font** | Times New Roman, 12pt |
| **Spasi** | 1,5 spasi (body), 1 spasi (list/tabel) |
| **Heading** | Heading 1 (BAB), Heading 2 (Sub-BAB), Heading 3 (Sub-list), Heading 4 (caption) |
| **Daftar Isi** | Native Word TOC via XML field injection — auto-update saat dibuka di Word |
| **Penomoran Halaman** | Cover (none) → Halaman preliminari (i, ii, iii) → Body (1, 2, 3) |
| **Paragraf** | Rata kanan-kiri (justify), indent baris pertama |
| **Referensi** | Hanging indent |
| **Tanda Tangan** | Gambar digital signature tertanam dalam halaman pengesahan |

### 📕 Generator PDF

- Menggunakan **ReportLab** untuk menghasilkan PDF dengan format yang setara
- Support: cover page, kata pengantar, body laporan, dan daftar rujukan

### 💾 Penyimpanan Data Otomatis

- **Auto-save** ke `localStorage` (debounce 400ms) — data tidak hilang meskipun halaman di-refresh
- **IndexedDB** untuk menyimpan gambar-gambar yang diupload
- **Restore otomatis** saat halaman dimuat kembali
- **Tombol reset** untuk menghapus semua data

---

## 🛠️ Tech Stack

<div align="center">

| Backend | Frontend | Dokumentasi |
|---------|----------|-------------|
| ![Python](https://img.shields.io/badge/Python-3.9%2B-3776AB?logo=python) | ![JavaScript](https://img.shields.io/badge/JavaScript-ES6-F7DF1E?logo=javascript) | ![DOCX](https://img.shields.io/badge/DOCX-python--docx-2B579A) |
| ![Flask](https://img.shields.io/badge/Flask-3.0%2B-000000?logo=flask) | ![Bootstrap](https://img.shields.io/badge/Bootstrap-5.3-7952B3?logo=bootstrap) | ![PDF](https://img.shields.io/badge/PDF-ReportLab-EC1C24) |
| | ![SortableJS](https://img.shields.io/badge/SortableJS-1.15-034E9B) | |

</div>

**Dependencies Python (`requirements.txt`):**

| Package | Version | Fungsi |
|---------|---------|--------|
| `flask` | >=3.0.0 | Web framework |
| `python-docx` | >=1.1.0 | Membuat dan memodifikasi dokumen DOCX |
| `Pillow` | >=10.0.0 | Pemrosesan gambar (resize, crop, konversi) |
| `docxtpl` | >=0.16.8 | Template DOCX berbasis Jinja2 |
| `reportlab` | >=4.2.0 | Membuat dokumen PDF |

**Frontend Dependencies** (via CDN):
- [Bootstrap 5.3.2](https://getbootstrap.com/) — UI framework
- [Bootstrap Icons 1.11.3](https://icons.getbootstrap.com/) — Icon set
- [SortableJS 1.15.2](https://sortablejs.github.io/Sortable/) — Drag-and-drop
- [Google Fonts](https://fonts.google.com/) — Poppins, Manrope, Fraunces

---

## 📁 Struktur Proyek

```
sistem-laporan-pkl-v3/
│
├── app.py                          # Entry point — Flask application
├── requirements.txt                # Dependencies Python
├── index.html                      # (tidak digunakan — template di templates/)
├── TODO.md                         # Roadmap development
│
├── core/                           # ★ Engine pembuatan dokumen
│   ├── doc_generator.py            #   Generator DOCX utama (ProfessionalPKLGenerator)
│   ├── pdf_generator.py            #   Generator PDF (ReportLab)
│   ├── generator.py                #   Generator DOCX legacy (referensi)
│   ├── styles.py                   #   Konfigurasi style dokumen
│   ├── paragraph_engine.py         #   Engine paragraf & heading
│   ├── page_engine.py              #   Engine section, footer, penomoran halaman
│   ├── image_engine.py             #   Engine insert & scaling gambar
│   ├── signature_engine.py         #   Engine layout halaman pengesahan
│   ├── layout_engine.py            #   Engine tabel & layout table
│   ├── toc_engine.py               #   Engine Daftar Isi native Word (XML field)
│   └── docx_utils.py               #   Utility manipulasi XML DOCX level rendah
│
├── static/
│   ├── css/
│   │   ├── main.css                #   Entry point CSS
│   │   ├── style.css               #   Global styles & CSS variables (~2440 baris)
│   │   ├── isi_laporan.css         #   Layout builder konten (Step 4)
│   │   ├── daftar_isi.css          #   Styles daftar isi
│   │   ├── halaman_kegiatan.css    #   Styles halaman kegiatan
│   │   └── Halaman_Pengesahan.css  #   Styles halaman pengesahan
│   │
│   ├── js/
│   │   ├── main.js                 #   Entry point JavaScript (ES Module) v3.1
│   │   └── modules/
│   │       ├── wizard.js           #   Navigasi wizard multi-step
│   │       ├── generate.js         #   Koleksi data & submit ke API
│   │       ├── pengesahan.js       #   Builder form lembar pengesahan
│   │       ├── kata-pengantar.js   #   Builder form kata pengantar
│   │       ├── isi_laporan.js      #   Builder konten laporan (legacy)
│   │       ├── isi_laporan_builder.js #   Builder konten laporan v3 (drag-drop)
│   │       ├── halaman_rujukan.js  #   Builder form daftar rujukan
│   │       ├── cover.js            #   Upload & dropzone gambar cover
│   │       ├── image_db.js         #   IndexedDB untuk penyimpanan gambar
│   │       ├── image_persistence.js#   Utility persistensi gambar
│   │       ├── toast.js            #   Sistem notifikasi toast
│   │       ├── summary.js          #   Builder ringkasan data
│   │       ├── validation.js       #   Validasi form
│   │       ├── recovery.js         #   Recovery & reset data
│   │       └── navbar.js           #   Efek scroll navbar
│   │
│   └── img/
│       ├── Logo.png                #   Favicon
│       ├── Logo_Laporan_PKL.png    #   Logo laporan
│       └── Logo_Utama.png          #   Logo utama aplikasi
│
├── templates/
│   └── index.html                  # Template Jinja2 halaman utama (~699 baris)
│
└── uploads/                        # Upload file sementara (dibersihkan otomatis)
```

---

## ⚡ Cara Instalasi

### 📋 Prasyarat

- **Python** 3.9 atau lebih baru
- **pip** (Python package manager)
- **Git** (untuk cloning repository)

### 🔧 Langkah Instalasi

```bash
# 1. Clone repository
git clone https://github.com/AkluxDev/sistem-laporan-pkl-v3.git
cd sistem-laporan-pkl-v3

# 2. Buat & aktifkan virtual environment (disarankan)
python -m venv .venv

# macOS / Linux:
source .venv/bin/activate

# Windows:
# .venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Jalankan aplikasi
python app.py

# 5. Buka di browser
# → http://localhost:5000
```

### 🐳 Opsi Virtual Environment

```bash
# Menggunakan venv (standar Python)
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Atau menggunakan virtualenv
pip install virtualenv
virtualenv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

---

## 🚀 Penggunaan

1. Buka **`http://localhost:5000`** di browser
2. Ikuti **6 langkah wizard** untuk mengisi data laporan:
   - Isi identitas diri
   - Tambahkan halaman pengesahan & tanda tangan digital
   - Tulis kata pengantar dengan daftar ucapan terima kasih
   - Susun isi laporan dengan **Visual Builder** (drag-and-drop)
   - Tambahkan daftar rujukan/pustaka
   - Atur opsi (cover, daftar isi, tanda tangan) dan **Generate**
3. File otomatis terdownload dalam format **DOCX** atau **PDF**
4. Buka file DOCX di Microsoft Word — daftar isi dan penomoran halaman akan **auto-update**

---

## 🧩 Arsitektur Aplikasi

### Alur Data

```
Browser (Frontend)
    │
    ├── Pengguna mengisi form (6 steps)
    ├── Data disimpan di localStorage (auto-save)
    ├── Gambar disimpan di IndexedDB
    │
    └── POST /generate (JSON / multipart)
            │
            ▼
Flask Backend (app.py)
    │
    ├── Validasi data
    ├── Parse gambar base64 / file upload
    │
    ├── [format=docx] ──► core/doc_generator.py ──► BytesIO (.docx)
    │                       ├── styles.py          (style dokumen)
    │                       ├── paragraph_engine.py (paragraf & heading)
    │                       ├── page_engine.py      (section & footer)
    │                       ├── image_engine.py     (gambar)
    │                       ├── signature_engine.py (pengesahan)
    │                       ├── layout_engine.py    (tabel)
    │                       ├── toc_engine.py       (daftar isi native)
    │                       └── docx_utils.py       (XML utilities)
    │
    └── [format=pdf]  ──► core/pdf_generator.py ──► BytesIO (.pdf)
                            └── reportlab
                                ▼
                    send_file() → Download ke browser
```

### Modular Engine Design

Backend generator dirancang dengan arsitektur modular yang clean:

| Modul | Bertanggung Jawab |
|-------|-------------------|
| `doc_generator.py` | **Orkestrator** — mengoordinasikan semua engine untuk menghasilkan dokumen lengkap |
| `styles.py` | Definisi style: font, ukuran, warna, heading style, TOC style |
| `paragraph_engine.py` | Membuat paragraf biasa, heading, bullet list, numbered list, nested list |
| `page_engine.py` | Mengelola section break, page numbering (romawi ↔ arabic), footer dengan field code |
| `image_engine.py` | Insert gambar dengan proportional scaling, crop, dan caption |
| `signature_engine.py` | Layout halaman pengesahan dengan tabel signature dan gambar TTD |
| `layout_engine.py` | Layout tables (invisible untuk struktur halaman, visible untuk data) |
| `toc_engine.py` | Inject **native Word TOC field** (`TOC \o "1-4" \h \z \u`) via manipulasi XML |
| `docx_utils.py` | Utility level rendah: manipulasi XML, font run, field codes, tabel border, decode gambar |
| `pdf_generator.py` | Generator PDF alternatif menggunakan ReportLab |

---

## 📦 Fitur Dokumentasi Detail

### Format Akademik Profesional

Dokumen yang dihasilkan mengikuti **standar penulisan laporan PKL/ karya tulis ilmiah** Indonesia:

| Elemen | Detail |
|--------|--------|
| **Cover** | Judul laporan, logo sekolah/cover image, identitas siswa, tahun |
| **Lembar Pengesahan** | Nama, NIS/NIM, judul, pembimbing I & II, kepala sekolah/dekan — dengan **tanda tangan digital** berupa gambar |
| **Kata Pengantar** | Paragraf pembuka, daftar ucapan terima kasih, paragraf penutup, kota & tanggal |
| **Daftar Isi** | **Native Word Table of Contents** — otomatis ter-update saat dibuka di Word |
| **Body Laporan** | BAB & sub-BAB dengan format heading bertingkat, paragraf justified, tabel, gambar, list |
| **Daftar Rujukan** | Referensi dengan hanging indent — mendukung buku, jurnal, dan website |
| **Lampiran** | Halaman lampiran (appendices) |

### Page Numbering System

```
┌─────────────────────────────────────────────────┐
│  Halaman Cover         → Tidak ada nomor         │
│  Halaman Pengesahan    → Romawi: i, ii, iii...   │
│  Kata Pengantar        → Romawi (lanjutan)       │
│  Daftar Isi            → Romawi (lanjutan)       │
│  BAB I - Daftar Pustaka → Arab: 1, 2, 3...       │
└─────────────────────────────────────────────────┘
```

### Native Word TOC

Daftar Isi dihasilkan menggunakan **XML field code native** (`TOC \o "1-4" \h \z \u`), bukan teks statis. Saat dokumen dibuka di Microsoft Word, pengguna tinggal klik kanan → **"Update Field"** atau **Ctrl+A → F9** untuk memperbarui nomor halaman secara otomatis.

---

## 🔌 API Endpoints

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| `GET` | `/` | Halaman utama aplikasi |
| `POST` | `/generate` | Generate dokumen (format default: DOCX) |
| `POST` | `/generate/docx` | Generate dokumen DOCX |
| `POST` | `/generate/pdf` | Generate dokumen PDF |
| `POST` | `/upload-cover` | Upload gambar cover terpisah |
| `POST` | `/cleanup-uploads` | Hapus file sementara > 1 jam |
| `GET` | `/health` | Health check server |

### Contoh Request Generate

**JSON (gambar dalam base64):**
```json
POST /generate
Content-Type: application/json

{
  "nama_lengkap": "Ahmad Fauzi",
  "nis": "1234567890",
  "jurusan": "Teknik Komputer dan Jaringan",
  "nama_sekolah": "SMK Negeri 1 Jakarta",
  "nama_instansi": "PT Teknologi Maju",
  "pembimbing_lapangan": "Budi Santoso",
  "pembimbing_sekolah": "Dewi Lestari, S.Pd.",
  "tanggal_mulai": "2026-01-10",
  "tanggal_selesai": "2026-03-10",
  ...
}
```

### Contoh Response

```
Status: 200 OK
Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document
Content-Disposition: attachment; filename="Laporan_PKL_Ahmad_Fauzi.docx"
```

---

## 🗺️ Roadmap

> Status terbaru dari [TODO.md](TODO.md)

### ✅ Sudah Tersedia
- [x] Wizard multi-step dengan navigasi
- [x] Generator DOCX dengan format akademik profesional
- [x] Generator PDF dengan ReportLab
- [x] Native Word Table of Contents (auto-update)
- [x] Penomoran halaman romawi ↔ arabik
- [x] Drag-and-drop content builder (SortableJS)
- [x] Digital signature dengan gambar
- [x] Auto-save ke localStorage
- [x] Image persistence via IndexedDB
- [x] Daftar rujukan dengan hanging indent

### 🔄 Dalam Pengembangan
- [ ] Hide/disable hero section saat Step 4 aktif
- [ ] Sidebar toggle (hide/show) untuk full-screen editor
- [ ] Fix bug upload gambar (file manager terbuka berulang)
- [ ] QA testing untuk desktop layout & nested list drag-drop

### 🔮 Rencana ke Depan
- [ ] Preview laporan sebelum generate
- [ ] Template kustom (pilih format laporan)
- [ ] Multiple bahasa (Indonesia / Inggris)
- [ ] Export langsung ke Google Docs
- [ ] Mode gelap (dark mode)

---

## 🤝 Kontribusi

Kontribusi selalu disambut dengan tangan terbuka! Berikut cara berkontribusi:

1. **Fork** repository ini
2. Buat branch baru (`git checkout -b fitur-keren-anda`)
3. **Commit** perubahan (`git commit -m 'Menambahkan fitur keren'`)
4. **Push** ke branch (`git push origin fitur-keren-anda`)
5. Buat **Pull Request**

### Pedoman Kontribusi

- Ikuti gaya penulisan kode yang sudah ada (ES Modules untuk JS, docstring untuk Python)
- Pastikan tidak ada file temporary yang ikut ter-commit
- Update `TODO.md` jika perlu
- Sertakan deskripsi yang jelas pada Pull Request

---

## 📄 Lisensi

Distributed under the **MIT License**. See `LICENSE` for more information.

---

<div align="center">

**Dibuat dengan ❤️ oleh [AkluxDev](https://github.com/AkluxDev)** & **[MHFADev](https://github.com/MHFADev)**

© 2026 Barrr Creative — *Solusi PKL Cerdas & Cepat*

[![GitHub Stars](https://img.shields.io/github/stars/AkluxDev/sistem-laporan-pkl-v3?style=social)](https://github.com/AkluxDev/sistem-laporan-pkl-v3)
[![GitHub Forks](https://img.shields.io/github/forks/AkluxDev/sistem-laporan-pkl-v3?style=social)](https://github.com/AkluxDev/sistem-laporan-pkl-v3)

</div>
