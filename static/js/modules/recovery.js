/* ============================================================
   modules/recovery.js
   Helper untuk menangani draft yang rusak atau hang.
   ============================================================ */
'use strict';

import { showToast } from './toast.js';
import { clearAllImages } from './image_db.js';

export function setupRecoveryTools() {
    // Expose ke window untuk diakses lewat console jika perlu
    window.__resetApp = async () => {
        if (confirm('⚠️ PERINGATAN: Ini akan menghapus SEMUA data laporan (teks & gambar) yang sedang disusun. Lanjutkan?')) {
            localStorage.clear();
            await clearAllImages();
            showToast('Semua data telah dihapus. Halaman akan dimuat ulang...', 'info');
            setTimeout(() => location.reload(), 1500);
        }
    };
}
