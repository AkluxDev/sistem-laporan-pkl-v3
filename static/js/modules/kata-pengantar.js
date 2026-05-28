/* ============================================================
   modules/kata-pengantar.js  — v3.0
   Halaman Kata Pengantar

   v3.0:
   - Kata pembuka & penutup sekarang multi-paragraf (dynamic add/remove)
   - collectKataPengantar() mengembalikan array untuk pembuka & penutup
   ============================================================ */

'use strict';

import { showToast } from './toast.js';

// ── Public API ────────────────────────────────────────────────

export function initKataPengantar() {
    // Ucapan terima kasih
    const container = document.getElementById('containerUcapanTerimaKasih');
    if (container) {
        container.innerHTML = '';
        tambahUcapan();
    }

    // Kata pembuka — init 1 paragraf default
    const contPembuka = document.getElementById('containerKataPembuka');
    if (contPembuka) {
        contPembuka.innerHTML = '';
        tambahParagrafPembuka();
    }

    // Kata penutup — init 1 paragraf default
    const contPenutup = document.getElementById('containerKataPenutup');
    if (contPenutup) {
        contPenutup.innerHTML = '';
        tambahParagrafPenutup();
    }
}

// ── PARAGRAF PEMBUKA ──────────────────────────────────────────

export function tambahParagrafPembuka() {
    const container = document.getElementById('containerKataPembuka');
    if (!container) return;

    const idx = container.querySelectorAll('.paragraf-pembuka-item').length + 1;
    const div = document.createElement('div');
    div.className = 'paragraf-pembuka-item d-flex gap-2 align-items-start mb-2';
    div.innerHTML = `
        <span class="badge bg-primary rounded-pill mt-2 flex-shrink-0" style="min-width:1.5rem;">${idx}</span>
        <textarea class="form-control input-paragraf-pembuka" rows="4"
                  placeholder="Contoh : Puji syukur saya panjatkan ke hadirat Allah SWT, karena atas rahmat dan karunia-Nya, saya dapat menyelesaikan laporan Praktek Kerja Industri (PRAKERIN) ini dengan baik..."></textarea>
        <button type="button" class="btn btn-sm btn-outline-danger flex-shrink-0 mt-1"
                onclick="hapusParagrafPembuka(this)" title="Hapus paragraf">
            <i class="bi bi-trash"></i>
        </button>`;
    container.appendChild(div);
    _renumberParagraf(container, '.paragraf-pembuka-item');
}

export function hapusParagrafPembuka(btn) {
    const container = document.getElementById('containerKataPembuka');
    if (container.querySelectorAll('.paragraf-pembuka-item').length <= 1) {
        showToast('Minimal harus ada 1 paragraf pembuka!', 'warning');
        return;
    }
    const item = btn.closest('.paragraf-pembuka-item');
    item.style.cssText = 'opacity:0;transform:translateX(-20px);transition:all .25s ease;';
    setTimeout(() => {
        item.remove();
        _renumberParagraf(container, '.paragraf-pembuka-item');
    }, 250);
}

// ── PARAGRAF PENUTUP ──────────────────────────────────────────

export function tambahParagrafPenutup() {
    const container = document.getElementById('containerKataPenutup');
    if (!container) return;

    const idx = container.querySelectorAll('.paragraf-penutup-item').length + 1;
    const div = document.createElement('div');
    div.className = 'paragraf-penutup-item d-flex gap-2 align-items-start mb-2';
    div.innerHTML = `
        <span class="badge bg-primary rounded-pill mt-2 flex-shrink-0" style="min-width:1.5rem;">${idx}</span>
        <textarea class="form-control input-paragraf-penutup" rows="4"
                  placeholder="Contoh : Kami menyadari dalam penyusunan ini banyak kekurangannya. Oleh karena itu kami mengharapkan kritik dan saran..."></textarea>
        <button type="button" class="btn btn-sm btn-outline-danger flex-shrink-0 mt-1"
                onclick="hapusParagrafPenutup(this)" title="Hapus paragraf">
            <i class="bi bi-trash"></i>
        </button>`;
    container.appendChild(div);
    _renumberParagraf(container, '.paragraf-penutup-item');
}

export function hapusParagrafPenutup(btn) {
    const container = document.getElementById('containerKataPenutup');
    if (container.querySelectorAll('.paragraf-penutup-item').length <= 1) {
        showToast('Minimal harus ada 1 paragraf penutup!', 'warning');
        return;
    }
    const item = btn.closest('.paragraf-penutup-item');
    item.style.cssText = 'opacity:0;transform:translateX(-20px);transition:all .25s ease;';
    setTimeout(() => {
        item.remove();
        _renumberParagraf(container, '.paragraf-penutup-item');
    }, 250);
}

// ── UCAPAN TERIMA KASIH ───────────────────────────────────────

export function tambahUcapan() {
    const container = document.getElementById('containerUcapanTerimaKasih');
    if (!container) return;

    const idx = container.querySelectorAll('.ucapan-item').length + 1;
    const div = document.createElement('div');
    div.className = 'ucapan-item';
    div.innerHTML = _ucapanTemplate(idx);
    container.appendChild(div);
    _renumberUcapan();
    _updateBadge();
}

export function hapusUcapan(btn) {
    const container = document.getElementById('containerUcapanTerimaKasih');
    if (container.querySelectorAll('.ucapan-item').length <= 1) {
        showToast('Minimal harus ada 1 ucapan terima kasih!', 'warning');
        return;
    }

    const item = btn.closest('.ucapan-item');
    item.style.cssText = 'opacity:0;transform:translateX(-20px);transition:all .25s ease;';
    setTimeout(() => {
        item.remove();
        _renumberUcapan();
        _updateBadge();
    }, 250);
}

export function handleUcapanJabatanSelect(select) {
    const wrapper = select.closest('.col-md-7');
    const input   = wrapper?.querySelector('.input-ucapan-jabatan');
    if (!input) return;

    if (select.value === 'custom' || select.value === '') {
        input.value = '';
        input.focus();
    } else {
        input.value = select.value;
    }
}

// ── DATA COLLECTION ───────────────────────────────────────────

export function collectKataPengantar() {
    const get = id => document.getElementById(id)?.value?.trim() ?? '';

    // Kata pembuka — kumpulkan semua paragraf
    const kata_pembuka = [...document.querySelectorAll('#containerKataPembuka .paragraf-pembuka-item')]
        .map(item => item.querySelector('.input-paragraf-pembuka')?.value?.trim() ?? '')
        .filter(Boolean);

    // Kata penutup — kumpulkan semua paragraf
    const kata_penutup = [...document.querySelectorAll('#containerKataPenutup .paragraf-penutup-item')]
        .map(item => item.querySelector('.input-paragraf-penutup')?.value?.trim() ?? '')
        .filter(Boolean);

    const ucapan = [...document.querySelectorAll('#containerUcapanTerimaKasih .ucapan-item')]
        .map(item => ({
            nama   : item.querySelector('.input-ucapan-nama')?.value?.trim()    ?? '',
            jabatan: item.querySelector('.input-ucapan-jabatan')?.value?.trim() ?? '',
        }));

    return {
        judul        : get('kpJudul'),
        kata_pembuka,
        ucapan_terima: ucapan,
        kata_penutup,
        kota_tanggal : get('kpKotaTanggal'),
        nama_penulis : get('kpNamaPenulis'),
    };
}

// ── Private ───────────────────────────────────────────────────

function _renumberParagraf(container, selector) {
    container.querySelectorAll(selector).forEach((item, idx) => {
        const badge = item.querySelector('.badge');
        if (badge) badge.textContent = idx + 1;
    });
}

function _renumberUcapan() {
    document.querySelectorAll('#containerUcapanTerimaKasih .ucapan-item').forEach((item, idx) => {
        const num   = item.querySelector('.ucapan-num');
        const label = item.querySelector('.ucapan-label');
        if (num)   num.textContent   = idx + 1;
        if (label) label.textContent = `Ucapan #${idx + 1}`;
    });
}

function _updateBadge() {
    const badge = document.getElementById('badgeJumlahUcapan');
    if (!badge) return;
    badge.textContent = document.querySelectorAll('#containerUcapanTerimaKasih .ucapan-item').length;
}

function _ucapanTemplate(idx) {
    const jabatanOptions = [
        'Kepala Sekolah',
        'Wakil Kepala Sekolah Bidang Kesiswaan',
        'Wakil Kepala Sekolah Bidang Kurikulum',
        'Wakil Kepala Sekolah Bidang Humas',
        'Wakil Kepala Sekolah Bidang Sarana dan Prasarana',
        'Kepala Program Keahlian',
        'Guru Pembimbing',
        'Pembimbing Lapangan',
        'Direktur / Pimpinan Perusahaan',
        'Orang Tua / Wali',
    ].map(j => `<option value="${j}">${j}</option>`).join('');

    return `
        <div class="ucapan-header d-flex align-items-center gap-2 mb-2">
            <div class="ucapan-num kegiatan-num">${idx}</div>
            <span class="ucapan-label kegiatan-label">Ucapan #${idx}</span>
            <button type="button" class="btn-remove-kegiatan ms-auto"
                    onclick="hapusUcapan(this)" title="Hapus">
                <i class="bi bi-x"></i>
            </button>
        </div>
        <div class="row g-2 mb-3">
            <div class="col-md-5">
                <label class="form-label">Nama Lengkap &amp; Gelar</label>
                <input type="text" class="form-control input-ucapan-nama"
                       placeholder="Contoh : Bpk. Ir. Gr. Ahmad, S.Kom.">
            </div>
            <div class="col-md-7">
                <label class="form-label">Jabatan</label>
                <select class="form-select input-ucapan-jabatan-select"
                        onchange="handleUcapanJabatanSelect(this)">
                    <option value="">— Pilih atau ketik manual —</option>
                    ${jabatanOptions}
                    <option value="custom">Lainnya...</option>
                </select>
                <input type="text" class="form-control input-ucapan-jabatan mt-1"
                       placeholder="Jabatan (bisa diedit langsung)">
            </div>
        </div>`;
}

// ── Ekspos ke window ─────────────────────────────────────────
Object.assign(window, {
    tambahUcapan, hapusUcapan, handleUcapanJabatanSelect,
    tambahParagrafPembuka, hapusParagrafPembuka,
    tambahParagrafPenutup, hapusParagrafPenutup,
});
