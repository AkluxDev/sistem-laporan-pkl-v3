# CHANGELOG — Sistem Laporan PKL (Fixed)

## Perbaikan yang Dilakukan

### 1. AI Assistant (KRITIS)
**File:** `static/js/modules/ai_assistant.js`

**Masalah sebelumnya:**
- Kode rusak — fungsi-fungsi dideklarasikan di luar blok `initAiAssistant()` atau terputus
- Model `google/gemini-2.0-flash-lite-preview-02-05:free` sudah tidak tersedia → error 404/400
- Model lain seperti `deepseek/deepseek-r1-distill-llama-70b:free` juga deprecated

**Perbaikan:**
- Rewrite total `ai_assistant.js` dengan struktur yang benar
- Model gratis terbaru yang terverifikasi aktif (2026):
  - `google/gemini-2.0-flash-001` ← **DEFAULT** (cepat, cerdas)
  - `google/gemini-2.5-flash-preview:thinking`
  - `deepseek/deepseek-r1:free`
  - `deepseek/deepseek-chat-v3-0324:free`
  - `meta-llama/llama-4-maverick:free`
  - `mistralai/mistral-small-3.1-24b-instruct:free`
  - `qwen/qwen3-235b-a22b:free`
- System prompt baru berkualitas tinggi — AI paham struktur laporan PKL, PUEBI, gaya akademik
- Template BAB 1-4 sekarang sesuai standar Kemdikbud dengan konten penuh
- Dropdown model diupdate di `templates/index.html` dengan optgroup Gratis/Berbayar

### 2. Tombol Pengesahan (KRITIS)
**File:** `static/js/modules/pengesahan.js`

**Masalah:** Fungsi `tambahPengesahan`, `hapusPengesahan`, `tambahTTD`, `handleCustomJabatan`
tidak di-expose ke `window` → tombol onclick di HTML tidak berfungsi.

**Perbaikan:** Tambah `Object.assign(window, {...})` di akhir file.

### 3. Import generate.js di main.js
**File:** `static/js/main.js`

**Masalah:** `openDownloadModal` dan `downloadGenerated` digunakan tapi tidak di-import.

**Perbaikan:** Update import menjadi:
```js
import { generateLaporan, openDownloadModal, downloadGenerated } from './modules/generate.js';
```
Kemudian expose keduanya ke `window`.

### 4. Judul Cover
**File:** `core/doc_generator.py`

**Perbaikan:** "PRAKTIK KERJA INDUSTRI (PRAKERIN)" → "PRAKTIK KERJA LAPANGAN (PKL)"
Terminologi PKL lebih standar dan umum digunakan (sesuai Permendikbud No. 50 Tahun 2020).

### 5. Struktur & Standar Laporan PKL
Template AI dan struktur dokumen sudah sesuai:
- BAB I: Pendahuluan (Latar Belakang, Tujuan, Manfaat, Waktu & Tempat)
- BAB II: Gambaran Umum Instansi
- BAB III: Pelaksanaan Kegiatan PKL
- BAB IV: Penutup (Kesimpulan & Saran)
- Daftar Rujukan (APA style, hanging indent)
- Penomoran menggunakan angka Romawi pada BAB dan desimal pada sub-bab (1.1, 1.2, dst.)

---

## Cara Penggunaan

### Instalasi
```bash
pip install -r requirements.txt
python app.py
```

### Fitur AI
1. Klik tombol **AI Setup** (pojok kanan atas)
2. Masukkan API Key dari https://openrouter.ai/keys (gratis)
3. Pilih model (default: Gemini 2.0 Flash — gratis & cepat)
4. Klik **Simpan**
5. Gunakan tombol **Tanya AI** saat mengisi isi laporan

### Generate Laporan
1. Isi semua step (1-6)
2. Di step terakhir, klik **Generate Laporan**
3. Pilih format DOCX atau PDF
4. File otomatis terunduh
