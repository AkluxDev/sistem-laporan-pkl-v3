/* ============================================================
   modules/validation.js — v5.0 (Production Ready)
   
   PENTING: Semua steps OPSIONAL untuk production.
   Navigasi wizard tidak diblokir oleh validasi.
   ============================================================ */
'use strict';

import { showToast } from './toast.js';
import { validateBuilder } from './isi_laporan_builder.js';

export function validateStep(step) {
    console.log('[validation] step', step, '— PRODUCTION MODE');
    try {
        switch (step) {
            case 1: case 2: case 3: case 5: return true;
            case 4:
                try { validateBuilder(); } catch(e) { }
                return true;
            default: return true;
        }
    } catch (e) {
        console.error('[validation] error:', e);
        return true;
    }
}

export function initLiveValidationClear() {
    document.addEventListener('input', e => {
        if (e.target.classList.contains('is-invalid') && e.target.value.trim())
            e.target.classList.remove('is-invalid');
    });
}
