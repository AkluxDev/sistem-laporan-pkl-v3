/* ============================================================
   modules/generate.js — v4.1 (Optimized)
   Kumpulkan data form → kirim ke Flask → download .docx

   PERBAIKAN:
   - Integrasi dengan isi_laporan_builder.js
   - Support override data isi laporan (dari main.js)
   - Expose window._generateLaporanInternal
   ============================================================ */
'use strict';

import { showToast }                  from './toast.js';
import { validateStep }               from './validation.js';
import { currentStep }                from './wizard.js';
import { collectKataPengantar }       from './kata-pengantar.js';
import { collectPengesahanAsync }     from './pengesahan.js';
import { collectIsiLaporanAsync }     from './isi_laporan_builder.js';

/**
 * Fungsi internal pemicu generate.
 * @param {Array} isiLaporanOverride Data isi laporan yang sudah diproses (opsional)
 */
export async function generateDocumentInternal(isiLaporanOverride = null, format = 'docx') {
    const requestedFormat = format === 'pdf' ? 'pdf' : 'docx';
    _setLoading(true);
    try {
        const data = await collectFormDataAsync();
        
        // Gunakan isi laporan yang dikirim jika ada (versi lengkap dengan base64)
        if (isiLaporanOverride) {
            data.isi_laporan = isiLaporanOverride;
        }

        const coverFile = window._cover?.getCoverFile?.() ?? null;
        const opts      = _buildFetch(data, coverFile);
        const res       = await fetch(`/generate/${requestedFormat}`, opts);
        
        if (!res.ok) {
            let msg = `HTTP ${res.status}`;
            try { const j = await res.json(); msg = j.error ?? msg; } catch {}
            throw new Error(msg);
        }
        
        await _download(res, data.nama_lengkap, requestedFormat);
        showToast(`🎉 Laporan ${requestedFormat.toUpperCase()} berhasil dibuat!`, 'success');
    } catch (err) {
        showToast(`❌ Gagal: ${err.message}`, 'danger');
        console.error('[generate]', err);
    } finally {
        _setLoading(false);
    }
}

// Expose ke window agar bisa dipanggil main.js
window._generateLaporanInternal = generateDocumentInternal;

/**
 * Entry point utama (dipanggil dari index.html atau wizard).
 * Sekarang dialihkan ke handler di main.js agar sinkron dengan auto-save state.
 */
export async function generateLaporan() {
    if (window.generateLaporan && typeof window.generateLaporan === 'function') {
       return await window.generateLaporan();
    }
    return generateDocumentInternal();
}

export function openDownloadModal() {
    const modalEl = document.getElementById('modalDownloadFormat');
    if (!modalEl || !window.bootstrap?.Modal) {
        return generateDocumentInternal(null, 'docx');
    }
    window.bootstrap.Modal.getOrCreateInstance(modalEl).show();
}

export async function downloadGenerated(format = 'docx') {
    const modalEl = document.getElementById('modalDownloadFormat');
    if (modalEl && window.bootstrap?.Modal) {
        window.bootstrap.Modal.getOrCreateInstance(modalEl).hide();
    }
    return generateDocumentInternal(null, format);
}

export async function collectFormDataAsync() {
    const get = id => document.getElementById(id)?.value?.trim() ?? '';

    // Penting: collectIsiLaporanAsync() di sini mungkin mengembalikan format lama 
    // jika dipanggil langsung. Namun kita prioritaskan builder v3.
    const [pengesahan, isi_laporan] = await Promise.all([
        collectPengesahanAsync(),
        collectIsiLaporanAsync(true), // Sertakan base64 untuk generate langsung
    ]);
    const kata_pengantar = collectKataPengantar();

    const rujukan = [...document.querySelectorAll('.rujukan-item')]
        .map(item => ({ teks: item.querySelector('.input-rujukan')?.value?.trim() ?? '' }))
        .filter(r => r.teks);

    return {
        nama_lengkap             : get('namaLengkap'),
        nis_nim                  : get('nisNim'),
        kelas_jurusan            : get('kelasJurusan'),
        nama_sekolah             : get('namaSekolah'),
        nama_instansi            : get('namaInstansi'),
        nama_pembimbing_lapangan : get('namaPembimbingLapangan'),
        nama_pembimbing_sekolah  : get('namaPembimbingSekolah'),
        kota_ttd                 : get('kotaTtd'),
        tanggal_mulai            : get('tanggalMulai'),
        tanggal_selesai          : get('tanggalSelesai'),
        tahun_ajaran             : get('tahunAjaran') || '',
        motto                    : get('motto') || '',
        buat_cover               : document.getElementById('switchCover')?.checked      ?? false,
        buat_daftar_isi          : document.getElementById('switchDaftarIsi')?.checked  ?? false,
        buat_tanda_tangan        : document.getElementById('switchTandaTangan')?.checked ?? false,
        pengesahan,
        kata_pengantar,
        isi_laporan,
        rujukan,
    };
}

function _buildFetch(data, coverFile) {
    if (data.buat_cover && coverFile) {
        const fd = new FormData();
        fd.append('data', JSON.stringify(data));
        fd.append('cover_image', coverFile);
        return { method: 'POST', body: fd };
    }
    return { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) };
}

async function _download(res, nama, format = 'docx') {
    const blob     = await res.blob();
    const url      = URL.createObjectURL(blob);
    const safe     = (nama || 'Siswa').replace(/\s+/g, '_').slice(0, 50);
    const filename = `Laporan_PKL_${safe}.${format}`;
    const a = Object.assign(document.createElement('a'), { href: url, download: filename });
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
}

function _setLoading(on) {
    document.querySelectorAll('.btn-generate').forEach(b => b.disabled = on);
    document.querySelectorAll('[id^="btnGenerateLabel"]').forEach(el => {
        el.innerHTML = on
            ? '<i class="bi bi-hourglass-split me-2"></i>Sedang membuat laporan...'
            : '<i class="bi bi-download me-2"></i>Generate &amp; Unduh';
    });
    document.querySelectorAll('[id^="btnGenerateSpinner"]').forEach(el =>
        el.classList.toggle('d-none', !on));
}

Object.assign(window, {
    openDownloadModal,
    downloadGenerated,
});
