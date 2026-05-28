/* ============================================================
   modules/halaman_rujukan.js  — v2.1 (fixed)
   CRUD entri rujukan pustaka

   FIX:
   - hapusRujukan: diekspor ke window agar onclick di HTML bekerja
   - _renumberRujukan: dipanggil saat hapus untuk sinkron nomor
   - Template: gunakan data-removable untuk hapusItem compatibility
   ============================================================ */

'use strict';

import { showToast } from './toast.js';

// ── Public API ────────────────────────────────────────────────

export function renderRujukanInitial() {
    const container = document.getElementById('containerRujukan');
    if (!container) return;
    container.innerHTML = '';
    tambahRujukan();
}

export function tambahRujukan() {
    const container = document.getElementById('containerRujukan');
    if (!container) return;

    const idx = container.querySelectorAll('.rujukan-item').length + 1;
    const div = document.createElement('div');
    div.className = 'kegiatan-item rujukan-item';
    div.innerHTML = _rujukanTemplate(idx);
    container.appendChild(div);
    _renumberRujukan();
}

export function hapusRujukan(btn) {
    const container = document.getElementById('containerRujukan');
    const item      = btn.closest('.rujukan-item');

    if (container.querySelectorAll('.rujukan-item').length <= 1) {
        showToast('Minimal harus ada 1 rujukan atau kosongkan isinya!', 'warning');
        return;
    }

    item.style.cssText = 'opacity:0;transform:translateX(-20px);transition:all .25s ease;';
    setTimeout(() => {
        item.remove();
        _renumberRujukan();
    }, 250);
}

// ── Private ───────────────────────────────────────────────────

function _renumberRujukan() {
    document.querySelectorAll('.rujukan-item').forEach((item, idx) => {
        const num   = item.querySelector('.rujukan-num');
        const label = item.querySelector('.rujukan-label');
        if (num)   num.textContent   = idx + 1;
        if (label) label.textContent = `Rujukan #${idx + 1}`;
    });
}

function _rujukanTemplate(idx) {
    return `
        <div class="kegiatan-header">
            <div class="kegiatan-num rujukan-num">${idx}</div>
            <span class="kegiatan-label rujukan-label">Rujukan #${idx}</span>
            <button type="button" class="btn-remove-kegiatan"
                    onclick="hapusRujukan(this)" title="Hapus rujukan">
                <i class="bi bi-x"></i>
            </button>
        </div>
        <div class="mt-2">
            <label class="form-label">
                Teks Referensi / Daftar Pustaka <span class="req">*</span>
            </label>
            <textarea class="form-control input-rujukan" rows="2"
                      placeholder="Contoh: Budi, S. (2025). Cara Menginstal Server Bebas Iklan. Jakarta: Penerbit Teknologi."></textarea>
            <div class="form-text">Gunakan format APA, MLA, atau IEEE sesuai ketentuan sekolah.</div>
            <div class="invalid-feedback">Teks referensi wajib diisi.</div>
        </div>`;
}

// ── Ekspos ke window (diperlukan oleh onclick di HTML) ────────
// FIX: hapusRujukan harus ada di window agar tombol hapus bekerja
Object.assign(window, { hapusRujukan, tambahRujukan });
