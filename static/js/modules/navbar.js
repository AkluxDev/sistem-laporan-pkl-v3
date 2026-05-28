/* ============================================================
   modules/navbar.js
   Efek scroll pada navbar (.navbar-custom)
   ============================================================ */

'use strict';

/**
 * Inisialisasi efek scroll navbar.
 * Menambahkan class "scrolled" saat halaman di-scroll > 16px.
 */
export function initNavbarScroll() {
    const nav = document.querySelector('.navbar-custom');
    if (!nav) return;

    window.addEventListener(
        'scroll',
        () => nav.classList.toggle('scrolled', window.scrollY > 16),
        { passive: true }
    );
}
