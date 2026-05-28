/* ============================================================
   modules/cover.js
   Upload & drag-drop gambar cover + toggle option cards
   ============================================================ */

'use strict';

import { showToast } from './toast.js';
import { getImage, saveImage, deleteImage } from './image_db.js';

// ── State ─────────────────────────────────────────────────────
const _store = { file: null };

// ── Public API ────────────────────────────────────────────────

/**
 * Inisialisasi drop zone gambar cover.
 * Dipanggil sekali saat DOMContentLoaded.
 */
export function initCoverDropZone() {
    const dropZone = document.getElementById('coverDropZone');
    if (!dropZone) return;

    const prevent = e => { e.preventDefault(); e.stopPropagation(); };
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(ev =>
        dropZone.addEventListener(ev, prevent, false)
    );

    ['dragenter', 'dragover'].forEach(ev =>
        dropZone.addEventListener(ev, () => dropZone.classList.add('hover'), false)
    );
    ['dragleave', 'drop'].forEach(ev =>
        dropZone.addEventListener(ev, () => dropZone.classList.remove('hover'), false)
    );

    dropZone.addEventListener('drop', e => {
        const files = e.dataTransfer?.files;
        if (files?.length) {
            document.getElementById('coverImageInput').files = files;
            handleCoverImageSelect({ target: { files } });
        }
    });

    restoreCoverImage().catch(err => console.warn('[cover] gagal restore image', err));
}

/**
 * Handler saat user memilih file via input[type=file].
 * @param {Event} event
 */
export function handleCoverImageSelect(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
        showToast('Ukuran gambar maksimal 10 MB', 'danger');
        return;
    }

    _store.file = file;
    saveImage('cover_image', file).catch(err => console.error('[cover] gaga save image to db', err));

    const reader = new FileReader();
    reader.onload = e => {
        document.getElementById('coverPreviewImg').src      = e.target.result;
        document.getElementById('coverFileName').textContent = file.name;
        document.getElementById('coverDropPlaceholder').style.display = 'none';
        document.getElementById('coverImagePreview').style.display    = 'block';
    };
    reader.readAsDataURL(file);
}

/**
 * Hapus gambar cover yang sudah dipilih.
 * @param {Event} event - klik pada tombol remove
 */
export function removeCoverImage(event) {
    event.stopPropagation();
    _store.file = null;
    deleteImage('cover_image').catch(err => console.error('[cover] gagal delete image from db', err));
    document.getElementById('coverImageInput').value = '';
    document.getElementById('coverDropPlaceholder').style.display = 'block';
    document.getElementById('coverImagePreview').style.display    = 'none';
}

/**
 * Kembalikan file cover yang tersimpan (digunakan oleh generate.js).
 * @returns {File|null}
 */
export function getCoverFile() {
    return _store.file;
}

export async function restoreCoverImage() {
    const file = await getImage('cover_image');
    if (!file) return;
    _store.file = file;

    const reader = new FileReader();
    reader.onload = e => {
        document.getElementById('coverPreviewImg').src = e.target.result;
        document.getElementById('coverFileName').textContent = file.name || 'cover-image';
        document.getElementById('coverDropPlaceholder').style.display = 'none';
        document.getElementById('coverImagePreview').style.display = 'block';
    };
    reader.readAsDataURL(file);
}

// ── Option Card Toggle ────────────────────────────────────────

/**
 * Toggle checkbox + card selected state.
 * @param {string} checkboxId
 * @param {string} cardId
 */
export function toggleOptionCard(checkboxId, cardId) {
    const cb   = document.getElementById(checkboxId);
    const card = document.getElementById(cardId);
    if (!cb || !card) return;

    cb.checked = !cb.checked;
    card.classList.toggle('selected', cb.checked);

    if (checkboxId === 'switchTandaTangan') {
        const wrapper = document.getElementById('kotaWrapper');
        if (wrapper) wrapper.style.display = cb.checked ? 'block' : 'none';
    }

    if (checkboxId === 'switchCover') {
        const wrapper = document.getElementById('coverImageWrapper');
        if (wrapper) wrapper.style.display = cb.checked ? 'block' : 'none';
    }
}
