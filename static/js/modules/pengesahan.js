/* ============================================================
   modules/pengesahan.js  — v2.1 (fixed)
   CRUD halaman pengesahan & penandatangan (TTD)

   FIX:
   - tambahTTD: selector sebelumnya mencari '.mb-2' yang terlalu
     ambigus. Sekarang langsung mencari '.container-ttd' di dalam
     .pengesahan-container terdekat.
   - hapusPengesahan: animasi + renumber sudah berjalan benar.
   - collectPengesahanAsync: error handling FileReader diperkuat.
   ============================================================ */

'use strict';

import { showToast } from './toast.js';

let pengesahanCount = 0;

// ── Public API ────────────────────────────────────────────────

export function renderPengesahanInitial() {
    const container = document.getElementById('containerlembarpengesahan');
    if (!container) return;
    container.innerHTML = '';
    pengesahanCount = 0;
    tambahPengesahan();
}

export function tambahPengesahan() {
    pengesahanCount++;
    const container = document.getElementById('containerlembarpengesahan');
    if (!container) return;

    const idx = document.querySelectorAll('.pengesahan-item').length + 1;
    const div = document.createElement('div');
    div.className = 'pengesahan-item';
    div.innerHTML = _pengesahanTemplate(idx);
    container.appendChild(div);
}

export function hapusPengesahan(btn) {
    const item = btn.closest('.pengesahan-item');
    if (!item) return;

    if (document.querySelectorAll('.pengesahan-item').length <= 1) {
        showToast('Minimal harus ada 1 halaman pengesahan!', 'warning');
        return;
    }

    item.style.cssText = 'opacity:0;transform:translateX(-20px);transition:all .25s ease;';
    setTimeout(() => {
        item.remove();
        _renumberPengesahan();
    }, 250);
}

/**
 * FIX: Tidak lagi mencari '.mb-2' yang rapuh.
 * Cari '.container-ttd' di dalam .pengesahan-container yang sama.
 */
export function tambahTTD(btn) {
    const pengesahanContainer = btn.closest('.pengesahan-container');
    const ttdContainer        = pengesahanContainer?.querySelector('.container-ttd');
    if (!ttdContainer) return;

    const div = document.createElement('div');
    div.className = 'ttd-item border rounded p-2 mb-2';
    div.innerHTML = _ttdTemplate();
    ttdContainer.appendChild(div);
}

export function handleCustomJabatan(select) {
    const parent = select.closest('.col-md-4');
    const input  = parent?.querySelector('.input-jabatan-ttd');
    if (!input) return;

    if (select.value === 'custom') {
        input.classList.remove('d-none');
        input.focus();
    } else {
        input.classList.add('d-none');
        input.value = '';
    }
}

// ── Private ───────────────────────────────────────────────────

function _renumberPengesahan() {
    document.querySelectorAll('.pengesahan-item').forEach((item, idx) => {
        const num   = item.querySelector('.pengesahan-num');
        const label = item.querySelector('.pengesahan-label');
        if (num)   num.textContent   = idx + 1;
        if (label) label.textContent = `Halaman Pengesahan #${idx + 1}`;
    });
}

function _pengesahanTemplate(idx) {
    return `
        <div class="pengesahan-container">
            <div class="pengesahan-header">
                <div class="pengesahan-num">${idx}</div>
                <span class="pengesahan-label">Halaman Pengesahan #${idx}</span>
                <button type="button" class="btn-remove-pengesahan"
                        onclick="hapusPengesahan(this)">
                    <i class="bi bi-x"></i>
                </button>
            </div>

            <div class="row g-2 mb-2">
                <div class="col-md-6">
                    <label class="form-label">Judul <span class="req">*</span></label>
                    <input type="text" class="form-control input-judul"
                           placeholder="Contoh : Lembar Pengesahan Sekolah">
                </div>
                <div class="col-md-6">
                    <label class="form-label">Nama Instansi / PT <span class="req">*</span></label>
                    <input type="text" class="form-control input-pt"
                           placeholder="Contoh : PT. Hayat Teknologi Informatika">
                </div>
            </div>

            <div class="mb-2">
                <label class="form-label">Tujuan Pembuatan <span class="req">*</span></label>
                <input type="text" class="form-control input-tujuan"
                       placeholder="Contoh : Diajukan sebagai salah satu syarat untuk memenuhi kelengkapan tugas akhir...">
            </div>

            <div class="row g-2 mb-2">
                <div class="col-md-4">
                    <label class="form-label">Tahun Pelajaran</label>
                    <input type="text" class="form-control input-tahun" placeholder="2025/2026">
                </div>
                <div class="col-md-4">
                    <label class="form-label">Nama Penyusun</label>
                    <input type="text" class="form-control input-nama" placeholder="Nama Lengkap">
                </div>
                <div class="col-md-4">
                    <label class="form-label">NIS / NISN</label>
                    <input type="text" class="form-control input-nis" placeholder="Nomor Induk">
                </div>
            </div>

            <div class="row g-2 mb-2">
                <div class="col-md-6">
                    <label class="form-label">Kelas / Jurusan</label>
                    <input type="text" class="form-control input-kelas" placeholder="Contoh : XII TJKT 3">
                </div>
                <div class="col-md-6">
                    <label class="form-label">Tanggal Pengesahan</label>
                    <input type="date" class="form-control input-tanggal">
                </div>
            </div>

            <hr>

            <div class="mb-2">
                <label class="form-label fw-semibold">Penandatangan</label>
                <div class="container-ttd mt-2"></div>
                <button type="button" class="btn btn-sm btn-outline-primary mt-2"
                        onclick="tambahTTD(this)">
                    <i class="bi bi-plus-circle me-1"></i> Tambah Penandatangan
                </button>
            </div>
        </div>`;
}

function _ttdTemplate() {
    const jabatanOptions = [
        'Kepala Program Keahlian',
        'Pembimbing',
        'Kepala Sekolah',
        'Guru Pembimbing',
        'Wakil Kepala Sekolah Bidang Humas',
        'Wakil Kepala Sekolah Bidang Kurikulum',
        'Wakil Kepala Sekolah Bidang Kesiswaan',
        'Wakil Kepala Sekolah Bidang Sarana dan Prasarana',
        'Direktur / Pimpinan Perusahaan',
        'Pembimbing Lapangan',
    ].map(j => `<option value="${j}">${j}</option>`).join('');

    return `
        <div class="row g-2 align-items-end">
            <div class="col-md-3">
                <label class="form-label form-label-sm">Nama</label>
                <input type="text" class="form-control form-control-sm input-nama-ttd"
                       placeholder="Nama lengkap &amp; gelar">
            </div>
            <div class="col-md-4">
                <label class="form-label form-label-sm">Jabatan</label>
                <select class="form-select form-select-sm input-jabatan-select"
                        onchange="handleCustomJabatan(this)">
                    <option value="">— Pilih Jabatan —</option>
                    ${jabatanOptions}
                    <option value="custom">Lainnya...</option>
                </select>
                <input type="text" class="form-control form-control-sm input-jabatan-ttd mt-1 d-none"
                       placeholder="Ketik jabatan manual">
            </div>
            <div class="col-md-3">
                <label class="form-label form-label-sm">File Tanda Tangan</label>
                <input type="file" class="form-control form-control-sm input-file-ttd"
                       accept="image/png,image/jpg,image/jpeg,image/gif,image/webp">
                <div class="form-text" style="font-size:10px;">PNG transparan dianjurkan</div>
            </div>
            <div class="col-md-2">
                <button type="button" class="btn btn-outline-danger btn-sm w-100"
                        onclick="this.closest('.ttd-item').remove()">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
        </div>`;
}

// ── Data collection ───────────────────────────────────────────

export async function collectPengesahanAsync() {
    const hasil = [];

    for (const item of document.querySelectorAll('.pengesahan-item')) {
        const getVal = sel => item.querySelector(sel)?.value?.trim() ?? '';
        const signers = [];

        for (const ttd of item.querySelectorAll('.ttd-item')) {
            let jabatan = ttd.querySelector('.input-jabatan-select')?.value ?? '';
            if (jabatan === 'custom') {
                jabatan = ttd.querySelector('.input-jabatan-ttd')?.value?.trim() ?? '';
            }

            let base64Img = null;
            const fileInput = ttd.querySelector('.input-file-ttd');
            if (fileInput?.files?.length) {
                base64Img = await new Promise(resolve => {
                    const reader = new FileReader();
                    reader.onload  = () => resolve(reader.result);
                    reader.onerror = () => resolve(null);
                    reader.readAsDataURL(fileInput.files[0]);
                });
            }

            signers.push({
                nama   : ttd.querySelector('.input-nama-ttd')?.value?.trim() ?? '',
                jabatan,
                image  : base64Img,
            });
        }

        hasil.push({
            judul           : getVal('.input-judul'),
            nama_pt         : getVal('.input-pt'),
            tujuan          : getVal('.input-tujuan'),
            tahun_pelajaran : getVal('.input-tahun'),
            nama_penyusun   : getVal('.input-nama'),
            nis             : getVal('.input-nis'),
            kelas           : getVal('.input-kelas'),
            tanggal         : getVal('.input-tanggal'),
            penandatangan   : signers,
        });
    }
    return hasil;
}


// ── Ekspos ke window (diperlukan oleh onclick di HTML) ────────
Object.assign(window, {
    tambahPengesahan, hapusPengesahan, tambahTTD, handleCustomJabatan,
});
