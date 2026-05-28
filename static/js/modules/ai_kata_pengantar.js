/* ============================================================
   ai_kata_pengantar.js
   Tombol AI untuk:
   1. Kata Pembuka  → generate → isi langsung ke textarea
   2. Ucapan Terima Kasih → generate → isi nama+jabatan otomatis
   3. Kata Penutup  → generate → isi langsung ke textarea
   ============================================================ */
'use strict';

const OR_URL      = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MDL = 'google/gemini-2.0-flash-001';

// ── Ambil nilai field step 1 secara otomatis ──────────────────
function _prefill() {
    return {
        nama       : document.getElementById('namaLengkap')?.value?.trim()            || '',
        nis        : document.getElementById('nisNim')?.value?.trim()                  || '',
        kelas      : document.getElementById('kelasJurusan')?.value?.trim()            || '',
        sekolah    : document.getElementById('namaSekolah')?.value?.trim()             || '',
        instansi   : document.getElementById('namaInstansi')?.value?.trim()            || '',
        pembimbingL: document.getElementById('namaPembimbingLapangan')?.value?.trim()  || '',
        pembimbingS: document.getElementById('namaPembimbingSekolah')?.value?.trim()   || '',
        kota       : document.getElementById('kpKotaTanggal')?.value?.trim()           || '',
        penulis    : document.getElementById('kpNamaPenulis')?.value?.trim()           || '',
    };
}

// ── Helper: panggil OpenRouter ────────────────────────────────
async function _callAI(systemPrompt, userPrompt) {
    const apiKey = localStorage.getItem('openRouterApiKey');
    if (!apiKey) throw new Error('API Key belum disetup. Klik tombol AI Setup terlebih dahulu.');

    let model = localStorage.getItem('openRouterModel') || DEFAULT_MDL;
    if (model === 'auto') model = DEFAULT_MDL;

    const res = await fetch(OR_URL, {
        method : 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type' : 'application/json',
            'HTTP-Referer' : window.location.origin,
            'X-Title'      : 'Sistem Laporan PKL',
        },
        body: JSON.stringify({
            model,
            messages    : [
                { role: 'system', content: systemPrompt },
                { role: 'user',   content: userPrompt   },
            ],
            temperature : 0.4,
            max_tokens  : 1024,
        }),
    });

    if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e?.error?.message || `HTTP ${res.status}`);
    }
    const data = await res.json();
    let text = data?.choices?.[0]?.message?.content || '';
    return text.replace(/<think>[\s\S]*?<\/think>\s*/gi, '').trim();
}

// ── Buka modal popup dengan form ──────────────────────────────
function _openPopup(config) {
    // Hapus popup lama jika ada
    document.getElementById('aiKpPopup')?.remove();

    const d = _prefill();

    // Render fields
    const fieldsHtml = config.fields.map(f => `
        <div class="mb-2">
            <label class="form-label small fw-semibold mb-1">${f.label}</label>
            <input type="text" class="form-control form-control-sm ai-kp-field"
                   data-key="${f.key}"
                   value="${_esc(f.default?.(d) || '')}"
                   placeholder="${f.placeholder || ''}">
        </div>`).join('');

    const html = `
<div class="modal fade" id="aiKpPopup" tabindex="-1" aria-hidden="true">
  <div class="modal-dialog modal-dialog-centered" style="max-width:420px">
    <div class="modal-content shadow-lg">
      <div class="modal-header py-2 bg-warning bg-opacity-10 border-bottom">
        <h6 class="modal-title fw-bold mb-0">
          <i class="bi bi-stars me-2 text-warning"></i>${_esc(config.title)}
        </h6>
        <button type="button" class="btn-close btn-sm" data-bs-dismiss="modal"></button>
      </div>
      <div class="modal-body py-3">
        <p class="text-muted small mb-3">${_esc(config.desc)}</p>
        ${fieldsHtml}
        <div id="aiKpStatus" class="mt-2 small text-muted" style="min-height:20px;"></div>
      </div>
      <div class="modal-footer py-2">
        <button type="button" class="btn btn-sm btn-outline-secondary" data-bs-dismiss="modal">Batal</button>
        <button type="button" class="btn btn-sm btn-warning fw-semibold" id="btnAiKpExec">
          <i class="bi bi-magic me-1"></i> Generate &amp; Isi Otomatis
        </button>
      </div>
    </div>
  </div>
</div>`;

    document.body.insertAdjacentHTML('beforeend', html);

    const modalEl = document.getElementById('aiKpPopup');
    const modal   = new bootstrap.Modal(modalEl, { backdrop: 'static' });
    modal.show();

    // Cleanup saat ditutup
    modalEl.addEventListener('hidden.bs.modal', () => {
        modal.dispose();
        modalEl.remove();
    }, { once: true });

    // Tombol execute
    document.getElementById('btnAiKpExec').addEventListener('click', async () => {
        const btn    = document.getElementById('btnAiKpExec');
        const status = document.getElementById('aiKpStatus');

        // Kumpulkan nilai field
        const vals = {};
        modalEl.querySelectorAll('.ai-kp-field').forEach(el => {
            vals[el.dataset.key] = el.value.trim();
        });

        btn.disabled    = true;
        btn.innerHTML   = '<span class="spinner-border spinner-border-sm me-1"></span> Generating...';
        status.textContent = '';
        status.className   = 'mt-2 small text-muted';

        try {
            await config.onExecute(vals, status);
            status.textContent = '✅ Berhasil! Teks sudah diisi otomatis.';
            status.className   = 'mt-2 small text-success fw-semibold';
            setTimeout(() => {
                modal.hide();
            }, 900);
        } catch (err) {
            status.textContent = `❌ ${err.message}`;
            status.className   = 'mt-2 small text-danger';
            btn.disabled  = false;
            btn.innerHTML = '<i class="bi bi-magic me-1"></i> Coba Lagi';
        }
    });
}

function _esc(s) {
    return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}


// ════════════════════════════════════════════════════════════
// 1. KATA PEMBUKA
// ════════════════════════════════════════════════════════════
export function aiGenerateKataPembuka() {
    _openPopup({
        title: 'Generate Kata Pembuka',
        desc : 'AI akan membuat paragraf pembuka Kata Pengantar yang formal dan sesuai standar laporan PKL.',
        fields: [
            { key: 'nama',     label: 'Nama Siswa',      placeholder: 'Nama lengkap penulis',        default: d => d.nama },
            { key: 'sekolah',  label: 'Nama Sekolah',    placeholder: 'SMK / Universitas',           default: d => d.sekolah },
            { key: 'instansi', label: 'Nama Instansi PKL', placeholder: 'Tempat PKL',               default: d => d.instansi },
            { key: 'jurusan',  label: 'Program Keahlian / Jurusan', placeholder: 'Contoh: TKJ, RPL', default: d => d.kelas },
            { key: 'topik',    label: 'Topik / Judul Laporan (opsional)', placeholder: 'Contoh: Konfigurasi Jaringan', default: () => '' },
        ],
        async onExecute(vals) {
            const sys = `Anda adalah penulis laporan PKL profesional Indonesia. Tulis HANYA isi teks, TANPA judul, TANPA "Bismillah", TANPA kalimat pembuka seperti "Berikut adalah". Langsung mulai dengan "Puji syukur..." atau "Segala puji...". Bahasa Indonesia baku sesuai PUEBI. Maksimal 2 paragraf.`;
            const usr = `Buat paragraf Kata Pembuka Kata Pengantar laporan PKL dengan data:
- Nama siswa: ${vals.nama || '[Nama Siswa]'}
- Sekolah: ${vals.sekolah || '[Nama Sekolah]'}
- Instansi PKL: ${vals.instansi || '[Nama Instansi]'}
- Jurusan: ${vals.jurusan || '[Jurusan]'}
- Topik laporan: ${vals.topik || 'Praktik Kerja Lapangan'}`;

            const result = await _callAI(sys, usr);

            // Isi ke textarea pertama di containerKataPembuka
            const first = document.querySelector('#containerKataPembuka .input-paragraf-pembuka');
            if (first) {
                first.value = result;
                first.dispatchEvent(new Event('input'));
                first.style.height = 'auto';
                first.style.height = first.scrollHeight + 'px';
            } else {
                // Belum ada textarea — tambah dulu lalu isi
                if (typeof window.tambahParagrafPembuka === 'function') {
                    window.tambahParagrafPembuka();
                    await new Promise(r => setTimeout(r, 80));
                    const ta = document.querySelector('#containerKataPembuka .input-paragraf-pembuka');
                    if (ta) {
                        ta.value = result;
                        ta.dispatchEvent(new Event('input'));
                        ta.style.height = 'auto';
                        ta.style.height = ta.scrollHeight + 'px';
                    }
                }
            }
        },
    });
}


// ════════════════════════════════════════════════════════════
// 2. UCAPAN TERIMA KASIH
// ════════════════════════════════════════════════════════════
export function aiGenerateUcapan() {
    _openPopup({
        title: 'Generate Ucapan Terima Kasih',
        desc : 'AI akan mengisi daftar ucapan terima kasih secara otomatis. Data yang kosong akan diisi placeholder.',
        fields: [
            { key: 'kepalaSekolah',   label: 'Nama Kepala Sekolah',        placeholder: 'Nama lengkap + gelar', default: () => '' },
            { key: 'pembimbingS',     label: 'Nama Pembimbing Sekolah',    placeholder: 'Guru pembimbing',      default: d => d.pembimbingS },
            { key: 'pembimbingL',     label: 'Nama Pembimbing Instansi',   placeholder: 'Pembimbing lapangan',  default: d => d.pembimbingL },
            { key: 'pimpinanInstansi',label: 'Nama Pimpinan Instansi',     placeholder: 'Direktur / Manager',   default: () => '' },
            { key: 'orangTua',        label: 'Sebutan Orang Tua',          placeholder: 'Ayah dan Ibu / Bapak dan Ibu', default: () => 'Ayah dan Ibu' },
        ],
        async onExecute(vals) {
            // Daftar ucapan standar PKL
            const UCAPAN_LIST = [
                { nama: vals.kepalaSekolah    || '[Nama Kepala Sekolah]',       jabatan: 'Kepala Sekolah' },
                { nama: vals.pembimbingS      || '[Nama Pembimbing Sekolah]',   jabatan: 'Pembimbing dari Sekolah' },
                { nama: vals.pimpinanInstansi || '[Nama Pimpinan Instansi]',    jabatan: 'Pimpinan Instansi Tempat PKL' },
                { nama: vals.pembimbingL      || '[Nama Pembimbing Instansi]',  jabatan: 'Pembimbing dari Instansi' },
                { nama: vals.orangTua         || 'Ayah dan Ibu',                jabatan: 'Orang Tua/Wali yang selalu memberikan dukungan dan doa' },
                { nama: 'Seluruh rekan-rekan', jabatan: 'yang telah membantu selama pelaksanaan PKL' },
            ];

            const container = document.getElementById('containerUcapanTerimaKasih');
            if (!container) return;

            // Hapus item yang sudah ada (kecuali yang sudah diisi user)
            const existing = container.querySelectorAll('.ucapan-item');
            // Jika sudah ada isi → tanya, tapi untuk simplicity: clear semua dan isi ulang
            existing.forEach(el => el.remove());

            // Isi ulang menggunakan tambahUcapan
            for (const uc of UCAPAN_LIST) {
                if (typeof window.tambahUcapan === 'function') {
                    window.tambahUcapan();
                    await new Promise(r => setTimeout(r, 40));
                }
                // Ambil item terakhir yang baru ditambah
                const items    = container.querySelectorAll('.ucapan-item');
                const lastItem = items[items.length - 1];
                if (!lastItem) continue;

                const inputNama    = lastItem.querySelector('.input-ucapan-nama');
                const inputJabatan = lastItem.querySelector('.input-ucapan-jabatan');

                if (inputNama)    { inputNama.value    = uc.nama;    inputNama.dispatchEvent(new Event('input')); }
                if (inputJabatan) { inputJabatan.value = uc.jabatan; inputJabatan.dispatchEvent(new Event('input')); }
            }
        },
    });
}


// ════════════════════════════════════════════════════════════
// 3. KATA PENUTUP
// ════════════════════════════════════════════════════════════
export function aiGenerateKataPenutup() {
    _openPopup({
        title: 'Generate Kata Penutup',
        desc : 'AI akan membuat paragraf penutup Kata Pengantar yang formal — berisi harapan dan permintaan saran.',
        fields: [
            { key: 'nama',     label: 'Nama Siswa',       placeholder: 'Nama lengkap',         default: d => d.nama },
            { key: 'jurusan',  label: 'Program Keahlian', placeholder: 'Contoh: TKJ, RPL',     default: d => d.kelas },
            { key: 'instansi', label: 'Nama Instansi PKL', placeholder: 'Tempat PKL',          default: d => d.instansi },
        ],
        async onExecute(vals) {
            const sys = `Anda adalah penulis laporan PKL profesional Indonesia. Tulis HANYA isi paragraf penutup Kata Pengantar, TANPA judul, TANPA kalimat seperti "Berikut adalah". Maksimal 1-2 paragraf. Isi: harapan semoga laporan bermanfaat, permintaan maaf atas kekurangan, ajakan saran dan kritik. Bahasa Indonesia baku PUEBI.`;
            const usr = `Buat kata penutup Kata Pengantar laporan PKL:
- Nama siswa: ${vals.nama || '[Nama Siswa]'}
- Jurusan: ${vals.jurusan || '[Jurusan]'}
- Instansi PKL: ${vals.instansi || '[Instansi]'}`;

            const result = await _callAI(sys, usr);

            // Isi ke textarea pertama di containerKataPenutup
            const first = document.querySelector('#containerKataPenutup .input-paragraf-penutup');
            if (first) {
                first.value = result;
                first.dispatchEvent(new Event('input'));
                first.style.height = 'auto';
                first.style.height = first.scrollHeight + 'px';
            } else {
                if (typeof window.tambahParagrafPenutup === 'function') {
                    window.tambahParagrafPenutup();
                    await new Promise(r => setTimeout(r, 80));
                    const ta = document.querySelector('#containerKataPenutup .input-paragraf-penutup');
                    if (ta) {
                        ta.value = result;
                        ta.dispatchEvent(new Event('input'));
                        ta.style.height = 'auto';
                        ta.style.height = ta.scrollHeight + 'px';
                    }
                }
            }
        },
    });
}

// ── Expose ke window ──────────────────────────────────────────
Object.assign(window, {
    aiGenerateKataPembuka,
    aiGenerateUcapan,
    aiGenerateKataPenutup,
});
