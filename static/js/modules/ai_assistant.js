/* ============================================================
   modules/ai_assistant.js — v4.0
   - Auto-insert: hasil AI langsung masuk ke editor (no manual insert)
   - Auto model: fetch model gratis dari OpenRouter API langsung
   - Template smart: cek BAB yang sudah ada, tidak duplikat
   ============================================================ */
'use strict';

const DEFAULT_MODEL = 'google/gemini-2.0-flash-001';
const OR_MODELS_URL = 'https://openrouter.ai/api/v1/models';

// ──────────────────────────────────────────
// Init
// ──────────────────────────────────────────
export function initAiAssistant() {
    const savedKey   = localStorage.getItem('openRouterApiKey');
    const savedModel = localStorage.getItem('openRouterModel') || DEFAULT_MODEL;

    const keyInput = document.getElementById('openRouterApiKey');
    if (keyInput && savedKey) keyInput.value = savedKey;

    // Populate model dropdown
    _populateModelSelect(savedModel);

    // Expose ke global window
    window.saveAiSettings        = saveAiSettings;
    window._openAiModalInternal  = openAiModal;
    window.generateAiContent     = generateAiContent;
    window.copyAiResult          = copyAiResult;
    window.openTemplateModal     = openTemplateModal;
    window.insertTemplate        = insertTemplate;
    window.loadOpenRouterModels  = loadOpenRouterModels;
}

// ──────────────────────────────────────────
// Populate model select
// ──────────────────────────────────────────
async function _populateModelSelect(selectedValue) {
    const sel = document.getElementById('openRouterModel');
    if (!sel) return;

    // Default: tampilkan model stabil dulu
    const STATIC_MODELS = [
        { group: 'auto', id: 'auto',                                          name: '⚡ Auto — Pilih model terbaik tersedia' },
        { group: 'free', id: 'google/gemini-2.0-flash-001',                   name: 'Gemini 2.0 Flash — [Gratis]' },
        { group: 'free', id: 'deepseek/deepseek-r1:free',                     name: 'DeepSeek R1 — [Gratis]' },
        { group: 'free', id: 'deepseek/deepseek-chat-v3-0324:free',           name: 'DeepSeek V3 — [Gratis]' },
        { group: 'free', id: 'meta-llama/llama-4-maverick:free',              name: 'Llama 4 Maverick — [Gratis]' },
        { group: 'free', id: 'mistralai/mistral-small-3.1-24b-instruct:free', name: 'Mistral Small 3.1 — [Gratis]' },
        { group: 'free', id: 'qwen/qwen3-235b-a22b:free',                    name: 'Qwen3 235B — [Gratis]' },
        { group: 'paid', id: 'google/gemini-2.5-pro',                         name: 'Gemini 2.5 Pro — [Berbayar]' },
        { group: 'paid', id: 'anthropic/claude-3.5-sonnet',                   name: 'Claude 3.5 Sonnet — [Berbayar]' },
        { group: 'paid', id: 'openai/gpt-4o',                                 name: 'GPT-4o — [Berbayar]' },
    ];

    sel.innerHTML = '';
    const groups = { auto: '⚡ Otomatis', free: '🆓 Gratis (Stabil)', paid: '💰 Berbayar' };
    const optgroups = {};

    for (const [key, label] of Object.entries(groups)) {
        const og = document.createElement('optgroup');
        og.label = label;
        optgroups[key] = og;
        sel.appendChild(og);
    }

    STATIC_MODELS.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m.id;
        opt.textContent = m.name;
        optgroups[m.group].appendChild(opt);
    });

    sel.value = selectedValue || DEFAULT_MODEL;
}

// ──────────────────────────────────────────
// Load model dari OpenRouter API langsung
// ──────────────────────────────────────────
export async function loadOpenRouterModels() {
    const apiKey = localStorage.getItem('openRouterApiKey');
    const sel    = document.getElementById('openRouterModel');
    const btn    = document.getElementById('btnLoadModels');
    if (!sel) return;

    if (!apiKey) {
        alert('Simpan API Key dulu sebelum memuat model dari OpenRouter.');
        return;
    }

    if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Memuat...'; }

    try {
        const res  = await fetch(OR_MODELS_URL, {
            headers: { 'Authorization': `Bearer ${apiKey}` }
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        const allModels = (data.data || [])
            .filter(m => m.id && m.name)
            .sort((a, b) => a.name.localeCompare(b.name));

        const freeModels = allModels.filter(m =>
            m.id.includes(':free') ||
            (m.pricing && parseFloat(m.pricing.prompt || '1') === 0)
        );
        const paidModels = allModels.filter(m =>
            !m.id.includes(':free') &&
            !(m.pricing && parseFloat(m.pricing.prompt || '1') === 0)
        );

        const currentVal = sel.value;
        sel.innerHTML = '';

        // Opsi Auto tetap di paling atas
        const autoOg = document.createElement('optgroup');
        autoOg.label = '⚡ Otomatis';
        const autoOpt = document.createElement('option');
        autoOpt.value = 'auto';
        autoOpt.textContent = '⚡ Auto — Pilih otomatis model terbaik tersedia';
        autoOg.appendChild(autoOpt);
        sel.appendChild(autoOg);

        // Model Gratis dari API
        if (freeModels.length > 0) {
            const og = document.createElement('optgroup');
            og.label = `🆓 Gratis (${freeModels.length} model dari OpenRouter)`;
            freeModels.forEach(m => {
                const opt = document.createElement('option');
                opt.value = m.id;
                opt.textContent = `${m.name} — [Gratis]`;
                og.appendChild(opt);
            });
            sel.appendChild(og);
        }

        // Model Berbayar
        if (paidModels.length > 0) {
            const og = document.createElement('optgroup');
            og.label = `💰 Berbayar (${paidModels.length} model)`;
            paidModels.forEach(m => {
                const opt = document.createElement('option');
                opt.value = m.id;
                opt.textContent = `${m.name} — [Berbayar]`;
                og.appendChild(opt);
            });
            sel.appendChild(og);
        }

        // Restore selection
        if (currentVal) sel.value = currentVal;
        if (!sel.value && freeModels.length > 0) sel.value = freeModels[0].id;

        const total = freeModels.length + paidModels.length;
        if (btn) btn.innerHTML = `<i class="bi bi-check-circle me-1"></i> ${total} model dimuat`;

    } catch (err) {
        console.error('[loadOpenRouterModels]', err);
        if (btn) btn.innerHTML = '<i class="bi bi-exclamation-triangle me-1"></i> Gagal';
        alert(`Gagal memuat model: ${err.message}`);
    } finally {
        if (btn) { setTimeout(() => { if (btn) { btn.disabled = false; btn.innerHTML = '<i class="bi bi-arrow-clockwise me-1"></i> Muat dari OpenRouter'; } }, 3000); }
    }
}

// ──────────────────────────────────────────
// Simpan pengaturan AI
// ──────────────────────────────────────────
function saveAiSettings() {
    const key   = (document.getElementById('openRouterApiKey')?.value || '').trim();
    const model = document.getElementById('openRouterModel')?.value || DEFAULT_MODEL;

    if (!key) {
        alert('API Key tidak boleh kosong. Dapatkan di https://openrouter.ai/keys');
        return;
    }

    localStorage.setItem('openRouterApiKey', key);
    localStorage.setItem('openRouterModel',  model);

    const warn = document.getElementById('aiWarningAlert');
    if (warn) warn.style.display = 'none';

    const modalEl = document.getElementById('modalAiSettings');
    if (modalEl) {
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();
    }

    alert('✅ Pengaturan AI berhasil disimpan!');
}

// ──────────────────────────────────────────
// Buka modal AI
// ──────────────────────────────────────────
function openAiModal() {
    const savedKey = localStorage.getItem('openRouterApiKey');
    const warn     = document.getElementById('aiWarningAlert');
    if (warn) warn.style.display = savedKey ? 'none' : 'block';

    // Reset form dan hasil sebelumnya
    const prompt    = document.getElementById('aiPrompt');
    const resultBox = document.getElementById('aiResultBox');
    const resultTxt = document.getElementById('aiResultText');
    const btnCopy   = document.getElementById('btnAiCopy');
    const copyStatus = document.getElementById('aiCopyStatus');

    if (prompt)     prompt.value           = '';
    if (resultBox)  resultBox.style.display = 'none';
    if (resultTxt)  resultTxt.textContent   = '';
    if (btnCopy)    btnCopy.style.display   = 'none';
    if (copyStatus) copyStatus.textContent  = '';
    _lastAiResult = '';

    const modal = new bootstrap.Modal(document.getElementById('modalAiAssistant'));
    modal.show();
}

// ──────────────────────────────────────────
// Generate + Auto-insert ke editor
// ──────────────────────────────────────────
// Simpan teks AI terakhir agar tombol copy bisa akses
let _lastAiResult = '';

async function generateAiContent() {
    const apiKey = localStorage.getItem('openRouterApiKey');
    if (!apiKey) {
        alert('Silakan simpan API Key OpenRouter terlebih dahulu di tombol "AI Setup".');
        return;
    }

    let model        = localStorage.getItem('openRouterModel') || DEFAULT_MODEL;
    const actionType = document.getElementById('aiActionType')?.value || 'paragraf';
    const promptText = (document.getElementById('aiPrompt')?.value || '').trim();

    if (!promptText) {
        alert('Silakan tuliskan topik atau instruksi yang ingin dibuat.');
        return;
    }

    if (model === 'auto') model = await _resolveAutoModel(apiKey);

    const btnGen     = document.getElementById('btnAiGenerate');
    const spinner    = document.getElementById('aiSpinner');
    const icon       = document.getElementById('aiIcon');
    const resultBox  = document.getElementById('aiResultBox');
    const resultText = document.getElementById('aiResultText');
    const btnCopy    = document.getElementById('btnAiCopy');
    const copyStatus = document.getElementById('aiCopyStatus');

    if (btnGen)  btnGen.disabled = true;
    if (spinner) spinner.classList.remove('d-none');
    if (icon)    icon.classList.add('d-none');
    if (resultBox) resultBox.style.display = 'none';

    try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type':  'application/json',
                'HTTP-Referer':  window.location.origin,
                'X-Title':       'Sistem Laporan PKL',
            },
            body: JSON.stringify({
                model:       model,
                messages:    [
                    { role: 'system', content: _buildSystemPrompt(actionType) },
                    { role: 'user',   content: promptText },
                ],
                temperature: 0.4,
                top_p:       0.85,
                max_tokens:  2048,
            }),
        });

        if (!response.ok) {
            let errMsg = `HTTP ${response.status}`;
            try { const e = await response.json(); errMsg = e?.error?.message || errMsg; } catch (_) {}
            throw new Error(errMsg);
        }

        const data = await response.json();
        let aiText = data?.choices?.[0]?.message?.content || '';

        // Bersihkan tag <think> dari DeepSeek-R1
        aiText = aiText.replace(/<think>[\s\S]*?<\/think>\s*/gi, '').trim();

        if (!aiText) throw new Error('AI tidak menghasilkan teks. Coba prompt yang lebih spesifik.');

        // Simpan hasil
        _lastAiResult = aiText;

        // Tampilkan hasil dengan tombol copy
        if (resultText) resultText.textContent = aiText;
        if (resultBox)  resultBox.style.display = 'block';
        if (btnCopy)    btnCopy.style.display   = 'inline-flex';
        if (copyStatus) copyStatus.textContent  = '';

    } catch (error) {
        console.error('[ai_assistant] error:', error);
        if (resultText) resultText.textContent = `❌ Gagal: ${error.message}`;
        if (resultBox)  resultBox.style.display = 'block';
        _lastAiResult = '';
    } finally {
        if (btnGen)  btnGen.disabled = false;
        if (spinner) spinner.classList.add('d-none');
        if (icon)    icon.classList.remove('d-none');
    }
}

// Salin hasil AI ke clipboard
async function copyAiResult() {
    if (!_lastAiResult) return;
    try {
        await navigator.clipboard.writeText(_lastAiResult);
        const s = document.getElementById('aiCopyStatus');
        if (s) {
            s.textContent = '✓ Tersalin!';
            setTimeout(() => { s.textContent = ''; }, 2500);
        }
    } catch (_) {
        // Fallback untuk browser yang tidak support clipboard API
        const ta = document.createElement('textarea');
        ta.value = _lastAiResult;
        ta.style.position = 'fixed';
        ta.style.opacity  = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        const s = document.getElementById('aiCopyStatus');
        if (s) {
            s.textContent = '✓ Tersalin!';
            setTimeout(() => { s.textContent = ''; }, 2500);
        }
    }
}

// ──────────────────────────────────────────
// Auto-insert: sisipkan ke lokasi yang tepat
// ──────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────
// _autoInsertToEditor — v4.1
// Sisipkan hasil AI ke subbab yang SEDANG AKTIF, bukan subbab terakhir
// ─────────────────────────────────────────────────────────────────
function _autoInsertToEditor(actionType, content, targetDropdownId) {
    if (typeof window.quickAdd !== 'function') {
        console.warn('[ai_assistant] window.quickAdd belum tersedia di window');
        return;
    }

    const docState   = window.__getDocState?.() || null;
    const activeNode = window.__getActiveNode?.() || null;
    // Inject activeNode ke docState agar _getTarget bisa pakai
    if (docState && activeNode) docState.activeNode = activeNode;

    // ── Resolve subbab target ────────────────────────────────────
    // 1. Dari dropdown aiTargetBab yang dipilih user
    // 2. Dari activeNode (yang sedang diklik user di editor)
    // 3. TIDAK fallback ke subbab terakhir — biarkan quickAdd gagal
    //    daripada menaruh teks di tempat yang salah
    const _getTarget = () => {
        // 1. Dropdown pilihan user
        if (targetDropdownId && docState) {
            const found = _deepFind(docState.tree, targetDropdownId);
            if (found?.type === 'subbab') return found;
            // Jika user pilih BAB, ambil subbab yang sedang aktif di BAB itu
            if (found?.type === 'bab') {
                // Ambil subbab aktif jika ada, kalau tidak ambil yang pertama
                const activeSub = docState.activeNode?.type === 'subbab'
                    ? docState.activeNode
                    : found.children?.[0] || null;
                return activeSub;
            }
        }
        // 2. activeNode langsung dari state
        if (docState?.activeNode) {
            const an = docState.activeNode;
            if (an.type === 'subbab') return an;
            // Jika aktif di konten (paragraf dll), cari parent subbab-nya
            if (an.type !== 'bab') return _findParentSub(docState.tree, an.id);
        }
        return null;
    };

    if (actionType === 'paragraf') {
        const sub = _getTarget();
        if (!sub) {
            // Tidak ada subbab aktif — tampilkan pesan
            _showToast('Pilih subbab terlebih dahulu di editor, lalu generate ulang.', 'error');
            return;
        }
        // Aktifkan subbab yang dipilih agar quickAdd tahu targetnya
        window.selectNode(sub.id);
        // selectNode sinkronus — activeNode sudah di-set sebelum quickAdd
        window.quickAdd('paragraf', { text: content, teks: content });

    } else if (actionType === 'subbab') {
        const lines     = content.split('\n').filter(l => l.trim());
        const judulLine = lines[0]?.replace(/^#+\s*/, '').trim() || 'Sub-bab Baru';
        const isiLines  = lines.slice(1).join('\n').trim();

        // Untuk subbab baru, kita perlu BAB aktif
        const sub = _getTarget();
        if (sub) window.selectNode(sub.id);

        window.quickAdd('subbab', { title: judulLine });

        if (isiLines) {
            setTimeout(() => {
                window.quickAdd('paragraf', { text: isiLines, teks: isiLines });
            }, 60);
        }

    } else if (actionType === 'bab') {
        const sections = _parseBabContent(content);
        sections.forEach((sec, i) => {
            setTimeout(() => {
                window.quickAdd(i === 0 ? 'bab' : 'subbab', { title: sec.judul });
                if (sec.isi) {
                    setTimeout(() => {
                        window.quickAdd('paragraf', { text: sec.isi, teks: sec.isi });
                    }, 40);
                }
            }, i * 110);
        });
    }
}

// Cari node di seluruh tree secara rekursif
function _deepFind(tree, id) {
    for (const bab of (tree || [])) {
        if (bab.id === id) return bab;
        for (const sub of (bab.children || [])) {
            if (sub.id === id) return sub;
            for (const item of (sub.children || [])) {
                if (item.id === id) return item;
            }
        }
    }
    return null;
}

// Cari subbab parent dari node konten
function _findParentSub(tree, childId) {
    for (const bab of (tree || [])) {
        for (const sub of (bab.children || [])) {
            if (sub.id === childId) return sub;
            if ((sub.children || []).some(c => c.id === childId)) return sub;
        }
    }
    return null;
}

// Parse konten multi-section dari AI
function _parseBabContent(content) {
    const lines    = content.split('\n');
    const sections = [];
    let current    = null;

    for (const line of lines) {
        const heading = line.match(/^#{1,3}\s+(.+)/);
        if (heading) {
            if (current) sections.push(current);
            current = { judul: heading[1].trim(), isi: '' };
        } else if (current) {
            current.isi += (current.isi ? '\n' : '') + line;
        } else {
            current = { judul: 'Konten AI', isi: line };
        }
    }
    if (current) sections.push(current);
    return sections.map(s => ({ ...s, isi: s.isi.trim() })).filter(s => s.judul || s.isi);
}

// ──────────────────────────────────────────
// Auto-resolve model terbaik tersedia
// ──────────────────────────────────────────
async function _resolveAutoModel(apiKey) {
    // Prioritas model gratis yang dikenal stabil
    const PRIORITY = [
        'google/gemini-2.0-flash-001',
        'deepseek/deepseek-chat-v3-0324:free',
        'deepseek/deepseek-r1:free',
        'meta-llama/llama-4-maverick:free',
        'qwen/qwen3-235b-a22b:free',
        'mistralai/mistral-small-3.1-24b-instruct:free',
    ];

    try {
        const res = await fetch(OR_MODELS_URL, {
            headers: { 'Authorization': `Bearer ${apiKey}` }
        });
        if (!res.ok) return DEFAULT_MODEL;

        const data       = await res.json();
        const available  = new Set((data.data || []).map(m => m.id));

        // Cari model prioritas yang tersedia
        for (const id of PRIORITY) {
            if (available.has(id)) {
                console.log(`[ai_assistant] Auto-selected model: ${id}`);
                return id;
            }
        }

        // Fallback: model gratis pertama yang tersedia
        const firstFree = (data.data || []).find(m =>
            m.id.includes(':free') ||
            (m.pricing && parseFloat(m.pricing.prompt || '1') === 0)
        );
        return firstFree?.id || DEFAULT_MODEL;

    } catch (_) {
        return DEFAULT_MODEL;
    }
}

function _shortModelName(model) {
    if (model === 'auto') return 'model auto';
    return model.split('/').pop()?.replace(/:free$/, '') || model;
}

// ──────────────────────────────────────────
// System prompt berkualitas tinggi
// ──────────────────────────────────────────
function _buildSystemPrompt(actionType) {
    let base = `Anda adalah Pakar Penulisan Akademik Bahasa Indonesia yang berpengalaman dalam menyusun Laporan Praktik Kerja Lapangan (PKL/Magang) sesuai standar nasional.

WAJIB DIPATUHI:
1. Gunakan Bahasa Indonesia baku sesuai PUEBI
2. Gaya bahasa akademis dan formal
3. JANGAN awali dengan "Tentu", "Berikut", "Saya akan", dll — LANGSUNG tulis kontennya
4. Paragraf efektif: 3-5 kalimat, satu ide utama, dikembangkan runtut
5. Penomoran sub-bab: 1.1, 1.2, 2.1, dst.

STRUKTUR STANDAR LAPORAN PKL:
- BAB I: Pendahuluan (Latar Belakang, Tujuan, Manfaat, Waktu dan Tempat)
- BAB II: Gambaran Umum Instansi (Sejarah, Visi-Misi, Struktur, Bidang Usaha)
- BAB III: Pelaksanaan Kegiatan PKL (Deskripsi, Pembahasan, Hasil, Kendala)
- BAB IV: Penutup (Kesimpulan, Saran)`;

    if (actionType === 'paragraf') {
        base += '\n\nTUGAS: Hasilkan SATU paragraf akademik yang padu (3-5 kalimat). Output HANYA isi paragraf, tanpa judul, tanpa nomor, tanpa pengantar.';
    } else if (actionType === 'subbab') {
        base += '\n\nTUGAS: Hasilkan konten subbab. Baris PERTAMA = judul subbab (tanpa #). Baris berikutnya = isi paragraf (2-3 paragraf). Jangan gunakan markdown heading.';
    } else if (actionType === 'bab') {
        base += '\n\nTUGAS: Hasilkan konten BAB lengkap. Gunakan ## untuk judul sub-bab, paragraph biasa untuk isi. Contoh:\n## 1.1 Latar Belakang\n[isi paragraf]\n## 1.2 Tujuan\n[isi paragraf]';
    }

    return base;
}

// ──────────────────────────────────────────
// Template — smart: cek BAB yang sudah ada
// ──────────────────────────────────────────
function openTemplateModal() {
    // Update status BAB di modal sebelum buka
    _updateTemplateStatus();
    const modal = new bootstrap.Modal(document.getElementById('modalQuickTemplate'));
    modal.show();
}

function _updateTemplateStatus() {
    const docState = window.__getDocState?.();
    if (!docState) return;

    const BAB_TITLES = {
        bab1: ['PENDAHULUAN', 'BAB I', 'BAB 1'],
        bab2: ['GAMBARAN UMUM', 'BAB II', 'BAB 2', 'PROFIL'],
        bab3: ['PELAKSANAAN', 'BAB III', 'BAB 3'],
        bab4: ['PENUTUP', 'BAB IV', 'BAB 4'],
    };

    for (const [key, keywords] of Object.entries(BAB_TITLES)) {
        const card   = document.querySelector(`[data-template="${key}"]`);
        const badge  = document.querySelector(`[data-template-badge="${key}"]`);
        if (!card) continue;

        const exists = docState.tree.some(bab =>
            keywords.some(kw => (bab.title || '').toUpperCase().includes(kw))
        );

        if (badge) {
            badge.textContent  = exists ? '✓ Sudah Ada' : '';
            badge.style.display = exists ? 'inline' : 'none';
        }
        card.classList.toggle('border-opacity-25', exists);
        card.classList.toggle('opacity-75', exists);
    }
}

export function insertTemplate(templateType) {
    if (typeof window.quickAdd !== 'function') {
        console.warn('[ai_assistant] window.quickAdd tidak tersedia');
        return;
    }

    const docState = window.__getDocState?.();

    // Cek apakah BAB sudah ada
    const BAB_KEYWORDS = {
        bab1: ['PENDAHULUAN', 'BAB I', 'BAB 1'],
        bab2: ['GAMBARAN UMUM', 'BAB II', 'BAB 2', 'PROFIL'],
        bab3: ['PELAKSANAAN', 'BAB III', 'BAB 3'],
        bab4: ['PENUTUP', 'BAB IV', 'BAB 4'],
    };

    const keywords   = BAB_KEYWORDS[templateType] || [];
    let existingBab  = null;

    if (docState) {
        existingBab = docState.tree.find(bab =>
            keywords.some(kw => (bab.title || '').toUpperCase().includes(kw))
        );
    }

    if (existingBab) {
        // BAB sudah ada — navigasi ke BAB tersebut dan tambahkan subbab yang belum ada
        window.selectNode?.(existingBab.id);
        _appendMissingSubbabs(existingBab, templateType);

        const modalEl = document.getElementById('modalQuickTemplate');
        if (modalEl) { const m = bootstrap.Modal.getInstance(modalEl); if (m) m.hide(); }

        _showToast(`BAB sudah ada — melanjutkan ke BAB yang ada dan menambahkan sub-bab yang belum ada.`, 'info');
        return;
    }

    // BAB belum ada — buat dari template
    const TEMPLATES = {
        bab1: {
            bab: 'PENDAHULUAN',
            subs: [
                { judul: '1.1 Latar Belakang',              teks: 'Praktik Kerja Lapangan (PKL) merupakan salah satu program wajib yang harus dilaksanakan oleh peserta didik sebagai bagian dari kurikulum pendidikan vokasi. Program ini bertujuan untuk memberikan pengalaman kerja nyata kepada peserta didik sesuai dengan kompetensi yang telah dipelajari di sekolah.' },
                { judul: '1.2 Tujuan Praktik Kerja Lapangan', teks: 'Tujuan dilaksanakannya Praktik Kerja Lapangan adalah: (1) Meningkatkan kompetensi peserta didik sesuai program keahlian; (2) Memberikan pengalaman kerja langsung di dunia industri atau dunia usaha; (3) Menumbuhkan sikap profesional, disiplin, dan tanggung jawab dalam bekerja.' },
                { judul: '1.3 Manfaat Praktik Kerja Lapangan', teks: 'Pelaksanaan PKL memberikan manfaat bagi peserta didik berupa pengalaman kerja nyata dan pengembangan kompetensi, bagi sekolah berupa terjalinnya kerjasama yang baik dengan dunia usaha dan industri, serta bagi instansi berupa tambahan tenaga kerja terlatih yang dapat membantu kegiatan operasional.' },
                { judul: '1.4 Waktu dan Tempat Pelaksanaan', teks: 'Praktik Kerja Lapangan dilaksanakan selama [durasi] bulan, terhitung mulai tanggal [tanggal mulai] sampai dengan [tanggal selesai]. Kegiatan PKL dilaksanakan di [nama instansi] yang beralamat di [alamat lengkap instansi].' },
            ],
        },
        bab2: {
            bab: 'GAMBARAN UMUM INSTANSI',
            subs: [
                { judul: '2.1 Sejarah Singkat Instansi',      teks: 'Sejarah berdirinya [nama instansi] dimulai pada tahun [tahun]. Instansi ini didirikan oleh [pendiri] dengan tujuan [tujuan pendirian]. Sejak berdirinya hingga saat ini, [nama instansi] terus berkembang dan memberikan kontribusi nyata dalam bidang [bidang usaha/layanan].' },
                { judul: '2.2 Visi dan Misi Instansi',        teks: 'Visi: "[isi visi instansi]"\n\nMisi:\n1. [Misi pertama instansi]\n2. [Misi kedua instansi]\n3. [Misi ketiga instansi]' },
                { judul: '2.3 Struktur Organisasi',            teks: 'Struktur organisasi [nama instansi] dipimpin oleh [jabatan pimpinan tertinggi] yang membawahi beberapa divisi atau bidang kerja. Setiap divisi memiliki tugas dan fungsi yang berbeda namun saling bersinergi untuk mencapai tujuan organisasi.' },
                { judul: '2.4 Bidang Usaha/Layanan',          teks: 'Dalam menjalankan kegiatan operasionalnya, [nama instansi] bergerak di bidang [bidang usaha]. Layanan utama yang diberikan meliputi [daftar layanan utama] yang ditujukan kepada [target pengguna layanan].' },
            ],
        },
        bab3: {
            bab: 'PELAKSANAAN KEGIATAN PRAKTIK KERJA LAPANGAN',
            subs: [
                { judul: '3.1 Deskripsi Kegiatan PKL',          teks: 'Selama melaksanakan Praktik Kerja Lapangan di [nama instansi], penulis ditempatkan pada divisi/bagian [nama divisi]. Kegiatan yang dilaksanakan meliputi berbagai tugas yang berkaitan dengan bidang [bidang keahlian] sesuai dengan kompetensi yang telah dipelajari.' },
                { judul: '3.2 Hasil Kegiatan PKL',               teks: 'Selama pelaksanaan PKL, penulis berhasil menyelesaikan beberapa tugas dan pekerjaan, antara lain: (1) [Kegiatan/tugas pertama beserta hasilnya]; (2) [Kegiatan/tugas kedua beserta hasilnya]; (3) [Kegiatan/tugas ketiga beserta hasilnya].' },
                { judul: '3.3 Kendala yang Dihadapi',            teks: 'Dalam melaksanakan kegiatan PKL, terdapat beberapa kendala yang dihadapi, antara lain: (1) [Kendala pertama dan penjelasannya]; (2) [Kendala kedua dan penjelasannya].' },
                { judul: '3.4 Cara Mengatasi Kendala',           teks: 'Untuk mengatasi kendala yang dihadapi, penulis mengambil beberapa langkah, yaitu: (1) [Cara mengatasi kendala pertama]; (2) [Cara mengatasi kendala kedua].' },
            ],
        },
        bab4: {
            bab: 'PENUTUP',
            subs: [
                { judul: '4.1 Kesimpulan', teks: 'Berdasarkan kegiatan Praktik Kerja Lapangan yang telah dilaksanakan di [nama instansi] selama [durasi] bulan, dapat disimpulkan bahwa: (1) Pelaksanaan PKL memberikan pengalaman kerja nyata yang sangat bermanfaat bagi pengembangan kompetensi; (2) Peserta didik berhasil menerapkan ilmu yang dipelajari di sekolah pada situasi kerja nyata; (3) Wawasan tentang dunia kerja yang tidak diperoleh di bangku sekolah dapat dipenuhi melalui program PKL ini.' },
                { judul: '4.2 Saran',       teks: 'A. Saran untuk Sekolah: Diharapkan sekolah dapat terus menjalin kerjasama yang baik dengan instansi/perusahaan untuk memberikan kesempatan PKL yang berkualitas bagi peserta didik.\n\nB. Saran untuk Instansi: Diharapkan instansi dapat terus memberikan bimbingan dan arahan yang baik kepada peserta didik yang melaksanakan PKL, sehingga tujuan PKL dapat tercapai secara optimal.' },
            ],
        },
    };

    const tmpl = TEMPLATES[templateType];
    if (!tmpl) return;

    // Tambah BAB
    window.quickAdd('bab', { title: tmpl.bab });

    // Tunggu state update lalu tambah subbab + paragraf
    setTimeout(() => {
        tmpl.subs.forEach((sub, i) => {
            setTimeout(() => {
                window.quickAdd('subbab', { title: sub.judul });
                if (sub.teks) {
                    setTimeout(() => {
                        window.quickAdd('paragraf', { text: sub.teks, teks: sub.teks });
                    }, 30);
                }
            }, i * 80);
        });
    }, 60);

    const modalEl = document.getElementById('modalQuickTemplate');
    if (modalEl) { const m = bootstrap.Modal.getInstance(modalEl); if (m) m.hide(); }

    _showToast(`Template ${tmpl.bab} berhasil ditambahkan!`, 'success');
}

// Tambahkan subbab yang belum ada ke BAB yang sudah ada
function _appendMissingSubbabs(existingBab, templateType) {
    const SUBS_MAP = {
        bab1: ['1.1 Latar Belakang', '1.2 Tujuan', '1.3 Manfaat', '1.4 Waktu dan Tempat'],
        bab2: ['2.1 Sejarah', '2.2 Visi dan Misi', '2.3 Struktur Organisasi', '2.4 Bidang Usaha'],
        bab3: ['3.1 Deskripsi Kegiatan', '3.2 Hasil Kegiatan', '3.3 Kendala', '3.4 Cara Mengatasi'],
        bab4: ['4.1 Kesimpulan', '4.2 Saran'],
    };

    const needed   = SUBS_MAP[templateType] || [];
    const existing = (existingBab.children || []).map(s => (s.title || '').toLowerCase());

    const missing  = needed.filter(s =>
        !existing.some(e => e.includes(s.toLowerCase().split(' ')[1] || s))
    );

    if (missing.length === 0) {
        _showToast('Semua sub-bab sudah lengkap di BAB ini.', 'info');
        return;
    }

    missing.forEach((sub, i) => {
        setTimeout(() => {
            window.quickAdd('subbab', { title: sub });
        }, i * 60);
    });

    _showToast(`Menambahkan ${missing.length} sub-bab yang belum ada.`, 'success');
}

// ──────────────────────────────────────────
// Toast notification ringan
// ──────────────────────────────────────────
function _showToast(msg, type = 'info') {
    if (typeof window.showToast === 'function') {
        window.showToast(msg, type);
        return;
    }
    // Fallback toast sederhana
    const t = document.createElement('div');
    t.style.cssText = `
        position:fixed; bottom:24px; right:24px; z-index:9999;
        padding:12px 20px; border-radius:8px; font-size:14px; max-width:320px;
        background:${type === 'success' ? '#198754' : type === 'error' ? '#dc3545' : '#0dcaf0'};
        color:#fff; box-shadow:0 4px 12px rgba(0,0,0,.2);
        animation: slideIn .3s ease;
    `;
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3500);
}
