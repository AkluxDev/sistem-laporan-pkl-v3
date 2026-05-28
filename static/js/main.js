// Cache-buster: 270526-fixed
/* ============================================================
   main.js  â€”  v3.1 (Fixed)
   Entry point aplikasi Sistem Laporan PKL
   ============================================================ */

'use strict';

import { initNavbarScroll }                         from './modules/navbar.js';
import { initWizard, nextStep, prevStep, goToStep } from './modules/wizard.js';
import { initLiveValidationClear }                  from './modules/validation.js';

import {
    renderPengesahanInitial, tambahPengesahan, hapusPengesahan,
    tambahTTD, handleCustomJabatan,
} from './modules/pengesahan.js';

import {
    initKataPengantar, tambahUcapan, hapusUcapan,
    handleUcapanJabatanSelect,
    tambahParagrafPembuka, hapusParagrafPembuka,
    tambahParagrafPenutup, hapusParagrafPenutup,
} from './modules/kata-pengantar.js';

import {
    initIsiBuilder,
    initIsiBuilderBindings,
    collectIsiLaporanAsync,
    selectNode,
    quickAdd,
} from './modules/isi_laporan_builder.js';

import { generateLaporan, openDownloadModal, downloadGenerated }  from './modules/generate.js';
import { getImage, clearAllImages } from './modules/image_db.js';

import {
    renderRujukanInitial, tambahRujukan, hapusRujukan,
} from './modules/halaman_rujukan.js';

import { setupRecoveryTools } from './modules/recovery.js';

import {
    initCoverDropZone, handleCoverImageSelect,
    removeCoverImage, getCoverFile, restoreCoverImage, toggleOptionCard,
} from './modules/cover.js';

import { initAiAssistant } from './modules/ai_assistant.js';
import './modules/ai_kata_pengantar.js';

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  AUTOSAVE â€” Comprehensive Draft System
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

const DRAFT_KEY = 'draft_laporan_full';
let _saveTimer = null;
let isRestoring = false;

function autoResizeTextarea(textarea) {
    if (!(textarea instanceof HTMLTextAreaElement)) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
}

function initAutoResize(scope = document) {
    scope.querySelectorAll?.('textarea').forEach(autoResizeTextarea);
}

function updateWorkspaceIndicators() {
    const step = window.currentStep || 1;
    const sidebar = document.getElementById('sidebarCurrentStep');
    const mobile = document.getElementById('mobileStepIndicator');
    if (sidebar) sidebar.textContent = `${step}/6`;
    if (mobile) mobile.textContent = `${step} dari 6`;
}

function _debouncedSave() {
    if (isRestoring) return;
    clearTimeout(_saveTimer);
    _saveTimer = setTimeout(() => saveDraft(), 400);
}

async function saveDraft() {
    if (isRestoring) return;
    try {
        const draft = {};
        console.log('[saveDraft] Saving...');

        // 1. Identitas
        const identitasIds = [
            'namaLengkap', 'nisNim', 'kelasJurusan', 'namaSekolah',
            'namaInstansi', 'namaPembimbingLapangan', 'namaPembimbingSekolah',
            'tanggalMulai', 'tanggalSelesai',
        ];
        draft.identitas = {};
        for (const id of identitasIds) {
            draft.identitas[id] = document.getElementById(id)?.value ?? '';
        }

        // 2. Pengesahan
        draft.pengesahan = [...document.querySelectorAll('.pengesahan-item')].map(item => {
            const getVal = sel => item.querySelector(sel)?.value?.trim() ?? '';
            const ttds = [...item.querySelectorAll('.ttd-item')].map(ttd => ({
                nama: ttd.querySelector('.input-nama-ttd')?.value?.trim() ?? '',
                jabatan_select: ttd.querySelector('.input-jabatan-select')?.value ?? '',
                jabatan_manual: ttd.querySelector('.input-jabatan-ttd')?.value?.trim() ?? '',
            }));
            return {
                judul: getVal('.input-judul'), pt: getVal('.input-pt'), tujuan: getVal('.input-tujuan'),
                tahun: getVal('.input-tahun'), nama: getVal('.input-nama'), nis: getVal('.input-nis'),
                kelas: getVal('.input-kelas'), tanggal: getVal('.input-tanggal'),
                ttds
            };
        });

        // 3. Kata Pengantar
        draft.kataPengantar = {
            judul: document.getElementById('kpJudul')?.value ?? '',
            pembuka: [...document.querySelectorAll('#containerKataPembuka .input-paragraf-pembuka')].map(el => el.value ?? ''),
            penutup: [...document.querySelectorAll('#containerKataPenutup .input-paragraf-penutup')].map(el => el.value ?? ''),
            ucapan: [...document.querySelectorAll('#containerUcapanTerimaKasih .ucapan-item')].map(item => ({
                nama: item.querySelector('.input-ucapan-nama')?.value ?? '',
                jabatan_select: item.querySelector('.input-ucapan-jabatan-select')?.value ?? '',
                jabatan: item.querySelector('.input-ucapan-jabatan')?.value ?? '',
            })),
            kota_tanggal: document.getElementById('kpKotaTanggal')?.value ?? '',
            nama_penulis: document.getElementById('kpNamaPenulis')?.value ?? '',
        };

        // 4. Isi Laporan
        draft.isiLaporan = await collectIsiLaporanAsync(false);

        // 5. Rujukan
        draft.rujukan = [...document.querySelectorAll('.rujukan-item .input-rujukan')].map(el => el.value ?? '');

        // 6. Opsi
        draft.opsi = {
            cover: document.getElementById('switchCover')?.checked ?? false,
            daftarIsi: document.getElementById('switchDaftarIsi')?.checked ?? false,
            tandaTangan: document.getElementById('switchTandaTangan')?.checked ?? false,
            kotaTtd: document.getElementById('kotaTtd')?.value ?? '',
        };

        localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
        
        const indicator = document.getElementById('saveIndicator');
        if (indicator) {
            indicator.innerHTML = '<i class="bi bi-cloud-check text-success"></i> Autosaved';
            indicator.classList.add('visible');
            setTimeout(() => indicator.classList.remove('visible'), 2000);
        }
    } catch (err) { console.warn('[saveDraft] Fail:', err); }
}

async function loadDraft() {
    isRestoring = true;
    try {
        let raw = localStorage.getItem(DRAFT_KEY);
        if (!raw) { isRestoring = false; return; }

        let draft;
        try { draft = JSON.parse(raw); } catch (e) { isRestoring = false; return; }
        if (!draft) { isRestoring = false; return; }

        console.log('[loadDraft] Restoring data sections...');

        // 1. Identitas
        try {
            if (draft.identitas) {
                for (const [id, val] of Object.entries(draft.identitas)) {
                    const el = document.getElementById(id); if (el) el.value = val;
                }
            }
        } catch (e) {}

        // 2. Pengesahan
        try {
            if (draft.pengesahan?.length) {
                const container = document.getElementById('containerlembarpengesahan');
                if (container) {
                    container.innerHTML = '';
                    for (const p of draft.pengesahan) {
                        tambahPengesahan();
                        const item = [...container.querySelectorAll('.pengesahan-item')].pop();
                        const sV = (sel, v) => { const el = item.querySelector(sel); if (el) el.value = v; };
                        sV('.input-judul', p.judul); sV('.input-pt', p.pt); sV('.input-tujuan', p.tujuan);
                        sV('.input-tahun', p.tahun); sV('.input-nama', p.nama); sV('.input-nis', p.nis);
                        sV('.input-kelas', p.kelas); sV('.input-tanggal', p.tanggal);
                        if (p.ttds?.length) {
                            for (const ttd of p.ttds) {
                                const ttdBtn = item.querySelector('button[onclick="tambahTTD(this)"]');
                                if (ttdBtn) ttdBtn.click();
                                const lastTtd = [...item.querySelectorAll('.ttd-item')].pop();
                                if (lastTtd) {
                                    const nI = lastTtd.querySelector('.input-nama-ttd'); if (nI) nI.value = ttd.nama;
                                    const jS = lastTtd.querySelector('.input-jabatan-select');
                                    if (jS) {
                                        jS.value = ttd.jabatan_select;
                                        if (ttd.jabatan_select === 'custom') {
                                            handleCustomJabatan(jS);
                                            const mI = lastTtd.querySelector('.input-jabatan-ttd'); if (mI) mI.value = ttd.jabatan_manual;
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        } catch (e) {}

        // 3. Kata Pengantar
        try {
            if (draft.kataPengantar) {
                const kp = draft.kataPengantar;
                const jE = document.getElementById('kpJudul'); if (jE) jE.value = kp.judul || '';
                const cPb = document.getElementById('containerKataPembuka');
                if (cPb && kp.pembuka?.length) {
                    cPb.innerHTML = ''; kp.pembuka.forEach(t => { tambahParagrafPembuka(); [...cPb.querySelectorAll('.input-paragraf-pembuka')].pop().value = t; });
                }
                const cPt = document.getElementById('containerKataPenutup');
                if (cPt && kp.penutup?.length) {
                    cPt.innerHTML = ''; kp.penutup.forEach(t => { tambahParagrafPenutup(); [...cPt.querySelectorAll('.input-paragraf-penutup')].pop().value = t; });
                }
                const cU = document.getElementById('containerUcapanTerimaKasih');
                if (cU && kp.ucapan?.length) {
                    cU.innerHTML = ''; kp.ucapan.forEach(u => {
                        tambahUcapan(); const lU = [...cU.querySelectorAll('.ucapan-item')].pop();
                        if (lU) {
                            const nE = lU.querySelector('.input-ucapan-nama'); if (nE) nE.value = u.nama;
                            const jS = lU.querySelector('.input-ucapan-jabatan-select'); if (jS) jS.value = u.jabatan_select;
                            const jI = lU.querySelector('.input-ucapan-jabatan'); if (jI) jI.value = u.jabatan;
                        }
                    });
                }
                const ktE = document.getElementById('kpKotaTanggal'); if (ktE) ktE.value = kp.kota_tanggal || '';
                const pnE = document.getElementById('kpNamaPenulis'); if (pnE) pnE.value = kp.nama_penulis || '';
            }
        } catch (e) {}

        // 4. Isi Laporan
        try {
            if (draft.isiLaporan?.length && window.__restoreIsiBuilderFromDraft) {
                await window.__restoreIsiBuilderFromDraft(draft.isiLaporan);
            }
        } catch (e) {}

        // 5. Rujukan
        try {
            if (draft.rujukan?.length) {
                const cR = document.getElementById('containerRujukan');
                if (cR) {
                    cR.innerHTML = ''; draft.rujukan.forEach(t => { tambahRujukan(); [...cR.querySelectorAll('.input-rujukan')].pop().value = t; });
                }
            }
        } catch (e) {}

        // 6. Opsi
        try {
            if (draft.opsi) {
                const o = draft.opsi;
                _restoreCheckbox('switchCover', 'cardCover', o.cover);
                _restoreCheckbox('switchDaftarIsi', 'cardDaftarIsi', o.daftarIsi);
                _restoreCheckbox('switchTandaTangan', 'cardTandaTangan', o.tandaTangan);
                if (o.cover) {
                    const w = document.getElementById('coverImageWrapper'); if (w) w.style.display = 'block';
                    restoreCoverImage().catch(() => {});
                }
                if (o.tandaTangan) {
                    const w = document.getElementById('kotaWrapper'); if (w) w.style.display = 'block';
                    const k = document.getElementById('kotaTtd'); if (k) k.value = o.kotaTtd || '';
                }
            }
        } catch (e) {}

    } catch (err) { console.error('[loadDraft] Fail:', err); }
    finally {
        setTimeout(() => { isRestoring = false; console.log('[loadDraft] Unlocked.'); }, 800);
    }
}

function _restoreCheckbox(id, cardId, val) {
    const el = document.getElementById(id); if (el) el.checked = !!val;
    const card = document.getElementById(cardId); if (card) card.classList.toggle('selected', !!val);
}

async function hapusSemuaData() {
    if (confirm('Hapus semua data?')) {
        localStorage.removeItem(DRAFT_KEY);
        await clearAllImages();
        window.location.reload();
    }
}

Object.assign(window, {
    nextStep, prevStep, goToStep,
    selectNode, quickAdd,
    tambahPengesahan, hapusPengesahan, tambahTTD, handleCustomJabatan,
    tambahUcapan, hapusUcapan, handleUcapanJabatanSelect,
    tambahParagrafPembuka, hapusParagrafPembuka,
    tambahParagrafPenutup, hapusParagrafPenutup,
    hapusSemuaData,
    generateLaporan(format = null) {
        if (!format && window.openDownloadModal) return window.openDownloadModal();
        return collectIsiLaporanAsync(true).then(isi => {
            if (window._generateLaporanInternal) return window._generateLaporanInternal(isi, format || 'docx');
        });
    },
    tambahRujukan, hapusRujukan,
    handleCoverImageSelect, removeCoverImage, toggleOptionCard,
    openDownloadModal, downloadGenerated,
    currentStep: 1,
    // Populate dropdown BAB di modal AI saat dibuka
    openAiModal() {
        // Isi dropdown target BAB dari state editor
        const sel      = document.getElementById('aiTargetBab');
        const docState = window.__getDocState?.();
        if (sel && docState) {
            // Simpan nilai lama
            const prev = sel.value;
            sel.innerHTML = '<option value="">— Otomatis (BAB/subbab aktif) —</option>';
            (docState.tree || []).forEach(bab => {
                const opt = document.createElement('option');
                opt.value       = bab.id;
                opt.textContent = bab.title ? `BAB: ${bab.title}` : `BAB (tanpa judul)`;
                sel.appendChild(opt);
            });
            if (prev) sel.value = prev;
        }
        // Panggil openAiModal dari ai_assistant
        if (typeof window._openAiModalInternal === 'function') {
            window._openAiModalInternal();
        }
    },
});

window._cover = { getCoverFile };

document.addEventListener('input', (e) => {
    if (e.target instanceof HTMLTextAreaElement) autoResizeTextarea(e.target);
    _debouncedSave();
});

document.addEventListener('click', (e) => {
    if (e.target.closest('button') && (e.target.innerText?.includes('Tambah') || e.target.innerText?.includes('Hapus'))) {
        setTimeout(() => saveDraft(), 300);
    }
});

document.addEventListener('change', (e) => {
    if (e.target.matches('select, input[type="checkbox"]')) setTimeout(() => saveDraft(), 200);
});

document.addEventListener('codex:wizard-step-change', (e) => {
    updateWorkspaceIndicators();
    const { step } = e.detail;
    const shell = document.querySelector('.editor-shell');
    const sidebar = document.querySelector('.editor-sidebar');

    // Hide hero khusus hanya di step "Isi Laporan" (step4)
    const heroSection = document.getElementById('heroSection');
    if (heroSection) {
        heroSection.style.display = step === 4 ? 'none' : 'block';
    }

    if (shell && sidebar) {
        if (step === 4) {
            shell.classList.add('builder-mode');
            sidebar.style.display = 'none';
            shell.style.gridTemplateColumns = '1fr';
        } else {
            shell.classList.remove('builder-mode');
            const isDesktop = window.innerWidth >= 1200;
            sidebar.style.display = isDesktop ? 'grid' : 'none';
            shell.style.gridTemplateColumns = isDesktop ? '320px 1fr' : '1fr';
        }
    }
});

document.addEventListener('DOMContentLoaded', () => {
    initNavbarScroll();
    initWizard();
    initLiveValidationClear();
    renderPengesahanInitial();
    initKataPengantar();
    initCoverDropZone();
    initIsiBuilder();
    initIsiBuilderBindings();
    renderRujukanInitial();
    setupRecoveryTools();
    initAiAssistant();
    loadDraft().finally(() => {
        initAutoResize();
        updateWorkspaceIndicators();
    });
});



// ==================== SAFETY CHECK (v5.0) ====================
// Ensure all functions available globally
(function() {
    const needed = ['nextStep', 'prevStep', 'goToStep'];
    const missing = needed.filter(fn => typeof window[fn] !== 'function');
    if (missing.length > 0) {
        console.warn('[main] Missing functions:', missing);
        // Try to fallback
        if (typeof window.nextStep !== 'function') {
            window.nextStep = () => { console.log('[fallback] nextStep'); };
        }
        if (typeof window.prevStep !== 'function') {
            window.prevStep = () => { console.log('[fallback] prevStep'); };
        }
    }
    console.log('[main] Global functions check:', {
        nextStep: typeof window.nextStep,
        prevStep: typeof window.prevStep,
        goToStep: typeof window.goToStep,
    });
})();

