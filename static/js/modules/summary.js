/* ============================================================
   modules/summary.js — v4.0
   Ringkasan data di step terakhir

   PERBAIKAN:
   - Selector ':scope > input' yang benar untuk judul BAB
   - Rujukan filter sebelum count
   - Pengesahan lebih informatif
   ============================================================ */
'use strict';

export function buildSummary() {
    _buildIdentitas();
    _buildPengesahan();
    _buildKataPengantar();
    _buildIsiLaporan();
    _buildRujukan();
    _buildOpsi();
}

const _get = id => document.getElementById(id)?.value?.trim() || '—';

function _fmt(raw) {
    if (!raw || raw === '—') return '—';
    const [y,m,d] = raw.split('-');
    return d&&m&&y ? `${d}/${m}/${y}` : raw;
}

function _row(k, v) {
    return `<div class="summary-row"><span class="summary-key">${k}</span><span class="summary-val">${v}</span></div>`;
}

function _chip(text, cls='summary-kegiatan-chip') {
    const safe = text.length > 60 ? text.slice(0,57)+'…' : text;
    return `<span class="${cls}" title="${text}">${safe}</span>`;
}

function _buildIdentitas() {
    const el = document.getElementById('summaryIdentitas');
    if (!el) return;
    el.innerHTML = [
        ['Nama Lengkap',        _get('namaLengkap')],
        ['NIS/NIM',             _get('nisNim')],
        ['Kelas/Jurusan',       _get('kelasJurusan')],
        ['Nama Sekolah',        _get('namaSekolah')],
        ['Nama Instansi',       _get('namaInstansi')],
        ['Pembimbing Lapangan', _get('namaPembimbingLapangan')],
        ['Pembimbing Sekolah',  _get('namaPembimbingSekolah')],
        ['Tanggal Mulai',       _fmt(_get('tanggalMulai'))],
        ['Tanggal Selesai',     _fmt(_get('tanggalSelesai'))],
    ].map(([k,v]) => _row(k,v)).join('');
}

function _buildPengesahan() {
    const el = document.getElementById('summaryPengesahan');
    if (!el) return;
    const items = [...document.querySelectorAll('.pengesahan-container')];
    if (!items.length) { el.innerHTML = '<span class="text-muted small">Belum ada</span>'; return; }
    el.innerHTML = items.map((item, i) => {
        const judul = item.querySelector('.input-judul')?.value?.trim() || `Pengesahan ${i+1}`;
        const nama  = item.querySelector('.input-nama')?.value?.trim() || '';
        const ttd   = item.querySelectorAll('.ttd-item').length;
        return _chip(`${judul}${nama ? ' — '+nama : ''}${ttd ? ` (${ttd} TTD)` : ''}`, 'summary-pengesahan-chip');
    }).join('');
}

function _buildKataPengantar() {
    const el = document.getElementById('summaryKataPengantar');
    if (!el) return;
    const n = document.querySelectorAll('#containerUcapanTerimaKasih .ucapan-item').length;
    el.innerHTML = [
        ['Judul',       _get('kpJudul')],
        ['Ucapan',      `${n} orang`],
        ['Kota/Tgl',    _get('kpKotaTanggal')],
        ['Penulis',     _get('kpNamaPenulis')],
    ].map(([k,v]) => _row(k,v)).join('');
}

function _buildIsiLaporan() {
    const el = document.getElementById('summaryIsiLaporan');
    if (!el) return;
    const babs = [...document.querySelectorAll('.isi-bab')];
    if (!babs.length) { el.innerHTML = '<span class="text-muted small">Belum ada isi laporan</span>'; return; }
    el.innerHTML = babs.map((bab, i) => {
        const judul = bab.querySelector('.bab-title-input')?.value?.trim() ?? '';
        const subs  = bab.querySelectorAll('.isi-sub').length;
        const label = judul ? `BAB ${i+1} — ${judul}` : `BAB ${i+1}`;
        return _chip(`${label} (${subs} sub)`);
    }).join('');
}

function _buildRujukan() {
    const el = document.getElementById('summaryRujukan');
    if (!el) return;
    const filled = [...document.querySelectorAll('.rujukan-item .input-rujukan')]
        .map(i => i.value.trim()).filter(Boolean);
    if (!filled.length) { el.innerHTML = '<span class="text-muted small">Belum ada rujukan</span>'; return; }
    el.innerHTML = filled.map(t => _chip(t)).join('');
}

function _buildOpsi() {
    const el = document.getElementById('summaryOpsi');
    if (!el) return;
    el.innerHTML = [
        ['Cover',       document.getElementById('switchCover')?.checked       ? '✅' : '❌'],
        ['Daftar Isi',  document.getElementById('switchDaftarIsi')?.checked   ? '✅' : '❌'],
        ['Tanda Tangan',document.getElementById('switchTandaTangan')?.checked ? '✅' : '❌'],
    ].map(([k,v]) => _row(k,v)).join('');
}
