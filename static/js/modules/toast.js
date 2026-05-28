/* ============================================================
   modules/toast.js  — v2.1 (fixed)
   Helper notifikasi toast (success, warning, danger, info)

   FIX:
   - setTimeout: simpan referensi elemen di closure agar tidak
     error jika elemen sudah dihapus manual sebelum timeout.
   - ID toast menggunakan counter monoton, bukan Date.now() yang
     bisa kolisi jika dua toast muncul dalam milidetik yang sama.
   - Tambah batas maksimal 5 toast sekaligus agar tidak membanjiri UI.
   ============================================================ */

'use strict';

const TOAST_ICONS = {
    success : 'bi-check-circle-fill',
    warning : 'bi-exclamation-triangle-fill',
    danger  : 'bi-x-circle-fill',
    info    : 'bi-info-circle-fill',
};

const TOAST_COLORS = {
    success : '#22C55E',
    warning : '#F59E0B',
    danger  : '#EF4444',
    info    : '#4F6EF7',
};

const MAX_TOASTS = 5;
let _toastCounter = 0;

/**
 * Tampilkan toast notification.
 * @param {string} message
 * @param {'success'|'warning'|'danger'|'info'} type
 * @param {number} duration - ms (default 5000)
 */
export function showToast(message, type = 'info', duration = 5000) {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    // Batas maks toast sekaligus
    const existing = container.querySelectorAll('.toast-custom');
    if (existing.length >= MAX_TOASTS) {
        existing[0].remove();
    }

    const id    = `toast_${++_toastCounter}`;
    const icon  = TOAST_ICONS[type]  ?? TOAST_ICONS.info;
    const color = TOAST_COLORS[type] ?? TOAST_COLORS.info;

    const el = document.createElement('div');
    el.id        = id;
    el.className = 'toast toast-custom show';
    el.setAttribute('role', 'alert');
    el.innerHTML = `
        <div class="toast-body">
            <i class="bi ${icon}" style="color:${color};font-size:1.1rem;flex-shrink:0;"></i>
            <span>${message}</span>
            <button type="button" class="btn-close ms-auto"
                    onclick="this.closest('.toast-custom').remove()"></button>
        </div>`;

    container.appendChild(el);

    // FIX: simpan referensi langsung, cek sebelum remove
    if (duration > 0) {
        setTimeout(() => {
            if (el.isConnected) el.remove();
        }, duration);
    }
}
